import fs from 'fs';
import path from 'path';
import { Document, NodeIO } from '@gltf-transform/core';
import * as THREE from 'three';
import { PNG } from 'pngjs';
import { buildLoftedTube, mergeGeometries } from './glb-builder.mjs';

/**
 * Procedural Bird of Prey / Solar Desert Hawk Builder for Playa Art.
 * Wingspan: 2.1m
 * Majestic raptor with obsidian/bronze plumage, hooked beak, sharp talons,
 * radiant solar-gold glowing feather tips and eyes.
 * Clips:
 *   - soar (thermal glide with wingtip feather flex and tail trim)
 *   - flap (powerful figure-eight flapping flight cycle)
 *   - land (flare-back airbrake posture with talons thrust forward)
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

export async function buildBirdOfPrey(outPath = 'characters/bird_of_prey/bird_of_prey.glb') {
  console.log(`\n======================================================`);
  console.log(`>>> SCULPTING MAJESTIC RAPTOR: [bird_of_prey] (2.1m wingspan)`);
  console.log(`======================================================`);

  // 1. Aerodynamic Raptor Body & Head
  const body = buildLoftedTube({
    points: [
      [0, 1.08, -0.35], // Hooked beak tip
      [0, 1.10, -0.28], // Head / Brow
      [0, 1.06, -0.15], // Throat / Neck
      [0, 1.02, 0.00],  // Breast / Core
      [0, 0.99, 0.20],  // Flank
      [0, 0.98, 0.38],  // Tail root
    ],
    radii: [
      [0.02, 0.04],  // Beak
      [0.07, 0.08],  // Head
      [0.08, 0.09],  // Neck
      [0.12, 0.14],  // Chest
      [0.09, 0.11],  // Flank
      [0.05, 0.05],  // Tail root
    ],
    radialSegments: 16,
    uvVRange: [0.3, 0.7],
  });

  // 2. Wings (Articulated Aerodynamic Planform)
  // Left wing extends x: +0.10 to +1.05 (span 1.05m each side = 2.1m total)
  function makeWing(sign) {
    const spanSteps = 16;
    const chordSteps = 8;
    const verts = [];
    const norms = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= spanSteps; i++) {
      const spanFrac = i / spanSteps; // 0 = shoulder, 1 = wingtip
      const x = sign * (0.10 + spanFrac * 0.95);

      // Wing planform sweep & chord
      const sweepZ = spanFrac * 0.18;
      const chord = 0.38 * (1.0 - spanFrac * 0.65); // Tapers toward tip
      const camber = Math.sin(spanFrac * Math.PI) * 0.02; // Aerofoil arch

      for (let j = 0; j <= chordSteps; j++) {
        const chordFrac = j / chordSteps; // 0 = leading edge, 1 = trailing feathers
        const z = sweepZ + (chordFrac - 0.25) * chord;
        const aerofoilY = 1.02 + camber - 0.03 * (chordFrac ** 2);

        verts.push(x, aerofoilY, z);
        norms.push(0, 1, 0);
        uvs.push(spanFrac, chordFrac);
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

  const wingL = makeWing(1);
  const wingR = makeWing(-1);

  // 3. Tail Fan (Broad wedge of solar flight feathers)
  function makeTailFan() {
    const fanSteps = 10;
    const verts = [];
    const norms = [];
    const uvs = [];
    const indices = [];

    const rootZ = 0.38;
    const tipZ = 0.68;
    const rootWidth = 0.08;
    const tipWidth = 0.34;

    for (let i = 0; i <= fanSteps; i++) {
      const frac = i / fanSteps;
      const z = rootZ + frac * (tipZ - rootZ);
      const halfW = (rootWidth + frac * (tipWidth - rootWidth)) * 0.5;
      const y = 0.98 - frac * 0.04;

      verts.push(-halfW, y, z);
      norms.push(0, 1, 0);
      uvs.push(0, frac);

      verts.push(0, y + 0.005, z);
      norms.push(0, 1, 0);
      uvs.push(0.5, frac);

      verts.push(halfW, y, z);
      norms.push(0, 1, 0);
      uvs.push(1, frac);
    }

    for (let i = 0; i < fanSteps; i++) {
      const r0 = i * 3;
      const r1 = (i + 1) * 3;
      indices.push(r0, r1, r0 + 1);
      indices.push(r1, r1 + 1, r0 + 1);
      indices.push(r0 + 1, r1 + 1, r0 + 2);
      indices.push(r1 + 1, r1 + 2, r0 + 2);
    }

    return { vertices: verts, normals: norms, uvs, indices };
  }

  const tailFan = makeTailFan();

  // 4. Talons / Raptor Legs
  function makeTalonLeg(sign) {
    return buildLoftedTube({
      points: [
        [sign * 0.08, 0.96, 0.08],
        [sign * 0.07, 0.88, 0.12], // Knee
        [sign * 0.06, 0.78, 0.14], // Tarsus ankle
        [sign * 0.06, 0.75, 0.08], // Talon cluster
      ],
      radii: [
        [0.035, 0.035],
        [0.025, 0.025],
        [0.018, 0.018],
        [0.025, 0.035],
      ],
      radialSegments: 10,
      uvVRange: [0.0, 0.3],
    });
  }

  const legL = makeTalonLeg(1);
  const legR = makeTalonLeg(-1);

  const hawkMesh = mergeGeometries([body, wingL, wingR, tailFan, legL, legR]);
  const numVerts = hawkMesh.vertices.length / 3;
  console.log(`Raptor Mesh: ${numVerts} vertices, ${hawkMesh.indices.length / 3} triangles`);

  // 5. Rig Hierarchy (15 bones)
  const HAWK_BONES = [
    { name: 'Root', parent: null, pos: [0, 1.02, 0.00] },
    { name: 'Spine', parent: 'Root', pos: [0, 1.00, 0.18] },
    { name: 'Tail_Fan', parent: 'Spine', pos: [0, 0.98, 0.38] },
    { name: 'Neck', parent: 'Root', pos: [0, 1.06, -0.15] },
    { name: 'Head', parent: 'Neck', pos: [0, 1.10, -0.28] },

    // Left Wing
    { name: 'Wing_L_Shoulder', parent: 'Root', pos: [0.12, 1.02, -0.05] },
    { name: 'Wing_L_Arm', parent: 'Wing_L_Shoulder', pos: [0.38, 1.03, -0.02] },
    { name: 'Wing_L_Forearm', parent: 'Wing_L_Arm', pos: [0.72, 1.02, 0.05] },
    { name: 'Wing_L_Hand', parent: 'Wing_L_Forearm', pos: [1.05, 1.00, 0.15] },

    // Right Wing
    { name: 'Wing_R_Shoulder', parent: 'Root', pos: [-0.12, 1.02, -0.05] },
    { name: 'Wing_R_Arm', parent: 'Wing_R_Shoulder', pos: [-0.38, 1.03, -0.02] },
    { name: 'Wing_R_Forearm', parent: 'Wing_R_Arm', pos: [-0.72, 1.02, 0.05] },
    { name: 'Wing_R_Hand', parent: 'Wing_R_Forearm', pos: [-1.05, 1.00, 0.15] },

    // Legs / Talons
    { name: 'Leg_L_Thigh', parent: 'Root', pos: [0.08, 0.96, 0.08] },
    { name: 'Leg_R_Thigh', parent: 'Root', pos: [-0.08, 0.96, 0.08] },
  ];

  // 6. Skin Weights (4-bone blend)
  const joints0 = new Uint16Array(numVerts * 4);
  const weights0 = new Float32Array(numVerts * 4);

  for (let i = 0; i < numVerts; i++) {
    const x = hawkMesh.vertices[i * 3];
    const y = hawkMesh.vertices[i * 3 + 1];
    const z = hawkMesh.vertices[i * 3 + 2];

    if (Math.abs(x) > 0.12) {
      // Wings
      const isLeft = x > 0;
      const ax = Math.abs(x);
      const bOffset = isLeft ? 5 : 9; // Wing Shoulder base index

      if (ax > 0.75) {
        // Wing Hand / Primaries
        joints0[i * 4] = bOffset + 3; weights0[i * 4] = 0.8;
        joints0[i * 4 + 1] = bOffset + 2; weights0[i * 4 + 1] = 0.2;
      } else if (ax > 0.40) {
        // Forearm
        joints0[i * 4] = bOffset + 2; weights0[i * 4] = 0.7;
        joints0[i * 4 + 1] = bOffset + 1; weights0[i * 4 + 1] = 0.3;
      } else {
        // Arm / Shoulder
        joints0[i * 4] = bOffset + 1; weights0[i * 4] = 0.6;
        joints0[i * 4 + 1] = bOffset; weights0[i * 4 + 1] = 0.4;
      }
    } else if (z > 0.35) {
      // Tail fan
      joints0[i * 4] = 2; weights0[i * 4] = 0.85; // Tail_Fan
      joints0[i * 4 + 1] = 1; weights0[i * 4 + 1] = 0.15; // Spine
    } else if (z < -0.20) {
      // Head
      joints0[i * 4] = 4; weights0[i * 4] = 0.85; // Head
      joints0[i * 4 + 1] = 3; weights0[i * 4 + 1] = 0.15; // Neck
    } else if (y < 0.90) {
      // Legs
      joints0[i * 4] = x > 0 ? 13 : 14; weights0[i * 4] = 0.9;
      joints0[i * 4 + 1] = 0; weights0[i * 4 + 1] = 0.1;
    } else {
      // Core Body
      joints0[i * 4] = 0; weights0[i * 4] = 0.7;
      joints0[i * 4 + 1] = 1; weights0[i * 4 + 1] = 0.3;
    }
  }

  // 7. Inverse Bind Matrices
  const ibmArray = new Float32Array(HAWK_BONES.length * 16);
  for (let i = 0; i < HAWK_BONES.length; i++) {
    const b = HAWK_BONES[i];
    const m = new THREE.Matrix4().makeTranslation(b.pos[0], b.pos[1], b.pos[2]);
    const inv = new THREE.Matrix4().copy(m).invert();
    ibmArray.set(inv.elements, i * 16);
  }

  // 8. Bake Procedural PBR + Solar Emissive Textures
  // Obsidian + bronze feathered plumage, radiant solar gold feather tips and piercing eyes
  const size = 512;
  const baseColor = createPNG(size, size, (u, v) => {
    // Trailing edge feather tips (v > 0.85 or u > 0.85)
    if (v > 0.82 || u > 0.85) {
      return [255, 180, 20, 255]; // Radiant solar gold
    }
    // Head / Eye region
    if (u < 0.15 && v < 0.25) {
      if (v > 0.10 && v < 0.18) return [255, 220, 40, 255]; // Golden raptor eye
      return [20, 18, 22, 255]; // Obsidian beak / brow
    }
    // Obsidian / Bronze feather banding
    const band = Math.sin(u * Math.PI * 18 + v * 12);
    if (band > 0.2) return [140, 95, 45, 255]; // Warm bronze feather
    return [28, 24, 30, 255]; // Obsidian feather base
  });

  const mr = createPNG(size, size, (u, v) => {
    // Feather tips are slightly metallic / specular
    if (v > 0.82 || u > 0.85) return [0, 120, 180, 255];
    return [0, 190, 40, 255];
  });

  const norm = createPNG(size, size, (u, v) => {
    // Tangent feather quills
    const q = Math.sin(u * Math.PI * 32);
    const ny = Math.round(128 + q * 30);
    return [128, ny, 255, 255];
  });

  const emissive = createPNG(size, size, (u, v) => {
    // Glowing solar feather tips
    if (v > 0.85 || u > 0.88) {
      return [255, 170, 0, 255]; // Vivid solar gold glow
    }
    // Piercing eyes
    if (u < 0.15 && v > 0.10 && v < 0.18) {
      return [255, 230, 60, 255];
    }
    return [0, 0, 0, 255];
  });

  // 9. Assemble glTF Document
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene('Scene');

  const baseColorTex = doc.createTexture('BaseColor').setImage(baseColor).setMimeType('image/png');
  const mrTex = doc.createTexture('MetallicRoughness').setImage(mr).setMimeType('image/png');
  const normalTex = doc.createTexture('Normal').setImage(norm).setMimeType('image/png');
  const emissiveTex = doc.createTexture('Emissive').setImage(emissive).setMimeType('image/png');

  const material = doc.createMaterial('M_SolarHawk')
    .setBaseColorTexture(baseColorTex)
    .setMetallicRoughnessTexture(mrTex)
    .setNormalTexture(normalTex)
    .setEmissiveTexture(emissiveTex)
    .setEmissiveFactor([1.0, 1.0, 1.0])
    .setRoughnessFactor(0.7)
    .setMetallicFactor(0.2);

  const posAcc = doc.createAccessor('POSITION').setArray(new Float32Array(hawkMesh.vertices)).setType('VEC3').setBuffer(buffer);
  const normAcc = doc.createAccessor('NORMAL').setArray(new Float32Array(hawkMesh.normals)).setType('VEC3').setBuffer(buffer);
  const uvAcc = doc.createAccessor('TEXCOORD_0').setArray(new Float32Array(hawkMesh.uvs)).setType('VEC2').setBuffer(buffer);
  const jointsAcc = doc.createAccessor('JOINTS_0').setArray(joints0).setType('VEC4').setBuffer(buffer);
  const weightsAcc = doc.createAccessor('WEIGHTS_0').setArray(weights0).setType('VEC4').setBuffer(buffer);
  const indicesAcc = doc.createAccessor('INDICES').setArray(new Uint32Array(hawkMesh.indices)).setType('SCALAR').setBuffer(buffer);

  const prim = doc.createPrimitive()
    .setAttribute('POSITION', posAcc)
    .setAttribute('NORMAL', normAcc)
    .setAttribute('TEXCOORD_0', uvAcc)
    .setAttribute('JOINTS_0', jointsAcc)
    .setAttribute('WEIGHTS_0', weightsAcc)
    .setIndices(indicesAcc)
    .setMaterial(material);

  const mesh = doc.createMesh('BirdOfPrey_Mesh').addPrimitive(prim);

  const boneNodeMap = new Map();
  for (const b of HAWK_BONES) {
    boneNodeMap.set(b.name, doc.createNode(b.name));
  }

  for (const b of HAWK_BONES) {
    const node = boneNodeMap.get(b.name);
    if (b.parent) {
      const parentNode = boneNodeMap.get(b.parent);
      const parentBone = HAWK_BONES.find(x => x.name === b.parent);
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
  const skin = doc.createSkin('Hawk_Skin').setInverseBindMatrices(ibmAcc);
  for (const b of HAWK_BONES) {
    skin.addJoint(boneNodeMap.get(b.name));
  }

  const meshNode = doc.createNode('Hawk_Model').setMesh(mesh).setSkin(skin);
  scene.addChild(meshNode);

  // 10. Synthesize Animation Clips (soar, flap, land)
  console.log(`>>> Synthesizing Raptor Flight Clips: soar, flap, land...`);

  // Helper to add rotation channel
  function addRotChannel(anim, node, times, quatVals, name) {
    const tAcc = doc.createAccessor(name + '_T').setArray(times).setType('SCALAR').setBuffer(buffer);
    const qAcc = doc.createAccessor(name + '_Q').setArray(quatVals).setType('VEC4').setBuffer(buffer);
    const samp = doc.createAnimationSampler().setInput(tAcc).setOutput(qAcc).setInterpolation('LINEAR');
    const chan = doc.createAnimationChannel().setTargetNode(node).setTargetPath('rotation').setSampler(samp);
    anim.addSampler(samp);
    anim.addChannel(chan);
  }

  // Clip 1: 'soar' (Majestic thermal glide, wings holding dihedral with subtle wingtip flex)
  {
    const duration = 3.0;
    const frameCount = 61;
    const times = new Float32Array(frameCount);
    for (let i = 0; i < frameCount; i++) times[i] = (i / (frameCount - 1)) * duration;

    const soarAnim = doc.createAnimation('soar');
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();

    // Wingtips flex gently with thermal updrafts
    const handL = boneNodeMap.get('Wing_L_Hand');
    const handR = boneNodeMap.get('Wing_R_Hand');
    const qL = new Float32Array(frameCount * 4);
    const qR = new Float32Array(frameCount * 4);

    for (let i = 0; i < frameCount; i++) {
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      // Dihedral twist
      const tipPitch = Math.sin(phase) * 0.08;
      const tipRoll = Math.sin(phase * 2) * 0.05;

      euler.set(tipPitch, 0, tipRoll); quat.setFromEuler(euler);
      qL[i * 4] = quat.x; qL[i * 4 + 1] = quat.y; qL[i * 4 + 2] = quat.z; qL[i * 4 + 3] = quat.w;

      euler.set(tipPitch, 0, -tipRoll); quat.setFromEuler(euler);
      qR[i * 4] = quat.x; qR[i * 4 + 1] = quat.y; qR[i * 4 + 2] = quat.z; qR[i * 4 + 3] = quat.w;
    }
    addRotChannel(soarAnim, handL, times, qL, 'soar_HandL');
    addRotChannel(soarAnim, handR, times, qR, 'soar_HandR');

    // Tail rudder adjustment
    const tailNode = boneNodeMap.get('Tail_Fan');
    const qTail = new Float32Array(frameCount * 4);
    for (let i = 0; i < frameCount; i++) {
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      euler.set(0, Math.sin(phase) * 0.08, Math.cos(phase) * 0.04);
      quat.setFromEuler(euler);
      qTail[i * 4] = quat.x; qTail[i * 4 + 1] = quat.y; qTail[i * 4 + 2] = quat.z; qTail[i * 4 + 3] = quat.w;
    }
    addRotChannel(soarAnim, tailNode, times, qTail, 'soar_Tail');
  }

  // Clip 2: 'flap' (Powerful figure-eight wing strokes with downstroke push & upstroke wrist tuck)
  {
    const duration = 1.0;
    const frameCount = 31;
    const times = new Float32Array(frameCount);
    for (let i = 0; i < frameCount; i++) times[i] = (i / (frameCount - 1)) * duration;

    const flapAnim = doc.createAnimation('flap');
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();

    const armL = boneNodeMap.get('Wing_L_Arm');
    const armR = boneNodeMap.get('Wing_R_Arm');
    const faL = boneNodeMap.get('Wing_L_Forearm');
    const faR = boneNodeMap.get('Wing_R_Forearm');

    const qArmL = new Float32Array(frameCount * 4);
    const qArmR = new Float32Array(frameCount * 4);
    const qFaL = new Float32Array(frameCount * 4);
    const qFaR = new Float32Array(frameCount * 4);

    for (let i = 0; i < frameCount; i++) {
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      // Wingbeat: -0.45 down to +0.35 up
      const flapAngle = Math.sin(phase) * 0.45;
      const foldAngle = Math.max(0, -Math.sin(phase)) * 0.35; // Tuck on upstroke

      // Left wing
      euler.set(0, 0, flapAngle); quat.setFromEuler(euler);
      qArmL[i * 4] = quat.x; qArmL[i * 4 + 1] = quat.y; qArmL[i * 4 + 2] = quat.z; qArmL[i * 4 + 3] = quat.w;

      euler.set(-foldAngle * 0.5, 0, flapAngle * 0.6); quat.setFromEuler(euler);
      qFaL[i * 4] = quat.x; qFaL[i * 4 + 1] = quat.y; qFaL[i * 4 + 2] = quat.z; qFaL[i * 4 + 3] = quat.w;

      // Right wing (mirrored roll)
      euler.set(0, 0, -flapAngle); quat.setFromEuler(euler);
      qArmR[i * 4] = quat.x; qArmR[i * 4 + 1] = quat.y; qArmR[i * 4 + 2] = quat.z; qArmR[i * 4 + 3] = quat.w;

      euler.set(-foldAngle * 0.5, 0, -flapAngle * 0.6); quat.setFromEuler(euler);
      qFaR[i * 4] = quat.x; qFaR[i * 4 + 1] = quat.y; qFaR[i * 4 + 2] = quat.z; qFaR[i * 4 + 3] = quat.w;
    }

    addRotChannel(flapAnim, armL, times, qArmL, 'flap_ArmL');
    addRotChannel(flapAnim, armR, times, qArmR, 'flap_ArmR');
    addRotChannel(flapAnim, faL, times, qFaL, 'flap_FaL');
    addRotChannel(flapAnim, faR, times, qFaR, 'flap_FaR');
  }

  // Clip 3: 'land' (Flare-back airbrake posture with talons thrust forward)
  {
    const duration = 2.0;
    const frameCount = 61;
    const times = new Float32Array(frameCount);
    for (let i = 0; i < frameCount; i++) times[i] = (i / (frameCount - 1)) * duration;

    const landAnim = doc.createAnimation('land');
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();

    // Body pitches upward 35 degrees to catch the air
    const rootNode = boneNodeMap.get('Root');
    const qRoot = new Float32Array(frameCount * 4);

    // Wings flare wide and high
    const armL = boneNodeMap.get('Wing_L_Arm');
    const armR = boneNodeMap.get('Wing_R_Arm');
    const qArmL = new Float32Array(frameCount * 4);
    const qArmR = new Float32Array(frameCount * 4);

    // Talons reach forward
    const legL = boneNodeMap.get('Leg_L_Thigh');
    const legR = boneNodeMap.get('Leg_R_Thigh');
    const qLegL = new Float32Array(frameCount * 4);
    const qLegR = new Float32Array(frameCount * 4);

    for (let i = 0; i < frameCount; i++) {
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      const brakeFactor = 0.5 + 0.5 * Math.sin(phase);

      // Pitch up
      euler.set(-0.35 * brakeFactor, 0, 0); quat.setFromEuler(euler);
      qRoot[i * 4] = quat.x; qRoot[i * 4 + 1] = quat.y; qRoot[i * 4 + 2] = quat.z; qRoot[i * 4 + 3] = quat.w;

      // Wings raised high to decelerate
      euler.set(-0.2 * brakeFactor, 0, 0.45 * brakeFactor); quat.setFromEuler(euler);
      qArmL[i * 4] = quat.x; qArmL[i * 4 + 1] = quat.y; qArmL[i * 4 + 2] = quat.z; qArmL[i * 4 + 3] = quat.w;

      euler.set(-0.2 * brakeFactor, 0, -0.45 * brakeFactor); quat.setFromEuler(euler);
      qArmR[i * 4] = quat.x; qArmR[i * 4 + 1] = quat.y; qArmR[i * 4 + 2] = quat.z; qArmR[i * 4 + 3] = quat.w;

      // Legs swung forward
      euler.set(-0.5 * brakeFactor, 0, 0); quat.setFromEuler(euler);
      qLegL[i * 4] = quat.x; qLegL[i * 4 + 1] = quat.y; qLegL[i * 4 + 2] = quat.z; qLegL[i * 4 + 3] = quat.w;
      qLegR[i * 4] = quat.x; qLegR[i * 4 + 1] = quat.y; qLegR[i * 4 + 2] = quat.z; qLegR[i * 4 + 3] = quat.w;
    }

    addRotChannel(landAnim, rootNode, times, qRoot, 'land_Root');
    addRotChannel(landAnim, armL, times, qArmL, 'land_ArmL');
    addRotChannel(landAnim, armR, times, qArmR, 'land_ArmR');
    addRotChannel(landAnim, legL, times, qLegL, 'land_LegL');
    addRotChannel(landAnim, legR, times, qLegR, 'land_LegR');
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
    triangles: hawkMesh.indices.length / 3,
    bones: HAWK_BONES.length,
    clips: ['soar', 'flap', 'land'],
  };
}

if (process.argv[1] && process.argv[1].endsWith('build-bird-of-prey.mjs')) {
  buildBirdOfPrey().catch(err => {
    console.error('Bird of prey build failed:', err);
    process.exit(1);
  });
}

