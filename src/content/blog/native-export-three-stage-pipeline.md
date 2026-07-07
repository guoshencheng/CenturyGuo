---
title: "三段管线并行与一份'到底要不要排队'的判断书"
description: "原生 C++ 视频导出把单线程串行的 6-阶段管线拆成解码/GPU/编码三段生产者-消费者，并加上 BoundedFrameQueue + 内存生命周期管理。在保留 3× 超采样画质不变的前提下，让解码 ASIC、GPU、编码 ASIC 三种硬件真正并行起来——而一年前我在另一个项目里写过完全相反的结论。"
date: 2026-07-07
tags: ["performance", "video", "concurrency", "native", "pipeline"]
faq:
  - q: 这次优化把导出从几分钟压到几分钟？
    a: 18 分钟 2688×1512 视频端到端导出（视频帧 + 音频合并），从 7分40秒 收到 4 分钟左右——视频帧导出阶段从 4分钟 降到 3分56秒，音频合并从 3分44秒 降到几秒。三段管线并行让视频帧阶段提速约 25%，加上音频合并 passthrough 让总导出减半左右。提速的关键不是"压榨某一段"，而是"让三种独立硬件同时有活干"。
  - q: 优化过程中最有价值的发现是什么？
    a: 三段管线的实测耗时分布是 decode 0.8s / GPU 230s / encode 62s。看到这个数字之前我以为瓶颈在 GPU；看到之后我才意识到 GPU 段的 render(113s) 和 composite(117s) 才是真正的瓶颈——而它们都在同一个 GPU command queue 上，无法跨阶段并行。后续要再提速只能盯这两个 stage，而不是堆更多线程。
  - q: 为什么用 BoundedFrameQueue + 三线程，而不是 ThreadPool + 任务图？
    a: 因为解码、GPU、编码三段是天然单线程串行资源（解码 ASIC、Metal command queue、AVAssetWriter 各自只能单线程访问），不存在"同一个 stage 并发"的可能。最适合的并行粒度是段间流水线重叠，而不是段内并发。BoundedFrameQueue 还自带背压——某段慢了队列自然反压上游，内存不会无限堆积。这跟'任务图'思路是相反的：能用一条传送带解决的事，不要去做拓扑排序。
  - q: 跟一年前 'USB 相机控制' 那篇博文的结论矛盾吗？
    a: 是的。一年前我说"异步不是越多越好，最简单的同步链路配上一个合适的执行线程就够了"；这次我做的是在三线程之间真正排有界队列。看似矛盾，其实判断标准没变："异步边界要贴近真正会卡死主线程的地方。" Electron 主线程会被用户感知，串行阻塞 3.5 秒就是灾难；原生 C++ 没有"主线程会被用户感知"的概念，唯一的感知窗口是 UI 端读进度——进度 callback 仍然能每 30 帧上报一次。判定'这里要不要排队'要回到"卡的是什么、谁会等"的问题本身。
---

# 三段管线并行与一份"到底要不要排队"的判断书

> 一年前我在 USB 相机控制项目里写了一篇《从 3.5 秒卡顿到 50ms 响应》，最后的方法论是"异步不是越多越好，最简单的同步链路 + 一个合适的执行线程，就够了"。今天这篇文章讲的是几乎相反的事：在原生 C++ 视频导出里，我**主动造了一个三线程的有界队列**。两篇文章放在一起读，会得到一个更普遍的判断标准——而不是互相打架的结论。

这是关于一个运动相机视频导出 App 的最新一轮优化。背景文章是上一篇《从 15 分钟到 5 分钟：当我们决定放弃 Electron 重写一个视频导出 App》，那里讲的是 v1 Electron → v2 原生 C++ 的架构重构。本文接着往下讲：原生架构跑起来后，**架构内部还能再快多少**。

## 一、起点：原生架构上线后的"还差一点"

