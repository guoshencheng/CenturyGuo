---
name: blog-illustration
description: 为博客文章生成 AI 插画提示词、规划图片存放与命名、插入 Markdown 引用、并将生成的 PNG 压缩为 WebP。固定采用「彩色手绘插画」风格（watercolor + crayon + 可见纸张纹理）。当用户说「给文章配图」「生成配图」「生成插画」「compress blog images」或类似请求时触发此 skill。专注于 CenturyGuo 博客（`src/content/blog/*.md` + `public/images/blog/<slug>/`）的工作流，但也适用于任何 Astro 风格的博客。
---

# 博客配图助手

为博客文章提供**端到端配图**：从识别可视觉化的概念、生成 AI 绘图提示词，到规划图片目录、自动插入 Markdown 引用、再到压缩图片。

## 适用场景

- 用户写完或修改了一篇技术文章，希望补上配图
- 用户单独索要 AI 绘图提示词
- 用户给出已生成好的图片，要求归档到博客并插入文章
- 用户希望压缩已有的博客图片

## 不适用场景

- 用户只想自己写图，不希望生成提示词
- 用户需要 UI 截图、产品界面图（应使用其他工具）
- 纯文字、随笔类文章（强制配图会破坏节奏）

---

## 工作流概览

```
1. 读文章 + 识别可视觉化点
2. 与用户确认配图数量和插入位置
3. 生成 AI 绘图提示词（彩色手绘风格）
4. 给出图片存放目录与命名方案
5. 在 Markdown 中插入 ![alt](path) 引用
6. （图片生成完毕后）压缩 PNG → WebP，并更新引用
```

每个步骤都对应一次与用户确认，而不是一气呵成。**用户的隐晦度偏好、风格细节、压缩与否都应可被覆盖**。

---

## 步骤 1：读文章 + 识别可视觉化点

读 `src/content/blog/<slug>.md`（或用户提供的 markdown 文件），扫描出适合配图的位置。常见可视觉化点：

- 协议/架构分层（多层次概念）
- 多方案对比（X vs Y）
- 单个对象的内部结构（容器 + 子元素）
- 端到端数据/控制流
- 关键概念示意图

不强制每节都配图——文字足够说清楚的不配。常见的合理配图数量是 3–5 张。

## 步骤 2：与用户确认

一次问一个关键问题。建议问的顺序：

1. **配图数量**：每节一张 / 核心 N 张 / 1 张总览
2. **风格是否调整**：默认彩色手绘，是否需要改
3. **是否包含中文/英文标签**：影响提示词中关于 `hand-lettered labels` 的描述

## 步骤 3：生成提示词

### 风格基线（写死）

所有提示词必须包含下列关键词以保证风格统一：

```
colorful hand-drawn illustration, watercolor washes, crayon textures,
ink outlines, hand-lettered labels, visible paper grain,
white background, playful editorial style
```

**为什么固定这个风格**：本博客整体是手绘/水彩科技感，配图需要与站点视觉一致；彩色手绘在 AI 绘图里参数稳定，可复现。

### 提示词结构

每张图都按以下结构写：

```
[主语 + 内容描述]，[构图/视角]，
[色彩]，[装饰元素]，[整体氛围]。
```

例如：
```
A colorful hand-drawn illustration of a three-layer streaming
protocol architecture, sketched with loose ink outlines and
watercolor washes. Three stacked horizontal platforms drawn with
slight wobble. Soft purple and teal palette, hand-lettered labels,
visible paper texture, white background.
```

### 中文版本

每张图都额外提供中文大意段落，**方便用户在中文 AI 绘图工具中使用**。

## 步骤 4：图片存放与命名

### 目录结构

```
public/
└── images/
    └── blog/
        └── <slug>/
            ├── 01-<topic-1>.png
            ├── 02-<topic-2>.png
            └── ...
```

**为什么按 slug 分目录**：Astro 把 `public/` 映射到站点根路径；按文章分目录能让不同文章的图片互不干扰。

### 命名规范

`<index>-<topic>.png`，其中：

- `<index>` 是两位数序号（`01`、`02`、…）
- `<topic>` 是英文短横线串，描述这张图的内容（如 `protocol-layers`、`single-vs-multiple-messages`）

**为什么要求英文命名**：URL 友好，避免中文转义带来的潜在问题。

## 步骤 5：插入 Markdown 引用

在确定的位置插入 `![alt](/images/blog/<slug>/<index>-<topic>.png)`。

`alt` 文本使用简短中文描述图片内容，不要超过 20 个汉字。

插入位置要**贴近语义自然段落的边界**：
- 分层、流程类 → 在分层列表之后
- 对比类 → 在「最终选择」段落之前（让图先出现再下结论）
- 结构类 → 在第一个相关代码块之后
- 全景链路类 → 在小节标题之后、第一段之前

## 步骤 6：压缩图片

**触发条件**：用户告诉你「图片生成好了」或者已经在 `Downloads/` 目录有图时，**自动执行**压缩。

### 工具优先级

1. `cwebp`（优先；大多数 macOS 上 `brew install webp` 即可）
2. `pngquant` / `oxipng`（次选；只压缩 PNG，不转格式）

如果 `cwebp` 不可用，**先尝试安装**：

```bash
brew install webp
```

只有安装失败时才退回 PNG 压缩工具。

### 压缩参数

```bash
cwebp -q 85 <input.png> -o <output.webp>
```

**为什么选 85**：在视觉质量与体积之间取平衡；4MB 图通常压到 300–500KB，肉眼难辨差异。

### 收尾

- 删除原始 PNG
- 更新 Markdown 中所有 `.png` 引用为 `.webp`
- 用 `ls -lh` 验证文件大小

---

## 输出模板

每次执行完，输出按以下结构汇报：

```markdown
## 完成内容

**图片存放位置：**
public/images/blog/<slug>/
├── 01-...png/.webp
├── 02-...png/.webp
...

**文章中的引用位置：**
- 第 N 行：<alt 文本>
- 第 N 行：<alt 文本>
...

**压缩结果（如有）：**
| 图片 | 压缩前 | 压缩后 | 压缩率 |
| --- | ---: | ---: | ---: |
| 01-... | x MB | x KB | ~x% |
...
```

---

## 限制与边界

- **不直接调 AI 绘图 API**：本 skill 只生成提示词 + 管理文件，不替你调 OpenAI/SD/Midjourney。生成图片由用户在外部完成后再回到本 skill 归档压缩。
- **不修改文章正文**：只在 Markdown 中插入 `![alt](path)` 引用，不重写段落。
- **风格不轻易改**：彩色手绘是基线。如果用户明确说"换风格"，才改。

---

## 协同工具

- 提示词生成阶段：可结合 `blog-generator` skill（如果文章本身要重写）
- 压缩阶段：依赖系统 `cwebp` 命令（macOS 可通过 `brew install webp` 装）
