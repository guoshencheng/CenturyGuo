---
title: "视频导出App持续优化：原生架构里还能再榨 20%"
description: "在已经 5 分钟的原生 C++ 视频导出架构上，装完计时发现还能再榨 20%——B2 删除两次 GPU 同步阻塞 + A 三段生产者-消费者管线（解码 ASIC / GPU / 编码 ASIC 三种独立硬件重叠）+ 音频合并从重编码改 Passthrough。总导出 7分40秒 收到 4 分钟左右，保留 3× 超采样画质不变。"
date: 2026-07-07
tags: ["performance", "video", "concurrency", "native", "pipeline", "optimization"]
faq:
  - q: 这次优化把导出从几分钟压到几分钟？
    a: 18 分钟 2688×1512 视频端到端导出，从 7分40秒 收到 4 分钟左右——视频帧导出阶段从 4 分钟降到 3分56秒，音频合并从 3分44秒 降到几秒。三段管线并行让视频帧阶段提速约 20-25%，加上音频合并 Passthrough 让总导出减半。提速的关键不是"压榨某一段"，而是"让三种独立硬件同时有活干 + 让一个无意义的重编码步骤消失"。
  - q: 优化过程中最有价值的发现是什么？
    a: 装完计时之前我以为瓶颈在 GPU（230s）。装完才发现 GPU 段的 render(113s) 和 composite(117s) 才是真正的瓶颈——而它们都在同一条 GPU command queue 上，无法跨阶段并行。后续要再提速只能盯这两个 stage 的算法本身（减少 widget 数量、用查表混合替代逐像素 Alpha），而不是堆更多线程。**装完计时之前的所有"应该并行"的判断，都是猜。**
  - q: 为什么用有界阻塞队列 + 三线程，而不是 ThreadPool + 任务图？
    a: 因为解码、GPU、编码三段是天然单线程串行资源（VideoToolbox 解码 ASIC、Metal command queue、AVAssetWriter 各自只能单线程访问），不存在"同一个 stage 并发"的可能。最适合的并行粒度是段间流水线重叠，而不是段内并发。有界队列还自带背压——某段慢了队列自然反压上游，内存不会无限堆积。这跟"任务图"思路是相反的：能用一条传送带解决的事，不要去做拓扑排序。
  - q: 这个改动对低端机型有影响吗？
    a: B2（删 GPU 等待）是纯收益——不加线程、不加内存，只去掉 CPU 的空等，对任何机型都有效。A（三段并行）会带来 +15~30MB 内存增量（队列深度 2），并可能让无风扇机型（MacBook Air）长时间导出触发热降频——但它也导出得更快，总能耗相近。架构上把深度做成参数，本期固定 2，将来可加机型自适应（≤8GB 内存退到深度 1）。
  - q: 跟上一篇《从 15 分钟到 5 分钟》的"重写架构"路线矛盾吗？
    a: 不矛盾，是顺承关系。架构重构改的是天花板（Electron 8-15 分钟 → 原生 < 5 分钟），这次装计时告诉你离天花板还差多少（再榨 20%）。两件事用两套手段：架构层用零拷贝 GPU 纹理，调度层用三段生产者-消费者。先把天花板抬到对的高度，再在天花板下找空间。
---

# 视频导出App持续优化：原生架构里还能再榨 20%

![原生架构里还能再榨 20%：装完计时、三段并行、Passthrough](/images/blog/native-export-three-stage-pipeline/00-header.jpg)

> 上一篇《[从 15 分钟到 5 分钟：当我们决定放弃 Electron 重写一个视频导出 App](/blog/electron-to-native-video-export-architecture)》讲的是 Electron → 原生 C++ 的架构重构，结尾我留了一个问号："架构内部还能再快多少"。这次回答这个问号：在已经 5 分钟的原生架构上，再榨 20% 的视频帧时间，加上一处"几乎不要钱"的音频合并改动，总导出从 7分40秒 收到 4 分钟左右。这次没动架构，靠 16 个 commit、几行 `std::chrono`、加上一条三段生产者-消费者管线。

