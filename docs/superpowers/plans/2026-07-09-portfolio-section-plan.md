# Portfolio 作品集区块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Century's World 博客新增 `/portfolio` 作品集页面 + 首页 `~/works` 概览区块，集中展示个人产品（DuluuClip、Rem Agent 等），全部沿用现有 Astro 5 + 自写 CSS Design System。

**Architecture:** 数据驱动：`src/data/portfolio.ts` 持有作品数组；`PortfolioCard.astro` 渲染单个作品卡；`PortfolioOverview.astro` 在首页以两列网格 + more 链接展示前 N 项；`/portfolio` 页面复用 PortfolioCard 渲染全部作品。零新增 npm 依赖。

**Tech Stack:** Astro 5 (SSG), TypeScript strict, 自写 CSS（tokens.css 设计令牌）, 现有 `Base.astro` 布局, 现有 `@astrojs/sitemap`.

**Spec:** `docs/superpowers/specs/2026-07-09-portfolio-section-design.md`

---

## File Structure

**Create:**
- `src/data/portfolio.ts` — 作品数组 + `PortfolioItem` 类型导出
- `src/components/PortfolioCard.astro` — 单个作品卡（标题 + 描述 + CTA）
- `src/components/PortfolioOverview.astro` — 首页 `~/works` 区块（header + 网格 + 可选 more）
- `src/pages/portfolio.astro` — `/portfolio` 路由

**Modify:**
- `src/pages/index.astro` — 在 about 与 home-list 之间插入 `<PortfolioOverview limit={4} showMore />`
- `src/components/Hero.astro` — nav 增加 `<a href="/portfolio">~/works</a>`

---

## Global Constraints

- Astro 5 SSG；TypeScript strict（沿用 `astro/tsconfigs/strictest`）
- 零新增 npm 依赖（AGENTS.md 红线 6）
- 所有样式复用 `src/styles/tokens.css` 现有令牌，禁止新增色值/字号
- 外部链接统一 `target="_blank" rel="noopener noreferrer"`
- 不动 `astro.config.ts` 的 `site`、不动 `public/CNAME`、不动 `package.json` scripts（AGENTS.md 红线 1/2/6）
- 新页面必须经 `Base.astro` 布局 + 传 `seo` prop（AGENTS.md 红线 4）
- 数据类型用 `as const`，禁止字段漂移
- 命名沿用现有 BEM：`portfolio-card__title`、`portfolio-overview__header` 等

---

## Task 1: 创建作品数据文件

**Files:**
- Create: `src/data/portfolio.ts`

- [ ] **Step 1: 创建 `src/data/portfolio.ts`**

写入以下完整内容：

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

- [ ] **Step 2: 跑构建确认类型校验通过**

Run: `cd /Users/guoshencheng/Documents/work/CenturyGuo && npm run build 2>&1 | tail -30`
Expected: 构建成功，无 TS 报错（此文件暂未被引用，所以 dist 内容不变；TS 检查是验证手段）。

- [ ] **Step 3: 提交**

```bash
cd /Users/guoshencheng/Documents/work/CenturyGuo
git add src/data/portfolio.ts
git commit -m "feat(portfolio): add works data array"
```

---

## Task 2: 创建 `PortfolioCard.astro`

**Files:**
- Create: `src/components/PortfolioCard.astro`

**Interfaces:**
- Consumes: `PortfolioItem`（Task 1 导出）
- Produces: `<article class="portfolio-card">` 元素，包含 `<h3>` 标题、`<p>` 描述、`<a>` CTA

- [ ] **Step 1: 创建 `src/components/PortfolioCard.astro`**

写入以下完整内容（frontmatter + 模板 + style）：

```astro
---
import type { PortfolioItem } from "../data/portfolio";

export interface Props {
  item: PortfolioItem;
}

const { item } = Astro.props;
---

<article class="portfolio-card">
  <h3 class="portfolio-card__title">{item.name}</h3>
  <p class="portfolio-card__desc">{item.description}</p>
  <a
    class="portfolio-card__cta"
    href={item.url}
    target="_blank"
    rel="noopener noreferrer"
  >
    {item.ctaLabel} →
  </a>
</article>

<style>
  .portfolio-card {
    border: var(--border);
    border-radius: var(--radius);
    padding: var(--space-md);
    background: var(--color-surface);
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .portfolio-card__title {
    display: inline-block;
    align-self: flex-start;
    background: var(--color-accent);
    color: var(--color-card-bg);
    padding: 4px 14px;
    font-size: var(--text-lg);
    font-weight: 700;
    margin: 0;
    font-family: var(--font-mono);
    line-height: 1.4;
  }

  .portfolio-card__desc {
    margin: 0;
    font-size: var(--text-base);
    color: var(--color-text-muted);
    line-height: 1.7;
    flex: 1;
  }

  .portfolio-card__cta {
    color: var(--color-link);
    text-decoration: none;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    transition: color 0.15s;
  }

  .portfolio-card__cta:hover {
    color: var(--color-link-hover);
  }
</style>
```

