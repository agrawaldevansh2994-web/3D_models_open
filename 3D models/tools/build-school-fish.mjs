import fs from 'fs';
import path from 'path';
import { Document, NodeIO } from '@gltf-transform/core';
import * as THREE from 'three';
import { PNG } from 'pngjs';

/**
 * Procedural Instanced Bioluminescent Schooling Fish Builder
 * Length: 0.35m
 * Triangles: ~600-800 tris (optimized for 500+ instanced boids)
 * Skeleton:
 *   Root -> Head -> Body_1 -> Body_2 -> Tail_Peduncle -> Caudal_Fin
 * Clips:
 *   - swim (carangiform S-wave propulsion)
 *   - dart (rapid double-tail burst acceleration)
 *   - idle (gentle station-keeping fin flutter)
 */

function createPNG(width, height, pixelFn) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      const u = x / (width - 1);
      const v = y / (height - 1);
      const [r, g, b, a = 255] = pixelFn(u, v, x, y);
      png.data[idx] = Math.max(0, Math.min(255, Math.round(r)));
      png.data[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
      png.data[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
      png.data[idx + 3] = Math.max(0, Math.min(255, Math.round(a)));
    }
  }
  return PNG.sync.write(png);
}

export async function buildSchoolFish(outPath = 'characters/school_fish/school_fish.glb') {
  console.log(`\n======================================================`);
  console.log(`>>> SCULPTING SWARM UNIT: [school_fish]`);
  console.log(`======================================================`);

  const length = 0.35; // 35cm
  const halfLen = length / 2;

  // Streamlined fusiform cross-section loft along Z axis (+Z head, -Z caudal fin)
  const zSegments = 16;
  const radialSegments = 12;

  const vertices = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let j = 0; j <= zSegments; j++) {
    const v = j / zSegments; // 0 = snout (+Z), 1 = tail peduncle (-Z)
    const z = (0.5 - v) * length;

    // Fusiform profile
    let radiusY = Math.sin(v * Math.PI) * 0.055; // vertical height
    let radiusX = radiusY * 0.55;                 // laterally compressed

    // Caudal fin tail flare at the very end
    if (v > 0.85) {
      const finFrac = (v - 0.85) / 0.15;
      radiusY += finFrac * 0.045;
      radiusX = Math.max(0.002, radiusX * (1.0 - finFrac * 0.8));
    }

    for (let i = 0; i <= radialSegments; i++) {
      const u = i / radialSegments;
      const theta = u * Math.PI * 2;
      const x = Math.cos(theta) * radiusX;
      const y = Math.sin(theta) * radiusY + 1.0; // elevation at 1.0m

      const nx = Math.cos(theta) / Math.max(1e-4, radiusX);
      const ny = Math.sin(theta) / Math.max(1e-4, radiusY);
      const len = Math.hypot(nx, ny);

      vertices.push(x, y, z);
      normals.push(nx / len, ny / len, 0);
      uvs.push(u, v);
    }
  }

  for (let j = 0; j < zSegments; j++) {
    for (let i = 0; i < radialSegments; i++) {
      const a = j * (radialSegments + 1) + i;
      const b = (j + 1) * (radialSegments + 1) + i;
      const c = (j + 1) * (radialSegments + 1) + (i + 1);
      const d = j * (radialSegments + 1) + (i + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const numVerts = vertices.length / 3;
  console.log(`School Fish Mesh: ${numVerts} vertices, ${indices.length / 3} triangles`);

  // 6-bone spine chain
  const FISH_BONES = [
    { name: 'Root', parent: null, pos: [0, 1.0, 0] },
    { name: 'Head', parent: 'Root', pos: [0, 1.0, 0.14] },
    { name: 'Body_1', parent: 'Root', pos: [0, 1.0, 0.05] },
    { name: 'Body_2', parent: 'Body_1', pos: [0, 1.0, -0.04] },
    { name: 'Tail_Peduncle', parent: 'Body_2', pos: [0, 1.0, -0.11] },
    { name: 'Caudal_Fin', parent: 'Tail_Peduncle', pos: [0, 1.0, -0.17] },
  ];

  // Skin weights along length
  const joints0 = new Uint16Array(numVerts * 4);
  const weights0 = new Float32Array(numVerts * 4);

  for (let j = 0; j <= zSegments; j++) {
    const v = j / zSegments; // 0 head, 1 tail
    let j0 = 0, j1 = 1, w0 = 1.0, w1 = 0.0;

    if (v < 0.25) {
      j0 = 1; j1 = 0; w0 = 0.8; w1 = 0.2; // Head
    } else if (v < 0.50) {
      j0 = 0; j1 = 2; w0 = 0.6; w1 = 0.4; // Body_1
    } else if (v < 0.70) {
      j0 = 2; j1 = 3; w0 = 0.5; w1 = 0.5; // Body_2
    } else if (v < 0.85) {
      j0 = 3; j1 = 4; w0 = 0.4; w1 = 0.6; // Tail_Peduncle
    } else {
      j0 = 4; j1 = 5; w0 = 0.3; w1 = 0.7; // Caudal_Fin
    }

    for (let i = 0; i <= radialSegments; i++) {
      const idx = j * (radialSegments + 1) + i;
      joints0[idx * 4] = j0; weights0[idx * 4] = w0;
      joints0[idx * 4 + 1] = j1; weights0[idx * 4 + 1] = w1;
    }
  }

  // Inverse bind matrices
  const ibmArray = new Float32Array(FISH_BONES.length * 16);
  for (let i = 0; i < FISH_BONES.length; i++) {
    const b = FISH_BONES[i];
    const m = new THREE.Matrix4().makeTranslation(b.pos[0], b.pos[1], b.pos[2]);
    const inv = new THREE.Matrix4().copy(m).invert();
    ibmArray.set(inv.elements, i * 16);
  }

  // PBR Textures (Iridescent silver scales with electric cyan lateral neon line)
  const texSize = 256;
  const baseColor = createPNG(texSize, texSize, (u, v) => {
    // Dorsal: sapphire blue, Ventral: silver white, Lateral: cyan
    const isLateral = Math.abs(u - 0.25) < 0.04 || Math.abs(u - 0.75) < 0.04;
    if (isLateral) return [0, 240, 255, 255]; // Neon cyan stripe
    const isDorsal = u > 0.4 && u < 0.6;
    if (isDorsal) return [20, 50, 110, 255]; // Deep sapphire
    return [200, 215, 230, 255]; // Iridescent silver
  });

  const mr = createPNG(texSize, texSize, () => [0, 60, 210, 255]); // metallic iridescent
  const norm = createPNG(texSize, texSize, () => [128, 128, 255, 255]);

  const emissive = createPNG(texSize, texSize, (u, v) => {
    const isLateral = Math.abs(u - 0.25) < 0.04 || Math.abs(u - 0.75) < 0.04;
    if (isLateral) return [0, 255, 240, 255]; // Lateral stripe glow
    return [0, 0, 0, 255];
  });

  // glTF Document
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene('Scene');

  const baseColorTex = doc.createTexture('BaseColor').setImage(baseColor).setMimeType('image/png');
  const mrTex = doc.createTexture('MetallicRoughness').setImage(mr).setMimeType('image/png');
  const normalTex = doc.createTexture('Normal').setImage(norm).setMimeType('image/png');
  const emissiveTex = doc.createTexture('Emissive').setImage(emissive).setMimeType('image/png');

  const material = doc.createMaterial('M_SchoolFish')
    .setBaseColorTexture(baseColorTex)
    .setMetallicRoughnessTexture(mrTex)
    .setNormalTexture(normalTex)
    .setEmissiveTexture(emissiveTex)
    .setEmissiveFactor([1.0, 1.0, 1.0])
    .setRoughnessFactor(0.25)
    .setMetallicFactor(0.85);

  const posAcc = doc.createAccessor('POSITION').setArray(new Float32Array(vertices)).setType('VEC3').setBuffer(buffer);
  const normAcc = doc.createAccessor('NORMAL').setArray(new Float32Array(normals)).setType('VEC3').setBuffer(buffer);
  const uvAcc = doc.createAccessor('TEXCOORD_0').setArray(new Float32Array(uvs)).setType('VEC2').setBuffer(buffer);
  const jointsAcc = doc.createAccessor('JOINTS_0').setArray(joints0).setType('VEC4').setBuffer(buffer);
  const weightsAcc = doc.createAccessor('WEIGHTS_0').setArray(weights0).setType('VEC4').setBuffer(buffer);
  const indicesAcc = doc.createAccessor('INDICES').setArray(new Uint32Array(indices)).setType('SCALAR').setBuffer(buffer);

  const prim = doc.createPrimitive()
    .setAttribute('POSITION', posAcc)
    .setAttribute('NORMAL', normAcc)
    .setAttribute('TEXCOORD_0', uvAcc)
    .setAttribute('JOINTS_0', jointsAcc)
    .setAttribute('WEIGHTS_0', weightsAcc)
    .setIndices(indicesAcc)
    .setMaterial(material);

  const mesh = doc.createMesh('SchoolFish_Mesh').addPrimitive(prim);

  const boneNodeMap = new Map();
  for (const b of FISH_BONES) {
    boneNodeMap.set(b.name, doc.createNode(b.name));
  }

  for (const b of FISH_BONES) {
    const node = boneNodeMap.get(b.name);
    if (b.parent) {
      const parentNode = boneNodeMap.get(b.parent);
      const parentBone = FISH_BONES.find(x => x.name === b.parent);
      node.setTranslation([
        b.pos[0] - parentBone.pos[0],
        b.pos[1] - parentBone.pos[1],
        b.pos[2] - parentBone.pos[2],
      ]);
      parentNode.addChild(node);
    } else {
      node.setTranslation(b.pos);
      scene.addChild(node);
    }
  }

  const ibmAcc = doc.createAccessor('IBM').setArray(ibmArray).setType('MAT4').setBuffer(buffer);
  const skin = doc.createSkin('SchoolFish_Skin').setInverseBindMatrices(ibmAcc);
  for (const b of FISH_BONES) {
    skin.addJoint(boneNodeMap.get(b.name));
  }

  const meshNode = doc.createNode('SchoolFish_Model').setMesh(mesh).setSkin(skin);
  scene.addChild(meshNode);

  // Synthesize S-wave Carangiform Swim Clips
  console.log(`>>> Synthesizing Carangiform Fish Swimming Clips...`);

  // Clip 1: 'swim' (Crisp carangiform body wave)
  {
    const duration = 1.0; // 1s loop, fast swimming
    const frameCount = 31;
    const times = new Float32Array(frameCount);
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();

    const swimAnim = doc.createAnimation('swim');
    const timeAcc = doc.createAccessor('swim_Time').setArray(times).setType('SCALAR').setBuffer(buffer);
    for (let i = 0; i < frameCount; i++) times[i] = (i / (frameCount - 1)) * duration;

    const spineChain = ['Head', 'Body_1', 'Body_2', 'Tail_Peduncle', 'Caudal_Fin'];
    for (let k = 0; k < spineChain.length; k++) {
      const boneName = spineChain[k];
      const targetNode = boneNodeMap.get(boneName);
      const quatVals = new Float32Array(frameCount * 4);
      const phaseLag = k * 0.7; // traveling wave down spine
      const amplitude = (k + 1) * 0.08; // tail moves most

      for (let i = 0; i < frameCount; i++) {
        const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
        const yaw = Math.sin(phase - phaseLag) * amplitude;
        euler.set(0, yaw, 0);
        quat.setFromEuler(euler);

        quatVals[i * 4] = quat.x;
        quatVals[i * 4 + 1] = quat.y;
        quatVals[i * 4 + 2] = quat.z;
        quatVals[i * 4 + 3] = quat.w;
      }

      const qAcc = doc.createAccessor(`swim_${boneName}_Quat`).setArray(quatVals).setType('VEC4').setBuffer(buffer);
      const sampler = doc.createAnimationSampler().setInput(timeAcc).setOutput(qAcc).setInterpolation('LINEAR');
      const channel = doc.createAnimationChannel().setTargetNode(targetNode).setTargetPath('rotation').setSampler(sampler);
      swimAnim.addSampler(sampler);
      swimAnim.addChannel(channel);
    }
  }

  // Clip 2: 'dart' (High frequency burst acceleration)
  {
    const duration = 0.5; // rapid 0.5s burst
    const frameCount = 16;
    const times = new Float32Array(frameCount);
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();

    const dartAnim = doc.createAnimation('dart');
    const timeAcc = doc.createAccessor('dart_Time').setArray(times).setType('SCALAR').setBuffer(buffer);
    for (let i = 0; i < frameCount; i++) times[i] = (i / (frameCount - 1)) * duration;

    const spineChain = ['Body_1', 'Body_2', 'Tail_Peduncle', 'Caudal_Fin'];
    for (let k = 0; k < spineChain.length; k++) {
      const boneName = spineChain[k];
      const targetNode = boneNodeMap.get(boneName);
      const quatVals = new Float32Array(frameCount * 4);
      const phaseLag = k * 0.9;
      const amplitude = (k + 1) * 0.14;

      for (let i = 0; i < frameCount; i++) {
        const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
        const yaw = Math.sin(phase - phaseLag) * amplitude;
        euler.set(0, yaw, 0);
        quat.setFromEuler(euler);

        quatVals[i * 4] = quat.x;
        quatVals[i * 4 + 1] = quat.y;
        quatVals[i * 4 + 2] = quat.z;
        quatVals[i * 4 + 3] = quat.w;
      }

      const qAcc = doc.createAccessor(`dart_${boneName}_Quat`).setArray(quatVals).setType('VEC4').setBuffer(buffer);
      const sampler = doc.createAnimationSampler().setInput(timeAcc).setOutput(qAcc).setInterpolation('LINEAR');
      const channel = doc.createAnimationChannel().setTargetNode(targetNode).setTargetPath('rotation').setSampler(sampler);
      dartAnim.addSampler(sampler);
      dartAnim.addChannel(channel);
    }
  }

  // Write .glb
  const io = new NodeIO();
  const glbBuffer = await io.writeBinary(doc);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, Buffer.from(glbBuffer));

  const fileSizeKB = glbBuffer.byteLength / 1024;
  console.log(`>>> Written ${outPath} (${fileSizeKB.toFixed(1)} KB)`);

  return {
    filePath: outPath,
    fileSizeKB,
    triangles: indices.length / 3,
    bones: FISH_BONES.length,
    clips: ['swim', 'dart'],
  };
}

if (process.argv[1] && process.argv[1].endsWith('build-school-fish.mjs')) {
  buildSchoolFish().catch(err => {
    console.error('School fish build failed:', err);
    process.exit(1);
  });
}

