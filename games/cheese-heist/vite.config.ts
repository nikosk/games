import { defineConfig } from 'vite';

export default defineConfig({
  base: '/games/cheese-heist/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
