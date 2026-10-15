import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { gardenCamera } from './garden-camera';
import { createGardenObjects, approachObject } from './garden-objects';
import { gardenSound } from './garden-sound';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import layout from '../assets/garden-layout.json';
import { advance, canTravel, distance, findPath, hopProgress, type Point } from './garden-navigation';
import './garden.css';

const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const viewport = el('garden-viewport'), loading = el('garden-loading');
el<HTMLImageElement>('garden-reference').src = new URL('../../bunnys-picnic/assets/review/garden-before.png', import.meta.url).href;
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = .87;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewport.append(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#d8e8ed');
scene.fog = new THREE.Fog('#d8e8ed', 29, 65);
const camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
const cameraRig = gardenCamera(camera, renderer.domElement);
const sound = gardenSound();
function resize(): void {
  camera.aspect = viewport.clientWidth / viewport.clientHeight;
  camera.updateProjectionMatrix(); renderer.setSize(viewport.clientWidth, viewport.clientHeight, false);
  cameraRig.resize();
}
const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(viewport);
resize();
scene.add(new THREE.HemisphereLight('#fff6e5', '#94a77a', 1.35));
const sun = new THREE.DirectionalLight('#fff0cd', 1.9);
sun.position.set(-8, 15, 8); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: .1, far: 45 });
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.normalBias = .055; sun.shadow.bias = -.00015; sun.shadow.intensity = .45;
// The garden is static. Cache its shadow map; Bunny has a moving contact shadow.
sun.shadow.autoUpdate = false;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight('#deedff', .55);fill.position.set(7, 6, -3);scene.add(fill);
const room = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(renderer);
const environment = pmrem.fromScene(room, .08);
scene.environment = environment.texture; scene.environmentIntensity = .28;
room.dispose(); pmrem.dispose();

// A soft contact shadow anchors the bunny between the directional shadow's pixels.
const shadowCanvas = document.createElement('canvas');shadowCanvas.width = shadowCanvas.height = 128;
const ctx = shadowCanvas.getContext('2d')!;
const gradient = ctx.createRadialGradient(64, 64, 7, 64, 64, 63);
gradient.addColorStop(0, 'rgba(68,72,42,.30)'); gradient.addColorStop(.45, 'rgba(68,72,42,.17)'); gradient.addColorStop(1, 'rgba(68,72,42,0)');
ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false });
const contact = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 1), shadowMaterial);
contact.rotation.x = -Math.PI / 2;contact.position.y = .025;scene.add(contact);
// Gentle contact shading beneath the static props survives at tablet resolution.
const propShadows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), shadowMaterial.clone(), layout.obstacles.length);
const shadowTransform = new THREE.Object3D();
layout.obstacles.forEach((o, i) => {
  shadowTransform.position.set(o.x, .023, o.z);
  shadowTransform.rotation.x = -Math.PI / 2;
  shadowTransform.scale.set(o.radius * 3.2, o.radius * 2.8, 1); shadowTransform.updateMatrix();
  propShadows.setMatrixAt(i, shadowTransform.matrix);
});
scene.add(propShadows);

const destination = new THREE.Group();
const markerMaterial = new THREE.MeshBasicMaterial({ color: '#fff8d4', transparent: true, opacity: .9, depthWrite: false, side: THREE.DoubleSide });
const ring = new THREE.Mesh(new THREE.RingGeometry(.20, .245, 40), markerMaterial);
ring.rotation.x = -Math.PI / 2; destination.add(ring); destination.position.y = .035; destination.visible = false;scene.add(destination);

const position: Point = { ...layout.start };
const actor = new THREE.Group();actor.position.set(position.x, .015, position.z);scene.add(actor);
let bunny: THREE.Group | undefined, mixer: THREE.AnimationMixer | undefined;
let idle: THREE.AnimationAction | undefined, hopping: THREE.AnimationAction | undefined;
let hop: { phase: number; length: number; progress: number; duration: number } | undefined;
let path: Point[] = [], ready = false, heading = .28;
let objects: ReturnType<typeof createGardenObjects> | undefined;
let pendingInteraction: { id: string; goal: Point } | undefined;
let curious: THREE.AnimationAction | undefined, reactionTime = 0;
let attention: Point | undefined;
const keys = new Set<string>();
const moveCodes = new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD']);
let totalDistance = 0, hopCount = 0;
let idleBlend = 1;

