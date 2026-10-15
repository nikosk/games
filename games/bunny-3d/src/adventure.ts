import * as T from 'three';
import { AdventureWorld, navigation, placeNames, type Target } from './adventure-world';
import { freshSave, readSave, interact, nextHint, colorCount, allColors, unlocked, restored, places, type Save, type Place, type Held } from './adventure-state';
import { findPath, advance, distance, hopProgress, canTravel, type Point } from './garden-navigation';
import { icon, placeIcons, heldIcons } from './adventure-icons';
import { adventureSound } from './adventure-sound';
import './adventure.css';

const el=<E extends HTMLElement=HTMLElement>(id:string):E=>document.getElementById(id) as E;
const saveKey='bunny-ii-adventure-v1';
let savedRaw:string|null=null;try{savedRaw=localStorage.getItem(saveKey);}catch{}
let state:Save=readSave(savedRaw),held:Held=null;
const world=new AdventureWorld(el('viewport')),sound=adventureSound();
const position:Point={x:.9,z:2.4};
let ready=false,started=false,transitioning=false,modal='start',disposed=false;
let restartFrom='start',restartButton:HTMLElement|undefined;
let path:Point[]=[],pending:Target|undefined,hop:{phase:number;length:number;progress:number;duration:number}|undefined;
let mixer:T.AnimationMixer,idle:T.AnimationAction,hopping:T.AnimationAction,curious:T.AnimationAction,wave:T.AnimationAction,talk:T.AnimationAction;
let heading=0,reaction=0,lookAt:Point|undefined,hopCount=0,travelled=0;
let messageTimer=0,hintTimer=0,hinted='',hintCount=0,celebration=-1,lockTimer=0,idleHint=0;
let idleBlend=1,frameMs=16.7;
const clueButtons=new Map<string,HTMLButtonElement>();
const keys=new Set<string>(),moveCodes=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD']);
let press:{id:number;x:number;y:number;dragged:boolean}|undefined;
const pointers=new Set<number>();
const raycaster=new T.Raycaster(),pointer=new T.Vector2(),ground=new T.Plane(new T.Vector3(0,1,0),0),intersection=new T.Vector3();

el('title-art').innerHTML=icon('frog')+icon('stone')+icon('chick');
el('map-button').innerHTML=icon('map');el('hint').innerHTML=icon('stone');
el('sound').innerHTML=icon(sound.muted?'mute':'sound');el('fullscreen').innerHTML=icon('full');el('pause').innerHTML=icon('pause');
const colors=['#d58b94','#dfa571','#e4ca7b','#98b78c','#8fbac9','#b09cc7'];
el('colors').innerHTML=colors.map((_,i)=>`<span class="color-dot" data-color="${i}"></span>`).join('');
let progress=0;
void world.load(()=>{el<HTMLProgressElement>('load-progress').value=++progress;}).then(async()=>{
  world.setState(state,true);mixer=new T.AnimationMixer(world.bunny!);
  const action=(name:string)=>mixer.clipAction(world.clips.find(c=>c.name===name)!);
  idle=action('Idle').play();hopping=action('Hop').play();hopping.paused=true;hopping.setEffectiveWeight(0);
  curious=action('Curious').play();curious.paused=true;curious.setEffectiveWeight(0);
  wave=action('Wave').play();wave.paused=true;wave.setEffectiveWeight(0);
  talk=action('Talk').play();talk.setEffectiveWeight(0);
  setActor();mixer.update(0);await world.renderer.compileAsync(world.scene,world.camera);
  ready=true;el<HTMLButtonElement>('start').disabled=false;el('start').textContent=state.stone?'Continue our adventure':'Let’s find the colors';el('load-progress').hidden=true;
  el('start-restart').hidden=!state.stone;
  refreshUI();
}).catch(error=>{
  console.error(error);el('load-error').hidden=false;el('load-error').textContent='The meadow couldn’t load. Please try again.';el('retry').hidden=false;el('load-progress').hidden=true;el('start').hidden=true;
});
el('retry').onclick=()=>location.reload();

