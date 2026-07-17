# Valley of Echoes — Implementation Brief

> **Plan set:** [Master plan](README.md) · [Architecture](01-architecture.md) · [Tooling and CI](02-tooling-and-ci.md) · [Quality](03-quality-and-testing.md) · [Media production](04-media-production.md) · [Decisions and risks](05-decisions-and-risks.md)

**Status:** Not started
**Roadmap:** [Phase 4](README.md) · workstreams `W4.4–W4.6`
**Research namespace:** `VE-R##`
**Milestone namespace:** `VE-M##`; unprefixed `M1`, `M2`, … below mean `VE-M01`, `VE-M02`, …
**Release requirement:** all [G1–G16 and C1–C8](03-quality-and-testing.md) plus this brief's content gates
**Media sheet:** [Valley of Echoes production requirements](04-media-production.md)

> Every research task below starts **Open** and follows the [research closure contract](05-decisions-and-risks.md#research-closure-contract). Its deliverable is `.plans/research/<ID>.md` plus the named prototype, measurement, or design artifact; the task wording is the minimum decision criterion. Assign an owner before moving it to **In research**.


## 1. Current-State Diagnosis

| Aspect | Current (valley-explorer.html) | Problem |
|--------|-------------------------------|---------|
| Engine | Vanilla JS, Canvas 2D, ~2900 lines single file | No Phaser, no modules, no type safety |
| World | Procedural seed-based noise, 5 biomes (valley, north/snow, south/desert, east/seaside, west/mountain) | All entities created upfront per biome, no streaming, no persistence |
| Interaction | Click/drag to pan world, tap entities to "push" them | Shallow: no meaningful gameplay loop, just wander + push animals |
| Animals | 30+ types with roaming AI, push physics, happiness stat | Details only visible as colored shapes with emoji labels |
| Progression | None — infinite procedural world with no goals | No discovery journal, no landmarks, no puzzles, no completion |
| Audio | None | No music, no ambient sound, no animal calls |
| Save | None | No progress persistence across sessions |
| Performance | Per-frame full canvas redraw of all entities, no spatial indexing | Degrades with many entities, no culling |
| Tests | None | No safety net |
| Visuals | Canvas primitives with emoji for entities | Functional but not final-quality |

**Files to archive to `classic/`:** `valley-explorer.html`

## 2. Intended Game

**Valley of Echoes** is a living-world exploration game. The player explores a continuous hand-crafted world of connected biomes, discovers landmarks, studies creatures, solves environmental mysteries, and restores major locations. Unlike the current version which is an infinite procedural sandbox with no purpose, the remake gives the world authored content, meaningful traversal skills, a discovery journal, and ecosystem interactions that respond to the player's actions.

**Player fantasy:** An intrepid naturalist exploring a vibrant, connected wilderness where every ridge hides a discovery and every creature has a behavior to learn.

## 3. Core Loop

1. **Explore** — Pan and traverse a connected world of biomes (forest, meadow, riverlands, mountains, coast, caves, ruins)
2. **Discover** — Find landmarks, creatures, rare plants, environmental puzzles, and hidden Echo locations
3. **Document** — Journal entries track discoveries with sketches and observations
4. **Restore** — Solve environmental puzzles (clear blockages, redirect water, activate ancient mechanisms) to heal areas
5. **Unlock** — New traversal abilities (run, glide, swim, climb, dash) grant access to harder-to-reach areas
6. **Return** — Areas change with restoration; new creatures appear; completion percentage advances

## 4. Controls (Target: Tablet + Keyboard)

| Action | Tablet | Keyboard |
|--------|--------|----------|
| Pan world | Drag one finger | WASD / Arrow keys |
| Interact / activate | Tap | Space / Enter |
| Character move | Drag to move character OR tap destination | WASD relative to character |
| Open journal | Button on UI | J |
| Zoom | Pinch | Scroll wheel |
| Use ability | Double-tap ability icon | Number keys 1-4 |

Touch must account for finger occlusion: interaction targets minimum 48x48px, with tap-priority zone above the finger contact point.

## 5. Scenes

| Scene | Purpose |
|-------|---------|
| `BootScene` | Load minimal assets, show logo |
| `TitleScene` | Title, story setup text, Start/Continue |
| `WorldScene` | Main exploration scene orchestrating connected authored zones, bounded camera, and deterministic transitions |
| `JournalScene` | Overlay showing discovered creatures, landmarks, restoration progress |
| `PuzzleScene` | Context-specific environmental puzzle (e.g., align stones, redirect水流) |
| `CompletionScene` | Show restoration completion, credits |

## 6. Systems

#### Shared from `packages/`
- `core` — Phaser game bootstrap, screen scaling, fullscreen
- `input` — Action mapping for pan, interact, zoom
- `audio` — Ambient buses (wind, water, creature calls), music, effects
- `core` save module — Discovery journal persistence, restoration state
- `ui` — Buttons, panels, transition overlays
- `effects` — Particles (leaves, dust, water splashes), camera shake, fade transitions

#### Game-Specific Systems

| System | Responsibility |
|--------|---------------|
| **WorldManager** | Manages connected authored zones (not procedural). Zones defined as tilemaps or polygon regions with spawn points, camera bounds, and transition links |
| **CameraController** | Smooth pan, pinch-zoom, zone-bounded camera. Follow player character when moving |
| **DiscoveryJournal** | Tracks: found landmarks, observed creatures (first sight + behavior notes), completed restoration events. Each has sketch, name, description |
| **CreatureDirector** | Spawn conditions, roaming behaviors, reaction to player proximity. Species have habitat, activity cycle, fear distance, unique animations |
| **TraversalController** | Player character movement with abilities unlocked via restoration milestones: run → glide → swim → climb → dash |
| **RestorationSystem** | Global state per area: blocked/restored/healed. Triggers environment changes, new creature spawns, new journal entries |
| **EchoSystem** | Activate Echo shrines to reveal hidden history — short animated sequences with narration |
| **WeatherSystem** | Visual ambient effects per biome: falling leaves, fog, rain, snow, fireflies |

## 7. Content Target

| Element | Quantity | Notes |
|---------|----------|-------|
| Biomes / zones | 6-8 | Forest, Meadow, Riverlands, Mountains, Coast, Caves, Ruins, Summit |
| Landmarks per zone | 3-5 | Distinct visual features with journal entries |
| Creature species | 20-25 | With unique appearance, animation, and behavior |
| Restoration puzzles | 8-10 | Environmental interaction puzzles |
| Echo shrines | 5-6 | Story sequences revealing valley history |
| Traversal abilities | 4 | Run (default), Glide, Swim, Climb, Dash — unlocked progressively |
| Journal entries | 60-80 | Text, sketches per landmark/creature/event |

## 8. Art Deliverables

| Asset | Format | Quantity |
|-------|--------|----------|
| Tile sets per biome | Sprite atlas (PNG) | 8 sets |
| Player explorer character | Spritesheet, 4 directions, idle/walk/run/glide/climb/swim/dash | 1 sheet (~48 frames) |
| Creature sprites | Spritesheets, 4 directions per creature | 20-25 sheets |
| Landmark illustrations | Full-screen PNG | 20-25 |
| Environment props (trees, rocks, flowers, etc.) | Sprite atlas | 30-40 tiles |
| UI — journal, compass, ability bar | PNG + 9-patch | 10-15 elements |
| Particle textures | PNG | 5-10 (leaf, dust, sparkle, water drop, firefly) |
| Title/end screens | Full-screen illustrated PNG | 2 |
| Echo shrine animations | Spritesheet | 5-6 sequences |
| Weather overlays | Semi-transparent PNG tiles | 5-6 |

## 9. Animation Deliverables

- Player: smooth root motion for walk/run cycles, anticipation before dash, arc during glide
- Creatures: 2-4 frame idle + walk for each species; unique reaction when first discovered
- Environment: swaying trees/grass, flowing water, falling leaves, ambient particles
- Journal: page-turn transition
- Echo sequences: parallax reveal with light rays
- Restoration events: terrain morphing animation, particle burst

## 10. Audio Deliverables

| Category | Tracks / Sounds |
|----------|----------------|
| Music — ambient per biome | 8 tracks, soft orchestral/nature blend |
| Ambient — per biome | Wind, water, insects, birds (layered) |
| Player actions | Footsteps (per terrain), glide whoosh, swim splash, climb grip, dash whoosh |
| Creature calls | 20-25 short animal sounds |
| UI | Journal page turn, ability select, landmark ping, Echo chime |
| Weather | Rain, wind gust, thunder (distant) |
| Restoration | Mechanism sounds, water flow change, completion chord |
| Voice / narration | Echo shrine narration (short atmospheric phrases) |

## 11. Data Models

```typescript
// Zone definition
interface Zone {
  id: string; name: string;
  tilemapKey: string;        // Phaser tilemap key
  cameraBounds: { x: number; y: number; w: number; h: number };
  spawns: CreatureSpawn[];
  landmarks: Landmark[];
  puzzles: PuzzleDef[];
  echoes: EchoDef[];
  connections: { toZone: string; atPoint: { x: number; y: number } }[];
  weatherPreset: string;
  ambientAudioKey: string;
}

// Creature species
interface CreatureSpecies {
  id: string; name: string;
  habitat: string[];
  spritesheetKey: string;
  anims: { idle: string; walk: string; discover: string };
  fearDistance: number;
  activityHours: [number, number]; // 0-24
  journalEntry: string;
}

// Discovery journal entry
interface JournalEntry {
  type: 'landmark' | 'creature' | 'event';
  refId: string;
  discovered: boolean;
  timestamp?: number;
  sketchComplete: boolean;
  notes: string;
}

// Restoration state
interface RestorationState {
  zoneId: string;
  puzzleStates: Record<string, 'blocked' | 'solved' | 'restored'>;
  echoesActivated: string[];
  traversalAbilitiesUnlocked: string[];
}

// Save data
interface SaveData {
  version: number;
  entries: JournalEntry[];
  restoration: RestorationState[];
  playerPosition: { zoneId: string; x: number; y: number };
  totalDiscoveryPercent: number;
}
```

## 12. Shared Packages Used

- `packages/core` — Game bootstrap, screen config, fullscreen
- `packages/input` — Action mapping (pan, interact, ability), touch re-centering
- `packages/audio` — Ambient buses, music volume, effects pool
- `packages/ui` — Button component, panel, journal page component
- `packages/effects` — Particle emitter configs, camera effects, scene transitions
- `packages/tools` — Level validation for zone definitions

## 13. Milestone Slices

| Milestone | Scope | Acceptance |
|-----------|-------|------------|
| **M1: Core exploration** | Phaser project structure, WorldScene with 1 tilemap zone, player character with pan-to-move, camera follow, basic creatures with roam AI | Player can explore one zone, see creatures moving |
| **M2: Journal + discovery** | Landmarks with tap-to-discover, journal overlay, first creature observations tracked | Player can discover landmarks and journal them |
| **M3: Restoration puzzles** | 1 puzzle type working, zone state changes on solve, environment visual update | Player can solve a puzzle and see zone change |
| **M4: Full traversal** | All 4 traversal abilities implemented, zone connections unlockable | Player can reach all zones |
| **M5: Art target** | 1 zone fully dressed with tiles, creatures animated, ambient particles | First zone at final visual quality |
| **M6: All content** | All 6–8 zones, 20–25 creatures, 8–10 restoration puzzles, 5–6 shrines, and 60–80 journal entries | Full game playable |
| **M7: Audio + polish** | All music, ambient, effects, UI audio added; shippable | Complete audio pass |
| **M8: Testing + ship** | Unit tests, browser smoke test, validation, deploy | Published game without errors |

## 14. Tests

| Test | What it checks |
|------|---------------|
| Zone data validity | All zone connections resolve, spawns reference valid species, puzzles reference valid mechanics |
| Creature spawn conditions | Habitat matching, activity hours, no overlap errors |
| Journal serialization | Save → load → verify all entries restored |
| Restoration state persistence | Puzzle state survives reload, zone transitions |
| Traversal ability unlocking | Abilities unlock in correct order, prerequisites enforced |
| Browser smoke test | Game loads without console errors, title scene visible, tap to interact |

## 15. Completion Checklist

- [ ] 6-8 authored zones with transitions, not procedural generation
- [ ] Player character with run plus 4 unlockable traversal abilities: glide, swim, climb, dash
- [ ] 20-25 creature species with unique appearance and behavior
- [ ] 8-10 restoration puzzles
- [ ] 5-6 Echo shrine sequences
- [ ] Discovery journal with 60-80 entries
- [ ] Original tiles, sprites, landmark illustrations
- [ ] Complete ambient audio per biome
- [ ] Creature calls, player action sounds, UI sounds
- [ ] Music tracks per biome
- [ ] Save/restore progress
- [ ] Tablet controls work without keyboard
- [ ] Keyboard support for testing
- [ ] D22 frame-time and memory budgets met in the busiest authored zone
- [ ] Unit tests pass
- [ ] Browser smoke test passes

## 16. Risks

1. **Scope creep**: Exploration games can expand indefinitely. Enforce the content target counts in 1.7 before adding more zones.
2. **Performance**: Many creatures + particles + weather could drop frames. Profile early with target tablet.
3. **Authoring burden**: 6-8 tilemap zones require significant art production. Consider procedural assistance for terrain with hand-authored detail overlays.
4. **Discovery satisfaction**: Hidden content must be telegraphed enough to find. Test blind with players before finalizing.
5. **Save migration**: If schema changes during development, version save format and test migration.

## 17. Research Tasks

| ID | Question / task | Deliverable and decision criteria | Timebox | Deadline / blocks | Owner | Status |
|---|---|---|---:|---|---|---|
| VE-R01 | Investigate Phaser tilemap workflow with multiple tile sets and zone transitions (seamless vs. loaded). | `.plans/research/VE-R01.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation. | 2 days | VE-M01 | Tech lead | Open |
| VE-R02 | Research creature AI patterns — simple state machines for roam/flee/approach. | `.plans/research/VE-R02.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation. | 2 days | VE-M01 | Tech lead | Open |
| VE-R03 | Evaluate camera zoom performance on target tablet with large tilemaps. | `.plans/research/VE-R03.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation. | 2 days | VE-M01 | Tech lead | Open |
| VE-R04 | Prototype weather particle system to confirm particle count budget. | `.plans/research/VE-R04.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation. | 2 days | VE-M01 | Tech lead | Open |
