# Quality, Testing, and Release Gates

> **Plan set:** [Master plan](README.md) · [Architecture](01-architecture.md) · [Tooling and CI](02-tooling-and-ci.md) · [Quality](03-quality-and-testing.md) · [Media production](04-media-production.md) · [Decisions and risks](05-decisions-and-risks.md)


**Repo:** `nikosk/games` — HTML games published at `https://nikosk.github.io/games/`
**Plan date:** 2025-07-10
**Context:** The repo is transitioning from 11 standalone HTML prototypes to a unified Phaser 3 + TypeScript + Vite + npm workspaces studio. This document designs the test and release quality system that makes that transition dependable.

---

## 1. Current State Audit

### 1.1 What exists today

| Layer | Status |
|---|---|
| Root workspace | None. No `package.json`, no `tsconfig.json`, no shared build scripts. |
| TypeScript | Zero usage. `thegame/` uses JS modules; `little-chef-kitchen/` uses global JS. |
| Tests | One suite: `crocodile-game/tests/integrity.test.mjs` (Node `node:test`). Checks HTML structure, audio file existence/size, narration manifest, and SVG replay integrity. |
| CI/CD | None. No `.github/workflows/`. Push-to-Pages is bare Git push with no build step. |
| Build system | `thegame/` has Vite with `dist/` output. Critter Tactics live entry is broken because raw Vite source (not built output) is published. |
| Asset validation | Manual. `crocodile-game` checks MP3 sizes in its test; no general system exists. |
| Phaser version | Current Critter package declares Phaser 3.80.1; legacy Little Chef loads CDN Phaser 3.70.0. D05 selects the rewrite pin. |
| Node/npm | v25.9.0 / 11.12.1 |
| Target tablet | Referenced in AGENTS.md but unspecified model. |

### 1.2 What the AGENTS.md requires

- Strict TypeScript for rewrites and shared packages.
- Unit tests for input actions, save serialization, audio settings, level/manifest validation, deterministic rules.
- Per-game: core rules, level-data validity, save/restore, solver/pathfinding tests, browser smoke test, one critical-path E2E interaction.
- Pre-completion: type-check, unit tests, production builds, browser smoke tests, repo-level build + deployment validation.
- Build pipeline: install → type-check → unit/level tests → Vite build per game → copy legacy → assemble `site-dist/` → validate links/assets → browser smoke → deploy → post-deploy URL verify.
- Performance: measure on target tablet, stable frame pacing, pool objects, per-scene loading, dev perf display, profile before micro-optimizing.
- Assets: source vs browser separation, license/origin tracking, manifest-driven, fail on missing/oversized.

### 1.3 Critical gaps

1. **No root build orchestrator.** Each game builds independently (or not at all).
2. **No TypeScript pipeline.** No `tsconfig.json` anywhere.
3. **No shared test infrastructure.** No test runner configured for Phaser-aware testing.
4. **No browser automation.** No Playwright, Puppeteer, or similar.
5. **No CI.** GitHub Actions is unconfigured.
6. **No visual regression.** No screenshot comparison.
7. **No perf measurement framework.** No FPS meter, no memory tracker, no draw-call counter.
8. **Live deployment is broken** for at least one game (Critter Tactics publishes raw source).

---

## 2. Quality Architecture Overview

```
                ┌──────────────────────────────────────┐
                │          QUALITY GATES               │
                │  (per-commit → per-PR → per-release) │
                └──────────────┬───────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
   ┌────▼────┐          ┌──────▼──────┐        ┌─────▼─────┐
   │  FAST   │          │   BROWSER   │        │  RELEASE  │
   │ < 30s   │          │   < 3 min   │        │  < 10 min │
   └────┬────┘          └──────┬──────┘        └─────┬─────┘
        │                      │                      │
   ┌────▼────┐          ┌──────▼──────┐        ┌─────▼─────┐
   │ Unit    │          │ Phaser      │        │ Full build│
   │ tests   │          │ scene       │        │ + E2E     │
   │ Rules   │          │ harness     │        │ + visual  │
   │ Data    │          │ Input flows │        │ + perf    │
   │ Save    │          │ Smoke       │        │ + deploy  │
   └─────────┘          └─────────────┘        └───────────┘
```

**Principle:** Fast tests gate every commit locally. Browser tests gate PRs. Full release suite gates deployment. No gate is skippable.

---

## 3. Layer 1: Fast Tests (unit, data, rules)

These run in Node without a browser, under 30 seconds for the entire repo.

### 3.1 Test runner choice

**Decision: Vitest** for rewritten/shared fast tests (D18); retained legacy suites may keep their existing runner until migration.

Rationale:
- Native ESM, TypeScript, and Vite integration — same toolchain as the games.
- Watch mode, parallel isolation, and `vi.fn()`/`vi.mock()` built in.
- Compatible with Node's `node:test` assertions via adapters if migration is staged.
- `crocodile-game` uses `node:test`; that can stay as-is or be adapted gradually.

**QR-01 (Phase 1 research):** Validate Vitest performance with representative workspace suites. If the <30s repository fast-test budget is missed, profile setup/isolation, split configs, and shard responsibly; do not silently replace D18 without a new decision.

### 3.2 What gets unit tested

#### Shared packages (`packages/*`)

