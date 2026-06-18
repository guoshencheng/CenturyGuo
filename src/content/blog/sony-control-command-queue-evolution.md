---
title: "从 3.5 秒卡顿到 50ms 响应：相机控制 App 的指令队列三次重构"
description: "USB 相机接到桌面 App，第一张图等了 3.5 秒。围绕这个数字，我们把指令队列从 FFI 同步直调，搬到 C++ 异步 deque，又搬回 JS 编排层。三次重构的动机、方案、踩坑，记录在这里。"
date: 2026-06-18
tags: ["electron", "ffi", "concurrency", "architecture", "camera"]
---

# 从 3.5 秒卡顿到 50ms 响应：相机控制 App 的指令队列三次重构

> 第一张自拍倒计时走到 0，我的 Electron 主线程还卡在 3.5 秒前的 `setConfig` 调用里。

这是一个桌面端的自拍 App：首页 → 取景页 → 倒计时 → 结果页，相机通过 USB 接在 Mac 上。整套控制链是 Electron + koffi FFI + C++ bridge + libgphoto2——libgphoto2 在内部已经帮我们处理掉了厂商私有协议，对外只暴露统一的 C API。我以为最难的会是把相机协议库那套繁琐的指针 / 配置树管理包成一个干净的 C 接口，结果最难的是「同一根 USB 线上跑十个并发命令」。

围绕这条 USB 总线，我把指令队列挪了三次位置：先在 FFI 直调里，然后搬到 C++ 异步 deque，最后搬回 JS 编排层。每次重构都解决了一个真问题，也都引入了新问题。下面是完整的故事。

![三次重构：从 3.5 秒卡顿到 50 毫秒响应](/images/blog/sony-control-command-queue-evolution/01-cover-3-5s-to-50ms.webp)

先看一下整个项目的模块调用关系，后续三节都围绕这张图展开：

```
┌────────────────────────────────────────────────────────────────────────┐
│ Renderer Process (React)                                              │
│   页面组件 → 自定义 Hook → IPC 接口                                    │
│                   ↓                                                    │
└──────────────────────────────────────────────│──────────────────────────┘
                                               │ contextBridge (IPC)
┌──────────────────────────────────────────────│──────────────────────────┐
│ Preload  (contextBridge)                     │                          │
│   window.cameraAPI = { connect, setProperty, │takePicture, ... }       │
└──────────────────────────────────────────────│──────────────────────────┘
                                               │ ipcMain.handle
┌──────────────────────────────────────────────│──────────────────────────┐
│ Main Process (Node.js, 单线程)                │                          │
│   IPC Handlers ──→ CameraService (主进程)     │                          │
│                         │                                           │
│                         └──→ WorkerClient (主进程)                    │
│                                 │                                      │
│                                 └──→ Worker Thread (隔离 V8)           │
│                                       (eval 字符串模式注入)              │
└──────────────────────────────────────────────│──────────────────────────┘
                                               │ worker_threads
┌──────────────────────────────────────────────│──────────────────────────┐
│ Worker Thread (隔离 V8)                       │                          │
│   fnRegistry + 通用 callFunction              │                          │
│   ON_/OFF_ 流管理                              │                          │
└──────────────────────────────────────────────│──────────────────────────┘
                                               │ koffi FFI
┌──────────────────────────────────────────────│──────────────────────────┐
│ C++ Bridge (bridge.dylib)                     │                          │
│   std::timed_mutex usbMutex 串行化所有 bridge_* │                          │
│   bridge_get_preview_frame → try_lock_for(500ms)                        │
└──────────────────────────────────────────────│──────────────────────────┘
                                               │ 相机协议库 (开源)
┌──────────────────────────────────────────────│──────────────────────────┐
│ USB 相机（PC Remote 模式）                    │                          │
└────────────────────────────────────────────────────────────────────────┘
```

七层链路，每层只做一件事：UI、IPC 桥、业务 API、命令路由、Worker 调度、USB 串行化、相机协议。重构只发生在「命令路由 + 串行化」这两层，其他五层基本不动。

