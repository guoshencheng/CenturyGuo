---
title: "流式续接：刷新之后,那 5 秒去哪儿了"
date: "2026-07-06"
tags: [agent, streaming, architecture, debugging]
description: "Agent 流式输出进行中刷新页面,已生成的文本会全部丢失。这次为修它,设计跨越前后端,核心是把 messageId 从 agent 一路穿透到 web。"
faq:
  - q: 流式输出进行中刷新页面,为什么会丢内容?
    a: 三件事同时发生:agent 还在跑、LLM 还在吐 token、新版前端页面重新连进来。问题是 agent 只在 step 完成时才把 assistant message 写盘,正在飞的那些 token 永远不落盘。刷新后调 GET /sessions/:id 拿回的 messages 最多只是上一步的完整内容,正在打字的那段在持久化层根本没记录。后续 SSE chunk 又找不到"目标 message"——前端合并逻辑要求最后一条是 assistant 才能 append,但刷新后最后一条是 user,所有 chunk 静默丢弃。
  - q: 为什么不直接给 SSE 加 Last-Event-ID 让服务端回放?
    a: HTTP 规范里 Last-Event-ID 看起来很美,实际上"续接点不是事件序号"。事件序号只能告诉你"漏了几条",不能告诉你"漏的内容是什么";真正续接的是字符串拼接 prevText + delta。如果服务端硬存原始 chunk 序列做回放,要解决两个工程问题:chunk 是边界信息(text/reasoning/tool-call 各类),需要服务端维持一个完整 reducer 才能重放出 parts;LLM 流式是高频的,完整存每个 chunk 内存+磁盘成本都吃不消。所以 OpenCode 也没实现 Last-Event-ID,选 REST 快照 + SSE delta 的方案。
  - q: 服务端内存维护 snapshot 跟持久化有什么区别?
    a: 持久化的 assistant message 是"已完成"的事实记录——内容定型,不再变;snapshot 是"进行中"的实时窗口——内容随每个 chunk 更新,run 结束即消失。三条边界由这条区分管:Agent 重启后只展示 JSONL 里最后一个完整 step,正好符合用户预期;正在流的内容天然不写盘,保存路径纯粹;快照清理时机紧贴 finish chunk 推送之前,防止迟到订阅者拿到 stale snapshot 又永远等不到 session-end。
  - q: 为什么 snapshot 必须带 messageId 而不是按"最后一条 assistant message"定位?
    a: 多步 ReAct 一步新建一条 assistant message,如果按"最后一条"这种前端约定去套,第二步的 snapshot 会盖掉第一步的内容——同一个 session 里两条消息混在一起,完全乱套。messageId 链路把"哪条 message 在流"这个问题从"位置猜测"变成"显式身份",由 agent 在创建 message 时声明一次,后续 snapshot 和 content chunk 都靠这个 id 找归属。web 侧再补一条 guard:content chunk 只对 status==='streaming' 的目标 message 追加,done 的不动——这条 guard 同时把"流式结束后又把持久化版再改一遍"的重复拼接也堵死了。
  - q: 订阅时同步 push snapshot 为什么不能中间有 await?
    a: 这是原子性的关键。JS 单线程保证:subscribe(...) 到下一个 read 之间如果没有 await,中间不会有任何 chunk 被 run() 处理,snapshot 反映订阅瞬间的内存状态,订阅后到达的 chunk 才进 queue 后被消费。如果中间插一个 await,理论上会有新 chunk 在两个动作之间被处理,但究竟是写进 snapshot 还是直接进 bus——两种行为交错,客户端收到的就是 snapshot + 部分重复 chunk 或部分丢失 chunk。代码层面这是个"看起来无关"的细节,但语义上是整条续接链路成立的前提。
---

# 流式续接：刷新之后,那 5 秒去哪儿了

![刷新后流式内容消失:左屏正在打字,右屏整段不见,中间标 5s GAP](/images/blog/agent-streaming-resume-after-refresh/04-wechat-header.webp)

上一篇聊了多 Agent 一根 SSE 总管的方案（[一根 SSE 总管，撑起整个 Agent 流式](/posts/one-sse-stream-multiple-agents)）。但有个场景一直让我心里发毛：**用户在流式进行中按 F5**。OpenCode 那种 REST snapshot + SSE delta 的组合能 solve 断线重连，前提是消息已经持久化。流到一半呢？内存里正在打字机滚动的那些 token，重连后从哪里捞回来？

这周终于坐下来啃这个 bug。讨论从「服务端把 snapshot merge 进 `getMessages`」开始，到「bus 新订阅者上线主动 push snapshot」，最后发现问题的真正关键是一个**贯穿前后端的 messageId 链路**。下面按推理顺序复盘整个过程。

## 一、问题不只是「刷新」

一个细节容易被忽略：**前端刷新 ≠ 后端 run 停止**。后端进程还在跑，LLM 还在吐 token，前端的 SSE 连接只是被浏览器关掉了，下次进来会重新连。