function persist():void {try{localStorage.setItem(saveKey,JSON.stringify(state));}catch{message('This browser can’t save progress. You can still play.');}}
function message(text:string,seconds=4):void{el('message').textContent=text;el('message').classList.add('visible');messageTimer=seconds;}
function clearHint():void {hintTimer=0;hinted='';el('hint-picture').hidden=true;el('ghost-hand').hidden=true;}
function cancel():void {pending=undefined;path=[];lookAt=undefined;world.marker.visible=false;reaction=0;curious?.setEffectiveWeight(0);keys.clear();}
function start():void{
  if(!ready)return;sound.unlock();sound.active(true);started=true;modal='';el('start-screen').hidden=true;el('hud').hidden=false;el('bottom').hidden=false;
  message(state.stone?'Pip is ready for another little kindness.':'Everything is grey… except that little stone.',6);refreshUI();
}
el('start').onclick=start;
function showModal(name:string):void {
  cancel();clearHint();modal=name;sound.active(started&&(name===''||name==='ending'));
  for(const id of ['start-screen','map-screen','pause-screen','ending','restart-confirm'])el(id).hidden=id!==(name==='start'?'start-screen':name);
  if(name==='map-screen')buildMap();
}
function cancelRestart():void {showModal(restartFrom);restartButton?.focus();}
function openMap():void{if(!started||transitioning||celebration>=0)return;if(!state.stone){showHint('rainbow-stone');return;}showModal('map-screen');}
el('map-button').onclick=openMap;el('map-close').onclick=()=>showModal('');
el('pause').onclick=()=>showModal('pause-screen');el('resume').onclick=()=>showModal('');
for(const id of ['restart','start-restart','ending-restart'])el(id).onclick=()=>{
  if(!ready||transitioning)return;restartFrom=modal;restartButton=el(id);showModal('restart-confirm');el('restart-no').focus();
};
el('restart-no').onclick=cancelRestart;
el('restart-yes').onclick=()=>{
  if(modal!=='restart-confirm'||transitioning)return;
  state=freshSave();held=null;celebration=-1;hintCount=0;persist();
  if(!started)start();showModal('');void travel('bedroom',true);
};
el('keep-playing').onclick=()=>{showModal('');message('The meadow is yours. Your friends would love to play.',5);};
el('sound').onclick=()=>{sound.unlock();const muted=sound.toggle();el('sound').innerHTML=icon(muted?'mute':'sound');el('sound').setAttribute('aria-label',muted?'Turn sound on':'Mute sound');el('sound').setAttribute('aria-pressed',String(muted));};
el('fullscreen').onclick=()=>{void(document.fullscreenElement?document.exitFullscreen():el('app').requestFullscreen()).catch(()=>message('Fullscreen isn’t available here.'));};

