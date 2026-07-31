# Cheese Heist

**Existing version:** `mouse-adventure.html`

## Idea

A playful mouse-scale kitchen caper. Sneak past a guard, make a distraction, steal a special cheese, and escape through a vent.

**Player fantasy:** Be a clever tiny mouse outsmarting a giant kitchen.

## Main play

1. Explore a room from the mouse's tiny point of view.
2. Watch a guard's route and sight line.
3. Hide or create a distraction.
4. Reach the cheese.
5. Escape without being caught.

Being spotted should create a funny chase and a quick recovery, not a punishing lives system.

## Controls

| Action | Touch | Keyboard |
|---|---|---|
| Move | Left/right controls | A/D or arrows |
| Jump | Jump button | Space or Up |
| Pause | Pause button | Escape |

The mug, spoon, cheese, and vent react automatically when the mouse reaches them. Keep the controls small unless playtesting proves another action is genuinely needed.

## Smallest fun version

- one kitchen room
- mouse movement and jumping
- one guard with a readable patrol and sight line
- one hiding place
- one distraction
- one cheese and one escape vent
- a complete stealth-to-escape loop

## Current version

A simpler first heist lives in `games/cheese-heist/`: one warm moonlit kitchen room, an expressive mouse, a patrolling cat with a readable sight cone, a mug hiding spot, an automatic spoon distraction, a guarded cheese on the counter, and a vent escape. The player only moves and jumps; the room reacts automatically when the mouse reaches each prop. Getting caught is a quick funny reset with nothing lost. Keyboard (A/D, arrows, Space, Esc) and three-button touch controls, pause/restart, fullscreen, and procedural art and sound. Not yet playtested on the target tablet.

## If it stays fun

- cats, traps, and different guard behaviors
- several kitchen rooms
- more distraction objects
- vents and alternate routes
- stealth or speed scoring
- a final chase

## Look and sound

Warm miniature kitchen scenery, dramatic moonlight, oversized utensils and food, an expressive mouse, readable danger colors, soft footsteps, comic guard reactions, and playful heist jazz.

## Tricky logic worth testing

- sight-line and cover checks
- guard patrol and distraction return
- reachable cheese and escape
- chase reset behavior
- saved room progress if added

## Ready for the portfolio when

One heist can be understood without long instructions, touch controls are comfortable, detection feels fair, getting caught is not frustrating, and stealing the cheese feels rewarding.