| Package | Test targets |
|---|---|
| `core` | Game bootstrap config merge, scene lifecycle ordering, screen size calculation, save namespace partitioning, versioned save serialization + migration |
| `input` | Named action → Phaser key mapping, action state machine (idle → pressed → held → released), multi-touch assignment, action priority/conflict resolution |
| `audio` | Bus volume math, mute group state, settings persistence round-trip, suspended-context resume flag |
| `ui` | Button state machine, panel show/hide lifecycle, menu stack push/pop, loading progress interpolation |
| `effects` | Particle pool acquire/release counts, camera shake decay curve, flash alpha envelope, tween completion callbacks |
| `testing` | Scene harness setup/teardown isolation, mock input injection, fake asset loader |
| `tools` | Manifest JSON schema validation, glob→manifest generation, size budget enforcement, link checker URL resolution |

#### Per-game pure-logic modules (`games/<id>/src/systems/`)

| Game | Testable pure modules |
|---|---|
| All | Level data JSON validation against typed schemas (Zod or similar), save-data round-trip, seeded RNG determinism |
| Railway Workshop | Track connectivity solver, route validation, delivery scoring, bridge/tunnel placement rules |
| Wild Pairs | Card shuffle determinism, match detection, scoring formula, album completion logic |
| Canopy Caper | Jump arc calculation, vine swing physics math, fruit collection tracking, level-end trigger |
| Cheese Heist | Guard sight-line intersection, patrol path waypoints, distraction timer, escape-vent trigger |
| Valley of Echoes | Discovery journal dedup, landmark proximity, weather state transitions, creature spawn tables |
| Sparky's Assembly Line | Command interpreter (step, loop, sensor), program validator, scoring optimizer |
| Bit's Grand Adventure | Tile rules engine, function call stack, program step debugger, puzzle solvability checker |
| Coco's Lost Hat | Scene graph integrity, route branching validation, decoration collection logic |
| Hippo's Great Feast | Movement ability unlock state machine, ingredient combination rules, recipe journal |
| Little Chef's Grand Kitchen | Recipe → station dependency graph, customer patience timer, bot command scheduler, kitchen layout validator |
| Critter Tactics | Combat damage formula, critter ability targeting rules, terrain effect modifiers, enemy AI decision tree, turn order, win/loss conditions |

### 3.3 Level/data validation

**Approach:** Every game defines level data in typed JSON; a Tiled workflow must export deterministic validated JSON and never require `.tmx` at runtime. A shared validator in `packages/tools` checks:

1. **Schema conformance** — JSON Schema or Zod schema per game, validated at test time and build time.
2. **Structural integrity** — no dangling references, all required fields present, enum values valid.
3. **Solvability (where feasible)** — for puzzle games, a fast solver verifies every level is completable. For non-puzzle games, a reachability check confirms all areas are accessible.
4. **Content budgets** — warn if a level has zero interactables, zero enemies, or exceeds max entity count.

**Implementation:**
```
packages/tools/src/validate/
  schemas.ts          — shared JSON Schema types
  level-validator.ts  — schema + structural checks
  solver-validator.ts — per-game solver interface + runner
```

Each game provides:
```typescript
// games/railway-workshop/src/data/levels.schema.ts
export const levelSchema = z.object({
  id: z.string(),
  name: z.string(),
  grid: z.array(z.array(z.enum(['empty','straight','curve','cross','station']))),
  deliveries: z.array(z.object({ from: z.string(), to: z.string(), cargo: z.string() })),
  par: z.number().int().positive(),
  unlocks: z.string().optional(),
});

// games/railway-workshop/src/data/levels.solver.ts
export function isSolvable(level: LevelData): SolverResult { ... }
```

**QR-02 (Phase 1 research):** Evaluate Zod vs JSON Schema (Ajv) on representative schemas. Zod is the working hypothesis for TypeScript inference; QR-02 selects the boundary format from measured error quality, type duplication, and suite performance.

---

## 4. Layer 2: Phaser Scene Harness (browser-context tests)

### 4.1 The problem

Phaser 3 requires a real or simulated browser (Canvas/WebGL context, requestAnimationFrame, DOM). Pure-Node testing is not supported by Phaser. We need a strategy that:

- Works in CI (headless browser).
- Is repeatable and deterministic.
- Tests actual scene behavior, not mocked Phaser internals.
- Stays fast enough for PR gates (< 3 min total).

### 4.2 Recommended approach: Vitest + jsdom + Phaser mock layer for pure-logic scenes; Playwright for full browser scenes

**Two-tier Phaser testing:**

#### Tier A: Scene-logic tests (fast, jsdom)

Extract scene *logic* from scene *rendering*. Each scene exposes its rules as pure functions that take state in, return state out. These run under jsdom without a real canvas.

Pattern:
```typescript
// games/railway-workshop/src/scenes/GameScene.ts
export class GameScene extends Phaser.Scene {
  // Thin orchestration: calls pure functions, feeds results to Phaser APIs
  create() {
    this.board = BoardLogic.createEmpty(levelData);
    this.renderBoard();
  }
  onTilePlaced(x: number, y: number, type: TileType) {
    const result = BoardLogic.placeTile(this.board, x, y, type);
    if (result.ok) {
      this.board = result.board;
      this.renderTile(result.changedTile);
      this.playSound('place');
    } else {
      this.showError(result.error);
    }
  }
}

// games/railway-workshop/src/systems/BoardLogic.ts
// Pure functions — testable under jsdom/Node without Phaser
export function createEmpty(level: LevelData): Board { ... }
export function placeTile(board: Board, x: number, y: number, type: TileType): PlaceResult { ... }
export function isRouteConnected(board: Board): boolean { ... }
```