## 一、起点：原生架构上线后的"还差一点"

v2 原生架构上线后，17 分钟 1080p 视频导出从 8-15 分钟（Electron）降到 5 分钟内（原生）。这个数字本身已经能交付了——但我自己跑过几次后还觉得差点意思：

- 18 分钟 2688×1512 视频导出，墙钟接近 4 分钟，CPU 占用 70%，内存峰值 800MB
- 性能分析显示三段硬件——VideoToolbox 解码（媒体 ASIC）、GPU、VideoToolbox 编码（媒体 ASIC）——理论上各自独立，**但代码里严格一个等一个跑完**
- 上一篇文章里讲过的 Pipeline 模式，stage 之间是串行调度

那么问题来了：在已经"足够好"的原生架构上，**还值得**再花两周时间优化吗？还是就停在 5 分钟？

## 二、第一个问题：不知道瓶颈在哪

### 现状：原生架构是单线程串行循环

![原生架构的串行管线](/images/blog/native-export-three-stage-pipeline/01-serial-pipeline.svg)

v2 原生架构跑起来后，6 个 stage 严格一个等一个跑完——一帧走完所有 stage 才进下一帧。**问题**：具体每个 stage 耗时多少？哪个 stage 是瓶颈？只能猜（看着 GPU 一直在跑，估摸是它）。没有数据，所有"应该并行"的判断都是赌。

### 怎么解决：60 行 C++ 给每阶段装计时

我做的第一件事是**给每阶段装计时**——这步本身比想象的简单。60 行 C++ 加一个 `std::chrono` 包裹器，就能在每次导出后看到 `decode 0.8s / render 113s / downsample 0.4s / composite 117s / encode 62s` 这种数据。

装上以后，第一次跑出来的数字让问题换了形状：

```
decode 段[解码: 795.0ms (100%), 引用帧: 1.1ms (0%)]
gpu 段[渲染: 113181.7ms (49%), 降采样: 356.6ms (0%),
       分配: 1833.6ms (1%), 合成: 116872.3ms (50%),
       释放帧: 194.6ms (0%)]
encode 段[编码: 61800.7ms (100%)]
```

### 改完之后：瓶颈清晰，三段分布一目了然

![三段耗时分布](/images/blog/native-export-three-stage-pipeline/02-stage-timing.svg)

三个数字让我重新审视了"并行能提速多少"这个问题：

| 段 | 串行累计 | 三段并行后可重叠 | 实际墙钟 |
|---|---|---|---|
| decode（ASIC） | 0.8s | 是（与下游并行） | 几乎被隐藏 |
| **GPU** | 230s | **否（GPU 单队列串行）** | **瓶颈** |
| encode（ASIC） | 62s | 是（与 GPU 并行） | 大部分时间在等 GPU |

理论上限是 `max(0.8s, 230s, 62s) = 230s`。从 295s（串行累计）到 236s（实测），约 20% 的提速——主要来自 decode 与 GPU 重叠、encode 与 GPU 重叠。

**装计时的过程还顺手发现一个附赠问题**：降采样单独计时只有 357ms，但每帧都有 2 次 CPU↔GPU 同步阻塞（降采样和合成模块各做了一次 `[cmdBuffer waitUntilCompleted]`），每帧两次往返。三步 GPU 工作（render → downsample → composite）本来就在同一 Metal command queue 上，Metal 保证按提交顺序执行，所以**中间那两次同步等待是冗余的**。我把这个发现拆出来单独做，叫 B2。

## 三、第二个问题：GPU 内部有 3 次 CPU↔GPU 同步阻塞

### 现状：每帧 3 次同步等待，CPU 大量空转

![B2 前：3 次 CPU↔GPU 同步阻塞](/images/blog/native-export-three-stage-pipeline/03-gpu-sync-before.svg)

