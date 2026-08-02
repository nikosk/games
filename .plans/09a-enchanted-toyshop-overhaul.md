# The Enchanted Toyshop — room and puzzle overhaul

## Goal

Turn both levels into rich paper-theatre rooms that children explore by tapping eight large objects. Each object opens a word-free puzzle selected from a tested randomized pool. Solving all eight restores the moon-door stars and lets the child follow the fairy onward.

Keep the public URL, package, level picker, responsive full-screen canvas, home/fullscreen controls, gentle feedback, and existing playable puzzles.

## Fixed choices

- Audience: ages 3–5.
- No visible instructions or voice-over.
- Numerals 1–5 and `+` / `=` are allowed in Level 2.
- Eight large stations per room; all eight stars open the door.
- Wrong answers reset only the current action. Solved stations remain solved until the room is completed or deliberately replayed.
- Each visit assigns eight distinct puzzle types to the eight room objects and generates fresh valid content.
- Art direction: handcrafted paper theatre — layered paper, felt toys, painted wood, embroidery, deckled edges, and shallow material shadows.
- Generated assets provide the final presentation. Phaser owns hit areas, puzzle rules, animation, timing, input, and feedback.

## Puzzle pool

### Level 1: visual play

1. Colour match — drag coloured costume pieces to matching toys.
2. Light melody — watch and repeat a three-light sequence.
3. Shadow fit — drag felt shapes onto their silhouettes.
4. Kaleidoscope dials — cycle three symbols to match a model.
5. Find the twin — choose the toy identical to the model.
6. Odd one out — choose the one toy that differs.
7. Toy tower — place three pieces in visible size order.
8. Peekaboo pairs — reveal and match three toy pairs.

### Level 2: early number play

1. Count and match — connect groups to numerals 1–5.
2. Picture addition — choose the sum of two small groups, never above 5.
3. Number train — fill one missing numeral in an increasing sequence.
4. More or fewer — choose the visibly larger group.
5. Number dials — cycle numeral dials to match pictured groups.
6. Number melody — repeat a three-button numeral/light sequence.
7. Find the group — choose the animal group matching a numeral ticket.
8. Odd one out — choose the numeral/group pair that does not match.

The same pure rule module may support related visual variants, but every station in a room must feel mechanically distinct.

## Generation rules

- Use a small seeded RNG so rule tests can reproduce every challenge.
- Correct answers appear exactly once; distractors are distinct.
- No puzzle starts solved.
- Melody sequences have no adjacent repeats.
- Dials start away from their targets and solve in at most two taps per dial.
- Addition totals stay within 1–5.
- Number trains contain one blank and remain within 1–5.
- More/fewer groups are never equal.
- A room visit has no duplicate puzzle type.
- Keep station assignments stable while the room is in progress; generate a new assignment only for a fresh replay.

## Story flow

1. On entering a fresh room, the paper fairy flies toward the moon door and disappears behind it.
2. Eight empty stars show that the door has lost its magic.
3. The fairy's glow points to an unsolved room object.
4. Every solved object restores one star.
5. After all eight stars return, the door opens. The fairy appears briefly and flies onward.
6. Level 1 continues to Level 2. Level 2 ends at the level picker until another room exists.

## Architecture

### Pure game modules

- `src/game/rng.ts` — deterministic random helpers.
- `src/game/puzzleTypes.ts` — station, challenge, and puzzle-type unions.
- `src/game/generation.ts` — room assignment and challenge generation.
- `src/game/roomState.ts` — idempotent solved progress and completion.
- `src/game/rules/` — Phaser-free rules and generators for each puzzle family.

### Phaser modules

- `src/scenes/RoomScene.ts` — shared room lifecycle: stations, stars, guide/fairy, overlays, token-safe delayed work, completion, cleanup.
- `src/scenes/ToyshopScene.ts` and `CountingRoomScene.ts` — room art, hotspots, and destination only.
- `src/puzzles/` — one view per puzzle type plus a registry.
- `src/ui/puzzleOverlay.ts` — shared paper-theatre puzzle stage.
- Preserve `src/ui/sceneShell.ts` and `LevelSelectScene.ts`.

Station identity and puzzle type must be separate: a station is a background object/hotspot; its assigned puzzle can change on a fresh visit.

## Art set

Use the selected paper-theatre study as the Level 1 anchor. Produce, inspect, and integrate no more than four additional assets in the first pass:

1. Level 2 paper-theatre room with eight clearly separated clickable objects.
2. Reusable paper-theatre puzzle panel.
3. Transparent paper fairy sprite.
4. Optional felt/paper prop sheet only if the first three are consistent.

Keep prompts and cost records in `assets/source/` and `assets/README.md`. Generated art must not define hit geometry or contain puzzle solutions.

## Delegated implementation waves

Because the working tree already contains uncommitted owner-requested work, use one writer in the repository at a time. Parallelize read-only design, review, and validation.

### Wave 1 — rules and generation

One writer adds RNG, room state, station assignment, all challenge generators, and invariant-heavy tests. Existing scene behavior remains playable.

Parallel review: one reviewer checks correctness and lifecycle compatibility; one design reviewer checks preschool clarity and generator constraints.

### Wave 2 — shared scene and Level 1

One writer separates station IDs from puzzle types, adds the shared room/overlay framework, ports the four existing views, implements the four new visual views, and wires eight hotspots to the selected paper-theatre room.

Parallel review: architecture/lifecycle review plus a vision-capable touch/readability review using `openai-codex/gpt-5.6-luna`. The parent also inspects every room, puzzle, and tablet screenshot directly.

### Wave 3 — Level 2 and story

One writer expands Level 2 to eight stations, implements its eight randomized views, adds fairy entry/completion animation, and preserves picker/navigation behavior.

Parallel review: rule coverage, timer/token safety, resize/fullscreen, regression review, and a separate vision-capable review using `openai-codex/gpt-5.6-luna`.

### Wave 4 — art integration and tuning

Generate and integrate the remaining selected-style assets, tune hit areas and difficulty, then complete a full browser/tablet playthrough.

## Checks

After every writer wave:

```bash
npm run typecheck --workspace @games/enchanted-toyshop
npm test --workspace @games/enchanted-toyshop
npm run build --workspace @games/enchanted-toyshop
```

Before completion:

```bash
npm run typecheck
npm test
npm run build
npm run validate
```

Browser checks at 16:9 and simulated 1024×768:

- canvas fills viewport;
- home/fullscreen controls remain reachable;
- all eight room objects have comfortable hit targets;
- no stale melody, drag, or celebration callbacks survive closing an overlay;
- solved progress survives opening the picker and returning;
- every puzzle type appears and can be solved;
- full Level 1 → Level 2 → picker path works without console errors.

## Current delegation

- Planning: `planner`, `scout`, and `advisor` completed in parallel.
- Wave 1: foundation/rule worker, followed by parallel correctness and design reviews. This wave is pure rules and does not require image input.
- Visual acceptance is never delegated to the default non-vision subagent model. The parent performs direct visual checks and uses `openai-codex/gpt-5.6-luna` for independent screenshot/art review.
- Later waves start only after the previous writer's diff is reviewed and corrected.

No subagent commits, stages, or pushes. The parent owns synthesis, generated-image calls, final browser testing, and any commit requested later.
