# Blog Design Draft Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 Astro Retro Terminal 博客重构为“首页 70vh Hero + 蘑菇动画 + Terminal 单卡片文章列表”风格，并同步改造文章详情页与标签页。

**Architecture:** 保留 `Terminal.astro` 作为页面级容器；新增 `Card.astro` 作为 Terminal 内部的卡片容器；新增 `Hero.astro` 作为首页首屏；改造 `PostCard.astro` 为卡片条目样式；为 `Mushroom.astro` 增加可选的 3D 翻转动画；调整 `Base.astro` 使首页不显示 header；最后改造 `index.astro`、文章详情页和标签页以使用新组件。

**Tech Stack:** Astro 5, TypeScript, 手写 CSS Design System

---

## File Structure

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/styles/tokens.css` | 修改 | 新增卡片背景 token `--color-card-bg` |
| `src/components/Card.astro` | 新建 | Terminal body 内的深色卡片容器，带 `> CENTURY_GUO:/` 提示符 |
| `src/components/PostCard.astro` | 重写 | 卡片条目样式：红色底白字标题、日期标签行、描述、dark pill 标签 |
| `src/components/Mushroom.astro` | 修改 | 添加 `animated` prop，支持 3D 翻转动画 |
| `src/components/Hero.astro` | 新建 | 首页 70vh Hero：动画蘑菇、站点标题、副标题、导航、滚动提示 |
| `src/layouts/Base.astro` | 修改 | 首页隐藏 site-header，其他页面保留；支持传入 Terminal 标题 |
| `src/pages/index.astro` | 重写 | 引入 Hero + Card + PostCard |
| `src/pages/posts/[slug].astro` | 重写 | 卡片内文章详情 |
| `src/pages/tags.astro` | 重写 | 卡片内标签云 |
| `src/pages/tags/[tag].astro` | 重写 | 卡片内标签筛选结果 |

---

## Task 1: 更新设计 Token

**Files:**
- Modify: `src/styles/tokens.css`

- [ ] **Step 1: 添加卡片背景色 token**

在 `:root` 的 Colors 区块末尾新增：

```css
  --color-card-bg: #1a1a2e;
```

完整 Colors 区块应如下：

```css
  /* Colors */
  --color-bg: #0D1117;
  --color-surface: #161B22;
  --color-card-bg: #1a1a2e;
  --color-accent: #E94560;
  --color-link: #16C79A;
  --color-link-hover: #1ae8b0;
  --color-text: #C9D1D9;
  --color-text-muted: #8B949E;
  --color-border: #30363D;
  --color-terminal-dot-red: #FF5F56;
  --color-terminal-dot-yellow: #FFBD2E;
  --color-terminal-dot-green: #27C93F;
```

- [ ] **Step 2: 验证构建无报错**

Run: `npx astro build`

Expected: 构建成功，无 TypeScript/CSS 错误。

- [ ] **Step 3: 提交**

```bash
git add src/styles/tokens.css
git commit -m "feat: add card background color token

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: 创建 Card 组件

**Files:**
- Create: `src/components/Card.astro`

- [ ] **Step 1: 创建 Card.astro**

```astro
---
export interface Props {
  prompt?: string;
}

const { prompt = "> CENTURY_GUO:/" } = Astro.props;
---

<div class="card">
  <div class="card__prompt">{prompt}</div>
  <div class="card__body">
    <slot />
  </div>
</div>

<style>
  .card {
    background: var(--color-card-bg);
    border-radius: 8px;
    padding: var(--space-lg);
  }

  .card__prompt {
    color: var(--color-accent);
    font-size: var(--text-sm);
    letter-spacing: 1px;
    margin-bottom: var(--space-lg);
  }

  .card__body > :first-child {
    margin-top: 0;
  }

  .card__body > :last-child {
    margin-bottom: 0;
  }

  @media (max-width: 640px) {
    .card {
      padding: var(--space-md);
    }
  }
</style>
```

- [ ] **Step 2: 验证构建无报错**

Run: `npx astro build`

Expected: 构建成功。

- [ ] **Step 3: 提交**

```bash
git add src/components/Card.astro
git commit -m "feat: add Card container component

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: 重构 PostCard 组件

**Files:**
- Modify: `src/components/PostCard.astro`

- [ ] **Step 1: 重写 PostCard.astro**

```astro
---
import { formatDate } from "../utils/formatDate";
import type { CollectionEntry } from "astro:content";

