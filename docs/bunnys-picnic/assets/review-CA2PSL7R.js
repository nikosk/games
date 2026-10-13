import"./modulepreload-polyfill-B5Qt9EMX.js";import{_ as B,a as A,b as q,c as S,d as P,e as j,f as H,g as C,h as z,i as D,j as E,k as R,l as $,m as F}from"./shed-before-DKxjLFiq.js";import{a as p,p as u,b as g}from"./poses-C0BMErKl.js";const M="/games/bunnys-picnic/assets/bunny-rig-v1.prompt-hhHMaT03.txt",W="/games/bunnys-picnic/assets/bunny-walk-v2.prompt-Db21ugVv.txt",O="/games/bunnys-picnic/assets/bunny-walk-v3.prompt-DY7539bL.txt",L="/games/bunnys-picnic/assets/prompts-CV5NQ-JY.txt",N="/games/bunnys-picnic/assets/pond-v2-prompt-P4wn5NAZ.txt",I="/games/bunnys-picnic/assets/prompts-DEkp01ks.txt",G="/games/bunnys-picnic/assets/actions-spaced.prompt-CkA-bSED.txt",U="/games/bunnys-picnic/assets/actions.prompt-BnWROzVw.txt",V="/games/bunnys-picnic/assets/garden-after.prompt-tfSy4u8D.txt",K="/games/bunnys-picnic/assets/garden-before.prompt-B1FP7QcY.txt",Q="/games/bunnys-picnic/assets/garden-ready.prompt-C-7CIqkf.txt",Y="/games/bunnys-picnic/assets/nook-after.prompt-BKt50EPO.txt",X="/games/bunnys-picnic/assets/nook-before.prompt-IWG3UKQm.txt",Z="/games/bunnys-picnic/assets/orchard-after.prompt-CMOGleLn.txt",J="/games/bunnys-picnic/assets/orchard-before.prompt-xr0X3Zf8.txt",ee="/games/bunnys-picnic/assets/pond-after.prompt-Cw1NCH1B.txt",te="/games/bunnys-picnic/assets/pond-before.prompt-CT69MuKm.txt",ne="/games/bunnys-picnic/assets/props.prompt-DW1gl7BM.txt",ae="/games/bunnys-picnic/assets/shed-after.prompt-DznnRdbF.txt",se="/games/bunnys-picnic/assets/shed-before.prompt-DmCXnn1c.txt",v=[{id:"garden",title:"Picnic garden",purpose:"Begin with a small success. Return to a place that fills with friends.",states:[{file:"garden-before",label:"Opening",note:"Tap the folded cloth. Bunny spreads it between the four cushions; the four paths lead to the other places."},{file:"garden-ready",label:"Everyone arrives",note:"All three friends are here. Four plates wait in the serving hamper; four apples wait in the carrying basket."},{file:"garden-after",label:"Shared picnic",note:"One plate and one apple per friend, including Bunny. The shared crunch leads to free play: passing the ball, dancing, and rearranging food."}],hotspots:[{x:13,y:65,label:"Folded cloth",clue:"One tap starts the spreading action. The child does not need to drag fabric into position."},{x:58,y:65,label:"Picnic space",clue:"Four cushions show that this is a place for four friends. No counting symbols are required."}],play:"Tap to spread; later tap or drag plates and apples to any empty place.",hint:"Bunny points toward the folded cloth; a thought picture shows it spread. Further help demonstrates opening it between the cushions.",sound:"Soft cloth flap, plate clinks, apple crunches, and a warm musical ending."},{id:"shed",title:"Potting shed",purpose:"A memorable home for two useful tools.",states:[{file:"shed-before",label:"Tools waiting",note:"The long plank and scoop net have clear silhouettes and separate, generous touch areas."},{file:"shed-after",label:"Tools collected",note:"Collected tools disappear from the wall and remain in the picture tray until used. The watering can and pinwheel remain optional toys."}],hotspots:[{x:48,y:48,label:"Plank",clue:"Tap to collect. It becomes the bridge at Hedgehog’s puddle."},{x:66,y:48,label:"Net",clue:"Tap to collect. Its long handle and mesh bowl explain its use."}],play:"Tap an object; Bunny approaches and collects it automatically.",hint:"Bunny gestures toward the available tool. Further help shows it moving into the picture tray.",sound:"Wood pickup, a light mesh rustle, pinwheel rattle, and water sprinkled on a flower."},{id:"pond",title:"Duck pond",purpose:"Solve a visible reach problem with a tool.",states:[{file:"pond-before",label:"Ball out of reach",note:"Duck reaches towards the ball. The whole bobbing area accepts a tap or drop, with no timing requirement."},{file:"pond-after",label:"Ball recovered",note:"Duck receives the ball and celebrates. Bunny leaves the net on the bank; Duck carries the ball to the picnic."}],hotspots:[{x:49,y:48,label:"Duck",clue:"Tap to replay the reach and ball thought-picture, with a short curious quack"},{x:84,y:57,label:"Ball",clue:"Select the net, then tap here. Dragging the net here is equivalent."}],play:"Select the net and tap the ball; the scoop and handoff happen automatically.",hint:"Duck reaches toward the ball. Help shows the net, a garden-to-shed picture route if needed, then demonstrates moving the net to the ball.",sound:"Gentle pond ambience, a small splash, water dripping, and Duck’s delighted reaction."},{id:"nook",title:"Hedgehog’s nook",purpose:"Make a crossing, then help create a cosy bed.",states:[{file:"nook-before",label:"Puddle and empty bed",note:"The puddle interrupts the path. Three large leaf clumps wait beside the bare hollow beyond it."},{file:"nook-after",label:"Bridge and cosy bed",note:"The plank stays as a bridge. The three leaf clumps fill the bed. Hedgehog wears a leaf hat and gives Bunny the empty basket before joining the picnic."}],hotspots:[{x:52,y:62,label:"Puddle",clue:"Use the plank anywhere on the puddle. Both ends land securely without precise placement."},{x:86,y:44,label:"Leaves and hollow",clue:"After crossing, move any of the three clumps into the bed. Their order does not matter."},{x:59,y:41,label:"Basket",clue:"Hedgehog offers this after the bed is finished. It is the same basket used in the orchard."}],play:"Use the plank; then tap or drag three leaf clumps into the hollow.",hint:"Bunny points at the gap and pictures a plank. Beyond the bridge, Hedgehog points at the hollow and pictures a leaf bed; further help moves a ghost leaf into it.",sound:"Wood landing, careful footsteps, leaf rustle, a little sneeze, and a happy sigh."},{id:"orchard",title:"Apple orchard",purpose:"Connect two preparations: reach the branch and catch the apples.",states:[{file:"orchard-before",label:"Apples too high",note:"Bunny reaches and falls short. The broad low box is nearby; the basket is earned by helping Hedgehog."},{file:"orchard-after",label:"Apples collected",note:"Bunny stands on the box. Three apples land in the basket and the fourth briefly balances between Bunny’s ears, then joins the others. Puppy takes all four to the picnic."}],hotspots:[{x:13,y:66,label:"Box",clue:"Move it under the branch. It snaps into place and cannot tip over."},{x:67,y:24,label:"Apples",clue:"With both box and basket ready, tapping the branch starts collection. Before then, apples stay safely on the branch."},{x:74,y:73,label:"Basket position",clue:"The whole area beneath the branch accepts the basket. Box and basket can be placed in either order."}],play:"Place box and basket in either order, then tap the branch.",hint:"Puppy looks up and points at the apples. Help connects the box to its place; a missing basket shows the route to Hedgehog’s nook and its leaf bed.",sound:"Wood sliding, a branch creak, soft apple thumps, and Puppy’s laughter."}],w=[{id:"cloth",name:"Spread the cloth",scene:"garden",thought:"Recognise an unfinished arrangement.",steps:["Bunny looks at the folded cloth and empty space.","A tap makes Bunny lift and open the cloth.","The cloth settles; a corner folds over Bunny’s feet.","Bunny frees a foot and invites the friends."],timing:"About 4 seconds after the tap."},{id:"bridge",name:"Make the bridge",scene:"nook",thought:"Use length to connect two places.",steps:["Bunny stops at the puddle and looks across.","The selected plank lowers until both ends rest on the banks.","Bunny crosses at a steady pace.","Hedgehog waves from the other side."],timing:"About 5 seconds; no balance or timing input."},{id:"leaves",name:"Make the leaf bed",scene:"nook",thought:"Repeat a demonstrated action and complete a visible task.",steps:["Hedgehog puts a small leaf into the hollow.","Each chosen leaf clump moves into the bed and stays.","After three, Hedgehog nestles down, then pops up with a leaf hat.","Hedgehog gives Bunny the basket and heads to the garden."],timing:"Under a second per placement, then a 4-second reaction."},{id:"pond",name:"Retrieve the ball",scene:"pond",thought:"Choose a tool with the right reach and shape.",steps:["Duck points, stretches, and asks for the ball.","Bunny approaches the bank and lowers the net.","The ball lifts in the mesh and passes to Duck.","Duck and Bunny celebrate; the net stays on the bank."],timing:"Working full-scene sample: about 11 seconds."},{id:"box",name:"Reach the branch",scene:"orchard",thought:"Move an object to make a new action possible.",steps:["Bunny stretches but cannot reach.","The chosen box slides into a stable position.","Bunny climbs onto it automatically.","A loose leaf lands on Puppy’s nose."],timing:"About 5 seconds; the player never has to steer a climb."},{id:"apples",name:"Catch the apples",scene:"orchard",thought:"Remember a useful object and combine two preparations.",steps:["The basket sits beneath the branch.","Bunny wiggles the branch.","Three apples fall into the basket; the fourth lands between Bunny’s ears.","Bunny adds the last apple; Puppy carries the basket away."],timing:"About 6 seconds, with a short pause for the visual joke."},{id:"plates",name:"Set the places",scene:"garden",thought:"Give one object to each participant.",steps:["Each friend pats an empty place.","A chosen plate slides to any empty place.","The receiving friend responds with a small gesture.","With four plates ready, attention shifts to the apples."],timing:"About 0.7 seconds per placement; no automatic rapid sequence in the game."},{id:"sharing",name:"Share the picnic",scene:"garden",thought:"Match quantities through action.",steps:["Four apples wait in the basket.","An apple moves to each chosen empty plate.","Everyone takes a big crunchy bite together.","The music resolves, then ball play and dancing remain available."],timing:"About 0.7 seconds per apple, followed by a short shared reaction."}],b="/games/bunnys-picnic/assets/characters-v1-C1O72FyV.png",k=`# Bunny’s Picnic

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

\`\`\`text
                   Potting shed
                        |
Duck pond ———— Picnic garden ———— Apple orchard
                        |
                 Hedgehog’s nook
\`\`\`

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

\`\`\`text
Spread cloth
  ├─ Shed plank → bridge → leaf bed → basket ──────┐
  ├─ Shed net → Duck’s ball → Duck joins          │
  └─ Orchard box ────────────────────────────────┤
                                                ↓
                              Box + basket → apples → Puppy joins

Hedgehog joins after leaf bed
All three friends present → plates → sharing → picnic play
\`\`\`

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
`,oe=Object.assign({"../assets/review/actions-spaced.png":F,"../assets/review/actions.png":$,"../assets/review/garden-after.png":R,"../assets/review/garden-before.png":E,"../assets/review/garden-ready.png":D,"../assets/review/nook-after.png":z,"../assets/review/nook-before.png":C,"../assets/review/orchard-after.png":H,"../assets/review/orchard-before.png":j,"../assets/review/pond-after.png":P,"../assets/review/pond-before.png":S,"../assets/review/props.png":q,"../assets/review/shed-after.png":A,"../assets/review/shed-before.png":B}),ie=Object.assign({"../assets/animation/bunny-rig-v1.prompt.txt":M,"../assets/animation/bunny-walk-v2.prompt.txt":W,"../assets/animation/bunny-walk-v3.prompt.txt":O,"../assets/animation/prompts.txt":L,"../assets/concepts/pond-v2-prompt.txt":N,"../assets/concepts/prompts.txt":I,"../assets/review/actions-spaced.prompt.txt":G,"../assets/review/actions.prompt.txt":U,"../assets/review/garden-after.prompt.txt":V,"../assets/review/garden-before.prompt.txt":K,"../assets/review/garden-ready.prompt.txt":Q,"../assets/review/nook-after.prompt.txt":Y,"../assets/review/nook-before.prompt.txt":X,"../assets/review/orchard-after.prompt.txt":Z,"../assets/review/orchard-before.prompt.txt":J,"../assets/review/pond-after.prompt.txt":ee,"../assets/review/pond-before.prompt.txt":te,"../assets/review/props.prompt.txt":ne,"../assets/review/shed-after.prompt.txt":ae,"../assets/review/shed-before.prompt.txt":se}),re=e=>oe["../assets/review/"+e+".png"],_=e=>e.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;"),le=document.querySelector("#review");le.innerHTML=`
  <header class="masthead"><a class="brand" href="#top">Bunny’s Picnic</a><nav aria-label="Review sections"><a href="#places">Places</a><a href="#cast">Characters</a><a href="#motion">Motion</a><a href="#voice">Visual cues</a><a href="#design">Design</a></nav></header>
  <main id="top">
    <section class="intro"><p class="eyebrow">The complete design and art review</p><h1>A little adventure.<br>A picnic with friends.</h1><p class="lead">Five places, eight small problems, and a world that changes as Bunny helps. Everything for this review is collected here.</p><div class="intro-links"><a class="primary" href="#places">Explore the scenes <span aria-hidden="true">↓</span></a><a href="#motion">Watch the motion samples</a></div><p class="quiet">The design collection is preserved here. <a href="./index.html">Open the complete version 1 game →</a></p></section>
    <section id="places" class="section"><div class="section-heading"><div><p class="eyebrow">The world</p><h2>Five familiar places</h2></div><p>Switch scenes and puzzle states. Turn on the touch targets to inspect how the clues work.</p></div>
      <div id="scene-tabs" class="scene-tabs" aria-label="Choose a location">${v.map((e,t)=>`<button data-scene="${t}" aria-pressed="${t===0}">${e.title}</button>`).join("")}</div>
      <article class="scene-card"><div class="scene-toolbar"><div><h3 id="scene-title"></h3><p id="scene-purpose"></p></div><label class="toggle"><input id="targets-toggle" type="checkbox"> Show touch targets</label></div>
        <div class="scene-view"><img id="scene-image" alt="" fetchpriority="high"><div id="hotspots"></div></div>
        <div id="states" class="state-tabs" aria-label="Puzzle states"></div><p id="state-note" class="state-note" aria-live="polite"></p>
        <div id="clue" class="clue" hidden></div>
        <div class="scene-notes"><div><h4>What she does</h4><p id="scene-play"></p></div><div><h4>How we help</h4><p id="scene-hint"></p></div><div><h4>What she hears</h4><p id="scene-sound"></p></div></div>
      </article>
      <div class="world-map" aria-label="The garden connects directly to every other location"><span>Potting shed</span><span>Duck pond</span><strong>Picnic garden</strong><span>Apple orchard</span><span>Hedgehog’s nook</span></div>
      <p class="quiet center">One screen per place. Every branch returns directly to the garden. Duck and Hedgehog can be helped in either order.</p>
    </section>
    <section id="cast" class="section"><div class="section-heading"><div><p class="eyebrow">The painted world</p><h2>Characters and useful objects</h2></div><p>Quiet scenery gives the characters and important props room to stand out.</p></div>
      <figure class="sheet"><a href="${b}" target="_blank" rel="noopener"><img src="${b}" loading="lazy" alt="Bunny, Duck, Puppy and Hedgehog with their expressions"></a><figcaption><strong>The four friends.</strong> Bunny is curious; Duck is enthusiastic; Puppy is eager; Hedgehog loves cosy places. Tap any sheet to view it at full size.</figcaption></figure>
      <figure class="sheet"><a href="${p}" target="_blank" rel="noopener"><img src="${p}" loading="lazy" alt="Eight painted action poses: laying, pushing, carrying, reaching, and character reactions"></a><figcaption><strong>Adventure action poses.</strong> Laying the cloth, pushing, carrying the basket, the apple joke, Puppy’s reactions, and Hedgehog’s gift and leaf hat.</figcaption></figure>
      <figure class="sheet"><a href="${u}" target="_blank" rel="noopener"><img src="${u}" loading="lazy" alt="Bunny and Duck poses, ball and net used in the pond animation"></a><figcaption><strong>Pond animation poses.</strong> The separate painted pieces already used in the working pond sample.</figcaption></figure>
      <figure class="sheet"><a href="${g}" target="_blank" rel="noopener"><img src="${g}" loading="lazy" alt="Twelve prop designs: plank, net, basket, box, two cloth states, leaves, bed, plate, apple, ball, cushion"></a><figcaption><strong>Twelve prop designs.</strong> Recognisable silhouettes carry through the scene, the picture tray, and hints. The only carried tools are the plank, net, and basket.</figcaption></figure>
    </section>
    <section id="motion" class="section"><div class="section-heading"><div><p class="eyebrow">The eight puzzle actions</p><h2>See how each moment moves</h2></div><p>The pond is a full-scene animation. The other seven are isolated painted motion studies on a plain stage, showing the intended action and reaction.</p></div>
      <div id="beat-tabs" class="beat-tabs">${w.map((e,t)=>`<button data-beat="${t}" aria-pressed="${t===3}"><span>${String(t+1).padStart(2,"0")}</span>${e.name}</button>`).join("")}</div>
      <div class="motion-card"><div class="motion-top"><div><h3 id="beat-title"></h3><p id="beat-thought"></p></div><a id="open-motion" target="_blank" rel="noopener">Open full screen ↗</a></div><div id="motion-player" class="motion-player"><button id="load-motion" class="primary">Load animation</button></div><p class="quiet" id="motion-status" aria-live="polite"></p><ol id="beat-steps"></ol><p id="beat-timing" class="quiet"></p></div>
    </section>
    <section id="voice" class="section"><div class="section-heading"><div><p class="eyebrow">No words needed</p><h2>Gestures, pictures, and little reactions</h2></div><p>The spoken dialogue has been retired. Requests use painted pointing poses, thought pictures, and demonstrations. Sound adds short wordless animal reactions; every puzzle remains understandable when muted.</p></div>
      <div class="design-grid"><article><h3>Show the problem</h3><p>Duck reaches toward the ball. Puppy looks up and raises a paw toward the apples. Hedgehog gestures toward the hollow. Bunny points to the cloth or an empty picnic place.</p></article><article><h3>Show the connection</h3><p>Help first highlights the useful object and its destination, then demonstrates its movement. When something is elsewhere, destination pictures show the route through the garden.</p></article><article><h3>Show delight</h3><p>Waves, open wings, excited paws, contented expressions, and short quacks, yips, chirrs, and hums acknowledge success. There are no spoken words or failure buzzers.</p></article></div>
      <p><a class="primary" href="./index.html">Play the wordless adventure →</a></p>
    </section>
    <section id="design" class="section"><div class="section-heading"><div><p class="eyebrow">How it all fits</p><h2>The complete adventure design</h2></div><a id="download-design" class="primary" download="Bunnys-Picnic-Design.md">Download design</a></div>
      <div class="design-grid"><article><h3>The connected story</h3><p>Spread the cloth, then explore. The shed supplies the net for Duck and the plank for Hedgehog. Helping Hedgehog earns the basket. The box and basket together solve Puppy’s apple problem. All three friends return for plates, sharing, and a playful picnic.</p></article><article><h3>Touch and help</h3><p>Tap to walk, inspect, or collect. Select a picture, then tap its destination; dragging is equivalent. Big forgiving targets, visible consequences, and repeatable visual requests. Hints progress from goal picture to tool picture to demonstration.</p></article><article><h3>A complete first experience</h3><p>Five finished scenes, the whole puzzle chain, character reactions, sound, visual guidance, saved progress, and a picnic she can keep playing in. Your daughter’s first encounter is with that complete experience.</p></article><article><h3>Review versus production</h3><p>The scene illustrations establish composition and puzzle states. Motion studies establish actions. Final scene layers, smoother frame sequences, expressive gestures, full game rules, and tablet play remain implementation work.</p></article></div>
      <details class="full-design"><summary>Read the full design document</summary><div id="design-text"></div></details>
      <details class="provenance"><summary>Artwork sources and generation prompts</summary><p>Raster illustrations were created with built-in image generation from the approved character and pond references. Originals are preserved. These are the exact prompts used.</p><ul>${Object.entries(ie).sort(([e],[t])=>e.localeCompare(t)).map(([e,t])=>`<li><a href="${t}" target="_blank" rel="noopener">${e.replace("../assets/","")}</a></li>`).join("")}</ul></details>
    </section>
    <footer>Prepared for one parent review · Bunny’s Picnic · Visual cues · Tablet touch</footer>
  </main>`;let l=0,o=0;const m=document.querySelector("#scene-image"),c=document.querySelector("#targets-toggle"),r=document.querySelector("#clue");function i(){const e=v[l],t=e.states[o];document.querySelector("#scene-title").textContent=e.title,document.querySelector("#scene-purpose").textContent=e.purpose,m.src=re(t.file),m.alt=e.title+": "+t.label,document.querySelector("#state-note").textContent=t.note,document.querySelector("#scene-play").textContent=e.play,document.querySelector("#scene-hint").textContent=e.hint,document.querySelector("#scene-sound").textContent=e.sound,document.querySelector("#states").innerHTML=e.states.map((n,s)=>`<button data-state="${s}" aria-pressed="${s===o}">${n.label}</button>`).join(""),document.querySelectorAll("[data-scene]").forEach(n=>n.setAttribute("aria-pressed",String(Number(n.dataset.scene)===l))),document.querySelectorAll("[data-state]").forEach(n=>n.onclick=()=>{o=Number(n.dataset.state),i()}),r.hidden=!0;const a=document.querySelector("#hotspots");a.innerHTML=o===0&&c.checked?e.hotspots.map((n,s)=>`<button class="hotspot" style="left:${n.x}%;top:${n.y}%" data-spot="${s}" aria-label="${_(n.label)}"><span>${n.label}</span></button>`).join(""):"",a.querySelectorAll("[data-spot]").forEach(n=>n.onclick=()=>{const s=e.hotspots[Number(n.dataset.spot)];r.hidden=!1,r.textContent=s.label+" — "+s.clue}),c.disabled=o!==0}document.querySelectorAll("[data-scene]").forEach(e=>e.onclick=()=>{l=Number(e.dataset.scene),o=0,i()});c.onchange=i;i();let h=3,T=!1;const f=document.querySelector("#motion-player"),y=document.querySelector("#motion-status");function d(){const e=w[h],t="./sample.html"+(e.id==="pond"?"":"?study="+e.id);document.querySelector("#beat-title").textContent=e.name,document.querySelector("#beat-thought").textContent=e.thought,document.querySelector("#beat-steps").innerHTML=e.steps.map(a=>`<li>${a}</li>`).join(""),document.querySelector("#beat-timing").textContent=e.timing,document.querySelector("#open-motion").href=t,document.querySelectorAll("[data-beat]").forEach(a=>a.setAttribute("aria-pressed",String(Number(a.dataset.beat)===h))),T?(f.innerHTML=`<iframe title="${_(e.name)} motion sample" src="${t}" allow="autoplay; fullscreen"></iframe>`,f.scrollIntoView({block:"center",behavior:"instant"}),y.textContent=e.id==="pond"?"Tap play, or select the net and tap the ball. Requests use the character’s reaching gesture.":"Silent action study. It plays once automatically; use the replay arrow to watch again. The complete scene is shown above."):y.textContent="Load the animation when you are ready. No video or sound starts while you browse the artwork."}document.querySelector("#load-motion").onclick=()=>{T=!0,d()};document.querySelectorAll("[data-beat]").forEach(e=>e.onclick=()=>{h=Number(e.dataset.beat),d()});d();const x=URL.createObjectURL(new Blob([k],{type:"text/markdown;charset=utf-8"}));document.querySelector("#download-design").href=x;document.querySelector("#design-text").textContent=k;window.addEventListener("pagehide",()=>{URL.revokeObjectURL(x)},{once:!0});
