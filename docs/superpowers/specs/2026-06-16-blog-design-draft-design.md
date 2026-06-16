# Blog Design Draft Implementation — 设计文档

**日期：** 2026-06-16  
**状态：** 已确认  
**主题：** 将现有 Astro Retro Terminal 博客首页重构为“首屏蘑菇动画 + Terminal 卡片列表”风格，并同步更新文章详情页与标签页。

---

## 1. 目标

在保留 Terminal 窗口外壳的前提下，把内部内容从“命令行列表”改成设计稿中的“单卡片长列表”风格；同时恢复旧版 Gatsby 博客的蘑菇 3D 翻转动画作为首页首屏元素。

---

## 2. 设计原则

- **Terminal 作为统一容器**：所有页面内容仍包裹在 Terminal 窗口中（标题栏 + 三色圆点）。
- **一张卡片铺开多篇文章**：Terminal body 内是一个深色卡片，顶部有 `> CENTURY_GUO:/` 提示符，下方按时间顺序排列文章。
- **首屏视觉记忆点**：首页顶部使用动画蘑菇 + 站点标题，形成强识别度。
- **克制用色**：背景、卡片、文字、强调色分层清晰， pink 只用于标题高亮和重点提示。

---

## 3. 页面结构

### 3.1 首页 (`/`)

```
┌─────────────────────────────────────┐
│  Hero (70vh)                        │
│  ┌─────────┐                        │
│  │ 蘑菇动画 │  ← 3D 翻转             │
│  └─────────┘                        │
│     Century's World                 │
│  Code / Design / Random thoughts    │
│  ~/posts  ~/tags  ~/rss             │
│           ↓                         │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  ● ● ○  century@blog:~/posts        │  ← Terminal 标题栏
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │ > CENTURY_GUO:/               │  │
│  │                               │  │
│  │ [HOW REACT WORKS]             │  │  ← 红色底、白色字、居中
│  │ 2024.06.16 | #react #deep-dive│  │
│  │ Understanding the internals...│  │
│  │ [react] [source-code]         │  │
│  │ ───────────────────────────── │  │
│  │ [ASTRO REFACTOR]              │  │
│  │ ...                           │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 3.2 文章详情页 (`/posts/[slug]`)

- 顶部保留简洁 `site-header`：蘑菇 Logo + `~/posts` `~/tags` `~/rss` 导航。
- 主体为 Terminal 窗口。
- Terminal 内部卡片：
  - 顶部 `> CENTURY_GUO:/`
  - 文章标题：红色底、白色字
  - 日期 + 标签：teal 色
  - 描述（如果有）
  - 正文内容（markdown）
  - 底部：`cd ~/posts/` 返回链接

### 3.3 标签页

#### 标签总览 (`/tags`)

- Terminal 内部卡片：
  - 顶部 `> CENTURY_GUO:/tags`
  - 标签以 dark pill 形式排列
  - 每个标签显示文章数量

#### 标签筛选 (`/tags/[tag]`)

- Terminal 内部卡片：
  - 顶部 `> CENTURY_GUO:/tags/<tag>`
  - 下方显示该标签下的文章列表，样式与首页文章列表一致
  - 底部返回 `cd ~/tags/`

---

## 4. 视觉系统

### 4.1 配色

| 用途 | 色值 | 说明 |
|------|------|------|
| 页面背景 | `#0D1117` | Terminal 外壳外的底色 |
| 卡片背景 | `#1a1a2e` | Terminal body 内的大卡片 |
| 标题高亮底 | `#E94560` | 文章标题红色背景块 |
| 标题高亮字 | `#FFFFFF` | 红色块上的白色文字 |
| 链接 / 命令 / 标签文字 | `#16C79A` | teal 色 |
| 链接 hover | `#1ae8b0` | 更亮的 teal |
| 正文 | `#C9D1D9` | 主文字 |
| 辅助文字 | `#8B949E` | 日期、描述 |
| 边框 | `#30363D` | 分隔线、标签边框、Terminal 边框 |
| Terminal 圆点 | `#FF5F56` / `#FFBD2E` / `#27C93F` | 红 / 黄 / 绿 |

### 4.2 字体

- 全站等宽字体：`"JetBrains Mono", "Fira Code", "Cascadia Code", "Menlo", monospace`
- 中文字体回退：`"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`
- 站点标题可使用较粗的等宽字重或像素风格，但当前版本保持等宽粗体。

