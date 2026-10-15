import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { contactShadow } from './contact-shadow';
import './style.css';

const picnic = new URLSearchParams(location.search).get('model') === 'picnic';
const modelUrl = picnic
  ? new URL('../assets/bunny.glb', import.meta.url).href
  : new URL('../assets/bow-bunny.glb', import.meta.url).href;
const referenceUrl = picnic
  ? new URL('../../bunnys-picnic/assets/concepts/characters-v1.png', import.meta.url).href
  : new URL('../assets/bow-bunny-reference.png', import.meta.url).href;
const element = <T extends HTMLElement>(id: string): T => {
  const result = document.getElementById(id);
  if (!result) throw new Error(`Missing viewer element: ${id}`);
  return result as T;
};
const viewport = element<HTMLDivElement>('viewport');
const loading = element<HTMLDivElement>('loading');
const progress = loading.querySelector('progress')!;
const talkButton = element<HTMLButtonElement>('talk');
talkButton.hidden = picnic;
element<HTMLImageElement>('reference-image').src = referenceUrl;
element<HTMLAnchorElement>('download-model').href = modelUrl;
element<HTMLAnchorElement>('download-model').download = picnic ? 'bunny.glb' : 'bow-bunny.glb';
element<HTMLAnchorElement>('compare-bunny').href = picnic ? '?model=bow' : '?model=picnic';
element('compare-bunny').textContent = picnic ? 'New bunny ↗' : 'Previous bunny ↗';
document.documentElement.dataset.character = picnic ? 'picnic' : 'bow';
if (!picnic) {
  element<HTMLImageElement>('reference-image').alt = 'Supplied reference: seated ivory bunny with large blue eyes, upright pink ears and a yellow bow.';
  element('reference-heading').textContent = 'The new reference';
  element('reference-caption').textContent = 'The reference you chose for this version.';
}
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer: THREE.WebGLRenderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
} catch {
  loading.innerHTML = '<p>This viewer needs WebGL.</p><span>Try opening it in a recent Chrome, Safari, or Firefox.</span>';
  throw new Error('WebGL renderer unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0xeee9de, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
viewport.append(renderer.domElement);
renderer.domElement.setAttribute('aria-hidden', 'true');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, .05, 60);
camera.layers.enable(1);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = .075;
controls.enablePan = true;
controls.panSpeed = .65;
controls.rotateSpeed = .7;
controls.zoomSpeed = .7;
controls.minDistance = 2.3;
controls.maxDistance = 12;
controls.minPolarAngle = .18;
controls.maxPolarAngle = Math.PI * .52;
controls.autoRotateSpeed = .55;
controls.target.set(0, 1.48, 0);
camera.position.set(3.6, 2.5, 7.2);
controls.update();

const environment = new RoomEnvironment();
const pmrem = new THREE.PMREMGenerator(renderer);
const envTarget = pmrem.fromScene(environment, .055);
scene.environment = envTarget.texture;
scene.environmentIntensity = .36;
environment.dispose();
pmrem.dispose();
const ambient = new THREE.HemisphereLight(0xfaf5e9, 0x9e9e80, picnic ? 1.1 : .8);
scene.add(ambient);
const key = new THREE.DirectionalLight(0xffefd9, 2.1);
key.position.set(-3, 7, 5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -2.3; key.shadow.camera.right = 2.3;
key.shadow.camera.top = 3.6; key.shadow.camera.bottom = -2;
key.shadow.camera.near = .1; key.shadow.camera.far = 15;
key.shadow.normalBias = .018;
key.shadow.bias = -.0001;
key.shadow.radius = 4;
key.shadow.intensity = .35;
key.target.position.set(0, 1.4, 0);
scene.add(key, key.target);
const fill = new THREE.DirectionalLight(0xdceaff, .8);
fill.position.set(4, 2.5, 2); scene.add(fill);
const rim = new THREE.DirectionalLight(0xffe7bd, 1.6);
rim.position.set(1, 4, -3); scene.add(rim);

const presentation = new THREE.Group(); scene.add(presentation);
const garden = new THREE.Group(); presentation.add(garden);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0xc3c4a6, roughness: 1 });
const base = new THREE.Mesh(new THREE.CylinderGeometry(1.31, 1.27, .07, 96, 1), groundMaterial);
base.position.y = -.034;
base.receiveShadow = true;
presentation.add(base);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ color: 0x625747, opacity: .11 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -.071; floor.receiveShadow = true;
scene.add(floor);
const contact = contactShadow(scene, renderer);

