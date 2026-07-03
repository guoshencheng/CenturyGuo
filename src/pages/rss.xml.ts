import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const posts = (await getCollection("blog"))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title: "Duluu's World",
    description: "Duluu Guo's personal blog",
    site: context.site ?? "https://blog.shemu.top",
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/posts/${post.slug}`,
      author: "guoshencheng@shemu.top (Duluu Guo)",
    })),
    customData: `<language>zh-CN</language>
<managingEditor>guoshencheng@shemu.top (Duluu Guo)</managingEditor>
<webMaster>guoshencheng@shemu.top (Duluu Guo)</webMaster>`,
  });
}