GPU 工作分三步：render → downsample → composite。代码里每一步做完都做了一次 `[cmdBuffer waitUntilCompleted]`——**CPU 阻塞等 GPU 完成才继续**。问题在于：这三步都提交到**同一条 Metal command queue**，Metal 保证按提交顺序执行，GPU 命令其实在队列里早就排好，根本不需要 CPU 傻等。

### 怎么解决：删两行 waitUntilCompleted，改成 completion handler

把降采样和合成末尾的同步等待去掉，改成 `addCompletedHandler` 异步上报，CPU 不再卡住：

```objc
// 降采样模块：去掉 GPU 同步等待
[cmdBuffer addCompletedHandler:^(id<MTLCommandBuffer> cb) {
    if (cb.error) {
        NSLog(@"[Downsample] Command buffer error: %@", cb.error);
    }
}];
[cmdBuffer commit];
// 不 waitUntilCompleted：与后续合成共用同一命令队列，
// Metal 保证按提交顺序执行；GPU 完成由合成末尾的等待统一保证。
return true;
```

### 改完之后：每帧 1 次等待，CPU 不再空转

![B2 后：1 次同步阻塞（末尾）](/images/blog/native-export-three-stage-pipeline/04-gpu-sync-after.svg)

CPU 每帧从"空等 2 次"变成"只在合成末尾等 1 次"。**更值钱的是 GPU 段的整体节奏**：CPU 在等 GPU 末尾完成时，可以同时准备下一帧的数据（Skia flush 本来就是非阻塞），下一帧的 render 命令提交进队列，GPU 一完成立刻接着画——CPU 和 GPU 之间的空闲气泡被挤掉。

画质上完全无损，因为 Metal 队列保序的语义没变——下游合成一定在上游降采样之后才执行。

B2 是**纯收益**：不加线程、不加内存、不改数据流，只是把 CPU 的空等去掉。即便在最弱的机器上也依然有效。

## 四、第三个问题：三种硬件没有重叠

### 现状：单线程串行，3 段没有重叠

![单线程串行：3 段没有重叠](/images/blog/native-export-three-stage-pipeline/04a-three-serial-current.svg)

B2 干完之后，剩余的瓶颈清晰了：decode（ASIC）和 encode（ASIC）大部分时间在等 GPU，而 GPU 自己也不能更快——它已经把整个视频流画完 + 合完，已经在做 3× 超采样。三种硬件理论上完全独立，但代码里严格一个等一个跑完。

### 怎么解决：三段生产者-消费者管线

GPU 的 230s 既然没办法再压缩，剩下的就是**让 decode 和 encode 别闲着**。方法就是把它们从单线程串行循环里**拆出来**，各跑一个线程，段间用有界 FIFO 队列连接：

![三段生产者-消费者管线架构](/images/blog/native-export-three-stage-pipeline/05-three-stage-architecture.svg)

三种硬件同时有活干：解码第 N+1 帧、GPU 处理第 N 帧、编码第 N-1 帧。

### 改完之后：3 帧在 3 段同时处理

![并行执行时序：3 帧在 3 段同时处理](/images/blog/native-export-three-stage-pipeline/06-parallel-execution.svg)

GPU 是瓶颈，3 帧在 GPU 队列里紧挨着被处理；编码 ASIC 等 GPU 喂，但能接住节奏；解码 ASIC 几乎瞬间完成（0.8s 处理 26912 帧）——墙钟从 max(各段) 而非 sum(各段)。

这五处是反复改过、最终保留下来的关键设计：

### 4.1 段间有界队列自带背压

队列设容量上限（深度 2），任何一段慢了，上游 `Push` 会阻塞，下游 `Pop` 会阻塞。这避免了"内存无限堆积"的灾难——某段性能抖动时，最坏情况就是上游暂时停下来，而不是 OOM。

### 4.2 GPU 段是单线程，不是线程池

