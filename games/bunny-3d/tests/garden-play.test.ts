import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import layout from '../assets/garden-layout.json';
import { approachObject, gardenObjects } from '../src/garden-objects';
import { canTravel, distance } from '../src/garden-navigation';
import { followBunny } from '../src/garden-camera';

function cameraSetup(){
  const camera=new THREE.PerspectiveCamera(38,1.6,.1,100),focus=new THREE.Vector3(0,.55,-1.2);
  camera.position.copy(focus).add(new THREE.Vector3(5.8,10.25,18));camera.lookAt(focus);camera.updateMatrixWorld();
  return {camera,focus};
}
test('play camera stays still in the middle and follows the edges without rotating or zooming',()=>{
  const {camera,focus}=cameraSetup(),position=camera.position.clone(),angle=camera.quaternion.clone(),offset=camera.position.clone().sub(focus);
  followBunny(camera,focus,{x:0,z:0},1/60);assert.ok(camera.position.distanceTo(position)<1e-8);
  const bunny={x:6.5,z:5};
  for(let i=0;i<180;i++)followBunny(camera,focus,bunny,1/60);
  assert.ok(camera.position.distanceTo(position)>1);
  assert.ok(camera.quaternion.angleTo(angle)<1e-7);
  assert.ok(camera.position.clone().sub(focus).distanceTo(offset)<1e-7);
  camera.updateMatrixWorld();const projected=new THREE.Vector3(bunny.x,.85,bunny.z).project(camera);
  assert.ok(Math.abs(projected.x)<.44&&Math.abs(projected.y)<.30);
});

test('camera follow has the same result across frame rates and works in portrait',()=>{
  const a=cameraSetup(),b=cameraSetup();a.camera.aspect=b.camera.aspect=.5;a.camera.updateProjectionMatrix();b.camera.updateProjectionMatrix();
  for(let i=0;i<120;i++)followBunny(a.camera,a.focus,{x:-6,z:4},1/60);
  for(let i=0;i<40;i++)followBunny(b.camera,b.focus,{x:-6,z:4},1/20);
  assert.ok(a.camera.position.distanceTo(b.camera.position)<.02);
});

test('every object can be approached from every corner without entering its collider',()=>{
  for(const object of gardenObjects)for(const start of [layout.start,{x:-5,z:-4},{x:5,z:4},{x:5,z:-4}]){
    const route=approachObject(start,object,layout);assert.ok(route,object.id);
    let previous=start;
    for(const point of route){assert.ok(canTravel(previous,point,layout));previous=point;}
    assert.ok(distance(previous,object)>object.radius+layout.radius-.001);
    assert.ok(distance(previous,object)<object.radius+layout.radius+.3);
    assert.deepEqual(approachObject(previous,object,layout),[],'nearby retaps play without another walk');
  }
});

test('interactive Blender export has separate cushions, a hollow basket and hinged lid',()=>{
  const bytes=readFileSync(new URL('../assets/picnic-garden.glb',import.meta.url));
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  for(const item of gardenObjects){const node=gltf.nodes.find((n:any)=>n.extras?.interaction===item.id);assert.ok(node,item.id);assert.ok(node.children.length);}
  const hinge=gltf.nodes.find((n:any)=>n.name==='Basket lid hinge');assert.ok(hinge?.children.length>=4);
  assert.ok(Math.abs(hinge.translation[1]-.69)<.001);assert.ok(Math.abs(hinge.translation[2]+.45)<.001);
  for(const name of ['Basket apples','Apple stems','Apple leaves','Basket lining'])assert.ok(gltf.nodes.some((n:any)=>n.name===name));
});
