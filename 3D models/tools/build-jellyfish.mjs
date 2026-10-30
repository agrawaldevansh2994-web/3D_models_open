import fs from 'fs';
import path from 'path';
import { Document, NodeIO } from '@gltf-transform/core';
import * as THREE from 'three';
import { PNG } from 'pngjs';

/**
 * Procedural Abyssal Crown Jellyfish Builder for Playa Art.
 * Height: 1.4m
 * Translucent bell with 8 radial canals, oral arms, and 8 trailing tentacles.
 * Rig:
 *   Root
 *     Bell_Top -> Bell_Mid -> Bell_Rim (8 rim bones)
 *     Tentacle_0..7 (3 bones each)
 * Baked Clips:
 *   - pulse (bell contraction & elastic expansion)
 *   - drift (hypnotic oceanic current undulation)
 *   - bloom (wide bell flare)
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

export async function buildBiolumJellyfish(outPath = 'characters/biolum_jellyfish/biolum_jellyfish.glb') {
  console.log(`\n======================================================`);
  console.log(`>>> SCULPTING ABYSSAL CROWN JELLYFISH: [biolum_jellyfish]`);
  console.log(`======================================================`);

  const vertices = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  // 1. Parametric Bell Dome (Hemispherical umbrella)
  const bellRings = 24;
  const bellSlices = 32;
  const bellRadius = 0.55; // 1.1m diameter

  for (let r = 0; r <= bellRings; r++) {
    const phi = (r / bellRings) * (Math.PI * 0.55); // slightly flared rim
    const y = 1.4 - Math.cos(phi) * 0.45;
    const ringRad = Math.sin(phi) * bellRadius;

    for (let s = 0; s <= bellSlices; s++) {
      const theta = (s / bellSlices) * Math.PI * 2;
      const x = Math.cos(theta) * ringRad;
      const z = Math.sin(theta) * ringRad;

      // Normal outward from dome center (0, 0.95, 0)
      const nx = x / Math.max(1e-4, ringRad);
      const ny = Math.cos(phi);
      const nz = z / Math.max(1e-4, ringRad);

      vertices.push(x, y, z);
      normals.push(nx, ny, nz);
      uvs.push(s / bellSlices, r / bellRings);
    }
  }

  for (let r = 0; r < bellRings; r++) {
    for (let s = 0; s < bellSlices; s++) {
      const a = r * (bellSlices + 1) + s;
      const b = (r + 1) * (bellSlices + 1) + s;
      const c = (r + 1) * (bellSlices + 1) + (s + 1);
      const d = r * (bellSlices + 1) + (s + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  // 2. Trailing Tentacles (8 long ribbon tentacles descending from rim to y = 0.0)
  const numTentacles = 8;
  const tentacleSegs = 20;

  for (let t = 0; t < numTentacles; t++) {
    const angle = (t / numTentacles) * Math.PI * 2;
    const rimX = Math.cos(angle) * (bellRadius * 0.95);
    const rimZ = Math.sin(angle) * (bellRadius * 0.95);
    const baseVertIdx = vertices.length / 3;

    for (let k = 0; k <= tentacleSegs; k++) {
      const frac = k / tentacleSegs;
      const y = 0.95 - frac * 0.95; // down to y = 0
      const spread = 0.015 * (1.0 - frac * 0.5);

      // Ribbon has width tangential to the rim circle
      const tx = -Math.sin(angle) * spread;
      const tz = Math.cos(angle) * spread;

      vertices.push(rimX - tx, y, rimZ - tz);
      normals.push(Math.cos(angle), 0, Math.sin(angle));
      uvs.push(0, frac);

      vertices.push(rimX + tx, y, rimZ + tz);
      normals.push(Math.cos(angle), 0, Math.sin(angle));
      uvs.push(1, frac);
    }

    for (let k = 0; k < tentacleSegs; k++) {
      const v0 = baseVertIdx + k * 2;
      const v1 = v0 + 1;
      const v2 = v0 + 2;
      const v3 = v0 + 3;
      indices.push(v0, v1, v2);
      indices.push(v1, v3, v2);
      // Double sided
      indices.push(v0, v2, v1);
      indices.push(v1, v2, v3);
    }
  }

  const numVerts = vertices.length / 3;
  console.log(`Jellyfish Mesh: ${numVerts} vertices, ${indices.length / 3} triangles`);

  // 3. Skeleton: Root + Bell + 8 Tentacle Chains (16 bones total)
  const JELLY_BONES = [
    { name: 'Root', parent: null, pos: [0, 1.2, 0] },
    { name: 'Bell_Apex', parent: 'Root', pos: [0, 1.4, 0] },
    { name: 'Bell_Mid', parent: 'Bell_Apex', pos: [0, 1.15, 0] },
    { name: 'Bell_Rim', parent: 'Bell_Mid', pos: [0, 0.95, 0] },
  ];

  // Add 8 tentacle base and mid bones
  for (let t = 0; t < numTentacles; t++) {
    const angle = (t / numTentacles) * Math.PI * 2;
    const bx = Math.cos(angle) * 0.5;
    const bz = Math.sin(angle) * 0.5;
    JELLY_BONES.push({
      name: `Tentacle_${t}_Base`,
      parent: 'Bell_Rim',
      pos: [bx, 0.95, bz],
    });
    JELLY_BONES.push({
      name: `Tentacle_${t}_Tip`,
      parent: `Tentacle_${t}_Base`,
      pos: [bx * 0.8, 0.35, bz * 0.8],
    });
  }

  // 4. Skin weights
  const joints0 = new Uint16Array(numVerts * 4);
  const weights0 = new Float32Array(numVerts * 4);

  const bellVertCount = (bellRings + 1) * (bellSlices + 1);

  for (let i = 0; i < bellVertCount; i++) {
    const y = vertices[i * 3 + 1];
    if (y > 1.25) {
      joints0[i * 4] = 1; weights0[i * 4] = 0.8; // Bell_Apex
      joints0[i * 4 + 1] = 2; weights0[i * 4 + 1] = 0.2; // Bell_Mid
    } else if (y > 1.05) {
      joints0[i * 4] = 2; weights0[i * 4] = 0.7; // Bell_Mid
      joints0[i * 4 + 1] = 3; weights0[i * 4 + 1] = 0.3; // Bell_Rim
    } else {
      joints0[i * 4] = 3; weights0[i * 4] = 0.8; // Bell_Rim
      joints0[i * 4 + 1] = 2; weights0[i * 4 + 1] = 0.2; // Bell_Mid
    }
  }

  // Tentacle vertices weighting
  let curIdx = bellVertCount;
  for (let t = 0; t < numTentacles; t++) {
    const tBaseJoint = 4 + t * 2;
    const tTipJoint = 5 + t * 2;

    for (let k = 0; k <= tentacleSegs; k++) {
      const frac = k / tentacleSegs;
      for (let s = 0; s < 2; s++) {
        const vIdx = curIdx++;
        joints0[vIdx * 4] = tBaseJoint;
        weights0[vIdx * 4] = Math.max(0, 1.0 - frac);
        joints0[vIdx * 4 + 1] = tTipJoint;
        weights0[vIdx * 4 + 1] = frac;
      }
    }
  }

  // 5. Inverse Bind Matrices
  const ibmArray = new Float32Array(JELLY_BONES.length * 16);
  for (let i = 0; i < JELLY_BONES.length; i++) {
    const b = JELLY_BONES[i];
    const m = new THREE.Matrix4().makeTranslation(b.pos[0], b.pos[1], b.pos[2]);
    const inv = new THREE.Matrix4().copy(m).invert();
    ibmArray.set(inv.elements, i * 16);
  }

  // 6. Bake Glowing Abyssal PBR Textures (Magenta & Cyan Radial Canals)
  console.log(`>>> Baking Jellyfish Bioluminescent Textures...`);
  const size = 512;
  const baseColor = createPNG(size, size, (u, v) => {
    // 8 radial neon canals
    const radial = Math.abs(Math.sin(u * Math.PI * 8));
    if (radial > 0.85) {
      return [255, 30, 200, 255]; // Neon Magenta canal
    }
    // Translucent aqua body
    return [20, 80, 110, 255];
  });

  const mr = createPNG(size, size, () => [0, 40, 200, 255]); // slick glass sheen
  const norm = createPNG(size, size, () => [128, 128, 255, 255]);

  const emissive = createPNG(size, size, (u, v) => {
    const radial = Math.abs(Math.sin(u * Math.PI * 8));
    if (radial > 0.85) {
      return [255, 30, 220, 255]; // Magenta glow
    }
    if (v > 0.85) {
      return [0, 240, 255, 255]; // Cyan marginal rim glow
    }
    return [0, 40, 80, 255]; // Deep ambient cyan
  });

  // 7. Assemble glTF Document
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene('Scene');

  const baseColorTex = doc.createTexture('BaseColor').setImage(baseColor).setMimeType('image/png');
  const mrTex = doc.createTexture('MetallicRoughness').setImage(mr).setMimeType('image/png');
  const normalTex = doc.createTexture('Normal').setImage(norm).setMimeType('image/png');
  const emissiveTex = doc.createTexture('Emissive').setImage(emissive).setMimeType('image/png');

  const material = doc.createMaterial('M_BiolumJellyfish')
    .setBaseColorTexture(baseColorTex)
    .setMetallicRoughnessTexture(mrTex)
    .setNormalTexture(normalTex)
    .setEmissiveTexture(emissiveTex)
    .setEmissiveFactor([1.0, 1.0, 1.0])
    .setRoughnessFactor(0.3)
    .setMetallicFactor(0.8);

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

  const mesh = doc.createMesh('Jellyfish_Mesh').addPrimitive(prim);

  const boneNodeMap = new Map();
  for (const b of JELLY_BONES) {
    boneNodeMap.set(b.name, doc.createNode(b.name));
  }

  for (const b of JELLY_BONES) {
    const node = boneNodeMap.get(b.name);
    if (b.parent) {
      const parentNode = boneNodeMap.get(b.parent);
      const parentBone = JELLY_BONES.find(x => x.name === b.parent);
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
  const skin = doc.createSkin('Jellyfish_Skin').setInverseBindMatrices(ibmAcc);
  for (const b of JELLY_BONES) {
    skin.addJoint(boneNodeMap.get(b.name));
  }

  const meshNode = doc.createNode('Jellyfish_Model').setMesh(mesh).setSkin(skin);
  scene.addChild(meshNode);

  // 8. Synthesize Animation Clips (pulse, drift, bloom)
  console.log(`>>> Synthesizing Jellyfish Animation Clips...`);

  // Clip 1: 'pulse' (Rapid contraction propulsion phase followed by slow elastic expansion)
  {
    const duration = 2.4;
    const frameCount = 73;
    const times = new Float32Array(frameCount);
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();

    const pulseAnim = doc.createAnimation('pulse');
    const timeAcc = doc.createAccessor('pulse_Time').setArray(times).setType('SCALAR').setBuffer(buffer);
    for (let i = 0; i < frameCount; i++) times[i] = (i / (frameCount - 1)) * duration;

    // Bell Rim scaling contraction
    const rimNode = boneNodeMap.get('Bell_Rim');
    const scaleVals = new Float32Array(frameCount * 3);
    for (let i = 0; i < frameCount; i++) {
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      // Rapid contraction at start of cycle
      const contract = Math.pow(Math.sin(phase), 2) * (phase < Math.PI ? 0.35 : 0.1);
      scaleVals[i * 3] = 1.0 - contract;
      scaleVals[i * 3 + 1] = 1.0 + contract * 0.4;
      scaleVals[i * 3 + 2] = 1.0 - contract;
    }
    const sAcc = doc.createAccessor('pulse_Rim_Scale').setArray(scaleVals).setType('VEC3').setBuffer(buffer);
    const sSampler = doc.createAnimationSampler().setInput(timeAcc).setOutput(sAcc).setInterpolation('LINEAR');
    const sChannel = doc.createAnimationChannel().setTargetNode(rimNode).setTargetPath('scale').setSampler(sSampler);
    pulseAnim.addSampler(sSampler);
    pulseAnim.addChannel(sChannel);

    // Root propulsion upward thrust
    const rootNode = boneNodeMap.get('Root');
    const posVals = new Float32Array(frameCount * 3);
    for (let i = 0; i < frameCount; i++) {
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      posVals[i * 3] = 0;
      posVals[i * 3 + 1] = 1.2 + Math.sin(phase) * 0.18;
      posVals[i * 3 + 2] = 0;
    }
    const pAcc = doc.createAccessor('pulse_Root_Pos').setArray(posVals).setType('VEC3').setBuffer(buffer);
    const pSampler = doc.createAnimationSampler().setInput(timeAcc).setOutput(pAcc).setInterpolation('LINEAR');
    const pChannel = doc.createAnimationChannel().setTargetNode(rootNode).setTargetPath('translation').setSampler(pSampler);
    pulseAnim.addSampler(pSampler);
    pulseAnim.addChannel(pChannel);

    // Tentacle lag undulation
    for (let t = 0; t < numTentacles; t++) {
      const tipNode = boneNodeMap.get(`Tentacle_${t}_Tip`);
      const quatVals = new Float32Array(frameCount * 4);
      for (let i = 0; i < frameCount; i++) {
        const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
        euler.set(Math.sin(phase - 0.8) * 0.25, 0, Math.cos(phase - 0.8) * 0.25);
        quat.setFromEuler(euler);
        quatVals[i * 4] = quat.x;
        quatVals[i * 4 + 1] = quat.y;
        quatVals[i * 4 + 2] = quat.z;
        quatVals[i * 4 + 3] = quat.w;
      }
      const qAcc = doc.createAccessor(`pulse_Tentacle_${t}_Quat`).setArray(quatVals).setType('VEC4').setBuffer(buffer);
      const qSampler = doc.createAnimationSampler().setInput(timeAcc).setOutput(qAcc).setInterpolation('LINEAR');
      const qChannel = doc.createAnimationChannel().setTargetNode(tipNode).setTargetPath('rotation').setSampler(qSampler);
      pulseAnim.addSampler(qSampler);
      pulseAnim.addChannel(qChannel);
    }
  }

  // Clip 2: 'drift' (Hypnotic oceanic current sway)
  {
    const duration = 3.6;
    const frameCount = 109;
    const times = new Float32Array(frameCount);
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();

    const driftAnim = doc.createAnimation('drift');
    const timeAcc = doc.createAccessor('drift_Time').setArray(times).setType('SCALAR').setBuffer(buffer);
    for (let i = 0; i < frameCount; i++) times[i] = (i / (frameCount - 1)) * duration;

    const rootNode = boneNodeMap.get('Root');
    const quatVals = new Float32Array(frameCount * 4);
    for (let i = 0; i < frameCount; i++) {
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      euler.set(Math.sin(phase) * 0.12, Math.cos(phase * 0.5) * 0.15, Math.sin(phase * 0.5) * 0.08);
      quat.setFromEuler(euler);
      quatVals[i * 4] = quat.x;
      quatVals[i * 4 + 1] = quat.y;
      quatVals[i * 4 + 2] = quat.z;
      quatVals[i * 4 + 3] = quat.w;
    }
    const qAcc = doc.createAccessor('drift_Root_Quat').setArray(quatVals).setType('VEC4').setBuffer(buffer);
    const qSampler = doc.createAnimationSampler().setInput(timeAcc).setOutput(qAcc).setInterpolation('LINEAR');
    const qChannel = doc.createAnimationChannel().setTargetNode(rootNode).setTargetPath('rotation').setSampler(qSampler);
    driftAnim.addSampler(qSampler);
    driftAnim.addChannel(qChannel);
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
    bones: JELLY_BONES.length,
    clips: ['pulse', 'drift'],
  };
}

if (process.argv[1] && process.argv[1].endsWith('build-jellyfish.mjs')) {
  buildBiolumJellyfish().catch(err => {
    console.error('Jellyfish build failed:', err);
    process.exit(1);
  });
}

