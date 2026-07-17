# Little Chef's Grand Kitchen — Implementation Brief

> **Plan set:** [Master plan](README.md) · [Architecture](01-architecture.md) · [Tooling and CI](02-tooling-and-ci.md) · [Quality](03-quality-and-testing.md) · [Media production](04-media-production.md) · [Decisions and risks](05-decisions-and-risks.md)

**Status:** Not started
**Roadmap:** [Phase 5](README.md) · workstreams `W5.1–W5.5`
**Research namespace:** `LC-R##`
**Milestone namespace:** `LC-M##`; unprefixed milestone labels below are scoped to this game
**Release requirement:** all [G1–G16 and C1–C8](03-quality-and-testing.md), D25, D26, and D32 resolved, plus this brief's content gates
**Media sheet:** [Little Chef's Grand Kitchen production requirements](04-media-production.md)

> Every research task below starts **Open** and follows the [research closure contract](05-decisions-and-risks.md#research-closure-contract). Its deliverable is `.plans/research/<ID>.md` plus the named prototype, measurement, or design artifact; the task wording is the minimum decision criterion. Assign an owner before moving it to **In research**.


## 1. Current-State Diagnosis

| Attribute | Status |
|-----------|--------|
| **Engine** | Phaser 3.70.0 (loaded from CDN) |
| **Language** | Untyped JavaScript, split across 4 files + HTML |
| **Build** | None — raw CDN Phaser, no Vite, no bundler |
| **Scenes** | BootScene, GameScene (~2500 lines), UIScene |
| **Grid** | 20×15 tile grid, TILE_SIZE=64px, arcade physics (disabled gravity) |
| **Levels** | 10 levels defined in `config.js` with grid sizes 8×6 to 20×12 |
| **Stations** | dispenser, cutting_board, mixer, oven, toaster, fryer, plate_station, counter, trash |
| **Items** | 17 item types: 7 raw ingredients, 6 intermediate, 4 final products + plated |
| **Recipes** | 9 recipes (dough, bread, sliced_tomato, pizza, toast, fried_fish, apple_pie, omelette, milkshake) |
| **Belts** | Conveyor belt system with direction, items ride belts |
| **Bots** | Action-tracking system: player actions recorded, bots can replay |
| **Customers** | Per-level customer definitions with `wants`, `patience`, `delay` |
| **Touch** | Dual-pointer support, pinch zoom, camera pan, tap/double-tap |
| **Save** | `localStorage` (key `littleChefSave`) |
| **Art** | Procedural textures (colored rectangles), emoji for items/stations |
| **Tests** | None |

**Key issues:**
- Phaser loaded from a CDN — prohibited external runtime dependency and not controlled by the repository lockfile
- JavaScript, not TypeScript — no type safety across the large GameScene
- `GameScene.js` is ~2500 lines — violates single-responsibility principle
- Camera system: manual `scrollX/scrollY` pan with no Phaser camera plugin usage
- Belt system: timer-based movement (500ms interval) with manual item sprite updates
- No grid-snapped physics — items teleport between belt segments
- Bot system: action tracking exists but bot replay is incomplete/inconsistent
- Tutorial: uses a `tutorialSteps` array but implementation is scattered across GameScene with many conditionals
- UIScene rendering is coupled to GameScene state
- Art is placeholder emoji + colored rectangles
- No loading scene, assets are generated procedural at boot
- Touch controls: pinch zoom and pan are manually implemented (no Phaser camera plugin for pinch)
- No unit tests, no level data validation
- `RESIZE` scale mode means no fixed game resolution

## 2. Intended Game

**Title:** Little Chef's Grand Kitchen
**Genre:** Magical kitchen construction / automation puzzle
**Fantasy:** Build and program a magical kitchen production line, serving a cast of distinctive animal customers.
**Rewrite target:** Expanded automation game on Phaser 3 + TypeScript with deeper recipes, quality/timing rules, chef bots, and full visual identity.

Key additions:
- 15 campaign kitchens (up from 10)
- Deeper recipe chains with quality/timing rules
- Chef bots that learn from demonstrated actions
- Secret recipes, special ingredient unlocks
- Endless service mode after campaign
- Illustrated cookbook world with distinct art direction
- Animated appliances with working parts
- Animated ingredient motion (not just teleport)
- Full kitchen soundscape

## 3. Core Loop

```
[ Place station/belt ] → [ Dispense ingredient ] → [ Transport on belt ] → [ Process at station ] → [ Plate ] → [ Serve customer ]
                                                                                ↓
                                                                      [ Bot records action ]
                                                                                ↓
                                                                      [ Bot replays → automation ]
```

## 4. Controls

| Action | Desktop | Tablet |
|--------|---------|--------|
| Select tool | Click toolbar button | Tap toolbar button |
| Place station/belt | Click grid cell | Tap grid cell |
| Pick up item | Click station with output | Tap station with output |
| Place item on station | Click station holding item | Tap station holding item |
| Remove station/belt | Double-click grid cell | Double-tap cell |
| Pan camera | Drag empty space | Drag empty space |
| Zoom | (not implemented) | Pinch |
| Pause | ESC | Pause button |

## 5. Scenes

| Scene | Purpose |
|-------|---------|
| `BootScene` | Load texture atlas, procedural tile generation, show loading bar |
| `MenuScene` | Title with animated kitchen, play, level select, settings |
| `CookbookScene` | Recipe reference — all discovered recipes with ingredients |
| `GameScene` | Core kitchen gameplay — grid, stations, belts, items, bots, customers |
| `UIScene` | HUD overlay — toolbar, score, timer, customer queue |
| `PauseScene` | Overlay — resume, settings, restart, quit |
| `WinScene` | Level complete — star rating (speed, served, efficiency) |
| `SettingsScene` | Audio, reset progress, controls help |
| `EndlessScene` | Infinite customer mode variant of GameScene |

## 6. Systems

**Game-specific:**
- `GridManager` — Tile grid, station/belt placement validation, cell queries
- `StationController` — Station lifecycle: input collection, processing timer, output emission
- `BeltSystem` — Conveyor logic: item movement direction, junction handling, item transfer
- `RecipeSystem` — Recipe matching, input validation, output generation, quality scoring
- `CustomerAI` — Customer spawn timing, patience timer, order generation, satisfaction
- `BotController` — Action recording, sequence replay, bot movement, error handling
- `ScoreSystem` — Points per order, timing bonus, efficiency multiplier, star thresholds
- `TutorialDirector` — Scripted tutorial steps with triggers, overlays, and forced states

**Shared (from packages/):**
- `core:ScreenManager` — Fixed logical resolution (e.g., 1280×800) with Phaser FIT scaling
- `core:GameBootstrap` — Phaser config, scene registry, startup
- `input:ActionMapper` — Grid selection, tool hotkeys, keyboard shortcuts
- `audio:AudioBus` — Music, SFX, UI sounds, ambient kitchen noise
- `core:SaveManager` — Level progress, stars, unlocked recipes, settings
- `ui:Button`, `ui:Toggle`, `ui:Panel` — Reusable UI components
- `ui:Toolbar` — Horizontal scrolling tool palette
- `ui:Modal` — Confirmation dialogs, recipe info popups
- `effects:ParticlePool` — Sparkles, steam, smoke for station actions

## 7. Content Target

| Slice | Levels | Features | Art |
|-------|--------|----------|-----|
| **M1: Core Grid** | 2 (First Steps, Bread Making) | Station placement, item pickup/place, basic recipe | Colored tiles, emoji items |
| **M2: Belts & Customers** | 4 (+ Conveyor Belts, Pizza Time) | Belt system, customer patience, order fulfillment | Simple station sprites, customer sprites |
| **M3: Automation** | 6 (+ Automation, Toast Master) | Bot recording/replay, multi-step recipes | Improved station art, animated belts |
| **M4: Expanded Menu** | 9 (+ Seafood Special, Apple Pie, Full Menu) | All stations/recipes, quality timing | Full art pass on stations and items |
| **M5: Master Chef** | 15 campaign + endless | Secret recipes, bot programming, endless mode | Final art, animations, complete audio |
| **Ship** | 15 + endless | All features polished, balanced, tested | Complete |

## 8. Data Schema

```typescript
// Level data
interface KitchenLevel {
  id: number;
  name: string;
  description: string;
  gridWidth: number;
  gridHeight: number;
  allowedItems: string[];
  allowedStations: StationType[];
  recipes: string[];
  customers: CustomerOrder[];
  objectives: { customers: number; minScore?: number; maxTime?: number };
  tutorial: boolean;
  unlockCriteria: { requiredLevel?: number; requiredRecipes?: string[] };
  botsUnlocked: boolean;
  beltUnlocked: boolean;
}

// Save data
interface KitchenSave {
  version: 2;
  completedLevels: Record<number, { stars: number; score: number }>;
  unlockedRecipes: string[];
  unlockedItems: string[];
  settings: { musicVolume: number; sfxVolume: number };
  gameCompleted: boolean;
}

// Recipe (expanded)
interface Recipe {
  id: string;
  name: string;
  station: StationType;
  inputs: { item: string; qty: number }[];
  output: string;
  baseTime: number;          // ms
  qualityWindow: number;     // ms window for "perfect" processing
  perfectBonus: number;      // score bonus for perfect timing
  unlockedBy?: string;       // recipe ID that must be discovered first
}
```

**Legacy migration gate (D32):** fixture `littleChefSave`, map old levels/stars/settings/tutorial state to the 15-kitchen campaign, document dropped fields, and test idempotent import plus corrupt/newer data. A fresh-start decision preserves the old key and release notes explain the reset.

## 9. Art, Animation & Audio

**Approved art direction:** Illustrated cookbook world, animated appliances, character customers, ingredient motion.

| Element | Current | Target |
|---------|---------|--------|
| Stations | Colored rectangles | Illustrated kitchen equipment: wooden mixer, brick oven, cast-iron stove, copper fryer |
| Items | Emoji characters | Painted food sprites with shadow and highlight |
| Belts | Colored strip with arrows | Animated conveyor with rollers, item slides smoothly |
| Customers | Emoji animals | Illustrated animal characters with idle animation, patience meter, satisfaction reaction |
| UI | Phaser text + rectangles | Cookbook-themed interface, parchment backgrounds, hand-drawn icons |
| Floor | Procedural tile | Checkered or wood-plank floor tiles |

**Animation targets:**
- Stations: Mixer paddle spins, oven door opens/closes, toaster pops, fryer bubbles
- Items: Smooth belt movement (tweened, not teleport), processing animation (chopping, mixing, baking)
- Customers: Arrive walking, bob while waiting, cheer/express disappointment when served
- Bots: Move along paths, animate arms when interacting with stations
- UI: Score counter increment animation, star reveal on level complete

**Audio:**
- Current: None (silent game)
- Target: Ambient kitchen sounds (sizzle, clatter, bubbling), station activation sounds (mixer whir, oven ding, toaster pop), customer order chime, satisfaction jingle, failure buzz
- Music: Warm acoustic/folk kitchen music, tempo increases as pressure mounts
- UI: Button clicks, panel open/close, notification pings

## 10. Unit/Integration Tests

| Test Suite | What it covers |
|------------|----------------|
| `GridManager.test` | Station placement validation, cell occupancy, boundary checks |
| `RecipeSystem.test` | All 9 campaign recipes plus every D25-approved secret recipe: inputs, outputs, timing windows, edge cases |
| `BeltSystem.test` | Item movement, junction priorities, belt-to-station transfer |
| `CustomerAI.test` | Spawn timing, patience decay, order generation, satisfaction logic |
| `BotController.test` | Action recording, replay sequence, error handling, state sync |
| `ScoreSystem.test` | Point calculation, timing bonus, efficiency multiplier, star thresholds |
| `LevelData.test` | All 15 levels: valid station/item combos, reachable objectives, customer feasibility |
| `SaveManager.test` | Serialization, migration from current schema (v1 → v2) |
| Browser smoke test | Built game loads without errors, completes first tutorial step |

## 11. Milestone Slices

| ID | Playable outcome | Depends on | Deliverable | Verification |
|---|---|---|---|---|
| LC-M01 | One fixed-resolution kitchen supports grid-snapped station and belt placement with temporary assets. | Phase 4 packages, D09, D21 | `GridManager`, placement input, camera bounds, one authored kitchen | Unit tests for occupancy/bounds; touch placement and resize browser flow |
| LC-M02 | A complete order can travel dispenser → belt → processor → plate → customer with quality scoring. | LC-M01 | Deterministic item/belt/station simulation and first recipe | Rule tests plus browser completion of one order without manual state edits |
| LC-M03 | A chef bot records a demonstrated action sequence and replays it with visible diagnostics. | LC-M02, FR-11 findings where applicable | Bot command model, recorder, bounded runner, trace UI | Deterministic replay/error tests and one successful automated order |
| LC-M04 | One kitchen is art-, animation-, and audio-complete and works on the selected tablet. | LC-M01–03, D13–D16 | Approved style tile applied, moving appliance parts, ingredient motion, full sound list | C1–C8 review, target-device profile, visual baselines |
| LC-M05 | Campaign systems support unlocks, secret recipes, progression, and the approved endless-mode structure. | LC-M04, D25, D26, D32 | 15 kitchens, recipe progression, save migration, endless variant if approved | Content validator, save migration tests, blind playthroughs |
| LC-M06 | Production release replaces the public entry with a rollback-ready build. | LC-M05 | Validated `site-dist/little-chefs-grand-kitchen/`, classic archive, redirect | G1–G16, post-deploy smoke, classic rollback drill |

## 12. Completion Criteria

- 15 campaign levels with increasing complexity
- All 10 station types and 17 item types have final art and required animation states
- Belts with multi-directional movement, junctions, and station integration
- Bot system: record player actions, replay as automated chef
- 9 campaign recipes plus the exact secret-recipe set approved in D25, all with quality timing windows
- 12 customer characters with distinct appearances, orders, patience feedback, and reactions
- Star rating per level (speed, customers served, efficiency)
- Endless service mode unlocked after campaign
- Illustrated kitchen equipment sprites, animated
- Food sprites with processing animation
- Full kitchen soundscape + per-station SFX + background music
- Tablet controls: tap placer, drag-free camera, tool palette fits screen
- No console errors; D22 frame-time budget met with the approved maximum active-entity scenario

## 13. Risks

1. **GameScene size**: Current ~2500 lines will grow with bots, quality timing, endless mode. Must decompose early. Mitigation: extract GridManager, BeltSystem, CustomerAI as separate modules in M1.
2. **Bot system complexity**: Recording player actions and replaying reliably is non-trivial. Edge cases: replaced stations, full inventory, belt direction changes. Mitigation: restrict bot actions to a safe subset (dispense, belt-place, activate-station).
3. **Kitchen balance**: 15 levels × recipe combos × customer timing = many tuning variables. Risk of boring or impossible levels. Mitigation: automated level feasibility checker + playtest per milestone.
4. **Belt junctions**: Multiple belt directions meeting at one tile is complex to implement well. Mitigation: start with straight belts only, add turns and junctions in M3.
5. **Touch precision**: Grid-based placement on 10" tablet with 64px tiles may be too small. Mitigation: test on actual tablet in M1, increase TILE_SIZE if needed.

## 14. Research Tasks

| ID | Question / task | Deliverable and decision criteria | Timebox | Deadline / blocks | Owner | Status |
|---|---|---|---:|---|---|---|
| LC-R01 | Determine fixed logical resolution for kitchen grid | `.plans/research/LC-R01.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation under the closure contract. | 2 days | LC-M01 | Tech lead | Open |
| LC-R02 | Prototype bot action recording/replay. | `.plans/research/LC-R02.md` with typed command log, bounded deterministic runner, invalidated-station/full-output cases, visible trace, and save round-trip. Decision criterion: one demonstrated order replays identically and every invalid action stops with an actionable diagnostic. | 3 days | LC-M01 | Tech lead | Open |
| LC-R03 | Design quality timing mechanic (perfect/ok/burnt) | `.plans/research/LC-R03.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation under the closure contract. | 2 days | LC-M02 | Game designer + owner approval | Open |
| LC-R04 | Investigate belt junction algorithm (multiple inputs/outputs per tile) | `.plans/research/LC-R04.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation under the closure contract. | 2 days | LC-M02 | Tech lead | Open |
| LC-R05 | Customer AI behavior tree vs simple state machine | `.plans/research/LC-R05.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation under the closure contract. | 2 days | LC-M02 | Tech lead | Open |
| LC-R06 | Evaluate Phaser camera plugin vs manual pinch-zoom implementation | `.plans/research/LC-R06.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation under the closure contract. | 2 days | LC-M04 | Tech lead | Open |
| LC-R07 | Prototype station animation (spinning mixer, oven door) with Phaser spritesheet | `.plans/research/LC-R07.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation under the closure contract. | 2 days | LC-M04 | Media implementer + owner approval | Open |
| LC-R08 | Tutorial system design — scripted vs trigger-based | `.plans/research/LC-R08.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation under the closure contract. | 2 days | LC-M04 | Game designer + owner approval | Open |
