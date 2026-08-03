import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
  server: {
    port: 5173,
  },
  base: '/deckforge/',
  build: {
    target: 'es2021',
    outDir: 'dist',
  },
});
