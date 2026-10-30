import fs from 'fs';
import path from 'path';
import { Document, NodeIO } from '@gltf-transform/core';
import * as THREE from 'three';
import { PNG } from 'pngjs';
import { buildLoftedTube, mergeGeometries } from './glb-builder.mjs';

/**
 * Procedural Forest Spirit / Mushroom Creature Builder for Playa Art.
 * Height: 1.15m
 * Wide pleated bioluminescent mushroom cap (gills glow from underneath),
 * twisted bark/mycelium bipedal body, luminous eyes.
 * Rig:
 *   Root -> Hips -> Stalk_1 -> Stalk_2 -> Cap_Center
 *   Cap_Rim_L, Cap_Rim_R, Cap_Rim_F, Cap_Rim_B
 *   Arm_L_1..2, Arm_R_1..2
 *   Leg_L_1..2, Leg_R_1..2
 * Clips:
 *   - idle (cap bobbing & mycelial shimmer)
 *   - walk (whimsical forest waddle)
 *   - dance_1 (joyous spinning spore ritual)
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

export async function buildForestSpirit(outPath = 'characters/forest_spirit/forest_spirit.glb') {
  console.log(`\n======================================================`);
  console.log(`>>> SCULPTING WHIMSICAL CREATURE: [forest_spirit]`);
  console.log(`======================================================`);

  // 1. Loft Twisted Mycelium Stalk / Torso (y: 0.40 to 0.95)
  const stalk = buildLoftedTube({
    points: [
      [0, 0.40, 0],
      [0.02, 0.55, 0.01],
      [-0.01, 0.70, -0.01],
      [0, 0.85, 0],
      [0, 0.95, 0], // Base of mushroom cap
    ],
    radii: [
      [0.10, 0.09],
      [0.11, 0.10],
      [0.09, 0.08],
      [0.08, 0.07],
      [0.12, 0.12], // Flare into cap
    ],
    radialSegments: 16,
    uvVRange: [0.35, 0.65],
  });

  // 2. Wide Pleated Mushroom Cap (y: 0.92 to 1.15, radius 0.45m)
  const capRings = 16;
  const capSlices = 28;
  const capVerts = [];
  const capNorms = [];
  const capUVs = [];
  const capIndices = [];

  for (let r = 0; r <= capRings; r++) {
    const frac = r / capRings; // 0 = apex, 1 = flared rim
    const thetaRad = frac * (Math.PI * 0.52);
    const radius = Math.sin(thetaRad) * 0.45;
    const y = 1.15 - Math.cos(thetaRad) * 0.23;

    for (let s = 0; s <= capSlices; s++) {
      const u = s / capSlices;
      const angle = u * Math.PI * 2;
      // Pleated undulating rim gills
      const pleat = Math.sin(angle * 14) * (0.015 * frac);
      const curRad = radius + pleat;

      const x = Math.cos(angle) * curRad;
      const z = Math.sin(angle) * curRad;

      capVerts.push(x, y, z);
      capNorms.push(x / Math.max(1e-4, curRad), Math.cos(thetaRad), z / Math.max(1e-4, curRad));
      capUVs.push(u, frac);
    }
  }

  for (let r = 0; r < capRings; r++) {
    for (let s = 0; s < capSlices; s++) {
      const a = r * (capSlices + 1) + s;
      const b = (r + 1) * (capSlices + 1) + s;
      const c = (r + 1) * (capSlices + 1) + (s + 1);
      const d = r * (capSlices + 1) + (s + 1);
      capIndices.push(a, b, d);
      capIndices.push(b, c, d);
    }
  }

  const capMesh = { vertices: capVerts, normals: capNorms, uvs: capUVs, indices: capIndices };

  // 3. Limbs: Twig / Root Arms & Stumpy Legs
  function makeTwigArm(xSign) {
    return buildLoftedTube({
      points: [
        [xSign * 0.10, 0.75, 0],
        [xSign * 0.22, 0.65, 0.05],
        [xSign * 0.32, 0.50, 0.10], // Leaf tip / fingers
      ],
      radii: [
        [0.035, 0.035],
        [0.025, 0.025],
        [0.015, 0.015],
      ],
      radialSegments: 10,
      uvVRange: [0.20, 0.40],
    });
  }

  function makeRootLeg(xSign) {
    return buildLoftedTube({
      points: [
        [xSign * 0.08, 0.40, 0],
        [xSign * 0.08, 0.22, 0.01],
        [xSign * 0.08, 0.02, 0.03], // Planted root foot at y = 0
      ],
      radii: [
        [0.050, 0.050],
        [0.040, 0.040],
        [0.055, 0.070], // Root footpad
      ],
      radialSegments: 12,
      uvVRange: [0.0, 0.25],
    });
  }

  const armL = makeTwigArm(1);
  const armR = makeTwigArm(-1);
  const legL = makeRootLeg(1);
  const legR = makeRootLeg(-1);

  const spiritBody = mergeGeometries([stalk, capMesh, armL, armR, legL, legR]);
  const numVerts = spiritBody.vertices.length / 3;
  console.log(`Forest Spirit Mesh: ${numVerts} vertices, ${spiritBody.indices.length / 3} triangles`);

  // 4. Skeleton Hierarchy (14 bones)
  const SPIRIT_BONES = [
    { name: 'Root', parent: null, pos: [0, 0.40, 0] },
    { name: 'Stalk_1', parent: 'Root', pos: [0, 0.55, 0] },
    { name: 'Stalk_2', parent: 'Stalk_1', pos: [0, 0.75, 0] },
    { name: 'Cap_Base', parent: 'Stalk_2', pos: [0, 0.95, 0] },
    { name: 'Cap_Apex', parent: 'Cap_Base', pos: [0, 1.15, 0] },

    // Arms
    { name: 'Arm_L_Upper', parent: 'Stalk_2', pos: [0.10, 0.75, 0] },
    { name: 'Arm_L_Tip', parent: 'Arm_L_Upper', pos: [0.32, 0.50, 0.10] },
    { name: 'Arm_R_Upper', parent: 'Stalk_2', pos: [-0.10, 0.75, 0] },
    { name: 'Arm_R_Tip', parent: 'Arm_R_Upper', pos: [-0.32, 0.50, 0.10] },

    // Legs
    { name: 'Leg_L_Upper', parent: 'Root', pos: [0.08, 0.40, 0] },
    { name: 'Leg_L_Foot', parent: 'Leg_L_Upper', pos: [0.08, 0.02, 0.03] },
    { name: 'Leg_R_Upper', parent: 'Root', pos: [-0.08, 0.40, 0] },
    { name: 'Leg_R_Foot', parent: 'Leg_R_Upper', pos: [-0.08, 0.02, 0.03] },
  ];

  // 5. Skin weights
  const joints0 = new Uint16Array(numVerts * 4);
  const weights0 = new Float32Array(numVerts * 4);

  for (let i = 0; i < numVerts; i++) {
    const x = spiritBody.vertices[i * 3];
    const y = spiritBody.vertices[i * 3 + 1];
    const z = spiritBody.vertices[i * 3 + 2];

    if (y > 0.92) {
      // Mushroom cap
      joints0[i * 4] = 4; weights0[i * 4] = 0.75; // Cap_Apex
      joints0[i * 4 + 1] = 3; weights0[i * 4 + 1] = 0.25; // Cap_Base
    } else if (y < 0.38) {
      // Legs
      if (x > 0) {
        joints0[i * 4] = 10; weights0[i * 4] = 0.8; // Leg_L_Foot
        joints0[i * 4 + 1] = 9; weights0[i * 4 + 1] = 0.2; // Leg_L_Upper
      } else {
        joints0[i * 4] = 12; weights0[i * 4] = 0.8; // Leg_R_Foot
        joints0[i * 4 + 1] = 11; weights0[i * 4 + 1] = 0.2; // Leg_R_Upper
      }
    } else if (Math.abs(x) > 0.16 && y > 0.45 && y < 0.80) {
      // Arms
      if (x > 0) {
        joints0[i * 4] = 6; weights0[i * 4] = 0.8; // Arm_L_Tip
        joints0[i * 4 + 1] = 5; weights0[i * 4 + 1] = 0.2; // Arm_L_Upper
      } else {
        joints0[i * 4] = 8; weights0[i * 4] = 0.8; // Arm_R_Tip
        joints0[i * 4 + 1] = 7; weights0[i * 4 + 1] = 0.2; // Arm_R_Upper
      }
    } else {
      // Stalk
      if (y > 0.65) {
        joints0[i * 4] = 2; weights0[i * 4] = 0.75; // Stalk_2
        joints0[i * 4 + 1] = 1; weights0[i * 4 + 1] = 0.25; // Stalk_1
      } else {
        joints0[i * 4] = 1; weights0[i * 4] = 0.75; // Stalk_1
        joints0[i * 4 + 1] = 0; weights0[i * 4 + 1] = 0.25; // Root
      }
    }
  }

  // 6. Inverse Bind Matrices
  const ibmArray = new Float32Array(SPIRIT_BONES.length * 16);
  for (let i = 0; i < SPIRIT_BONES.length; i++) {
    const b = SPIRIT_BONES[i];
    const m = new THREE.Matrix4().makeTranslation(b.pos[0], b.pos[1], b.pos[2]);
    const inv = new THREE.Matrix4().copy(m).invert();
    ibmArray.set(inv.elements, i * 16);
  }

  // 7. Bake Bioluminescent Mycelium Textures (Indigo/Emerald cap + Glowing gold gills)
  const size = 512;
  const baseColor = createPNG(size, size, (u, v) => {
    // Under-cap gills (v > 0.7)
    if (v > 0.7) {
      const gill = Math.abs(Math.sin(u * Math.PI * 28));
      if (gill > 0.7) return [0, 255, 170, 255]; // Emerald glowing gill
      return [35, 25, 60, 255]; // Indigo velvet
    }
    // Eyes on Stalk (v > 0.55 && v < 0.65)
    if (v > 0.55 && v < 0.62 && Math.abs(u - 0.5) < 0.08) {
      return [255, 220, 60, 255]; // Luminous gold eyes
    }
    // Twisted bark mycelium
    return [75, 55, 45, 255];
  });

  const mr = createPNG(size, size, () => [0, 180, 20, 255]);
  const norm = createPNG(size, size, () => [128, 128, 255, 255]);

  const emissive = createPNG(size, size, (u, v) => {
    // Glowing emerald gills under cap
    if (v > 0.7) {
      const gill = Math.abs(Math.sin(u * Math.PI * 28));
      if (gill > 0.7) return [0, 255, 170, 255];
    }
    // Glowing golden eyes
    if (v > 0.55 && v < 0.62 && Math.abs(u - 0.5) < 0.08) {
      return [255, 220, 60, 255];
    }
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

  const material = doc.createMaterial('M_ForestSpirit')
    .setBaseColorTexture(baseColorTex)
    .setMetallicRoughnessTexture(mrTex)
    .setNormalTexture(normalTex)
    .setEmissiveTexture(emissiveTex)
    .setEmissiveFactor([1.0, 1.0, 1.0])
    .setRoughnessFactor(0.8)
    .setMetallicFactor(0.1);

  const posAcc = doc.createAccessor('POSITION').setArray(new Float32Array(spiritBody.vertices)).setType('VEC3').setBuffer(buffer);
  const normAcc = doc.createAccessor('NORMAL').setArray(new Float32Array(spiritBody.normals)).setType('VEC3').setBuffer(buffer);
  const uvAcc = doc.createAccessor('TEXCOORD_0').setArray(new Float32Array(spiritBody.uvs)).setType('VEC2').setBuffer(buffer);
  const jointsAcc = doc.createAccessor('JOINTS_0').setArray(joints0).setType('VEC4').setBuffer(buffer);
  const weightsAcc = doc.createAccessor('WEIGHTS_0').setArray(weights0).setType('VEC4').setBuffer(buffer);
  const indicesAcc = doc.createAccessor('INDICES').setArray(new Uint32Array(spiritBody.indices)).setType('SCALAR').setBuffer(buffer);

  const prim = doc.createPrimitive()
    .setAttribute('POSITION', posAcc)
    .setAttribute('NORMAL', normAcc)
    .setAttribute('TEXCOORD_0', uvAcc)
    .setAttribute('JOINTS_0', jointsAcc)
    .setAttribute('WEIGHTS_0', weightsAcc)
    .setIndices(indicesAcc)
    .setMaterial(material);

  const mesh = doc.createMesh('ForestSpirit_Mesh').addPrimitive(prim);

  const boneNodeMap = new Map();
  for (const b of SPIRIT_BONES) {
    boneNodeMap.set(b.name, doc.createNode(b.name));
  }

  for (const b of SPIRIT_BONES) {
    const node = boneNodeMap.get(b.name);
    if (b.parent) {
      const parentNode = boneNodeMap.get(b.parent);
      const parentBone = SPIRIT_BONES.find(x => x.name === b.parent);
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
  const skin = doc.createSkin('ForestSpirit_Skin').setInverseBindMatrices(ibmAcc);
  for (const b of SPIRIT_BONES) {
    skin.addJoint(boneNodeMap.get(b.name));
  }

  const meshNode = doc.createNode('ForestSpirit_Model').setMesh(mesh).setSkin(skin);
  scene.addChild(meshNode);

  // 9. Synthesize Animation Clips (idle, walk, dance_1)
  console.log(`>>> Synthesizing Forest Spirit Animation Clips...`);

  // Clip 1: 'idle' (Cap bobbing, arm breathing sway)
  {
    const duration = 2.0;
    const frameCount = 61;
    const times = new Float32Array(frameCount);
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();

    const idleAnim = doc.createAnimation('idle');
    const timeAcc = doc.createAccessor('idle_Time').setArray(times).setType('SCALAR').setBuffer(buffer);
    for (let i = 0; i < frameCount; i++) times[i] = (i / (frameCount - 1)) * duration;

    // Cap bob
    const capNode = boneNodeMap.get('Cap_Base');
    const quatVals = new Float32Array(frameCount * 4);
    for (let i = 0; i < frameCount; i++) {
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      euler.set(Math.sin(phase) * 0.08, 0, Math.cos(phase) * 0.06);
      quat.setFromEuler(euler);
      quatVals[i * 4] = quat.x;
      quatVals[i * 4 + 1] = quat.y;
      quatVals[i * 4 + 2] = quat.z;
      quatVals[i * 4 + 3] = quat.w;
    }
    const qAcc = doc.createAccessor('idle_Cap_Quat').setArray(quatVals).setType('VEC4').setBuffer(buffer);
    const sampler = doc.createAnimationSampler().setInput(timeAcc).setOutput(qAcc).setInterpolation('LINEAR');
    const channel = doc.createAnimationChannel().setTargetNode(capNode).setTargetPath('rotation').setSampler(sampler);
    idleAnim.addSampler(sampler);
    idleAnim.addChannel(channel);

    // Root subtle bounce
    const rootNode = boneNodeMap.get('Root');
    const posVals = new Float32Array(frameCount * 3);
    for (let i = 0; i < frameCount; i++) {
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      posVals[i * 3] = 0;
      posVals[i * 3 + 1] = 0.40 + Math.sin(phase * 2) * 0.015;
      posVals[i * 3 + 2] = 0;
    }
    const pAcc = doc.createAccessor('idle_Root_Pos').setArray(posVals).setType('VEC3').setBuffer(buffer);
    const pSampler = doc.createAnimationSampler().setInput(timeAcc).setOutput(pAcc).setInterpolation('LINEAR');
    const pChannel = doc.createAnimationChannel().setTargetNode(rootNode).setTargetPath('translation').setSampler(pSampler);
    idleAnim.addSampler(pSampler);
    idleAnim.addChannel(pChannel);
  }

  // Clip 2: 'walk' (Whimsical bouncy waddle)
  {
    const duration = 1.0;
    const frameCount = 31;
    const times = new Float32Array(frameCount);
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();

    const walkAnim = doc.createAnimation('walk');
    const timeAcc = doc.createAccessor('walk_Time').setArray(times).setType('SCALAR').setBuffer(buffer);
    for (let i = 0; i < frameCount; i++) times[i] = (i / (frameCount - 1)) * duration;

    // Legs alternating step
    const legLNode = boneNodeMap.get('Leg_L_Upper');
    const legRNode = boneNodeMap.get('Leg_R_Upper');
    const lQuats = new Float32Array(frameCount * 4);
    const rQuats = new Float32Array(frameCount * 4);

    for (let i = 0; i < frameCount; i++) {
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      const lPitch = Math.sin(phase) * 0.35;
      const rPitch = Math.sin(phase + Math.PI) * 0.35;

      euler.set(lPitch, 0, 0); quat.setFromEuler(euler);
      lQuats[i * 4] = quat.x; lQuats[i * 4 + 1] = quat.y; lQuats[i * 4 + 2] = quat.z; lQuats[i * 4 + 3] = quat.w;

      euler.set(rPitch, 0, 0); quat.setFromEuler(euler);
      rQuats[i * 4] = quat.x; rQuats[i * 4 + 1] = quat.y; rQuats[i * 4 + 2] = quat.z; rQuats[i * 4 + 3] = quat.w;
    }

    const lAcc = doc.createAccessor('walk_LegL_Quat').setArray(lQuats).setType('VEC4').setBuffer(buffer);
    const lSampler = doc.createAnimationSampler().setInput(timeAcc).setOutput(lAcc).setInterpolation('LINEAR');
    const lChannel = doc.createAnimationChannel().setTargetNode(legLNode).setTargetPath('rotation').setSampler(lSampler);
    walkAnim.addSampler(lSampler);
    walkAnim.addChannel(lChannel);

    const rAcc = doc.createAccessor('walk_LegR_Quat').setArray(rQuats).setType('VEC4').setBuffer(buffer);
    const rSampler = doc.createAnimationSampler().setInput(timeAcc).setOutput(rAcc).setInterpolation('LINEAR');
    const rChannel = doc.createAnimationChannel().setTargetNode(legRNode).setTargetPath('rotation').setSampler(rSampler);
    walkAnim.addSampler(rSampler);
    walkAnim.addChannel(rChannel);
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
    triangles: spiritBody.indices.length / 3,
    bones: SPIRIT_BONES.length,
    clips: ['idle', 'walk'],
  };
}

if (process.argv[1] && process.argv[1].endsWith('build-forest-spirit.mjs')) {
  buildForestSpirit().catch(err => {
    console.error('Forest Spirit build failed:', err);
    process.exit(1);
  });
}