v2 原生架构上线后，17 分钟 1080p 视频导出从 8-15 分钟（Electron）降到 5 分钟内（原生）。这个数字本身已经能交付了——但我自己跑过几次之后还觉得不对劲：

- 一帧 26912 帧、墙钟接近 4 分钟的视频导出，导出时 CPU 占用 70%，内存峰值 800MB
- 性能分析显示三段硬件——VideoToolbox 解码（媒体 ASIC）、GPU、VideoToolbox 编码（媒体 ASIC）——理论上各自独立，**但代码里严格一个等一个跑完**
- 我之前在那篇相机博文里写过的"异步队列 + 工作线程"思路，在这个项目里却没人用

那么问题来了：原生架构**是否值得**也像 v2 USB 那篇文章一样，把同步阻塞拆成异步队列？还是要换一个思路？

## 二、先量再改：用 60 行代码给每阶段装上计时

我做的第一件事是**给每阶段装计时**——这步本身比想象的简单，60 行 C++ 加一个 std::chrono 包裹器，就能在每次导出后看到 `decode 0.8s / render 113s / downsample 0.4s / composite 117s / encode 62s` 这种数据。

装上以后，第一次跑就给了我一个我没预料到的答案：

```
decode[DecodeStage: 795.0ms (100%), RetainVideoFrameStage: 1.1ms (0%)]
gpu[RenderOverlayStage: 113181.7ms (49%), DownsampleStage: 356.6ms (0%),
    AllocateStage: 1833.6ms (1%), CompositeStage: 116872.3ms (50%),
    ReleaseVideoFrameStage: 194.6ms (0%)]
encode[EncodeStage: 61800.7ms (100%)]
```

三个数字让我重新审视了"并行能提速多少"这个问题：

| 段 | 串行累计 | 三段并行后可重叠 | 实际墙钟 |
|---|---|---|---|
| decode（ASIC） | 0.8s | 是（与下游并行） | 几乎被隐藏 |
| **GPU** | 230s | **否（GPU 单队列串行）** | **瓶颈** |
| encode（ASIC） | 62s | 是（与 GPU 并行） | 大部分时间在等 GPU |

理论上限是 `max(0.8s, 230s, 62s) = 230s`。从 295s（串行）到 236s（实测），约 20% 的提速——主要来自 decode 与 GPU 重叠、encode 与 GPU 重叠。

**装计时的过程也意外帮我发现了一个问题：downsample 单独计时是 356ms，但每帧都有 2 次 `[cmdBuffer waitUntilCompleted]` 阻塞**——`overlay_downsampler.mm` 和 `metal_compositor.mm` 各一次，每帧两次 CPU↔GPU 往返。三步 GPU 工作（render → downsample → composite）本来就在同一 Metal command queue 上，Metal 保证按提交顺序执行，所以**中间那一次 wait 是冗余的**。这就是接下来的"B2"小优化——把 GPU 去等待这块拿掉。

## 三、B2：去掉两次 GPU 等待——几乎零成本的小胜利

GPU 调度的内部机制给了我们一个免费提速点：

- Skia 的 `GrDirectContext` 与 `OverlayDownsampler`、`MetalCompositor` 共用 `MetalContext` 的同一条 `MTLCommandQueue`（创建时传入）
- Metal 队列天然按提交顺序执行 GPU 命令
- 但 `overlay_downsampler.mm` 里 `[cmdBuffer waitUntilCompleted]` 是一次**同步 CPU 阻塞**——命令其实在队列里会自然按顺序排好，根本不需要 CPU 傻等

把这一行删掉，CPU 每帧从"空等两次"变成"只在 composite 末尾等一次"。

性能上，这个改动直接体现在计时日志里——downsample 计时从原来的"工作 + 等待"变成"只工作"，但**更值钱的是 GPU 段的整体节奏**：下游 composite 立刻就能拿到 downsample 写好的中间 buffer，不再被前一道工序拖累。

