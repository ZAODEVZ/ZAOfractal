// Rehype plugin: enhance all external links in rendered markdown.
// - Adds target="_blank" rel="noopener noreferrer"
// - Adds class "ext-link" for CSS styling
// - Wraps standalone links (sole child of <p>) with class "ext-link-block"
//   so they can be styled as "Visit Site" buttons

import { visit } from 'unist-util-visit';

const isExternal = (href) => href && (href.startsWith('http://') || href.startsWith('https://'));

export default function rehypeExternalLinks() {
  return (tree) => {
    visit(tree, 'element', (node, _index, parent) => {
      if (node.tagName !== 'a') return;
      const href = node.properties?.href;
      if (!isExternal(href)) return;

      // Add target + rel + class
      node.properties.target = '_blank';
      node.properties.rel = 'noopener noreferrer';
      const existing = node.properties.class ?? '';
      node.properties.class = (existing + ' ext-link').trim();

      // If this link is the only meaningful child of a <p>, mark the <p> as a block link
      if (parent?.tagName === 'p') {
        const siblings = parent.children.filter(
          (c) => !(c.type === 'text' && c.value.trim() === '')
        );
        if (siblings.length === 1 && siblings[0] === node) {
          parent.properties = parent.properties ?? {};
          parent.properties.class = ((parent.properties.class ?? '') + ' ext-link-block').trim();
        }
      }
    });
  };
}