// A few fully three-dimensional botanical details keep the character central.
const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x83946a, roughness: .95, side: THREE.DoubleSide });
const petalMaterial = new THREE.MeshStandardMaterial({ color: 0xf6ecd3, roughness: .86 });
const flowerCenter = new THREE.MeshStandardMaterial({ color: 0xd3ae5d, roughness: .84 });
const leaves: THREE.BufferGeometry[] = [];
const petals: THREE.BufferGeometry[] = [];
const hearts: THREE.BufferGeometry[] = [];
let seed = 39;
function random(): number { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; }
const dummy = new THREE.Object3D();
function transformed(geometry: THREE.BufferGeometry, p: THREE.Vector3, scale: THREE.Vector3, rotation: THREE.Euler): THREE.BufferGeometry {
  dummy.position.copy(p); dummy.scale.copy(scale); dummy.rotation.copy(rotation); dummy.updateMatrix();
  return geometry.clone().applyMatrix4(dummy.matrix);
}
const leafShape = new THREE.Shape();
leafShape.moveTo(0, 0); leafShape.quadraticCurveTo(-.07, .13, 0, .29); leafShape.quadraticCurveTo(.09, .14, 0, 0);
const leafGeometry = new THREE.ShapeGeometry(leafShape, 10);
const petalGeometry = new THREE.SphereGeometry(1, 12, 8);
for (let cluster = 0; cluster < 16; cluster++) {
  const angle = random() * Math.PI * 2;
  const radius = .84 + random() * .34;
  const x = Math.sin(angle) * radius, z = Math.cos(angle) * radius;
  for (let i = 0; i < 3; i++) {
    leaves.push(transformed(leafGeometry, new THREE.Vector3(x, -.023, z), new THREE.Vector3(.7, .35 + random() * .4, .7), new THREE.Euler(.25 + random(), random() * Math.PI * 2, -.4 + random() * .8)));
  }
  if (cluster % 3 === 0) {
    const y = .05 + random() * .08;
    for (let i = 0; i < 7; i++) {
      const a = i * Math.PI * 2 / 7;
      petals.push(transformed(petalGeometry, new THREE.Vector3(x + Math.sin(a) * .032, y, z + Math.cos(a) * .032), new THREE.Vector3(.018, .008, .042), new THREE.Euler(0, a, -.2)));
    }
    hearts.push(transformed(petalGeometry, new THREE.Vector3(x, y + .005, z), new THREE.Vector3(.022, .014, .022), new THREE.Euler()));
    leaves.push(transformed(leafGeometry, new THREE.Vector3(x, -.02, z), new THREE.Vector3(.13, y * 4, .13), new THREE.Euler()));
  }
}
for (const [geometries, material] of [[leaves, leafMaterial], [petals, petalMaterial], [hearts, flowerCenter]] as const) {
  const combined = mergeGeometries(geometries);
  if (combined) { const m = new THREE.Mesh(combined, material); m.castShadow = true; m.receiveShadow = true; garden.add(m); }
  for (const geometry of geometries) geometry.dispose();
}
leafGeometry.dispose(); petalGeometry.dispose();

let bunny: THREE.Group | undefined;
let mixer: THREE.AnimationMixer | undefined;
const actions = new Map<string, THREE.AnimationAction>();
let currentAction: THREE.AnimationAction | undefined;
let paused = reducedMotion;
let poseName = 'Idle';
let stageName = 'garden';
let talking = false;
const mouthMeshes: { mesh: THREE.Mesh; index: number }[] = [];
const originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
const clayMaterial = new THREE.MeshStandardMaterial({ color: 0xd3c5ac, roughness: .84 });
let frameTransition: { spherical: THREE.Spherical; target: THREE.Vector3; startSpherical: THREE.Spherical; startTarget: THREE.Vector3; started: number } | undefined;
const toast = (message: string): void => {
  const e = element('toast'); e.textContent = message; e.classList.add('visible');
  window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => e.classList.remove('visible'), 2400);
};
let toastTimer = 0;

function selectButtons(selector: string, attribute: string, value: string): void {
  document.querySelectorAll<HTMLButtonElement>(selector).forEach(button => {
    const selected = button.getAttribute(attribute) === value;
    button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected));
  });
}

function setPose(name: string): void {
  const action = actions.get(name);
  if (!action || !mixer) return;
  if (currentAction !== action) {
    currentAction?.fadeOut(.3);
    action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(.3).play();
    currentAction = action;
  } else if (name !== 'Idle') action.reset().play();
  poseName = name;
  selectButtons('[data-pose]', 'data-pose', name);
}

function togglePause(): void {
  paused = !paused;
  const button = element<HTMLButtonElement>('pause');
  button.setAttribute('aria-pressed', String(paused));
  button.innerHTML = paused ? '<span aria-hidden="true">▷</span> Play' : '<span aria-hidden="true">Ⅱ</span> Pause';
  button.title = paused ? 'Play animation (Space)' : 'Pause animation (Space)';
}

