# Blog Refactor — Astro Retro Terminal 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Gatsby v2 博客完整重构为 Astro SSG 站点，Retro Terminal 视觉风格，附带微信公众号格式化脚本。

**Architecture:** Astro 5 SSG 模式，Content Collections 管理 markdown 文章，手写 CSS Design System 实现 Terminal 美学，Shiki 服务端代码高亮，独立 TypeScript 脚本做公众号转换。

**Tech Stack:** Astro, TypeScript, CSS (Design System), Shiki, @astrojs/rss, marked（公众号脚本用）

---

### Task 1: 清理旧项目 + 初始化 Astro

**Files:**
- Remove: `gatsby-browser.js`, `gatsby-config.js`, `gatsby-node.js`, `package.json`, `src/` (entire), `docs/` (entire), `plan/` (entire), `.travis.yml`
- Create: `astro.config.ts`, `package.json`, `tsconfig.json`, `.gitignore`

- [ ] **Step 1: 清理旧文件**

```bash
rm -f gatsby-browser.js gatsby-config.js gatsby-node.js .travis.yml .prettierrc
rm -rf src/ docs/ plan/
```

- [ ] **Step 2: 创建 package.json**

```json
{
  "name": "century-blog",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "start": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "wechat": "npx tsx scripts/wechat-sync.ts"
  },
  "dependencies": {
    "@astrojs/rss": "^4.0.0",
    "@astrojs/sitemap": "^3.0.0",
    "astro": "^5.0.0"
  },
  "devDependencies": {
    "marked": "^15.0.0",
    "tsx": "^4.0.0"
  }
}
```

- [ ] **Step 3: 创建 tsconfig.json**

```json
{
  "extends": "astro/tsconfigs/strictest",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

- [ ] **Step 4: 创建 astro.config.ts**

```typescript
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://guoshencheng.com",
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      theme: "github-dark",
    },
  },
});
```

- [ ] **Step 5: 更新 .gitignore**

确保 `.gitignore` 包含以下内容：
```
node_modules/
dist/
.superpowers/
.DS_Store
```

```bash
cat >> .gitignore << 'EOF'
node_modules/
dist/
.superpowers/
.DS_Store
EOF
```

- [ ] **Step 6: 安装依赖并验证初始化**

```bash
npm install
```

Expected: 安装成功，无报错。

```bash
npx astro build
```

Expected: 构建成功（即使没有页面，也不应报错）。

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "chore: clean old Gatsby project and init Astro

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: 创建 CSS Design System

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/base.css`

- [ ] **Step 1: 创建设计 Token CSS**

`src/styles/tokens.css`:

```css
:root {
  /* Colors */
  --color-bg: #0D1117;
  --color-surface: #161B22;
  --color-accent: #E94560;
  --color-link: #16C79A;
  --color-link-hover: #1ae8b0;
  --color-text: #C9D1D9;
  --color-text-muted: #8B949E;
  --color-border: #30363D;
  --color-terminal-dot-red: #FF5F56;
  --color-terminal-dot-yellow: #FFBD2E;
  --color-terminal-dot-green: #27C93F;

  /* Typography */
  --font-mono: "JetBrains Mono", "Fira Code", "Cascadia Code", "Menlo", "Consolas", monospace;
  --font-text: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "WenQuanYi Micro Hei", sans-serif;
  --text-base: 15px;
  --text-sm: 12px;
  --text-lg: 20px;
  --text-xl: 28px;
  --leading-relaxed: 1.8;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* Borders */
  --radius: 6px;
  --border: 1px solid var(--color-border);
}
```

- [ ] **Step 2: 创建基础样式**

`src/styles/base.css`:

```css
@import "./tokens.css";

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: var(--text-base);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-mono);
  line-height: var(--leading-relaxed);
  min-height: 100vh;
  padding: var(--space-lg);
}

a {
  color: var(--color-link);
  text-decoration: none;
  transition: color 0.15s;
}

a:hover {
  color: var(--color-link-hover);
}

img {
  max-width: 100%;
  height: auto;
}

pre {
  overflow-x: auto;
}

code {
  font-family: var(--font-mono);
}

p {
  margin: 1em 0;
}

h1, h2, h3, h4 {
  color: var(--color-text);
  font-weight: 600;
  line-height: 1.4;
}

h1 { font-size: var(--text-xl); }
h2 { font-size: var(--text-lg); }
h3 { font-size: var(--text-base); }

blockquote {
  border-left: 3px solid var(--color-accent);
  padding-left: var(--space-md);
  margin: 1em 0;
  color: var(--color-text-muted);
}

ul, ol {
  padding-left: 1.5em;
  margin: 0.5em 0;
}

li {
  margin: 0.25em 0;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: var(--color-bg);
}

::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-muted);
}
```