## 一、v0：同步阻塞，简洁但致命

最朴素的架构：

```
Renderer → IPC → Main → koffi → bridge.dylib → 相机协议库 → USB
```

`bridge_set_config("aperture", "5.6")` 就是一个同步 koffi 调用，阻塞到协议库返回。问题在于 `gp_camera_set_single_config` 本身就要和相机握几次手，实测 3.5 秒。

3.5 秒在桌面 App 里是什么概念？Electron 主线程被冻住，窗口不能拖、按钮不能点、连「连接中…」的 loading 动画都不动了。用户视角：应用死了。

```
[TS] setConfig aperture=5.6 ──┐
                              │  3.5s 阻塞
                              ↓
[TS] setConfig aperture=5.6 done ──→ UI 终于刷新
```

为什么不能「直接调协议库别加 bridge」？因为拍照要十几步（context → camera → abilities → port → init → capture → file_get → save → free），配置树操作繁琐，跨语言指针管理容易泄漏。所以我把协议库包成一个 C 兼容的 `bridge_*` 函数集合。bridge 是必要的，但「bridge 同步阻塞」是不必要的。

## 二、v1：把队列搬到 C++

第一反应：bridge 不要阻塞，加个队列。整体架构长这样：

```
┌─────────────────┐  postMessage   ┌────────────────────────────────────┐
│ Main Process    │ ──────────────→│ Worker Thread (JS)                 │
│ (Electron)      │                │  • 注册 preview 回调                │
│                 │ ←──────────────│  • setInterval(10ms) poll 结果     │
└─────────────────┘                └─────────────────┬──────────────────┘
                                                      │ koffi FFI
                                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│ C++ bridge.dylib                                                      │
│                                                                        │
│   ┌──────────────────┐  notify_one    ┌─────────────────────────────┐ │
│   │ commandQueue     │ ─────────────→ │ worker_thread (后台)        │ │
│   │ (std::deque)     │                │                              │ │
│   │                  │ ← push_back ──│ 1. cv.wait → 取命令          │ │
│   │  push_front      │   (普通命令)   │ 2. execute_command           │ │
│   │  (高优先级)       │               │ 3. 写入 resultTable[id]      │ │
│   └──────────────────┘               │                              │ │
│                                      │ 队列空 + preview 开 →         │ │
│   ┌──────────────────┐               │ 自己跑 preview 循环           │ │
│   │ resultTable      │ ←─────────────│ (不经过队列)                  │ │
│   │ (id → Result)    │               └─────────────────────────────┘ │
│   └──────────────────┘                                                │
└────────────────────────────────────────────────────────────────────────┘
                                │ 相机协议库
                                ▼
                       [USB → 相机]
```

队列放在 C++ 内部，Worker 负责投递和轮询。设计非常典型：

```cpp
static std::deque<Command> commandQueue;
static std::mutex queueMutex;
static std::condition_variable queueCv;
static std::unordered_map<int, Result> resultTable;

static void worker_loop() {
    while (workerRunning) {
        Command cmd;
        {
            std::unique_lock<std::mutex> lock(queueMutex);
            queueCv.wait(lock, []{ return !commandQueue.empty() || !workerRunning; });
            cmd = std::move(commandQueue.front());
            commandQueue.pop_front();
        }
        Result result = execute_command(cmd);
        resultTable[cmd.id] = std::move(result);
    }
}
```

Worker 线程串行消费命令，主线程通过 `bridge_enqueue_cmd` 投递、用 `bridge_poll_result` 轮询。C++ 只对外暴露两个同步函数：`enqueue` 和 `poll`。新增命令只改枚举和 switch case，不动 C API。

两个细节值得展开：

**优先级**。TERMINATE / DISCONNECT / STOP_PREVIEW 用 `deque::push_front` 插队，避免被前面的 SET_CONFIG（3.5s）卡住：

```cpp
if (type == CmdType::TERMINATE || type == CmdType::DISCONNECT
    || type == CmdType::STOP_PREVIEW) {
    commandQueue.push_front(std::move(cmd));
} else {
    commandQueue.push_back(std::move(cmd));
}
```

