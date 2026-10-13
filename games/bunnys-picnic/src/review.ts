import './review.css';
import { scenes, beats } from './review-data';
import characters from '../assets/concepts/characters-v1.png';
import actions from '../assets/review/actions-spaced.png';
import props from '../assets/review/props.png';
import pondPoses from '../assets/animation/poses.png';
import design from '../DESIGN.md?raw';

const images = import.meta.glob<string>('../assets/review/*.png', { eager: true, query: '?url', import: 'default' });
const prompts = import.meta.glob<string>('../assets/{review,animation,concepts}/*.txt', { eager: true, query: '?url', import: 'default' });
const asset = (name: string): string => images['../assets/review/' + name + '.png']!;
const escape = (value: string): string => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const root = document.querySelector<HTMLDivElement>('#review')!;
root.innerHTML = `
  <header class="masthead"><a class="brand" href="#top">Bunny’s Picnic</a><nav aria-label="Review sections"><a href="#places">Places</a><a href="#cast">Characters</a><a href="#motion">Motion</a><a href="#voice">Visual cues</a><a href="#design">Design</a></nav></header>
  <main id="top">
    <section class="intro"><p class="eyebrow">The complete design and art review</p><h1>A little adventure.<br>A picnic with friends.</h1><p class="lead">Five places, eight small problems, and a world that changes as Bunny helps. Everything for this review is collected here.</p><div class="intro-links"><a class="primary" href="#places">Explore the scenes <span aria-hidden="true">↓</span></a><a href="#motion">Watch the motion samples</a></div><p class="quiet">The design collection is preserved here. <a href="./index.html">Open the complete version 1 game →</a></p></section>
    <section id="places" class="section"><div class="section-heading"><div><p class="eyebrow">The world</p><h2>Five familiar places</h2></div><p>Switch scenes and puzzle states. Turn on the touch targets to inspect how the clues work.</p></div>
      <div id="scene-tabs" class="scene-tabs" aria-label="Choose a location">${scenes.map((s, i) => `<button data-scene="${i}" aria-pressed="${i === 0}">${s.title}</button>`).join('')}</div>
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
      <figure class="sheet"><a href="${characters}" target="_blank" rel="noopener"><img src="${characters}" loading="lazy" alt="Bunny, Duck, Puppy and Hedgehog with their expressions"></a><figcaption><strong>The four friends.</strong> Bunny is curious; Duck is enthusiastic; Puppy is eager; Hedgehog loves cosy places. Tap any sheet to view it at full size.</figcaption></figure>
      <figure class="sheet"><a href="${actions}" target="_blank" rel="noopener"><img src="${actions}" loading="lazy" alt="Eight painted action poses: laying, pushing, carrying, reaching, and character reactions"></a><figcaption><strong>Adventure action poses.</strong> Laying the cloth, pushing, carrying the basket, the apple joke, Puppy’s reactions, and Hedgehog’s gift and leaf hat.</figcaption></figure>
      <figure class="sheet"><a href="${pondPoses}" target="_blank" rel="noopener"><img src="${pondPoses}" loading="lazy" alt="Bunny and Duck poses, ball and net used in the pond animation"></a><figcaption><strong>Pond animation poses.</strong> The separate painted pieces already used in the working pond sample.</figcaption></figure>
      <figure class="sheet"><a href="${props}" target="_blank" rel="noopener"><img src="${props}" loading="lazy" alt="Twelve prop designs: plank, net, basket, box, two cloth states, leaves, bed, plate, apple, ball, cushion"></a><figcaption><strong>Twelve prop designs.</strong> Recognisable silhouettes carry through the scene, the picture tray, and hints. The only carried tools are the plank, net, and basket.</figcaption></figure>
    </section>
    <section id="motion" class="section"><div class="section-heading"><div><p class="eyebrow">The eight puzzle actions</p><h2>See how each moment moves</h2></div><p>The pond is a full-scene animation. The other seven are isolated painted motion studies on a plain stage, showing the intended action and reaction.</p></div>
      <div id="beat-tabs" class="beat-tabs">${beats.map((b, i) => `<button data-beat="${i}" aria-pressed="${i === 3}"><span>${String(i + 1).padStart(2, '0')}</span>${b.name}</button>`).join('')}</div>
      <div class="motion-card"><div class="motion-top"><div><h3 id="beat-title"></h3><p id="beat-thought"></p></div><a id="open-motion" target="_blank" rel="noopener">Open full screen ↗</a></div><div id="motion-player" class="motion-player"><button id="load-motion" class="primary">Load animation</button></div><p class="quiet" id="motion-status" aria-live="polite"></p><ol id="beat-steps"></ol><p id="beat-timing" class="quiet"></p></div>
    </section>
    <section id="voice" class="section"><div class="section-heading"><div><p class="eyebrow">No words needed</p><h2>Gestures, pictures, and little reactions</h2></div><p>The spoken dialogue has been retired. Requests use painted pointing poses, thought pictures, and demonstrations. Sound adds short wordless animal reactions; every puzzle remains understandable when muted.</p></div>
      <div class="design-grid"><article><h3>Show the problem</h3><p>Duck reaches toward the ball. Puppy looks up and raises a paw toward the apples. Hedgehog gestures toward the hollow. Bunny points to the cloth or an empty picnic place.</p></article><article><h3>Show the connection</h3><p>Help first highlights the useful object and its destination, then demonstrates its movement. When something is elsewhere, destination pictures show the route through the garden.</p></article><article><h3>Show delight</h3><p>Waves, open wings, excited paws, contented expressions, and short quacks, yips, chirrs, and hums acknowledge success. There are no spoken words or failure buzzers.</p></article></div>
      <p><a class="primary" href="./index.html">Play the wordless adventure →</a></p>
    </section>
    <section id="design" class="section"><div class="section-heading"><div><p class="eyebrow">How it all fits</p><h2>The complete adventure design</h2></div><a id="download-design" class="primary" download="Bunnys-Picnic-Design.md">Download design</a></div>
      <div class="design-grid"><article><h3>The connected story</h3><p>Spread the cloth, then explore. The shed supplies the net for Duck and the plank for Hedgehog. Helping Hedgehog earns the basket. The box and basket together solve Puppy’s apple problem. All three friends return for plates, sharing, and a playful picnic.</p></article><article><h3>Touch and help</h3><p>Tap to walk, inspect, or collect. Select a picture, then tap its destination; dragging is equivalent. Big forgiving targets, visible consequences, and repeatable visual requests. Hints progress from goal picture to tool picture to demonstration.</p></article><article><h3>A complete first experience</h3><p>Five finished scenes, the whole puzzle chain, character reactions, sound, visual guidance, saved progress, and a picnic she can keep playing in. Your daughter’s first encounter is with that complete experience.</p></article><article><h3>Review versus production</h3><p>The scene illustrations establish composition and puzzle states. Motion studies establish actions. Final scene layers, smoother frame sequences, expressive gestures, full game rules, and tablet play remain implementation work.</p></article></div>
      <details class="full-design"><summary>Read the full design document</summary><div id="design-text"></div></details>
      <details class="provenance"><summary>Artwork sources and generation prompts</summary><p>Raster illustrations were created with built-in image generation from the approved character and pond references. Originals are preserved. These are the exact prompts used.</p><ul>${Object.entries(prompts).sort(([a], [b]) => a.localeCompare(b)).map(([path, url]) => `<li><a href="${url}" target="_blank" rel="noopener">${path.replace('../assets/', '')}</a></li>`).join('')}</ul></details>
    </section>
    <footer>Prepared for one parent review · Bunny’s Picnic · Visual cues · Tablet touch</footer>
  </main>`;

