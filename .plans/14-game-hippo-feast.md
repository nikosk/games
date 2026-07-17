# Hippo's Great Feast — Implementation Brief

> **Plan set:** [Master plan](README.md) · [Architecture](01-architecture.md) · [Tooling and CI](02-tooling-and-ci.md) · [Quality](03-quality-and-testing.md) · [Media production](04-media-production.md) · [Decisions and risks](05-decisions-and-risks.md)

**Status:** Not started
**Roadmap:** [Phase 3](README.md) · workstreams `W3.11–W3.13`
**Research namespace:** `HF-R##`
**Milestone namespace:** `HF-M##`; unprefixed milestone labels below are scoped to this game
**Release requirement:** all [G1–G16 and C1–C8](03-quality-and-testing.md), D24 and D31 resolved, plus this brief's content gates
**Media sheet:** [Hippo's Great Feast production requirements](04-media-production.md)

> Every research task below starts **Open** and follows the [research closure contract](05-decisions-and-risks.md#research-closure-contract). Its deliverable is `.plans/research/<ID>.md` plus the named prototype, measurement, or design artifact; the task wording is the minimum decision criterion. Assign an owner before moving it to **In research**.


## 1. Current-State Diagnosis

| Attribute | Status |
|-----------|--------|
| **Engine** | Raw Canvas 2D (no Phaser) |
| **Language** | Untyped JavaScript, single 1580-line HTML file |
| **Build** | None — deployed as raw HTML |
| **Scenes** | Title, HowToPlay, Story, Playing, Paused, Win, GameOver, LevelSelect, GameComplete — all in one function-per-state switch |
| **Levels** | 10 hardcoded in `buildLevels()`: Meadow, Marshes, Desert, Forest, Canyon, Frozen Peaks, Lava, Cloud, Candy, Final |
| **Player** | Code-drawn hippo: body, legs, snout, ears, tail, eyes — all Canvas path drawing |
| **Enemies** | 6 types (default, moth, yeti, bat, cloudGuard, sprite, boss) drawn procedurally |
| **Collision** | AABB rectangle-based, per-frame in update loop |
| **Audio** | Web Audio API procedural: `sfx()`, `sfxJump()`, `sfxCoin()`, `sfxHurt()`, `sfxVictory()`, `sfxStomp()`, `sfxPowerup()`; ambient `startAmbient(theme)` |
| **Touch** | Left/Right/Jump touch buttons drawn on canvas when `coarsePointer` detected |
| **Save** | `localStorage` (key `hippoFeast`), auto-saves every 2s |
| **Performance** | `requestAnimationFrame` loop with fixed-step accumulator, no object pooling |
| **Tests** | None |
| **Art Quality** | Placeholder — code-drawn gradients, emoji food items, geometric enemies |
| **Sprite** | Embedded base64 PNG for title-screen hippo (not used in gameplay) |

**Key issues:**
- No Phaser means no scene management, camera system, animation system, input abstraction or physics
- All game logic, rendering, and state live in one scope — impossible to test
- 10 levels with zero level data validation
- Boss fight (level 10, Grove Guardian) has unique mechanic but no tuning pass
- Touch controls are functional but ugly and block screen space
- No shared audio system — single `AC` AudioContext global
- No loading screen, no asset manifest, no preloader
- Ambient music uses oscillators only — thin, no composed tracks

## 2. Intended Game

**Title:** Hippo's Great Feast
**Genre:** Culinary platform-adventure
**Fantasy:** A hungry hippo journeys through fantastical regions collecting ingredients to cook signature dishes, ultimately saving the Golden Watermelon.
**Rewrite target:** Full platform-adventure remake on Phaser 3 + TypeScript.

Key design differences from current:
- 10 redesigned stages (not the same level layouts)
- Movement abilities: dive, charge, spit, pound, glide (currently only jump + double-jump)
- Hidden routes and secret areas
- Recipe journal that tracks discovered ingredients
- Final boss encounter with full phase structure
- Hand-drawn Hippo character with sprite sheet animation
- Painted food-world environments
- Impact trails, cooking effects, regional music

## 3. Core Interaction Loop

```
[ Move ] → [ Encounter terrain/enemy ] → [ Jump/Ability to overcome ] → [ Collect ingredient ] → [ Reach flag ]
                                                                              ↓
                                                                     [ Unlock recipe/discovery ]
                                                                              ↓
                                                                     [ Next stage with new mechanic ]
```

## 4. Controls

| Action | Keyboard | Touch |
|--------|----------|-------|
| Move | A/D, Arrow L/R | Left/Right touch zones |
| Jump | W, Up, Space | Jump touch zone |
| Double Jump | W/Up/Space in air (with star) | Jump touch zone in air (with star) |
| Interact | ? (not currently bound) | ? |
| Pause | ESC | Pause button |

**Intended tablet controls:**
- Left third of screen = left movement
- Right third = right movement
- Bottom-right area = jump
- Pinch-free camera (current has none — single screen)
- Add: ability button, interact/pickup button

## 5. Scenes

| Scene | Purpose |
|-------|---------|
| `BootScene` | Preload assets, generate procedural textures, show loading bar |
| `MenuScene` | Title screen with animated hippo, play, level select, settings |
| `StoryScene` | Per-level narrative card with illustration |
| `GameScene` | Platforming gameplay — hippo control, physics, collectibles, enemies |
| `PauseScene` | Overlay during gameplay — resume, quit, settings |
| `WinScene` | Level complete — score, star rating, next level |
| `GameOverScene` | Death screen — retry, level select |
| `GameCompleteScene` | Final victory — credits, total score |
| `SettingsScene` | Audio levels, reset progress, controls help |

## 6. Systems

**Game-specific:**
- `HippoController` — Character movement, jump physics, ability state machine (dive/charge/spit/pound/glide)
- `AbilityManager` — Unlockable abilities, ability activation, cooldowns, energy
- `CollectibleRegistry` — Ingredient tracking, recipe journal, discovery notifications
- `LevelDirector` — Level data loading, objective tracking, flag detection
- `EnemyDirector` — Enemy spawning, patrol AI, boss phase management

**Shared (from packages/):**
- `core:ScreenManager` — Game sizing, safe areas, fullscreen
- `core:GameBootstrap` — Phaser config, scene registration, startup
- `input:ActionMapper` — Keyboard + touch input binding
- `audio:AudioBus` — Music bus, SFX bus, volume settings, mute
- `audio:MusicPlayer` — Per-region music tracks with crossfade
- `core:SaveManager` — Versioned save, level progress, settings persistence
- `ui:LoadingScreen` — Asset loading progress display
- `ui:Button` — Reusable interactive button component
- `ui:TransitionOverlay` — Scene-to-scene fade/crossfade
- `effects:ParticlePool` — Shared particle emitter for food, impact, ability effects
- `effects:CameraEffects` — Shake, flash, slow-motion, hit pause

## 7. Content Target

| Slice | Levels | Abilities | Features | Art |
|-------|--------|-----------|----------|-----|
| **M1: Core Loop** | 2 (Meadow, Marsh) | Jump, Double-jump (star) | Basic platforms, enemies, collectibles, flag | Placeholder colored rectangles |
| **M2: First Region** | 4 (Meadow, Marsh, Desert, Forest) | + Charge (bash through blocks) | Spikes, moving platforms, simple boss | Placeholder + character placeholder |
| **M3: Full Abilities** | 6 (+ Canyon, Frozen) | + Glide (slow fall) | Wind zones, ice physics, collapsing platforms | Approved art art pass on region 1 |
| **M4: Mid-game** | 8 (+ Lava, Cloud) | + Dive (fast downward) + Pound (break floor) | Lava hazards, bouncy clouds, damage floor | All regions art-complete |
| **M5: Final** | 10 (+ Candy, Final) | All abilities + Spit (projectile) | Boss phases, hidden routes, recipe journal | Final art, particles, animation polish |
| **Ship** | 10 + sandbox | All | Secret rooms, speedrun timer, journal complete | Complete audio + music + sfx |

## 8. Data Schema

```typescript
// Level data
interface HippoLevel {
  id: number;
  name: string;
  region: RegionType;
  story: string;
  width: number;   // world pixel width
  height: number;  // world pixel height
  spawn: { x: number; y: number };
  platforms: PlatformData[];
  enemies: EnemySpawn[];
  collectibles: CollectibleData[];
  hazards: HazardData[];
  flag: { x: number; y: number };
  secretRoutes: SecretRoute[];
  abilitiesRequired: AbilityType[];  // gating
  unlockCriteria: { requiredLevel?: number; requiredIngredients?: string[] };
}

// Save data
interface HippoSave {
  version: 1;
  completedLevels: number[];
  totalScore: number;
  collectedIngredients: Record<string, number>;
  unlockedAbilities: AbilityType[];
  recipeJournal: string[];  // discovered recipe IDs
  settings: { musicVolume: number; sfxVolume: number };
}
```

**Legacy migration gate (D31):** fixture the unversioned `hippoFeast` shape, map or explicitly drop completion/score fields against the redesigned 10 stages, and test idempotent import, corrupt data, and fresh-start behavior while preserving the old key.

## 9. Art, Animation & Audio

**Approved art direction:** Hand-drawn Hippo, painted food worlds, animated ingredients.

| Element | Current | Target |
|---------|---------|--------|
| Hippo | Procedural Canvas paths | Spritesheet: idle, walk, jump, double-jump, charge, glide, dive, pound, spit, hurt, victory |
| Environments | Gradient sky + geometric shapes | Painted dioramas per region: meadow, marsh, desert, forest, canyon, ice, lava, cloud, candy, final |
| Enemies | Procedural shapes (triangles, circles) | Illustrated per-region creatures with attack animations |
| Collectibles | Emoji (🍎🍇🍕⭐) | Animated 3D-ish food objects with spin/bob |
| UI | In-canvas text + rectangles | Themed HUD, animated health, ingredient tracker |
| Particles | Simple circles with color | Food particles, dust, snow, lava sparks, star sparkles |
| Effects | Screen shake + flash | Trail, hit pause, ability explosions, cooking steam |

**Animation targets:**
- Hippo: 8-frame walk cycle, squash-and-stretch jump, anticipation before charge, landing impact
- Enemies: Idle bob, movement tween, attack telegraph, death dissolve
- Collectibles: 360° spin, pulsing glow, collection particle burst
- Boss: Multi-phase transformation, attack tells, stagger animation

**Audio:**
- Current: Procedural oscillator tones (functional but thin)
- Target: Per-region background music (orchestral/acoustic), designed SFX for each ability, enemy, collectible, environment
- Voice: Grunt/happy/hurt vocalizations for Hippo
- Music: 10 region themes + boss theme + victory fanfare
- Audio groups: Music, SFX, Voice, Ambient — all controllable from settings

## 10. Unit/Integration Tests

| Test Suite | What it covers |
|------------|----------------|
| `HippoController.test` | Movement, jump, double-jump, ability state transitions, physics integration |
| `AbilityManager.test` | Unlock gating, cooldown timing, energy consumption |
| `LevelData.test` | All 10 levels: valid spawn, reachable flag, no softlocks, valid platform overlaps |
| `CollectibleRegistry.test` | Collection tracking, recipe unlocking, journal updates |
| `SaveManager.test` | Serialization, deserialization, migration from legacy format |
| `EnemyDirector.test` | Spawn positions, patrol boundaries, boss phase transitions |
| `CollisionSystem.test` | AABB basics, platform landing, spike death, enemy stomp, flag trigger |
| Browser smoke test | Built game loads without console errors, plays first level |

## 11. Milestone Slices

See [Content Target](#7-content-target); each milestone is a playable vertical slice.

## 12. Completion Criteria

- 10 levels with distinct mechanics, no placeholder levels
- Every movement/action in the D24-approved ability list is implemented, tuned, animated, sounded, and used by authored stages
- Recipe journal tracks all ingredients/recipes
- Final boss with 3 distinct phases
- Original hand-drawn Hippo spritesheet with full animation set
- Painted backgrounds for all 10 regions
- Designed sound effects per action
- 10 region music tracks + boss theme + fanfare
- Smooth tablet controls: left/right/jump touch zones, ability button, camera follows player
- No console errors; D22 frame-time and memory budgets met on the D21 tablet
- Progress saved and restored correctly
- Unit tests pass, browser smoke test passes

## 13. Risks

1. **Ability complexity**: The proposed jump/double-jump/charge/glide/dive/pound/spit set is ambitious. Abilities may feel redundant or underused. Mitigation: introduce one per region, combine in later levels.
2. **Boss design**: Current boss (jump-on-head 5×) is trivial. Redesigning a multi-phase boss without reference is a design risk. Mitigation: prototype boss mechanics early (M2) with placeholder art.
3. **Level design**: 10 levels × unique mechanic combos requires careful tuning. Risk of boring or frustrating levels. Mitigation: playtest each milestone on tablet before proceeding.
4. **Art scope**: Hand-drawn Hippo + 10 painted backgrounds + enemy sprites is a large art target for a single developer. Mitigation: use procedural/SVG generation for backgrounds, focus bespoke art on Hippo and key enemies.
5. **Touch controls**: Exposing the full D24 set alongside movement on tablet risks clutter. Mitigation: contextual ability buttons, only show available abilities.

## 14. Research Tasks

| ID | Question / task | Deliverable and decision criteria | Timebox | Deadline / blocks | Owner | Status |
|---|---|---|---:|---|---|---|
| HF-R01 | Evaluate Phaser arcade physics vs matter.js for hippo platformer | `.plans/research/HF-R01.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation under the closure contract. | 2 days | HF-M01 | Tech lead | Open |
| HF-R02 | Prototype Hippo sprite sheet pipeline (Aseprite → Phaser atlas) | `.plans/research/HF-R02.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation under the closure contract. | 2 days | HF-M01 | Media implementer + owner approval | Open |
| HF-R03 | Design ability state machine and cooldown system | `.plans/research/HF-R03.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation under the closure contract. | 2 days | HF-M01 | Game designer + owner approval | Open |
| HF-R04 | Determine level data format (JSON vs Tiled vs programmatic) | `.plans/research/HF-R04.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation under the closure contract. | 2 days | HF-M02 | Tech lead | Open |
| HF-R05 | Investigate Phaser tween-based camera for platformer (follow, bounds, effects) | `.plans/research/HF-R05.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation under the closure contract. | 2 days | HF-M02 | Tech lead | Open |
| HF-R06 | Touch zone layout study for 7+1 controls on 10" tablet | `.plans/research/HF-R06.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation under the closure contract. | 2 days | HF-M02 | Tech lead | Open |
| HF-R07 | Prototype region background generation (layered parallax) | `.plans/research/HF-R07.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation under the closure contract. | 2 days | HF-M03 | Media implementer + owner approval | Open |
| HF-R08 | Evaluate Web Audio API vs Phaser audio for music playback | `.plans/research/HF-R08.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation under the closure contract. | 2 days | HF-M03 | Media implementer + owner approval | Open |
| HF-R09 | Design and prototype the final boss's 3 phases. | `.plans/research/HF-R09.md` with phase state diagram, telegraphs, counters using the D24 ability set, transition/reset/save behavior, placeholder prototype, and test cases. Decision criterion: all phases are distinguishable, recoverable, testable, and approved before final-stage authoring. | 3 days | HF-M02 | Game designer + owner approval | Open |
