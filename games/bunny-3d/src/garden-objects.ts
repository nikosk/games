import * as THREE from 'three';
import layout from '../assets/garden-layout.json';
import { canTravel, distance, findPath, type Point, type GardenLayout } from './garden-navigation';

export interface GardenObject { id:string;kind:string;name:string;node:string;x:number;z:number;radius:number;height:number }
export const gardenObjects: GardenObject[]=layout.interactions;

/** Pick a reachable place beside the object, rather than walking into its centre. */
export function approachObject(position:Point,object:GardenObject,world:GardenLayout):Point[]|undefined {
  const reach=object.radius+world.radius+.14;
  if(distance(position,object)<=reach+.12)return [];
  let best:Point[]|undefined,score=Infinity;
  const facing=Math.atan2(position.z-object.z,position.x-object.x);
  for(let i=0;i<16;i++){
    const a=facing+i*Math.PI/8;
    const goal={x:object.x+Math.cos(a)*reach,z:object.z+Math.sin(a)*reach};
    if(!canTravel(goal,goal,world))continue;
    const route=findPath(position,goal,world);
    if(!route.length||distance(route.at(-1)!,goal)>.04)continue;
    let length=0,last=position;
    for(const p of route){length+=distance(last,p);last=p;}
    if(length<score){score=length;best=route;}
  }
  return best;
}

const symbols={
  basket:'<path d="M18 11c-5-6-12-1-11 6s5 11 9 9c4 2 9-3 10-9s-4-11-8-6" fill="#d87b65"/><path d="M17 11c-1-5 1-7 3-8" fill="none" stroke="#866345" stroke-width="2"/><path d="M18 7c4-7 9-4 9-4-1 5-6 6-9 4" fill="#8ca56b"/>',
  cloth:'<path d="M6 7h19l3 20H3Z" fill="#fff1d7" stroke="#bb8d79" stroke-width="1.5"/><path d="M9 7 7 27m12-20 2 20M5 14h21M4 22h23" stroke="#d98d7b" stroke-width="4"/>',
  cushion:'<path d="M13 23V9l13-3v14M13 13l13-3" fill="none" stroke="#8b815a" stroke-width="3" stroke-linejoin="round"/><ellipse cx="9" cy="24" rx="5" ry="3.5" fill="#d7aa55"/><ellipse cx="22" cy="21" rx="5" ry="3.5" fill="#d7aa55"/>',
};
interface Item {
  definition:GardenObject;group:THREE.Object3D;button:HTMLButtonElement;ring:THREE.Mesh;
  open:boolean;progress:number;pulse:number;count:number;lid:THREE.Object3D|undefined;
}

export function createGardenObjects(scene:THREE.Scene,root:THREE.Object3D,select:(id:string)=>void) {
  const layer=document.getElementById('object-clues')!;
  const items=new Map<string,Item>(),pickable:THREE.Object3D[]=[];
  for(const definition of gardenObjects){
    const group=root.getObjectByName(definition.node.replaceAll(' ','_'));
    if(!group)throw new Error(`Missing interactive object: ${definition.node}`);
    group.traverse(o=>{if(o instanceof THREE.Mesh){o.userData.interaction=definition.id;pickable.push(o);}});
    const button=document.createElement('button');button.className='object-clue';button.dataset.object=definition.id;
    button.innerHTML=`<svg viewBox="0 0 32 32" aria-hidden="true">${symbols[definition.kind as keyof typeof symbols]}</svg><span aria-hidden="true">✦</span>`;
    button.setAttribute('aria-label',definition.kind==='cushion'?`Play the ${definition.name}`:`Open the ${definition.name}`);
    button.onclick=()=>select(definition.id);layer.append(button);
    const ring=new THREE.Mesh(new THREE.RingGeometry(definition.radius+.04,definition.radius+.075,48),new THREE.MeshBasicMaterial({color:'#fff1b0',transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false}));
    ring.rotation.x=-Math.PI/2;ring.position.set(definition.x,.036,definition.z);ring.visible=false;scene.add(ring);
    items.set(definition.id,{definition,group,button,ring,open:false,progress:0,pulse:10,count:0,lid:group.getObjectByName('Basket_lid_hinge')});
  }
  // One small reusable burst gives feedback without adding more scenery.
  const stars=Array.from({length:7},(_,i)=>{
    const m=new THREE.Mesh(new THREE.OctahedronGeometry(.065),new THREE.MeshBasicMaterial({color:i%2?'#ffe4a0':'#fff8df',transparent:true,depthWrite:false}));m.visible=false;scene.add(m);return m;
  });
  let selected:string|undefined,burst=10,origin=new THREE.Vector3();
  function label(item:Item):void {
    const name=item.definition.name;
    item.button.setAttribute('aria-label',item.definition.kind==='basket'?`${item.open?'Close':'Open'} the ${name}`:item.definition.kind==='cloth'?`${item.open?'Fold':'Spread'} the ${name}`:`Play the ${name}`);
  }
  for(const item of items.values())label(item);
  return {
    get(id:string){return items.get(id)?.definition;},
    pick(ray:THREE.Raycaster):string|undefined{return ray.intersectObjects(pickable,false)[0]?.object.userData.interaction as string|undefined;},
    select(id:string|undefined):void {selected=id;},
    react(id:string):void {
      const item=items.get(id);if(!item)return;
      item.open=!item.open;item.pulse=0;item.count++;label(item);
      burst=0;origin.set(item.definition.x,item.definition.kind==='basket'?.8:.35,item.definition.z);
      item.button.classList.remove('celebrate');void item.button.offsetWidth;item.button.classList.add('celebrate');
    },
    update(dt:number,camera:THREE.Camera,width:number,height:number,visible:boolean):void {
      for(const [id,item] of items){
        item.progress=THREE.MathUtils.damp(item.progress,item.open?1:0,6,dt);item.pulse+=dt;
        if(item.lid)item.lid.rotation.x=-1.3*item.progress;
        if(item.definition.kind==='cloth'){
          item.group.scale.set(1+.32*item.progress,1-.85*item.progress,1+.32*item.progress);
          item.group.position.y=Math.sin(item.progress*Math.PI)*.13;
        }
        if(item.definition.kind==='cushion'){
          const t=Math.min(item.pulse/1.05,1),bounce=Math.sin(Math.PI*t*2)*Math.exp(-t*3)*(1-t);
          item.group.scale.set(1+.10*bounce,1-.42*bounce,1+.10*bounce);
          item.group.position.y=Math.max(0,-bounce)*.7;
        }
        const p=new THREE.Vector3(item.definition.x,item.definition.height,item.definition.z).project(camera);
        const x=(p.x+1)*width/2,y=(1-p.y)*height/2;
        item.button.hidden=!visible||p.z>1||p.z< -1||x<26||x>width-26||y<100||y>height-100;
        item.button.style.transform=`translate(${x}px,${y}px) translate(-50%,-100%)`;
        item.button.classList.toggle('selected',id===selected);
        item.ring.visible=visible&&id===selected;
      }
      burst+=dt;
      stars.forEach((star,i)=>{
        star.visible=burst<1.05;if(!star.visible)return;
        const a=i*Math.PI*2/7,r=.15+burst*.45;
        star.position.set(origin.x+Math.cos(a)*r,origin.y+burst*1.2-.25*burst*burst,origin.z+Math.sin(a)*r);
        star.rotation.set(burst*2,i+burst,0);star.material.opacity=1-burst/1.05;
      });
    },
    state(){return Array.from(items,([id,i])=>({id,open:i.open,progress:i.progress,count:i.count}));},
    dispose(){for(const i of items.values())i.button.remove();},
  };
}
