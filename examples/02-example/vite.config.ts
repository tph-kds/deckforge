import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    testTimeout: 30_000,
  },
  server: {
    port: 5173,
  },
  optimizeDeps: {
    // Native Node binding; never bundled for the browser (lazily imported by
    // the PPTX exporter's Node-only SVG rasterization path).
    exclude: ['@resvg/resvg-js'],
  },
  base: '/deckforge/',
  build: {
    target: 'es2021',
    outDir: 'dist',
    rollupOptions: {
      external: ['@resvg/resvg-js'],
    },
  },
});
