# 静态构件发布

本项目的发布适配器是 `.github/workflows/deploy.yml`，遵循 `static-artifact-deployment` 协议。本文描述目标配置与操作约定；不代表服务器、CI Secrets、DNS 或 HTTPS 已经完成迁移。服务器地址和 SSH host key 不写入仓库。

## 1. 发布边界

```text
GitHub Actions（master）
  Node 22 → npm ci → npm test → npm run build → dist/
  校验普通 index.html → GNU tar / gzip -n → archive SHA-256
  SSH staticdeploy: publish <site> <full-sha> <archive-sha256>
      服务端站点锁：上传 → 激活 → 内部 health → status
      必要时回滚并验证恢复版本；失败仍返回非零

用户 → OpenResty 80/443（固定 X-Static-Site）
     → 127.0.0.1:19080 共享非 root Nginx
     → /srv/static-deploy/sites/<site>/current → releases/<full-sha>
```

构建、依赖安装、测试和压缩全部在 runner 完成。服务器只接收构件；不用逐站点容器，不开放发布账号的 shell、SCP、SFTP、rsync、转发或 Docker socket。本仓库不复制平台源码、安装脚本或 `release.sh` / `package_release.py`，不从服务器下载脚本执行。

仅 `master` 的 push / 手动运行发布。workflow 只需 `contents: read`，同仓库发布组串行且 `cancel-in-progress: false`；不要再增加一条会并发发布此站点的工作流。若其他仓库也发布同一 slug，需协调发布来源，GitHub 的并发组不能跨仓库互斥。

## 2. 配置 GitHub Actions

在仓库 **Settings → Secrets and variables → Actions** 配置：

| 名称 | 类型 | 内容 |
|------|------|------|
| `STATIC_DEPLOY_HOST` | Variable | 受限 SSH 服务器的主机名或 IP；不含协议、用户、路径、空格；固定 TCP 22，不在此拼端口 |
| `STATIC_DEPLOY_SITE` | Variable | 管理员确认的站点 slug；1–63 位小写字母/数字/连字符，首尾不能为连字符；须与 vhost 固定 header 一致 |
| `STATIC_DEPLOY_SSH_KEY` | Secret | Ed25519 私钥的完整多行文本，含 BEGIN/END 行；不是路径或 Base64 文本 |
| `STATIC_DEPLOY_KNOWN_HOSTS` | Secret | 经可信渠道核验的完整 known_hosts 行，与目标主机匹配；不是只有指纹 |

使用仓库级配置，不再依赖旧 `github-pages` environment。只配置在旧 environment 中的值不会被新 job 读取。

`GIT_COMMIT_SHA` 直接取 `github.sha`（40 或 64 位小写完整 SHA），`DIST_DIR` 固定为 Astro 默认 `dist`。无需 `SITE_PUBLIC_URL` / `SITE_SMOKE_PATH`，公网验证独立于 `publish`。

密钥由管理员一次性生成，服务器只安装公钥，私钥通过安全渠道写入 Secret。在可信控制台核对 SSH host key 后保存 known_hosts；不能把 CI 中临时 `ssh-keyscan` 的结果直接当作信任依据。

发布步骤关闭 xtrace，用 `umask 077` 和 `mktemp -d` 在 `RUNNER_TEMP` 下创建身份文件、known_hosts 和归档，文件权限 `0600`，`trap` 在退出时删除本次临时文件。强制终止 runner 时依赖临时 runner 的销毁，不得把这些文件上传为 Actions artifact。SSH 使用 `BatchMode=yes`、`IdentitiesOnly=yes`、`StrictHostKeyChecking=yes`、显式 `UserKnownHostsFile`，禁用密码/交互认证和转发。

## 3. 平台前置条件

管理员在平台仓库维护安装和升级；操作前检查服务器发行版、OpenSSH、Docker、现有 OpenResty vhost、目录和权限，保留其他站点。