- [ ] **Step 2: 构建确认无报错**

Run: `cd /Users/guoshencheng/Documents/work/CenturyGuo && npm run build 2>&1 | tail -20`
Expected: 构建成功。本文件暂未被引用，但 TS 类型导入需要 `PortfolioItem` 已存在（Task 1 保证）。

- [ ] **Step 3: 提交**

```bash
cd /Users/guoshencheng/Documents/work/CenturyGuo
git add src/components/PortfolioCard.astro
git commit -m "feat(portfolio): add PortfolioCard component"
```

---

## Task 3: 创建 `PortfolioOverview.astro`

**Files:**
- Create: `src/components/PortfolioOverview.astro`

**Interfaces:**
- Consumes: `portfolio` 数组（Task 1）、`PortfolioCard`（Task 2）
- Produces: `<section class="portfolio-overview">`，含 header（标题 + 可选 more）+ `<ul>` 网格

Props：
- `limit?: number` — 默认 `portfolio.length`
- `showMore?: boolean` — 默认 `false`；为 `true` 时右上角渲染 `more →` 链接到 `/portfolio`

- [ ] **Step 1: 创建 `src/components/PortfolioOverview.astro`**

写入以下完整内容：

```astro
---
import { portfolio } from "../data/portfolio";
import PortfolioCard from "./PortfolioCard.astro";

export interface Props {
  limit?: number;
  showMore?: boolean;
}

const { limit, showMore = false } = Astro.props;
const items = portfolio.slice(0, limit ?? portfolio.length);
---

<section class="portfolio-overview">
  <header class="portfolio-overview__header">
    <h2 class="portfolio-overview__title">~/works</h2>
    {showMore && (
      <a href="/portfolio" class="portfolio-overview__more">more →</a>
    )}
  </header>
  <ul class="portfolio-overview__grid">
    {items.map((item) => (
      <li><PortfolioCard item={item} /></li>
    ))}
  </ul>
</section>

<style>
  .portfolio-overview {
    margin-bottom: var(--space-xl);
    padding-bottom: var(--space-lg);
    border-bottom: var(--border);
  }

  .portfolio-overview__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: var(--space-md);
  }

  .portfolio-overview__title {
    font-size: var(--text-lg);
    margin: 0;
    color: var(--color-text);
    font-family: var(--font-mono);
  }

  .portfolio-overview__more {
    color: var(--color-link);
    text-decoration: none;
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    transition: color 0.15s;
  }

  .portfolio-overview__more:hover {
    color: var(--color-link-hover);
  }

  .portfolio-overview__grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-md);
  }

  .portfolio-overview__grid > li {
    display: flex;
  }

  .portfolio-overview__grid > li > :global(*) {
    width: 100%;
  }

  @media (max-width: 640px) {
    .portfolio-overview__grid {
      grid-template-columns: 1fr;
    }
  }
</style>
```

- [ ] **Step 2: 构建确认无报错**

Run: `cd /Users/guoshencheng/Documents/work/CenturyGuo && npm run build 2>&1 | tail -20`
Expected: 构建成功。

- [ ] **Step 3: 提交**

```bash
cd /Users/guoshencheng/Documents/work/CenturyGuo
git add src/components/PortfolioOverview.astro
git commit -m "feat(portfolio): add PortfolioOverview component"
```

---

## Task 4: 创建 `/portfolio` 页面

**Files:**
- Create: `src/pages/portfolio.astro`

**Interfaces:**
- Consumes: `Base` 布局（`src/layouts/Base.astro`）、`Card` 组件（`src/components/Card.astro`）、`PortfolioCard`（Task 2）、`portfolio` 数据（Task 1）

- [ ] **Step 1: 创建 `src/pages/portfolio.astro`**

写入以下完整内容（注意 `seo.person.sameAs` 与首页 `src/pages/index.astro` 第 23 行保持一致）：

