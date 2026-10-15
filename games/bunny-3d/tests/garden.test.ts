import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import layout from '../assets/garden-layout.json';
import { advance, canTravel, distance, findPath, hopProgress, type Point } from '../src/garden-navigation';

function checkRoute(start: Point, path: Point[]): void {
  assert.ok(path.length, 'a reachable destination has a route');
  let previous = start;
  for (const p of path) { assert.ok(canTravel(previous, p, layout), 'every segment clears props and boundaries'); previous = p; }
}

test('tap movement detours around the cushions and wicker basket', () => {
  const start = { ...layout.start }, goal = { x: 4.8, z: -.4 };
  assert.equal(canTravel(start, goal, layout), false);
  const route = findPath(start, goal, layout);checkRoute(start, route);
  assert.ok(distance(route.at(-1)!, goal) < .001);
  assert.ok(route.length > 1);
});

test('clicking a prop or beyond the garden lands at a clear reachable spot', () => {
  for (const target of [...layout.obstacles, {x:100,z:100},{x:-100,z:-100}]) {
    const route=findPath(layout.start,target,layout);checkRoute(layout.start,route);
    assert.ok(canTravel(route.at(-1)!,route.at(-1)!,layout));
  }
  assert.deepEqual(findPath(layout.start,{x:NaN,z:0},layout),[]);
  assert.deepEqual(findPath(layout.start,layout.start,layout),[]);
});

test('all parts of the clearing remain reachable after changing direction', () => {
  let position: Point = {...layout.start};
  for (const target of [{x:5,z:4},{x:-5,z:-4},{x:5,z:-4},{x:-5,z:4},{x:0,z:0}]) {
    const route=findPath(position,target,layout);checkRoute(position,route);
    const copied=route.map(p=>({...p}));
    while(copied.length){const before={...position};advance(position,copied,.07);assert.ok(canTravel(before,position,layout));}
    assert.ok(distance(position,target)<.001);
  }
});

test('airborne travel preserves corners and cannot overshoot a destination', () => {
  const pos={x:0,z:0},route=[{x:1,z:0},{x:1,z:1}];
  assert.equal(advance(pos,route,1.5),0);assert.deepEqual(pos,{x:1,z:.5});
  assert.equal(advance(pos,route,1),.5);assert.deepEqual(pos,{x:1,z:1});assert.equal(route.length,0);
  assert.equal(hopProgress(0),0);assert.equal(hopProgress(.1),0);
  assert.equal(hopProgress(.9),1);assert.equal(hopProgress(1),1);
  let previous=0,travel=0;
  for(let frame=0;frame<=60;frame++){const p=hopProgress(frame/60);assert.ok(p>=previous&&p<=1);travel+=p-previous;previous=p;}
  assert.equal(travel,1);
});

test('garden GLB contains actual 3D scenery and embedded painted surfaces', () => {
  const bytes=readFileSync(new URL('../assets/picnic-garden.glb',import.meta.url));
  assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(8),bytes.length);
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  const names=gltf.nodes.map((n:{name:string})=>n.name);
  for(const name of ['Lawn','Tree trunks','Tree crowns','Cottage walls','Fence','Cushion sage','Wicker weave','Basket handle'])assert.ok(names.includes(name),name);
  assert.ok(gltf.images.length&&gltf.images.every((i:{bufferView:number;uri?:string})=>Number.isInteger(i.bufferView)&&!i.uri));
  const crown=gltf.meshes.find((m:{name:string})=>m.name==='Tree crowns');
  const bounds=gltf.accessors[crown.primitives[0].attributes.POSITION];
  assert.ok(bounds.max[1]-bounds.min[1]>2,'tree crowns have real height');
  assert.ok(bounds.max[2]-bounds.min[2]>5,'trees extend across depth');
  assert.ok(canTravel(layout.start,layout.start,layout),'spawn is clear');
});
