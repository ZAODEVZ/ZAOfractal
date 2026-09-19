import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// The committed on-chain snapshot lives in ../data, outside this Vite root.
// Alias it so tabs can import the JSON directly, and let the dev server read it.
const dataDir = fileURLToPath(new URL('../data', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@data': dataDir },
  },
  server: {
    fs: { allow: ['..'] },
  },
  define: {
    global: 'globalThis',
  },
});
