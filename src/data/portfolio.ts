export const portfolio = [
  {
    name: "DuluuClip",
    slug: "duluuclip",
    description: "运动相机视频 + GPS HUD 叠加工具",
    url: "https://duluuclip.app",
    ctaLabel: "Visit Site",
    type: "product",
  },
  {
    name: "Rem Agent",
    slug: "rem-agent",
    description: "TypeScript Agent-first 通用 Harness",
    url: "https://github.com/guoshencheng/Rem",
    ctaLabel: "View on GitHub",
    type: "opensource",
  },
] as const;

export type PortfolioItem = (typeof portfolio)[number];