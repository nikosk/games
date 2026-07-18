# Choices to Make When They Matter

Most choices do not need a register. Make a reasonable implementation choice, try it in the game, and change it if it is not helping.

## Already chosen

- Phaser 3 for rewritten games
- strict TypeScript
- Vite
- npm workspaces
- static GitHub Pages output in committed `docs/`
- original games preserved under `classic/` before replacement
- game-specific rules stay in each game
- shared code is added only after real reuse appears

## Ask the owner about

Ask only when the answer changes the game they want:

- theme, characters, story, tone, or difficulty
- which game to make next
- whether a large feature is worth the extra work
- visual or musical direction when it is unclear
- narration languages
- replacing or removing existing content
- changing a public URL
- whether old saved progress should carry into a very different rewrite

## Decide while building

Agents may choose ordinary implementation details without opening a decision process:

- file and class names
- Phaser APIs and scene structure
- exact data shapes
- test tools
- atlas, tile, or audio workflow
- control sizes and tuning
- compression settings

Try the simplest likely solution first. Research only if an unknown blocks useful work.

## Known things to handle

- The root workspace and portfolio build still need to be created.
- The current Critter Tactics public entry serves raw Vite source and needs a built transitional version.
- The exact target tablet should be noted when device tuning begins.
- Games with old saves may either import them or start fresh; leave old keys untouched either way.
- Third-party art and audio need clear permission and credits.

## Notes from investigations

When an investigation is genuinely useful, record only:

- the question
- the answer
- the command, link, or example needed to reproduce it
- any important limitation

Do not create IDs, timeboxes, owners, status tables, approval steps, or follow-up paperwork.
