# Game Studio Rewrite — Master Plan

**Plan status:** Approved direction; implementation not started
**Deployment target:** <https://nikosk.github.io/games/>
**Technical baseline:** Phaser 3, strict TypeScript, Vite, npm workspaces

## How to use this plan

1. Resolve decision and research gates listed for the next workstream in [05-decisions-and-risks.md](05-decisions-and-risks.md).
2. Preserve the affected original under `classic/` immediately before replacement work begins.
3. Implement one playable milestone from the relevant game brief.
4. Apply the universal and creative gates in [03-quality-and-testing.md](03-quality-and-testing.md).
5. Build and validate `site-dist/`; publish only through the automated Pages workflow.
6. Update the status table and evidence links in this file.

> The target commands below are planned contracts until Phase 0 creates them: `npm run dev`, `npm run typecheck`, `npm test`, `npm run build`, `npm run validate`, and `npm run game:create`.

## Document map

| Document | Purpose |
|---|---|
| [01-architecture.md](01-architecture.md) | Repository layout, shared package APIs, game contract, saves, migration, ADRs |
| [02-tooling-and-ci.md](02-tooling-and-ci.md) | Workspace setup, Vite, assembly, validation, GitHub Pages deployment |
| [03-quality-and-testing.md](03-quality-and-testing.md) | Unit/browser/release tests and gates G1–G16, C1–C8 |
| [04-media-production.md](04-media-production.md) | Art bibles, asset pipeline, animation/audio deliverables and budgets |
| [05-decisions-and-risks.md](05-decisions-and-risks.md) | Owner decisions, research contracts, risk register |
| [06–16 game briefs](#game-briefs) | Implementation-ready scope for each rewrite |
| [TEMPLATE-game-brief.md](TEMPLATE-game-brief.md) | Required structure for future game briefs |

## Portfolio status

| Order | Rewrite | Legacy source | Phase | Status | Brief |
|---:|---|---|---:|---|---|
| 1 | Railway Workshop | `train-tracks.html` | 1 | Not started | [Brief](06-game-railway-workshop.md) |
| 2 | Wild Pairs | `animal-memory.html` | 2 | Not started | [Brief](07-game-wild-pairs.md) |
| 3 | Canopy Caper | `monkey-banana.html` | 2 | Not started | [Brief](08-game-canopy-caper.md) |
| 4 | Cheese Heist | `mouse-adventure.html` | 3 | Not started | [Brief](09-game-cheese-heist.md) |
| 5 | Valley of Echoes | `valley-explorer.html` | 4 | Not started | [Brief](10-game-valley-echoes.md) |
| 6 | Sparky's Assembly Line | `robot-factory.html` | 4 | Not started | [Brief](11-game-sparky-assembly.md) |
| 7 | Bit's Grand Adventure | `code-adventure.html` | 4 | Not started | [Brief](12-game-bit-adventure.md) |
| 8 | Coco's Lost Hat | `crocodile-game/` | 3 | Not started | [Brief](13-game-coco-hat.md) |
| 9 | Hippo's Great Feast | `hippo.html` | 3 | Not started | [Brief](14-game-hippo-feast.md) |
| 10 | Little Chef's Grand Kitchen | `little-chef-kitchen/` | 5 | Not started | [Brief](15-game-little-chef.md) |
| 11 | Critter Tactics | `thegame/` | 5 | Not started; current live legacy entry is broken | [Brief](16-game-critter-tactics.md) |

## Game briefs

The numbered file order is the approved production sequence. Phase numbers indicate opportunities for parallel work only after their shared prerequisites are stable.

## 1. Portfolio State Summary (as discovered)

### 1.1 Current Inventory

| # | Game | Path | LOC | Engine | Audio | Persistence | Touch | Tests | Remake Name |
|---|------|------|-----|--------|-------|-------------|-------|-------|-------------|
| 1 | **Train Tracks** | `train-tracks.html` | 631 | DOM/CSS grid | None | None | ✅ Drag-drop | None | Railway Workshop |
| 2 | **Animal Memory** | `animal-memory.html` | 537 | DOM/CSS | None | None | ✅ Tap | None | Wild Pairs |
| 3 | **Monkey Banana** | `monkey-banana.html` | 613 | Vanilla Canvas | None | None | ✅ D-pad | None | Canopy Caper |
| 4 | **Mouse Adventure** | `mouse-adventure.html` | 1,301 | Vanilla Canvas | Web Audio | None | ❌ No touch | None | Cheese Heist |
| 5 | **Valley Explorer** | `valley-explorer.html` | 2,898 | Vanilla Canvas | None | None | ✅ Drag-pan | None | Valley of Echoes |
| 6 | **Robot Factory** | `robot-factory.html` | 1,766 | DOM/CSS + Canvas | Web Audio | ✅ localStorage | ✅ Tap | None | Sparky's Assembly Line |
| 7 | **Code Adventure** | `code-adventure.html` | 2,540 | Vanilla Canvas | ✅ Procedural | ✅ localStorage | ✅ Tap | None | Bit's Grand Adventure |
| 8 | **Coco's Lost Hat** | `crocodile-game/` | 2,201 | SVG/CSS scenes | ✅ 22 MP3 | None | ✅ Tap | ✅ 4 integrity | Coco's Lost Hat (expanded) |
| 9 | **Hippo's Great Feast** | `hippo.html` | 1,579 | Vanilla Canvas | ✅ Procedural | ✅ localStorage | ❌ No touch | None | Hippo's Great Feast (remake) |
| 10 | **Little Chef's Kitchen** | `little-chef-kitchen/` | 4,097 | Phaser 3.70 CDN | Stub only | ✅ localStorage | ✅ Phaser | None | Little Chef's Grand Kitchen |
| 11 | **Critter Tactics** | `thegame/` | 2,700 | Phaser 3.80+Vite | None | ✅ localStorage | ✅ Phaser | None | Critter Tactics (expanded) |

### 1.2 Current Architecture Families

| Archetype | Count | Games |
|-----------|-------|-------|
| **A: Single-file Vanilla HTML** | 8 | train-tracks, animal-memory, monkey-banana, mouse-adventure, valley-explorer, robot-factory, code-adventure, hippo |
| **B: Multi-file Vanilla (SVG/CSS)** | 1 | crocodile-game |
| **C: Phaser 3 CDN (global script)** | 1 | little-chef-kitchen |
| **D: Phaser 3 + Vite (ESM, npm)** | 1 | thegame |

### 1.3 Key Infrastructure Gaps

- No root `package.json` or workspace
- Root `.gitignore` exists but the target workspace/build exclusions are not established yet
- No TypeScript anywhere
- No CI/CD pipeline
- 10 of 11 games have zero tests
- All shared patterns duplicated ~19K lines across games
- Critter Tactics publishes raw Vite source (broken deployment confirmed)
- 2 games keyboard-only on tablets (Mouse Adventure, Hippo)

### 1.4 Planning authority

`AGENTS.md` defines repository-wide implementation rules. This `.plans/` set records the approved rewrite scope and execution details; game briefs control game-specific implementation. When a product, public-URL, or architecture conflict remains, stop at the relevant decision gate and ask the owner.

---

## 2. Vision Alignment (AGENTS.md)

The AGENTS.md (project-level instructions file) establishes:

### 2.1 Non-Negotiable Technical Direction
- ✅ **Phaser 3** as the game engine
- ✅ **TypeScript** for all game and shared code
- ✅ **Vite** for dev and production builds
- ✅ **npm workspaces** for repository packages
- ✅ Static HTML/JS/CSS/images/audio as final GitHub Pages output
- ❌ No custom engine replacing Phaser facilities

### 2.2 Target Layout
```
AGENTS.md / package.json (root workspace)
classic/              ← Preserved originals before replacements
games/                ← Remade games, each a package
  railway-workshop/
  wild-pairs/
  canopy-caper/
  cheese-heist/
  valley-of-echoes/
  sparkys-assembly-line/
  bits-grand-adventure/
  cocos-lost-hat/
  hippos-great-feast/
  little-chefs-grand-kitchen/
  critter-tactics/
packages/             ← Shared production systems
  core/  input/  audio/  ui/  effects/  testing/  tools/
docs/
  architecture.md
  production-plan.md
  art-and-audio.md
  games/<game-id>.md
site-dist/            ← Generated deployment artifact
```

### 2.3 Remake Names (from AGENTS.md game list)

The approved target names use these mappings — I adopt them throughout this roadmap:

| Legacy | Remake Name | Game ID |
|--------|-------------|---------|
| Train Tracks | **Railway Workshop** | `railway-workshop` |
| Animal Memory | **Wild Pairs** | `wild-pairs` |
| Monkey Banana | **Canopy Caper** | `canopy-caper` |
| Mouse Adventure | **Cheese Heist** | `cheese-heist` |
| Valley Explorer | **Valley of Echoes** | `valley-of-echoes` |
| Robot Factory | **Sparky's Assembly Line** | `sparkys-assembly-line` |
| Code Adventure | **Bit's Grand Adventure** | `bits-grand-adventure` |
| Coco's Lost Hat | **Coco's Lost Hat** (expanded) | `cocos-lost-hat` |
| Hippo's Great Feast | **Hippo's Great Feast** (full remake) | `hippos-great-feast` |
| Little Chef's Kitchen | **Little Chef's Grand Kitchen** | `little-chefs-grand-kitchen` |
| Critter Tactics | **Critter Tactics** (expanded) | `critter-tactics` |

### 2.4 Classic Preservation Rule

Before replacing any game, move the original to `classic/<game-id>/`. This preserves the public URL until the remake is deployed and enables comparison. Use HTML redirect pages when a URL must move.

---

## 3. Shared Package Architecture

### 3.1 Package Plan

All packages live under `packages/<name>/` and use TypeScript, npm workspaces.

| Package | Purpose | Dependencies | Consumed By |
|---------|---------|--------------|-------------|
| `core` | Game bootstrap, Phaser config, screen sizing, fullscreen, resize handling, lifecycle, save manager | Phaser | All games |
| `input` | Named input actions, keyboard mapping, touch/pointer abstraction, virtual d-pad | Phaser (minimal) | All games |
| `audio` | Audio buses, loading, playback, mute/volume settings, context unlock, pause-on-hidden | Phaser (or none) | All games |
| `ui` | Menus, buttons, panels, loading screen, pause screen, settings screen, completion/failure screens, scene transitions | Phaser, maybe core | All games |
| `effects` | Reusable particles, trails, flashes, hit-pause, camera shake | Phaser | All games |
| `testing` | Test fixtures, scene harness, browser helpers, matchers | Phaser, Vitest | All games, CI |
| `tools` | Game project generator (`create-game`), asset validation, build assembly, manifest checks | Node-only | Developer CLI, CI |

### 3.2 Package Dependency Graph

```
core  ←  input (minimal)
  ↓
  ├── audio (standalone or Phaser-backed)
  ├── ui  ←  core, audio
  ├── effects  ←  core
  └── testing (dev-only)

tools  ←  Node only (no Phaser)
```

### 3.3 Research Tasks (before building)

1. **FR-01 — Phaser 3 bootstrap conventions**: Determine the standard Phaser config shape (resolution, scale mode, physics, render mode) all games will share. Write a `createGame(config, scenes)` helper in `core`.
2. **FR-02 — Save system schema**: Design the versioned save format, namespace per game, and migration API.
3. **FR-03 — Audio architecture**: Decide between Phaser's built-in audio manager vs. a thin custom wrapper. Determine bus design (music, SFX, narration, UI).
4. **FR-04 — Input action naming**: Define the canonical action names (e.g., `primary`, `secondary`, `menu`, `pause`, `move_left`, `move_right`, `jump`, `action`) that games can remap.
5. **FR-05 — Screen size convention**: Agree on logical game dimensions, scale mode, safe areas for both landscape tablet and portrait phone.
6. **FR-06 — Asset pipeline**: Determine whether to use Phaser's asset pack JSON, a custom manifest format, or both. Plan sprite atlas workflow.
7. **FR-07 — Level data schema**: Design the generic parts of a level manifest (metadata, tile maps, entity spawns, win conditions) without constraining game-specific data.

---

## 4. Production Phases

### 4.1 Phase Map Overview

```
Phase 0: ESTABLISH    (Foundation + classic preservation)
Phase 1: PROOF        (Railway Workshop + packages/core)
Phase 2: GENRE PROOF  (Wild Pairs + Canopy Caper)
Phase 3: ADVENTURE    (Cheese Heist + Coco's Lost Hat + Hippo's Great Feast)
Phase 4: SYSTEMS      (Valley of Echoes + Sparky's Assembly Line + Bit's Grand Adventure)
Phase 5: FLAGSHIP     (Little Chef's Grand Kitchen + Critter Tactics)
Phase 6: FACTORY      (Tooling + generator + validation)
```

### 4.2 Phase 0: Establish Foundation

**Goal:** Create the buildable workspace, preservation mechanism, migration-aware assembler, and validated automatic deployment without moving untouched games early.

**Workstreams:**

| Workstream | Tasks | Relative Effort | Dependencies |
|------------|-------|-----------------|--------------|
| **W0.1 Workspace setup** | Create root `package.json` (npm workspaces), `tsconfig.base.json`, `.gitignore`, `.npmrc` | S | None |
| **W0.2 Package conventions + tools start** | Define the package contract and create `packages/tools` for Phase 0; W1 creates runtime packages with their first real consumer and test | S | W0.1 |
| **W0.3 Preservation mechanism** | Create `classic/` conventions, a preservation manifest/check, and redirect templates without moving untouched games. Each later phase preserves only the games it starts. | M | None |
| **W0.4 CI/CD and transitional Critter build** | Build/test/validate/upload/deploy on every `master` push; install/build current `thegame/` from its lockfile and publish its `dist/` at `/games/thegame/` until the rewrite replaces it | M | W0.1, TS-A |
| **W0.5 Catalog and migration assembly** | Implement `site-dist/` assembly plus a migration manifest with `copy-file`, `copy-directory`, `legacy-vite-build`, `rewrite`, and `redirect` strategies; generate the catalog from actual outputs | M | W0.1 |
| **W0.6 Development commands** | Establish root `npm run` commands: `dev`, `typecheck`, `test`, `build`, `validate`, `game:create` (stub) | S | W0.1 |
| **W0.7 Phase 0 research gates** | Execute the ordered Phase 0 research table below, record reproducible evidence, and update affected decisions/ADRs. Phase 1 research remains scheduled in the central registry. | M | None |

**Phase 0 blocking research order:**

| Order | IDs | Owner | Unlocks | Required outcome |
|---:|---|---|---|---|
| 1 | TS-A | Tech lead | W0.4 workflow implementation | Confirm official Pages actions, permissions, source setting, and artifact contract |
| 2 | TS-C | Tech lead | W0.5 assembler | Prove local Vite output → `site-dist/<id>/` copy and project-base resolution |
| 3 | TS-D | Tech lead | W0.5 validation | Prove manifest/migration/link/asset failures are actionable and deterministic |
| 4 | QR-05 | Tech lead | W0.4 completion | Run a deployment cycle; define propagation retry and rollback verification |

No other FR/AS/MS/QR task blocks Phase 0. D05, TS-B, FR-01–FR-05, AS-01/02/07/08, MS-07/08, and QR-01–04 must resolve before the specific Phase 1 workstream named in [05-decisions-and-risks.md](05-decisions-and-risks.md); later tasks keep their recorded phase deadlines.

**Deliverables:**
- Root workspace with working `npm test` (including the existing Coco integrity tests)
- Preservation convention, manifest, and redirect templates exist; untouched public entries remain in place
- CI deploys a validated `site-dist/` on every `master` push; current Critter Tactics is built before publication instead of serving raw Vite source
- [Architecture](01-architecture.md) and migration decisions are recorded
- The assembled catalog contains every current game at a working preserved URL

**Gate:** Root workspace passes `npm run typecheck`, `npm test`, `npm run build`, `npm run validate`, and browser smoke for every catalog entry. CI is green, Critter's `/games/thegame/` entry loads built output, foundation research is documented, and no public URL has regressed.

**Parallelization:** W0.3 (classic preservation) is independent of W0.1 and can run first. W0.2, W0.4, W0.5 depend on W0.1. W0.7 depends on nothing except reading AGENTS.md.

**Relative effort:** 5 (S=1, M=3, L=5)

---

### 4.3 Phase 1: Proof — Railway Workshop

**Goal:** Build Railway Workshop and the `packages/core` foundation simultaneously. This proves the Phaser/TypeScript/Vite/npm workspace pipeline end-to-end.

**Workstreams:**

| Workstream | Tasks | Relative Effort | Dependencies |
|------------|-------|-----------------|--------------|
| **W1.1 packages/core v1** | Implement Phaser game bootstrap, standard config, screen sizing/fullscreen, resize handling, scene lifecycle helpers | L | Phase 0 |
| **W1.2 packages/input v1** | Implement named action mapping, keyboard bindings, pointer abstraction, configurable action list | M | Phase 0 |
| **W1.3 packages/audio v1** | Implement audio unlock, bus system (music/SFX/UI), volume settings, play/stop/fade, mute toggle, pause-on-hidden | M | Phase 0 |
| **W1.4 packages/ui v1** | Implement loading screen, basic button component, pause overlay, settings panel stub | M | Phase 0 |
| **W1.5 packages/effects v1** | Implement particle emitter, camera shake, flash, hit-pause utilities | M | Phase 0 |
| **W1.6 Railway Workshop — core interaction** | Create `games/railway-workshop/` package with Phaser scene, grid placement, track piece rotation, connections validation, train pathfinding | XL | W1.1, W1.2 |
| **W1.7 Railway Workshop — one complete level** | Design a single fully playable level with start/end stations, obstacles, and train animation | M | W1.6 |
| **W1.8 Railway Workshop — tablet controls** | Tune touch placement, drag feedback, hit targets for tablet use. Ensure reliable track piece manipulation. | M | W1.7 |
| **W1.9 Railway Workshop — art and animation** | Start with clearly marked geometric assets, approve the gouache model-railway style tile, then replace every temporary train/track/terrain/UI asset and complete required animations | L | W1.6, MS-01–MS-03 |
| **W1.10 Railway Workshop — audio** | Prototype cues early, then deliver the approved whistle, clack, steam, placement, UI, success/failure, ambience, and music set with provenance | M | W1.3, W1.7, D13–D16 |
| **W1.11 Railway Workshop — save system** | Level completion persistence, settings save | M | W1.1 (save API), W1.7 |
| **W1.12 Railway Workshop — content** | Design and validate the typed level schema, author all 12 levels across 3 regions, and unlock sandbox after region 1 | L | W1.6, W1.7, FR-07 |
| **W1.13 Railway Workshop — tests** | Unit tests for grid logic, connection validation, pathfinding. Browser smoke test. | M | W1.7 |
| **W1.14 Classic Train Tracks preservation** | Copy the complete legacy entry to `classic/train-tracks/`, verify checksums/archive smoke, keep the original URL until release, then install the redirect | S | W0.3 |

**Deliverables:**
- Packages `core`, `input`, `audio`, `ui`, `effects` at v1 with TypeScript, unit tests
- Railway Workshop: all 12 levels and sandbox with final art, animation, effects, audio, saves, and target-tablet controls
- Production build outputs to `site-dist/railway-workshop/`, which publishes at `/games/railway-workshop/`
- Working GitHub Pages deployment from CI
- Classic Train Tracks preserved under `classic/` and accessible

**Gate:**
- `npm run build` produces `site-dist/` with Railway Workshop
- `npm test` passes (core packages + Railway Workshop tests)
- Railway Workshop runs on target tablet with no console errors
- Every authored level passes schema/connectivity/solvability checks and the full 12-level playthrough passes
- Classic Train Tracks still available via redirect

**Parallelization:** W1.1–W1.5 (packages) can be built partially in parallel. W1.6 (core interaction) depends on W1.1 and W1.2 but can begin with stubs. W1.10 (audio) depends on W1.3 but can use procedural stubs early. W1.14 is independent.

**Relative effort:** 11 (S=1, M=3, L=5)

---

### 4.4 Phase 2: Genre Proof — Wild Pairs + Canopy Caper

**Goal:** Prove the shared foundation handles two fundamentally different genres — a matching game and a platformer. This forces the packages to be generic enough.

**Workstreams:**

| Workstream | Tasks | Relative Effort | Dependencies |
|------------|-------|-----------------|--------------|
| **W2.1 packages/core v2** | Refine based on feedback from Phase 1. Add missing lifecycle hooks, improve resize handling. | S | Phase 1 |
| **W2.2 packages/ui v2** | Add menu screen component, level-select grid, completion screen, settings screen. Make themeable. | L | Phase 1 |
| **W2.3 packages/audio v2** | Add music crossfade, per-game volume profiles | M | Phase 1 |
| **W2.4 Wild Pairs — core interaction** | Create `games/wild-pairs/` with card-flip mechanics, match detection, board generation | L | W2.2 |
| **W2.5 Wild Pairs — habitats** | Implement 8 habitat themes (savanna, ocean, forest, etc.) with distinct card sets and backgrounds | L | W2.4 |
| **W2.6 Wild Pairs — album collection** | Implement persistent field journal/album showing discovered animals | M | W2.4, W1.11 save pattern |
| **W2.7 Wild Pairs — audio** | Nature ambience per habitat, animal calls on match, card-flip SFX, music | M | W2.3, W2.4 |
| **W2.8 Wild Pairs — tests** | Board generation validation, match logic, album persistence tests | M | W2.4 |
| **W2.9 Canopy Caper — core interaction** | Create `games/canopy-caper/` with side-view climbing, vine swinging, jump chain mechanics | L | Phase 1 packages |
| **W2.10 Canopy Caper — vertical slice and content** | Finish one climb at final media quality, then author and validate all 30 stages and challenge routes using the proven pipeline | L | W2.9, FR-08, MS-01 |
| **W2.11 Canopy Caper — tablet controls** | Touch gesture tuning for climbing/swinging — swipe direction detection, reliable jump timing | M | W2.10 |
| **W2.12 Canopy Caper — audio** | Jungle ambience, vine swing whoosh, fruit collect chime, landing thud, music | M | W2.3, W2.10 |
| **W2.13 Canopy Caper — save + tests** | Level progress save, physics/collision tests, browser smoke test | M | W2.10, W1.11 |
| **W2.14 Classic preservation** | Copy and verify Animal Memory and Monkey Banana archives before edits; redirect original URLs only after each replacement passes release gates | S | W0.3 |
| **W2.15 packages/ui v3** | Feed back platformer-specific UI needs (HUD, pause menu options). Generalize menu components. | M | W2.9–W2.12 |

**Deliverables:**
- Wild Pairs: 8 habitats, card-flip mechanics, album, save, audio
- Canopy Caper: 30 authored stages and challenge routes with final character/environment art, animation, effects, saves, and audio
- Packages matured to v2/v3 with feedback from two real game implementations
- Classic Animal Memory and Monkey Banana preserved

**Gate:**
- Both games build and publish from CI
- Wild Pairs: full 8-habitat playthrough without errors
- Canopy Caper: full stage set passes content validation, critical-path browser tests, and target-tablet playthroughs
- No game-specific hacks in shared packages

**Parallelization:** W2.4–W2.8 (Wild Pairs) and W2.9–W2.13 (Canopy Caper) can run in parallel after Phase 1 packages are available. W2.1–W2.3 (package improvements) run in parallel with game work.

**Relative effort:** 12 (S=1, M=3, L=5)

---

### 4.5 Phase 3: Adventure Wave — Cheese Heist, Coco's Lost Hat, Hippo's Great Feast

**Goal:** Deliver three adventure/character-driven games that exercise character animation, story scenes, dialogue systems, and richer level mechanics.

**Workstreams:**

| Workstream | Tasks | Relative Effort | Dependencies |
|------------|-------|-----------------|--------------|
| **W3.1 Character animation conventions** | Prove atlas/tag/state naming and small Phaser animation helpers; each game retains its own movement and character state machines | L | Phase 2 packages, FR-08 |
| **W3.2 Dialogue presentation primitives** | Provide reusable text-panel/typewriter/skip UI and branch-data validation; each game owns story, dialogue, and scene rules | L | W3.1, FR-09 |
| **W3.3 Camera system extensions** | Add camera zones, follow-target smoothing, cutscene camera control, parallax layering support | M | Phase 2 packages |
| **W3.4 Cheese Heist — core** | Stealth movement, sight-line detection, distraction mechanics, hide-and-seek with guard AI | L | W3.1, W3.3 |
| **W3.5 Cheese Heist — campaign content** | Finish the tutorial heist as the final-quality slice, then author all 6 rooms with guard patrols, hiding, distractions, collectibles, and escapes | L | W3.4 |
| **W3.6 Cheese Heist — audio + tests** | Heist jazz music, footstep/gadget SFX, guard alert sound, movement/collision tests, guard AI tests | M | W3.5 |
| **W3.7 Coco's Lost Hat — expansion** | Rebuild paper-theatre scenes in Phaser with parallax layers, animated character rigs, watercolour textures | XL | W3.1, W3.2 |
| **W3.8 Coco's Lost Hat — branching routes** | Implement choose-your-path branching in the story, puzzle mini-games (swipe, drag, pattern match) | L | W3.7 |
| **W3.9 Coco's Lost Hat — audio** | Keep existing MP3 narration, add environmental ambience, interactive SFX, hat-decoration jingles | M | W3.7 |
| **W3.10 Coco's Lost Hat — tests** | Adapt existing integrity tests, add Phaser scene tests, multi-route validation | M | W3.7, W3.8 |
| **W3.11 Hippo's Great Feast — core platforming** | Rebuild hippo character with dive, charge, spit, pound, glide abilities. Level structure, collectibles, cooking mechanics | XL | W3.1, W3.3 |
| **W3.12 Hippo's Great Feast — content** | Finish one region as the final-quality slice, then author all 10 stages, ability combinations, recipes, hidden routes, and final boss | L | W3.11, D24 |
| **W3.13 Hippo's Great Feast — audio + tests** | Regional music, impact trails, cooking effects, platforming physics tests, level integrity tests | M | W3.12 |
| **W3.14 Classic preservation** | Copy and verify Mouse Adventure, `crocodile-game/`, and Hippo archives before edits; redirect each original URL only at its release gate | S | W0.3 |

**Deliverables:**
- Proven low-level character-animation conventions, dialogue presentation primitives, and camera extensions without moving game rules into shared packages
- Cheese Heist: all 6 rooms with complete stealth/caper mechanics and final media
- Coco's Lost Hat: full Phaser rebuild with 6 biomes, 18 scenes, branching routes, puzzles, and every narration language approved by D36 from CO-R05 evidence
- Hippo's Great Feast: all 10 stages, approved abilities, recipes, bosses, and final media
- Classic versions of Mouse Adventure, Coco, and Hippo preserved

**Gate:**
- Dialogue presentation/branch-validation primitives serve distinct game scenes without importing story content
- Camera extensions work for both top-down (Cheese Heist) and side-view (Hippo)
- Atlas/animation conventions support each game's independent character state machine
- Each game has passing tests and builds without errors

**Parallelization:** W3.1–W3.3 (shared systems) can run in parallel. All three games can be developed in parallel once shared systems are stable. Coco (W3.7–W3.10) has the most unique requirements but benefits from W3.1 and W3.2 early.

**Relative effort:** 14 (S=1, M=3, L=5)

---

### 4.6 Phase 4: Systems Wave — Valley of Echoes, Sparky's Assembly Line, Bit's Grand Adventure

**Goal:** Tackle the three most technically complex games — procedural world generation, physical programming, and visual programming puzzles. These need new shared systems.

**Workstreams:**

| Workstream | Tasks | Relative Effort | Dependencies |
|------------|-------|-----------------|--------------|
| **W4.1 Valley world runtime** | Implement Valley-specific authored-zone loading, transitions, entity culling/streaming, weather, and deterministic state using shared core camera/lifecycle primitives | XL | Phase 3 packages, FR-10 |
| **W4.2 Command interpreter** | Create reusable block-based command execution engine: sequence, loop, conditional, sub-routine, sensor. Render-agnostic core. | L | Phase 3 packages |
| **W4.3 Puzzle validation system** | Implement automatic puzzle solvability checker, optimal-solution detection, replay scrubber | M | W4.2 |
| **W4.4 Valley of Echoes — world building** | Build discovery journal, landmarks, traversal skills, weather events, ecosystem interactions on top of W4.1 | L | W4.1 |
| **W4.5 Valley of Echoes — content** | Author 6–8 connected biome-zones with 20–25 species, landmarks, restoration puzzles, Echo shrines, and journal entries | L | W4.4 |
| **W4.6 Valley of Echoes — audio + tests** | Spatial ambient sound, weather SFX, creature calls, procedural generation tests, world integrity tests | M | W4.5 |
| **W4.7 Sparky's Assembly Line — game** | Build factory floor puzzle scenes, command module snap/drag, program runner, failure inspection | L | W4.2, W4.3 |
| **W4.8 Sparky's Assembly Line — content** | Design 20 spatial puzzles introducing commands, loops, sensors, reusables, scoring | L | W4.7 |
| **W4.9 Sparky's Assembly Line — audio + tests** | Mechanical SFX, command block sounds, Sparky animations, command execution tests | M | W4.8 |
| **W4.10 Bit's Grand Adventure — game** | Build tile-based puzzle scenes, drag-and-drop command palette, step-by-step execution, debug viewer | L | W4.2, W4.3 |
| **W4.11 Bit's Grand Adventure — content** | Design 30 puzzles across 5 worlds with expanding tile rules, functions, sensors, boss puzzles | L | W4.10 |
| **W4.12 Bit's Grand Adventure — audio + tests** | Chiptune score, execution step SFX, puzzle validation tests, level editor tests | M | W4.11 |
| **W4.13 Bit's Grand Adventure — level editor** | Build in-browser puzzle authoring tool with validation, playtest, export | L | W4.10 |
| **W4.14 Classic preservation** | Copy and verify Valley Explorer, Robot Factory, and Code Adventure archives before edits; redirect each original URL only at release | S | W0.3 |

**Deliverables:**
- Valley-specific authored world runtime; only measured generic camera/culling needs feed back into `packages/core`
- Shared command interpreter that powers two distinct programming games
- Puzzle validation system with optimal-solution detection
- Valley of Echoes: 6–8 connected biome-zones, discovery journal, traversal abilities, restoration puzzles, and final media
- Sparky's Assembly Line: 20 puzzles, command system, scoring
- Bit's Grand Adventure: 30 puzzles, level editor, debug viewer
- Classic versions preserved

**Gate:**
- Valley transitions and busiest authored zone meet the D22 frame-time budget on the D21 device
- Same command interpreter powers both programming games with different UIs
- All three games build, type-check, and pass tests
- Level editor exports valid puzzle JSON

**Parallelization:** W4.1 (Valley runtime) and W4.2/W4.3 (command interpreter/validation) can be built in parallel. Valley content depends on W4.1. Both programming games depend on W4.2/W4.3 and may proceed in parallel once the interpreter contract is proven.

**Relative effort:** 16 (S=1, M=3, L=5)

---

### 4.7 Phase 5: Flagship Wave — Little Chef's Grand Kitchen, Critter Tactics

**Goal:** Use the fully matured engine and tools to depth-build the two most ambitious games.

**Workstreams:**

| Workstream | Tasks | Relative Effort | Dependencies |
|------------|-------|-----------------|--------------|
| **W5.1 Little Chef — station system** | Implement production stations (dispenser, processor, conveyor, combiner, trash), grid placement, belt item physics | XL | Phase 4 packages |
| **W5.2 Little Chef — recipe engine** | Design recipe tree, ingredient processing times, quality scoring, customer order generation | L | W5.1 |
| **W5.3 Little Chef — kitchen bots** | Implement bot recording/playback, bot programming interface, multi-bot coordination | L | W5.1 |
| **W5.4 Little Chef — campaign** | Design 15 campaign kitchens with progressive complexity, tutorial, secret recipes | L | W5.2, W5.3 |
| **W5.5 Little Chef — audio + tests** | Kitchen ambience, appliance sounds, customer voices (nonsense), success jingles, station/recipe tests, bot tests | M | W5.4 |
| **W5.6 Critter Tactics — battle engine modules** | Extract turn-based rules, grid movement, ability system, damage calculation into testable TypeScript modules | L | Phase 4 packages |
| **W5.7 Critter Tactics — enemy AI** | Implement pathfinding, threat assessment, ability selection, boss behavior trees | L | W5.6 |
| **W5.8 Critter Tactics — campaign** | Design 18 battles across 4 critters with terrain interactions, upgrades, boss encounters | L | W5.7 |
| **W5.9 Critter Tactics — audio + tests** | Battle music, ability SFX, impact sounds, victory fanfare, battle engine unit tests, AI tests, campaign tests | M | W5.8 |
| **W5.10 Classic preservation** | Copy and verify Little Chef and the transitional built Critter source/archive before rewrite edits; redirect original URLs only after each replacement passes release | S | W0.3 |

**Deliverables:**
- Little Chef's Grand Kitchen: 15 kitchens, full recipe tree, bot programming, audio
- Critter Tactics: 18 battles, full enemy AI, ability system, campaign, audio
- Both games use the mature shared engine with zero Phaser-version skew
- Classic versions preserved, Critter's broken deployment fixed

**Gate:**
- Little Chef runs 5 progressively complex kitchens without player guidance
- Critter Tactics completes a 3-battle campaign sequence with AI decisions
- Both games build and pass tests from CI
- Retire the broken Critter Vite source deployment (now uses standard pipeline)

**Parallelization:** W5.1–W5.5 (Little Chef) and W5.6–W5.10 (Critter Tactics) can run in parallel. Both benefit from all previous phases.

**Relative effort:** 14 (S=1, M=3, L=5)

---

### 4.8 Phase 6: Factory Tooling

**Goal:** Turn the proven pipeline into reusable tooling. This happens *after* the remakes reveal what every project actually needs (per AGENTS.md sharing rule).

**Workstreams:**

| Workstream | Tasks | Relative Effort | Dependencies |
|------------|-------|-----------------|--------------|
| **W6.1 Game generator** | `npm run game:create` that scaffolds a complete game package from template: package.json, vite.config.ts, game.json, src/main.ts, scenes/, tests/, assets/ | L | Phase 5 |
| **W6.2 Generator templates** | Puzzle, platformer, story, world, tactics starting structures. Each with pre-wired packages, config, and a playable test scene. | L | W6.1 |
| **W6.3 Asset validator** | CLI tool that checks asset manifests, missing files, oversized assets, CDN dependencies | M | Phase 5 |
| **W6.4 Assembler hardening** | Generalize the proven W0.5 assembler for generated games, add sitemap/inventory diagnostics, and remove migration-only branches after all redirects are verified | M | W0.5, Phase 5 |
| **W6.5 Visual debug tools** | Add debug overlay to `packages/effects` or `packages/core` for input visualization, collision boxes, frame timing, active object count | M | Phase 5 |
| **W6.6 Production checks** | Browser smoke test runner, performance budget checks, asset size budgets | M | W6.3 |
| **W6.7 Maintainer documentation** | Promote implemented contracts from `.plans/` into maintained root/`docs/` architecture, production, media, release, and game documentation; record deviations as ADRs | M | Phase 5 |

**Deliverables:**
- `npm run game:create` with working scaffold
- Asset validator integrated into CI
- Build assembler produces complete `site-dist/`
- Visual debug tools available to all games
- Complete documentation

**Gate:**
- `npm run game:create puzzle` produces a buildable puzzle game in one command
- Asset validator catches a deliberately missing manifest entry
- `npm run build` produces validated `site-dist/` without errors
- Debug overlay shows input state, FPS, collision boxes

**Relative effort:** 10 (S=1, M=3, L=5)

---

## 5. Dependency Graph

```
Phase 0: ESTABLISH
  ├── W0.1 Workspace ────────────────────────────────────────────┐
  ├── W0.2 Package scaffolds ──── depends on W0.1               │
  ├── W0.3 Classic preservation ── independent                    │
  ├── W0.4 CI/CD + Critter build ─ depends on W0.1, TS-A         │
  ├── W0.5 Migration assembler ─── depends on W0.1               │
  ├── W0.6 Dev commands ───────── depends on W0.1                │
  └── W0.7 Research ───────────── independent (reads AGENTS.md)  │
                                                                  ▼
Phase 1: PROOF
  ├── W1.1 core v1 ────────────── depends on Phase 0             │
  ├── W1.2 input v1 ───────────── depends on Phase 0             │
  ├── W1.3 audio v1 ───────────── depends on Phase 0             │
  ├── W1.4 ui v1 ──────────────── depends on Phase 0             │
  ├── W1.5 effects v1 ─────────── depends on Phase 0             │
  ├── W1.6 Railway core ───────── depends on W1.1, W1.2          │
  ├── W1.7 Railway level ──────── depends on W1.6                │
  ├── W1.8 Railway tablet ─────── depends on W1.7                │
  ├── W1.9 Railway temp assets ── depends on W1.6                │
  ├── W1.10 Railway audio ─────── depends on W1.3, W1.7          │
  ├── W1.11 Railway save ──────── depends on W1.1, W1.7          │
  ├── W1.12 Railway levels ────── depends on W1.6                │
  ├── W1.13 Railway tests ─────── depends on W1.7                │
  └── W1.14 Classic train ─────── depends on Phase 0 structure   │
                                                                  ▼
Phase 2: GENRE PROOF
  ├── W2.1 core v2 ────────────── depends on Phase 1             │
  ├── W2.2 ui v2 ──────────────── depends on Phase 1             │
  ├── W2.3 audio v2 ───────────── depends on Phase 1             │
  ├── W2.4 Wild Pairs core ────── depends on W2.2                │
  ├── W2.5 Wild Pairs habitats ── depends on W2.4                │
  ├── W2.6 Wild Pairs album ───── depends on W2.4, save pattern  │
  ├── W2.7 Wild Pairs audio ───── depends on W2.3, W2.4          │
  ├── W2.8 Wild Pairs tests ───── depends on W2.4                │
  ├── W2.9 Canopy Caper core ──── depends on Phase 1 packages   │
  ├── W2.10 Canopy Caper level ── depends on W2.9                │
  ├── W2.11 Canopy Caper tablet ─ depends on W2.10               │
  ├── W2.12 Canopy Caper audio ── depends on W2.3, W2.10         │
  ├── W2.13 Canopy Caper tests ── depends on W2.10               │
  ├── W2.14 Classic pair/caper ── depends on Phase 0 structure   │
  └── W2.15 ui v3 ─────────────── depends on W2.9–W2.12          │
                                                                  ▼
Phase 3: ADVENTURE
  ├── W3.1 Character animation ─── depends on Phase 2 packages   │
  ├── W3.2 Story/dialogue ──────── depends on W3.1               │
  ├── W3.3 Camera extensions ───── depends on Phase 2 packages   │
  ├── W3.4 Cheese Heist core ───── depends on W3.1, W3.3         │
  ├── W3.5 Cheese Heist level ──── depends on W3.4               │
  ├── W3.6 Cheese Heist audio ──── depends on W3.5               │
  ├── W3.7 Coco expansion ──────── depends on W3.1, W3.2         │
  ├── W3.8 Coco branching ──────── depends on W3.7               │
  ├── W3.9 Coco audio ──────────── depends on W3.7               │
  ├── W3.10 Coco tests ─────────── depends on W3.7, W3.8         │
  ├── W3.11 Hippo core ─────────── depends on W3.1, W3.3         │
  ├── W3.12 Hippo region ───────── depends on W3.11               │
  ├── W3.13 Hippo audio+tests ──── depends on W3.12              │
  └── W3.14 Classic adventure ──── depends on Phase 0 structure  │
                                                                  ▼
Phase 4: SYSTEMS
  ├── W4.1 Valley world runtime ─── depends on Phase 3 packages │
  ├── W4.2 Command interpreter ──── depends on Phase 3 packages  │
  ├── W4.3 Puzzle validation ────── depends on W4.2              │
  ├── W4.4 Valley world ─────────── depends on W4.1              │
  ├── W4.5 Valley content ───────── depends on W4.4              │
  ├── W4.6 Valley audio+tests ───── depends on W4.5              │
  ├── W4.7 Sparky game ──────────── depends on W4.2, W4.3        │
  ├── W4.8 Sparky content ───────── depends on W4.7              │
  ├── W4.9 Sparky audio+tests ───── depends on W4.8              │
  ├── W4.10 Bit game ────────────── depends on W4.2, W4.3        │
  ├── W4.11 Bit content ─────────── depends on W4.10             │
  ├── W4.12 Bit audio+tests ─────── depends on W4.11             │
  ├── W4.13 Bit level editor ────── depends on W4.10             │
  └── W4.14 Classic systems ─────── depends on Phase 0 structure │
                                                                  ▼
Phase 5: FLAGSHIP
  ├── W5.1 Little Chef stations ─── depends on Phase 4 packages  │
  ├── W5.2 Little Chef recipes ──── depends on W5.1              │
  ├── W5.3 Little Chef bots ─────── depends on W5.1              │
  ├── W5.4 Little Chef campaign ─── depends on W5.2, W5.3        │
  ├── W5.5 Little Chef audio ────── depends on W5.4              │
  ├── W5.6 Critter battle engine ── depends on Phase 4 packages  │
  ├── W5.7 Critter enemy AI ─────── depends on W5.6              │
  ├── W5.8 Critter campaign ─────── depends on W5.7              │
  ├── W5.9 Critter audio+tests ──── depends on W5.8              │
  └── W5.10 Classic flagships ───── depends on Phase 0 structure │
                                                                  ▼
Phase 6: FACTORY
  ├── W6.1 Game generator ───────── depends on Phase 5          │
  ├── W6.2 Generator templates ──── depends on W6.1             │
  ├── W6.3 Asset validator ──────── depends on Phase 5          │
  ├── W6.4 Assembler hardening ─── depends on W0.5, Phase 5    │
  ├── W6.5 Visual debug tools ───── depends on Phase 5          │
  ├── W6.6 Production checks ────── depends on W6.3             │
  └── W6.7 Documentation ────────── depends on Phase 5          │
```

### 5.1 Critical Path

The longest chain of dependencies determines minimum timeline:

```
W0.1 → W1.1 → W1.6 → W1.7 → W1.8 → (W1.10, W1.11, W1.13) → W2.x → W3.x → W4.x → W5.x → W6.x
```

Everything else can be parallelized onto this spine. The critical path goes through:
- Phase 0 workspace → Phase 1 core → Railway Workshop core → Railway complete level → tablet tuning
- Then through shared package improvements in Phase 2
- Then through each phase's shared system dependencies

---

## 6. Relative Effort Estimates

| Phase | Effort (S/M/L scale) | Approximate Person-Weeks |
|-------|----------------------|--------------------------|
| Phase 0: Establish | 5 | 1–2 |
| Phase 1: Proof | 11 | 4–6 |
| Phase 2: Genre Proof | 12 | 4–6 |
| Phase 3: Adventure | 14 | 6–8 |
| Phase 4: Systems | 16 | 8–10 |
| Phase 5: Flagship | 14 | 6–8 |
| Phase 6: Factory | 10 | 4–6 |
| **Total** | **82** | **33–46** |

**Notes:**
- These assume a single maintainer working at ~4–6 hours per day effective.
- Person-weeks are rough: 5 effective hours/day × 5 days = 25 hours/week.
- The total is a planning range, not a commitment; art/audio/content throughput is the largest uncertainty.
- Re-estimate after Railway Workshop and again after the three-game foundation proof using measured code, media, testing, and review throughput.
- Parallelism reduces calendar time only when writers use isolated worktrees/assets and shared contracts are already stable.

---

## 7. Parallelization Opportunities

| Parallel Group | Workstreams | Condition |
|----------------|-------------|-----------|
| **P-1** | W0.3 (classic preservation) + W0.7 (research) | Both independent of workspace setup |
| **P-2** | W1.1 (core) + W1.2 (input) + W1.3 (audio) + W1.4 (ui) + W1.5 (effects) | Can all start once workspace is ready |
| **P-3** | W2.4–W2.8 (Wild Pairs) + W2.9–W2.13 (Canopy Caper) | Both need Phase 1 packages, independently built |
| **P-4** | W2.1 (core v2) + W2.2 (ui v2) + W2.3 (audio v2) | Package improvements while games are being built |
| **P-5** | W3.4–W3.6 (Cheese Heist) + W3.7–W3.10 (Coco) + W3.11–W3.13 (Hippo) | All three games in parallel |
| **P-6** | W4.1 (Valley runtime) + W4.2 (command interpreter) | Independent game/runtime workstreams |
| **P-7** | W4.7–W4.9 (Sparky) + W4.10–W4.13 (Bit) | Both share command interpreter |
| **P-8** | W4.4–W4.6 (Valley) + W4.7–W4.13 (programming games) | Valley independent of command interpreter |
| **P-9** | W5.1–W5.5 (Little Chef) + W5.6–W5.9 (Critter) | Both independent of each other |
| **P-10** | W6.1+W6.2 (generator) + W6.3+W6.6 (validator) + W6.5 (debug tools) + W6.7 (docs) | Largely independent in Phase 6 |

With full parallelization of the above groups, the **minimum timeline** collapses to approximately:

```
Phase 0: 1–2 weeks
Phase 1: 3–4 weeks (5 packages in parallel, Railway Workshop is the critical path)
Phase 2: 3–4 weeks (2 games in parallel, plus package improvements)
Phase 3: 4–5 weeks (3 games in parallel after shared animation/dialogue)
Phase 4: 5–6 weeks (3 games + 2 shared systems in parallel)
Phase 5: 4–5 weeks (2 games in parallel)
Phase 6: 3–4 weeks (parallel tooling streams)
Total:  23–30 weeks (~6–7 months) for a team; longer for a solo maintainer
```

---

## 8. Rollback & Classic Preservation Strategy

### 8.1 Preservation Rule

Every original game must be under `classic/` before its remake is deployed.

```
Move: train-tracks.html → classic/train-tracks/index.html
Create: classic/train-tracks/index.html (redirect stub)
Wait: remake deploys, validated
Then: original URL redirects to remake
```

### 8.2 Redirect Mechanism

GitHub Pages does not support `_redirects` files. Use committed HTML meta-refresh redirect pages at the original paths:

```html
<!DOCTYPE html>
<html><head>
  <meta http-equiv="refresh" content="0; url='./classic/train-tracks/'">
</head><body></body></html>
```

When a remake is ready and validated, update the redirect page to point to `./games/railway-workshop/`.

### 8.3 Rollback

If a remake has a blocking issue after deployment:
1. Revert the redirect page to point back to `classic/` version
2. Fix the remake in a separate branch
3. Re-deploy after validation

### 8.4 Preservation Schedule

| Remake Phase | Games to Preserve | Timing |
|--------------|-------------------|--------|
| Phase 1 | `train-tracks.html` → `classic/train-tracks/` | Before Railway Workshop redirect |
| Phase 2 | `animal-memory.html`, `monkey-banana.html` | Before Wild Pairs / Canopy Caper redirect |
| Phase 3 | `mouse-adventure.html`, `crocodile-game/`, `hippo.html` | Before adventure remakes redirect |
| Phase 4 | `valley-explorer.html`, `robot-factory.html`, `code-adventure.html` | Before systems remakes redirect |
| Phase 5 | `little-chef-kitchen/`, `thegame/` | Before flagship remakes redirect |

---

## 9. Concrete Completion Outcomes

### 9.1 Per-Phase Completion

| Phase | Outcome | Evidence |
|-------|---------|----------|
| **Phase 0** | Workspace, preservation mechanism, build assembly, and CI exist | Typecheck/test/build/validate pass; current public URLs remain intact |
| **Phase 1** | Railway Workshop's 12 levels and sandbox ship; foundation packages are compiled and tested | Built artifact, full tablet playthrough, gate report |
| **Phase 2** | Wild Pairs (8 habitats × 12 animals) and Canopy Caper (30 stages) ship; package APIs stabilize from three genres | Two complete builds, no game-specific package hacks |
| **Phase 3** | Cheese Heist, Coco's Lost Hat, and Hippo's Great Feast ship at their full briefed content/media targets | Three gate reports; low-level helpers reused without sharing rules/story |
| **Phase 4** | Valley, Sparky, and Bit ship; the command interpreter is proven by two distinct games | Three gate reports; shared interpreter contract and Valley-specific runtime evidence |
| **Phase 5** | Little Chef and Critter Tactics ship; the full portfolio is on one foundation | All 11 complete gate reports and one validated portfolio build |
| **Phase 6** | Generator creates working game, asset validator integrated, full docs | `npm run game:create` produces buildable project |

### 9.2 Per-Game Completion Criteria

Each remake is "done" when:

1. **Core mechanic** — The promised interaction loop is implemented and fun with temporary assets
2. **One complete unit** — At least one full level/scenario with start, play, and completion
3. **Tablet controls** — All interactions work reliably by touch on the target tablet
4. **Art target applied** — Original visual assets replace temporary ones for the playable section
5. **Sound applied** — Designed audio for all important actions and states
6. **Content complete** — All promised levels/regions/challenges are implemented
7. **Tests pass** — Game-specific tests + browser smoke test pass in CI
8. **Builds and publishes** — `npm run build` includes the game without errors
9. **Classic preserved** — Original version is safely under `classic/`

### 9.3 Validation Gates

| Gate | When | Check |
|------|------|-------|
| **Type check** | Every PR | `npm run typecheck` passes for all workspaces |
| **Unit tests** | Every PR | `npm test` passes |
| **Build** | Every PR | `npm run build` succeeds for affected games |
| **Smoke test** | Every PR | Changed games launch without console errors |
| **Tablet pass** | Before phase completion | Game played through on tablet, no interaction issues |
| **Deployment** | On every push to `master` | Validated `site-dist/` artifact published; key URLs and browser smoke pass |

---

## 10. Risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|------------|--------|------------|
| RK-01 | Phaser declarations expose a strict-TypeScript gap in a used API | Medium | Medium | Reproduce against Phaser's bundled declarations, isolate with local module augmentation, and use a documented `@ts-expect-error` only for a verified upstream mismatch |
| RK-02 | Workspace complexity slows the maintainer more than it helps — npm workspaces add overhead for a single-person project | Medium | Medium | Keep workspace minimal. Don't add Nx, Turborepo, or Lerna. Revert to flat structure if overhead > benefit. |
| RK-03 | Tablet performance misses D22 under busy scenes | Medium | High | Resolve D21/D22, profile each final slice on the selected device, then tune assets/effects/culling from measurements |
| RK-04 | Audio licensing/provenance is incomplete | Low | High | Track origin, author, license, processing, and redistribution evidence; block unknown assets and use only owner-approved sources |
| RK-05 | Game-specific mechanics that don't fit the shared architecture — forcing a square peg into round hole | Medium | Medium | Per AGENTS.md sharing rule: "Do not move code into a shared package merely because two files look similar." Allow game-specific code in game packages. |
| RK-06 | Scope creep on remake ambitions — the creative briefs call for substantially deeper games than prototypes | High | High | Follow AGENTS.md recommended order: core interaction → one level → tablet controls → art → sound → remaining content. Ship the core first. |
| RK-07 | Uncommitted owner work may conflict with preservation/migration | Medium | High | Check status/diff before copying, preserve the exact owner state, never overwrite or move unrelated work, and verify checksums |
| RK-08 | Build/deployment pipeline complexity makes automatic releases fragile | Medium | High | Implement the complete Phase 0 artifact pipeline in small tested tasks; never weaken pre-deploy build/validation/smoke gates |
| RK-09 | Repository growth from 11 games' source and delivery media slows clones/builds | Medium | Medium | Enforce budgets, avoid committing generated `site-dist/`, deduplicate source only where licensing permits, and research LFS before adopting it |
| RK-10 | Rewriting Critter Tactics regresses working legacy mechanics or the transitional deployment fix | Medium | High | Keep/build the legacy version at `/thegame/`, archive it before Phase 5, and implement the new `critter-tactics` package independently with parity decisions in its brief |

---

## 11. Research and Decision Gates

The canonical registries—including deliverables, decision criteria, timeboxes, owners, deadlines, and status—are in [05-decisions-and-risks.md](05-decisions-and-risks.md). Workstreams use these stable namespaces:

- `FR-##`: foundation architecture/product-engineering research;
- `AS-##`: architecture prototypes;
- `TS-*`: tooling and deployment spikes;
- `MS-##`: media pipeline spikes;
- `QR-##`: quality/release research;
- `<game>-R##`: game-specific research in each brief.

No workstream may silently choose an answer for an open gate. Complete its research artifact, update the linked decision/ADR, and record owner approval where required.

---

## 12. Summary Map

```
Phase 0  [Foundation]         W0.1–W0.7    5 effort    1–2 weeks (critical path)
  ↓
Phase 1  [Railway Workshop]   W1.1–W1.14  11 effort    3–4 weeks (critical path)
  ↓
Phase 2  [Wild Pairs + Canopy] W2.1–W2.15 12 effort    3–4 weeks (parallel games)
  ↓
Phase 3  [Adventure Wave]      W3.1–W3.14  14 effort    4–5 weeks (parallel games)
  ↓
Phase 4  [Systems Wave]       W4.1–W4.14  16 effort    5–6 weeks (parallel games)
  ↓
Phase 5  [Flagship Wave]      W5.1–W5.10  14 effort    4–5 weeks (parallel games)
  ↓
Phase 6  [Factory Tooling]    W6.1–W6.7   10 effort    3–4 weeks (parallel tools)

Total: 82 effort, ~33–46 person-weeks (solo), ~23–30 weeks parallel max
Games produced: 11 remakes, 11 classic preserved
Shared packages: 7 (core, input, audio, ui, effects, testing, tools)
```

---

## Appendix A: Game Complexity Ranking

| Order | Game | Remake | Complexity | Shared Systems Needed | Unique Technical Challenge |
|-------|------|--------|------------|----------------------|---------------------------|
| 1 | Train Tracks | Railway Workshop | Medium | Grid input, pathfinding, audio, save | Connection validation, train animation |
| 2 | Animal Memory | Wild Pairs | Low-Medium | Card grid, audio, save, UI components | Board generation, card-flip animation |
| 3 | Monkey Banana | Canopy Caper | Medium | Platformer physics, audio, save, camera | Vine swinging, vertical climbing, fruit collection |
| 4 | Mouse Adventure | Cheese Heist | Medium-High | Character anim, camera zones, audio, save | Guard AI, sight-line detection, distraction system |
| 5 | Coco's Lost Hat | Coco's Lost Hat | Medium-High | Character anim, dialogue, audio, scene transitions | Branching story, paper-cut art style, puzzle mini-games |
| 6 | Hippo | Hippo's Great Feast | High | Platformer physics, character anim, audio, save | 6 movement abilities, cooking mechanics, boss fights |
| 7 | Valley Explorer | Valley of Echoes | High | Camera/culling primitives, audio, save, UI | Connected authored zones, creature simulation, discovery journal |
| 8 | Robot Factory | Sparky's Assembly Line | High | Command interpreter, UI, audio, save | Physical programming, block-snapping, execution visualization |
| 9 | Code Adventure | Bit's Grand Adventure | High | Command interpreter, UI, audio, save | Debug viewer, level editor, puzzle validation |
| 10 | Little Chef | Little Chef's Grand Kitchen | Very High | Grid system, audio, save, UI, effects | Production simulation, recipe engine, bot programming |
| 11 | Critter Tactics | Critter Tactics | Very High | Grid system, audio, save, UI, effects | Turn-based AI, ability system, terrain interactions |

**Ranking method:** Lines of existing code + number of game systems + novelty of shared systems needed. Does not directly determine ordering — the phased roadmap uses a dependency-aware wave approach where Wave 1 proves the foundation with a medium-complexity game, Wave 2 proves genre diversity with low-medium games, and later waves tackle increasing complexity with mature shared systems.

---

## Appendix B: Decision and ADR Authority

Architecture decisions ADR-001–ADR-010 are defined in [01-architecture.md](01-architecture.md#8-architecture-decision-records). Owner/product/tool decisions D01–D36 and all open research gates are defined in [05-decisions-and-risks.md](05-decisions-and-risks.md). Those registries supersede duplicate proposals.

---

## Appendix C: Workstream Quick-Reference Table

| Phase | Workstream ID | Description | Effort | Dependencies |
|-------|---------------|-------------|--------|--------------|
| 0 | W0.1 | Root workspace + gitignore + base tsconfig | S | None |
| 0 | W0.2 | Package contract + Phase 0 tools package | S | W0.1 |
| 0 | W0.3 | Preservation manifest/check and redirect templates | M | None |
| 0 | W0.4 | CI/CD + transitional current-Critter build | M | W0.1, TS-A |
| 0 | W0.5 | Migration-aware `site-dist/` assembler | M | W0.1 |
| 0 | W0.6 | Dev commands (dev/typecheck/test/build) | S | W0.1 |
| 0 | W0.7 | TS-A, TS-C, TS-D, and QR-05 Phase 0 gates | M | None |
| 1 | W1.1 | packages/core v1 | L | Phase 0 |
| 1 | W1.2 | packages/input v1 | M | Phase 0 |
| 1 | W1.3 | packages/audio v1 | M | Phase 0 |
| 1 | W1.4 | packages/ui v1 | M | Phase 0 |
| 1 | W1.5 | packages/effects v1 | M | Phase 0 |
| 1 | W1.6 | Railway Workshop core interaction | XL | W1.1, W1.2 |
| 1 | W1.7 | Railway Workshop first complete level | M | W1.6 |
| 1 | W1.8 | Railway Workshop tablet tuning | M | W1.7 |
| 1 | W1.9 | Railway art/animation from temporary slice to final media | L | W1.6, MS-01–MS-03 |
| 1 | W1.10 | Railway Workshop audio | M | W1.3, W1.7 |
| 1 | W1.11 | Railway Workshop save system | M | W1.1, W1.7 |
| 1 | W1.12 | Railway Workshop schema + 12 levels + sandbox unlock | L | W1.6, W1.7 |
| 1 | W1.13 | Railway Workshop tests | M | W1.7 |
| 1 | W1.14 | Classic Train Tracks preservation | S | W0.3 |
| 2 | W2.1 | packages/core v2 | S | Phase 1 |
| 2 | W2.2 | packages/ui v2 (menus, level select, completion) | L | Phase 1 |
| 2 | W2.3 | packages/audio v2 (crossfade, profiles) | M | Phase 1 |
| 2 | W2.4 | Wild Pairs core mechanics | L | W2.2 |
| 2 | W2.5 | Wild Pairs habitats | L | W2.4 |
| 2 | W2.6 | Wild Pairs album collection | M | W2.4 |
| 2 | W2.7 | Wild Pairs audio | M | W2.3, W2.4 |
| 2 | W2.8 | Wild Pairs tests | M | W2.4 |
| 2 | W2.9 | Canopy Caper core mechanics | L | Phase 1 packages |
| 2 | W2.10 | Canopy final-quality climb + all 30 stages | L | W2.9 |
| 2 | W2.11 | Canopy Caper tablet tuning | M | W2.10 |
| 2 | W2.12 | Canopy Caper audio | M | W2.3, W2.10 |
| 2 | W2.13 | Canopy Caper save + tests | M | W2.10 |
| 2 | W2.14 | Classic Animal Memory + Monkey Banana | S | W0.3 |
| 2 | W2.15 | packages/ui v3 | M | W2.9–W2.12 |
| 3 | W3.1 | Character atlas/animation conventions and helpers | L | Phase 2, FR-08 |
| 3 | W3.2 | Dialogue presentation primitives and branch validation | L | W3.1, FR-09 |
| 3 | W3.3 | Camera extensions (zones, cutscenes, parallax) | M | Phase 2 |
| 3 | W3.4 | Cheese Heist core mechanics | L | W3.1, W3.3 |
| 3 | W3.5 | Cheese Heist final-quality slice + 6-room campaign | L | W3.4 |
| 3 | W3.6 | Cheese Heist audio + tests | M | W3.5 |
| 3 | W3.7 | Coco's Lost Hat Phaser rebuild | XL | W3.1, W3.2 |
| 3 | W3.8 | Coco branching routes + puzzle mini-games | L | W3.7 |
| 3 | W3.9 | Coco audio | M | W3.7 |
| 3 | W3.10 | Coco tests | M | W3.7, W3.8 |
| 3 | W3.11 | Hippo core platforming + abilities | XL | W3.1, W3.3 |
| 3 | W3.12 | Hippo final-quality slice + all 10 stages | L | W3.11 |
| 3 | W3.13 | Hippo audio + tests | M | W3.12 |
| 3 | W3.14 | Classic adventure games | S | W0.3 |
| 4 | W4.1 | Valley-specific authored-zone runtime and streaming | XL | Phase 3 |
| 4 | W4.2 | Command interpreter (renderer-agnostic) | L | Phase 3 |
| 4 | W4.3 | Puzzle validation system | M | W4.2 |
| 4 | W4.4 | Valley of Echoes world building | L | W4.1 |
| 4 | W4.5 | Valley content (6–8 connected biome-zones) | L | W4.4 |
| 4 | W4.6 | Valley of Echoes audio + tests | M | W4.5 |
| 4 | W4.7 | Sparky's Assembly Line game | L | W4.2, W4.3 |
| 4 | W4.8 | Sparky content (20 puzzles) | L | W4.7 |
| 4 | W4.9 | Sparky audio + tests | M | W4.8 |
| 4 | W4.10 | Bit's Grand Adventure game | L | W4.2, W4.3 |
| 4 | W4.11 | Bit content (30 puzzles) | L | W4.10 |
| 4 | W4.12 | Bit audio + tests | M | W4.11 |
| 4 | W4.13 | Bit level editor | L | W4.10 |
| 4 | W4.14 | Classic systems games | S | W0.3 |
| 5 | W5.1 | Little Chef station system | XL | Phase 4 |
| 5 | W5.2 | Little Chef recipe engine | L | W5.1 |
| 5 | W5.3 | Little Chef kitchen bots | L | W5.1 |
| 5 | W5.4 | Little Chef campaign (15 kitchens) | L | W5.2, W5.3 |
| 5 | W5.5 | Little Chef audio + tests | M | W5.4 |
| 5 | W5.6 | Critter Tactics battle engine modules | L | Phase 4 |
| 5 | W5.7 | Critter enemy AI | L | W5.6 |
| 5 | W5.8 | Critter campaign (18 battles) | L | W5.7 |
| 5 | W5.9 | Critter audio + tests | M | W5.8 |
| 5 | W5.10 | Classic flagship games | S | W0.3 |
| 6 | W6.1 | Game generator CLI | L | Phase 5 |
| 6 | W6.2 | Generator templates (5 archetypes) | L | W6.1 |
| 6 | W6.3 | Asset validator CLI | M | Phase 5 |
| 6 | W6.4 | Assembler hardening + sitemap/inventory diagnostics | M | W0.5, Phase 5 |
| 6 | W6.5 | Visual debug tools | M | Phase 5 |
| 6 | W6.6 | Production check runner | M | W6.3 |
| 6 | W6.7 | Documentation | M | Phase 5 |

---

## Appendix D: Unknowns and Traceability

Every discovered unknown is represented in the canonical [decision/research registry](05-decisions-and-risks.md) or a linked game-specific research section. The registry's closure contract requires a reproducible artifact, explicit decision criteria, a deadline/block, status, and an owner before execution.