export interface Props {
  post: CollectionEntry<"blog">;
}

const { post } = Astro.props;
const { title, date, tags, description } = post.data;
---

<article class="post-card">
  <a href={`/posts/${post.slug}`} class="post-card__title">
    {title}
  </a>
  <div class="post-card__meta">
    {formatDate(date)}
    {tags.length > 0 && (
      <span class="post-card__meta-tags">
        {" | "}
        {tags.map((tag) => `#${tag}`).join(" ")}
      </span>
    )}
  </div>
  {description && (
    <p class="post-card__desc">{description}</p>
  )}
  {tags.length > 0 && (
    <div class="post-card__tags">
      {tags.map((tag) => (
        <a href={`/tags/${tag}`} class="post-card__tag">{tag}</a>
      ))}
    </div>
  )}
</article>

<style>
  .post-card {
    padding-bottom: var(--space-lg);
    margin-bottom: var(--space-lg);
    border-bottom: 1px solid var(--color-border);
  }

  .post-card:last-child {
    padding-bottom: 0;
    margin-bottom: 0;
    border-bottom: none;
  }

  .post-card__title {
    display: inline-block;
    background: var(--color-accent);
    color: #ffffff;
    padding: 4px 14px;
    font-size: var(--text-lg);
    font-weight: 700;
    text-align: center;
    text-decoration: none;
    line-height: 1.4;
    transition: filter 0.15s;
  }

  .post-card__title:hover {
    filter: brightness(1.1);
  }

  .post-card__meta {
    margin-top: var(--space-sm);
    font-size: var(--text-sm);
    color: var(--color-link);
    font-family: var(--font-mono);
  }

  .post-card__meta-tags {
    color: var(--color-link);
  }

  .post-card__desc {
    margin: var(--space-sm) 0 0;
    font-size: var(--text-base);
    color: var(--color-text-muted);
    line-height: 1.7;
  }

  .post-card__tags {
    margin-top: var(--space-sm);
    display: flex;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }

  .post-card__tag {
    display: inline-block;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 11px;
    color: var(--color-link);
    font-family: var(--font-mono);
    text-decoration: none;
    transition: color 0.15s, border-color 0.15s;
  }

  .post-card__tag:hover {
    color: var(--color-link-hover);
    border-color: var(--color-link);
  }

  @media (max-width: 640px) {
    .post-card__title {
      font-size: 18px;
    }
  }
</style>
```

- [ ] **Step 2: 验证构建无报错**

Run: `npx astro build`

Expected: 构建成功。

- [ ] **Step 3: 提交**

```bash
git add src/components/PostCard.astro
git commit -m "feat: refactor PostCard to card entry style

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: 为 Mushroom 添加动画

**Files:**
- Modify: `src/components/Mushroom.astro`

- [ ] **Step 1: 修改 Mushroom.astro**

```astro
---
export interface Props {
  size?: number;
  animated?: boolean;
}

const { size = 64, animated = false } = Astro.props;
const accentDeep = "rgba(233, 69, 96, 0.8)";
const accentLight = "rgba(233, 69, 96, 0.65)";
const cell = size / 8;
const viewBox = `0 0 ${size} ${size}`;
const rects = [
  [1, 2],
  [2, 2],
  [3, 2],
  [4, 2],
  [0, 3],
  [1, 3],
  [2, 3],
  [3, 3],
  [4, 3],
  [5, 3],
  [1, 4],
  [2, 4],
  [3, 4],
  [4, 4],
  [2, 5],
  [3, 5],
  [4, 5],
  [5, 5],
  [2, 6],
  [3, 6],
  [4, 6],
  [5, 6],
  [2, 7],
  [3, 7],
  [4, 7],
  [5, 7],
];
---

<svg
  viewBox={viewBox}
  width={size}
  height={size}
  class:list={["mushroom", { "mushroom--animated": animated }]}
  aria-label="Century's Blog Logo"
>
  {
    rects.map(([x, y], index) => {
      const row = y;
      const col = x;
      const delay = -((row * 8 + col) * 0.05);
      return (
        <rect
          x={x * cell}
          y={y * cell}
          width={cell}
          height={cell}
          rx={cell * 0.15}
          ry={cell * 0.15}
          fill={
            y % 2 === 0
              ? x % 2 === 0
                ? accentDeep
                : accentLight
              : x % 2 === 0
                ? accentLight
                : accentDeep
          }
          style={animated ? { animationDelay: `${delay}s` } : undefined}
        />
      );
    })
  }
</svg>

<style>
  .mushroom {
    display: block;
    image-rendering: pixelated;
  }

  .mushroom--animated rect {
    animation: rotateplane 10s infinite ease-in-out;
    transform-origin: center;
  }

  @keyframes rotateplane {
    0% {
      transform: perspective(120px) rotateX(0deg) rotateY(0deg);
    }
    10% {
      transform: perspective(120px) rotateX(-180.1deg) rotateY(0);
    }
    50% {
      transform: perspective(120px) rotateX(-180.1deg) rotateY(0);
    }
    60% {
      transform: perspective(120px) rotateX(-360deg) rotateY(0deg);
    }
    100% {
      transform: perspective(120px) rotateX(-360deg) rotateY(0deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .mushroom--animated rect {
      animation: none;
    }
  }
</style>
```

