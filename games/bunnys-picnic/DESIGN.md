# Bunny’s Picnic

## Adventure design

**Current direction:** the game is wordless. Painted gestures, thought pictures, object-to-destination demonstrations, and short nonverbal reactions replace all spoken dialogue. The older quoted lines below record the intentions of those cues; they are no longer performed.

A complete tablet adventure for a three-year-old: help Bunny bring three friends together for a picnic. Explore five connected places, discover useful objects, and solve eight small problems through touch, observation, and experimentation. Finish with a picnic that remains playable.

This is a proposed design for review before implementation. The first version she sees should have the complete story, finished visuals and sound, expressive characters, and comfortable controls. Development builds are for her parent to review.

Wild Pairs and the pet maze game are the strongest evidence about what she enjoys. This design borrows recognisable animals, direct touch, and a clear destination. Whether she enjoys connecting objects and problems remains something we cannot know from a design document.

## The experience

“I’m Bunny, and I can help my friends.”

The adventure has the exploration, recurring jokes, and connected puzzles of a classic point-and-click game. The problems are physical and visible: a plank spans water, a net reaches a ball, and a box makes Bunny taller. Each success changes the scene and gets a response from a friend.

Let her investigate at her own pace. No timers, scores, danger, dialogue menus, or required reading. Friends are busy or mildly puzzled, never distressed. Mistakes do not cost items or undo progress.

She cannot read and understands only Greek. There is no spoken dialogue. Instructions and hints use gestures and pictures. Every child-facing control must be recognisable through pictures or demonstration; written labels, subtitles, letters, and numerals cannot be necessary to play. All necessary information must remain visible with sound off.

The story should work across several short visits. Save completed actions immediately and show the changed world when she returns. There is no target session length or pressure to finish in one sitting.

## Characters and story

Bunny opens the garden gate with a picnic cloth under one arm. Four empty cushions surround a bare patch of grass, including Bunny’s place. Bunny pictures Puppy, Duck, and Hedgehog sitting together and says, “Πάμε για πικνίκ!” The first action is spreading the cloth.

| Character | Personality and animation | Their part in the adventure |
| --- | --- | --- |
| Bunny | Curious and quietly delighted. Ears react before the face does. | Walks, carries, tries things, and celebrates discoveries. |
| Duck | Enthusiastic, with a very serious attitude towards a very silly ball. | Wants to bring the ball, but it is floating beyond reach. |
| Hedgehog | Careful and easily distracted by cosy places. | Wants to finish making a leaf bed before coming along. |
| Puppy | Eager to help and prone to catching the wrong thing. | Wants to bring apples, but cannot reach them. |

Each friend goes to the picnic after being helped. They wave goodbye, then remain available to tap and play with in the garden. Their cushion fills naturally; there is no quest counter.

The recurring joke is Puppy’s enthusiasm for catching things. First a leaf lands on Puppy’s nose, later an apple lands between Bunny’s ears, and at the picnic Puppy finally catches the ball properly.

## The five places

Every location fits on one screen. Exits have recognisable destination pictures and a visible path. Bunny walks automatically; steering around obstacles is not a puzzle.

| Place | What she sees and does | Optional play |
| --- | --- | --- |
| Picnic garden | Central meeting place, blanket, cushions, serving basket, and friends as they arrive. | Flowers nod when tapped; friends copy a little dance. |
| Potting shed | An open, bright shed with a plank and a net displayed separately at child height. | Turn a pinwheel; make a watering can sprinkle a flower. |
| Duck pond | Duck watches a floating ball near the bank. | Make ripples and hear reeds rustle. |
| Hedgehog’s nook | A shallow puddle interrupts the path to Hedgehog, a leaf pile, and an empty leaf bed. | Muddy footprints and a sleepy beetle under a leaf. |
| Apple orchard | Puppy, low branches, a sturdy broad box, and apples. | Shake a flower; hear Puppy imitate a bird. |

The garden connects directly to all four other places. Returning from any branch takes one transition. The puddle is inside Hedgehog’s scene; it does not prevent exploring elsewhere.