- [ ] **Step 3: 提交**

```bash
git add src/styles/
git commit -m "feat: add CSS design tokens and base styles

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: 创建 Terminal 窗口组件

**Files:**
- Create: `src/components/Terminal.astro`

- [ ] **Step 1: 创建 Terminal.astro**

```astro
---
const { title = "century@blog:~" } = Astro.props;
---
<style>
  .terminal {
    background: var(--color-bg);
    border: var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    margin: 0 auto;
  }

  .terminal-bar {
    background: var(--color-surface);
    border-bottom: var(--border);
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .terminal-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .terminal-dot--red    { background: var(--color-terminal-dot-red); }
  .terminal-dot--yellow { background: var(--color-terminal-dot-yellow); }
  .terminal-dot--green  { background: var(--color-terminal-dot-green); }

  .terminal-bar__title {
    margin-left: 10px;
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  .terminal-body {
    padding: var(--space-lg);
  }

  @media (max-width: 640px) {
    .terminal-body {
      padding: var(--space-md);
    }
  }
</style>

<div class="terminal">
  <div class="terminal-bar">
    <span class="terminal-dot terminal-dot--red"></span>
    <span class="terminal-dot terminal-dot--yellow"></span>
    <span class="terminal-dot terminal-dot--green"></span>
    <span class="terminal-bar__title">{title}</span>
  </div>
  <div class="terminal-body">
    <slot />
  </div>
</div>
```

- [ ] **Step 2: 提交**

```bash
git add src/components/Terminal.astro
git commit -m "feat: add Terminal window component

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: 创建蘑菇 Logo 组件

**Files:**
- Create: `src/components/Mushroom.astro`

- [ ] **Step 1: 创建 Mushroom.astro**

```astro
---
export interface Props {
  size?: number;
}
const { size = 64 } = Astro.props;
const accentDeep = "rgba(233, 69, 96, 0.8)";
const accentLight = "rgba(233, 69, 96, 0.65)";
const cell = size / 8;
const viewBox = `0 0 ${size} ${size}`;
const rects = [
  [1,2],[2,2],[3,2],[4,2],
  [0,3],[1,3],[2,3],[3,3],[4,3],[5,3],
  [1,4],[2,4],[3,4],[4,4],
  [2,5],[3,5],[4,5],[5,5],
  [2,6],[3,6],[4,6],[5,6],
  [2,7],[3,7],[4,7],[5,7],
];
---

<svg
  viewBox={viewBox}
  width={size}
  height={size}
  class="mushroom"
  aria-label="Century's Blog Logo"
>
  {rects.map(([x, y]) => (
    <rect
      x={x * cell}
      y={y * cell}
      width={cell}
      height={cell}
      rx={cell * 0.15}
      ry={cell * 0.15}
      fill={y % 2 === 0
        ? (x % 2 === 0 ? accentDeep : accentLight)
        : (x % 2 === 0 ? accentLight : accentDeep)}
    />
  ))}
</svg>

<style>
  .mushroom {
    display: block;
    image-rendering: pixelated;
  }
</style>
```

- [ ] **Step 2: 提交**

```bash
git add src/components/Mushroom.astro
git commit -m "feat: add Mushroom logo component with neon color

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: 创建全局布局 Base.astro

**Files:**
- Create: `src/layouts/Base.astro`

- [ ] **Step 1: 创建 Base.astro**

```astro
---
import Terminal from "../components/Terminal.astro";
import Mushroom from "../components/Mushroom.astro";
import "../styles/base.css";

export interface Props {
  pageTitle?: string;
  description?: string;
}

const {
  pageTitle,
  description = "guoshencheng's personal blog",
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

    <main>
      <Terminal>
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

- [ ] **Step 2: 提交**

```bash
git add src/layouts/Base.astro
git commit -m "feat: add Base layout with nav and branding

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: 配置 Content Collection

**Files:**
- Create: `src/content/config.ts`
- Create: `src/content/blog/.gitkeep`

- [ ] **Step 1: 创建 Content Collection 配置**

`src/content/config.ts`:

```typescript
import { defineCollection, z } from "astro:content";

const blogCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.date(),
    tags: z.array(z.string()).default([]),
    description: z.string(),
  }),
});

