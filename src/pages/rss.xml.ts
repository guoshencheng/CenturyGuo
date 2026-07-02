import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const posts = (await getCollection("blog"))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title: "Century's World",
    description: "Century Guo's personal blog",
    site: context.site ?? "https://blog.shemu.top",
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/posts/${post.slug}`,
      author: "guoshencheng@shemu.top (Century Guo)",
    })),
    customData: `<language>zh-CN</language>
<managingEditor>guoshencheng@shemu.top (Century Guo)</managingEditor>
<webMaster>guoshencheng@shemu.top (Century Guo)</webMaster>`,
  });
}