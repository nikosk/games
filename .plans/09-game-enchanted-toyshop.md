# The Enchanted Toyshop

## Tiny brief

**Player fantasy:** Wake a cozy toyshop at night and solve its magical picture puzzles.

**Main action:** Tap eight glowing room objects, solve a varied word-free puzzle at each one, and restore the stars that open the moonlit door.

**Controls:** Large tap and drag targets. No reading and no voice-over.

**Visual mood:** A handcrafted paper theatre made from layered card, felt toys, painted wood, embroidery, plum curtains, and cream-and-gold magic.

## Audience

Ages 3–5. Every clue must be visual. Mistakes should gently reset only the current action, never remove progress.

## Current version

The playable version replaces Cheese Heist at `games/cheese-heist/` while keeping its public URL. A visual level picker gives direct access to both rooms. Each room has eight large clickable objects, home and fullscreen controls, and a full-viewport responsive canvas.

Level 1 randomly assigns eight distinct visual puzzles: colour match, light melody, shadow fit, kaleidoscope dials, find the twin, odd one out, toy tower, and peekaboo pairs.

Level 2 randomly assigns eight early-number puzzles: count and match, picture addition, number train, more or fewer, number dials, number melody, find the group, and numeral/group odd one out. Generated challenges stay within numerals 1–5 and have one unambiguous solution.

Each solved object restores a star without losing earlier progress. All eight stars open the moon door. A generated paper fairy guides the child, flies through the Level 1 door, and celebrates after Level 2 before returning to the picker. The original Cheese Heist is preserved at `classic/cheese-heist/`.

The production art direction is **handcrafted paper theatre**: layered cut paper, felt toys, painted wood, embroidered details, deckled edges, and shallow material shadows. Generated assets carry the room and character presentation; Phaser provides deterministic hit areas, rules, animation, timing, input, and feedback.

## Next playtest

Watch whether a child discovers the first glowing display, understands dragging without help, can follow the visual melody, and wants to replay. Simplify any puzzle that needs explanation.
