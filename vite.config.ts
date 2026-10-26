import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solid()],
  build: {
    outDir: 'panel',
    emptyOutDir: false,
    target: 'es2022',
    minify: false,
    lib: {
      entry: resolve(import.meta.dirname, 'panel/main.tsx'),
      name: 'MagicContextPanel',
      formats: ['iife'],
      fileName: () => 'main.js',
    },
  },
});
