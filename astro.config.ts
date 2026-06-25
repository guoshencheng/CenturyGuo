import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { rehypeImgLazy } from "./src/utils/rehype-img-lazy";

export default defineConfig({
  site: "https://blog.shemu.top",
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      theme: "github-dark",
    },
    rehypePlugins: [rehypeImgLazy],
  },
});