# Blog SEO 增强 — Astro Retro Terminal 设计文档

**日期：** 2026-06-24
**状态：** 已确认，待实施
**作用域：** `blog.shemu.top`（Century's World 个人博客）

---

## 1. 概述

在已有 Astro 5 博客基础上做**深度 SEO 增强**：补齐 Open Graph / Twitter Card / canonical / JSON-LD 结构化数据 / robots.txt / RSS 增强 / 图片懒加载 / 基础可访问性。所有改动集中在新增的 `<SeoHead>` 组件与 `utils/seo.ts` 工具模块，避免污染现有 layout 与页面逻辑。

## 2. 目标

- 社交分享卡片：文章分享到微信/微博/Twitter/X/LinkedIn 显示带标题、描述、封面图的卡片
- 搜索引擎可见性：百度/Bing/Google 抓取到完整 meta + JSON-LD，触发富媒体片段（Rich Snippets）
- 标准化：标准 `robots.txt`、sitemap 自动包含所有静态页、RSS 含 author
- 性能：文章页图片懒加载 + decoding async，减少首屏 CLS
- 可访问性：键盘用户可跳过导航、焦点可见、语义化 landmark

## 3. 非目标

- ❌ 自定义 OG 图动态生成（satori/og-image 等）
- ❌ Web Vitals 深度优化（Critical CSS、字体子集化、preconnect CDN）
- ❌ 第三方 SEO 包（astro-seo 等）
- ❌ 修改文章 frontmatter schema（保持现状：`title / date / tags / description`）
- ❌ RSS `content:encoded` 全文输出（保持轻量 feed）
- ❌ 多语言 hreflang（站点暂为单语言 zh-CN）
- ❌ AMP / Instant Articles

## 4. 技术选型

| 层面 | 选择 | 理由 |
|------|------|------|
| Meta 渲染 | 自写 `<SeoHead>` 组件 | 集中可控，零新依赖 |
| OG/JSON-LD 构建 | 自写 `utils/seo.ts` | 纯标准库，可单测 |
| 图片懒加载 | 自写 rehype 插件 | 20 行可控；不用 npm 插件（如 `rehype-img-lazy` 等久未维护） |
| Sitemap | 现有 `@astrojs/sitemap` | 已集成，零改动 |
| RSS | 现有 `@astrojs/rss` | 已集成，仅加 author |
| robots.txt | 静态文件放 `public/` | Astro 构建时复制到 `dist/` |

## 5. 文件改动清单

### 新增

| 文件 | 用途 |
|------|------|
| `src/components/SeoHead.astro` | 集中渲染所有 `<head>` 内 SEO meta 标签 |
| `src/utils/seo.ts` | 构建 OG/Twitter/canonical/JSON-LD 字符串的工具函数 |
| `src/utils/rehype-img-lazy.ts` | rehype 插件：给 markdown 图片加 `loading="lazy"` `decoding="async"` |
| `public/robots.txt` | 基础 robots：允许所有爬虫 + 指向 sitemap |
| `public/og-default.png` | 站点默认 OG 占位图（1200×630） |

### 修改

| 文件 | 改动 |
|------|------|
| `src/layouts/Base.astro` | props 接收 `seo` 对象；接入 `<SeoHead>`；加跳过链接、`tabindex`、`<nav aria-label>` |
| `src/styles/base.css` | 加 `:focus-visible` 样式、`.skip-link` 样式、`img { max-width: 100%; height: auto; }` 兜底 |
| `src/pages/posts/[slug].astro` | 传递 `seo` props（封面图、发布时间、tags） |
| `src/pages/index.astro` | 传递 `seo` props（website 类型） |
| `src/pages/tags.astro` | 传递 `seo` props |
| `src/pages/tags/[tag].astro` | 传递 `seo` props |
| `src/pages/rss.xml.ts` | RSS item 加 `author` 字段；customData 加 managingEditor/webMaster |
| `astro.config.ts` | `markdown.rehypePlugins` 加入自写插件 |
| `src/content/config.ts` | 无改动（schema 已有 description 强制非空） |

## 6. 组件设计 — `SeoHead.astro`

### Props

