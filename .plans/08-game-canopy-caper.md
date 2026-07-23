# Canopy Caper

**Existing version:** `monkey-banana.html`

## Idea

A lively jungle platform game about climbing through branches, collecting fruit, and using vines to cross gaps.

**Player fantasy:** Be a nimble monkey racing through the canopy.

## Main play

1. Move and jump between branches.
2. Grab a vine and swing across a gap.
3. Collect fruit or find a hidden route.
4. Reach the top or end of the climb.
5. Replay to move more smoothly or find more fruit.

Movement feel matters more than the amount of content.

## Controls

| Action | Touch | Keyboard |
|---|---|---|
| Move | Left/right touch controls | A/D or arrows |
| Jump | Large jump button | Space or Up |
| Release vine | Jump or release control | Space or Down |
| Pause | Pause button | Escape |

Touch movement and jump must work together reliably.

## Smallest fun version

- one authored climb
- responsive running and jumping
- one vine swing that feels good
- reachable fruit
- camera movement that keeps the route readable
- jump, landing, vine, collect, and completion sounds

## Current version

One authored vertical climb now lives in `games/canopy-caper/`. It includes running and jumping, one mandatory vine crossing, six pieces of fruit, two checkpoints, respawning, camera tracking, touch and keyboard controls, pause and completion screens, fullscreen support, and procedural visuals and sound. The original is preserved at `classic/monkey-banana.html`.

Tablet playtesting found that the touch controls make it difficult to combine direction and jumping. The next change should make simultaneous movement and jump input reliable and comfortable, then retest the full climb before tuning the vine or adding content.

## If it stays fun

- moving branches
- wall jumps
- gliding and wind
- hidden treasures
- alternate routes
- a small set of hand-made stages

Every movement ability must earn its place. Remove any ability that makes touch controls cluttered or the platforming less clear.

## Look and sound

Lush painted jungle layers, a lively expressive monkey, dappled light, leaf particles, bouncy fruit sounds, rope creaks, wind, and playful percussion.

## Tricky logic worth testing

- platform and one-way collision
- vine release momentum
- stage spawn, goal, and collectible reachability
- saved stage progress if added

Most movement tuning should be done by playing, not by testing equations alone.

## Ready for the portfolio when

One complete climb feels joyful on the tablet, misses feel fair, the player always understands where to go, and movement has satisfying animation and sound.
