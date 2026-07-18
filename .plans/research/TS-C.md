# Vite Build and Public Path Note

## Answer

Each rewritten game can build independently to its own `dist/` directory and be copied unchanged to `docs/<game-id>/`.

Use:

```ts
export default defineConfig({
  base: '/games/<game-id>/',
  build: { outDir: 'dist', emptyOutDir: true },
});
```

A game copied to `docs/<game-id>/` is then served at:

```text
https://nikosk.github.io/games/<game-id>/
```

Do not copy it to `docs/games/<game-id>/`; that would create `/games/games/<game-id>/`.

## What was checked

The fixture in `research/fixtures/ts-c-vite-game/` builds a small TypeScript Vite game, copies it into a temporary `docs/ts-c-vite-proof/`, and opens it in Chromium under `/games/ts-c-vite-proof/`.

It checks:

- entry JavaScript and CSS
- dynamic imports
- JavaScript-imported assets
- CSS asset URLs
- files from `public/` using `import.meta.env.BASE_URL`
- absence of raw source and `node_modules` references

The check passed with Vite 5.4.21 and Chromium 148.

## Reproduce

```bash
npm ci --prefix thegame
node .plans/research/fixtures/ts-c-vite-game/verify.mjs
```

Set `CHROMIUM=/path/to/chromium` if needed.

## Limits

Runtime-built URLs must use imports, `new URL(..., import.meta.url)`, or `import.meta.env.BASE_URL`. Vite cannot rewrite arbitrary path strings.

The fixture checks a local server with the same path shape. The final live site should still be opened once after publishing.
