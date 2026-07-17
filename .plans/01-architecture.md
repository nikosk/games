# Shared Architecture

> **Plan set:** [Master plan](README.md) · [Architecture](01-architecture.md) · [Tooling and CI](02-tooling-and-ci.md) · [Quality](03-quality-and-testing.md) · [Media production](04-media-production.md) · [Decisions and risks](05-decisions-and-risks.md)


> **Purpose:** Define the target architecture for the full repository rewrite: 11 games on Phaser 3, strict TypeScript, Vite, npm workspaces, static GitHub Pages output. This document covers package boundaries, shared APIs, game contract, build assembly, migration strategy, save compatibility, asset loading conventions, and unresolved technical decisions as research spikes.
>
> **Status:** Planning stage. No implementation has started.
>
> **Context sources scanned:**
> - AGENTS.md (repository-wide instructions)
> - Current catalog, 8 standalone game pages, and 3 directory-based game entries
> - thegame/ (Critter Tactics) — highest-fidelity Phaser+Vite example
> - little-chef-kitchen/ — Phaser-from-CDN example with data architecture
> - crocodile-game/ — independent project with integrity tests

---

## 1. Target Repository Layout

```
./
├── AGENTS.md                       # Root instructions (exists, may need update)
├── package.json                    # [NEW] Root workspace package
├── tsconfig.json                   # [NEW] Base TypeScript config
├── tsconfig.base.json              # [NEW] Strict base for all packages
├── tsconfig.node.json              # [NEW] Node-specific TS config (tools, scripts)
├── .gitignore                      # (exists — update for site-dist, node_modules)
├── .github/workflows/
│   └── deploy.yml                  # [NEW] Push-to-Pages with build stages
├── classic/                        # [NEW] Preserved originals before rewrite
│   ├── train-tracks.html
│   ├── animal-memory.html
│   ├── monkey-banana.html
│   ├── mouse-adventure.html
│   ├── valley-explorer.html
│   ├── robot-factory.html
│   ├── code-adventure.html
│   ├── hippo.html
│   ├── crocodile-game/             # Full directory copy
│   ├── little-chef-kitchen/        # Full directory copy
│   └── thegame/                    # Full directory copy
├── games/                          # [NEW] Rewritten games
│   ├── railway-workshop/
│   ├── wild-pairs/
│   ├── canopy-caper/
│   ├── cheese-heist/
│   ├── valley-of-echoes/
│   ├── sparkys-assembly-line/
│   ├── bits-grand-adventure/
│   ├── cocos-lost-hat/
│   ├── hippos-great-feast/
│   ├── little-chefs-grand-kitchen/
│   └── critter-tactics/
├── packages/                       # [NEW] Shared libraries
│   ├── core/                       # Game bootstrap, config, lifecycle, screen
│   ├── input/                      # Action mapping, touch controls
│   ├── audio/                      # Buses, loading, playback, settings
│   ├── ui/                         # Shared menus, buttons, panels, loading
│   ├── effects/                    # Particles, trails, flashes, camera effects
│   ├── testing/                    # Harnesses, fixtures, browser smoke helpers
│   └── tools/                      # Generator, validators, build assembly
├── docs/                           # [NEW] Documentation
│   ├── architecture.md             # [THIS FILE]
│   ├── production-plan.md
│   ├── art-and-audio.md
│   └── games/                      # Per-game briefs
│       ├── railway-workshop.md
│       └── ...
├── site-dist/                      # [NEW] Pages artifact root; never hand-edited
│   ├── index.html                  # Publishes at /games/
│   └── <game-id>/                  # Publishes at /games/<game-id>/
├── crocodile-game/                 # (preserved as-is until migrated)
└── thegame/                        # (preserved as-is until migrated)
```

### 1.1 Classic preservation rule

Immediately before rewriting a game, copy its current implementation verbatim into `classic/` and record source path, commit, preservation date, and checksum in a manifest. Do not move untouched games early. Directory-based games such as `crocodile-game/`, `little-chef-kitchen/`, and `thegame/` are copied in full; do not use symlinks in the archive.

### 1.2 URL preservation rule

Each current public URL must remain live until its replacement is deployed successfully. Use committed HTML redirect pages (`<meta http-equiv="refresh">`) when a URL moves. GitHub Pages does not process Netlify-style `_redirects` files.

Current URLs derived from index.html:
- `train-tracks.html` → `/games/railway-workshop/` (eventual)
- `animal-memory.html` → `/games/wild-pairs/`
- `mouse-adventure.html` → `/games/cheese-heist/`
- `valley-explorer.html` → `/games/valley-of-echoes/`
- `monkey-banana.html` → `/games/canopy-caper/`
- `robot-factory.html` → `/games/sparkys-assembly-line/`
- `code-adventure.html` → `/games/bits-grand-adventure/`
- `crocodile-game/` → `/games/cocos-lost-hat/`
- `hippo.html` → `/games/hippos-great-feast/`
- `little-chef-kitchen/` → `/games/little-chefs-grand-kitchen/`
- `thegame/` → `/games/critter-tactics/`

---

## 2. Shared Package Contracts

### 2.1 `packages/core` — Bootstrap, Lifecycle, Screen

**Responsibility:** Create the Phaser.Game with standard configuration, manage lifecycle events (visibility, resize, fullscreen), provide screen/safe-area helpers, and expose a shared config registry.

**Public API sketch:**

