export interface Hotspot { x: number; y: number; label: string; clue: string }
export interface SceneReview {
  id: string; title: string; purpose: string; states: { file: string; label: string; note: string }[];
  hotspots: Hotspot[]; play: string; hint: string; sound: string;
}
export const scenes: SceneReview[] = [
  { id: 'garden', title: 'Picnic garden', purpose: 'Begin with a small success. Return to a place that fills with friends.',
    states: [
      { file: 'garden-before', label: 'Opening', note: 'Tap the folded cloth. Bunny spreads it between the four cushions; the four paths lead to the other places.' },
      { file: 'garden-ready', label: 'Everyone arrives', note: 'All three friends are here. Four plates wait in the serving hamper; four apples wait in the carrying basket.' },
      { file: 'garden-after', label: 'Shared picnic', note: 'One plate and one apple per friend, including Bunny. The shared crunch leads to free play: passing the ball, dancing, and rearranging food.' },
    ],
    hotspots: [
      { x: 13, y: 65, label: 'Folded cloth', clue: 'One tap starts the spreading action. The child does not need to drag fabric into position.' },
      { x: 58, y: 65, label: 'Picnic space', clue: 'Four cushions show that this is a place for four friends. No counting symbols are required.' },
    ], play: 'Tap to spread; later tap or drag plates and apples to any empty place.', hint: 'Bunny points toward the folded cloth; a thought picture shows it spread. Further help demonstrates opening it between the cushions.', sound: 'Soft cloth flap, plate clinks, apple crunches, and a warm musical ending.' },
  { id: 'shed', title: 'Potting shed', purpose: 'A memorable home for two useful tools.',
    states: [
      { file: 'shed-before', label: 'Tools waiting', note: 'The long plank and scoop net have clear silhouettes and separate, generous touch areas.' },
      { file: 'shed-after', label: 'Tools collected', note: 'Collected tools disappear from the wall and remain in the picture tray until used. The watering can and pinwheel remain optional toys.' },
    ], hotspots: [
      { x: 48, y: 48, label: 'Plank', clue: 'Tap to collect. It becomes the bridge at Hedgehog’s puddle.' },
      { x: 66, y: 48, label: 'Net', clue: 'Tap to collect. Its long handle and mesh bowl explain its use.' },
    ], play: 'Tap an object; Bunny approaches and collects it automatically.', hint: 'Bunny gestures toward the available tool. Further help shows it moving into the picture tray.', sound: 'Wood pickup, a light mesh rustle, pinwheel rattle, and water sprinkled on a flower.' },
  { id: 'pond', title: 'Duck pond', purpose: 'Solve a visible reach problem with a tool.',
    states: [
      { file: 'pond-before', label: 'Ball out of reach', note: 'Duck reaches towards the ball. The whole bobbing area accepts a tap or drop, with no timing requirement.' },
      { file: 'pond-after', label: 'Ball recovered', note: 'Duck receives the ball and celebrates. Bunny leaves the net on the bank; Duck carries the ball to the picnic.' },
    ], hotspots: [
      { x: 49, y: 48, label: 'Duck', clue: 'Tap to replay the reach and ball thought-picture, with a short curious quack' },
      { x: 84, y: 57, label: 'Ball', clue: 'Select the net, then tap here. Dragging the net here is equivalent.' },
    ], play: 'Select the net and tap the ball; the scoop and handoff happen automatically.', hint: 'Duck reaches toward the ball. Help shows the net, a garden-to-shed picture route if needed, then demonstrates moving the net to the ball.', sound: 'Gentle pond ambience, a small splash, water dripping, and Duck’s delighted reaction.' },
  { id: 'nook', title: 'Hedgehog’s nook', purpose: 'Make a crossing, then help create a cosy bed.',
    states: [
      { file: 'nook-before', label: 'Puddle and empty bed', note: 'The puddle interrupts the path. Three large leaf clumps wait beside the bare hollow beyond it.' },
      { file: 'nook-after', label: 'Bridge and cosy bed', note: 'The plank stays as a bridge. The three leaf clumps fill the bed. Hedgehog wears a leaf hat and gives Bunny the empty basket before joining the picnic.' },
    ], hotspots: [
      { x: 52, y: 62, label: 'Puddle', clue: 'Use the plank anywhere on the puddle. Both ends land securely without precise placement.' },
      { x: 86, y: 44, label: 'Leaves and hollow', clue: 'After crossing, move any of the three clumps into the bed. Their order does not matter.' },
      { x: 59, y: 41, label: 'Basket', clue: 'Hedgehog offers this after the bed is finished. It is the same basket used in the orchard.' },
    ], play: 'Use the plank; then tap or drag three leaf clumps into the hollow.', hint: 'Bunny points at the gap and pictures a plank. Beyond the bridge, Hedgehog points at the hollow and pictures a leaf bed; further help moves a ghost leaf into it.', sound: 'Wood landing, careful footsteps, leaf rustle, a little sneeze, and a happy sigh.' },
  { id: 'orchard', title: 'Apple orchard', purpose: 'Connect two preparations: reach the branch and catch the apples.',
    states: [
      { file: 'orchard-before', label: 'Apples too high', note: 'Bunny reaches and falls short. The broad low box is nearby; the basket is earned by helping Hedgehog.' },
      { file: 'orchard-after', label: 'Apples collected', note: 'Bunny stands on the box. Three apples land in the basket and the fourth briefly balances between Bunny’s ears, then joins the others. Puppy takes all four to the picnic.' },
    ], hotspots: [
      { x: 13, y: 66, label: 'Box', clue: 'Move it under the branch. It snaps into place and cannot tip over.' },
      { x: 67, y: 24, label: 'Apples', clue: 'With both box and basket ready, tapping the branch starts collection. Before then, apples stay safely on the branch.' },
      { x: 74, y: 73, label: 'Basket position', clue: 'The whole area beneath the branch accepts the basket. Box and basket can be placed in either order.' },
    ], play: 'Place box and basket in either order, then tap the branch.', hint: 'Puppy looks up and points at the apples. Help connects the box to its place; a missing basket shows the route to Hedgehog’s nook and its leaf bed.', sound: 'Wood sliding, a branch creak, soft apple thumps, and Puppy’s laughter.' },
];

