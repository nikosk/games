# Workspace, Tooling, Build, and CI/CD

> **Plan set:** [Master plan](README.md) · [Architecture](01-architecture.md) · [Tooling and CI](02-tooling-and-ci.md) · [Quality](03-quality-and-testing.md) · [Media production](04-media-production.md) · [Decisions and risks](05-decisions-and-risks.md)


## 1. Current State Audit

### Repository layout (71 tracked files across master)

```
/ (no root package.json)
├── AGENTS.md                        # Rules of engagement
├── .gitignore                       # Only ignores .pi-subagents/
├── index.html                       # Catalog — hardcoded links to 11 games
├── *.html legacy games:             # Standalone vanilla HTML (no build)
│   animal-memory.html, code-adventure.html, hippo.html,
│   monkey-banana.html, mouse-adventure.html, robot-factory.html,
│   train-tracks.html, valley-explorer.html
├── crocodile-game/                  # Vanilla JS, no build, Phaser-less
│   ├── package.json                 # name: koko-crocodile-story, scripts: start, check
│   ├── tests/integrity.test.mjs     # Working node:test suite (4 tests)
│   ├── game.js, index.html, styles.css, assets/audio/ (22 MP3 cues)
├── little-chef-kitchen/             # Phaser 3.70 from CDN, no build
│   ├── index.html (CDN phaser.min.js)
│   ├── js/scenes/ (BootScene.js 49KB, GameScene.js 80KB, UIScene.js)
│   ├── js/config.js, js/main.js
│   └── css/style.css
├── thegame/                         # ONLY npm+Phaser+Vite project (JS, not TS)
│   ├── package.json                 # name: critter-tactics, dep: phaser ^3.80.1
│   ├── vite.config.js               # base: './', outDir: 'dist'
│   ├── index.html                   # <script type="module" src="/src/main.js">
│   ├── .gitignore                   # node_modules/, dist/
│   ├── src/main.js                  # Entry — JS modules, not TypeScript
│   │   scenes/BattleScene.js (1480 lines, 50KB), BootScene.js (469 lines),
│   │   MenuScene.js, VictoryScene.js
│   │   data/critters.json, enemies.json, levels.json (10 levels)
│   │   assets/*.png (9 textures)
│   └── dist/                        # Built output (gitignored, never deployed)
│       ├── index.html               # <script> references hashed bundle
│       └── assets/index-XXXX.js (~1.5MB), *.png (grabber inlined as base64)
```

### Key problems confirmed

| Problem | Evidence |
|---|---|
| **Critter Tactics broken live** | `thegame/index.html` references `/src/main.js` which imports `phaser` from `node_modules`. GitHub Pages serves raw source — no Vite transform happens. `dist/` is gitignored. |
| **No root workspace** | No `package.json` at repo root. Two isolated `package.json` files in subdirs. No shared dependency resolution. |
| **No TypeScript anywhere** | Zero `tsconfig.json` files. All game code is plain JS or CDN-loaded Phaser. |
| **No CI/CD** | Zero `.github/workflows/` files. GitHub Pages is configured to serve `master` directly — whatever was last pushed. No build, no test, no validation gate. |
| **No linting or formatting** | No ESLint, Prettier, or equivalent configured. |
| **Single test suite** | Only `crocodile-game/tests/integrity.test.mjs` (4 tests, `node:test`, passes). No test runner shared across packages. |
| **Legacy games are unbuildable** | HTML files are standalone with inline CSS/JS. Cannot be type-checked, tested, or bundled without manual extraction. |
| **No asset validation** | No check for missing files, oversized assets, or broken references. |
| **No game generator** | Every new game must be scaffolded by hand from scratch. |

### Technology versions

- Node: v25.9.0
- npm: 11.12.1
- Vite (in thegame): ^5.4.2
- Phaser (in thegame): ^3.80.1
- Phaser (little-chef-kitchen): 3.70.0 (CDN)

### GitHub Pages deployment model

- **Source**: `master` branch, root directory
- **No `gh-pages` branch** exists
- **No deployment workflow** — every push to master immediately publishes whatever is at HEAD
- The live catalog at `https://nikosk.github.io/games/` serves `index.html` which links to `thegame/` — the broken Vite source

---

## 2. Target Architecture


