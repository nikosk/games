import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { colorCount, restored, places, type Save, type Place, type Held } from './adventure-state';
import { type GardenLayout, type Point } from './garden-navigation';

export interface Target { id:string; label:string; icon:string; point:T.Vector3; approach:Point; node:string }
export const placeNames:Record<Place,string>={bedroom:'Pip’s bedroom',pond:'Hoppy’s pond',haystack:'Fluffy’s haystack',log:'Rusty’s hollow log',meadow:'The flower meadow',hill:'Rainbow Hill'};
const v=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);
const blockPos={small:{source:v(-3.1,0,1.35),low:v(.3,0,-.1),high:v(1.5,0,-.1)},tall:{source:v(-1.4,0,1.55),low:v(.3,0,-.1),high:v(1.5,0,-.1)}};
export function navigation(s:Save):GardenLayout {
  const obstacles:GardenLayout['obstacles']=[];
  const add=(x:number,z:number,radius:number)=>obstacles.push({x,z,radius});
  switch(s.place){
    case 'bedroom':add(-2.4,-1.8,1.5);add(.25,-1.8,.6);break;
    case 'pond':add(2.1,-.8,1.85);add(-3.6,-1.15,.44);add(-1.6,-1.15,.44);add(3.6,.8,.5);break;
    case 'haystack':add(3,-1.5,1.35);if(!s.hay)add(-.8,-.6,.42);for(const key of ['small','tall'] as const){const p=blockPos[key][s[key]];add(p.x,p.z,.55);}break;
    case 'log':add(-1.15,-1.1,.77);add(.2,-1.1,.77);add(1.5,-1.1,.77);if(s.rock)add(-.9,.4,.4);else add(-3.6,.7,.48);add(s.log?-2.7:-2.8,s.log?.2:-.8,.52);break;
    case 'meadow':add(-2.9,-.75,.85);add(-1.5,-.75,.5);add(1.1,-1.1,.85);add(2.6,-1.1,.85);add(3.5,-1.1,.65);break;
    case 'hill':add(0,-1.2,1.25);add(3,.2,.48);if(s.complete){add(-2.7,-.1,.6);add(-1.6,1.2,.4);add(2.2,1.3,.6);}break;
  }
  return {bounds:s.place==='bedroom'?{minX:-4.7,maxX:4.7,minZ:-3.5,maxZ:2.9}:{minX:-5.5,maxX:5.5,minZ:-3.25,maxZ:4.5},radius:.33,obstacles};
}

export class AdventureWorld {
  readonly renderer:T.WebGLRenderer;
  readonly scene=new T.Scene();
  readonly camera=new T.PerspectiveCamera(38,1,.1,100);
  readonly actor=new T.Group();
  readonly contact:T.Mesh<T.PlaneGeometry,T.MeshBasicMaterial>;
  readonly marker:T.Mesh;
  root:T.Group|undefined;
  bunny:T.Group|undefined;
  clips:T.AnimationClip[]=[];
  private nodes=new Map<string,T.Object3D>();
  private uniforms=new Map<string,{value:number}>();
  private originals=new Map<string,T.Vector3>();
  private danceContacts=new Map<string,T.Mesh<T.PlaneGeometry,T.MeshBasicMaterial>>();
  private targetsCache:Target[]=[];
  private save:Save|undefined;
  private currentPlace:Place='bedroom';
  private clock=0;
  private effect={kind:'',time:100};
  private fx:T.InstancedMesh;
  private rainbow:T.Group;
  private waterRibbon:T.Mesh;
  private butterfly:T.Group;
  private shadowTexture:T.CanvasTexture;
  private propContacts:T.InstancedMesh;
  private environment:T.WebGLRenderTarget;
  private focus=v(0,.55,-.2);
  private sun:T.DirectionalLight;
  private shadowDirty=true;
  private blinkTime=0;