const mapPoints:Record<Place,[number,number]>={bedroom:[13,72],pond:[30,45],haystack:[49,15],log:[76,43],meadow:[84,84],hill:[84,12]};
function buildMap():void {
  el('map').querySelectorAll('button').forEach(b=>b.remove());
  for(const p of places){const b=document.createElement('button');b.className='map-place';b.dataset.place=p;b.innerHTML=icon(placeIcons[p])+`<span>${p==='bedroom'?'Home':p==='haystack'?'Haystack':p==='log'?'Hollow log':p==='meadow'?'Flowers':p==='hill'?'Rainbow Hill':'Pond'}</span>`;
    b.setAttribute('aria-label',`Visit ${placeNames[p]}`);b.disabled=!unlocked(state,p);b.classList.toggle('current',p===state.place);b.classList.toggle('done',restored(state,p));
    b.style.left=`${mapPoints[p][0]}%`;b.style.top=`${mapPoints[p][1]}%`;b.onclick=()=>void travel(p);el('map').append(b);}
  el('map-caption').textContent=state.pond?'A little kindness brings the colors back.':'The stone is glowing toward Hoppy’s pond.';
}
async function travel(place:Place,force=false):Promise<void>{
  if(transitioning||(!force&&!unlocked(state,place)))return;
  transitioning=true;cancel();held=null;clearHint();showModal('');el('fade').classList.add('active');
  await new Promise(r=>setTimeout(r,300));if(disposed)return;
  state={...state,place};hop=undefined;position.x=.9;position.z=place==='bedroom'?2.4:2.8;heading=0;idleBlend=1;reaction=0;lockTimer=0;
  hopping.setEffectiveWeight(0);idle.setEffectiveWeight(1);wave.setEffectiveWeight(0);talk.setEffectiveWeight(0);
  world.setState(state,true);setActor();persist();refreshUI();
  await new Promise(r=>setTimeout(r,120));if(disposed)return;
  el('fade').classList.remove('active');transitioning=false;idleHint=0;
  const intros:Record<Place,string>={bedroom:state.stone?'A cozy place to come home to.':'A little stone is still shining.',pond:state.pond?'Hoppy has his splash back!':'Hoppy’s pool is dry. Where has the water stopped?',haystack:state.hay?'Fluffy loves her cozy nest.':'Fluffy’s little legs can’t reach her nest.',log:state.log?'Rusty would love to play ball.':'Rusty’s ball is stuck under the log.',meadow:state.flowers?'The flowers are dancing again.':'These flowers need a drink.',hill:state.complete?'Every color has come home.':allColors(state)?'The stone is full of color. The hill is waiting.':'There’s room for every color in this stone flower.'};
  message(intros[place],5);
}
function refreshUI():void{
  el('place-name').textContent=placeNames[state.place];
  el('hint').classList.toggle('pulse',!restored(state,state.place));
  el('map-button').hidden=!state.stone;
  const found=[state.flowers,state.log,state.hay,state.pond,state.pond,state.flowers];
  el('colors').setAttribute('aria-label',`${colorCount(state)} of 6 colors restored`);
  el('colors').querySelectorAll<HTMLElement>('.color-dot').forEach((d,i)=>{d.classList.toggle('found',found[i]!);d.style.background=found[i]?colors[i]!:'#b9baaf';});
  const inv=el('inventory');inv.replaceChildren();
  if(held&&held!=='can'){
    const b=document.createElement('button');b.className='inventory-item selected';b.innerHTML=icon(heldIcons[held]);b.setAttribute('aria-label',`Holding ${held.replaceAll('-',' ')}. Tap to put it down.`);b.dataset.item=held;b.onclick=()=>{held=null;clearHint();refreshUI();};inv.append(b);
  }
  if(state.can){const b=document.createElement('button');b.className=`inventory-item${held==='can'?' selected':''}`;b.dataset.item='can';b.innerHTML=icon('can')+(state.water?`<span class="water-indicator">${icon('water')}</span>`:'');b.setAttribute('aria-label',state.water?'Select full watering can':'Select empty watering can');b.onclick=()=>{held=held==='can'?null:'can';sound.unlock();sound.play('pickup');refreshUI();if(held==='can'&&!state.water)showHint('water');};inv.append(b);}
  updateClues();
}
function updateClues():void {
  const ts=world.targets(),ids=new Set(ts.map(t=>t.id));
  const positioned:{id:string;x:number;y:number}[]=[];
  const next=ts.find(t=>t.id===nextHint(state));
  const nearness=next&&!restored(state,state.place)?Math.max(0,1-distance(position,{x:next.point.x,z:next.point.z})/6):0;
  el('hint').style.setProperty('--near',nearness.toFixed(2));
  for(const [id,b] of clueButtons)if(!ids.has(id)){b.remove();clueButtons.delete(id);}
  for(const target of ts){
    let b=clueButtons.get(target.id);if(!b){b=document.createElement('button');b.className='clue';b.dataset.target=target.id;b.onclick=()=>choose(target.id);el('object-clues').append(b);clueButtons.set(target.id,b);}
    // Browsers expand SVG self-closing tags when serializing innerHTML. Comparing
    // that HTML with the source replaced pressed icons every frame, losing clicks.
    if(b.dataset.icon!==target.icon){b.innerHTML=icon(target.icon);b.dataset.icon=target.icon;}
    b.setAttribute('aria-label',target.label);
    const p=world.project(target.point);
    // Empty placement spots only need clues while holding a block.
    const placement=target.id.startsWith('step-');
    const showPlacement=!placement||held==='small-block'||held==='tall-block';
    if(showPlacement){
      for(let attempt=0;attempt<4;attempt++){
        const clash=positioned.find(other=>Math.abs(other.x-p.x)<51&&Math.abs(other.y-p.y)<53);
        if(!clash)break;p.y=clash.y-55;
      }
      positioned.push({id:target.id,x:p.x,y:p.y});
    }
    b.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;
    b.hidden=!started||!!modal||transitioning||celebration>=0||!showPlacement||!p.visible||p.x<23||p.x>world.viewport.clientWidth-23||p.y<85||p.y>world.viewport.clientHeight-78;
    b.classList.toggle('selected',pending?.id===target.id||held===target.id);b.classList.toggle('hinted',hinted===target.id&&hintTimer>0);
  }
  if(hintCount>1&&hintTimer>0&&hinted&&!modal){const p=positioned.find(p=>p.id===hinted);if(p){el('ghost-hand').hidden=false;el('ghost-hand').style.left=`${p.x+8}px`;el('ghost-hand').style.top=`${p.y-20}px`;}}
}
function showHint(id=nextHint(state)):void {
  if(!ready)return;sound.unlock();sound.play('look');hintCount++;hinted=id;hintTimer=7;
  let pictures:string[]=[];let text='';
  if(held==='small-block'||held==='tall-block'){id=held==='small-block'?'step-low':'step-high';hinted=id;pictures=[heldIcons[held],'step'];text='Make a little staircase, from short to tall.';}
  else if(held==='stone'||held==='lever'){
    if(held==='lever'&&!state.rock){hinted='stone';pictures=['rock','branch'];text='First, put the rounded stone beside the log.';}
    else{hinted='fulcrum';pictures=[heldIcons[held],held==='stone'?'rock':'branch'];text=held==='stone'?'A rounded stone can hold up the branch.':'Rest the branch on the stone.';}
  }
  else switch(id){
    case 'rainbow-stone':pictures=['stone'];text='Something is still glowing beside Pip’s bed.';break;
    case 'pond-branch':case 'leaves':pictures=['branch','leaf','pond'];text='Use the sturdy branch to clear the leaves.';break;
    case 'small-block':case 'tall-block':pictures=['small','tall','chick'];text='Little steps can take Fluffy all the way up.';break;
    case 'stone':pictures=['rock','branch','ball'];text='A stone under the branch will help lift the log.';break;
    case 'lever':pictures=['branch','rock'];text='Rest the strong branch on the rounded stone.';break;
    case 'fox':pictures=['fox','branch','ball'];text='Rusty can press down on the other end.';break;
    case 'can':pictures=['pond','can'];text='There’s a watering can beside Hoppy’s pond.';break;
    case 'water':pictures=['can','pond','water'];text='Fill the watering can at Hoppy’s pond.';break;
    case 'spout':pictures=['turn','flower'];text='Point the wooden spout toward the flowers.';break;
    case 'basin':pictures=['can','water','flower'];text='Pour the water into the round basin.';break;
    case 'colors':pictures=[...(!state.hay?['chick']:[]),...(!state.log?['fox']:[]),...(!state.flowers?['flower']:[])];text='A few friends are still waiting for Pip.';break;
    case 'pedestal':pictures=['stone','flower'];text='The rainbow stone fits in the stone flower.';break;
    case 'bell':pictures=['bell','frog','chick','fox'];text='Ring the bell to call everyone together.';break;
    default:pictures=['map'];text='Follow the paths to another little adventure.';
  }
  el('hint-picture').innerHTML=pictures.map(icon).join('<span>›</span>');el('hint-picture').hidden=false;message(text,7);
  if(hintCount>1&&!world.targets().some(t=>t.id===hinted)&&['water','can','colors','travel'].includes(id))openMap();
}
el('hint').onclick=()=>showHint();
function choose(id:string):void {
  if(!ready||!started||modal||transitioning||celebration>=0)return;
  sound.unlock();idleHint=0;clearHint();hintCount=0;
  if((held==='small-block'||held==='tall-block')&&id!==held&&(id==='small-block'||id==='tall-block')){
    const slot=state[id==='small-block'?'small':'tall'];if(slot!=='source')id=`step-${slot}`;
  }
  const target=world.targets().find(t=>t.id===id);if(!target)return;
  const layout=navigation(state),route=findPath(position,target.approach,layout);
  if(!route.length&&distance(position,target.approach)>.08){message('Let’s come a little closer.');return;}
  cancel();path=route;pending=target;markDestination();
}
function markDestination():void{const end=path.at(-1);world.marker.visible=!!end;if(end)world.marker.position.set(end.x,state.place==='bedroom'?.18:.025,end.z);}
function perform(target:Target):void {
  if(target.id==='travel'){openMap();return;}
  const before={...state},result=interact(state,target.id,held);state=result.state;held=result.held;
  world.setState(state);world.play(result.effect);persist();refreshUI();sound.play(result.effect);
  reaction=1.4;lookAt={x:target.point.x,z:target.point.z};
  if(result.hint){showHint(result.hint);return;}
  const captions:Record<string,string>={stone:'“A kind heart can bring the colors home.”',pond:'Blue water! Green Hoppy! The pond is alive again.',hay:'Up, up, up… Fluffy found her nest!',log:'A little teamwork. A very happy fox.',flowers:'A drink of water, and a meadow full of flowers.',fill:'A full can, ready for the thirsty flowers.',spout:state.spout?'The spout points toward the flowers.':'The spout points toward the empty ground.',place:'Every color is here. Call your friends!',rock:'The stone makes a sturdy little support.',lever:'Now Rusty can press the other end.',step:'Fluffy looks at the next step.',pickup:held==='can'?'A watering can! It needs a drink, too.':held==='small-block'||held==='tall-block'?'Tap a place for this block.':held==='stone'?'Tap the place beside the log.':held==='lever'?'Rest the branch on the stone.':'That branch will help with the leaves.'};
  if(captions[result.effect])message(captions[result.effect]!,5);
  if(result.effect==='stone')lockTimer=1;
  if(!before.pond&&state.pond||!before.hay&&state.hay||!before.log&&state.log||!before.flowers&&state.flowers)lockTimer=result.effect==='hay'?5.5:3.8;
  if(result.effect==='finale'){
    celebration=0;cancel();held=null;path=findPath(position,{x:0,z:2.6},navigation(state));message('All our colors. All our friends.',7);wave.time=0;wave.setEffectiveWeight(0);refreshUI();
  }
}