```text
                   Potting shed
                        |
Duck pond ———— Picnic garden ———— Apple orchard
                        |
                 Hedgehog’s nook
```

Only two or three useful things compete for attention within each part of a scene. Decoration is quieter and never hides required objects. Essential objects are distinguished by silhouette as well as colour.

## The complete puzzle sequence

The opening establishes tapping through a meaningful action. Afterwards, Duck and Hedgehog can be helped in either order. Puppy’s task links the orchard to Hedgehog’s basket, introducing a short connection between places. The finale brings everything back to the garden.

### 1 Spread the picnic cloth

**Visible problem:** Bunny puts a folded cloth beside four cushions on bare grass.

**Action:** Tap the cloth. Bunny shakes it open and spreads it between the cushions. This is the first small success, with no inventory to learn yet.

**Clue and response:** Bunny looks from the cloth to the empty space. One corner folds back over Bunny’s feet, then settles with a soft flap. Bunny pictures the three friends; paths to their places become inviting through brief character sounds and destination portraits.

**Thinking:** Notice an unfinished arrangement and act on the nearby object. All exits are available after this action.

### 2 Make a bridge for Hedgehog

**Visible problem:** Hedgehog stands on the far side of a shallow puddle with a basket. Tapping the far bank makes Bunny stop and look at the gap. Hedgehog points across it.

**Action:** Pick up the plank in the shed, return, and use it on the puddle. The whole puddle accepts the plank; placement needs no precision or rotation.

**Clue and response:** Two flat banks visibly support the ends. A hint can picture the plank spanning them. Bunny lays it down, crosses, and offers a paw to Hedgehog. The bridge stays for the rest of the story.

**Thinking:** Recognise an object that could connect two places and remember where it was seen.

### 3 Help make the leaf bed

**Visible problem:** Hedgehog’s bed is bare, while three broad leaf clumps lie beside it. Hedgehog demonstrates moving one small leaf, leaving the larger clumps for the player.

**Action:** Tap a leaf clump and then the bed, or drag it there. These are local scene objects, not inventory items. Each placed clump stays put.

**Clue and response:** The bed visibly fills. Hedgehog tries it, disappears into the leaves, then pops up wearing a leaf hat. Hedgehog offers Bunny the now-unneeded basket and heads to the picnic.

**Thinking:** Complete a demonstrated action and connect loose material with its use. No size sorting or hidden ordering rule.

### 4 Retrieve Duck’s ball

**Visible problem:** Duck stretches from the bank towards the ball but cannot reach it. Duck wants to stay on the bank for this game; the scene does not claim ducks cannot swim.

**Action:** Collect the net from the shed and use it on the ball. Bunny walks to the right spot and scoops automatically.

**Clue and response:** Tapping the ball shows the distance. The net has a conspicuously long handle and a clearly visible mesh bowl. Duck bounces the recovered ball, gets a bounce on the head, laughs, and carries it to the garden. Bunny leaves the net safely beside the pond.

**Thinking:** Choose a tool whose shape and reach solve the visible problem. No moving-target timing; the ball’s full bobbing area accepts input.

### 5 Reach the apples

**Visible problem:** Puppy looks up at apples. Bunny’s attempt to reach comes up short. A broad, low box sits beside the trunk.

**Action:** Tap the box and then the ground beneath the branch, or drag it there. Bunny pushes it into place. Tap the branch to climb and try reaching.

**Clue and response:** The box is clearly a sturdy step, with no stacking. From it, Bunny reaches the branch. Puppy enthusiastically waits underneath; a loose leaf lands on Puppy’s nose.

**Thinking:** Change the scene to make an action possible. This can be completed before obtaining the basket.

### 6 Catch the apples

**Visible problem:** From the box, Bunny can reach the apples, but Puppy cannot hold them all. Bunny pictures apples falling into a basket. Before a basket is placed, touching the branch only wiggles it; no apples are lost.

**Action:** Use Hedgehog’s basket beneath the branch, then tap the branch. If the basket was placed before the box, it stays ready and is acknowledged.

