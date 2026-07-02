import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { extractArticleBody, stripMarkdown } from "../utils/seo";

const SITE_URL = "https://blog.shemu.top";
const MAX_SUMMARY_CHARS = 140;

function summarize(markdown: string): string {
  const text = stripMarkdown(markdown);
  if (text.length <= MAX_SUMMARY_CHARS) return text;
  const slice = text.slice(0, MAX_SUMMARY_CHARS);
  const lastPunct = Math.max(
    slice.lastIndexOf("。"),
    slice.lastIndexOf("."),
    slice.lastIndexOf(" "),
  );
  return (lastPunct > 0 ? slice.slice(0, lastPunct) : slice) + "…";
}

export async function GET(context: APIContext) {
  const site = context.site ?? new URL(SITE_URL);
  const posts = (await getCollection("blog"))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  const tagSet = new Set<string>();
  for (const post of posts) {
    for (const tag of post.data.tags) tagSet.add(tag);
  }

  const lines: string[] = [
    "# Century's World",
    "",
    "> 郭申成 (Guo Shencheng) 的个人博客 — 记录 Agent、流式、架构与代码取舍",
    "> 关注领域：LLM Agent 架构、SSE/流式协议、桌面应用性能",
    "",
    "## Posts",
    "",
  ];

  for (const post of posts) {
    const url = new URL(`/posts/${post.slug}`, site).href;
    const summary = summarize(extractArticleBody(post.body, 200));
    lines.push(`- [${post.data.title}](${url}): ${summary}`);
  }

  if (tagSet.size > 0) {
    lines.push("", "## Tags", "");
    for (const tag of [...tagSet].sort()) {
      const url = new URL(`/tags/${encodeURIComponent(tag)}`, site).href;
      lines.push(`- [${tag}](${url})`);
    }
  }

  lines.push("", "## Optional", "");
  lines.push(`- [RSS feed](${new URL("/rss.xml", site).href})`);
  lines.push(`- [Sitemap](${new URL("/sitemap-index.xml", site).href})`);

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
