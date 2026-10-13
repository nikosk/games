import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  base: '/games/bunnys-picnic/',
  build: {
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        voices: fileURLToPath(new URL('./voices.html', import.meta.url)),
        walk: fileURLToPath(new URL('./walk.html', import.meta.url)),
        game: fileURLToPath(new URL('./index.html', import.meta.url)),
        animation: fileURLToPath(new URL('./sample.html', import.meta.url)),
        review: fileURLToPath(new URL('./review.html', import.meta.url)),
      },
    },
  },
});
