# Bit's Grand Adventure — Implementation Brief

> **Plan set:** [Master plan](README.md) · [Architecture](01-architecture.md) · [Tooling and CI](02-tooling-and-ci.md) · [Quality](03-quality-and-testing.md) · [Media production](04-media-production.md) · [Decisions and risks](05-decisions-and-risks.md)

**Status:** Not started
**Roadmap:** [Phase 4](README.md) · workstreams `W4.10–W4.13`
**Research namespace:** `BA-R##`
**Milestone namespace:** `BA-M##`; unprefixed `M1`, `M2`, … below mean `BA-M01`, `BA-M02`, …
**Release requirement:** all [G1–G16 and C1–C8](03-quality-and-testing.md), owner decision D35, plus this brief's content gates
**Media sheet:** [Bit's Grand Adventure production requirements](04-media-production.md)

> Every research task below starts **Open** and follows the [research closure contract](05-decisions-and-risks.md#research-closure-contract). Its deliverable is `.plans/research/<ID>.md` plus the named prototype, measurement, or design artifact; the task wording is the minimum decision criterion. Assign an owner before moving it to **In research**.


## 1. Current-State Diagnosis

| Aspect | Current (code-adventure.html) | Problem |
|--------|-------------------------------|---------|
| Engine | Vanilla JS, Canvas 2D, ~2441 lines single file | No Phaser, no modules, no type safety |
| Gameplay | Grid-based robot programming: tap commands to sequence, run to execute | 20 levels across 4 worlds, commands limited to move/turn/repeat/jump/if |
| Visuals | Colored rectangles on dark grid with emoji for Bit and star goal | Functional but not engaging |
| Commands | Forward, Left, Right, Repeat2/3/4, IfWall, IfGoal, Jump, Activate | No functions, no sensors beyond wall/goal |
| Level size | Max 8×8 grid | Small grids limit puzzle complexity |
| Progression | Linear level completion, star rating | No world map, no story context |
| Audio | Procedural musical tones | Minimal |
| Save | `codeAdventure` progress/settings + `codeAdventurePlayed` flag | Unversioned; D35 decides validated import vs fresh start |
| Tests | None | No safety net |

**Files to archive to `classic/`:** `code-adventure.html`

## 2. Intended Game

**Bit's Grand Adventure** is a programming puzzle campaign. The player writes programs for Bit the robot, runs them step by step, understands exactly where they fail, and repairs a world made of code. Unlike the current version, the remake introduces functions, sensors, upgrades, boss puzzles, a built-in level editor, and a narrative context where each world is a damaged region of a digital realm that Bit must repair.

**Player fantasy:** A coder who rescues a digital world by writing programs that fix broken systems, defeat corrupted programs (bosses), and restore order.

## 3. Core Loop

1. **Read the diagnostic** — Each level shows a broken system in the digital world (blocked pipes, corrupted data, malfunctioning transports)
2. **Write the program** — Assemble commands from a palette into the execution sequence
3. **Run and observe** — Bit executes step by step; the world highlights each action
4. **Debug failures** — When Bit hits an error, the problematic command and state are clearly shown
5. **Optimize** — Fewer commands, fewer lines, reuse patterns = higher score
6. **Repair the world** — Successful programs fix the zone and unlock the next area

## 4. Controls (Target: Tablet + Keyboard)

| Action | Tablet | Keyboard |
|--------|--------|----------|
| Add command to program | Tap command button | Arrow keys / 1-9 shortcuts |
| Remove command | Tap remove / swipe on command in sequence | Backspace / Delete |
| Reorder commands | Drag in sequence list | Drag |
| Run program | Tap "Run" button | Space |
| Step through | Tap "Step" | S |
| Pause running | Tap "Pause" | Space (during run) |
| Reset | Tap "Reset" | R |
| Toggle speed | Speed slider | +/- |
| Show level map | Button | L |
| Open editor | Button | E |

## 5. Scenes

| Scene | Purpose |
|-------|---------|
| `BootScene` | Load assets, show Bit logo animation |
| `TitleScene` | Title, story intro cinematic (text + image), Start/Continue |
| `WorldMapScene` | Overworld showing 5 worlds as connected nodes with level markers, completion status |
| `PuzzleScene` | Main gameplay: grid with tiles, Bit on grid, command palette, sequence list, run controls |
| `BossScene` | Special puzzle with animated boss enemy that reacts to Bit's program |
| `DebugOverlay` | Over modal: execution trace, highlighted failure, expected vs actual state |
| `LevelEditorScene` | Tile palette, grid editing, save/share |
| `CompletionScene` | Stars per level, world repair animation, next world unlock |

## 6. Systems

#### Shared from `packages/`
- `core` — Phaser game bootstrap, screen config, responsive grid scaling
- `input` — Command palette action mapping (tap/key), drag-reorder
- `audio` — Chiptune playback, effect sounds
- `core` save module — Level progress, stars, unlock state
- `ui` — Button, panel, modal, scrollable command palette
- `effects` — Particles (pixel explosions, trails), camera shake

#### Game-Specific Systems

| System | Responsibility |
|--------|---------------|
| **GridEngine** | Tile-based grid with multitype tiles (floor, wall, goal, water, ice, conveyor, button, gate, teleporter, corrupt-data). Handles collision and tile effects |
| **BitController** | Robot character: states idle, walking, turning, jumping, activating, holding, bumping. Animated sprite per state |
| **ProgramInterpreter** | Sequential and structured command execution. Supports: move, turn, jump, repeat, if (wall/goal/sensor), call function, define function, wait, loop-until |
| **SensorSystem** | Bit can detect tile properties ahead: wall, goal, water, color, button, data-type |
| **FunctionSystem** | Players can define and name reusable command sequences. Functions appear as single blocks. Supports 2 user-defined functions per level |
| **WorldMap** | Connected node graph of levels per world. Unlock gates require completion + star thresholds |
| **BossAI** | Boss entities on grid that react to Bit movement, change state, have weak points |
| **DiagnosticSystem** | After failed run: highlight command, show expected vs actual state, suggest fix strategy |
| **LevelEditor** | In-game grid editor: place tiles, set start/goal, set available commands, test, save to JSON |

## 7. Content Target

| Element | Quantity | Notes |
|---------|----------|-------|
| Levels | 30 | 6 per world × 5 worlds |
| Worlds / themes | 5 | Tutorial Plains, Pipe Maze, Data Forest, Factory Core, The Hub |
| Command types | 14 | Forward, Left, Right, Jump, RepeatN, RepeatUntil, IfWall, IfGoal, IfColor, IfWater, Call, DefineFunc, Wait, Loop |
| Boss puzzles | 5 | One per world final level |
| User functions | Up to 2 per level | Named and reusable command sequences |
| Level editor | 1 | Build, test, save custom levels |
| World map | 5 connected nodes | Visual progression with unlock gates |

## 8. Art Deliverables

| Asset | Format | Quantity |
|-------|--------|----------|
| Bit robot spritesheet | Pixel art sheet, 4 directions, idle/walk/turn/jump/activate/hit/success/celebrate | 1 sheet (~48 frames) |
| Tile sets per world | Tilemap tilesets, 5 palettes | 5 sets (16-24 tiles each) |
| Boss sprites | Animated entities, 5 types | 5 spritesheets |
| World map backgrounds | Full-screen PNG | 5 |
| UI — command buttons, sequence slots, run bar | PNG + 9-patch | 20-25 elements |
| Particles — pixel dust, sparkles, error flash, confetti | PNG | 8-10 |
| Level editor tile palette | Icons for each tile type | 12-15 |

## 9. Animation Deliverables

- Bit: smooth pixel movement between tiles; turn animation (90° rotation); jump arc; hit stop on collision; success dance
- Tiles: water ripple, conveyor scroll, gate open, teleporter shimmer, corrupt-data flicker
- Bosses: entrance animation, attack telegraph, hit reaction, defeat explosion
- Commands: flash when executing; green pulse on success, red shake on failure
- World map: node unlock animation, path connection drawing

## 10. Audio Deliverables

| Category | Tracks / Sounds |
|----------|----------------|
| Music — per world | 5 chiptune tracks |
| Music — boss | 5 boss-specific themes |
| Bit movement | Step sounds per tile type |
| Bit jump | Boing |
| Bit bump/hit | Impact sound |
| Command execute | Tick per step |
| Program complete | Rising arpeggio |
| Failure | Descending tone + buzz |
| Tile interactions | Water splash, gate creak, teleporter warp, conveyor rumble |
| UI | Button click, command add/remove, level select |
| World map | Node highlight, unlock chime |

## 11. Data Models

```typescript
// Tile types
enum TileType {
  Floor = 0, Wall = 1, Goal = 2, Water = 3,
  Ice = 4, ConveyorN = 5, ConveyorS = 6, ConveyorE = 7, ConveyorW = 8,
  Button = 9, Gate = 10, Teleporter = 11, CorruptData = 12,
  SensorPlate = 13
}

// Level definition
interface LevelDef {
  id: number; name: string; world: number;
  width: number; height: number;
  tiles: TileType[][];
  start: { x: number; y: number; dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' };
  goals: { x: number; y: number }[];
  maxCommands: number;
  optimalCommands: number;
  availableCommands: string[];
  maxFunctions: number; // 0-2
  teleporterPairs?: { id: string; points: { x: number; y: number }[] }[];
  boss?: BossDef;
  intro: string;
  hint?: string;
}

// Boss definition
interface BossDef {
  spriteKey: string;
  health: number;
  weakPointTile: TileType;
  patterns: BossPattern[];
  dialogue: { before: string; onHit: string; onDefeat: string };
}

// Program structure
interface Program {
  commands: string[];
  functions: { name: string; commands: string[] }[];
}

// Execution trace entry
interface TraceEntry {
  commandIndex: number;
  commandId: string;
  stateBefore: { x: number; y: number; dir: string };
  action: string;
  result: 'success' | 'fail' | 'call' | 'return';
  stateAfter: { x: number; y: number; dir: string };
  errorMessage?: string;
}

// Save data
interface SaveData {
  version: number;
  levels: Record<number, {
    stars: number;
    bestCommands: number;
    completed: boolean;
    program?: Program; // saved best program
  }>;
  worldsUnlocked: number;
  customLevels?: LevelDef[];
}
```

**Legacy migration gate (D35):** collect both legacy keys as fixtures, define old-level-to-new-level mapping, star/settings/first-play handling, dropped fields, and an idempotent import prototype. If a fresh start is approved, preserve and safely ignore old keys. Corrupt/newer data must not overwrite its backup.

## 12. Shared Packages Used

- `packages/core` — Bootstrap, responsive grid scaling
- `packages/input` — Action mapping for commands, keyboard shortcuts
- `packages/audio` — Chiptune player, effect pools
- `packages/ui` — Command palette component, sequence list, button
- `packages/effects` — Pixel particle configs, camera effects
- `packages/tools` — Level validator for tile maps

## 13. Milestone Slices

| Milestone | Scope | Acceptance |
|-----------|-------|------------|
| **M1: Core grid + Bit** | Phaser project, PuzzleScene with grid rendering, Bit character on grid, basic move/turn/run | Can place commands, run Bit on grid |
| **M2: World 1 — Tutorial** | 6 tutorial levels, forward/left/right/jump commands, goal reaching, star rating | First world complete and playable |
| **M3: Full command set** | All 14 command types, repeat/if/call/function working | All mechanics exist |
| **M4: Full content** | 30 levels across 5 worlds, all boss puzzles | Full campaign playable |
| **M5: Diagnostics** | Execution trace, failure highlight, error suggestions | Debugging feedback works |
| **M6: World map + editor** | World map scene, level editor with save/load | Complete tooling |
| **M7: Art target** | All pixel art, animations, particles for entire game | Visual quality complete |
| **M8: Audio + ship** | All chiptune, effects, polish, tests, deploy | Complete game shipped |

## 14. Tests

| Test | What it checks |
|------|---------------|
| Program interpreter | Known programs produce correct movement sequences |
| Level data validity | All levels have valid tile maps, reachable goals, correct start |
| Save serialization and D35 policy | New progress/program round-trip plus fixture-tested legacy import or verified fresh-start behavior, as approved |
| Function execution | User-defined functions execute correctly with proper scoping |
| Boss mechanics | Boss patterns trigger correctly, weak point detection works |
| Level editor round-trip | Edited level saved and re-loaded matches original |
| Browser smoke test | Game loads and first level playable without errors |

## 15. Completion Checklist

- [ ] 30 levels across 5 thematic worlds
- [ ] 14 command types including functions and sensors
- [ ] Program interpreter with step/pause/stop
- [ ] 5 boss puzzles with unique mechanics
- [ ] Execution trace with failure diagnostics
- [ ] World map with unlock gates
- [ ] In-game level editor with save/load
- [ ] Pixel art tiles per world
- [ ] Bit character with full animation set
- [ ] Complete chiptune soundtrack (5 world + 5 boss)
- [ ] All sound effects
- [ ] Save/restore program and progress
- [ ] Tablet controls
- [ ] Keyboard shortcuts
- [ ] D22 frame-time budget met on the maximum 12×12 grid
- [ ] Unit tests pass
- [ ] Browser smoke test passes

## 16. Risks

1. **Function abstraction complexity**: Defining functions is a sharp conceptual jump. Gate functions behind world 3, provide a visual template, and validate comprehension through blind playtests.
2. **Level editor adoption**: If the editor is complex, players won't use it. Keep it simple: place tiles, set start/goal, test immediately.
3. **Boss puzzle balance**: Bosses must be challenging but not frustrating. Multiple attempts should not require replaying the entire level.
4. **Grid size vs. readability**: Larger grids (12×12) may be hard to read on tablet. Ensure UI scales appropriately.

## 17. Research Tasks

| ID | Question / task | Deliverable and decision criteria | Timebox | Deadline / blocks | Owner | Status |
|---|---|---|---:|---|---|---|
| BA-R01 | Evaluate Phaser grid rendering with tilemap layers for fast redraw. | `.plans/research/BA-R01.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation. | 2 days | BA-M01 | Tech lead | Open |
| BA-R02 | Prototype function definition UI (visual block nesting). | `.plans/research/BA-R02.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation. | 2 days | BA-M01 | Tech lead | Open |
| BA-R03 | Test boss AI patterns for fairness on first blind attempt. | `.plans/research/BA-R03.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation. | 2 days | BA-M01 | Tech lead | Open |
| BA-R04 | Research accessibility of pixel art on small tablet screens. | `.plans/research/BA-R04.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation. | 2 days | BA-M01 | Media implementer + owner approval | Open |