```typescript
// packages/core/src/index.ts

/** Standard Phaser.Game factory for all rewritten games */
export function createGame(config: GameConfig): Phaser.Game;

/** Screen helpers — logical dimensions, scale factor, safe areas */
export const Screen: {
  logicalWidth: number;
  logicalHeight: number;
  scaleFactor: number;
  safeAreaInsets: { top: number; right: number; bottom: number; left: number };
  /** Updates on resize; games read don't listen */
  refresh(): void;
};

/** Lifecycle manager — visibility, pause, resume, browser blur/focus */
export const Lifecycle: {
  onPause: Phaser.Events.EventEmitter;
  onResume: Phaser.Events.EventEmitter;
  onVisibilityChange: Phaser.Events.EventEmitter;
  /** Pause simulation timers; resume on return */
  registerScene(scene: Phaser.Scene): void;
};

/** Standard Phaser.Scale configuration factory */
export function createScaleConfig(
  mode: Phaser.Scale.ScaleModeType,
  parent?: string
): Phaser.Types.Core.ScaleConfig;
```

**Design decisions:**
- `createGame()` builds and returns the Phaser instance with scale/lifecycle conventions only. Games explicitly compose input, audio, UI, and effects so `core` does not depend on those packages.
- `Screen` exposes bootstrap-owned sizing state updated by the lifecycle/resize handler; it does not require a hidden game scene.
- Scale mode defaults to `Phaser.Scale.FIT` with `CENTER_BOTH` for all games, overridable per-game.
- Safe area insets read from CSS `env(safe-area-inset-*)` and device orientation.
- Vite base path passed as a config constant so assets resolve correctly under `/games/<id>/`.

**Key constraints:**
- Must not assume landscape or portrait at boot — some games work in both (crocodile-game).
- Must not call `document` APIs during server-side rendering (N/A for static output, but relevant for tests in Node).

### 2.2 `packages/input` — Action Mapping and Touch Controls

**Responsibility:** Map keyboard keys, mouse buttons, and touch gestures to named game actions. Provide reusable touch joystick, swipe detector, tap/double-tap, drag, and pinch components.

**Public API sketch:**

```typescript
// packages/input/src/index.ts

/** Action registry — maps semantic action names to physical inputs */
export class InputActions {
  /** Define an action with default keys */
  define(action: string, defaults: ActionDef): void;
  /** Check if action is active this frame */
  isDown(action: string): boolean;
  /** Check if action was just pressed this frame */
  justPressed(action: string): boolean;
  /** Register a Phaser scene to receive action events */
  consume(scene: Phaser.Scene): void;
}

/** Touch joystick — anchored or floating */
export class TouchJoystick {
  constructor(scene: Phaser.Scene, config?: JoystickConfig);
  readonly angle: number;       // radians
  readonly force: number;       // 0–1
  readonly isActive: boolean;
  enable(): void;
  disable(): void;
}

/** Swipe detector */
export class SwipeDetector {
  constructor(scene: Phaser.Scene, config?: SwipeConfig);
  onSwipe: Phaser.Events.EventEmitter;  // emits direction, distance, velocity
}

/** Gesture dispatcher — tap, double-tap, long-press, drag, pinch */
export class GestureDispatcher {
  constructor(scene: Phaser.Scene);
  readonly onTap: Phaser.Events.EventEmitter;
  readonly onDoubleTap: Phaser.Events.EventEmitter;
  readonly onLongPress: Phaser.Events.EventEmitter;
  readonly onDrag: Phaser.Events.EventEmitter;
  readonly onPinch: Phaser.Events.EventEmitter;
}
```

**Design decisions:**
- Actions are defined per-game in a setup phase. No shared action enum across games (action names from "JUMP" to "SELECT" to "MOVE_CRITTER" are game-specific).
- `InputActions` wraps Phaser.Input.Keyboard and Input.Pointer. Phaser handles the underlying DOM event plumbing.
- The joystick uses Phaser's pointer events and a touch sprite. No external touch library.
- Games that need only tap/click (animal-memory) can use plain Phaser pointer events directly.
- `GestureDispatcher` uses Phaser.GameObjects for visual touch feedback (ripple on tap, trail on drag).
- Finger-obscuring-target problem: joystick and button positions use safe-area offsets from `@games/core`.

**Key constraint:** All touch components must account for fingers obscuring the target. Use offset positioning, visual feedback above the finger, and generous hit targets (minimum 44×44 CSS pixels, 48×48 recommended).

### 2.3 `packages/audio` — Buses, Loading, Settings

**Responsibility:** Audio context management, bus-based mixing (music, effects, narration, UI), loading from game manifests, mute/volume persistence, and lifecycle handling (visibility, unlock from gesture).

**Public API sketch:**

```typescript
// packages/audio/src/index.ts

/** Audio bus — volume group with mute, fade, and ducking */
export class AudioBus {
  constructor(name: string, initialVolume?: number);
  readonly name: string;
  volume: number;          // 0–1, clamps
  muted: boolean;
  /** Fade to target volume over duration ms */
  fadeTo(target: number, durationMs: number): Promise<void>;
  /** Temporarily reduce volume for speech priority */
  duck(target: number, durationMs: number, releaseMs: number): Promise<void>;
}

/** Master audio manager — context, buses, loading */
export class AudioManager {
  static readonly instance: AudioManager;
  readonly music: AudioBus;
  readonly effects: AudioBus;
  readonly narration: AudioBus;
  readonly ui: AudioBus;
  readonly masterVolume: number;

  /** Must be called from a user gesture to unlock audio context */
  unlock(): Promise<void>;
  /** Load a sound entry from the game manifest */
  load(key: string, url: string, bus?: AudioBus): Promise<void>;
  /** Play a loaded sound */
  play(key: string, config?: PlayConfig): Phaser.Sound.BaseSound | null;
  /** Stop all sounds on a bus */
  stopBus(bus: AudioBus): void;
  /** Pause/resume all audio when document hidden */
  onVisibilityChange(visible: boolean): void;
}

/** Playback configuration */
export interface PlayConfig {
  bus?: AudioBus;
  volume?: number;
  rate?: number;
  detune?: number;
  loop?: boolean;
  delay?: number;
  /** Duck this bus's parent during playback */
  duck?: { target: number; duration: number; release: number };
}
```

