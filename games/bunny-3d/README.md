# Bunny in 3D

## Bunny II — Pip & the Lost Colors

Play [Bunny II — Pip & the Lost Colors](https://nikosk.github.io/games/bunny-3d/adventure.html) from the public games shelf. The [local preview](http://100.72.122.109:4189/games/bunny-3d/adventure.html) remains available. It uses the approved bunny and the garden's Blender/Three.js approach. The character viewer and garden remain available at their original addresses.

Tap the ground to hop, or tap an object/picture to approach it. The camera frames each clearing automatically. The map connects six locations; the rainbow stone gives picture hints. Progress saves in this browser. Sound, pause and fullscreen are available. “Start over” appears on the saved-game title screen, pause menu and ending; a separate confirmation protects progress from accidental taps. Finishing brings a dancing celebration, which continues behind the ending card and during free play on Rainbow Hill.

- **Bedroom:** discover the rainbow stone.
- **Pond:** remove the branch and use it to clear the leaves, restoring blue water and green Hoppy. Collect and fill the watering can.
- **Haystack:** arrange the short and tall blocks into steps so Fluffy reaches her nest, restoring yellow. Blocks can be moved again after a wrong arrangement.
- **Hollow log:** place a rounded stone, rest the branch on it, and ask Rusty to press the lever. The visible trapped ball rolls free; orange returns.
- **Meadow:** turn the broad watering spout toward the flowers and pour into the basin. Red and purple blossoms open. A wrong test pour leaves water for another try.
- **Rainbow Hill:** once all six colors are restored, place the stone and ring the bell for the rainbow celebration.

After the pond, the three middle puzzles can be completed in any order. There are no timers or lost items. The story has brief optional captions; actions and hints use pictures and animated reactions.

`blender/build_adventure.py` authors the scenery, props and friends, exporting `assets/bunny-ii-world.glb` and the editable `blender/bunny-ii-world.blend`. Named Blender groups provide the moving pivots. Painted surfaces reuse the garden's generated gouache atlas; shapes and mechanisms are real 3D geometry. Each location is a separate root group in the Blender file. The browser supplies color restoration, water, character reactions, sparkles and the rainbow. Music and reactions are synthesized locally; this version has no recorded narration.

```bash
blender -b --python games/bunny-3d/blender/build_adventure.py
npm run typecheck --workspace @games/bunny-3d
npm test --workspace @games/bunny-3d
npm run build --workspace @games/bunny-3d
```

`src/adventure-state.ts` contains the puzzle and save rules; `adventure-world.ts` connects Blender geometry to the presentation; `adventure.ts` handles movement and the interface. Tests cover the complete puzzle chain, all six middle-puzzle orders, recoverable mistakes, saves, navigation and exported assets. Browser touch playthroughs cover the opening through the ending, wrong attempts, direct 3D picking, cancelling a route, reloading partial progress, free play, pause/mute and portrait layout, without console errors. Physical Galaxy Tab S6 Lite performance still needs a play check.

## Character viewer

A 3D character viewer with two versions. The default follows the supplied reference of a seated ivory bunny with large blue eyes, upright pink ears and a yellow bow. **Previous bunny** opens the earlier cream bunny in raspberry dungarees from **Bunny’s Picnic**. Both have breathing, hello, hop and curious animations. Drag to orbit; pinch or scroll to zoom.

The bow bunny rests with a closed smile. **Talk** previews mouth movement and can run alongside any body pose; press it again to return to the smile. This preview has no audio. Pause freezes both the body and mouth.

**Hello** raises the paw, gives two small wrist waves, and eases back to rest. The rig includes separate hand joints and blended shoulder, elbow, and wrist weights.

This is the requested Blender/3D experiment, using Three.js as an explicit exception to the repository’s Phaser game stack. It is a separate demo; the existing adventure remains intact.

## Explore one garden

Visit `garden.html`. Brief: put the approved bunny in one garden based on the painted picnic artwork, with gentle movement and a few things to play with. Tap the ground to hop there, or use arrows/WASD. The play camera keeps its angle and zoom fixed and moves gently only when Bunny leaves the middle of the view. **Look around** enables drag-to-orbit and pinch/scroll zoom for inspecting the art; **Back to Bunny** restores the play view. The reset arrow brings Bunny into view. **The drawing** opens the original garden for comparison.

Picture clues mark six objects. Tap a clue or the object itself: Bunny approaches it, faces it, and reacts. The basket opens to reveal apples and closes on another tap; the cloth spreads and folds; each of the four cushions bounces and plays a different note. Sparkles and quiet sounds accompany reactions, with a sound toggle. Choosing another object or a patch of grass cancels the previous approach. These are repeatable play interactions, with no puzzle sequence or saved progress.

Current preview: <http://100.72.122.109:4189/games/bunny-3d/garden.html>.

- `blender/picnic-garden.blend` is the editable environment. `blender/build_garden.py` models its terrain, paths, branching trees, cottage, fence, cushions, folded cloth, flowers and woven hamper, then exports `assets/picnic-garden.glb` and `assets/garden-layout.json`. Interactable props have separate pivots; the hollow basket contains modeled apples and a hinged lid. Their exported metadata supplies the browser's object positions and approach distances.
- `assets/garden-materials.png` is the generated gouache surface atlas, made with the built-in imagegen tool using `../bunnys-picnic/assets/review/garden-before.png` as its style reference. The complete prompt is in `assets/garden-materials.prompt.txt`. Generated images supply paint and grain; Blender supplies the three-dimensional shapes. This is an authored interpretation of the drawing, not an automatic image-to-mesh conversion.
- `blender/export_garden_bunny.py` derives `assets/garden-bunny.glb` from the detailed bow bunny. It simplifies the dense body surfaces while keeping the eyes, lashes, nose, bow, skin weights, body clips and mouth control. The original character stays unchanged. The game export has about 123,000 triangles and is about 5 MB, down from the original 28 MB.
- `src/garden-navigation.ts` handles reachable tap destinations and routes around the props. Hops advance during the airborne part of the existing Blender animation and settle before resting. Static scenery shadows are cached; Bunny has a moving contact shadow.

Regenerate these assets from the repository root:

```bash
blender -b --python games/bunny-3d/blender/build_garden.py
blender -b --python games/bunny-3d/blender/export_garden_bunny.py
npm run build --workspace @games/bunny-3d
```

Navigation tests cover obstacle clearance, blocked/outside taps, reachability, path corners and landing. Camera tests check steady angles, fixed zoom, gentle edge following and frame-rate independence. Interaction tests check safe approach routes and the exported prop pivots. Asset tests also cover the lighter character. Browser checks exercise touch movement, object reactions and cancellation, camera modes, the reference panel, and landscape/portrait layouts. Physical tablet performance still needs a play check on the Galaxy Tab S6 Lite.

## Open

```bash
npm run dev --workspace @games/bunny-3d
```

Visit <http://localhost:4188/games/bunny-3d/>. The server also prints a LAN address for the tablet. Use **Reference** to compare the current source image, **Clay** to inspect the geometry, and **3D model** to download the current GLB. Space pauses animation; F opens fullscreen. Camera shortcuts: 1 portrait, 2 front, 3 back. Append `?model=picnic` to open the earlier version directly.

For the production build, run `npm run preview --workspace @games/bunny-3d` and open <http://localhost:4189/games/bunny-3d/>. The current review server is already running there.

## The actual assets

- `blender/bow-bunny.blend` and `blender/build_bow_bunny.py`: the new seated sculpt, rounded paws, recessed blue eyes with blended blinking lids, fine lashes, cupped ears, folded bow, skeleton, four body clips and a separate talking clip.
- `assets/bow-bunny.glb`: the new self-contained character. `bow-bunny-info.json` records its measurements.
- `assets/bow-bunny-reference.png`: the supplied screenshot, preserved unchanged for comparison.
- `assets/bow-bunny-surface.png`: an authored neutral microtexture. The new model uses smooth surfaces and soft shading without the earlier model's hair geometry. Iris fibres and subtle facial colours are painted into the mesh.
- `assets/bow-bunny-portrait.png`: a render of the new model.
- `blender/bunny.blend`: editable sculpt, clothing, skeleton, animation clips, embedded generated textures, and a portrait lighting setup.
- `blender/build_bunny.py`: repeatable asset authoring, including continuous voxel-sculpted head/paws/tail, inset ears, layered eyes, curved eyelashes that follow blinks, painted rosy cheeks, an open smile, seams, stitches, pocket, brass buttons, skin weights, and animation.
- `assets/bunny.glb`: self-contained textured, skinned character with four clips. It can be opened independently of this viewer.
- `assets/bunny-materials-v2.png`: final generated fur/fabric/ear atlas. The first attempt is retained as `bunny-materials.png`.
- `assets/materials.prompt.txt`: exact prompts and references, made with the built-in image-generation tool.
- `assets/model-info.json`: measurements from the Blender export.
- `assets/bunny-portrait.png`: a rendered portrait of the actual model.

The earlier model uses generated surface images. Blender provides the actual three-dimensional geometry, skinning, and motion for both versions. The viewer adds a small botanical display, studio lighting, and contact shadows. No image generation, external font request, or backend is needed when viewing it.

The bow GLB includes a `MouthOpen` morph target: `0` is the closed smile and `1` is fully open. It moves the mouth, tucks the tongue away when closed, and subtly lowers the chin. The `Talk` clip animates only this target, so it can play alongside `Idle`, `Wave`, `Hop`, or `Curious`. A game can instead drive the target directly from speech timing; stop the preview clip first so the two controls do not compete.

## Blender and MCP on this machine

Blender 4.5.14 LTS is installed at `~/.local/opt/blender-4.5.14-linux-x64`, with `~/.local/bin/blender` on the path. Its archive was checked against Blender’s published SHA256.

The community [MCP for Blender](https://github.com/ahujasid/mcp-for-blender) 2.1.9 (source commit `7a0373e`) is installed at `~/.local/share/bunny-blender-mcp`, with its add-on in `~/.config/blender/4.5/scripts/addons/blender_mcp.py`. The `blender` server is registered in Codex’s user configuration. Telemetry is disabled. The add-on listens on localhost:9876.

Open the saved file and enable the connection:

```bash
blender games/bunny-3d/blender/bow-bunny.blend --python games/bunny-3d/blender/start_mcp.py
```

MCP was used in the authoring session through a real stdio MCP client. The helper allows use without restarting an already-running assistant session; newly registered native MCP tools may require restarting the Codex client.

```bash
~/.local/share/bunny-blender-mcp/.venv/bin/python games/bunny-3d/blender/mcp_client.py --info
~/.local/share/bunny-blender-mcp/.venv/bin/python games/bunny-3d/blender/mcp_client.py --script games/bunny-3d/blender/build_bow_bunny.py
```

The new build script clears the two demo studies' named collections from the working scene and writes only the `bow-bunny` files; the earlier model's saved files remain intact. Use `build_bunny.py` to regenerate the earlier version. For ordinary manual modeling, edit the `.blend` directly and save a separate version before regenerating. Blender also supports a direct background build:

```bash
blender -b --python games/bunny-3d/blender/build_bow_bunny.py
```

## Checks

```bash
npm run typecheck --workspace @games/bunny-3d
npm test --workspace @games/bunny-3d
npm run build --workspace @games/bunny-3d
```

The asset tests inspect both exported GLBs: embedded textures, geometry, joint references, normalized weights, finite animation keys, loop seams, proportions, feet, and attachment points. They also check the closed mouth default, mouth deformation, independence of speech from body animation, and the wave's upright paw, smooth movement, and return to rest. A production build lives in `dist/`, with `/games/bunny-3d/` paths. The root `npm run build` includes this package in `docs/`; the public catalog links directly to the adventure.

The browser review uses desktop and emulated touch sizes; it does not establish performance on the physical Galaxy Tab S6 Lite.

## Credits

The seated character follows the user’s supplied reference screenshot. The earlier character reference comes from this repository’s generated Bunny’s Picnic artwork. All Bunny geometry and animation are authored here. The generated material prompts for the earlier version are preserved alongside its textures. DM Sans and Lora are bundled under their included SIL Open Font Licenses. The contact shadow implementation follows the [Three.js contact shadow example](https://github.com/mrdoob/three.js/blob/r180/examples/webgl_shadow_contact.html), under Three.js’s MIT license. The dungeon-crawler study informed the Blender-to-GLB approach; its character geometry and assets were not used.
