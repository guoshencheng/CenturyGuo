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
  // Links
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