Test:
```typescript
// games/railway-workshop/tests/board-logic.test.ts
import { describe, it, expect } from 'vitest';
import { createEmpty, placeTile, isRouteConnected } from '../src/systems/BoardLogic';
import levels from '../src/data/levels.json';

describe('BoardLogic', () => {
  it('connects two straight tiles end-to-end', () => {
    let board = createEmpty(levels[0]);
    board = placeTile(board, 0, 0, 'straight-h').board;
    board = placeTile(board, 1, 0, 'straight-h').board;
    expect(isRouteConnected(board)).toBe(true);
  });
});
```

**Scope:** Tier A covers all game rules, scoring, state machines, level validation, solver logic, and save/restore. It is the *primary* game-test layer and must be fast (< 5s per game).

#### Tier B: Full scene tests (Playwright)

For tests that need actual Phaser rendering, input handling, or multi-scene flows.

These run in a headless Chromium instance via Playwright, loading the built (or dev-served) game. They test:

1. **Smoke:** Game loads without console errors, Phaser bootstrap completes, first scene renders.
2. **Critical path:** One complete interaction from start → play → meaningful outcome (e.g., complete level 1, match one pair, climb to first checkpoint).
3. **Touch input:** Tap, drag, multi-touch, long-press on the game canvas.
4. **Scene transitions:** Menu → game → pause → resume → complete → menu.
5. **Save/restore:** Set progress, reload page, verify progress persisted.
6. **Responsive resize:** Window resize → game canvas adapts without errors.

Playwright test example:
```typescript
// games/railway-workshop/tests/smoke.spec.ts
import { test, expect } from '@playwright/test';

test('game boots and reaches menu', async ({ page }) => {
  page.on('console', msg => { if (msg.type() === 'error') throw new Error(msg.text()); });
  await page.goto('http://localhost:5173');
  await page.waitForSelector('canvas');
  // Wait for Phaser boot — menu button appears
  await expect(page.locator('text=Play')).toBeVisible({ timeout: 5000 });
});

test('tap places track and train runs', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.locator('text=Play').tap();
  // Select straight track
  await page.locator('[data-track="straight"]').tap();
  // Place on grid
  const canvas = page.locator('canvas');
  await canvas.tap({ position: { x: 200, y: 400 } });
  // Pull throttle
  await page.locator('#throttle').tap();
  // Train animation visible
  await expect(page.locator('.train-engine')).toBeVisible({ timeout: 3000 });
});
```

### 4.3 Phaser test harness package (`packages/testing`)

Provides reusable test infrastructure:

```
packages/testing/src/
  PhaserTestHarness.ts   — launch Phaser game in test context, wait for scene, inject input
  MockInput.ts           — simulate pointer/keyboard events with Phaser event system
  FakeLoader.ts          — bypass asset loading with stub textures/audio
  SceneProbe.ts          — query scene graph, assert game object state, snapshot positions
  PerfCollector.ts       — collect FPS, memory, draw call counters during test
  index.ts
```

Key API sketch:
```typescript
// Create a test game instance
const harness = await PhaserTestHarness.create({
  scenes: [TestBootScene, MyGameScene],
  width: 960, height: 640,
});

// Wait for a scene to be active
const scene = await harness.waitForScene('GameScene');

// Inject a tap at game coordinates
await harness.tap(100, 200);

// Assert a sprite is at expected position
const player = harness.findByName('player');
expect(player.x).toBeCloseTo(150, 0);

// Collect 60 frames of performance data
const perf = await harness.collectPerf(60);
expect(perf.avgFps).toBeGreaterThan(55);

// Teardown
await harness.destroy();
```

**QR-03 (Phase 1 research):** Determine whether the D05 Phaser version works in headless Chromium without WebGL (swiftshader fallback). Test `Phaser.AUTO` with `--disable-gpu` flag. If WebGL is required, document the CI container requirements (GPU emulation, mesa libraries). Fallback: use `Phaser.CANVAS` mode for test runs via an env flag.

### 4.4 Scene isolation rules

- Each test creates and destroys its own Phaser game instance.
- Tests must not share game state.
- Use `FakeLoader` to skip real asset loading in unit-oriented scene tests.
- Full Playwright tests use real assets (built output).

---

## 5. Layer 3: Playwright Browser Flows

### 5.1 Configuration

```typescript
// playwright.config.ts (root)
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './games',
  testMatch: '**/*.e2e.ts',
  timeout: 30000,
  expect: { timeout: 5000 },
  retries: 1,
  workers: 3,             // parallel per game
  reporter: [['html', { outputFolder: 'test-reports' }], ['json', { outputFile: 'test-results.json' }]],
  use: {
    baseURL: 'http://localhost:4173',  // Vite preview
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'tablet-touch',
      use: {
        ...devices['iPad Mini'],   // temporary emulation only; D21 selects the release device
        hasTouch: true,
        viewport: { width: 1024, height: 768 },
      },
    },
    {
      name: 'phone-touch',
      use: {
        ...devices['iPhone 13'],
        hasTouch: true,
      },
    },
    {
      name: 'desktop-chrome',
      use: {
        ...devices['Desktop Chrome'],
        hasTouch: false,
      },
    },
  ],
  webServer: {
    command: 'npm run preview',   // serves site-dist/ (production build)
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
```

### 5.2 E2E test catalog per game

Every game must have at minimum:

