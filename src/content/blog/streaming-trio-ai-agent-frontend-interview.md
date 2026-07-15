---
title: "流式三连：AI Agent 前端面试题，从网络到调度"
date: "2026-07-15"
tags: [interview, streaming, sse, react, performance]
description: "AI Agent 前端三道流式面试题——SSE vs WebSocket、长文本渲染不卡顿、React Fiber 对高频更新的优势——从 TCP chunked、SSE 四种实现方式（fetch+ReadableStream / EventSource / XHR / Node）、增量 DOM、时间切片、Lane 模型一路讲透。"
faq:
  - q: 为什么流式是 AI 前端工程师的高频考点？
    a: 因为 LLM 推理是流式的：模型按 token 增量产出，前端要在「网络传输」「文本渲染」「调度执行」三层同时把体验做好。这三层恰好对应三道经典面试题——SSE vs WebSocket、长 Markdown 不卡顿、React Fiber 高频更新——也是 AI 前端面试里最稳定的一条考察主线。
  - q: SSE 和 WebSocket 的根本区别是什么？
    a: 协议层不同。SSE 是单向 HTTP 长连接，用 HTTP/1.1 的 Chunked Transfer Encoding 复用 HTTP 语义，浏览器消费方式至少有四种：fetch+ReadableStream（新项目默认，POST+header+Worker+AbortController 全支持）、EventSource（经典 API，浏览器内置自动重连并自动发 Last-Event-ID）、XHR+onprogress（老环境兜底）、Node 服务端几行代码即可起流式端点；WebSocket 是 HTTP Upgrade 之后切换的独立双工协议（ws:// 二进制帧），重连、心跳、消息顺序都要自己写。AI 流式输出是服务端→客户端单向场景，SSE 几乎总是更轻的选择，WebSocket 在需要客户端反向控制（取消、参数变更）时再考虑。
  - q: 为什么大段 AI 输出在前端会卡？
    a: 三个原因叠加：整段 Markdown 解析是同步重 CPU 操作（2000 字 + 20 个代码块可能 100–300ms）、整段 innerHTML 替换触发整棵 DOM 重建、Shiki/Prism 代码高亮是同步 CPU 密集。生产方案是分片解析（增量找到稳定段落渲染）、Web Worker 跑高亮、增量 DOM（修改 Text.data 而非 innerHTML 替换）、关键 CSS 避免 layout 触发。
  - q: React Fiber 凭什么能扛流式高频更新？
    a: Fiber 把渲染从「递归同步」改成「链表 + 可中断工作循环」。每次 render 是 5ms 的工作单元，让出主线程后能继续；从「一次完整 render」变成「可暂停、可恢复、可优先级调度的渐进式 render」。流式场景里，token 增量渲染自动用 TransitionLane 低优先级，让位给 SyncLane 的用户输入和点击，体验比 Stack 时代好得多。
  - q: startTransition 在流式里到底解决了什么问题？
    a: 解决了「更新太频繁、用户被打断」的问题。直接 setState 是 DefaultLane，每秒几十次更新会卡住用户输入；包在 startTransition 里变成 TransitionLane，可中断、低优先级，浏览器知道可以延迟。再叠加 rAF 节流（攒 16ms 的 token 一次更新），就是「流式丝滑 + 用户输入不卡」的标准组合拳。
  - q: 三道题之间是什么关系？
    a: 它们是同一条流式工程链路的三个截面：网络层（怎么把增量 token 拉过来）→ 渲染层（拉过来的 token 怎么不卡）→ 调度层（不卡的关键是给高频更新让优先级）。三层都做对，整体才是「流式不卡」；只做对一层，其余两层会成为新瓶颈。面试答到这条主线的人，三层怎么变形都能稳稳接住。
---

# 流式三连：AI Agent 前端面试题，从网络到调度

最近在网上看到一些 AI 前端开发的面试题，发现 3 轮 18 题里有 3 道直接指向流式输出——一面考网络层、二面考渲染层、二面还考 React 调度层。这不是巧合。

LLM 推理是流式的：模型按 token 增量产出，前端的活就是把这一串 token「活着地」画到屏幕上，不卡、不抖、不漏。三道题对应三个层面：网络层怎么把增量拉过来、渲染层怎么不卡、调度层怎么在高频更新下保住响应。

把这三层串起来看，流式面试题不是零散知识点，是一条完整的工程链路。下面按这三层拆开讲，每层从原理到落地。

## 一、网络层：SSE vs WebSocket

> 原题：在 AI 对话场景中，经常用到流式输出，请说明 SSE 和 WebSocket 的区别。

这道题表面在问两种「长连接」协议，本质在考**你对单向 vs 双工、HTTP 复用 vs 协议升级的理解**。

### 1.1 网络协议原理：从 TCP 握手到应用层协议

SSE 和 WebSocket 都跑在 TCP 之上。要讲清两者的差异，**必须从 TCP 通信的最底层看起**——看每一层协议在 TCP 连接上怎么承载数据、状态机怎么转移、数据怎么切分。

#### 1.1.1 一切的开端：TCP 三次握手

任何基于 TCP 的协议（SSE / WebSocket / HTTP / gRPC 等等）通信前都要先做 TCP 三次握手。RFC 793 定义的状态机：

<svg viewBox="0 0 720 360" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;background:#fafafa;border-radius:8px;display:block;margin:1em auto;">
  <defs>
    <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0 0 L10 5 L0 10 z" fill="#333"/>
    </marker>
  </defs>
  <text x="360" y="25" text-anchor="middle" font-size="16" font-weight="bold" fill="#222">TCP 三次握手（RFC 793）</text>
  <rect x="100" y="55" width="160" height="38" rx="4" fill="#e3f2fd" stroke="#1976d2" stroke-width="1.5"/>
  <text x="180" y="79" text-anchor="middle" font-size="13" fill="#0d47a1" font-weight="bold">Client (Browser)</text>
  <rect x="460" y="55" width="160" height="38" rx="4" fill="#fff3e0" stroke="#f57c00" stroke-width="1.5"/>
  <text x="540" y="79" text-anchor="middle" font-size="13" fill="#e65100" font-weight="bold">Server (Backend)</text>
  <line x1="180" y1="93" x2="180" y2="320" stroke="#1976d2" stroke-dasharray="4 3"/>
  <line x1="540" y1="93" x2="540" y2="320" stroke="#f57c00" stroke-dasharray="4 3"/>
  <text x="180" y="335" text-anchor="middle" font-size="11" fill="#0d47a1">CLOSED → SYN_SENT</text>
  <text x="540" y="335" text-anchor="middle" font-size="11" fill="#e65100">CLOSED → LISTEN → SYN_RCVD</text>
  <line x1="180" y1="125" x2="540" y2="125" stroke="#333" stroke-width="1.5" marker-end="url(#arr)"/>
  <text x="360" y="115" text-anchor="middle" font-size="12" fill="#333" font-weight="bold">① SYN</text>
  <text x="360" y="142" text-anchor="middle" font-size="10" fill="#666">seq=x (ISN), SYN=1, ACK=0</text>
  <line x1="540" y1="180" x2="180" y2="180" stroke="#333" stroke-width="1.5" marker-end="url(#arr)"/>
  <text x="360" y="170" text-anchor="middle" font-size="12" fill="#333" font-weight="bold">② SYN + ACK</text>
  <text x="360" y="197" text-anchor="middle" font-size="10" fill="#666">seq=y, ack=x+1, SYN=1, ACK=1</text>
  <line x1="180" y1="235" x2="540" y2="235" stroke="#333" stroke-width="1.5" marker-end="url(#arr)"/>
  <text x="360" y="225" text-anchor="middle" font-size="12" fill="#333" font-weight="bold">③ ACK</text>
  <text x="360" y="252" text-anchor="middle" font-size="10" fill="#666">seq=x+1, ack=y+1, ACK=1</text>
  <text x="360" y="280" text-anchor="middle" font-size="11" fill="#2e7d32" font-weight="bold">双方进入 ESTABLISHED</text>
  <text x="360" y="298" text-anchor="middle" font-size="10" fill="#666">此后 TCP 连接可双向传输字节流</text>
</svg>

**LLM 工程师需要懂的是**：SSE / WebSocket 都跑在 TCP 之上，连接首先要过三次握手；TCP 头部有几个字段会直接影响流式体验：

- **FIN / RST**：决定连接关闭。SSE 取消 = 客户端发 FIN，触发服务端 `req.on('close')`；WebSocket 取消 = close frame + FIN 两步走。
- **Window Size**：OS 层的背压机制——前端处理慢 → TCP 接收缓冲填满 → Window=0 → 服务端 `write()` 阻塞。**SSE 和 WebSocket 共用同一套机制**，生产上要自己用 rAF / setTimeout 节流（详见 §3.5）。

#### 1.1.2 SSE 的完整时序

SSE 的本质是「**让一个 HTTP 响应永不结束**」。从 LLM 流式场景看的完整时序：

