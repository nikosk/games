# The Simple Plan

## North star

This is a hobby project for a solo developer and their daughter.

The goal is simple: **turn ideas into fun, playable games quickly, then collect the games we enjoy in one portfolio at <https://nikosk.github.io/games/>.**

Fun matters more than process. The plan should make creating games easier, not make the project feel like a job.

## Ground rules

- Build one small playable thing at a time.
- Choose what to make next based on interest, not a fixed production schedule.
- Play together early and often.
- Keep ideas that are fun. Cut ideas that are not.
- Prefer a finished small game over a large unfinished one.
- Add tools and shared code only when they make the next game easier to build.
- Keep planning brief and useful.

There are no required phases, gates, spikes, experiments, risk registers, approval records, effort estimates, evidence reports, or status ceremonies. Investigate an unknown only when it blocks the game, then make a reasonable choice and continue.

## Technical foundation

Rewritten games use:

- Phaser 3
- strict TypeScript
- Vite
- npm workspaces
- static files published through GitHub Pages

Keep the setup small:

```text
games/       rewritten games
packages/    code that is genuinely useful to more than one game
classic/     preserved original games
docs/        generated site published by GitHub Pages
```

The foundation only needs to provide:

1. A quick way to start a game.
2. Shared basics such as screen sizing, input, sound, saves, and common UI when they are truly reused.
3. One command to build the portfolio into `docs/`.
4. Simple checks that catch broken builds, missing files, and games that fail to open.
5. Eventually, a small game template or generator based on patterns that have already worked.

Do not build a general-purpose game platform. Do not create empty packages or abstractions for possible future needs.

## The game-making loop

Use this loop for every new game or rewrite:

1. Pick an idea that sounds fun to us.
2. Write a tiny brief: the fantasy, main action, controls, and visual mood.
3. Build the smallest playable version of the main action.
4. Play it together.
5. Improve what feels good and remove what does not.
6. Add enough art, animation, sound, and content for it to feel complete.
7. Check it on the target tablet and in a production build.
8. Publish it to the portfolio.

Repeat as long as the game remains enjoyable to make.

## What “done” means

A game is ready when:

- The main interaction is fun and easy to understand.
- It has a clear start, goal, and ending or replay loop.
- Touch controls work well on the target tablet.
- The visuals, animation, feedback, and sound feel intentional.
- Important progress is saved when the game needs it.
- The production build opens without missing files or console errors.
- The original version is preserved under `classic/` before it is replaced.
- We are happy to have it in the portfolio.

A game does not need a large campaign, a fixed number of levels, every idea in its brief, or elaborate supporting systems to be done.

## Portfolio

These are available ideas, not a binding schedule:

| Existing game | Possible rewrite |
|---|---|
| Train Tracks | [Railway Workshop](06-game-railway-workshop.md) |
| Animal Memory | [Wild Pairs](07-game-wild-pairs.md) |
| Monkey Banana | [Canopy Caper](08-game-canopy-caper.md) |
| Mouse Adventure | [Cheese Heist](09-game-cheese-heist.md) |
| Valley Explorer | [Valley of Echoes](10-game-valley-echoes.md) |
| Robot Factory | [Sparky's Assembly Line](11-game-sparky-assembly.md) |
| Code Adventure | [Bit's Grand Adventure](12-game-bit-adventure.md) |
| Coco's Lost Hat | [Coco's Lost Hat](13-game-coco-hat.md) |
| Hippo | [Hippo's Great Feast](14-game-hippo-feast.md) |
| Little Chef's Kitchen | [Little Chef's Grand Kitchen](15-game-little-chef.md) |
| Critter Tactics | [Critter Tactics](16-game-critter-tactics.md) |

Start with Railway Workshop if no other idea is more exciting. After that, choose freely.

The numbered game briefs in this directory are idea banks and creative references. Their feature counts and detailed scopes are wishes, not promises. Change or shrink them whenever that makes a game more fun or more likely to ship.

The architecture, tooling, quality, media, and decision documents are background reference only. They are not required workflows and must not block making a game.

## Publishing

Keep current public games working while replacements are built. Preserve an original before replacing it, and keep public URLs stable where practical.

The intended root commands are:

```bash
npm run dev
npm run typecheck
npm test
npm run build
npm run validate
npm run game:create
```

Create only the commands that are useful now. `npm run build` should generate the committed `docs/` site. Do not hand-edit generated files in `docs/`.

Before publishing, run the relevant checks, open the built game, play its main path, and confirm the portfolio link works. Then publish and move on.

## Next steps

1. Create the small root workspace and portfolio build.
2. Make the current games publish reliably, including Critter Tactics.
3. Build one complete Railway Workshop level as the first Phaser/TypeScript example.
4. Extract only the shared pieces that the finished example proves useful.
5. Add a lightweight game starter when it will genuinely speed up the next idea.
