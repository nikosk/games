import { defineConfig } from 'vite';

export default defineConfig({
  base: '/games/railway-workshop/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
