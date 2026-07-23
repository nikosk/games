# Tooling, Builds, and Publishing

The tooling exists to shorten the path from an idea to a playable portfolio game.

## Current state

- A minimal root npm workspace and strict TypeScript configuration exist.
- Root development, type checking, testing, portfolio building, and output validation are implemented.
- Railway Workshop, Wild Pairs, and Canopy Caper are Phaser/TypeScript/Vite workspace games included automatically by the portfolio builder.
- Their original versions are preserved under `classic/`, and the old public entries lead to the rewrites.
- Most remaining games are standalone HTML files.
- `crocodile-game/` has a small working test suite.
- `little-chef-kitchen/` loads Phaser from a CDN.
- `thegame/` uses Vite and its built output is published through `docs/`.
- A game starter has not been added yet; the three current games remain deliberately self-contained.

## Build first

Create the smallest root setup that can:

1. Run existing checks.
2. Build rewritten games.
3. Build the current Critter Tactics correctly during the transition.
4. Copy untouched legacy games.
5. Generate the portfolio catalog.
6. Write the complete site to `docs/`.
7. Report missing files and broken links clearly.

Do not add a task runner, hosted build service, dashboard, or large configuration layer unless a real problem requires one.

## Intended commands

```bash
npm run dev          # run a selected game or the portfolio locally
npm run typecheck    # check rewritten TypeScript
npm test             # run useful tests
npm run build        # generate docs/
npm run validate     # check the generated site
npm run game:create  # start a small game package
```

Add these commands as their implementations become useful. Do not create fake or empty commands merely to complete the list.

## Workspace

Use npm workspaces for:

```json
{
  "workspaces": ["games/*", "packages/*"]
}
```

Use one root lockfile and strict TypeScript for rewritten code. Keep legacy code outside TypeScript and formatting passes until it is rewritten.

## Per-game build

Each rewritten game owns a normal Vite config:

```ts
export default defineConfig({
  base: '/games/<game-id>/',
  build: { outDir: 'dist', emptyOutDir: true },
});
```

The root build copies `games/<game-id>/dist/` to `docs/<game-id>/`. It should not modify the built files.

## Portfolio build

The portfolio builder should:

- start from a clean `docs/`
- build rewritten games
- build transitional Vite games such as `thegame/`
- copy untouched legacy entries to their current paths
- add redirects for replaced entries
- create `docs/index.html` from the games that actually exist

Keep the migration list explicit and easy to read. It does not need a large schema.

## Validation

`npm run validate` should catch common publishing mistakes:

- catalog links that lead nowhere
- missing scripts, styles, images, audio, or fonts
- raw TypeScript, Vite development imports, or `node_modules` references in `docs/`
- paths that forget the `/games/` project prefix

A clear error message is more valuable than a large report.

## Development

A selected game should start with Vite and print a LAN URL for tablet testing. Avoid building a custom development server if Vite already does the job.

## Game starter

After a couple of rewritten games reveal a useful common shape, add a small starter that creates:

- package and Vite config
- `game.json`
- one bootable Phaser scene
- an assets folder
- one useful test

One flexible starter is enough. Add variants only if repeated real games need them.

## Publishing

1. Run the relevant checks.
2. Run the full portfolio build.
3. Open the built catalog and changed game.
4. Play the main path.
5. Commit source and generated `docs/` together when the owner asks to publish.
6. Push to `master`; GitHub Pages publishes `docs/`.

If a replacement is broken, point the old URL back to its preserved classic version and fix it without ceremony.