```ts
interface Props {
  // 必需
  title: string;
  description: string;

  // 类型
  type?: "website" | "article";       // 默认 "website"

  // 文章专用
  publishedTime?: Date;
  modifiedTime?: Date;
  author?: string;                     // 默认 "Guo Shencheng"
  tags?: string[];

  // 图片
  image?: string;                      // 绝对 URL 或 public 内路径
  imageAlt?: string;                   // og:image:alt

  // 高级
  noindex?: boolean;                   // 默认 false
}
```

### 渲染内容（按顺序）

1. `<title>{title} — Century's World</title>`
2. `<meta name="description" content={description}>`
3. `<meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow, max-snippet:-1, max-image-preview:large"}>`
4. `<link rel="canonical" href={Astro.url.href}>`
5. Open Graph：`og:title` / `og:description` / `og:type` / `og:url` / `og:site_name` / `og:image` / `og:image:width=1200` / `og:image:height=630` / `og:image:alt` / `og:locale=zh_CN`
6. Twitter Card：`twitter:card=summary_large_image` / `twitter:title` / `twitter:description` / `twitter:image`
7. 文章专用：`article:published_time` / `article:modified_time` / `article:author` / `article:tag`（多个）
8. `<link rel="sitemap" href="/sitemap-index.xml">`
9. JSON-LD `<script type="application/ld+json">`：
   - `type="article"` → BlogPosting
   - `type="website"` → WebSite + Person（仅首页）

### 行为约束

- 不渲染 Umami、字体、CSS（仍是 Base.astro 职责）
- 不接收 class/style，纯 head 渲染器
- 输出紧凑格式（无多余空白），减少 HTML 体积

## 7. 工具模块 — `utils/seo.ts`

### 导出函数

```ts
// URL 工具
export function absoluteUrl(path: string, site: URL): string
// "/og-default.png" → "https://blog.shemu.top/og-default.png"
// 已是绝对 URL → 原样返回
// 非法路径 → throw TypeError

// 从 markdown 提取第一张图片
export function extractFirstImage(markdownBody: string): string | undefined
// 仅扫 ![alt](path) 语法，忽略 HTML 内嵌 <img>
// 无图 → undefined

// OG image 构建（含 fallback）
export function buildOgImage(props: { image?: string; site: URL }): {
  url: string;
  width: 1200;
  height: 630;
  alt: string;
}
// image 为空 → fallback 到 absoluteUrl("/og-default.png", site)

// JSON-LD 构建
export function buildBlogPostingJsonLd(input: {
  title: string;
  description: string;
  url: string;
  publishedTime?: Date;
  modifiedTime?: Date;
  author: string;
  tags: string[];
  imageUrl?: string;
}): string  // JSON 字符串，已 escape，可直接 inline

export function buildWebSiteJsonLd(input: {
  siteName: string;
  description: string;
  siteUrl: string;
  authorName: string;
  authorUrl?: string;
}): string

// 描述截断
export function truncateDescription(text: string, max?: number): string
// 默认 max=155，在句号/空格边界截，附加 "..."
```

### 关键行为

- `extractFirstImage` 用正则 `/!\[.*?\]\(([^)]+)\)/` 扫第一处匹配
- 所有日期输出 ISO 8601：`Date.prototype.toISOString()`
- JSON-LD 用 `JSON.stringify` 包裹，无二次转义
- 无任何 npm 依赖

### 错误处理

| 场景 | 处理 |
|------|------|
| `extractFirstImage` 无图 | 返回 `undefined`，不抛错 |
| `absoluteUrl` 非法路径 | throw `TypeError`（程序员错误，build 期捕获） |
| `buildBlogPostingJsonLd` 缺 title/url | throw `Error`（必需字段） |
| `buildWebSiteJsonLd` 缺 siteName/siteUrl | throw `Error`（必需字段） |

## 8. 数据流 — 各页面组装

| 页面 | `seo` props 内容 |
|------|-----------------|
| `index.astro` | `title="Posts"`, `description="guoshencheng's personal blog — Retro Terminal style"`, `type="website"` |
| `posts/[slug].astro` | `title={post.data.title}`, `description={post.data.description}`, `type="article"`, `publishedTime={post.data.date}`, `tags={post.data.tags}`, `image={extractFirstImage(post.body)}` |
| `tags.astro` | `title="Tags"`, `description="所有文章标签"`, `type="website"` |
| `tags/[tag].astro` | `title={\`#${tag}\`}`, `description={\`标签 ${tag} 下的所有文章\`}`, `type="website"` |

