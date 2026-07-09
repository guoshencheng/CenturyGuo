# Portfolio 作品集区块 — Astro Retro Terminal 设计文档

**日期：** 2026-07-09
**状态：** 已确认，待实施
**作用域：** `blog.shemu.top`（Century's World 个人博客）

---

## 1. 概述

为个人博客增加一个**作品集（Portfolio）** 模块：新建 `/portfolio` 页面集中展示所有产品/项目，首页在「关于」与「文章列表」之间插入一个 `~/works` 概览区块（最多展示前 4 个），Hero nav 增加一个 `~/works` 入口。所有改动集中在新增的数据文件、两个新组件、一个新页面，以及两处既有文件的小幅修改。

## 2. 目标

- 给个人产品（DuluuClip、Rem Agent 等）一个固定的展示位，不再依赖外链/口口相传
- 首页首屏一眼能看到代表作，引导读者进入 `/portfolio` 页面
- 数据与渲染解耦，后续新增产品只改 `src/data/portfolio.ts` 一处
- 沿用现有 Astro 5 + 自写 CSS Design System，零新增依赖

## 3. 非目标

- ❌ 把作品抽成 Astro Content Collection（2 项不值得引入 schema 校验）
- ❌ 为每个作品生成单独详情页（首页与 `/portfolio` 已足够）
- ❌ 作品卡片加发布日期、技术栈标签、Star 数等额外字段（YAGNI）
- ❌ 分类过滤 UI（当前只有 product / opensource 两类，且都 ≤2）
- ❌ 单独的 OG 图（继续复用 `og-default.png`）
- ❌ RSS / sitemap 改动（sitemap 自动收录新静态页，RSS 只覆盖 blog 集合）

## 4. 数据模型

**`src/data/portfolio.ts`**

```ts
export const portfolio = [
  {
    name: "DuluuClip",
    slug: "duluuclip",
    description: "运动相机视频 + GPS HUD 叠加工具",
    url: "https://duluuclip.app",
    ctaLabel: "Visit Site",
    type: "product",
  },
  {
    name: "Rem Agent",
    slug: "rem-agent",
    description: "TypeScript Agent-first 通用 Harness",
    url: "https://github.com/guoshencheng/Rem",
    ctaLabel: "View on GitHub",
    type: "opensource",
  },
] as const;

export type PortfolioItem = (typeof portfolio)[number];
```

字段含义：

| 字段 | 类型 | 用途 |
|------|------|------|
| `name` | string | 卡片标题（如 "DuluuClip"） |
| `slug` | string | 未来详情页路由占位；当前仅作 DOM id |
| `description` | string | 一句话描述（≈ 10–20 字） |
| `url` | string | 跳转目标（外部链接） |
| `ctaLabel` | string | 按钮文案（如 "Visit Site"、"View on GitHub"） |
| `type` | "product" \| "opensource" | 预留分类，未来可加标签展示 |

`as const` 让 TypeScript 推断出字面量联合类型，避免后续字段漂移。

## 5. 组件接口

### 5.1 `PortfolioCard.astro`

Props：`{ item: PortfolioItem }`

渲染：

```html
<article class="portfolio-card">
  <h3 class="portfolio-card__title">DuluuClip</h3>
  <p class="portfolio-card__desc">运动相机视频 + GPS HUD 叠加工具</p>
  <a class="portfolio-card__cta" href="…" target="_blank" rel="noopener noreferrer">
    Visit Site →
  </a>
</article>
```

外部链接统一加 `target="_blank" rel="noopener noreferrer"`。

### 5.2 `PortfolioOverview.astro`

Props：`{ limit?: number; showMore?: boolean }`（`limit` 默认 `portfolio.length`，即全部）

内部：`import { portfolio } from "../data/portfolio"` → `.slice(0, limit)` → 渲染网格 + 条件性 more 链接。

```html
<section class="portfolio-overview">
  <header class="portfolio-overview__header">
    <h2 class="portfolio-overview__title">~/works</h2>
    {showMore && <a href="/portfolio" class="portfolio-overview__more">more →</a>}
  </header>
  <div class="portfolio-overview__grid">
    {items.map((item) => <PortfolioCard item={item} />)}
  </div>
</section>
```

## 6. 文件改动清单

### 新增

| 文件 | 用途 |
|------|------|
| `src/data/portfolio.ts` | 作品数据数组 + 类型导出 |
| `src/components/PortfolioCard.astro` | 单个作品卡 |
| `src/components/PortfolioOverview.astro` | 首页 `~/works` 区块 |
| `src/pages/portfolio.astro` | 新页面 `/portfolio` |

### 修改

| 文件 | 改动 |
|------|------|
| `src/pages/index.astro` | 在 about section 之后、`<div class="home-list">` 之前插入 `<PortfolioOverview limit={4} showMore />` |
| `src/components/Hero.astro` | nav 增加 `<a href="/portfolio">~/works</a>` |

