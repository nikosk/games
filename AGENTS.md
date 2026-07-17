# AGENTS.md

## Purpose

This repository is becoming a small, repeatable game studio for high-quality HTML games published at:

`https://nikosk.github.io/games/`

The existing games are prototypes and concept references. Rewritten games should improve both:

1. **Technically** — one engine, typed modular code, shared production systems, automated builds, tests, and dependable publishing.
2. **Creatively** — stronger gameplay, deliberate progression, original visual direction, animation, sound, and satisfying feedback.

Do not limit a rewrite to reorganizing the existing code. Preserve the concept where it is strong, but replace weak implementation and design freely according to the approved game brief.

## Instructions and document priority

This file applies to the entire repository. A nested `AGENTS.md` may add or override instructions for its directory.

Before changing a game, read instructions in this order:

1. The nearest `AGENTS.md`.
2. The repository architecture document.
3. The game-specific design brief.
4. The current task or implementation plan.
5. The existing source and tests.

If documents conflict, follow the more specific document. Ask the owner when a conflict changes product scope, gameplay, art direction, public URLs, or architecture.

The canonical approved rewrite plan begins at `.plans/README.md`; architecture, quality, media, decisions, and per-game briefs are cross-linked there. The `.lavish/` review artifact is source history only and is not an implementation dependency.

## Product authority

The repository owner makes product and content decisions.

Do not independently change a game's subject matter, tone, difficulty, story, labels, characters, failure rules, or progression for policy reasons. Make those changes only when they are explicitly requested or included in an approved game brief.

Do not replace an approved creative direction with a safer, simpler, or more generic one without asking.

## Non-negotiable technical direction

All rewritten games use:

- **Phaser 3** as the game engine.
- **TypeScript** for game and shared production code.
- **Vite** for development and production builds.
- **npm workspaces** for repository packages.
- Static HTML, JavaScript, CSS, images, and audio as the final GitHub Pages output.

Do not introduce another game engine or application framework without explicit approval.

Do not build custom replacements for Phaser facilities that already solve the requirement well. Use Phaser for scenes, rendering, asset loading, input events, cameras, animation, timing, tweens, and physics where applicable.

Shared code may build clear project conventions on top of Phaser, but it must not hide Phaser behind a large generic abstraction.

## Current state and target state

The repository is still in its legacy state:

- Most games are standalone HTML files containing global JavaScript and CSS.
- `little-chef-kitchen/` uses Phaser from a CDN.
- `thegame/` uses Phaser, Vite, and JavaScript modules.
- There is no root workspace, common engine package, or production build pipeline yet.
- The live Critter Tactics entry is broken because unbuilt Vite source is published.

The target layout is:

```text
AGENTS.md
package.json

classic/
  <preserved original games>

games/
  railway-workshop/
  wild-pairs/
  canopy-caper/
  cheese-heist/
  valley-of-echoes/
  sparkys-assembly-line/
  bits-grand-adventure/
  cocos-lost-hat/
  hippos-great-feast/
  little-chefs-grand-kitchen/
  critter-tactics/

packages/
  core/       # Game startup, lifecycle, screen, save, and shared configuration
  input/      # Phaser action mapping and reusable touch controls
  audio/      # Music, effects, buses, settings, and audio lifecycle
  ui/         # Shared menus, buttons, panels, loading, and transitions
  effects/    # Reusable particles, trails, flashes, and camera effects
  testing/    # Test fixtures, scene harnesses, and browser helpers
  tools/      # Project generator, asset checks, build assembly, and validation

docs/
  architecture.md
  production-plan.md
  art-and-audio.md
  games/
    <game-id>.md

site-dist/    # Generated deployment artifact; never hand-edit
```

Create this structure incrementally. Do not move every legacy game before its replacement work begins.

## Public URL and classic-version rules

