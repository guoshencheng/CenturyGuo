---
title: "从 15 分钟到 5 分钟：当我们决定放弃 Electron 重写一个视频导出 App"
description: "一段 17 分钟的运动视频导出要 15 分钟，瓶颈出在哪里？分享我们从 Electron 同源渲染、并发多窗口踩坑，到彻底推翻重写为原生 C++ 引擎 + GPU 零拷贝方案的完整思考路径。"
date: 2026-06-17
tags: ["performance", "video", "refactor", "electron", "native", "gpu"]
---

# 从 15 分钟到 5 分钟：当我们决定放弃 Electron 重写一个视频导出 App

> 一段 17 分钟的运动视频，导出需要 15 分钟。我等不起。

![Electron 到原生架构的性能跃迁](/images/blog/electron-to-native-video-export-architecture/00-performance-leap.webp)

## 一、引子：一个性能驱动的架构重构

我给自己做了一个小工具：把运动相机拍下的视频和手表记录的 GPS 轨迹合成，在画面上叠加配速、心率、路线图等实时数据，导出一段可以直接发朋友圈的运动短片。

用了一段时间后，核心痛点只有一个：**导出太慢了**。一段 17 分钟的 1080p 视频，导出要 8 到 15 分钟。导入素材、调好样式、点击导出，然后盯着进度条发呆。这不是我想要的体验。

问题出在哪里？我花了三周时间，从 Electron 的舒适区里走出来，重新写了一套原生引擎。这篇文章记录这段架构变迁的完整思考路径——不是炫技，而是**在性能瓶颈面前，如何诚实面对现有方案的极限，并做出推翻重来的决策**。

## 二、v1 架构：同源渲染的巧妙与局限

### 2.1 设计初衷：一套代码，两种用途

v1 的技术选型很典型：Electron + React + ffmpeg。我做了一个在当时看来很优雅的设计——**同源渲染**。

编辑模式下，用户看到的预览界面是一个普通的 React 页面，`<video>` 标签播放视频，上面叠加一层 Canvas 绘制的 HUD 组件。导出模式下，主进程创建一个**隐藏的 offscreen BrowserWindow**，加载同一份 React 代码（通过 URL 参数切换模式），然后逐帧截图，把 BGRA bitmap 喂给 ffmpeg 合成视频。

核心链路长这样：

```
主进程创建 hidden offscreen 窗口
  → 加载 React 导出模式（?mode=export）
  → 逐帧 dispatchEvent('export-frame', videoTimeMs)
  → React 重渲染 HUD
  → requestAnimationFrame ×2 等待绘制完成
  → webContents.capturePage() 拿 BGRA bitmap
  → 写入 ffmpeg stdin
  → ffmpeg overlay 合成 MP4
```

这个设计的巧妙之处在于：**编辑和导出共用同一份 React 代码**。预览时看到的 HUD 样式和导出时的完全一致，不存在"预览时好看、导出时变样"的问题。当时我认为这是架构的核心简化点。

### 2.2 性能瓶颈：bitmap 时代的代价

但性能数据很诚实：

| 指标 | 数值 | 根因 |
|------|------|------|
| 单帧渲染 | 5-15ms | CPU 渲染，无 GPU 加速 |
| 预览响应 | ~100ms | 主进程 ↔ 渲染进程 IPC |
| 17min 1080p 导出 | 8-15 分钟 | 逐帧截图 + bitmap 内存拷贝 |
| 内存峰值 | ~2GB | Electron 多进程开销 |

问题不在代码写得不好，而在**架构层面的数据流形态**：每一帧都要从 GPU 显存 readback 到 CPU 内存，变成 bitmap，再拷贝给 ffmpeg。bitmap 是 CPU 内存里的原始像素数组，体积巨大（1920×1080×4 字节 ≈ 8MB/帧）。一秒钟 30 帧就是 240MB/s 的内存流量，这还没算 IPC 序列化和 ffmpeg 编码的开销。

![v1 架构的 bitmap 数据流](/images/blog/electron-to-native-video-export-architecture/01-bitmap-data-flow.webp)

## 三、第一次优化：并发多窗口的踩坑

### 3.1 思路：多窗口并行，榨干多核

导出慢？第一反应是并发。我尝试了**多 offscreen 窗口并行截图**：开 4 个隐藏窗口，每个窗口负责视频的一段，同时截图、同时喂给 ffmpeg。

理论上，4 个窗口应该能把导出时间压到原来的 1/4。但实测结果：内存峰值飙到 4GB+，系统开始疯狂 swap，导出时间反而更长。

### 3.2 应对：背压控制