`<SeoHead>` 内部用 `Astro.site` 自取 site URL，页面 props 不传 site URL。

## 9. JSON-LD 内容模板

### BlogPosting（文章页）

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "<title>",
  "description": "<description>",
  "datePublished": "<ISO 8601>",
  "dateModified": "<ISO 8601 or datePublished>",
  "author": { "@type": "Person", "name": "Guo Shencheng", "url": "https://blog.shemu.top" },
  "publisher": { "@type": "Person", "name": "Guo Shencheng", "url": "https://blog.shemu.top" },
  "mainEntityOfPage": { "@type": "WebPage", "@id": "<canonical url>" },
  "keywords": "<tags joined by comma>",
  "image": "<absolute image url or og-default>"
}
```

### WebSite（首页）

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Century's World",
  "description": "<description>",
  "url": "https://blog.shemu.top",
  "inLanguage": "zh-CN",
  "author": { "@type": "Person", "name": "Guo Shencheng", "url": "https://blog.shemu.top" }
}
```

## 10. RSS 增强

`src/pages/rss.xml.ts` 改动：

```ts
// item 新增
items: posts.map((post) => ({
  title: post.data.title,
  description: post.data.description,
  pubDate: post.data.date,
  link: `/posts/${post.slug}`,
  author: "guoshencheng@shemu.top (Guo Shencheng)",
})),

// customData 增加
customData: `
  <language>zh-CN</language>
  <managingEditor>guoshencheng@shemu.top (Guo Shencheng)</managingEditor>
  <webMaster>guoshencheng@shemu.top (Guo Shencheng)</webMaster>
`,
```

其它保持现状（标准 RSS 模式，不输出 content:encoded）。

## 11. robots.txt

文件路径：`public/robots.txt`

```
User-agent: *
Allow: /

Sitemap: https://blog.shemu.top/sitemap-index.xml
```

Astro 构建时自动复制到 `dist/robots.txt`，无需路由配置。

## 12. 默认 OG 图

`public/og-default.png`（1200×630）：

- 风格与博客 Retro Terminal 保持一致（暗色背景 + 等宽字体 + 霓虹色点缀）
- 内容元素：
  - 蘑菇 Logo（站点已有 SVG）
  - 主标题 "Century's World"
  - 副标题 "guoshencheng's personal blog"
- **生成方式**：实施阶段使用任何可用工具（screenshot、figma、ImageMagick）合成一次性 PNG，文件大小控制在 200KB 以内。如实施时无现成图，使用博客已有 Mushroom 组件 + 终端文字生成临时占位 PNG，明确标注为"v1 占位，可后续替换"。
- 提交后用户可自行替换为更高质量版本

## 13. 图片优化与懒加载

### 自写 rehype 插件

`src/utils/rehype-img-lazy.ts`：

- 遍历 markdown 渲染后的 HAST 树
- 对所有 `<img>` 元素：
  - 若无 `loading` 属性 → 添加 `loading="lazy"`
  - 若无 `decoding` 属性 → 添加 `decoding="async"`
  - 若无 `alt` 属性 → 打印 build warning（不阻断）
- 用 try/catch 包裹单个图片处理，单张失败不阻断 build

### 注册插件

`astro.config.ts` 改动（**用 import 方式注册**，避免路径解析问题）：

```ts
import { rehypeImgLazy } from "./src/utils/rehype-img-lazy";

export default defineConfig({
  site: "https://blog.shemu.top",
  integrations: [sitemap()],
  markdown: {
    shikiConfig: { theme: "github-dark" },
    rehypePlugins: [rehypeImgLazy],
  },
});
```

插件 `src/utils/rehype-img-lazy.ts` 命名导出 `rehypeImgLazy`（标准 unified 插件签名 `(tree: Root) => void`）。

### 防 CLS（Cumulative Layout Shift）

- rehype 插件**不**自动探测图片尺寸（无 build 期图像处理）
- 兜底策略：CSS 给 `img` 加 `max-width: 100%; height: auto;`，避免横向溢出；纵向跳动不可避免但不会破坏布局
- 长期方案：可后续在图片生成环节（blog-illustration skill）写入尺寸元数据，但**不在本 spec 范围**

