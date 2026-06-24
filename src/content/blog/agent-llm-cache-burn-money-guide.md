---
title: "Token 烧得太快，是因为 Agent 没吃上缓存"
date: "2026-06-24"
tags: [llm, agent, cache, 排查]
description: "平时用各种模型工具跑任务，感觉 token 消耗挺快。社交媒体上有人提到，可能是 token 的缓存机制没用上。联想到自己也在做 Agent，就把这件事系统查了一遍——原理、各家厂商机制、和 Agent 场景里常见的几个反模式。"
---

# Token 烧得太快，是因为 Agent 没吃上缓存

![缓存命中与未命中的账单对比](/images/blog/agent-llm-cache-burn-money-guide/01-cover-cache-hit-vs-miss.webp)

最近一段时间用 Kimi 这些工具跑任务比较多，隐隐感觉每次对话 token 消耗得挺快。

某天在社交媒体上看到一条讨论：很多人发现自己大模型调用账单很高，是因为根本没吃上 token 缓存。所谓缓存，就是模型厂商对"开头重复"的 prompt 给出折扣价——Anthropic 缓存读取是原价 10%，DeepSeek 命中价甚至只有未命中的 1/120。但前提是 prefix 一字不差地重复。

我突然想到：这件事在 Agent 场景下会更严重。我自己就在做 Agent，调用频率比"人点一下"高得多，prompt 里的 system 和工具定义每次都一样——这正好是缓存最该命中的形态。如果因为我代码里随手写的几行把这些 cache 都搞失效了，那就不是"省点小钱"，是月底账单的形状。

于是花了几天把 LLM 缓存这件事系统查了一遍：原理、七家厂商机制、Agent 场景里最容易踩的几个坑。下面是这次排查的完整笔记。

---

## 一、缓存到底在缓存什么

大模型推理时，输入 prompt 会被切成 token，每个 token 在每一层 Transformer 上都有一个对应的 Key-Value 张量，也就是 KV Cache。**Prefix Cache** 是说：服务器把 prompt 开头一段固定内容的 KV 张量存下来，下次请求如果开头完全一样，直接复用，跳过重新计算。

我之前以为缓存是"模糊匹配"——意思差不多就能命中。查了文档才发现，前提只有一条：**prefix 必须一字不差**。

![prefix 字节级匹配：差一个字节就 miss](/images/blog/agent-llm-cache-burn-money-guide/02-prefix-byte-match.webp)

`{"a":1,"b":2}` 和 `{"b":2,"a":1}` 在人眼里一样，在缓存里是两个完全不同的 prefix。换行符从 `\n` 变成 `\r\n`，多一个空格，工具数组换个顺序——这些都会让命中率从 90% 直接归零。

到这里我开始怀疑自己的代码了。

---

## 二、回到自己的代码看看 prefix 到底是什么

把自己 Agent 的 prompt 完整 dump 出来，对照这个"一字不差"的标准逐字符检查。

第一眼看上去没毛病：

```
SYSTEM: 你是一个任务规划助手...
TOOLS: [search, code_search, file_read, bash, ...]
MESSAGES: [task description, ...]
```

但仔细一看，问题就来了。

**system prompt 顶部这一段：**

```python
SYSTEM_PROMPT = f"""
[meta]
session_id: {session_id}
current_time: {datetime.now().isoformat()}
user_role: {user.role}
[/meta]

你是一个任务规划助手，遵循以下规则：
...
"""
```

`session_id` 每次 loop 启动都 new 一个。`current_time` 精确到毫秒。`user_role` 在多用户场景下各不相同。

这三段任何一个动一下，整个 prefix 就变了。缓存直接 miss。

到这里我意识到一件事：**缓存命中率 0 不意外，是必然**。

---

## 三、既然原理清楚了，那各家厂商具体怎么搞的

带着这个"prefix 一字不差"的标准，我把七家厂商的缓存机制整理了一遍。这里有几个关键差异必须搞明白。

**触发方式分两类：**

- **显式**：Anthropic、Gemini、Kimi。需要手动加 `cache_control` 字段（或调 Cache API），不写就不缓存。
- **隐式**：OpenAI、DeepSeek、Qwen 隐式、GLM。系统自动检测 prefix，零配置。