- Preserve each current public URL until its replacement is deployed successfully.
- Preserve the original implementation under `classic/` before replacing or heavily restructuring it.
- Do not delete a classic version unless explicitly requested.
- Use committed HTML redirect pages when a public URL must move. GitHub Pages does not process Netlify-style `_redirects` files.
- Production assets must resolve under the `/games/` project path. Do not use domain-root paths such as `/src/main.js`.
- Configure Vite output and asset URLs for GitHub Pages subdirectory hosting.

## Intended game package contract

Each rewritten game should converge on this structure:

```text
games/<game-id>/
  package.json
  vite.config.ts
  game.json
  src/
    main.ts
    config.ts
    scenes/
    systems/
    entities/
    data/
  assets/
    source/       # Editable source assets when appropriate
    images/
    atlases/
    audio/
    fonts/
  tests/
  README.md
```

Not every game needs every subdirectory. Do not create empty architecture for appearance alone.

### `game.json`

Each game manifest should eventually define:

- Stable game ID and title.
- Public path and built entry point.
- Preferred orientation and logical game dimensions.
- Phaser scale mode.
- Initial scene.
- Asset manifests.
- Save-data schema version.
- Shared packages used.
- Game-specific build and test commands when they differ from repository defaults.

Keep the schema small. Add fields only when the build, catalog, or shared engine consumes them.

## Architecture boundaries

### Shared packages should own

- Phaser game bootstrap and configuration conventions.
- Screen sizing, safe areas, fullscreen requests, and resize handling.
- Named input actions and reusable touch-control components.
- Audio buses, loading, playback, mute and volume settings.
- Versioned save files and per-game storage namespaces.
- Loading, pause, settings, completion, and scene-transition components.
- Reusable particles, flashes, trails, hit pauses, and camera effects.
- Debug displays for input, collisions, paths, frame timing, and scene state.
- Asset validation, build assembly, and test helpers.

### Each game should own

- Rules and win conditions.
- Character behavior and movement tuning.
- Level and encounter design.
- Progression and scoring.
- Story, dialogue, and world building.
- Art direction and game-specific interface styling.
- Game-specific animation and effects.
- Special mechanics that do not have proven reuse elsewhere.

### Sharing rule

Do not move code into a shared package merely because two files look similar.

Share a system when:

- Its behavior and public API are clear.
- At least two real games need the same behavior now, or the approved architecture explicitly requires one implementation.
- It contains no game-specific rules or visual identity.
- Sharing removes meaningful duplicated maintenance.
- Consumers can test it without large game-specific fixtures.

Prefer small focused packages and APIs over a single `utils` or `engine` dumping ground.

## Rewrite rules

A rewrite is not complete because the legacy behavior has been reproduced.

Every game rewrite must have an approved brief covering:

- The player fantasy.
- The core interaction loop.
- Controls.
- Progression and content target.
- Visual direction.
- Character and environment animation.
- Sound and music direction.
- Feedback for important actions.
- Completion criteria.

Implement the game in playable sections. A recommended order is:

1. Core interaction with temporary assets.
2. One complete level or scenario.
3. Final input behavior on the target tablet.
4. Approved art target applied to the playable section.
5. Animation and sound target applied to the playable section.
6. Remaining content produced using the proven pipeline.
7. Full-game testing, performance work, and production release.

Temporary assets are allowed during development, but they must be clearly identified. Do not present temporary assets as finished work.

## Visual quality

Treat art and interface work as part of implementation, not optional polish.

- Follow the game-specific art brief.
- Establish a palette, typography, shape language, lighting approach, and animation style before producing large amounts of content.
- Use sprite atlases, SVG, PNG, WebP, shaders, tile maps, and generated textures according to the approved style and technical needs.
- Emoji and simple geometric primitives are acceptable as temporary assets. They are final assets only when the approved art direction explicitly calls for them.
- Avoid mixing unrelated illustration styles within one game.
- Important actions need readable anticipation, movement, impact, and recovery.
- Use particles, camera movement, flashes, trails, and screen shake intentionally. Effects must clarify or strengthen an action rather than obscure play.
- Check title, gameplay, pause, completion, and failure screens as one coherent visual system.

