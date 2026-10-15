import { defineConfig } from 'vite';
export default defineConfig({
  base: '/games/bunny-3d/',
  build: { assetsInlineLimit: 0, rollupOptions: { input: ['index.html', 'garden.html', 'adventure.html'] } },
});
