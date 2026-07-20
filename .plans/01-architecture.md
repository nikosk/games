# Simple Architecture

This document is a practical reference, not a fixed design. Build only what the current game needs.

## Repository shape

```text
package.json       npm workspace root
games/             rewritten Phaser games
packages/          small pieces proven useful across games
classic/           preserved originals
docs/              generated GitHub Pages site
```

Create these folders gradually. Do not move every legacy game or create empty packages in advance.

## Game packages

A game should be self-contained and may use this small shape:

```text
games/<game-id>/
  package.json
  vite.config.ts
  game.json
  index.html
  src/
  assets/
  tests/
```

Add subfolders only when they help. Keep Phaser scenes focused on loading, input, display, and coordination. Move complicated rules into small TypeScript modules when that makes them clearer or testable.

`game.json` should contain only information used by the catalog or build, such as:

- stable ID
- title and short description
- public path
- catalog image
- preferred orientation when needed

Do not turn it into a second game configuration system.

## Shared code

Games use Phaser directly. Shared code may provide small conveniences for things several games genuinely need, such as:

- game startup and screen sizing
- touch controls
- sound settings and audio unlock
- saves
- common buttons or panels
- build and catalog tools

Do not build all of these before a real game needs them. Do not hide Phaser behind a custom engine. A game never imports another game.

A little duplication is fine. Extract shared code after two real uses make the common behavior obvious.

## Screen layout

A rewritten game should fill the available browser viewport. In landscape, the playfield should take most of the width and height, with compact information and controls overlaid where practical. Avoid permanent banners, sidebars, and footers that make the game itself small.

Keep responsive layout calculations separate from game rules so the pattern can be reused after another real game needs it.

## Builds and public paths

Each rewritten game builds with Vite to its own `dist/` directory. The portfolio build copies that output to:

```text
docs/<game-id>/
```

The public URL is:

```text
https://nikosk.github.io/games/<game-id>/
```

Use the Vite base `/games/<game-id>/`. Keep assets inside the game and avoid required CDNs. Never hand-edit hashed Vite output or generated files in `docs/`.

The catalog build also copies legacy games that have not yet been replaced. GitHub Pages publishes the committed `docs/` directory from `master`.

## Originals and URLs

Before replacing a game, copy its complete current version to `classic/`. Keep the old public URL working until the replacement is ready. A small HTML redirect is enough when an old URL moves.

Do not delete old versions or saved data automatically.

## Saves

Use `localStorage` for small progress and settings. Namespace keys by game and add a version when the data may change.

Only migrate an old save when preserving it is worthwhile and the mapping is clear. Otherwise start fresh while leaving the old key untouched.

## Assets

Keep each game's images, audio, and fonts with that game. Keep editable source files when useful, but do not require a large asset hierarchy.

Record the source and license of anything not made by the owner. Optimize files when load time or device performance shows a real problem.

## Changing this architecture

The first finished games should shape the architecture. If this document conflicts with a simpler working implementation, prefer the implementation and update the note.
