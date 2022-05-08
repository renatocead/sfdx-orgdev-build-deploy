const core = require('@actions/core')
const path = require('path');
const execCommand = require('./exec-command.js');
const fs = require('fs');
const xml2js = require('xml2js');

let getApexTestClass = function(manifestpath, classesPath, defaultTestClass){
    core.info("=== getApexTestClass ===");
    var parser = new xml2js.Parser();
    var typeTmp = null;
    var classes = null;
    var classNameTmp = null;
    var testClasses = [];
    var xml = fs.readFileSync(manifestpath, "utf8");
    var fileContentTmp = null;

    parser.parseString(xml, function (err, result) {
        for(var i in result.Package.types){
            typeTmp = result.Package.types[i];
            if("ApexClass" === typeTmp.name[0]){
                classes = typeTmp.members;
            }
        }
    });

    if(classes){
        for(var i = 0; i < classes.length; i++){
            classNameTmp = classes[i];
            fileContentTmp = fs.readFileSync(classesPath+"/"+classNameTmp+".cls", "utf8");
            if(fileContentTmp.toLowerCase().includes("@istest")){
                testClasses.push(classNameTmp);
            }
        }
    }else{
        if(defaultTestClass){
            testClasses.push(defaultTestClass);
        }
        
    }
    
    return testClasses.join(",");
}

let login = function (cert, login){
    core.info("=== login ===");
    execCommand.run('openssl', ['enc', '-nosalt', '-aes-256-cbc', '-d', '-in', cert.certificatePath, '-out', 'server.key', '-base64', '-K', cert.decryptionKey, '-iv', cert.decryptionIV]);

    core.info('==== Authenticating in the target org');
    const instanceurl = login.orgType === 'sandbox' ? 'https://test.salesforce.com' : 'https://login.salesforce.com';
    core.info('Instance URL: ' + instanceurl);
    execCommand.run('sfdx', ['force:auth:jwt:grant', '--instanceurl', instanceurl, '--clientid', login.clientId, '--jwtkeyfile', 'server.key', '--username', login.username, '--setalias', 'sfdc']);
};

let convertion = function(deploy){
    core.info("=== creating package to deploy ===");
    execCommand.run('sh', ['-c', 'mkdir /opt/ready2Deploy']);
    execCommand.run('sfdx', ['sgd:source:delta', '--to', 'HEAD', '--from', 'HEAD^', '--output', '/opt/ready2Deploy', '--loglevel','error', '-d']);
    execCommand.run('sh',['-c', 'ls -R /opt/ready2Deploy']);
    execCommand.run('sfdx', ['force:source:convert','-r','/opt/ready2Deploy', '-d', '/opt/ready2Deploy/output'])
    execCommand.run('sh',['-c','rm -rf /opt/ready2Deploy/output/package.xml']);
    execCommand.run('sh',['-c','cp -R /opt/ready2Deploy/output/* /opt/ready2Deploy/destructiveChanges/']);
    execCommand.run('sh',['-c','mv -f /opt/ready2Deploy/package/package.xml /opt/ready2Deploy/output/']);
    execCommand.run('sh',['-c','rm -rf /opt/ready2Deploy/force-app/']);
    
    
  //  execCommand.run('sh', ['-c', 'mv -f /opt/ready2Deploy/package/package.xml /opt/ready2Deploy/output']);
  //  execCommand.run('sh', ['-c', 'mv -f /opt/ready2Deploy/destructiveChanges/** /opt/ready2Deploy/output']);
    core.info("=== package created ===");
    
};

let deploy = function (deploy, login){
    core.info("=== deploy ===");

    var manifestsArray = deploy.manifestToDeploy.split(",");
    //var sfdxRootFolder = deploy.sfdxRootFolder;
    var sfdxRootFolder = '/opt/ready2Deploy';
    
    var manifestTmp;
    var testClassesTmp;

    for(var i = 0; i < manifestsArray.length; i++){
        manifestTmp = manifestsArray[i];

        //var argsDeploy = ['force:source:deploy', '--wait', deploy.deployWaitTime, '--targetusername', login.username, '--json','--manifest','/opt/ready2Deploy/package/package.xml'];
        var argsDeploy = ['force:mdapi:deploy', '--wait', deploy.deployWaitTime, '--targetusername', login.username, '--json','-d', '/opt/ready2Deploy/output'];

        if(deploy.checkonly){
            core.info("===== CHECH ONLY ====");
            argsDeploy.push('--checkonly');
        }

        if(deploy.testlevel == "RunSpecifiedTests"){
            testClassesTmp = getApexTestClass(
                sfdxRootFolder ? path.join(sfdxRootFolder, manifestTmp) : manifestTmp, 
                sfdxRootFolder ? path.join(sfdxRootFolder, deploy.defaultSourcePath, 'classes') : path.join(deploy.defaultSourcePath, 'classes'),
                deploy.defaultTestClass);

            core.info("classes are : "  + testClassesTmp);
            
            if(testClassesTmp){
                argsDeploy.push("--testlevel");
                argsDeploy.push(deploy.testlevel);
    
                argsDeploy.push("--runtests");
                argsDeploy.push(testClassesTmp);
            }else{
                argsDeploy.push("--testlevel");
                argsDeploy.push("RunLocalTests");
            }
        }else{
            argsDeploy.push("--testlevel");
            argsDeploy.push(deploy.testlevel);
        }

        execCommand.run('sfdx', argsDeploy, sfdxRootFolder);
    }
};

let destructiveDeploy = function (deploy){
    core.info("=== destructiveDeploy ===");
    if (deploy.destructivePath !== null && deploy.destructivePath !== '') {
        core.info('=== Applying destructive changes ===')
        var argsDestructive = ['force:mdapi:deploy', '-d', '/opt/ready2Deploy/destructiveChanges', '-u', 'sfdc', '--wait', deploy.deployWaitTime, '-g', '--json'];
        if (deploy.checkonly) {
            argsDestructive.push('--checkonly');
        }
        execCommand.run('sfdx', argsDestructive);
    }
};

let dataFactory = function (deploy){
    core.info("=== dataFactory ===");
    if (deploy.dataFactory  && !deploy.checkonly) {
        core.info('Executing data factory');
        execCommand.run('sfdx', ['force:apex:execute', '-f', deploy.dataFactory, '-u', 'sfdc']);
    }
};

module.exports.convertion = convertion;
module.exports.deploy = deploy;
module.exports.login = login;
module.exports.destructiveDeploy = destructiveDeploy;
module.exports.dataFactory = dataFactory;
