const os = require("os"),
    fs = require("fs"),
    path = require("path"),
    https = require("https"),
    spawnSync = require("child_process").spawnSync

class Action {
    constructor() {
        // SSH 私钥
        this.gitSshIdRsa = process.env.INPUT_SSH_ID_RSA || process.env.SSH_ID_RSA
        // 远程仓库地址
        this.gitKnownHosts = process.env.INPUT_KNOWN_HOSTS || process.env.KNOWN_HOSTS
        // 远程仓库名称
        this.gitRemoteName = process.env.INPUT_REMOTE_NAME || process.env.REMOTE_NAME || this.gitKnownHosts.split('.')[0]
        // 当前仓库地址
        this.gitRepositoryUrl = process.env.INPUT_REPOSITORY_URL || process.env.REPOSITORY_URL
        // 当前分支
        this.gitBranchName = process.env.INPUT_BRANCH_NAME || process.env.BRANCH_NAME || 'main'
        // Git 邮件地址
        this.gitEMail = process.env.INPUT_GIT_EMAIL || process.env.GIT_EMAIL || 'action@github.com'
        // Git 用户名
        this.gitNAME = process.env.INPUT_GIT_NAME || process.env.GIT_NAME || 'GitHub Action'
    }

    _executeCommand(cmd, options) {
        console.log(`executing: [${cmd}]`)

        const INPUT = cmd.split(" "), TOOL = INPUT[0], ARGS = INPUT.slice(1)
        return spawnSync(TOOL, ARGS, options)
    }

    _executeInProcess(cmd) {
        var result = this._executeCommand(cmd, { encoding: "utf-8", stdio: [process.stdin, process.stdout, process.stderr] })
        if (result.status != 0) {
            this._printErrorAndExit(JSON.stringify(result))
            console.log(`result: ${JSON.stringify(result)}`)
        }
    }

    // 配置 SSH
    _setSshConfig() {

        // 开始配置 SSH

        console.log(`Set SSH config Start`)

        this._executeInProcess('mkdir -p ~/.ssh')
        this._executeInProcess('pwd')
        this._executeInProcess('cd ~/.ssh')
        this._executeInProcess('ls -a')
        this._executeInProcess(`echo "${this.gitSshIdRsa}" >> ~/.ssh/id_rsa`)
        this._executeInProcess('chmod 600 ~/.ssh/id_rsa')
        this._executeInProcess('eval $(ssh-agent -s) && ssh-add ~/.ssh/id_rsa')
        // 信任域名
        this._executeInProcess(`ssh-keyscan -H ${this.gitKnownHosts} >> ~/.ssh/known_hosts`)

        console.log(`Set SSH config End`)

    }

    // 设置 Git 配置
    _setGitConfig() {
        console.log(`Set up Git user config Start`)

        this._executeInProcess(`git config --global user.email "${this.gitEMail}"`)
        this._executeInProcess(`git config --global user.name "${this.gitNAME}"`)

        console.log(`Set up Git user config End`)
    }


    run() {
        console.log(`Project gitNAME: ${this.gitNAME}`)
        console.log(`Project gitEMail: ${this.gitEMail}`)
        console.log(`Project gitBranchName: ${this.gitBranchName}`)
        console.log(`Project gitRemoteName: ${this.gitRemoteName}`)
        console.log(`Project gitRepositoryUrl: ${this.gitRepositoryUrl}`)
        console.log(`Project gitKnownHosts: ${this.gitKnownHosts}`)

        this._setGitConfig();
        // https://github.com/marketplace/actions/ssh-setup
        // this._setSshConfig();

        // 查看当前分支
        console.log(`Look up current branch Start`)

        console.log(`Check current branch`)
        this._executeInProcess(`echo 当前分支：${this.gitBranchName} ${this.gitRepositoryUrl}`)

        console.log(`Look up current branch End`)


        // 查看远程分支
        console.log(`add remote url Start`)

        this._executeInProcess(`git remote add ${this.gitRemoteName} "git@${this.gitKnownHosts}:${this.gitRepositoryUrl}.git"`)

        console.log(`add remote url End`)


        // 从远程获取
        console.log(`fetch remote Start`)

        this._executeInProcess(`git fetch --prune ${this.gitRemoteName} --tags --verbose`)

        console.log(`fetch remote End`)

        // 从远程拉取
        console.log(`pull remote Start`)

        this._executeInProcess(`git pull --rebase=false ${this.gitRemoteName} ${this.gitBranchName} --tags --verbose`)

        console.log(`pull remote End`)

        // 推送
        console.log(`push remote Start`)

        this._executeInProcess(`git push ${this.gitRemoteName} refs/heads/${this.gitBranchName}:refs/heads/${this.gitBranchName} --tags --verbose`)

        console.log(`push remote End`)

    }
    _printErrorAndExit(msg) {
        console.log(`##[error]😭 ${msg}`)
        throw new Error(msg)
    }
}

new Action().run()
