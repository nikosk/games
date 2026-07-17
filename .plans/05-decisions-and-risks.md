# Decisions, Research, and Risks

> **Plan set:** [Master plan](README.md) · [Architecture](01-architecture.md) · [Tooling and CI](02-tooling-and-ci.md) · [Quality](03-quality-and-testing.md) · [Media production](04-media-production.md) · [Decisions and risks](05-decisions-and-risks.md)

## Status model

- **Open:** evidence or owner choice is missing.
- **In research:** a named owner is running the timeboxed task.
- **Proposed:** evidence exists and a recommendation awaits approval.
- **Resolved:** the decision and evidence link are recorded.
- **Superseded:** a later decision names the replacement.

## Research closure contract

Every research ID below and in a game brief is an executable task, not a placeholder. Before implementation can pass a referenced gate, create `.plans/research/<ID>.md` containing:

1. the question and options compared;
2. a reproducible prototype, command, or measured test;
3. evidence from the target public-path configuration and, when relevant, the target device;
4. constraints, trade-offs, and failure modes;
5. a recommendation and the exact ADR/decision/task it changes.

A research task is **accepted** only when its named question is answered, the evidence can be reproduced, the decision criteria stated in that task are met, and any owner-controlled product choice is explicitly resolved. Default timeboxes: one day for documentation/comparison, two days for a code or media prototype, three days for device/performance measurements. If inconclusive, record why and open a narrower successor task rather than silently assuming an answer.

## Decision backlog

### Platform & Architecture