<svg viewBox="0 0 760 700" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;background:#fafafa;border-radius:8px;display:block;margin:1em auto;">
  <defs>
    <marker id="arr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0 0 L10 5 L0 10 z" fill="#333"/>
    </marker>
    <marker id="arr2g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0 0 L10 5 L0 10 z" fill="#2e7d32"/>
    </marker>
    <marker id="arr2r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0 0 L10 5 L0 10 z" fill="#c62828"/>
    </marker>
  </defs>
  <text x="380" y="22" text-anchor="middle" font-size="15" font-weight="bold" fill="#222">SSE 通过 TCP 通信的完整时序</text>
  <rect x="100" y="45" width="140" height="34" rx="4" fill="#e3f2fd" stroke="#1976d2" stroke-width="1.5"/>
  <text x="170" y="67" text-anchor="middle" font-size="13" fill="#0d47a1" font-weight="bold">Browser</text>
  <rect x="520" y="45" width="140" height="34" rx="4" fill="#fff3e0" stroke="#f57c00" stroke-width="1.5"/>
  <text x="590" y="67" text-anchor="middle" font-size="13" fill="#e65100" font-weight="bold">SSE Server</text>
  <line x1="170" y1="79" x2="170" y2="660" stroke="#1976d2" stroke-dasharray="4 3"/>
  <line x1="590" y1="79" x2="590" y2="660" stroke="#f57c00" stroke-dasharray="4 3"/>
  <text x="60" y="105" font-size="11" fill="#666" font-weight="bold">① TCP 握手</text>
  <line x1="170" y1="108" x2="590" y2="108" stroke="#999" stroke-width="1" marker-end="url(#arr2)"/>
  <line x1="590" y1="123" x2="170" y2="123" stroke="#999" stroke-width="1" marker-end="url(#arr2)"/>
  <line x1="170" y1="138" x2="590" y2="138" stroke="#999" stroke-width="1" marker-end="url(#arr2)"/>
  <text x="380" y="155" text-anchor="middle" font-size="10" fill="#888">SYN → SYN+ACK → ACK</text>
  <text x="60" y="180" font-size="11" fill="#666" font-weight="bold">② HTTP 请求</text>
  <line x1="170" y1="183" x2="590" y2="183" stroke="#333" stroke-width="1.5" marker-end="url(#arr2)"/>
  <text x="380" y="175" text-anchor="middle" font-size="11" fill="#333" font-weight="bold">GET /agent/stream HTTP/1.1</text>
  <text x="380" y="197" text-anchor="middle" font-size="10" fill="#666">Host: api.example.com  Authorization: Bearer xxx</text>
  <line x1="590" y1="220" x2="170" y2="220" stroke="#333" stroke-width="1.5" marker-end="url(#arr2)"/>
  <text x="380" y="212" text-anchor="middle" font-size="11" fill="#333" font-weight="bold">HTTP/1.1 200 OK</text>
  <text x="380" y="234" text-anchor="middle" font-size="10" fill="#666">Content-Type: text/event-stream; charset=utf-8</text>
  <text x="380" y="248" text-anchor="middle" font-size="10" fill="#c62828" font-weight="bold">Transfer-Encoding: chunked  ← 关键</text>
  <text x="380" y="262" text-anchor="middle" font-size="10" fill="#666">Connection: keep-alive</text>
  <text x="60" y="290" font-size="11" fill="#666" font-weight="bold">③ 持续推数据</text>
  <line x1="590" y1="298" x2="170" y2="298" stroke="#2e7d32" stroke-width="1.5" marker-end="url(#arr2g)"/>
  <text x="380" y="290" text-anchor="middle" font-size="10" fill="#2e7d32">5\r\ndata: 你好\r\n\r\n</text>
  <text x="380" y="312" text-anchor="middle" font-size="9" fill="#888">chunk-size=5 字节；SSE message = "你好"</text>
  <line x1="590" y1="332" x2="170" y2="332" stroke="#2e7d32" stroke-width="1.5" marker-end="url(#arr2g)"/>
  <text x="380" y="324" text-anchor="middle" font-size="10" fill="#2e7d32">12\r\ndata: 很高兴认识你\r\n\r\n</text>
  <line x1="590" y1="365" x2="170" y2="365" stroke="#999" stroke-width="1" marker-end="url(#arr2)"/>
  <text x="380" y="358" text-anchor="middle" font-size="10" fill="#888">: keep-alive\r\n\r\n  ← SSE 注释行</text>
  <text x="380" y="380" text-anchor="middle" font-size="9" fill="#888">浏览器不派发给 message 监听器</text>
  <line x1="590" y1="405" x2="170" y2="405" stroke="#2e7d32" stroke-width="1.5" marker-end="url(#arr2g)"/>
  <text x="380" y="397" text-anchor="middle" font-size="10" fill="#2e7d32">N\r\ndata: ...\r\n\r\n  ← 持续推</text>
  <text x="380" y="420" text-anchor="middle" font-size="9" fill="#888">每 chunk 一条 SSE message，chunked 编码自带边界</text>
  <text x="60" y="450" font-size="11" fill="#666" font-weight="bold">④ 关闭</text>
  <line x1="170" y1="458" x2="590" y2="458" stroke="#c62828" stroke-width="1.5" marker-end="url(#arr2r)"/>
  <text x="380" y="450" text-anchor="middle" font-size="10" fill="#c62828">客户端 reader.cancel() → abort</text>
  <text x="380" y="472" text-anchor="middle" font-size="9" fill="#888">TCP 段 FIN=1 发到服务端</text>
  <line x1="590" y1="498" x2="170" y2="498" stroke="#c62828" stroke-width="1.5" marker-end="url(#arr2r)"/>
  <text x="380" y="490" text-anchor="middle" font-size="10" fill="#c62828">服务端 req.on('close') 触发</text>
  <text x="380" y="512" text-anchor="middle" font-size="9" fill="#888">abort LLM 调用；res.end() 关闭响应</text>
  <line x1="170" y1="535" x2="590" y2="535" stroke="#c62828" stroke-width="1.5" marker-end="url(#arr2r)"/>
  <line x1="590" y1="555" x2="170" y2="555" stroke="#c62828" stroke-width="1.5" marker-end="url(#arr2r)"/>
  <line x1="170" y1="575" x2="590" y2="575" stroke="#c62828" stroke-width="1.5" marker-end="url(#arr2r)"/>
  <text x="380" y="600" text-anchor="middle" font-size="10" fill="#888">FIN + ACK 交换：四次挥手释放连接</text>
  <rect x="80" y="625" width="600" height="50" rx="4" fill="#fffde7" stroke="#f9a825" stroke-width="1.2"/>
  <text x="380" y="645" text-anchor="middle" font-size="12" fill="#5d4037" font-weight="bold">关键：SSE 始终是 HTTP 协议</text>
  <text x="380" y="662" text-anchor="middle" font-size="10" fill="#5d4037">TCP 连接里承载的是 HTTP 报文，HTTP 用 chunked transfer 让响应「源源不断」</text>
</svg>

**几个关键点**：

**1. 始终是 HTTP 协议**。200 OK 之后，TCP 连接里承载的就是 HTTP 报文流。每个 `data: ...\n\n` 是 HTTP chunked 编码的一个 chunk——`5\r\n` 是 5 字节长度声明（十六进制），`data: 你好\r\n\r\n` 是 chunk 内容。**HTTP 协议层负责消息边界**，TCP 只负责可靠字节流。

**2. 客户端关闭 = abort = TCP FIN**。`reader.cancel()` 会立即关闭 TCP 连接，触发 TCP 段 FIN=1 发到服务端，**这是实现「用户点停止按钮 → 后端立即取消 LLM」的底层原理**。这个链路比 WebSocket 简单——WebSocket 还要先发 close frame，触发 TCP FIN。

**3. 永不主动 FIN 的隐患**。如果客户端一直不关连接、服务端一直 `res.write()`，TCP 连接会一直占着 fd（文件描述符）。Nginx 默认 `keepalive_timeout` 75s、Node 默认 socket 5 分钟 idle 关闭，**生产必须配合心跳（`: keep-alive\n\n`）和 idle 超时**，否则线上会看到大量 TIME_WAIT 和 CLOSE_WAIT 状态连接。

**4. `Transfer-Encoding: chunked` 才是流式本质**。这个 header 让响应可以**不写 `Content-Length`**——TCP 流式写，HTTP 协议层按 chunk-size 切片，消费端按 `\n\n` 切分消息。**SSE 不是一个独立的协议，是「chunked HTTP + 特定文本格式」的组合**。

#### 1.1.3 WebSocket 的完整 TCP 通信时序

WebSocket 的本质是「**在 TCP 上把 HTTP 协议切换成另一个协议**」。完整时序：

<svg viewBox="0 0 760 720" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;background:#fafafa;border-radius:8px;display:block;margin:1em auto;">
  <defs>
    <marker id="arr3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0 0 L10 5 L0 10 z" fill="#333"/>
    </marker>
    <marker id="arr3r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0 0 L10 5 L0 10 z" fill="#c62828"/>
    </marker>
  </defs>
  <text x="380" y="22" text-anchor="middle" font-size="15" font-weight="bold" fill="#222">WebSocket 通过 TCP 通信的完整时序</text>
  <rect x="100" y="45" width="140" height="34" rx="4" fill="#e3f2fd" stroke="#1976d2" stroke-width="1.5"/>
  <text x="170" y="67" text-anchor="middle" font-size="13" fill="#0d47a1" font-weight="bold">Browser</text>
  <rect x="520" y="45" width="140" height="34" rx="4" fill="#fff3e0" stroke="#f57c00" stroke-width="1.5"/>
  <text x="590" y="67" text-anchor="middle" font-size="13" fill="#e65100" font-weight="bold">WS Server</text>
  <line x1="170" y1="79" x2="170" y2="680" stroke="#1976d2" stroke-dasharray="4 3"/>
  <line x1="590" y1="79" x2="590" y2="680" stroke="#f57c00" stroke-dasharray="4 3"/>
  <text x="60" y="105" font-size="11" fill="#666" font-weight="bold">① TCP 握手</text>
  <line x1="170" y1="108" x2="590" y2="108" stroke="#999" stroke-width="1" marker-end="url(#arr3)"/>
  <line x1="590" y1="123" x2="170" y2="123" stroke="#999" stroke-width="1" marker-end="url(#arr3)"/>
  <line x1="170" y1="138" x2="590" y2="138" stroke="#999" stroke-width="1" marker-end="url(#arr3)"/>
  <text x="380" y="155" text-anchor="middle" font-size="10" fill="#888">SYN → SYN+ACK → ACK</text>
  <text x="60" y="180" font-size="11" fill="#666" font-weight="bold">② HTTP Upgrade</text>
  <line x1="170" y1="183" x2="590" y2="183" stroke="#333" stroke-width="1.5" marker-end="url(#arr3)"/>
  <text x="380" y="175" text-anchor="middle" font-size="11" fill="#c62828" font-weight="bold">GET /chat HTTP/1.1</text>
  <text x="380" y="197" text-anchor="middle" font-size="10" fill="#c62828">Upgrade: websocket  Connection: Upgrade</text>
  <text x="380" y="211" text-anchor="middle" font-size="10" fill="#c62828">Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==</text>
  <text x="380" y="225" text-anchor="middle" font-size="10" fill="#c62828">Sec-WebSocket-Version: 13</text>
  <line x1="590" y1="252" x2="170" y2="252" stroke="#333" stroke-width="1.5" marker-end="url(#arr3)"/>
  <text x="380" y="244" text-anchor="middle" font-size="12" fill="#2e7d32" font-weight="bold">HTTP/1.1 101 Switching Protocols</text>
  <text x="380" y="266" text-anchor="middle" font-size="10" fill="#2e7d32">Upgrade: websocket  Connection: Upgrade</text>
  <text x="380" y="280" text-anchor="middle" font-size="10" fill="#2e7d32">Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=</text>
  <text x="380" y="298" text-anchor="middle" font-size="9" fill="#888">↑ 101 是协议分水岭，TCP 承载的不再是 HTTP 报文</text>
  <text x="60" y="325" font-size="11" fill="#666" font-weight="bold">③ WebSocket 帧</text>
  <line x1="590" y1="335" x2="170" y2="335" stroke="#1565c0" stroke-width="1.5" marker-end="url(#arr3)"/>
  <text x="380" y="327" text-anchor="middle" font-size="10" fill="#1565c0">text frame: FIN=1, opcode=0x1, MASK=1</text>
  <text x="380" y="350" text-anchor="middle" font-size="10" fill="#1565c0">payload: "你好" (XOR mask 后)</text>
  <line x1="170" y1="380" x2="590" y2="380" stroke="#6a1b9a" stroke-width="1.5" marker-end="url(#arr3)"/>
  <text x="380" y="372" text-anchor="middle" font-size="10" fill="#6a1b9a">binary frame: FIN=1, opcode=0x2, MASK=1</text>
  <text x="380" y="394" text-anchor="middle" font-size="10" fill="#6a1b9a">payload: &lt;Uint8Array 图像字节&gt;</text>
  <line x1="590" y1="425" x2="170" y2="425" stroke="#1565c0" stroke-width="1.5" marker-end="url(#arr3)"/>
  <text x="380" y="417" text-anchor="middle" font-size="10" fill="#1565c0">text frame: FIN=1, opcode=0x1, MASK=1</text>
  <line x1="590" y1="465" x2="170" y2="465" stroke="#999" stroke-width="1" marker-end="url(#arr3)"/>
  <text x="380" y="458" text-anchor="middle" font-size="10" fill="#888">ping frame (opcode=0x9)</text>
  <line x1="170" y1="485" x2="590" y2="485" stroke="#999" stroke-width="1" marker-end="url(#arr3)"/>
  <text x="380" y="478" text-anchor="middle" font-size="10" fill="#888">pong frame (opcode=0xA) ← 协议栈自动回</text>
  <text x="60" y="515" font-size="11" fill="#666" font-weight="bold">④ 关闭</text>
  <line x1="170" y1="525" x2="590" y2="525" stroke="#c62828" stroke-width="1.5" marker-end="url(#arr3r)"/>
  <text x="380" y="517" text-anchor="middle" font-size="10" fill="#c62828">close frame: opcode=0x8, code=1000</text>
  <line x1="590" y1="550" x2="170" y2="550" stroke="#c62828" stroke-width="1.5" marker-end="url(#arr3r)"/>
  <text x="380" y="542" text-anchor="middle" font-size="10" fill="#c62828">close frame: opcode=0x8, code=1000</text>
  <line x1="170" y1="578" x2="590" y2="578" stroke="#c62828" stroke-width="1.5" marker-end="url(#arr3r)"/>
  <line x1="590" y1="598" x2="170" y2="598" stroke="#c62828" stroke-width="1.5" marker-end="url(#arr3r)"/>
  <line x1="170" y1="618" x2="590" y2="618" stroke="#c62828" stroke-width="1.5" marker-end="url(#arr3r)"/>
  <text x="380" y="643" text-anchor="middle" font-size="10" fill="#888">close 帧交换 → TCP 四次挥手</text>
  <rect x="80" y="660" width="600" height="48" rx="4" fill="#fffde7" stroke="#f9a825" stroke-width="1.2"/>
  <text x="380" y="680" text-anchor="middle" font-size="12" fill="#5d4037" font-weight="bold">关键：101 之后 TCP 切换到 WebSocket 协议</text>
  <text x="380" y="697" text-anchor="middle" font-size="10" fill="#5d4037">HTTP 退场，所有数据是 WebSocket 帧（FIN + opcode + payload）</text>