const loader = new GLTFLoader();
let loaded = 0;
const progress = loading.querySelector('progress')!;
function assetReady(): void { progress.value = ++loaded; }
async function load(): Promise<void> {
  try {
    const [garden, character] = await Promise.all([
      loader.loadAsync(new URL('../assets/picnic-garden.glb', import.meta.url).href).then(g => { assetReady(); return g; }),
      loader.loadAsync(new URL('../assets/garden-bunny.glb', import.meta.url).href).then(g => { assetReady(); return g; }),
    ]);
    garden.scene.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = object.userData.castShadow === true;
      object.receiveShadow = ['Lawn', 'Cream paths', 'Cottage walls'].includes(object.name.replaceAll('_', ' '));
      for (const mat of Array.isArray(object.material) ? object.material : [object.material]) {
        if (mat instanceof THREE.MeshStandardMaterial && mat.map) mat.map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      }
    });
    scene.add(garden.scene);
    objects = createGardenObjects(scene, garden.scene, chooseObject);
    bunny = character.scene;bunny.scale.setScalar(.62);actor.add(bunny);
    bunny.traverse(object => {
      if (object instanceof THREE.Mesh) { object.castShadow = false; object.receiveShadow = false; }
    });
    mixer = new THREE.AnimationMixer(bunny);
    idle = mixer.clipAction(character.animations.find(c => c.name === 'Idle')!).play();
    hopping = mixer.clipAction(character.animations.find(c => c.name === 'Hop')!).play();
    hopping.paused = true; hopping.setEffectiveWeight(0);
    curious = mixer.clipAction(character.animations.find(c => c.name === 'Curious')!).play();
    curious.paused = true; curious.setEffectiveWeight(0);
    mixer.update(0); actor.rotation.y = heading;
    sun.shadow.needsUpdate = true;
    await renderer.compileAsync(scene, camera);
    ready = true; viewport.dataset.ready = 'true'; loading.classList.add('ready');
  } catch (error) {
    console.error(error);loading.replaceChildren();
    const message=document.createElement('p');message.textContent='The garden couldn’t load.';
    const retry=document.createElement('button');retry.textContent='Try again';retry.onclick=()=>location.reload();loading.append(message,retry);
  }
}
void load();

function cancelInteraction(): void {
  pendingInteraction=undefined;objects?.select(undefined);attention=undefined;
  reactionTime=0;curious?.setEffectiveWeight(0);
}
function markDestination(): void {
  const end=path.at(-1);
  destination.visible=!!end;
  if(end)destination.position.set(end.x,.036,end.z);
}
function goTo(target: Point): void {
  if (!ready || cameraRig.inspecting || !el('art-panel').hidden) return;
  cancelInteraction();path=findPath(position,target,layout);markDestination();
  el('garden-status').textContent='Bunny is hopping to the spot.';
}
function chooseObject(id:string):void {
  if(!ready||cameraRig.inspecting||!el('art-panel').hidden)return;
  sound.unlock();
  const object=objects?.get(id);if(!object)return;
  const route=approachObject(position,object,layout);
  if(!route)return;
  cancelInteraction();path=route;
  pendingInteraction={id,goal:{...(route.at(-1)??position)}};
  objects?.select(id);markDestination();
  el('garden-status').textContent=`Bunny is going to the ${object.name}.`;
}

// Play uses taps only. Free rotation and zoom are confined to Look around.
const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), intersection = new THREE.Vector3();
const activePointers = new Set<number>();
let press: { x: number; y: number; id: number; dragged: boolean } | undefined;
renderer.domElement.addEventListener('pointerdown', event => {
  if(cameraRig.inspecting || event.button!==0)return;
  renderer.domElement.setPointerCapture(event.pointerId);
  sound.unlock();
  activePointers.add(event.pointerId);
  if (activePointers.size === 1) press = { x: event.clientX, y: event.clientY, id: event.pointerId, dragged: false };
  else if (press) press.dragged = true;
});
renderer.domElement.addEventListener('pointermove', event => {
  if (press && Math.hypot(event.clientX-press.x,event.clientY-press.y)>7) press.dragged=true;
});
renderer.domElement.addEventListener('pointerup', event => {
  activePointers.delete(event.pointerId);
  if (!press || event.pointerId !== press.id) return;
  const tap = !press.dragged; press = undefined;
  if (!tap || cameraRig.inspecting || !el('art-panel').hidden) return;
  const rect=renderer.domElement.getBoundingClientRect();
  pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
  raycaster.setFromCamera(pointer,camera);
  const object=objects?.pick(raycaster);
  if(object){chooseObject(object);return;}
  if (raycaster.ray.intersectPlane(ground,intersection)) goTo({x:intersection.x,z:intersection.z});
});
renderer.domElement.addEventListener('pointercancel', event => { activePointers.delete(event.pointerId);press=undefined; });

