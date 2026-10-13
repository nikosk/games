# Bunny’s Picnic — version 1

A complete painted adventure for the Galaxy Tab S6 Lite, played in landscape. Five places, eight connected puzzles, visual requests, demonstrations, and wordless character reactions, music, sound effects, automatic saves, and a playable picnic ending. No reading is needed.

## Play

```bash
npm run dev --workspace @games/bunnys-picnic -- --host 0.0.0.0
```

Open the server’s `/games/bunnys-picnic/` address. Press the big play button. Tap an object, then its destination, or drag it there. Tap Bunny’s picture at bottom right for progressively more explicit help. The garden’s picture signs lead to the four other places; their garden picture brings you back.

Hold the gear for a little over a second to open the parent menu: sound, fullscreen, and a confirmed restart. Progress is saved on this browser/device after every meaningful action, including before an animation; reloading restores the completed action. Changing browser or clearing site data starts a new game. Characters communicate with gestures and picture bubbles. Short wordless reactions accompany them; no speech is loaded or played. The same visual guidance remains available with sound muted.

## Parent walkthrough

1. Spread the folded cloth.
2. Visit the shed and collect the plank and net.
3. Use the plank on the nook’s puddle. Move each of three leaf clumps into the hollow; Hedgehog gives the basket.
4. Use the net on the pond’s ball. Duck joins the picnic. Steps 3 and 4 can be reversed.
5. In the orchard, move the box under the branch and put the basket beneath the apples, in either order. The box can be placed before earning the basket.
6. Tap the branch. Puppy brings the apples home.
7. Back in the garden, put four plates in any empty places.
8. Share four apples. After the shared crunch, tap friends to dance, tap the ball to pass it around, and tap or drag apples between plates. The spare apple invites another crunchy snack.

The first child play session should follow the parent’s tablet check. Browser touch checks cannot establish how a three-year-old will understand the puzzles or how the actual tablet speakers and touch screen feel.

## Check and build

```bash
npm run typecheck --workspace @games/bunnys-picnic
npm test --workspace @games/bunnys-picnic
npm run build --workspace @games/bunnys-picnic
```

For a built preview, run `../../node_modules/.bin/vite preview --host 0.0.0.0 --port 4176` from this folder. The root site build includes this package through `game.json`, and the public catalog links to [Bunny’s Picnic](https://nikosk.github.io/games/bunnys-picnic/).

`review.html` preserves the design/art collection. `sample.html` preserves the original pond animation and the seven action studies (`?study=cloth`, `bridge`, `leaves`, `box`, `apples`, `plates`, `sharing`). These studies are separate from the playable adventure.

Painted artwork was generated with the built-in image tool; exact prompts and reference names live beside the images. Phaser animates the painted poses and separate props. See `assets/audio/README.md` for sound provenance. The original design is in `DESIGN.md`; v1 uses butterflies and birds for optional scenery play alongside the pond ripples and shed toys.

## Revised walk preview

`walk.html` shows the revised Bunny walk on the garden background, with pause, slow motion, frame stepping, and tap-to-walk. It uses the painted pieces in `assets/animation/bunny-rig-v1.png` and the articulated leg motion in `src/bunny-walk.ts`. Feet stay level during stance; movement distance drives the gait. This is a standalone parent preview and has not replaced the adventure’s old walking animation yet. The two `bunny-walk-v2/v3` sheets were unsuccessful frame-generation attempts and are not used in this preview. All three image prompts are preserved beside their files.

## Wordless guidance

Tap a character to see its request again. Help shows the needed object and destination, then a ghost demonstration on the next tap. Remote items get a picture route through the garden. Demonstrations never complete a puzzle or use an item. `src/guidance.ts` chooses cues from saved progress; `scripts/make-reactions.py` authors the short synthetic animal reactions. Retired speech assets remain as source history but are excluded from the built game and review.