我们当前的形态是这样的：

- **agent 服务**：负责推理循环，发出 stream 事件；agent 在每个 step 结束时把完整 assistant message 落盘；
- **web**（前端）：拿到 messages 后渲染，订阅 SSE 端点接收增量。

这里的**关键约束**决定了问题的形状：agent 落盘**只**在 step 完成时，**正在流的内容天然不落盘**。这意味着刷新后调 `GET /sessions/:id` 拿回的 messages 里，**永远不会包含正在打字的内容**——它要么是 user message，要么是上一个完整 step 之后的 assistant message（内容还是上一步的）。

前端拿不到正在流的内容，又如何收到后续 chunks？再看一段既有代码：

```typescript
case 'chunk': {
  // 要求 lastMsg.role === 'assistant' 才合并
  state.messages = state.messages.map((m) =>
    /* 如果是最后一条且是 assistant,append */
  )
}
```

但刷新后最后一条是 user。chunk 来了找不到挂靠点，**全部静默丢掉**。这是真实的 bug：刷新之后 streaming 中已生成的内容整段消失，只剩持久化的最后一步。

![刷新前后两个窗口:左屏流到一半被打断,右屏只剩已落盘的那部分](/images/blog/agent-streaming-resume-after-refresh/01-page-refresh-lost-content.webp)

## 二、最初的直觉：「查询 + 流式」不就够了吗

第一直觉是「不用搞那么复杂吧，刷新后重新查 messages、订阅 bus，bus 后续 chunk 自然追加」。讨论一开始就被否了。原因要回到 bus 的具体实现：

```typescript
const unsub = bus.subscribe((event) => {
  // 新订阅者只接收 subscribe 之后的 events
});
```

新订阅者**只能收到订阅之后**到达的 chunk。刷新发生在 streaming 中段，bus 上那些正在飞的 chunk 全部错过；之后到达的 chunk 又因为没有"目标 message"被前端丢掉。单纯"查 + 订阅"的组合在这里啥也恢复不了——**bus 缺一个 replay buffer**。

到这里有三条岔路：

| 方案 | 思路 | 代价 |
|------|------|------|
| **A** 给 bus 加 replay buffer | 新订阅者上线时回放最近 N 个 chunk | bus 多了一层状态；历史 chunk 重新构造的代价不一定小 |
| **B** agent 端内存维护 snapshot，新订阅者上线时主动 push | snapshot 不动 getMessage，独立通道下发 | snapshot 与持久化的边界要划清楚 |
| **C** 每个 chunk 都写盘到 `{sessionId}.streaming.json` | Agent 重启也能恢复 | 每 token 一次磁盘 I/O，违反"append-only JSONL"的简洁 |

倾向方案 B：**snapshot 纯内存，新订阅者上线时同步 push**。上一篇文章在"续接点的真相"那段提过"REST 快照是真相、SSE 是续接"的总范式，但本篇的具体落地其实跟那个范式不完全一样——上一篇假设消息已经持久化了（标准断线重连的场景），本篇要解决的是**消息还没落盘**就被刷新的场景，所以走的是订阅通道直接 push 内存 snapshot，不另开 REST 端点。Agent 重启后只展示最后一条 step 的内容——这正是我们想要的行为，不需要为了"理论上能恢复"付出每 chunk 落盘的代价。

![三条岔路:replay buffer / 内存 snapshot push / 每个 chunk 都写盘](/images/blog/agent-streaming-resume-after-refresh/02-three-options.webp)

## 三、转折点：snapshot 必须带 messageId

方案敲定后，一个新问题冒出来：**snapshot 应用到哪条 message 上？**

现有实现里，"streaming message"只是**前端约定**——前端维护一个 `currentAssistantMessageId` ref，chunks 来了就追加到 id 对应的那条。问题在于：

- 后端 agent 创建 assistant message 时生成 id（记作 A）；
- 前端 `send()` 也生成了一个本地 id（记作 B）；
- snapshot 里如果只带 parts，前端就不知道它属于 A 还是 B。

如果按"最后一条 assistant message"这种脆弱约定硬碰，多步 ReAct 走下来必然乱。第二步的 snapshot 会错误地覆盖第一步的内容。

由此推出**贯穿前后端的 messageId 链路**：

```
agent 端                                          web 端
──────                                            ─────
create assistant msg (id=M)
   │
   ├─ emit message-start{M} ─▶ 记录 snapshot[s] = (M, []) ─▶ ensure msg(id=M)
   │                                                              ↑↑↑ 用它定位
streaming chunk ────────────▶ snapshot[s] = reduce(parts, chunk) ─▶ 写入 msg(id=M)
```

![messageId 从 agent 一路穿透到 web:同一颗 M 之星贯穿 message-start / snapshot push / web locates 三个节点](/images/blog/agent-streaming-resume-after-refresh/03-messageid-link.webp)

要做的事情其实很清楚：