</svg>

**几个关键点**：

**1. 101 是协议分水岭**。101 之前 TCP 上是 HTTP 报文，101 之后 TCP 上是 WebSocket 帧。**HTTP 在这一刻退场**，不再是请求-响应模型，而是双向帧流。服务端返回的 `Sec-WebSocket-Accept` 是基于客户端 key + 固定 magic string 算出来的 SHA-1，**作用是防止误把 HTTP 升级到 WebSocket**（跨协议攻击防护）。

**2. 双向通信的工程含义**。101 之后 TCP 是双向帧流——**任何时刻两端都可发起请求**，不像 HTTP 必须是 client-initiated。但**"双向"对 LLM 流式的价值被高估了**——SSE 的核心能力就是「服务端任意时刻主动推」，WebSocket 多出来的「客户端在流式过程中主动推」对 LLM 流式几乎用不到（详见 §1.3.2）。

用 WebSocket 双向的**工程成本**很重：

- **心跳 ping/pong 要自己实现**——浏览器 WebSocket API 不发 ping，生产 `setInterval` 每 30s 发，60s 没响应主动断开重连
- **消息序号、ACK、去重都要应用层做**——WebSocket 帧没有协议级 ACK，断线重连后所有应用层消息丢失
- **服务端要维护每条连接的状态**——N 条连接 = N 份会话上下文，资源占用远高于 HTTP
- **可观测性差**——CDN / APM / 防火墙看不到二进制帧内容，`curl` 不能订阅，排查问题要 `wscat` / Chrome DevTools

**3. close 帧带 reason**。WebSocket 关闭先发 `close frame (opcode=0x8)` 带 status code，再走 TCP 四次挥手——SSE 没有这个能力，无法区分「服务端主动结束」「网络异常」「客户端 abort」。LLM 场景常见 3 个 code：

| Code | 含义 | 何时出现 |
|------|------|----------|
| 1000 | 正常关闭 | 服务端 `socket.close()`，agent 完成 |
| 1001 | going away | 浏览器关闭 tab |
| 1011 | 服务端错误 | 服务端 LLM 调用抛异常 / 超时 |

### 1.2 SSE 的实现方式

SSE 是一个 HTTP 协议（`text/event-stream` + `\n\n` 分隔的 `data: / event: / id: / retry:` 字段）。**浏览器侧有 3 种消费方式，服务端有多种实现**——但优劣差异巨大。

#### 1.2.1 浏览器侧：3 种消费方式对比

| 方式 | 优势 | 劣势 | 何时用 |
|------|------|------|--------|
| **fetch + ReadableStream** | POST + 自定义 header + Worker + AbortController 全支持 | SSE 协议要自己解析；自动重连要自己写 | **新项目默认**（本文后续讨论均基于此） |
| **EventSource** | 浏览器内置自动重连 + 自动发 `Last-Event-ID` + 按 event 分发 | 只能 GET；不能自定义 header；不能进 Worker；同 origin 6 连接限制 | 极简 demo、纯 GET 推送 |
| **XHR + onprogress** | 不依赖 fetch stream | API 古老；需手动切片 responseText | 老环境、polyfill |

**结论**：LLM 流式场景下 99% 选 **fetch + ReadableStream**——POST 鉴权、自定义 header、放进 Worker、AbortController 中控这 4 类需求，**EventSource 全部做不到**。

#### 1.2.2 标准解：fetch + ReadableStream 示意

```typescript
const controller = new AbortController();

const response = await fetch('/api/agent/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ prompt: 'hello' }),
  signal: controller.signal,  // 取消入口
});

const reader = response.body.getReader();
const decoder = new TextDecoder('utf-8');
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  // stream: true 保留跨 chunk 的多字节字符（emoji/中文不能切坏）
  buffer += decoder.decode(value, { stream: true });
  // 按 \n\n 切分完整 SSE 消息（生产建议用 eventsource-parser 库）
  for (let idx; (idx = buffer.indexOf('\n\n')) !== -1; ) {
    const event = parseSSEEvent(buffer.slice(0, idx));  // 解析 data: / event: / id:
    buffer = buffer.slice(idx + 2);
    handleEvent(event);
  }
}

// 取消：用户点停止 → controller.abort() → reader.cancel()
//   → TCP FIN → 服务端 req.on('close') → abort LLM 调用
```

**易错点**：`TextDecoder.decode(value, { stream: true })` 的 `stream: true` 必须加——否则一个汉字可能被切在两个 chunk 边界上变乱码

**本文后续所有 SSE 讨论**（§1.5 工程细节、§2 渲染、§3 调度）**都以 fetch + ReadableStream 为标准实现**——`controller.abort()` 即取消、`reader.read()` 即消费、`AbortController.signal` 即取消信号。

#### 1.2.3 服务端实现

服务端 SSE 几行代码起一个：

```typescript
app.post('/api/agent/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  agentStream(req.body.prompt, (token) => {
    res.write(`data: ${JSON.stringify({ token })}\n\n`);
  });

  const heartbeat = setInterval(() => res.write(': keep-alive\n\n'), 15000);
  req.on('close', () => { clearInterval(heartbeat); agentStream.abort(); });
});
```

后端 5 分钟能起 demo，WebSocket 服务端要 `ws` / `socket.io` / `gorilla/websocket` 等库，**实现成本远高于 SSE**。

### 1.3 真实工程差异

下面从性能、限制、WebSocket 独有的工程坑三方面展开——这些是 1.1 节时序图里看不出来的「实战层」差异。

#### 性能差异的真实数据

LLM token 速率（每秒几十到几百个 token、每个 token 几十字节）这个量级下，**两者吞吐差异可以忽略**。真正的性能差异在以下几个层面：

**首字节延迟**。SSE 是普通 HTTP GET/POST，1 个 RTT 就能开始接收；WebSocket 多一次 Upgrade 握手，至少多 1 个 RTT。在「用户点发送 → 第一个字开始出现」这条链路上，SSE 通常快 50–200ms。这一点在 GPT-4 类慢模型上感知不强，在 GPT-3.5 / 国产快模型上**用户能明显感受到「SSE 的字出现得更早」**。

**HTTP/2 多路复用**。HTTP/1.1 同 origin 6 条并发限制下，SSE 是长连接占一格；HTTP/2 下 SSE 走 stream 优先级，可与 metadata、heartbeat、其他 REST 共享一条 TCP 连接。WebSocket 不管 HTTP/1.1 还是 HTTP/2 都是独立 TCP 连接，多个 Agent 同时跑要占多个连接。

**压缩**。SSE 默认走 HTTP gzip，token 文本可压缩到 30% 体积；WebSocket 的 `permessage-deflate` 扩展要显式开启（`socket = new WebSocket(url, [], { perMessageDeflate: true })`），且只压缩 payload 不压缩 frame header。LLM 单 token 几个字节被 gzip 字典压缩率极高，**长 token 序列 SSE 省流量优势明显**。

**Nagle 算法**。两者都受 TCP Nagle 影响——小包会攒到 40ms 或 200ms 才发送。LLM 单 token 只有几十字节，Nagle 会让用户看到「一顿一顿」。生产必须 `TCP_NODELAY` 关掉。**这一点上 SSE 和 WebSocket 没有差异**——不是「SSE 慢」或「WebSocket 快」，是「两者都要修」。

#### 限制差异的真实场景

**方向性**。SSE 是服务端→客户端单向（一旦建立连接，反向只能靠「断开 TCP」传信号），WebSocket 是双向（任何时刻两端都可发起请求）。但**"双向"对 LLM 流式的价值被高估了**——SSE 的核心能力就是「服务端任意时刻主动推」，本身就是单向的极强版本；WebSocket 多出来的「客户端在流式过程中主动推」对 LLM 流式几乎用不到。

**LLM 流式里"客户端需要主动推"的需求其实很少**：

- **用户的 prompt** — 建立 SSE 连接前一次性 POST 就行
- **停止按钮** — `reader.cancel()` 走 TCP FIN，服务端 `req.on('close')` 立即 abort LLM
- **中途参数热更新** — 走独立 REST 端点 `POST /agent/update`
- **用户反馈**（点赞 / 踩）— 走独立 REST 端点

**所有反控需求都不需要 WebSocket 双向**。所谓的「流式输入 / 实时语音」「流式多模态」场景，**音频 / 图片上传是一次性或分块 POST**（走 fetch），跟"双向通道"无关；返回的部分结果用 SSE 即可。所谓的「多 agent 协同」——**服务端主动 push 状态变更给所有订阅者就是 SSE 的核心能力**（SSE 服务端可以**任意时刻** `res.write()`），根本不需要 WebSocket。

**WebSocket 真正的价值**在**二进制帧传输**（流式图像 / 音频 / 视频，规避 SSE 的 base64 33% 膨胀）、**自定义应用层协议**（FIN + opcode 完全控制）、**连接状态持续**（OPEN/CLOSED 双方明确，SSE 在长 idle 后可能被代理误判）等维度——**首字节延迟反而是 SSE 的优势**（SSE 1 RTT，WebSocket 2 RTT，详见 §1.3.1）。**如果有人跟你说"我用了 WebSocket 因为需要双向"，99% 是为不必要的技术选型找理由**。

**可恢复性**。SSE 协议层定义了 `Last-Event-ID` 机制（每条 SSE 帧的 `id:` 字段 + 重连时 `Last-Event-ID` HTTP header）。**只有 EventSource 浏览器 API 自动实现了「断线重连时自动带 Last-Event-ID」**；fetch+ReadableStream 也能用这个机制，但要自己从 `id:` 字段提取 lastEventId、重连时手动加 header。**WebSocket 协议层完全没这个能力**——WebSocket 帧没有序号、没有 ack，断线后所有应用层消息都丢失，只能靠应用层自己做去重/补发。生产上 AI 流式续接，**SSE 的 `Last-Event-ID` + REST 快照** 是经过验证的模式。

**背压**。WebSocket 有 `socket.bufferedAmount` 可以查询**发送方**的缓冲（用来限流自己的发送），但**没有接收方背压**机制——服务端无法主动说「客户端处理不过来了，慢点推」。SSE 浏览器无任何背压 API。