我自己的 Agent 现在用的就是 Anthropic 的 SDK，但代码里从来没写过 `cache_control`——也就是说我连显式缓存都没启用，怪不得一直是 0。

**TTL 选择（Anthropic 提供两种）：**

- `5min`：写入费是 input 的 1.25 倍（相对便宜），适合请求密集场景
- `1h`：写入费是 input 的 2 倍，但容忍一小时不活跃

**写入费 vs 命中折扣的盈亏平衡：**

```
盈亏平衡命中率 ≈ 写入额外费率 / (1 - 缓存折扣率)
```

Anthropic 5min 模式 12.5% 起步，1h 模式 20% 起步。OpenAI / DeepSeek 没有写入费，0% 起步。

也就是说：只要不是"完全随机"的 prompt 场景，开缓存基本都是赚的。

---

## 四、Agent 场景为什么特别容易掉到坑里

把原理和厂商机制搞清楚之后，我回头再看自己的代码，发现 Agent 场景有几个特别容易踩坑的点。

**第一，调用频率高。** 一个 Loop 模式的 Agent 跑起来，调用频率从"一天几十次"变成"一天几万次"。原本一杯咖啡钱的偏差，乘以这个频率，足够买下整间咖啡馆。

**第二，prompt 结构很适合缓存，但也很容易破坏。** 长 system prompt + 工具定义 + 任务上下文，三段里前两段每次都一样——这正好是 prefix cache 最擅长省钱的形态。但只要任何一段塞进动态内容，整个 prefix 就废了。

**第三，loop 里很容易塞动态内容。** 时间戳、UUID、用户名、RAG 检索结果——这些在 loop 编程里都是非常自然的写法，每一条都在悄悄破坏缓存。

调研里看到一个很具体的案例：Claude Code 团队在 2026 年 3 月出过一个 Bug，工具定义列表顺序因为非确定性算法变动，缓存读取率从 97% 跌到 4–17%，有开发者一晚上烧掉 43% 的周配额。这个例子让我后背有点凉——这种 Bug 我们也完全可能写出来。

---

## 五、把反模式整理成 checklist

排查到这里，我把这次学到的反模式整理成一份 checklist，给我们项目里的其他人对照。

### 1. 动态内容进 system prompt

时间戳、UUID、会话 ID、用户名——只要进了 system prompt，prefix 就彻底不稳。

我自己的代码就是栽在这里。修法是：稳定内容放 system，动态信息作为最后一条 user message 传入。

### 2. 工具定义顺序不固定

工具数组根据用户权限动态过滤、字段顺序取决于字典迭代，这两种写法都会让整个 tools 段失效。

修法：工具定义用 `sort_keys=True` 序列化，工具数组顺序永远不变。权限差异通过 system prompt 说明，不要靠删除 tool 来体现。

### 3. RAG 检索结果塞进 system

检索结果每次 query 都不同，是动态内容。把它塞进 system，等于在 prefix 最前面放了一块每次都不一样的积木。

修法：检索结果放到 user message 里，或者在 Anthropic 模式下用 `cache_control` 把它作为独立断点缓存。

### 4. 多轮对话里总结/截断历史

为了省 token，每 N 轮总结一次历史然后替换掉整个 messages 数组——这个操作会改变 prefix，让缓存从头开始。

修法：append-only 历史。真的需要压缩时，新开一个 session，让 system 重新建立缓存。

### 5. JSON 和 Unicode 不统一

字段顺序、ensure_ascii、换行符、NFC/NFD 归一化——两个字节不同，就是两个 prefix。

修法：统一序列化规则，`json.dumps(..., ensure_ascii=False, sort_keys=True, separators=(",", ":"))`，文本入库前 `unicodedata.normalize("NFC", text)`。

---

## 六、顺手想到：中转站能"偷"缓存的钱吗

排查过程中顺便想到这个问题。去查了国内常见的"中转站"业务模式，才发现自己之前想得太简单了。

![中转站架构：单上游租户 + 多下游客户](/images/blog/agent-llm-cache-burn-money-guide/03-relay-station-architecture.webp)

先理一下中转站是什么：很多做模型分发的小公司，会以企业身份拿到 Anthropic / OpenAI 的统一上游账号，再用这个账号对外卖给 N 个下游客户。所有客户请求进来后走的是**同一个上游 API key**，落到厂商那边就是同一个 organization。这个结构和 SaaS 类的统一网关是一样的——上游单租户，下游多客户。

