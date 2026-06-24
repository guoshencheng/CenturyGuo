# Blog SEO Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Century's World 博客（blog.shemu.top）补齐 OG/Twitter Card、canonical、JSON-LD 结构化数据、robots.txt、RSS author、图片懒加载、基础可访问性，达到社交分享卡片、富媒体片段、键盘可达性的深度 SEO 效果。

**Architecture:** 新增 `src/components/SeoHead.astro`（单一 head 渲染入口）+ `src/utils/seo.ts`（纯函数工具）+ `src/utils/rehype-img-lazy.ts`（自写 rehype 插件）。所有 SEO meta 集中在 `<SeoHead>`，由页面通过结构化 props 传入。CSS 与 a11y 改动归 `Base.astro` + `base.css`。无新 npm 依赖。

**Tech Stack:** Astro 5, TypeScript, Node.js 内置 `node:test`（utils 单元测试）, 自写 rehype 插件（unified/HAST 协议）, 现有 `@astrojs/rss` + `@astrojs/sitemap`.

**Spec:** `docs/superpowers/specs/2026-06-24-blog-seo-design.md`

---

## File Structure

**Create:**
- `src/utils/seo.ts` — 纯函数：URL/图片提取/OG/JSON-LD 构建
- `src/utils/seo.test.ts` — 单元测试（node:test）
- `src/utils/rehype-img-lazy.ts` — rehype 插件：图片懒加载
- `src/components/SeoHead.astro` — `<head>` 集中渲染器
- `public/robots.txt` — 搜索引擎指令
- `public/og-default.png` — 默认 OG 占位图（1200×630）

**Modify:**
- `astro.config.ts` — 注册 rehype 插件
- `src/layouts/Base.astro` — 接入 SeoHead + a11y 改造
- `src/styles/base.css` — focus-visible、skip-link、img 兜底
- `src/pages/index.astro` — 传 seo props
- `src/pages/posts/[slug].astro` — 传 seo props（封面图提取）
- `src/pages/tags.astro` — 传 seo props
- `src/pages/tags/[tag].astro` — 传 seo props
- `src/pages/rss.xml.ts` — 加 author/managingEditor/webMaster

---

## Task 1: 设置测试运行脚本 + 编写 seo.ts 测试（红）

**Files:**
- Modify: `package.json:5-13`
- Create: `src/utils/seo.test.ts`

- [ ] **Step 1: 在 package.json 加 test 脚本**

修改 `package.json` 的 `scripts` 段：

```json
"scripts": {
  "dev": "astro dev",
  "start": "astro dev",
  "build": "astro build",
  "preview": "astro preview",
  "test": "node --test --experimental-strip-types src/**/*.test.ts",
  "wechat": "tsx scripts/wechat-sync.ts",
  "wechat:all": "tsx scripts/wechat-sync.ts --all",
  "wechat:open": "open scripts/output"
},
```

注意：Node 22+ 原生支持 `--experimental-strip-types`，无需 tsx 编译。

- [ ] **Step 2: 创建测试文件 `src/utils/seo.test.ts`**

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  absoluteUrl,
  extractFirstImage,
  truncateDescription,
  buildOgImage,
  buildBlogPostingJsonLd,
  buildWebSiteJsonLd,
} from "./seo.ts";

test("absoluteUrl: 相对路径转绝对 URL", () => {
  const site = new URL("https://blog.shemu.top");
  assert.equal(
    absoluteUrl("/og-default.png", site),
    "https://blog.shemu.top/og-default.png"
  );
});

test("absoluteUrl: 已是绝对 URL 原样返回", () => {
  const site = new URL("https://blog.shemu.top");
  assert.equal(
    absoluteUrl("https://cdn.example.com/img.png", site),
    "https://cdn.example.com/img.png"
  );
});

test("absoluteUrl: 非法路径抛 TypeError", () => {
  const site = new URL("https://blog.shemu.top");
  assert.throws(
    () => absoluteUrl("not a url with spaces", site),
    TypeError
  );
});

test("extractFirstImage: 从 markdown 提取第一张图片", () => {
  const md = `# Title

Some text.

![cover](/images/blog/foo/01.webp)

![second](/images/blog/foo/02.webp)
`;
  assert.equal(extractFirstImage(md), "/images/blog/foo/01.webp");
});