### 4.3 字号

| 元素 | 字号 | 说明 |
|------|------|------|
| 站点标题 | 32px / 2rem | 首页 Hero |
| 文章标题高亮块 | 20px | 红色背景块内 |
| 正文 | 15px | 文章内容 |
| 日期 / 标签行 | 12px | 辅助信息 |
| 描述 | 14px | 文章摘要 |
| 标签 pill | 11px | dark pill |
| Terminal 标题栏 | 12px | 窗口标题 |

### 4.4 间距

- Hero 区域：`padding: 60px 20px` 或垂直居中
- Terminal body padding：`24px`（桌面） / `16px`（移动端）
- 卡片内边距：`28px`
- 文章条目间距：`24px`
- 文章分隔线：`1px solid #30363D`，最后一条无分隔线

---

## 5. 组件规范

### 5.1 Terminal 窗口

保留现有 `Terminal.astro` 结构：

- 标题栏背景：`#161B22`
- 三色圆点：左对齐，间距 `6px`
- 窗口标题：`century@blog:~/posts` 等，根据页面变化
- body 背景：继承页面背景 `#0D1117`

### 5.2 Card 容器（新增）

新增一个 `Card.astro` 或直接在页面中实现：

- 背景：`#1a1a2e`
- 圆角：`8px`
- 内边距：`28px`
- 顶部提示符：`> CENTURY_GUO:/` 或 `> CENTURY_GUO:/posts` 等，根据页面变化

### 5.3 PostCard 组件（改造）

当前 `PostCard.astro` 从命令行风格改为卡片条目风格：

```astro
<article class="post-card">
  <a href={`/posts/${post.slug}`} class="post-card__title">
    {title}
  </a>
  <div class="post-card__meta">
    {formatDate(date)} | {tags.map(t => `#${t}`).join(' ')}
  </div>
  {description && <p class="post-card__desc">{description}</p>}
  {tags.length > 0 && <div class="post-card__tags">...</div>}
</article>
```

样式：

- `.post-card__title`：
  - `display: inline-block`
  - `background: var(--color-accent)`
  - `color: #FFFFFF`
  - `padding: 4px 14px`
  - `font-size: 20px`
  - `font-weight: bold`
  - hover：亮度微调或下划线
- `.post-card__meta`：
  - `color: var(--color-link)`
  - `font-size: 12px`
  - `margin-top: 10px`
- `.post-card__desc`：
  - `color: var(--color-text-muted)`
  - `font-size: 14px`
  - `line-height: 1.7`
  - `margin-top: 10px`
- `.post-card__tag`：
  - `background: #0D1117`
  - `border: 1px solid #30363D`
  - `border-radius: 4px`
  - `padding: 4px 10px`
  - `font-size: 11px`
  - `color: #16C79A`
  - hover：边框和文字变亮

### 5.4 Hero 组件（新增）

新增 `Hero.astro`：

- 高度：`70vh`
- 布局：垂直居中
- 内容：
  - 蘑菇动画（`Mushroom.astro` 动画版，尺寸 120px）
  - 站点标题 `Century's World`（`#E94560`）
  - 副标题 `Code / Design / Random thoughts`（`#8B949E`）
  - 导航链接：`~/posts` `~/tags` `~/rss`
  - 向下滚动箭头（闪烁动画）

### 5.5 蘑菇动画组件（改造）

复用旧版 `mashroom.js` 的 8×8 像素网格与 `rotateplane` keyframes：

- 每个 rect 按行列顺序设置 `animation-delay`，形成波浪翻转
- 动画：`perspective(120px) rotateX` 从 0° 到 -180° 再到 -360°
- 时长：`10s`
- 缓动：`ease-in-out`
- 循环：`infinite`
- 默认触发：页面加载后播放，建议添加 `prefers-reduced-motion` 媒体查询禁用
- 颜色：使用当前强调色 `#E94560`，深色块用 `rgba(233, 69, 96, 0.8)`，浅色块用 `rgba(233, 69, 96, 0.65)`

### 5.6 Site Header（改造）

在首页不显示 header，由 Hero 替代导航。其他页面保留：

- 左侧：蘑菇 Logo（静态） + `Century's World`
- 右侧：`~/posts` `~/tags` `~/rss`

---

## 6. 页面细节

### 6.1 首页