我很快意识到问题：**bitmap 不是轻量数据**。每个窗口每帧都在生产 8MB 的内存对象，4 个窗口就是 32MB/帧。如果 ffmpeg 编码速度跟不上截图速度，bitmap 会在内存里堆积成山。

于是加了背压控制：限制在飞帧数，当 ffmpeg 缓冲区满时暂停截图。这确实缓解了内存问题，但引入了新的复杂度——窗口之间的同步、帧顺序的保证、错误恢复的逻辑都变得异常脆弱。

### 3.3 回滚：并发不是银弹

一周后，我回滚了并发优化。这次尝试的教训很深刻：

> **当数据流是 bitmap 而非 GPU 纹理时，并发带来的内存拷贝成本远超 CPU 计算收益。** 多核并行解决不了数据形态的瓶颈。

## 四、转折点：为什么必须推翻重做

### 4.1 三个数字的冲击

并发优化失败后，我重新审视了整个架构。三个数字摆在面前：

1. **单帧 5-15ms**：CPU 渲染的上限，Skia 再快也快不过 GPU
2. **~100ms 预览响应**：Electron 主进程和渲染进程之间的 IPC 开销，这是进程隔离的代价
3. **~2GB 内存峰值**：多进程模型 + bitmap 数据流的必然结果

这三个数字不是代码能优化的，是**架构决定的**。Electron 的进程隔离模型（主进程 + 渲染进程）天然带来 IPC 开销；浏览器环境的渲染管线天然走 CPU + bitmap 路径；Node.js 的内存管理天然不适合处理每秒几百兆的像素数据流。

### 4.2 关键决策：放弃 Electron，启动原生重写

我做了一个在当时看来很激进的决定：**彻底弃用 Electron，从零开始写一套原生应用**。

这个决策的依据不是"原生更酷"，而是**数据流的瓶颈在哪里，架构就要改到哪里**。如果瓶颈是"CPU 渲染 + IPC 跨进程通信"，那解决方案必须是"GPU 渲染 + 同进程零拷贝"。

## 五、v2 架构：Flutter + C++ + Clean Architecture

### 5.1 分层设计：UI 只传参数，引擎负责像素

新架构的核心原则是：**UI 层只传递参数，不绘制像素；引擎层负责所有像素的确定性计算；平台层仅提供硬件加速能力，不介入业务逻辑**。

分层结构：

```
UI 交互层（Flutter）
  → 编辑器主窗口、时间轴、预览视窗、属性面板
  → 通过 dart:ffi 直接调用 C++ 引擎（零序列化开销）

核心引擎层（C++17，Clean Architecture 四层）
  → domain/     — 数据实体 + 纯算法（100% 可复用）
  → use_cases/  — 业务编排流程（100% 可复用）
  → adapters/   — 接口/Port 定义（100% 可复用）
  → frameworks/ — 平台实现（macOS 独立，后续 iOS 适配）

平台硬件抽象层（Platform HAL）
  → Metal GPU 渲染、VideoToolbox 硬件编码、IOSurface 共享纹理
```

依赖方向严格向内：`frameworks/` → `adapters/` → `use_cases/` → `domain/`，内层不感知外层。

### 5.2 零拷贝：同一 GPU 纹理的三场景复用

新架构最关键的设计是**零拷贝 GPU 纹理复用**。我创建了一个 IOSurface-backed Metal texture，被三种场景共享：

- **编辑预览**：Skia GPU 渲染 HUD → Metal FBO → Flutter Texture Widget 直接显示
- **拖动时间轴**：Skia GPU 渲染单帧 → Metal FBO → Flutter Texture Widget 显示
- **视频导出**：视频解码（FFmpeg）→ GPU texture → Skia GPU 渲染 HUD → Metal FBO → Metal Compute Shader 合成（YUV 视频帧 + RGBA widget overlay）→ CVPixelBuffer → VideoToolbox 硬件编码

整个流程中，**像素数据从未离开 GPU 显存**。视频帧从解码到编码，全程在 GPU 内存里流转，没有一次 CPU-GPU 之间的 bitmap 拷贝。

### 5.3 WYSIWYG 的硬保证

v1 的"同源渲染"是软保证（同一份 React 代码），v2 是硬保证（**同一份 C++ 渲染代码**）。预览和导出调用完全相同的渲染函数，仅输出目标不同：预览时输出到屏幕，导出时输出到编码器。这消除了"预览和导出不一致"的整类 bug。

![v2 三层架构与零拷贝 GPU 纹理](/images/blog/electron-to-native-video-export-architecture/02-gpu-zero-copy.webp)