**预览去重**。PREVIEW_FRAME 不入队列，工作线程空闲时自己循环执行，否则 15fps 的预览帧会和 SET_CONFIG 一起排队，3.5s 之后才能看到画面：

```cpp
if (commandQueue.empty() && previewEnabled && cameraHandle != nullptr) {
    Result res = do_get_preview_frame();
    std::this_thread::sleep_for(std::chrono::milliseconds(66));
    continue;
}
```

看起来很完整：异步边界放对了，协议库调用依然串行执行，USB 不可能被打乱。

## 三、转折：为什么推翻 v1

v1 跑通后我立刻发现了三个问题：

1. **koffi poll 循环本身是阻塞的**。Worker 线程每 10ms 调一次 `bridge_poll_result`，加起来有真实延迟不说，CPU 还在空转。
2. **C++ 多了 200 行线程代码**。`std::condition_variable` + `std::deque` + 优先级 + 预览去重 + 工作线程生命周期。每次崩，gdb 都在 C++ 栈上，调试成本远高于 Node。
3. **新增命令要改三个地方**：`CmdType` 枚举、`execute_command` 的 switch、TS dispatch 的 if/else。改一个地方忘了另两个，编译过了运行错。

真正的洞察是：Electron 已经有 worker_threads 了，Worker 线程本身就是「异步隔离壳」。C++ 再开一个工作线程是在隔离壳里面再造一个隔离壳——过度设计。

## 四、v2：把队列搬回 JS

新结构的核心：Worker 线程一次只跑一个 C++ 调用（同步阻塞没关系，反正不是主线程），JS 层负责编排、ID 路由、流管理。C++ 只保留同步 API。

**C++ 侧**：保留 `std::timed_mutex` 串行化所有 bridge 调用，但预览帧用 `try_lock_for(500ms)`——拿不到锁就放弃这一帧，让位给真实命令：

```cpp
int bridge_get_preview_frame(unsigned char* out_buf, int max_len) {
    std::unique_lock<std::timed_mutex> lock(usbMutex, std::defer_lock);
    if (!lock.try_lock_for(std::chrono::milliseconds(500))) {
        return -1; // Preview frame skipped so capture can proceed
    }
    // ...
}
```

**JS 侧**：`WorkerClient` 用两个 Map 完成「队列」的职责——pending 路由命令，streams 路由流回调：

```typescript
async call(fn: string, args?: unknown[]): Promise<WorkerResult> {
    await this.ensureWorker()
    const id = this.nextId()
    return new Promise((resolve, reject) => {
        this.pending.set(id, { resolve, reject })
        this.worker!.postMessage({ id, fn, args })
    })
}
```

**Worker 内部**：用通用函数注册表替代枚举 switch：

```typescript
const fnRegistry = new Map()
function register(fnName, { outBufSize = 0, outType = 'string' } = {}) {
    fnRegistry.set(fnName, { outBufSize, outType })
}

register('setConfig',    {})
register('getConfig',    { outBufSize: BRIDGE_MAX_VALUE_LEN, outType: 'string' })
register('getPreviewFrame', { outBufSize: BRIDGE_PREVIEW_MAX_SIZE, outType: 'buffer' })
```

新增命令只改一行 `register()`，Worker 不用重新编译分发逻辑。流命令靠 `ON_` / `OFF_` 前缀识别，递归 `setTimeout` 触发，复杂度被锁在 Worker 内部。

v2 的两种调用模式——单次调用和流——分别长这样：