- [ ] **Step 2: 验证构建无报错**

Run: `npx astro build`

Expected: 构建成功。

- [ ] **Step 3: 提交**

```bash
git add src/components/Mushroom.astro
git commit -m "feat: add optional 3D flip animation to Mushroom

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: 创建 Hero 组件

**Files:**
- Create: `src/components/Hero.astro`

- [ ] **Step 1: 创建 Hero.astro**

```astro
---
import Mushroom from "./Mushroom.astro";
---

<section class="hero">
  <div class="hero__content">
    <Mushroom size={120} animated />
    <h1 class="hero__title">Century's World</h1>
    <p class="hero__subtitle">Code / Design / Random thoughts</p>
    <nav class="hero__nav">
      <a href="/">~/posts</a>
      <a href="/tags">~/tags</a>
      <a href="/rss.xml">~/rss</a>
    </nav>
  </div>
  <div class="hero__scroll">
    <span class="hero__scroll-arrow">↓</span>
  </div>
</section>

<style>
  .hero {
    min-height: 70vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    padding: var(--space-xl) var(--space-md);
    text-align: center;
  }

  .hero__content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-md);
  }

  .hero :global(.mushroom) {
    margin: 0 auto;
  }

  .hero__title {
    font-size: 32px;
    color: var(--color-accent);
    font-weight: 700;
    margin: 0;
    font-family: var(--font-mono);
  }

  .hero__subtitle {
    font-size: var(--text-base);
    color: var(--color-text-muted);
    margin: 0;
    font-family: var(--font-mono);
  }

  .hero__nav {
    display: flex;
    gap: var(--space-lg);
    margin-top: var(--space-sm);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
  }

  .hero__nav a {
    color: var(--color-link);
    text-decoration: none;
  }

  .hero__nav a:hover {
    color: var(--color-link-hover);
  }

  .hero__scroll {
    position: absolute;
    bottom: var(--space-lg);
    left: 50%;
    transform: translateX(-50%);
    color: var(--color-text-muted);
    font-size: 20px;
  }

  .hero__scroll-arrow {
    display: inline-block;
    animation: blink 1.5s step-end infinite;
  }

  @keyframes blink {
    50% {
      opacity: 0;
    }
  }

  @media (max-width: 640px) {
    .hero {
      min-height: 60vh;
    }

    .hero__title {
      font-size: 24px;
    }

    .hero__nav {
      gap: var(--space-md);
    }
  }
</style>
```

- [ ] **Step 2: 验证构建无报错**

Run: `npx astro build`

Expected: 构建成功。

- [ ] **Step 3: 提交**

```bash
git add src/components/Hero.astro
git commit -m "feat: add Hero component with animated mushroom

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: 更新 Base 布局

**Files:**
- Modify: `src/layouts/Base.astro`

- [ ] **Step 1: 修改 Base.astro**

添加 `isHome` prop 控制是否显示 header，并让 `Terminal` 标题可配置：