**Design decisions:**
- Wraps Phaser.Sound.WebAudioSoundManager. Phaser handles decode, playback, and spatial audio if needed.
- Bus-based routing: music bus, effects bus, narration bus, UI bus. Each game chooses which buses to use.
- `AudioManager.unlock()` is called from the first user gesture handler (Phaser's input system or a DOM overlay).
- Settings persisted via `packages/core` save system: `{ masterVolume, musicMuted, effectsMuted, ... }`.
- Ducking: narration ducks music bus. Important for story-heavy games (Coco's Lost Hat).
- Procedural tones (Web Audio API oscillators) are used only for temporary assets during development, replaced by designed audio for production.

**Key constraint:** No external CDN for audio. All audio files bundled with the game, loaded via Vite's asset pipeline.

### 2.4 `packages/ui` — Shared UI Components

**Responsibility:** Reusable screen components: menus, buttons, panels, loading bars, scene transitions, completion screens, and confirmation dialogs.

**Public API sketch:**

```typescript
// packages/ui/src/index.ts

/** Styled button with touch feedback, scale animation, and disabled state */
export class GameButton extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, config: ButtonConfig);
  setEnabled(enabled: boolean): void;
  readonly onClick: Phaser.Events.EventEmitter;
}

/** Modal panel with backdrop, title, content area, and action buttons */
export class ModalPanel extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, config: PanelConfig);
  show(animated?: boolean): Promise<void>;
  hide(animated?: boolean): Promise<void>;
}

/** Scene transition — configurable wipe, fade, or shape reveal */
export function transitionToScene(
  currentScene: Phaser.Scene,
  targetScene: string,
  data?: object,
  transition?: TransitionType
): Promise<void>;

/** Loading bar with optional progress text */
export class LoadingBar extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, config?: LoadingBarConfig);
  setProgress(value: number): void;  // 0–1
}

/** Completion / level-end screen */
export class CompletionPanel extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, config: CompletionConfig);
  show(result: CompletionResult): Promise<void>;
}

/** Simple text-based dialog for tutorials and hints */
export class SpeechBubble extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, config: SpeechBubbleConfig);
  say(text: string, options?: SayOptions): Promise<void>;
}
```

**Design decisions:**
- Components are Phaser GameObjects/Containers, not DOM overlays. This keeps rendering in Canvas/WebGL and consistent with the game's visual identity.
- Each component accepts a style config rather than using a global theme. Games pass their own palette, font, and size.
- Scene transitions use Phaser's camera effects (fade, flash) plus custom container animations.
- `ModalPanel` supports auto-layout for text content. Complex layouts remain the game's responsibility.
- Components emit Phaser events; games subscribe with scene lifecycle cleanup.

**Key constraint:** Shared components must not import game-specific types or data. They receive all content via config objects.

### 2.5 `packages/effects` — Particles, Camera, Screen Effects

**Responsibility:** Reusable visual effects: particle emitters, trails, hit pauses, screen shake, flash, slow motion, and camera tracking.

**Public API sketch:**

```typescript
// packages/effects/src/index.ts

/** Screen shake with directional variants */
export function shakeCamera(
  scene: Phaser.Scene,
  intensity?: number,      // default 0.01
  duration?: number,       // default 100ms
  direction?: 'xy' | 'x' | 'y'
): void;

/** Hit pause — freeze game for N ms then resume */
export function hitPause(
  scene: Phaser.Scene,
  duration?: number       // default 80ms
): void;

/** Flash overlay with color and fade */
export function flashScreen(
  scene: Phaser.Scene,
  color?: number,          // default 0xffffff
  duration?: number,       // default 200ms
  alpha?: number           // default 1
): void;

/** Slow-motion effect via time scaling */
export class SlowMotion {
  static start(scene: Phaser.Scene, factor?: number, duration?: number): Promise<void>;
  static stop(scene: Phaser.Scene): void;
}

/** Particle burst — one-shot at a position */
export function burstParticles(
  scene: Phaser.Scene,
  texture: string,
  x: number,
  y: number,
  config: BurstConfig
): void;

/** Trail effect — attach to a moving game object */
export class TrailEffect {
  constructor(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject, config: TrailConfig);
  enable(): void;
  disable(): void;
  destroy(): void;
}

/** Camera tracker — smoothly follow a target with dead zone and look-ahead */
export class CameraTracker {
  constructor(camera: Phaser.Cameras.Scene2D.Camera, config: TrackerConfig);
  setTarget(target: { x: number; y: number }): void;
}
```

**Design decisions:**
- Functions (shakeCamera, flashScreen) for one-shot effects; classes (TrailEffect, SlowMotion) for sustained effects.
- All effects use Phaser's built-in camera, tween, and particle systems. No custom render pipelines.
- Particle textures are generated programmatically (circles, squares, stars) as tiny generated canvases or pre-made assets. Games provide their own for game-specific effects.
- Hit pause works by setting `scene.time.timeScale` to 0 for the duration, then restoring.
- Camera tracker supports dead zone (for no-jitter when target moves within a small radius), look-ahead (for platformers), and smoothing.

### 2.6 `packages/testing` — Harnesses and Helpers

**Responsibility:** Test fixtures, scene harnesses, browser smoke test utilities, and Phaser mocking helpers for Node.js unit tests.

```typescript
// packages/testing/src/index.ts

/** Create a Phaser scene in headless mode for unit testing */
export function createTestScene(config?: Partial<Phaser.Types.Core.GameConfig>): Phaser.Scene;

/** Stub for Phaser's asset loader — returns empty textures/images */
export function stubAssetLoader(scene: Phaser.Scene): void;

/** Browser smoke test — loads URL and checks for console errors */
export async function browserSmokeTest(url: string): Promise<SmokeResult>;

/** Generate a deterministic test game with known state */
export function createTestGame(plugins?: any[]): Promise<Phaser.Game>;
```

**Key constraint:** Testing package must not depend on DOM in unit tests. Use `headless: true` or `NOOP` renderer for Phaser in Node.

### 2.7 `packages/tools` — Generator, Validators, Build Assembly

**Responsibility:** Game project generator (`npm run game:create`), asset manifest validation, build assembly into `site-dist/`, and post-build checks.

```typescript
// packages/tools/src/index.ts

/** Generate a new game package from template */
export function scaffoldGame(id: string, template?: GameTemplate): Promise<void>;

/** Validate asset manifest — check every file exists and meets size budget */
export function validateManifest(manifest: AssetManifest): ValidationResult;

/** Assemble all games into site-dist/ */
export function assembleSite(): Promise<void>;

/** Check internal links in assembled output */
export function validateLinks(siteDir: string): LinkResult[];
```

---

## 3. Game Package Contract

### 3.1 Directory Structure

Each `games/<game-id>/` follows:

```
games/<game-id>/
├── package.json              # name: @games/<game-id>, depends on shared packages
├── vite.config.ts            # Extends shared Vite config
├── tsconfig.json             # Extends root tsconfig
├── game.json                 # Game manifest
├── src/
│   ├── main.ts               # Entry — calls createGame from @games/core
│   ├── config.ts             # Game-specific Phaser config extension
│   ├── scenes/
│   │   ├── BootScene.ts      # Asset loading
│   │   ├── MenuScene.ts      # Title/menu
│   │   ├── GameScene.ts      # Main gameplay
│   │   └── ...               # Additional scenes
│   ├── systems/              # Game-rule modules (testable outside Phaser)
│   ├── entities/             # Game-specific game objects
│   └── data/                 # Levels, items, config as TypeScript/JSON
├── assets/
│   ├── source/               # Editable source assets (SVG, .psd, .aseprite, .wav)
│   ├── images/               # PNG, WebP, SVG for browser
│   ├── atlases/              # Sprite atlas JSON + PNG
│   ├── audio/                # OGG/MP3/M4A
│   └── fonts/                # Web fonts (self-hosted)
├── tests/
│   ├── rules.test.ts
│   ├── levels.test.ts
│   └── smoke.test.ts
└── README.md
```

### 3.2 `game.json` Schema

```typescript
// Defines the stable manifest for catalog, build, and assembly
interface GameManifest {
  id: string;                    // kebab-case, matches directory name
  title: string;                 // Human-readable
  description: string;           // Catalog copy
  icon: string;                  // Game-local manifest asset path
  order: number;                 // Stable catalog order
  publicPath: string;            // e.g., "/games/railway-workshop/"
  entryPoint: string;            // Built path relative to artifact directory, normally "index.html"

  settings: {
    orientation: 'landscape' | 'portrait' | 'both';
    logicalWidth: number;
    logicalHeight: number;
    scaleMode: 'FIT' | 'RESIZE' | 'FILL';
  };

  initialScene: string;          // Scene key

  assets: {
    images: AssetRecord[];
    atlases: (AssetRecord & { atlasPath: string; texturePath: string })[];
    audio: (AssetRecord & { bus: 'music' | 'sfx' | 'ui' | 'narration' })[];
    fonts: (AssetRecord & { family: string })[];
  };

  saveData: {
    schemaVersion: number;
    keys: string[];              // localStorage keys used
  };

  dependencies: {
    packages: string[];          // e.g., ["@games/core", "@games/input"]
  };
}

interface AssetRecord {
  key: string;
  path: string;                  // Game-local browser asset; never a CDN URL
  license: string;               // SPDX/Creative Commons ID or owner-defined original-work label
  author: string;
  source: string;                // URL, source file, recording session, or generator
  processing?: string;
  sizeBudgetBytes?: number;
}
```

### 3.3 `package.json` Shape

```json
{
  "name": "@games/railway-workshop",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@games/core": "*",
    "@games/input": "*",
    "@games/audio": "*",
    "@games/ui": "*",
    "@games/effects": "*",
    "phaser": "{{PHASER_VERSION_FROM_D05}}"
  },
  "devDependencies": {
    "@games/testing": "*",
    "vite": "^5.4.0",
    "vitest": "^2.0.0",
    "typescript": "^5.4.0"
  }
}
```

The dependency value is a template token. D05 must replace it with one exact semver before any package manifest is generated.

### 3.4 Entry Point — `src/main.ts`

Each game's entry creates the Phaser.Game using the shared bootstrap:

```typescript
import { createGame } from '@games/core';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import gameManifest from '../game.json';

const game = createGame({
  settings: gameManifest.settings,
  parent: 'game',
  scenes: [BootScene, MenuScene, GameScene],
});

// BootScene explicitly composes @games/input, @games/audio, UI, and effects.
export default game;
```

### 3.5 Shared Vite Config

Every game's `vite.config.ts` extends the shared base:

```typescript
import { defineConfig } from 'vite';
import { sharedViteConfig } from '@games/tools/vite-shared';

export default defineConfig({
  ...sharedViteConfig,
  // Game-specific overrides (minimal)
});
```

The config factory receives the validated manifest and handles:
- `base: '/games/<game-id>/'` from `publicPath` (verified by AS-01)
- local `build.outDir: 'dist'`; the assembler later copies this directory to `site-dist/<game-id>/`
- `build.emptyOutDir: true` and an agreed small-asset inline limit
- bundling Phaser and workspace code into the game output—no CDN or runtime `node_modules` dependency
- narrowly scoped per-game overrides only for demonstrated renderer/asset needs

---

## 4. Build Assembly Pipeline

### 4.1 Root Package Scripts

```json5
// Root package.json scripts; exact runner flags are verified during W0.1.
{
  "scripts": {
    "dev": "tsx packages/tools/src/dev.ts",
    "install:legacy": "tsx packages/tools/src/install-legacy.ts",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "test": "tsx packages/tools/src/test.ts",
    "lint": "eslint .",
    "format:check": "prettier --check .",
    "format": "prettier --write .",
    "test:e2e": "playwright test --grep-invert '@visual|@perf|@live'",
    "test:visual": "playwright test --grep @visual",
    "test:perf": "playwright test --project=tablet-touch --grep @perf",
    "test:smoke-live": "playwright test --config playwright.live.config.ts",
    "build": "tsx packages/tools/src/build.ts",
    "validate": "tsx packages/tools/src/validate.ts",
    "game:create": "tsx packages/tools/src/generate.ts"
  }
}
```

### 4.2 CI/CD Pipeline (GitHub Actions `.github/workflows/deploy.yml`)

1. **Checkout** repository.
2. **Install** root and migration-manifest `legacy-vite-build` dependencies from lockfiles (`npm ci`, then `npm run install:legacy`).
3. **Static checks** — `npm run lint`, `npm run format:check`, `npm run typecheck`.
4. **Fast tests** — `npm test` runs workspace and retained legacy suites.
5. **Build and assemble** — `npm run build` creates local rewritten outputs, the transitional Critter build, legacy/redirect entries, catalog, and assembly inventory.
6. **Validate** — `npm run validate` checks manifests, migration strategies, links, assets, paths, licenses, budgets, and raw-source leakage.
7. **Browser gates** — Playwright smoke/touch/save/resize/visual/performance cases run against the assembled artifact.
8. **Upload exact artifact** — `actions/upload-pages-artifact` with `path: site-dist/`.
9. **Deploy** — `actions/deploy-pages`; never rebuild in this job.
10. **Verify live site** — Playwright/curl retries catalog and key paths, including transitional `/thegame/`, after propagation.

### 4.3 Assembly (`packages/tools/src/assemble.ts`)

```
site-dist/
├── index.html                       # Catalog at /games/
├── railway-workshop/                # games/railway-workshop/dist/ copied here
│   ├── index.html
│   └── assets/
├── wild-pairs/                      # Present after its rewrite builds
├── train-tracks.html                # Legacy entry or redirect at original URL
├── crocodile-game/                  # Untouched legacy directory until replaced
└── <other original or rewritten public entries>
```

The assembler starts from a clean `site-dist/`, copies each rewritten package's local `dist/` to `<game-id>/`, copies not-yet-replaced legacy entries at their original relative paths, installs committed redirect pages for migrated legacy URLs, and generates the catalog from validated manifests plus the migration manifest. Catalog icons are game-local assets, not emoji placeholders in a release.

---

## 5. Migration Strategy

### 5.1 Approved Phase Sequence

| Stage | Games | Focus | Shared Package Work |
|-------|-------|-------|---------------------|
| **1** | Train Tracks → "Railway Workshop" | Foundation + showcase | core, input basics, audio basics, ui basics, effects basics, tools (assembly, CI) |
| **2** | Animal Memory → "Wild Pairs", Monkey Banana → "Canopy Caper" | Prove 3 genres | input (gestures), audio (music ducking), ui (completion panels), effects (particles) |
| **3** | Mouse Adventure → "Cheese Heist", Coco's Lost Hat, Hippo's Great Feast | Adventure wave | ui (speech bubble, dialog), effects (camera tracker), core (cutscene lifecycle) |
| **4** | Valley Explorer → "Valley of Echoes", Robot Factory → "Sparky's", Code Adventure → "Bit's" | Systems wave | core (only proven camera/culling primitives), testing (simulation harnesses), tools (level validation/editor support) |
| **5** | Little Chef → "Little Chef's Grand Kitchen", Critter Tactics | Flagship wave | All packages mature; focus on game-specific depth |
| **6** | All 11 complete | Factory product | tools (game generator), docs, final polish |

### 5.2 Classic Preservation Before Migration

For each game before rewrite begins:
1. Copy the complete legacy implementation to `classic/<legacy-id>/`; do not use symlinks.
2. Record original path, source commit, checksums, dependencies, and migration status in `classic/MIGRATION_LOG.md` and the tooling migration manifest.
3. Keep the original public URL serving the legacy implementation until the replacement passes release gates.
4. At release, install the committed redirect from the old URL to `/games/<new-id>/` and verify rollback to the archived entry.

### 5.3 Incremental Deployment Strategy

- The root `index.html` remains the live catalog during migration.
- During a rewrite, its new URL may deploy unlisted for review while the original public URL continues to serve the legacy implementation.
- After release gates pass, the catalog points to the rewrite and the original URL redirects to it; the archived classic remains available for rollback/comparison.
- Redirects are permanent compatibility entries unless the owner explicitly approves their removal.

---

## 6. Save Compatibility

### 6.1 Current Save Patterns

| Legacy game | Storage key(s) | Observed format | Versioning |
|---|---|---|---|
| Robot Factory | `robotFactory` | `{ currentConcept, savedModules[], unlocks{} }` | None |
| Code Adventure | `codeAdventure`, `codeAdventurePlayed` | `{ currentLevel, completedLevels{}, stars{}, soundEnabled, musicEnabled }` plus first-play flag | None |
| Hippo's Great Feast | `hippoFeast` | `{ levelCompleted[], totalScore }` | None |
| Little Chef's Kitchen | `littleChefSave` | `{ currentLevel, unlockedLevels[], levelStars{}, soundEnabled, musicEnabled, tutorialCompleted }` | None |
| Critter Tactics | `critter_tactics_progress`, `critter_tactics_tutorial` | `{ unlockedLevel, completedLevels[] }` plus tutorial flag | None |

### 6.2 Target Save System

Located in `packages/core`:

```typescript
export interface SaveEntry {
  schemaVersion: number;
  gameId: string;
  data: unknown;
  savedAt: string;    // ISO 8601
}

export class SaveManager {
  constructor(gameId: string, schemaVersion: number);

  /** Save typed data */
  save<T>(key: string, data: T): void;

  /** Load with migration — applies registered migrators if schema version is stale */
  load<T>(key: string): { data: T | null; migrated: boolean };

  /** Register a migration function for past schema versions */
  registerMigration(fromVersion: number, migrator: (old: unknown) => unknown): void;

  /** Delete save data */
  clear(key?: string): void;

  /** Export all saves for backup or transfer */
  exportAll(): Record<string, SaveEntry>;
}
```

**Migration rules:**
- `schemaVersion` starts at 1 for each rewritten game.
- Migration functions are registered linearly: v1→v2, v2→v3, etc.
- If current schema version > saved version, apply all intermediate migrators in order.
- If saved version > current version (downgrade), refuse to load and return `null`.
- Every legacy key is parsed as untrusted data and is never deleted automatically.
- D31–D35 decide import versus fresh-start behavior for the five games with observed legacy saves. An approved importer must be schema-validated, idempotent, backed up, and covered by fixture tests; an approved fresh start leaves old keys untouched and explains the reset in release notes.
- Railway Workshop, Wild Pairs, Canopy Caper, Cheese Heist, Valley of Echoes, and Coco's Lost Hat have no observed legacy progress save to import; their new versioned saves start at schema version 1.

### 6.3 Per-Game Save Schemas (target)

| Rewrite | Schema Version | Keys | Data Shape |
|---------|---------------|------|-----------|
| Railway Workshop | 1 | `progress` | `{ unlockedLevels[], completedLevels[], stars{} }` |
| Wild Pairs | 1 | `progress`, `album` | `{ unlockedHabitats, ... }, { discovered[] }` |
| Canopy Caper | 1 | `progress` | `{ clearedStages[], collectedFruit[] }` |
| Cheese Heist | 1 | `progress` | `{ completedRooms[], bestTimes{} }` |
| Valley of Echoes | 1 | `save` | `{ discoveredLandmarks[], journalEntries[], position{} }` |
| Sparky's Assembly | 1 | `progress` | `{ solvedPuzzles[], unlockedModules[] }` |
| Bit's Grand Adventure | 1 | `progress` | `{ completedPuzzles[], stars{} }` |
| Coco's Lost Hat | 1 | `progress`, `decorations` | `{ completedRoutes[], ... }, { unlocked[] }` |
| Hippo's Great Feast | 1 | `progress` | `{ clearedRegions[], unlockedAbilities[], collectedRecipes[] }` |
| Little Chef's Grand Kitchen | 1 | `save` | `{ currentLevel, unlockedLevels[], levelStars{}, settings{} }` |
| Critter Tactics | 1 | `progress` | `{ unlockedLevel, completedLevels[], upgrades{} }` |

---

## 7. Asset Loading Conventions

### 7.1 Boot Scene Pattern

Every game's BootScene follows this sequence:

1. **Display loading bar** (from `@games/ui`)
2. **Load manifest assets** listed in `game.json` assets section
3. **Generate procedural textures** for missing or placeholder assets (circles, rectangles for dev)
4. **Verify required assets** loaded; if any fail, show error screen (not silent fail)
5. **Transition to MenuScene**

### 7.2 Asset Sources and Processing

| Asset Type | Source Format | Browser Format | Processing |
|-----------|--------------|----------------|------------|
| Character sprites | Aseprite (.ase) or individual frames | PNG sprite atlas (JSON hash + PNG) | Aseprite export script or TexturePacker |
| Environment tiles | Aseprite or hand-drawn | PNG tileset + Tiled TSX/JSON | Tiled export + custom converter |
| UI elements | SVG or Figma export | PNG/SVG at build time | Vite SVG plugin or manual export |
| Background art | Photoshop/GIMP XCF or Procreate | WebP (lossy) or PNG | WebP conversion with quality budget |
| Sound effects | WAV 44.1kHz 16-bit | OGG Vorbis (preferred) + MP3 fallback | ffmpeg conversion |
| Music | WAV or AIFF | OGG Vorbis (preferred) + MP3 fallback | ffmpeg conversion |
| Narration | WAV from TTS or recording | MP3 128kbps | ffmpeg conversion |
| Fonts | TTF/OTF | WOFF2 + WOFF | woff2 compress |

### 7.3 Phaser Loader Integration

Games use Phaser's built-in `this.load`:

```typescript
// BootScene.ts
preload() {
  // Images
  this.load.image('background', './assets/images/background.webp');

  // Atlases
  this.load.atlas('characters', './assets/atlases/characters.png', './assets/atlases/characters.json');

  // Audio
  this.load.audio('bgm', ['./assets/audio/bgm.ogg', './assets/audio/bgm.mp3']);

  // Fonts loaded via CSS @font-face before Phaser boots
}
```

**Key decisions:**
- All asset paths are relative to the game package root. Vite resolves them to `/games/<id>/assets/...` in production.
- Audio uses fallback formats: OGG primary, MP3 secondary (for Safari).
- Fonts are loaded via CSS `@font-face` declarations in the game's `<style>` or an imported CSS file, before Phaser creates the canvas.
- Assets under 4KB may be inlined as data URIs (Vite default).

---

## 8. Architecture Decision Records

### ADR-001: All games share one Phaser runtime per page

**Context:** Each game is a separate HTML page. No game embeds another; the catalog is a landing page.

**Decision:** Each game's `main.ts` creates a standalone `new Phaser.Game(config)`. Shared code is imported as npm packages. The per-game Phaser instance is lightweight enough for this.

**Consequences:** Each game page is self-contained. No global state leakage between games. Catalog page is pure HTML/CSS without Phaser.

### ADR-002: Shared packages do not hide Phaser behind a large generic abstraction

**Context:** AGENTS.md explicitly forbids building custom replacements for Phaser facilities that already solve the requirement well.

**Decision:** Shared packages extend Phaser's API with conventions and helpers but do not wrap Phaser classes behind game-engine abstractions. A game imports `Phaser.Scene` directly; shared code provides utilities that take Phaser objects as parameters.

**Consequences:** Game developers must know Phaser. Shared code is thin and replaceable. Lower risk of abstraction leaks.

### ADR-003: Save system uses localStorage with version-based migration

**Context:** Phaser does not provide portfolio save/versioning conventions. LocalStorage is available on the target browsers, and game progress/settings remain device-local.

**Decision:** Use `localStorage` with namespaced keys (`@games/<game-id>/<key>`). Implement a `SaveManager` class with schema version and migration chain.

**Consequences:** 5MB storage limit per origin. OK for game progress data (typically <50KB per game). For any game needing larger storage (e.g., Valley of Echoes with journal entries), consider IndexedDB later.

### ADR-004: Asset files are bundled per-game, not in a shared asset package

**Context:** Each game has a distinct art direction; sharing assets between games would create coupling and cross-game visual dependency.

**Decision:** Assets live inside each `games/<game-id>/assets/` directory. No shared asset package. Tools package validates manifest completeness per-game.

**Consequences:** Asset duplication between games (e.g., button sound effects) is acceptable for development. A post-Stage-6 optimization could extract truly universal sounds into a shared audio package.

### ADR-005: Build output base path is `/games/<game-id>/`

**Context:** GitHub Pages hosts at `https://nikosk.github.io/games/`. Each game lives at a subpath.

**Decision:** Set `base: '/games/<game-id>/'` in each game's Vite config. This ensures all asset URLs and entry paths resolve correctly.

**Consequences:** Vite's dev server with `base` needs `--host` flag for mobile testing. Production builds use absolute paths from domain root. Redirect HTML pages at old URLs use `<meta http-equiv="refresh">` to the new path.

### ADR-006: CI/CD runs all game builds, then assembles, then validates, then publishes

**Context:** The current push-to-Pages behavior must be preserved. The broken Critter Tactics deployment must be fixed.

**Decision:** The CD pipeline builds every game independently, copies legacy games, assembles the catalog, validates links and asset references, runs browser smoke tests, and only then publishes. Any build failure prevents deployment.

**Consequences:** Longer deploy times (estimated 3-5 minutes for 11 games). Faster incremental builds during development via per-game `npm run build` targeting a single game.

### ADR-007: Root workspace uses npm workspaces with explicit dependency declarations

**Context:** AGENTS.md specifies npm workspaces. The repository currently has no root workspace.

**Decision:** Root `package.json` declares `"workspaces": ["packages/*", "games/*"]`. Each game declares its shared package dependencies in its own `package.json`. The root lockfile governs all.

**Consequences:** `npm install` from root installs everything. Per-game `npm install` works from the game directory. Publishing to npm is never required (all packages are `"private": true`).

### ADR-008: TypeScript strict mode for all game and shared code

**Context:** AGENTS.md requires strict TypeScript.

**Decision:** `tsconfig.base.json` sets `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`. Each package extends this base.

**Consequences:** Stricter code catches migration bugs early. For a verified gap in Phaser's bundled declarations, prefer a narrowly scoped local module augmentation; use `@ts-expect-error` only with a comment and an upstream issue or minimal reproduction.

### ADR-009: Per-game scenes, not a shared scene registry

**Context:** Games have different scene sets and transitions.

**Decision:** Each game registers its own scenes in `main.ts`. Shared packages provide scene utility functions, not scene instances. The `createGame` bootstrap accepts a `scene` array.

**Consequences:** No coupling between games' scene graphs. Shared transitions use `transitionToScene` utility that accepts scene keys as strings.

### ADR-010: Audio unlock handled by the shared AudioManager, triggered by any user gesture

**Context:** Browsers require a user gesture to unlock the AudioContext. Each game must handle this.

**Decision:** `AudioManager.unlock()` is called from a DOM event listener added in `main.ts` before the game boots. The unlock listener fires once on `pointerdown` or `touchstart` on the game container. Phaser's `INPUT_UP` event also triggers unlock if the DOM listener missed.

**Consequences:** Audio works reliably on first interaction. The unlock gesture also serves as the catalog-to-game transition click. No double-unlock needed.

---

## 9. Research Spikes (Unresolved Technical Decisions)

Each spike below represents a decision that cannot be made from desk analysis alone. Each must produce a short written recommendation with evidence.

### AS-01: Vite's `base` configuration for multi-level subdirectory hosting

**Question:** Does `base: '/games/railway-workshop/'` work correctly with Vite's dev server, asset hashing, and `import.meta.url` for games at a two-level subpath under GitHub Pages?

**Deliverable:** A minimal test repo or branch that deploys one game with `base: '/games/test-game/'` to GitHub Pages and verifies:
- `index.html` loads
- All JS chunks resolve
- All image/audio assets load
- Relative imports in CSS resolve

**Decision criteria:** If base path works cleanly: adopt for all games. If base path has issues (e.g., dynamic imports, CSS urls): use `base: './'` with adjusted asset directories or a custom Vite plugin.

**Timebox:** 2 hours (or 1 deploy cycle)

### AS-02: Phaser headless mode for Node.js unit tests

**Question:** Can Phaser scenes be unit-tested in Node without a DOM/GPU using `Phaser.HEADLESS` or `Phaser.CANVAS` with a mocked canvas?

**Deliverable:** A test that:
- Creates a Phaser.Game with `type: Phaser.HEADLESS`
- Loads a scene
- Exercises a game-system function that uses Phaser types (but not rendering)
- Asserts behavior without crashing or hanging

**Decision criteria:** If headless works reliably: use for all non-rendering tests. If headless is flaky or incomplete: use `jsdom` + `canvas` npm package for a minimal DOM environment, or restrict Phaser-dependent tests to browser only.

**Timebox:** 3 hours

### AS-03: Sprite atlas workflow from Aseprite

**Question:** What is the optimal pipeline to produce Phaser-compatible sprite atlases (JSON hash format) from Aseprite source files?

**Deliverable:** A tested pipeline script or documented manual process that:
- Takes `.aseprite` files with tagged animations
- Exports a JSON (hash) atlas + PNG
- Works for both character sheets and tile sets
- Is reproducible and scriptable

**Decision criteria:** If free tooling (Aseprite CLI + custom exporter, or `aseprite-atlas` npm package) produces valid Phaser atlases: wrap in `packages/tools`. If only TexturePacker produces reliable output: document the commercial dependency.

**Timebox:** 4 hours

### AS-04: Shared Vite plugin configuration for Phaser

**Question:** What Vite configuration is shared across all games, and what per-game overrides exist?

**Deliverable:** A typed Vite config factory that configures the AS-01 base, local `dist/`, CSS/assets, LAN device testing, sourcemaps, and bundled Phaser/workspace dependencies.

**Decision criteria:** Railway Workshop builds with no runtime CDN or `node_modules` dependency; its local output copies to `site-dist/<id>/` and runs at the project subpath. The factory exposes only evidence-based build overrides and does not absorb game runtime/physics configuration.

**Timebox:** 3 hours

### AS-05: Audio format fallback strategy for Phaser's WebAudio

**Question:** What audio format combination provides broadest browser compatibility with acceptable file sizes for game effects and background music?

**Deliverable:** A compatibility table across every browser/device resolved by D21/D23 for OGG, MP3, M4A/AAC, and WebM audio in Phaser's WebAudio loader.

**Decision criteria:** Select the smallest fallback set that plays effects and music after unlock in every supported browser. Include measured size/quality for a representative loop and effect; do not assume unsupported session-share data.

**Timebox:** 2 hours (testing with existing audio in thegame/ or crocodile-game/)

### AS-06: GitHub Actions deploy with artifact validation

**Question:** What is the minimal, reliable GitHub Actions workflow that builds games, validates the output, and publishes to GitHub Pages?

**Deliverable:** A complete `.github/workflows/deploy.yml` that:
- Installs dependencies
- Type-checks
- Runs tests
- Builds all games
- Assembles `site-dist/`
- Validates at minimum: all `<script src>` and `<link href>` resolve to existing files in `site-dist/`
- Uploads and deploys

**Decision criteria:** Must complete within 10 minutes on the free GitHub Actions runner. Must provide clear failure messages when a game fails to build. Must not deploy if validation fails.

**Timebox:** 4 hours

### AS-07: Touch target minimum size and finger occlusion for tablet play

**Question:** What minimum touch target size and spacing produce reliable direct-touch input on the selected tablets, and what UI patterns reduce finger occlusion?

**Deliverable:** A recommendation document with:
- Minimum touch target sizes (device-independent pixels) based on published research and Apple HIG
- Touch offset patterns that prevent finger covering the target
- Hit target extension strategies (invisible hit areas larger than visual element)
- Validation via a test page on actual tablets

**Decision criteria:** Implement in `packages/ui` as default button/control sizes and optional touch-above offset. Each game can override per control.

**Timebox:** 3 hours

### AS-08: Browser smoke test approach for static HTML games

**Question:** What is the least-effort approach to verify each built game loads without console errors in a headless browser?

**Deliverable:** A working script in `packages/testing` that:
- Starts a local HTTP server serving `site-dist/`
- Launches Playwright or Puppeteer
- Opens each game's index.html
- Waits 3 seconds (or for a specific DOM selector indicating game boot)
- Checks `page.on('console')` for errors and warnings
- Reports pass/fail per game

**Decision criteria:** Playwright is preferred for cross-browser support. If Puppeteer provides simpler API and Chrome-only is acceptable for CI: document the tradeoff.

**Timebox:** 3 hours

---

## 10. Boundary Rules (Reproduced from AGENTS.md with Architecture-Specific Clarifications)

### Shared must not import game-specific modules

No package in `packages/*` may import from `games/*` or reference a game-specific type, config, or asset.

### Games must not import other games

No `games/<id>` imports from `games/<other-id>`. Shared code lives in `packages/*`. Duplicated logic between games is a signal to extract to a shared package, but only when at least 2 games need it now.

### Phaser version lock

All consuming packages declare the same exact D05 Phaser version; the root lockfile and optional npm override prevent skew. Version updates change every declaration/lock entry together and run the full portfolio gate.

### No generated source from `game.json`

Build/catalog tools validate and consume `game.json`; a game's entry may import its own validated manifest so dimensions/scene metadata are not duplicated. Do not generate TypeScript source or game rules from the manifest, and do not make runtime behavior depend on portfolio-wide manifest discovery.

---