**Clue and response:** Apples fall into the basket, with one briefly balancing on Bunny’s head. Puppy carries the filled basket to the picnic. The player does not have to collect individual falling apples.

**Thinking:** Combine two useful preparations and recall a familiar object from another place. The box and basket can be arranged in either order.

### 7 Set a place for everyone

**Visible problem:** Once all three friends have arrived, four characters sit around the cloth, with four plates in a serving basket at its edge.

**Action:** Tap a plate, then any empty place, or drag it there. Plates are interchangeable. An occupied place gently nudges the selected plate back without disturbing anything.

**Clue and response:** Each character pats the space in front of them. Placing a plate gets a small individual response. Bunny sets the last loose corner of the cloth straight when all four places are ready.

**Thinking:** Give one object to each participant. Numerals and counting aloud are unnecessary.

### 8 Share the picnic

**Visible problem:** Four apples sit in the basket, with four empty plates.

**Action:** Give an apple to each plate, in any order, by tapping or dragging. There is no requirement to remember a favourite food or colour.

**Clue and response:** Each friend watches their apple arrive. With everyone served, Bunny sits, all four take a comically crunchy bite, and Puppy finally catches Duck’s ball. A short musical ending resolves into continuing picnic play.

**Thinking:** Match quantities through action and recognise when everyone has enough.

### Puzzle connections

```text
Spread cloth
  ├─ Shed plank → bridge → leaf bed → basket ──────┐
  ├─ Shed net → Duck’s ball → Duck joins          │
  └─ Orchard box ────────────────────────────────┤
                                                ↓
                              Box + basket → apples → Puppy joins

Hedgehog joins after leaf bed
All three friends present → plates → sharing → picnic play
```

There are eight named problems, with the opening and final two deliberately easier. The middle contains the main adventure reasoning. Collecting a tool and walking between scenes are parts of those problems, not extra puzzles.

## Tablet interaction

Use the full viewport with a large scene and a compact tray over the lower edge. Landscape is the main composition. Portrait should reframe the same scene and keep every required object reachable; rotation preserves progress and cancels only the current selection.

- **Walk:** Tap open ground. Bunny walks to it by a safe route. A new tap can redirect walking.
- **Inspect or collect:** Tap a character or object. Bunny approaches automatically, then reacts or picks it up. No need to stand in the correct place first.
- **Use a carried object:** Tap it in the tray, then tap its destination. Selection visibly lifts the object and shows a small picture beside the finger’s last position. Dragging is an equivalent shortcut.
- **Cancel:** Tap the selected object again, or tap open ground. Merely selecting an object never spends it.
- **Travel:** Tap a destination sign once. Bunny walks out and the next scene appears. Exits are inset from the screen edge to reduce accidental tablet gestures.

The only carried tools are the plank, net, and basket, so the tray never exceeds three items. The plank becomes the bridge; the net remains by the pond after use; Puppy carries away the basket. Local objects such as leaves, the box, plates, and apples stay in their scenes.

Design important touch areas around roughly 12 mm or larger on the intended tablet, then check their actual comfort there. Extend touch areas beyond narrow artwork, keep them separate, and accept drops across whole meaningful regions. Dropping between objects returns the item to its source.

During walking, show the chosen destination immediately. During a short committed action, suppress duplicate input without queuing repeated actions. Multiple fingers must not collect an object twice or skip a story event.

## Clues and gentle help

First, let the world explain itself: a glance, reach, empty space, or short demonstration. Tapping a character repeats their need with an animated picture bubble and a brief spoken line.

A small Bunny portrait with a question bubble provides help. Successive taps for the same problem offer:

1. A picture of the local goal, such as the ball on the bank.
2. A picture of the useful object and its location, such as the net in the shed.
3. A short ghosted demonstration of the action. If travel is needed, first show the correct destination sign; demonstrate the use once the object is available.

Hints follow the current unsolved problem and remember prerequisites. At the orchard, for example, the basket hint points to helping Hedgehog if the basket has not been offered yet. Hints never reset progress or automatically finish the problem.