```
单次调用 (call):
  Service              Worker                      C++
    │                    │                          │
    │ postMessage        │                          │
    │ {id, fn, args}     │                          │
    ├───────────────────→│ koffi fns[fn](...)      │
    │                    ├─────────────────────────→│
    │                    │ ←── 阻塞 ────────────────│
    │                    │ ←── return code ─────────│
    │ ← postMessage      │                          │
    │   {id, status}     │                          │
    │ pending.get(id)    │                          │
    │   .resolve(result) │                          │

流模式 (on):
  Service              Worker                      C++
    │                    │                          │
    │ ON_getPreviewFrame │                          │
    ├───────────────────→│ activeStreams.set(id)    │
    │                    │ setTimeout(tick, 100)    │
    │                    │                          │
    │                    │   tick()                 │
    │                    │   try_lock_for(500ms)───→│
    │                    │   ├─ 拿到 → 取帧          │
    │                    │   └─ 拿不到 → 跳过本帧    │
    │                    │ ←── frame / -1 ──────────│
    │                    │                          │
    │ ← streamId, frame  │                          │
    │ callback(frame)    │                          │

停止 (off):
  Service              Worker
    │ OFF_ { streamId } │
    ├───────────────────→ activeStreams.delete(id)
                          running = false
```

单次调用是一次性的 request/response；流是 Worker 内部用 `setTimeout` 自驱动的循环，回调通过 `streamId` 路由回 Service。两种模式在同一根 USB 上跑，但 C++ 层靠 `usbMutex` 保证不互相穿插。

**完整数据流**（以 setConfig 为例）：

```
UI 拨盘 → IPC SET_PROPERTY
    → CameraService.setConfig('aperture', '5.6')
    → client.call('setConfig', ['aperture', '5.6'])  // pending.set(id, ...)
    → worker.postMessage({ id, fn, args })
    → worker.callFunction('setConfig', args, cb)
    → koffi fns.setConfig(...args)                     // 阻塞 worker，不阻塞 main
    → worker.parentPort.postMessage({ id, status, data })
    → client 收到结果，pending.delete(id)，Promise resolve
    → IPC 返回，UI 更新
```

整个链路里没有任何轮询，没有 condition_variable，没有工作线程生命周期。同步调用就在 worker 上阻塞 3.5 秒，而 worker 不是 main。

## 五、v1 vs v2 对比

![v1 vs v2：把复杂度从 C++ 搬回 JS](/images/blog/sony-control-command-queue-evolution/02-v1-vs-v2-simplification.webp)

| 维度 | v1 C++ 异步队列 | v2 JS 编排 |
|------|----------------|------------|
| C++ 线程代码 | 200 行（deque + cv + worker） | 0 行（只剩 `timed_mutex`） |
| 新增命令成本 | 3 处：枚举 + switch + TS dispatch | 1 处：Worker 内 `register()` |
| 调度延迟 | poll 10ms | 0（直调） |
| 调试栈 | gdb 进 C++ 线程 | Chrome DevTools 进 Worker |
| 预览与命令抢占 | 靠 C++ 优先级 + 去重 | 靠 `try_lock_for(500ms)` |

数字上，v2 把 3.5 秒的冻结从「主线程」移到了「Worker 线程」，用户完全无感——Electron 主线程 50ms 内就能响应下一次 UI 操作。

## 六、两条方法论

**异步边界要贴近「真正会卡死主线程的地方」，不是越靠底层越好。** v1 想把异步做到 C++，结果异步边界落在了一个「反正不会被用户感知」的 worker 线程上，徒增复杂度。识别「哪个线程会被用户感受到」，比识别「哪一层性能最差」更关键。

**Worker 线程是天然的隔离壳，不要在它之上再造一层异步。** Electron 的 worker_threads、Flutter 的 Isolate、Swift 的 detached Task 都是这个角色。它们已经处理了「不阻塞主线程」，剩下的就是「单线程内串行执行」——和协议库自己要求的语义完全一致，不需要再发明一个队列。

## 七、尾声

USB 只是一条总线。我们先后在总线上搭了三层调度：C++ 异步队列想解决一切，最后发现只需要 Worker 线程 + 一个 `timed_mutex` + 两个 Map。

三次重构的最终结论：**异步不是越多越好，最简单的同步链路，配上一个合适的执行线程，往往就够了。**

![异步不是越多越好：一条 USB 线、一个 Worker 线程、足矣](/images/blog/sony-control-command-queue-evolution/03-ending-quote.webp)

---

*本文所有代码示例已做脱敏处理，仅展示设计意图。`*