**实际生产上两者都靠 OS TCP 滑动窗口做天然背压**——前端处理慢，TCP 接收缓冲填满，TCP 滑动窗口关闭，服务端 `write()` 阻塞。但 JS 层感知不到具体水位。生产上要自己用 `rAF` / `setTimeout` 节流消费（参考 §3.5 的 rAF + startTransition 组合拳）。

**可观测性**。SSE 走 HTTP，`curl https://api/agent/stream` 直接能看数据；CDN 边缘函数、APM（Datadog/SkyWalking）、网关日志全部能直接观测。WebSocket 协议是二进制帧，curl 看不到，要用 `wscat` / Chrome DevTools 的 WS 面板 / WireShark。**线上问题排查 SSE 优势巨大**——后端可以 `curl` 复现，WebSocket 几乎只能在客户端抓包。

**代理穿透**。SSE 走 80/443，几乎不被任何代理拦截。WebSocket Upgrade 在某些企业代理（特别是不支持 HTTP/1.1 Upgrade 的）会被拦掉。**ToB 业务（企业客户）WebSocket 出问题概率更高**，Nginx 默认配置都支持 WebSocket 透传，但企业内网复杂得多。

**二进制**。SSE 只能 UTF-8 文本，传图片/音频要 base64 编码膨胀 33%。流式图像生成（Midjourney 那种「一块块画出来」）、流式 TTS 音频用 SSE 就很浪费。**这种场景只能 WebSocket**。

**消息边界**。SSE 用 `\n\n` 双换行作消息边界，**这个边界在透明代理（CDN 边缘）可能被错误地修改/合并/拆分**——某些 CDN 做了 chunked 重组后，多条 SSE message 被合并成一条发给客户端。WebSocket 用二进制帧的 FIN bit + opcode 区分消息，**对透明代理是黑盒**，错误概率反而低。

#### WebSocket 独有的工程问题

WebSocket 比 SSE 复杂，**有几个 SSE 没有的工程坑**：

**心跳协议**。WebSocket 协议规定 `opcode 0x9` 是 ping、`0xA` 是 pong，但**应用层必须自己实现**——浏览器 WebSocket API 没有自动 ping。生产上 30s 一次 ping 测活，60s 没响应就主动断开重连。

**消息分片（fragmentation）**。WebSocket 帧可以把一个 message 切成多个 frame（FIN=0 是中间帧，FIN=1 是结束帧），用于流式传输大消息。**生产上几乎用不到**——LLM token 级别的小消息直接一帧一消息。但 SDK 写错的话会触发分片重组 bug，排查起来很痛苦。

**半关闭状态**。WebSocket 是全双工，**没有「半关闭」**——一旦关闭 TCP 连接，双向都断。SSE 也类似。但 WebSocket 的 `close` 帧可以带 reason code 和 reason text，便于服务端告知客户端「为什么关」（如 1001 going away、1011 server error）。

**服务端资源占用**。WebSocket 长连接会占用服务端的 fd、内存、socket map，**Nginx 默认 1 worker 进程 fd 上限 ~1024**。SSE 走 HTTP/2 多路复用，资源占用低很多。**大规模连接（10K+）WebSocket 需要专门的网关**（如 `ws` 集群、socket.io + Redis adapter）。

### 1.4 选型决策树

<svg viewBox="0 0 760 480" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;background:#fafafa;border-radius:8px;display:block;margin:1em auto;">
  <defs>
    <marker id="arrTree" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 0 L10 5 L0 10 z" fill="#333"/>
    </marker>
  </defs>
  <text x="380" y="22" text-anchor="middle" font-size="15" font-weight="bold" fill="#222">SSE vs WebSocket 选型决策树</text>
  <rect x="220" y="50" width="320" height="46" rx="6" fill="#fff3e0" stroke="#f57c00" stroke-width="1.5"/>
  <text x="380" y="71" text-anchor="middle" font-size="13" fill="#e65100" font-weight="bold">业务是否需要流式二进制数据？</text>
  <text x="380" y="88" text-anchor="middle" font-size="10" fill="#e65100">（图像 / 音频 / 视频 / Blob）</text>
  <line x1="320" y1="96" x2="170" y2="135" stroke="#333" stroke-width="1.5" marker-end="url(#arrTree)"/>
  <line x1="440" y1="96" x2="590" y2="135" stroke="#333" stroke-width="1.5" marker-end="url(#arrTree)"/>
  <text x="230" y="118" font-size="11" fill="#222" font-weight="bold">Yes</text>
  <text x="455" y="118" font-size="11" fill="#222" font-weight="bold">No（LLM 流式 token）</text>
  <rect x="50" y="140" width="240" height="56" rx="6" fill="#ffcdd2" stroke="#c62828" stroke-width="1.5"/>
  <text x="170" y="166" text-anchor="middle" font-size="13" fill="#c62828" font-weight="bold">WebSocket</text>
  <text x="170" y="184" text-anchor="middle" font-size="10" fill="#c62828">（二进制帧原生）</text>
  <rect x="470" y="140" width="240" height="56" rx="6" fill="#c8e6c9" stroke="#388e3c" stroke-width="1.5"/>
  <text x="590" y="166" text-anchor="middle" font-size="13" fill="#1b5e20" font-weight="bold">SSE</text>
  <text x="590" y="184" text-anchor="middle" font-size="10" fill="#1b5e20">（LLM 流式首选）</text>
  <line x1="590" y1="196" x2="590" y2="230" stroke="#333" stroke-width="1.5" marker-end="url(#arrTree)"/>
  <rect x="380" y="235" width="320" height="46" rx="6" fill="#fff3e0" stroke="#f57c00" stroke-width="1.5"/>
  <text x="540" y="256" text-anchor="middle" font-size="12" fill="#e65100" font-weight="bold">需要 POST / 自定义 header /</text>
  <text x="540" y="273" text-anchor="middle" font-size="12" fill="#e65100" font-weight="bold">Worker / AbortController？</text>
  <line x1="490" y1="281" x2="380" y2="320" stroke="#333" stroke-width="1.5" marker-end="url(#arrTree)"/>
  <line x1="590" y1="281" x2="700" y2="320" stroke="#333" stroke-width="1.5" marker-end="url(#arrTree)"/>
  <text x="410" y="305" font-size="11" fill="#222" font-weight="bold">Yes</text>
  <text x="630" y="305" font-size="11" fill="#222" font-weight="bold">No</text>
  <rect x="240" y="325" width="280" height="56" rx="6" fill="#bbdefb" stroke="#1976d2" stroke-width="1.5"/>
  <text x="380" y="351" text-anchor="middle" font-size="13" fill="#0d47a1" font-weight="bold">fetch + ReadableStream</text>
  <text x="380" y="369" text-anchor="middle" font-size="10" fill="#0d47a1">（99% 选这个）</text>
  <rect x="560" y="325" width="240" height="56" rx="6" fill="#fff9c4" stroke="#f9a825" stroke-width="1.5"/>
  <text x="680" y="351" text-anchor="middle" font-size="13" fill="#5d4037" font-weight="bold">EventSource</text>
  <text x="680" y="369" text-anchor="middle" font-size="10" fill="#5d4037">（极简 demo）</text>
  <rect x="60" y="405" width="640" height="60" rx="4" fill="#fffde7" stroke="#f9a825" stroke-width="1.2"/>
  <text x="380" y="425" text-anchor="middle" font-size="12" fill="#5d4037" font-weight="bold">核心结论：99% LLM 流式场景走 fetch + ReadableStream</text>
  <text x="380" y="445" text-anchor="middle" font-size="11" fill="#5d4037">WebSocket 仅在「需要流式二进制」时是硬需求（图像/音频/视频）</text>
  <text x="380" y="460" text-anchor="middle" font-size="11" fill="#5d4037">「需要反向控制」不构成选 WebSocket 的理由——SSE + REST 已足够</text>
</svg>

实操建议：

- **LLM 流式 token 输出（99% 场景）**：fetch + ReadableStream（默认选项，POST + 自定义 header + Worker + AbortController 全支持）
- **极简 demo / 纯 GET 推送**：EventSource（自动重连 + 自动带 `Last-Event-ID` 是它**唯一**的优势）
- **多页 / 多 Tab / 多 Agent 同时跑**：共享一条 SSE（fetch+ReadableStream）+ 后端进程级 EventEmitter 全量广播 + 前端按 sessionID demux
- **需要反向控制（取消 / 参数 / 反馈）**：**SSE + REST 兜底**——**取消走 `reader.cancel()` → TCP FIN → 服务端 `req.on('close')` abort LLM，参数 / 反馈走独立 REST 端点**。**WebSocket 双向不是反控需求的合理选项**（详见 §1.3.2）
- **跨域 + 需要 Authorization header**：fetch + ReadableStream（EventSource 不支持自定义 header）
- **流式图像 / 音频 / 视频**：**WebSocket**——二进制帧原生支持，规避 SSE 的 base64 33% 膨胀；这是 WebSocket 在 LLM 场景下**唯一不可替代的硬需求**
- **ToB 业务（企业代理多）**：优先 SSE（WebSocket 容易被企业代理拦）

### 1.5 SSE 的工程细节

**Last-Event-ID 的真相**。SSE 协议层允许服务端在每条事件前写 `id: xxx`，浏览器 EventSource API 会在断线重连时自动发 `Last-Event-ID: xxx` header（fetch+ReadableStream 需自己实现）。看起来很美，实际上 AI 流式场景的「续接点不是事件序号」——续接的是字符串拼接 `prevText + delta`。**SSE 不带 id，重连后用 REST 拿快照 + SSE delta 当增量**是经过验证的模式。

**心跳防代理超时**。SSE 规范允许服务端定期发 `: keep-alive\n\n`（冒号开头的注释行），浏览器不派发给 `message` 监听器，只是为了防中间代理超时。生产环境每 15–30s 一次。`fetch + ReadableStream` 模式下心跳同样有效（注释行会被 parseSSEEvent 忽略）。

**Nagle 算法**：生产必须 `TCP_NODELAY` 关掉，细节见 §1.3.1。

**同源并发上限**。HTTP/1.1 同源默认 6 条并发连接，SSE 长连接会占一格。N 个 Agent 跑起来再叠 metadata、心跳测试很容易撞墙。生产一般用**一条共享 SSE + 前端 demux**——后端进程级 EventEmitter 全量广播，前端按 sessionID 路由。HTTP/2 下这个问题基本消失（多路复用）。

**nginx 缓冲必须关**。生产部署常被忽略的一点：nginx 默认会 buffer 后端响应（`proxy_buffering on`），SSE 会被攒到一定量才推给客户端，看到的现象是「流式输出卡几秒后一次全弹出来」。**必须配置**：

```nginx
location /api/agent/stream {
    proxy_pass http://backend;
    proxy_buffering off;
    proxy_cache off;
    proxy_set_header Connection '';          # 关闭 upstream keep-alive，避免协议串扰
    proxy_set_header X-Accel-Buffering no;   # 双重保险
    proxy_read_timeout 3600s;                # 长连接不超时
}
```

这一条 SSE 专属问题，WebSocket 不受 nginx buffer 影响（nginx 1.5+ 默认支持 WebSocket Upgrade 透传，配置 `proxy_http_version 1.1` + `proxy_set_header Upgrade $http_upgrade` 即可）。

**CORS 配置**。SSE 走 CORS 协议，跨域需要服务端返回 `Access-Control-Allow-Origin`。基于 fetch+ReadableStream，鉴权直接走标准 `Authorization` header。**如果用 EventSource** 则不能自定义 header，只能走 query string `?token=xxx`（**token 会进 access log，**不推荐**）或 cookie（注意 SameSite 限制，跨域场景需 `SameSite=None; Secure`）——这也是为什么本文不推荐 EventSource。