Allow quiet exploration without unsolicited instructions. After inactivity, Bunny can look towards something relevant, but should not repeatedly speak or hurry the player.

An unsuitable object returns to the tray. Bunny briefly considers it and shakes her head gently; where useful, a physical attempt explains the mismatch. Avoid a large library of entertaining wrong answers that makes random tapping more rewarding than understanding the scene.

## Art and sound

Proposed direction: a warm illustrated picture book with soft painted scenery, rounded shapes, clear silhouettes, and expressive original animal characters. Draw inspiration from the familiar domestic play and gentle humour she likes in Peppa, Bluey, and Bing. Character designs and setting should have their own identity.

Keep each scene visually distinct: cream and terracotta in the shed, soft blue at the pond, leafy greens at the nook, peach and green in the orchard, and a warm checked cloth in the garden. Interactive objects have stronger contrast than background decoration. Never communicate a solution through colour alone.

Bunny needs expressive walking, looking, carrying, reaching, pushing, climbing, and celebrating. Each friend needs an idle, a clear request, a puzzle reaction, departure, and picnic play. The bridge crossing, leaf hat, ball bounce, apple catch, and final shared crunch are the central character moments.

Use gentle scene ambience and a recurring musical theme, with brief musical responses for discoveries. Actions need specific sounds: cloth flap, wood landing, leaves rustling, net dripping, apples dropping, and plate clinks. Keep music beneath speech and stop repeated taps from layering sounds.

Spoken lines must be short, warm, replayable, and in Greek. Examples: “Η μπάλα μου!”, “Τι μαλακό κρεβατάκι!”, “Εκεί πάνω!”, and “Ένα για τον καθένα!” Use concrete everyday words and one thought at a time. Record or produce the Greek lines deliberately and have her parent check pronunciation, pacing, and clarity. All essential information must also appear in action or pictures; subtitles do not replace those cues.

## The ending and returning to play

After the shared crunch, the picnic remains interactive. Rearrange plates and food, offer another snack, roll the ball between friends, make everyone dance, or tap Hedgehog to bring back the leaf hat. There is no sudden results screen.

Visited places remain accessible with their solved changes. Repeat harmless favourite reactions, such as the leaf rustle and pond ripples, without reverting puzzles. Friends remain at the picnic.

Save the active scene, completed preparations, carried tools, placed objects, and picnic state. Resume in a calm moment, never halfway through an animation. A deliberate parent control starts a new adventure; it must be separate from the child’s normal play controls and confirm before replacing progress.

Replay comes from affection for the world and favourite scenes. Keep the first release’s puzzle solutions consistent rather than randomising them. Additional stories can follow if this world earns her interest.

## The complete first release

The proposed release includes all five illustrated locations, four animated characters, eight connected problems, the full picnic finale and free play, picture hints, finished sound and Greek speech, and reliable saving. Every location includes at least two small optional reactions.

Her parent can review unfinished builds privately. Before she sees it, the complete adventure should be playable without placeholders, with comfortable touch input, understandable object use, readable scenes, and every ending action present.

Parent review should include taking each branch first, visiting the orchard before earning the basket, preparing the box and basket in either order, using hints from an unfamiliar scene, leaving and resuming during each puzzle, and playing through on the intended tablet. Technical checks should cover puzzle dependencies, saved progress, duplicate touches, and a built game without console errors. These checks support a finished experience; they cannot establish in advance whether she will enjoy it.

## Review collection

The parent review is collected in review.html. It includes opening and resolved illustrations for all five locations, an additional garden state before setting the plates, the four-character reference sheet, twelve prop designs, action pose sheets, eight motion samples, touch-target explanations, and the full Greek dialogue and hint script. Exact image-generation prompts are saved beside the artwork.

The target tablet is a Samsung Galaxy Tab S6 Lite with a 10.4-inch screen, primarily in landscape. The spoken language is Greek. The approved visual direction is painted storybook characters with quiet backgrounds, following pond-v2. The pond sample demonstrates separate painted characters and props animated in Phaser. The other seven samples are isolated action studies on a plain stage; they establish movement and reaction, not final scene choreography or interactive game rules.

