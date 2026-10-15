import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Point } from './garden-navigation';

/** Translate along the ground only when Bunny leaves the quiet middle of the view. */
export function followBunny(camera: THREE.PerspectiveCamera, focus: THREE.Vector3, bunny: Point, dt: number): void {
  camera.updateMatrixWorld();
  const anchor = new THREE.Vector3(bunny.x, .85, bunny.z);
  const screen = anchor.clone().project(camera);
  const x = THREE.MathUtils.clamp(screen.x, -.42, .42);
  const y = THREE.MathUtils.clamp(screen.y, -.28, .28);
  if (Math.abs(x-screen.x) < .0001 && Math.abs(y-screen.y) < .0001) return;
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(x,y),camera);
  const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-.85),new THREE.Vector3());
  if (!hit) return;
  const correction = anchor.sub(hit).multiplyScalar(1-Math.exp(-3*dt));
  correction.y=0; focus.add(correction); camera.position.add(correction);
}

export function gardenCamera(camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) {
  const orbit = new OrbitControls(camera,canvas);
  orbit.enabled=false;orbit.enablePan=false;orbit.enableDamping=true;orbit.dampingFactor=.09;
  orbit.minDistance=9;orbit.maxDistance=34;orbit.minPolarAngle=.37;orbit.maxPolarAngle=1.23;
  orbit.rotateSpeed=.55;orbit.zoomSpeed=.65;orbit.touches.TWO=THREE.TOUCH.DOLLY_ROTATE;
  const focus=new THREE.Vector3(0,.55,-1.2), offset=new THREE.Vector3();
  let inspecting=false, returning=false;
  function resize(): void {
    offset.set(5.8,10.25,18).multiplyScalar(camera.aspect<1?1.22:1);
    if(!inspecting){camera.position.copy(focus).add(offset);camera.lookAt(focus);camera.updateMatrixWorld();}
    orbit.target.copy(focus);
  }
  resize();
  return {
    get inspecting(){return inspecting;},
    get focus(){return focus.clone();},
    resize,
    inspect(enabled:boolean):void {
      if(enabled===inspecting)return;
      // Flush orbit inertia before handing the camera back to play.
      orbit.enableDamping=false;orbit.update();orbit.enableDamping=true;
      inspecting=enabled;orbit.enabled=enabled;
      if(enabled){returning=false;orbit.target.copy(focus);orbit.update();}
      else returning=true;
    },
    frame(bunny:Point):void {focus.set(bunny.x,.55,bunny.z);returning=true;},
    update(dt:number,bunny:Point):void {
      if(inspecting){orbit.update();return;}
      if(returning){
        const goal=focus.clone().add(offset);
        camera.position.lerp(goal,1-Math.exp(-5*dt));camera.lookAt(focus);
        if(camera.position.distanceTo(goal)<.015){camera.position.copy(goal);returning=false;}
      }else followBunny(camera,focus,bunny,dt);
      orbit.target.copy(focus);
      camera.updateMatrixWorld();
    },
    dispose():void{orbit.dispose();},
  };
}