- 全页滚动：Hero 70vh → Terminal 卡片列表
- Terminal 窗口标题：`century@blog:~/posts`
- 卡片顶部提示符：`> CENTURY_GUO:/`
- 空状态：如果无文章，卡片内显示 `No posts yet.` + 闪烁光标 `█`

### 6.2 文章详情页

- Terminal 窗口标题：`century@blog:~/posts/{slug}.md`
- 卡片顶部提示符：`> CENTURY_GUO:/posts/{slug}`
- 标题下方显示日期 + 标签
- 描述（如果有）显示在标题和正文之间
- 正文按现有 `markdown.css` 渲染
- 底部返回链接：`cd ~/posts/`

### 6.3 标签总览页

- Terminal 窗口标题：`century@blog:~/tags`
- 卡片顶部提示符：`> CENTURY_GUO:/tags`
- 标签按文章数量降序排列
- 每个标签为 dark pill，显示 `#tag` 和 `N posts`

### 6.4 标签筛选页

- Terminal 窗口标题：`century@blog:~/tags/{tag}`
- 卡片顶部提示符：`> CENTURY_GUO:/tags/{tag}`
- 显示 `found N post(s)`
- 文章列表样式与首页一致
- 底部返回：`cd ~/tags/`

---

## 7. 响应式

### 7.1 桌面端（> 640px）

- Hero 70vh，内容垂直居中
- Terminal 最大宽度 `720px`，居中
- 卡片内边距 `28px`

### 7.2 移动端（<= 640px）

- Hero 高度可调整为 `auto`，最少 `60vh`，避免过小
- 站点标题缩小到 `24px`
- Terminal 占满宽度，无边距
- 卡片内边距 `20px`
- 文章标题字号 `18px`

---

## 8. 动画与交互

### 8.1 蘑菇动画

- 仅首页 Hero 显示
- 3D 翻转循环，10s，ease-in-out
- 尊重 `prefers-reduced-motion: reduce`，禁用动画

### 8.2 链接 hover

- 导航链接：颜色从 `#16C79A` 过渡到 `#1ae8b0`
- 文章标题：hover 时亮度提高或添加细微下划线
- 标签 pill：hover 时边框和文字变亮

### 8.3 滚动提示

- Hero 底部向下箭头闪烁动画（1s step-end infinite）

---

## 9. 可访问性

- 所有链接有明确的 focus 状态
- 图片有 alt 文本
- 动画可被 `prefers-reduced-motion` 禁用
- 颜色对比度满足 WCAG AA（红色背景 + 白色文字对比度足够）

---

## 10. 技术实现要点

### 10.1 需要修改的文件

- `src/styles/tokens.css`：新增卡片背景色 `--color-card-bg: #1a1a2e`
- `src/styles/base.css`：全局背景保持 `#0D1117`
- `src/components/Terminal.astro`：保留，标题根据页面动态传入
- `src/components/PostCard.astro`：完全重构为卡片条目样式
- `src/components/Mushroom.astro`：添加 3D 翻转动画支持（通过 props 控制是否动画）
- `src/components/Hero.astro`：新增首页 Hero 组件
- `src/layouts/Base.astro`：首页不显示 header，其他页面显示；主体仍包裹 Terminal
- `src/pages/index.astro`：添加 Hero，改造文章列表为卡片内列表
- `src/pages/posts/[slug].astro`：改造为卡片内文章详情
- `src/pages/tags.astro`：改造为卡片内标签云
- `src/pages/tags/[tag].astro`：改造为卡片内标签筛选结果

### 10.2 新增文件

- `src/components/Hero.astro`
- `src/components/Card.astro`（可选，若复用多则抽离）

### 10.3 移除/废弃

- 现有首页的 `home-intro` 命令行提示（`ls -lt ~/posts/` 等）
- 现有 `PostCard` 中的 `$` 提示符和命令行布局

---

## 11. 验收标准

- [ ] 首页显示 Hero，蘑菇动画正常播放
- [ ] 首页下方 Terminal 内为单卡片，多篇文章正确排列
- [ ] 文章标题为红色底、白色字、inline-block
- [ ] 日期 + 标签在同一行显示为 teal 色
- [ ] 标签为 dark pill 样式
- [ ] 文章详情页、标签页统一使用 Terminal + 卡片结构
- [ ] 移动端布局正常，无错位
- [ ] `prefers-reduced-motion` 下蘑菇动画停止
- [ ] `astro build` 构建成功