test("extractFirstImage: 无图返回 undefined", () => {
  const md = `# Title

Just text, no images here.
`;
  assert.equal(extractFirstImage(md), undefined);
});

test("extractFirstImage: 跳过 HTML 内嵌 img，只扫 markdown 语法", () => {
  const md = `<img src="/should/skip.png" />

![real](/should/take.webp)
`;
  assert.equal(extractFirstImage(md), "/should/take.webp");
});

test("truncateDescription: 短文本原样返回", () => {
  assert.equal(truncateDescription("Short.", 155), "Short.");
});

test("truncateDescription: 长文本在句号边界截断", () => {
  const text = "A".repeat(100) + ". " + "B".repeat(100);
  const result = truncateDescription(text, 120);
  assert.ok(result.length <= 121);
  assert.ok(result.endsWith("..."));
});

test("buildOgImage: 有 image 用传入的", () => {
  const site = new URL("https://blog.shemu.top");
  const result = buildOgImage({
    image: "/images/blog/x/01.webp",
    site,
  });
  assert.equal(result.url, "https://blog.shemu.top/images/blog/x/01.webp");
  assert.equal(result.width, 1200);
  assert.equal(result.height, 630);
});

test("buildOgImage: 无 image fallback 到 og-default.png", () => {
  const site = new URL("https://blog.shemu.top");
  const result = buildOgImage({ site });
  assert.equal(result.url, "https://blog.shemu.top/og-default.png");
});

test("buildBlogPostingJsonLd: 必需字段都输出", () => {
  const json = buildBlogPostingJsonLd({
    title: "Hello",
    description: "World",
    url: "https://blog.shemu.top/posts/hello",
    publishedTime: new Date("2026-01-01T00:00:00Z"),
    author: "Guo Shencheng",
    tags: ["a", "b"],
    imageUrl: "https://blog.shemu.top/og-default.png",
  });
  const parsed = JSON.parse(json);
  assert.equal(parsed["@type"], "BlogPosting");
  assert.equal(parsed.headline, "Hello");
  assert.equal(parsed.author.name, "Guo Shencheng");
  assert.equal(parsed.keywords, "a,b");
  assert.equal(parsed.datePublished, "2026-01-01T00:00:00.000Z");
});

test("buildBlogPostingJsonLd: 缺 title 抛 Error", () => {
  assert.throws(
    () =>
      buildBlogPostingJsonLd({
        title: "",
        description: "x",
        url: "https://x.com",
        author: "y",
        tags: [],
      }),
    /title/
  );
});

test("buildWebSiteJsonLd: 输出 WebSite schema", () => {
  const json = buildWebSiteJsonLd({
    siteName: "Century's World",
    description: "personal blog",
    siteUrl: "https://blog.shemu.top",
    authorName: "Guo Shencheng",
    authorUrl: "https://blog.shemu.top",
  });
  const parsed = JSON.parse(json);
  assert.equal(parsed["@type"], "WebSite");
  assert.equal(parsed.name, "Century's World");
  assert.equal(parsed.inLanguage, "zh-CN");
  assert.equal(parsed.author["@type"], "Person");
});
```

- [ ] **Step 3: 运行测试，确认全部失败（红）**

```bash
npm test
```

Expected: FAIL — `Cannot find module './seo.ts'` 或 `does not provide an export named 'absoluteUrl'`

- [ ] **Step 4: Commit**

```bash
git add package.json src/utils/seo.test.ts
git commit -m "test(seo): add failing unit tests for utils/seo.ts"
```

---

## Task 2: 实现 `src/utils/seo.ts`（绿）

**Files:**
- Create: `src/utils/seo.ts`

- [ ] **Step 1: 实现 utils/seo.ts**

```typescript
const DEFAULT_AUTHOR = "Guo Shencheng";

export function absoluteUrl(path: string, site: URL): string {
  if (path.includes(" ")) {
    throw new TypeError(`absoluteUrl: invalid path "${path}"`);
  }
  try {
    const u = new URL(path);
    return u.href;
  } catch {
    return new URL(path, site).href;
  }
}