| Test | Description | Time budget |
|---|---|---|
| `boot.spec.ts` | Game loads without console errors, Phaser canvas appears, no missing assets | 5s |
| `menu-flow.spec.ts` | Menu → start → pause → resume → quit → menu | 15s |
| `gameplay-core.spec.ts` | One complete interaction (finish level 1, match a pair, reach checkpoint) | 20s |
| `save-restore.spec.ts` | Progress save → page reload → progress still present | 10s |
| `touch-controls.spec.ts` | Every primary control works by tap/drag on tablet viewport | 15s |
| `responsive.spec.ts` | Resize to phone/tablet/desktop — no errors, canvas fills viewport | 10s |

Games with more mechanics add focused E2E tests per mechanic.

### 5.3 Game-specific E2E table

| Game | Extra E2E tests |
|---|---|
| Railway Workshop | Place each track type, rotate, undo, throttle pull, sandbox mode, level completion |
| Wild Pairs | Card flip animation, match detection, wrong-pair feedback, album navigation, habitat selection |
| Canopy Caper | Jump, vine swing, wall jump, glide, fruit collection, hazard hit, checkpoint respawn |
| Cheese Heist | Sneak, dash, hide, distraction throw, guard detection, escape vent |
| Valley of Echoes | Map pan/zoom, landmark discovery, journal entry, weather change, creature interaction |
| Sparky's Assembly Line | Command snap, belt run, program pause/step, loop execution, sensor trigger, scoring |
| Bit's Grand Adventure | Tile placement, program run/step/pause, function call, error highlight, level complete |
| Coco's Lost Hat | Scene tap, swipe navigation, helper choice, decoration apply, replay route change |
| Hippo's Great Feast | Move, dive, charge, spit, pound, glide, ingredient collect, recipe cook |
| Little Chef's Grand Kitchen | Station place, belt connect, recipe start, bot assign, customer serve, time-out handling |
| Critter Tactics | Unit select, move, attack, ability use, enemy-intent display, turn advance, victory, defeat |

---

## 6. Visual Regression Testing

### 6.1 Strategy

Visual regression tests compare screenshots against approved baselines. They catch rendering regressions (Phaser version bumps, asset changes, layout drift) that logic tests miss.

**Scope:** Title screen, gameplay mid-action, completion screen, pause overlay. Not every frame; only key states.

### 6.2 Tooling

**Recommendation: Playwright's built-in `toHaveScreenshot()`** (research-confirm against Percy/Chromatic for budget).

Playwright's native screenshot comparison is:
- Free and local (no SaaS dependency).
- Pixel-diff with configurable threshold.
- Already in the test stack.

```typescript
test('title screen matches baseline', async ({ page }) => {
  await page.goto('/games/railway-workshop/');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(1000);  // let initial render settle
  await expect(page.locator('canvas')).toHaveScreenshot('title.png', {
    maxDiffPixels: 200,
    threshold: 0.05,
  });
});
```

### 6.3 Baseline management

```
games/<game-id>/tests/screenshots/
  title.png
  gameplay-l1.png
  completion.png
  pause.png
```

- Baselines are committed to the repo.
- Regeneration: `npm run test:visual -- --update-snapshots` (or Playwright equivalent).
- CI fails on any visual diff > threshold.
- Diffs are uploaded as CI artifacts for review.

### 6.4 Anti-flake measures

- Use `waitForTimeout` or `waitForFunction` to let Phaser animations settle.
- Disable particle systems during visual tests via a `?test=1` query param that the game reads.
- Use fixed seed RNG so procedural elements (cloud positions, particle drift) are deterministic.
- Run visual tests on a single browser/OS in CI (Chromium, Linux) for consistency.

**QR-06 (Phase 2 research):** Test Playwright screenshot stability across 10 runs on the same Phaser scene. If >2% flake rate (false positives), investigate pixel-diff tolerance tuning or consider Percy's anti-flake infra.

---

## 7. Performance Instrumentation

### 7.1 Built-in performance display

Every game must include a dev-mode performance HUD (toggle with `?debug=1` or a hidden gesture). Required metrics:

| Metric | Source | Display |
|---|---|---|
| FPS (1s rolling average) | `requestAnimationFrame` delta | Number + bar |
| Frame time (ms, 99th percentile over last 120 frames) | `performance.now()` delta | Number + sparkline |
| Active game objects | Count of Phaser display list children | Number |
| Draw calls | `renderer.stats.drawCalls` (WebGL) | Number |
| Texture memory (MB) | `renderer.textures.getTotalGPU()` or estimate | Number |
| JS heap (MB) | `performance.memory.usedJSHeapSize` (Chrome only) | Number |

Implementation in `packages/core/src/PerfDisplay.ts`:

```typescript
export class PerfDisplay {
  private scene: Phaser.Scene;
  private text: Phaser.GameObjects.Text;
  private frameTimes: number[] = [];
  private enabled: boolean;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.enabled = scene.game.config.physics?.arcade?.debug ||
                   new URLSearchParams(window.location.search).has('debug');
    if (this.enabled) this.create();
  }
  // ... collects metrics each frame, updates text object
}
```

### 7.2 Automated performance budgets

Playwright tests assert performance on the built game:

