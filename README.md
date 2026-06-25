# Century's World

> Personal blog source for [blog.shemu.top](https://blog.shemu.top) (legacy mirror at [guoshencheng.com](https://guoshencheng.com)).

Built with [Astro 5](https://astro.build) (Static Site Generation), deployed to GitHub Pages via GitHub Actions, served on the custom domain `blog.shemu.top`.

## Stack

- **Astro 5** — static site generator, content collections, RSS + sitemap integrations
- **TypeScript** — strict mode (`astro/tsconfigs/strictest`)
- **Custom CSS Design System** — Retro Terminal visual style, no UI framework
- **Shiki** — server-side code highlighting (`github-dark` theme)
- **GitHub Pages + Actions** — auto-deploy on push to `master`
- **WeChat sync script** — `scripts/wechat-sync.ts` converts markdown to WeChat-editor-ready HTML

## Quick Start

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # → dist/
npm run preview    # serve dist/ locally
npm test           # node --test unit tests (src/utils/*.test.ts)
```

## Content

Write a new post as a markdown file in `src/content/blog/`:

```markdown
---
title: "文章标题"
date: 2026-06-25
tags: [技术, 随笔]
description: "一句话摘要，会出现在卡片、列表、SEO meta、RSS 中。"
---

正文...
```

The collection schema (`src/content/config.ts`) enforces `title`, `date`, `tags`, `description`. The first `![image](path)` in the body is auto-extracted as the post's OG image.

## Project Layout

```
src/
├── components/      # Astro components (Card, Hero, Mushroom, PostCard, SeoHead, Terminal)
├── content/blog/    # Markdown posts (the actual content)
├── content/drafts/  # Working drafts (not published)
├── layouts/Base.astro
├── pages/           # Routes: /, /posts/[slug], /tags, /tags/[tag], /rss.xml
├── styles/          # tokens.css + base.css + markdown.css
└── utils/           # formatDate, seo, rehype-img-lazy (+ seo.test.ts)

public/
├── CNAME            # blog.shemu.top
├── og-default.png   # fallback OG image (1200×630)
├── robots.txt
└── images/blog/     # cover images referenced from markdown

scripts/
└── wechat-sync.ts   # npm run wechat <file> | npm run wechat:all
```

## Custom Domain

`public/CNAME` pins `blog.shemu.top`. DNS has a `blog` CNAME record pointing to `guoshencheng.github.io`. See `docs/custom-domain-setup.md` for the full setup walkthrough (DNS, GitHub Pages settings, HTTPS, common pitfalls).

## Deploy

Push to `master` → `.github/workflows/deploy.yml` builds and publishes to GitHub Pages. No manual deploy step.

## Documentation

- `AGENTS.md` — project conventions, hard rules, file pointers (for AI agents and humans working in this repo)
- `docs/architecture.md` — system architecture, page map, SEO pipeline, deploy flow
- `docs/custom-domain-setup.md` — DNS + GitHub Pages setup walkthrough
- `docs/superpowers/specs/` — design specs for completed features
- `docs/superpowers/plans/` — implementation plans for completed features

## License

MIT — see `LICENSE`.