export function extractFirstImage(markdownBody: string): string | undefined {
  const match = markdownBody.match(/!\[.*?\]\(([^)]+)\)/);
  return match?.[1];
}

export function truncateDescription(text: string, max = 155): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastPunct = Math.max(
    slice.lastIndexOf("。"),
    slice.lastIndexOf(". "),
    slice.lastIndexOf(" "),
  );
  const cut = lastPunct > 0 ? slice.slice(0, lastPunct) : slice;
  return cut + "...";
}

export function buildOgImage(props: {
  image?: string;
  site: URL;
}): { url: string; width: 1200; height: 630; alt: string } {
  const url = props.image
    ? absoluteUrl(props.image, props.site)
    : absoluteUrl("/og-default.png", props.site);
  return {
    url,
    width: 1200,
    height: 630,
    alt: "Century's World — guoshencheng's personal blog",
  };
}

export function buildBlogPostingJsonLd(input: {
  title: string;
  description: string;
  url: string;
  publishedTime?: Date;
  modifiedTime?: Date;
  author?: string;
  tags?: string[];
  imageUrl?: string;
}): string {
  if (!input.title) throw new Error("buildBlogPostingJsonLd: title required");
  if (!input.url) throw new Error("buildBlogPostingJsonLd: url required");

  const author = input.author ?? DEFAULT_AUTHOR;
  const published = input.publishedTime?.toISOString();
  const modified = (input.modifiedTime ?? input.publishedTime)?.toISOString();

  const obj: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.title,
    description: input.description,
    author: { "@type": "Person", name: author, url: "https://blog.shemu.top" },
    publisher: { "@type": "Person", name: author, url: "https://blog.shemu.top" },
    mainEntityOfPage: { "@type": "WebPage", "@id": input.url },
  };
  if (published) obj.datePublished = published;
  if (modified) obj.dateModified = modified;
  if (input.tags && input.tags.length > 0) obj.keywords = input.tags.join(",");
  if (input.imageUrl) obj.image = input.imageUrl;

  return JSON.stringify(obj);
}

export function buildWebSiteJsonLd(input: {
  siteName: string;
  description: string;
  siteUrl: string;
  authorName?: string;
  authorUrl?: string;
}): string {
  if (!input.siteName) throw new Error("buildWebSiteJsonLd: siteName required");
  if (!input.siteUrl) throw new Error("buildWebSiteJsonLd: siteUrl required");

  const author = input.authorName ?? DEFAULT_AUTHOR;
  const obj: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: input.siteName,
    description: input.description,
    url: input.siteUrl,
    inLanguage: "zh-CN",
    author: {
      "@type": "Person",
      name: author,
      url: input.authorUrl ?? "https://blog.shemu.top",
    },
  };
  return JSON.stringify(obj);
}
```

- [ ] **Step 2: 运行测试，确认全部通过（绿）**

```bash
npm test
```

Expected: PASS — 所有 13 个测试通过

- [ ] **Step 3: Commit**

```bash
git add src/utils/seo.ts
git commit -m "feat(seo): implement utils/seo.ts pure functions"
```

---

## Task 3: 实现 `src/utils/rehype-img-lazy.ts`

**Files:**
- Create: `src/utils/rehype-img-lazy.ts`

- [ ] **Step 1: 实现 rehype 插件**

```typescript
import type { Root, Element } from "hast";

export function rehypeImgLazy(): (tree: Root) => void {
  return (tree: Root) => {
    walk(tree);
  };
}

function walk(node: Root | Element): void {
  if ("children" in node) {
    for (const child of node.children) {
      if (child.type === "element") {
        if (child.tagName === "img") {
          try {
            patchImg(child);
          } catch (err) {
            console.warn(
              `[rehype-img-lazy] failed to patch img:`,
              (err as Error).message,
            );
          }
        } else {
          walk(child);
        }
      }
    }
  }
}

function patchImg(node: Element): void {
  const props = node.properties ?? {};
  if (props.loading === undefined) props.loading = "lazy";
  if (props.decoding === undefined) props.decoding = "async";
  if (props.alt === undefined) {
    console.warn(
      `[rehype-img-lazy] <img> missing alt attribute: ${JSON.stringify(props)}`,
    );
  }
  node.properties = props;
}
```

- [ ] **Step 2: 在 `astro.config.ts` 注册插件**

修改 `astro.config.ts`：

```typescript
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { rehypeImgLazy } from "./src/utils/rehype-img-lazy";

