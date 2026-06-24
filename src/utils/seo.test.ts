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
