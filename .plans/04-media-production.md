# Art, Animation, and Sound

Art and sound should give each game its own personality. The goal is a coherent, delightful result, not a large production system.

## Start small

Before making lots of assets, decide together:

- the visual mood
- a small color palette
- the shape and texture style
- how the main character or object should feel
- the sounds that make the main action satisfying

A short note and one representative playable screen are enough. No formal art bible or approval sequence is required.

## Practical workflow

1. Build the main interaction with obvious temporary art.
2. Play and tune it.
3. Replace the most visible temporary pieces first.
4. Add animation to important actions.
5. Add sound to input, success, failure, movement, and ambience where it helps.
6. Stop when the game feels intentional and complete.

Emoji, rectangles, and procedural tones are useful while building. They may remain final only when they suit the chosen style.

## Asset layout

Use only the folders a game needs:

```text
assets/
  source/     optional editable originals
  images/
  audio/
  fonts/
```

Atlases, tile maps, and extra folders may be added for games that use them. Never hand-edit generated Vite output.

## Visual consistency

Within one game:

- use a coherent palette and illustration style
- keep controls readable over the background
- make important objects easy to recognize
- use animation and effects to explain actions, not hide them
- keep touch feedback visible around or above the player's finger

Do not force every portfolio game to share one visual style.

## Animation and effects

Animate what matters most:

- the player's main action
- accepted and rejected input
- impacts and collection
- state changes
- success and failure

Use Phaser tweens, cameras, particles, and animation tools. A few well-timed effects are better than constant motion.

## Sound

Make a short cue list for the game:

- main action
- movement or placement
- collect or reward
- mistake or danger
- success
- interface taps
- music or ambience if it improves the mood

Unlock audio on the first gesture and pause or soften it when the page is hidden. Add separate music and effects controls only when useful.

Use recorded, designed, composed, or procedural sound according to what sounds good and is practical. Do not force every cue into the same method.

## Sources and licenses

For third-party assets, keep a short note beside the game with:

- file
- creator or source
- license
- any required credit

Do not use assets with unclear permission. Keep required game assets local rather than depending on a CDN.

## File size

Compress assets when loading becomes slow or the game becomes too large. Lazy-load large scenes, music, or narration when useful. Do not impose guessed portfolio-wide budgets.

## Starting moods for the rewrites

These are creative starting points, not fixed specifications:

| Game | Possible mood |
|---|---|
| Railway Workshop | warm handmade model railway |
| Wild Pairs | watercolour wildlife field journal |
| Canopy Caper | lush painted jungle layers |
| Cheese Heist | playful miniature kitchen caper |
| Valley of Echoes | painterly living wilderness |
| Sparky's Assembly Line | bright mechanical toy factory |
| Bit's Grand Adventure | clear, cheerful pixel-code world |
| Coco's Lost Hat | layered paper theatre with watercolour texture |
| Hippo's Great Feast | colourful culinary storybook |
| Little Chef's Grand Kitchen | warm illustrated cookbook kitchen |
| Critter Tactics | woodland storybook against clockwork invaders |

Change any of these when the owner and daughter prefer another direction.
