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
    author: { "@type": "Person", name: author, url: SITE_URL },
    publisher: { "@type": "Person", name: author, url: SITE_URL },
    mainEntityOfPage: { "@type": "WebPage", "@id": input.url },
  };
  if (published) obj.datePublished = published;
  if (modified) obj.dateModified = modified;
  if (input.tags?.length) obj.keywords = input.tags.join(",");
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
      url: input.authorUrl ?? SITE_URL,
    },
  };
  return JSON.stringify(obj);
}
