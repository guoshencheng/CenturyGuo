# Blog Refactor — Astro Retro Terminal 设计文档

**日期：** 2026-06-16
**状态：** 已确认

---

## 1. 概述

将现有 Gatsby v2 博客重构为 Astro 驱动的静态站点，采用 Retro Terminal 视觉风格。旧文章全部移除，新站从零开始。同步提供微信公众号格式生成脚本。

## 2. 目标

- 用 Astro SSG 重建博客，输出零 JS 纯静态 HTML
- Retro Terminal 视觉风格：暗色终端美学、等宽字体、霓虹色点缀
- 保留蘑菇 Logo，配色更新为 Synthwave Neon (#E94560)
- 纯中文内容，最小页面结构：首页 + 文章详情 + 标签筛选 + RSS
- 提供脚本将 markdown 转为公众号兼容 HTML（手动粘贴发布，预留 API 扩展）

## 3. 技术选型

| 层面 | 选择 | 理由 |
|------|------|------|
| 框架 | Astro (最新稳定版) | 专为内容站点设计，默认 SSG，零 JS 输出 |
| 样式 | 手写 CSS Design System | Retro Terminal 高度定制化，工具类范式不适合 |
| 内容管理 | Astro Content Collections | 类型安全，自动 slug 生成，原生 markdown 支持 |
| 代码高亮 | Shiki (Astro 内置) | 服务端渲染，无运行时开销，GitHub Dark 主题 |
| 部署 | GitHub Pages / Vercel | 保持现有 guoshencheng.com 域名 |
| 公众号脚本 | TypeScript 独立脚本 | 输入 markdown，输出公众号兼容 HTML |

## 4. 项目结构

```
CenturyGuo/
├── astro.config.ts
├── package.json
├── tsconfig.json
├── src/
│   ├── content/
│   │   └── blog/            # 文章 markdown（Content Collections）
│   ├── pages/
│   │   ├── index.astro      # 首页 — 文章列表
│   │   ├── tags/[tag].astro # 标签筛选页
│   │   ├── posts/[slug].astro # 文章详情页
│   │   └── rss.xml.ts       # RSS 生成
│   ├── layouts/
│   │   └── Base.astro       # 全局布局（Terminal 外壳）
│   ├── components/
│   │   ├── Terminal.astro   # Terminal 窗口容器
│   │   ├── Mushroom.astro   # 蘑菇 SVG（Neon 配色）
│   │   ├── PostCard.astro   # 文章列表卡片
│   │   ├── TagCloud.astro   # 标签云
│   │   ├── SiteNav.astro    # 站点导航
│   │   └── CodeBlock.astro  # 代码块
│   ├── styles/
│   │   ├── tokens.css       # 设计 Token
│   │   ├── base.css         # 基础重置 + 全局排版
│   │   └── markdown.css     # 文章内容样式
│   └── utils/
│       └── formatDate.ts    # 日期格式化
├── scripts/
│   ├── wechat-sync.ts       # markdown → 公众号 HTML
│   └── output/              # 转换输出目录
└── public/
    └── fonts/               # 等宽字体文件
```

## 5. 路由设计

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | 首页 | 最新 10 篇文章列表，顶部蘑菇 + 导航 |
| `/posts/[slug]` | 文章详情 | slug 由文件名自动生成 |
| `/tags/[tag]` | 标签筛选 | 按标签过滤文章列表 |
| `/rss.xml` | RSS | 标准 RSS 2.0 |

## 6. 文章 Frontmatter Schema

```yaml
---
title: "文章标题"
date: "YYYY-MM-DD"
tags: [标签1, 标签2]
description: "文章摘要，用于列表展示和 SEO"
---
```

## 7. 视觉设计系统

### 7.1 配色

| 用途 | 色值 | 说明 |
|------|------|------|
| 背景 | `#0D1117` | 主背景色（GitHub Dark） |
| 卡片/代码块背景 | `#161B22` | 次级容器背景 |
| 强调色 | `#E94560` | 蘑菇、重点标记、链接 hover |
| 链接/代码高亮 | `#16C79A` | 链接文字、代码关键字 |
| 主文字 | `#C9D1D9` | 正文颜色 |
| 辅助文字 | `#8B949E` | 日期、标签、meta 信息 |
| 边框 | `#30363D` | 分割线、边框 |

### 7.2 字体

- **中文正文**：系统默认等宽 → Maple Mono NF（可选 webfont）
- **英文/代码**：JetBrains Mono / Fira Code（系统字体优先）
- **字号**：正文 15px，标题 28/20/16px，辅助文字 12px
- **行高**：正文 1.8（适配中文阅读）

### 7.3 Terminal 窗口组件

核心视觉特征：暗色容器 + 标题栏（红黄绿三色圆点）+ 终端命令行风格导航。所有页面内容包裹在 Terminal 窗口中。

### 7.4 蘑菇 Logo

复用现有 8×8 像素网格 SVG 蘑菇，配色更新为：
- 深色块：`rgba(233, 69, 96, 0.8)` (#E94560)
- 浅色块：`rgba(233, 69, 96, 0.65)`

### 7.5 代码块

基于 GitHub Dark 配色，Shiki 服务端渲染高亮。代码块带标题栏（文件名 + 语言标签），等宽字体显示。

### 7.6 设计原则

1. **零 JS 输出**：纯静态 HTML+CSS，首屏极快
2. **中文优先**：字体、行高、排版按中文阅读体验优化
3. **Terminal 沉浸**：窗口容器、命令行语言、等宽字体统一终端体验
4. **最小功能**：不增加非必要功能（评论、搜索、暗色切换等）

## 8. 微信公众号同步脚本

### 8.1 使用方式

```bash
pnpm wechat posts/2024-06-16-article-slug.md
# 输出 → scripts/output/article-slug.html
```

### 8.2 转换规则

| Markdown 元素 | 公众号 HTML 处理 |
|---------------|-----------------|
| `# 标题` | `<h2>`（微信不支持 h1，从 h2 开始） |
| `## / ###` | `<h3> / <h4>` |
| 段落 | `<p style="line-height:2;margin:1em 0;">` |
| **加粗** | `<strong>` |
| 代码块 ` ``` ` | 带背景色 `<pre>`，可选行号 |
| 行内代码 | `<code style="background:#f0f0f0;">` |
| 图片 | `<!-- TODO: 替换图片 src -->` 占位注释 |
| 链接 | 保留 `<a>`，底部追加"阅读原文"链接回博客 |
| 列表 | `<ul>/<ol>` 保持，微调间距 |
| 引用 `>` | `<blockquote>` + 左侧色条 |

### 8.3 扩展预留

转换核心逻辑独立导出，后续可对接微信公众平台素材管理 API，实现自动上传草稿功能。

## 9. 迁移计划

### 9.1 保留内容

- 蘑菇 SVG 组件（配色更新）
- 域名 `guoshencheng.com`（CNAME 记录）
- 站点元信息（标题、作者、描述）

### 9.2 移除内容

- 所有旧 markdown 文章（`docs/` 目录）
- Gatsby 相关文件（`gatsby-*.js`, `gatsby-config.js`, `gatsby-node.js`）
- React 组件（`src/components/*`, `src/pages/*`, `src/templates/*`）
- Less 样式文件（`src/*.less`）
- 旧文章中的 Disqus 评论集成
- Google Analytics（旧版 UA 已废弃）

### 9.3 清理后项目状态

- 全新 Astro 项目根目录
- `.gitignore` 中加入 `.superpowers/`
- 保留 `.git` 历史，不重建仓库

## 10. 测试策略

| 范围 | 方式 | 说明 |
|------|------|------|
| 静态构建 | `astro build` 无报错 | CI 必须通过 |
| 页面访问 | 本地 `astro preview` 逐页检查 | 首页、文章页、标签页、RSS |
| 响应式 | 浏览器 DevTools 移动端模拟 | 确保手机阅读体验 |
| 公众号输出 | 脚本转换后粘贴到微信预览 | 检查排版、代码块、链接 |
| Lighthouse | 性能/可访问性/SEO 评分 | 目标 90+ |
| HTML 验证 | W3C Validator | 无严重错误 |