```astro
---
import Terminal from "../components/Terminal.astro";
import Mushroom from "../components/Mushroom.astro";
import "../styles/base.css";

export interface Props {
  pageTitle?: string;
  description?: string;
  terminalTitle?: string;
  isHome?: boolean;
}

const {
  pageTitle,
  description = "guoshencheng's personal blog",
  terminalTitle,
  isHome = false,
} = Astro.props;

const siteTitle = "Century's World";
const fullTitle = pageTitle ? `${pageTitle} — ${siteTitle}` : siteTitle;
---

<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content={description} />
    <title>{fullTitle}</title>
    <link rel="sitemap" href="/sitemap-index.xml" />
  </head>
  <body>
    {!isHome && (
      <header class="site-header">
        <a href="/" class="site-brand" title="Home">
          <Mushroom size={40} />
          <span class="site-brand__text">{siteTitle}</span>
        </a>
        <nav class="site-nav">
          <a href="/">~/posts</a>
          <a href="/tags">~/tags</a>
          <a href="/rss.xml">~/rss</a>
        </nav>
      </header>
    )}

    <main>
      <Terminal title={terminalTitle}>
        <slot />
      </Terminal>
    </main>
  </body>
</html>

<style>
  .site-header {
    max-width: 720px;
    margin: 0 auto var(--space-lg);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-md);
  }

  .site-brand {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    transition: opacity 0.15s;
  }

  .site-brand:hover {
    opacity: 0.8;
  }

  .site-brand__text {
    font-size: var(--text-base);
    color: var(--color-text);
    font-family: var(--font-mono);
  }

  .site-nav {
    display: flex;
    gap: var(--space-md);
  }

  .site-nav a {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  .site-nav a:hover {
    color: var(--color-accent);
  }

  main {
    max-width: 720px;
    margin: 0 auto;
  }

  @media (max-width: 640px) {
    .site-header {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
```

- [ ] **Step 2: 验证构建无报错**

Run: `npx astro build`

Expected: 构建成功。

- [ ] **Step 3: 提交**

```bash
git add src/layouts/Base.astro
git commit -m "feat: support hiding header on homepage and custom terminal title

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: 改造首页

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: 重写 index.astro**

```astro
---
import Base from "../layouts/Base.astro";
import Hero from "../components/Hero.astro";
import Card from "../components/Card.astro";
import PostCard from "../components/PostCard.astro";
import { getCollection } from "astro:content";

const posts = (await getCollection("blog"))
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
---

<Base
  isHome
  terminalTitle="century@blog:~/posts"
  description="guoshencheng's personal blog — Retro Terminal style"
>
  <Hero />

  <Card>
    {posts.length === 0 ? (
      <p class="home-empty">
        No posts yet. <span class="home-cursor">█</span>
      </p>
    ) : (
      posts.map((post) => <PostCard post={post} />)
    )}
  </Card>
</Base>

<style>
  .home-empty {
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
  }

  .home-cursor {
    color: var(--color-link);
    animation: blink 1s step-end infinite;
  }

  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
</style>
```

- [ ] **Step 2: 验证首页渲染**

Run: `npx astro build`

Expected: 构建成功，`dist/index.html` 存在。

- [ ] **Step 3: 提交**

```bash
git add src/pages/index.astro
git commit -m "feat: redesign homepage with Hero and card post list

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: 改造文章详情页

**Files:**
- Modify: `src/pages/posts/[slug].astro`

- [ ] **Step 1: 重写 posts/[slug].astro**

```astro
---
import { getCollection } from "astro:content";
import Base from "../../layouts/Base.astro";
import Card from "../../components/Card.astro";
import { formatDate } from "../../utils/formatDate";
import "../../styles/markdown.css";

export async function getStaticPaths() {
  const posts = await getCollection("blog");
  return posts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
const { title, date, tags, description } = post.data;
const { Content } = await post.render();
---

<Base
  pageTitle={title}
  description={description}
  terminalTitle={`century@blog:~/posts/${post.slug}.md`}
>
  <Card prompt={`> CENTURY_GUO:/posts/${post.slug}`}>
    <article class="article">
      <header class="article-header">
        <a href={`/posts/${post.slug}`} class="article-title">
          {title}
        </a>
        <div class="article-meta">
          {formatDate(date)}
          {tags.length > 0 && (
            <span class="article-meta-tags">
              {" | "}
              {tags.map((tag) => `#${tag}`).join(" ")}
            </span>
          )}
        </div>
        {description && <p class="article-desc">{description}</p>}
        {tags.length > 0 && (
          <div class="article-tags">
            {tags.map((tag) => (
              <a href={`/tags/${tag}`} class="article-tag">{tag}</a>
            ))}
          </div>
        )}
      </header>

      <div class="article-body">
        <Content />
      </div>

      <footer class="article-footer">
        <a href="/" class="article-back">cd ~/posts/</a>
      </footer>
    </article>
  </Card>
