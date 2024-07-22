# github.sync.image

同步镜像

## 参数解析

| 参数名称           | 必填 | 参数描述                | 默认值                           |
|----------------|----|---------------------|-------------------------------|
| SSH_ID_RSA     | 是  | SSH 私钥              | 无                             |
| KNOWN_HOSTS    | 是  | 远程地址根域名(gitlab.com) | 无                             |
| REMOTE_NAME    | 否  | 远程地址名称              | `KNOWN_HOSTS` 参数的第一个 `.` 之前的值 |
| REPOSITORY_URL | 否  | 仓库地址.不包含根地址         | ${{ github.Repository }}      |
| BRANCH_NAME    | 否  | 分支名称                | ${{ github.ref.name }}        |
| GIT_EMAIL      | 否  | Git 提交邮箱            | action@github.com             |
| GIT_NAME       | 否  | Git提交名称             | GitHub Action                 |

## 使用方法

```yaml
name: Sync Github To Image

on:
  push:
    branches: [ main ]
    #schedule:
    # 定时任务，每天 UTC 时间 0 点运行
    #- cron: "0 0 * * *"
  #workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v2
        with:
          fetch-depth: 0 # 为了 git pull --unshallow，我们需要获取所有的提交历史

      - name: Sync To GitCode
        uses: AlianBlank/github.sync.image@1.0.0
        with:
          SSH_ID_RSA: ${{ secrets.GITCODE_ID_RSA }}
          KNOWN_HOSTS: gitcode.net
          REMOTE_NAME: gitcode
          REPOSITORY_URL: ${{ github.Repository }}
          BRANCH_NAME: ${{ github.ref.name }}
          GIT_EMAIL: wangfj11@foxmail.com
          GIT_NAME: AlianBlank
```
