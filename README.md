# Duluu's World

> Personal blog source for [blog.shemu.top](https://blog.shemu.top) (legacy mirror at [guoshencheng.com](https://guoshencheng.com)).

Built with [Astro 5](https://astro.build) (Static Site Generation). GitHub Actions builds and publishes static artifacts over restricted SSH to a shared Nginx runtime; OpenResty serves the custom domain `blog.shemu.top`.

## Stack

- **Astro 5** — static site generator, content collections, RSS + sitemap integrations
- **TypeScript** — strict mode (`astro/tsconfigs/strictest`)
- **Custom CSS Design System** — Retro Terminal visual style, no UI framework
- **Shiki** — server-side code highlighting (`github-dark` theme)
- **GitHub Actions + restricted SSH** — static artifact publishing on push to `master`; OpenResty + shared Nginx hosting
- **WeChat sync script** — `scripts/wechat-sync.ts` converts markdown to WeChat-editor-ready HTML

## Quick Start

```bash
node --version    # Node.js 22+ required for development and tests
npm install
npm run dev        # http://localhost:4321
npm run build      # → dist/
npm run preview    # serve dist/ locally
npm test           # node --test (application and inline publish adapter tests)
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

Keep `astro.config.ts`'s `site` and `public/CNAME` unchanged. DNS and OpenResty handle domain routing and HTTPS in the new deployment scheme; `CNAME` is retained for Pages fallback compatibility. See [custom-domain-setup.md](docs/custom-domain-setup.md) for the cutover checklist. Changing the workflow alone does not migrate live DNS or hosting.

## Deploy

Push to `master` (or manually run the workflow on `master`) → Node 22 → `npm ci` → `npm test` → `npm run build` → deterministic GNU tar/gzip archive → one SSH `publish` call. The server handles activation, internal health checks and any necessary rollback; failures remain failed jobs.

Before the first run, configure repository Actions Variables `STATIC_DEPLOY_HOST` / `STATIC_DEPLOY_SITE` and Secrets `STATIC_DEPLOY_SSH_KEY` / `STATIC_DEPLOY_KNOWN_HOSTS`. See [static-deployment.md](docs/static-deployment.md) for platform prerequisites, credential setup, SSG routing checks, status and rollback. No platform source or release client is copied into this repository.

## Documentation

- `AGENTS.md` — project conventions, hard rules, file pointers (for AI agents and humans working in this repo)
- `docs/architecture.md` — system architecture, page map, SEO pipeline, deploy flow
- `docs/static-deployment.md` — artifact publishing, credentials, migration acceptance and rollback
- `docs/custom-domain-setup.md` — DNS + OpenResty / HTTPS setup and Pages fallback
- `docs/superpowers/specs/` — design specs for completed features
- `docs/superpowers/plans/` — implementation plans for completed features

## License

MIT — see `LICENSE`.