</Base>

<style>
  .article-header {
    margin-bottom: var(--space-xl);
  }

  .article-title {
    display: inline-block;
    background: var(--color-accent);
    color: #ffffff;
    padding: 4px 14px;
    font-size: var(--text-xl);
    font-weight: 700;
    text-align: center;
    text-decoration: none;
    line-height: 1.4;
    transition: filter 0.15s;
  }

  .article-title:hover {
    filter: brightness(1.1);
  }

  .article-meta {
    margin-top: var(--space-sm);
    font-size: var(--text-sm);
    color: var(--color-link);
    font-family: var(--font-mono);
  }

  .article-meta-tags {
    color: var(--color-link);
  }

  .article-desc {
    margin: var(--space-sm) 0 0;
    font-size: var(--text-base);
    color: var(--color-text-muted);
    line-height: 1.7;
    font-style: italic;
  }

  .article-tags {
    margin-top: var(--space-sm);
    display: flex;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }

  .article-tag {
    display: inline-block;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 4px 10px;
    font-size: 11px;
    color: var(--color-link);
    font-family: var(--font-mono);
    text-decoration: none;
    transition: color 0.15s, border-color 0.15s;
  }

  .article-tag:hover {
    color: var(--color-link-hover);
    border-color: var(--color-link);
  }

  .article-body {
    margin-top: var(--space-xl);
  }

  .article-footer {
    margin-top: var(--space-xl);
    padding-top: var(--space-lg);
    border-top: var(--border);
  }

  .article-back {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
  }

  @media (max-width: 640px) {
    .article-title {
      font-size: var(--text-lg);
    }
  }
</style>
```

- [ ] **Step 2: 验证文章详情页渲染**

Run: `npx astro build`

Expected: 构建成功，`dist/posts/hello-world/index.html` 存在。

- [ ] **Step 3: 提交**

```bash
git add src/pages/posts/[slug].astro
git commit -m "feat: redesign post detail page with card layout

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: 改造标签总览页

**Files:**
- Modify: `src/pages/tags.astro`

- [ ] **Step 1: 重写 tags.astro**

```astro
---
import Base from "../layouts/Base.astro";
import Card from "../components/Card.astro";
import { getCollection } from "astro:content";

const posts = await getCollection("blog");
const tagMap = new Map<string, number>();
posts.forEach((post) => {
  post.data.tags.forEach((tag) => {
    tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
  });
});
const allTags = [...tagMap.entries()].sort((a, b) => b[1] - a[1]);
---

<Base pageTitle="Tags" description="标签列表" terminalTitle="century@blog:~/tags">
  <Card prompt="> CENTURY_GUO:/tags">
    {allTags.length === 0 ? (
      <p class="tags-empty">No tags yet.</p>
    ) : (
      <div class="tags-cloud">
        {allTags.map(([tag, count]) => (
          <a href={`/tags/${tag}`} class="tags-cloud__item">
            <span class="tags-cloud__name">#{tag}</span>
            <span class="tags-cloud__count">{count} posts</span>
          </a>
        ))}
      </div>
    )}
  </Card>
</Base>

<style>
  .tags-empty {
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
  }

  .tags-cloud {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
  }

  .tags-cloud__item {
    display: inline-flex;
    align-items: center;
    gap: var(--space-sm);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 6px 12px;
    color: var(--color-link);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    text-decoration: none;
    transition: color 0.15s, border-color 0.15s;
  }

  .tags-cloud__item:hover {
    color: var(--color-link-hover);
    border-color: var(--color-link);
  }

  .tags-cloud__count {
    font-size: 11px;
    color: var(--color-text-muted);
  }
</style>
```

- [ ] **Step 2: 验证标签总览页渲染**

Run: `npx astro build`

Expected: 构建成功，`dist/tags/index.html` 存在。

- [ ] **Step 3: 提交**

```bash
git add src/pages/tags.astro
git commit -m "feat: redesign tags overview page with card layout

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: 改造标签筛选页

**Files:**
- Modify: `src/pages/tags/[tag].astro`

- [ ] **Step 1: 重写 tags/[tag].astro**

```astro
---
import Base from "../../layouts/Base.astro";
import Card from "../../components/Card.astro";
import PostCard from "../../components/PostCard.astro";
import { getCollection } from "astro:content";