export const collections = {
  blog: blogCollection,
};
```

- [ ] **Step 2: 创建 blog 目录**

```bash
mkdir -p src/content/blog
touch src/content/blog/.gitkeep
```

- [ ] **Step 3: 创建第一篇示例文章用于验证**

`src/content/blog/hello-world.md`:

```markdown
---
title: "你好，世界"
date: "2026-06-16"
tags: [随笔]
description: "新博客的第一篇文章"
---

# 你好，世界

这是我的新博客，基于 **Astro** 构建，采用 **Retro Terminal** 风格。

## 代码测试

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

console.log(greet("World"));
\`\`\`

## 引用测试

> 好的代码本身就是最好的文档。 — Steve McConnell

欢迎来到我的新家。 🍄
```

- [ ] **Step 4: 安装依赖后验证类型检查**

```bash
npx astro build
```

Expected: 构建成功（即使还没有页面渲染这些内容）。

- [ ] **Step 5: 提交**

```bash
git add src/content/
git commit -m "feat: configure Astro Content Collections for blog

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: 创建首页

**Files:**
- Create: `src/pages/index.astro`
- Create: `src/components/PostCard.astro`
- Create: `src/utils/formatDate.ts`

- [ ] **Step 1: 创建日期格式化工具**

`src/utils/formatDate.ts`:

```typescript
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
```

- [ ] **Step 2: 创建 PostCard 组件**

`src/components/PostCard.astro`:

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
  <time class="post-card__date" datetime={date.toISOString()}>
    [{formatDate(date)}]
  </time>
  <span class="post-card__prompt">$</span>
  <a href={`/posts/${post.slug}`} class="post-card__title">
    {title}
  </a>
  {description && (
    <p class="post-card__desc">{description}</p>
  )}
  {tags.length > 0 && (
    <div class="post-card__tags">
      {tags.map((tag) => (
        <a href={`/tags/${tag}`} class="post-card__tag">#{tag}</a>
      ))}
    </div>
  )}
</article>

<style>
  .post-card {
    padding: var(--space-md) 0;
    border-bottom: 1px solid var(--color-border);
  }

  .post-card:last-child {
    border-bottom: none;
  }

  .post-card__date {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
  }

  .post-card__prompt {
    color: var(--color-accent);
    margin: 0 var(--space-xs);
    font-size: var(--text-sm);
  }

  .post-card__title {
    font-size: var(--text-base);
    font-weight: 600;
  }

  .post-card__desc {
    margin: var(--space-xs) 0 0;
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    line-height: 1.6;
  }

  .post-card__tags {
    margin-top: var(--space-sm);
    display: flex;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }

  .post-card__tag {
    font-size: 11px;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  .post-card__tag:hover {
    color: var(--color-link);
  }
</style>
```

- [ ] **Step 3: 创建首页**

`src/pages/index.astro`:

```astro
---
import Base from "../layouts/Base.astro";
import PostCard from "../components/PostCard.astro";
import { getCollection } from "astro:content";

const posts = (await getCollection("blog"))
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
---

<Base description="guoshencheng's personal blog — Retro Terminal style">
  <div class="home-intro">
    <p>
      <span class="home-prompt">century@blog:~$</span>
      <span class="home-cmd"> ls -lt ~/posts/</span>
    </p>
    <p class="home-count">total {posts.length} posts</p>
  </div>

  <div class="post-list">
    {posts.length === 0 ? (
      <p class="home-empty">No posts yet. <span class="home-cursor">█</span></p>
    ) : (
      posts.map((post) => <PostCard post={post} />)
    )}
  </div>
</Base>

<style>
  .home-intro {
    margin-bottom: var(--space-lg);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
  }

  .home-prompt {
    color: var(--color-accent);
  }

  .home-cmd {
    color: var(--color-link);
  }

  .home-count {
    color: var(--color-text-muted);
  }

  .home-empty {
    color: var(--color-text-muted);
  }

  .home-cursor {
    color: var(--color-link);
    animation: blink 1s step-end infinite;
  }

  @keyframes blink {
    50% { opacity: 0; }
  }
</style>
```

