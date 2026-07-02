import { test } from "node:test";
import assert from "node:assert/strict";
import {
  absoluteUrl,
  extractFirstImage,
  truncateDescription,
  buildOgImage,
  buildBlogPostingJsonLd,
  buildWebSiteJsonLd,
  buildPersonJsonLd,
  buildFaqJsonLd,
  stripMarkdown,
  extractArticleBody,
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

test("stripMarkdown: 去图片/链接/标题/代码标记", () => {
  const md = `# 标题

![cover](/img/01.webp)

这是一段 [链接](https://x.com) 和 **粗体** 文字。

\`code\` 和

\`\`\`
代码块
\`\`\`

## 子标题

- 列表项 1
- 列表项 2
`;
  const text = stripMarkdown(md);
  assert.ok(!text.includes("#"));
  assert.ok(!text.includes("!["));
  assert.ok(!text.includes("]("));
  assert.ok(!text.includes("**"));
  assert.ok(text.includes("链接"));
  assert.ok(text.includes("粗体"));
  assert.ok(text.includes("代码块"));
  assert.ok(text.includes("列表项"));
});

test("stripMarkdown: 多空白压成单空格", () => {
  assert.equal(stripMarkdown("a\n\n\nb"), "a b");
  assert.equal(stripMarkdown("  a   b  "), "a b");
});

test("extractArticleBody: 短文本原样返回", () => {
  assert.equal(
    extractArticleBody("最近在做 Agent。"),
    "最近在做 Agent。",
  );
});

test("extractArticleBody: 长文本在句末标点截断", () => {
  const md =
    "a".repeat(40) + "。调研了 OpenCode 源码，发现只开一条 SSE。" + "x".repeat(400);
  const result = extractArticleBody(md, 60);
  assert.ok(result.length <= 61);
  assert.ok(result.endsWith("。"));
});

test("extractArticleBody: 无标点时硬切并加省略号", () => {
  const md = "a".repeat(500);
  const result = extractArticleBody(md, 100);
  assert.ok(result.length <= 103);
  assert.ok(result.endsWith("..."));
});

test("buildBlogPostingJsonLd: 传入 inLanguage 和 articleBody", () => {
  const json = buildBlogPostingJsonLd({
    title: "Hello",
    description: "World",
    url: "https://blog.shemu.top/posts/hello",
    publishedTime: new Date("2026-01-01T00:00:00Z"),
    author: "Guo Shencheng",
    tags: ["a"],
    imageUrl: "https://blog.shemu.top/og-default.png",
    inLanguage: "zh-CN",
    articleBody: "首段摘要文字",
  });
  const parsed = JSON.parse(json);
  assert.equal(parsed.inLanguage, "zh-CN");
  assert.equal(parsed.articleBody, "首段摘要文字");
});

test("buildBlogPostingJsonLd: 不传 inLanguage 时不输出字段", () => {
  const json = buildBlogPostingJsonLd({
    title: "Hello",
    description: "World",
    url: "https://blog.shemu.top/posts/hello",
  });
  const parsed = JSON.parse(json);
  assert.equal(parsed.inLanguage, undefined);
  assert.equal(parsed.articleBody, undefined);
});

test("buildPersonJsonLd: 必填字段输出", () => {
  const json = buildPersonJsonLd({
    name: "郭申成",
    url: "https://blog.shemu.top",
  });
  const parsed = JSON.parse(json);
  assert.equal(parsed["@type"], "Person");
  assert.equal(parsed.name, "郭申成");
  assert.equal(parsed.url, "https://blog.shemu.top");
});

test("buildPersonJsonLd: 可选字段缺省时不输出", () => {
  const json = buildPersonJsonLd({
    name: "郭申成",
    url: "https://blog.shemu.top",
  });
  const parsed = JSON.parse(json);
  assert.equal(parsed.alternateName, undefined);
  assert.equal(parsed.jobTitle, undefined);
  assert.equal(parsed.knowsAbout, undefined);
  assert.equal(parsed.sameAs, undefined);
});

test("buildPersonJsonLd: knowsAbout 和 sameAs 数组正确传递", () => {
  const json = buildPersonJsonLd({
    name: "郭申成",
    url: "https://blog.shemu.top",
    jobTitle: "全栈工程师",
    knowsAbout: ["LLM Agent", "Node", "React", "架构设计"],
    sameAs: ["https://github.com/guoshencheng"],
  });
  const parsed = JSON.parse(json);
  assert.deepEqual(parsed.knowsAbout, [
    "LLM Agent",
    "Node",
    "React",
    "架构设计",
  ]);
  assert.deepEqual(parsed.sameAs, ["https://github.com/guoshencheng"]);
});

test("buildPersonJsonLd: 缺 name 抛 Error", () => {
  assert.throws(
    () => buildPersonJsonLd({ name: "", url: "https://x.com" }),
    /name/,
  );
});

test("buildFaqJsonLd: 输出 FAQPage 结构", () => {
  const json = buildFaqJsonLd([
    { q: "什么是 SSE？", a: "Server-Sent Events，服务器推送协议。" },
    { q: "为什么一条就够？", a: "浏览器同 origin 并发上限是 6。" },
  ]);
  const parsed = JSON.parse(json);
  assert.equal(parsed["@type"], "FAQPage");
  assert.equal(parsed.mainEntity.length, 2);
  assert.equal(parsed.mainEntity[0]["@type"], "Question");
  assert.equal(parsed.mainEntity[0].name, "什么是 SSE？");
  assert.equal(parsed.mainEntity[0].acceptedAnswer["@type"], "Answer");
  assert.equal(
    parsed.mainEntity[0].acceptedAnswer.text,
    "Server-Sent Events，服务器推送协议。",
  );
});

test("buildFaqJsonLd: 空数组抛 Error", () => {
  assert.throws(() => buildFaqJsonLd([]), /empty/);
});