```
AGENTS.md
package.json                          # Root workspace

classic/                              # Preserved originals
  train-tracks.html
  animal-memory.html
  ...

games/                                # Rewritten games (one npm workspace each)
  train-tracks/
  animal-memory/
  valley-explorer/
  little-chef-kitchen/
  critter-tactics/
  ...

packages/                             # Shared library packages (one npm workspace each)
  core/          # Game startup, lifecycle, screen, save, shared config
  input/         # Phaser action mapping, reusable touch controls
  audio/         # Music, effects, buses, settings, audio lifecycle
  ui/            # Shared menus, buttons, panels, loading, transitions
  effects/       # Particles, trails, flashes, camera effects
  testing/       # Test fixtures, scene harnesses, browser helpers
  tools/         # Project generator, asset checks, build assembly, validation

docs/
  architecture.md
  production-plan.md
  art-and-audio.md
  games/<game-id>.md

site-dist/                            # Generated deployment artifact (gitignored)
  index.html
  games/
    train-tracks/
    critter-tactics/
    ...
```

### Command contract (from AGENTS.md)

```bash
npm run dev          # Serve the catalog and selected games locally
npm run typecheck    # Type-check all rewritten games and shared packages
npm test             # Run repository tests
npm run build        # Produce site-dist/
npm run validate     # Check the assembled production site
npm run game:create  # Generate a new game package
```

---

## 3. Implementation Tasks

### Milestone 0: Analysis & research spikes (BEFORE any editing)

#### TS-C preview: Vite output and assembly configuration
**Goal**: Determine how one Vite config / root workspace serves multiple game entry points without per-game build repetition.
**Question**: Does Vite's `build.rollupOptions.input` support multiple HTML entry points, or should each game pick up via workspace-level `vite.config.ts`?
**Hypothesis to verify in TS-C**: each game builds independently to its local `dist/`; the root assembler copies validated outputs to `site-dist/<game-id>/`. This separates Vite compilation from catalog/legacy assembly.
**Research**: Look at Vite multi-page app docs, `vite.config.ts` for monorepos, and the `@web/dev-server` or `vite --config` approach for dev mode.
**Files**: `thegame/vite.config.js` as reference, Vite docs.

#### TS-B preview: TypeScript + Phaser 3 compatibility
**Goal**: Validate the D05 candidate Phaser patch's bundled declarations by compiling, testing, and building a minimal strict-TypeScript + Vite game.
**Question**: What is the minimum `tsconfig.json` for a game package? Does Phaser's type def require `skipLibCheck: false`?
**Files**: `thegame/node_modules/phaser/types/phaser.d.ts`.
**Risk**: Phaser 3 types are massive (150K+ lines). `strict: true` may surface issues.

#### TS-A preview: GitHub Actions artifact deployment
**Goal**: Design the workflow that builds, validates, and deploys to GitHub Pages.
**Constraints**:
- Must run on every push to master
- Must type-check → test → build → validate → deploy in sequence
- Must upload `site-dist/` as Pages artifact
- Must preserve the legacy games that haven't been rewritten yet
- Current Pages source is `master` root — switching to GitHub Actions means changing Pages source to "GitHub Actions" in repo settings
**Research**: `peaceiris/actions-gh-pages` vs `actions/deploy-pages` vs `JamesIves/github-pages-deploy-action`. Check if `actions/upload-pages-artifact` and `actions/deploy-pages` are the current recommended approach.
**Note**: `dist/` is in `.gitignore` — the workflow must explicitly build first, then deploy the output.

#### Catalog generator design task
**Goal**: Design how `site-dist/index.html` (catalog) is generated.
**Options**:
1. Static hardcoded HTML (current approach — fragile)
2. Template + manifest-based generation (Node script reads game manifests → generates catalog)
3. Vite-powered SPA for the catalog
**Recommendation**: Option 2 — a build script in `packages/tools/` that reads `games/*/game.json` manifests and generates the catalog HTML. This is lightweight and matches AGENTS.md §game.json intent.
**Research**: Check if any existing game has a `game.json`.

#### Resolved constraint: minimal npm workspace tooling
**Goal**: Choose between npm workspaces (built-in), pnpm workspaces, or Turborepo/Nx.
**Constraint**: AGENTS.md says "Use npm workspaces for repository packages." This is a hard requirement — do not introduce pnpm or yarn.
**Question**: Does npm workspaces do enough for our needs? Key requirements:
- Shared dependency hoisting (Phaser available to all games)
- Running scripts across all workspaces (`npm run build -ws`)
- Filtering (`npm run test -w packages/core`)
- No custom task orchestration needed initially
**Conclusion**: npm workspaces is sufficient for Stage 1. Turborepo can be evaluated later if build caching becomes a bottleneck.