export default defineConfig({
  site: "https://blog.shemu.top",
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      theme: "github-dark",
    },
    rehypePlugins: [rehypeImgLazy],
  },
});
```

- [ ] **Step 3: 跑 dev server，确认插件生效**

```bash
npm run dev
```

浏览器访问任一含图文章（如 http://localhost:4321/posts/agent-llm-cache-burn-money-guide）。View Page Source，搜索 `<img`，确认至少一张图片有 `loading="lazy"` 和 `decoding="async"`。

Expected: 看到 `<img src="..." loading="lazy" decoding="async" alt="...">`。

- [ ] **Step 4: 关闭 dev server**

```bash
# 用 Ctrl+C 关闭，或运行下一任务前 kill
pkill -f "astro dev" || true
```

- [ ] **Step 5: Commit**

```bash
git add src/utils/rehype-img-lazy.ts astro.config.ts
git commit -m "feat(seo): add rehype plugin for image lazy loading"
```

---

## Task 4: 实现 `src/components/SeoHead.astro`

**Files:**
- Create: `src/components/SeoHead.astro`

- [ ] **Step 1: 创建 SeoHead.astro**

```astro
---
import {
  buildBlogPostingJsonLd,
  buildOgImage,
  buildWebSiteJsonLd,
} from "../utils/seo";

export interface Props {
  title: string;
  description: string;
  type?: "website" | "article";
  publishedTime?: Date;
  modifiedTime?: Date;
  author?: string;
  tags?: string[];
  image?: string;
  imageAlt?: string;
  noindex?: boolean;
}

const {
  title,
  description,
  type = "website",
  publishedTime,
  modifiedTime,
  author = "Guo Shencheng",
  tags = [],
  image,
  imageAlt,
  noindex = false,
} = Astro.props;

const site = Astro.site ?? new URL("https://blog.shemu.top");
const siteTitle = "Century's World";
const fullTitle = `${title} — ${siteTitle}`;
const canonicalUrl = Astro.url.href;

const og = buildOgImage({ image, site });

const ogImageAlt = imageAlt ?? og.alt;

const jsonLd =
  type === "article"
    ? buildBlogPostingJsonLd({
        title,
        description,
        url: canonicalUrl,
        publishedTime,
        modifiedTime,
        author,
        tags,
        imageUrl: og.url,
      })
    : buildWebSiteJsonLd({
        siteName: siteTitle,
        description,
        siteUrl: site.href,
        authorName: author,
      });
---

<title>{fullTitle}</title>
<meta name="description" content={description} />
<meta
  name="robots"
  content={noindex
    ? "noindex, nofollow"
    : "index, follow, max-snippet:-1, max-image-preview:large"}
/>
<link rel="canonical" href={canonicalUrl} />

<meta property="og:title" content={fullTitle} />
<meta property="og:description" content={description} />
<meta property="og:type" content={type} />
<meta property="og:url" content={canonicalUrl} />
<meta property="og:site_name" content={siteTitle} />
<meta property="og:locale" content="zh_CN" />
<meta property="og:image" content={og.url} />
<meta property="og:image:width" content={String(og.width)} />
<meta property="og:image:height" content={String(og.height)} />
<meta property="og:image:alt" content={ogImageAlt} />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={fullTitle} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={og.url} />
<meta name="twitter:image:alt" content={ogImageAlt} />

{type === "article" && publishedTime && (
  <meta property="article:published_time" content={publishedTime.toISOString()} />
)}
{type === "article" && modifiedTime && (
  <meta property="article:modified_time" content={modifiedTime.toISOString()} />
)}
{type === "article" && (
  <meta property="article:author" content={author} />
)}
{type === "article" && tags.map((tag) => (
  <meta property="article:tag" content={tag} />
))}

<link rel="sitemap" href="/sitemap-index.xml" />