- 受限用户 `staticdeploy` 通过 `ForceCommand /usr/local/bin/static-release` 提供协议，支持 `publish`；不支持时先升级平台，不绕过限制或改回远程 shell。
- 共享 Nginx 以非 root 身份运行，仅映射 `127.0.0.1:19080`，发布用户不接触 Docker socket。19080 不加入公网安全组。
- 站点 current 使用相对链接，切换由平台原子完成；站点锁和状态由平台维护，禁止手工编辑状态 JSON、覆盖 release 或删除 current。
- 平台默认保留 active 加最近 3 个已激活历史版本，未激活版本 TTL 为 24 小时；管理员核对实际配置与 `static-release-gc.timer`。GC 应保护 active、previous、pending 和保留历史。
- OpenResty 保留现有 TLS、日志和超时设置，对每个域名固定覆盖 `X-Static-Site`。配置示例与 DNS 操作见 [custom-domain-setup.md](custom-domain-setup.md)。

## 4. 博客路由兼容性与迁移

这是 Astro SSG 博客，构件含目录形式的页面（如 `posts/<slug>/index.html`）及 RSS / sitemap / llms.txt，不是 SPA。

已检查作为参考的共享平台源码：默认 `try_files $uri $uri/ /index.html` 会对不存在的 URL 回落首页；长期缓存规则仅匹配至少 8 位十六进制 hash，不保证覆盖 Astro 的文件名。这两项需要管理员在平台侧提供适合 SSG 的路由/缓存策略并验收，不能仅因 `publish` 成功就宣布博客迁移完成。本次仓库改造不修改共享平台源码。

迁移顺序：

1. 准备站点、受限密钥、host key 和 CI 配置；先用 `status <site>` 验证协议与信任关系。保留旧 Pages 站点和 DNS，记录回退方式。
2. 合并 workflow 到 `master` 后首次发布，核对服务器返回 `published` 及 `upload`、`activation`、`health`、`release`。
3. 管理员验收 loopback `/healthz`、带固定站点 header 的根路径、current 与 status 一致、容器健康及 GC timer。
4. 在 DNS 切换前验证新 OpenResty vhost 的首页、真实文章深链、标签页、已启用时的 `/insights`、`/rss.xml`、`/sitemap-index.xml`、`/llms.txt` 和 `/robots.txt`，核对状态码、内容与 Content-Type。`/posts/不存在的文章` 和不存在的静态资源必须返回 404，不能返回首页 200。
5. 检查 HTML 不缓存，实际 `dist/_astro/` 中带 hash 的资源长期缓存；不要给 RSS、llms.txt、非指纹图片等统一加 immutable。伪造 `X-Static-Site` 不能跨站点读取。
6. 上述检查通过后再切 DNS，验收公网 HTTPS、canonical、RSS 和 sitemap 域名。`astro.config.ts`、`public/CNAME`、`robots.txt`、SEO `SITE_URL` 保持原值。

workflow 修改不会切 DNS。若平台仍返回 SPA 首页或缓存规则未满足要求，保持旧站点服务，先完成平台适配再切流量。`publish` 的内部检查与公网/SSG 验收是分开的，不把公网 URL 加入构件上传协议。

## 5. 查询与人工回滚

在可信运维终端的 Bash 中，先设置下列环境变量，身份文件权限应为 `0600`；不把实际值写入脚本或仓库：

