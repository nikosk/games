# Railway Workshop

**Existing version:** `train-tracks.html`

## Idea

A warm model-railway puzzle where the player lays track across a small diorama, starts the train, and watches it travel safely to its destination.

**Player fantasy:** Build and operate a tiny railway.

## Main play

1. Choose a track piece.
2. Place and rotate pieces on the board.
3. Connect the station to the destination.
4. Start the train.
5. Watch it travel, celebrate success, or adjust a broken route.

The pleasure should come from arranging a route and then seeing the little train come alive.

## Controls

| Action | Touch | Keyboard/mouse |
|---|---|---|
| Choose track | Tap palette | Click palette |
| Place track | Tap cell | Click cell |
| Rotate track | Tap placed piece | Click placed piece |
| Remove track | Drag to bin or use remove button | Right-click or remove button |
| Start train | Pull or tap the throttle | Click throttle |
| Undo | Tap undo | Ctrl+Z |

Keep the board and palette comfortable on the target tablet. Replace browser alerts with in-game feedback.

## Smallest fun version

- one hand-made board
- straight and curved track
- clear route highlighting
- a train that follows a valid route
- a satisfying whistle, track clack, and success moment
- temporary but coherent model-railway art

This is the first rewritten game and should also prove the basic Phaser, TypeScript, Vite, touch, sound, and portfolio build setup.

## If it stays fun

- junctions, bridges, tunnels, and switches
- passengers or cargo to collect
- tighter route puzzles
- several visual regions
- a free-build railway table
- progress and best solutions

Add these one at a time. There is no required level count.

## Look and sound

Warm handmade model railway: painted scenery, chunky wooden track, brass and wood controls, steam puffs, wheels, whistle, rhythmic clacking, and a cheerful completion tune.

## Tricky logic worth testing

- track connections after rotation
- valid route finding
- train path through junctions
- authored board validity
- save data if progression is added

## Current version

Five handcrafted puzzles now live in `games/railway-workshop/`, progressing from Pinecone Path's short first route through Garden Zigzag, Meadow Loop, Rocky Ridge, and the tighter Sunset Express. They share straight and curved pieces, rotation, removal, undo, route highlighting, a moving train, original sound effects, level selection, and next/replay actions. Its responsive canvas fills the viewport, the map dominates landscape screens, and the compact controls sit in a right-side panel with a fullscreen toggle. The original is preserved at `classic/train-tracks.html`.

It has been playtested on the target tablet. The puzzle, touch controls, layout, and feedback are working well.

## Ready for the portfolio when

One complete puzzle feels good by touch, the train journey has clear visual and sound feedback, the built game opens cleanly, and the original is preserved under `classic/`.