  constructor(readonly viewport:HTMLElement){
    this.renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.96;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    viewport.append(this.renderer.domElement);
    this.scene.background=new T.Color('#dce6df');this.scene.fog=new T.Fog('#dce6df',28,65);
    this.scene.add(new T.HemisphereLight('#fff6e9','#a4ac91',1.5));
    this.sun=new T.DirectionalLight('#fff0d8',2.0);this.sun.position.set(-7,13,8);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:.1,far:40});
    this.sun.shadow.camera.updateProjectionMatrix();this.sun.shadow.normalBias=.045;this.sun.shadow.bias=-.0001;this.sun.shadow.intensity=.35;
    this.sun.shadow.autoUpdate=false;this.scene.add(this.sun,this.sun.target);
    const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(this.renderer);
    this.environment=pmrem.fromScene(room,.08);this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.23;room.dispose();pmrem.dispose();
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
    const ctx=canvas.getContext('2d')!,gradient=ctx.createRadialGradient(64,64,8,64,64,62);
    gradient.addColorStop(0,'rgba(56,58,43,.32)');gradient.addColorStop(.4,'rgba(56,58,43,.17)');gradient.addColorStop(1,'rgba(56,58,43,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
    this.shadowTexture=new T.CanvasTexture(canvas);
    const shadowMat=new T.MeshBasicMaterial({map:this.shadowTexture,transparent:true,depthWrite:false});
    this.contact=new T.Mesh(new T.PlaneGeometry(1.4,1.15),shadowMat);this.contact.rotation.x=-Math.PI/2;this.contact.position.y=.18;this.scene.add(this.contact,this.actor);
    this.propContacts=new T.InstancedMesh(new T.PlaneGeometry(1,1),shadowMat.clone(),20);this.propContacts.frustumCulled=false;this.scene.add(this.propContacts);
    this.marker=new T.Mesh(new T.RingGeometry(.18,.23,36),new T.MeshBasicMaterial({color:'#fff3bb',transparent:true,opacity:.9,side:T.DoubleSide,depthWrite:false}));
    this.marker.rotation.x=-Math.PI/2;this.marker.visible=false;this.scene.add(this.marker);
    this.fx=new T.InstancedMesh(new T.OctahedronGeometry(.075),new T.MeshBasicMaterial({color:'#fff1bb',transparent:true}),36);this.fx.visible=false;this.fx.frustumCulled=false;this.scene.add(this.fx);
    this.rainbow=new T.Group();this.rainbow.position.set(0,-.25,-3.5);
    for(const [i,color] of ['#d98691','#e3aa73','#e7cf83','#9cb788','#8db6c7','#ad98c7'].entries()){
      const curve=new T.EllipseCurve(0,0,4.3-i*.22,4.3-i*.22,0,Math.PI,false,0);
      const points=curve.getPoints(64).map(p=>v(p.x,p.y,0));
      const geo=new T.TubeGeometry(new T.CatmullRomCurve3(points),64,.14,8,false);
      const m=new T.Mesh(geo,new T.MeshBasicMaterial({color,transparent:true,opacity:.8}));this.rainbow.add(m);
    }
    this.rainbow.visible=false;this.scene.add(this.rainbow);
    this.waterRibbon=new T.Mesh(new T.CylinderGeometry(.075,.10,1,10),new T.MeshStandardMaterial({color:'#9cd3df',transparent:true,opacity:.8,roughness:.3}));
    this.waterRibbon.visible=false;this.scene.add(this.waterRibbon);
    this.butterfly=new T.Group();
    for(const x of [-1,1]){const wing=new T.Mesh(new T.SphereGeometry(1,12,8),new T.MeshStandardMaterial({color:x<0?'#dfabb8':'#c9acd5',roughness:1}));wing.scale.set(.16,.025,.23);wing.position.x=x*.13;this.butterfly.add(wing);}
    this.butterfly.visible=false;this.scene.add(this.butterfly);
    this.resize();
  }
  private n(id:string):T.Object3D {const obj=this.nodes.get(id);if(!obj)throw new Error(`Missing Blender group: ${id}`);return obj;}
  node(id:string):T.Object3D|undefined{return this.nodes.get(id);}
  private paint(root:T.Object3D,key:string):void {
    const uniform=this.uniforms.get(key)??{value:0};this.uniforms.set(key,uniform);
    const mats=new Map<T.Material,T.Material>();
    root.traverse(o=>{
      if(!(o instanceof T.Mesh))return;
      const convert=(source:T.Material)=>{
        if(mats.has(source))return mats.get(source)!;
        const mat=source.clone();mats.set(source,mat);
        mat.onBeforeCompile=shader=>{shader.uniforms.uRestored=uniform;shader.fragmentShader='uniform float uRestored;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','outgoingLight = mix(vec3(dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722))), outgoingLight, uRestored);\n#include <opaque_fragment>');};
        mat.customProgramCacheKey=()=> 'bunny-ii-color';
        if(mat instanceof T.MeshStandardMaterial&&mat.map)mat.map.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());
        if(mat instanceof T.MeshStandardMaterial&&key==='magic'&&root.name.includes('stone')){mat.emissive.set('#ffe8ae');mat.emissiveIntensity=.22;}
        return mat;
      };
      o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);
      o.castShadow=false;o.receiveShadow=true;
    });
  }
  async load(progress:()=>void):Promise<void>{
    const loader=new GLTFLoader();
    const [world,bunny]=await Promise.all([
      loader.loadAsync(new URL('../assets/bunny-ii-world.glb',import.meta.url).href).then(x=>{progress();return x;}),
      loader.loadAsync(new URL('../assets/garden-bunny.glb',import.meta.url).href).then(x=>{progress();return x;}),
    ]);
    this.root=world.scene;this.root.traverse(o=>this.nodes.set(o.name,o));this.scene.add(this.root);
    // Blender keeps hyphens in node names; restore authored ids if an exporter sanitizes them.
    for(const o of [...this.nodes.values()])this.nodes.set(o.name.replaceAll('_','-'),o);
    for(const p of [...places,'landscape'])this.paint(this.n(p),p);
    // The rainbow stone alone retains color in the opening.
    for(const id of ['rainbow-stone','hill-stone','trough-flow','outlet-flow','spout-water'])this.paint(this.n(id),'magic');this.uniforms.get('magic')!.value=1;
    this.n('landscape').traverse(o=>{if(o instanceof T.Mesh){o.castShadow=!o.name.includes('grass');}});
    for(const id of this.nodes.keys())this.originals.set(id,this.n(id).position.clone());
    this.bunny=bunny.scene;this.bunny.scale.setScalar(.68);this.actor.add(this.bunny);this.clips=bunny.animations;this.paint(this.bunny,'bunny');
    this.bunny.traverse(o=>{if(o instanceof T.Mesh){o.receiveShadow=false;}});
    // Grounding for each friendly toy, independent of the cached scenery shadows.
    for(const id of ['frog','chick','fox','hill-frog','hill-chick','hill-fox']){
      const contact=new T.Mesh(new T.PlaneGeometry(1.7,1.3),this.contact.material.clone());contact.rotation.x=-Math.PI/2;contact.position.y=.025;
      if(id.startsWith('hill-')){this.n(id).parent!.add(contact);this.danceContacts.set(id,contact);}
      else this.n(id).add(contact);
    }
  }
  resize():void {
    const w=this.viewport.clientWidth,h=this.viewport.clientHeight;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);this.setCamera();
  }
  private setCamera():void {
    const scale=Math.max(1,.98/this.camera.aspect);
    const distance=this.currentPlace==='bedroom'?13.6:14.5;
    this.camera.position.copy(this.focus).add(v(.65,9.8,distance).multiplyScalar(scale));this.camera.lookAt(this.focus);this.camera.updateMatrixWorld();
  }
  setState(s:Save,instant=false):void {
    const changed=this.currentPlace!==s.place;this.save={...s};this.currentPlace=s.place;
    if(!this.root)return;
    for(const p of places)this.n(p).visible=p===s.place;
    this.n('landscape').visible=s.place!=='bedroom';
    if(changed||instant){
      this.effect={kind:'',time:100};this.focus.set(0,.55,-.2);this.setCamera();this.shadowDirty=true;
      for(const [key,u] of this.uniforms){if(key==='magic')continue;u.value=key==='landscape'?colorCount(s)/6:key==='bunny'?Math.min(1,colorCount(s)/2):restored(s,key as Place)?1:0;}
    }
    this.n('rainbow-stone').visible=!s.stone;this.n('hill-stone').visible=s.placed;
    this.n('can').visible=!s.can;this.n('step-low').visible=!s.hay;this.n('step-high').visible=!s.hay;
    const obstacles=navigation(s).obstacles,dummy=new T.Object3D();this.propContacts.count=obstacles.length;
    obstacles.forEach((o,i)=>{dummy.position.set(o.x,s.place==='bedroom'?.17:.018,o.z);dummy.rotation.x=-Math.PI/2;dummy.scale.set(o.radius*2.6,o.radius*2.6,1);dummy.updateMatrix();this.propContacts.setMatrixAt(i,dummy.matrix);});this.propContacts.instanceMatrix.needsUpdate=true;
    for(const id of ['hill-frog','hill-chick','hill-fox'])this.n(id).visible=s.complete;
    if(instant){for(const key of ['small','tall'] as const)this.n(`${key}-block`).position.copy(blockPos[key][s[key]]);}
    this.refreshTargets();this.update(0,instant||changed);
  }
  private refreshTargets():void {
    const s=this.save;if(!s||!this.root)return;
    const targets:Target[]=[];
    const add=(id:string,label:string,icon:string,node:string,offset:T.Vector3,approach:Point)=>{
      const point=this.n(node).getWorldPosition(new T.Vector3()).add(offset);targets.push({id,label,icon,point,approach,node});
    };
    this.root.updateMatrixWorld(true);
    switch(s.place){
      case 'bedroom':if(!s.stone)add('rainbow-stone','Pick up the rainbow stone','stone','rainbow-stone',v(0,.45,0),{x:.2,z:-.5});break;
      case 'pond':
        if(!s.pond){add('pond-branch','Take the sturdy branch','branch','pond-branch',v(0,.6,0),{x:-3.1,z:.1});add('leaves','Clear the leaves','leaf','leaves',v(0,.5,0),{x:-.8,z:.2});}
        if(!s.can)add('can','Pick up the watering can','can','can',v(0,1,0),{x:-.65,z:2.15});
        if(s.pond&&s.can)add('water','Fill the watering can','water','pond-water',v(-.5,.5,1.1),{x:1.5,z:1.65});
        add('frog','Say hello to Hoppy','frog','frog',v(0,1.7,0),{x:4.3,z:1.9});break;
      case 'haystack':
        if(!s.hay){for(const key of ['small','tall'] as const){const p=blockPos[key][s[key]];add(`${key}-block`,key==='small'?'Take the short block':'Take the tall block',key,`${key}-block`,v(0,key==='small'?.75:1.2,0),{x:p.x,z:p.z+1.1});}
          add('step-low','Place a block on the lower step','step','step-low',v(0,.13,0),{x:-.6,z:1.0});add('step-high','Place a block beside the hay bale','step','step-high',v(0,.13,0),{x:2.7,z:1.2});}
        add('chick','Help Fluffy reach her nest','chick','chick',v(0,1.7,0),{x:-1.2,z:.6});break;
      case 'log':
        if(!s.rock)add('stone','Take the rounded stone','rock','stone',v(0,.6,0),{x:-3.6,z:1.7});
        if(!s.lever)add('lever','Take the strong branch','branch','lever',v(0,.55,0),{x:3.5,z:2.4});
        if(!s.lever)add('fulcrum',s.rock?'Rest the branch on the stone':'Place the stone beside the log',s.rock?'branch':'rock','fulcrum',v(0,s.rock?.65:.18,0),{x:-.9,z:1.4});
        add('fox',s.log?'Play with Rusty':'Ask Rusty to press the lever','fox','fox',v(0,2.2,0),{x:-3.8,z:1.6});
        add('ball',s.log?'Roll the ball':'Free Rusty’s ball','ball','ball',v(0,.45,0),{x:1.4,z:2.1});break;
      case 'meadow':
        add('basin',s.flowers?'Water the happy flowers':'Pour water into the basin','water','basin',v(0,1.2,0),{x:-4.1,z:.4});
        add('spout','Turn the wooden spout','turn','spout',v(.5,.55,0),{x:-3.9,z:.8});
        add('flowers','Look at the flowers','flower','flower-2',v(0,1.8,0),{x:3.3,z:.8});break;
      case 'hill':
        if(!s.placed)add('pedestal','Place the rainbow stone','stone','pedestal',v(0,1,0),{x:0,z:.65});
        add('bell',s.placed?'Ring the celebration bell':'Ring the bell','bell','bell',v(0,2.1,0),{x:3.8,z:1.4});
        if(s.complete){add('hill-frog','Play with Hoppy','frog','hill-frog',v(0,1.7,0),{x:-3.7,z:1.1});add('hill-chick','Play with Fluffy','chick','hill-chick',v(0,1.7,0),{x:-1.7,z:2.3});add('hill-fox','Play with Rusty','fox','hill-fox',v(0,2.2,0),{x:3.3,z:2.6});}break;
    }
    if(s.stone)targets.push({id:'travel',label:'Explore the meadow',icon:'map',point:s.place==='bedroom'?v(3.5,2.5,-3.5):v(4.8,1.8,2.6),approach:s.place==='bedroom'?{x:3.5,z:-2.3}:{x:4,z:3.2},node:s.place==='bedroom'?'door':'sign'});
    this.targetsCache=targets;
  }
  targets():Target[]{return this.targetsCache;}
  pick(ray:T.Raycaster):Target|undefined {
    const meshes:T.Object3D[]=[];const owner=new Map<T.Object3D,Target>();
    for(const t of this.targetsCache){
      // The flower bed shares one action; every blossom should respond to a tap.
      const nodes=t.id==='flowers'?[0,1,2,3,4].map(i=>`flower-${i}`):[t.node];
      for(const id of nodes)this.n(id).traverseVisible(o=>{if(o instanceof T.Mesh){meshes.push(o);owner.set(o,t);}});
    }
    const hit=ray.intersectObjects(meshes,false)[0];return hit?owner.get(hit.object):undefined;
  }
  project(p:T.Vector3):{x:number;y:number;visible:boolean}{const q=p.clone().project(this.camera);return{x:(q.x+1)*this.viewport.clientWidth/2,y:(1-q.y)*this.viewport.clientHeight/2,visible:q.z>-1&&q.z<1};}
  play(kind:string):void{this.effect={kind,time:0};if(['pond','hay','log','flowers','stone','place','finale'].includes(kind))this.shadowDirty=true;}
  update(dt:number,instant=false):void {
    if(!this.root||!this.save)return;
    const s=this.save;this.clock+=dt;this.effect.time+=dt;const t=this.effect.time,k=this.effect.kind;
    const sky=new T.Color('#dce6df'),grey=new T.Color('#e1e1dd');grey.lerp(sky,colorCount(s)/6);
    (this.scene.background as T.Color).copy(grey);(this.scene.fog as T.Fog).color.copy(grey);
    const speed=instant?1:1-Math.exp(-dt*4),mix=(a:number,b:number)=>T.MathUtils.lerp(a,b,speed);
    const move=(id:string,p:T.Vector3)=>this.n(id).position.lerp(p,speed);
    for(const [key,u] of this.uniforms){
      if(key==='magic')continue;
      const revealDelay=k==='hay'?3.4:k==='log'?1.3:0;
      const target=key==='landscape'?colorCount(s)/6:key==='bunny'?Math.min(1,colorCount(s)/2):(key===s.place&&t<revealDelay)?0:restored(s,key as Place)?1:0;
      u.value=T.MathUtils.damp(u.value,target,.7,dt);
    }
    this.n('rainbow-stone').rotation.y=this.clock*.5;this.n('hill-stone').rotation.y=this.clock*.35;
    const water=this.n('pond-water');water.scale.setScalar(mix(water.scale.x,s.pond?1:.025));
    const stream=this.n('stream-water');stream.scale.x=mix(stream.scale.x,s.pond?1:s.branch?.65:.30);
    const sweeping=k==='pond'&&t<1.3;
    const sweep=T.MathUtils.smoothstep(t,.15,1.3);
    move('pond-branch',sweeping?v(-1.8-sweep*1.8,.23,-1.1+sweep*.9):s.branch?v(-3.9,.18,.3):v(-2.4,.25,-1.15));
    move('leaves',s.pond?v(-1.45-2.05*(sweeping?sweep:1),.15,-1.15+1.05*(sweeping?sweep:1)):v(-1.45,.15,-1.15));
    for(const key of ['small','tall'] as const){const obj=this.n(`${key}-block`),goal=blockPos[key][s[key]];obj.position.lerp(goal,speed);}
    move('stone',s.rock?v(-.9,0,.4):v(-3.6,0,.7));
    const lever=this.n('lever');move('lever',s.lever?v(-.9,.39,.4):v(3.4,.13,1.5));lever.rotation.y=mix(lever.rotation.y,s.lever?Math.PI*.24:0);
    const lifted=s.log&&!(k==='log'&&t<1.1);
    const log=this.n('fallen-log');log.position.y=mix(log.position.y,lifted?.24:0);log.rotation.x=mix(log.rotation.x,lifted?-.08:0);lever.rotation.z=mix(lever.rotation.z,lifted?.23:0);
    const ballGoal=lifted?v(.5,.3,1.4):v(.4,.27,-.65);
    if(k==='ball'&&t<3)ballGoal.x=.5+Math.sin(t*Math.PI/1.5)*1.5;
    move('ball',ballGoal);this.n('ball').rotation.x=s.log?this.clock*.15:0;
    this.n('spout').rotation.y=mix(this.n('spout').rotation.y,s.spout?0:Math.PI*.36);
    this.n('spout-water').visible=s.flowers||(k==='spill'&&t<2);
    const flowing=(k==='flowers'||k==='spill')&&t>.25&&t<3;
    this.n('trough-flow').visible=flowing;this.n('outlet-flow').visible=flowing&&t>.8;
    this.n('trough-flow').scale.x=Math.min(1,Math.max(.01,(t-.25)*2));
    for(let i=0;i<5;i++){
      const flower=this.n(`flower-${i}`);flower.rotation.z=mix(flower.rotation.z,s.flowers?Math.sin(this.clock*1.5+i)*.035:.7+(i%2)*.2);
      flower.scale.y=mix(flower.scale.y,s.flowers?1:.72);
    }
    // Fluffy follows a deliberately staged series of hops onto the two steps.
    const chick=this.n('chick');let cp=s.hay?v(2.9,1.52,-.8):v(-.8,0,-.6);
    if(k==='hay'&&t<4.2){
      const stops=[v(-.8,0,-.6),v(.3,.46,-.1),v(1.5,.92,-.1),v(2.9,1.52,-.8)];
      const f=Math.min(2.999,t/1.25),i=Math.floor(f),p=f-i;cp=stops[i]!.clone().lerp(stops[i+1]!,p);cp.y+=Math.sin(p*Math.PI)*.55;
    }else if((k==='chick'||k==='step')&&!s.hay&&t<3.4){
      const firstStep=s.small==='low';
      if(firstStep){const f=Math.min(1,t/1.1);cp=v(-.8,0,-.6).lerp(v(.3,.46,-.1),f);cp.y+=Math.sin(f*Math.PI)*.4;if(t>2.2){const back=Math.min(1,(t-2.2)/1.2);cp.lerp(v(-.8,0,-.6),back);cp.y+=Math.sin(back*Math.PI)*.25;}}
      else{const f=Math.min(1,t/1.4);cp.x+=Math.sin(f*Math.PI)*.35;cp.y+=Math.sin(f*Math.PI)*.30;}
    }else if(k==='chick'&&t<1.5){cp.y+=Math.sin(Math.min(1,t/1.5)*Math.PI)*.4;}
    chick.position.copy(cp);
    const fox=this.n('fox');let fp=s.log?v(-2.7,0,.2):v(-2.8,0,-.8);
    if(k==='log'&&t<2.5){const f=Math.sin(t/2.5*Math.PI);fp=fp.clone().lerp(v(-1.9,0,1.4),f);fox.rotation.z=Math.sin(t*4)*.04;}
    fox.position.copy(fp);
    for(const id of ['frog','hill-frog']){
      const o=this.n(id),base=this.originals.get(id)!;o.position.copy(base);o.scale.y=1+Math.sin(this.clock*2)*.015;
      if((k==='frog'||k==='pond')&&t<3)o.position.y+=Math.max(0,Math.sin(t*5))*.3;
      const eyes=this.n(`${id}-eyes`);const blink=Math.sin(this.clock*.83+1)> .995;eyes.visible=blink;
    }
    for(const id of ['chick','hill-chick'])for(const side of ['left','right'])this.n(`${id}-${side}`).rotation.z=(side==='left'?1:-1)*Math.sin(this.clock*3)*((k==='hay'||k==='chick'||s.complete)?.22:.055);
    for(const id of ['fox','hill-fox'])this.n(`${id}-tail`).rotation.z=Math.sin(this.clock*3)*(s.log?.17:.06);
    // Each friend has a little dance, continuing through the ending and free play.
    // Blend out of their arrival hops; keep shadows on the grass during jumps.
    const arrival=k==='finale'?Math.min(1,t/3.4):1;
    const dance=s.complete?(k==='finale'?T.MathUtils.smoothstep(t,3.4,4.3):1):0;
    const beat=this.clock*Math.PI*2/1.2;
    for(const [i,id] of ['hill-frog','hill-chick','hill-fox'].entries()){
      const friend=this.n(id),base=this.originals.get(id)!;
      friend.position.copy(base);friend.rotation.set(0,0,0);friend.scale.setScalar(1);
      friend.position.x=T.MathUtils.lerp(base.x<0?-6:6,base.x,T.MathUtils.smoothstep(arrival,0,1));
      if(arrival<1)friend.position.y=Math.abs(Math.sin(arrival*Math.PI*3))*.3;
      const phase=beat+i*.8,sway=Math.sin(phase*.5),bounce=Math.max(0,Math.sin(phase));
      if(i===0){
        // Hoppy crouches, springs up, and rocks between his big feet.
        friend.position.y+=bounce*.38*dance;friend.rotation.z=sway*.13*dance;
        const squash=(Math.min(0,Math.sin(phase))*.1+bounce*.035)*dance;
        friend.scale.set(1-squash*.5,1+squash,1-squash*.5);
        friend.rotation.y=Math.sin(phase*.5)*.18*dance;
        if(k==='frog'&&t<2)friend.position.y+=Math.sin(Math.min(1,t/2)*Math.PI)*.2;
      }else if(i===1){
        // Fluffy bobs and flaps, turning to either side on alternate beats.
        friend.position.y+=bounce*.20*dance;friend.rotation.z=-sway*.18*dance;friend.rotation.y=sway*.25*dance;
        for(const side of ['left','right'])this.n(`${id}-${side}`).rotation.z=(side==='left'?1:-1)*(.18+Math.sin(phase)*.35)*dance;
        if(k==='chick'&&t<1.5)friend.position.y+=Math.sin(t/1.5*Math.PI)*.25;
      }else{
        // Rusty twists and sways, with a happy wag behind him.
        friend.position.y+=bounce*.13*dance;friend.rotation.z=sway*.16*dance;friend.rotation.y=-sway*.3*dance;
        this.n(`${id}-tail`).rotation.z=Math.sin(phase+.6)*.35*dance;
      }
      const contact=this.danceContacts.get(id)!;contact.visible=s.complete;
      contact.position.set(friend.position.x,.025,friend.position.z);
      contact.scale.setScalar(1-friend.position.y*.3);contact.material.opacity=1-friend.position.y*.65;
    }
    this.blinkTime+=dt;
    this.n('bell').rotation.z=k==='finale'&&t<2?Math.sin(t*15)*.12:0;
    this.rainbow.visible=s.complete&&s.place==='hill';
    const rainbowScale=k==='finale'?Math.min(1,t/5):1;this.rainbow.scale.setScalar(Math.max(.01,rainbowScale));
    this.butterfly.visible=s.flowers&&s.place==='meadow';this.butterfly.position.set(2+Math.sin(this.clock*.7)*1.4,2.2+Math.sin(this.clock*1.5)*.35,-.7+Math.cos(this.clock)*.7);
    this.butterfly.children.forEach((wing,i)=>{wing.rotation.z=(i?1:-1)*Math.sin(this.clock*15)*.7;});
    const pouring=(k==='flowers'||k==='spill')&&t<2.5;
    this.waterRibbon.visible=pouring;
    if(pouring){const a=v(-2.6,1.7,-.75),b=v(-2.9,.9,-.75);this.waterRibbon.position.copy(a).add(b).multiplyScalar(.5);this.waterRibbon.scale.y=a.distanceTo(b);this.waterRibbon.quaternion.setFromUnitVectors(v(0,1,0),b.clone().sub(a).normalize());}
    this.fx.visible=['pond','hay','log','flowers','stone','place','finale'].includes(k)&&t<4;
    if(this.fx.visible){
      const center=k==='pond'?v(2,.3,-.8):k==='hay'?v(2.5,1,-.8):k==='log'?v(0,.5,0):k==='flowers'?v(2,.7,-1):v(0,1,-1);
      const dummy=new T.Object3D();for(let i=0;i<36;i++){const a=i*2.4,r=.4+(i%7)*.23+t*.3;dummy.position.copy(center).add(v(Math.cos(a)*r,t*.65+(i%5)*.12,Math.sin(a)*r*.6));dummy.rotation.set(t+i,t*2,i);dummy.scale.setScalar(Math.max(0,1-t/4));dummy.updateMatrix();this.fx.setMatrixAt(i,dummy.matrix);}this.fx.instanceMatrix.needsUpdate=true;
    }
    if(this.shadowDirty){this.sun.shadow.needsUpdate=true;this.shadowDirty=false;}
    this.refreshTargets();
  }
  follow(position:Point,dt:number):void {
    // Keep the puzzle itself in frame; only nudge at the outer edges of a clearing.
    const desired=v(T.MathUtils.clamp(position.x*.14,-.55,.55),.55,T.MathUtils.clamp((position.z-1)*.10,-.2,.25));
    if(this.focus.distanceToSquared(desired)<.000004)this.focus.copy(desired);
    else this.focus.lerp(desired,1-Math.exp(-dt*3));
    this.setCamera();
  }
  render():void{this.renderer.render(this.scene,this.camera);}
  dispose():void{
    const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>(),textures=new Set<T.Texture>();
    this.scene.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const value of Object.values(m))if(value instanceof T.Texture)textures.add(value);}}});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());this.environment.dispose();this.shadowTexture.dispose();this.renderer.dispose();
  }
}