<script type="application/ld+json" set:html={jsonLd} />
```

- [ ] **Step 2: 暂时接入 `index.astro` 验证（将在 Task 6 正式接入）**

不需要改动其他文件 — 这步仅做 TypeScript 类型检查：

```bash
npx astro check
```

Expected: PASS（无类型错误）。如果尚未安装 `astro check`，跳过此步骤，进入 Task 5。

- [ ] **Step 3: Commit**

```bash
git add src/components/SeoHead.astro
git commit -m "feat(seo): add SeoHead component for centralized meta rendering"
```

---

## Task 5: 改造 `Base.astro`（接入 SeoHead + a11y）

**Files:**
- Modify: `src/layouts/Base.astro:6-64`

- [ ] **Step 1: 替换 Base.astro 的 Props 块（lines 6-22）**

把：

```typescript
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
```

替换为：

```typescript
export interface Props {
  terminalTitle?: string;
  isHome?: boolean;
  seo: {
    title: string;
    description: string;
    type?: "website" | "article";
    image?: string;
    imageAlt?: string;
    publishedTime?: Date;
    modifiedTime?: Date;
    author?: string;
    tags?: string[];
    noindex?: boolean;
  };
}

const { terminalTitle, isHome = false, seo } = Astro.props;
```

- [ ] **Step 2: 替换 head 区（lines 25-40）**

把：

```astro
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content={description} />
    <title>{fullTitle}</title>
    <link rel="sitemap" href="/sitemap-index.xml" />
    {import.meta.env.PROD && (
      <script
        is:inline
        async
        defer
        data-website-id="4f718f10-3c3a-4c5d-8df0-fbd77f26845e"
        src="https://umami.shemu.top/script.js"
      />
    )}
  </head>
```

替换为：

```astro
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <SeoHead {...seo} />
    {import.meta.env.PROD && (
      <script
        is:inline
        async
        defer
        data-website-id="4f718f10-3c3a-4c5d-8df0-fbd77f26845e"
        src="https://umami.shemu.top/script.js"
      />
    )}
  </head>
```

- [ ] **Step 3: 在 import 段加 SeoHead import（Base.astro:1-4）**

把：

```typescript
import Terminal from "../components/Terminal.astro";
import Mushroom from "../components/Mushroom.astro";
import "../styles/base.css";
```

替换为：

```typescript
import Terminal from "../components/Terminal.astro";
import Mushroom from "../components/Mushroom.astro";
import SeoHead from "../components/SeoHead.astro";
import "../styles/base.css";
```

- [ ] **Step 4: 加 a11y 跳过链接 + nav aria-label（lines 42-55）**

把：

```astro
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
```

替换为：

```astro
  <body>
    <a href="#main-content" class="skip-link">跳到主要内容</a>
    {!isHome && (
      <header class="site-header">
        <a href="/" class="site-brand" title="Home">
          <Mushroom size={40} />
          <span class="site-brand__text">Century's World</span>
        </a>
        <nav class="site-nav" aria-label="主导航">
          <a href="/">~/posts</a>
          <a href="/tags">~/tags</a>
          <a href="/rss.xml">~/rss</a>
        </nav>
      </header>
    )}

    <main id="main-content" tabindex="-1">
```

- [ ] **Step 5: 验证 Base.astro 引用已无遗留 `siteTitle` / `fullTitle`**

`Base.astro` 内已无 `siteTitle`（Mushroom 旁的文字已硬编码为 "Century's World"），`fullTitle` 不再需要。

```bash
grep -n "siteTitle\|fullTitle" src/layouts/Base.astro
```

Expected: 0 行匹配。

- [ ] **Step 6: Commit**

```bash
git add src/layouts/Base.astro
git commit -m "refactor(layout): integrate SeoHead and add a11y skip link"
```

---

## Task 6: 更新 `src/styles/base.css`（a11y + img 兜底）

**Files:**
- Modify: `src/styles/base.css`

- [ ] **Step 1: 在文件末尾追加新样式**

在 `src/styles/base.css` 的最后追加：

```css
img {
  max-width: 100%;
  height: auto;
}

:focus-visible {
  outline: 2px solid var(--color-link);
  outline-offset: 2px;
}

.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  background: var(--color-accent);
  color: var(--color-card-bg);
  padding: 8px 16px;
  font-family: var(--font-mono);
  z-index: 100;
  text-decoration: none;
}

