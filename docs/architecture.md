# 架构

> 面向接手这个项目的开发者（人类或 AI）。讲「系统怎么运转」，不讲历史。

## 1. 总览

一个纯 SSG 个人博客。`npm run build` 把 `src/` + `src/content/blog/*.md` 编译成静态 `dist/`，再由 GitHub Actions 发到 GitHub Pages，绑定自定义域 `blog.shemu.top`。

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────────┐
│  src/content/   │      │  Astro build     │      │  GitHub Pages       │
│  blog/*.md      │ ───> │  (npm run build) │ ───> │  blog.shemu.top     │
│  (markdown)     │      │  → dist/         │      │  (CNAME 绑定)       │
└─────────────────┘      └──────────────────┘      └─────────────────────┘
        │                        │
        │                        ├── public/  原样复制（含 CNAME / robots.txt / og-default.png）
        │                        └── scripts/  不参与 build（仅 wechat-sync 离线工具）
```

## 2. 技术栈

| 层 | 选型 | 备注 |
|----|------|------|
| 静态站点 | Astro 5 | SSG 模式，`output: 'static'`（默认） |
| 类型 | TypeScript strict (`astro/tsconfigs/strictest`) | 无 tsx/vitest |
| 样式 | 自写 CSS Design System | 无 Tailwind / CSS-in-JS / UI 框架 |
| Markdown | Astro Content Collections + Shiki | `github-dark` 代码高亮 |
| SEO | 自实现 `src/utils/seo.ts` + `src/components/SeoHead.astro` | OG / Twitter Card / JSON-LD |
| 图片懒加载 | 自写 rehype 插件 `src/utils/rehype-img-lazy.ts` | 在 `astro.config.ts` 注册 |
| RSS | `@astrojs/rss` | `/rss.xml` |
| Sitemap | `@astrojs/sitemap` | `/sitemap-index.xml` |
| 统计 | Umami（自建 `https://umami.shemu.top`） | 仅生产环境（`import.meta.env.PROD`）注入 |
| 部署 | GitHub Actions | `.github/workflows/deploy.yml` |
| 测试 | Node 22+ 原生 `node --test` | 仅 `src/utils/*.test.ts` |

## 3. 目录结构

```
.
├── astro.config.ts              # site URL + shiki + rehype 插件
├── package.json                 # 依赖与 scripts
├── tsconfig.json                # extends astro/tsconfigs/strictest
├── .github/workflows/deploy.yml # GitHub Pages 自动部署
├── public/                      # 构建时原样复制到 dist/
│   ├── CNAME                    # blog.shemu.top（删掉则自定义域失效）
│   ├── robots.txt               # 指向 sitemap-index.xml
│   ├── og-default.png           # 兜底 OG 图（1200×630）
│   └── images/blog/<slug>/      # 文章封面图
├── scripts/
│   └── wechat-sync.ts           # 公众号转换工具（不参与 build）
├── src/
│   ├── components/
│   │   ├── Card.astro           # Terminal 内的深色卡片容器
│   │   ├── Hero.astro           # 首页 70vh Hero（动画蘑菇 + 导航 + 滚动提示）
│   │   ├── Mushroom.astro       # 像素风蘑菇 SVG logo
│   │   ├── PostCard.astro       # 文章卡片条目（列表/标签页复用）
│   │   ├── SeoHead.astro        # 集中渲染 <head> 内所有 meta
│   │   └── Terminal.astro       # macOS 风窗口容器（红黄绿圆点 + title bar）
│   ├── content/
│   │   ├── blog/*.md            # 已发布文章（27 篇）
│   │   ├── drafts/*.md          # 未发布草稿
│   │   └── config.ts            # Content Collection schema（zod）
│   ├── layouts/Base.astro       # 唯一 HTML 外壳
│   ├── pages/
│   │   ├── index.astro          # /
│   │   ├── posts/[slug].astro   # /posts/<slug>
│   │   ├── tags.astro           # /tags
│   │   ├── tags/[tag].astro     # /tags/<tag>
│   │   ├── rss.xml.ts           # /rss.xml（动态生成）
│   │   └── llms.txt.ts          # /llms.txt（LLM 友好的站点摘要，Jeremy Howard 协议）
│   ├── styles/
│   │   ├── tokens.css           # 设计 token（颜色 / 字体 / 间距 / 圆角）
│   │   ├── base.css             # 全局 reset + a11y（focus-visible / skip-link / img 兜底）
│   │   └── markdown.css         # 文章正文排版
│   └── utils/
│       ├── formatDate.ts        # Date → "YYYY-MM-DD"
│       ├── seo.ts               # 纯函数：URL / 图片提取 / OG / JSON-LD
│       ├── seo.test.ts          # 单元测试（14 用例）
│       └── rehype-img-lazy.ts   # rehype 插件：补 loading/decoding/alt
└── docs/
    ├── architecture.md          # 本文件
    ├── custom-domain-setup.md   # blog.shemu.top 绑定教程
    └── superpowers/
        ├── specs/               # 已完成 feature 的设计 spec
        └── plans/               # 已完成 feature 的实施计划（含 commit 步骤）
```

## 4. 路由与页面

| 路径 | 文件 | 类型 | SEO `type` |
|------|------|------|------------|
| `/` | `src/pages/index.astro` | website | `website` |
| `/posts/<slug>` | `src/pages/posts/[slug].astro` | article | `article`（含 JSON-LD `BlogPosting`） |
| `/tags` | `src/pages/tags.astro` | website | `website` |
| `/tags/<tag>` | `src/pages/tags/[tag].astro` | website | `website` |
| `/rss.xml` | `src/pages/rss.xml.ts` | — | — |
| `/sitemap-index.xml` | `@astrojs/sitemap` 自动生成 | — | — |
| `/llms.txt` | `src/pages/llms.txt.ts` | — | — |
| `/robots.txt` | `public/robots.txt` 静态复制 | — | — |

所有页面**必须**经 `<Base seo={...}>` 布局。`Base.astro` 是唯一 HTML 外壳——`<head>`、`<body>`、Umami 脚本、a11y 跳过链接、导航、Terminal 容器全部在这里。**不要绕开它。**

## 5. Content Collection Schema

```typescript
// src/content/config.ts
const blogCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    description: z.string(),   // ← 必填，缺了直接构建失败
    faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
  }),
});
```

`description` 字段驱动：
- `PostCard` 卡片副标题
- 文章列表摘要
- `<meta name="description">` / `og:description` / `twitter:description`
- RSS item `<description>`
- 文章详情页 article-desc

`faq` 字段（可选）：文章页 frontmatter 里加 `faq: [{ q, a }, ...]`，会自动注入 `FAQPage` JSON-LD，提升 AI 答案引用率（GEO 优化点）。

## 6. SEO 流水线

```
页面（index.astro / posts/[slug].astro / …）
  │
  │  seo={{ title, description, type, publishedTime, tags, image,
  │         body, faqs, person }}
  ▼
Base.astro 接收 seo prop
  │
  │  <SeoHead {...seo} />
  ▼
SeoHead.astro 渲染：
  ├─ <title>、<meta name="description">、<meta name="robots">、<link rel="canonical">
  ├─ og:* (title / description / type / url / site_name / locale / image[+w+h+alt])
  ├─ twitter:* (card / title / description / image / image:alt)
  ├─ article:* (published_time / modified_time / author / tag) ← 仅 type==="article"
  ├─ <link rel="sitemap" href="/sitemap-index.xml">
  └─ <script type="application/ld+json">
        ├─ BlogPosting（文章页）/ WebSite（首页、标签页）
        ├─ Person（可选：跨平台身份聚合，sameAs 数组）← 文章页与首页都传
        └─ FAQPage（可选：frontmatter faq 字段非空时）← 仅文章页
```

OG 图片优先级：`seo.image` → 首张 `![](path)`（通过 `extractFirstImage(post.body)`）→ `public/og-default.png` 兜底。

JSON-LD 由 `src/utils/seo.ts` 里的纯函数生成：
- `buildBlogPostingJsonLd({...})` — 文章页，含 `inLanguage: 'zh-CN'` 和 `articleBody`（从 markdown 提取前 280 字符纯文本）
- `buildWebSiteJsonLd({...})` — 首页与标签页
- `buildPersonJsonLd({...})` — 跨平台身份，可传 `sameAs: [GitHub, ...]`、`knowsAbout: [...]`、`jobTitle`
- `buildFaqJsonLd([{q, a}, ...])` — 文章页 FAQ，frontmatter 有 `faq` 字段才注入

`/llms.txt`（LLM 友好的站点摘要）由 `src/pages/llms.txt.ts` 动态生成，遵循 [Jeremy Howard llms.txt 规范](https://llmstxt.org/)：H1 + blockquote 简介 + `## Posts` 列出全部文章（带 140 字摘要）+ `## Tags` + `## Optional`（RSS / sitemap 链接）。Perplexity、Answer.AI 等已部分支持。

RSS 在 `src/pages/rss.xml.ts` 增强：每个 item 带 `<author>`，channel 带 `<managingEditor>` 和 `<webMaster>`。

图片懒加载：`src/utils/rehype-img-lazy.ts` 在 `astro.config.ts` 注册，自动给 markdown 渲染出的 `<img>` 补 `loading="lazy"` 和 `decoding="async"`，缺 `alt` 时 build 时 warn。

## 7. 部署

```
push to master
    │
    ▼
.github/workflows/deploy.yml 触发
    │
    ├─ npm ci
    ├─ npm run build
    └─ actions/upload-pages-artifact@v3 (./dist)
            │
            ▼
       actions/deploy-pages@v4 → GitHub Pages
            │
            ▼
       GitHub 读 public/CNAME → blog.shemu.top
       DNS: blog.shemu.top CNAME → guoshencheng.github.io
            │
            ▼
       用户访问 https://blog.shemu.top
```

DNS / HTTPS / 常见坑见 `docs/custom-domain-setup.md`。

## 8. 跨切关注点

### 8.1 公众号同步（scripts/wechat-sync.ts）

不在 build 流水线内，离线工具：

```bash
npm run wechat <file>     # 单篇 markdown → 公众号 HTML
npm run wechat:all        # 批量 src/content/blog/*.md
npm run wechat:open       # macOS 打开 scripts/output/
```

输出到 `scripts/output/`（已 gitignore）。生成的 HTML 内嵌「复制全文」按钮——浏览器打开后一键复制粘贴到公众号编辑器。图片需要先手动传到公众号素材库再替换 `<img src>`。

### 8.2 配图生成（.claude/skills/blog-illustration/SKILL.md）

写文章时如需 AI 配图，触发 `blog-illustration` skill。约定：
- 风格：彩色手绘（watercolor + crayon + 可见纸张纹理）
- 存放：`public/images/blog/<slug>/01.webp`（PNG → WebP）
- Markdown 引用：`![描述](/images/blog/<slug>/01.webp)`
- 首张会自动成为文章 OG 图（见 §6）

### 8.3 草稿

未发布文章放 `src/content/drafts/`——不参与路由生成，不出现在 sitemap/RSS 中。如要发布，移到 `src/content/blog/`。