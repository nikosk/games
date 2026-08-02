# Sparky's Assembly Line

**Existing version:** `robot-factory.html`

**Status (implemented):** The Phaser+TS rewrite lives at `games/sparky-assembly/` and replaces
`robot-factory.html`, which now redirects to the new game; the original is kept at
`classic/robot-factory.html`.

Every playable puzzle is now a deterministic, solver-checked **Random Shift** on a 5×5 floor.
Shifts vary the robot start, walls, cargo types, docks, orientation, and whether one or two parts
must be delivered. Single deliveries use an 8-slot belt and double deliveries use 10 slots. Each
part must be dropped on the dock with the same colour and glyph; the wrong dock is refused without
losing the part. Every shift is verified reachable and solvable within its belt capacity before it
appears. A longer celebration now plays after each solution and automatically opens the next random
puzzle. Run, Step, Undo, Clear, sound, and fullscreen are on screen and via keyboard. The robot,
workbench backdrop, and the three cargo props (gear bin, battery pack, circuit crate) are generated raster art; the steel
floor, walls, docks, plates, and effects are Phaser graphics; sound is procedural Web Audio.
Workspace typecheck, tests, and build pass. Still
needs: tablet playtest and tuning.

## Idea

A tactile programming puzzle where command modules are snapped onto a conveyor and Sparky carries them out on a factory floor.

**Player fantasy:** Build a little program, press Run, and watch a friendly robot make it work.

## Main play

1. Look at a small factory task.
2. Arrange movement and action modules in order.
3. Run the program.
4. Watch Sparky execute each command.
5. Change the sequence when it fails.
6. Celebrate when the job is complete.

The program should always be readable from what Sparky does.

## Controls

| Action | Touch | Keyboard/mouse |
|---|---|---|
| Add command | Tap its large button | W / A / D / G or arrow keys |
| Remove command | Tap a filled belt slot | Backspace / Delete removes the last command |
| Run program | Tap Play | Space / Enter |
| Step once | Tap Step | S / Period |
| Undo or clear | Tap Undo or Clear | Backspace / Delete or C |

## Smallest fun version

- one tiny factory floor
- move, turn, grab, and release modules
- a short command belt
- visible step-by-step execution
- a clear explanation of the first failure
- one complete box-moving puzzle

## If it stays fun

- loops and sensors
- reusable command groups
- more machines and object types
- solution scoring
- a few themed factory floors
- a free-build toy box

Build new command types only when a puzzle needs them.

## Look and sound

Bright mechanical toy factory, physical modules with lights and satisfying snap, an expressive Sparky, moving belts, clanks, pneumatic hisses, hums, and a cheerful robot dance.

## Tricky logic worth testing

- deterministic command execution
- matching deliveries and locked completed cargo
- generated floor validity and variety
- shortest-program solving within each belt
- seeded Random Shift determinism

## Ready for the portfolio when

A child can arrange a short program, understand what went wrong by watching Sparky, fix it, and enjoy the successful machine sequence.