- [ ] **Step 4: 构建验证**

```bash
npx astro build
```

Expected: 构建成功，dist/ 目录生成 index.html。

- [ ] **Step 5: 提交**

```bash
git add src/pages/index.astro src/components/PostCard.astro src/utils/formatDate.ts
git commit -m "feat: add homepage with post list in terminal style

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: 创建文章详情页

**Files:**
- Create: `src/pages/posts/[slug].astro`
- Create: `src/styles/markdown.css`

- [ ] **Step 1: 创建文章内容样式**

`src/styles/markdown.css`:

```css
/* Article typography */
.article h1 {
  font-size: var(--text-xl);
  margin-bottom: var(--space-lg);
  padding-bottom: var(--space-md);
  border-bottom: var(--border);
}

.article h2 {
  font-size: var(--text-lg);
  margin-top: var(--space-xl);
  margin-bottom: var(--space-md);
}

.article h3 {
  font-size: var(--text-base);
  margin-top: var(--space-lg);
  margin-bottom: var(--space-sm);
  color: var(--color-link);
}

.article p {
  margin: 1em 0;
  line-height: var(--leading-relaxed);
}

.article a {
  border-bottom: 1px dashed var(--color-link);
  padding-bottom: 1px;
}

.article a:hover {
  border-bottom-style: solid;
}

.article strong {
  color: #ffffff;
  font-weight: 600;
}

.article code {
  background: var(--color-surface);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 13px;
  color: var(--color-link);
}

.article pre {
  background: var(--color-surface) !important;
  border: var(--border);
  border-radius: var(--radius);
  margin: 1em 0;
  padding: var(--space-md);
  overflow-x: auto;
}

.article pre code {
  background: none;
  padding: 0;
  font-size: 13px;
  color: var(--color-text);
}

.article blockquote {
  border-left: 3px solid var(--color-accent);
  padding: var(--space-sm) var(--space-md);
  margin: 1em 0;
  background: var(--color-surface);
  border-radius: 0 var(--radius) var(--radius) 0;
  color: var(--color-text-muted);
}

.article blockquote p {
  margin: 0;
}

.article ul, .article ol {
  padding-left: 1.5em;
  margin: 0.5em 0;
}

.article li {
  margin: 0.25em 0;
}

.article img {
  border-radius: var(--radius);
  border: var(--border);
  margin: 1em 0;
}
```

- [ ] **Step 2: 创建文章详情页**

`src/pages/posts/[slug].astro`:

```astro
---
import { getCollection } from "astro:content";
import Base from "../../layouts/Base.astro";
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