let sceneIndex = 0;
let stateIndex = 0;
const sceneImage = document.querySelector<HTMLImageElement>('#scene-image')!;
const targets = document.querySelector<HTMLInputElement>('#targets-toggle')!;
const clue = document.querySelector<HTMLDivElement>('#clue')!;
function showScene(): void {
  const scene = scenes[sceneIndex]!;
  const state = scene.states[stateIndex]!;
  document.querySelector('#scene-title')!.textContent = scene.title;
  document.querySelector('#scene-purpose')!.textContent = scene.purpose;
  sceneImage.src = asset(state.file); sceneImage.alt = scene.title + ': ' + state.label;
  document.querySelector('#state-note')!.textContent = state.note;
  document.querySelector('#scene-play')!.textContent = scene.play;
  document.querySelector('#scene-hint')!.textContent = scene.hint;
  document.querySelector('#scene-sound')!.textContent = scene.sound;
  document.querySelector('#states')!.innerHTML = scene.states.map((s, i) => `<button data-state="${i}" aria-pressed="${i === stateIndex}">${s.label}</button>`).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-scene]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.scene) === sceneIndex)));
  document.querySelectorAll<HTMLButtonElement>('[data-state]').forEach(button => button.onclick = () => { stateIndex = Number(button.dataset.state); showScene(); });
  clue.hidden = true;
  const hotspots = document.querySelector<HTMLDivElement>('#hotspots')!;
  hotspots.innerHTML = stateIndex === 0 && targets.checked ? scene.hotspots.map((spot, i) => `<button class="hotspot" style="left:${spot.x}%;top:${spot.y}%" data-spot="${i}" aria-label="${escape(spot.label)}"><span>${spot.label}</span></button>`).join('') : '';
  hotspots.querySelectorAll<HTMLButtonElement>('[data-spot]').forEach(button => button.onclick = () => {
    const spot = scene.hotspots[Number(button.dataset.spot)]!;
    clue.hidden = false; clue.textContent = spot.label + ' — ' + spot.clue;
  });
  targets.disabled = stateIndex !== 0;
}
document.querySelectorAll<HTMLButtonElement>('[data-scene]').forEach(button => button.onclick = () => { sceneIndex = Number(button.dataset.scene); stateIndex = 0; showScene(); });
targets.onchange = showScene;
showScene();

