import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshSave, readSave, interact, unlocked, colorCount, allColors, nextHint, type Held, type Save } from '../src/adventure-state';
import { navigation } from '../src/adventure-world';
import { canTravel, findPath, distance } from '../src/garden-navigation';

function player(){let state=freshSave(),held:Held=null;return {get state(){return state;},get held(){return held;},tap(id:string){const r=interact(state,id,held);state=r.state;held=r.held;return r;},place(place:Save['place']){state={...state,place};}};}
function pond(p:ReturnType<typeof player>){p.tap('rainbow-stone');p.place('pond');p.tap('pond-branch');p.tap('leaves');}
function hay(p:ReturnType<typeof player>){p.place('haystack');p.tap('tall-block');p.tap('step-high');p.tap('small-block');p.tap('step-low');}
function log(p:ReturnType<typeof player>){p.place('log');p.tap('stone');p.tap('fulcrum');p.tap('lever');p.tap('fulcrum');p.tap('fox');}
function flowers(p:ReturnType<typeof player>){p.place('pond');p.tap('can');p.tap('water');p.place('meadow');p.tap('spout');p.tap('basin');}

test('complete adventure, every color, hill gate and replayable ending',()=>{
 const p=player();assert.equal(unlocked(p.state,'pond'),false);assert.equal(p.tap('bell').hint,'colors');
 pond(p);assert.equal(colorCount(p.state),2);assert.equal(unlocked(p.state,'hill'),true);
 p.place('hill');assert.equal(p.tap('pedestal').hint,'colors');assert.equal(p.state.placed,false);
 hay(p);log(p);flowers(p);assert.equal(allColors(p.state),true);assert.equal(colorCount(p.state),6);
 p.place('hill');assert.equal(p.tap('bell').hint,'pedestal');p.tap('pedestal');assert.equal(p.tap('bell').effect,'finale');assert.equal(p.state.complete,true);
 assert.equal(p.tap('bell').effect,'finale');assert.deepEqual(readSave(JSON.stringify(p.state)),p.state);
});
test('wrong step order is visible, reversible and never loses a block',()=>{
 const p=player();pond(p);p.place('haystack');p.tap('tall-block');p.tap('step-low');p.tap('small-block');p.tap('step-high');assert.equal(p.state.hay,false);
 p.tap('tall-block');p.tap('step-high');assert.equal(p.state.small,'low');assert.equal(p.state.tall,'high');assert.equal(p.state.hay,true);
});
test('wrong tools and incomplete mechanisms give useful hints without consuming them',()=>{
 const p=player();p.tap('rainbow-stone');p.place('pond');assert.equal(p.tap('leaves').hint,'pond-branch');assert.equal(p.state.pond,false);pond(p);
 p.place('log');p.tap('lever');assert.equal(p.tap('fulcrum').hint,'stone');assert.equal(p.held,'lever');assert.equal(p.tap('fox').hint,'stone');assert.equal(p.state.log,false);
 p.place('meadow');assert.equal(p.tap('basin').hint,'can');p.tap('can');assert.equal(p.tap('basin').hint,'water');p.tap('water');assert.equal(p.tap('basin').effect,'spill');assert.equal(p.state.water,true);p.tap('spout');p.tap('basin');assert.equal(p.state.flowers,true);assert.equal(p.state.water,false);
});
test('middle locations can be solved in any order and reload preserves partial puzzles',()=>{
 for(const order of [[hay,log,flowers],[hay,flowers,log],[flowers,hay,log],[flowers,log,hay],[log,flowers,hay],[log,hay,flowers]]){const p=player();pond(p);for(const solve of order){solve(p);assert.deepEqual(readSave(JSON.stringify(p.state)),p.state);}assert.equal(allColors(p.state),true);}
 const p=player();pond(p);p.place('log');p.tap('stone');p.tap('fulcrum');assert.deepEqual(readSave(JSON.stringify(p.state)),p.state);assert.equal(nextHint(p.state),'lever');
});
test('save corruption cannot strand the player or duplicate block slots',()=>{
 for(const raw of ['invalid','null','[]','{"version":2}','{"version":1,"pond":"yes"}'])assert.deepEqual(readSave(raw),freshSave());
 const s=readSave('{"version":1,"place":"hill","complete":true,"small":"high","tall":"high"}');assert.equal(allColors(s),true);assert.equal(s.stone,true);assert.equal(s.small,'low');assert.equal(s.tall,'high');
 assert.equal(readSave('{"version":1,"place":"meadow"}').place,'bedroom');
});
test('all authored approach positions have safe routes through each puzzle state',()=>{
 const p=player();pond(p);
 const cases:[Save['place'],{x:number;z:number}[]][]=[
  ['bedroom',[{x:.2,z:-.5},{x:3.5,z:-2.3}]],
  ['pond',[{x:-3.1,z:.1},{x:-.8,z:.2},{x:-.65,z:2.15},{x:1.5,z:1.65},{x:4.3,z:1.9}]],
  ['haystack',[{x:-3.1,z:2.45},{x:-1.4,z:2.65},{x:-.6,z:1.0},{x:2.7,z:1.2},{x:-1.2,z:.6}]],
  ['log',[{x:-3.6,z:1.7},{x:3.5,z:2.4},{x:-.9,z:1.4},{x:-3.8,z:1.6},{x:1.4,z:2.1}]],
  ['meadow',[{x:-4.1,z:.4},{x:-3.9,z:.8},{x:3.3,z:.8}]],
  ['hill',[{x:0,z:.65},{x:3.8,z:1.4},{x:0,z:2.6},{x:-3.7,z:1.1},{x:-1.7,z:2.3},{x:3.3,z:2.6},{x:4,z:3.2}]],
 ];
 for(const solved of [false,true]){
  if(solved){hay(p);log(p);flowers(p);p.place('hill');p.tap('pedestal');p.tap('bell');}
  for(const [place,goals] of cases){p.place(place);const layout=navigation(p.state);let start={x:.9,z:place==='bedroom'?2.4:2.8};
   for(const goal of goals){assert.ok(canTravel(goal,goal,layout),`${place}: obstructed approach ${JSON.stringify(goal)}`);const route=findPath(start,goal,layout);assert.ok(route.length&&distance(route.at(-1)!,goal)<.01,`${place}: unreachable approach`);let previous=start;for(const point of route){assert.ok(canTravel(previous,point,layout));previous=point;}start=goal;}
  }
 }
});
test('Blender world contains every scene, mechanism, friend and embedded texture',()=>{
 const data=readFileSync(new URL('../assets/bunny-ii-world.glb',import.meta.url));assert.equal(data.toString('ascii',0,4),'glTF');const length=data.readUInt32LE(12);const gltf=JSON.parse(data.toString('utf8',20,20+length));
 const names=new Set(gltf.nodes.map((n:{name?:string})=>n.name));
 for(const name of ['landscape','bedroom','pond','haystack','log','meadow','hill','rainbow-stone','pond-branch','leaves','pond-water','stream-water','small-block','tall-block','step-low','step-high','stone','lever','fulcrum','fallen-log','ball','spout','basin','flower-0','flower-4','pedestal','bell','hill-stone','frog','chick','fox','fox-tail','hill-frog','hill-chick','hill-fox'])assert.ok(names.has(name),`Missing ${name}`);
 assert.ok(gltf.images.every((i:{bufferView?:number;uri?:string})=>typeof i.bufferView==='number'&&!i.uri));assert.ok(gltf.meshes.length<100,'Keep the authored world inexpensive to draw');
 for(const accessor of gltf.accessors)if(accessor.min)assert.ok([...accessor.min,...accessor.max].every(Number.isFinite));
});