.skip-link:focus {
  left: 0;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/base.css
git commit -m "style(a11y): add skip-link, focus-visible, and img max-width fallback"
```

---

## Task 7: 改造 4 个页面传入 `seo` props

**Files:**
- Modify: `src/pages/index.astro:12-17`
- Modify: `src/pages/posts/[slug].astro:21-25`
- Modify: `src/pages/tags.astro:16`
- Modify: `src/pages/tags/[tag].astro:24-28`

- [ ] **Step 1: 修改 `src/pages/index.astro`**

把 `<Base>` 调用块（lines 12-17）：

```astro
<Base
  isHome
  terminalTitle="century@blog:~/posts"
  description="guoshencheng's personal blog — Retro Terminal style"
>
```

替换为：

```astro
<Base
  isHome
  terminalTitle="century@blog:~/posts"
  seo={{
    title: "Posts",
    description: "guoshencheng's personal blog — Retro Terminal style",
    type: "website",
  }}
>
```

- [ ] **Step 2: 修改 `src/pages/posts/[slug].astro`**

在文件顶部 import 段（line 1 附近）加 import：

```typescript
import { extractFirstImage } from "../../utils/seo";
```

修改 `<Base>` 调用块（lines 21-25）：

把：

```astro
<Base
  pageTitle={title}
  description={description}
  terminalTitle={`century@blog:~/posts/${post.slug}.md`}
>
```

替换为：

```astro
<Base
  terminalTitle={`century@blog:~/posts/${post.slug}.md`}
  seo={{
    title,
    description,
    type: "article",
    publishedTime: date,
    tags,
    image: extractFirstImage(post.body),
  }}
>
```

- [ ] **Step 3: 修改 `src/pages/tags.astro`**

把 `<Base>` 调用（line 16）：

```astro
<Base pageTitle="Tags" description="标签列表" terminalTitle="century@blog:~/tags">
```

替换为：

```astro
<Base
  terminalTitle="century@blog:~/tags"
  seo={{
    title: "Tags",
    description: "所有文章标签 — 按文章数量排序",
    type: "website",
  }}
>
```

- [ ] **Step 4: 修改 `src/pages/tags/[tag].astro`**

把 `<Base>` 调用（lines 24-28）：

```astro
<Base
  pageTitle={`#${tag}`}
  description={`${tag} 标签下的文章`}
  terminalTitle={`century@blog:~/tags/${tag}`}
>
```

替换为：

```astro
<Base
  terminalTitle={`century@blog:~/tags/${tag}`}
  seo={{
    title: `#${tag}`,
    description: `标签 ${tag} 下的所有文章`,
    type: "website",
  }}
>
```

- [ ] **Step 5: 跑 build，验证全部页面构建成功**

```bash
npm run build
```

Expected: BUILD SUCCESS — 无 TypeScript 报错，所有页面生成。

如果失败，错误通常是 `seo` prop 类型不匹配。检查报错指向的页面，按 Props 接口修正。

- [ ] **Step 6: 抽查一篇文章 dist HTML**

```bash
grep -E 'og:|twitter:|"@type"' dist/posts/agent-llm-cache-burn-money-guide/index.html | head -20
```

Expected: 看到多个 `og:title` / `og:image` / `og:url` 和 `"@type":"BlogPosting"`。

- [ ] **Step 7: 抽查首页 dist HTML**

```bash
grep -E 'og:|twitter:|"@type"' dist/index.html | head -10
```

Expected: 看到 `"@type":"WebSite"` 和 `og:type` = `website`。

- [ ] **Step 8: Commit**

```bash
git add src/pages/index.astro src/pages/posts/\[slug\].astro src/pages/tags.astro src/pages/tags/\[tag\].astro
git commit -m "feat(seo): pass seo props from all pages to Base layout"
```

---

## Task 8: 增强 RSS（author + managingEditor + webMaster）

**Files:**
- Modify: `src/pages/rss.xml.ts:9-20`

- [ ] **Step 1: 替换 RSS 配置**

把 `src/pages/rss.xml.ts` 的 `GET` 函数完整替换：

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
    site: context.site ?? "https://blog.shemu.top",
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/posts/${post.slug}`,
      author: "guoshencheng@shemu.top (Guo Shencheng)",
    })),
    customData: `<language>zh-CN</language>
<managingEditor>guoshencheng@shemu.top (Guo Shencheng)</managingEditor>
<webMaster>guoshencheng@shemu.top (Guo Shencheng)</webMaster>`,
  });
}
```

- [ ] **Step 2: 跑 build，确认 RSS 生成**

```bash
npm run build && grep -E '<author>|<managingEditor>' dist/rss.xml | head -5
```

Expected: 看到多行 `<author>...</author>` 和一行 `<managingEditor>...</managingEditor>`。

- [ ] **Step 3: Commit**

```bash
git add src/pages/rss.xml.ts
git commit -m "feat(seo): add author and managingEditor to RSS feed"
```

---

## Task 9: 创建 `public/robots.txt`

**Files:**
- Create: `public/robots.txt`

- [ ] **Step 1: 创建 robots.txt**

```text
User-agent: *
Allow: /