## 7. 视觉与样式

**全部使用现有 tokens.css 中的设计令牌，无新色值。**

| 元素 | 样式 |
|------|------|
| 卡片标题 `<h3>` | `background: var(--color-accent); color: var(--color-card-bg)`，与 `PostCard` 标题一致 |
| 描述 `<p>` | `color: var(--color-text-muted); font-size: var(--text-base); line-height: 1.7` |
| CTA `<a>` | `color: var(--color-link); font-family: var(--font-mono)`；hover 用 `--color-link-hover` |
| 区块标题 `~/works` | `font-family: var(--font-mono); color: var(--color-text)`，与 nav 一致 |
| more 链接 | 同上，右上角对齐区块标题 |
| 网格布局 | 桌面 `grid-template-columns: 1fr 1fr`；移动端单列 |
| 卡片间距 | `gap: var(--space-md)` |
| 卡片边框 | `1px solid var(--color-border)`，`border-radius: var(--radius)` |
| Hover | 仅 CTA 链接改色，卡片整体无 transform（避免和现有动效重复） |

**响应式断点：** `@media (max-width: 640px)` 网格退化为单列，与现有 PostCard 一致。

## 8. `/portfolio` 页面结构

```astro
<Base
  terminalTitle="century@blog:~/works"
  seo={{
    title: "作品集 | Duluu's World",
    description: "Duluu Guo 的作品集 — DuluuClip、Rem Agent 等产品与开源项目",
    type: "website",
    person: { ... 与首页一致 ... },
  }}
>
  <Card prompt="> DULUU_GUO:~/works">
    <p class="portfolio-intro">我做过的产品 / 项目，点卡片直达。</p>
    <div class="portfolio-grid">
      {portfolio.map((item) => <PortfolioCard item={item} />)}
    </div>
  </Card>
</Base>
```

- 经 `Base` 布局传 `seo` prop（含 `person`），与 AGENTS.md「红线 4」一致
- `terminalTitle="century@blog:~/works"` 与 nav `~/works` 一致
- 顶部一行说明文字 `portfolio-intro`，font-mono + text-muted 色
- 网格渲染所有 PortfolioCard，无 more 链接

## 9. 首页集成细节

**`src/pages/index.astro`** 改动最小化：

```astro
<Card>
  <section class="about"> ... </section>

  <PortfolioOverview limit={4} showMore />

  <div class="home-list">
    {posts.map((post) => <PostCard post={post} />)}
  </div>
</Card>
```

PortfolioOverview 在视觉上是独立子区块（自己的 h2 + 网格 + more），不与 about / posts 共用样式，互不干扰。

**`src/components/Hero.astro`** nav 改动：

```astro
<nav class="hero__nav">
  <a href="/">~/posts</a>
  <a href="/tags">~/tags</a>
  <a href="/portfolio">~/works</a>
  <a href="/rss.xml">~/rss</a>
</nav>
```

`~/works` 放在 `~/tags` 与 `~/rss` 之间，按「内容 > 关于 > 订阅」语义排序。

## 10. SEO 与可访问性

- `/portfolio` 加 `seo.type: "website"`，title 与 description 已在上节给出
- sitemap 自动收录新静态页（`@astrojs/sitemap` 已集成）
- 外部链接统一 `rel="noopener noreferrer"`，避免 `window.opener` 安全风险
- 区块标题用真实 `<h2>`/`<h3>`，保持现有 heading 层级（页面 h1 在 Hero）
- 网格容器使用 `<ul>` 列表语义，卡片本身用 `<li>` 包裹（不需要额外 `role="list"`）

## 11. 验证清单

- [ ] `npm run build` 通过，无 TS 报错
- [ ] 首页 Hero nav 出现 `~/works` 链接，点击跳到 `/portfolio`
- [ ] 首页 `~/works` 区块显示 2 张作品卡（当前数据量），头部右上 more → 跳 `/portfolio`
- [ ] `/portfolio` 页面渲染 2 张作品卡 + 顶部说明，无 more 链接
- [ ] 桌面端（>640px）作品卡两列布局；移动端单列
- [ ] CTA 链接打开新标签（验证 `target="_blank"`）
- [ ] `/portfolio` 的 `<title>` 与 `<meta name="description">` 正确
- [ ] sitemap（`dist/sitemap-index.xml`）含 `/portfolio`

## 12. 后续扩展占位（非本次范围）

- 新增 `slug` 详情页（`/portfolio/[slug].astro`）
- 引入 Content Collection + frontmatter 自动生成详情
- 加 `tags` 字段并在 `/portfolio` 顶部做类型筛选
- OG 图按作品区分（`og-portfolio-<slug>.png`）