function setTalking(enabled: boolean): void {
  const action = actions.get('Talk');
  if (!action || !mixer) return;
  talking = enabled;
  if (enabled) {
    if (paused) togglePause();
    action.reset().setEffectiveWeight(1).fadeIn(.12).play();
  } else if (paused) {
    action.stop();
    mixer.update(0);
  } else action.fadeOut(.15);
  talkButton.classList.toggle('selected', enabled);
  talkButton.setAttribute('aria-pressed', String(enabled));
}

function frameView(name: string, animate = true): void {
  const narrow = viewport.clientWidth / viewport.clientHeight < .85;
  const height = viewport.clientHeight;
  const visibleFraction = Math.max(height - 260, height * .53) / height;
  const distance = Math.max(narrow ? 9.4 : 7.9, 3.45 / (2 * Math.tan(THREE.MathUtils.degToRad(16)) * visibleFraction));
  const views: Record<string, [THREE.Vector3, THREE.Vector3]> = {
    portrait: [new THREE.Vector3(distance * (picnic ? .43 : .23), picnic ? 2.6 : 2.1, distance * .96), new THREE.Vector3(0, 1.46, 0)],
    front: [new THREE.Vector3(0, 1.8, distance), new THREE.Vector3(0, 1.48, 0)],
    back: [new THREE.Vector3(0, 2.0, -distance), new THREE.Vector3(0, 1.48, 0)],
    detail: [new THREE.Vector3(.70, picnic ? 2.22 : 1.94, narrow ? 4.8 : 3.85), new THREE.Vector3(0, picnic ? 2.14 : 1.82, 0)],
  };
  const chosen = views[name]; if (!chosen) return;
  controls.autoRotate = false; element('spin').setAttribute('aria-pressed', 'false');
  if (animate && !reducedMotion) {
    const startSpherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    const spherical = new THREE.Spherical().setFromVector3(chosen[0].clone().sub(chosen[1]));
    while (spherical.theta - startSpherical.theta > Math.PI) spherical.theta -= Math.PI * 2;
    while (spherical.theta - startSpherical.theta < -Math.PI) spherical.theta += Math.PI * 2;
    frameTransition = { spherical, target: chosen[1], startSpherical, startTarget: controls.target.clone(), started: performance.now() };
  }
  else { camera.position.copy(chosen[0]); controls.target.copy(chosen[1]); controls.update(); }
  selectButtons('[data-view]', 'data-view', name);
}

function setStage(name: string): void {
  stageName = name;
  garden.visible = name === 'garden';
  groundMaterial.color.set(name === 'garden' ? 0xc3c4a6 : 0xdad3c4);
  scene.environmentIntensity = name === 'clay' ? .22 : .36;
  for (const [mesh, original] of originalMaterials) mesh.material = name === 'clay' ? clayMaterial : original;
  selectButtons('[data-stage]', 'data-stage', name);
}

function resize(): void {
  const width = viewport.clientWidth, height = viewport.clientHeight;
  renderer.setSize(width, height, false); camera.aspect = width / height;
  // Leave a little breathing room for the compact controls without shrinking the canvas.
  camera.setViewOffset(width, height, 0, Math.min(80, height * .15), width, height);
  camera.updateProjectionMatrix();
}
const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(viewport);
resize(); frameView('portrait', false);

const loader = new GLTFLoader();
loader.load(modelUrl, gltf => {
  bunny = gltf.scene; scene.add(bunny);
  bunny.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const mouthIndex = object.morphTargetDictionary?.MouthOpen;
    if (mouthIndex !== undefined) mouthMeshes.push({ mesh: object, index: mouthIndex });
    object.castShadow = true;
    // The smooth ivory sculpt exposes shadow-map acne at grazing angles.
    // Keep its cast/contact shadows and use the studio lights on its surfaces.
    object.receiveShadow = picnic;
    object.layers.enable(1);
    originalMaterials.set(object, object.material);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (material instanceof THREE.MeshStandardMaterial && material.map) {
        material.map.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
        // The same authored UVs give the generated weave a very subtle tactile relief.
        material.bumpMap = material.map;
        material.bumpScale = material.name.includes('cotton') ? .0013 : .0008;
        material.needsUpdate = true;
      }
      if (material.name.includes('Fine down')) {
        object.castShadow = false; object.receiveShadow = false; object.layers.disable(1);
      }
    }
  });
  mixer = new THREE.AnimationMixer(bunny);
  for (const clip of gltf.animations) {
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopRepeat, Infinity);
    actions.set(clip.name, action);
  }
  setPose('Idle'); mixer.update(0);
  renderer.compile(scene, camera);
  loading.classList.add('ready');
  if (reducedMotion) { paused = false; togglePause(); }
  document.querySelectorAll<HTMLButtonElement>('[data-pose]').forEach(button => button.disabled = false);
  talkButton.disabled = !actions.has('Talk');
  viewport.dataset.ready = 'true';
}, event => { if (event.total) progress.value = event.loaded / event.total * 100; }, error => {
  console.error(error);
  loading.innerHTML = '<p>Bunny couldn’t load.</p><button id="retry">Try again</button>';
  document.getElementById('retry')?.addEventListener('click', () => location.reload());
});