我**没有**给 GPU 段内部做进一步并发（比如 render 拆两个线程、composite 拆两个线程）。原因：

- Skia 渲染上下文是线程不安全的
- Metal 上下文的命令队列不允许并发 dispatch
- 降采样和合成模块各自维护的纹理缓存都有并发访问检测的 debug 日志

GPU 内部本身就是单队列串行资源，进一步拆线程只会引入锁。**并行粒度只到段间，不进段内**——Skia、Metal、底层视频像素缓冲池都拒绝并发访问，再拆只会换来锁和竞态。

### 4.3 解码帧的缓冲区生命周期必须显式管理

并行带来的最大风险是**缓冲区跨线程泄漏**。硬件解码器复用了同一块内部的 `CVPixelBuffer`——每次读取下一帧时会先释放上一帧、再 retain 新帧。如果解码线程读完就丢进队列，下一次读取下一帧时，会**把还在 GPU 段里用着的那一帧释放掉**——花屏或崩溃。

修法是在管线里加两个轻量的"引用计数" stage：解码段尾部对帧做 `CVPixelBufferRetain`（引用计数 +1），GPU 段尾部做 `CVPixelBufferRelease`（引用计数 -1）。没有这两个 stage，整套并行立刻内存不安全。

### 4.4 编码端天然支持多缓冲

`AVAssetWriter` 的输入适配器背后是 `CVPixelBufferPool`，可以并发 `AcquireOutputBuffer`——所以编码线程可以从自己的队列里一直取帧，不需要和 GPU 线程互斥。

### 4.5 串行单测，连跑 5 次没翻车

并行管线调度器本身不关心具体的 stage 是什么——它接受三段"stage 列表"，每个 stage 暴露统一的 `Process(帧数据&)` 接口。所以我可以用 Fake stage 写测试，验证三件事：

1. 帧顺序严格按 PTS 保序（编码端逐帧检查 ptsMs）
2. 取消状态能在 worker 之间传播
3. 任何一段失败，能正确 abort 整条管线

5 次重跑都没出问题（线程 + 条件变量这类代码最容易出竞态）。

## 五、第四个问题：音频合并在无意义地重编码

### 现状：HighestQuality 把已编码视频再编一遍，3 分 44 秒

视频帧导出完了，剩下的是音频合并——这步独立于上面的并行管线，原本用 `AVAssetExportSession + AVAssetExportPresetHighestQuality`，意思是**把已经编码好的视频整段重编码一遍**（18 分钟视频花了 3分44秒 做重编码）。

### 怎么解决：改成 Passthrough preset

```objc
// 原代码（最高质量 preset = 重编码整段视频）
AVAssetExportSession *exportSession =
    [[AVAssetExportSession alloc] initWithAsset:composition
                                     presetName:AVAssetExportPresetHighestQuality];
```

```objc
// 新代码（透传 preset = 拷流，不重编码）
AVAssetExportSession *exportSession =
    [[AVAssetExportSession alloc] initWithAsset:composition
                                     presetName:AVAssetExportPresetPassthrough];
```

`HighestQuality` 会让 AVFoundation 把已经编码好的 H.264/H.265 视频**完整重编码一次**，然后再 mux 音频。`Passthrough` 直接拷贝编码流、只重新打包容器。

### 改完之后：纯 IO 操作，3 分 44 秒 → 几秒

![音频合并：从重编码到 Passthrough 拷流](/images/blog/native-export-three-stage-pipeline/07-audio-merge-comparison.svg)

兼容性在这里没有问题，因为我的 temp 视频和目标容器都是 MP4、都是 H.264 编码，不需要转码。加了一层 nil 检查：底层不支持 passthrough 时自动 fallback 到 HighestQuality 不会崩。

这次"非并行的胜利"在数据上和"三段并行"几乎相当（都是减半量级），但成本要低得多——改一个 preset 名字。