Sitemap: https://blog.shemu.top/sitemap-index.xml
```

- [ ] **Step 2: 跑 build，确认 robots.txt 复制到 dist**

```bash
npm run build && cat dist/robots.txt
```

Expected: 输出与 `public/robots.txt` 完全一致。

- [ ] **Step 3: Commit**

```bash
git add public/robots.txt
git commit -m "feat(seo): add robots.txt with sitemap reference"
```

---

## Task 10: 创建默认 OG 占位图 `public/og-default.png`

**Files:**
- Create: `public/og-default.png`（PNG 二进制，需外部工具生成）

- [ ] **Step 1: 用 ImageMagick 生成占位 OG 图（推荐）**

如已安装 ImageMagick：

```bash
convert -size 1200x630 \
  -background "#0a0a14" \
  -fill "#E94560" \
  -font "Courier-New-Bold" -pointsize 96 \
  -gravity center -annotate +0-80 "Century's World" \
  -fill "#8be9fd" \
  -font "Courier-New" -pointsize 36 \
  -gravity center -annotate +0+40 "guoshencheng's personal blog" \
  -fill "#50fa7b" \
  -pointsize 24 \
  -gravity south -annotate +0+40 "blog.shemu.top" \
  public/og-default.png
```

Expected: `public/og-default.png` 文件存在，大小 < 200KB。

- [ ] **Step 2: 备选 — 手动放置**

如果 ImageMagick 不可用或字体不匹配，用户可手动用 Figma/Sketch/任何工具生成 1200×630 PNG：
- 暗色背景（建议 `#0a0a14`，与博客暗色一致）
- 蘑菇 Logo（可选）
- 主标题 "Century's World"（居中大字号）
- 副标题 "guoshencheng's personal blog"（小字号）
- 输出为 PNG 放 `public/og-default.png`

- [ ] **Step 3: 验证图能正确显示**

```bash
file public/og-default.png
ls -lh public/og-default.png
```

Expected: `PNG image data, 1200 x 630` 或类似；文件大小 < 200KB。

- [ ] **Step 4: 跑 build**

```bash
npm run build && ls -lh dist/og-default.png
```

Expected: `dist/og-default.png` 存在。

- [ ] **Step 5: Commit**

```bash
git add public/og-default.png
git commit -m "feat(seo): add default OG image (1200x630) for social sharing"
```

---

## Task 11: 端到端验证清单

**Files:** 无（仅验证）

- [ ] **Step 1: 启动 dev server**

```bash
npm run dev
```

- [ ] **Step 2: 浏览器访问四类页面**

依次访问以下 URL（dev server 默认 4321 端口）：
1. http://localhost:4321/ （首页）
2. http://localhost:4321/posts/agent-llm-cache-burn-money-guide （含图文章）
3. http://localhost:4321/posts/pre-deep-into-egg-core （无图文章，选一篇无 frontmatter 图片的）
4. http://localhost:4321/tags
5. http://localhost:4321/tags/llm

每页 View Page Source，验证：
- `<head>` 含 `og:title` / `og:description` / `og:image` / `og:url`
- 含 `twitter:card` / `twitter:title`
- 含 `<link rel="canonical">`
- 含 `<script type="application/ld+json">`

- [ ] **Step 3: 验证文章页 JSON-LD 是 BlogPosting**

