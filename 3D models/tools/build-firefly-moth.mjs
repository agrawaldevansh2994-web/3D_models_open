import fs from 'fs';
import path from 'path';
import { Document, NodeIO } from '@gltf-transform/core';
import * as THREE from 'three';
import { PNG } from 'pngjs';
import { buildLoftedTube, mergeGeometries } from './glb-builder.mjs';

/**
 * Procedural Firefly Moth Swarm Unit Builder for Playa Art.
 * Wingspan: 0.28m (Swarm unit, ~600-800 tris)
 * Ornate Luna / Saturn Moth with feathery antennae, furry thorax,
 * stained-glass wings with high-contrast glowing veins and lantern abdomen.
 * Clips:
 *   - fly (rapid fluttering flight with coupled abdomen bob)
 *   - hover (high frequency wing hum)
 *   - rest (perched gentle wing open/close respiratory rhythm)
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

export async function buildFireflyMoth(outPath = 'characters/firefly_moth/firefly_moth.glb') {
  console.log(`\n======================================================`);
  console.log(`>>> SCULPTING SWARM UNIT: [firefly_moth] (0.28m wingspan)`);
  console.log(`======================================================`);

  // 1. Thorax & Segmented Abdomen
  const body = buildLoftedTube({
    points: [
      [0, 0.25, -0.06], // Head
      [0, 0.25, -0.03], // Pronotum
      [0, 0.24, 0.00],  // Furry Thorax center
      [0, 0.23, 0.04],  // Abdomen base
      [0, 0.22, 0.08],  // Abdomen mid
      [0, 0.21, 0.12],  // Glowing lantern tip
    ],
    radii: [
      [0.016, 0.016], // Head
      [0.022, 0.020], // Thorax front
      [0.026, 0.024], // Thorax core
      [0.020, 0.018], // Abdomen 1
      [0.016, 0.014], // Abdomen 2
      [0.008, 0.008], // Lantern tip
    ],
    radialSegments: 12,
    uvVRange: [0.0, 0.4],
  });

  // 2. Feathery Antennae (Pair of curved bipinnate plumes)
  function makeAntenna(sign) {
    return buildLoftedTube({
      points: [
        [sign * 0.008, 0.26, -0.06],
        [sign * 0.020, 0.28, -0.08],
        [sign * 0.035, 0.30, -0.09],
      ],
      radii: [
        [0.003, 0.003],
        [0.008, 0.004], // Feathered plume
        [0.002, 0.002], // Tip
      ],
      radialSegments: 8,
      uvVRange: [0.4, 0.5],
    });
  }

  const antL = makeAntenna(1);
  const antR = makeAntenna(-1);

  // 3. Stained-Glass Forewings & Hindwings (Luna Moth Swallowtails)
  // Forewing: Triangular broad wing x: 0.02 to 0.14
  function makeForewing(sign) {
    const spanSteps = 8;
    const chordSteps = 6;
    const verts = [];
    const norms = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= spanSteps; i++) {
      const spanFrac = i / spanSteps; // 0 = base, 1 = tip
      const x = sign * (0.02 + spanFrac * 0.12); // Spans to 0.14m
      const sweepZ = -0.01 - spanFrac * 0.04;
      const chord = 0.09 * (1.0 - spanFrac * 0.4);

      for (let j = 0; j <= chordSteps; j++) {
        const chordFrac = j / chordSteps; // 0 = leading, 1 = trailing
        const z = sweepZ + chordFrac * chord;
        const y = 0.25 - 0.015 * (spanFrac ** 2);

        verts.push(x, y, z);
        norms.push(0, 1, 0);
        uvs.push(0.5 + 0.5 * spanFrac, 0.5 + 0.5 * chordFrac);
      }
    }

    for (let i = 0; i < spanSteps; i++) {
      for (let j = 0; j < chordSteps; j++) {
        const a = i * (chordSteps + 1) + j;
        const b = (i + 1) * (chordSteps + 1) + j;
        const c = (i + 1) * (chordSteps + 1) + (j + 1);
        const d = i * (chordSteps + 1) + (j + 1);

        if (sign > 0) {
          indices.push(a, b, d);
          indices.push(b, c, d);
        } else {
          indices.push(a, d, b);
          indices.push(b, d, c);
        }
      }
    }

    return { vertices: verts, normals: norms, uvs, indices };
  }

  // Hindwing with Luna trailing tail streamer
  function makeHindwing(sign) {
    const spanSteps = 6;
    const chordSteps = 4;
    const verts = [];
    const norms = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= spanSteps; i++) {
      const spanFrac = i / spanSteps;
      const x = sign * (0.015 + spanFrac * 0.07);
      const sweepZ = 0.03 + spanFrac * 0.08; // Trailing tail
      const chord = 0.05 * (1.0 - spanFrac * 0.7);

      for (let j = 0; j <= chordSteps; j++) {
        const chordFrac = j / chordSteps;
        const z = sweepZ + chordFrac * chord;
        const y = 0.24 - 0.02 * spanFrac;

        verts.push(x, y, z);
        norms.push(0, 1, 0);
        uvs.push(0.5 + 0.4 * spanFrac, 0.1 + 0.4 * chordFrac);
      }
    }

    for (let i = 0; i < spanSteps; i++) {
      for (let j = 0; j < chordSteps; j++) {
        const a = i * (chordSteps + 1) + j;
        const b = (i + 1) * (chordSteps + 1) + j;
        const c = (i + 1) * (chordSteps + 1) + (j + 1);
        const d = i * (chordSteps + 1) + (j + 1);

        if (sign > 0) {
          indices.push(a, b, d);
          indices.push(b, c, d);
        } else {
          indices.push(a, d, b);
          indices.push(b, d, c);
        }
      }
    }

    return { vertices: verts, normals: norms, uvs, indices };
  }

  const fwL = makeForewing(1);
  const fwR = makeForewing(-1);
  const hwL = makeHindwing(1);
  const hwR = makeHindwing(-1);

  const mothMesh = mergeGeometries([body, antL, antR, fwL, fwR, hwL, hwR]);
  const numVerts = mothMesh.vertices.length / 3;
  console.log(`Moth Mesh: ${numVerts} vertices, ${mothMesh.indices.length / 3} triangles`);

  // 4. Rig Hierarchy (10 bones)
  const MOTH_BONES = [
    { name: 'Thorax', parent: null, pos: [0, 0.24, 0.00] },
    { name: 'Head', parent: 'Thorax', pos: [0, 0.25, -0.05] },
    { name: 'Antenna_L', parent: 'Head', pos: [0.015, 0.27, -0.07] },
    { name: 'Antenna_R', parent: 'Head', pos: [-0.015, 0.27, -0.07] },
    { name: 'Abdomen_1', parent: 'Thorax', pos: [0, 0.23, 0.04] },
    { name: 'Abdomen_2', parent: 'Abdomen_1', pos: [0, 0.21, 0.09] },
    { name: 'Forewing_L', parent: 'Thorax', pos: [0.02, 0.25, -0.01] },
    { name: 'Forewing_R', parent: 'Thorax', pos: [-0.02, 0.25, -0.01] },
    { name: 'Hindwing_L', parent: 'Thorax', pos: [0.015, 0.24, 0.03] },
    { name: 'Hindwing_R', parent: 'Thorax', pos: [-0.015, 0.24, 0.03] },
  ];

  // 5. Skin Weights
  const joints0 = new Uint16Array(numVerts * 4);
  const weights0 = new Float32Array(numVerts * 4);

  for (let i = 0; i < numVerts; i++) {
    const x = mothMesh.vertices[i * 3];
    const y = mothMesh.vertices[i * 3 + 1];
    const z = mothMesh.vertices[i * 3 + 2];

    if (Math.abs(x) > 0.02) {
      if (z > 0.04) {
        // Hindwing
        joints0[i * 4] = x > 0 ? 8 : 9; weights0[i * 4] = 1.0;
      } else {
        // Forewing
        joints0[i * 4] = x > 0 ? 6 : 7; weights0[i * 4] = 1.0;
      }
    } else if (z < -0.05) {
      if (y > 0.26) {
        // Antenna
        joints0[i * 4] = x > 0 ? 2 : 3; weights0[i * 4] = 1.0;
      } else {
        // Head
        joints0[i * 4] = 1; weights0[i * 4] = 1.0;
      }
    } else if (z > 0.07) {
      // Abdomen 2 (lantern)
      joints0[i * 4] = 5; weights0[i * 4] = 0.85;
      joints0[i * 4 + 1] = 4; weights0[i * 4 + 1] = 0.15;
    } else if (z > 0.02) {
      // Abdomen 1
      joints0[i * 4] = 4; weights0[i * 4] = 0.8;
      joints0[i * 4 + 1] = 0; weights0[i * 4 + 1] = 0.2;
    } else {
      // Thorax
      joints0[i * 4] = 0; weights0[i * 4] = 1.0;
    }
  }

  // 6. Inverse Bind Matrices
  const ibmArray = new Float32Array(MOTH_BONES.length * 16);
  for (let i = 0; i < MOTH_BONES.length; i++) {
    const b = MOTH_BONES[i];
    const m = new THREE.Matrix4().makeTranslation(b.pos[0], b.pos[1], b.pos[2]);
    const inv = new THREE.Matrix4().copy(m).invert();
    ibmArray.set(inv.elements, i * 16);
  }

  // 7. Procedural Stained-Glass & Bioluminescent Textures
  const size = 512;
  const baseColor = createPNG(size, size, (u, v) => {
    // Wings: Translucent mint / luna green with iridescent veins
    if (u > 0.5) {
      const vein = Math.sin(u * Math.PI * 24 + v * 16);
      if (Math.abs(vein) > 0.8) return [30, 255, 180, 255]; // Neon cyan vein
      return [40, 160, 110, 220]; // Emerald luna wing
    }
    // Abdomen lantern tip (v < 0.2 && u < 0.2)
    if (v < 0.15 && u < 0.25) return [50, 255, 150, 255];
    // Thorax fur
    return [240, 225, 190, 255]; // Creamy silk moth fur
  });

  const mr = createPNG(size, size, (u, v) => {
    if (u > 0.5) return [0, 80, 160, 255]; // Shiny stained glass
    return [0, 220, 10, 255]; // Matte fur
  });

  const norm = createPNG(size, size, () => [128, 128, 255, 255]);

  const emissive = createPNG(size, size, (u, v) => {
    // Glowing stained glass veins
    if (u > 0.5) {
      const vein = Math.sin(u * Math.PI * 24 + v * 16);
      if (Math.abs(vein) > 0.8) return [30, 255, 180, 255];
    }
    // Bioluminescent lantern abdomen
    if (v < 0.15 && u < 0.25) return [60, 255, 160, 255];
    return [0, 0, 0, 255];
  });

  // 8. Assemble glTF Document
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene('Scene');

  const baseColorTex = doc.createTexture('BaseColor').setImage(baseColor).setMimeType('image/png');
  const mrTex = doc.createTexture('MetallicRoughness').setImage(mr).setMimeType('image/png');
  const normalTex = doc.createTexture('Normal').setImage(norm).setMimeType('image/png');
  const emissiveTex = doc.createTexture('Emissive').setImage(emissive).setMimeType('image/png');

  const material = doc.createMaterial('M_FireflyMoth')
    .setBaseColorTexture(baseColorTex)
    .setMetallicRoughnessTexture(mrTex)
    .setNormalTexture(normalTex)
    .setEmissiveTexture(emissiveTex)
    .setEmissiveFactor([1.0, 1.0, 1.0])
    .setRoughnessFactor(0.4)
    .setMetallicFactor(0.3);

  const posAcc = doc.createAccessor('POSITION').setArray(new Float32Array(mothMesh.vertices)).setType('VEC3').setBuffer(buffer);
  const normAcc = doc.createAccessor('NORMAL').setArray(new Float32Array(mothMesh.normals)).setType('VEC3').setBuffer(buffer);
  const uvAcc = doc.createAccessor('TEXCOORD_0').setArray(new Float32Array(mothMesh.uvs)).setType('VEC2').setBuffer(buffer);
  const jointsAcc = doc.createAccessor('JOINTS_0').setArray(joints0).setType('VEC4').setBuffer(buffer);
  const weightsAcc = doc.createAccessor('WEIGHTS_0').setArray(weights0).setType('VEC4').setBuffer(buffer);
  const indicesAcc = doc.createAccessor('INDICES').setArray(new Uint32Array(mothMesh.indices)).setType('SCALAR').setBuffer(buffer);

  const prim = doc.createPrimitive()
    .setAttribute('POSITION', posAcc)
    .setAttribute('NORMAL', normAcc)
    .setAttribute('TEXCOORD_0', uvAcc)
    .setAttribute('JOINTS_0', jointsAcc)
    .setAttribute('WEIGHTS_0', weightsAcc)
    .setIndices(indicesAcc)
    .setMaterial(material);

  const mesh = doc.createMesh('FireflyMoth_Mesh').addPrimitive(prim);

  const boneNodeMap = new Map();
  for (const b of MOTH_BONES) {
    boneNodeMap.set(b.name, doc.createNode(b.name));
  }

  for (const b of MOTH_BONES) {
    const node = boneNodeMap.get(b.name);
    if (b.parent) {
      const parentNode = boneNodeMap.get(b.parent);
      const parentBone = MOTH_BONES.find(x => x.name === b.parent);
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
  const skin = doc.createSkin('Moth_Skin').setInverseBindMatrices(ibmAcc);
  for (const b of MOTH_BONES) {
    skin.addJoint(boneNodeMap.get(b.name));
  }

  const meshNode = doc.createNode('Moth_Model').setMesh(mesh).setSkin(skin);
  scene.addChild(meshNode);

  // 9. Synthesize Animation Clips (fly, hover, rest)
  console.log(`>>> Synthesizing Moth Animation Clips: fly, hover, rest...`);

  function addRotChannel(anim, node, times, quatVals, name) {
    const tAcc = doc.createAccessor(name + '_T').setArray(times).setType('SCALAR').setBuffer(buffer);
    const qAcc = doc.createAccessor(name + '_Q').setArray(quatVals).setType('VEC4').setBuffer(buffer);
    const samp = doc.createAnimationSampler().setInput(tAcc).setOutput(qAcc).setInterpolation('LINEAR');
    const chan = doc.createAnimationChannel().setTargetNode(node).setTargetPath('rotation').setSampler(samp);
    anim.addSampler(samp);
    anim.addChannel(chan);
  }

  // Clip 1: 'fly' (Rapid flutter cycle with coupled abdomen bobbing)
  {
    const duration = 0.6;
    const frameCount = 25;
    const times = new Float32Array(frameCount);
    for (let i = 0; i < frameCount; i++) times[i] = (i / (frameCount - 1)) * duration;

    const flyAnim = doc.createAnimation('fly');
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();

    const fwL = boneNodeMap.get('Forewing_L');
    const fwR = boneNodeMap.get('Forewing_R');
    const qFwL = new Float32Array(frameCount * 4);
    const qFwR = new Float32Array(frameCount * 4);

    const ab2 = boneNodeMap.get('Abdomen_2');
    const qAb2 = new Float32Array(frameCount * 4);

    for (let i = 0; i < frameCount; i++) {
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      // High frequency wing stroke (flutter 3 full strokes per loop)
      const flap = Math.sin(phase * 3) * 0.75;

      euler.set(0, 0, flap); quat.setFromEuler(euler);
      qFwL[i * 4] = quat.x; qFwL[i * 4 + 1] = quat.y; qFwL[i * 4 + 2] = quat.z; qFwL[i * 4 + 3] = quat.w;

      euler.set(0, 0, -flap); quat.setFromEuler(euler);
      qFwR[i * 4] = quat.x; qFwR[i * 4 + 1] = quat.y; qFwR[i * 4 + 2] = quat.z; qFwR[i * 4 + 3] = quat.w;

      // Abdomen bobbing in opposite phase
      euler.set(Math.sin(phase * 3 - Math.PI * 0.5) * 0.25, 0, 0); quat.setFromEuler(euler);
      qAb2[i * 4] = quat.x; qAb2[i * 4 + 1] = quat.y; qAb2[i * 4 + 2] = quat.z; qAb2[i * 4 + 3] = quat.w;
    }

    addRotChannel(flyAnim, fwL, times, qFwL, 'fly_FwL');
    addRotChannel(flyAnim, fwR, times, qFwR, 'fly_FwR');
    addRotChannel(flyAnim, ab2, times, qAb2, 'fly_Ab2');
  }

  // Clip 2: 'hover' (Fast figure-8 wing hum in place)
  {
    const duration = 0.4;
    const frameCount = 21;
    const times = new Float32Array(frameCount);
    for (let i = 0; i < frameCount; i++) times[i] = (i / (frameCount - 1)) * duration;

    const hoverAnim = doc.createAnimation('hover');
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();

    const fwL = boneNodeMap.get('Forewing_L');
    const fwR = boneNodeMap.get('Forewing_R');
    const qFwL = new Float32Array(frameCount * 4);
    const qFwR = new Float32Array(frameCount * 4);

    for (let i = 0; i < frameCount; i++) {
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      const flap = Math.sin(phase * 2) * 0.45;
      const pitch = Math.cos(phase * 2) * 0.25;

      euler.set(pitch, 0, flap); quat.setFromEuler(euler);
      qFwL[i * 4] = quat.x; qFwL[i * 4 + 1] = quat.y; qFwL[i * 4 + 2] = quat.z; qFwL[i * 4 + 3] = quat.w;

      euler.set(pitch, 0, -flap); quat.setFromEuler(euler);
      qFwR[i * 4] = quat.x; qFwR[i * 4 + 1] = quat.y; qFwR[i * 4 + 2] = quat.z; qFwR[i * 4 + 3] = quat.w;
    }

    addRotChannel(hoverAnim, fwL, times, qFwL, 'hover_FwL');
    addRotChannel(hoverAnim, fwR, times, qFwR, 'hover_FwR');
  }

  // Clip 3: 'rest' (Perched gentle respiratory wing open/close)
  {
    const duration = 2.0;
    const frameCount = 41;
    const times = new Float32Array(frameCount);
    for (let i = 0; i < frameCount; i++) times[i] = (i / (frameCount - 1)) * duration;

    const restAnim = doc.createAnimation('rest');
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();

    const fwL = boneNodeMap.get('Forewing_L');
    const fwR = boneNodeMap.get('Forewing_R');
    const qFwL = new Float32Array(frameCount * 4);
    const qFwR = new Float32Array(frameCount * 4);

    for (let i = 0; i < frameCount; i++) {
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      // Gentle breathing flex
      const flex = Math.sin(phase) * 0.12;

      euler.set(0, 0, flex); quat.setFromEuler(euler);
      qFwL[i * 4] = quat.x; qFwL[i * 4 + 1] = quat.y; qFwL[i * 4 + 2] = quat.z; qFwL[i * 4 + 3] = quat.w;

      euler.set(0, 0, -flex); quat.setFromEuler(euler);
      qFwR[i * 4] = quat.x; qFwR[i * 4 + 1] = quat.y; qFwR[i * 4 + 2] = quat.z; qFwR[i * 4 + 3] = quat.w;
    }

    addRotChannel(restAnim, fwL, times, qFwL, 'rest_FwL');
    addRotChannel(restAnim, fwR, times, qFwR, 'rest_FwR');
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
    triangles: mothMesh.indices.length / 3,
    bones: MOTH_BONES.length,
    clips: ['fly', 'hover', 'rest'],
  };
}

if (process.argv[1] && process.argv[1].endsWith('build-firefly-moth.mjs')) {
  buildFireflyMoth().catch(err => {
    console.error('Firefly moth build failed:', err);
    process.exit(1);
  });
}

