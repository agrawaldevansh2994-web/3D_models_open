import fs from 'fs';
import path from 'path';
import { Document, NodeIO } from '@gltf-transform/core';
import * as THREE from 'three';
import { PNG } from 'pngjs';
import { buildLoftedTube, mergeGeometries } from './glb-builder.mjs';

/**
 * Procedural Paraglider Pilot & Ram-Air Canopy Builder for Playa Art.
 * Wingspan: 4.5m scaled cellular ram-air canopy with suspension lines
 * and articulated pilot suspended in aerodynamic flight harness.
 * Clips:
 *   - glide (steady open-sky cruise with canopy breathing)
 *   - bank_turn (coordinated spiral turn with pilot brake pull & harness weight shift)
 *   - thermal_climb (surging pitch-up and pendulum swing as wing hits lift)
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

export async function buildParaglider(outPath = 'characters/paraglider_pilot/paraglider_pilot.glb') {
  console.log(`\n======================================================`);
  console.log(`>>> SCULPTING OPEN-SKY FLYER: [paraglider_pilot] (4.5m canopy)`);
  console.log(`======================================================`);

  // 1. Cellular Ram-Air Paraglider Canopy (4.5m span: x = -2.25 to +2.25)
  // Anhedral arched wing hanging overhead at y = 3.10 to 3.50
  function makeCanopy() {
    const spanSteps = 24;
    const chordSteps = 10;
    const verts = [];
    const norms = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= spanSteps; i++) {
      const sFrac = i / spanSteps; // 0 to 1
      const x = -2.25 + sFrac * 4.50; // -2.25m to +2.25m
      const normX = Math.abs(x) / 2.25; // 0 (center) to 1 (tips)

      // Canopy anhedral arch (center higher at 3.50m, tips drop to 3.05m)
      const archY = 3.50 - 0.45 * (normX ** 2);
      const sweepZ = 0.25 * (normX ** 2); // Slight backward sweep at tips
      const chord = 1.10 * (1.0 - 0.35 * normX); // 1.10m center chord, tapering

      for (let j = 0; j <= chordSteps; j++) {
        const cFrac = j / chordSteps; // 0 = leading edge, 1 = trailing edge
        const z = sweepZ + (cFrac - 0.3) * chord;
        // Paraglider double-surface camber
        const camber = Math.sin(cFrac * Math.PI) * 0.12;
        const y = archY + camber;

        verts.push(x, y, z);
        norms.push(0, 1, 0);
        uvs.push(sFrac, cFrac);
      }
    }

    for (let i = 0; i < spanSteps; i++) {
      for (let j = 0; j < chordSteps; j++) {
        const a = i * (chordSteps + 1) + j;
        const b = (i + 1) * (chordSteps + 1) + j;
        const c = (i + 1) * (chordSteps + 1) + (j + 1);
        const d = i * (chordSteps + 1) + (j + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    return { vertices: verts, normals: norms, uvs, indices };
  }

  const canopyMesh = makeCanopy();

  // 2. Suspension Risers / Lines (Connecting canopy to pilot carabiners)
  function makeSuspensionLines() {
    const verts = [];
    const norms = [];
    const uvs = [];
    const indices = [];

    const anchorPoints = [
      [-1.8, 3.15, 0.15],
      [-1.0, 3.40, 0.05],
      [-0.3, 3.48, 0.00],
      [0.3, 3.48, 0.00],
      [1.0, 3.40, 0.05],
      [1.8, 3.15, 0.15],
    ];

    const carabinerL = [-0.18, 1.45, 0.02];
    const carabinerR = [0.18, 1.45, 0.02];

    for (let i = 0; i < anchorPoints.length; i++) {
      const top = anchorPoints[i];
      const bot = top[0] < 0 ? carabinerL : carabinerR;

      const vBase = verts.length / 3;
      // Line modeled as thin triangular strip
      verts.push(top[0], top[1], top[2]);
      verts.push(top[0] + 0.01, top[1], top[2]);
      verts.push(bot[0], bot[1], bot[2]);

      norms.push(0, 0, 1, 0, 0, 1, 0, 0, 1);
      uvs.push(0, 1, 0.05, 1, 0, 0);

      indices.push(vBase, vBase + 1, vBase + 2);
    }

    return { vertices: verts, normals: norms, uvs, indices };
  }

  const linesMesh = makeSuspensionLines();

  // 3. Suspended Pilot (Harness, Helmet, Reclined Legs, Arms on toggles)
  const pilotTorso = buildLoftedTube({
    points: [
      [0, 1.62, -0.08], // Helmet head
      [0, 1.48, -0.06], // Neck / Shoulders
      [0, 1.35, -0.02], // Reclining harness torso
      [0, 1.20, 0.08],  // Pelvis in seat board
      [0, 1.05, 0.28],  // Knee pods
      [0, 0.95, 0.48],  // Streamlined foot pod
    ],
    radii: [
      [0.10, 0.11], // Helmet
      [0.16, 0.12], // Shoulders
      [0.18, 0.15], // Torso harness
      [0.16, 0.16], // Pelvis
      [0.12, 0.14], // Knees
      [0.08, 0.10], // Feet
    ],
    radialSegments: 12,
    uvVRange: [0.6, 1.0],
  });

  // Arms reaching up to brake toggles
  function makePilotArm(sign) {
    return buildLoftedTube({
      points: [
        [sign * 0.16, 1.46, -0.04], // Shoulder
        [sign * 0.22, 1.55, 0.04],  // Elbow
        [sign * 0.20, 1.70, 0.08],  // Hand on toggle
      ],
      radii: [
        [0.05, 0.05],
        [0.04, 0.04],
        [0.035, 0.035],
      ],
      radialSegments: 8,
      uvVRange: [0.7, 0.9],
    });
  }

  const armL = makePilotArm(1);
  const armR = makePilotArm(-1);

  const paragliderMesh = mergeGeometries([canopyMesh, linesMesh, pilotTorso, armL, armR]);
  const numVerts = paragliderMesh.vertices.length / 3;
  console.log(`Paraglider Mesh: ${numVerts} vertices, ${paragliderMesh.indices.length / 3} triangles`);

  // 4. Rig Hierarchy (12 bones)
  const GLIDER_BONES = [
    { name: 'Root', parent: null, pos: [0, 2.00, 0.00] },

    // Canopy Bones
    { name: 'Canopy_Center', parent: 'Root', pos: [0, 3.50, 0.00] },
    { name: 'Canopy_Left_1', parent: 'Canopy_Center', pos: [1.10, 3.35, 0.05] },
    { name: 'Canopy_Left_2', parent: 'Canopy_Left_1', pos: [2.25, 3.10, 0.15] },
    { name: 'Canopy_Right_1', parent: 'Canopy_Center', pos: [-1.10, 3.35, 0.05] },
    { name: 'Canopy_Right_2', parent: 'Canopy_Right_1', pos: [-2.25, 3.10, 0.15] },

    // Pilot Harness
    { name: 'Harness_Pivot', parent: 'Root', pos: [0, 1.45, 0.00] },
    { name: 'Pilot_Torso', parent: 'Harness_Pivot', pos: [0, 1.35, -0.02] },
    { name: 'Pilot_Head', parent: 'Pilot_Torso', pos: [0, 1.62, -0.08] },
    { name: 'Arm_L', parent: 'Pilot_Torso', pos: [0.20, 1.55, 0.05] },
    { name: 'Arm_R', parent: 'Pilot_Torso', pos: [-0.20, 1.55, 0.05] },
    { name: 'Pilot_Legs', parent: 'Pilot_Torso', pos: [0, 1.05, 0.28] },
  ];

  // 5. Skin Weights
  const joints0 = new Uint16Array(numVerts * 4);
  const weights0 = new Float32Array(numVerts * 4);

  for (let i = 0; i < numVerts; i++) {
    const x = paragliderMesh.vertices[i * 3];
    const y = paragliderMesh.vertices[i * 3 + 1];
    const z = paragliderMesh.vertices[i * 3 + 2];

    if (y > 2.8) {
      // Canopy
      if (Math.abs(x) > 1.6) {
        // Outer wingtip
        joints0[i * 4] = x > 0 ? 3 : 5; weights0[i * 4] = 0.85;
        joints0[i * 4 + 1] = x > 0 ? 2 : 4; weights0[i * 4 + 1] = 0.15;
      } else if (Math.abs(x) > 0.6) {
        // Mid canopy
        joints0[i * 4] = x > 0 ? 2 : 4; weights0[i * 4] = 0.8;
        joints0[i * 4 + 1] = 1; weights0[i * 4 + 1] = 0.2; // Canopy_Center
      } else {
        // Center canopy
        joints0[i * 4] = 1; weights0[i * 4] = 1.0;
      }
    } else if (y > 1.8) {
      // Suspension lines
      joints0[i * 4] = 1; weights0[i * 4] = 0.5;
      joints0[i * 4 + 1] = 6; weights0[i * 4 + 1] = 0.5; // Harness_Pivot
    } else {
      // Pilot body
      if (Math.abs(x) > 0.15 && y > 1.40) {
        // Arms
        joints0[i * 4] = x > 0 ? 9 : 10; weights0[i * 4] = 1.0;
      } else if (y > 1.55) {
        // Helmet head
        joints0[i * 4] = 8; weights0[i * 4] = 1.0;
      } else if (y < 1.20) {
        // Reclined legs
        joints0[i * 4] = 11; weights0[i * 4] = 1.0;
      } else {
        // Torso
        joints0[i * 4] = 7; weights0[i * 4] = 1.0;
      }
    }
  }

  // 6. Inverse Bind Matrices
  const ibmArray = new Float32Array(GLIDER_BONES.length * 16);
  for (let i = 0; i < GLIDER_BONES.length; i++) {
    const b = GLIDER_BONES[i];
    const m = new THREE.Matrix4().makeTranslation(b.pos[0], b.pos[1], b.pos[2]);
    const inv = new THREE.Matrix4().copy(m).invert();
    ibmArray.set(inv.elements, i * 16);
  }

  // 7. Procedural PBR + Neon LED Textures
  const size = 512;
  const baseColor = createPNG(size, size, (u, v) => {
    // Canopy leading edge (v < 0.15): Electric neon white / cyan intake
    if (v < 0.12) return [0, 245, 255, 255];
    // Canopy ripstop fabric (v < 0.6): Sunset gradient racing stripes
    if (v < 0.6) {
      const stripe = Math.sin(u * Math.PI * 12);
      if (stripe > 0.2) return [255, 60, 40, 255]; // Blaze crimson
      return [255, 170, 0, 255]; // Sunset gold
    }
    // Pilot helmet visor (v > 0.85 && u < 0.3)
    if (v > 0.85 && u < 0.3) return [255, 200, 30, 255]; // Golden mirror visor
    // Dark slate technical flight suit
    return [32, 36, 42, 255];
  });

  const mr = createPNG(size, size, (u, v) => {
    if (v > 0.85 && u < 0.3) return [0, 40, 240, 255]; // Metallic visor
    if (v < 0.12) return [0, 60, 200, 255]; // Glossy LED strip
    return [0, 200, 10, 255]; // Matte ripstop fabric
  });

  const norm = createPNG(size, size, () => [128, 128, 255, 255]);

  const emissive = createPNG(size, size, (u, v) => {
    // LED Canopy leading edge lights
    if (v < 0.12) return [0, 245, 255, 255]; // High intensity cyan LED
    // Visor subtle glow
    if (v > 0.85 && u < 0.3) return [120, 90, 10, 255];
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

  const material = doc.createMaterial('M_Paraglider')
    .setBaseColorTexture(baseColorTex)
    .setMetallicRoughnessTexture(mrTex)
    .setNormalTexture(normalTex)
    .setEmissiveTexture(emissiveTex)
    .setEmissiveFactor([1.0, 1.0, 1.0])
    .setRoughnessFactor(0.7)
    .setMetallicFactor(0.1);

  const posAcc = doc.createAccessor('POSITION').setArray(new Float32Array(paragliderMesh.vertices)).setType('VEC3').setBuffer(buffer);
  const normAcc = doc.createAccessor('NORMAL').setArray(new Float32Array(paragliderMesh.normals)).setType('VEC3').setBuffer(buffer);
  const uvAcc = doc.createAccessor('TEXCOORD_0').setArray(new Float32Array(paragliderMesh.uvs)).setType('VEC2').setBuffer(buffer);
  const jointsAcc = doc.createAccessor('JOINTS_0').setArray(joints0).setType('VEC4').setBuffer(buffer);
  const weightsAcc = doc.createAccessor('WEIGHTS_0').setArray(weights0).setType('VEC4').setBuffer(buffer);
  const indicesAcc = doc.createAccessor('INDICES').setArray(new Uint32Array(paragliderMesh.indices)).setType('SCALAR').setBuffer(buffer);

  const prim = doc.createPrimitive()
    .setAttribute('POSITION', posAcc)
    .setAttribute('NORMAL', normAcc)
    .setAttribute('TEXCOORD_0', uvAcc)
    .setAttribute('JOINTS_0', jointsAcc)
    .setAttribute('WEIGHTS_0', weightsAcc)
    .setIndices(indicesAcc)
    .setMaterial(material);

  const mesh = doc.createMesh('Paraglider_Mesh').addPrimitive(prim);

  const boneNodeMap = new Map();
  for (const b of GLIDER_BONES) {
    boneNodeMap.set(b.name, doc.createNode(b.name));
  }

  for (const b of GLIDER_BONES) {
    const node = boneNodeMap.get(b.name);
    if (b.parent) {
      const parentNode = boneNodeMap.get(b.parent);
      const parentBone = GLIDER_BONES.find(x => x.name === b.parent);
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
  const skin = doc.createSkin('Glider_Skin').setInverseBindMatrices(ibmAcc);
  for (const b of GLIDER_BONES) {
    skin.addJoint(boneNodeMap.get(b.name));
  }

  const meshNode = doc.createNode('Paraglider_Model').setMesh(mesh).setSkin(skin);
  scene.addChild(meshNode);

  // 9. Synthesize Animation Clips (glide, bank_turn, thermal_climb)
  console.log(`>>> Synthesizing Open-Sky Flight Clips: glide, bank_turn, thermal_climb...`);

  function addRotChannel(anim, node, times, quatVals, name) {
    const tAcc = doc.createAccessor(name + '_T').setArray(times).setType('SCALAR').setBuffer(buffer);
    const qAcc = doc.createAccessor(name + '_Q').setArray(quatVals).setType('VEC4').setBuffer(buffer);
    const samp = doc.createAnimationSampler().setInput(tAcc).setOutput(qAcc).setInterpolation('LINEAR');
    const chan = doc.createAnimationChannel().setTargetNode(node).setTargetPath('rotation').setSampler(samp);
    anim.addSampler(samp);
    anim.addChannel(chan);
  }

  // Clip 1: 'glide' (Steady cruise with canopy breathing and subtle pilot pendulum sway)
  {
    const duration = 2.4;
    const frameCount = 49;
    const times = new Float32Array(frameCount);
    for (let i = 0; i < frameCount; i++) times[i] = (i / (frameCount - 1)) * duration;

    const glideAnim = doc.createAnimation('glide');
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();

    // Canopy breathing flex at wingtips
    const tipL = boneNodeMap.get('Canopy_Left_2');
    const tipR = boneNodeMap.get('Canopy_Right_2');
    const qTipL = new Float32Array(frameCount * 4);
    const qTipR = new Float32Array(frameCount * 4);

    // Harness pendulum
    const harness = boneNodeMap.get('Harness_Pivot');
    const qHarness = new Float32Array(frameCount * 4);

    for (let i = 0; i < frameCount; i++) {
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      const flex = Math.sin(phase) * 0.06;

      euler.set(0, 0, flex); quat.setFromEuler(euler);
      qTipL[i * 4] = quat.x; qTipL[i * 4 + 1] = quat.y; qTipL[i * 4 + 2] = quat.z; qTipL[i * 4 + 3] = quat.w;

      euler.set(0, 0, -flex); quat.setFromEuler(euler);
      qTipR[i * 4] = quat.x; qTipR[i * 4 + 1] = quat.y; qTipR[i * 4 + 2] = quat.z; qTipR[i * 4 + 3] = quat.w;

      // Pilot subtle pendulum
      euler.set(Math.sin(phase) * 0.04, 0, Math.cos(phase) * 0.03); quat.setFromEuler(euler);
      qHarness[i * 4] = quat.x; qHarness[i * 4 + 1] = quat.y; qHarness[i * 4 + 2] = quat.z; qHarness[i * 4 + 3] = quat.w;
    }

    addRotChannel(glideAnim, tipL, times, qTipL, 'glide_TipL');
    addRotChannel(glideAnim, tipR, times, qTipR, 'glide_TipR');
    addRotChannel(glideAnim, harness, times, qHarness, 'glide_Harness');
  }

  // Clip 2: 'bank_turn' (Pilot pulls left brake toggle, weight shifts left, wing banks 22 degrees)
  {
    const duration = 2.0;
    const frameCount = 41;
    const times = new Float32Array(frameCount);
    for (let i = 0; i < frameCount; i++) times[i] = (i / (frameCount - 1)) * duration;

    const bankAnim = doc.createAnimation('bank_turn');
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();

    // Canopy rolls into bank
    const canopy = boneNodeMap.get('Canopy_Center');
    const qCanopy = new Float32Array(frameCount * 4);

    // Left arm pulls toggle down
    const armL = boneNodeMap.get('Arm_L');
    const qArmL = new Float32Array(frameCount * 4);

    // Pilot shifts body left
    const harness = boneNodeMap.get('Harness_Pivot');
    const qHarness = new Float32Array(frameCount * 4);

    for (let i = 0; i < frameCount; i++) {
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      const bank = Math.sin(phase) * 0.38; // 22 degrees roll

      euler.set(0, 0, bank); quat.setFromEuler(euler);
      qCanopy[i * 4] = quat.x; qCanopy[i * 4 + 1] = quat.y; qCanopy[i * 4 + 2] = quat.z; qCanopy[i * 4 + 3] = quat.w;

      // Pulling left toggle down
      const pull = Math.max(0, Math.sin(phase)) * 0.45;
      euler.set(pull, 0, 0); quat.setFromEuler(euler);
      qArmL[i * 4] = quat.x; qArmL[i * 4 + 1] = quat.y; qArmL[i * 4 + 2] = quat.z; qArmL[i * 4 + 3] = quat.w;

      // Harness swings outward from centrifugal force
      euler.set(0, 0, bank * 0.85); quat.setFromEuler(euler);
      qHarness[i * 4] = quat.x; qHarness[i * 4 + 1] = quat.y; qHarness[i * 4 + 2] = quat.z; qHarness[i * 4 + 3] = quat.w;
    }

    addRotChannel(bankAnim, canopy, times, qCanopy, 'bank_Canopy');
    addRotChannel(bankAnim, armL, times, qArmL, 'bank_ArmL');
    addRotChannel(bankAnim, harness, times, qHarness, 'bank_Harness');
  }

  // Clip 3: 'thermal_climb' (Surging pitch-up and pendulum forward swing)
  {
    const duration = 2.4;
    const frameCount = 49;
    const times = new Float32Array(frameCount);
    for (let i = 0; i < frameCount; i++) times[i] = (i / (frameCount - 1)) * duration;

    const climbAnim = doc.createAnimation('thermal_climb');
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();

    const canopy = boneNodeMap.get('Canopy_Center');
    const qCanopy = new Float32Array(frameCount * 4);

    const harness = boneNodeMap.get('Harness_Pivot');
    const qHarness = new Float32Array(frameCount * 4);

    for (let i = 0; i < frameCount; i++) {
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      // Pitch surges back then recovers
      const pitch = Math.sin(phase) * 0.20;

      euler.set(-pitch, 0, 0); quat.setFromEuler(euler);
      qCanopy[i * 4] = quat.x; qCanopy[i * 4 + 1] = quat.y; qCanopy[i * 4 + 2] = quat.z; qCanopy[i * 4 + 3] = quat.w;

      // Pilot swings forward then stabilizes
      euler.set(pitch * 1.4, 0, 0); quat.setFromEuler(euler);
      qHarness[i * 4] = quat.x; qHarness[i * 4 + 1] = quat.y; qHarness[i * 4 + 2] = quat.z; qHarness[i * 4 + 3] = quat.w;
    }

    addRotChannel(climbAnim, canopy, times, qCanopy, 'climb_Canopy');
    addRotChannel(climbAnim, harness, times, qHarness, 'climb_Harness');
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
    triangles: paragliderMesh.indices.length / 3,
    bones: GLIDER_BONES.length,
    clips: ['glide', 'bank_turn', 'thermal_climb'],
  };
}

if (process.argv[1] && process.argv[1].endsWith('build-paraglider.mjs')) {
  buildParaglider().catch(err => {
    console.error('Paraglider build failed:', err);
    process.exit(1);
  });
}