在含图文章页 source 中找 `application/ld+json`，解析 JSON：
- `@type === "BlogPosting"`
- `headline === 文章标题`
- `datePublished` 是 ISO 格式
- `author.name === "Guo Shencheng"`
- `image` 是绝对 URL（含 https://blog.shemu.top）

- [ ] **Step 4: 验证首页 JSON-LD 是 WebSite**

在首页 source 中找 `application/ld+json`：
- `@type === "WebSite"`
- `name === "Century's World"`
- `inLanguage === "zh-CN"`

- [ ] **Step 5: 验证 a11y 跳过链接**

打开任一非首页页面（如文章页）：
- 按 Tab 键
- 第一焦点应为 "跳到主要内容" 链接（位于左上角）
- 按 Enter 跳到主内容区
- 主内容区应有焦点 outline

- [ ] **Step 6: 验证图片懒加载**

在文章页 View Page Source 中搜索 `<img`：
- 每张图片应含 `loading="lazy"` 和 `decoding="async"`
- 首张图片（cover）也是 lazy（spec 中明确不做 eager）

- [ ] **Step 7: 验证 sitemap**

```bash
cat dist/sitemap-index.xml
cat dist/sitemap-0.xml | head -50
```

Expected: 包含首页、所有文章、所有 tags。

- [ ] **Step 8: 验证 RSS**

```bash
curl http://localhost:4321/rss.xml | head -50
```

Expected: 含 `<author>guoshencheng@shemu.top (Guo Shencheng)</author>` 在每个 item 中；含 `<managingEditor>` / `<webMaster>` 在 channel 中。

- [ ] **Step 9: 验证 robots.txt**

```bash
curl http://localhost:4321/robots.txt
```

Expected: 输出 `User-agent: *` / `Allow: /` / `Sitemap: https://blog.shemu.top/sitemap-index.xml`。

- [ ] **Step 10: 跑测试**

```bash
npm test
```

Expected: 全部 PASS。

- [ ] **Step 11: 关闭 dev server**

```bash
pkill -f "astro dev" || true
```

---

## Task 12: 在线富媒体验证（可选但强烈建议）

**Files:** 无

> 注：本任务的工具是外部网站。生产部署后再做也来得及。

- [ ] **Step 1: 部署到生产环境**

按博客现有部署流程（GitHub Pages / Vercel）推送到生产。

- [ ] **Step 2: Schema.org validator 校验**

访问 https://validator.schema.org/ ，输入一篇文章生产 URL，验证 BlogPosting schema 无错误。

- [ ] **Step 3: Google Rich Results Test**

访问 https://search.google.com/test/rich-results ，输入文章 URL，确认无错误。

- [ ] **Step 4: Facebook Sharing Debugger**

访问 https://developers.facebook.com/tools/debug/ ，输入文章 URL，点击 "Scrape Again"，确认 OG 卡片正确显示。

- [ ] **Step 5: Twitter Card Validator**

访问 https://cards-dev.twitter.com/validator ，输入文章 URL，确认 Twitter 卡片正确显示。

- [ ] **Step 6: Lighthouse SEO 评分**

Chrome DevTools → Lighthouse → 选择 SEO 分类 → 运行：
- SEO 分数 ≥ 95（目标）
- 修复任何低于 90 的项

---

## Spec Coverage Self-Check

| Spec 章节 | 对应 Task |
|-----------|-----------|
| 6. SeoHead 组件 | Task 4 |
| 7. utils/seo.ts | Task 1, 2 |
| 8. 数据流 | Task 7 |
| 9. JSON-LD 模板 | Task 4 (SeoHead) + Task 7 (页面 props) |
| 10. RSS 增强 | Task 8 |
| 11. robots.txt | Task 9 |
| 12. 默认 OG 图 | Task 10 |
| 13. 图片优化与懒加载 | Task 3 |
| 14. 可访问性 | Task 5 (Base.astro skip-link) + Task 6 (base.css) |
| 15. 测试策略 | Task 1, 2 (单元测试) + Task 11 (端到端) + Task 12 (在线验证) |
| 16. 实施顺序 | Task 顺序：1→2→3→4→5→6→7→8→9→10→11→12 |

全部 spec 需求已覆盖。