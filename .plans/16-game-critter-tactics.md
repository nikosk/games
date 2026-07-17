# Critter Tactics — Implementation Brief

> **Plan set:** [Master plan](README.md) · [Architecture](01-architecture.md) · [Tooling and CI](02-tooling-and-ci.md) · [Quality](03-quality-and-testing.md) · [Media production](04-media-production.md) · [Decisions and risks](05-decisions-and-risks.md)

**Status:** Not started
**Roadmap:** [Phase 5](README.md) · workstreams `W5.6–W5.9`
**Research namespace:** `CT-R##`
**Milestone namespace:** `CT-M##`; unprefixed milestone labels below are scoped to this game
**Release requirement:** all [G1–G16 and C1–C8](03-quality-and-testing.md), D27–D30 and D33 resolved, plus this brief's content gates
**Media sheet:** [Critter Tactics production requirements](04-media-production.md)

> Every research task below starts **Open** and follows the [research closure contract](05-decisions-and-risks.md#research-closure-contract). Its deliverable is `.plans/research/<ID>.md` plus the named prototype, measurement, or design artifact; the task wording is the minimum decision criterion. Assign an owner before moving it to **In research**.


## 1. Current-State Diagnosis

| Attribute | Status |
|-----------|--------|
| **Engine** | Phaser 3 (via Vite, import from `phaser` npm) |
| **Language** | JavaScript (`.js` files, not TypeScript), ES modules |
| **Build** | Vite with `base: './'`, outputs to `dist/` |
| **Scenes** | BootScene, MenuScene, BattleScene (~1500 lines), VictoryScene |
| **Levels** | 10 levels in `data/levels.json`: 4×4 to 6×6 grids |
| **Critters** | 3 types: Bash (push/1-range), Hop (stomp/1-range), Zap (ranged/2-range) |
| **Enemies** | 4 types: Charger (charge), Spitter (ranged), Grabber (pull), Boomer (bomb) |
| **AI** | Intent-based: enemies calculate intent (move/attack/pull/bomb) during separate phase, displayed as indicators |
| **Pathfinding** | BFS for enemy movement, occupancy check, bomb-zone avoidance |
| **Turns** | Enemy intent → Player plan (critter select, move, ability) → Resolve (player actions, enemy actions) |
| **Bombs** | Boomer places bombs with 1-turn timer, 3×3 explosion, marker cleanup |
| **HP Bars** | Manual Graphics-based bars above each entity |
| **Tutorial** | One-time overlay with 5 steps, stored in localStorage |
| **Save** | `localStorage` (key `critter_tactics_progress`) |
| **Art** | Procedural: `BootScene` generates all textures using Phaser Graphics API — cute critter faces, enemy designs |
| **Audio** | None — silent game |
| **Tests** | None |
| **PNG assets** | 8 PNG files in `src/assets/` (bash, hop, zap, charger, spitter, grabber, boomer, hazard) — not used? BootScene generates textures procedurally instead |

**Key issues:**
- **Broken on GitHub Pages**: Vite source imports (`/src/main.js`) are deployed raw, unbuilt. Confirmed broken entry.
- JavaScript, not TypeScript — no type safety for entity state, level data, ability definitions
- `BattleScene.js` is ~1500 lines of tightly coupled logic: AI, combat, UI, input, effects all in one class
- No audio at all — completely silent
- Only 3 critter types and 4 enemy types — limited tactical depth
- 10 levels with same core formula (defeat all enemies) — no variety in objectives
- No terrain variety beyond hazard cells — full flat grid
- No critter upgrades or progression between levels
- Boss encounters: none (level 10 is just "Final Stand" with 6 enemies)
- Procedural art is cute but simple — all sprites generated at boot, no atlas
- PNG assets exist but may not be loaded (BootScene generates procedural textures with same keys)

## 2. Intended Game

**Title:** Critter Tactics (same name, expanded)
**Genre:** Character-driven woodland tactical strategy
**Fantasy:** Command a squad of woodland critters to defeat clockwork invaders threatening their home.
**Rewrite target:** Expanded tactical campaign with exactly 4 distinct critters, 6 enemy types, terrain interactions, upgrades, 2 bosses, and custom battles.

Key changes:
- 18 battles (up from 10)
- 4 critter types (the fourth is resolved by D27)
- More enemy types with distinct AI behaviors
- Terrain interactions: bushes (cover), water (slow), rocks (block), height advantage
- Critter upgrades between battles (HP, ability damage, move range)
- Boss encounters with unique mechanics
- Custom battle mode
- Illustrated units and battlefields
- Ability cinematics and environmental reactions
- Orchestral-mechanical dual-theme audio; character voice cues only if D15 approves them

## 3. Core Loop

```
[ Enemy Intent phase ] → [ See enemy plans ] → [ Player Planning phase ] → [ Move critter ] → [ Use ability ] → [ End Turn ] → [ Resolve phase ] → [ Repeat ]
                                ↓                               ↓                                ↓
                         [ Indicators shown ]          [ Highlight reachable cells ]     [ Player actions execute ]
                                                                                              ↓
                                                                                    [ Enemy actions execute ]
                                                                                              ↓
                                                                                    [ Bombs explode / Check win ]
```

## 4. Controls

| Action | Desktop | Tablet |
|--------|---------|--------|
| Select critter | Click | Tap |
| Move to cell | Click highlighted cell | Tap highlighted cell |
| Use ability | Click highlighted enemy | Tap highlighted enemy |
| Skip ability | Click "Skip" button | Tap "Skip" button |
| End turn | Click "End Turn" button | Tap "End Turn" button |
| Retry | Tap "Retry" text | Tap "Retry" text |
| Pan camera | (not implemented) | Drag (if needed on larger maps) |

## 5. Scenes

| Scene | Purpose |
|-------|---------|
| `BootScene` | Load texture atlas, procedural textures, show loading bar |
| `MenuScene` | Title with animated critters, campaign, custom battle, settings, tutorial |
| `CampaignMapScene` | World map showing battle nodes with connections, progress, and unlocks |
| `BriefingScene` | Pre-battle narrative, enemy intel, recommended critters |
| `BattleScene` | Tactical combat — grid, critters, enemies, terrain, AI, abilities |
| `VictoryScene` | Battle complete — rewards, star rating, next battle unlock |
| `DefeatScene` | Defeat — retry, adjust team, return to campaign |
| `UpgradeScene` | Between battles: spend resources to upgrade critters |
| `CustomBattleScene` | Free build: select critters, enemies, terrain, grid size |
| `SettingsScene` | Audio, animation speed, reset progress |

## 6. Systems

**Game-specific:**
- `BattleDirector` — Turn loop orchestration: EnemyIntent → PlayerPlan → Resolve
- `GridSystem` — Grid state, pathfinding (BFS), cell query, terrain effects database
- `CritterController` — Critter stats, movement range calculation, ability execution
- `AIController` — Enemy intent calculation per behavior type (charge, ranged, grab, bomb, patrol, summon)
- `AbilitySystem` — Ability definitions, target validation, effect resolution, status effects
- `TerrainSystem` — Tile types (grass, bush, water, rock, height), movement cost, cover bonus
- `BombSystem` — Bomb placement, timer, explosion patterns, damage zones
- `LevelProgression` — Campaign state, battle unlocks, star tracking
- `UpgradeManager` — Cross-battle upgrades: HP, damage, move range, ability unlock

**Shared (from packages/):**
- `core:ScreenManager` — Fixed logical resolution, FIT scaling
- `core:GameBootstrap` — Phaser config, scene registration
- `input:ActionMapper` — Grid cell selection, UI button mapping, keyboard shortcuts
- `audio:AudioBus` — Music (orchestral battle / mechanical enemy), SFX (abilities, hits, explosions), UI sounds
- `core:SaveManager` — Campaign progress, upgrades, settings
- `ui:Button`, `ui:Panel`, `ui:HealthBar` — Reusable UI components
- `ui:PhaseBanner` — "Enemy Turn" / "Your Turn" animated banner
- `ui:Tooltip` — Hover/tap for unit stats, ability descriptions, terrain info
- `effects:ParticlePool` — Ability effects, explosion, hit sparks, heal
- `effects:CameraEffects` — Screen shake (explosions, boss hits), flash

## 7. Content Target

| Slice | Battles | Critters | Enemies | Terrain | Features | Art |
|-------|---------|----------|---------|---------|----------|-----|
| **M1: Core Tactics** | 4 | Bash, Hop, Zap | Charger, Spitter | None | Move, ability, enemy AI, turn loop, End Turn, victory/defeat | Placeholder cells, procedural critter sprites |
| **M2: Terrain & Hazards** | 8 | +1 new critter | + Grabber | Bush (cover), Water (slow), Rocks (block) | Terrain movement cost, cover bonus, LOS blocking | Simple terrain tiles |
| **M3: Bombs & Bosses** | 12 | — | + Boomer, +1 boss enemy | + Height (damage bonus) | Bomb system, boss mechanics, upgrade screen | Improved unit sprites, boss sprite |
| **M4: Campaign** | 18 full | 4 critters + upgrades | 6 enemy types + 2 bosses | 5 terrain types | Campaign map, unlocks, upgrades, star rating | Final unit + terrain art |
| **M5: Custom & Polish** | All + custom | All | All | All | Custom battle mode, all audio, effects, balance pass | Complete audio, final effects |
| **Ship** | 18 + custom | 4 critters | 6 enemies + 2 bosses | 5 terrain types | All features | Complete |

## 8. Data Schema

```typescript
// Battle level data
interface CritterTacticsLevel {
  id: number;
  name: string;
  campaignNode: { x: number; y: number };  // position on campaign map
  gridSize: number;
  terrain: { row: number; col: number; type: TerrainType }[];
  critters: { type: CritterType; row: number; col: number }[];
  enemies: { type: EnemyType; row: number; col: number }[];
  hazards?: { row: number; col: number }[];
  objectives: ObjectiveType;  // "defeat_all" | "survive" | "boss" | "escort"
  boss?: boolean;
  unlockCriteria: { requiredBattle?: number; requiredUpgrades?: number };
  recommendedAbilityLevel?: number;
}

// Critter definition
interface CritterDef {
  id: CritterType;
  name: string;
  baseHp: number;
  baseMoveRange: number;
  ability: AbilityDef;
  upgradeSlots: UpgradeSlot[];
  color: string;
}

// Ability (expanded)
interface AbilityDef {
  name: string;
  type: 'melee' | 'ranged' | 'push' | 'pull' | 'aoe' | 'heal' | 'buff';
  baseDamage: number;
  range: number;
  aoePattern?: 'cross' | '3x3' | 'line';
  cooldown: number;
  statusEffects?: StatusEffect[];
}

// Save data
interface CritterSave {
  version: 2;
  completedBattles: number[];
  stars: Record<number, number>;  // battleId → star count
  critterUpgrades: Record<string, { hp: number; damage: number; moveRange: number }>;
  unlockedCritters: CritterType[];
  settings: { musicVolume: number; sfxVolume: number; animationSpeed: number };
  tutorialCompleted: boolean;
}

// Terrain
enum TerrainType {
  Grass = 'grass',       // normal, 1 move cost
  Bush = 'bush',         // cover (+defense), 1 move cost
  Water = 'water',       // slow, 2 move cost
  Rock = 'rock',         // block, impassable
  Height = 'height',     // +1 damage from height, 1 move cost
}
```

**Legacy migration gate (D33):** fixture campaign progress and tutorial keys, map old battles to the 18-node campaign or explicitly choose fresh start, document dropped fields, and test idempotent import, corrupt/newer data, backup preservation, and safe fallback.

## 9. Art, Animation & Audio

**Approved art direction:** Illustrated units and battlefields, ability cinematics, environmental reactions.

| Element | Current | Target |
|---------|---------|--------|
| Critters | Procedural cute faces (circles, eyes, smiles) | Illustrated woodland animals: bash (badger?), hop (frog), zap (cat/squirrel), + new (fox? owl?) |
| Enemies | Procedural angry faces (horns, teeth) | Clockwork mechanical enemies: tick-tock aesthetic, gear motifs, metallic palette |
| Battlefield | Checkerboard grid | Illustrated terrain tiles with grass, bushes, water, rocks, height |
| Abilities | Particle bursts (circles, lines, X marks) | Cinematic ability animations: shove wave, stomp ring, zap lightning, aoe explosion |
| UI | Phaser text + simple Graphics | Themed interface with wood/bark borders, parchment backgrounds, critter silhouettes |
| HP Bars | Simple colored rectangles | Animated bars with damage number popups |

**Animation targets:**
- Critters: Idle bob, walk tween to destination, attack animation (lunge, stomp, zap pose), hit reaction, victory cheer, defeat collapse
- Enemies: Idle mechanical sway, movement (glide for spitter, charge rush for charger), bomb planting, explosion
- Abilities: Shove (impact wave), stomp (ring expand), zap (lightning bolt), explosion (fireball expanding)
- Terrain: Water ripple, bush sway, height indicator glow

**Audio:**
- Current: Completely silent
- Target:
  - Music: Orchestral woodland theme for critter phase, mechanical/dissonant theme for enemy phase, boss theme
  - SFX: Per-ability sound (shove thud, stomp boom, zap crackle, explosion), hit reaction, move step, UI clicks
  - Voice: D15-gated critter battle cries; mechanical whirrs and victory fanfare remain SFX/music cues
  - Environment: Wind rustle (bush), water splash, rock impact

## 10. Unit/Integration Tests

| Test Suite | What it covers |
|------------|----------------|
| `GridSystem.test` | Pathfinding BFS correctness, occupancy checks, terrain movement cost, blocking |
| `AbilitySystem.test` | All ability types: damage calc, range validation, target filtering, push direction |
| `AIController.test` | All 6 enemy behaviors: intent calculation, target selection, edge cases |
| `BombSystem.test` | Placement, timer countdown, explosion 3x3, damage application, marker cleanup |
| `BattleDirector.test` | Turn phase sequencing, victory/defeat detection, multiple end conditions |
| `LevelData.test` | All 18 levels: valid spawns, reachable objectives, no softlocks |
| `UpgradeManager.test` | Stat upgrades applied correctly, cost scaling, save/restore |
| `SaveManager.test` | Serialization, migration from current schema (v1 → v2) |
| Browser smoke test | Built game loads, completes first battle without errors |

## 11. Milestone Slices

| ID | Playable outcome | Depends on | Deliverable | Verification |
|---|---|---|---|---|
| CT-M01 | One strict-TypeScript battle supports turn order, movement, targeting, and three existing critter abilities with temporary art. | Phase 4 packages, D10, D21, D27 | Pure battle state/rules, Phaser battle scene, fixed logical grid | Deterministic rule tests and one browser battle critical path |
| CT-M02 | Terrain and six enemy behaviors create a complete authored encounter with readable previews. | CT-M01, D11 | Terrain costs/effects, pathfinding, AI decisions, preview UI | Golden-turn tests, pathfinding tests, no hidden state changes |
| CT-M03 | Bombs and one multi-phase boss work with effects, counterplay, and restart/save safety. | CT-M02, D28 | Bomb lifecycle, boss state machine, first boss encounter | Timer/explosion/boss-transition tests plus browser completion |
| CT-M04 | Campaign map, rewards, upgrades, and migration policy connect battles into persistent progression. | CT-M03, D29–D33 | 18-node campaign data, upgrade economy, versioned save handling | Data validation, economy simulation, save migration/invalid-data tests |
| CT-M05 | One battle is art-, animation-, and audio-complete and meets performance budgets. | CT-M02–04, D13–D16 | Approved units/enemies/terrain/UI, cue list, music states | C1–C8 review, target-device profile, visual baselines |
| CT-M06 | Campaign, two bosses, and custom-battle mode ship through the validated Pages artifact. | CT-M05 | Complete content, classic archive, `site-dist/critter-tactics/` | G1–G16, post-deploy smoke, live critical path, rollback drill |

## 12. Completion Criteria

- 18 campaign battles with varied objectives (defeat all, survive, boss, escort)
- 4 critter types with distinct abilities and upgrade paths
- 6 enemy types with unique AI behaviors
- 5 terrain types with gameplay effects (cover, slow, block, height)
- 2 boss encounters with multi-stage mechanics
- Critter upgrade system between battles (HP, damage, move, ability)
- Custom battle mode: choose critters, enemies, terrain, grid size
- World map menu with node connections, progress indicators
- Illustrated unit sprites and terrain tiles
- Ability cinematics and environmental reaction particles
- Full audio: orchestral/mechanical duel soundtrack, designed SFX, and D15-approved voice cues if any
- Tablet controls: tap-to-select, tap-to-move, confirmation for critical actions
- No console errors, stable on tablet at 4×4 to 8×8 grids
- Campaign progress saves correctly, upgrades persist

## 13. Risks

1. **AI complexity**: 6 enemy types × 5 terrain types × 18 levels = many AI decision edge cases. Mitigation: write AI tests before implementing each new behavior.
2. **Boss design**: Current game has zero boss mechanics. Designing multi-stage boss encounters from scratch without reference is risky. Mitigation: prototype one boss in M3, iterate based on playtest.
3. **Pathfinding with terrain**: BFS with terrain movement costs is straightforward, but LOS blocking for ranged abilities with terrain adds complexity. Mitigation: implement terrain effects incrementally (costs first, cover second, LOS third).
4. **Campaign balance**: 18 battles with upgrade progression requires careful difficulty curve. Risk of snowballing (too easy) or walling (too hard). Mitigation: automated playthrough simulation for balance checking.
5. **Art scope**: 4 critters + 6 enemies + 5 terrain sets + 2 bosses + UI is a large 2D art target. Mitigation: use the procedural texture generation from current BootScene as fallback, layer pixel art on top.

## 14. Research Tasks

| ID | Question / task | Deliverable and decision criteria | Timebox | Deadline / blocks | Owner | Status |
|---|---|---|---:|---|---|---|
| CT-R01 | Design the 4th critter and validate it against the existing 3. | `.plans/research/CT-R01.md` with role matrix, ability prototype, seeded encounter simulations, overlap/counterplay analysis, and D27 recommendation. Decision criterion: the new role has a distinct tactical use without dominating the same representative encounters. | 2 days | CT-M01 | Game designer + owner approval | Open |
| CT-R02 | Design 2 new enemy types (patrol, summoner, etc.) | `.plans/research/CT-R02.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation under the closure contract. | 2 days | CT-M01 | Game designer + owner approval | Open |
| CT-R03 | Prototype terrain system with movement cost + visual tiles | `.plans/research/CT-R03.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation under the closure contract. | 2 days | CT-M01 | Tech lead | Open |
| CT-R04 | Design the 2 multi-phase boss encounters. | `.plans/research/CT-R04.md` with phase diagrams, telegraphs, counters, terrain/add interactions, reset/save behavior, placeholder encounter, and D28 recommendation. Decision criterion: both bosses are mechanically distinct, deterministic under tests, readable, recoverable, and owner-approved. | 3 days | CT-M03 | Game designer + owner approval | Open |
| CT-R05 | Implement playback-only test harness for BattleDirector | `.plans/research/CT-R05.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation under the closure contract. | 2 days | CT-M03 | Tech lead | Open |
| CT-R06 | Campaign map layout — 18 nodes with branches and optional battles | `.plans/research/CT-R06.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation under the closure contract. | 2 days | CT-M04 | Game designer + owner approval | Open |
| CT-R07 | Evaluate Phaser tilemap vs custom grid for terrain rendering | `.plans/research/CT-R07.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation under the closure contract. | 2 days | CT-M04 | Tech lead | Open |
| CT-R08 | Upgrade cost curve — resource gain per battle vs upgrade cost scaling | `.plans/research/CT-R08.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation under the closure contract. | 2 days | CT-M04 | Tech lead | Open |
| CT-R09 | Custom battle mode UI — drag/drop vs sequential selection | `.plans/research/CT-R09.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation under the closure contract. | 2 days | CT-M04 | Tech lead | Open |

The current raw-source Pages failure is W0.4 implementation work, not a research unknown: publish the existing built `thegame/dist/` at `/games/thegame/` until CT-M06 replaces it.
