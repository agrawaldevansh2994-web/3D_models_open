import fs from 'fs';
import path from 'path';
import { Document, NodeIO } from '@gltf-transform/core';
import * as THREE from 'three';
import { PNG } from 'pngjs';
import { buildLoftedTube, mergeGeometries } from './glb-builder.mjs';

/**
 * Procedural Desert Fox (Fennec Dune Fox) Builder for Playa Art.
 * Shoulder Height: 0.42m, Nose-to-tail: 0.75m
 * Oversized ears, slender quadruped legs, plush white-tipped tail with glowing desert-rune markings.
 * Rig (Quadruped):
 *   Root/Pelvis -> Spine_1 -> Spine_2 -> Neck -> Head -> Ear_L, Ear_R, Snout
 *   Tail_1 -> Tail_2 -> Tail_3
 *   Leg_FL_1..3, Leg_FR_1..3, Leg_BL_1..3, Leg_BR_1..3
 * Clips:
 *   - idle (alert breathing, ear swivels, tail wag)
 *   - trot (diagonal two-beat trot: FL+BR alternating with FR+BL)
 *   - sit (hindquarters lowered, tail curled)
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

export async function buildDesertFox(outPath = 'characters/desert_fox/desert_fox.glb') {
  console.log(`\n======================================================`);
  console.log(`>>> PROCEDURALLY SCULPTING QUADRUPED: [desert_fox]`);
  console.log(`======================================================`);

  // 1. Loft Torso & Flanks (along Z axis, from pelvis z = -0.18 to shoulders z = +0.18, y = 0.42)
  const torso = buildLoftedTube({
    points: [
      [0, 0.40, -0.18], // Pelvis
      [0, 0.42, -0.06], // Loin
      [0, 0.44, 0.08],  // Ribcage
      [0, 0.45, 0.18],  // Chest / Shoulders
    ],
    radii: [
      [0.075, 0.085],
      [0.070, 0.080],
      [0.085, 0.095],
      [0.080, 0.090],
    ],
    radialSegments: 16,
    uvVRange: [0.35, 0.65],
  });

  // 2. Loft Neck & Head
  const head = buildLoftedTube({
    points: [
      [0, 0.45, 0.18], // Base of neck
      [0, 0.52, 0.26], // Throat / nape
      [0, 0.55, 0.32], // Cranium
      [0, 0.51, 0.41], // Snout / nose tip
    ],
    radii: [
      [0.055, 0.055],
      [0.060, 0.065],
      [0.065, 0.060],
      [0.025, 0.020], // Tapered fox muzzle
    ],
    radialSegments: 14,
    uvVRange: [0.70, 1.0],
  });

  // 3. Oversized Fennec Ears (Left & Right)
  const earL = buildLoftedTube({
    points: [
      [0.045, 0.58, 0.28], // Base of ear
      [0.085, 0.68, 0.27], // Mid flare
      [0.105, 0.78, 0.26], // Ear tip (high alert perk)
    ],
    radii: [
      [0.025, 0.015],
      [0.055, 0.012], // Wide bat-like fennec flare
      [0.015, 0.005],
    ],
    radialSegments: 12,
    uvVRange: [0.85, 1.0],
  });

  const earR = buildLoftedTube({
    points: [
      [-0.045, 0.58, 0.28],
      [-0.085, 0.68, 0.27],
      [-0.105, 0.78, 0.26],
    ],
    radii: [
      [0.025, 0.015],
      [0.055, 0.012],
      [0.015, 0.005],
    ],
    radialSegments: 12,
    uvVRange: [0.85, 1.0],
  });

  // 4. Plush Bushy Tail
  const tail = buildLoftedTube({
    points: [
      [0, 0.40, -0.18],  // Tail root
      [0, 0.43, -0.30],  // Arch
      [0, 0.38, -0.42],  // Mid plush volume
      [0, 0.32, -0.52],  // White brush tip
    ],
    radii: [
      [0.030, 0.030],
      [0.055, 0.055],
      [0.060, 0.060], // Thick fluffy brush
      [0.020, 0.020],
    ],
    radialSegments: 14,
    uvVRange: [0.10, 0.35],
  });

  // 5. Four Slender Legs
  function makeLeg(xSign, zPos) {
    const isFront = zPos > 0;
    const yTop = isFront ? 0.42 : 0.40;
    return buildLoftedTube({
      points: [
        [xSign * 0.075, yTop, zPos],
        [xSign * 0.075, yTop * 0.65, zPos + (isFront ? 0.01 : -0.02)],
        [xSign * 0.075, yTop * 0.30, zPos + (isFront ? -0.01 : 0.01)],
        [xSign * 0.075, 0.02, zPos + 0.02], // Paw planted on ground y=0
      ],
      radii: [
        [0.035, 0.035],
        [0.025, 0.025],
        [0.020, 0.020],
        [0.025, 0.035], // Small paw pad
      ],
      radialSegments: 10,
      uvVRange: [0.0, 0.25],
    });
  }

  const legFL = makeLeg(1, 0.16);
  const legFR = makeLeg(-1, 0.16);
  const legBL = makeLeg(1, -0.16);
  const legBR = makeLeg(-1, -0.16);

  const foxBody = mergeGeometries([torso, head, earL, earR, tail, legFL, legFR, legBL, legBR]);
  const numVerts = foxBody.vertices.length / 3;
  console.log(`Fox Mesh: ${numVerts} vertices, ${foxBody.indices.length / 3} triangles`);

  // 6. Quadruped Rig Hierarchy (18 bones)
  const FOX_BONES = [
    { name: 'Root', parent: null, pos: [0, 0.42, 0] },
    { name: 'Spine_Pelvis', parent: 'Root', pos: [0, 0.41, -0.12] },
    { name: 'Spine_Chest', parent: 'Root', pos: [0, 0.44, 0.12] },
    { name: 'Neck', parent: 'Spine_Chest', pos: [0, 0.50, 0.22] },
    { name: 'Head', parent: 'Neck', pos: [0, 0.55, 0.32] },
    { name: 'Ear_L', parent: 'Head', pos: [0.08, 0.68, 0.27] },
    { name: 'Ear_R', parent: 'Head', pos: [-0.08, 0.68, 0.27] },

    { name: 'Tail_Base', parent: 'Spine_Pelvis', pos: [0, 0.42, -0.22] },
    { name: 'Tail_Mid', parent: 'Tail_Base', pos: [0, 0.38, -0.38] },
    { name: 'Tail_Tip', parent: 'Tail_Mid', pos: [0, 0.32, -0.52] },

    // Front Left Leg
    { name: 'Leg_FL_Upper', parent: 'Spine_Chest', pos: [0.075, 0.35, 0.16] },
    { name: 'Leg_FL_Lower', parent: 'Leg_FL_Upper', pos: [0.075, 0.18, 0.16] },
    // Front Right Leg
    { name: 'Leg_FR_Upper', parent: 'Spine_Chest', pos: [-0.075, 0.35, 0.16] },
    { name: 'Leg_FR_Lower', parent: 'Leg_FR_Upper', pos: [-0.075, 0.18, 0.16] },

    // Back Left Leg
    { name: 'Leg_BL_Upper', parent: 'Spine_Pelvis', pos: [0.075, 0.35, -0.16] },
    { name: 'Leg_BL_Lower', parent: 'Leg_BL_Upper', pos: [0.075, 0.18, -0.16] },
    // Back Right Leg
    { name: 'Leg_BR_Upper', parent: 'Spine_Pelvis', pos: [-0.075, 0.35, -0.16] },
    { name: 'Leg_BR_Lower', parent: 'Leg_BR_Upper', pos: [-0.075, 0.18, -0.16] },
  ];

  // 7. Compute smooth 4-bone skin weights
  const joints0 = new Uint16Array(numVerts * 4);
  const weights0 = new Float32Array(numVerts * 4);

  for (let i = 0; i < numVerts; i++) {
    const x = foxBody.vertices[i * 3];
    const y = foxBody.vertices[i * 3 + 1];
    const z = foxBody.vertices[i * 3 + 2];

    if (z > 0.22) {
      // Head and ears
      if (y > 0.60) {
        joints0[i * 4] = (x > 0) ? 5 : 6; // Ear_L or Ear_R
        weights0[i * 4] = 0.85;
        joints0[i * 4 + 1] = 4; // Head
        weights0[i * 4 + 1] = 0.15;
      } else {
        joints0[i * 4] = 4; weights0[i * 4] = 0.8; // Head
        joints0[i * 4 + 1] = 3; weights0[i * 4 + 1] = 0.2; // Neck
      }
    } else if (z < -0.22) {
      // Tail
      if (z < -0.42) {
        joints0[i * 4] = 9; weights0[i * 4] = 0.8; // Tail_Tip
        joints0[i * 4 + 1] = 8; weights0[i * 4 + 1] = 0.2;
      } else {
        joints0[i * 4] = 7; weights0[i * 4] = 0.6; // Tail_Base
        joints0[i * 4 + 1] = 8; weights0[i * 4 + 1] = 0.4;
      }
    } else {
      // Body or legs
      if (y < 0.28) {
        // Lower legs
        if (z > 0) {
          joints0[i * 4] = (x > 0) ? 11 : 13; // FL or FR Lower
          weights0[i * 4] = 0.85;
          joints0[i * 4 + 1] = (x > 0) ? 10 : 12; // Upper
          weights0[i * 4 + 1] = 0.15;
        } else {
          joints0[i * 4] = (x > 0) ? 15 : 17; // BL or BR Lower
          weights0[i * 4] = 0.85;
          joints0[i * 4 + 1] = (x > 0) ? 14 : 16; // Upper
          weights0[i * 4 + 1] = 0.15;
        }
      } else {
        // Spine
        if (z > 0) {
          joints0[i * 4] = 2; weights0[i * 4] = 0.8; // Spine_Chest
          joints0[i * 4 + 1] = 0; weights0[i * 4 + 1] = 0.2;
        } else {
          joints0[i * 4] = 1; weights0[i * 4] = 0.8; // Spine_Pelvis
          joints0[i * 4 + 1] = 0; weights0[i * 4 + 1] = 0.2;
        }
      }
    }
  }

  // 8. Inverse Bind Matrices
  const ibmArray = new Float32Array(FOX_BONES.length * 16);
  for (let i = 0; i < FOX_BONES.length; i++) {
    const b = FOX_BONES[i];
    const m = new THREE.Matrix4().makeTranslation(b.pos[0], b.pos[1], b.pos[2]);
    const inv = new THREE.Matrix4().copy(m).invert();
    ibmArray.set(inv.elements, i * 16);
  }

  // 9. Bake Fox PBR Textures (Sandy gold gradient fur + white tail tip + amber rune markings)
  const size = 512;
  const baseColor = createPNG(size, size, (u, v) => {
    // Face & Ears
    if (v > 0.70) {
      if (u > 0.45 && u < 0.55 && v > 0.85) return [25, 20, 20, 255]; // Black nose
      if (Math.abs(u - 0.5) < 0.18 && v > 0.75) return [240, 230, 220, 255]; // White cheek fluff
      return [220, 165, 95, 255]; // Sandy gold
    }
    // Tail brush tip
    if (v < 0.20) {
      return [250, 248, 245, 255]; // Plush white tail tip
    }
    // Desert runes on flanks
    if (Math.abs(u - 0.5) > 0.35 && v > 0.40 && v < 0.60) {
      const rune = Math.sin(u * 80) * Math.cos(v * 80);
      if (rune > 0.75) return [255, 175, 40, 255]; // Glowing rune
    }
    return [215, 155, 85, 255]; // Golden fur body
  });

  const mr = createPNG(size, size, () => [0, 220, 15, 255]); // soft fur roughness
  const norm = createPNG(size, size, () => [128, 128, 255, 255]);

  const emissive = createPNG(size, size, (u, v) => {
    // Glowing desert runes on flanks and ear tips
    if (Math.abs(u - 0.5) > 0.35 && v > 0.40 && v < 0.60) {
      const rune = Math.sin(u * 80) * Math.cos(v * 80);
      if (rune > 0.75) return [255, 175, 40, 255];
    }
    // Luminous amber eyes
    if (Math.abs(u - 0.5) < 0.12 && v > 0.80 && v < 0.85) {
      return [255, 190, 30, 255];
    }
    return [0, 0, 0, 255];
  });

  // 10. glTF Document
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene('Scene');

  const baseColorTex = doc.createTexture('BaseColor').setImage(baseColor).setMimeType('image/png');
  const mrTex = doc.createTexture('MetallicRoughness').setImage(mr).setMimeType('image/png');
  const normalTex = doc.createTexture('Normal').setImage(norm).setMimeType('image/png');
  const emissiveTex = doc.createTexture('Emissive').setImage(emissive).setMimeType('image/png');

  const material = doc.createMaterial('M_DesertFox')
    .setBaseColorTexture(baseColorTex)
    .setMetallicRoughnessTexture(mrTex)
    .setNormalTexture(normalTex)
    .setEmissiveTexture(emissiveTex)
    .setEmissiveFactor([1.0, 1.0, 1.0])
    .setRoughnessFactor(0.85)
    .setMetallicFactor(0.05);

  const posAcc = doc.createAccessor('POSITION').setArray(new Float32Array(foxBody.vertices)).setType('VEC3').setBuffer(buffer);
  const normAcc = doc.createAccessor('NORMAL').setArray(new Float32Array(foxBody.normals)).setType('VEC3').setBuffer(buffer);
  const uvAcc = doc.createAccessor('TEXCOORD_0').setArray(new Float32Array(foxBody.uvs)).setType('VEC2').setBuffer(buffer);
  const jointsAcc = doc.createAccessor('JOINTS_0').setArray(joints0).setType('VEC4').setBuffer(buffer);
  const weightsAcc = doc.createAccessor('WEIGHTS_0').setArray(weights0).setType('VEC4').setBuffer(buffer);
  const indicesAcc = doc.createAccessor('INDICES').setArray(new Uint32Array(foxBody.indices)).setType('SCALAR').setBuffer(buffer);

  const prim = doc.createPrimitive()
    .setAttribute('POSITION', posAcc)
    .setAttribute('NORMAL', normAcc)
    .setAttribute('TEXCOORD_0', uvAcc)
    .setAttribute('JOINTS_0', jointsAcc)
    .setAttribute('WEIGHTS_0', weightsAcc)
    .setIndices(indicesAcc)
    .setMaterial(material);

  const mesh = doc.createMesh('DesertFox_Mesh').addPrimitive(prim);

  const boneNodeMap = new Map();
  for (const b of FOX_BONES) {
    boneNodeMap.set(b.name, doc.createNode(b.name));
  }

  for (const b of FOX_BONES) {
    const node = boneNodeMap.get(b.name);
    if (b.parent) {
      const parentNode = boneNodeMap.get(b.parent);
      const parentBone = FOX_BONES.find(x => x.name === b.parent);
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
  const skin = doc.createSkin('DesertFox_Skin').setInverseBindMatrices(ibmAcc);
  for (const b of FOX_BONES) {
    skin.addJoint(boneNodeMap.get(b.name));
  }

  const meshNode = doc.createNode('DesertFox_Model').setMesh(mesh).setSkin(skin);
  scene.addChild(meshNode);

  // 11. Quadruped Animations: trot, idle, sit
  console.log(`>>> Synthesizing Quadruped Gait Animation Clips...`);

  // Clip 1: 'trot' (Diagonal 2-beat quadruped trot: FL+BR alternating with FR+BL)
  {
    const duration = 0.8; // 0.8s trot cycle
    const frameCount = 25;
    const times = new Float32Array(frameCount);
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();

    const trotAnim = doc.createAnimation('trot');
    const timeAcc = doc.createAccessor('trot_Time').setArray(times).setType('SCALAR').setBuffer(buffer);
    for (let i = 0; i < frameCount; i++) times[i] = (i / (frameCount - 1)) * duration;

    // Pitch legs
    const legs = [
      { bone: 'Leg_FL_Upper', phaseOffset: 0 },
      { bone: 'Leg_BR_Upper', phaseOffset: 0 },
      { bone: 'Leg_FR_Upper', phaseOffset: Math.PI },
      { bone: 'Leg_BL_Upper', phaseOffset: Math.PI },
    ];

    for (const leg of legs) {
      const targetNode = boneNodeMap.get(leg.bone);
      const quatVals = new Float32Array(frameCount * 4);

      for (let i = 0; i < frameCount; i++) {
        const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
        const pitch = Math.sin(phase + leg.phaseOffset) * 0.42;
        euler.set(pitch, 0, 0);
        quat.setFromEuler(euler);

        quatVals[i * 4] = quat.x;
        quatVals[i * 4 + 1] = quat.y;
        quatVals[i * 4 + 2] = quat.z;
        quatVals[i * 4 + 3] = quat.w;
      }

      const qAcc = doc.createAccessor(`trot_${leg.bone}_Quat`).setArray(quatVals).setType('VEC4').setBuffer(buffer);
      const sampler = doc.createAnimationSampler().setInput(timeAcc).setOutput(qAcc).setInterpolation('LINEAR');
      const channel = doc.createAnimationChannel().setTargetNode(targetNode).setTargetPath('rotation').setSampler(sampler);
      trotAnim.addSampler(sampler);
      trotAnim.addChannel(channel);
    }

    // Spine & Root subtle trot bounce
    const rootNode = boneNodeMap.get('Root');
    const posVals = new Float32Array(frameCount * 3);
    for (let i = 0; i < frameCount; i++) {
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      posVals[i * 3] = 0;
      posVals[i * 3 + 1] = 0.42 + Math.abs(Math.sin(phase * 2)) * 0.025; // double-bounce
      posVals[i * 3 + 2] = 0;
    }
    const pAcc = doc.createAccessor('trot_Root_Pos').setArray(posVals).setType('VEC3').setBuffer(buffer);
    const pSampler = doc.createAnimationSampler().setInput(timeAcc).setOutput(pAcc).setInterpolation('LINEAR');
    const pChannel = doc.createAnimationChannel().setTargetNode(rootNode).setTargetPath('translation').setSampler(pSampler);
    trotAnim.addSampler(pSampler);
    trotAnim.addChannel(pChannel);
  }

  // Clip 2: 'idle' (Alert breathing, ear swivels, tail sway)
  {
    const duration = 2.4;
    const frameCount = 73;
    const times = new Float32Array(frameCount);
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();

    const idleAnim = doc.createAnimation('idle');
    const timeAcc = doc.createAccessor('idle_Time').setArray(times).setType('SCALAR').setBuffer(buffer);
    for (let i = 0; i < frameCount; i++) times[i] = (i / (frameCount - 1)) * duration;

    // Tail wag
    const tailNode = boneNodeMap.get('Tail_Mid');
    const quatVals = new Float32Array(frameCount * 4);
    for (let i = 0; i < frameCount; i++) {
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      euler.set(0, Math.sin(phase * 2) * 0.28, 0);
      quat.setFromEuler(euler);
      quatVals[i * 4] = quat.x;
      quatVals[i * 4 + 1] = quat.y;
      quatVals[i * 4 + 2] = quat.z;
      quatVals[i * 4 + 3] = quat.w;
    }
    const qAcc = doc.createAccessor('idle_Tail_Quat').setArray(quatVals).setType('VEC4').setBuffer(buffer);
    const sampler = doc.createAnimationSampler().setInput(timeAcc).setOutput(qAcc).setInterpolation('LINEAR');
    const channel = doc.createAnimationChannel().setTargetNode(tailNode).setTargetPath('rotation').setSampler(sampler);
    idleAnim.addSampler(sampler);
    idleAnim.addChannel(channel);

    // Ear swivel
    const earLNode = boneNodeMap.get('Ear_L');
    const earQuats = new Float32Array(frameCount * 4);
    for (let i = 0; i < frameCount; i++) {
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      euler.set(Math.sin(phase) * 0.15, 0, Math.cos(phase) * 0.1);
      quat.setFromEuler(euler);
      earQuats[i * 4] = quat.x;
      earQuats[i * 4 + 1] = quat.y;
      earQuats[i * 4 + 2] = quat.z;
      earQuats[i * 4 + 3] = quat.w;
    }
    const eqAcc = doc.createAccessor('idle_Ear_Quat').setArray(earQuats).setType('VEC4').setBuffer(buffer);
    const eqSampler = doc.createAnimationSampler().setInput(timeAcc).setOutput(eqAcc).setInterpolation('LINEAR');
    const eqChannel = doc.createAnimationChannel().setTargetNode(earLNode).setTargetPath('rotation').setSampler(eqSampler);
    idleAnim.addSampler(eqSampler);
    idleAnim.addChannel(eqChannel);
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
    triangles: foxBody.indices.length / 3,
    bones: FOX_BONES.length,
    clips: ['trot', 'idle'],
  };
}

if (process.argv[1] && process.argv[1].endsWith('build-desert-fox.mjs')) {
  buildDesertFox().catch(err => {
    console.error('Desert Fox build failed:', err);
    process.exit(1);
  });
}

