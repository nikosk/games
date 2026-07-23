# Critter Tactics

**Existing version:** `thegame/`

## Current version

The portfolio builder now installs and builds the existing Vite game, then publishes its built output under `docs/thegame/`. The immediate broken raw-source entry has been fixed. A Phaser/TypeScript rewrite remains an optional future game, not urgent repair work.

## Idea

A friendly woodland tactics game where enemy intentions are shown first, then the player positions a small critter team and chooses how to respond.

**Player fantasy:** Lead clever animal friends against clockwork invaders.

## Main play

1. See what each enemy plans to do.
2. Select a critter.
3. Move to a useful cell.
4. Use that critter's distinct ability.
5. Resolve the turn and respond to the new situation.
6. Win a short hand-made battle.

The visible-intent turn loop is the strongest part of the current game and should remain central.

## Controls

| Action | Touch | Keyboard/mouse |
|---|---|---|
| Select critter | Tap | Click |
| Move | Tap highlighted cell | Click cell |
| Use ability | Tap valid target | Click target |
| Skip or end turn | Tap button | Button/key |
| Inspect unit or terrain | Tap and hold or info button | Hover/click |

## Smallest fun rewrite

- one compact battle
- the current three critters and their distinct abilities
- two readable enemy behaviors
- visible enemy intent
- movement, targeting, turn resolution, victory, and retry
- clear impact animation and sound

Move battle rules out of the large scene so they can be understood and tested, but keep the implementation direct.

## If it stays fun

- terrain such as cover, water, and rocks
- more enemy behaviors
- one additional critter with a genuinely different role
- upgrades between battles
- a small campaign
- a boss
- custom battles

There is no required battle, unit, terrain, or boss count.

## Look and sound

Illustrated woodland board, distinct critter silhouettes, charming clockwork enemies, readable intent icons, carved-wood interface, punchy ability effects, woodland music with mechanical rhythms, and satisfying impacts.

## Tricky logic worth testing

- pathfinding and occupancy
- ability targeting and damage
- enemy intent and resolution order
- bombs or terrain if retained
- victory and defeat
- campaign saves and optional old-save import

## Ready for the portfolio when

The existing portfolio game continues to build and open correctly. If it is rewritten, one battle should be tactically interesting, readable on tablet, deterministic under the rules, and satisfying to complete.
