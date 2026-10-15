import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Matrix4, Quaternion, Vector3 } from 'three';

for (const model of ['bunny', 'bow-bunny', 'garden-bunny']) {
  const file = readFileSync(new URL(`../assets/${model}.glb`, import.meta.url));
  const jsonLength = file.readUInt32LE(12);
  const gltf = JSON.parse(file.subarray(20, 20 + jsonLength).toString());
  const binStart = 20 + jsonLength + 8;
  const widths = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  const readers = {
    5121: [1, 'readUInt8'], 5123: [2, 'readUInt16LE'], 5125: [4, 'readUInt32LE'], 5126: [4, 'readFloatLE'],
  };
  function accessor(index) {
    const a = gltf.accessors[index];
    const width = widths[a.type];
    const [bytes, method] = readers[a.componentType];
    const rows = Array.from({ length: a.count }, () => Array(width).fill(0));
    if (a.bufferView !== undefined) {
      const v = gltf.bufferViews[a.bufferView];
      const stride = v.byteStride ?? bytes * width;
      const offset = binStart + (v.byteOffset ?? 0) + (a.byteOffset ?? 0);
      for (let row = 0; row < a.count; row++) for (let col = 0; col < width; col++) rows[row][col] = file[method](offset + row * stride + col * bytes);
    }
    if (a.sparse) {
      const { count, indices, values } = a.sparse;
      const [indexBytes, indexMethod] = readers[indices.componentType];
      const indexOffset = binStart + (gltf.bufferViews[indices.bufferView].byteOffset ?? 0) + (indices.byteOffset ?? 0);
      const valueOffset = binStart + (gltf.bufferViews[values.bufferView].byteOffset ?? 0) + (values.byteOffset ?? 0);
      for (let i = 0; i < count; i++) {
        const row = file[indexMethod](indexOffset + i * indexBytes);
        for (let col = 0; col < width; col++) rows[row][col] = file[method](valueOffset + (i * width + col) * bytes);
      }
    }
    return rows;
  }

  test(`${model}: the downloadable GLB is complete, self-contained, textured 3D geometry`, () => {
    assert.equal(file.toString('ascii', 0, 4), 'glTF');
    assert.equal(file.readUInt32LE(4), 2);
    assert.equal(file.readUInt32LE(8), file.length);
    assert.ok(gltf.meshes.length > 0);
    assert.ok(gltf.images.length > 0);
    for (const image of gltf.images) { assert.equal(image.uri, undefined); assert.ok(Number.isInteger(image.bufferView)); }
    for (const buffer of gltf.buffers) assert.equal(buffer.uri, undefined);
    const textured = gltf.materials.filter(m => m.pbrMetallicRoughness?.baseColorTexture);
    assert.ok(textured.length >= (model === 'bunny' ? 4 : 1), 'authored surface textures are embedded');
    for (const mesh of gltf.meshes) for (const p of mesh.primitives) {
      for (const key of ['POSITION', 'NORMAL', 'TEXCOORD_0']) assert.ok(Number.isInteger(p.attributes[key]), `missing ${key}`);
      const positions = accessor(p.attributes.POSITION);
      assert.ok(positions.every(v => v.every(Number.isFinite)), 'finite vertices');
      assert.ok(accessor(p.indices).every(([index]) => index < positions.length), 'valid triangle indices');
    }
  });

  test(`${model}: the skeleton and skin weights remain usable outside this viewer`, () => {
    assert.equal(gltf.skins.length, 1);
    const skin = gltf.skins[0];
    const bones = skin.joints.map(index => gltf.nodes[index].name);
    for (const name of ['Root', 'Head', 'Ear.L', 'Ear.R', 'Arm.L', 'Arm.R', 'Foot.L', 'Foot.R', 'Tail']) assert.ok(bones.includes(name), name);
    for (const mesh of gltf.meshes) for (const p of mesh.primitives) {
      const weights = accessor(p.attributes.WEIGHTS_0);
      const joints = accessor(p.attributes.JOINTS_0);
      assert.equal(weights.length, accessor(p.attributes.POSITION).length);
      for (let i = 0; i < weights.length; i++) {
        assert.ok(Math.abs(weights[i].reduce((a,b) => a+b, 0) - 1) < .0001, 'weights sum to one');
        assert.ok(weights[i].every(w => Number.isFinite(w) && w >= 0 && w <= 1));
        assert.ok(joints[i].every(j => j >= 0 && j < skin.joints.length), 'valid joint references');
      }
    }
  });

  test(`${model}: exported animations have finite keys and seamless endpoints`, () => {
    const expected = ['Curious', 'Hop', 'Idle', 'Wave'];
    if (model !== 'bunny') expected.push('Talk');
    assert.deepEqual(gltf.animations.map(a => a.name).sort(), expected.sort());
    for (const animation of gltf.animations) {
      assert.ok(animation.channels.length >= (animation.name === 'Talk' ? 1 : 10));
      for (const channel of animation.channels) {
        const sampler = animation.samplers[channel.sampler];
        const times = accessor(sampler.input).flat();
        const values = accessor(sampler.output);
        assert.ok(times.at(-1) > 1, animation.name);
        assert.ok(times.every((t, i) => i === 0 || t > times[i-1]), 'monotonic animation times');
        assert.ok(values.every(v => v.every(Number.isFinite)));
        const first = values[0], last = values.at(-1);
        const direct = Math.max(...first.map((v,i) => Math.abs(v-last[i])));
        const opposite = channel.target.path === 'rotation' ? Math.max(...first.map((v,i) => Math.abs(v+last[i]))) : Infinity;
        assert.ok(Math.min(direct, opposite) < .0002, `${animation.name} ${gltf.nodes[channel.target.node].name} ${channel.target.path} loop seam`);
      }
    }
  });

  if (model !== 'bunny') test(`${model}: mouth rests closed and speech can layer over every body pose`, () => {
    let moved = 0;
    let largestOpening = 0;
    for (const mesh of gltf.meshes) {
      const mouthIndex = mesh.extras?.targetNames?.indexOf('MouthOpen');
      assert.ok(mouthIndex >= 0, 'download includes the named mouth control');
      assert.equal(mesh.weights[mouthIndex], 0, 'closed smile is the rest state');
      for (const primitive of mesh.primitives) {
        const positions = accessor(primitive.attributes.POSITION);
        const deltas = accessor(primitive.targets[mouthIndex].POSITION);
        assert.equal(deltas.length, positions.length);
        deltas.forEach((delta, i) => {
          assert.ok(delta.every(Number.isFinite));
          if (Math.hypot(...delta) > .0001) {
            moved++;
            const [x, y] = positions[i];
            assert.ok(Math.abs(x) < .55 && y > 1 && y < 1.4, 'only the lower face moves');
            largestOpening = Math.max(largestOpening, Math.abs(delta[1]));
          }
        });
      }
    }
    assert.ok(moved > (model === 'garden-bunny' ? 100 : 1000) && largestOpening > .045, 'real mouth geometry opens');
    const talk = gltf.animations.find(a => a.name === 'Talk');
    assert.ok(talk.channels.every(c => c.target.path === 'weights'), 'speech does not override body bones');
    for (const channel of talk.channels) {
      const values = accessor(talk.samplers[channel.sampler].output).flat();
      assert.ok(values.every(v => v >= 0 && v <= 1));
      assert.ok(Math.max(...values) > .8 && values.filter(v => v === 0).length > 5, 'syllables include openings and closed pauses');
      assert.equal(values[0], 0); assert.equal(values.at(-1), 0);
    }
    for (const clip of gltf.animations.filter(a => a.name !== 'Talk')) assert.ok(clip.channels.every(c => c.target.path !== 'weights'), `${clip.name} leaves speech independent`);
  });

  test(`${model}: the character has volume, grounded feet and preserved attachment points`, () => {
    const bounds = [[Infinity, Infinity, Infinity], [-Infinity, -Infinity, -Infinity]];
    for (const mesh of gltf.meshes) for (const p of mesh.primitives) {
      for (const v of accessor(p.attributes.POSITION)) for (let i = 0; i < 3; i++) {
        bounds[0][i] = Math.min(bounds[0][i], v[i]); bounds[1][i] = Math.max(bounds[1][i], v[i]);
      }
    }
    assert.ok(bounds[1][1] > 3 && bounds[1][1] < 3.4, 'full ear height');
    assert.ok(bounds[0][1] > -.04 && bounds[0][1] < .04, 'feet meet the ground');
    assert.ok(bounds[1][2] - bounds[0][2] > .7, 'real depth from nose to tail');
    for (const name of ['LookTarget', 'CarryPoint', 'Ground']) assert.ok(gltf.nodes.some(n => n.name === name));
  });

  test(`${model}: the hop lifts the character vertically rather than translating it backwards`, () => {
    const hop = gltf.animations.find(a => a.name === 'Hop');
    const channel = hop.channels.find(c => c.target.path === 'translation' && gltf.nodes[c.target.node].name === 'Root');
    assert.ok(channel, 'hop animates the root');
    const values = accessor(hop.samplers[channel.sampler].output);
    assert.ok(Math.max(...values.map(v => v[1])) > .2, 'Y-up GLB root lifts at least 20 cm');
    assert.ok(values.every(v => Math.abs(v[0]) < .001 && Math.abs(v[2]) < .001), 'no sideways or backwards drift');
  });

  if (model !== 'bunny') test(`${model}: the greeting raises an upright paw smoothly and returns it to rest`, () => {
    const skin = gltf.skins[0];
    const handNode = gltf.nodes.findIndex(n => n.name === 'Hand.R');
    const handJoint = skin.joints.indexOf(handNode);
    assert.ok(handJoint >= 0, 'a wrist joint controls the paw independently');
    const inverseBind = new Matrix4().fromArray(accessor(skin.inverseBindMatrices)[handJoint]);
    const palm = new Vector3(), handBounds = new Box3(); let count = 0;
    for (const mesh of gltf.meshes) for (const p of mesh.primitives) {
      const positions = accessor(p.attributes.POSITION), joints = accessor(p.attributes.JOINTS_0), weights = accessor(p.attributes.WEIGHTS_0);
      positions.forEach((position, i) => {
        if (joints[i].some((joint,j) => joint === handJoint && weights[i][j] > .999)) { handBounds.expandByPoint(new Vector3().fromArray(position)); count++; }
      });
    }
    assert.ok(count > 100, 'the hand actually has weighted geometry');
    // Bounds remain comparable after simplification; a vertex average changes
    // just because the number of vertices on a paw crease changes.
    handBounds.getCenter(palm);
    const parents = new Map();
    gltf.nodes.forEach((node,i) => node.children?.forEach(child => parents.set(child,i)));
    const wave = gltf.animations.find(a => a.name === 'Wave');
    const channels = wave.channels.map(c => ({ node:c.target.node, path:c.target.path,
      times:accessor(wave.samplers[c.sampler].input).flat(), values:accessor(wave.samplers[c.sampler].output) }));
    const duration = Math.max(...channels.map(c => c.times.at(-1)));
    function posedHand(time) {
      const transforms = gltf.nodes.map(n => ({ translation:n.translation ?? [0,0,0], rotation:n.rotation ?? [0,0,0,1], scale:n.scale ?? [1,1,1] }));
      for (const c of channels) {
        let next = c.times.findIndex(t => t >= time); if (next < 0) next = c.times.length-1;
        const prev = Math.max(0,next-1), t = next === prev ? 0 : (time-c.times[prev])/(c.times[next]-c.times[prev]);
        transforms[c.node][c.path] = c.path === 'rotation'
          ? new Quaternion().fromArray(c.values[prev]).slerp(new Quaternion().fromArray(c.values[next]),t).toArray()
          : c.values[prev].map((v,i) => v+(c.values[next][i]-v)*t);
      }
      const worlds = new Map();
      function world(i) {
        if (worlds.has(i)) return worlds.get(i);
        const n=transforms[i];
        const local=gltf.nodes[i].matrix ? new Matrix4().fromArray(gltf.nodes[i].matrix) : new Matrix4().compose(new Vector3().fromArray(n.translation),new Quaternion().fromArray(n.rotation),new Vector3().fromArray(n.scale));
        const matrix=parents.has(i) ? world(parents.get(i)).clone().multiply(local) : local;
        worlds.set(i,matrix);return matrix;
      }
      const matrix=world(handNode);
      return { palm:palm.clone().applyMatrix4(matrix.clone().multiply(inverseBind)), wrist:new Vector3().setFromMatrixPosition(matrix) };
    }
    const rest=posedHand(0), raised=[1.2,1.5,1.8,2.1].map(posedHand);
    for (const pose of raised) {
      assert.ok(pose.palm.y > pose.wrist.y+.025, 'raised fingers point above the wrist');
      assert.ok(pose.palm.y > rest.palm.y+.45, 'paw lifts to greet');
      assert.ok(pose.palm.x > .48, 'paw stays beside the face');
    }
    let last=rest.palm;
    for (let frame=1;frame<=Math.round(duration*30);frame++) {
      const current=posedHand(frame/30).palm;
      assert.ok(current.distanceTo(last)<.055,`paw moves ${current.distanceTo(last).toFixed(3)} m at frame ${frame}; avoid abrupt jumps`);last=current;
    }
    assert.ok(last.distanceTo(rest.palm)<.0002,'paw settles back into the same resting pose');
  });
}
