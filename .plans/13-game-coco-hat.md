# Coco's Lost Hat — Implementation Brief

> **Plan set:** [Master plan](README.md) · [Architecture](01-architecture.md) · [Tooling and CI](02-tooling-and-ci.md) · [Quality](03-quality-and-testing.md) · [Media production](04-media-production.md) · [Decisions and risks](05-decisions-and-risks.md)

**Status:** Not started
**Roadmap:** [Phase 3](README.md) · workstreams `W3.7–W3.10`
**Research namespace:** `CO-R##`
**Milestone namespace:** `CO-M##`; unprefixed `M1`, `M2`, … below mean `CO-M01`, `CO-M02`, …
**Release requirement:** all [G1–G16 and C1–C8](03-quality-and-testing.md), D36 resolved from CO-R05 evidence, plus this brief's content gates
**Media sheet:** [Coco's Lost Hat production requirements](04-media-production.md)

> Every research task below starts **Open** and follows the [research closure contract](05-decisions-and-risks.md#research-closure-contract). Its deliverable is `.plans/research/<ID>.md` plus the named prototype, measurement, or design artifact; the task wording is the minimum decision criterion. Assign an owner before moving it to **In research**.


## 1. Current-State Diagnosis

| Aspect | Current (crocodile-game/) | Assessment |
|--------|---------------------------|------------|
| Engine | Vanilla JS, DOM/SVG, ~720 lines game.js + styles.css + index.html | Clean code, no dependencies, but not Phaser/TypeScript |
| Gameplay | 5 linear scenes: wake Coco, cross river, clear grass, choose helper, decorate hat | Simple tap interactions, linear walkthrough |
| Visuals | SVG paper-cut style with CSS layering | Charming identity worth preserving and expanding |
| Audio | 22 MP3 narration files, Greek language, AthinaNeural voice | Full narration, well-structured AudioManager |
| Story | Coco wakes, hat is missing, crosses river, finds forest friends, retrieves hat from tree, decorates it, celebrates | Simple linear story, 5 scenes |
| Replayability | None — replay button returns to start | No branching, no decoration collection, no alternative routes |
| Progression | Linear scene-by-scene | No player choice beyond helper selection and decoration order |
| Accessibility | Full keyboard, aria-labels, reduced-motion, debounce | Excellent foundation |
| Testing | Node.js tests for narration integrity and scene structure | Good baseline coverage |
| Structure | Directory-based with HTML/CSS/JS/assets | Better than single-file but still not Phaser project |

**Files to archive to `classic/`:** `crocodile-game/` (entire directory) — preserve as-is for the Greek original.

## 2. Intended Game

**Coco's Lost Hat** is an expanded, replayable paper-theatre journey. Coco travels through changing routes, solves tactile scene puzzles, uses each helper differently, and builds a personal collection of hat decorations. The current linear 5-scene story becomes a branching adventure with 6 biomes, route variation, helper-specific abilities, and a collectible decoration system. The beloved paper-cut identity is preserved and elevated with watercolour texture, character rigs, parallax stages, and reactive soundscapes.

**Player fantasy:** An explorer on a nature journey where each playthrough can take a different path, meet different helpers, and create a unique hat decoration collection.

## 3. Core Loop

1. **Travel** — Coco moves through a scene-to-scene journey. At transition points, the player chooses between 2 routes (e.g., "Cross the river" or "Go through the meadow")
2. **Solve** — Each scene has a tactile puzzle: tap to wake, drag to clear, swipe to guide, pattern-matching, or sorting
3. **Meet helpers** — Different animals appear based on route choices and puzzle solutions
4. **Use helper abilities** — Each helper (elephant, giraffe, monkey, plus new ones) has a unique ability: reach, strength, speed, digging, flying
5. **Collect decorations** — Each successful scene awards a hat decoration item. Different routes yield different items
6. **Customize** — Decorate Coco's hat with collected items between scenes or at journey's end
7. **Complete and replay** — Journey ends with a celebration. Replay to collect all decorations, meet all helpers, see all routes

## 4. Controls (Target: Tablet + Keyboard)

| Action | Tablet | Keyboard |
|--------|--------|----------|
| Tap to interact | Tap | Space / Enter |
| Drag/pull | Touch-drag | Click + hold + drag |
| Swipe | Swipe | Arrow key direction |
| Choose route | Tap route option | 1/2 keys |
| Drag decoration to hat | Touch-drag hat area | Click-decoration + click-hat |
| Replay narration | Button | R |
| Mute | Button | M |
| Open collection | Button | C / Tab to collection button |
| Zoom scene elements | Pinch (optional) | Scroll wheel |

## 5. Scenes

| Scene | Purpose |
|-------|---------|
| `BootScene` | Load assets and preserve Greek plus any additional language approved by D36 |
| `TitleScene` | Animated title: Coco sleeping, butterfly lands on nose, wakes up, hat peg is empty |
| `JourneyMapScene` | Branching path map showing current route, visited scenes, locked/unlocked decorations |
| `PuzzleScene` | Template scene for puzzle types: tap-target, drag-clear, swipe-guide, match-pair, sort-group, pattern-complete |
| `HelperScene` | Meet a helper animal; learn its ability; use it to solve a scene-specific challenge |
| `DecorationScene` | Overlay with Coco model + decoration inventory; drag items onto hat |
| `CelebrationScene` | All helpers dance, confetti, decorated hat displayed, replay prompt |

Scene types by biome (6 biomes):

| Biome | Scenes | Puzzle types |
|-------|--------|-------------|
| Riverside | Wake up, cross river, find fish | Tap, swipe |
| Meadow | Clear grass, meet butterfly/beetle/turtle, sort flowers | Drag-clear, sort |
| Forest | Navigate trees, find monkey, climb | Swipe, pattern |
| Savannah | Meet elephant, giraffe, solve watering hole | Match, drag |
| Moonlit Grove | Night scene, find fireflies, meet owl | Tap-timing, pattern |
| Mountain Pass | Cross bridge, meet eagle, retrieve hat from peak | Drag, swipe, timing |

## 6. Systems

#### Shared from `packages/`
- `core` — Phaser bootstrap, screen scaling
- `input` — Tap, drag, swipe gesture recognition
- `audio` — Narration playback (preserve existing MP3 system), ambient sound, music
- `core` save module — Decoration collection, route history, helper met tracking
- `ui` — Button, panel, scene transition component
- `effects` — Particles (confetti, leaves, sparkles, fireflies)

#### Game-Specific Systems

| System | Responsibility |
|--------|---------------|
| **BranchingRouteManager** | Scene graph with weighted paths. Tracks visited nodes, available routes, helper encounters. Ensures player reaches an end state regardless of choices |
| **PuzzleDirector** | Template-driven puzzle system. Each scene defines: puzzle type (tap/drag/swipe/match/sort/pattern), targets, success conditions, failure hints |
| **HelperRegistry** | 6 helper animals, each with name, appearance, one distinct ability, animation set, and unique sound |
| **DecorationSystem** | Inventory of 15-20 hat decoration items. Each has: icon, name, source scene/route, visual on hat. Hat renders with all placed decorations |
| **SceneTransition** | Parallax layered transitions between scenes with paper-cut elements sliding in/out |
| **NarrationManager** | Extends current AudioManager with subtitles, timed cue sequences, and a language toggle only for languages approved by D36 |
| **CollectionProgress** | UI overlay showing total decorations, helpers met, routes explored. Completion percentage |

## 7. Content Target

| Element | Quantity | Notes |
|---------|----------|-------|
| Biomes | 6 | Riverside, Meadow, Forest, Savannah, Moonlit Grove, Mountain Pass |
| Total scenes | 18 | 3 per biome (including transition choices) |
| Branching routes per play | 8-10 scenes visited | Player sees ~50% of content per playthrough |
| Helper animals | 6 | Elephant, Giraffe, Monkey, Turtle, Firefly, Eagle |
| Puzzle types | 6 | Tap target, Drag-clear, Swipe-guide, Match-pair, Sort-group, Pattern-complete |
| Hat decorations | 18 | 3 per biome, route-dependent |
| Narration audio | ~30 Greek cues; +~30 per approved additional language | Expand the existing Greek set; additional language scope is gated by D36 |
| Language support | Greek required; English is an owner decision | Every language approved by D36 must have complete narration/subtitle parity |

## 8. Art Deliverables

| Asset | Format | Quantity |
|-------|--------|----------|
| Coco character | Rigged paper-cut sprites (head, body, limbs, hat layers) — PNG spritesheet | 1 sheet (~24 frames for idle, walk, happy, sad, wake, sleep) |
| Helper animals | Rigged paper-cut sprite per helper | 6 spritesheets |
| Biome backgrounds | Layered paper-cut style, 3-4 parallax layers each | 6×4 = 24 layers |
| Scene props per biome | Paper-cut style elements | 30-40 items |
| Hat decorations | Small paper-cut items | 18 items |
| UI — route map, collection, decoration slots | Paper-textured panels | 10-12 elements |
| Confetti and particles | Paper-confetti shapes | 5-6 particle shapes |
| Title/end illustrations | Full paper-cut scene | 2 |

## 9. Animation Deliverables

- Coco: idle bob, walk cycle (side view for travel), wake animation (eyes open, stretch), happy bounce, sad droop, hat place reaction
- Helpers: idle animation, ability use animation (elephant trunk reach, giraffe neck stretch, monkey climb, turtle shell, firefly glow, eagle swoop)
- Scene transitions: paper-cut layers slide in/out with slight bounce
- Puzzles: grass parts and reveals creature, lily pad sinks, flowers sort, fireflies appear with glow
- Decoration: item slides from inventory onto hat with magnetic snap
- Celebration: all characters dance, paper confetti falls

## 10. Audio Deliverables

| Category | Tracks / Sounds |
|----------|----------------|
| Narration | ~30 Greek cues; another ~30 for English only if D36 approves it; preserve and re-license-check existing Greek cues |
| Music — title | Gentle theme establishing paper-theatre mood |
| Music — per biome | 6 short ambient pieces, soft orchestral/acoustic |
| Music — celebration | Upbeat dance theme |
| Coco sounds | Yawn, happy chirp, surprised gasp, satisfied hum |
| Helper sounds | Elephant trumpet, giraffe hum, monkey chatter, turtle hiss, firefly chime, eagle cry |
| Puzzle feedback | Tap confirm, drag rustle, swipe whoosh, match chime, sort click, pattern complete |
| Decoration place | Gentle bell |
| UI | Navigation rustle, button paper-sound, page turn |

## 11. Data Models

```typescript
// Scene node in branching graph
interface SceneNode {
  id: string; biome: string;
  puzzleType: 'tap' | 'drag' | 'swipe' | 'match' | 'sort' | 'pattern';
  puzzleConfig: {
    targetCount: number;
    timeLimit?: number;
    targets: { id: string; position: { x: number; y: number }; state: string }[];
    successCondition: string; // e.g. "all_cleared", "3_matched"
  };
  narrationCues: { cue: string; delay: number }[];
  routes: { toScene: string; condition?: string; label: string }[];
  helpersAvailable?: string[]; // which helpers can appear here
  decorationReward: string; // decoration ID
  backgroundLayers: string[]; // asset keys
}

// Helper definition
interface HelperDef {
  id: string; name: string;
  nameGreek: string;
  ability: string; // description
  abilityType: 'reach' | 'lift' | 'climb' | 'dig' | 'fly' | 'glow';
  spriteKey: string;
  soundKeys: { idle: string; ability: string; success: string };
  unlockScene: string; // scene where first encountered
}

// Hat decoration item
interface DecorationItem {
  id: string; name: string;
  iconKey: string;
  sceneSource: string; // which scene rewards it
  routeCondition?: string; // which route choice required
  hatPosition: { x: number; y: number; zIndex: number }; // where it appears on Coco's hat
  size: number;
}

// Save data
interface SaveData {
  version: number;
  collectedDecorations: string[];
  helpersMet: string[];
  routesExplored: string[];
  totalPlaythroughs: number;
  currentRoute?: string[]; // scenes visited in current play
  language: 'el' | 'en';
}
```

## 12. Shared Packages Used

- `packages/core` — Phaser bootstrap, screen config, fullscreen
- `packages/input` — Tap, drag, swipe gesture detection
- `packages/audio` — Narration queue system, ambient bus
- `packages/ui` — Button, panel, decorative frame component
- `packages/effects` — Confetti particles, sparkle particles
- `packages/tools` — Scene graph validation, narration cue list validation

## 13. Milestone Slices

| Milestone | Scope | Acceptance |
|-----------|-------|------------|
| **M1: Core journey** | Phaser project, JourneyMapScene with branching graph, first 2 biomes (Riverside + Meadow) with 6 scenes, basic puzzles | Player can play through two biomes with route choices |
| **M2: All biomes** | All 6 biomes, 18 scenes, all puzzle types working | Full game structure complete |
| **M3: Helpers + decorations** | All 6 helpers with abilities, decoration system, inventory, hat customization | Helper abilities integrated into puzzles, decorations collectible |
| **M4: Branching + replay** | Route variety ensures different playthroughs, replay value, collection completion tracking | Two playthroughs see different content |
| **M5: Art target** | Paper-cut art for all biomes, Coco and helper rigs, parallax backgrounds | Full visual quality |
| **M6: Narration + audio** | All approved narration cue sets integrated with music and effects | Complete audio in every language selected by D36 |
| **M7: Animation pass** | All animations for characters, puzzles, transitions smooth | Animation complete |
| **M8: Testing + ship** | Unit tests, browser smoke tests, deploy | Complete game shipped |

## 14. Tests

| Test | What it checks |
|------|---------------|
| Branching graph validity | All scenes reachable, no dead ends, all routes resolve to celebration |
| Puzzle completion | Each puzzle type has achievable success conditions |
| Decoration distribution | Every scene rewards exactly one decoration, no duplicates |
| Narration cue existence | All referenced cues have corresponding audio files |
| Save serialization | Collection, helpers met, routes explored survive save/load |
| Replay diversity | At least 2 distinct routes through the graph with different content |
| Browser smoke test | Game loads, first scene playable, no console errors |

## 15. Completion Checklist

- [ ] 6 biomes with distinct paper-cut visual identity
- [ ] 18 scenes with branching route choices
- [ ] 6 helper animals with unique abilities integrated into puzzles
- [ ] 6 puzzle types (tap/drag/swipe/match/sort/pattern)
- [ ] 18 hat decoration items, route-dependent
- [ ] Full Greek narration (~30 cues) and complete parity for every additional language approved by D36
- [ ] Paper-cut parallax backgrounds per biome
- [ ] Coco character rig with full animation set
- [ ] Helper character rigs with ability animations
- [ ] Celebration scene with confetti and dancing characters
- [ ] Decoration inventory and hat customization UI
- [ ] Journey map scene showing route progress
- [ ] Save/restore collection and progress
- [ ] Tablet-first touch controls
- [ ] Keyboard support
- [ ] Reduced-motion support (carry forward from current)
- [ ] D22 frame-time budget met in the busiest puzzle/celebration scene
- [ ] Unit tests pass
- [ ] Browser smoke test passes

## 16. Risks

1. **Language scope**: Every additional narration language adds recording, subtitle, timing, QA, and maintenance cost. D36 must resolve scope from CO-R05 evidence before production.
3. **Branching complexity**: The 18-node scene graph must be carefully designed so every path feels complete. Use weighted randomization to avoid analysis paralysis.
4. **Paper-cut art consistency**: The charm of the current version is its hand-made feel. Digital assets must retain organic, imperfect quality.
5. **Replay motivation**: Collection system must be compelling enough to encourage replay without feeling like a grind.

## 17. Research Tasks

| ID | Question / task | Deliverable and decision criteria | Timebox | Deadline / blocks | Owner | Status |
|---|---|---|---:|---|---|---|
| CO-R01 | Evaluate Phaser spine/rigged sprite workflows vs. frame-by-frame paper-cut animation. | `.plans/research/CO-R01.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation. | 2 days | CO-M01 | Media implementer + owner approval | Open |
| CO-R02 | Prototype parallax paper-cut layering in Phaser camera. | `.plans/research/CO-R02.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation. | 2 days | CO-M01 | Tech lead | Open |
| CO-R03 | Prototype narration/subtitle timing and replay across approved/candidate cue sets. | `.plans/research/CO-R03.md` with existing Greek cue plus CO-R05 sample, timed subtitle data, replay/skip/scene-exit behavior, and missing-cue fallback. Decision criterion: queues cancel cleanly, subtitles remain synchronized, and language data does not alter scene rules. | 2 days | CO-M01; after CO-R05 sample | Tech lead | Open |
| CO-R04 | Test a branching-graph tool to visualize scene connections during authoring. | `.plans/research/CO-R04.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation. | 2 days | CO-M01 | Tech lead | Open |
| CO-R05 | Compare narration language scope and production methods for D36. | `.plans/research/CO-R05.md` with cue/cost matrix, legally usable sample per candidate, provider/voice terms, subtitle/timing impact, and QA budget. Decision criterion: evidence is complete enough for the owner to record D36 without an unstated production or licensing assumption. | 2 days | CO-M01 | Media implementer + owner approval | Open |