```typescript
test('meets the approved frame budget during representative gameplay', async ({ page }) => {
  const budget = await loadPerfBudget('canopy-caper'); // values resolved by D21/D22
  await page.goto('/games/canopy-caper/?perf=1');
  await enterBusyRepresentativeScene(page);
  const sample = await page.evaluate(() => window.__perf__.sample(10_000));
  expect(sample.avgFps).toBeGreaterThanOrEqual(budget.minAverageFps);
  expect(sample.p99FrameMs).toBeLessThanOrEqual(budget.maxP99FrameMs);
});

test('no memory leak over 5 level replays', async ({ page }) => {
  await page.goto('/games/railway-workshop/?perf=1');
  const before = await page.evaluate(() => window.__perf__.jsHeapMB);
  for (let i = 0; i < 5; i++) {
    await page.locator('#restart').tap();
    await page.waitForTimeout(500);
  }
  const after = await page.evaluate(() => window.__perf__.jsHeapMB);
  expect(after - before).toBeLessThan(10); // MB growth < 10
});
```

### 7.3 Target tablet profiling

**Decision/research gate:** D21 records the actual tablet model(s), OS/browser versions, viewport/orientation, memory, and touch expectations. QR-04 defines and runs the repeatable physical-device profile. D22 then records the frame/load/memory thresholds after a representative Railway Workshop slice is measured. Emulation is useful for repeatable CI but cannot replace the release profile on the selected physical device.

Each game stores the resolved limits in `games/<id>/tests/perf-budget.json` with at least:

| Metric | Required decision |
|---|---|
| Average FPS and P95/P99 frame time | D22 target plus the exact representative busy scene |
| Texture and JS memory | D21 device capacity plus an allowed post-replay growth bound |
| First contentful paint and time to interaction | Test network profile and cold/warm-cache limits |
| Scene transition | Maximum accepted transition duration and preload state |

Until D21/D22 resolve, performance tests may collect baselines but must not claim the release gate passed.

### 7.4 CI perf regression detection

- Store baseline perf numbers per game in `games/<id>/tests/perf-baseline.json`.
- CI compares current run against baseline, fails on >10% degradation.
- Baselines updated only on explicit `npm run perf:update` after manual review.

---

## 8. Asset and License Validation

### 8.1 Asset manifest

Every game declares assets in `game.json`:

```json
{
  "id": "railway-workshop",
  "assets": {
    "images": [
      { "key": "tracks", "path": "assets/images/tracks.png", "license": "LicenseRef-Repository-Original", "author": "Repository owner", "source": "assets/source/tracks.aseprite", "sizeBudgetBytes": 262144 },
      { "key": "train", "path": "assets/images/train.png", "license": "LicenseRef-Repository-Original", "author": "Repository owner", "source": "assets/source/train.aseprite", "sizeBudgetBytes": 524288 }
    ],
    "atlases": [],
    "audio": [
      { "key": "whistle", "path": "assets/audio/whistle.mp3", "bus": "sfx", "license": "CC0-1.0", "author": "Named source author", "source": "https://example.invalid/source-record", "sizeBudgetBytes": 102400 }
    ],
    "fonts": [
      { "key": "ui-font", "path": "assets/fonts/ui.woff2", "family": "Approved UI Font", "license": "OFL-1.1", "author": "Named font author", "source": "https://example.invalid/font-source" }
    ]
  }
}
```

### 8.2 Build-time validation

`packages/tools/src/validate/asset-checker.ts`:

Full production rules apply to every rewritten output. A legacy exception is valid only when named in `packages/tools/migration-manifest.json` with owner, reason, and removal phase; exceptions cannot suppress missing files, browser boot errors, or broken public links.

