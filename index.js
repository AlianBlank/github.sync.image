const os = require("os"),
    fs = require("fs"),
    path = require("path"),
    https = require("https"),
    spawnSync = require("child_process").spawnSync
const exec = require('@actions/exec');
const core = require('@actions/core');

const DEFAULT_DIR_MOD = 755;
const DEFAULT_KEYS_MOD = 600;
const DEFAULT_SSH_KNOWN_HOSTS_MOD = 644;

const KNOWN_HOSTS_FILE = 'known_hosts';
const SSH_KEY_NAME = "id_rsa";
const SSH_FOLDER_PATH = "~/.ssh";

// 执行命令
const invokeCmd = async (cmd) => {
    console.log(`executing: [${cmd}]`)
    let result = await exec.getExecOutput('/bin/sh -c', [`${cmd}`], { silent: true });
    console.log(`result: ${result.stdout}`)
    if (result.exitCode != 0) {
        throw new Error(`Command failed with exit code ${result.exitCode}. Output: ${result.stderr}`);
    }
}

// 创建文件
const createFileWithDataAndMode = async (data, path, mod) => {
    await exec.exec('/bin/sh -c', [`echo "${data}" >> ${path}`], { silent: true });
    await exec.exec('/bin/sh -c', [`chmod ${mod} ${path}`], { silent: true });
};

// 重新创建文件夹
const recreateDirWithMod = async (path, mod) => {
    await exec.exec('/bin/sh -c', [`rm -rf ${path}`], { silent: true });
    await exec.exec('/bin/sh -c', [`mkdir ${path}`], { silent: true });
    await exec.exec('/bin/sh -c', [`chmod ${mod} ${path}`], { silent: true });
};

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
        console.log(`result: ${JSON.stringify(result)}`)
        if (result.status != 0) {
            this._printErrorAndExit(JSON.stringify(result))
        }
    }

    // 配置 SSH
    async _setSshConfig() {

        // 开始配置 SSH

        console.log(`Set SSH config Start`)

        // this._executeInProcess('mkdir -p ~/.ssh')
        // this._executeInProcess('pwd')
        // this._executeInProcess('cd ~/.ssh')
        // this._executeInProcess('ls -a')
        // this._executeInProcess(`echo "${this.gitSshIdRsa}" >> ~/.ssh/id_rsa`)
        // this._executeInProcess('chmod 600 ~/.ssh/id_rsa')
        // this._executeInProcess('eval $(ssh-agent -s) && ssh-add ~/.ssh/id_rsa')
        // 信任域名
        // this._executeInProcess(`ssh-keyscan -H ${this.gitKnownHosts} >> ~/.ssh/known_hosts`)

        const FULL_SSH_PRIVATE_KEY_PATH = `${SSH_FOLDER_PATH}/${SSH_KEY_NAME}`;
        const FULL_KNOWN_HOSTS_PATH = `${SSH_FOLDER_PATH}/${KNOWN_HOSTS_FILE}`;

        await recreateDirWithMod(SSH_FOLDER_PATH, DEFAULT_DIR_MOD);

        await createFileWithDataAndMode(this.gitSshIdRsa, FULL_SSH_PRIVATE_KEY_PATH, DEFAULT_KEYS_MOD);
        await createFileWithDataAndMode(this.gitKnownHosts, FULL_KNOWN_HOSTS_PATH, DEFAULT_SSH_KNOWN_HOSTS_MOD);

        console.log(`Set SSH config End`)

    }

    // 设置 Git 配置
    _setGitConfig() {
        console.log(`Set up Git user config Start`)

        invokeCmd(`git config --global user.email "${this.gitEMail}"`)
        invokeCmd(`git config --global user.name "${this.gitNAME}"`)

        console.log(`Set up Git user config End`)
    }


    async run() {
        try {
            console.log(`Project gitNAME: ${this.gitNAME}`)
            console.log(`Project gitEMail: ${this.gitEMail}`)
            console.log(`Project gitBranchName: ${this.gitBranchName}`)
            console.log(`Project gitRemoteName: ${this.gitRemoteName}`)
            console.log(`Project gitRepositoryUrl: ${this.gitRepositoryUrl}`)
            console.log(`Project gitKnownHosts: ${this.gitKnownHosts}`)

            this._setGitConfig();

            // https://github.com/marketplace/actions/ssh-setup
            await this._setSshConfig();

            // 查看当前分支
            console.log(`Look up current branch Start`)

            this._executeInProcess(`git config --list`)

            console.log(`Check current branch`)
            this._executeInProcess(`echo 当前分支：${this.gitBranchName} ${this.gitRepositoryUrl}`)

            console.log(`Look up current branch End`)


            // 查看远程分支
            console.log(`add remote url Start`)

            this._executeInProcess(`git remote add ${this.gitRemoteName} "git@${this.gitKnownHosts}:${this.gitRepositoryUrl}.git"`)

            console.log(`add remote url End`)


            // 从远程获取
            console.log(` remote Start`)

            this._executeInProcess('git remote -v')

            console.log(` remote End`)

            // 从远程获取
            // console.log(`fetch remote Start`)

            // invokeCmd(`git fetch --prune ${this.gitRemoteName} --tags --verbose`)

            // console.log(`fetch remote End`)

            // 从远程拉取
            console.log(`pull remote Start`)

            invokeCmd(`git pull --progress -v --no-rebase ${this.gitRemoteName} ${this.gitBranchName} --tags --verbose`)

            console.log(`pull remote End`)

            // 推送
            console.log(`push remote Start`)

            invokeCmd(`git push -u ${this.gitRemoteName} refs/heads/${this.gitBranchName}:refs/heads/${this.gitBranchName} --tags --verbose`)

            console.log(`push remote End`)
        } catch (error) {
            core.setFailed(error.message);
        }
    }
    _printErrorAndExit(msg) {
        console.log(`##[error]😭 ${msg}`)
        throw new Error(msg)
    }
}

new Action().run()
