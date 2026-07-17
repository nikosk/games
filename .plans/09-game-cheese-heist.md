# Cheese Heist — Implementation Brief

> **Plan set:** [Master plan](README.md) · [Architecture](01-architecture.md) · [Tooling and CI](02-tooling-and-ci.md) · [Quality](03-quality-and-testing.md) · [Media production](04-media-production.md) · [Decisions and risks](05-decisions-and-risks.md)

**Status:** Not started
**Roadmap:** [Phase 3](README.md) · workstreams `W3.4–W3.6`
**Research namespace:** `CH-R##`
**Milestone namespace:** `CH-M##`; unprefixed `M1`, `M2`, … below mean `CH-M01`, `CH-M02`, …
**Release requirement:** all [G1–G16 and C1–C8](03-quality-and-testing.md) plus this brief's content gates
**Media sheet:** [Cheese Heist production requirements](04-media-production.md)

> Every research task below starts **Open** and follows the [research closure contract](05-decisions-and-risks.md#research-closure-contract). Its deliverable is `.plans/research/<ID>.md` plus the named prototype, measurement, or design artifact; the task wording is the minimum decision criterion. Assign an owner before moving it to **In research**.


## 1. Current-State Diagnosis

| Attribute | Value |
|-----------|-------|
| **File** | `mouse-adventure.html` (1,301 lines, single-file) |
| **Stack** | Vanilla Canvas 2D, procedural drawing |
| **Audio** | None (has unused `Web Audio API` words but no actual audio) |
| **Persistence** | None |
| **Touch** | ❌ **Keyboard-only** — no touch controls at all (critical blocker) |
| **Tests** | None |
| **Key defects** | **BLOCKER:** Keyboard-only (unplayable on tablets); death states with lives system and screen shake (overly punitive for the approved direction); dark theme (`#1a1a2e`) conflicts with the approved playful caper direction; Courier New font; enemies (frog, bee, Rudolf) that damage on contact; uses `var` instead of `let` in places; screen shake on death with no opt-out; no `prefers-reduced-motion`; no `user-scalable=no`; double-jump mechanic adds complexity |
| **Maturity** | ✅ Complete within its scope, but scope needs fundamental redesign |

**Current gameplay:** 3-level platformer. Mouse (grey with pink ears) moves with arrows/WASD, jumps with space. Double-jump available. Froggy enemies hop toward player, Rudolf patrols, Bee follows player. Contact = damage/lives lost. Cheese collectibles (+100 points), hearts (extra life). Goal flag ends level. 3 levels with increasing enemy count. Game over when lives reach 0.

## 2. Intended Game: Cheese Heist

A mouse-scale kitchen stealth platformer. Infiltrate enormous rooms, avoid guards (humans, cats, traps), create distractions, steal signature cheeses, and escape through the vents.

**Player fantasy:** "I am a clever little mouse sneaking through a giant kitchen, outsmarting the humans and cats to steal the cheese."

## 3. Exact Core Loop

```
┌─────────────────────────────────────────────────────┐
│  1. Player selects a room on the kitchen map          │
│     • 6 rooms: Pantry, Fridge, Countertop,            │
│       Stovetop, Sink, Chef's Table                    │
├─────────────────────────────────────────────────────┤
│  2. Room loads with:                                  │
│     • Scale: mouse is tiny, objects are huge          │
│     • Hiding spots (cups, napkins, cracks)            │
│     • Guards with sight lines (cones)                 │
│       - Human chef (patrol route, sight cone)         │
│       - Cat (patrol, wider hearing, can chase)        │
│       - Mouse trap (static hazard)                    │
│     • Distraction objects (crumb trail, pin drop)     │
│     • Target cheese at end of room                    │
├─────────────────────────────────────────────────────┤
│  3. Player controls mouse:                            │
│     • Move left/right, jump on/off counters           │
│     • Crouch/sneak (slower, quieter, shorter)         │
│     • Hide in cover (invisible to guards)             │
│     • Create distraction (drop crumb, tip spice)      │
│     • Quick dash (short burst speed, limited uses)    │
├─────────────────────────────────────────────────────┤
│  4. Guards have sight cones and patrol routes:        │
│     • Stay out of sight (shadow indicator when in     │
│       detection zone)                                 │
│     • Distractions create noise that lures guards     │
│     • Being seen triggers chase (music shifts)        │
│     • Reach hiding spot before caught                  │
│     • Cat can follow scent trail (crumbs)             │
├─────────────────────────────────────────────────────┤
│  5. Reach the cheese at the room's end:               │
│     • Steal the cheese (unique per room)              │
│     • Escape through vent to next room or exit        │
│     • Score: cheese quality, stealth bonus,            │
│       secret crumbs found, speed bonus                │
├─────────────────────────────────────────────────────┤
│  6. Complete all 6 rooms to win:                      │
│     • Final escape sequence (multiple guards)         │
│     • Scoreboard with all cheeses collected            │
│     • Speed run mode unlocked after first completion   │
└─────────────────────────────────────────────────────┘
```

## 4. Controls

| Action | Touch | Keyboard/Mouse | Notes |
|--------|-------|----------------|-------|
| Move left/right | D-pad left/right | Arrow Left/Right or A/D | Semi-transparent overlay; target size/spacing from AS-07/D21 |
| Jump | Tap right side (or jump button) | Space or Up or W | Short hop (mouse scale) |
| Crouch/sneak | Hold d-pad down | Hold S or Down | Slower, quieter, can enter vents |
| Hide | Tap hide button when near cover | H when near cover | Mouse becomes invisible until move |
| Create distraction | Tap distraction button | E key | Drop crumb or tip spice jar |
| Quick dash | Double-tap direction | Shift + direction | Short burst, 3 uses per room |
| View sight lines (when visible) | Auto-shown when guard near | Auto-shown | Red cone overlay when near detection |

## 5. Scenes

| Scene | Purpose | Key Elements |
|-------|---------|--------------|
| `BootScene` | Load assets | Kitchen props, mouse sprites, guard sprites, audio |
| `MenuScene` | Kitchen map room select | Illustrated kitchen cutaway, 6 room locations, lock states, settings |
| `GameScene` | Core stealth gameplay | Mouse controller, guard AI, sight cones, hiding spots, HUD |
| `RoomCompleteScene` | Cheese collection, score | Cheese illustration, stealth bonus, speed bonus, star rating |
| `EscapeScene` | Final escape sequence | Multi-guard chase, vent path, timer |
| `VictoryScene` | All cheeses collected | Full cheese board, replay/speed run option |
| `PauseScene` | Overlay | Resume, restart, quit, sound toggle |
| `SettingsScene` | Audio, reset | Music/SFX sliders, reset confirmation |

## 6. Systems

| System | Responsibility | Shared or Game-Specific |
|--------|---------------|------------------------|
| **MouseController** | Movement, jump, crouch, hide, dash, vent entry | Game-specific |
| **GuardAI** | Patrol routes, sight cones, hearing range, chase behaviour, distraction response | Game-specific |
| **SightCone** | Cone geometry, detection check, visibility with hiding/cover | Game-specific |
| **Distraction** | Crumb placement, noise radius, guard lure, scent trail | Game-specific |
| **Hiding** | Cover spots, crouch zones, vent network | Game-specific |
| **Cheese** | Target cheese per room, collection, quality scoring | Game-specific |
| **Room** | Level data loading, object placement, guard spawn points | Game-specific |
| **Audio** | Footsteps, guard sounds, chase music, cheese jingle | Consumes `packages/audio` |
| **Input** | Movement, jump, crouch, hide, dash, distraction | Consumes `packages/input` |
| **Save** | Room completion, collected cheeses, speed run records | Consumes `packages/core` |
| **UI** | Map, HUD, pause, settings, room complete | Consumes `packages/ui` |
| **Effects** | Shadow indicator, sight cone overlay, distraction particle, cheese sparkle | Consumes `packages/effects` |

## 7. Level / Content Target

**6 rooms, each with escalating threat:**

| Room | Theme | Guards | Distraction Tools | Cheese | New Mechanic |
|------|-------|--------|-------------------|--------|--------------|
| **Pantry** | Shelves, boxes, jars | 1 chef (simple patrol) | Crumbs | Gouda | Hide in boxes |
| **Fridge** | Cold, shelves, veggie drawers | 1 chef (faster patrol) | Crumbs, tip bottle | Cheddar | Crouch in drawers |
| **Countertop** | Open surface, appliances | 1 chef + 1 trap | Crumbs, spill flour | Brie | Quick dash from traps |
| **Stovetop** | Hot surfaces, pots | 2 chefs + 1 cat | Crumbs, tip spice, knock spoon | Camembert | Vent shortcuts |
| **Sink** | Wet surfaces, dishes | 2 chefs + 2 traps | Crumbs + all above | Blue Cheese | Scent trail from cat |
| **Chef's Table** | Final room, fancy setup | 3 chefs + 1 cat + 2 traps | All tools | Comté | Full escape sequence |

**Scoring:**

| Category | Points | Notes |
|----------|--------|-------|
| Cheese quality | 1000–5000 | Different cheeses worth different points |
| Stealth bonus | Up to 3000 | Times never seen by guards |
| Distraction efficiency | Up to 1000 | Fewest distractions used |
| Secret crumbs found | 500 each | Hidden collectible crumbs |
| Speed bonus | Up to 2000 | Based on completion time vs par |
| **Total per room** | Up to 11000 | |

**Stars:** 1★ = cheese collected, 2★ = cheese + stealth bonus ≥50%, 3★ = cheese + stealth ≥80% + speed bonus

## 8. Art / Animation / Audio Deliverables

**Art:**

| Asset | Type | Details |
|-------|------|---------|
| Mouse character | Animated sprite sheet | Idle, walk, crouch, hide, dash, scared frames (~16 frames) |
| Mouse tail | Animated overlay | Independent idle swish, scared curl |
| Chef guard | Animated sprite sheet | Walk patrol, look around, chase, confused (distraction) |
| Cat guard | Animated sprite sheet | Walk, stalk, pounce, sniff trail |
| Mouse trap | Static sprite + snap animation | Open/closed/sprung states |
| Cheese (6 unique) | Illustrated sprites | Gouda, Cheddar, Brie, Camembert, Blue, Comté — wheel/wedge shapes |
| Hiding spots | Static environment objects | Boxes, cups, napkin rolls, drawer edges, vent grates |
| Room backgrounds | Painted kitchen scenes | 6 rooms, dramatic miniature-scale lighting |
| Sight cone overlay | Semi-transparent cone | Red gradient, edge glow |
| UI elements | Buttons, HUD, map | Stealth-themed, warm kitchen palette |
| Crumb/tool items | Small static sprites | Breadcrumb, flour puff, spice jar, spoon |

**Animation:**

| Element | Animation | Technique |
|---------|-----------|-----------|
| Mouse walk | Leg cycle, tail swish | Sprite animation (4-frame) |
| Mouse crouch | Lowered body, tail still | Sprite animation (2-frame) |
| Mouse hide | Disappear into cover | Phaser tween fade + scale |
| Mouse dash | Speed blur trail | Motion tween + trail particles |
| Chef patrol | Walk cycle, head turn | Sprite animation |
| Chef chase | Fast walk, arm waving | Sprite animation + speed increase |
| Chef confused | Head scratch, shrug | Sprite animation (3-frame) |
| Cat stalk | Low crouch, tail flick | Sprite animation (3-frame) |
| Cat pounce | Leap toward mouse | Phaser motion tween |
| Trap snap | Quick close motion | Phaser tween (instant at detection) |
| Cheese glow | Subtle pulse | Phaser tween alpha cycle |
| Sight cone | Fade in/out near guard | Procedural canvas draw |
| Vent escape | Mouse shrinks into vent | Scale tween + fade |

**Audio:**

| Sound | Type | Trigger | Priority |
|-------|------|---------|----------|
| Mouse footsteps | Soft padded steps | Movement | Must-have |
| Mouse jump | Tiny "pfft" | Jump | Must-have |
| Mouse hide | Squeak + cover sound | Enter hiding | Must-have |
| Mouse dash | Whoosh | Dash | Should-have |
| Chef footsteps | Heavy steps | Chef patrol | Must-have |
| Chef "Hmm?" | Vocal cue | Chef hears distraction | Must-have |
| Chef "Hey!" | Vocal cue | Chef spots mouse (chase start) | Must-have |
| Cat meow | Vocal cue | Cat idle | Must-have |
| Cat hiss | Vocal cue | Cat chase | Must-have |
| Trap snap | Metal snap | Trap triggered | Must-have |
| Distraction crumb | Tiny "tap" | Crumb dropped | Must-have |
| Distraction spill | Shaker sound | Flour/splash | Should-have |
| Cheese collect | Triumphant jingle | Cheese stolen | Must-have |
| Detection warning | Heartbeat pulse | Mouse in sight cone | Must-have |
| Chase music | Heist jazz (intense) | Guard chase active | Must-have |
| Stealth music | Heist jazz (cool) | No detection | Must-have |
| Room complete fanfare | Jazz flourish | Room cleared | Must-have |
| UI tap | Soft click | Button interactions | Must-have |

## 9. Data Models

```typescript
interface GuardData {
  type: 'chef' | 'cat';
  startX: number;
  startY: number;
  patrolPath: { x: number; y: number; pauseMs: number }[];
  sightRange: number;          // pixels
  sightAngle: number;          // degrees
  hearingRadius: number;       // pixels (cat larger than chef)
  speed: number;
  chaseSpeed: number;
}

interface TrapData {
  x: number;
  y: number;
  detectionRadius: number;
  cooldownMs: number;
}

interface HidingSpotData {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'box' | 'cup' | 'drawer' | 'vent';
  crouchRequired: boolean;
  connectedVent?: number;       // vent ID for escape routes
}

interface DistractionData {
  type: 'crumb' | 'spill' | 'knock';
  noiseRadius: number;
  durationMs: number;
  usesPerRoom: number;
}

interface CheeseData {
  id: string;
  name: string;
  x: number;
  y: number;
  value: number;
  spriteKey: string;
}

interface RoomData {
  id: number;
  name: string;
  theme: RoomTheme;
  bounds: { x: number; y: number; w: number; h: number };
  spawnPoint: { x: number; y: number };
  escapePoint: { x: number; y: number };
  cheese: CheeseData;
  guards: GuardData[];
  traps: TrapData[];
  hidingSpots: HidingSpotData[];
  distractions: DistractionData[];
  secretCrumbs: { x: number; y: number; collected: boolean }[];
  parTime: number;               // seconds
  starThresholds: [number, number, number];
}

interface CheeseHeistSave {
  roomsCompleted: number[];
  roomScores: Record<number, number>;
  roomStars: Record<number, number>;
  collectedCheeses: string[];
  speedRunUnlocked: boolean;
  bestTimes: Record<number, number>;
  settings: { music: boolean; sfx: boolean };
}
```

## 10. Shared Packages Consumed

| Package | Modules Used | Integration Point |
|---------|-------------|-------------------|
| `packages/core` | Game bootstrap, Phaser config | Entry point |
| `packages/input` | Movement, action buttons, d-pad | GameScene |
| `packages/audio` | Audio bus, cue playback, chase/stealth transitions | Guard detection state changes |
| `packages/ui` | Button, panel, room select, modal | MenuScene, pause |
| `packages/effects` | Particles (crumbs, flour), camera shake (on trap), sight cone overlay | GameScene |

## 11. Game-Specific Systems

| System | File | Lines (est.) | Description |
|--------|------|-------------|-------------|
| MouseController | `src/systems/MouseController.ts` | ~300 | Movement, jump, crouch, hide, dash state machine |
| GuardAI | `src/systems/GuardAI.ts` | ~400 | Patrol path following, sight cone calculation, hearing, chase, distraction response, scent trail |
| SightConeSystem | `src/systems/SightConeSystem.ts` | ~150 | Cone geometry, line-of-sight with hiding/cover checks |
| DistractionSystem | `src/systems/DistractionSystem.ts` | ~100 | Crumb placement, noise propagation, guard lure |
| HidingSystem | `src/systems/HidingSystem.ts` | ~100 | Cover detection, crouch zones, vent network traversal |
| DetectionManager | `src/systems/DetectionManager.ts` | ~150 | Aggregation of all guard detection checks, warning indicator, chase state |
| RoomLoader | `src/systems/RoomLoader.ts` | ~150 | Load room JSON, place entities, set camera bounds |

## 12. Milestone Slices

| Milestone | Scope | Deliverable | Verification |
|-----------|-------|-------------|--------------|
| **M1: Core stealth** | Mouse moves, camera follow, basic guard patrol with sight cone, hide in box | Guard sees mouse (cone), mouse hides to avoid detection | Walk into sight cone, hide before caught |
| **M2: Distraction + cheese** | Drop crumb, guard investigates, steal cheese, reach escape | Full room 1 (Pantry) playable | Complete Pantry room |
| **M3: Full mechanics** | Crouch, dash, traps, cat scent trail, vents, multi-guard | All mechanics working | Complete Fridge + Countertop |
| **M4: Audio target** | Footsteps, guard sounds, chase/stealth music, cheese jingle | Full audio per sound list | Audio checklist |
| **M5: Art target** | Mouse sprites, guard sprites, room backgrounds, kitchen props | Visuals match Cheese Heist brief | Visual review |
| **M6: Content complete** | All 6 rooms authored and playable | Full campaign from Pantry to Chef's Table | Complete playthrough |
| **M7: Production** | Build, tests, tablet test, deployment | Game live at /games/cheese-heist/ | Built game loads, no errors |

## 13. Tests

| Test Type | Scope | Tool |
|-----------|-------|------|
| Guard patrol path | Waypoint following, pause timing, direction changes | Vitest |
| Sight cone detection | Point-in-cone, hiding override, cover checks | Vitest |
| Distraction system | Noise radius, guard lure path, distraction duration | Vitest |
| Mouse controller | Movement, jump arc, crouch state, dash cooldown | Vitest |
| Trap detection | Radius check, cooldown, visual state | Vitest |
| Room data validity | All 6 rooms: spawn reachable, cheese reachable, escape reachable, path solvable | Vitest |
| Score calculation | Cheese value, stealth bonus, speed bonus, star thresholds | Vitest |
| Save/load | Room completion, cheese collection round-trip | Vitest |
| Browser smoke | Game loads, mouse moves, guard patrols | Playwright |

## 14. Completion Checklist

- [ ] 6 rooms with unique layouts, guards, and cheese targets
- [ ] Mouse with 5 states: idle, walk, crouch, hide, dash
- [ ] Guard AI with patrol, sight cone, hearing, chase, distraction response
- [ ] Cat guard with scent trail tracking
- [ ] Mouse trap hazard
- [ ] Hiding spots (boxes, cups, drawers, vents)
- [ ] Vent network for escape routes
- [ ] Distraction system (crumbs, spills, knocks)
- [ ] Detection warning indicator (shadow/pulse)
- [ ] Chase music shift on detection
- [ ] 6 unique cheese illustrations
- [ ] All must-have sounds implemented
- [ ] Heist jazz music (stealth + chase variants per room)
- [ ] Kitchen map with room unlock progression
- [ ] Room complete with score breakdown
- [ ] Speed run mode unlocked after first completion
- [ ] Persistent progress save
- [ ] Settings: music/SFX toggles
- [ ] `prefers-reduced-motion` respected
- [ ] D-pad/action controls meet AS-07 size/spacing and simultaneous-input checks on D21
- [ ] No death states — guards chase, hiding resets (pure avoidance, no loss)
- [ ] No browser dialogs
- [ ] Production build passes, deployed to /games/cheese-heist/

## 15. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Sight cone + hiding mechanics are complex to implement well | Medium | High | Prototype cone detection early; test with tablet; use debug overlay for development |
| Guard AI chasing around obstacles/pathing | Medium | High | Simple direct-chase (guards don't need full pathfinding — they follow player, not navigate maze) |
| Cat scent trail is unique mechanic — may be confusing | Medium | Medium | Visual clue: glowing paw prints showing trail; tutorial room with cat introduces mechanic |
| 6 rooms with authored guard paths is content-heavy | Low | Medium | Use guard data as serialized JSON; rooms share object templates (e.g., "standard chef") |
| Stealth tension may overpower the playful caper fantasy | Medium | High | Emphasize readable hiding, humorous guard reactions, bright visuals, and non-punitive recovery; validate through blind playtests |

## 16. Research Tasks

| ID | Question / task | Deliverable and decision criteria | Timebox | Deadline / blocks | Owner | Status |
|---|---|---|---:|---|---|---|
| CH-R01 | Prototype sight cone with Phaser | `.plans/research/CH-R01.md` plus the named prototype/measurement. Decision criterion: determine rendering approach (graphics overlay vs texture) | 2 days | CH-M01 | Tech lead | Open |
| CH-R02 | Test guard distraction response behaviour | `.plans/research/CH-R02.md` plus the named prototype/measurement. Decision criterion: verify guard moves to noise point then returns to patrol | 2 days | CH-M02 | Tech lead | Open |
| CH-R03 | Evaluate vent network as serializable node graph | `.plans/research/CH-R03.md` plus the named prototype/measurement. Decision criterion: determine data format for room-to-room connections | 2 days | CH-M01 | Tech lead | Open |