画质上完全无损，因为 Metal 队列保序的语义没变——下游 composite 一定在上游 downsample 之后才执行。

## 四、A：三段生产者-消费者管线——吃内存换吞吐

B2 干完之后，剩余的瓶颈清晰了：decode（ASIC）和 encode（ASIC）大部分时间在等 GPU（GPU），而 GPU 自己也不能更快了——它已经把整个视频流画完 + 合完，已经在做 3× 超采样。

那么 GPU 的 230s 既然没办法再压缩，剩下的就是**让 decode 和 encode 别闲着**。方法就是把它们从单线程串行循环里**拆出来**，各跑一个线程，段间用有界 FIFO 队列连接：

```
[解码线程]  ──FrameContext──► [GPU 线程] ──FrameContext──► [编码线程]
   ASIC                          Metal queue                    ASIC
                          （render → downsample → composite，
                            顺序由 Metal 命令队列保序）
```

几个关键设计决策：

### 4.1 段间有界队列自带背压

队列设容量上限（深度 2），任何一段慢了，上游 `Push` 会阻塞，下游 `Pop` 会阻塞。这避免了"内存无限堆积"的灾难——某段性能抖动时，最坏情况就是上游暂时停下来，而不是 OOM。

### 4.2 GPU 段是单线程，不是线程池

我**没有**给 GPU 段内部做进一步并发（比如 render 拆两个线程、composite 拆两个线程）。原因：

- Skia `GrDirectContext` 是线程不安全的
- `MetalContext` 的 command queue 不允许并发 dispatch
- 两个 `CVMetalTextureCache`（downsampler + compositor）都有并发访问检测的 debug 日志

GPU 内部本身就是单队列串行资源，进一步拆线程只会引入锁。所以**并行粒度只到段间，不进段内**。这是判断"要不要排队"的另一个关键：**识别天然单线程的资源，不要硬拆**。

### 4.3 解码帧的缓冲区生命周期必须显式管理

并行带来的最大风险是**缓冲区跨线程泄漏**。`CompositionTimelineDecoder` 复用一块 `currentPixelBuffer`，每次 `ReadNextFrame` 会 `Release` 上一帧、Retain 新帧。如果解码线程读完就丢进队列，下一次 ReadNextFrame 会**把还在 GPU 段里用着的那一帧释放掉**——花屏或崩溃。

修法是两个 `PipelineStage`：解码段尾部 `RetainVideoFrameStage` 对 `ctx.videoFrame` 做 `CVPixelBufferRetain`，GPU 段尾部 `ReleaseVideoFrameStage` 做 `CVPixelBufferRelease`。**没有这两个 stage，整套并行立刻内存不安全**。

### 4.4 编码端天然支持多缓冲

`AVAssetWriter` 的 `AVAssetWriterInputPixelBufferAdaptor` 背后是 `CVPixelBufferPool`，可以并发 `AcquireOutputBuffer`——所以编码线程可以从自己的队列里一直取帧，不需要和 GPU 线程互斥。这是这段设计能成立的关键前提之一。

### 4.5 串行单测，连跑 5 次没翻车

`ParallelExportPipeline` 本身是模板无关的——它接受三段 `vector<unique_ptr<PipelineStage>>`，每个 stage 是 `Process(FrameContext&)` 接口。所以我可以用 Fake stage 写测试，验证三件事：

1. 帧顺序严格按 PTS 保序（编码端逐帧检查 ptsMs）
2. 取消状态能在 worker 之间传播
3. 任何一段失败，能正确 abort 整条管线

5 次重跑都没出问题（线程 + 条件变量这类代码最容易出竞态）。

## 五、视频帧导出之后：另一个非并行的胜利

视频帧导出完了，剩下的是音频合并——这步独立于上面的并行管线，原本用 `AVAssetExportSession` + `AVAssetExportPresetHighestQuality`，意思是**把已经编码好的视频整段重编码一遍**（18 分钟视频花了 3分44 秒做重编码）。

