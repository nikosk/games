import { defineConfig } from 'vite';

export default defineConfig({
  base: '/games/canopy-caper/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});