**消息大小限制**。SSE 单条 message 受浏览器 JS 字符串长度限制（约 512MB）和代理实现限制（nginx 默认 buffer 4–8K）。LLM 一次工具调用的结果（图片 base64、长代码块）可能超过这个限制，**需要切片成多条 message**。WebSocket 单帧 payload 上限 2^63 字节，**没有这个限制**。生产上工具调用结果建议**走独立 REST 端点**，SSE 只发引用 ID，不要把大 payload 塞进 SSE 流。

## 二、渲染层：大段 Markdown 不卡顿

> 原题：AI 生成的文本通常很长，前端在渲染大段 Markdown 或代码块时，如何保证页面不卡顿？

这道题表面在问性能优化，本质在考**你对主线程模型、长任务、增量更新的理解**。

### 2.1 为什么会卡

LLM 输出 2000 字的 Markdown 是常态。卡顿来自**三个独立原因的叠加**：

<svg viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;background:#fafafa;border-radius:8px;display:block;margin:1em auto;">
  <defs>
    <marker id="arrLaggy" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 0 L10 5 L0 10 z" fill="#333"/>
    </marker>
    <marker id="arrLagDown" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 0 L10 5 L0 10 z" fill="#c62828"/>
    </marker>
  </defs>
  <text x="380" y="22" text-anchor="middle" font-size="15" font-weight="bold" fill="#222">流式 Markdown 卡顿的 3 个独立原因</text>
  <rect x="40" y="55" width="100" height="34" rx="4" fill="#e3f2fd" stroke="#1976d2" stroke-width="1.2"/>
  <text x="90" y="76" text-anchor="middle" font-size="11" fill="#0d47a1" font-weight="bold">流式 token</text>
  <line x1="140" y1="72" x2="200" y2="72" stroke="#333" stroke-width="1.5" marker-end="url(#arrLaggy)"/>
  <rect x="205" y="55" width="130" height="34" rx="4" fill="#fff3e0" stroke="#f57c00" stroke-width="1.2"/>
  <text x="270" y="76" text-anchor="middle" font-size="11" fill="#e65100" font-weight="bold">同步 Markdown 解析</text>
  <line x1="335" y1="72" x2="395" y2="72" stroke="#333" stroke-width="1.5" marker-end="url(#arrLaggy)"/>
  <rect x="400" y="55" width="150" height="34" rx="4" fill="#ffcdd2" stroke="#c62828" stroke-width="1.2"/>
  <text x="475" y="76" text-anchor="middle" font-size="11" fill="#c62828" font-weight="bold">整段 innerHTML 替换</text>
  <line x1="550" y1="72" x2="610" y2="72" stroke="#333" stroke-width="1.5" marker-end="url(#arrLaggy)"/>
  <rect x="615" y="55" width="120" height="34" rx="4" fill="#e0e0e0" stroke="#616161" stroke-width="1.2"/>
  <text x="675" y="76" text-anchor="middle" font-size="11" fill="#212121" font-weight="bold">渲染到屏幕</text>
  <line x1="270" y1="89" x2="270" y2="135" stroke="#c62828" stroke-width="2" marker-end="url(#arrLagDown)"/>
  <rect x="180" y="140" width="180" height="60" rx="4" fill="#ffebee" stroke="#c62828" stroke-width="1.2"/>
  <text x="270" y="160" text-anchor="middle" font-size="12" fill="#c62828" font-weight="bold">主线程独占</text>
  <text x="270" y="180" text-anchor="middle" font-size="10" fill="#c62828">解析耗时 100-300ms</text>
  <text x="270" y="195" text-anchor="middle" font-size="9" fill="#c62828">（整段 input/整段 output）</text>
  <line x1="475" y1="89" x2="475" y2="135" stroke="#c62828" stroke-width="2" marker-end="url(#arrLagDown)"/>
  <rect x="385" y="140" width="180" height="60" rx="4" fill="#ffebee" stroke="#c62828" stroke-width="1.2"/>
  <text x="475" y="160" text-anchor="middle" font-size="12" fill="#c62828" font-weight="bold">布局/重排/重绘</text>
  <text x="475" y="180" text-anchor="middle" font-size="10" fill="#c62828">全 DOM 重建</text>
  <text x="475" y="195" text-anchor="middle" font-size="9" fill="#c62828">（innerHTML 整体替换）</text>
  <rect x="40" y="230" width="680" height="50" rx="4" fill="#fffde7" stroke="#f9a825" stroke-width="1.2"/>
  <text x="380" y="250" text-anchor="middle" font-size="12" fill="#5d4037" font-weight="bold">2000 字 + 20 个代码块 = 解析 200ms + 高亮 500ms = 阻塞 ~700ms</text>
  <text x="380" y="270" text-anchor="middle" font-size="10" fill="#5d4037">流式每秒 100 token → 频繁触发整段重做 → 打字机变幻灯片</text>
  <rect x="40" y="295" width="680" height="50" rx="4" fill="#e1f5fe" stroke="#0277bd" stroke-width="1.2"/>
  <text x="380" y="315" text-anchor="middle" font-size="12" fill="#01579b" font-weight="bold">解法见 2.2 - 2.4：Block 级 Memoization + Unterminated Block</text>
  <text x="380" y="335" text-anchor="middle" font-size="10" fill="#01579b">让每次 re-render 的代价跟「新增 token 量」成正比</text>
</svg>

**原因 1：同步解析长 Markdown**。通用 Markdown 解析器都是**整段输入、整段输出**。2000 字的 Markdown 里如果有 20 个代码块，正则匹配 + AST 构造 + 渲染可能耗时 100–300ms，这段时间主线程被独占，点击、滚动、动画全卡住。

**原因 2：整段 innerHTML 替换**。即使你把流式 token 拼到字符串里，最后用 `element.innerHTML = newText` 一次性塞回去，浏览器**会把整个 DOM 重建**——所有节点销毁、重新解析 HTML、重新计算样式、重新布局。如果用户已经滚动到底部，替换后视口会跳。

**原因 3：代码高亮是同步 CPU 密集**。Shiki / Prism / highlight.js 都要在主线程跑语法解析 + Token 上色。一个 50 行的 Python 代码块大概 20–50ms，10 个代码块就是 200–500ms。

### 2.2 核心思路：Block 级 Memoization

Vercel 的 Streamdown（专为 AI 流式 Markdown 渲染设计的库）采用的核心思路不是节流、不是 Worker、不是增量解析——而是 **Block 级 Memoization**。

把 Markdown 解析后的内容拆成**独立 block**（段落、代码块、标题、列表、表格等），每个 block 单独 memoize。LLM 流式推 token 时，**只有内容变化的 block 才重新解析和渲染**，已经完成的 block 保持稳定。

```tsx
// Streamdown 的核心设计：block 级 memoization
<Streamdown plugins={{ code }} isAnimating={status === 'streaming'}>
  {part.text}  {/* 文本在流式增长，但只有变动的 block 被 re-parse */}
</Streamdown>
```

**为什么 block 级 memo 比节流更优？** 节流只是降低了 re-render 频率，但每次 re-render 仍然是整段 Markdown 全量解析 + 全量 DOM 替换。Block memo 让每次 re-render 的代价跟「新增内容的大小」成正比，跟「已渲染内容的总大小」无关。

**一个具体例子**：消息已经渲染了 2000 字的 Markdown（含 5 个代码块），LLM 又推了 50 个 token。如果全量 re-parse，2000 字 + 5 个代码块的解析 + 高亮全部重做。**Block memo：只处理这 50 个 token 所在的那个 block**，其余 4 个代码块和前面的段落完全不动。

### 2.3 流式特有的问题：处理不完整 Markdown

LLM 流式输出有个天然问题——Markdown 经常是不完整的。

<svg viewBox="0 0 760 130" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;background:#fafafa;border-radius:8px;display:block;margin:1em auto;">
  <text x="380" y="22" text-anchor="middle" font-size="14" font-weight="bold" fill="#222">不完整 Markdown：代码块还没闭合</text>
  <rect x="40" y="40" width="680" height="36" rx="4" fill="#fff3e0" stroke="#f57c00" stroke-width="1.2"/>
  <text x="50" y="62" font-size="12" font-family="monospace" fill="#222">"以下是代码：\n```python\nprint('hello</text>
  <text x="50" y="100" font-size="12" fill="#c62828" font-weight="bold">↑ 代码块还没闭合（3 个反引号未配对）</text>
  <text x="380" y="125" text-anchor="middle" font-size="11" fill="#666">普通解析器会错误解析或吞掉这之后的 token</text>
</svg>

普通的 Markdown 解析器会把 `` ```python `` 之后的文本错误解析成代码块内容或直接吞掉。Streamdown 的 **Unterminated Block Parsing** 专门处理这种状态——它能识别「未闭合」的块结构，用特殊样式（如灰底虚线边框）渲染，让用户看到「这一块还在生成中」。

**不要自己写「分片解析」找边界**——这已经被证明是脆弱方案：表格跨行、嵌套列表、引用块嵌套等都是 `\n\n` / `\`\`\`` / `\n[-*]` 这种简陋正则无法正确处理的。

### 2.4 Streamdown 原理：Block Memo + Unterminated Block

Vercel 的 Streamdown（专为 AI 流式 Markdown 渲染设计的库）的完整工作流程如下：