1. **agent 端**的 stream 事件类型新增一个变体 `message-start { step, messageId }`，在 assistant message 被创建时发出，并在**复用已有 message 时不重复发**；
2. **agent 服务**层维护一份 per-session 的 streaming snapshot（sessionId → messageId + 累积 parts），在流上每个 content chunk 更新；订阅通道第一件事就是把当前所有运行中的 session 的 snapshot 主动 push 给新订阅者；
3. **web** 用 messageId 找目标 message：snapshot 设 parts，content chunk 仅对 `id === messageId && status === 'streaming'` 的 message 追加，**done 的不动**——这条 guard 直接杜绝了"流式结束后又把持久化版再改一遍"的重复拼接。

## 四、顺手修掉的事件丢弃 Bug

梳理 web 端逻辑时还揪出一个潜在的 bug：

```typescript
case 'chunk': {
  if (!state) {
    ensureSession(event.sessionId);  // 异步,不 await
    state = map.get(event.sessionId); // 仍 undefined
    if (!state) return;               // 当前 chunk 被丢
  }
  // ...
}
```

从未打开过的 session（用户在看 A 会话，但 B 后台还在跑）一旦 chunk 到达，state 还没建好就被丢掉。snapshot 推送机制恰好会让这个 bug 显形，所以索性一并修：用一个 pending 队列缓存未初始化 session 的事件，加载完成后按序 replay，并通过一个加载锁去重并发触发。

## 五、架构

最关键的一条不变式：**订阅动作与 snapshot 读取之间严禁 `await`**。JS 单线程保证了这两段代码之间不会有新 chunk 被处理——snapshot 反映订阅瞬间的内存状态，订阅后到达的 chunk 进 queue，两者严丝合缝，不漏不重。

```
时间线（一次 run）
────────────────────────────────────────────────────────────▶

agent creates msg(M)
  └─ emit message-start{M}
snapshot[s] = {messageId: M, parts: []}

content chunk 1 ─▶ snapshot[s] = reduce(snapshot.parts, c1)
content chunk 2 ─▶ snapshot[s] = reduce(snapshot.parts, c2)
[此时新订阅者上线] ─▶ subscribe(...)
                       └ 同步,无 await ─▶ 读 snapshot[s] = (M, parts)
                                       └▶ yield { type: 'snapshot', messageId: M, parts }

content chunk 3 ─▶ snapshot 更新
content chunk 4 ─▶ snapshot 更新

step finish
  └─ agent: onStepFinish save → 完整 assistant msg(id=M) 落盘
  └─ 服务层: 处理 finish chunk → 先 snapshot.clear(s)
                            再 publish session-end
                            (防迟到订阅者拿到 stale snapshot + 永远等不到 session-end)
run finally ─▶ safety net: snapshot.clear(s)
```

## 六、整体架构：四件事

回头看整个方案，其实就四件事：

**1. agent 端在创建 assistant message 时声明 id，把 messageId 通过 `message-start` 事件暴露给流的下游。** 这是 messageId 链路的起点。snapshot 与 chunk 都靠这个 id 找到自己的归属 message。复用已有 message 时**不重复**发出——这是天然 invariant，因为 reuse 路径压根不进新建分支。

**2. 服务端为每个正在运行的 session 维护一份内存 snapshot（messageId + 累积 parts）。** snapshot 只活在 run 内存里，绝不写盘；step 完成时由 `onStepFinish` 落盘完整 msg 并清理对应 snapshot。Agent 重启即丢失，正符合预期。

**3. 新订阅者上线时，agent 端把当前所有运行中 session 的 snapshot 同步 push 出去。** 关键不变式：订阅动作与 snapshot 读取之间不能有 `await`，否则新 chunk 可能夹在两者中间被处理，造成重复或丢失。JS 单线程保证了这种「subscribe-then-read-snapshot」模式天然原子。

**4. web 端用 messageId 定位目标 message。** snapshot 设 parts，content chunk 仅对 `id === messageId && status === 'streaming'` 的 message 追加。`done` 的不动——这条 guard 直接把"流式结束后又改一遍持久化版"的重复拼接堵死。同时多了一个原本不明显的 bug 顺手修了：从未初始化 session 到达的 chunk 不再被丢，而是缓存→加载→按序 replay。

四件事合起来，构成了一条完整的流式续接通道：从「消息没持久化」到「重启 snapshot 丢失」「断线补传」「未初始化 session 的事件补齐」，每一种边界情况都有对应的不变式在托底。

多步 ReAct、Agent 重启、bus 重连这些边界的细节 FAQ，等到续接真在本地验过、补完日志再开一篇展开。

---

相关文章：

- [一根 SSE 总管，撑起整个 Agent 流式](/posts/one-sse-stream-multiple-agents) — 上一篇文章解释了为什么是单一 SSE + 多虚拟 channel；
- [流式，Agent 的神经系统](/posts/agent-streaming-nervous-system) — 更早的流式协议与 message model 设计。
