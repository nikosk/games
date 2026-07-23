# AGENTS.md

## What this project is

This is a solo hobby project for a developer and their daughter, who enjoy inventing, playing, and curating games together.

The purpose of the repository is to make it fast and enjoyable to turn an idea into a playable HTML game and add it to:

<https://nikosk.github.io/games/>

**This principle is fixed: fun, family creativity, and finished playable games come before process. Do not turn this repository into a workplace, a game studio simulation, or an enterprise software project.**

## How agents must communicate

- Respond tersely and concisely.
- Use clear, plain language.
- Do not invent jargon, acronyms, process names, or management language.
- Do not inflate a small task into a large plan.
- Do not repeat information the owner already knows.
- Ask a question only when a real product choice or missing fact prevents useful work.
- After changing files, briefly say what changed, what was checked, and anything still unfinished.
- Do not produce elaborate completion reports unless the owner asks for one.
- Do not spin up subagents unless the user specifically asks you to.

## How to work

- Make the smallest useful change that creates a playable result or makes the next game faster to create.
- Get the main interaction playable first.
- Play and tune before adding lots of content.
- Prefer a small finished game over a broad unfinished one.
- Remove features that are not fun or are too costly for their value.
- Treat plans and game briefs as living notes, not contracts.
- Follow the owner's current request over old planning documents.

Do not require formal phases, gates, spikes, experiments, risk registers, decision records, approval trails, evidence reports, estimates, or status tracking. Research only when a specific unknown blocks progress. Record only the short answer that will help later.

## Product direction

The owner and his daughter choose the games, themes, characters, tone, difficulty, and scope. Do not replace their creative direction with your own. Suggest simpler options when helpful, but do not quietly redesign the game.

A rewrite should preserve the good part of the original idea while improving weak gameplay, controls, presentation, or code. It does not need to reproduce every old detail or every feature listed in a brief.

## Technical choices

Rewritten games use:

- Phaser 3
- strict TypeScript
- Vite
- npm workspaces
- static HTML, JavaScript, CSS, images, and audio for GitHub Pages

Use Phaser for scenes, rendering, loading, input, cameras, animation, timing, tweens, and physics. Do not build replacements for features Phaser already provides. Do not add another framework or engine unless the owner asks.

Keep code direct and easy to change. A little duplication is better than a premature abstraction. Move code into `packages/` only after it is clearly useful to more than one real game.

## Simple repository shape

Build this gradually:

```text
games/       rewritten game packages
packages/    small pieces genuinely shared by games
classic/     preserved original versions
docs/        generated GitHub Pages site
```

A game package may contain only what it needs:

```text
games/<game-id>/
  package.json
  vite.config.ts
  game.json
  src/
  assets/
  tests/
```

Do not create empty folders, unused manifest fields, or speculative packages. Keep `game.json` small and add a field only when the build or catalog uses it.

## Making a game

Use this short loop:

1. Write a tiny brief: player fantasy, main action, controls, and visual mood.
2. Build the smallest playable version with temporary assets.
3. Play it on the intended device.
4. Tune the controls and rules.
5. Add coherent art, animation, feedback, and sound.
6. Add only enough content to make the game feel complete.
7. Build it, open it, play the main path, and publish it.

Temporary art is fine during development. A published game should feel intentional and visually coherent. Important actions should have clear visual and sound feedback. Touch targets must work comfortably on the target tablet.

Game canvases should fill the available viewport. In landscape, center the game area and let it use most of the width and height. Keep permanent interface chrome small; overlay compact information and controls instead of shrinking the playfield with large banners, sidebars, or footers.

## Code and checks

Keep scenes focused. Put complicated rules in small TypeScript modules when that makes them easier to understand or test. Clean up listeners, timers, tweens, and audio when scenes stop.

Test code where a bug would be annoying or hard to spot, especially game rules, saves, generated levels, pathfinding, simulations, and build output. Do not write tests merely to satisfy a quota.

Before calling a game finished:

- Run the relevant type check and tests.
- Make a production build.
- Open the built game without console errors.
- Play its main path on the target tablet when possible.

Optimize only after a real performance problem appears.

## Publishing and originals

Keep existing public games working while replacements are developed. Before replacing a game, preserve its original version under `classic/`. Do not delete classic versions unless the owner asks. Keep public URLs stable where practical.

The intended root commands are:

```bash
npm run dev
npm run typecheck
npm test
npm run build
npm run validate
npm run game:create
```

The root workspace currently provides `npm run typecheck`, `npm run build`, and `npm run validate`. Do not pretend the other commands work until they are created. For current legacy checks:

```bash
cd crocodile-game && npm run check
cd thegame && npm run build
```

`npm run build` will eventually generate `docs/`. GitHub Pages publishes the committed `docs/` directory from `master`. Never hand-edit `docs/` or hashed Vite output. Build asset paths for the `/games/` project path, not the domain root.

## Working safely

Before editing, check `git status --short` and read the relevant files and current diff. Do not overwrite, discard, move, reformat, or commit unrelated owner work. Do not create a commit unless the owner explicitly asks.

That is enough process. Spend the rest of the effort making the games fun.
