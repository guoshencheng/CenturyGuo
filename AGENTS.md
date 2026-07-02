# AGENTS.md

> 本文件面向在本仓库内工作的 AI Agent（Claude / Codex / OpenCode）。项目约定、红线、文档指针都在这里。

## 项目速览

- **类型**：个人静态博客
- **线上地址**：[blog.shemu.top](https://blog.shemu.top)
- **栈**：Astro 5 SSG · TypeScript strict · 自写 CSS Design System · GitHub Pages + Actions · Shiki
- **作者署名**：Guo Shencheng (`guoshencheng@shemu.top`)
- **不在栈内**：UI 框架（React/Vue）、Tailwind、CSS-in-JS、测试框架（jest/vitest）。需要测试用 Node 22+ 原生 `node --test`。

## 红线（违反会破坏构建或线上行为）

1. **不要改 `astro.config.ts` 里的 `site`** — 现为 `https://blog.shemu.top`，与 `public/CNAME`、`robots.txt`、SEO 工具中的 `SITE_URL` 三处硬绑定。改了会导致 sitemap/RSS/OG/canonical 全部指错域。
2. **不要删 `public/CNAME`** — 没有它 GitHub Pages 不知道绑哪个自定义域名。
3. **不要给博文 frontmatter 漏 `description`** — schema 必填。`src/content/config.ts` 用 `z.string()` 校验，缺了直接构建失败。这字段同时驱动卡片副标题、列表摘要、`og:description`、Twitter Card、RSS description。
4. **新页面必须经 `Base.astro` 布局 + 传 `seo` prop** — 不要绕开 `Base` 自己写 `<head>`，否则会绕过 skip-link、Umami 统计、SEO meta 一致性。`seo` prop 透传给 `SeoHead`，`person` 字段含 `sameAs`（跨平台 profile 链接列表）必须跟 `src/pages/index.astro` 保持一致；`body` / `faqs` 字段直接来自 `post.data` / `post.body`。
5. **图片 `alt` 不能为空** — `rehype-img-lazy` 插件会在 build 时 `console.warn` 缺 alt 的 `<img>`。首张 `![](path)` 会自动作为 OG 图。
6. **不要加 npm 依赖除非真的必要** — 当前依赖固定在 `package.json`。新依赖必须 review 体积、维护状态、与 Astro 5 兼容性。
7. **不要删 `/llms.txt` 端点** — `src/pages/llms.txt.ts` 动态生成 LLM 友好的站点摘要（Jeremy Howard 协议）。`BlogPosting` JSON-LD、OG、Twitter Card 是给 Google / 社交平台看的，`/llms.txt` 是给 AI 答案检索用的——GSC 不收录，但 Perplexity / Answer.AI / 未来更多 LLM 会读。

## 命令速查

| 命令 | 用途 |
|------|------|
| `npm install` | 安装依赖 |
| `npm run dev` | 本地开发 (`localhost:4321`) |
| `npm run build` | SSG 构建到 `dist/` |
| `npm run preview` | 本地预览构建产物 |
| `npm test` | 跑 `node --test` (扫 `src/utils/*.test.ts`) |
| `npm run wechat <file>` | 单篇 markdown → 公众号 HTML（输出到 `scripts/output/`，gitignored） |
| `npm run wechat:all` | 批量转换 `src/content/blog/*.md` |
| `npm run wechat:open` | macOS 打开 `scripts/output/` 目录 |

## 文档指针表（深入去这里）

| 我想知道… | 看这里 |
|-----------|--------|
| 路由清单、SEO 流水线、deploy 流程、数据流 | [`docs/architecture.md`](docs/architecture.md) |
| `blog.shemu.top` 怎么绑的、DNS 怎么配、HTTPS 怎么签 | [`docs/custom-domain-setup.md`](docs/custom-domain-setup.md) |
| 之前某个 feature 怎么设计的 | `docs/superpowers/specs/2026-06-*.md` |
| 之前某个 feature 怎么实现的（含 commit 步骤） | `docs/superpowers/plans/2026-06-*.md` |
| 怎么给文章生成 AI 配图 | `.claude/skills/blog-illustration/SKILL.md` |
| 怎么把文章同步到微信公众号 | `scripts/wechat-sync.ts` 顶部注释 |

## 写新博文时

1. 在 `src/content/blog/<slug>.md` 建文件（slug 与文件名对应）
2. frontmatter 必填：`title`、`date`、`tags`、`description`；**推荐加 `faq`**（`[{q, a}, ...]`）会自动注入 FAQPage JSON-LD，提升 AI 答案引用率
3. 正文首张 `![](path)` 会自动作 OG 图（如需单独 OG，传入 `seo.image` 覆盖）
4. 本地跑 `npm run dev` 看效果，`npm run build` 验证 SSG 完整通过
5. push 到 `master` 触发自动部署

## 写新功能时

- **影响路由 / SEO meta / 环境变量**：必须同步 `docs/architecture.md`（外部受众）和本文件（AI 受众）。
- **改了 deploy 流程**：必须同步 `docs/architecture.md` 的 Deploy 段。
- **改了 `package.json` scripts**：在本文件「命令速查」表补一行。
- **改了 schema / 字段含义**：本文件「红线」段如有相应边界，需更新。
- **不要在本文件堆历史叙事**——「某年某月加了 X 功能」之类的内容归 git log 或 `docs/superpowers/plans/`，CLAUDE.md/AGENTS.md 只保留「下次 AI 写代码必须看到的」规则。