```bash
set -euo pipefail
: "${STATIC_DEPLOY_HOST:?设置受限 SSH 主机}"
: "${STATIC_DEPLOY_SITE:?设置站点 slug}"
: "${STATIC_DEPLOY_IDENTITY_FILE:?设置本地私钥路径}"
: "${STATIC_DEPLOY_KNOWN_HOSTS_FILE:?设置已核验的 known_hosts 路径}"
[[ ${STATIC_DEPLOY_HOST} =~ ^[A-Za-z0-9][A-Za-z0-9._:-]*$ ]]
[[ ${STATIC_DEPLOY_SITE} =~ ^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$ ]]
[[ -s ${STATIC_DEPLOY_IDENTITY_FILE} && -s ${STATIC_DEPLOY_KNOWN_HOSTS_FILE} ]]
SSH_OPTS=(
  -T -F /dev/null -i "${STATIC_DEPLOY_IDENTITY_FILE}"
  -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes
  -o "UserKnownHostsFile=${STATIC_DEPLOY_KNOWN_HOSTS_FILE}"
  -o PasswordAuthentication=no -o KbdInteractiveAuthentication=no
  -o ClearAllForwardings=yes -o ConnectTimeout=15
)
ssh "${SSH_OPTS[@]}" "staticdeploy@${STATIC_DEPLOY_HOST}" "status ${STATIC_DEPLOY_SITE}"
ssh "${SSH_OPTS[@]}" "staticdeploy@${STATIC_DEPLOY_HOST}" "list ${STATIC_DEPLOY_SITE}"
```

确认 previous 是要恢复的版本，并将其完整 SHA 赋给 `EXPECTED_SHA` 后，再执行：

```bash
: "${EXPECTED_SHA:?从 list 的 previous 确认回滚目标}"
[[ ${EXPECTED_SHA} =~ ^([0-9a-f]{40}|[0-9a-f]{64})$ ]]
ssh "${SSH_OPTS[@]}" "staticdeploy@${STATIC_DEPLOY_HOST}" "rollback ${STATIC_DEPLOY_SITE}"
ssh "${SSH_OPTS[@]}" "staticdeploy@${STATIC_DEPLOY_HOST}" "health ${STATIC_DEPLOY_SITE} ${EXPECTED_SHA}"
ssh "${SSH_OPTS[@]}" "staticdeploy@${STATIC_DEPLOY_HOST}" "status ${STATIC_DEPLOY_SITE}"
```

`rollback` 切换 previous，重复执行会切回，不能盲目重试。选择任意仍保留的历史版本时使用 `activate <site> <full-sha>`，随后显式执行 `health` 和 `status`。低层 `upload` 只上传、不激活，仅用于明确需要分阶段发布的人工流程。

## 6. 失败处理与验收状态

- `PUBLISH_HEALTH_FAILED`：保留 job 失败和完整聚合 JSON。平台仅在本次实际切换且存在 previous 时尝试一次回滚；检查 `details.rollback`、`rollback_health`、`release`。即使恢复成功，CI 也不能转绿或另行回滚。
- SSH 中断/超时：结果可能不确定，先查询 `status` / `health`，不要直接重跑发布。状态协调不代表整个 publish 会在后台自动完成。
- `RELEASE_CONFLICT`：同一 SHA 已存在不同摘要，不能覆盖。只有同版本同摘要可幂等复用；确定性打包不保证不同构建环境产生的内容也相同。
- `STATE_CORRUPT` / `CURRENT_CORRUPT`：停止激活、备份现场并由管理员诊断，不手工修 JSON 或链接。
- 权限失败：检查用户、密钥、host key、ForceCommand 与网络；交互 shell 被拒绝是预期行为，不能关闭严格 host key 校验。

本地 `npm test` 会执行真实 workflow Bash，并用模拟 SSH 检查输入拒绝、归档摘要、凭据权限/清理和失败退出码；不会联系服务器。有 GNU tar 时还验证真实归档的确定性，Linux Actions 中此项必须运行。macOS 如需本地运行该项，提供 `gtar`；没有 GNU tar 时仅该项明确跳过，不能把模拟测试当作生产发布成功。

只有 CI 安装、测试、构建、打包成功，`publish` 返回 `published`，服务器内部检查、current/status、容器、GC timer 与权限暴露面全部验收后，才能报告平台发布完成。博客切流量还必须通过第 4 节的 SSG / 公网检查。
