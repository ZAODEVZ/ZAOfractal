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
  // Emit every hoisted <script> as an external /_astro/*.js file instead of
  // inlining it. This lets the Content-Security-Policy in vercel.json use a
  // strict `script-src 'self'` with no 'unsafe-inline' and no per-build hashes
  // to maintain: same-origin script files are covered by 'self', while any
  // injected inline <script> or on*= handler is refused. assetsInlineLimit: 0
  // disables Vite's inline-below-threshold behavior for script/style chunks.
  vite: {
    build: {
      assetsInlineLimit: 0,
    },
  },
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