The scene illustrations are composition and story references. Final backgrounds and foreground layers will be separated from characters, props, and puzzle changes. Generated pose sheets need consistent pivots, clean edges, and additional frames for smooth final movement. Painted detail belongs primarily on characters and useful objects; backgrounds should never return to the dense foliage of pond-v1.

The review is ready to assess the whole design together. Production work still includes the complete game logic, saves, navigation, final animation frames, recorded Greek voices, final music and action sounds, and play on the actual tablet. Browser Greek speech is only an optional script preview and must never fall back to English.

## Action timing and reactions

| Action | Intended timing after input | What must read clearly |
| --- | --- | --- |
| Spread cloth | About 4 seconds | Lift, open, settle; Bunny frees a foot from a folded corner. |
| Place bridge | About 5 seconds including crossing | Both ends meet dry land before Bunny steps onto the plank. |
| Fill leaf bed | Under 1 second per clump, then about 4 seconds | Each clump stays; Hedgehog nestles down, pops up with a leaf hat, then offers the basket. |
| Retrieve ball | About 11 seconds in the sample | Net reaches the ball, mesh supports it, and Duck clearly receives it. |
| Move box | About 5 seconds including climb | Box remains broad and stable; Bunny’s feet land on it before reaching. |
| Catch apples | About 6 seconds | Three apples land in the basket; the fourth pauses on Bunny’s head, then joins them. |
| Set plates | About 0.7 seconds per placement | One plate per place; the friend acknowledges it. |
| Share apples | About 0.7 seconds per placement, then a short ending | All four receive food, share a crunch, and remain available for free play. |

These timings describe feedback, not required player speed. The isolated studies play the actions automatically for review; the game waits for her between each plate, apple, or leaf placement. Repeat taps during a committed action do not queue duplicate actions. Walking can be redirected; short puzzle reactions finish before the next action begins.

## Greek script and sound delivery

The complete line list is shown in the gallery and maintained in src/review-data.ts, alongside each trigger and speaker. Lines use everyday Greek and one idea at a time. A parent can preview them through a Greek browser voice when one is installed; that preview is not a final voice performance. No English fallback is permitted.

Use a warm, conversational delivery with a brief pause between a request and a hint. Repeat the request when the character is tapped. Do not repeat speech for every rapid tap. Tool words such as «απόχη» are always accompanied by the tool’s picture and a demonstration, so understanding that word is never a prerequisite.

Keep voice, ambience, music, and action sounds separately controllable during production. The reusable musical phrase should end comfortably at a solved problem and return softly to the scene ambience. Required action sounds are cloth opening, wood placement and sliding, footsteps, leaves, a gentle splash and drips, apples landing, plates, and the shared crunch. Final recorded dialogue, music, and these sound effects remain production assets; the review establishes their script and placement.

## Final interaction details

On a first visit, start directly with Bunny and the cloth. A pictorial play control can unlock audio; no written menu is required. Returning opens the saved scene with characters and objects already reflecting completed actions. Brief repeated picture cues remind her of the current local goal.

The garden’s four destination pictures lead directly to the shed, pond, nook, and orchard. Each branch has one garden picture for returning. Use small scene thumbnails rather than words or arbitrary symbols. The help control uses Bunny’s portrait and a picture bubble. A selected inventory object is visibly lifted from its slot; unused slots stay quiet.

Keep the serving hamper and carrying basket visually distinct. The closed rectangular hamper stays in the garden and holds the four plates; the small open basket with one arched handle comes from Hedgehog and carries four apples. The apparent fourth apple in the orchard’s reaction illustration is on Bunny’s head, not an additional fifth apple.

Once friends leave their branch, do not show duplicate copies there. The bridge and bed remain complete; the pond net remains on the bank; the orchard box remains beneath the branch. Repeated visits offer harmless scenery reactions without resetting completed puzzles. Any expansion should tell a new story using this familiar cast and places; it is outside this first adventure.