### Milestone 1: Root workspace and shared config (FILE CHANGES)

#### Task 1.1: Root package.json
- **File**: `package.json`
- **Workspace root**: private package with `games/*` and `packages/*` workspaces
- **Contents**:
  ```json
  {
    "name": "niko-games",
    "private": true,
    "workspaces": [
      "games/*",
      "packages/*"
    ],
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
    },
    "engines": {
      "node": ">=20",
      "npm": ">=10"
    }
  }
  ```

#### Task 1.2: Root tsconfig.json (base config)
- **File**: `tsconfig.json`
- **Purpose**: Shared TypeScript base config that all packages extend.
- **Key options**:
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "ESNext",
      "moduleResolution": "bundler",
      "strict": true,
      "noUnusedLocals": true,
      "noUnusedParameters": true,
      "exactOptionalPropertyTypes": true,
      "noUncheckedIndexedAccess": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "resolveJsonModule": true,
      "allowImportingTsExtensions": true,
      "noEmit": true,
      "jsx": "preserve",
      "lib": ["ES2022", "DOM", "DOM.Iterable"],
      "types": ["node"]
    },
    "exclude": [
      "node_modules",
      "site-dist",
      "classic",
      "*.html",
      "**/*.js"
    ]
  }
  ```
- **Note**: `skipLibCheck: true` avoids Phaser type definition issues. `allowImportingTsExtensions` enables `.ts` imports in source.

#### Task 1.3: Root .gitignore update
- **File**: `.gitignore`
- **Required additions**:
  ```
  node_modules/
  site-dist/
  dist/
  .tsbuildinfo
  *.tsbuildinfo
  .pi-subagents/
  .DS_Store
  ```
- **Check**: Confirm existing `.pi-subagents/` is already ignored.

#### Task 1.4: Root ESLint + Prettier config
- **Files**: `eslint.config.js`, `.prettierrc.json`, `.prettierignore`.
- **Rule philosophy**: catch correctness/module-boundary issues; TypeScript handles unused/type checks and Prettier handles style.
- **Scope**: rewritten games, shared packages, workflow/tool config, and Markdown plans/docs. Explicitly ignore `classic/`, `site-dist/`, package `dist/`, `node_modules/`, and untouched legacy source so formatting cannot rewrite owner work.
- **Commands**: `npm run lint`, non-mutating `npm run format:check`, and explicit mutating `npm run format`.
- **Validation**: pin compatible flat-config/TypeScript plugin versions and run both non-mutating checks in CI.

#### Task 1.5: Repository-level test command
- **File**: `packages/tools/src/test.ts`.
- **Approach**: Run Vitest-backed workspace tests, then invoke retained legacy suites such as `crocodile-game`'s existing `node:test` command until that game migrates. Propagate the first non-zero exit code and print a per-suite summary.
- **Browser boundary**: Playwright remains a separate `test:e2e`/release gate so fast rules/data tests stay under their time budget. QR-01 validates runner performance; D18 fixes the Vitest + Playwright architecture.

---

### Milestone 2: Package scaffolding

#### Task 2.1: Create `packages/core/` (minimum viable)
- **Purpose**: Phaser game bootstrap, screen sizing, safe areas, fullscreen.
- **Files**:
  - `packages/core/package.json` — name `@games/core`, dependency on the D05-pinned `phaser` version.
  - `packages/core/tsconfig.json` — extends root, references Phaser types.
  - `packages/core/src/index.ts` — export `createGame(config)`, `GameConfig`, screen helpers.
  - `packages/core/src/screen.ts` — scale mode, resize handling, safe area.
  - `packages/core/__tests__/screen.test.ts` — initial tests for resize logic (if any).
- **Important**: Keep minimal. Do not build the full engine upfront. Ship only what the first game (Railway Workshop / Train Tracks rewrite) needs.
- **Validation**: `npm run typecheck -w packages/core` passes. `npm run test -w packages/core` passes.

#### Task 2.2: Create `packages/tools/`
- **Purpose**: Build orchestrator, catalog generator, asset validator, game generator.
- **Files**:
  - `packages/tools/package.json` — name `@games/tools`, type: module (ESM).
  - `packages/tools/src/build.ts` — orchestrate local game builds and assemble `site-dist/`.
  - `packages/tools/src/validate.ts` — check links, manifests, assets, HTML, paths, and migration entries.
  - `packages/tools/src/install-legacy.ts` — run lockfile installs only for migration entries with `legacy-vite-build`.
  - `packages/tools/src/test.ts` — run workspace and retained legacy fast suites.
  - `packages/tools/src/dev.ts`, `preview.ts`, `clean.ts` — canonical safe workflow commands.
  - `packages/tools/src/generate.ts` — Phase 6 generator.
  - `packages/tools/src/catalog.ts` — generate catalog from game and migration manifests.
  - `packages/tools/tsconfig.json`.

#### Task 2.3: Create shared packages with their first proven capability
Create `input`, `audio`, `ui`, `effects`, and `testing` during W1.2–W1.5, not as empty placeholders. Each new package must include `package.json`, strict `tsconfig.json`, a focused public export used by Railway Workshop, and at least one relevant test/consumer check. Workspace globs do not require pre-creating empty directories.

#### Task 2.4: Create `games/railway-workshop/` as first game package
- **Purpose**: Establish the game package contract through the approved first showcase.
- **Files**:
  - `games/railway-workshop/package.json` — name `@games/railway-workshop`, dependencies on the required `@games/*` packages and the pinned Phaser version.
  - `games/railway-workshop/tsconfig.json` — extends root.
  - `games/railway-workshop/vite.config.ts` — builds locally to `dist/` with public base `/games/railway-workshop/`.
  - `games/railway-workshop/game.json` — game manifest (see schema in AGENTS.md).
  - `games/railway-workshop/src/main.ts`, `src/config.ts`, `scenes/`, etc.
- **Note**: This is the _plan_ for the file structure. The actual game implementation is a separate task.

---

### Milestone 3: Build, CI/CD, and deployment

#### Task 3.1: Vite config convention per game
- **Pattern**: Each game package has `vite.config.ts`:
  ```ts
  import { defineConfig } from 'vite';

  export default defineConfig({
    // Concrete configs interpolate the manifest ID; AS-01 verifies this path.
    base: '/games/<game-id>/',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: 'index.html',
      },
    },
  });
  ```
- **Assembly boundary**: Vite owns only the package-local `dist/`. `build.ts` owns cleaning and populating `site-dist/`, so a game build cannot erase another game or a legacy entry.

#### Task 3.2: Catalog generation script
- **File**: `packages/tools/src/catalog.ts`
- **Logic**:
  1. Scan and schema-validate `games/*/game.json`.
  2. Merge not-yet-replaced legacy entries from the migration manifest.
  3. Copy each manifest-declared catalog icon to a deterministic `site-dist/catalog-assets/<id>.<ext>` path and generate `site-dist/index.html` from the approved template.
  4. Fail on duplicate IDs/public paths/order values, missing icons, or catalog links absent from the assembly inventory.
- **Edge cases**:
  - Legacy games not yet rewritten: their links must still work. The build script copies `classic/` files verbatim.
  - Sorting/ordering: game manifest should have an `order` field.
- **Visual/content constraint**: W0.5 converts the current catalog to a deterministic template without redesigning its approved copy, card order, or visual identity. Any catalog redesign is a separate owner-approved brief.
- **Validation**: Generated catalog contains all games, links only to assembly-inventory outputs, and passes visual regression against the approved current catalog until a redesign is approved.

#### Task 3.3: Build assembler script
- **File**: `packages/tools/src/build.ts`
- **Pipeline**:
  1. Remove and recreate `site-dist/`; never clean package source or `classic/`.
  2. For each rewritten game, run its Vite build and verify `games/<game-id>/dist/index.html`.
  3. Copy each game `dist/` to `site-dist/<game-id>/`.
  4. Copy every not-yet-replaced legacy entry to its original relative path and install committed redirects for replaced URLs from the migration manifest.
  5. Generate `site-dist/index.html` and catalog-only local assets.
  6. Write an assembly inventory containing source manifest, output path, and checksum.
- **Failure policy**: Build fails and leaves no publishable artifact if any game build/copy/catalog step fails. Typecheck, tests, and `npm run validate` remain explicit commands and separate CI gates.

**Migration manifest:** `packages/tools/migration-manifest.json` is the temporary source of truth for public entries until all rewrites ship. Each record has `{ catalogId, sourcePath, outputPath, strategy, replacementId?, exceptionIds[] }`, where strategy is:

- `copy-file` for a standalone legacy HTML file and its local sibling assets;
- `copy-directory` for an already self-contained directory;
- `legacy-vite-build` for current `thegame/`: run `npm ci` and `npm run build` in that directory, then copy `dist/` to `site-dist/thegame/`;
- `rewrite` for a workspace game's local `dist/` copied to `site-dist/<id>/`;
- `redirect` for an original URL whose validated replacement is live.

The manifest validator rejects duplicate output paths, missing sources, a redirect without a built target, and an exception without an owner, reason, and removal phase. Legacy CDN/raw-script exceptions may be allowlisted only for untouched entries; rewritten outputs have no exceptions. The transitional `legacy-vite-build` removes Critter Tactics' current raw-source failure before its Phase 5 rewrite.

#### Task 3.4: Validation script
- **File**: `packages/tools/src/validate.ts`
- **Checks**:
  1. All HTML files parse (using `node-html-parser` or regex basic checks)
  2. All `<script>` and `<link>` references resolve within `site-dist/`
  3. Every catalog entry resolves to either a rewritten output directory or a preserved legacy file/directory recorded in the migration manifest
  4. No `.ts` or raw Vite source files leaked into `site-dist/`
  5. No oversized assets (configurable limit, e.g. > 2MB warns)
  6. (Optional) Each game entry HTML has a `<title>` that matches the manifest
- **Severity**: Fail the build for missing references and leaked source files. Warn for oversized assets.

#### Task 3.5: GitHub Actions workflow
- **File**: `.github/workflows/deploy.yml`
- **Trigger**: `push` on `master`
- **Jobs**: Implement the canonical build → deploy → post-deploy workflow in [Quality §10.1](03-quality-and-testing.md#101-github-actions-pipeline). The build job installs from lockfiles (including the transitional `thegame/` build), type-checks, tests, builds, validates, runs Playwright/visual gates, and uploads exactly one Pages artifact. The deploy job only deploys that artifact. The final job runs live smoke tests with retry/backoff for Pages propagation.
- **Important prerequisite**: In repository Settings → Pages, switch Source from branch publishing to GitHub Actions once TS-A confirms the current UI/action versions. Record the setting change and rollback procedure.
- **Environment protection**: Do not add a manual approval that would violate automatic deployment on every push. Use the `github-pages` environment for deployment URL/status only unless the owner explicitly changes this requirement.
- **Artifact budget**: Define a measured portfolio limit in validation; do not rely solely on the platform maximum.
- **Spike**: TS-A confirms exact official action versions and required permissions before the workflow file is authored.

#### Task 3.6: Incremental classic preservation
- **Phase 0 action**: Create the archive layout, preservation manifest schema, checksum validator, and redirect templates. Do not move untouched games.
- **Per-game action**: Immediately before a rewrite changes its source/public entry, copy the complete legacy implementation and all local dependencies to `classic/<legacy-id>/`; record source commit, original path, checksum, and migration status.
- **Public behavior**: Before replacement, the assembler keeps the original URL working. After replacement passes all gates, that original path becomes a committed redirect to the new ID while the archive remains available for rollback/comparison.
- **Directory games**: Copy `crocodile-game/`, `little-chef-kitchen/`, and `thegame/` in full when their phases begin. Do not symlink archives and do not move unrelated root assets without traced references and owner approval.
- **Verification**: Compare checksums, smoke the archived entry, smoke the original public path, then test a redirect rollback before marking G16 complete.

#### Task 3.7: Browser smoke test
- **Tool**: Playwright (spike recommended — evaluate vs Puppeteer).
- **Integration**: Add a script in `packages/tools/` that:
  1. Starts a local server serving `site-dist/`
  2. Launches browser (headless)
  3. Visits the catalog page and each game entry
  4. Checks: no console errors, page loaded, expected canvas/div present
  5. For games using Phaser: verify canvas exists and has non-zero dimensions
- **File**: `packages/tools/src/smoke.ts`
- **Run as**: Part of `npm run validate` (optional, or CI-only if Playwright install is heavy)
- **Spike**: Check if `@playwright/test` is overkill. A minimal `playwright` script with `chromium.launch()` may suffice.

---

### Milestone 4: Game generator

#### Task 4.1: Template structure
- **Directory**: `packages/tools/templates/`
- **Templates**:
  - `phaser-game/` — default game package structure
  - Template coverage: package/TS/Vite/manifest config, `main.ts`, config, Boot/Game scenes, HTML, README, one unit test, and one Playwright smoke test. Exact template file extension/engine is decided by TS-E.
- **Template engine**: Use Node's built-in string replacement or a minimal library (handlebars) — but reduce dependencies. Raw string template literals work for MVP.

#### Task 4.2: Generator script
- **File**: `packages/tools/src/generate.ts`
- **Interface**: `tsx packages/tools/src/generate.ts <game-id> [--type puzzle|platformer|story|world|tactics]`
- **Steps**:
  1. Validate game ID: lowercase kebab-case and unique across manifests.
  2. Check `games/<game-id>/` and the requested public path do not already exist.
  3. Accept or prompt for title, description, orientation, logical dimensions, and template type.
  4. Scaffold files from templates, substituting values.
  5. Schema-validate the generated manifest and run `npm install` to link the workspace.
  6. Run generated-package typecheck, unit test, and production build; delete the generated directory on failure only after explicit confirmation.
  7. Print the exact development and validation commands.
- **Type argument**: Selects scene/config examples, never game rules. Phase 6 begins with `puzzle`, `platformer`, `story`, `world`, and `tactics` templates derived from shipped games.

#### Task 4.3: Update game.json manifest schema
- **Proposed schema** (from AGENTS.md, concretized):
  ```json
  {
    "$schema": "https://raw.githubusercontent.com/nikosk/games/master/schemas/game.json",
    "id": "railway-workshop",
    "title": "Railway Workshop",
    "description": "Build track paths and watch the train go choo-choo!",
    "icon": "assets/images/catalog-icon.webp",
    "order": 1,
    "publicPath": "/games/railway-workshop/",
    "entryPoint": "index.html",
    "settings": {
      "orientation": "landscape",
      "logicalWidth": 960,
      "logicalHeight": 640,
      "scaleMode": "FIT"
    },
    "initialScene": "BootScene",
    "saveData": {
      "schemaVersion": 1,
      "keys": ["games.railway-workshop.save"]
    },
    "dependencies": {
      "packages": ["@games/core", "@games/input", "@games/audio", "@games/ui", "@games/effects"]
    },
    "assets": {
      "images": [],
      "atlases": [],
      "audio": [],
      "fonts": []
    }
  }
  ```
- **Validation**: Add a JSON Schema file at `schemas/game.json`. Generator validates output against schema. Build-time validates all `game.json` files.

---

### Milestone 5: Local development workflow

#### Task 5.1: Root dev command
- **Script**: `npm run dev -- --game <game-id>`
- **Implementation**: `packages/tools/src/dev.ts` validates the ID, generates a development catalog, and starts the selected game's Vite server with network access for tablet testing. With no `--game`, it serves a watch-built catalog and all legacy entries, while rewritten cards link to their individually startable dev command.
- **Contract**: Print the local and LAN URLs, preserve the production `/games/<id>/` base behavior, forward shutdown signals, and fail clearly on port conflicts. Per-game `npm run dev -w @games/<id>` remains available for direct HMR.

#### Task 5.2: Per-game dev server
- **Each game's `package.json`**:
  ```json
  {
    "scripts": {
      "dev": "vite",
      "build": "vite build",
      "preview": "vite preview",
      "typecheck": "tsc --noEmit",
      "test": "vitest run"
    }
  }
  ```
- **Dev mode**: `npm run dev -w @games/railway-workshop` starts Vite with HMR for that game only.

#### Task 5.3: Type-checking across workspaces
- **Root command**: `npm run typecheck` runs each workspace's strict `tsc --noEmit` via npm workspaces.
- **Project references**: add only if measured typecheck time justifies the added config; they must not change the public package boundaries.
- **Watch mode**: run `npm run typecheck -- --watch -w @games/<id>` for the active game/package rather than starting portfolio-wide watchers.

---

## 4. Research Spikes (Detailed)

### TS-A: official Pages artifact deployment

| Aspect | `actions/deploy-pages` | `peaceiris/actions-gh-pages` |
|---|---|---|
| Official GitHub | ✅ | ❌ (third-party but popular) |
| Requires Pages source set to "GitHub Actions" | ✅ | ❌ (deploys to gh-pages branch) |
| Deploys from artifact | ✅ (`upload-pages-artifact`) | ✅ (from a directory) |
| Token management | Automatic via `GITHUB_TOKEN` | Automatic via `GITHUB_TOKEN` |
| Supports subdirectory deploy | ✅ (artifact path) | ✅ (`publish_dir`) |
| Custom domain | ✅ | ✅ |

**Decision**: Use `actions/deploy-pages` + `actions/upload-pages-artifact`. This is the GitHub-recommended approach and avoids creating a `gh-pages` branch. The one-time setting change ("Pages > Source > GitHub Actions") must be documented in the PR.

### TS-B: TypeScript + Phaser 3 compatibility check

From the existing `thegame/node_modules/phaser/`:
- Phaser 3.80 ships `phaser/types/phaser.d.ts` and exports types from the main entry.
- The existing JS codebase uses JavaScript, not TypeScript — no type issues have been encountered.
- Minimal game `tsconfig.json` extends the strict base, sets package-local `rootDir`, and includes source/tests as appropriate; importing `phaser` supplies bundled declarations.
- **Constraint**: `skipLibCheck` may skip dependency declaration internals, but source remains strict. Handle verified mismatches through narrow module augmentation or documented suppression, never broad permissive settings.
- **Validation**: Generate a minimal game, type a `Phaser.Types.Core.GameConfig`, build it, and run one typed scene test.

### TS-C: Vite output and assembly configuration

- **Reference**: Vite docs > Building for Production > Multi-Page App (https://vite.dev/guide/build.html#multi-page-app)
- **Approach**: Each game's `vite.config.ts` builds its own input HTML to local `dist/`. The root build script iterates games, validates each result, and copies it to `site-dist/<game-id>/`.
- **Why not a single Vite config with multiple inputs?**: Each game is independent with its own dependencies, assets, and scenes. A single config would bundle all games together, defeating the purpose of isolation.
- **Dev mode**: Each game runs independently via `vite` in its own directory. The root `dev` command is a convenience script, not a proxy.

### TS-D: Asset validation architecture

- **Current state**: Zero asset validation. Audio files exist in `crocodile-game/assets/audio/`. Images are referenced from `thegame/src/assets/`.
- **Target**: Build-time validation that all `game.json` `assets` entries exist as files and meet size budgets.
- **Implementation**: `packages/tools/src/validate.ts` compares the declared asset manifest with files on disk. Uses `fs.stat` for existence and size checks.
- **Size budgets**: Read the approved per-game/media budgets from [04-media-production.md](04-media-production.md); do not duplicate thresholds in tooling.

### TS-E: `game:create` template engine choice

| Option | Pros | Cons |
|---|---|---|
| Typed template strings/helpers | Zero runtime dependency, easy to debug | Must implement strict variable validation and escaping |
| Handlebars | Simple, {{mustache}} syntax, partials | Adds dependency, may be overkill |
| EJS | Popular, <% %> syntax | Adds dependency |
| `fs.cp` + `sed`-style replace | Fast, filesystem-based | Fragile for multi-value substitutions |

**Working hypothesis to validate**: typed template files plus a strict replacement helper. It must reject unknown/missing variables, escape by target context, write into a temporary directory, schema-validate/typecheck/test/build the result, and only then rename atomically to the requested game directory. TS-E compares this with a small maintained template library before adoption.

---

## 5. File Change Summary (all files referenced in plan)

### Files to create
| File | Purpose | Milestone |
|---|---|---|
| `package.json` (root) | npm workspace root | 1.1 |
| `tsconfig.json` (root) | Shared TypeScript base | 1.2 |
| `eslint.config.js` | Flat lint configuration and package-boundary rules | 1.4 |
| `.prettierignore` | Protect legacy/classic/generated output from formatting | 1.4 |
| `.prettierrc.json` | Formatting rules | 1.4 |
| `packages/core/package.json` | Core engine workspace | 2.1 |
| `packages/core/tsconfig.json` | Core TS config | 2.1 |
| `packages/core/src/index.ts` | Core exports | 2.1 |
| `packages/core/__tests__/screen.test.ts` | Core tests | 2.1 |
| `packages/tools/package.json` | Tools workspace | 2.2 |
| `packages/tools/tsconfig.json` | Tools TS config | 2.2 |
| `packages/tools/src/build.ts` | Build orchestrator | 2.2 / 3.3 |
| `packages/tools/src/validate.ts` | Output validator | 2.2 / 3.4 |
| `packages/tools/src/generate.ts` | Game generator | 2.2 / 4.2 |
| `packages/tools/src/catalog.ts` | Catalog generator | 2.2 / 3.2 |
| `packages/tools/src/smoke.ts` | Browser smoke test | 3.7 |
| `packages/tools/src/install-legacy.ts` | Lockfile install for `legacy-vite-build` entries | W0.4 |
| `packages/tools/src/test.ts` | Workspace + retained legacy fast-test orchestration | 1.5 |
| `packages/tools/src/dev.ts`, `preview.ts`, `clean.ts` | Safe canonical workflow commands | 5.1 |
| `packages/tools/templates/phaser-game/` | TS-E-selected strict generator templates | 4.1 |
| `packages/input/` | First Railway-consumed input API + tests | W1.2 |
| `packages/audio/` | First Railway-consumed audio API + tests | W1.3 |
| `packages/ui/` | First Railway-consumed UI API + tests | W1.4 |
| `packages/effects/` | First Railway-consumed effects API + tests | W1.5 |
| `packages/testing/` | Vitest/Playwright fixtures proven by Railway | W1.13 |
| `games/railway-workshop/` (multiple files) | First game rewrite | 2.4 |
| `.github/workflows/deploy.yml` | CI/CD pipeline | 3.5 |
| `schemas/game.json` | Game manifest schema | 4.3 |

### Incremental preservation copies

Nothing is bulk-moved in Phase 0. Immediately before each phase edits a game, copy its complete traced dependency set and verify it:

| Phase | Legacy entries copied to `classic/` |
|---:|---|
| 1 | `train-tracks.html` and referenced local assets |
| 2 | `animal-memory.html`, `monkey-banana.html`, and referenced local assets |
| 3 | `mouse-adventure.html`, full `crocodile-game/`, `hippo.html`, and traced Hippo assets |
| 4 | `valley-explorer.html`, `robot-factory.html`, `code-adventure.html`, and referenced local assets |
| 5 | full `little-chef-kitchen/` and full transitional `thegame/` source/build inputs |

Do not move/delete unrelated root media. The preservation manifest—not filename guessing—defines each archive's dependency set.

### Files to modify
| File | Change | Milestone |
|---|---|---|
| `.gitignore` | Add `node_modules/`, `site-dist/`, `dist/`, `.tsbuildinfo`, `.DS_Store` | 1.3 |
| `thegame/` | Keep as transitional legacy source/build; do not partially convert or rename it | 3.3, W0.4 |
| `games/critter-tactics/` | Create as a fresh strict-TypeScript workspace in Phase 5 | W5.6 |
| `thegame/vite.config.js`, `thegame/src/**` | Keep unchanged for the W0.4 transitional build; archive in Phase 5 | W0.4, W5.10 |
| `little-chef-kitchen/` | Keep public/unchanged until Phase 5; new implementation lives in `games/little-chefs-grand-kitchen/` | W5.1, W5.10 |
| `index.html` | Preserve as catalog design input; generator owns `site-dist/index.html`, never hand-edit generated output | W0.5 |

---

## 6. Dependencies and Constraints

### Hard constraints (from AGENTS.md)
1. "Use Phaser 3 as the game engine" — no other game engine
2. "Use TypeScript for game and shared production code"
3. "Use Vite for development and production builds"
4. "Use npm workspaces for repository packages" — no pnpm/yarn
5. "Do not build custom replacements for Phaser facilities"
6. "Do not delete a classic version unless explicitly requested"
7. "Preserve each current public URL until its replacement is deployed successfully"
8. "Production assets must resolve under `/games/` project path"
9. "Never deploy raw Vite source imports or `node_modules` references"
10. "Use committed HTML redirect pages when a public URL must move"

### Implementation risks
| Risk | Impact | Mitigation |
|---|---|---|
| GitHub Pages source change breaks existing deployment temporarily | Medium | Test workflow on a fork or branch first. Schedule switch for low-traffic time. |
| TypeScript migration of the legacy `BattleScene.js` is disruptive | High | Keep the transitional legacy build intact; do not partially migrate it. Implement the approved Critter rewrite as a fresh strict-TypeScript package in Phase 5. |
| npm workspace hoisting produces Phaser version skew | Low | Require the exact D05 version in every consumer plus one root lockfile/override; validate duplicates |
| Assembly copies stale or partial local output | Medium | Clean each game `dist/`, clean `site-dist/` once, verify inventory/checksums, and fail atomically |
| Playwright installation increases CI time | Medium | Cache supported dependencies where safe and parallelize tests; browser gates remain mandatory before deployment |
| Preservation/redirect timing breaks bookmarks | High | Copy before edits, keep original URLs until release, then redirect old paths to validated replacements and test rollback |

### Research dependencies (pre-implementation)
1. **TS-A / QR-05:** confirm official Pages actions, setting, propagation, and rollback behavior.
2. **D05 / TS-B:** compile/build/test a strict-TypeScript game against the selected exact Phaser patch.
3. **AS-01 / TS-C:** verify local Vite output, assembly copy, and `/games/<id>/` resolution.
4. **QR-03:** verify CI browser renderer requirements.
5. **TS-D / MS-07:** validate manifest/license/budget enforcement with actionable failures.

---