```astro
---
import Base from "../layouts/Base.astro";
import Card from "../components/Card.astro";
import PortfolioCard from "../components/PortfolioCard.astro";
import { portfolio } from "../data/portfolio";
---

<Base
  terminalTitle="century@blog:~/works"
  seo={{
    title: "作品集 | Duluu's World",
    description: "Duluu Guo 的作品集 — DuluuClip、Rem Agent 等产品与开源项目",
    type: "website",
    person: {
      name: "Duluu Guo",
      jobTitle: "全栈工程师",
      knowsAbout: ["LLM Agent", "Node", "React", "架构设计"],
      sameAs: ["https://github.com/guoshencheng"],
    },
  }}
>
  <Card prompt="> DULUU_GUO:~/works">
    <p class="portfolio-intro">我做过的产品 / 项目，点卡片直达。</p>
    <ul class="portfolio-grid">
      {portfolio.map((item) => (
        <li><PortfolioCard item={item} /></li>
      ))}
    </ul>
  </Card>
</Base>

<style>
  .portfolio-intro {
    margin: 0 0 var(--space-md);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
  }

  .portfolio-grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-md);
  }

  .portfolio-grid > li {
    display: flex;
  }

  .portfolio-grid > li > :global(*) {
    width: 100%;
  }

  @media (max-width: 640px) {
    .portfolio-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
```

- [ ] **Step 2: 构建并验证新页面已生成**

Run: `cd /Users/guoshencheng/Documents/work/CenturyGuo && npm run build 2>&1 | tail -20`
Expected: 构建成功。

Run: `ls /Users/guoshencheng/Documents/work/CenturyGuo/dist/portfolio/`
Expected: 存在 `index.html` 文件。

- [ ] **Step 3: 验证 dist HTML 含作品名**

Run: `grep -o "DuluuClip\|Rem Agent" /Users/guoshencheng/Documents/work/CenturyGuo/dist/portfolio/index.html | sort -u`
Expected: 输出两行：
```
DuluuClip
Rem Agent
```

- [ ] **Step 4: 验证 sitemap 含 /portfolio**

Run: `grep -o "/portfolio" /Users/guoshencheng/Documents/work/CenturyGuo/dist/sitemap-0.xml 2>/dev/null || grep -o "/portfolio" /Users/guoshencheng/Documents/work/CenturyGuo/dist/sitemap.xml 2>/dev/null || ls /Users/guoshencheng/Documents/work/CenturyGuo/dist/ | grep sitemap`
Expected: 任一 sitemap 文件中能找到 `/portfolio`，或至少 sitemap 文件存在（Astro 自动收录静态页）。

- [ ] **Step 5: 提交**

```bash
cd /Users/guoshencheng/Documents/work/CenturyGuo
git add src/pages/portfolio.astro
git commit -m "feat(portfolio): add /portfolio page"
```

---

## Task 5: 首页集成 `PortfolioOverview`

**Files:**
- Modify: `src/pages/index.astro:1-50`

**Interfaces:**
- Consumes: `PortfolioOverview`（Task 3）

- [ ] **Step 1: 在 `src/pages/index.astro` 顶部 import**

修改 frontmatter 段（第 1–10 行），在 `import PostCard` 之后新增一行：

```astro
---
import Base from "../layouts/Base.astro";
import Hero from "../components/Hero.astro";
import Card from "../components/Card.astro";
import PostCard from "../components/PostCard.astro";
import PortfolioOverview from "../components/PortfolioOverview.astro";
import { getCollection } from "astro:content";

const posts = (await getCollection("blog"))
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
---
```

- [ ] **Step 2: 在 about 与 home-list 之间插入 PortfolioOverview**

修改 `<Card>` 内容段（当前第 29–49 行），在 `</section>` 之后、`<div class="home-list">` 之前插入一行：

```astro
    <PortfolioOverview limit={4} showMore />
```

插入后的结构（仅展示受影响部分）：

```astro
  <Card>
    <section class="about">
      ...保持原样...
    </section>

    <PortfolioOverview limit={4} showMore />

    <div class="home-list">
      {posts.length === 0 ? (
        ...
      ) : (
        posts.map((post) => <PostCard post={post} />)
      )}
    </div>
  </Card>
```

- [ ] **Step 3: 构建并验证首页含 ~/works 区块**

Run: `cd /Users/guoshencheng/Documents/work/CenturyGuo && npm run build 2>&1 | tail -20`
Expected: 构建成功。

Run: `grep -o "~/works\|portfolio-overview\|more →" /Users/guoshencheng/Documents/work/CenturyGuo/dist/index.html | sort -u`
Expected: 输出三行（任意 grep 命中即说明区块已渲染）：
```
~/works
more →
```
至少 `~/works` 必须出现。

- [ ] **Step 4: 验证首页 HTML 含两个作品名**

Run: `grep -o "DuluuClip\|Rem Agent" /Users/guoshencheng/Documents/work/CenturyGuo/dist/index.html | sort -u`
Expected: 两行均输出。

- [ ] **Step 5: 提交**

```bash
cd /Users/guoshencheng/Documents/work/CenturyGuo
git add src/pages/index.astro
git commit -m "feat(portfolio): show ~/works overview on homepage"
```

---

## Task 6: Hero nav 增加 `~/works` 链接