<Base pageTitle={title} description={description}>
  <article class="article">
    <header class="article-header">
      <div class="article-meta">
        <span>[{formatDate(date)}]</span>
        <span class="article-prompt">$</span>
        <span class="article-cmd">cat {post.slug}.md</span>
      </div>
      <h1>{title}</h1>
      {description && (
        <p class="article-desc">{description}</p>
      )}
      {tags.length > 0 && (
        <div class="article-tags">
          {tags.map((tag) => (
            <a href={`/tags/${tag}`} class="article-tag">#{tag}</a>
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
</Base>

<style>
  .article {
    counter-reset: heading;
  }

  .article-meta {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    margin-bottom: var(--space-md);
  }

  .article-prompt {
    color: var(--color-accent);
    margin: 0 var(--space-xs);
  }

  .article-cmd {
    color: var(--color-link);
  }

  .article-desc {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    margin: var(--space-sm) 0 var(--space-md);
    line-height: 1.6;
    font-style: italic;
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

  .article-tags {
    display: flex;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }

  .article-tag {
    font-size: 11px;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    padding: 2px 8px;
    border: var(--border);
    border-radius: 3px;
    transition: color 0.15s, border-color 0.15s;
  }

  .article-tag:hover {
    color: var(--color-link);
    border-color: var(--color-link);
  }
</style>
```

- [ ] **Step 3: 构建验证**

```bash
npx astro build
```

Expected: 构建成功，dist/posts/hello-world/ 生成 index.html。

- [ ] **Step 4: 提交**

```bash
git add src/pages/posts/ src/styles/markdown.css
git commit -m "feat: add post detail page with markdown styling

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: 创建标签页

**Files:**
- Create: `src/pages/tags.astro`
- Create: `src/pages/tags/[tag].astro`
- Create: `src/components/TagCloud.astro`

- [ ] **Step 1: 创建 TagCloud 组件**

`src/components/TagCloud.astro`:

```astro
---
export interface Props {
  tags: string[];
}

const { tags } = Astro.props;
---

<div class="tag-cloud">
  {tags.map((tag) => (
    <a href={`/tags/${tag}`} class="tag-cloud__item">#{tag}</a>
  ))}
</div>

<style>
  .tag-cloud {
    display: flex;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }

  .tag-cloud__item {
    font-size: 11px;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    padding: 2px 8px;
    border: var(--border);
    border-radius: 3px;
    transition: color 0.15s, border-color 0.15s;
  }

  .tag-cloud__item:hover {
    color: var(--color-link);
    border-color: var(--color-link);
  }
</style>
```

- [ ] **Step 2: 创建标签总览页**

`src/pages/tags.astro`:

```astro
---
import Base from "../layouts/Base.astro";
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

<Base pageTitle="Tags" description="标签列表">
  <p class="tags-intro">
    <span class="tags-prompt">century@blog:~$</span>
    <span class="tags-cmd"> ls -l ~/tags/</span>
  </p>

  <div class="tags-list">
    {allTags.map(([tag, count]) => (
      <a href={`/tags/${tag}`} class="tag-row">
        <span class="tag-row__name">#{tag}</span>
        <span class="tag-row__count">{count} posts</span>
      </a>
    ))}
  </div>
</Base>

<style>
  .tags-intro {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    margin-bottom: var(--space-lg);
  }

  .tags-prompt { color: var(--color-accent); }
  .tags-cmd { color: var(--color-link); }

  .tags-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .tag-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-sm) var(--space-md);
    border: var(--border);
    border-radius: var(--radius);
    transition: border-color 0.15s;
  }

  .tag-row:hover {
    border-color: var(--color-link);
  }

  .tag-row__name {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
  }

  .tag-row__count {
    font-size: 11px;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }
</style>
```

- [ ] **Step 3: 创建标签筛选页**

`src/pages/tags/[tag].astro`:

```astro
---
import Base from "../../layouts/Base.astro";
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

<Base pageTitle={`#${tag}`} description={`${tag} 标签下的文章`}>
  <p class="tag-page-intro">
    <span class="tag-page-prompt">century@blog:~$</span>
    <span class="tag-page-cmd"> grep -rl "#{tag}" ~/posts/</span>
  </p>
  <p class="tag-page-count">found {posts.length} post(s)</p>

  <div class="tag-page-list">
    {posts.map((post) => <PostCard post={post} />)}
  </div>

  <p class="tag-page-back">
    <a href="/tags">cd ~/tags/</a>
  </p>
</Base>

<style>
  .tag-page-intro {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    margin-bottom: var(--space-xs);
  }

  .tag-page-prompt { color: var(--color-accent); }
  .tag-page-cmd { color: var(--color-link); }

  .tag-page-count {
    color: var(--color-text-muted);
    font-size: var(--text-sm);
    margin-bottom: var(--space-lg);
  }

  .tag-page-back {
    margin-top: var(--space-lg);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
  }
</style>
```

- [ ] **Step 4: 构建验证**

```bash
npx astro build
```

Expected: 构建成功，dist/tags/ 下生成标签页面。

- [ ] **Step 5: 提交**

```bash
git add src/components/TagCloud.astro src/pages/tags.astro src/pages/tags/
git commit -m "feat: add tags overview and filter pages

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: 创建 RSS Feed

**Files:**
- Create: `src/pages/rss.xml.ts`

- [ ] **Step 1: 创建 RSS 生成端点**

`src/pages/rss.xml.ts`:

```typescript
import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const posts = (await getCollection("blog"))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title: "Century's World",
    description: "guoshencheng's personal blog",
    site: context.site ?? "https://guoshencheng.com",
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/posts/${post.slug}`,
    })),
    customData: `<language>zh-CN</language>`,
  });
}
```

- [ ] **Step 2: 构建验证**

```bash
npx astro build
```

Expected: dist/rss.xml 生成有效的 RSS XML。

- [ ] **Step 3: 提交**

```bash
git add src/pages/rss.xml.ts
git commit -m "feat: add RSS feed generation

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 11: 创建微信公众号同步脚本

**Files:**
- Create: `scripts/wechat-sync.ts`