1. **Manifest completeness:** Every file in a rewritten game's `assets/` is declared; every declared file exists.
2. **No required remote dependencies:** parse HTML/CSS asset-bearing attributes and module imports, then assert through Playwright that startup/gameplay makes no required third-party network requests. Provenance and credit URLs are allowed as inert text.
3. **No absolute machine paths** (scan for `/home/`, `C:\`, `/Users/`).
4. **Size budgets:** Each asset ≤ its `sizeBudget`. Warn on >80%, fail on >100%.
5. **Format checks:** Images are PNG/WebP/SVG (no BMP, TIFF). Audio is MP3/OGG/WAV. Fonts are WOFF2.
6. **License coverage:** Every third-party asset has `license` and `author` fields. Fail on missing.
7. **Hash integrity:** Hashed Vite output filenames are not hand-edited (check against manifest hash).

### 8.3 License inventory script

```
packages/tools/src/license-report.ts
```

Reads all `game.json` + `package.json` files, produces:

```
LICENSES.md  (auto-generated, committed)
```

Lists every third-party asset, its license, author, and source. CI checks this file is up-to-date.

**QR-07 (Phase 2 research):** Evaluate a maintained dependency-license scanner for automated dependency license scanning of `node_modules`. Not urgent; manual `game.json` coverage handles game assets which are the primary risk.

---

## 9. Built-Site Validation

### 9.1 The `site-dist/` contract

After `npm run build`, `site-dist/` is a complete site snapshot. Rewritten local `dist/` outputs are copied to their public IDs; legacy entries remain at original paths; archive copies may also be published under `classic/`; current Critter is always built rather than copied as raw Vite source.

```
site-dist/
  index.html                 ← catalog at /games/
  railway-workshop/
    index.html               ← rewritten Vite output
    assets/                  ← hashed output
  train-tracks.html          ← redirect after Railway release; legacy game before then
  thegame/
    index.html               ← transitional built Critter output until Phase 5
  crocodile-game/            ← untouched legacy entry until Phase 3
  classic/
    train-tracks/            ← preserved archive after Railway work starts
```

### 9.2 Link checker

`packages/tools/src/validate/link-checker.ts`:

- Parse every `.html` file in `site-dist/`.
- Verify all `<a href>`, `<link href>`, `<script src>`, `<img src>` resolve to existing files within `site-dist/`.
- Allow ordinary external credit/source anchors, but flag any external URL used as a required script, stylesheet, font, image, audio, or module dependency unless it is an explicit temporary legacy exception.
- Flag broken relative paths and redirects whose target was not assembled.
- Fail the build on any broken link.

### 9.3 Asset presence check

- Walk `site-dist/` and all `game.json` manifests.
- Every asset referenced in game config must exist in built output.
- For Vite-built games, verify hashed assets in `site-dist/<id>/assets/` are referenced by that output's `index.html`.

### 9.4 No-raw-source check

- Scan `site-dist/` for `.ts`, `.jsx`, `.tsx`, `.vue`, `.scss`, `.less` files — none should exist.
- Scan `site-dist/` for `node_modules` paths — none should appear.
- Scan `site-dist/` for Vite dev server references (`@vite`, `__vite__`, HMR code).

### 9.5 Subdirectory path check

All asset paths must be relative (`./assets/...`) or use the `/games/` prefix. Domain-root paths (`/assets/foo.png`) break on GitHub Pages subdirectory hosting.

---

## 10. Deployment Verification

### 10.1 GitHub Actions pipeline

```yaml
# .github/workflows/deploy.yml — exact action versions are confirmed by TS-A
name: Build, Validate, and Deploy Pages

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - uses: actions/configure-pages@v5
      - run: npm ci
      - run: npm run install:legacy
      - run: npm run lint
      - run: npm run format:check
      - run: npm run typecheck
      - run: npm test
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: npm run validate
      - run: npm run test:e2e
      - run: npm run test:visual
      - run: npm run test:perf
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-artifacts
          path: |
            test-reports/
            test-results.json
            **/tests/screenshots/*-diff.png
      - uses: actions/upload-pages-artifact@v3
        with: { path: site-dist }

  deploy:
    needs: build
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Deploy validated artifact
        id: deployment
        uses: actions/deploy-pages@v4

  post-deploy-verify:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:smoke-live
```

**Research gate:** [TS-A](05-decisions-and-risks.md) verifies the current official action versions and records the one-time repository setting that selects “GitHub Actions” as the Pages source. The workflow must deploy the exact `site-dist/` artifact produced by the green build job; it must not rebuild in the deploy job or commit generated output.

### 10.2 Post-deploy smoke

After deployment, a fast smoke suite runs against the live URLs:

- `https://nikosk.github.io/games/` — catalog loads, every game card links to a working page.
- Each game URL returns 200.
- Each built game's `index.html` contains a `<canvas>` or game container element.
- No console errors on quick load.

### 10.3 Rollback plan

If post-deploy verification fails:
- Revert the source commit or redirect the affected game back to its preserved classic entry.
- Re-run the workflow to publish the prior known-good source state.
- Record the failed URL and browser evidence in the release report.
- Never deploy if the build/validation job failed; `deploy` depends on that exact artifact.

---

## 11. Per-Game Definition of Finished

This operationalizes the AGENTS.md completion criteria into checkable gates. Every game must pass all gates before its rewrite is declared done.

### 11.1 Universal gates (every game)

| # | Gate | How verified |
|---|---|---|
| G1 | Strict TypeScript, lint, and formatting checks pass | `npm run typecheck`, `npm run lint`, `npm run format:check` |
| G2 | All unit tests pass (rules, data, save) | `vitest run` in game package |
| G3 | Level data validates (schema + solvability where applicable) | `npm run validate:levels` |
| G4 | Production build succeeds in the assembled artifact | Per-game Vite output exists at `site-dist/<game-id>/` after `npm run build` |
| G5 | Browser smoke test passes (loads, no console errors) | Playwright `boot.spec.ts` |
| G6 | One complete critical-path interaction works on tablet viewport | Playwright `gameplay-core.spec.ts` |
| G7 | Touch controls work reliably on tablet viewport | Playwright `touch-controls.spec.ts` |
| G8 | Save and restore round-trips | Playwright `save-restore.spec.ts` |
| G9 | Responsive resize works without errors | Playwright `responsive.spec.ts` |
| G10 | Visual regression passes for title/gameplay/completion and representative reduced-motion states | Playwright `toHaveScreenshot` |
| G11 | Performance budgets met on tablet profile | Playwright perf assertions |
| G12 | All assets declared in manifest with licenses | `npm run validate:assets` |
| G13 | No CDN dependencies or domain-root paths outside the `/games/` project base | `npm run validate` |
| G14 | Built game works at live URL | Post-deploy smoke |
| G15 | `README.md` documents game, controls, and credits | Manual review |
| G16 | Classic version preserved under `classic/` | File existence check |

### 11.2 Creative gates (every game)

Required by the AGENTS.md "completion" definition:

| # | Gate | How verified |
|---|---|---|
| C1 | Approved game brief exists and is followed | Brief comparison checklist |
| C2 | Full promised loop, progression, and content target present | Complete playthrough |
| C3 | Original visual direction applied (no placeholder emoji/geometric primitives as final art) | Art review at title, gameplay, completion screens |
| C4 | Important animation has readable anticipation/movement/impact/recovery and a documented reduced-motion alternative | Animation/effect inventory, 0.25× review, normal/reduced Playwright flows |
| C5 | Sound present for important actions, environment, music, and state changes | Audio checklist + device listening |
| C6 | The core interaction is understandable through play and feedback rather than explanatory text alone | Blind playtest with representative players |
| C7 | No blocking browser `alert()`, `prompt()`, or `confirm()` calls | AST/grep check plus playthrough |
| C8 | Restart and return-to-catalog explicit | Manual playthrough |

### 11.3 Game-specific content gates

| Game | Specific content gate |
|---|---|
| Railway Workshop | 12 levels across 3 regions, bridges, junctions, tunnels, sandbox |
| Wild Pairs | 8 habitats × 12 illustrated animals, distinct calls/cues, and a complete album |
| Canopy Caper | 30 climbs, vine swing, wall jump, glide, challenge routes |
| Cheese Heist | 6 rooms, all guard types, hiding, distractions, escape |
| Valley of Echoes | 6–8 connected authored zones, all landmarks, journal entries, restoration puzzles, weather events |
| Sparky's Assembly Line | 20 puzzles, loops, sensors, modules, free build |
| Bit's Grand Adventure | 30 puzzles, functions, sensors, boss puzzles, level editor |
| Coco's Lost Hat | 6 biomes, branching routes, all helper abilities, decorations |
| Hippo's Great Feast | 10 stages, all abilities, recipes, final boss |
| Little Chef's Grand Kitchen | 15 kitchens, all recipes, all station types, endless service |
| Critter Tactics | 18 battles, 4 critters, all enemy types, bosses, custom battles |

---

## 12. Staged Adoption

The quality system cannot be built all at once. It must grow with the codebase.

### Stage 1: Foundation + First Showcase (Railway Workshop)

**Infrastructure delivered:**
- Root `package.json` with npm workspaces (`packages/*`, `games/railway-workshop`).
- Root `tsconfig.json` with strict mode and project references.
- `packages/core/`, `packages/testing/`, `packages/tools/` scaffolded.
- Vitest configured at root with workspace support.
- Playwright configured at root.
- `.github/workflows/deploy.yml` created with quality + deploy jobs.
- `site-dist/` assembly script.

**Research gates that must be complete:**
- QR-01: Vitest performance/configuration evidence.
- QR-02: Zod versus Ajv level-schema evidence.
- QR-03: Phaser browser harness rendering viability.
- QR-04 / D21: Target-device profile and owner device matrix completed.
- QR-05 / TS-A: Pages deployment, propagation, and live-verification strategy confirmed.

**Tests delivered for Railway Workshop:**
- Unit: BoardLogic (track placement, rotation, connectivity, scoring).
- Unit: Level schema validation for all 12 levels.
- Unit: Save/restore round-trip.
- Playwright: Smoke, boot, menu flow, gameplay-core (level 1), touch controls, responsive.
- Visual: Title screen, gameplay level 1, completion screen.
- Perf: FPS budget on tablet profile.
- Asset: Manifest completeness and license check.

### Stage 2: Three Genres (add Wild Pairs, Canopy Caper)

**Infrastructure matured:**
- Scene harness refined across puzzle + platformer genres.
- `packages/ui/` and `packages/effects/` solidifying — tests added.
- Visual regression proven stable across two more visual styles.
- Perf baseline system implemented.
- Asset checker hardened across more asset types (sprite atlases, illustrated cards).
- License inventory script added.

**Research gates that must be complete:**
- QR-06: Playwright screenshot stability across repeated runs.
- QR-07: Automated dependency-license scanner evaluated.
- QR-08: Performance measured on the D21 physical device, not only emulation.

### Stage 3: Adventure Wave (Cheese Heist, Coco, Hippo)

**Infrastructure matured:**
- Character animation testing patterns established.
- Scene-transition testing patterns.
- Dialogue/story testing.
- `packages/audio` fully tested (`AudioContext` mock in jsdom).
- Camera zone testing.

### Stage 4: Systems Wave (Valley, Robot Factory, Code Adventure)

**Infrastructure matured:**
- World streaming / entity management tests.
- Command interpreter shared test suite.
- Level editor validation (editor generates valid levels).
- Save migration tests (classic → new format).

### Stage 5: Flagship Wave (Little Chef, Critter Tactics)

**Infrastructure matured:**
- Kitchen simulation tested as isolated modules.
- Tactical combat rule system fully unit tested.
- Campaign progression tested.
- AI decision tree tested with seeded RNG.

### Stage 6: Factory Product

**Infrastructure matured:**
- `npm run game:create` generates tests alongside code.
- Test templates per game genre.
- Visual inspector tools for level, input, audio, perf debugging.
- Full CI pipeline battle-tested across 11 games.

---

## 13. Tooling Decisions Summary

| Concern | Decision | Confidence | Research needed |
|---|---|---|---|
| Unit test runner | Vitest | High (fits Vite ecosystem) | Cold-start perf with 50+ files |
| Boundary schema validation | Zod working hypothesis | Medium | QR-02 compares Ajv/type duplication/error quality/performance |
| Browser automation | Playwright | High (de facto standard) | None |
| Visual regression | Playwright `toHaveScreenshot` | Medium | Flake rate over 10 runs |
| CI platform | GitHub Actions | High (already on GitHub) | None |
| Pages deployment | Official `configure-pages` / `upload-pages-artifact` / `deploy-pages` actions | High after TS-A | Confirm current versions and Pages source setting |
| Performance measurement | Custom `PerfDisplay` + Playwright `evaluate` | High | Identify actual target tablet |
| License scanning | Manual `game.json` + build check | High for assets | Explore `fossa-cli` for npm deps |
| Phaser test harness | Custom in `packages/testing` | Medium | Headless WebGL viability |
| Link checking | Custom script in `packages/tools` | High | None (trivial HTML parse) |
| Coverage reporting | Vitest built-in (istanbul/v8) | High | None |

---

## 14. Quality Dashboard (proposed)

A single view for repo health, regenerated on each CI run:

```
QUALITY REPORT — 2025-07-10 14:32 UTC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RAILWAY WORKSHOP   ✅ 16/16 gates | 47 tests | ████████████ 94% cov | 58 fps
WILD PAIRS         ⬜ not started
CANOPY CAPER        ⬜ not started
CHEESE HEIST        ⬜ not started
COCO'S LOST HAT     ✅ legacy (no build) | 4 tests | crocodile-game/
HIPPO'S FEAST       ⬜ not started
VALLEY OF ECHOES    ⬜ not started
SPARKY'S ASSEMBLY   ⬜ not started
BIT'S ADVENTURE     ⬜ not started
LITTLE CHEF         ⬜ legacy (CDN Phaser)
CRITTER TACTICS     ⚠️ built but broken live

SHARED PACKAGES
  core               ⬜ not started
  input              ⬜ not started
  audio              ⬜ not started
  ui                 ⬜ not started
  effects            ⬜ not started
  testing            ⬜ not started
  tools              ⬜ not started

DEPLOYMENT           ⚠️ no CI pipeline | manual push-to-Pages
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

This dashboard is generated as `quality-report.json` and rendered in CI summary.

---

## 15. Open Quality Gates

1. **D21 / QR-04:** owner supplies the exact target-device matrix; research produces the physical profiling protocol.
2. **TS-A / QR-05:** confirm official Pages action versions, the one-time Actions source setting, propagation retries, and rollback procedure.
3. **QR-06:** set screenshot tolerance from measured repeatability; do not buy a hosted service without a new owner decision.
4. **D23:** owner resolves the supported browser matrix before compatibility claims or audio/image format decisions.
5. **Coverage policy:** start with risk-based required behavior/branch tests and published coverage reports, not an arbitrary portfolio percentage. Add numeric thresholds only from measured value.
6. **Test change policy:** behavior/data changes include their tests in the same coherent change; no separate owner decision is required.
7. **Baseline DOM checks:** catalog/settings receive semantics, keyboard focus, and contrast automation; game briefs define input alternatives without changing approved content.

---

## 16. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Phaser headless rendering not viable | Browser tests slower, CI more expensive | Fallback: all Phaser tests run in Playwright (slower but reliable). Tier A pure-logic tests still fast. |
| Visual regression flaky | CI noise, team ignores failures | Complete QR-06 before adopting broadly. Start with high tolerance, tighten gradually. |
| Target tablet too weak | Perf budgets unachievable for some games | Profile early (Stage 1). Tune art budgets per game. Consider lower resolution for weak devices. |
| 11 games × full test suite = slow CI | Feedback loop > 15 min | Run focused checks locally/for review branches, but keep the full release suite on every `master` push before deployment. Parallelize without weakening the deploy gate. |
| Owner disagrees with tooling choice | Rework cost | Research tasks explicitly validate before freezing. Vitest and Playwright are strong defaults with clear fallbacks. |
| A legacy CDN dependency stops loading before its rewrite | Silent failure of a catalog entry | Track as a migration-manifest exception and smoke every deploy; if it fails, vendor only with verified license or prioritize that rewrite |
| Large asset files bloat repo | Slow clones and CI | Enforce source/delivery budgets now; do not adopt LFS or a separate asset repository without a measured threshold and explicit research task |

---

## Appendix A: Root Package Scripts (target)

```json
{
  "scripts": {
    "dev": "tsx packages/tools/src/dev.ts",
    "install:legacy": "tsx packages/tools/src/install-legacy.ts",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "test": "tsx packages/tools/src/test.ts",
    "lint": "eslint .",
    "format:check": "prettier --check .",
    "format": "prettier --write .",
    "test:watch": "vitest",
    "test:e2e": "playwright test --grep-invert '@visual|@perf|@live'",
    "test:smoke-live": "playwright test --config playwright.live.config.ts",
    "test:visual": "playwright test --grep @visual",
    "test:visual:update": "playwright test --grep @visual --update-snapshots",
    "test:perf": "playwright test --project=tablet-touch --grep @perf",
    "build": "tsx packages/tools/src/build.ts",
    "validate": "tsx packages/tools/src/validate.ts",
    "preview": "tsx packages/tools/src/preview.ts",
    "game:create": "tsx packages/tools/src/generate.ts",
    "perf:baseline": "tsx packages/tools/src/perf-baseline.ts",
    "report": "tsx packages/tools/src/quality-report.ts",
    "clean": "tsx packages/tools/src/clean.ts"
  }
}
```

## Appendix B: Per-Game Package Scripts (target)

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test --config ../../playwright.config.ts",
    "validate:levels": "tsx ../../packages/tools/src/validate/level-validator.ts --game railway-workshop",
    "validate:assets": "tsx ../../packages/tools/src/validate/asset-checker.ts --game railway-workshop"
  }
}
```