| ID | Decision | Blocks | Owners | Evidence Needed | Deadline | Status |
|----|----------|--------|--------|-----------------|----------|--------|
| D01 | **Monorepo layout:** use root npm workspaces with `games/`, `packages/`, incremental `classic/`, and generated `site-dist/` exactly as defined in architecture. | Workspace creation, shared packages, all rewrites | Owner | [Target layout](01-architecture.md#1-target-repository-layout) | Decided | Resolved |
| D02 | **Root command contract:** `dev`, `typecheck`, `test`, `build`, `validate`, and `game:create` have the responsibilities defined in AGENTS.md/tooling. | CI and developer workflow | Owner | [Command contract](02-tooling-and-ci.md#command-contract-from-agentsmd) | Decided | Resolved |
| D03 | **Shared package versioning:** private local workspace packages use workspace references and one lockfile; they are not independently published. | Package dependencies and updates | Owner | [ADR-007](01-architecture.md#adr-007-root-workspace-uses-npm-workspaces-with-explicit-dependency-declarations) | Decided | Resolved |
| D04 | **TypeScript strictness:** strict mode applies to every rewritten game and shared package; no exceptions are planned. | Code quality and package contracts | Owner | AGENTS.md | Decided | Resolved |
| D05 | **Phaser version:** select and lock one exact Phaser 3 patch after compatibility research. | Shared engine systems and game compatibility | Owner / Tech lead | Lockfile plus TS-B/FR-01 evidence | Before Phase 1 package implementation | Open |
| D06 | **GitHub Actions pipeline:** build, test, validate, upload `site-dist/`, and deploy with the official Pages artifact actions on every `master` push. | All publications | Owner | [Deployment workflow](03-quality-and-testing.md#101-github-actions-pipeline) | Decided; TS-A confirms versions/settings | Resolved |
| D07 | **Vite public base:** rewritten game `<id>` publishes at `/games/<id>/`; its artifact directory is `site-dist/<id>/`. | URLs and asset resolution | Owner | [ADR-005](01-architecture.md#adr-005-build-output-base-path-is-gamesgame-id) | Decided; AS-01 verifies | Resolved |

### Art Direction

| ID | Decision | Blocks | Owners | Evidence Needed | Deadline | Status |
|----|----------|--------|--------|-----------------|----------|--------|
| D08 | **Hippo art pipeline**: Aseprite → spritesheet → Phaser atlas? Or procedural SVG → texture? Current code draws hippo procedurally. | Hippo spritesheet, animation system | Owner / Artist | Pipeline prototype with one character | Before Phase 3 / HF-M1 | Open |
| D09 | **Kitchen art style**: "illustrated cookbook world" — define specific: watercolor? vector? pixel? Current uses emoji. | All Little Chef art production | Owner / Artist | Art style reference (Pinterest board, AI concept) | Before Phase 5 / LC-M1 | Open |
| D10 | **Critter art style**: "illustrated units" — keep the current cute procedurally-generated style but pixel-art refined? Or full illustrated 2D? Current uses procedural Graphics. | All Critter Tactics unit art | Owner / Artist | Art style sample for one critter + one enemy | Before Phase 5 / CT-M1 | Open |
| D11 | **Enemy visual language**: clockwork/mechanical for Critter Tactics enemies. Confirm direction and detail level. | Enemy spritesheet creation | Owner / Artist | Enemy concept sketch | Before Phase 5 / CT-M2 | Open |
| D12 | **Hippo region backgrounds**: painted dioramas vs layered parallax vs tile-based. Current uses gradient + procedural decorations. | 10 region implementations | Owner / Artist | Background prototype for one region | Before Phase 3 / HF-M3 | Open |

### Audio Direction

| ID | Decision | Blocks | Owners | Evidence Needed | Deadline | Status |
|----|----------|--------|--------|-----------------|----------|--------|
| D13 | **Audio source**: composed originals vs licensed tracks vs procedural (current for Hippo). AGENTS.md says "designed or recorded assets when they produce a better result." | Music production, budget, licensing | Owner / Sound designer | Music style reference per game | Before Phase 1 audio slice | Open |
| D14 | **SFX pipeline**: procedural synthesis (current Hippo), recorded foley, or licensed sound packs? | All game audio production | Owner / Sound designer | SFX style test for one game | Before Railway Workshop audio slice | Open |
| D15 | **Voice acting**: none mentioned in any brief. Critter Tactics "battle voices" is aspirational. Confirm yes/no. | Critter audio production, development time | Owner | Usage decision | Before Phase 5 / CT-M4 | Open |
| D16 | **Audio format**: MP3 vs OGG vs AAC for music. Phaser loader supports all. | Asset pipeline, build size | Owner / Tech lead | Browser support matrix | Before Phase 1 package implementation | Open |
| D36 | **Coco narration scope/method:** Greek remains required; decide whether English also ships and select a legally usable production method for each approved language. | Coco cue production, subtitles, language UI, QA budget | Owner | CO-R05 evidence: cue/cost matrix, quality samples, terms/provenance, QA plan | Before Phase 3 / CO-M01 | Open |

### Tools & Build

| ID | Decision | Blocks | Owners | Evidence Needed | Deadline | Status |
|----|----------|--------|--------|-----------------|----------|--------|
| D17 | **Level editor**: Tiled vs JSON-levels-as-code (current for all three games) vs in-browser level editor. AGENTS.md says "Small in-browser editors are built only where they save repeated manual work." | Level production workflow, 30+ total levels across 3 games | Owner / Tech lead | Time estimate for each approach | Before Phase 4 content production | Open |
| D18 | **Testing stack:** Vitest for rules/data/package tests and Playwright for rendered browser, touch, visual, performance, and live smoke flows. | Test suite and CI | Owner / Tech lead | [Quality architecture](03-quality-and-testing.md#2-quality-architecture-overview) | Decided; AS-02 validates harness boundary | Resolved |
| D19 | **Asset generation**: procedural texture generation (current in Critter BootScene) vs pre-made sprite atlases. Hybrid approach for development speed? | Art production workflow, development iteration speed | Owner / Artist | Asset pipeline decision document | Before Railway Workshop final-media production | Open |
| D20 | **Game generator timing:** implement the production generator in Phase 6 after the portfolio has proven its patterns; use minimal manual scaffolds before then. | Factory tooling | Owner | Phase 6 workstreams W6.1–W6.2 | Decided; revisit only if repeated scaffolding becomes a measured bottleneck | Resolved |

### Target Device

| ID | Decision | Blocks | Owners | Evidence Needed | Deadline | Status |
|----|----------|--------|--------|-----------------|----------|--------|
| D21 | **Target tablet**: which specific tablet(s)? Resolution, aspect ratio, touch latency expectations. "target tablet" referenced repeatedly in AGENTS.md. | Screen manager config, touch zone layout, performance targets | Owner | Device spec sheet | Before Phase 1 package implementation | Open |
| D22 | **Performance target**: stable 60fps or 30fps acceptable for complex scenes? AGENTS.md says "stable frame pacing." | Particle budgets, draw call limits, culling strategy | Owner / Tech lead | Profiling on target device for one game | Before Phase 1 performance budgets; revalidate in CT-M1 | Open |
| D23 | **Browser support**: modern Chrome/Safari only? Or wider? Phaser 3 requires WebGL or Canvas fallback. | Vite config, polyfills, testing matrix | Owner | Browser support matrix | Before Phase 1 package implementation | Open |

### Content Production

| ID | Decision | Blocks | Owners | Evidence Needed | Deadline | Status |
|----|----------|--------|--------|-----------------|----------|--------|
| D24 | **Hippo ability set**: the approved direction proposes dive/charge/spit/pound/glide beyond the legacy jump/double-jump; confirm the exact list and unlock order. | Level design, art spritesheet, tutorial | Owner / Designer | Ability design document with unlock progression | Before Phase 3 / HF-M1 | Open |
| D25 | **Little Chef secret recipes**: how many? unlock conditions? effect on gameplay? | M4/M5 content pipeline | Owner / Designer | Secret recipe list and unlock conditions | Before Phase 5 / LC-M3 | Open |
| D26 | **Little Chef endless mode**: structure — waves, difficulty ramp, score? Separate scene or infinite GameScene variant? | Architecture, content scope | Owner / Designer | Endless mode design doc | Before Phase 5 / LC-M4 | Open |
| D27 | **Critter Tactics 4th critter**: which animal? What ability? How does it differ from existing 3? | Critter art, ability system, balance | Owner / Designer | 4th critter design doc | Before Phase 5 / CT-M1 | Open |
| D28 | **Critter Tactics boss designs**: 2 bosses with multi-stage mechanics. Concepts? Attack patterns? | Boss system, art, audio | Owner / Designer | Boss design doc (concepts + mechanics) | Before Phase 5 / CT-M3 | Open |
| D29 | **Critter Tactics campaign map**: node layout, branch paths, optional battles, rewards. | CampaignMapScene, progression, content order | Owner / Designer | Campaign map layout | Before Phase 5 / CT-M4 | Open |
| D30 | **Critter Tactics upgrade costs**: resource gain per battle vs upgrade cost curve. | Balance, progression | Owner / Designer | Upgrade cost spreadsheet | Before Phase 5 / CT-M4 | Open |

### Save Migration

| ID | Decision | Blocks | Owners | Evidence Needed | Deadline | Status |
|----|----------|--------|--------|-----------------|----------|--------|
| D31 | **Save migration — Hippo:** decide validated import versus fresh start for `hippoFeast`; never delete the legacy key automatically. | Hippo save manager | Owner | Legacy fixtures, mapping/import prototype, and owner choice | Before Phase 3 / HF-M1 | Open |
| D32 | **Save migration — Little Chef:** decide validated import versus fresh start for `littleChefSave`; preserve the legacy key either way. | Little Chef save manager | Owner | Legacy fixtures, level mapping/import prototype, and owner choice | Before Phase 5 / LC-M1 | Open |
| D33 | **Save migration — Critter Tactics**: current keys contain campaign progress and tutorial state; decide validated import versus fresh start. The current deployment failure is not evidence that no saves exist. | Critter save manager | Owner | Fixture inventory, import prototype, and owner choice | Before Phase 5 / CT-M1 | Open |
| D34 | **Save migration — Robot Factory → Sparky:** current `robotFactory` data contains concept progress, saved modules, and unlocks; decide how those map to the new 20-puzzle campaign. | Sparky save/progression design | Owner | Legacy fixtures, mapping table, import/fresh-start comparison | Before Phase 4 / SA-M01 | Open |
| D35 | **Save migration — Code Adventure → Bit:** current `codeAdventure` data contains level progress, stars, settings, and a separate first-play flag; decide import versus fresh start against the rewritten level set. | Bit save/progression design | Owner | Legacy fixtures, level mapping, import prototype, and owner choice | Before Phase 4 / BA-M01 | Open |

---


## Foundation research (FR-01–FR-12)


| ID | Question and deliverable | Decision criteria | Timebox | Needed by | Owner | Status |
|---|---|---|---:|---|---|---|
| FR-01 | Prototype and document the standard Phaser config: resolution, scaling, renderer, physics, and lifecycle. | Railway Workshop boots, resizes, pauses, and destroys cleanly under strict TypeScript with no game-specific core fork. | 2 days | Phase 1 start | Tech lead | Open |
| FR-02 | Specify versioned, namespaced saves and implement one migration/invalid-data prototype. | Round-trip, missing, corrupt, old-version, and quota/error cases have deterministic outcomes and tests. | 2 days | Phase 1 start | Tech lead | Open |
| FR-03 | Compare Phaser audio facilities with a thin bus wrapper; prototype unlock, mute, fades, and hidden-tab behavior. | Music/SFX/UI buses work after first gesture in supported browsers without a parallel audio engine. | 2 days | Phase 1 start | Tech lead | Open |
| FR-04 | Define canonical input actions, bindings, transitions, and remapping rules. | Railway, matching, and platformer control maps fit without game rules entering `packages/input`. | 1 day | Phase 1 start | Tech lead | Open |
| FR-05 | Measure candidate logical dimensions, FIT behavior, safe areas, and orientation handling. | UI and gameplay remain legible with no clipped controls on every D21 viewport. | 2 days | Phase 1 start | Tech lead | Open |
| FR-06 | Compare manifest, atlas, compression, and optimization workflows with one representative asset set. | Pipeline is deterministic, locally licensed, Vite-compatible, and meets the media budget. | 2 days | Phase 2 start | Media implementer + owner approval | Open |
| FR-07 | Prototype the generic metadata envelope plus Railway-specific level data and validation. | Shared schema validates metadata only; game-specific rules remain typed and independently extensible. | 1 day | Railway content authoring | Tech lead | Open |
| FR-08 | Export, load, and play one tagged character atlas with state transitions. | Canopy, Cheese, and Hippo needs fit one convention without sharing character rules. | 2 days | Phase 3 start | Media implementer + owner approval | Open |
| FR-09 | Prototype branching dialogue data, typewriter/skip behavior, localization boundaries, and save restore. | Coco can resume a branch deterministically; presentation is testable and no game story lives in a shared package. | 2 days | Phase 3 start | Tech lead | Open |
| FR-10 | Compare authored-zone transition, tilemap/chunk loading, culling, and save-state strategies in a measured Valley slice. | Selected method meets D22 on D21 while preserving authored landmarks, connected-zone intent, and deterministic saves. | 3 days | Phase 4 start | Tech lead | Open |
| FR-11 | Prototype a renderer-agnostic command AST/executor used by one Sparky and one Bit puzzle. | Deterministic step traces, bounded execution, diagnostics, and two distinct front ends pass tests. | 3 days | Phase 4 start | Tech lead | Open |
| FR-12 | Produce a manifest-based audit of every retained and proposed third-party asset. | Every shipped asset has origin, author, license, processing notes, and redistribution permission; unknown assets are blocked. | 2 days | Before first final-media slice | Media/license lead + owner approval | Open |

---


## Architecture spikes (AS-01–AS-08)

**Status:** all Open until their evidence file is accepted and the affected ADR/decision is updated.

Each spike below represents a decision that cannot be made from desk analysis alone. Each must produce a short written recommendation with evidence.

### AS-01: Vite's `base` configuration for multi-level subdirectory hosting

**Owner:** Tech lead
**Status:** Open

**Question:** Does `base: '/games/railway-workshop/'` work correctly with Vite's dev server, asset hashing, and `import.meta.url` for games at a two-level subpath under GitHub Pages?

**Deliverable:** A minimal test repo or branch that deploys one game with `base: '/games/test-game/'` to GitHub Pages and verifies:
- `index.html` loads
- All JS chunks resolve
- All image/audio assets load
- Relative imports in CSS resolve

**Decision criteria:** If base path works cleanly: adopt for all games. If base path has issues (e.g., dynamic imports, CSS urls): use `base: './'` with adjusted asset directories or a custom Vite plugin.

**Timebox:** 2 hours (or 1 deploy cycle)

### AS-02: Phaser headless mode for Node.js unit tests

**Owner:** Tech lead
**Status:** Open

**Question:** Can Phaser scenes be unit-tested in Node without a DOM/GPU using `Phaser.HEADLESS` or `Phaser.CANVAS` with a mocked canvas?

**Deliverable:** A test that:
- Creates a Phaser.Game with `type: Phaser.HEADLESS`
- Loads a scene
- Exercises a game-system function that uses Phaser types (but not rendering)
- Asserts behavior without crashing or hanging

**Decision criteria:** If headless works reliably: use for all non-rendering tests. If headless is flaky or incomplete: use `jsdom` + `canvas` npm package for a minimal DOM environment, or restrict Phaser-dependent tests to browser only.

**Timebox:** 3 hours

### AS-03: Sprite atlas workflow from Aseprite

**Owner:** Tech lead
**Status:** Open

**Question:** What is the optimal pipeline to produce Phaser-compatible sprite atlases (JSON hash format) from Aseprite source files?

**Deliverable:** A tested pipeline script or documented manual process that:
- Takes `.aseprite` files with tagged animations
- Exports a JSON (hash) atlas + PNG
- Works for both character sheets and tile sets
- Is reproducible and scriptable

**Decision criteria:** If free tooling (Aseprite CLI + custom exporter, or `aseprite-atlas` npm package) produces valid Phaser atlases: wrap in `packages/tools`. If only TexturePacker produces reliable output: document the commercial dependency.

**Timebox:** 4 hours

### AS-04: Shared Vite plugin configuration for Phaser

**Owner:** Tech lead
**Status:** Open

**Question:** What Vite configuration is shared across all games, and what per-game overrides exist?

**Deliverable:** A typed Vite config factory that configures the AS-01 base, local `dist/`, CSS/assets, LAN device testing, sourcemaps, and bundled Phaser/workspace dependencies.

**Decision criteria:** Railway Workshop builds with no runtime CDN or `node_modules` dependency; its local output copies to `site-dist/<id>/` and runs at the project subpath. The factory must expose only evidence-based build overrides and must not absorb game runtime/physics configuration.

**Timebox:** 3 hours

### AS-05: Audio format fallback strategy for Phaser's WebAudio

**Owner:** Tech lead
**Status:** Open

**Question:** What audio format combination provides broadest browser compatibility with acceptable file sizes for game effects and background music?

**Deliverable:** A compatibility table across every browser/device resolved by D21/D23 for OGG, MP3, M4A/AAC, and WebM audio in Phaser's WebAudio loader.

**Decision criteria:** Select the smallest fallback set that plays effects and music after unlock in every supported browser. Include measured size/quality for a representative loop and effect; do not use an unsupported session-share assumption.

**Timebox:** 2 hours (testing with existing audio in thegame/ or crocodile-game/)

### AS-06: GitHub Actions deploy with artifact validation

**Owner:** Tech lead
**Status:** Open

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

**Owner:** Tech lead
**Status:** Open

**Question:** What minimum touch target size and spacing produce reliable direct-touch input on the selected tablets, and what UI patterns reduce finger occlusion?

**Deliverable:** A recommendation document with:
- Minimum touch target sizes (device-independent pixels) based on published research and Apple HIG
- Touch offset patterns that prevent finger covering the target
- Hit target extension strategies (invisible hit areas larger than visual element)
- Validation via a test page on actual tablets

**Decision criteria:** Implement in `packages/ui` as default button/control sizes and optional touch-above offset. Each game can override per control.

**Timebox:** 3 hours

### AS-08: Browser smoke test approach for static HTML games

**Owner:** Tech lead
**Status:** Open

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


## Tooling spikes (TS-A–TS-E)

**Status:** all Open. D06 resolves the deployment architecture, but TS-A still verifies current action versions/settings.

### TS-A: `actions/deploy-pages` vs `peaceiris/actions-gh-pages`

**Owner:** Tech lead
**Status:** Open
**Timebox:** 2 days unless the section narrows it

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

**Owner:** Tech lead
**Status:** Open
**Timebox:** 2 days unless the section narrows it

From the existing `thegame/node_modules/phaser/`:
- Phaser 3.80 ships `phaser/types/phaser.d.ts` and exports types from the main entry.
- The existing JS codebase uses JavaScript, not TypeScript — no type issues have been encountered.
- Minimal game `tsconfig.json` extends the strict base, sets package-local `rootDir`, and includes `src`/tests as appropriate; importing `phaser` supplies its bundled declarations.
- **Constraint**: `skipLibCheck` may skip checking dependency declaration internals, but game/shared source remains strict. Do not weaken strictness to accommodate a library mismatch; isolate a verified mismatch with module augmentation or a documented narrow suppression.
- **Validation**: Create a minimal generated game with `import Phaser from 'phaser'`, type a `Phaser.Types.Core.GameConfig`, build it, and run one typed scene test.

### TS-C: Vite output and assembly configuration

**Owner:** Tech lead
**Status:** Open
**Timebox:** 2 days unless the section narrows it

- **Reference**: Vite docs > Building for Production > Multi-Page App (https://vite.dev/guide/build.html#multi-page-app)
- **Approach**: Each game's `vite.config.ts` builds its own HTML to local `dist/`. The root build/assembly script validates and copies that output to `site-dist/<game-id>/`, keeping compilation isolated from portfolio assembly.
- **Why not a single Vite config with multiple inputs?**: Each game is independent with its own dependencies, assets, and scenes. A single config would bundle all games together, defeating the purpose of isolation.
- **Dev mode**: Each game runs independently via `vite` in its own directory. The root `dev` command is a convenience script, not a proxy.

### TS-D: Asset validation architecture

**Owner:** Tech lead
**Status:** Open
**Timebox:** 2 days unless the section narrows it

- **Current state**: Zero asset validation. Audio files exist in `crocodile-game/assets/audio/`. Images are referenced from `thegame/src/assets/`.
- **Target**: Build-time validation that all `game.json` `assets` entries exist as files and meet size budgets.
- **Implementation**: `packages/tools/src/validate.ts` compares the declared asset manifest with files on disk. Uses `fs.stat` for existence and size checks.
- **Size budgets**: Consume the per-game/media budgets in [04-media-production.md](04-media-production.md); warn/fail thresholds must have one source of truth.

### TS-E: game:create template engine choice

**Owner:** Tech lead
**Status:** Open
**Timebox:** 2 days unless the section narrows it

| Option | Pros | Cons |
|---|---|---|
| Raw JS template literals | Zero dependencies, easy to read | No auto-escaping, verbose for large templates |
| Handlebars | Simple, {{mustache}} syntax, partials | Adds dependency, may be overkill |
| EJS | Popular, <% %> syntax | Adds dependency |
| `fs.cp` + `sed`-style replace | Fast, filesystem-based | Fragile for multi-value substitutions |

**Working hypothesis to validate**: Raw JS template literals with a thin helper. The number of templates is small (<10). The generator is in `packages/tools/` which already exists. A single `replace` helper handles all substitutions:
```js
function scaffold(templateDir, targetDir, vars) {
  for (const file of glob.sync('**/*', { cwd: templateDir, nodir: true })) {
    const content = fs.readFileSync(join(templateDir, file), 'utf8');
    const out = content.replace(/{{(\w+)}}/g, (_, k) => vars[k] ?? `{{${k}}}`);
    fs.mkdirSync(dirname(join(targetDir, file)), { recursive: true });
    fs.writeFileSync(join(targetDir, file), out);
  }
}
```

---


## Media spikes (MS-01–MS-08)

**Status:** all Open; none of the tool candidates is approved merely by appearing in this plan.

### Planned media spikes (before final Railway media)

| ID | Spike | Duration | Question | Success criteria | Owner | Status |
|---|---|---:|---|---|---|---|
| MS-01 | **Aseprite → Phaser atlas pipeline** | 2 hours | Can we produce a multi-frame character atlas in Aseprite, export with JSON frame data, and load it in Phaser with correct animation? | Character animates in Phaser scene with all tagged animations | Media pipeline lead | Open |
| MS-02 | **Tiled → Phaser tile map** | 1 hour | Can we create a multi-layer tile map with collision objects in Tiled, export to JSON, and render in Phaser with correct collisions? | Player walks on tiles, collides with walls, triggers object layer | Tech lead | Open |
| MS-03 | **Vite WebP conversion** | 1 hour | Can Vite's asset pipeline convert PNG to WebP during production build without breaking JSON atlas references? | Built game serves WebP textures; JSON frame references match | Tech lead | Open |
| MS-04 | **Audio format dual-loading** | 1 hour | Does Phaser dual-loading select a working format after unlock on every D23 browser? | Representative music/SFX play on every D21/D23 target with measured size/quality | Audio implementer | Open |
| MS-05 | **SVG → Phaser texture** | 1 hour | Can SVG assets be used as Phaser textures, and do they scale correctly? | SVG renders crisply at multiple display resolutions | Media pipeline lead | Open |
| MS-06 | **Web Audio procedural identity** | 2 hours | Which cue categories benefit from procedural Web Audio versus recorded/designed assets? | Owner approves a scoped cue matrix; no game is forced into a procedural-only identity | Audio implementer + owner approval | Open |
| MS-07 | **Budget enforcement script** | 2 hours | Can we write a `scripts/check-asset-budgets.ts` that validates asset sizes against per-game budgets? | CI fails when a game exceeds its budgets | Tech lead | Open |
| MS-08 | **Reduced-motion effect fallbacks** | 1 hour | Does `prefers-reduced-motion: reduce` correctly disable screen shake, reduce particles, and replace transitions with crossfades? | All effects degrade gracefully; game remains playable | Tech lead | Open |

### Required media-spike output

Each spike produces:
1. A small proof-of-concept scene or script (committed to a spike branch)
2. Documentation of findings (what works, what doesn't, recommended settings)
3. A decision: adopt, adapt, or reject the tool/approach
4. Update to this plan or game-specific notes

### Media tool working hypotheses

| Tool | Spiked? | Adopt? | Replace If... |
|------|---------|--------|---------------|
| Aseprite | MS-01 | ✅ | Friction in atlas export pipeline |
| Tiled | MS-02 | ✅ | Phaser's built-in tile map support is sufficient for simple games |
| Vite + vite-imagetools | MS-03 | ✅ | WebP quality is unacceptable on target devices |
| FFmpeg (audio convert) | MS-04 | ✅ | Alternative: Audacity batch export |
| Inkscape (SVG) | MS-05 | ✅ | SVG textures cause rendering issues in Phaser (fall back to PNG) |
| Web Audio API | MS-06 | ✅ | Owner wants higher-quality recorded audio |
| Node.js asset checks | MS-07 | ✅ | CI becomes too complex |
| prefers-reduced-motion | MS-08 | ✅ | N/A |

---


## Quality research (QR-01–QR-08)

| ID | Deliverable | Decision criteria | Timebox | Deadline | Owner | Status |
|---|---|---|---:|---|---|---|
| QR-01 | Benchmark and profile Vitest on representative workspace suites, with retained `node:test` measured only as legacy context. | Configure/shard Vitest so rewritten/shared fast tests meet the <30s budget; changing D18 requires a new decision. | 1 day | Phase 1 test setup | Tech lead | Open |
| QR-02 | Implement the largest level schema in Zod and Ajv with type/runtime measurements. | Select one boundary-validation approach that preserves strict types, actionable errors, and the <30s fast suite. | 1 day | Railway level schema | Tech lead | Open |
| QR-03 | Run a minimal Phaser scene in CI Chromium across AUTO/CANVAS and required flags. | Browser scene tests render deterministically without hidden GPU assumptions; otherwise document the exact container fallback. | 2 days | Phase 1 browser harness | Tech lead | Open |
| QR-04 | Create and execute a repeatable profile protocol on the D21 device: busy scene, duration, cold/warm load, memory, thermal state. | Two repeated runs produce stable enough measurements to set D22 budgets and CI proxies. | 2 days | Railway final slice | Tech lead | Open |
| QR-05 | Deploy a test artifact and measure Pages propagation plus retry/backoff behavior for live smoke. | Workflow reports real failures, tolerates normal propagation, and preserves the last known rollback route without manual approval. | 1 day + deploy cycles | W0.4 | Tech lead | Open |
| QR-06 | Run identical seeded screenshot cases at least 10 times on pinned CI/browser/font settings. | False-diff rate and tolerance are documented; selected baselines remain sensitive to intentional visual regressions. | 1 day | Phase 2 visual expansion | Tech lead | Open |
| QR-07 | Compare maintained dependency-license scanners against manual package/asset manifests. | Tool is scriptable, maintained, license-policy configurable, and adds actionable coverage without replacing asset provenance checks. | 1 day | Phase 2 license automation | Tech lead | Open |
| QR-08 | Compare physical D21 measurements with the Playwright emulation/throttle profile. | Define a conservative CI proxy and its known limits; physical-device release profiling remains mandatory. | 2 days | Phase 2 performance baselines | Tech lead | Open |

## Game-specific research index

| Prefix | Game | Scheduled phase | Registry |
|---|---|---:|---|
| RW-R## | Railway Workshop | 1 | [Research tasks](06-game-railway-workshop.md#16-research-tasks) |
| WP-R## | Wild Pairs | 2 | [Research tasks](07-game-wild-pairs.md#16-research-tasks) |
| CC-R## | Canopy Caper | 2 | [Research tasks](08-game-canopy-caper.md#16-research-tasks) |
| CH-R## | Cheese Heist | 3 | [Research tasks](09-game-cheese-heist.md#16-research-tasks) |
| VE-R## | Valley of Echoes | 4 | [Research tasks](10-game-valley-echoes.md#17-research-tasks) |
| SA-R## | Sparky's Assembly Line | 4 | [Research tasks](11-game-sparky-assembly.md#17-research-tasks) |
| BA-R## | Bit's Grand Adventure | 4 | [Research tasks](12-game-bit-adventure.md#17-research-tasks) |
| CO-R## | Coco's Lost Hat | 3 | [Research tasks](13-game-coco-hat.md#17-research-tasks) |
| HF-R## | Hippo's Great Feast | 3 | [Research tasks](14-game-hippo-feast.md#14-research-tasks) |
| LC-R## | Little Chef's Grand Kitchen | 5 | [Research tasks](15-game-little-chef.md#14-research-tasks) |
| CT-R## | Critter Tactics | 5 | [Research tasks](16-game-critter-tactics.md#14-research-tasks) |

All listed tasks are **Open** until their brief records an owner and evidence. A game milestone may not begin while an earlier-deadline research task in its registry remains open.

## Portfolio risk register


| # | Risk | Likelihood | Impact | Mitigation |
|---|------|------------|--------|------------|
| RK-01 | Phaser declarations expose a strict-TypeScript gap in a used API | Medium | Medium | Reproduce against Phaser's bundled declarations, isolate with local module augmentation, and use a documented `@ts-expect-error` only for a verified upstream mismatch |
| RK-02 | Workspace complexity slows the maintainer more than it helps — npm workspaces add overhead for a single-person project | Medium | Medium | Keep workspace minimal. Don't add Nx, Turborepo, or Lerna. Revert to flat structure if overhead > benefit. |
| RK-03 | Tablet performance misses D22 under busy scenes | Medium | High | Resolve D21/D22, profile every final slice on the selected device, and tune assets/effects/culling from measurements |
| RK-04 | Audio licensing/provenance is incomplete | Low | High | Track origin, author, license, processing, and redistribution evidence; block unknown assets and use only owner-approved sources |
| RK-05 | Game-specific mechanics do not fit a shared abstraction | Medium | Medium | Keep rules/movement/story/levels in game packages; share only a proven focused contract |
| RK-06 | Rewrite scope expands beyond the approved content targets | High | High | Enforce milestone slices and exact content gates; add scope only through an owner decision |
| RK-07 | Uncommitted owner work conflicts with preservation/migration | Medium | High | Check status/diff before copying, preserve the exact owner state, never overwrite or move unrelated work, and verify checksums |
| RK-08 | Build/deployment complexity makes automatic releases fragile | Medium | High | Implement the complete Phase 0 artifact pipeline in small tested tasks; never weaken pre-deploy gates |
| RK-09 | Source/delivery media growth slows clones and builds | Medium | Medium | Enforce budgets, avoid committing `site-dist/`, deduplicate only where licensing permits, and research LFS before adoption |
| RK-10 | Critter rewrite regresses legacy mechanics or the transitional deployment fix | Medium | High | Keep/build legacy `/thegame/`, archive it before Phase 5, and implement `critter-tactics` independently with briefed parity decisions |

---