## Gameplay quality

- The core interaction should be understandable through play and feedback, not only explanatory text.
- Controls must be reliable on the target tablet.
- Touch placement and drag interactions must account for fingers obscuring the target.
- Provide immediate visual and audible feedback for accepted and rejected actions.
- Avoid blocking browser dialogs such as `alert()`, `prompt()`, and `confirm()`.
- Make restart and return-to-catalog behavior explicit.
- Tune mechanics with the actual game running; do not rely only on constants copied from the legacy version.
- Add content by introducing a mechanic, exploring it, combining it with earlier mechanics, and then testing mastery.
- Do not inflate a game with modes, collectibles, currencies, or progression that do not strengthen its core concept.

## Audio quality

Sound is required production work for every remake.

- Create a sound list tied to specific player actions and game states.
- Separate music, effects, narration, and interface volume groups when the game uses them.
- Unlock browser audio from a user gesture and handle suspended audio contexts.
- Pause or reduce appropriate audio when the document is hidden.
- Use designed or recorded audio assets when they produce a better result than procedural tones.
- Music should support the identity and pacing of the individual game.
- Do not ship a major interaction silently unless silence is an intentional design choice recorded in the brief.
- Track audio licenses and sources beside the assets.

## Asset rules

- Keep editable source assets when licensing and size make that practical.
- Keep generated browser assets separate from source assets.
- Record origin, license, author, and processing notes for third-party or generated assets.
- Use deterministic asset-generation scripts where possible.
- Do not reference temporary files from absolute machine paths.
- Do not depend on external CDNs for the game engine, fonts, required scripts, or core game assets.
- Fail the build for missing manifest assets.
- Warn or fail on assets that exceed agreed size budgets.
- Never hand-edit hashed Vite output.

## TypeScript and code standards

- Use strict TypeScript for rewritten games and shared packages.
- Prefer explicit domain types over unstructured objects and stringly typed state.
- Keep Phaser scenes focused on orchestration. Move substantial rules and simulations into testable modules.
- Avoid global mutable state.
- Use scene lifecycle hooks to register and clean up listeners, timers, tweens, audio, and resources.
- Avoid one large scene or manager that owns unrelated systems.
- Prefer composition over deep inheritance trees.
- Validate external JSON and save data at boundaries.
- Version save formats and provide migrations when preserving existing progress is required.
- Use seeded randomness for game logic that needs reproducible tests or debugging.
- Comments should explain non-obvious decisions, not narrate straightforward code.

## Performance requirements

- Measure built games on the target tablet, not only a desktop browser.
- Keep frame pacing stable during the busiest expected scene.
- Avoid per-frame allocations in hot update and render paths.
- Pool frequently created particles and gameplay objects when profiling shows value.
- Load assets by scene or content group rather than loading the entire portfolio at once.
- Pause gameplay simulation when the game is not active unless the design explicitly requires otherwise.
- Add spatial indexing and culling for large worlds.
- Include a development performance display for frame time, active objects, draw calls when available, and memory trends.
- Profile before performing speculative micro-optimizations.

## Testing requirements

Testing should protect game behavior and publishing, not merely increase test counts.

### Shared packages

Add unit tests for:

- Input action transitions.
- Save serialization and migrations.
- Audio settings and bus state.
- Level and manifest validation.
- Deterministic rules and seeded randomness.

### Each game

Add tests for:

- Core rules and win/failure conditions.
- Level-data validity.
- Save and restore behavior.
- Any solver, command interpreter, pathfinding, simulation, or procedural generator.
- A browser smoke test that loads the built game without console errors.
- At least one critical path from starting the game to completing a meaningful interaction.

### Before completion

Run the narrowest relevant checks during development, then run:

- Type checking.
- Unit tests for affected workspaces.
- Production builds for affected games.
- Browser smoke tests for affected public paths.
- The repository-level build and deployment validation when shared packages or publishing code changed.