- [ ] **Step 1: 创建公众号转换脚本**

`scripts/wechat-sync.ts`:

```typescript
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";

/**
 * Convert Astro blog markdown to WeChat-compatible HTML.
 * Usage: npx tsx scripts/wechat-sync.ts <path-to-markdown>
 */

const BLOG_URL = "https://guoshencheng.com";

function parseFrontmatter(raw: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: raw };
  const frontmatter: Record<string, unknown> = {};
  match[1].split("\n").forEach((line) => {
    const [key, ...rest] = line.split(":");
    if (key && rest.length) {
      const value = rest.join(":").trim();
      // Parse YAML array: [a, b, c]
      if (value.startsWith("[") && value.endsWith("]")) {
        frontmatter[key.trim()] = value
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""));
      } else {
        frontmatter[key.trim()] = value.replace(/^["']|["']$/g, "");
      }
    }
  });
  return { frontmatter, body: match[2] };
}

function convertMarkdownToWechat(md: string): string {
  let html = "";

  // Split into blocks separated by double newlines
  const blocks = md.split(/\n\n+/);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Code blocks (fenced)
    if (trimmed.startsWith("```")) {
      const lines = trimmed.split("\n");
      const lang = lines[0].replace("```", "").trim();
      const code = lines.slice(1, -1).join("\n");
      const escapedCode = escapeHtml(code);
      if (lang) {
        html += `<pre style="background:#282c34;color:#abb2bf;padding:16px;border-radius:4px;overflow-x:auto;font-size:13px;line-height:1.6;font-family:Menlo,Monaco,Consolas,monospace;"><code>${escapedCode}</code></pre>\n`;
      } else {
        html += `<pre style="background:#282c34;color:#abb2bf;padding:16px;border-radius:4px;overflow-x:auto;font-size:13px;line-height:1.6;font-family:Menlo,Monaco,Consolas,monospace;">${escapedCode}</pre>\n`;
      }
      continue;
    }

    // Headings
    if (trimmed.startsWith("#### ")) {
      html += `<h4 style="font-size:15px;font-weight:600;margin:1.5em 0 0.5em;">${processInline(trimmed.slice(5))}</h4>\n`;
      continue;
    }
    if (trimmed.startsWith("### ")) {
      html += `<h4 style="font-size:15px;font-weight:600;margin:1.5em 0 0.5em;">${processInline(trimmed.slice(4))}</h4>\n`;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      html += `<h3 style="font-size:18px;font-weight:600;margin:1.5em 0 0.5em;">${processInline(trimmed.slice(3))}</h3>\n`;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      html += `<h2 style="font-size:22px;font-weight:700;margin:1em 0 0.5em;text-align:center;">${processInline(trimmed.slice(2))}</h2>\n`;
      continue;
    }

    // Blockquotes
    if (trimmed.startsWith("> ")) {
      const quoteLines = trimmed.split("\n").map((l) => l.replace(/^> ?/, ""));
      const quoteContent = processInline(quoteLines.join("\n"));
      html += `<blockquote style="border-left:3px solid #e94560;padding:8px 16px;margin:1em 0;color:#666;background:#f9f9f9;border-radius:0 4px 4px 0;">${quoteContent}</blockquote>\n`;
      continue;
    }

    // Unordered lists
    if (trimmed.match(/^[-*]\s/m)) {
      html += `<ul style="padding-left:1.5em;margin:0.5em 0;">\n`;
      trimmed.split("\n").forEach((line) => {
        const content = line.replace(/^[-*]\s+/, "");
        if (content.trim()) {
          html += `<li style="margin:0.25em 0;line-height:2;">${processInline(content)}</li>\n`;
        }
      });
      html += `</ul>\n`;
      continue;
    }

    // Ordered lists
    if (trimmed.match(/^\d+\.\s/m)) {
      html += `<ol style="padding-left:1.5em;margin:0.5em 0;">\n`;
      trimmed.split("\n").forEach((line) => {
        const content = line.replace(/^\d+\.\s+/, "");
        if (content.trim()) {
          html += `<li style="margin:0.25em 0;line-height:2;">${processInline(content)}</li>\n`;
        }
      });
      html += `</ol>\n`;
      continue;
    }

    // Regular paragraphs
    html += `<p style="line-height:2;margin:1em 0;">${processInline(trimmed)}</p>\n`;
  }

  return html;
}

