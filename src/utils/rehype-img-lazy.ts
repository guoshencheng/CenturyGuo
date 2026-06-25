import type { Root, Element } from "hast";

export function rehypeImgLazy(): (tree: Root) => void {
  return (tree: Root) => {
    walk(tree);
  };
}

function walk(node: Root | Element): void {
  if ("children" in node) {
    for (const child of node.children) {
      if (child.type === "element") {
        if (child.tagName === "img") {
          try {
            patchImg(child);
          } catch (err) {
            console.warn(
              `[rehype-img-lazy] failed to patch img:`,
              (err as Error).message,
            );
          }
        } else {
          walk(child);
        }
      }
    }
  }
}

function patchImg(node: Element): void {
  const props = node.properties ?? {};
  if (props.loading === undefined) props.loading = "lazy";
  if (props.decoding === undefined) props.decoding = "async";
  if (props.alt === undefined) {
    console.warn(
      `[rehype-img-lazy] <img> missing alt attribute: ${JSON.stringify(props)}`,
    );
  }
  node.properties = props;
}
