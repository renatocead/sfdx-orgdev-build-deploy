const core = require('@actions/core')
const execCommand = require('./exec-command.js');

var fnInstallSFDX = function(){
    core.info('=== Downloading and installing SFDX cli ===');
    //execCommand.run('wget', ['https://developer.salesforce.com/media/salesforce-cli/sfdx-cli/channels/stable/sfdx-cli-v7.72.0-697e9faee2-linux-x64.tar.xz']);
    //execCommand.run('wget', ['https://developer.salesforce.com/media/salesforce-cli/sfdx/channels/stable/sfdx-linux-x64.tar.xz']);
    //core.info('=== Download ok ===');
    //execCommand.run('mkdir', ['-p', 'sfdx-cli']);
    //core.info('=== MKDIR ok ===');
    //execCommand.run('tar', ['xJf', 'sfdx-cli-v7.72.0-697e9faee2-linux-x64.tar.xz', '-C', 'sfdx-cli', '--strip-components', '1']);
    //execCommand.run('tar', ['xJf', 'sfdx-linux-x64.tar.xz', '-C', 'sfdx-cli', '--strip-components', '1']);
    //core.info('=== TAR xJf OK ===');
    //execCommand.run('./sfdx-cli/install', []);
    //execCommand.run('export PATH=~/sfdx/bin:$PATH', []);
    execCommand.run('npm', ['install','sfdx-cli','--global']);
    core.info('=== SFDX cli installed ===');
    core.info('=== SFDX install GIT delta ===');
    execCommand.run('sh', ['-c', 'echo y | sfdx plugins:install sfdx-git-delta']);
    core.info('=== SFDX GIT Delta installed ===');              
};

module.exports.install = function(command, args) {
    //Installs Salesforce DX CLI
    fnInstallSFDX(); 

};