function processInline(text: string): string {
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic
  text = text.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Inline code
  text = text.replace(/`([^`]+)`/g,
    '<code style="background:#f0f0f0;padding:2px 6px;border-radius:3px;font-size:13px;color:#e94560;font-family:Menlo,Monaco,Consolas,monospace;">$1</code>'
  );
  // Links (handle both [text](url) and bare URLs)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#16c79a;">$1</a>');
  // Images -- placeholder
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" style="max-width:100%;border-radius:4px;margin:1em 0;" /><!-- TODO: upload to WeChat and replace src -->'
  );
  return text;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// --- Main ---
const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: npx tsx scripts/wechat-sync.ts <path-to-markdown>");
  process.exit(1);
}

const raw = readFileSync(inputPath, "utf-8");
const { frontmatter, body } = parseFrontmatter(raw);
const title = String(frontmatter.title ?? basename(inputPath, ".md"));
const slug = basename(inputPath, ".md").replace(/^\d{4}-\d{2}-\d{2}-/, "");

const contentHtml = convertMarkdownToWechat(body);

const fullHtml = `<!--
  WeChat Article HTML
  Title: ${title}
  Source: ${BLOG_URL}/posts/${slug}
  Generated: ${new Date().toISOString()}
-->
<section style="max-width:680px;margin:0 auto;font-size:15px;color:#333;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;line-height:1.8;">

  ${contentHtml}

  <hr style="border:none;border-top:1px solid #eee;margin:2em 0;" />
  <p style="color:#999;font-size:13px;text-align:center;">
    原文链接：<a href="${BLOG_URL}/posts/${slug}" style="color:#16c79a;">${BLOG_URL}/posts/${slug}</a>
  </p>
</section>`;

const outDir = join(import.meta.dirname ?? __dirname, "output");
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}
const outPath = join(outDir, `${slug}.html`);
writeFileSync(outPath, fullHtml, "utf-8");

console.log(`✅ WeChat HTML generated: ${outPath}`);
console.log(`   Title: ${title}`);
console.log(`   Open this file and paste into WeChat editor.`);
console.log(`   Remember to: upload images to WeChat media library first.`);
```

- [ ] **Step 2: 验证脚本可执行**

```bash
npx tsx scripts/wechat-sync.ts src/content/blog/hello-world.md
```

Expected: 输出 `✅ WeChat HTML generated: scripts/output/hello-world.html`，检查生成的 HTML 文件内容是否正确。

- [ ] **Step 3: 提交**

```bash
git add scripts/wechat-sync.ts scripts/output/
git commit -m "feat: add WeChat subscription article sync script

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 12: 最终验证与清理

- [ ] **Step 1: 完整构建**

```bash
npx astro build
```

Expected: 构建成功，无 TypeScript 或构建错误。

- [ ] **Step 2: 检查构建产物**

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
- `dist/tags/随笔/index.html` 存在
- `dist/rss.xml` 正确（包含 hello-world 文章）

- [ ] **Step 3: 本地预览**

```bash
npx astro preview
```

手动检查以下页面：
- [ ] 首页 (`/`) — 显示文章列表，Terminal 窗口正常
- [ ] 文章页 (`/posts/hello-world`) — 内容渲染正确，代码高亮正常
- [ ] 标签总览 (`/tags`) — 显示所有标签
- [ ] 标签筛选 (`/tags/随笔`) — 过滤正确
- [ ] RSS (`/rss.xml`) — XML 格式正确
- [ ] 响应式 — 手机宽度下布局正常

- [ ] **Step 4: 确认旧文件已清理**

```bash
# 确认这些旧文件/目录已不存在
ls gatsby-config.js 2>/dev/null && echo "STILL EXISTS" || echo "OK: removed"
ls docs/ 2>/dev/null && echo "STILL EXISTS" || echo "OK: removed"
ls src/components/header.js 2>/dev/null && echo "STILL EXISTS" || echo "OK: removed"
```

- [ ] **Step 5: 最终提交**

```bash
git add -A
git commit -m "chore: finalize Astro blog refactor

- Migrated from Gatsby v2 to Astro SSG
- Retro Terminal visual style with neon accents
- RSS feed, tag system, WeChat sync script
- Removed all legacy Gatsby files and old articles

Co-Authored-By: Claude <noreply@anthropic.com>"
```