<svg viewBox="0 0 760 540" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;background:#fafafa;border-radius:8px;display:block;margin:1em auto;">
  <defs>
    <marker id="arrsd" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 0 L10 5 L0 10 z" fill="#333"/>
    </marker>
  </defs>
  <text x="380" y="22" text-anchor="middle" font-size="15" font-weight="bold" fill="#222">Streamdown 流式渲染流程（LLM token → 屏幕）</text>
  <rect x="40" y="50" width="160" height="40" rx="4" fill="#e3f2fd" stroke="#1976d2" stroke-width="1.5"/>
  <text x="120" y="75" text-anchor="middle" font-size="13" fill="#0d47a1" font-weight="bold">SSE 流（token 累积）</text>
  <rect x="40" y="120" width="160" height="40" rx="4" fill="#fff3e0" stroke="#f57c00" stroke-width="1.5"/>
  <text x="120" y="145" text-anchor="middle" font-size="12" fill="#e65100">block 切分</text>
  <text x="120" y="158" text-anchor="middle" font-size="9" fill="#e65100">block 数组</text>
  <rect x="280" y="50" width="160" height="36" rx="4" fill="#e8f5e9" stroke="#388e3c" stroke-width="1.2"/>
  <text x="360" y="73" text-anchor="middle" font-size="11" fill="#1b5e20">Block A（已完成）</text>
  <rect x="280" y="92" width="160" height="36" rx="4" fill="#e8f5e9" stroke="#388e3c" stroke-width="1.2"/>
  <text x="360" y="115" text-anchor="middle" font-size="11" fill="#1b5e20">Block B（已完成）</text>
  <rect x="280" y="134" width="160" height="36" rx="4" fill="#fff9c4" stroke="#f9a825" stroke-width="2"/>
  <text x="360" y="155" text-anchor="middle" font-size="11" fill="#5d4037" font-weight="bold">Block C（进行中）</text>
  <text x="360" y="167" text-anchor="middle" font-size="9" fill="#5d4037">未闭合的代码块</text>
  <rect x="500" y="50" width="160" height="36" rx="4" fill="#f5f5f5" stroke="#616161" stroke-width="1"/>
  <text x="580" y="73" text-anchor="middle" font-size="10" fill="#212121">MemoBlock A</text>
  <text x="580" y="84" text-anchor="middle" font-size="9" fill="#616161">props 不变，不渲染</text>
  <rect x="500" y="92" width="160" height="36" rx="4" fill="#f5f5f5" stroke="#616161" stroke-width="1"/>
  <text x="580" y="115" text-anchor="middle" font-size="10" fill="#212121">MemoBlock B</text>
  <text x="580" y="126" text-anchor="middle" font-size="9" fill="#616161">props 不变，不渲染</text>
  <rect x="500" y="134" width="160" height="36" rx="4" fill="#ffccbc" stroke="#d84315" stroke-width="2"/>
  <text x="580" y="155" text-anchor="middle" font-size="10" fill="#bf360c" font-weight="bold">MemoBlock C</text>
  <text x="580" y="166" text-anchor="middle" font-size="9" fill="#bf360c">re-parse + re-render</text>
  <line x1="200" y1="70" x2="280" y2="68" stroke="#333" stroke-width="1.5" marker-end="url(#arrsd)"/>
  <line x1="200" y1="138" x2="280" y2="68" stroke="#333" stroke-width="1" stroke-dasharray="3 2" marker-end="url(#arrsd)"/>
  <line x1="200" y1="138" x2="280" y2="110" stroke="#333" stroke-width="1" stroke-dasharray="3 2" marker-end="url(#arrsd)"/>
  <line x1="200" y1="138" x2="280" y2="152" stroke="#333" stroke-width="1.5" marker-end="url(#arrsd)"/>
  <line x1="440" y1="68" x2="500" y2="68" stroke="#999" stroke-width="1" stroke-dasharray="3 2"/>
  <line x1="440" y1="110" x2="500" y2="110" stroke="#999" stroke-width="1" stroke-dasharray="3 2"/>
  <line x1="440" y1="152" x2="500" y2="152" stroke="#d84315" stroke-width="1.5"/>
  <rect x="40" y="200" width="620" height="50" rx="4" fill="#fffde7" stroke="#f9a825" stroke-width="1.2"/>
  <text x="350" y="222" text-anchor="middle" font-size="12" fill="#5d4037" font-weight="bold">核心：已完成 block 不再重渲染，只 re-parse 进行中的 block</text>
  <text x="350" y="240" text-anchor="middle" font-size="10" fill="#5d4037">代价跟「新增 token 量」成正比，跟「已渲染总量」无关</text>
  <rect x="40" y="270" width="620" height="50" rx="4" fill="#e1f5fe" stroke="#0277bd" stroke-width="1.2"/>
  <text x="350" y="292" text-anchor="middle" font-size="12" fill="#01579b" font-weight="bold">Unterminated Block：Block C 的代码块还没闭合时仍正常渲染</text>
  <text x="350" y="310" text-anchor="middle" font-size="10" fill="#01579b">解析器识别「正在生成中」状态，配 caret/动画让用户感知流式进度</text>
  <text x="380" y="355" text-anchor="middle" font-size="12" fill="#222" font-weight="bold">伪代码（核心逻辑）</text>
  <rect x="40" y="370" width="620" height="140" rx="4" fill="#f5f5f5" stroke="#bdbdbd" stroke-width="1"/>
  <text x="60" y="395" font-size="11" font-family="monospace" fill="#222">function StreamingMarkdown({ text, isStreaming }) {</text>
  <text x="60" y="415" font-size="11" font-family="monospace" fill="#222">  const blocks = lexer(text)                        // 整段解析为 block 数组</text>
  <text x="60" y="435" font-size="11" font-family="monospace" fill="#222">  return blocks.map((b, i) =&gt; (</text>
  <text x="60" y="455" font-size="11" font-family="monospace" fill="#222">    &lt;MemoBlock key={i} block={b} isLast={isStreaming &amp;&amp; i === blocks.length - 1} /&gt;</text>
  <text x="60" y="475" font-size="11" font-family="monospace" fill="#222">  ))</text>
  <text x="60" y="495" font-size="11" font-family="monospace" fill="#222">}</text>
</svg>

**Streamdown 三大设计点**：

1. **Block Memo（核心）**：每个 block 单独 memo（`React.memo`），只有 block 的 props 变化才 re-render。新增 token 时，只 re-parse 那个 block；**已完成的 block 完全不动**。
2. **Unterminated Block**：解析器能识别「还没闭合的代码块/列表/表格」，用 caret + 灰底虚线等样式让用户感知「正在生成」。
3. **代码高亮缓存**：高亮器（Shiki）实例全局缓存，多个代码块共享。**配合 Block Memo，未变化的代码块不会重复高亮**。

### 2.5 节流（可选的补充手法）

Block Memo 本身解决了核心瓶颈（全量 re-parse）。如果 token 速率极高（200+ token/s）或需要进一步减少 setState 次数，可以用 rAF 节流作为兜底：

```typescript
function useThrottledState(rawText: string, isStreaming: boolean) {
  const [displayText, setDisplayText] = useState(rawText);
  const rAFRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isStreaming) { setDisplayText(rawText); return; }
    if (rAFRef.current !== null) return;
    rAFRef.current = requestAnimationFrame(() => {
      setDisplayText(rawText);
      rAFRef.current = null;
    });
  }, [rawText, isStreaming]);

  return displayText;
}
```

**核心结论**：流式 Markdown 渲染的性能优化**核心是 Block 级 Memoization**。节流是可选补充，Worker / 分片解析 / 虚拟滚动在绝大部分 LLM 场景下**用不上**。

## 三、调度层：React Fiber 与高频更新

> 原题：谈谈 React 的 Fiber 架构，它对处理 AI 流式输出这种高频更新场景有什么优势？

这道题是 React 进阶的「高频考点」，也是 AI 流式场景里**最容易被低估的工程点**。

### 3.1 前提：React 怎么渲染一棵组件树

假设你有一个聊天页面的组件树：

```
App
 └─ MessageList
      ├─ Message ①
      │    └─ Text（"你好"）
      └─ Message ②
           └─ Text（"你好，请问..."）
```

**React 16 之前的做法（Stack Reconciler）**：React 从根组件开始**递归**往下走——先 `render(App)`，App 内部调用 `render(MessageList)`，MessageList 内部调用 `render(Message)`，Message 内部调用 `render(Text)`——直到走到叶子节点，再一层层 return 回来。

这个过程在 JS 引擎里是一段**连续的、不可打断的调用链**。1000 个组件的树一次渲染耗时 50ms，这 50ms 内**主线程完全被占用**——用户无法点击、滚动、输入。

**回到流式场景**：每秒 100 个 token，每来一个 token 触发一次 setState → 重新渲染。1000 节点×50ms×100 次 = **5 秒阻塞 / 秒**。画面完全卡死。

<svg viewBox="0 0 760 320" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;background:#fafafa;border-radius:8px;display:block;margin:1em auto;">
  <defs>
    <marker id="arrs1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 0 L10 5 L0 10 z" fill="#c62828"/>
    </marker>
  </defs>
  <text x="380" y="22" text-anchor="middle" font-size="15" font-weight="bold" fill="#222">Stack Reconciler：递归渲染，不可中断</text>
  <rect x="80" y="55" width="140" height="40" rx="4" fill="#bbdefb" stroke="#1976d2" stroke-width="1.5"/>
  <text x="150" y="80" text-anchor="middle" font-size="14" fill="#0d47a1" font-weight="bold">App</text>
  <rect x="80" y="115" width="140" height="36" rx="4" fill="#bbdefb" stroke="#1976d2" stroke-width="1"/>
  <text x="150" y="138" text-anchor="middle" font-size="12" fill="#0d47a1">MessageList</text>
  <rect x="80" y="170" width="140" height="36" rx="4" fill="#bbdefb" stroke="#1976d2" stroke-width="1"/>
  <text x="150" y="193" text-anchor="middle" font-size="12" fill="#0d47a1">Message</text>
  <rect x="80" y="225" width="140" height="36" rx="4" fill="#bbdefb" stroke="#1976d2" stroke-width="1"/>
  <text x="150" y="248" text-anchor="middle" font-size="12" fill="#0d47a1">Text</text>
  <line x1="150" y1="95" x2="150" y2="115" stroke="#c62828" stroke-width="2" marker-end="url(#arrs1)"/>
  <line x1="150" y1="151" x2="150" y2="170" stroke="#c62828" stroke-width="2" marker-end="url(#arrs1)"/>
  <line x1="150" y1="206" x2="150" y2="225" stroke="#c62828" stroke-width="2" marker-end="url(#arrs1)"/>
  <text x="230" y="80" font-size="11" fill="#c62828" font-weight="bold">render(App)</text>
  <text x="255" y="145" font-size="11" fill="#c62828">render(MessageList)</text>
  <text x="245" y="200" font-size="11" fill="#c62828">render(Message)</text>
  <text x="240" y="255" font-size="11" fill="#c62828">render(Text)</text>
  <line x1="380" y1="55" x2="380" y2="270" stroke="#c62828" stroke-width="2" stroke-dasharray="6 3"/>
  <text x="400" y="165" font-size="11" fill="#c62828" font-weight="bold">调用栈</text>
  <text x="410" y="185" font-size="11" fill="#c62828" font-weight="bold">↓ 不可中断 ↓</text>
  <rect x="80" y="282" width="160" height="30" rx="4" fill="#c8e6c9" stroke="#388e3c" stroke-width="1.2"/>
  <text x="160" y="301" text-anchor="middle" font-size="11" fill="#1b5e20" font-weight="bold">一次性 commit 到 DOM</text>
  <line x1="150" y1="261" x2="150" y2="282" stroke="#388e3c" stroke-width="2" marker-end="url(#arrs1)"/>
  <text x="500" y="80" font-size="12" fill="#c62828" font-weight="bold">为什么不能中断？</text>
  <text x="500" y="105" font-size="11" fill="#444">JS 是单线程的，调用栈</text>
  <text x="500" y="122" font-size="11" fill="#444">里积压的函数必须执行完</text>
  <text x="500" y="139" font-size="11" fill="#444">才能让出主线程。</text>
  <text x="500" y="165" font-size="11" fill="#444">Text 的 render 没 return，</text>
  <text x="500" y="182" font-size="11" fill="#444">App 的 render 就回不来。</text>
  <text x="500" y="210" font-size="11" fill="#c62828" font-weight="bold">在流式场景：</text>
  <text x="500" y="230" font-size="11" fill="#444">每个 token 触发一次 render</text>
  <text x="500" y="247" font-size="11" fill="#444">100 tokens = 5000ms 阻塞</text>
  <text x="500" y="264" font-size="11" fill="#444">→ 打字机变成幻灯片</text>
</svg>

**问题的本质**：递归之所以不可中断，不是因为「React 写得不好」——是**函数调用本身就不允许被外部暂停**。你能做的只有两种选择：要么丢弃所有调用并报错、要么等它执行完。两者都不是选项。

**那怎么解决？** 你要想一件革命性的事——**放弃递归调用**。不要用 JS 自己的调用栈来渲染组件树，而是**手动维护一个渲染的"任务清单"**——每次只做一个任务，做完检查"我还有时间吗？"有就做下一个，没有就让出。

### 3.2 放弃递归：把树编码成可遍历的任务链

React 的思路是：**把「组件树」的位置关系（父→子→子→弟→祖…）编码成一系列「下一个是谁」的指针，这样才能在"处理完一个节点后"不依赖系统调用栈就知道"接下来处理谁"。**