改成 `AVAssetExportPresetPassthrough` 后，这步从 3分44秒 降到**几秒**——纯 IO 操作，不动一帧像素。Passthrough 的兼容性在这里没有问题，因为我的 temp 视频和目标容器都是 MP4、都是 H.264 编码，不需要转码。

这次"非并行的胜利"在数据上和"三段并行"几乎相当（都是减半量级），但成本要低得多——改一行 preset 名字。

## 六、和一年前的 USB 那篇矛盾吗？

一年前我在相机控制项目里写过：

> **异步不是越多越好，最简单的同步链路配上一个合适的执行线程就够了。**

那篇讲的是 Electron 主线程不能被 3.5 秒的同步 FFI 调用冻住，所以把同步阻塞搬到 worker thread 解决。今天这篇讲的是 C++ 视频导出里**主动造了一个三线程 + 有界队列**。看起来反过来了。

但其实**判断标准是一致的**——问题始终是"卡的是谁、谁会等"：

| 项目 | 谁在等 | 卡的对象 | 解决方法 |
|---|---|---|---|
| USB 相机 | Electron 主线程被冻 → UI 不能动 | 主线程感知用户操作 | 异步壳（Worker thread） |
| 视频导出 decode | 解码 ASIC 等 GPU 画完 | 硬件之间互等 | 三段流水线 + 有界队列 |
| 视频导出音频合并 | 用户看着进度条等 | 单步 CPU 重编码 | Passthrough preset |

USB 相机那篇的本质是"主线程会被用户感知"——所以异步壳必须存在。而视频导出的解码/编码/ GPU 在不同线程上**没有人会直接感知它们的等待**（用户感知的是进度条，而进度 callback 是单独事件流，不依赖 worker 间的串行）。所以这里要解决的是"硬件之间的浪费"，不是"主线程的卡顿"。

判断方法没变：**异步边界贴近"真正会被感知到阻塞"的地方，而不是越靠底层越好**。一年前是用户，现在换成硬件。

## 七、方法论：什么时候要排队

沉淀三条这次新学的判断规则，跟之前的《相机控制》文章放在一起用：

**1. 先装计时，再决定要不要排队**。看到阶段耗时分布之前，所有"应该并行"的判断都是猜。60 行计时代码的成本远低于一次错误的并发改造。

**2. 识别天然单线程的资源**。Skia GrDirectContext、Metal command queue、AVAssetWriter、串行总线……这些都是"必须单线程访问"的资源。**不要为了并发而并发**，拆分只会带来锁和竞态。

**3. 排队解决的是"硬件/线程之间的浪费"，不是"主线程的卡顿"**。前者是吞吐优化（吞吐翻倍、单帧时间不变），后者是响应性优化（latency 降低、UI 不卡）。两个问题用两套手段。混淆这两者就是 USB 那篇文章里 "v1 在 C++ 造异步队列"的失败原因——把响应性问题硬塞给了底层。

## 八、尾声

原生架构上线时我以为这一波"快完了"——5 分钟内导出已经是用户能接受的水平。结果一装计时发现还有 20% 提空间，加上音频合并一个"几乎不要钱"的 passthrough 改动，总导出从 7分40秒 收到 4 分钟左右。

但这一轮最大的收获不是时间数字，而是**两份文章放在一起能读出一个更普遍的判断**：

> 异步队列该不该造，问三个问题：**(1) 谁在等？(2) 卡的是什么？(3) 谁会感知这种等待？** 三问答案不同，方案就不同。

下次再遇到性能问题，我会先装计时，再问这三问。

---

*本文所有代码示例已做脱敏处理，仅展示设计意图。性能数据基于 macOS 14 + Apple Silicon M3 测试环境，源视频为 18 分钟 2688×1512 运动相机素材。*