Document any test that cannot be run and why.

## Build and deployment contract

The site deploys automatically on every push. Preserve that behavior while adding a real build stage.

The intended pipeline is:

1. Install dependencies from the lockfile.
2. Type-check shared packages and rewritten games.
3. Run unit and level-data tests.
4. Build every rewritten game with Vite.
5. Copy legacy games that have not yet been replaced.
6. Assemble the catalog and all game output into `site-dist/`.
7. Validate internal links, scripts, styles, images, audio, and fonts.
8. Launch each visible game in a browser smoke test.
9. Upload `site-dist/` as the GitHub Pages artifact.
10. Verify key URLs after deployment.

Never deploy raw Vite source imports or `node_modules` references.

The root catalog and every game must work under:

`https://nikosk.github.io/games/`

## Commands

There is not yet a root workspace. Do not pretend the target commands already exist.

Useful current checks are:

```bash
# Existing Coco integrity suite
cd crocodile-game && npm run check

# Existing Critter Tactics build
cd thegame && npm run build
```

Stage 1 should establish and then document canonical root commands with these responsibilities:

```bash
npm run dev          # Serve the catalog and selected games locally
npm run typecheck    # Type-check all rewritten games and shared packages
npm test             # Run repository tests
npm run build        # Produce site-dist/
npm run validate     # Check the assembled production site
npm run game:create  # Generate a new game package
```

When commands change, update this file and the root `README.md` in the same change.

## Required implementation workflow

1. Run `git status --short` before editing.
2. Read the applicable brief, architecture, source, tests, and current diff.
3. State which playable outcome the change will produce.
4. Identify unrelated modified files and protect them.
5. Implement one coherent section with one writer in the active worktree.
6. Use read-only subagents or reviewers in parallel; do not allow concurrent writers in the same worktree.
7. Run focused checks during development.
8. Run the required production build and browser checks before declaring completion.
9. Inspect the final diff for unrelated formatting or generated-file noise.
10. Report results using the completion format below.

## Working-tree and source-control safety

This repository may contain uncommitted owner work.

- Never discard, overwrite, stash, reset, or reformat unrelated changes.
- Do not assume a dirty file belongs to the current task.
- Avoid broad formatting changes to legacy single-file games.
- Do not edit generated output unless the task is specifically about generation.
- Do not create commits unless the owner explicitly asks.
- Read the repository's commit skill before committing.
- Keep one writer per worktree.
- Use isolated worktrees for intentionally parallel implementation.
- Ask before rewriting history, moving public entry points, or deleting assets.

At the time this file was created, owner work existed in:

- `code-adventure.html`
- `little-chef-kitchen/js/scenes/GameScene.js`
- `hippo.png` as an untracked file

Treat this list as a warning, not a substitute for checking current status.

## Decision and escalation rules

Stop and ask the owner when:

- The task requires changing an approved game concept or creative direction.
- A shared API would constrain game-specific mechanics.
- A rewrite would remove existing content or saved progress.
- A public URL must change.
- An asset has unclear ownership or licensing.
- A large visual direction is missing or contradictory.
- The requested quality cannot be achieved without materially changing scope.

Do not stop for normal implementation details that can be resolved from existing architecture, briefs, tests, or Phaser documentation.

## Completion report

Every implementation response must state:

1. **Playable result** — what now works for the player.
2. **Technical result** — architecture or tooling added or changed.
3. **Visual and audio result** — assets, animation, effects, and sound completed.
4. **Changed files** — concise list grouped by game/package.
5. **Validation** — commands run and whether they passed.
6. **Manual checks** — scenes, controls, viewport sizes, and published paths inspected.
7. **Remaining work** — known limitations, temporary assets, or deferred content.
8. **Owner decisions needed** — only unresolved product or architectural choices.

Do not describe unfinished scaffolding as a completed feature. Completion means the promised playable result exists, is built, and has been checked.