**Files:**
- Modify: `src/components/Hero.astro:10-14`

- [ ] **Step 1: 在 nav 中插入 `~/works` 链接**

修改 `src/components/Hero.astro` 第 10–14 行：

```astro
    <nav class="hero__nav">
      <a href="/">~/posts</a>
      <a href="/tags">~/tags</a>
      <a href="/portfolio">~/works</a>
      <a href="/rss.xml">~/rss</a>
    </nav>
```

位置：`~/tags` 与 `~/rss.xml` 之间，按「内容 > 分类 > 作品 > 订阅」语义排序。

- [ ] **Step 2: 构建并验证 Hero nav 含 `~/works`**

Run: `cd /Users/guoshencheng/Documents/work/CenturyGuo && npm run build 2>&1 | tail -20`
Expected: 构建成功。

Run: `grep -o "/portfolio\|~/works" /Users/guoshencheng/Documents/work/CenturyGuo/dist/index.html | sort -u`
Expected: 两行均输出。

- [ ] **Step 3: 提交**

```bash
cd /Users/guoshencheng/Documents/work/CenturyGuo
git add src/components/Hero.astro
git commit -m "feat(portfolio): add ~/works entry to Hero nav"
```

---

## Task 7: 端到端运行时验证

**Files:** 无（验证任务）

- [ ] **Step 1: 启动 dev server**

Run: `cd /Users/guoshencheng/Documents/work/CenturyGuo && npm run dev`
Expected: 服务起在 `http://localhost:4321`，控制台无报错。

后台运行（不阻塞后续步骤）。如使用 `run_in_background=true`，dev server 在独立进程。

- [ ] **Step 2: 验证首页 HTML 含全部预期片段**

Run: `curl -s http://localhost:4321/ | grep -oE '~/works|DuluuClip|Rem Agent|Visit Site|View on GitHub|portfolio-overview|more →' | sort -u`
Expected: 输出含全部 7 个关键词（dev server 渲染的 HTML 与 build 后一致）。

- [ ] **Step 3: 验证 /portfolio 页面**

Run: `curl -s http://localhost:4321/portfolio | grep -oE 'DuluuClip|Rem Agent|portfolio-grid|portfolio-intro' | sort -u`
Expected: 输出含全部 4 个关键词。

- [ ] **Step 4: 验证 meta title / description**

Run: `curl -s http://localhost:4321/portfolio | grep -oE '<title>[^<]*</title>|<meta name="description"[^>]*>'`
Expected:
- `<title>作品集 | Duluu's World</title>`（实际文本由 SeoHead 拼接）
- `<meta name="description" content="Duluu Guo 的作品集 — DuluuClip、Rem Agent 等产品与开源项目" ...>`

具体前缀以 `src/utils/seo.ts` 实际实现为准（不在本次改动范围），关键是 `<title>` 含「作品集」且 `description` 含「作品集」。

- [ ] **Step 5: 停止 dev server**

若在后台运行，找到对应进程并 `TaskStop` / `kill`。若前台运行，`Ctrl-C` 结束。

- [ ] **Step 6: 全量最终构建确认**

Run: `cd /Users/guoshencheng/Documents/work/CenturyGuo && rm -rf dist && npm run build 2>&1 | tail -30`
Expected: 全量构建成功；dist 中存在 `index.html`、`portfolio/index.html`、`sitemap-*.xml`、`rss.xml`。

- [ ] **Step 7: 最终提交（若有 uncommitted 改动）**

```bash
cd /Users/guoshencheng/Documents/work/CenturyGuo
git status
# 若有未提交改动：
git add -A
git commit -m "chore(portfolio): final verification pass"
```

预期：所有改动已在前 6 个任务分别提交，本步骤通常无新 commit。

---

## Self-Review Checklist（写计划后回填）

- [x] Spec §4 数据模型 → Task 1
- [x] Spec §5.1 PortfolioCard → Task 2
- [x] Spec §5.2 PortfolioOverview（含 limit / showMore） → Task 3
- [x] Spec §8 `/portfolio` 页面结构 → Task 4
- [x] Spec §9 首页 index.astro 集成 → Task 5
- [x] Spec §9 Hero nav 加链接 → Task 6
- [x] Spec §11 验证清单 → Task 7（grep + curl 形式覆盖）
- [x] 类型：`PortfolioItem` 在 Task 1 定义，Task 2 引用，名称一致
- [x] CSS class 名：`portfolio-card__title/desc/cta`、`portfolio-overview__title/more/grid`、`portfolio-grid`、`portfolio-intro` 全部在 spec §7 / §8 出现，命名一致
- [x] 全局约束（零依赖 / tokens.css / external rel / Base.astro）在每个任务 step 中体现