## 六、视频导出的两次关键重构

视频导出模块是性能优化的核心战场，也是架构设计最密集的地方。我经历了两次关键重构，每一次都是"遇到问题 → 深入思考 → 找到根因 → 设计解决方案"的完整循环。

### 6.1 重构一：从"上帝类"到 Pipeline Stage

**遇到的问题**：最初的导出器是一个 180 行的"上帝类"，承担了分辨率计算、解码器初始化、编码器初始化、GPU 合成器初始化、渲染表面创建、帧循环、错误处理、资源清理、进度回调等 8 项职责。同时存在一个 **P0 Bug**：设置输出尺寸的函数在打开解码器之后调用，对硬件解码器不生效——因为硬件解码器在打开时就已经根据目标尺寸创建了读取器，之后再改尺寸不会影响已创建的读取器。

**如何思考**：导出流程的本质是什么？每一帧都要顺序经过"解码 → 渲染 HUD → 分配输出缓冲区 → 合成视频+HUD → 编码"这几个步骤。这正是**Pipeline 模式**的标准场景：数据流顺序经过若干处理步骤，每个步骤职责单一，步骤之间通过数据容器传递结果。

**解决方案**：

1. 将导出器精简为 ~60 行的**装配器**，只负责协调和状态管理
2. 引入 **Pipeline 调度器**，维护 Stage 链的顺序执行
3. 拆分为 5 个独立的 **Pipeline Stage**：
   - 解码 Stage：从解码器读取下一帧，获取原始 PTS
   - 渲染 Stage：Skia GPU 渲染 HUD overlay
   - 分配 Stage：从编码器的 PixelBufferPool 分配输出缓冲区
   - 合成 Stage：Metal Compute Shader 合成 YUV 视频帧 + RGBA widget overlay
   - 编码 Stage：将合成后的帧送入硬件编码器

4. 修复 P0 Bug：调整调用顺序，**设置输出尺寸必须在打开解码器之前**

关键代码片段（已脱敏）：

```cpp
// 【关键修复】设置输出尺寸必须在打开解码器之前调用！
// 硬件解码器在 Open() 中根据目标尺寸创建读取器，
// 如果在 Open 之后调用，新的尺寸不会生效。
decoder->SetOutputSize(outWidth, outHeight);

if (!decoder->Open(videoPath)) {
    // 错误处理...
    return;
}
```

重构后的数据流清晰多了：

```
每帧循环：
  FrameContext { videoFrame, widgetOverlay, outputBuffer, ptsMs, frameIndex }
    → 解码 Stage 写入 videoFrame + ptsMs
    → 渲染 Stage 写入 widgetOverlay
    → 分配 Stage 写入 outputBuffer
    → 合成 Stage 读取 videoFrame + widgetOverlay，写入 outputBuffer
    → 编码 Stage 读取 outputBuffer，送入编码器
```

![Pipeline Stage 流水线架构](/images/blog/electron-to-native-video-export-architecture/03-pipeline-stages.webp)

### 6.2 重构二：分辨率判断与帧率修复

**遇到的问题**：

1. **分辨率选项判断错误**：用视频总像素数（宽×高）与目标分辨率的总像素比较，导致非 16:9 比例的视频（如 4:3、9:16）分辨率选项判断错误。例如 1440×1080 的视频（4:3），总像素 155 万，被误判为不到 1080p 标准（1920×1080 = 207 万像素），导致 1080p 选项被禁用。

2. **VFR 视频导出后卡顿**：用固定帧率驱动循环（总帧数 = 时长 × 帧率），编码时自行计算时间戳（帧索引 / 帧率），完全丢弃了源视频帧的原始时间戳。可变帧率（VFR）视频导出后时间轴错乱，出现"卡顿"感。

**如何思考**：

- 分辨率问题：1080p、4K、720p 的"标称值"本质上是**短边像素数**的行业约定，与宽高比无关。4K 是 3840×2160（短边 2160），1080p 是 1920×1080（短边 1080），720p 是 1280×720（短边 720）。用短边判断才是正确的语义。

- 帧率问题：视频文件的时间戳是**源素材的物理属性**，不是我可以随意重写的。固定帧率循环假设了"每秒均匀分布 N 帧"，但真实视频帧的时间戳由录制设备决定，可能不均匀（VFR）也可能与标称帧率不同。正确的做法是**让源视频帧驱动导出流程**，编码时使用每帧的原始 PTS（Presentation Time Stamp）。

**解决方案**：