function goTo(p:Point):void {if(!started||modal||transitioning||celebration>=0)return;cancel();clearHint();idleHint=0;path=findPath(position,p,navigation(state));markDestination();}
const canvas=world.renderer.domElement;
canvas.addEventListener('pointerdown',e=>{
  if(e.button!==0||modal)return;sound.unlock();canvas.setPointerCapture(e.pointerId);pointers.add(e.pointerId);
  if(pointers.size===1)press={id:e.pointerId,x:e.clientX,y:e.clientY,dragged:false};else if(press)press.dragged=true;
});
canvas.addEventListener('pointermove',e=>{if(press&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>8)press.dragged=true;});
canvas.addEventListener('pointerup',e=>{
  pointers.delete(e.pointerId);if(!press||e.pointerId!==press.id)return;const tap=!press.dragged;press=undefined;if(!tap||modal)return;
  const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,world.camera);
  const target=world.pick(raycaster);if(target){choose(target.id);return;}
  ground.constant=state.place==='bedroom'?-.16:0;if(raycaster.ray.intersectPlane(ground,intersection))goTo({x:intersection.x,z:intersection.z});
});
canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);press=undefined;});
function clearInput():void{keys.clear();press=undefined;pointers.clear();}
window.addEventListener('blur',clearInput);
document.addEventListener('visibilitychange',()=>{clearInput();sound.active(!document.hidden&&started&&(!modal||modal==='ending'));});
document.addEventListener('keydown',e=>{
  if(modal==='restart-confirm'){
    if(e.code==='Escape'){e.preventDefault();cancelRestart();}
    if(e.code==='Tab'){e.preventDefault();el(document.activeElement===el('restart-no')?'restart-yes':'restart-no').focus();}
    return;
  }
  if(e.code==='Escape'&&started){if(modal)showModal('');else showModal('pause-screen');}
  if(moveCodes.has(e.code)&&started&&!modal&&celebration<0&&lockTimer<=0){e.preventDefault();if(!keys.has(e.code)){cancel();keys.add(e.code);clearHint();}}
});
document.addEventListener('keyup',e=>keys.delete(e.code));
function keyboardPath():Point[]{
  let x=0,z=0;if(keys.has('ArrowLeft')||keys.has('KeyA'))x--;if(keys.has('ArrowRight')||keys.has('KeyD'))x++;if(keys.has('ArrowUp')||keys.has('KeyW'))z--;if(keys.has('ArrowDown')||keys.has('KeyS'))z++;
  if(!x&&!z)return[];const n=Math.hypot(x,z),layout=navigation(state);for(let length=.85;length>.04;length-=.04){const p={x:position.x+x/n*length,z:position.z+z/n*length};if(canTravel(position,p,layout))return[p];}return[];
}
function beginHop():void{
  if(keys.size)path=keyboardPath();if(!path.length)return;
  let remaining=0,last=position;for(const p of path){remaining+=distance(last,p);last=p;}
  const length=Math.min(.9,remaining);if(length<.015){path=[];return;}
  hop={phase:0,length,progress:0,duration:.48+.10*length/.9};hopping.time=0;hopping.setEffectiveWeight(1);idle.setEffectiveWeight(0);curious.setEffectiveWeight(0);reaction=0;idleBlend=0;hopCount++;
}
function setActor():void{world.actor.position.set(position.x,state.place==='bedroom'?.18:.015,position.z);world.actor.rotation.y=heading;world.contact.position.set(position.x,state.place==='bedroom'?.175:.02,position.z);}
const resizeObserver=new ResizeObserver(()=>world.resize());resizeObserver.observe(el('viewport'));
let previous=performance.now();
world.renderer.setAnimationLoop(now=>{
  const elapsed=(now-previous)/1000;previous=now;const dt=document.hidden?0:Math.min(.075,elapsed);
  if(ready&&elapsed>0)frameMs=frameMs*.97+elapsed*1000*.03;
  const active=ready&&started&&!modal&&!transitioning;
  if(active){
    lockTimer=Math.max(0,lockTimer-dt);idleHint+=dt;
    if(!state.stone&&idleHint>7&&hintTimer<=0){showHint('rainbow-stone');idleHint=0;}
    if(celebration<0||path.length>0||hop){
      if(!hop&&lockTimer<=0)beginHop();
      if(hop){
        hop.phase=Math.min(1,hop.phase+dt/hop.duration);const p=hopProgress(hop.phase),before={...position};advance(position,path,(p-hop.progress)*hop.length);hop.progress=p;
        const d=distance(before,position);travelled+=d;if(d>.00001){const angle=Math.atan2(position.x-before.x,position.z-before.z);heading+=Math.atan2(Math.sin(angle-heading),Math.cos(angle-heading))*(1-Math.exp(-dt*16));}
        hopping.time=hop.phase*hopping.getClip().duration;world.contact.material.opacity=1-.35*Math.sin(hop.phase*Math.PI)**2;
        if(hop.phase>=1){hop=undefined;if(!path.length)world.marker.visible=false;}
      }else{idleBlend=Math.min(1,idleBlend+dt*8);idle.setEffectiveWeight(idleBlend);hopping.setEffectiveWeight(1-idleBlend);world.contact.material.opacity=1;}
      if(!hop&&!path.length&&pending&&lockTimer<=0){const t=pending;pending=undefined;if(distance(position,t.approach)<.09)perform(t);}
      if(reaction>0&&!hop){reaction=Math.max(0,reaction-dt);const p=1-reaction/1.4,weight=Math.sin(p*Math.PI)*.7;curious.time=p*curious.getClip().duration;curious.setEffectiveWeight(weight);idle.setEffectiveWeight(1-weight);hopping.setEffectiveWeight(0);
        if(lookAt){const angle=Math.atan2(lookAt.x-position.x,lookAt.z-position.z);heading+=Math.atan2(Math.sin(angle-heading),Math.cos(angle-heading))*(1-Math.exp(-dt*9));}}
    }else{
      celebration+=dt;heading+=Math.atan2(Math.sin(-heading),Math.cos(-heading))*(1-Math.exp(-dt*7));hopping.setEffectiveWeight(0);curious.setEffectiveWeight(0);wave.time=Math.min(1,celebration/4.2)*wave.getClip().duration;wave.setEffectiveWeight(celebration<4.2?1:0);idle.setEffectiveWeight(celebration<4.2?0:1);
      if(celebration>4.2){wave.setEffectiveWeight(0);idle.setEffectiveWeight(1);talk.setEffectiveWeight(celebration>6&&celebration<9?1:0);}
      if(celebration>10){celebration=-1;talk.setEffectiveWeight(0);showModal('ending');}
    }
    mixer.update(dt);setActor();world.follow(position,dt);
  }else if(ready&&(modal==='start'||modal==='ending'))mixer.update(dt);
  world.update(active||modal==='start'||modal==='ending'?dt:0);sound.update();
  if(messageTimer>0){messageTimer-=dt;if(messageTimer<=0)el('message').classList.remove('visible');}
  if(hintTimer>0&&active){hintTimer-=dt;if(hintTimer<=0)clearHint();}
  updateClues();world.render();
});
Object.defineProperty(window,'__bunnyAdventure',{get:()=>({
  ready,started,state:{...state},held,position:{...position},path:path.map(p=>({...p})),pending:pending?.id??null,hopping:!!hop,hopCount,travelled,modal,transitioning,lockTimer,celebration,
  colorCount:colorCount(state),muted:sound.muted,camera:world.camera.position.toArray(),cameraQuaternion:world.camera.quaternion.toArray(),
  targets:world.targets().map(t=>({id:t.id,approach:{...t.approach},screen:world.project(t.point)})),
  friends:['hill-frog','hill-chick','hill-fox'].map(id=>{const o=world.node(id);return {id,position:o?.position.toArray(),rotation:o?.rotation.toArray(),scale:o?.scale.toArray()};}),
  triangles:world.renderer.info.render.triangles,drawCalls:world.renderer.info.render.calls,averageFrameMs:frameMs,
  project(x:number,z:number,y=0){return world.project(new T.Vector3(x,y,z));},
})});
window.addEventListener('pagehide',e=>{if(e.persisted)return;disposed=true;world.renderer.setAnimationLoop(null);resizeObserver.disconnect();mixer?.stopAllAction();sound.dispose();world.dispose();});