document.querySelectorAll<HTMLButtonElement>('[data-pose]').forEach(button => {
  button.disabled = true;
  button.addEventListener('click', () => { if (paused) togglePause(); setPose(button.dataset.pose!); });
});
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button => button.addEventListener('click', () => frameView(button.dataset.view!)));
document.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach(button => button.addEventListener('click', () => setStage(button.dataset.stage!)));
element('pause').addEventListener('click', togglePause);
talkButton.addEventListener('click', () => setTalking(!talking));
element('spin').addEventListener('click', () => {
  frameTransition = undefined;
  controls.autoRotate = !controls.autoRotate;
  element('spin').setAttribute('aria-pressed', String(controls.autoRotate));
});
controls.addEventListener('start', () => { frameTransition = undefined; });

function reference(show: boolean): void {
  element('reference-panel').hidden = !show; element('reference-toggle').setAttribute('aria-expanded', String(show));
}
element('reference-toggle').addEventListener('click', () => reference(element('reference-panel').hidden));
element('reference-close').addEventListener('click', () => reference(false));
const fullscreen = async (): Promise<void> => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await element('app').requestFullscreen();
  } catch { toast('Fullscreen isn’t available in this browser.'); }
};
element('fullscreen').addEventListener('click', () => void fullscreen());
document.addEventListener('keydown', event => {
  if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLAnchorElement) return;
  if (event.code === 'Space') { event.preventDefault(); togglePause(); }
  if (event.key.toLowerCase() === 'f') void fullscreen();
  if (event.key === 'Escape') reference(false);
  if (event.key === '1') frameView('portrait');
  if (event.key === '2') frameView('front');
  if (event.key === '3') frameView('back');
});
element('save-view').addEventListener('click', () => {
  renderer.render(scene, camera);
  const link = document.createElement('a');
  link.download = 'bunny-3d.png'; link.href = renderer.domElement.toDataURL('image/png'); link.click();
  toast('Saved this view.');
});

let lastTime = performance.now();
renderer.setAnimationLoop(time => {
  const dt = Math.min((time - lastTime) / 1000, .05); lastTime = time;
  if (document.hidden) return;
  if (!paused) mixer?.update(dt);
  if (frameTransition) {
    const t = Math.min(1, (performance.now() - frameTransition.started) / 750), eased = t * t * (3 - 2 * t);
    controls.target.lerpVectors(frameTransition.startTarget, frameTransition.target, eased);
    const a = frameTransition.startSpherical, b = frameTransition.spherical;
    camera.position.setFromSpherical(new THREE.Spherical(
      THREE.MathUtils.lerp(a.radius, b.radius, eased), THREE.MathUtils.lerp(a.phi, b.phi, eased), THREE.MathUtils.lerp(a.theta, b.theta, eased),
    )).add(controls.target);
    if (t === 1) frameTransition = undefined;
  }
  controls.update(dt);
  if (bunny) contact.update(time, !paused);
  renderer.render(scene, camera);
});

// Read-only inspection for browser checks; no extra interface in the finished viewer.
Object.defineProperty(window, '__bunnyViewer', { value: {
  get ready() { return !!bunny; },
  get pose() { return poseName; },
  get poseTime() { return currentAction?.time ?? 0; },
  get paused() { return paused; },
  get talking() { return talking; },
  get mouthOpen() { const mouth = mouthMeshes[0]; return mouth?.mesh.morphTargetInfluences?.[mouth.index] ?? 0; },
  get stage() { return stageName; },
  get animations() { return [...actions.keys()]; },
  get camera() { return camera.position.toArray(); },
  get triangles() { return renderer.info.render.triangles; },
  get drawCalls() { return renderer.info.render.calls; },
  get bounds() { return bunny ? new THREE.Box3().setFromObject(bunny).getSize(new THREE.Vector3()).toArray() : []; },
} });

if (import.meta.hot) import.meta.hot.dispose(() => {
  renderer.setAnimationLoop(null); controls.dispose(); resizeObserver.disconnect();
  mixer?.stopAllAction(); if (bunny) mixer?.uncacheRoot(bunny);
  contact.dispose(); envTarget.dispose(); renderer.dispose(); renderer.domElement.remove();
  scene.traverse(obj => { if (obj instanceof THREE.Mesh) obj.geometry.dispose(); });
  const materials = new Set<THREE.Material>();
  scene.traverse(obj => { if (obj instanceof THREE.Mesh) for (const m of Array.isArray(obj.material) ? obj.material : [obj.material]) materials.add(m); });
  for (const m of materials) m.dispose();
});