export const beats = [
  { id: 'cloth', name: 'Spread the cloth', scene: 'garden', thought: 'Recognise an unfinished arrangement.', steps: ['Bunny looks at the folded cloth and empty space.', 'A tap makes Bunny lift and open the cloth.', 'The cloth settles; a corner folds over Bunny’s feet.', 'Bunny frees a foot and invites the friends.'], timing: 'About 4 seconds after the tap.' },
  { id: 'bridge', name: 'Make the bridge', scene: 'nook', thought: 'Use length to connect two places.', steps: ['Bunny stops at the puddle and looks across.', 'The selected plank lowers until both ends rest on the banks.', 'Bunny crosses at a steady pace.', 'Hedgehog waves from the other side.'], timing: 'About 5 seconds; no balance or timing input.' },
  { id: 'leaves', name: 'Make the leaf bed', scene: 'nook', thought: 'Repeat a demonstrated action and complete a visible task.', steps: ['Hedgehog puts a small leaf into the hollow.', 'Each chosen leaf clump moves into the bed and stays.', 'After three, Hedgehog nestles down, then pops up with a leaf hat.', 'Hedgehog gives Bunny the basket and heads to the garden.'], timing: 'Under a second per placement, then a 4-second reaction.' },
  { id: 'pond', name: 'Retrieve the ball', scene: 'pond', thought: 'Choose a tool with the right reach and shape.', steps: ['Duck points, stretches, and asks for the ball.', 'Bunny approaches the bank and lowers the net.', 'The ball lifts in the mesh and passes to Duck.', 'Duck and Bunny celebrate; the net stays on the bank.'], timing: 'Working full-scene sample: about 11 seconds.' },
  { id: 'box', name: 'Reach the branch', scene: 'orchard', thought: 'Move an object to make a new action possible.', steps: ['Bunny stretches but cannot reach.', 'The chosen box slides into a stable position.', 'Bunny climbs onto it automatically.', 'A loose leaf lands on Puppy’s nose.'], timing: 'About 5 seconds; the player never has to steer a climb.' },
  { id: 'apples', name: 'Catch the apples', scene: 'orchard', thought: 'Remember a useful object and combine two preparations.', steps: ['The basket sits beneath the branch.', 'Bunny wiggles the branch.', 'Three apples fall into the basket; the fourth lands between Bunny’s ears.', 'Bunny adds the last apple; Puppy carries the basket away.'], timing: 'About 6 seconds, with a short pause for the visual joke.' },
  { id: 'plates', name: 'Set the places', scene: 'garden', thought: 'Give one object to each participant.', steps: ['Each friend pats an empty place.', 'A chosen plate slides to any empty place.', 'The receiving friend responds with a small gesture.', 'With four plates ready, attention shifts to the apples.'], timing: 'About 0.7 seconds per placement; no automatic rapid sequence in the game.' },
  { id: 'sharing', name: 'Share the picnic', scene: 'garden', thought: 'Match quantities through action.', steps: ['Four apples wait in the basket.', 'An apple moves to each chosen empty plate.', 'Everyone takes a big crunchy bite together.', 'The music resolves, then ball play and dancing remain available.'], timing: 'About 0.7 seconds per apple, followed by a short shared reaction.' },
] as const;