理解了这个背景，"中转站能不能靠缓存套利"这个问题就要重新拆。

**什么场景下能套利？**

当中转站的下游客户**使用了相同的 system prompt 模板**时，缓存套利就成立。一个典型的例子：某个 SaaS Agent 产品（多用户共用一套系统指令和工具定义），通过中转站统一调用 LLM。这种场景下，所有客户的请求 prefix 字节级一致，第一次请求写缓存，后续成千上万次请求都命中折扣价。

更现实一点的例子：很多开发者用同一个开源 Agent 框架（比如 LangChain / Dify 模板项目）搭自己的 Agent，system prompt 是项目模板里固定的，长得几乎一模一样。这些请求经过中转站聚合之后，prefix 命中概率会被显著放大。

**什么场景下套不出来？**

如果下游客户的 prompt 都是自己写的、彼此差异很大（最常见的情况），即使上游是单租户，prefix 也是 N 个不同的，缓存只能在每个客户自己重复调用时命中——这跟直接调用没有任何区别。聚合带来的额外收益约等于 0。

也就是说：**套利能不能成立，不取决于中转站聚合了多少调用，而取决于下游客户是否共享了同一份 prefix**。这是个反直觉的结论——直觉上觉得"量大就能省钱"，但缓存的瓶颈是 prefix 字节级重复，不是请求总数。

**还有一个反套利的约束：中转站的"加法"会破坏缓存。**

中转站为了做日志、计费、限流，常常会在请求外面包一层 wrapper（或者加 trace header、用户标识）。这个动作是在 prefix 上"加东西"——即使是稳定的 wrapper，对每个下游客户自己的缓存来说也是新的 prefix，反而把原本能命中的请求搞失效。所以中转站要拿到缓存红利，必须严格自律：不加东西，或者把附加信息挪到 messages 末尾。

**所以"偷"还是不"偷"，看姿态。**

技术层面，单租户中转站 + 下游共享 prompt 这个组合确实能产生**超过"客户各自直接调用"总和的额外缓存收益**——这部分是聚合带来的，没有中转站就不会存在。如果中转站把收益透明地按调用比例分给客户，是合理的商业模式；如果藏着不说、继续按原价收客户的钱、自己吃掉折扣，那就是"偷"。

调研下来我自己的判断是：**真正的难点不是技术，是治理**。技术上让一群 prefix 乱的调用变稳定，比单纯聚合调用量难得多。前者是工程活，后者是规模活——前者值钱。

---

## 七、这份排查给我的几点工程教训

回到我自己这个 Agent。排查做完，整理出几条准备落地的事：

**1. 清理 system prompt 的动态变量**

把嵌在 system 里的 session_id、user_id、current_time 全部挪到 messages 末尾。System prompt 应该是纯静态的。

**2. 工具定义序列化用 `sort_keys=True`，锁字段顺序**

权限差异挪到 system 里说明，不再靠删 tool 来体现。

**3. RAG 检索结果放 user message**

不再塞 system。需要缓存时用 `cache_control` 做独立断点。

**4. 监控 `cache_hit_rate`**

加一条专门的 metrics，按小时聚合，跌破 30% 自动告警。这是发现 prefix 被破坏的唯一可靠手段。

**5. 多轮对话 append-only**

不做总结压缩。需要压缩时开新 session。

**6. 启用 Anthropic `cache_control`**

我们 SDK 一直没用这个字段，等于显式缓存完全没开。准备在 system prompt 和 tools 段各加一个 `cache_control`，先跑一周看命中率。

这次排查最大的收获不是"原来缓存这么省钱"，而是**反过来的一个认知**：LLM 缓存不是一个"调开关"的功能，它是你整个 prompt 工程结构的副产品。每一次随手塞 UUID、随手根据权限过滤 tools、随手把 RAG 结果挪到 system——这些看起来都很正常的工程决策，每一条都在悄悄把缓存命中率往下踩。

Agent 时代，调用频率会把这些细节的代价放大到无法忽视。这份排查给我自己的最大价值，是把"我感觉没什么问题"变成一份具体的 checklist。