<svg viewBox="0 0 760 280" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;background:#fafafa;border-radius:8px;display:block;margin:1em auto;">
  <defs>
    <marker id="arrs2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 0 L10 5 L0 10 z" fill="#1976d2"/>
    </marker>
  </defs>
  <text x="380" y="22" text-anchor="middle" font-size="15" font-weight="bold" fill="#222">放弃递归：把树的位置关系编码成指针</text>
  <rect x="320" y="55" width="120" height="36" rx="4" fill="#bbdefb" stroke="#1976d2" stroke-width="1.5"/>
  <text x="380" y="78" text-anchor="middle" font-size="14" fill="#0d47a1" font-weight="bold">A</text>
  <line x1="380" y1="91" x2="380" y2="120" stroke="#1976d2" stroke-width="2" marker-end="url(#arrs2)"/>
  <text x="395" y="106" text-anchor="middle" font-size="9" fill="#1976d2" font-weight="bold">子 = B</text>
  <rect x="320" y="125" width="120" height="36" rx="4" fill="#bbdefb" stroke="#1976d2" stroke-width="1.5"/>
  <text x="380" y="148" text-anchor="middle" font-size="14" fill="#0d47a1" font-weight="bold">B</text>
  <line x1="440" y1="143" x2="520" y2="143" stroke="#1976d2" stroke-width="2" marker-end="url(#arrs2)"/>
  <text x="478" y="138" text-anchor="middle" font-size="9" fill="#1976d2" font-weight="bold">弟 = C</text>
  <rect x="525" y="125" width="120" height="36" rx="4" fill="#bbdefb" stroke="#1976d2" stroke-width="1.5"/>
  <text x="585" y="148" text-anchor="middle" font-size="14" fill="#0d47a1" font-weight="bold">C</text>
  <line x1="380" y1="161" x2="380" y2="190" stroke="#1976d2" stroke-width="2" marker-end="url(#arrs2)"/>
  <text x="395" y="176" text-anchor="middle" font-size="9" fill="#1976d2" font-weight="bold">子 = D</text>
  <rect x="320" y="195" width="120" height="36" rx="4" fill="#bbdefb" stroke="#1976d2" stroke-width="1.5"/>
  <text x="380" y="218" text-anchor="middle" font-size="14" fill="#0d47a1" font-weight="bold">D</text>
  <line x1="440" y1="213" x2="500" y2="213" stroke="#1976d2" stroke-width="2" marker-end="url(#arrs2)"/>
  <text x="470" y="208" text-anchor="middle" font-size="9" fill="#1976d2" font-weight="bold">子 = E</text>
  <rect x="525" y="195" width="120" height="36" rx="4" fill="#e0e0e0" stroke="#757575" stroke-width="1" stroke-dasharray="4 3"/>
  <text x="585" y="218" text-anchor="middle" font-size="14" fill="#757575">E</text>
  <text x="150" y="80" font-size="12" fill="#222" font-weight="bold">每个节点 3 个指针：</text>
  <text x="150" y="105" font-size="11" fill="#333">• child → 第一个子</text>
  <text x="150" y="125" font-size="11" fill="#333">• sibling → 下一个兄弟</text>
  <text x="150" y="145" font-size="11" fill="#333">• return → 父（无节点时回到）</text>
  <text x="150" y="180" font-size="12" fill="#1b5e20" font-weight="bold">于是可以手动遍历：</text>
  <text x="150" y="200" font-size="11" fill="#1b5e20">A → B → C → D → E</text>
  <text x="150" y="218" font-size="11" fill="#1b5e20">走到哪停到哪</text>
  <text x="150" y="235" font-size="11" fill="#1b5e20">下次从停了的地方继续</text>
</svg>

**这跟「递归」有什么不同？** 递归时，走到 C 的下一步是"从 C 的函数调用 return 出来，回到 B 的调用往下走"——这依赖 JS 帮你在调用栈里"记得"回到哪。现在用了指针，回到哪**不再依赖调用栈**——节点自己的 return 指针直接告诉你回到哪。

Fiber 就是这样一个**节点的"处理任务包"**。每个 Fiber 装着：这个组件当前的 props、state、它的子/兄弟/父分别是谁（child/sibling/return）——以及关键——**它处理的"进度"走到哪了**（alternate / effectTag 等字段的用途）。

**关键洞察**：递归渲染是"JS 帮你记得顺序但你不控制"；Fiber 是"你自己控制每一步，可以随时停下来"。

### 3.3 怎么处理这链？——一步一步走，中间检查时间

有了指针后，渲染就不需要递归了——**一只大循环就够了**。每次循环做一件事：**处理当前这个节点**；做完看看**还有没有时间**（剩不到 1ms 就停，让出主线程给用户输入/动画）；然后**看这个节点的指针"下一个是谁"，继续循环**。

<svg viewBox="0 0 760 340" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;background:#fafafa;border-radius:8px;display:block;margin:1em auto;">
  <defs>
    <marker id="arrs3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 0 L10 5 L0 10 z" fill="#333"/>
    </marker>
  </defs>
  <text x="380" y="22" text-anchor="middle" font-size="15" font-weight="bold" fill="#222">Work Loop：一步一步走，中间检查时间</text>
  <text x="30" y="60" font-size="18" font-weight="bold" fill="#666">→</text>
  <rect x="45" y="50" width="90" height="30" rx="4" fill="#e8f5e9" stroke="#388e3c"/>
  <text x="90" y="69" text-anchor="middle" font-size="12" fill="#1b5e20" font-weight="bold">A ✓</text>
  <text x="145" y="60" font-size="18" font-weight="bold" fill="#666">→</text>
  <rect x="160" y="50" width="90" height="30" rx="4" fill="#e8f5e9" stroke="#388e3c"/>
  <text x="205" y="69" text-anchor="middle" font-size="12" fill="#1b5e20" font-weight="bold">B ✓</text>
  <text x="260" y="60" font-size="18" font-weight="bold" fill="#666">→</text>
  <rect x="275" y="50" width="90" height="30" rx="4" fill="#e8f5e9" stroke="#388e3c"/>
  <text x="320" y="69" text-anchor="middle" font-size="12" fill="#1b5e20" font-weight="bold">C ✓</text>
  <text x="375" y="60" font-size="18" font-weight="bold" fill="#666">→</text>
  <rect x="390" y="50" width="90" height="30" rx="4" fill="#fff9c4" stroke="#f9a825" stroke-width="2"/>
  <text x="435" y="69" text-anchor="middle" font-size="12" fill="#5d4037" font-weight="bold">D（当前）</text>
  <text x="505" y="60" font-size="18" font-weight="bold" fill="#666">→</text>
  <rect x="520" y="50" width="90" height="30" rx="4" fill="#e0e0e0" stroke="#757575"/>
  <text x="565" y="69" text-anchor="middle" font-size="12" fill="#757575">E</text>
  <text x="630" y="60" font-size="18" font-weight="bold" fill="#666">→</text>
  <rect x="645" y="50" width="90" height="30" rx="4" fill="#e0e0e0" stroke="#757575"/>
  <text x="690" y="69" text-anchor="middle" font-size="12" fill="#757575">F</text>
  <line x1="435" y1="82" x2="435" y2="95" stroke="#f9a825" stroke-width="1.5" stroke-dasharray="2 2"/>
  <text x="435" y="105" text-anchor="middle" font-size="9" fill="#5d4037">↑ 4ms 时检查</text>
  <text x="435" y="115" text-anchor="middle" font-size="9" fill="#5d4037">剩余时间不足</text>
  <rect x="45" y="140" width="90" height="30" rx="4" fill="#fff3e0" stroke="#f57c00"/>
  <text x="90" y="159" text-anchor="middle" font-size="12" fill="#e65100" font-weight="bold">⏸ 暂停</text>
  <line x1="135" y1="155" x2="200" y2="155" stroke="#f57c00" stroke-width="2" marker-end="url(#arrs3)"/>
  <rect x="205" y="140" width="150" height="30" rx="4" fill="#fff3e0" stroke="#f57c00"/>
  <text x="280" y="159" text-anchor="middle" font-size="12" fill="#e65100">让出主线程给用户</text>
  <rect x="45" y="200" width="90" height="30" rx="4" fill="#e8f5e9" stroke="#388e3c"/>
  <text x="90" y="219" text-anchor="middle" font-size="12" fill="#1b5e20" font-weight="bold">▶ 继续</text>
  <line x1="135" y1="215" x2="200" y2="215" stroke="#388e3c" stroke-width="2" marker-end="url(#arrs3)"/>
  <rect x="205" y="200" width="200" height="30" rx="4" fill="#e8f5e9" stroke="#388e3c"/>
  <text x="305" y="219" text-anchor="middle" font-size="12" fill="#1b5e20">浏览器空闲时从 D 继续</text>
  <rect x="45" y="260" width="90" height="30" rx="4" fill="#c8e6c9" stroke="#388e3c" stroke-width="1.5"/>
  <text x="90" y="279" text-anchor="middle" font-size="12" fill="#1b5e20" font-weight="bold">E ✓ F ✓</text>
  <line x1="435" y1="82" x2="435" y2="260" stroke="#f9a825" stroke-width="1" stroke-dasharray="3 3"/>
  <text x="450" y="180" font-size="10" fill="#f9a825">暂停位置</text>
  <text x="450" y="195" font-size="10" fill="#f9a825">（D 之后）</text>
  <rect x="45" y="305" width="660" height="26" rx="4" fill="#f5f5f5" stroke="#bdbdbd" stroke-width="1"/>
  <text x="375" y="322" text-anchor="middle" font-size="10" font-family="monospace" fill="#222">while (nextNode &amp;&amp; timeRemaining() > 1ms) { nextNode = performUnitOfWork(nextNode) }</text>
</svg>

**大循环伪代码的逻辑**：处理一个节点 < 1ms，所以大部分时候你可以连续处理好几个才"让出"。**只有连续处理到"某个重的节点"或"已经花了快 5ms 的时候"才让出**。而递归呢？**必须等所有节点处理完才让出**——这就是区别。

### 3.4 怎么保证 UI 不变？——双缓冲

有了"可中断的进度"，面临一个新问题：**上次让出主线程时，我已经改了 A、B、C 的部分状态，但还没改 D。此时用户看到的屏幕是「A 的新版本 + D 的旧版本」拼在一起——UI 不一致了。**

React 的做法（经典的两棵树模式）：

