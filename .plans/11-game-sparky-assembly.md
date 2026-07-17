# Sparky's Assembly Line — Implementation Brief

> **Plan set:** [Master plan](README.md) · [Architecture](01-architecture.md) · [Tooling and CI](02-tooling-and-ci.md) · [Quality](03-quality-and-testing.md) · [Media production](04-media-production.md) · [Decisions and risks](05-decisions-and-risks.md)

**Status:** Not started
**Roadmap:** [Phase 4](README.md) · workstreams `W4.7–W4.9`
**Research namespace:** `SA-R##`
**Milestone namespace:** `SA-M##`; unprefixed `M1`, `M2`, … below mean `SA-M01`, `SA-M02`, …
**Release requirement:** all [G1–G16 and C1–C8](03-quality-and-testing.md), owner decision D34, plus this brief's content gates
**Media sheet:** [Sparky's Assembly Line production requirements](04-media-production.md)

> Every research task below starts **Open** and follows the [research closure contract](05-decisions-and-risks.md#research-closure-contract). Its deliverable is `.plans/research/<ID>.md` plus the named prototype, measurement, or design artifact; the task wording is the minimum decision criterion. Assign an owner before moving it to **In research**.


## 1. Current-State Diagnosis

| Aspect | Current (robot-factory.html) | Problem |
|--------|------------------------------|---------|
| Engine | Vanilla JS, DOM-based, ~1768 lines single file | No Phaser, no modules, no type safety |
| Gameplay | Drag command blocks onto a belt, Sparky executes in sequence | Blocks are CSS rectangles, no physical sense of assembly |
| Concepts | 10 concepts (Sequencing, Loops, Conditionals, Patterns) via challenges | Challenges are block-count checks, not spatial puzzles |
| Visuals | CSS art with emoji icons, gradient backgrounds | Cute but not production quality |
| Sparky | CSS-animated robot with face expressions, jump/spin/dance | DOM transforms, no sprite animation |
| Progression | Linear concept unlock, star rating per challenge | Only 10 challenges, quickly exhausted |
| Audio | `sound.play()` stub with no real audio | Silent |
| Save | `robotFactory`: `{ currentConcept, savedModules[], unlocks{} }` | Unversioned; D34 decides validated import vs fresh start |
| Testing | None | No safety net |

**Files to archive to `classic/`:** `robot-factory.html`

## 2. Intended Game

**Sparky's Assembly Line** is a physical programming and automation puzzle game. The player snaps command modules onto a conveyor belt, runs Sparky through factory floors, inspects failures, and optimizes the program. Unlike the current version which uses abstract CSS blocks, the remake gives each command a physical form as a mechanical module on a real animated conveyor belt.

**Player fantasy:** A factory engineer who programs robots by assembling physical command modules, watching them execute in real time, and optimizing for efficiency.

## 3. Core Loop

1. **Read the order** — Each level presents a factory task (move boxes, sort items, weld parts, activate machines)
2. **Assemble commands** — Drag physical command modules from a parts bin onto the conveyor belt sequence
3. **Test run** — Activate the belt; Sparky executes each module in order; watch the factory floor respond
4. **Inspect failures** — If Sparky fails, the level highlights where the program went wrong with diagnostic overlays
5. **Optimize** — Refine the program for fewer steps, fewer modules, or faster execution
6. **Ship** — Successful programs unlock harder factory floors with new module types

## 4. Controls (Target: Tablet + Keyboard)

| Action | Tablet | Keyboard |
|--------|--------|----------|
| Drag module from bin | Touch-drag | Click + drag with mouse |
| Drop onto belt slot | Release touch | Release mouse |
| Remove module from belt | Tap module, tap trash | Select + Delete/Backspace |
| Reorder belt modules | Drag module to new slot | Drag with mouse |
| Run program | Tap "Run" button | Space |
| Pause execution | Tap "Pause" | Space (during run) |
| Step through | Tap "Step" | S |
| Reset | Tap "Reset" | R |
| Open instructions | "?" button | H |

## 5. Scenes

| Scene | Purpose |
|-------|---------|
| `BootScene` | Load assets, show Sparky logo |
| `TitleScene` | Title, Start/Continue, Factory select (visual map of factory floors) |
| `AssemblyScene` | Main gameplay: parts bin (left), conveyor belt (center), factory floor view (background), Sparky on floor |
| `DiagnosticScene` | Overlay showing execution trace, highlighted failure point |
| `CompletionScene` | Stars, optimization score, next floor unlock |
| `FreeBuildScene` | Sandbox: unlimited modules, no failure, creative automation |

## 6. Systems

#### Shared from `packages/`
- `core` — Phaser bootstrap, screen config
- `input` — Drag-and-drop module system (abstracted for reuse)
- `audio` — Factory ambient, machine sounds, Sparky voice
- `core` save module — Level progress, unlocked modules, optimization records
- `ui` — Button, panel, modal components
- `effects` — Sparks, particles, screen shake on failure

#### Game-Specific Systems

| System | Responsibility |
|--------|---------------|
| **PhysicalModuleSystem** | Each command is a physical module with connectors (input/output), weight, animation. Modules: Move (forward/back/left/right), Grab, Release, Turn, Repeat, IfSensor, IfColor, FunctionCall, Wait |
| **ConveyorBelt** | Animated belt with slots. Modules snap into slots. Belt runs left-to-right; Sparky reads each module in order |
| **SparkyController** | Animated factory robot that executes modules. States: idle, walking, grabbing, turning, holding, inspecting, success pose, failure pose |
| **FactoryFloor** | Tile-based 2D grid with conveyors, machines, boxes, sensors, goals. Each level defines floor layout and win condition |
| **ExecutionEngine** | Step-by-step program interpreter with pause/step/stop. Tracks execution trace for diagnostics |
| **DiagnosticSystem** | After failure, highlights the exact module and state that caused failure. Shows expected vs actual |
| **OptimizationScorer** | Scores based on: module count, execution time, physical space used. Star thresholds per level |
| **ModuleRegistry** | All module types with properties, animation keys, unlock conditions |

## 7. Content Target

| Element | Quantity | Notes |
|---------|----------|-------|
| Factory floors (levels) | 20 | 5 floors × 4 levels each, increasing complexity |
| Module types | 12 | Move, Turn, Grab, Release, Repeat (2/3/4/until), IfSensorLeft/Right/Ahead, IfColor, Call, Wait, SetSpeed |
| Floor themes | 5 | Workshop, Assembly Line, Sorting Facility, Paint Shop, Automation Hub |
| Diagnostic challenges | 3-4 per floor | Levels specifically designed to teach debugging |
| Free build sandbox | 1 | Unlimited mode with all modules unlocked |
| Optimization records | Per level | Track personal bests for module count and steps |

## 8. Art Deliverables

| Asset | Format | Quantity |
|-------|--------|----------|
| Sparky character | Spritesheet, 4 directions, idle/walk/grab/hold/success/fail | 1 sheet (~36 frames) |
| Command modules | Spritesheet, 12 types × connector states | 1 atlas (~24 frames) |
| Factory floor tiles | Tilemap tileset | 20-30 tiles |
| Conveyor belt animation | Spritesheet (animated belt) | 1 sheet (~8 frames) |
| Factory props (boxes, machines, sensors, goals) | Sprites | 15-20 |
| Floor backgrounds | PNG | 5 (one per theme) |
| UI — parts bin, belt slots, score display | PNG + 9-patch | 10-15 |
| Particles — sparks, smoke, steam | PNG | 5-6 |
| Diagnostic overlay elements | PNG | 5 (arrows, highlights, x-marks) |

## 9. Animation Deliverables

- Sparky: smooth walk cycle on floor, grab animation with arm extension, hold pose, success celebration, failure droop
- Modules: snap into belt slot with physical bounce, connector lights
- Belt: continuous scrolling animation
- Factory machines: animated conveyor rollers, spinning sensors, pressing rams
- Sparks: when module connects, when Sparky completes action
- Execution: tile-highlighting beneath Sparky during step

## 10. Audio Deliverables

| Category | Tracks / Sounds |
|----------|----------------|
| Music — per floor theme | 5 tracks, mechanical/chiptune blend |
| Ambient — factory hum | Continuous with machine fluctuations |
| Sparky movement | Footstep clanks per tile |
| Module snap | Satisfying mechanical click |
| Belt running | Low rumble |
| Success | Machine whistle + chime |
| Failure | Steam vent + buzzer |
| Error highlight | Diagnostic ping |
| Grab/Release | Pneumatic hiss |
| UI | Button clicks, module select, program run/stop |

## 11. Data Models

```typescript
// Module definition
interface ModuleDef {
  id: string; name: string;
  type: 'move' | 'action' | 'control' | 'function';
  spriteKey: string;
  description: string;
  connectors: { input: 'any' | 'move' | 'action'; output: 'any' | 'move' | 'action' };
  unlockFloor: number;
  weight: number; // visual size/physicality
}

// Factory floor level
interface FactoryFloor {
  id: number; name: string; floorTheme: string;
  width: number; height: number;
  tiles: number[][]; // 0=empty, 1=floor, 2=conveyor, 3=wall, 4=goal, 5=machine
  spawns: { x: number; y: number; dir: string };
  goals: { type: string; x: number; y: number; condition: string }[];
  machines?: { x: number; y: number; type: string; param?: any }[];
  availableModules: string[]; // module IDs available
  maxModules: number;
  optimalModules: number;
  intro: string;
  diagnosticHints?: string[];
}

// Execution trace
interface ExecutionStep {
  moduleIndex: number;
  moduleId: string;
  stateBefore: { x: number; y: number; dir: string; held?: string };
  action: string;
  result: 'success' | 'fail';
  stateAfter: { x: number; y: number; dir: string; held?: string };
  errorMessage?: string;
}

// Save data
interface SaveData {
  version: number;
  levels: Record<number, { stars: number; bestModuleCount: number; completed: boolean }>;
  unlockedModules: string[];
  currentFloor: number;
}
```

**Legacy migration gate (D34):** collect real `robotFactory` fixtures, define a field-by-field map into the new puzzle/module model, list dropped fields with rationale, and prototype idempotent import. If the owner selects a fresh start, keep the old key untouched and test that the new namespace ignores it safely. Corrupt/unknown data must fall back without losing the backup.

## 12. Shared Packages Used

- `packages/core` — Game bootstrap, scale config
- `packages/input` — Drag-and-drop abstraction for modules
- `packages/audio` — Factory ambient bus, effects pool
- `packages/ui` — Button, panel, modal, slot components
- `packages/effects` — Particle spark configs, screen shake
- `packages/tools` — Level data validation

## 13. Milestone Slices

| Milestone | Scope | Acceptance |
|-----------|-------|------------|
| **M1: Core assembly** | Phaser project, AssemblyScene with parts bin, conveyor belt slots, drag-drop modules | Can drag modules onto belt, see them in sequence |
| **M2: Sparky execution** | Sparky character on factory floor, reads belt modules one by one, walks/turns on grid | Module sequence drives Sparky movement |
| **M3: 5 workshop levels** | First floor theme, 4 workshop levels teaching Move/Turn/Grab/Release | Playable first floor with win conditions |
| **M4: Full module set** | All 12 module types implemented, Repeat/IfSensor/Call working | All mechanics exist |
| **M5: Diagnostics** | Execution trace, failure highlight, error messages | Failed programs show why |
| **M6: 20 levels + free build** | All 5 floors complete, sandbox mode | Full content target |
| **M7: Art target** | First floor at final quality with all sprites, animations, particles | Visual quality pass |
| **M8: Audio + ship** | All sounds, music, polish, tests, deploy | Complete game shipped |

## 14. Tests

| Test | What it checks |
|------|---------------|
| Execution engine correctness | Known programs produce expected Sparky state sequences |
| Module registry completeness | All module types referenced in levels exist in registry |
| Level data validity | All levels have valid tile maps, spawns, goals, available modules |
| Save serialization and D34 policy | New save round-trip plus fixture-tested legacy import or verified fresh-start behavior, as approved |
| Diagnostic accuracy | Error conditions produce correct diagnostic messages |
| Optimization scoring | Scores computed correctly for known programs |
| Browser smoke test | Game loads and first level playable |

## 15. Completion Checklist

- [ ] 20 factory floor levels across 5 themes
- [ ] 12 module types with distinct physical appearance
- [ ] Sparky with walk/grab/hold/success/fail animations
- [ ] Conveyor belt with visual module snap
- [ ] Execution engine with step/pause/stop
- [ ] Diagnostic system showing failure location and reason
- [ ] Free build sandbox
- [ ] Optimization scores per level
- [ ] Save/restore progress
- [ ] All original sprites and tiles
- [ ] All sound effects and music
- [ ] Tablet controls work reliably
- [ ] D22 frame-time budget met during maximum-speed execution
- [ ] Unit tests pass
- [ ] Browser smoke test passes

## 16. Risks

1. **Physical metaphor clarity**: Players may not understand conveyor belt = program sequence. Include clear tutorial overlay.
2. **Execution performance**: Sparky walking frame-by-frame could feel slow. Add speed slider for execution.
3. **Module connector system**: If module physicality adds complexity without gameplay value, simplify to slot-only.
4. **Debugging fun**: Failed programs need to be educational, not frustrating. Tune diagnostic messages carefully.

## 17. Research Tasks

| ID | Question / task | Deliverable and decision criteria | Timebox | Deadline / blocks | Owner | Status |
|---|---|---|---:|---|---|---|
| SA-R01 | Evaluate Phaser drag-and-drop vs. custom drag system for grid-snapping modules. | `.plans/research/SA-R01.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation. | 2 days | SA-M01 | Tech lead | Open |
| SA-R02 | Prototype conveyor belt scrolling animation performance on tablet. | `.plans/research/SA-R02.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation. | 2 days | SA-M01 | Media implementer + owner approval | Open |
| SA-R03 | Research clear, actionable debugging feedback from strong visual programming games. | `.plans/research/SA-R03.md` plus the named prototype/measurement. Decision criterion: evidence answers the task, compares viable options, and records the adopted recommendation. | 2 days | SA-M01 | Tech lead | Open |
