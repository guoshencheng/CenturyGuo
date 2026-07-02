const DEFAULT_AUTHOR = "Guo Shencheng";
const SITE_URL = "https://blog.shemu.top";

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

export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, ""))
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(\*|_)(.+?)\1/g, "$2")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s*/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^[-*_]{3,}$/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractArticleBody(md: string, maxChars = 280): string {
  const text = stripMarkdown(md);
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  const lastPunct = Math.max(
    slice.lastIndexOf("。"),
    slice.lastIndexOf("！"),
    slice.lastIndexOf("？"),
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
    slice.lastIndexOf("。"),
  );
  if (lastPunct > maxChars * 0.3) {
    return slice.slice(0, lastPunct + 1);
  }
  return slice + "...";
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
    alt: "Century's World — Agent、流式与架构笔记",
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
  inLanguage?: string;
  articleBody?: string;
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
    author: { "@type": "Person", name: author, url: SITE_URL },
    publisher: { "@type": "Person", name: author, url: SITE_URL },
    mainEntityOfPage: { "@type": "WebPage", "@id": input.url },
  };
  if (published) obj.datePublished = published;
  if (modified) obj.dateModified = modified;
  if (input.tags?.length) obj.keywords = input.tags.join(",");
  if (input.imageUrl) obj.image = input.imageUrl;
  if (input.inLanguage) obj.inLanguage = input.inLanguage;
  if (input.articleBody) obj.articleBody = input.articleBody;

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
      url: input.authorUrl ?? SITE_URL,
    },
  };
  return JSON.stringify(obj);
}

export function buildPersonJsonLd(input: {
  name: string;
  url: string;
  alternateName?: string;
  jobTitle?: string;
  knowsAbout?: string[];
  sameAs?: string[];
}): string {
  if (!input.name) throw new Error("buildPersonJsonLd: name required");
  if (!input.url) throw new Error("buildPersonJsonLd: url required");

  const obj: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: input.name,
    url: input.url,
  };
  if (input.alternateName) obj.alternateName = input.alternateName;
  if (input.jobTitle) obj.jobTitle = input.jobTitle;
  if (input.knowsAbout?.length) obj.knowsAbout = input.knowsAbout;
  if (input.sameAs?.length) obj.sameAs = input.sameAs;

  return JSON.stringify(obj);
}

export function buildFaqJsonLd(
  items: Array<{ q: string; a: string }>,
): string {
  if (items.length === 0) {
    throw new Error("buildFaqJsonLd: items must not be empty");
  }
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  });
}