function clearInput(): void { keys.clear(); activePointers.clear(); press=undefined; }
window.addEventListener('blur', clearInput);
document.addEventListener('visibilitychange', () => { if (document.hidden) clearInput(); });
document.addEventListener('keydown', event => {
  if (moveCodes.has(event.code) && el('art-panel').hidden && !cameraRig.inspecting) {
    event.preventDefault();
    if (!keys.has(event.code)) { cancelInteraction();keys.add(event.code);path=[];destination.visible=false; }
  }
  if (event.code === 'Escape') {showArt(false);if(cameraRig.inspecting)setInspect(false);}
});
document.addEventListener('keyup', event => { keys.delete(event.code); });

const forward = new THREE.Vector3(), right = new THREE.Vector3();
function keyboardPath(): Point[] {
  let x=0,z=0;
  if(keys.has('ArrowLeft')||keys.has('KeyA')) x--;
  if(keys.has('ArrowRight')||keys.has('KeyD')) x++;
  if(keys.has('ArrowUp')||keys.has('KeyW')) z++;
  if(keys.has('ArrowDown')||keys.has('KeyS')) z--;
  if (!x && !z) return [];
  camera.getWorldDirection(forward);forward.y=0;forward.normalize();right.crossVectors(forward,camera.up).normalize();
  const direction = forward.clone().multiplyScalar(z).addScaledVector(right,x).normalize();
  // Shorten a step at an obstacle; never pass through a prop or through the boundary.
  let length=.9;
  while (length > .04) {
    const target={x:position.x+direction.x*length,z:position.z+direction.z*length};
    if (canTravel(position,target,layout)) return [target];
    length-=.04;
  }
  return [];
}
function beginHop(): void {
  if (keys.size) path = keyboardPath();
  if (!path.length || !hopping) return;
  let remaining=0,last=position;
  for (const p of path) { remaining+=distance(last,p);last=p; }
  const length=Math.min(.9,remaining);
  if(length<.015){path=[];return;}
  hop={phase:0,length,progress:0,duration:.62+.12*length/.9};
  reactionTime=0;curious?.setEffectiveWeight(0);attention=undefined;
  hopping.time=0; hopping.setEffectiveWeight(1);idle?.setEffectiveWeight(0);idleBlend=0;
  hopCount++;
}

function showArt(show: boolean): void {
  el('art-panel').hidden=!show;el('art-toggle').setAttribute('aria-expanded',String(show));
  if(show){clearInput();cancelInteraction();path=[];destination.visible=false;}
}
el('art-toggle').addEventListener('click',()=>showArt(el('art-panel').hidden));
el('art-close').addEventListener('click',()=>showArt(false));
function setInspect(enabled:boolean):void {
  clearInput();cancelInteraction();path=[];destination.visible=false;
  cameraRig.inspect(enabled);
  el('look-around').setAttribute('aria-pressed',String(enabled));
  el('look-around').textContent=enabled?'Back to Bunny':'Look around';
  el('move-hint').textContent=enabled?'Drag to look around':'Tap a picture to play';
  el('camera-hint').textContent=enabled?'Pinch or scroll to zoom':'Or tap the grass to hop';
}
el('look-around').addEventListener('click',()=>setInspect(!cameraRig.inspecting));
el('reset-view').addEventListener('click',()=>{setInspect(false);cameraRig.frame(position);});
el('sound-toggle').addEventListener('click',()=>{
  const muted=sound.toggle();if(!muted)sound.unlock();
  el('sound-toggle').setAttribute('aria-pressed',String(muted));
  el('sound-toggle').setAttribute('aria-label',muted?'Turn sound on':'Mute sound');
});
el('garden-fullscreen').addEventListener('click',()=>{
  const request=document.fullscreenElement?document.exitFullscreen():el('garden-app').requestFullscreen();
  void request.catch(()=>{el('garden-status').textContent='Fullscreen is unavailable in this browser.';});
});

