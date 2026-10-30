import fs from 'fs';
import path from 'path';
import { Document, NodeIO } from '@gltf-transform/core';
import * as THREE from 'three';
import { PNG } from 'pngjs';
import { buildLoftedTube, mergeGeometries } from './glb-builder.mjs';

/**
 * Procedural Festival Mech ("The Scarab Stage") Builder for Playa Art.
 * Height: 3.8m tall heavy walking art-car mech.
 * Weathered brass & blackened steel chassis, embedded subwoofers,
 * glowing geodesic DJ dome, dual sound projector horns, and 4 hydraulic legs.
 * Clips:
 *   - idle (hydraulic suspension breathing bounce + turret pan)
 *   - walk (heavy mechanical quadruped gait with locked footpads)
 *   - rave_mode (pumping bass-drop stage mode with pulsing subwoofers)
 *   - stomp (massive rhythmic bass-drop mechanical leg stomp)
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

export async function buildFestivalMech(outPath = 'characters/festival_mech/festival_mech.glb') {
  console.log(`\n======================================================`);
  console.log(`>>> SCULPTING ART-CAR WALKER: [festival_mech] (3.8m tall)`);
  console.log(`======================================================`);

  // 1. Heavy Central Chassis (y: 1.90 to 2.80) with embedded subwoofers
  const chassis = buildLoftedTube({
    points: [
      [0, 2.00, -1.10], // Front bumper
      [0, 2.15, -0.60], // Subwoofer front bay
      [0, 2.35, 0.00],  // Mid chassis core
      [0, 2.30, 0.70],  // Rear engine bay
      [0, 2.15, 1.20],  // Rear exhaust deck
    ],
    radii: [
      [0.65, 0.35],
      [0.90, 0.50],
      [1.05, 0.60],
      [0.95, 0.55],
      [0.70, 0.40],
    ],
    radialSegments: 16,
    uvVRange: [0.2, 0.6],
  });

  // 2. Geodesic DJ Dome & Turret Deck (y: 2.80 to 3.80)
  const domeRings = 10;
  const domeSlices = 16;
  const domeVerts = [];
  const domeNorms = [];
  const domeUVs = [];
  const domeIndices = [];

  for (let r = 0; r <= domeRings; r++) {
    const frac = r / domeRings;
    const theta = frac * (Math.PI * 0.5);
    const rad = Math.cos(theta) * 0.75;
    const y = 2.80 + Math.sin(theta) * 0.95; // Apex at 3.75m

    for (let s = 0; s <= domeSlices; s++) {
      const u = s / domeSlices;
      const phi = u * Math.PI * 2;
      const x = Math.sin(phi) * rad;
      const z = Math.cos(phi) * rad;

      domeVerts.push(x, y, z);
      domeNorms.push(x / Math.max(1e-4, rad), Math.sin(theta), z / Math.max(1e-4, rad));
      domeUVs.push(u, frac);
    }
  }

  for (let r = 0; r < domeRings; r++) {
    for (let s = 0; s < domeSlices; s++) {
      const a = r * (domeSlices + 1) + s;
      const b = (r + 1) * (domeSlices + 1) + s;
      const c = (r + 1) * (domeSlices + 1) + (s + 1);
      const d = r * (domeSlices + 1) + (s + 1);

      domeIndices.push(a, b, d);
      domeIndices.push(b, c, d);
    }
  }

  const domeMesh = { vertices: domeVerts, normals: domeNorms, uvs: domeUVs, indices: domeIndices };

  // 3. Dual Sound Projector / Laser Horns
  function makeHorn(sign) {
    return buildLoftedTube({
      points: [
        [sign * 0.65, 3.25, 0.10], // Horn base
        [sign * 0.85, 3.45, 0.25], // Horn throat
        [sign * 1.10, 3.65, 0.45], // Horn flare opening
      ],
      radii: [
        [0.12, 0.12],
        [0.18, 0.18],
        [0.32, 0.32],
      ],
      radialSegments: 12,
      uvVRange: [0.6, 0.9],
    });
  }

  const hornL = makeHorn(1);
  const hornR = makeHorn(-1);

  // 4. Heavy Articulated Hydraulic Legs (4 Legs: FL, FR, BL, BR)
  function makeHydraulicLeg(signX, signZ) {
    const hipX = signX * 0.70;
    const hipZ = signZ * 0.75;
    const kneeX = signX * 1.10;
    const kneeZ = signZ * 0.95;
    const footX = signX * 1.30;
    const footZ = signZ * 1.15;

    // Upper thigh hydraulic strut
    const thigh = buildLoftedTube({
      points: [
        [hipX, 2.15, hipZ],
        [(hipX + kneeX) * 0.5, 1.70, (hipZ + kneeZ) * 0.5],
        [kneeX, 1.25, kneeZ],
      ],
      radii: [
        [0.14, 0.14],
        [0.12, 0.12],
        [0.16, 0.16], // Knee joint knuckle
      ],
      radialSegments: 10,
      uvVRange: [0.1, 0.3],
    });

    // Lower shin strut & massive footpad (at y = 0.05)
    const shin = buildLoftedTube({
      points: [
        [kneeX, 1.20, kneeZ],
        [(kneeX + footX) * 0.5, 0.60, (kneeZ + footZ) * 0.5],
        [footX, 0.08, footZ], // Footpad base
      ],
      radii: [
        [0.12, 0.12],
        [0.10, 0.10],
        [0.26, 0.26], // Heavy circular footpad
      ],
      radialSegments: 12,
      uvVRange: [0.0, 0.2],
    });

    return mergeGeometries([thigh, shin]);
  }

  const legFL = makeHydraulicLeg(1, 1);
  const legFR = makeHydraulicLeg(-1, 1);
  const legBL = makeHydraulicLeg(1, -1);
  const legBR = makeHydraulicLeg(-1, -1);

  const mechMesh = mergeGeometries([chassis, domeMesh, hornL, hornR, legFL, legFR, legBL, legBR]);
  const numVerts = mechMesh.vertices.length / 3;
  console.log(`Festival Mech Mesh: ${numVerts} vertices, ${mechMesh.indices.length / 3} triangles`);

  // 5. Rig Hierarchy (16 bones)
  const MECH_BONES = [
    { name: 'Chassis_Root', parent: null, pos: [0, 2.30, 0.00] },
    { name: 'Turret_Deck', parent: 'Chassis_Root', pos: [0, 2.80, 0.00] },
    { name: 'Sound_Horn_L', parent: 'Turret_Deck', pos: [0.65, 3.25, 0.10] },
    { name: 'Sound_Horn_R', parent: 'Turret_Deck', pos: [-0.65, 3.25, 0.10] },

    // Front-Left Leg
    { name: 'FL_Hip', parent: 'Chassis_Root', pos: [0.70, 2.15, 0.75] },
    { name: 'FL_Knee', parent: 'FL_Hip', pos: [1.10, 1.25, 0.95] },
    { name: 'FL_Ankle', parent: 'FL_Knee', pos: [1.30, 0.08, 1.15] },

    // Front-Right Leg
    { name: 'FR_Hip', parent: 'Chassis_Root', pos: [-0.70, 2.15, 0.75] },
    { name: 'FR_Knee', parent: 'FR_Hip', pos: [-1.10, 1.25, 0.95] },
    { name: 'FR_Ankle', parent: 'FR_Knee', pos: [-1.30, 0.08, 1.15] },

    // Back-Left Leg
    { name: 'BL_Hip', parent: 'Chassis_Root', pos: [0.70, 2.15, -0.75] },
    { name: 'BL_Knee', parent: 'BL_Hip', pos: [1.10, 1.25, -0.95] },
    { name: 'BL_Ankle', parent: 'BL_Knee', pos: [1.30, 0.08, -1.15] },

    // Back-Right Leg
    { name: 'BR_Hip', parent: 'Chassis_Root', pos: [-0.70, 2.15, -0.75] },
    { name: 'BR_Knee', parent: 'BR_Hip', pos: [-1.10, 1.25, -0.95] },
    { name: 'BR_Ankle', parent: 'BR_Knee', pos: [-1.30, 0.08, -1.15] },
  ];

  // 6. Skin Weights
  const joints0 = new Uint16Array(numVerts * 4);
  const weights0 = new Float32Array(numVerts * 4);

  for (let i = 0; i < numVerts; i++) {
    const x = mechMesh.vertices[i * 3];
    const y = mechMesh.vertices[i * 3 + 1];
    const z = mechMesh.vertices[i * 3 + 2];

    if (y > 2.75) {
      // Turret Dome & Horns
      if (Math.abs(x) > 0.6 && y > 3.2) {
        joints0[i * 4] = x > 0 ? 2 : 3; weights0[i * 4] = 1.0; // Horns
      } else {
        joints0[i * 4] = 1; weights0[i * 4] = 1.0; // Turret_Deck
      }
    } else if (y < 2.0 && (Math.abs(x) > 0.5 || Math.abs(z) > 0.5)) {
      // Legs
      const isL = x > 0;
      const isF = z > 0;
      let hipIdx = 4;
      if (isL && isF) hipIdx = 4; // FL
      else if (!isL && isF) hipIdx = 7; // FR
      else if (isL && !isF) hipIdx = 10; // BL
      else hipIdx = 13; // BR

      if (y < 0.40) {
        // Ankle / Footpad
        joints0[i * 4] = hipIdx + 2; weights0[i * 4] = 1.0;
      } else if (y < 1.35) {
        // Knee / Shin
        joints0[i * 4] = hipIdx + 1; weights0[i * 4] = 0.8;
        joints0[i * 4 + 1] = hipIdx; weights0[i * 4 + 1] = 0.2;
      } else {
        // Thigh
        joints0[i * 4] = hipIdx; weights0[i * 4] = 1.0;
      }
    } else {
      // Chassis core
      joints0[i * 4] = 0; weights0[i * 4] = 1.0;
    }
  }

  // 7. Inverse Bind Matrices
  const ibmArray = new Float32Array(MECH_BONES.length * 16);
  for (let i = 0; i < MECH_BONES.length; i++) {
    const b = MECH_BONES[i];
    const m = new THREE.Matrix4().makeTranslation(b.pos[0], b.pos[1], b.pos[2]);
    const inv = new THREE.Matrix4().copy(m).invert();
    ibmArray.set(inv.elements, i * 16);
  }

  // 8. Procedural PBR + Neon Geodesic Textures
  const size = 512;
  const baseColor = createPNG(size, size, (u, v) => {
    // Geodesic Dome (v < 0.2): Glowing magenta lattice
    if (v < 0.2) {
      const lattice = Math.sin(u * Math.PI * 16) * Math.cos(v * Math.PI * 12);
      if (Math.abs(lattice) > 0.6) return [255, 0, 180, 255]; // Neon magenta
      return [20, 16, 25, 255]; // Dark tinted acrylic
    }
    // Subwoofer front bay (v > 0.2 && v < 0.45 && u > 0.3 && u < 0.7)
    if (v > 0.2 && v < 0.45 && u > 0.3 && u < 0.7) {
      const ring = Math.sin(Math.hypot(u - 0.5, v - 0.325) * 50);
      if (ring > 0.4) return [0, 240, 255, 255]; // Cyan speaker LED ring
      return [25, 25, 28, 255]; // Matte carbon cone
    }
    // Weathered industrial brass & blackened steel armor
    const panel = Math.sin(u * Math.PI * 8) * Math.sin(v * Math.PI * 8);
    if (panel > 0.2) return [190, 140, 60, 255]; // Burnished brass
    return [45, 48, 52, 255]; // Heavy steel plate
  });

  const mr = createPNG(size, size, (u, v) => {
    if (v < 0.2) return [0, 40, 120, 255]; // Specular acrylic dome
    return [0, 140, 220, 255]; // Metallic steel/brass
  });

  const norm = createPNG(size, size, () => [128, 128, 255, 255]);

  const emissive = createPNG(size, size, (u, v) => {
    // Glowing geodesic dome lattice
    if (v < 0.2) {
      const lattice = Math.sin(u * Math.PI * 16) * Math.cos(v * Math.PI * 12);
      if (Math.abs(lattice) > 0.6) return [255, 0, 180, 255];
    }
    // Glowing cyan subwoofer rings
    if (v > 0.2 && v < 0.45 && u > 0.3 && u < 0.7) {
      const ring = Math.sin(Math.hypot(u - 0.5, v - 0.325) * 50);
      if (ring > 0.5) return [0, 240, 255, 255];
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

  const material = doc.createMaterial('M_ScarabMech')
    .setBaseColorTexture(baseColorTex)
    .setMetallicRoughnessTexture(mrTex)
    .setNormalTexture(normalTex)
    .setEmissiveTexture(emissiveTex)
    .setEmissiveFactor([1.0, 1.0, 1.0])
    .setRoughnessFactor(0.55)
    .setMetallicFactor(0.85);

  const posAcc = doc.createAccessor('POSITION').setArray(new Float32Array(mechMesh.vertices)).setType('VEC3').setBuffer(buffer);
  const normAcc = doc.createAccessor('NORMAL').setArray(new Float32Array(mechMesh.normals)).setType('VEC3').setBuffer(buffer);
  const uvAcc = doc.createAccessor('TEXCOORD_0').setArray(new Float32Array(mechMesh.uvs)).setType('VEC2').setBuffer(buffer);
  const jointsAcc = doc.createAccessor('JOINTS_0').setArray(joints0).setType('VEC4').setBuffer(buffer);
  const weightsAcc = doc.createAccessor('WEIGHTS_0').setArray(weights0).setType('VEC4').setBuffer(buffer);
  const indicesAcc = doc.createAccessor('INDICES').setArray(new Uint32Array(mechMesh.indices)).setType('SCALAR').setBuffer(buffer);

  const prim = doc.createPrimitive()
    .setAttribute('POSITION', posAcc)
    .setAttribute('NORMAL', normAcc)
    .setAttribute('TEXCOORD_0', uvAcc)
    .setAttribute('JOINTS_0', jointsAcc)
    .setAttribute('WEIGHTS_0', weightsAcc)
    .setIndices(indicesAcc)
    .setMaterial(material);

  const mesh = doc.createMesh('FestivalMech_Mesh').addPrimitive(prim);

  const boneNodeMap = new Map();
  for (const b of MECH_BONES) {
    boneNodeMap.set(b.name, doc.createNode(b.name));
  }

  for (const b of MECH_BONES) {
    const node = boneNodeMap.get(b.name);
    if (b.parent) {
      const parentNode = boneNodeMap.get(b.parent);
      const parentBone = MECH_BONES.find(x => x.name === b.parent);
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
  const skin = doc.createSkin('Mech_Skin').setInverseBindMatrices(ibmAcc);
  for (const b of MECH_BONES) {
    skin.addJoint(boneNodeMap.get(b.name));
  }

  const meshNode = doc.createNode('Mech_Model').setMesh(mesh).setSkin(skin);
  scene.addChild(meshNode);

  // 10. Synthesize Animation Clips (idle, walk, rave_mode, stomp)
  console.log(`>>> Synthesizing Mech Motion Clips: idle, walk, rave_mode, stomp...`);

  function addRotChannel(anim, node, times, quatVals, name) {
    const tAcc = doc.createAccessor(name + '_T').setArray(times).setType('SCALAR').setBuffer(buffer);
    const qAcc = doc.createAccessor(name + '_Q').setArray(quatVals).setType('VEC4').setBuffer(buffer);
    const samp = doc.createAnimationSampler().setInput(tAcc).setOutput(qAcc).setInterpolation('LINEAR');
    const chan = doc.createAnimationChannel().setTargetNode(node).setTargetPath('rotation').setSampler(samp);
    anim.addSampler(samp);
    anim.addChannel(chan);
  }

  function addPosChannel(anim, node, times, posVals, name) {
    const tAcc = doc.createAccessor(name + '_PosT').setArray(times).setType('SCALAR').setBuffer(buffer);
    const pAcc = doc.createAccessor(name + '_Pos').setArray(posVals).setType('VEC3').setBuffer(buffer);
    const samp = doc.createAnimationSampler().setInput(tAcc).setOutput(pAcc).setInterpolation('LINEAR');
    const chan = doc.createAnimationChannel().setTargetNode(node).setTargetPath('translation').setSampler(samp);
    anim.addSampler(samp);
    anim.addChannel(chan);
  }

  // Clip 1: 'idle' (Hydraulic breathing suspension bounce + subwoofer turret scanning)
  {
    const duration = 2.0;
    const frameCount = 41;
    const times = new Float32Array(frameCount);
    for (let i = 0; i < frameCount; i++) times[i] = (i / (frameCount - 1)) * duration;

    const idleAnim = doc.createAnimation('idle');
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();

    // Chassis root hydraulic bounce
    const root = boneNodeMap.get('Chassis_Root');
    const rootPos = new Float32Array(frameCount * 3);

    // Turret pan
    const turret = boneNodeMap.get('Turret_Deck');
    const qTurret = new Float32Array(frameCount * 4);

    for (let i = 0; i < frameCount; i++) {
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      rootPos[i * 3] = 0;
      rootPos[i * 3 + 1] = 2.30 + Math.sin(phase * 2) * 0.04; // 124 BPM pulse
      rootPos[i * 3 + 2] = 0;

      euler.set(0, Math.sin(phase) * 0.25, 0); quat.setFromEuler(euler);
      qTurret[i * 4] = quat.x; qTurret[i * 4 + 1] = quat.y; qTurret[i * 4 + 2] = quat.z; qTurret[i * 4 + 3] = quat.w;
    }

    addPosChannel(idleAnim, root, times, rootPos, 'idle_RootPos');
    addRotChannel(idleAnim, turret, times, qTurret, 'idle_TurretRot');
  }

  // Clip 2: 'walk' (Heavy quadruped mechanical gait with footpad lock)
  {
    const duration = 2.0;
    const frameCount = 41;
    const times = new Float32Array(frameCount);
    for (let i = 0; i < frameCount; i++) times[i] = (i / (frameCount - 1)) * duration;

    const walkAnim = doc.createAnimation('walk');
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();

    const flHip = boneNodeMap.get('FL_Hip');
    const frHip = boneNodeMap.get('FR_Hip');
    const blHip = boneNodeMap.get('BL_Hip');
    const brHip = boneNodeMap.get('BR_Hip');

    const qFL = new Float32Array(frameCount * 4);
    const qFR = new Float32Array(frameCount * 4);
    const qBL = new Float32Array(frameCount * 4);
    const qBR = new Float32Array(frameCount * 4);

    for (let i = 0; i < frameCount; i++) {
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      // Quadruped diagonal gait: FL & BR paired, FR & BL paired
      const stepA = Math.sin(phase) * 0.35;
      const stepB = Math.sin(phase + Math.PI) * 0.35;

      euler.set(stepA, 0, 0); quat.setFromEuler(euler);
      qFL[i * 4] = quat.x; qFL[i * 4 + 1] = quat.y; qFL[i * 4 + 2] = quat.z; qFL[i * 4 + 3] = quat.w;

      euler.set(stepA, 0, 0); quat.setFromEuler(euler);
      qBR[i * 4] = quat.x; qBR[i * 4 + 1] = quat.y; qBR[i * 4 + 2] = quat.z; qBR[i * 4 + 3] = quat.w;

      euler.set(stepB, 0, 0); quat.setFromEuler(euler);
      qFR[i * 4] = quat.x; qFR[i * 4 + 1] = quat.y; qFR[i * 4 + 2] = quat.z; qFR[i * 4 + 3] = quat.w;

      euler.set(stepB, 0, 0); quat.setFromEuler(euler);
      qBL[i * 4] = quat.x; qBL[i * 4 + 1] = quat.y; qBL[i * 4 + 2] = quat.z; qBL[i * 4 + 3] = quat.w;
    }

    addRotChannel(walkAnim, flHip, times, qFL, 'walk_FL');
    addRotChannel(walkAnim, frHip, times, qFR, 'walk_FR');
    addRotChannel(walkAnim, blHip, times, qBL, 'walk_BL');
    addRotChannel(walkAnim, brHip, times, qBR, 'walk_BR');
  }

  // Clip 3: 'rave_mode' (Stationary festival stage mode: chassis pumping to the beat, horns oscillating)
  {
    const duration = 1.6;
    const frameCount = 33;
    const times = new Float32Array(frameCount);
    for (let i = 0; i < frameCount; i++) times[i] = (i / (frameCount - 1)) * duration;

    const raveAnim = doc.createAnimation('rave_mode');
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();

    const root = boneNodeMap.get('Chassis_Root');
    const hornL = boneNodeMap.get('Sound_Horn_L');
    const hornR = boneNodeMap.get('Sound_Horn_R');

    const rootPos = new Float32Array(frameCount * 3);
    const qHornL = new Float32Array(frameCount * 4);
    const qHornR = new Float32Array(frameCount * 4);

    for (let i = 0; i < frameCount; i++) {
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      // Hard bassline bounce
      rootPos[i * 3] = 0;
      rootPos[i * 3 + 1] = 2.30 + Math.abs(Math.sin(phase * 2)) * 0.12;
      rootPos[i * 3 + 2] = 0;

      // Horns oscillating like festival floodlights
      euler.set(Math.sin(phase * 2) * 0.25, Math.cos(phase) * 0.35, 0); quat.setFromEuler(euler);
      qHornL[i * 4] = quat.x; qHornL[i * 4 + 1] = quat.y; qHornL[i * 4 + 2] = quat.z; qHornL[i * 4 + 3] = quat.w;

      euler.set(Math.sin(phase * 2) * 0.25, -Math.cos(phase) * 0.35, 0); quat.setFromEuler(euler);
      qHornR[i * 4] = quat.x; qHornR[i * 4 + 1] = quat.y; qHornR[i * 4 + 2] = quat.z; qHornR[i * 4 + 3] = quat.w;
    }

    addPosChannel(raveAnim, root, times, rootPos, 'rave_RootPos');
    addRotChannel(raveAnim, hornL, times, qHornL, 'rave_HornL');
    addRotChannel(raveAnim, hornR, times, qHornR, 'rave_HornR');
  }

  // Clip 4: 'stomp' (Anticipation crouch and explosive bass-drop mechanical stomp)
  {
    const duration = 2.4;
    const frameCount = 49;
    const times = new Float32Array(frameCount);
    for (let i = 0; i < frameCount; i++) times[i] = (i / (frameCount - 1)) * duration;

    const stompAnim = doc.createAnimation('stomp');
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();

    const root = boneNodeMap.get('Chassis_Root');
    const flHip = boneNodeMap.get('FL_Hip');
    const rootPos = new Float32Array(frameCount * 3);
    const qFL = new Float32Array(frameCount * 4);

    for (let i = 0; i < frameCount; i++) {
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      // Crouch -> Stomp -> Settle
      const crouch = Math.sin(phase);
      rootPos[i * 3] = 0;
      rootPos[i * 3 + 1] = 2.30 - (crouch > 0 ? crouch * 0.18 : 0);
      rootPos[i * 3 + 2] = 0;

      // Leg lifts and slams down
      const slam = crouch > 0 ? crouch * 0.45 : 0;
      euler.set(-slam, 0, 0); quat.setFromEuler(euler);
      qFL[i * 4] = quat.x; qFL[i * 4 + 1] = quat.y; qFL[i * 4 + 2] = quat.z; qFL[i * 4 + 3] = quat.w;
    }

    addPosChannel(stompAnim, root, times, rootPos, 'stomp_RootPos');
    addRotChannel(stompAnim, flHip, times, qFL, 'stomp_FL');
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
    triangles: mechMesh.indices.length / 3,
    bones: MECH_BONES.length,
    clips: ['idle', 'walk', 'rave_mode', 'stomp'],
  };
}

if (process.argv[1] && process.argv[1].endsWith('build-festival-mech.mjs')) {
  buildFestivalMech().catch(err => {
    console.error('Festival mech build failed:', err);
    process.exit(1);
  });
}

