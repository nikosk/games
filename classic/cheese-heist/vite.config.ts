import { defineConfig } from 'vite';

export default defineConfig({
  base: '/games/classic/cheese-heist/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