> ⚠️ 一个细节：passthrough 不支持 `AVMutableComposition` 做 A/V track 重排这种"重排"操作。如果你的 composition 涉及时间轴重排或多轨混合，需要回退到 `AVMutableMovie` 或考虑把音频写到视频编码阶段（`AVAssetWriterInput` 同时挂音频）。当前场景只有一条视频轨 + 一条音频轨，passthrough 够用。

## 六、汇总：7分40秒 → 4 分钟

![端到端：7 分 40 秒 → 约 4 分钟](/images/blog/native-export-three-stage-pipeline/08-overall-timeline.svg)

18 分钟 2688×1512 视频端到端导出的时间线：

| 阶段 | 优化前 | 优化后 | 提速 |
|---|---|---|---|
| 视频帧导出 | 4 分多钟 | 3 分 56 秒 | ~20-25% |
| 音频合并 | 3 分 44 秒 | 几秒 | ~99% |
| **总导出** | **7 分 40 秒** | **~4 分钟** | **~50%** |

视频帧阶段的提速来自 B2 + A 的叠加，音频合并的提速来自 passthrough。两个改动都保留 3× 超采样（用户视角的画质不变），全靠调度层和数据流层的优化。

**省下的 224s 几乎全部来自 Passthrough**——视频帧阶段本身只省了 4s（295s → 236s），但消除"无意义重编码"是更大的胜利。

**当前瓶颈**：GPU 段的 render(113s) + composite(117s)，都是 3× 超采样的固有代价。要再提速得盯这两项的算法本身（比如 render 端能不能减少 widget 数量、composite 端能不能换成查表混合），而不是堆更多线程——它们都在同一条 GPU command queue 上，段内并发没有空间。

## 七、方法论：几条判断规则

这次新学到的判断规则，跟上一篇文章放在一起用：

**先装计时。** 60 行 C++ 加 `std::chrono`，能告诉你 decode / GPU / encode 三段各占多久。看不清分布就判断"该不该并行"，跟闭眼开车没区别。60 行计时代码的成本，远低于一次错误的并发改造。

**识别天然单线程的资源。** Skia 渲染上下文、Metal 命令队列、硬件编解码器、底层像素缓冲池、串行总线——它们要么线程不安全，要么命令队列不并发，要么 buffer pool 不公开。**不为并发而并发**，拆了只会换来锁和竞态。

**"减少"和"重叠"是两件不同的事。** B2 减少 CPU 空等，A 让三段硬件重叠工作，passthrough 减少重编码——三个改动的目标完全不同。能识别"我当前是哪种慢"，才能选对工具。

**不要为深度买单。** 管线深度越大，并行越充分，但内存也线性增长。深度 1 退化为近串行、深度 3 全速重叠——本期固定深度 2，架构上做参数化，将来加机型自适应或 UI 开关不用重构。

**先做低风险、再上高风险。** 这次的执行顺序是：先做 B2（删两行）→ 再做 A（结构性改动）。B2 出问题能秒回滚，A 出问题排查成本高。**风险越高的改动，越要靠前置的低风险改动提供数据和信心**。

## 八、尾声

16 个 commit，一个架构都没改，导出从 7分40秒 收到 4 分钟左右。

最大的收获不是时间数字，而是这次把上一篇文章里那个问号填上了——"架构内部还能再快多少"：**能，但需要装完计时才知道**。架构重构改的是天花板，装计时告诉你离天花板还差多少。两者不是替代关系，是顺承关系。

留下来的"再榨空间"已经到 GPU 段算法层面（render 和 composite 各 100 秒出头的 3× 超采样开销），不是调度问题。这一层要再动，就不是"装完计时"能解决的事了——得想清楚到底是 GPU 算力真不够、还是 widget 渲染本身有冗余计算。

但那是另一篇文章了。

---

*本文所有代码示例已做脱敏处理，仅展示设计意图。性能数据基于 macOS 14 + Apple Silicon M3 测试环境，源视频为 18 分钟 2688×1512 运动相机素材。*
