---
name: game-art
description: Generate and integrate affordable raster game art with ByteDance Seedream 4.5 through OpenRouter. Use when asked to create or improve game illustrations, characters, sprites, cards, backgrounds, textures, or painted UI assets.
compatibility: Requires Node.js, ImageMagick, and an OpenRouter key in OPENROUTER_API_KEY or OpenCode's credential store.
---

# Game Art

Generate project-bound raster assets with `bytedance-seed/seedream-4.5` through OpenRouter. Do not use OpenAI or Codex image generation unless the user explicitly asks to compare providers.

Seedream currently costs $0.04 per completed output image regardless of resolution. The provider rejected 1K during testing, so the wrapper requests its 2K tier and immediately downsizes the result for the game.

## Before generating

1. Read `.plans/04-media-production.md`, the game's brief, and the relevant scene or asset notes.
2. Check existing art so the new asset fits the game rather than inventing a new direction.
3. Choose the smallest useful asset set. Start with one representative asset when the style is not yet proven.
4. State the number of calls and expected cost before generating. Ask before making more than four calls in one task.
5. Do not generate art before fixing a known gameplay problem unless the user explicitly prioritizes the art.

## Prompt source

Keep each final specification beside the game:

```text
games/<game-id>/assets/source/<asset-name>.prompt.md
```

Use this short shape and omit irrelevant lines:

```markdown
# <Asset name>

Asset type: <character pose, card portrait, background layer, prop, texture, UI decoration>
Purpose: <where and at what displayed size it appears>
Subject: <main subject and action>
Style: <medium, shape language, texture>
Composition: <viewpoint, framing, aspect ratio, padding, silhouette>
Palette and light: <fixed palette and light direction>
Reference images: <ordered role of each reference, if any>
Must preserve: <character/style invariants for related assets>
Constraints: <no text, no watermark, no cast shadow, etc.>
Background: <scene, opaque, or transparent cutout>
```

Describe function and readability before decorative detail. For small game objects, require a clear silhouette at the intended display size. Do not ask the model to render interface text.

## Generate one asset

Resolve the skill directory from this `SKILL.md`, then run:

```bash
bash <skill-dir>/scripts/generate.sh \
  --prompt games/<game-id>/assets/source/<asset-name>.prompt.md \
  --out games/<game-id>/assets/images/<asset-name>.webp \
  --aspect 1:1 \
  --max-dim 384
```

Optional arguments:

```text
--reference <path>   Attach an image as a style or character reference; repeat as needed
--transparent        Request a magenta chroma background and remove it locally
--quality <1-100>    Final WebP/JPEG compression quality; default 86
```

The wrapper:

- reads `OPENROUTER_API_KEY`, falling back to the existing OpenCode OpenRouter credential without printing or copying it
- calls OpenRouter's `/api/v1/images` endpoint with `bytedance-seed/seedream-4.5`
- requests 2K at the chosen aspect ratio
- supports ordered reference images using base64 data URLs
- writes the provider source only to a temporary file
- downsizes and strips metadata with ImageMagick
- keeps only the optimized project asset
- refuses to overwrite existing output
- reports the actual API cost, dimensions, channels, and final file size

Do not create ad-hoc API calls when this wrapper supports the request. Never print, copy, commit, or expose the API key.

## Size guidance

Pick the final size from actual display size, not from provider output:

- Card portraits and UI icons: `--max-dim 384`
- Small props: `--max-dim 512`
- Character sprites: usually `--max-dim 768`
- Full-screen backgrounds: match the largest intended viewport, usually 1280–2048px on the long edge

Prefer WebP for opaque or transparent game art. Use PNG only when exact lossless pixels are necessary. Do not keep the 2K provider source unless the user explicitly wants an editable master.

## Variants and consistency

- Generate distinct assets with distinct calls.
- For alternatives, use versioned names such as `mouse-idle-v1.webp` and `mouse-idle-v2.webp`.
- Inspect every result with `read` before integrating it.
- Change one prompt detail at a time when iterating.
- For recurring characters, approve one anchor image first and attach it as the first `--reference` for later poses. Repeat invariant traits in every prompt.
- Generate animation poses individually from the anchor. Do not request a whole sprite sheet unless rough concept exploration is the goal.
- Keep collision-critical tracks, platforms, grids, and touch controls deterministic in Phaser; generated art may decorate them but must not define their geometry.

## Transparent assets

Use `--transparent` and a `.webp` or `.png` output path. The wrapper adds strict flat-magenta chroma instructions and removes the background locally.

After generation, verify alpha:

```bash
identify -format '%[channels]\n' games/<game-id>/assets/images/<asset-name>.webp
```

Expect an alpha-bearing result such as `srgba`. Inspect edges at the intended game size. Reject visible color fringe, clipped limbs, cast shadows, or excessive empty padding.

## Integrate and finish

1. Preserve the prompt file and final optimized image.
2. Record the model and OpenRouter source in the game's asset note and preserve the prompt; note any provider terms that require attribution.
3. Load and display the asset with Phaser rather than replacing Phaser asset handling.
4. Check it at its real size and on the target layout.
5. Run the changed game's type check, useful tests, and production build.
6. Report generated paths, cost, checks run, and anything that still needs visual or tablet review.

## Batches

Seedream charges per output image. Generate sequentially unless the user asks for a batch. Stop after a failed request rather than retrying paid calls blindly. OpenRouter documents that failed generations are not charged, but always report failures plainly.