## 14. 可访问性

### 跳过链接

`Base.astro` `<body>` 内首位：

```astro
<a href="#main-content" class="skip-link">跳到主要内容</a>
<main id="main-content" tabindex="-1">
```

CSS：

```css
.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  background: var(--color-accent);
  color: var(--color-card-bg);
  padding: 8px 16px;
  font-family: var(--font-mono);
  z-index: 100;
}
.skip-link:focus {
  left: 0;
}
```

### 焦点可见

`base.css` 新增：

```css
:focus-visible {
  outline: 2px solid var(--color-link);
  outline-offset: 2px;
}
```

### ARIA landmarks

`<nav>` 加 `aria-label="主导航"`。

### 已有语义化

- `<html lang="zh-CN">` ✓
- `<article>`、`<header>`、`<nav>`、`<main>` ✓

## 15. 测试策略

项目**无现成测试框架**（package.json 无 vitest/jest），本 spec 采用**手动验证清单**：

### 构建期

- `npm run build` 无错误、无 TypeScript 报错
- 检查 `dist/posts/<slug>/index.html` 含 `<script type="application/ld+json">` 且 JSON 合法

### 运行时（dev）

1. 启动 `npm run dev`，访问四类页面：首页 / 一篇含图文章 / 一篇无图文章 / 标签页
2. DevTools → Elements 检查 `<head>` 含全部预期 meta
3. View Page Source 确认 JSON-LD 是合法 JSON
4. 复制文章 URL 到 https://validator.schema.org 校验 BlogPosting
5. 复制文章 URL 到 https://search.google.com/test/rich-results 校验
6. 复制文章 URL 到 https://developers.facebook.com/tools/debug/ 检查 OG 渲染
7. 复制文章 URL 到 https://cards-dev.twitter.com/validator 检查 Twitter Card

### 性能

- Chrome DevTools → Lighthouse → SEO 分类评分 ≥ 95
- Chrome DevTools → Performance → 检查图片加载行为（首屏图是否 eager、其他图是否 lazy）

### 类型安全

- 所有 Props 用 TypeScript interface 约束
- `utils/seo.ts` 缺必需字段时 build 失败（assert）

### 验收清单（实施完成后勾选）

- [ ] 四类页面 OG/Twitter/canonical/JSON-LD 全部正确
- [ ] sitemap-index.xml 含所有静态页（首页/文章/tags）
- [ ] robots.txt 部署后可访问
- [ ] RSS author 字段正确
- [ ] og-default.png 可被 FB/Twitter 抓取
- [ ] Lighthouse SEO ≥ 95
- [ ] Schema.org validator 通过
- [ ] 键盘 Tab 可触发跳过链接
- [ ] 焦点可见 outline 显示正常

## 16. 实施顺序

1. 写 `utils/seo.ts`（纯函数，独立可测）
2. 写 `utils/rehype-img-lazy.ts`（纯函数）
3. 在 `astro.config.ts` 注册 rehype 插件
4. 写 `components/SeoHead.astro`
5. 改 `layouts/Base.astro` 接入 SeoHead + a11y 改动
6. 改 `styles/base.css` 加 `:focus-visible` 和 `.skip-link`
7. 改四个页面文件传递 `seo` props
8. 改 `pages/rss.xml.ts` 加 author
9. 创建 `public/robots.txt`
10. 创建 `public/og-default.png`（占位图）
11. `npm run build` 验证无报错
12. 按验收清单逐项手动验证

## 17. 风险与回滚

| 风险 | 缓解 |
|------|------|
| JSON-LD 字段名错误导致搜索引擎不识别 | 实施后立即用 validator.schema.org 验证 |
| OG 图尺寸不达标（FB 要求 1200x630）| 明确规格在 spec 中，验证步骤覆盖 |
| rehype 插件影响其他 markdown 渲染 | 仅对 `<img>` 元素操作，影响面小 |
| 现有 sitemap 行为被破坏 | `@astrojs/sitemap` 配置无改动 |
| 错过某一类页面导致 meta 缺失 | 验收清单强制覆盖 4 类页面 |

回滚策略：所有改动在 git 中可独立 revert。优先 commit 一组 SEO 改动，再 commit a11y 改动，便于按需回退。