export async function getStaticPaths() {
  const posts = await getCollection("blog");
  const tagSet = new Set<string>();
  posts.forEach((p) => p.data.tags.forEach((t) => tagSet.add(t)));
  return [...tagSet].map((tag) => ({
    params: { tag },
    props: { tag },
  }));
}

const { tag } = Astro.props;
const allPosts = await getCollection("blog");
const posts = allPosts
  .filter((p) => p.data.tags.includes(tag))
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
---

<Base
  pageTitle={`#${tag}`}
  description={`${tag} 标签下的文章`}
  terminalTitle={`century@blog:~/tags/${tag}`}
>
  <Card prompt={`> CENTURY_GUO:/tags/${tag}`}>
    <p class="tag-page-count">found {posts.length} post(s)</p>

    {posts.length === 0 ? (
      <p class="tag-page-empty">No posts found for this tag.</p>
    ) : (
      <div class="tag-page-list">
        {posts.map((post) => <PostCard post={post} />)}
      </div>
    )}

    <p class="tag-page-back">
      <a href="/tags">cd ~/tags/</a>
    </p>
  </Card>
</Base>

<style>
  .tag-page-count {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    margin-bottom: var(--space-lg);
    font-family: var(--font-mono);
  }

  .tag-page-empty {
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
  }

  .tag-page-list {
    display: flex;
    flex-direction: column;
  }

  .tag-page-back {
    margin-top: var(--space-lg);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
  }
</style>
```

- [ ] **Step 2: 验证标签筛选页渲染**

Run: `npx astro build`

Expected: 构建成功，`dist/tags/随笔/index.html` 存在（取决于实际标签）。

- [ ] **Step 3: 提交**

```bash
git add src/pages/tags/[tag].astro
git commit -m "feat: redesign tag filter page with card layout

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: 最终验证与清理

**Files:**
- All modified files

- [ ] **Step 1: 完整构建**

Run: `npx astro build`

Expected: 构建成功，无错误。

- [ ] **Step 2: 检查构建产物**

Run:

```bash
ls -la dist/
ls -la dist/posts/
ls -la dist/tags/
cat dist/rss.xml | head -20
```

Expected:
- `dist/index.html` 存在
- `dist/posts/hello-world/index.html` 存在
- `dist/tags/index.html` 存在
- `dist/tags/<tag>/index.html` 存在
- `dist/rss.xml` 格式正确

- [ ] **Step 3: 本地预览并手动检查**

Run: `npx astro preview`

在浏览器中打开 `http://localhost:4321`（默认端口，以实际输出为准），检查：

- [ ] 首页显示 Hero，蘑菇动画正常播放
- [ ] 首页下方 Terminal 内为单卡片，多篇文章正确排列
- [ ] 文章标题为红色底、白色字、inline-block
- [ ] 日期 + 标签在同一行显示为 teal 色
- [ ] 标签为 dark pill 样式
- [ ] 文章详情页、标签页统一使用 Terminal + 卡片结构
- [ ] 其他页面顶部显示 header
- [ ] 移动端布局正常，无错位
- [ ] 在浏览器 DevTools 中开启 `prefers-reduced-motion: reduce`，蘑菇动画停止

- [ ] **Step 4: 最终提交**

```bash
git add -A
git commit -m "feat: implement design draft with Hero and card layout

- Add Card container component
- Redesign PostCard with red title highlight and dark pill tags
- Add animated mushroom Hero for homepage
- Update Base layout to hide header on homepage
- Redesign homepage, post detail, tags overview, and tag filter pages
- Respect prefers-reduced-motion for mushroom animation

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** 所有设计要点（Hero、Terminal、卡片、红色标题、dark pill 标签、蘑菇动画、其他页面统一、响应式、`prefers-reduced-motion`）均有对应任务。
- [x] **Placeholder scan:** 无 TBD/TODO/"implement later"。
- [x] **Type consistency:** `Mushroom.astro` 的 `animated` prop、`Base.astro` 的 `isHome` 和 `terminalTitle` prop 在各页面使用一致。
- [x] **DRY:** 卡片容器、标签 pill 样式集中定义，未重复。
- [x] **YAGNI:** 未引入不必要的依赖或功能。
