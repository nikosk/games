# Railway Workshop — Implementation Brief

> **Plan set:** [Master plan](README.md) · [Architecture](01-architecture.md) · [Tooling and CI](02-tooling-and-ci.md) · [Quality](03-quality-and-testing.md) · [Media production](04-media-production.md) · [Decisions and risks](05-decisions-and-risks.md)

**Status:** Not started
**Roadmap:** [Phase 1](README.md) · workstreams `W1.6–W1.13`
**Research namespace:** `RW-R##`
**Milestone namespace:** `RW-M##`; unprefixed `M1`, `M2`, … below mean `RW-M01`, `RW-M02`, …
**Release requirement:** all [G1–G16 and C1–C8](03-quality-and-testing.md) plus this brief's content gates
**Media sheet:** [Railway Workshop production requirements](04-media-production.md)

> Every research task below starts **Open** and follows the [research closure contract](05-decisions-and-risks.md#research-closure-contract). Its deliverable is `.plans/research/<ID>.md` plus the named prototype, measurement, or design artifact; the task wording is the minimum decision criterion. Assign an owner before moving it to **In research**.


## 1. Current-State Diagnosis

| Attribute | Value |
|-----------|-------|
| **File** | `train-tracks.html` (631 lines, single-file) |
| **Stack** | Vanilla HTML/CSS/JS, DOM-based grid, SVG inline assets |
| **Audio** | None — completely silent |
| **Persistence** | None — no save, no levels |
| **Touch** | ✅ Full drag-and-drop with `touchstart`/`touchmove`/`touchend` + mouse fallback |
| **Tests** | None |
| **Key defects** | Uses browser `alert()` for success (blocks on tablet); touch targets fall to 55px and have not been validated against AS-07/D21; grid size 7 makes ~40px cells on small tablets; no level progression; no win condition beyond "train reaches end"; no sound; no `prefers-reduced-motion` |
| **Maturity** | ✅ Functional but scope-limited |

**Current gameplay:** Drag track pieces (straight or corner) from toolbar onto a 4–7 grid. Tap placed tracks to rotate. Trash bin for removal. Press GO button to animate train along the path. Train derails on broken connections. Success alert when train reaches opposite corner. No levels, no scoring, no content variety.

## 2. Intended Game: Railway Workshop

A route-building puzzle and model railway diorama. Players design working railway routes across illustrated terrain tiles, then ride with the train as it delivers passengers and cargo. Levels introduce rivers, bridges, tunnels, junctions, multiple stations, and route limits.

**Player fantasy:** "I am a railway engineer building and operating a model railway."

## 3. Exact Core Loop

```
┌─────────────────────────────────────────────────────┐
│  1. Show level map with terrain, station(s), route   │
│     length target, and cargo delivery goals           │
├─────────────────────────────────────────────────────┤
│  2. Player selects a track type from palette           │
│     (straight, curve, junction, bridge, tunnel)       │
├─────────────────────────────────────────────────────┤
│  3. Player taps a grid cell to place the track         │
│     • Tap placed track to rotate (cycle 0°/90°/180°/270°) │
│     • Drag placed track to adjacent cell to move it    │
│     • Tap trash or long-press to remove                │
│     • Route highlights as track is placed             │
├─────────────────────────────────────────────────────┤
│  4. When route connects start → station(s),            │
│     the GO button activates                            │
├─────────────────────────────────────────────────────┤
│  5. Player pulls large throttle to start train          │
│     • Train animates cell-to-cell with steam particles  │
│     • Whistle at crossings, clack on straight,          │
│       squeal on curves                                 │
│     • Cargo collected along route                       │
│     • Passengers board at stations                     │
├─────────────────────────────────────────────────────┤
│  6. Success celebration with score breakdown:          │
│     delivery time, cargo collected, route efficiency    │
│  7. Unlock next level or replay for better cargo score  │
└─────────────────────────────────────────────────────┘
```

## 4. Controls

| Action | Touch | Keyboard/Mouse | Notes |
|--------|-------|----------------|-------|
| Select track type | Tap palette icon | Click palette icon | Palette: straight, curve, junction, bridge, tunnel |
| Place track | Tap empty cell | Click empty cell | Only valid if cell empty |
| Rotate placed track | Tap placed track | Click placed track | Cycles 0°→90°→180°→270° |
| Move placed track | Drag to adjacent cell | Drag to adjacent cell | Shows ghost placement |
| Remove track | Tap trash then track, or drag to bin | Right-click or drag to bin | Immediate removal with one-step undo |
| Start train | Tap GO / pull throttle lever | Click GO / click throttle | Only when valid route exists |
| Undo last action | Tap undo button | Ctrl+Z or undo button | Stack-based, clears on level start |
| Reset level | Tap reset | Click reset | In-game confirmation panel; never a browser dialog |
| Navigate menus | Tap buttons | Click buttons | Meet the AS-07/D21 target-size and spacing result |

## 5. Scenes

| Scene | Purpose | Key Elements |
|-------|---------|--------------|
| `BootScene` | Load assets, show logo | Phaser preloader, progress bar, asset manifest |
| `MenuScene` | Level select + sandbox entry | Grid of 12 level cards, sandbox button, settings |
| `GameScene` | Core gameplay | Grid board, track palette, throttle, score HUD, train |
| `LevelCompleteScene` | Score breakdown, rewards | Delivery time, cargo %, route efficiency, star rating |
| `PauseScene` | Overlay while paused | Resume, restart, quit to menu, sound toggle |
| `SettingsScene` | Audio, reset progress | Music/SFX sliders, reset confirmation, credits |

**Scene graph:**
```
BootScene → MenuScene ←→ SettingsScene
              ↓
          GameScene ←→ PauseScene
              ↓
      LevelCompleteScene
              ↓
          MenuScene
```

## 6. Systems

| System | Responsibility | Shared or Game-Specific |
|--------|---------------|------------------------|
| **Grid** | Logical grid state (N×N cells), track placement validation, route connectivity check | Game-specific |
| **Track** | Track piece data (type, rotation, port connections), SVG rendering, rotation logic | Game-specific |
| **Route validation** | BFS/DFS from start to verify path to each station; highlight valid/invalid | Game-specific |
| **Train** | Cell-by-cell path following, throttle input, cargo capacity, animation timing | Game-specific |
| **Level** | Level data loading, terrain tiles, delivery goals, star thresholds | Game-specific (uses shared level JSON schema) |
| **Delivery** | Cargo tracking, passenger boarding, scoring | Game-specific |
| **Audio** | Tracks for whistle, clack, squeal, steam, success, UI clicks | Consumes `packages/audio` |
| **Input** | Touch placement, tap-to-rotate, drag-to-move | Consumes `packages/input` |
| **Save** | Level progress, cargo records, settings | Consumes `packages/core` save system |
| **UI** | Level select, pause, settings panels | Consumes `packages/ui` |
| **Effects** | Steam particles, success confetti, track placement flash | Consumes `packages/effects` |

## 7. Level / Content Target

**12 levels across 3 visual regions:**

| Region | Levels | New Elements | Visual Theme |
|--------|--------|-------------|--------------|
| **Green Valley** | 1–4 | Straight, curve; single station; basic cargo | Pastoral green, blue sky, trees |
| **Hill Country** | 5–8 | Junctions, elevation, two stations, route length limits | Rolling hills, bridges, tunnels |
| **Industrial Coast** | 9–12 | Crossings, signals, three stations, timed deliveries, switches | Harborside, factories, signals |

**Sandbox mode:** Unlocked after completing region 1. Unlimited grid (scrollable), all track types, free placement, no goals.

**Level design principles (per AGENTS.md):** Introduce a mechanic, explore it, combine with earlier mechanics, test mastery.

| Level | Mechanic Introduced | Mechanic Explored | Combined With | Mastery Test |
|-------|--------------------|-------------------|---------------|--------------|
| 1 | Straight track | Build a straight path | — | Length limit |
| 2 | Curve track | Navigate around obstacles | Straight | Obstacle placement |
| 3 | Junctions | Split route to two stations | Curve, straight | Both stations served |
| 4 | Route limit | Minimum/maximum track count | All above | Efficiency scoring |
| 5 | Bridges | Elevated track over gaps | Junctions | River crossing |
| 6 | Tunnels | Track through terrain | Bridges | Mountain pass |
| 7 | Two stations | Serve both with one route | Junctions, tunnels | Cargo to both |
| 8 | Timed delivery | Time limit | All above | Speed + accuracy |
| 9 | Signals | One-way sections | Timed, junctions | Traffic management |
| 10 | Switches | Switchable track branches | Signals | Dynamic routing |
| 11 | Three stations | Complex route design | Switches, tunnels | Full network |
| 12 | Grand delivery | All mechanics, strict limits | All | Master challenge |

## 8. Art / Animation / Audio Deliverables

**Art:**

| Asset | Type | Details |
|-------|------|---------|
| Track tiles (straight, curve, junction, bridge, tunnel) | Painted sprites | Chunky wooden model-railway aesthetic, 4 rotations each |
| Terrain tiles (grass, water, hill, rock, building, sand) | Painted sprites | Tiled terrain, 4–6 variants per type |
| Train locomotive | Animated sprite | Side view, steam puff, wheel rotation |
| Train carriages (passenger, cargo) | Animated sprites | Coupling bounce, cargo load states |
| Station buildings | Static sprites | 2 variants per region |
| Signals | Animated sprites | Green/red states |
| Throttle lever | Interactive UI element | Pull animation |
| Palette icons | UI icons | Track type thumbnails |
| Background dioramas | Painted scenes | 3 region backgrounds with parallax layers |

**Animation:**

| Element | Animation | Technique |
|---------|-----------|-----------|
| Train movement | Cell-to-cell smooth interpolation | Phaser tween with easing |
| Steam puffs | Particle emission from smokestack | Phaser particle emitter |
| Wheel rotation | Continuous rotation on locomotive | Sprite animation |
| Carriage bounce | Vertical oscillation while moving | Phaser sine wave tween |
| Signal change | Flip from green to red | Phaser tween |
| Track placement | Scale-up pop-in | Phaser tween |
| Success celebration | Confetti burst + camera shake | Shared effects + camera |

**Audio:**

| Sound | Type | Trigger | Priority |
|-------|------|---------|----------|
| Track placement "click" | Designed effect | Place or rotate track | Must-have |
| Train whistle | Designed effect | Departure, signal crossing | Must-have |
| Track clack | Procedural/designed | Train on straight (rhythmic) | Must-have |
| Curve squeal | Designed effect | Train on curve | Should-have |
| Bridge rumble | Designed effect | Train on bridge | Should-have |
| Steam hiss | Procedural | Continuous while moving | Should-have |
| Cargo load "ding" | Designed effect | Cargo collected | Must-have |
| Passenger chatter | Ambient effect | Near stations | Nice-to-have |
| UI tap | Procedural | All button interactions | Must-have |
| Success fanfare | Designed effect | Level complete | Must-have |
| Region music track | Composed music | Loop per region (3 tracks) | Must-have |

## 9. Data Models

```typescript
// Track piece definition
interface TrackPiece {
  type: 'straight' | 'curve' | 'junction' | 'bridge' | 'tunnel';
  rotation: 0 | 90 | 180 | 270;
  // Ports: which cell edges the track connects
  // Each entry is [entrancePort, exitPort] where 0=up,1=right,2=down,3=left
  ports: Record<number, [number, number]>;
}

// Level definition
interface RailwayLevel {
  id: number;
  region: 'green-valley' | 'hill-country' | 'industrial-coast';
  name: string;
  gridRows: number;
  gridCols: number;
  terrain: TerrainTile[][];            // 2D array matching grid
  startCell: { row: number; col: number; direction: number };
  stations: Station[];
  availableTracks: TrackType[];
  routeLimit?: { min?: number; max?: number };
  timeLimit?: number;                   // seconds
  cargoTargets: number;                 // cargo items to collect
  starThresholds: [number, number, number]; // cargo % for 1/2/3 stars
  cargoPositions: { row: number; col: number }[];
}

interface Station {
  row: number;
  col: number;
  name: string;
  passengers: number;                   // passengers to board
}

// Save data
interface RailwaySave {
  levelsCompleted: number[];
  levelStars: Record<number, number>;   // levelId → star count
  cargoCollectibles: Record<number, number>; // levelId → cargo collected
  sandboxUnlocked: boolean;
  settings: { music: boolean; sfx: boolean };
}
```

## 10. Shared Packages Consumed

| Package | Modules Used | Integration Point |
|---------|-------------|-------------------|
| `packages/core` | Game bootstrap, Phaser config, scene lifecycle | Entry point |
| `packages/input` | Touch action mapping (tap, drag, long-press) | GameScene input handlers |
| `packages/audio` | Audio bus, cue playback, volume groups | Scene startup/teardown |
| `packages/ui` | Button, panel, level-select, modal components | MenuScene, pause overlay |
| `packages/effects` | Particles (steam, confetti), camera shake | Train movement, success |

## 11. Game-Specific Systems

| System | File | Lines (est.) | Description |
|--------|------|-------------|-------------|
| GridManager | `src/systems/GridManager.ts` | ~200 | Grid state, cell lookup, bounds checking |
| TrackManager | `src/systems/TrackManager.ts` | ~300 | Track placement, rotation, removal, port connectivity |
| RouteFinder | `src/systems/RouteFinder.ts` | ~150 | BFS/DFS pathfinding, route validation, highlight |
| TrainController | `src/systems/TrainController.ts` | ~250 | Path following, speed, cargo collection, animation |
| DeliveryTracker | `src/systems/DeliveryTracker.ts` | ~100 | Cargo count, passenger count, scoring, stars |
| LevelLoader | `src/systems/LevelLoader.ts` | ~100 | Load level JSON, build terrain, place stations |

## 12. Milestone Slices

| Milestone | Scope | Deliverable | Verification |
|-----------|-------|-------------|--------------|
| **M1: Core interaction** | 5×5 grid, straight/curve track, GO button, train animation | A track can be placed, train runs along connected path | Place tracks, press GO, watch train |
| **M2: Level system** | 4 levels (Green Valley), terrain tiles, cargo collection | Levels load, cargo collects as train passes | Complete level 1–4, see star rating |
| **M3: Input polish** | Touch rotation, drag-to-move, undo, throttle lever | All input works reliably on tablet | Tablet playthrough of Green Valley |
| **M4: Art target** | Painted track tiles, terrain, train sprite, region backgrounds | Visuals match Railway Workshop brief | Visual comparison against concept |
| **M5: Audio target** | Placement click, whistle, clack, success fanfare, region music | Full audio per sound list | Audio checklist, device listening |
| **M6: Full content** | All 12 levels + sandbox | Complete campaign playable | Complete playthrough, all mechanics present |
| **M7: Production** | Build, tests, tablet test, deployment | Game live at /games/railway-workshop/ | Built game loads, no console errors, tablet tested |

## 13. Tests

| Test Type | Scope | Tool |
|-----------|-------|------|
| Grid placement | Valid/invalid cells, boundary checks | Vitest |
| Route validation | BFS correctness, broken path detection, multi-station routes | Vitest |
| Track rotation | Port consistency after rotation cycles | Vitest |
| Level data | All 12 levels valid (start connected, stations placed, solvable) | Vitest |
| Save/load | Serialization round-trip, migration | Vitest |
| Browser smoke | Game loads, GO button clickable, train moves | Playwright |

## 14. Completion Checklist

- [ ] 12 levels across 3 regions, each introducing/exploring/combining/testing mechanics
- [ ] Sandbox mode unlocked after region 1
- [ ] All track types implemented: straight, curve, junction, bridge, tunnel
- [ ] Grid placement, rotation, move, removal all work by touch
- [ ] Route validation highlights valid paths, GO activates only when valid
- [ ] Train animates smoothly cell-to-cell with steam particles
- [ ] Cargo collection and delivery scoring
- [ ] 3 original art regions with painted diorama backgrounds
- [ ] Train, carriage, signal, station sprites
- [ ] All must-have sounds implemented and tested on tablet
- [ ] 3 region music tracks
- [ ] Level select with lock/star states
- [ ] Save progress across sessions
- [ ] Settings: music/SFX toggles
- [ ] `prefers-reduced-motion` respected (no shake, simplified particles)
- [ ] `user-scalable=no`, `overflow:hidden`, `touch-action: manipulation`
- [ ] No browser `alert()` — all feedback via in-game UI
- [ ] Palette/control targets meet the measured AS-07 minimum and spacing on every D21 viewport
- [ ] Production build passes, deployed to /games/railway-workshop/
- [ ] Tablet playthrough of all 12 levels without console errors

## 15. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Route validation corner cases (junction orientation) | Medium | High | Write exhaustive BFS tests with all track/rotation combos |
| Touch drag-to-move conflicts with tap-to-rotate | Medium | High | Use gesture timing: short tap = rotate, drag start after 100px threshold |
| Grid size on small tablets (7×7 with terrain tiles) | Low | Medium | Cap grid at 6×6 on screens <768px, use scrollable board for larger |
| Train animation timing on slow devices | Low | Medium | Use delta-time for animation, not fixed step |
| Bridge/tunnel visual readability at small cell sizes | Medium | Medium | Test at 56px cell; use distinct color coding and terrain labels |

## 16. Research Tasks

| ID | Question / task | Deliverable and decision criteria | Timebox | Deadline / blocks | Owner | Status |
|---|---|---|---:|---|---|---|
| RW-R01 | Test BFS route validation with junction track | `.plans/research/RW-R01.md` plus the named prototype/measurement. Decision criterion: verify pathfinding correctness for multi-exit pieces | 2 days | RW-M01 | Tech lead | Open |
| RW-R02 | Prototype throttle lever interaction on tablet | `.plans/research/RW-R02.md` plus the named prototype/measurement. Decision criterion: determine if drag-throttle or tap-throttle is more reliable | 2 days | RW-M03 | Tech lead | Open |
| RW-R03 | Test cell size legibility of painted track tiles at 56px | `.plans/research/RW-R03.md` plus the named prototype/measurement. Decision criterion: inform minimum grid size for each device | 2 days | RW-M04 | Tech lead | Open |
| RW-R04 | Research model railway whistle and clack sound design | `.plans/research/RW-R04.md` plus the named prototype/measurement. Decision criterion: inform audio asset creation | 2 days | RW-M05 | Media implementer + owner approval | Open |
