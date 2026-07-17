# Art, Animation, Effects, and Audio Production

> **Plan set:** [Master plan](README.md) · [Architecture](01-architecture.md) · [Tooling and CI](02-tooling-and-ci.md) · [Quality](03-quality-and-testing.md) · [Media production](04-media-production.md) · [Decisions and risks](05-decisions-and-risks.md)


**For:** 11 game remakes on a shared Phaser 3 + TypeScript + Vite foundation
**Repository:** `nikosk/games` — GitHub Pages static deployment
**Target quality:** Studio-quality 2D games with intentional visual direction, animation, sound, and music

---

## Table of Contents

1. [Asset Layout Convention](#1-asset-layout-convention)
2. [Art Bibles & Creative Direction](#2-art-bibles--creative-direction)
3. [Concept Approval Steps](#3-concept-approval-steps)
4. [Sprite, Atlas & Tile Workflows](#4-sprite-atlas--tile-workflows)
5. [Animation Production System](#5-animation-production-system)
6. [Sound & Music Production System](#6-sound--music-production-system)
7. [Licensing & Provenance](#7-licensing--provenance)
8. [Compression & Budgets](#8-compression--budgets)
9. [Temporary Asset Replacement Pipeline](#9-temporary-asset-replacement-pipeline)
10. [Tool Evaluation Spikes](#10-tool-evaluation-spikes)
11. [Per-Game Production Sheets](#11-per-game-production-sheets)
12. [Residual Risks & Open Decisions](#12-residual-risks--open-decisions)

---

## 1. Asset Layout Convention

### 1.1 Directory Structure

Each game package follows a strict layout under `games/<game-id>/`:

```
games/<game-id>/
├── package.json
├── vite.config.ts
├── game.json                     # Game manifest
├── src/
│   ├── main.ts                   # Entry point
│   ├── config.ts                 # Game-specific constants
│   ├── scenes/
│   ├── systems/
│   ├── entities/
│   └── data/
├── assets/
│   ├── source/                   # Editable source assets (Aseprite, SVG, AI, PSD, etc.)
│   │   ├── characters/           # Character design files, turnarounds, concept art
│   │   ├── environments/         # Background paintings, tile source files
│   │   ├── ui/                   # UI mockups, button source files
│   │   ├── fx/                   # Particle effect source imagery
│   │   └── audio/                # DAW project files, raw recordings, MIDI
│   ├── images/                   # Final game-ready raster images
│   │   ├── backgrounds/          # Skyboxes, parallax layers, full-bleed art
│   │   ├── sprites/              # Individual character/enemy sprites (before atlas)
│   │   ├── tiles/                # Tile set PNGs
│   │   └── ui/                   # Buttons, panels, icons, fonts
│   ├── atlases/                  # Packed sprite atlases (JSON + PNG/WebP)
│   ├── audio/
│   │   ├── music/                # Music tracks (OGG/MP3/AAC)
│   │   ├── sfx/                  # Sound effects (OGG/MP3)
│   │   ├── voice/                # Narration, character voice (OGG/MP3)
│   │   └── ambience/             # Ambient loops (OGG/MP3)
│   └── fonts/                    # Self-hosted web fonts (WOFF2)
├── tests/
└── README.md
```

### 1.2 Source vs. Output Separation

| Directory | Purpose | Committed? | Built? |
|-----------|---------|------------|--------|
| `assets/source/` | Editable source files (PSD, Aseprite, Procreate, DAW projects) | Yes | No |
| `assets/images/` | Game-ready raster assets (before atlas packing) | Yes | No |
| `assets/atlases/` | Packed atlases (JSON frame data + PNG/WebP texture) | Yes | No |
| `assets/audio/` | Final compressed audio files | Yes | No |
| `assets/fonts/` | Subsetted WOFF2 font files | Yes | No |

**Rule:** Never hand-edit hashed Vite output. Generated atlases are committed for deterministic builds (atlas packing should be deterministic or pinned to a specific tool version).

### 1.3 Shared Media Boundaries

Shared packages contain code, typed effect recipes, generators, and production conventions—not game identity or bundled binary media. In accordance with [ADR-004](01-architecture.md), every game ships its required images, audio, and fonts from its own `assets/` tree. The catalog owns its logo and catalog-only imagery separately.

A reusable UI sound or visual may have one editable source template, but each consuming game must export a locally licensed, manifest-declared version that fits its own art/audio direction. This prevents hidden cross-game runtime dependencies and keeps each game independently buildable.

### 1.4 Naming Conventions

| Asset Type | Convention | Example |
|-----------|------------|---------|
| Character sprites | `<character>_<state>_<frame>` | `hippo_run_01`, `hippo_jump_03` |
| Tile sets | `<biome>_<tiletype>` | `meadow_grass`, `meadow_water` |
| Background layers | `<scene>_<layer>` | `valley_sky_01`, `valley_mountains_02` |
| Sound effects | `<verb>_<subject>` | `place_track`, `collect_banana`, `jump_hippo` |
| Music tracks | `<gameid>_<mood>_<variant>` | `railway_workshop_explore_01`, `cheese_heist_chase_02` |
| Atlases | `<gameid>_<type>` | `hippo_characters`, `traintracks_tiles` |

---

## 2. Art Bibles & Creative Direction

### 2.1 Style Per Game

Each game must have a one-page visual brief covering:

| Property | Required Content |
|----------|-----------------|
| **Style reference** | 3–5 reference images (art style, mood, color, lighting) |
| **Palette** | 8–12 color swatches defining primary, secondary, accent, and neutral colors |
| **Shape language** | Round/soft vs. sharp/angular; organic vs. mechanical |
| **Lighting approach** | Flat, cel-shaded, gradient-based, atmospheric, dynamic |
| **Typography** | Title font, body font (all self-hosted WOFF2) |
| **UI style** | Button shapes, panel treatments, icon style |
| **Character design rules** | Proportions, line weight, eye style, animation baseline |
| **Tile/environment rules** | Tile size, grid visibility, edge treatments, decoration density |

### 2.2 Approved Visual Directions

| # | Game | New Title | Visual Style | Key Art Direction |
|---|------|-----------|-------------|-------------------|
| 1 | Train Tracks | **Railway Workshop** | Gouache-and-ink storybook; warm earth tones (sepia, ochre, rust, sage); chunky wooden track pieces; brass-and-wood UI | Hand-painted model railway dioramas; train is layered animated sprite with boiler, cowcatcher, steam piston |
| 2 | Animal Memory | **Wild Pairs** | Watercolour wildlife illustrations on polaroid cards; leather journal UI; vintage map card backs | Scientifically accurate animals painted in watercolour; worn polaroid corners; per-habitat colour palettes |
| 3 | Monkey Banana | **Canopy Caper** | Rich 2D painted layers (Rayman Legends / Ori style); 4-layer parallax; deep greens, warm yellows, teal sky | Hand-drawn capuchin monkey Kiko; organic branch platforms; dappled sunlight, volumetric light rays |
| 4 | Mouse Adventure | **Cheese Heist** | Pixar-level miniaturisation; warm miniature kitchen universe; dramatic moonlight shafts | Pip the mouse with red scarf; kitchen objects at mouse scale (spoon = bridge); heist-jazz aesthetic |
| 5 | Valley Explorer | **Valley of Echoes** | Painterly pixel art; biome swatches with dithering; layered ground+overlay tiles | Pre-rendered creature sheets, dynamic weather, and hand-crafted landmarks in authored connected zones |
| 6 | Robot Factory | **Sparky's Assembly Line** | Pixel-art factory floor; pre-rendered 32×32 pixel Sparky; isometric-ish 3/4 perspective grid | Mechanical command blocks with LEDs; animated factory machinery; holo-panel UI |
| 7 | Code Adventure | **Bit's Grand Adventure** | Extended pixel-art palette (24 colors); per-world tinting; 16×16 animated Bit sprites | Pixel-art robot with idle/walk/jump/bump/celebrate animations; per-tile particle signatures |
| 8 | Coco's Lost Hat | **Coco's Lost Hat** | Keep paper-cut identity; evolve with watercolour textures; animate paper layers with parallax; per-biome palettes | Layered-rig or frame animation selected by CO-R01; hand-painted watercolour textures instead of flat fills |
| 9 | Hippo's Feast | **Hippo's Great Feast** | Hand-drawn 2D sprites on painted culinary-region backgrounds; storybook-culinary (utensils as trees) | Round expressive side-view Hippo with complete ability states; food items bounce/glow/steam; distinct regional lighting |
| 10 | Little Chef's Kitchen | **Little Chef's Grand Kitchen** | Storybook-cookbook aesthetic; rustic warm brush strokes; illustrated ingredients and appliances | Grid tiles = wooden kitchen counters; animated stations (mixer spins, oven shimmers); illustrated customer characters |
| 11 | Critter Tactics | **Critter Tactics** | Rich 2D illustrated sprites on watercolour grid; distinct critter silhouettes; clockwork/machine enemies | Forest floor grid with animated grass; ornate sundial turn indicator; carved-wood damage numbers |

### 2.3 Palette by Game (Preliminary)

Each game's primary palette will be defined during its art-bible phase. Below are starting points derived from the redesign briefs:

| Game | Key Colors | Background Mood |
|------|-----------|-----------------|
| Railway Workshop | #8B6914 (ochre), #5C4033 (sepia), #7B9E6B (sage), #C08552 (rust), #2C1810 (dark wood) | Warm, handcrafted |
| Wild Pairs | #4A7C59 (forest), #C9A96E (savannah), #8EB8D6 (arctic), #3E9B8F (reef) | Per-habitat distinct |
| Canopy Caper | #2D5A27 (deep canopy), #7CB342 (leaves), #FDD835 (banana), #4DD0E1 (sky) | Lush, layered |
| Cheese Heist | #8B4513 (mahogany), #FF8C00 (amber), #F5DEB3 (cream), #4682B4 (moonlight) | Warm, dramatic |
| Valley of Echoes | Per-biome 6-color swatches: #6B8E6B (meadow), #A0C4E8 (snow), #D4A76A (desert) | Painterly, moody |
| Sparky's Assembly Line | #E8E8E8 (metal), #F5C542 (caution), #4A90D9 (Sparky blue), #D32F2F (danger) | Mechanical, bright |
| Bit's Grand Adventure | Per-world: #00D9FF (Core), #7CB342 (Network), #9B59B6 (Gateway) | Clean, informative |
| Coco's Lost Hat | Paper-cut pastels: #F5E6CA (paper), #7CB342 (meadow), #5DADE2 (river) | Warm, handcrafted |
| Hippo's Great Feast | Per-region: #F39C12 (meadow), #6E2C00 (mud), #E74C3C (lava) | Rich, edible |
| Little Chef's Grand Kitchen | #D4A76A (terracotta), #8B4513 (wood), #F5DEB3 (cream), #E74C3C (tomato) | Rustic, warm |
| Critter Tactics | #4A7C59 (forest floor), #5DADE2 (water), #8E44AD (arcane), #D35400 (machinery) | Natural vs. mechanical contrast |

---

## 3. Concept Approval Steps

### 3.1 Pre-Production Gate for Each Game

Before any asset production for a game, these items must be approved:

```
┌─────────────────────────────────────────────────────────────┐
│                 CONCEPT APPROVAL STEPS                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Step 1: Art Bible (one-page visual brief)                  │
│  ├── Reference images (3-5)                                 │
│  ├── Colour palette (8-12 swatches)                         │
│  ├── Shape language statement                               │
│  ├── Typography selections                                  │
│  ├── Character design concepts (silhouette sketches)        │
│  └── Owner approval of direction                            │
│                                                              │
│  Step 2: Style Tile (single scene/prototype)                │
│  ├── One representative scene with all visual elements      │
│  ├── Character, background, UI, and effects shown together  │
│  ├── Animated prototype (Phaser scene with temp art)        │
│  ├── Sound & music placeholder                              │
│  └── Owner play-through and approval                        │
│                                                              │
│  Step 3: Animation Style Test                                │
│  ├── One character fully animated (idle, walk, 1 action)    │
│  ├── One tile/environment animated (water, grass, wind)     │
│  ├── One UI interaction animated (button press, transition) │
│  └── Owner review of timing, easing, weight                 │
│                                                              │
│  Step 4: Audio Direction Test                                │
│  ├── Music direction sample (30 seconds)                    │
│  ├── Key SFX prototype (3-5 sounds)                         │
│  └── Owner approval of audio identity                       │
│                                                              │
│  Step 5: Production Go / No-Go                               │
│  └── All above approved → full asset production begins      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Approval Authority

| Decision | Approver | Escalation |
|----------|----------|------------|
| Art direction / style | Repository owner | N/A |
| Palette and typography | Repository owner | N/A |
| Character designs | Repository owner | N/A |
| Animation feel | Repository owner | N/A |
| Audio/SFX direction | Repository owner | N/A |
| Technical asset format | Architecture (AGENTS.md) | Owner if format changes scope |
| Licensing/acquisition | Repository owner | N/A |
| Temporary asset acceptance | Developer + reviewer | Owner if temporary > 2 weeks |

### 3.3 What Happens When Concept Is Not Approved

1. Specific feedback is captured: “Palette too dark” / “Character proportions do not match the approved style”
2. Revised concept produced (limited to 2 revision rounds per gate)
3. If 3rd rejection: owner writes or sketches the direction themselves, developer executes

---

## 4. Sprite, Atlas & Tile Workflows

### 4.1 Recommended Toolchain

| Task | Recommended Tool | Alternative | Rationale |
|------|-----------------|-------------|-----------|
| Pixel-art sprites | **Aseprite** ($19.99) | Piskel (free, web) | Aseprite is industry standard for 2D game sprites; supports sprite sheets, animation tags, onion skinning, palette management. Outputs JSON + PNG atlases natively. |
| Illustration / backgrounds | **Procreate** (iPad, $12.99) or **Krita** (free) | Photoshop (paid), Clip Studio Paint | Procreate for hand-painted backgrounds; Krita for open-source alternative |
| Vector assets / UI | **Inkscape** (free) or **Figma** (free tier) | Adobe Illustrator | Inkscape is free and SVG-native; Figma for UI mockups with team collaboration |
| Tile map creation | **Tiled** (free) | LDtk (free) | Tiled supports multiple tile layers, object layers, collision shapes, and exports to JSON that Phaser can parse natively |
| Atlas packing | **Aseprite export** or **Shoebox** (free) | TexturePacker ($39) | Aseprite has built-in sprite sheet export. Shoebox is free for occasional packing. TexturePacker if frequent repacking needed |
| SVG processing | **SVGO** (npm) | Manual optimization | Required for all SVG assets; removes editor metadata, reduces file size |

### 4.2 Sprite Production Workflow

```
CONCEPT (approved art bible)
    │
    ▼
ROUGH SKETCH (Aseprite / Procreate)
    │  Silhouette pass → owners approves pose and proportions
    ▼
LINE ART (Aseprite)
    │  Clean lines, consistent line weight per game style
    ▼
COLOR FLAT (Aseprite)
    │  Fill with game palette colors (locked palette)
    ▼
SHADING (Aseprite)
    │  Consistent light source; cel shading or gradient per game style
    ▼
ANIMATION (Aseprite)
    │  → Create frames
    │  → Tag animation states (idle, walk, jump, action)
    │  → Set frame durations (varies per game: 100ms = 10fps is baseline)
    │  → Onion skin for smooth motion
    ▼
EXPORT (Aseprite → JSON + PNG)
    │  → Export as sprite sheet (horizontal strip or grid)
    │  → Include JSON frame data (Phaser loads via `this.load.atlas()`)
    ▼
ATLAS PACKING (optional, if multiple characters)
    │  → Combine multiple sprite sheets into single atlas
    │  → Generate multi-packing JSON
    ▼
VITE BUILD → Optimized WebP + JSON
    │  → Vite plugin converts PNG to WebP during build
    │  → JSON frame data copied as-is
    ▼
GAME INTEGRATION (Phaser loader)
    │  → `this.load.atlas('character', 'atlases/char.webp', 'atlases/char.json')`
```

### 4.3 Tile Set Production Workflow

```
TILE SIZE DECISION (per game)
    │  Common sizes: 16×16 (pixel), 24×24 (detailed pixel), 32×32 (standard 2D)
    ▼
TILE PALETTE (from approved art bible)
    │  Per-biome tile colors
    ▼
TILE SHEET (Tiled or Aseprite)
    │  → Individual tiles drawn on grid
    │  → Edge tiles (top, bottom, corners, transitions)
    │  → Decoration tiles (grass tufts, cracks, pebbles)
    │  → Auto-tile rules defined in Tiled
    ▼
TILE MAP (Tiled .tmx → JSON export)
    │  → Layer structure: background, collision, decoration, overlay
    │  → Object layers for spawn points, triggers
    │  → Properties for tile-specific behavior (walk speed, damage)
    ▼
PHASER INTEGRATION
    │  → `this.load.image('tiles', 'tiles/tileset.png');`
    │  → `this.load.tilemapTiledJSON('level1', 'data/level1.json');`
    │  → Tile collision shapes from Tiled object layer
```

### 4.4 Texture Atlas Rules

| Rule | Detail |
|------|--------|
| Max atlas size | 2048×2048 pixels (compatible with all target devices including iPad 5th gen) |
| Padding | 2px between sprites (prevents edge bleed with bilinear filtering) |
| Format | PNG (source), WebP (production build). Vite converts PNG → WebP during production build |
| Color space | sRGB with embedded ICC profile (or none — avoid color shifts on wide-gamut displays) |
| JSON format | Phaser-compatible `Array` format (frame names, x/y/w/h) |
| Naming | `<game>_<type>.png` → e.g., `hippo_characters.png` |
| Tool | Aseprite export initially; migrate to TexturePacker if friction arises |

### 4.5 Phaser Atlas Loading Convention

```typescript
// In BootScene or PreloadScene
export function loadAtlases(scene: Phaser.Scene): void {
  // Character atlases
  scene.load.atlas('hippo', 'assets/atlases/hippo_characters.webp', 'assets/atlases/hippo_characters.json');
  scene.load.atlas('train', 'assets/atlases/train_track_pieces.webp', 'assets/atlases/train_track_pieces.json');

  // Tile sets
  scene.load.image('meadow_tiles', 'assets/images/tiles/meadow_tileset.png');
  scene.load.image('factory_tiles', 'assets/images/tiles/factory_tileset.png');

  // Tile maps (Tiled JSON)
  scene.load.tilemapTiledJSON('level1', 'assets/data/levels/level1.json');

  // Backgrounds
  scene.load.image('bg_sky', 'assets/images/backgrounds/sky_01.webp');
  scene.load.image('bg_mountains', 'assets/images/backgrounds/mountains_01.webp');
}
```

---

## 5. Animation Production System

### 5.1 Animation List Template

Every game must produce a complete animation list before full production. Template:

```markdown
## Animation List — <Game Title>

### Player Character: <Name>

| Animation | Frames | Duration (ms) | Looping | Trigger | Description |
|-----------|--------|---------------|---------|---------|-------------|
| idle | 4 | 800 | Yes | Default state | Subtle breathing, blink every 3s |
| walk | 8 | 600 | Yes | Movement input | Full stride cycle with arm/leg sync |
| run | 8 | 400 | Yes | Fast movement | Same as walk but faster, slight lean forward |
| jump_up | 3 | 200 | No | Jump pressed | Anticipation crouch, launch, apex |
| jump_down | 2 | 150 | No | After apex | Descent, landing preparation |
| land | 2 | 100 | No | Ground contact | Squash on impact, recovery |
| action_01 | 6 | 500 | No | Action button | Special ability animation |

### Enemy: <Name>

| Animation | Frames | Duration | Looping | Trigger |
|-----------|--------|----------|---------|---------|
| idle | 4 | 1000 | Yes | Default |
| patrol | 6 | 800 | Yes | Active state |
| alert | 3 | 300 | No | Player spotted |
| attack | 5 | 400 | No | Attack triggered |
| hurt | 2 | 200 | No | Hit received |
| death | 6 | 600 | No | HP reaches 0 |

### Environment Animations

| Element | Type | Description |
|---------|------|-------------|
| Water | 4-frame tile animation | Ripple cycle |
| Grass sway | 3-frame tile animation | Wind pass |
| Flag | 3-frame sprite | Wind direction |
| Conveyor belt | 6-frame tile animation | Continuous directional movement |
```

### 5.2 Animation Standards

| Property | Standard | Notes |
|----------|----------|-------|
| Frame rate baseline | 10 fps (100ms per frame) | Higher for fast actions (run: 15fps, attack: 12fps) |
| Resolution baseline | 32×32 px per character cell | Scales up for heroes (48×48 or 64×64) |
| Keyframe technique | 2:1 principle (2 frames anticipation, 1 frame action) | Gives weight to movements |
| Squash & stretch | Subtle (10-15% deformation max) | Avoids looking rubbery |
| Follow-through | Tail, scarf, ears: 2-3 frame delay behind main body | Adds life to characters |
| Overlapping action | Different body parts move at different times | Natural feel |
| Easing | Phaser tweens use `Back.easeOut` for bouncy, `Sine.easeInOut` for smooth | See AGENTS.md: shared effects package |
| Reduced motion | Respect `prefers-reduced-motion`: static frames instead of animation, skip screen shake | Enforced by shared effects package |

### 5.3 Phaser Animation Integration

```typescript
// In create() or entity class
this.anims.create({
  key: 'hippo_run',
  frames: this.anims.generateFrameNames('hippo', {
    prefix: 'run_',
    start: 1,
    end: 8,
  }),
  frameRate: 12,
  repeat: -1, // looping
});

this.anims.create({
  key: 'hippo_jump',
  frames: this.anims.generateFrameNames('hippo', {
    prefix: 'jump_',
    start: 1,
    end: 5,
  }),
  frameRate: 10,
  repeat: 0, // play once
});

// Usage
sprite.play('hippo_run');
sprite.on('animationcomplete-hippo_jump', () => {
  sprite.play('hippo_idle');
});
```

### 5.4 Effects Animation (Shared Effects Package)

The shared `packages/effects/` package provides reusable effects. Each game configures intensity and color.

| Effect | Parameters | Disabled by reduced-motion? |
|--------|-----------|----------------------------|
| **Particle burst** | `{ x, y, texture, count, speed, lifespan, scale, color, gravity }` | Reduced particle count (×0.2) |
| **Screen shake** | `{ intensity, duration, direction }` | Yes — fully disabled |
| **Hit pause** | `{ duration, color, onComplete }` | Yes — fully disabled |
| **Camera flash** | `{ color, duration, alpha }` | Reduced alpha (×0.3) |
| **Trail** | `{ target, color, length, fade }` | Trail length reduced (×0.5) |
| **Slow motion** | `{ duration, timeScale }` | Yes — fully disabled |
| **Scene transition** | `{ direction, duration, ease }` | Reduced to crossfade only |
| **Confetti** | `{ count, colors, gravity, spread }` | Reduced count (×0.3) |

Each game must extend this with a manifest inventory of every game-specific camera move, parallax motion, looping decoration, squash/stretch, UI transition, and gameplay effect. For each entry, specify `normal`, `reduced`, and `disabled` behavior plus the non-motion feedback that preserves state clarity. Reduced motion is driven by both `prefers-reduced-motion` and an in-game setting, with the explicit setting taking precedence; Playwright captures representative normal/reduced scenes and verifies no required feedback disappears.

---

## 6. Sound & Music Production System

### 6.1 Sound List Template

Every game must produce a complete sound list before full production. Template:

```markdown
## Sound List — <Game Title>

### Master Groups

| Group | Volume | Mute Default | Notes |
|-------|--------|-------------|-------|
| Master | 1.0 | false | Overall game volume |
| Music | 0.8 | false | Background music |
| SFX | 1.0 | false | Sound effects |
| Voice | 1.0 | false | Narration / character voice |
| UI | 0.7 | false | Button clicks, menu sounds |

### Sound Effects

| Cue | Type | Description | Duration | Source | License |
|-----|------|-------------|----------|--------|---------|
| ui_click | Procedural/Short | Short click for button press | 50ms | Web Audio oscillator | MIT (custom) |
| ui_error | Procedural/Short | Low buzz for error | 200ms | Web Audio oscillator | MIT (custom) |
| place_track | Sample | Wooden clank on track placement | 300ms | Recorded/designed | Custom |
| train_whistle | Sample | Steam train horn | 1500ms | Recorded/designed | Custom |
| collect_item | Procedural/Short | Rising chime | 300ms | Web Audio oscillator | MIT (custom) |
| jump | Procedural/Short | Quick whoosh | 150ms | Web Audio oscillator | MIT (custom) |
| match_success | Procedural/Short | Ascending two-note chime | 400ms | Web Audio oscillator | MIT (custom) |
| victory | Sample | Full fanfare | 3000ms | Composed/recorded | Custom |
| ambient_forest | Sample/Ambient | Bird chirps, wind, rustle | 10000ms loop | Recorded/designed | Custom |
| enemy_alert | Procedural/Medium | Staccato brass sting | 500ms | Web Audio synthesizer | MIT (custom) |

### Music Tracks

| Track | Mood | Length | Key/Tempo | Instruments | Looping |
|-------|------|--------|-----------|-------------|---------|
| explore_01 | Gentle, curious | 60s loop | C major, 100bpm | Acoustic guitar, harmonica, banjo | Yes |
| explore_02 | Playful | 45s loop | G major, 120bpm | Marimba, bongos, shaker | Yes |
| chase | Urgent | 30s loop | D minor, 140bpm | Brass stabs, driving percussion | Yes |
| victory_fanfare | Triumphant | 8s one-shot | C major | Full brass + percussion | No |
```

### 6.2 Audio Production Workflow

```
SOUND LIST (approved by owner)
    │
    ├── PROCEDURAL SOUNDS (Web Audio API / Phaser sound synthesis)
    │   │  Created in code with shared audio package
    │   │  Parameters: frequency, duration, waveform, envelope
    │   │  Best for: UI clicks, simple collect sounds, error buzzes, jump whooshes
    │   │  Storage: Inline in game code or shared audio package
    │   │  License: MIT (custom code, no external assets)
    │
    ├── DESIGNED SOUNDS (sfxr / jfxr / Audacity)
    │   │  Created with sound design tools
    │   │  Best for: pickups, impacts, switches, ambience
    │   │  Export: WAV → OGG + MP3 (two copies for browser compatibility)
    │   │  Storage: `assets/audio/sfx/`
    │   │  License: Custom (created in-house)
    │
    ├── RECORDED SOUNDS (field recordings / microphone)
    │   │  Captured or licensed from sound libraries
    │   │  Best for: ambient nature, train sounds, kitchen sounds, real animal calls
    │   │  Post-process: Audacity (clean, normalize, trim, fade)
    │   │  Export: WAV → OGG + MP3
    │   │  Storage: `assets/audio/sfx/`
    │   │  License: CC0 or custom recorded
    │
    ├── MUSIC (composed/sequenced)
    │   │  Created in DAW (LMMS/BandLab/FL Studio)
    │   │  Best for: all background music
    │   │  Export: WAV → OGG + MP3
    │   │  Storage: `assets/audio/music/`
    │   │  License: Custom composition (owned by repository)
    │
    └── VOICE/NARRATION
        │  Recorded or TTS-generated
        │  Best for: character voice, story narration
        │  Export: WAV → OGG + MP3 (lower bitrate: 64kbps mono)
        │  Storage: `assets/audio/voice/`
        │  License: Custom recorded or TTS service terms
```

### 6.3 Procedural Audio via Web Audio API (Common Pattern)

For the 9 non-Phaser games and as fallback for Phaser games, the shared `packages/audio/` provides:

```typescript
// Shared audio utility
export function playTone(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.3
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

// Sound type presets
export const Sounds = {
  click:       (ctx) => playTone(ctx, 800, 0.05, 'square', 0.2),
  collect:     (ctx) => playTone(ctx, 988, 0.1, 'sine', 0.3).then(() => playTone(ctx, 1319, 0.15, 'sine', 0.3)),
  jump:        (ctx) => { playTone(ctx, 300, 0.05, 'triangle', 0.4); setTimeout(() => playTone(ctx, 600, 0.08, 'triangle', 0.3), 50); },
  error:       (ctx) => playTone(ctx, 200, 0.3, 'sawtooth', 0.2),
  victory:     (ctx) => { /* ascending arpeggio: C5 E5 G5 C6 */ },
  train_chug:  (ctx, speed) => { /* low-frequency pulse at train speed */ },
};
```

### 6.4 Phaser Audio Convention

```typescript
// In BootScene
this.load.audio('place_track', 'assets/audio/sfx/place_track.ogg');
this.load.audio('train_whistle', 'assets/audio/sfx/train_whistle.ogg');
this.load.audio('explore_music', 'assets/audio/music/explore_01.ogg');

// Usage in game
this.sound.play('place_track');
this.sound.play('explore_music', { loop: true, volume: 0.5 });

// Volume groups (via shared audio package)
AudioManager.play('place_track', 'sfx'); // route to SFX bus
AudioManager.setVolume('music', 0.6);
AudioManager.mute('sfx');
```

### 6.5 Audio Format Strategy

| Format | Use Case | Browser Support | Compression |
|--------|----------|----------------|-------------|
| **OGG (Vorbis)** | Primary format for Chromium, Firefox, Android | ~95% | ~90% vs WAV |
| **MP3** | Fallback for Safari, iOS | ~100% | ~85% vs WAV |
| **M4A/AAC** | Alternative for iOS (smaller than MP3 at same quality) | ~80% | ~90% vs WAV |

**Production rule:** Ship both `.ogg` and `.mp3` for every audio asset. Phaser falls back automatically.

**For Phaser games:** Use `this.load.audio('key', ['file.ogg', 'file.mp3'])` for dual-format loading.

**Bitrate targets:**
- Music: 128kbps (OGG), 192kbps (MP3)
- SFX: 96kbps (OGG), 128kbps (MP3)
- Voice/Narration: 64kbps mono (both formats)
- Ambience: 96kbps (OGG), 128kbps (MP3)

### 6.6 Audio Unlock & Lifecycle (Shared Package)

The shared `packages/audio/` provides:

1. **Audio Unlock on First Gesture** — Detect first user interaction (click/touch/keydown), create AudioContext, start silent buffer to unlock, then enable all audio.
2. **Hidden Tab Pause** — When `document.visibilityState !== 'visible'`, pause all audio. Resume on return.
3. **Mute Toggle** — Persistent mute preference stored in localStorage across sessions.
4. **Volume Groups** — Separate sliders or settings for music, sfx, voice.
5. **Audio Context Suspension Recovery** — If AudioContext is in `suspended` state (iOS autoplay policy), resume on next interaction.

---

## 7. Licensing & Provenance

### 7.1 Source Classification

Every asset (source or output) must have its origin recorded in a sidecar `ASSET_LICENSE.md` or inline metadata.

```markdown
# Asset License & Provenance — Railway Workshop

## Images

| File | Source | Author | License | Notes |
|------|--------|--------|---------|-------|
| assets/source/characters/train_concept.ase | Original | Repository owner | CC-BY-4.0 | Character design sketches |
| assets/images/sprites/train_idle_01.png | Generated from .ase | Aseprite export | CC-BY-4.0 | Exported sprite frame |
| assets/images/backgrounds/meadow_01.png | Original (Procreate) | Repository owner | CC-BY-4.0 | Hand-painted meadow background |
| assets/atlases/train_characters.png | Packed from sprites | Shoebox | CC-BY-4.0 | Combined character atlas |
| assets/images/ui/button_wood.png | Original (Inkscape) | Repository owner | CC-BY-4.0 | Wood-textured button base |

## Audio

| File | Source | Author | License | Notes |
|------|--------|--------|---------|-------|
| assets/audio/sfx/place_track.ogg | Designed (Audacity) | Repository owner | CC-BY-4.0 | Synthesized wooden clank |
| assets/audio/sfx/train_whistle.ogg | Field recording | Repository owner | CC-BY-4.0 | Recorded at heritage railway |
| assets/audio/music/explore_01.ogg | Composed (LMMS) | Repository owner | CC-BY-4.0 | Original composition |
| assets/audio/sfx/bird_chirp.ogg | freesound.org user "birdman" | birdman | CC0 | https://freesound.org/s/12345 |

## Fonts

| Font | License | Source | Notes |
|------|---------|--------|-------|
| Fredoka One | OFL (SIL Open Font License) | Google Fonts | Self-hosted as WOFF2 |
| Nunito | OFL | Google Fonts | Self-hosted as WOFF2 |
```

### 7.2 License Compatibility Rules

| License | Can Use? | Attribution Required? | Notes |
|---------|----------|---------------------|-------|
| **CC0** | ✅ | No | Preferred for external assets |
| **CC-BY 4.0** | ✅ | Yes, in sidecar file | Acceptable |
| **CC-BY-SA** | ⚠️ | Yes, share-alike applies | Avoid unless unavoidable |
| **OFL** | ✅ | Yes, in credits | Fonts only |
| **MIT** | ✅ | Optional (included) | Code assets |
| **Public Domain** | ✅ | No | Verify status |
| **"Royalty-free" (paid)** | ✅ | Per license terms | Keep receipt/proof |
| **Proprietary / All Rights Reserved** | ❌ | N/A | Do not use |
| **Unlicensed web scrape** | ❌ | N/A | Do not use |

### 7.3 Asset Licenses for Procedural/Tool-Generated Content

| Tool | Output License | Notes |
|------|---------------|-------|
| Web Audio API | N/A (code) | Generated at runtime |
| Aseprite exports | User owns output | No additional restrictions |
| Tiled exports | User owns output | No additional restrictions |
| jfxr / sfxr | User owns output | Sound effects generated by these tools are yours |
| LMMS / DAW | User owns composition | Original music is yours |
| TTS services | Per service terms and selected voice | Verify output/redistribution rights for the exact provider, plan, voice, and date; retain evidence |
| Generative media tools | Per model, service, and source terms | May ship only with owner approval, recorded provenance/processing, redistribution rights, and style/quality approval |

**Policy:** No tool output is presumed licensed merely because it can be generated or downloaded. Procedural and generative outputs follow the same manifest, provenance, owner-approval, and quality gates as recorded or hand-authored assets.

---

## 8. Compression & Budgets

### 8.1 Per-Game Asset Budget

| Resource | Budget | Measurement | Gate |
|----------|--------|-------------|------|
| Total delivery size | Per-game manifest budget; initial warning 40 MB / block 60 MB | Assembly inventory | Block manifest limit; revisit after measured media slice |
| First-load transfer | Warn 3 MB / block 5 MB compressed | Playwright network log | Block; defer region/music/narration groups |
| Individual atlas texture | Warn 2 MB PNG / 500 KB WebP; max 4096×4096 | Asset validator + GPU profile | Block dimensions/manifest limit |
| Individual SFX | Warn 500 KB / block 1 MB | Asset validator | Block manifest limit |
| Individual music/narration file | Per-cue manifest budget; initial block 3 MB | Asset validator + listening review | Block manifest limit |
| Total audio | Per-game budget reflecting cue count and lazy-load groups; initial warning 25 MB / block 40 MB | Assembly inventory | Block manifest limit |
| Total font weight | Warn 200 KB WOFF2 | Asset validator | Block only if first-load limit is exceeded |

### 8.2 Image Compression Pipeline

Candidate pipeline; MS-03 must prove deterministic atlas references and acceptable quality before automatic conversion is adopted.

```
SOURCE (PNG / SVG / Aseprite)
    │
    ▼
PNGQUANT or Oxipng (lossy PNG compression)
    │  → Reduce PNG color depth to 256 colors or fewer
    │  → Strip metadata (gamma, text chunks)
    ▼
VITE BUILD (imagemin or vite-imagetools plugin)
    │  → Convert PNG → WebP (lossy, quality 85)
    │  → Convert PNG → AVIF (lossy, quality 75) — optional modern fallback
    │  → Generate srcset or single-image replacement
    ▼
OUTPUT (hash-named in dist/)
```

**SVG optimization (always run before game integration):**
```bash
npx svgo assets/source/ui/*.svg --output assets/images/ui/ --config='{"plugins":["preset-default"]}'
```

### 8.3 Audio Compression Pipeline

Candidate conversion settings; MS-04 and D16 select the final fallback formats/bitrates from D23 playback and listening evidence.

```
SOURCE (WAV 44.1kHz 16-bit)
    │
    ▼
FFMPEG to OGG (Vorbis)
    │  ffmpeg -i input.wav -c:a libvorbis -q:a 4 output.ogg
    │  q:a = 0-10: 3=96kbps, 4=128kbps, 6=192kbps
    ▼
FFMPEG to MP3
    │  ffmpeg -i input.wav -c:a libmp3lame -b:a 128k output.mp3
    ▼
OUTPUT (assets/audio/)
```

**Batch conversion script** (concept, to be built):
```bash
npm run compress-audio -- games/<game-id>/assets/source/audio/
```

### 8.4 Runtime Memory Budget

These are initial profiling guardrails, not release claims. QR-04 on D21 and owner decision D22 replace them with per-game `perf-budget.json` thresholds before G11 can pass.

| Metric | Initial guardrail | Tool |
|--------|--------|------|
| Phaser texture memory | < 50 MB | Chrome DevTools > Memory > Take Snapshot > Filter "Texture" |
| Audio buffer memory | < 20 MB | Chrome DevTools > Memory > Take Snapshot |
| Total JS heap | < 100 MB after 5 min play | Chrome DevTools > Performance > Memory |
| Active sprite count | < 500 simultaneous | Game debug overlay |
| Particle count | < 200 simultaneous (reduced-motion: < 40) | Particle system pool |

---

## 9. Temporary Asset Replacement Pipeline

### 9.1 When Temporary Assets Are Used

Per AGENTS.md: "Temporary assets are allowed during development, but they must be clearly identified. Do not present temporary assets as final work."

| Development Stage | Acceptable Temporary Assets | When Replacement Is Required |
|------------------|---------------------------|------------------------------|
| Core interaction prototype | Emoji characters, solid-color rectangles, placeholder text | Before first representative blind playtest |
| One complete level | Simple geometric shapes, procedural tones | Before "art target" gate |
| Final input behavior | Refined temp assets acceptable | Before "art target" gate |
| Art target applied | N/A (final assets) | This gate replaces all temps |
| Animation + sound target | N/A (final assets) | This gate replaces all temps |
| Remaining content | Can reuse final art pipeline | N/A |

### 9.2 Temporary Asset Markers

Every temporary asset must be flagged in the codebase:

```typescript
// TEMPORARY: Replace with final sprite before art-target gate
// See: art-bible.md > Character Design > Train
this.add.sprite(100, 200, 'train_temp');
```

```html
<!-- TEMPORARY: Use emoji until track tile sprite is ready -->
<div class="track-piece" style="font-size: 32px;">🛤️</div>
```

```css
/* TEMPORARY: Placeholder button style; replace with final UI */
.temp-button {
  background: #ccc;
  border: 2px dashed #999;
}
```

### 9.3 Replacement Process

```
IDENTIFY temporary assets
    │  Search for "TEMPORARY" comments, emoji used as game art, geometric primitives as characters
    ▼
PRIORITIZE replacements
    │  1. Player character (most visible)
    │  2. Core interactive elements (tiles, buttons, track pieces)
    │  3. Environment backgrounds
    │  4. UI elements
    │  5. Effects (particles, transitions)
    │  6. Minor decoration
    ▼
PRODUCE final assets (per art production workflow)
    │  → Create in Aseprite / Procreate / Inkscape
    │  → Follow art bible specifications
    │  → Export to game-ready format
    ▼
INTEGRATION
    │  → Replace temp file references in code
    │  → Update asset manifest
    │  → Test visual consistency in game
    ▼
VALIDATION
    │  → Confirm all temp references are removed
    │  → Visual inspection: game looks coherent, follows art bible
    │  → Performance check: no degradation from new assets
    ▼
COMMIT
    │  → Commit in same PR as the art gate implementation
```

### 9.4 Temporary Asset Inventory Tracking

Each game's README or a `TEMP_ASSETS.md` should list:

```markdown
# Temporary Assets — Railway Workshop

## Core Interaction Phase (Active)

| Asset | Type | Replacement Target | Due Date |
|-------|------|-------------------|----------|
| 🚂 emoji train | Character | Animated train sprite | Art target gate |
| 🏭 emoji station | Environment | Painted station building | Art target gate |
| Colored rectangles as tiles | Tile set | Wood-textured track tiles | Art target gate |
| Procedural beeps | Audio | Designed train sounds | Sound target gate |

## Completed Replacements

| Asset | Replaced With | Date |
|-------|--------------|------|
| (none yet) | | |
```

---

## 10. Tool Evaluation Spikes

### 10.1 Planned Spikes (Before Production Stage 1)

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

### 10.2 Spike Output

Each spike produces:
1. A small proof-of-concept scene or script (committed to a spike branch)
2. Documentation of findings (what works, what doesn't, recommended settings)
3. A decision: adopt, adapt, or reject the tool/approach
4. Update to this plan or game-specific notes

### 10.3 Tool Chain Decision Matrix

| Candidate | Research ID | Working hypothesis | Reject or adapt if… |
|---|---|---|---|
| Aseprite | MS-01 | Proposed pending spike | Tagged atlas export is not deterministic or scriptable |
| Tiled | MS-02 | Proposed for tile-heavy games only | Export/collision workflow adds more authoring cost than typed JSON |
| Vite + image tooling | MS-03 | Proposed pending spike | Atlas references become unstable or output quality misses the target |
| FFmpeg | MS-04 | Proposed for deterministic audio conversion | Required browser fallbacks or metadata cannot be reproduced |
| Inkscape | MS-05 | Proposed for vector source/raster exports | Runtime SVG has rendering issues; use deterministic PNG/WebP exports |
| Web Audio API | MS-06 | Keep for suitable designed cues, not as a universal identity | The approved audio target needs recorded/composed material |
| Node.js asset checks | MS-07 | Proposed | Checks are flaky or cannot explain violations clearly |
| Reduced-motion media query | MS-08 | Required fallback input | Phaser/browser behavior needs an explicit settings override too |

---

## 11. Per-Game Production Sheets

### 11.1 Railway Workshop (Train Tracks)

| Item | Details |
|------|---------|
| **Characters** | Steam locomotive (1), Passenger car (1), Station master (1, small) |
| **Character sprites** | Train: idle (steam puff), moving (pistons + wheel rotation), whistle, crash (disassemble) |
| **Enemies** | None |
| **Environment** | Terrain tiles: grass, river, rock, bridge, tunnel, track pieces (straight, curve, switch, crossing) |
| **Tile size** | 64×64 px (grid cell) |
| **Background layers** | Sky (1), distant hills (1), near terrain (2) = 4 layers |
| **UI** | Track palette, throttle lever, mission card, star rating, undo/redo buttons |
| **SFX** | Place track (clank), remove (swoosh), train chug loop, whistle, crash (boing), victory jingle, UI click |
| **Music** | 3 region loops (Green Valley, Hill Country, Industrial Coast), ride-intensity stems or variants, and 1 completion fanfare |
| **Voice** | None |
| **Animation count** | ~15 (character) + ~8 (environment + UI) |
| **Sprite sheets** | 1 atlas (train + cars), 1 tile sheet (tracks + terrain) |
| **Temp asset** | Emoji train, colored rectangle tiles, procedural beeps |

### 11.2 Wild Pairs (Animal Memory)

| Item | Details |
|------|---------|
| **Characters** | 96 watercolour animals: 12 distinct animals in each of 8 habitats |
| **Character sprites** | Each animal: 1 portrait illustration and 1 album crop; card frames/backs are shared UI assets within the game |
| **Enemies** | None |
| **Environment** | 8 habitat backgrounds (full-bleed painted scenes) |
| **Background layers** | 1 per habitat |
| **UI** | Leather journal, album pages, habitat map, stamp animation, stat cards |
| **SFX** | Card flip, match, mismatch, album page turn, stamp, habitat ambience, and one sourced/recorded call or approved designed cue per animal |
| **Music** | 1 per habitat (30s ambient loop), 1 victory swell (8s) |
| **Voice** | None in the approved scope; animal calls are SFX |
| **Animation count** | ~5 (card flip, match collection, stamp, album open, confetti) |
| **Sprite sheets** | 1 large atlas (all animal illustrations + card frames) |
| **Temp asset** | Emoji animals, gradient card backs, no audio |

### 11.3 Canopy Caper (Monkey Banana)

| Item | Details |
|------|---------|
| **Characters** | Kiko (capuchin monkey) — 1 player character |
| **Character sprites** | Kiko: idle (12f), walk (12f), run (8f), jump_anticipate (3f), jump_launch (2f), jump_apex (2f), jump_fall (2f), land (2f), vine_grab (3f), vine_swing (6f), wall_jump (4f), hurt (2f) |
| **Enemies** | Howler monkey (shakes branches) — idle (4f), shake (6f) |
| **Environment** | Branch platforms (organic shapes, 4+ variants per biome), vine objects, tree trunk, leaves, fruit |
| **Tile size** | Variable (branch platforms not strict grid) |
| **Background layers** | 4-layer parallax (sky, distant canopy, mid-canopy, foreground leaves) |
| **UI** | Banana quota, star rating, stage select, timer indicator, cape selector |
| **SFX** | Jump (whoosh), collect banana (pop + cha-ching), vine grab, enemy shake, rain, victory fanfare |
| **Music** | Latin percussion (bongos, marimba, shakers) — intensity scales with height; rain variant |
| **Voice** | None |
| **Animation count** | ~30 (character) + ~10 (environment + enemies) |
| **Sprite sheets** | 1 atlas (Kiko), 1 atlas (enemies + collectibles) |
| **Temp asset** | SVG monkey, flat green rectangles, emoji bananas, no audio |

### 11.4 Cheese Heist (Mouse Adventure)

| Item | Details |
|------|---------|
| **Characters** | Pip (mouse) — 1 player character; Cat (1 enemy); Toy soldier (1 enemy); Boot (hazard) |
| **Character sprites** | Pip: idle (8f), run (14f), jump (6f), crouch (4f), sprint (8f), push (4f), hide (3f), slide (4f), scared (3f) |
| **Enemies** | Cat: patrol (8f), yawn (4f), alert (3f), chase (8f); Toy soldier: walk (6f), scan (4f); Boot: idle (1f), stomp (3f) |
| **Environment** | Kitchen room backgrounds (countertop, fridge, dishwasher, pantry, study) — 6 rooms |
| **Tile size** | Variable (not grid-based; freeform platformer) |
| **Background layers** | 2-3 layers per room (back wall, mid objects, foreground counter edge) |
| **UI** | Heist briefing blueprint, cheese weight, stealth indicator, stamina bar, guard sight cones |
| **SFX** | Pip footsteps (surface-appropriate), jump, cat purr, toy soldier wind-up, boot stomp (shake + thud), cheese creak, spoon crash (distraction), alarm sting, victory jazz swell |
| **Music** | Heist jazz per room: 6 variants (pantry=laidback, fridge=cool synths+jazz, dishwasher=watery percussion) |
| **Voice** | None |
| **Animation count** | ~40 (character + enemies) + ~8 (environment + UI) |
| **Sprite sheets** | 1 atlas (Pip), 1 atlas (enemies), 1 atlas (cheese types + items) |
| **Temp asset** | Mouse drawn on canvas, simple enemies, no audio, no stealth UI |

### 11.5 Valley of Echoes (Valley Explorer)

| Item | Details |
|------|---------|
| **Characters** | 20–25 creature species, with 6–8 core species completed first to prove the pipeline |
| **Character sprites** | Each animal: idle (2f), walk (4f), eat (3f), startle (2f), sleep (2f) — 8 directional variants per species × 5 states = 40 frames per animal |
| **Environment** | 6–8 authored biome-zones with connected transitions; terrain tiles and game-local overlay decorations |
| **Tile size** | 24×24 px (pixel-art with more detail) |
| **Background layers** | 3-layer parallax (sky, distant terrain, mid-terrain) + 1 foreground overlay |
| **UI** | Codex journal, compass, Heartstone puzzle UI, weather indicator |
| **SFX** | Ambient per biome (wind, water, insects), animal calls (samples), footstep surface sounds, Echo collect (harp arpeggio), Heartstone solve (deep resonance + bloom), landmark discovery (rising chord) |
| **Music** | 1 ambient texture per authored biome-zone (crossfading, 60s+ loop) |
| **Voice** | None |
| **Animation count** | ~200+ (across all animal species) — focus on 6-8 core species first |
| **Sprite sheets** | 1 atlas per biome's animals (or 1 large atlas for all) |
| **Temp asset** | Emoji animals, flat colored terrain, no audio, no Codex UI |

### 11.6 Sparky's Assembly Line (Robot Factory)

| Item | Details |
|------|---------|
| **Characters** | Sparky (robot) — 1 player character |
| **Character sprites** | Sparky: idle (4f, antenna bob), walk (8f, piston feet), jump (6f, compressed→extend), spin (8f, full rotation with blur), happy (3f), sad (3f), thinking (3f) |
| **Enemies** | None (programming puzzle) |
| **Environment** | Factory floor tiles (conveyor belt, gear floor, warning stripe, empty floor) |
| **Tile size** | 64×64 px (isometric-ish 3/4 grid) |
| **Background layers** | Factory background (pipes, machinery, windows) — 2 layers |
| **UI** | Command block palette, conveyor belt slots, skill tree, holo-panel HUD, gear counter, star display |
| **SFX** | Block snap (magnetic thunk), block drag (hum), GO button (countdown beeps), Sparky move (clank), jump (piston hiss), spin (whir), error (buzz), victory (Sparky dance + jingle), skill unlock (chime) |
| **Music** | Chiptune factory ambience — generative layers that add instruments as blocks are placed |
| **Voice** | Speech bubbles with onomatopoeia ("beep boop!", "I can't go that way!") |
| **Animation count** | ~15 (Sparky) + ~8 (environment + UI) |
| **Sprite sheets** | 1 atlas (Sparky), 1 tile sheet (factory floor) |
| **Temp asset** | CSS Sparky (existing), emoji command blocks, no spatial grid, existing procedural audio |

### 11.7 Bit's Grand Adventure (Code Adventure)

| Item | Details |
|------|---------|
| **Characters** | Bit (robot explorer) — 1 player character |
| **Character sprites** | Bit: idle (4f, blink), walk (4f), jump (6f, squash→stretch→arc→land), bump (2f), celebrate (6f), die (4f) |
| **Enemies** | None (puzzle game) |
| **Environment** | 14 `TileType` values from the brief: floor, wall, goal, water, ice, 4 directional conveyors, button, gate, teleporter, corrupt data, and sensor plate |
| **Tile size** | 48×48 px (fixed canvas scale) |
| **Background layers** | Per-world themed backgrounds (1-2 layers) |
| **UI** | Command palette (drag commands), step counter, star display, program sequence list, hardware upgrade screen |
| **SFX** | Add command (ascending blip), remove (descending blip), step forward (soft beep), turn (click), jump (rising tone), bump wall (buzzer), reach goal (major arpeggio), fail (minor scale), water splash, ice sparkle, teleport swirl |
| **Music** | Chiptune per world (5 worlds × 30s loops) — 8-bit style, 16-32 bar loops |
| **Voice** | None |
| **Animation count** | ~10 (Bit) + ~14 (tile animations per type) |
| **Sprite sheets** | 1 atlas (Bit), 1 tile sheet (all tile types) |
| **Temp asset** | Existing inline pixel art (keep but externalize), existing procedural audio (refine) |

### 11.8 Coco's Lost Hat

| Item | Details |
|------|---------|
| **Characters** | Coco plus exactly 6 helpers from the brief: Elephant, Giraffe, Monkey, Turtle, Firefly, and Eagle |
| **Character sprites** | Coco: idle (4f), curious (3f), happy (3f), surprised (2f), determined (3f), sleepy (4f), walk (6f), wiggle (3f). Helpers: each with 3-4 frames (idle + action) |
| **Environment** | 6 biome scenes (riverbank, tall grass, mushroom grove, bamboo thicket, flower meadow, rocky stream) — each has interactive puzzle elements |
| **Tile/Scene size** | Full-screen scenes (not tiled) — SVG/CSS layered illustrations |
| **Background layers** | 2-3 parallax layers per scene (paper-cut style with watercolour textures) |
| **UI** | Storybook-style narration panel, decoration crafting mini-game, world map |
| **SFX** | Tap Coco (wiggle + squeak), puzzle solve (sparkle + stinger), helper action (drum roll + zoom), hat decoration (click + chime), celebration (confetti + fanfare) |
| **Music** | Ambient per biome + narrative underscore (melodic, soft) |
| **Voice** | Greek narration required; English and its production method are gated by D36 |
| **Animation count** | ~20 (Coco + helpers) + ~6 (scene transitions + puzzles) |
| **Sprite sheets** | 1 atlas (Coco), 1 atlas (helpers), scene illustrations rendered as full images |
| **Temp asset** | Existing SVG/CSS art and Greek MP3 narration retained as source references; no additional-language asset is produced before CO-R05 |
| **Note** | This game has the most mature existing assets in the portfolio. Retain paper-cut identity; evolve with watercolour textures and animation. |

### 11.9 Hippo's Great Feast

| Item | Details |
|------|---------|
| **Characters** | Hippo (1 player), 7 enemy types (charger, spitter, flier, yeti, moth, chef, boss) |
| **Character sprites** | Hippo: idle (6f), run (8f), jump (6f), double-jump (6f), dive (4f), charge (6f), ground-pound (6f), flutter (6f), hurt (3f), celebrate (6f). Enemies: each 4-8 frames |
| **Environment** | 10 stages with distinct culinary locations: meadow, marsh, desert, forest, frozen peaks, canyon, lava, cloud, candy, and final-boss arena |
| **Tile size** | 32×32 px (standard platformer) |
| **Background layers** | 3-layer parallax per region (sky, distant terrain, midground) |
| **UI** | Health bar, ingredient meter, cooking journal, recipe display, level select hub map |
| **SFX** | Jump, double-jump, stomp, dive splash, charge crack, ground-pound boom, collect ingredient (pop), recipe complete (steam hiss + chime), enemy defeat (per element: moth→petals, yeti→melt), boss hit (slow-motion crunch), level complete (fanfare) |
| **Music** | Per-region: meadow (acoustic, bright), marsh (moody, blues), desert (percussive, middle-eastern), forest (mysterious, woodwinds), frozen (chimes, sparse), canyon (epic, brass), lava (aggressive, drums), cloud (ethereal, harp), candy (whimsical, music box), boss (intense, full orchestra) |
| **Voice** | Hippo expressive grunts/sighs/munches (synthesized) |
| **Animation count** | ~50 (Hippo + enemies) + ~20 (environment + UI) |
| **Sprite sheets** | 1 atlas (Hippo), 1 atlas (all enemies) |
| **Temp asset** | Base64 inline sprite (replace), existing procedural audio (refine/enhance) |

### 11.10 Little Chef's Grand Kitchen

| Item | Details |
|------|---------|
| **Characters** | 12 customer characters, 3 chef-bot types, and 10 station types: dispenser, cutting board, mixer, oven, toaster, fryer, plate, counter, trash, coffee machine |
| **Character sprites** | Customers: each with idle (4f, breathe), happy (3f, dance), impatient (3f, tap foot), angry (3f, storm out). Stations: each with working animation (mixer spin, oven shimmer, toaster pop, fryer boil) |
| **Environment** | Grid-based kitchen tiles (wooden counter, terracotta floor) — 3 world themes (Roadside Stall, Bistro, Grand Kitchen) |
| **Tile size** | 64×64 px (grid cell) |
| **Background layers** | 2 layers per world (back wall, decorative shelving) |
| **UI** | Recipe book (illustrated), order tickets, customer album, star display, station palette, belt speed controls |
| **SFX** | Ingredient dispense (pop), station processing (mixer whir, oven ding, fryer sizzle, toaster pop), belt movement (gentle clatter), plate station (chime glow), customer happy (purr/bark), customer angry (door slam + shake), bot action (whir-click), recipe complete (fountain of particles + jingle) |
| **Music** | Kitchen ambience per world: stall (bright acoustic), bistro (warm jazz), grand kitchen (orchestral cooking theme) |
| **Voice** | Speech bubbles with emoji for customer communication |
| **Animation count** | ~30 (customer + station animations) |
| **Sprite sheets** | 1 atlas (customer characters), 1 atlas (stations + items), 1 tile sheet (kitchen floor/walls) |
| **Temp asset** | Existing generated pixel art (replace with illustrated art), no audio (implement from scratch) |

### 11.11 Critter Tactics

| Item | Details |
|------|---------|
| **Characters** | 4 critters (the fourth gated by D27), 6 enemy types, and 2 multi-phase bosses |
| **Character sprites** | Critters: each with idle (4f, breathing), move (6f, directional), attack (6f per ability), hit (2f), celebrate (6f), defeat (4f). Enemies: each 4-8 frames |
| **Environment** | Grid maps with exactly 5 terrain types: grass, bush/cover, water/slow, rock/block, and height; bombs are gameplay objects, not terrain |
| **Tile size** | 48×48 px (grid cell) |
| **Background layers** | Forest/woodland battlefields — 2 layers per biome (background, foreground elements) |
| **UI** | Turn indicator (sundial), action log (illustrated portraits), HP bars, ability cooldown indicators, star display, level select map |
| **SFX** | Move (footstep + grid ripple), Bash shove (dusty thud + particles), Hop stomp (ground crack + rumble), Zap ranged (lightning arc + crackle), Wisp heal (soft chime + glow), enemy attack per type (clank, hiss, grind, beep, whir, click), damage (hit flash), kill (slow-motion crunch + banner), victory (orchestral swell), defeat (descending tone) |
| **Music** | Orchestral/tribal blend: 3 chapters × 2 variants = 6 tracks. Woodland theme with mechanical undertones. Dynamic layering: calm exploration → intense combat → triumphant victory |
| **Voice** | D15-gated; enemy machine sounds remain SFX regardless |
| **Animation count** | ~40 (critter + enemy animations) + ~10 (environment + UI) |
| **Sprite sheets** | 1 atlas (all critters), 1 atlas (all enemies), 1 tile sheet (terrain tiles) |
| **Temp asset** | Existing flat-color PNG sprites (replace with illustrated), no audio (implement from scratch) |

---

## 12. Residual Risks & Open Decisions

### 12.1 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Art scope exceeds one-developer capacity | High | High | Start with 3 proof games before full production; use procedural assets where practical; defer 4th+ game art until pipeline is proven |
| Audio quality of procedural Web Audio not sufficient | Medium | Medium | Keep procedural for SFX; use composed/recorded music; fall back to MP3 samples for critical sounds (victory, character voice) |
| Aseprite→Phaser atlas pipeline has friction | Low | Medium | Spike MS-01 validates this; TexturePacker available as paid fallback ($39) |
| Tiled→Phaser tile map export not compatible | Low | High | Spike MS-02 validates this; Phaser can also load CSV tile maps if JSON export fails |
| SVG→Phaser texture quality poor at runtime | Medium | Medium | Spike MS-05 validates this; fall back to PNG rasterized from SVG at target resolution |
| Per-game asset budgets too restrictive | Medium | Low | Budgets are warnings at first; tighten to blocks only after measuring real-world performance |
| Watercolour/illustrated art style inconsistent across games | Medium | Medium | Each game has its own art bible and palette; cross-game consistency not required — each game should have distinct visual identity |
| Reduced-motion fallbacks not tested on all effects | Medium | Low | Shared effects package enforces reduced-motion; game-specific effects must be tested individually |
| Temporary assets not replaced before playtesting | Medium | High | Temp asset inventory tracked in per-game README; CI check for "TEMPORARY" comments blocks art-target gate |

### 12.2 Open Decisions

| ID | Decision | Options / impact | Deadline | Owner | Status |
|---|---|---|---|---|---|
| MS-01 | Primary sprite authoring and atlas export tool | Compare Aseprite export with any required packer contingency; preserve tags and deterministic output | Before FR-08 | Repository owner | Open |
| D13 | Music production source per game | Local composition tools, licensed music, or commissioned work; quality/time/license trade-off | Before Railway Workshop audio target | Repository owner | Open |
| WP-R01 | Animal-call production method | Recorded, clearly licensed, or designed cues; provenance and 96-cue scope drive the choice | Before WP-M02 | Repository owner | Open |
| D36 / CO-R05 | Coco narration language and production scope | Preserve Greek; CO-R05 evidence lets the owner decide whether English ships and the legally usable production method | Before CO-M01 | Repository owner | Open |
| FR-08 | Character animation technique | Tagged frame animation by default; evaluate rigged animation only where it materially reduces production cost | Before first shared character convention | Repository owner | Open |
| ADR-004 | Cross-game media identity | Game media remains local and distinct; only code/generators/conventions are shared | Decided | Repository owner | Resolved |
| MS-03 / D23 | Browser image formats | Select PNG/WebP use from measured quality, size, atlas stability, and browser matrix | Before final Railway media | Repository owner | Open |

---

## 13. Production Sequence Summary

### Stage 1: Foundation + Showcase (Railway Workshop)
1. Complete tool evaluation spikes MS-01–MS-08.
2. Create the Railway Workshop asset tree and manifests.
3. Approve its art bible and style tile.
4. Replace temporary train, track, terrain, and UI assets in the complete vertical slice.
5. Replace temporary audio with designed SFX and approved music.
6. Validate one complete level at final media quality before mass production.

### Stage 2: Three Genres (Wild Pairs + Canopy Caper)
1. Wild Pairs: 96 watercolour animal illustrations in habitat-sized production batches, plus 8 habitat backgrounds
2. Wild Pairs: animal call samples, per-habitat ambient music
3. Canopy Caper: Kiko full animation set (14 states), branch/vine environments
4. Canopy Caper: Latin percussion music, jungle SFX
5. Shared atlas/tile pipeline validated across all three games

### Stage 3: Adventure Wave (Cheese Heist + Coco + Hippo)
1. Cheese Heist: Pip full animation (12 states), 6 kitchen room environments
2. Cheese Heist: heist jazz soundtrack (6 variants), stealth SFX
3. Coco: evolved paper-cut with watercolour, 6 biome scenes, 2D skeletal animation
4. Hippo: hand-drawn sprites, 10 painted culinary region backgrounds
5. Full audio: region-specific music tracks, kitchen/animal SFX libraries

### Stage 4: Systems Wave (Valley + Robot Factory + Code Adventure)
1. Valley of Echoes: 20–25 creature sheets produced in batches and 6–8 painted authored biome-zones
2. Valley of Echoes: per-biome ambient textures, Echo/harp SFX
3. Sparky's Assembly Line: pixel-art Sparky (10 states), factory floor tile set
4. Bit's Grand Adventure: 16×16 animated Bit, 14 tile types, 5 world themes
5. Chiptune/electronic music production for programming games

### Stage 5: Flagship Wave (Little Chef + Critter Tactics)
1. Little Chef: 10 illustrated station types and 12 customer characters
2. Little Chef: kitchen soundscape, station operating sounds, per-world music
3. Critter Tactics: illustrated critter/enemy sprites, terrain tiles
4. Critter Tactics: orchestral/tribal soundtrack, battle SFX
5. Final portfolio-wide asset quality audit