let beatIndex = 3;
let motionLoaded = false;
const motionPlayer = document.querySelector<HTMLDivElement>('#motion-player')!;
const motionStatus = document.querySelector<HTMLParagraphElement>('#motion-status')!;
function showBeat(): void {
  const beat = beats[beatIndex]!;
  const url = './sample.html' + (beat.id === 'pond' ? '' : '?study=' + beat.id);
  document.querySelector('#beat-title')!.textContent = beat.name;
  document.querySelector('#beat-thought')!.textContent = beat.thought;
  document.querySelector('#beat-steps')!.innerHTML = beat.steps.map(step => `<li>${step}</li>`).join('');
  document.querySelector('#beat-timing')!.textContent = beat.timing;
  document.querySelector<HTMLAnchorElement>('#open-motion')!.href = url;
  document.querySelectorAll<HTMLButtonElement>('[data-beat]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.beat) === beatIndex)));
  if (motionLoaded) {
    motionPlayer.innerHTML = `<iframe title="${escape(beat.name)} motion sample" src="${url}" allow="autoplay; fullscreen"></iframe>`;
    motionPlayer.scrollIntoView({ block: 'center', behavior: 'instant' });
    motionStatus.textContent = beat.id === 'pond' ? 'Tap play, or select the net and tap the ball. Requests use the character’s reaching gesture.' : 'Silent action study. It plays once automatically; use the replay arrow to watch again. The complete scene is shown above.';
  } else {
    motionStatus.textContent = 'Load the animation when you are ready. No video or sound starts while you browse the artwork.';
  }
}
document.querySelector<HTMLButtonElement>('#load-motion')!.onclick = () => { motionLoaded = true; showBeat(); };
document.querySelectorAll<HTMLButtonElement>('[data-beat]').forEach(button => button.onclick = () => { beatIndex = Number(button.dataset.beat); showBeat(); });
showBeat();

const documentUrl = URL.createObjectURL(new Blob([design], { type: 'text/markdown;charset=utf-8' }));
document.querySelector<HTMLAnchorElement>('#download-design')!.href = documentUrl;
// The full source stays selectable, with its original tables and dependency map intact.
document.querySelector('#design-text')!.textContent = design;
window.addEventListener('pagehide', () => {
  URL.revokeObjectURL(documentUrl);
}, { once: true });
