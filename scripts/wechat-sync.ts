import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { marked } from "marked";

/**
 * Convert Astro blog markdown to WeChat-compatible HTML.
 * Usage: npx tsx scripts/wechat-sync.ts <path-to-markdown>
 */

const BLOG_URL = "https://blog.shemu.top";

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
  const rawHtml = marked.parse(md, { async: false }) as string;

  return (
    rawHtml
      // Code blocks first, before inline code replacement
      .replace(
        /<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g,
        '<pre style="background:#282c34;color:#abb2bf;padding:16px;border-radius:4px;overflow-x:auto;font-size:13px;line-height:1.6;font-family:Menlo,Monaco,Consolas,monospace;"><code$1 style="background:transparent;color:inherit;font-family:inherit;font-size:inherit;padding:0;">$2</code></pre>'
      )
      // Shift headings: h1->h2, h2->h3, h3->h4
      .replace(
        /<h1>([\s\S]*?)<\/h1>/g,
        '<h2 style="font-size:22px;font-weight:700;margin:1em 0 0.5em;text-align:center;">$1</h2>'
      )
      .replace(
        /<h2>([\s\S]*?)<\/h2>/g,
        '<h3 style="font-size:18px;font-weight:600;margin:1.5em 0 0.5em;">$1</h3>'
      )
      .replace(
        /<h3>([\s\S]*?)<\/h3>/g,
        '<h4 style="font-size:15px;font-weight:600;margin:1.5em 0 0.5em;">$1</h4>'
      )
      // Paragraphs
      .replace(/<p>/g, '<p style="line-height:2;margin:1em 0;">')
      // Lists
      .replace(/<ul>/g, '<ul style="padding-left:1.5em;margin:0.5em 0;">')
      .replace(/<ol>/g, '<ol style="padding-left:1.5em;margin:0.5em 0;">')
      .replace(/<li>/g, '<li style="margin:0.25em 0;line-height:2;">')
      // Blockquote
      .replace(
        /<blockquote>/g,
        '<blockquote style="border-left:3px solid #e94560;padding:8px 16px;margin:1em 0;color:#666;background:#f9f9f9;border-radius:0 4px 4px 0;">'
      )
      // Inline code (not inside pre, already handled above)
      .replace(
        /<code>/g,
        '<code style="background:#f0f0f0;padding:2px 6px;border-radius:3px;font-size:13px;color:#e94560;font-family:Menlo,Monaco,Consolas,monospace;">'
      )
      // Links
      .replace(/<a /g, '<a style="color:#16c79a;" ')
      // Images
      .replace(
        /<img([^>]*)>/g,
        '<img$1 style="max-width:100%;border-radius:4px;margin:1em 0;" /><!-- TODO: upload to WeChat and replace src -->'
      )
      // Horizontal rule
      .replace(
        /<hr>/g,
        '<hr style="border:none;border-top:1px solid #eee;margin:2em 0;" />'
      )
  );
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

const articleHtml = `
<section id="wechat-content" style="max-width:680px;margin:0 auto;font-size:15px;color:#333;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;line-height:1.8;">

  ${contentHtml}

  <hr style="border:none;border-top:1px solid #eee;margin:2em 0;" />
  <p style="color:#999;font-size:13px;text-align:center;">
    原文链接：<a href="${BLOG_URL}/posts/${slug}" style="color:#16c79a;">${BLOG_URL}/posts/${slug}</a>
  </p>
</section>
`;

const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — 微信公众号预览</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #f5f5f5;
      font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
    }
    .toolbar {
      position: sticky;
      top: 0;
      background: #fff;
      border-bottom: 1px solid #e0e0e0;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .toolbar h1 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
    .toolbar button {
      background: #07c160;
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
    }
    .toolbar button:hover {
      background: #06ad56;
    }
    .preview-box {
      max-width: 680px;
      margin: 24px auto;
      padding: 24px;
      background: #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .notice {
      max-width: 680px;
      margin: 16px auto 0;
      padding: 12px 16px;
      background: #fffbe6;
      border: 1px solid #ffe58f;
      border-radius: 4px;
      color: #ad6800;
      font-size: 13px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <h1>${title}</h1>
    <button onclick="copyToWeChat()">复制全文</button>
  </div>

  <div class="notice">
    点击下方按钮后，进入微信公众号编辑器，按 <strong>Ctrl+V / Cmd+V</strong> 粘贴。如果按钮无效，请手动选中下方白色区域内的内容，复制后粘贴。
  </div>

  <div class="preview-box">
    ${articleHtml}
  </div>

  <script>
    function copyToWeChat() {
      const content = document.getElementById('wechat-content');
      const range = document.createRange();
      range.selectNodeContents(content);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);

      try {
        const success = document.execCommand('copy');
        if (success) {
          alert('已复制，去微信公众号编辑器粘贴即可');
        } else {
          alert('复制失败，请手动选中内容复制');
        }
      } catch (err) {
        alert('复制失败，请手动选中内容复制');
      }
      selection.removeAllRanges();
    }
  </script>
</body>
</html>`;

const outDir = join(import.meta.dirname ?? __dirname, "output");
if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}
const outPath = join(outDir, `${slug}.html`);
writeFileSync(outPath, fullHtml, "utf-8");

console.log(`✅ WeChat HTML generated: ${outPath}`);
console.log(`   Title: ${title}`);
console.log(`   Open this file in browser and click "复制全文" to paste into WeChat editor.`);
console.log(`   Remember to: upload images to WeChat media library first.`);