let previous = performance.now(), averageFrameMs = 16.7;
renderer.setAnimationLoop(now=>{
  const elapsed=(now-previous)/1000;previous=now;
  const dt=document.hidden?0:Math.min(.1,elapsed);
  if(ready&&!document.hidden&&elapsed>0)averageFrameMs=averageFrameMs*.97+elapsed*1000*.03;
  if(ready&&mixer&&idle&&hopping){
    if(!hop&&!cameraRig.inspecting)beginHop();
    if(hop){
      hop.phase=Math.min(1,hop.phase+dt/hop.duration);
      const progress=hopProgress(hop.phase);
      const before={...position};
      advance(position,path,(progress-hop.progress)*hop.length);hop.progress=progress;
      const travelled=distance(before,position);totalDistance+=travelled;
      if(travelled>.00001){
        const target=Math.atan2(position.x-before.x,position.z-before.z);
        const difference=Math.atan2(Math.sin(target-heading),Math.cos(target-heading));
        heading+=difference*Math.min(1,dt*13);
      }
      hopping.time=hop.phase*hopping.getClip().duration;
      // The original in-place Hop supplies leg tuck, body lift and ear follow-through.
      shadowMaterial.opacity=1-.36*Math.sin(hop.phase*Math.PI)**2;
      if(hop.phase>=1){hop=undefined;if(!path.length&&!keys.size)destination.visible=false;}
    }else{
      idleBlend=Math.min(1,idleBlend+dt*7);idle.setEffectiveWeight(idleBlend);hopping.setEffectiveWeight(1-idleBlend);
      shadowMaterial.opacity=1;
    }
    if(!hop&&!path.length&&pendingInteraction){
      const pending=pendingInteraction;pendingInteraction=undefined;
      const object=objects?.get(pending.id);
      if(object&&distance(position,pending.goal)<.07){
        objects?.react(object.id);objects?.select(undefined);
        sound.play(object.kind,['cushion-sage','cushion-gold','cushion-rose','cushion-blue'].indexOf(object.id));
        attention=object;reactionTime=1.6;
        el('garden-status').textContent=`Bunny plays with the ${object.name}.`;
      }
    }
    if(reactionTime>0&&curious&&!hop){
      reactionTime=Math.max(0,reactionTime-dt);
      const progress=1-reactionTime/1.6,weight=Math.sin(progress*Math.PI);
      curious.time=progress*curious.getClip().duration;curious.setEffectiveWeight(weight);
      idle.setEffectiveWeight(1-weight);hopping.setEffectiveWeight(0);
      if(attention){const target=Math.atan2(attention.x-position.x,attention.z-position.z);heading+=Math.atan2(Math.sin(target-heading),Math.cos(target-heading))*(1-Math.exp(-10*dt));}
    }
    mixer.update(dt);
    actor.position.set(position.x,.015,position.z);actor.rotation.y=heading;
    contact.position.set(position.x,.026,position.z);
  }
  cameraRig.update(dt,position);
  objects?.update(dt,camera,viewport.clientWidth,viewport.clientHeight,ready&&!cameraRig.inspecting&&el('art-panel').hidden);
  destination.scale.setScalar(1+.06*Math.sin(now*.005));
  renderer.render(scene,camera);
});

// Read-only state for browser checks, including world-to-screen projection for real taps.
Object.defineProperty(window,'__bunnyGarden',{get:()=>({
  ready,position:{...position},path:path.map(p=>({...p})),hopping:!!hop,phase:hop?.phase??0,
  heading,hopCount,totalDistance,triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,
  averageFrameMs,camera:camera.position.toArray(),cameraTarget:cameraRig.focus.toArray(),cameraQuaternion:camera.quaternion.toArray(),
  inspecting:cameraRig.inspecting,pendingInteraction:pendingInteraction?.id??null,objects:objects?.state()??[],muted:sound.muted,
  project(x:number,z:number,height=0){const p=new THREE.Vector3(x,height,z).project(camera);return{x:(p.x+1)*viewport.clientWidth/2,y:(1-p.y)*viewport.clientHeight/2};},
})});
window.addEventListener('pagehide',event=>{
  if(event.persisted)return;
  renderer.setAnimationLoop(null);resizeObserver.disconnect();cameraRig.dispose();objects?.dispose();sound.dispose();mixer?.stopAllAction();
  scene.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();for(const m of Array.isArray(object.material)?object.material:[object.material])m.dispose();}});
  environment.dispose();shadowTexture.dispose();renderer.dispose();
});
