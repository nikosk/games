import { defineConfig } from 'vite';

export default defineConfig({
  base: '/games/sparky-assembly/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});