1. 分辨率判断改为短边比较：`shortEdge = min(width, height)`，然后与 2160/1080/720 比较
2. 导出循环从 `for (i = 0; i < totalFrames; i++)` 改为 `while (decoder->ReadNextFrame())`
3. 编码器接口增加外部 PTS 参数：`EncodeFrame(buffer, ptsMs)`，使用源视频帧的原始时间戳

关键代码片段（已脱敏）：

```cpp
// 导出循环由源视频帧驱动，保留原始时间戳
while (decoder->ReadNextFrame()) {
    void* videoFrame = decoder->GetPixelBuffer();
    int64_t ptsMs = decoder->GetCurrentFramePtsMs();  // 源视频原始时间戳
    
    // 渲染 HUD（使用 ptsMs 插值运动数据）
    renderer->RenderAt(ptsMs, widgets, records);
    
    // 合成
    void* outputFrame = compositor->Composite(videoFrame, widgetOverlay);
    
    // 编码（使用原始 PTS，不自行计算）
    encoder->EncodeFrame(outputFrame, ptsMs);
    
    // 进度基于时间戳而非帧索引
    float progress = static_cast<float>(ptsMs) / (duration * 1000.0f);
    presenter->OnProgress(progress);
}
```


## 七、性能对比与两条核心方法论

### 7.1 性能对比

| 指标 | v1 Electron | v2 原生 | 提升 |
|------|-------------|---------|------|
| 单帧渲染 | 5-15ms | 2-5ms | **3×** |
| 17min 1080p 导出 | 8-15 分钟 | **< 5 分钟** | **3×** |
| 预览响应 | ~100ms | < 50ms | **2×** |
| 内存峰值 | ~2GB | < 1.5GB | **25%↓** |

### 7.2 三条核心方法论

这段重构经历沉淀了两条我自己可以复用的方法论：

**1. 数据流的瓶颈在哪里，架构就要改在哪里**

bitmap 时代并发无效，GPU texture 时代才有可能。当我发现并发多窗口优化失败时，应该立刻意识到问题不在"并发策略"，而在"数据形态"。bitmap 是 CPU 内存里的重型对象，GPU 纹理是显存里的轻量句柄——两者的并发特性完全不同。

**2. Pipeline 模式天然适合"每帧顺序处理"**

当数据流是"每帧依次经过若干处理步骤"时，Pipeline Stage 是最佳抽象。拆分后每一步都可独立测试、独立优化、独立替换实现。更重要的是，它强制你把"帧循环"和"单帧处理"解耦——前者是调度问题，后者是业务问题。

## 八、尾声：写给同样在瓶颈里挣扎的开发者

架构重构不是"赶时髦"，而是当业务增长把现有栈压到极限时，被迫做出的清晰判断。Electron 让我快速验证了产品想法，但在性能天花板面前，我必须诚实地说：这套栈到极限了。

推倒重来的代价很大——三周的密集开发、17 个 widget 从 JS Canvas API 翻译到 C++ Skia API、全新的构建系统、全新的 FFI 桥接。但代价更大的是**在错误的架构上持续优化**，每一次优化都在增加技术债务，直到系统变得无法维护。

好消息是，Clean Architecture 的分层设计让这次重构有了长期价值。Core 层 70-80% 的代码可以直接复用到 iOS 版本——只需替换 Metal context 和 UI 层，业务逻辑和导出 Pipeline 完全不变。

> 如果你也在经历"优化到极限仍不满意"的困境，不妨停下来问自己：瓶颈在代码层面，还是在架构层面？有时候，最快的路径是重新开始。

---

## 附：试试这个工具

如果你也是运动爱好者（跑步 / 骑行 / 越野），想给自己的视频加上实时数据 HUD，可以来试试这个工具：

**[run-dash.icerock.top](https://run-dash.icerock.top/)**

目前还在测试阶段，还有不少问题在修，但核心导出流程已经跑通了。如果你愿意尝鲜，欢迎下载试用并反馈 bug。

**macOS 用户注意**：由于 App 还没有做代码签名，macOS 可能会提示"无法打开，因为无法验证开发者"。这是正常的，解决办法如下：

1. 下载 `.dmg` 文件后，**不要直接双击打开 App**
2. 先右键点击 App 图标，选择**"打开"**
3. 在弹出的安全提示中，点击**"仍要打开"**
4. 如果还是不行，打开**终端**执行：
   ```bash
   xattr -d com.apple.quarantine /Applications/RunDash.app
   ```

> 签名正在申请中，后续版本会解决这个问题。

---

*本文所有性能数据基于 macOS 14 + Apple Silicon M3 测试环境。架构设计遵循 Clean Architecture 四层分层原则。代码示例已做脱敏处理，仅展示设计意图。*
