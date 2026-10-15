import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { HorizontalBlurShader } from 'three/addons/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/addons/shaders/VerticalBlurShader.js';

/** Real depth-based contact shadow, following Three.js's webgl_shadow_contact example. */
export function contactShadow(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  const target = new THREE.WebGLRenderTarget(512, 512);
  const temporary = new THREE.WebGLRenderTarget(512, 512);
  const camera = new THREE.OrthographicCamera(-1.35, 1.35, 1.35, -1.35, .001, .8);
  camera.position.y = -.012; camera.rotation.x = Math.PI / 2; camera.layers.set(1);
  const material = new THREE.MeshBasicMaterial({ map: target.texture, transparent: true, opacity: .68, depthWrite: false, toneMapped: false });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 2.7).rotateX(Math.PI / 2), material);
  plane.scale.y = -1; plane.position.y = .004; plane.renderOrder = 2; scene.add(plane);
  const depth = new THREE.MeshDepthMaterial({ side: THREE.DoubleSide });
  depth.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace(
      'gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );',
      'gl_FragColor = vec4( vec3( 0.16, 0.13, 0.09 ), pow(1.0 - fragCoordZ, 2.4) );',
    );
  };
  const horizontal = new THREE.ShaderMaterial(HorizontalBlurShader);
  const vertical = new THREE.ShaderMaterial(VerticalBlurShader);
  const quad = new FullScreenQuad(horizontal);
  let lastUpdate = -Infinity;
  function update(time: number, moving: boolean): void {
    if ((!moving && lastUpdate > 0) || time - lastUpdate < 45) return;
    lastUpdate = time;
    const alpha = renderer.getClearAlpha();
    const clear = renderer.getClearColor(new THREE.Color());
    const override = scene.overrideMaterial;
    const shadowAutoUpdate = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false;
    renderer.setClearColor(0x000000, 0);
    scene.overrideMaterial = depth;
    renderer.setRenderTarget(target); renderer.render(scene, camera);
    scene.overrideMaterial = override;
    for (const amount of [2.6, 1.2]) {
      horizontal.uniforms['tDiffuse']!.value = target.texture;
      horizontal.uniforms['h']!.value = amount / 512;
      quad.material = horizontal; renderer.setRenderTarget(temporary); quad.render(renderer);
      vertical.uniforms['tDiffuse']!.value = temporary.texture;
      vertical.uniforms['v']!.value = amount / 512;
      quad.material = vertical; renderer.setRenderTarget(target); quad.render(renderer);
    }
    renderer.setRenderTarget(null); renderer.setClearColor(clear, alpha);
    renderer.shadowMap.autoUpdate = shadowAutoUpdate;
  }
  function dispose(): void {
    plane.geometry.dispose(); material.dispose(); depth.dispose();
    horizontal.dispose(); vertical.dispose(); target.dispose(); temporary.dispose(); quad.dispose();
    scene.remove(plane);
  }
  return { update, dispose };
}
