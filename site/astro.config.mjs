// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import pagefind from 'astro-pagefind';
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerMetaHighlight,
} from '@shikijs/transformers';
import rehypeContractAddresses from './src/plugins/rehype-contract-addresses.mjs';
import rehypeCopyButton from './src/plugins/rehype-copy-button.mjs';
import rehypeExternalLinks from './src/plugins/rehype-external-links.mjs';

// The repo lives at github.com/ZAODEVZ/ZAOfractal.
// Public site at zaofractal.vercel.app; canonical domain fractal.thezao.com pending DNS.
export default defineConfig({
  site: 'https://zaofractal.vercel.app',
  trailingSlash: 'never',
  integrations: [sitemap(), pagefind()],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
      transformers: [
        transformerNotationDiff(),
        transformerNotationHighlight(),
        transformerMetaHighlight(),
      ],
    },
    rehypePlugins: [rehypeExternalLinks, rehypeContractAddresses, rehypeCopyButton],
  },
  build: {
    format: 'directory',
  },
});
