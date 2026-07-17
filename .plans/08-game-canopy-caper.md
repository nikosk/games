# Canopy Caper — Implementation Brief

> **Plan set:** [Master plan](README.md) · [Architecture](01-architecture.md) · [Tooling and CI](02-tooling-and-ci.md) · [Quality](03-quality-and-testing.md) · [Media production](04-media-production.md) · [Decisions and risks](05-decisions-and-risks.md)

**Status:** Not started
**Roadmap:** [Phase 2](README.md) · workstreams `W2.9–W2.13`
**Research namespace:** `CC-R##`
**Milestone namespace:** `CC-M##`; unprefixed `M1`, `M2`, … below mean `CC-M01`, `CC-M02`, …
**Release requirement:** all [G1–G16 and C1–C8](03-quality-and-testing.md) plus this brief's content gates
**Media sheet:** [Canopy Caper production requirements](04-media-production.md)

> Every research task below starts **Open** and follows the [research closure contract](05-decisions-and-risks.md#research-closure-contract). Its deliverable is `.plans/research/<ID>.md` plus the named prototype, measurement, or design artifact; the task wording is the minimum decision criterion. Assign an owner before moving it to **In research**.


## 1. Current-State Diagnosis

| Attribute | Value |
|-----------|-------|
| **File** | `monkey-banana.html` (613 lines, single-file) |
| **Stack** | Vanilla Canvas 2D, SVG sprites via base64 data URIs |
| **Audio** | None — completely silent |
| **Persistence** | None |
| **Touch** | ✅ On-screen d-pad buttons (80px, good size) via `pointer: coarse` media query |
| **Tests** | None |
| **Key defects** | Single procedurally-generated level only (no authored content); fragile `btoa()` encoding for SVG sprites; collision only checks top edge of platforms (falls through sides); no sound; no progression; no `prefers-reduced-motion`; platform generation can create unreachable bananas; `user-scalable` not explicitly disabled; safari zoom risk |
| **Maturity** | ✅ Functional but minimal content |

**Current gameplay:** Monkey moves left/right with d-pad or keyboard, jumps with up/space. Collect all bananas on a procedurally-generated platform level. No enemies. Falling off bottom wraps to top. Win screen on all bananas collected. Single level, no progression.

## 2. Intended Game: Canopy Caper

A vertical jungle platform adventure. Climb from forest floor to canopy, swing from vines, chain jumps, and search authored stages for fruit and hidden treasures.

**Player fantasy:** "I am a nimble monkey exploring the jungle canopy, finding fruit and secrets."

## 3. Exact Core Loop

```
┌─────────────────────────────────────────────────────┐
│  1. Player selects a stage from jungle map            │
│     • 30 authored climbs across 3 height zones        │
│       (Forest Floor, Mid-Canopy, Treetop Canopy)      │
├─────────────────────────────────────────────────────┤
│  2. Stage loads with:                                 │
│     • Hand-placed platforms, branches, vines          │
│     • Bananas and other fruit collectibles            │
│     • Hidden treasures (optional)                     │
│     • Goal: reach the top of the stage                │
├─────────────────────────────────────────────────────┤
│  3. Player controls monkey:                           │
│     • Move left/right (on ground and in air)          │
│     • Jump (variable height based on press duration)  │
│     • Grab and swing on vines (attach, pendulum)      │
│     • Wall jump on vertical surfaces (later stages)   │
│     • Glide after reaching apex (later stages)        │
├─────────────────────────────────────────────────────┤
│  4. Collect bananas for score, special fruit for      │
│     power-ups, hidden treasures bonus                 │
├─────────────────────────────────────────────────────┤
│  5. Reach the top to complete the stage:              │
│     • Score based on fruit collected + time + secrets  │
│     • Star rating (1–3)                               │
│     • Unlock next stage(s) on the jungle map          │
├─────────────────────────────────────────────────────┤
│  6. Branching paths on jungle map:                    │
│     • Main path stages (required for progression)     │
│     • Challenge routes (harder, optional bonus stars)  │
└─────────────────────────────────────────────────────┘
```

## 4. Controls

| Action | Touch | Keyboard/Mouse | Notes |
|--------|-------|----------------|-------|
| Move left/right | D-pad left/right buttons | Arrow Left/Right or A/D | D-pad meets AS-07/D21 measurements; semi-transparent overlay |
| Jump | Tap right side of screen (or jump button) | Space or Up or W | Variable height: longer press = higher |
| Grab vine | Auto-grab when touching vine | Auto-grab | Visual indicator when near vine |
| Swing on vine | Release jump button, use left/right to swing | Release jump, use left/right | Pendulum physics |
| Release vine | Tap down or swipe down | Down arrow or S | Releases with current momentum |
| Wall jump | Tap jump while touching wall | Press jump against wall | Unlocks in Mid-Canopy stages |
| Glide | Tap jump button in air (after unlocking) | Press jump in air | Slow descent, directional control |
| Navigate menus | Tap buttons | Click buttons | AS-07/D21-compliant targets and spacing |

## 5. Scenes

| Scene | Purpose | Key Elements |
|-------|---------|--------------|
| `BootScene` | Load assets | Monkey sprites, fruit, platform tiles, backgrounds, audio |
| `MenuScene` | Jungle map stage select | Scrolling vertical map, 30 stage nodes, branching paths, lock states |
| `GameScene` | Core platforming gameplay | Monkey controller, platforms, vines, fruit, HUD, camera follow |
| `StageCompleteScene` | Score breakdown, stars | Fruit count, time bonus, secrets, star rating, next stage unlock |
| `PauseScene` | Overlay while paused | Resume, restart, quit to map, sound toggle |
| `SettingsScene` | Audio, reset progress | Music/SFX sliders, reset progress confirmation |

## 6. Systems

| System | Responsibility | Shared or Game-Specific |
|--------|---------------|------------------------|
| **MonkeyController** | Movement, jumping, vine swing, wall jump, glide | Game-specific (character physics) |
| **Platform** | Static/moving platform tiles, collision detection | Game-specific (level data driven) |
| **Vine** | Vine segments, grab detection, pendulum physics | Game-specific |
| **Collectible** | Fruit types (banana, mango, coconut, star fruit, treasure) | Game-specific |
| **Camera** | Game-specific vertical follow tuning, dead zone, look-ahead, and stage bounds using Phaser cameras | Game-specific |
| **Stage** | Level data loading, placement of platforms/vines/collectibles | Game-specific |
| **Progression** | Stage unlock graph, star tracking, branching paths | Game-specific |
| **Audio** | Jump, collect, swing, glide, stage complete, UI | Consumes `packages/audio` |
| **Input** | D-pad, jump detection, vine release | Consumes `packages/input` |
| **Save** | Stage progress, stars, settings | Consumes `packages/core` |
| **UI** | Menu, stage select, pause, settings | Consumes `packages/ui` |
| **Effects** | Collect sparkle, trail, landing dust, leaf particles | Consumes `packages/effects` |

## 7. Level / Content Target

**30 authored stages across 3 height zones:**

| Zone | Stages | New Mechanics | Visual Theme |
|------|--------|--------------|--------------|
| **Forest Floor** (1–10) | 10 | Move, jump, vine swing, basic banana collect | Dense undergrowth, mushrooms, fallen logs |
| **Mid-Canopy** (11–20) | 10 | Wall jumps, moving branches, mango power-ups | Mid-level branches, flowers, birds |
| **Treetop Canopy** (21–30) | 10 | Glide, wind currents, hidden treasures, challenge routes | Open sky, colourful birds, butterflies |

**Branching paths:**
- Main path: Stages 1, 2, 3, 5, 6, 8, 9, 11, 12, 14, 15, 17, 18, 20, 21, 23, 24, 26, 27, 29 (20 stages)
- Challenge routes: Stages 4, 7, 10, 13, 16, 19, 22, 25, 28, 30 (10 stages, harder, optional)

**Stage design per zone:**

| Stage | Zone | Focus Mechanic | Description |
|-------|------|----------------|-------------|
| 1 | Floor | Move + jump | Simple left-to-right climb, 5 bananas |
| 2 | Floor | Vine intro | Single vine to swing across gap |
| 3 | Floor | Moving branch | Platform moves horizontally |
| 4 | Floor | Challenge: precision | Small platforms, wider gaps |
| 5 | Floor | Two vines chained | Swing vine→land→grab next vine |
| 6 | Floor | Obstacles | Spinning log, falling fruit hazards |
| 7 | Floor | Challenge: speed | Time bonus, no new mechanics |
| 8 | Floor | Hidden treasure | Secret alcove with bonus star fruit |
| 9 | Floor | Combine all | All floor mechanics, moderate length |
| 10 | Floor | Challenge: boss climb | Longest floor stage, tight precision |
| 11 | Mid | Wall jump intro | Vertical walls to leap between |
| 12 | Mid | Mango power-up | Temporary speed boost collectible |
| 13 | Mid | Challenge: no vines | Only wall jumps |
| 14 | Mid | Wall jump + vine combo | Alternating wall and vine sections |
| 15 | Mid | Moving branch + wall jump | Dynamic timing |
| 16 | Mid | Challenge: time attack | Timed completion for bonus star |
| 17 | Mid | Narrow gaps | Tight wall jump corridors |
| 18 | Mid | Three-section climb | Distinct mechanical sections |
| 19 | Mid | Challenge: treasure hunt | Find 3 hidden items |
| 20 | Mid | Combine all | All mid-canopy mechanics |
| 21 | Top | Glide intro | Wind current carries monkey |
| 22 | Top | Wind currents | Directional wind affects glide path |
| 23 | Top | Challenge: glide precision | Small landing platforms |
| 24 | Top | Treasure in canopy | Hard-to-reach hidden area |
| 25 | Top | Challenge: storm stage | Strong wind, low visibility |
| 26 | Top | All mechanics combined | Full moveset required |
| 27 | Top | Branching paths | Two valid routes to top |
| 28 | Top | Challenge: speed run | Timed with optimal route |
| 29 | Top | Grand climb | Longest stage, all mechanics |
| 30 | Top | Final challenge | Most difficult stage, full mastery |

## 8. Art / Animation / Audio Deliverables

**Art:**

| Asset | Type | Details |
|-------|------|---------|
| Monkey character | Animated sprite sheet | Idle, walk, jump, swing, wall-jump, glide frames (~20 frames total) |
| Bananas | Static sprite + collection animation | Yellow, glow effect when near |
| Mango (power-up) | Static sprite | Orange, pulsing glow |
| Star fruit (treasure) | Static sprite | Gold star shape |
| Platform tiles | Tileset per zone | 3 zone variants (floor jungle, mid green, top light) |
| Vine segments | Tiled sprite | Hanging vine look, grab indicator highlight |
| Moving branch | Animated entity | Wood grain, oscillation marker |
| Wind current indicator | Particle-like arrows | Directional wind visual cue |
| Background layers | Parallax layers | 3 zones × 3 layers = 9 background scenes |
| UI elements | Buttons, d-pad, HUD | Playful jungle-themed interface |

**Animation:**

| Element | Animation | Technique |
|---------|-----------|-----------|
| Monkey idle | Breathing, slight bounce | Sprite animation |
| Monkey walk | Limb cycle, tail wag | Sprite animation (4-frame) |
| Monkey jump | Arms up, legs tucked | Sprite animation (2-frame) |
| Monkey vine swing | Pendulum body sway | Procedural + sprite |
| Monkey wall jump | Push-off, flip | Sprite animation (3-frame) |
| Monkey glide | Arms spread, slow descend | Sprite animation (2-frame) |
| Banana collect | Shrink + sparkle trail | Phaser tween + particles |
| Leaves | Falling leaf particles | Phaser particle emitter |
| Wind currents | Directional particle streams | Phaser particle emitter |
| Camera shake | On landing, hard hits | Shared camera effects |

**Audio:**

| Sound | Type | Trigger | Priority |
|-------|------|---------|----------|
| Jump | Procedural "boing" | Each jump | Must-have |
| Double jump/wall jump | Higher-pitched boing | Wall jump | Must-have |
| Land | Soft thud | Landing on platform | Must-have |
| Banana collect | Pleasant ding | Each banana | Must-have |
| Mango collect | Power-up chime | Mango collect | Must-have |
| Treasure find | Special chime | Treasure collect | Should-have |
| Vine grab | Rope sound | Vine attach | Must-have |
| Vine swing | Whoosh (loop) | While swinging | Must-have |
| Glide | Wind sound (loop) | While gliding | Should-have |
| Stage complete fanfare | Triumphant jingle | Stage cleared | Must-have |
| UI tap | Soft click | Button interactions | Must-have |
| Zone ambience (3 tracks) | Ambient music loops | Background per zone | Must-have |

## 9. Data Models

```typescript
interface PlatformData {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'static' | 'moving';
  moveRange?: { axis: 'x' | 'y'; min: number; max: number; speed: number };
}

interface VineData {
  x: number;
  topY: number;
  bottomY: number;
}

interface CollectibleData {
  x: number;
  y: number;
  type: 'banana' | 'mango' | 'star-fruit' | 'treasure';
  hidden?: boolean;          // treasure is behind visual cover
  points: number;
}

interface WindCurrentData {
  x: number;
  y: number;
  w: number;
  direction: number;          // angle in radians
  strength: number;
}

interface StageData {
  id: number;
  zone: 'forest-floor' | 'mid-canopy' | 'treetop-canopy';
  name: string;
  requiredStars: number;      // stars needed to unlock
  isChallenge: boolean;
  spawnPoint: { x: number; y: number };
  goalPoint: { x: number; y: number };
  platformBounds: { x: number; y: number; w: number; h: number };
  platforms: PlatformData[];
  vines: VineData[];
  collectibles: CollectibleData[];
  windCurrents?: WindCurrentData[];
  parTime?: number;           // seconds, for time bonus
  starThresholds: [number, number, number]; // score thresholds
}

interface CanopyCaperSave {
  stageStars: Record<number, number>;
  totalScore: number;
  collectedTreasures: number[];
  settings: { music: boolean; sfx: boolean };
}
```

## 10. Shared Packages Consumed

| Package | Modules Used | Integration Point |
|---------|-------------|-------------------|
| `packages/core` | Game bootstrap, Phaser config | Entry point |
| `packages/input` | D-pad, jump detection, tap | GameScene input |
| `packages/audio` | Audio bus, cue playback, ambient loops | Scene lifecycle |
| `packages/ui` | Button, panel, stage select, modal | MenuScene, pause |
| `packages/effects` | Particles (leaves, sparkle, wind) and camera shake only | GameScene |

## 11. Game-Specific Systems

| System | File | Lines (est.) | Description |
|--------|------|-------------|-------------|
| MonkeyController | `src/systems/MonkeyController.ts` | ~400 | Movement, jump (variable height), vine swing, wall jump, glide state machine |
| PlatformCollider | `src/systems/PlatformCollider.ts` | ~200 | AABB collision with one-way platforms, moving platform attachment |
| VineSystem | `src/systems/VineSystem.ts` | ~150 | Vine grab detection, pendulum physics, release with momentum |
| CollectibleManager | `src/systems/CollectibleManager.ts` | ~100 | Spawn, collision, score, power-up effects |
| WindSystem | `src/systems/WindSystem.ts` | ~80 | Wind current zones, force application |
| StageLoader | `src/systems/StageLoader.ts` | ~150 | Load stage JSON, place entities, set camera bounds |
| ProgressionGraph | `src/systems/ProgressionGraph.ts` | ~100 | Stage unlock graph, star total tracking |

## 12. Milestone Slices

| Milestone | Scope | Deliverable | Verification |
|-----------|-------|-------------|--------------|
| **M1: Core movement** | Monkey moves, jumps, platform collision, camera follow | Monkey can traverse platforms in single authored stage | Complete Forest Floor stage 1 |
| **M2: Vine swing** | Vine grab detection, pendulum physics, release | Monkey swings on vines, lands on platform | Complete stage 2 (vine intro) |
| **M3: Full mechanics** | Wall jump, glide, moving platforms, wind currents | All movement mechanics working | Complete stage 26 (all mechanics) |
| **M4: Audio target** | Jump, collect, swing, ambience, stage complete | Full audio per sound list | Audio checklist |
| **M5: Art target** | Monkey sprites, platform tiles, backgrounds, UI | Visuals match Canopy Caper brief | Visual review |
| **M6: Content complete** | All 30 stages authored and playable | Full campaign from stage 1 to 30 | Complete playthrough |
| **M7: Production** | Build, tests, tablet test, deployment | Game live at /games/canopy-caper/ | Built game loads, no errors |

## 13. Tests

| Test Type | Scope | Tool |
|-----------|-------|------|
| Monkey physics | Jump arc, gravity, max velocity, friction | Vitest |
| Vine pendulum | Angular velocity, release trajectory | Vitest |
| Platform collision | AABB correctness, one-way platform edge cases | Vitest |
| Wall jump | Directional push-off, jump reset | Vitest |
| Stage data validity | All 30 stages: spawn reachable, goal reachable, all collectibles accessible | Vitest |
| Score calculation | Fruit count, time bonus, treasure bonus, star thresholds | Vitest |
| Progression graph | Unlock conditions, branching path validity | Vitest |
| Save/load | Stage stars, treasure collection round-trip | Vitest |
| Browser smoke | Game loads, monkey controls responsive | Playwright |

## 14. Completion Checklist

- [ ] 30 authored stages across 3 zones
- [ ] Monkety character with 5 movement states: idle, walk, jump, swing, glide
- [ ] Variable-height jump (hold for higher)
- [ ] Vine swing with pendulum physics
- [ ] Wall jump (unlocked in Mid-Canopy)
- [ ] Glide (unlocked in Treetop Canopy)
- [ ] Moving platforms
- [ ] Wind currents affecting glide
- [ ] 4 collectible types: banana, mango (power-up), star fruit (bonus), treasure (hidden)
- [ ] Jungle map with branching stage paths
- [ ] Stage completion with star rating
- [ ] All must-have sounds implemented
- [ ] 3 zone ambient music tracks
- [ ] Persistent progress save
- [ ] Settings: music/SFX toggles
- [ ] `prefers-reduced-motion` respected
- [ ] Touch d-pad meets AS-07 size/spacing and simultaneous-input tests on D21
- [ ] No browser dialogs
- [ ] Production build passes, deployed to /games/canopy-caper/

## 15. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Vine swing physics is complex to get right | Medium | High | Prototype pendulum early in M2; write physics tests; tune with tablet playthrough |
| Wall jump feel varies drastically by platform | Medium | High | Multiple playtest iterations on tablet; adjustable constants |
| 30 authored stages is large content volume | High | Medium | Produce 5 per zone first (M1-M3), then batch remaining in M6; use stage editor if needed |
| Glide + wind can be confusing on touch | Low | Medium | Clear visual indicators (arrows, character pose); tutorial overlay popup |

## 16. Research Tasks

| ID | Question / task | Deliverable and decision criteria | Timebox | Deadline / blocks | Owner | Status |
|---|---|---|---:|---|---|---|
| CC-R01 | Prototype vine pendulum physics with Phaser Arcade | `.plans/research/CC-R01.md` plus the named prototype/measurement. Decision criterion: determine if Arcade physics suffices or custom needed | 2 days | CC-M02 | Tech lead | Open |
| CC-R02 | Test variable-height jump timing on touch. | `.plans/research/CC-R02.md` with candidate hold curves, recorded input/trajectory traces, late-release/cancel cases, and D21 playtest evidence. Decision criterion: owner selects a curve with predictable short/full jumps and no missed/cross-control gestures in the test route. | 2 days | CC-M01 | Tech lead + owner approval | Open |
| CC-R03 | Evaluate stage editor need vs hand-authored JSON | `.plans/research/CC-R03.md` plus the named prototype/measurement. Decision criterion: decide if in-browser editor is worth building for 30 stages | 2 days | CC-M06 | Tech lead | Open |
| CC-R04 | Test touch d-pad and simultaneous jump | `.plans/research/CC-R04.md` plus the named prototype/measurement. Decision criterion: verify no gesture conflicts on tablet | 2 days | CC-M01 | Tech lead | Open |