<svg viewBox="0 0 760 320" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;background:#fafafa;border-radius:8px;display:block;margin:1em auto;">
  <defs>
    <marker id="arrDouble" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0 0 L10 5 L0 10 z" fill="#388e3c"/>
    </marker>
  </defs>
  <text x="380" y="22" text-anchor="middle" font-size="15" font-weight="bold" fill="#222">双缓冲：current 树 vs workInProgress 树</text>
  <text x="180" y="55" text-anchor="middle" font-size="11" fill="#0d47a1" font-weight="bold">屏幕显示</text>
  <rect x="40" y="65" width="280" height="220" rx="6" fill="#e3f2fd" stroke="#1976d2" stroke-width="1.5"/>
  <text x="180" y="88" text-anchor="middle" font-size="12" fill="#0d47a1" font-weight="bold">current 树</text>
  <text x="180" y="105" text-anchor="middle" font-size="9" fill="#0d47a1">（用户看到的内容）</text>
  <rect x="70" y="125" width="90" height="28" rx="3" fill="#fff" stroke="#1976d2"/>
  <text x="115" y="144" text-anchor="middle" font-size="11" fill="#0d47a1">A</text>
  <rect x="180" y="125" width="90" height="28" rx="3" fill="#fff" stroke="#1976d2"/>
  <text x="225" y="144" text-anchor="middle" font-size="11" fill="#0d47a1">B</text>
  <rect x="70" y="165" width="90" height="28" rx="3" fill="#fff" stroke="#1976d2"/>
  <text x="115" y="184" text-anchor="middle" font-size="11" fill="#0d47a1">C</text>
  <rect x="180" y="165" width="90" height="28" rx="3" fill="#fff" stroke="#1976d2"/>
  <text x="225" y="184" text-anchor="middle" font-size="11" fill="#0d47a1">D</text>
  <rect x="70" y="205" width="90" height="28" rx="3" fill="#fff" stroke="#1976d2"/>
  <text x="115" y="224" text-anchor="middle" font-size="11" fill="#0d47a1">E</text>
  <rect x="180" y="205" width="90" height="28" rx="3" fill="#fff" stroke="#1976d2"/>
  <text x="225" y="224" text-anchor="middle" font-size="11" fill="#0d47a1">F</text>
  <text x="180" y="262" text-anchor="middle" font-size="9" fill="#388e3c" font-weight="bold">★ 不碰它</text>
  <text x="580" y="55" text-anchor="middle" font-size="11" fill="#e65100" font-weight="bold">后台构建（不显示）</text>
  <rect x="440" y="65" width="280" height="220" rx="6" fill="#fff3e0" stroke="#f57c00" stroke-width="1.5"/>
  <text x="580" y="88" text-anchor="middle" font-size="12" fill="#e65100" font-weight="bold">wip 树</text>
  <text x="580" y="105" text-anchor="middle" font-size="9" fill="#e65100">（内存里构建，可中断/丢）</text>
  <rect x="470" y="125" width="90" height="28" rx="3" fill="#fff" stroke="#f57c00"/>
  <text x="515" y="144" text-anchor="middle" font-size="11" fill="#e65100">A'</text>
  <rect x="580" y="125" width="90" height="28" rx="3" fill="#fff" stroke="#f57c00"/>
  <text x="625" y="144" text-anchor="middle" font-size="11" fill="#e65100">B'</text>
  <rect x="470" y="165" width="90" height="28" rx="3" fill="#fff" stroke="#f57c00"/>
  <text x="515" y="184" text-anchor="middle" font-size="11" fill="#e65100">C'</text>
  <rect x="580" y="165" width="90" height="28" rx="3" fill="#fff" stroke="#f57c00"/>
  <text x="625" y="184" text-anchor="middle" font-size="11" fill="#e65100">D'</text>
  <rect x="470" y="205" width="90" height="28" rx="3" fill="#fff" stroke="#f57c00"/>
  <text x="515" y="224" text-anchor="middle" font-size="11" fill="#e65100">E'</text>
  <rect x="580" y="205" width="90" height="28" rx="3" fill="#fff" stroke="#f57c00"/>
  <text x="625" y="224" text-anchor="middle" font-size="11" fill="#e65100">F'</text>
  <text x="580" y="262" text-anchor="middle" font-size="9" fill="#388e3c" font-weight="bold">commit 一次 swap</text>
  <line x1="320" y1="175" x2="440" y2="175" stroke="#388e3c" stroke-width="2.5" marker-end="url(#arrDouble)"/>
  <text x="380" y="165" text-anchor="middle" font-size="11" fill="#388e3c" font-weight="bold">构建好才 swap</text>
  <text x="380" y="305" text-anchor="middle" font-size="11" fill="#222">用户始终看 current 树；wip 构建到一半被中断/丢弃都不影响 UI</text>
</svg>

每次渲染时，React 创建一个新的"影子树"（wip 树），在这棵树上随便改、随便中断、随便丢。**只有当整棵 wip 树处理完，才一次性把 current 指针指到 wip 树上（commit）**——这个 commit 操作是同步的一次性动作，用户能感知到的"UI 变化"只发生在这 1ms 内。

这就是为什么即使有可中断渲染，用户仍然**始终**看到一致的 UI。

### 3.5 优先级（Lane 模型）

React 18 引入 Lane 模型，把每种更新类型标记到「车道」上：

<svg viewBox="0 0 760 280" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;background:#fafafa;border-radius:8px;display:block;margin:1em auto;">
  <text x="380" y="22" text-anchor="middle" font-size="15" font-weight="bold" fill="#222">Lane 模型：5 种优先级车道</text>
  <text x="40" y="60" font-size="11" fill="#666">高优先级（抢占）</text>
  <rect x="40" y="70" width="320" height="32" rx="4" fill="#ffcdd2" stroke="#c62828" stroke-width="2"/>
  <text x="60" y="91" font-size="13" font-weight="bold" fill="#c62828">▮ SyncLane</text>
  <text x="200" y="91" font-size="11" fill="#222">用户输入、点击、focus</text>
  <rect x="40" y="110" width="320" height="32" rx="4" fill="#ffe0b2" stroke="#ef6c00" stroke-width="1.5"/>
  <text x="60" y="131" font-size="13" font-weight="bold" fill="#ef6c00">▮ InputContinuousLane</text>
  <text x="240" y="131" font-size="11" fill="#222">拖拽、滚动</text>
  <rect x="40" y="150" width="320" height="32" rx="4" fill="#fff9c4" stroke="#f9a825" stroke-width="1.5"/>
  <text x="60" y="171" font-size="13" font-weight="bold" fill="#f9a825">▮ DefaultLane</text>
  <text x="200" y="171" font-size="11" fill="#222">setState 触发的普通更新</text>
  <rect x="40" y="190" width="320" height="32" rx="4" fill="#c8e6c9" stroke="#388e3c" stroke-width="1.5"/>
  <text x="60" y="211" font-size="13" font-weight="bold" fill="#388e3c">▮ TransitionLane</text>
  <text x="220" y="211" font-size="11" fill="#222">startTransition 包裹的更新</text>
  <rect x="40" y="230" width="320" height="32" rx="4" fill="#bbdefb" stroke="#1976d2" stroke-width="1.5"/>
  <text x="60" y="251" font-size="13" font-weight="bold" fill="#1976d2">▮ IdleLane</text>
  <text x="200" y="251" font-size="11" fill="#222">不紧急的后台任务</text>
  <line x1="380" y1="50" x2="380" y2="270" stroke="#666" stroke-width="1.5" marker-end="url(#arrLane)"/>
  <text x="390" y="80" font-size="11" fill="#666">高 →</text>
  <text x="390" y="100" font-size="11" fill="#666">↑ 抢占权</text>
  <text x="390" y="140" font-size="11" fill="#666">↓ 让出权</text>
  <text x="390" y="220" font-size="11" fill="#666">低</text>
  <defs>
    <marker id="arrLane" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 0 L10 5 L0 10 z" fill="#666"/>
    </marker>
  </defs>
  <text x="500" y="100" font-size="11" fill="#222" font-weight="bold">流式 token 用什么？</text>
  <text x="500" y="125" font-size="11" fill="#444">流式 token 增量用 DefaultLane</text>
  <text x="500" y="143" font-size="11" fill="#444">或 TransitionLane（更平滑）</text>
  <text x="500" y="170" font-size="11" fill="#c62828" font-weight="bold">用户输入用什么？</text>
  <text x="500" y="195" font-size="11" fill="#444">用户点击/输入用 SyncLane</text>
  <text x="500" y="213" font-size="11" fill="#444">能直接打断低优先级 render</text>
</svg>

**流式 token 增量用 DefaultLane 或 TransitionLane**。配合 `startTransition`，可以把「整段对话重新渲染」标记为低优先级，**让出用户当前正在用的操作**：

```typescript
function onToken(token: string) {
  startTransition(() => {
    setMessages((prev) => [...prev, token]);
  });
}
```

**rAF + startTransition 组合拳**：rAF 把更新对齐到下一帧，startTransition 让这帧的更新低优先级、不会卡住用户输入。

### 3.6 流式场景的契合度

把 Fiber 整套机制对应到流式：

| 流式挑战 | Fiber 机制 |
|----------|-----------|
| 每秒几十次 setState | 时间切片：每次 render 5ms，不阻塞主线程 |
| **多次 setState 合并** | **Automatic Batching：同 tick 内 setState 合并成一次 render，updater 函数累积最新值** |
| 渲染过程中用户输入 | Lane 优先级：用户输入 SyncLane 直接打断 |
| 大量组件 re-render | 双缓冲：用户始终看 current，不看半成品 |
| 历史消息列表更新 | TransitionLane：可中断的渐进式更新 |
| 代码块高亮 / Markdown 解析 | `useDeferredValue` 把派生状态降级为低优先级 |

### 3.7 多次 setState 会被合并（Automatic Batching）

**关键问题**：流式场景里 `onToken` 触发 `setState` 的频率是每秒几十到上百次——这些会触发几十次 render 吗？

**不会。React 18 Automatic Batching 会合并。**

```ts
// 流式 token 依次到达
onToken('A') → setText('A')       // ①
onToken('B') → setText('AB')      // ②
onToken('C') → setText('ABC')     // ③
// ↑ 这三次 setState 在同 tick 内全部入队
// render 只触发 1 次，看到的是最终值 'ABC'
// 中间值 'A'、'AB' 都被 batch 掉
```

**机制**：每次 setState 不是立刻触发 render，而是把 update 放进 fiber 的 `updateQueue`。React 调度一次 work loop，**从 queue 中合并所有 update 算出最新状态**，只 render 一次。

**用 updater 函数正确累积**：

```ts
// ❌ 错误：每次 setState 直接覆盖，流式 token 会丢
setText(token)

// ✅ 正确：updater 函数累积
setText(prev => prev + token)  // token 依次是 'A'、'B'、'C'
// React 依次执行：
//   '' + 'A' = 'A'
//   'A' + 'B' = 'AB'
//   'AB' + 'C' = 'ABC'
// 最终 render 看到 'ABC'
```

**render 进行中又来新 update——中断重新 render**：

```
workLoop 正在 process(B)...
  此时 onToken 触发 setState
    → scheduleUpdateOnFiber 标记 fiber 有新 update
    → 当前 workLoop 在某次 shouldYield 时返回
    → 下次 idle 时 重新 start work loop，从根开始
    → 之前的部分 render 全部丢弃
```

**不同 Lane 优先级——高优先级插队**：

```ts
// 流式 token 是低优先级
startTransition(() => {
  setText(prev => prev + token)  // TransitionLane
})

// 用户点击是最高优先级
onClick={() => setCount(c => c + 1)}  // SyncLane
// ↑ 用户点击会直接打断正在进行的低优先级 render
```

**为什么这对流式至关重要**：流式 token 高频到达 → Automatic Batching 合并成 1 次 render → 加上 TransitionLane 让出主线程 → 用户操作不被卡。**没有这些机制，100 token/s = 100 render/s，主线程必卡**。

## 写到这里

回到开头那三道题——SSE vs WebSocket、长文本不卡顿、React Fiber 优势——它们不是孤立的知识点。它们是同一条工程链路的三个截面：

```
LLM 服务端吐 token
        │  网络层：SSE chunked transfer
        ▼
   EventSource / WebSocket
        │  渲染层：分片解析、Worker 高亮、增量 DOM
        ▼
   React Fiber 调度
        │  调度层：时间切片、Lane 优先级、startTransition
        ▼
   屏幕上的打字机
```

每一层都做对，整体才是「流式不卡」。只做对一层，其余两层会变成新的瓶颈。

面试题的价值不在「我答对几个点」，而在你**能不能把三层串成一条线**。能讲清楚这条线的人，3 轮 18 题无论怎么变形都能稳稳接住。

下次再拆解 AI 前端面试题里其他几道——多轮对话上下文、Prompt Injection、RAG 的前端参与——那又是一条工程链。