export const lines = [
  ['Bunny', 'Opening', 'Πάμε για πικνίκ!'],
  ['Bunny', 'Cloth hint', 'Ας απλώσουμε το τραπεζομάντιλο!'],
  ['Bunny', 'Invitation', 'Πάμε να βρούμε τους φίλους μας!'],
  ['Bunny', 'At the puddle', 'Πώς θα περάσουμε;'],
  ['Bunny', 'Bridge hint', 'Ας βάλουμε τη σανίδα πάνω από το νερό.'],
  ['Bunny', 'Bridge complete', 'Τώρα μπορούμε να περάσουμε!'],
  ['Hedgehog', 'Empty bed', 'Θέλω ένα μαλακό κρεβατάκι.'],
  ['Hedgehog', 'Leaf hint', 'Βάλε τα φύλλα εδώ.'],
  ['Hedgehog', 'Bed complete', 'Τι μαλακό κρεβατάκι!'],
  ['Hedgehog', 'Basket gift', 'Πάρε το καλαθάκι μου!'],
  ['Duck', 'Pond request', 'Η μπάλα μου! Δεν τη φτάνω!'],
  ['Bunny', 'Net hint', 'Ας δοκιμάσουμε την απόχη.'],
  ['Duck', 'Ball recovered', 'Η μπάλα μου! Ευχαριστώ!'],
  ['Puppy', 'Orchard request', 'Τα μήλα είναι εκεί πάνω!'],
  ['Bunny', 'Box hint', 'Ας φέρουμε το κουτί κάτω από το κλαδί.'],
  ['Bunny', 'Basket needed', 'Πού θα πέσουν τα μήλα;'],
  ['Bunny', 'Basket hint', 'Ας βάλουμε το καλαθάκι από κάτω.'],
  ['Bunny', 'Basket prerequisite', 'Ο σκαντζόχοιρος έχει ένα καλαθάκι. Πάμε να τον βοηθήσουμε!'],
  ['Puppy', 'Apple joke', 'Ένα μήλο στο κεφάλι σου!'],
  ['Puppy', 'Going to picnic', 'Θα φέρω εγώ τα μήλα!'],
  ['Bunny', 'Plates', 'Ένα πιάτο για τον καθένα.'],
  ['Bunny', 'Apples', 'Ένα μήλο για τον καθένα.'],
  ['Bunny', 'All served', 'Καλή όρεξη!'],
  ['Bunny', 'Free play', 'Πάμε να παίξουμε!'],
  ['Bunny', 'Gentle retry', 'Ας δοκιμάσουμε κάτι άλλο.'],
] as const;
