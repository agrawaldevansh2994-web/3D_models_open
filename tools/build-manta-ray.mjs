import fs from 'fs';
import path from 'path';
import { Document, NodeIO } from '@gltf-transform/core';
import * as THREE from 'three';
import { bakeCharacterTextures } from './texture-baker.mjs';

/**
 * Organic Sculpted Pelagic Manta Ray Builder
 * Produces curved, hydrofoil diamond wings, curved cephalic horn lobes, whip tail,
 * and dark obsidian dorsal skin with cyan bioluminescent spots.
 */

export async function buildMantaRay(outPath = 'characters/manta_ray/manta_ray.glb') {
  console.log(`\n======================================================`);
  console.log(`>>> SCULPTING ORGANIC PELAGIC MANTA RAY: [manta_ray]`);
  console.log(`======================================================`);

  const span = 3.2;       // 3.2m wingspan
  const halfSpan = span / 2;
  const chord = 2.4;      // 2.4m length

  const xSegments = 48;
  const zSegments = 36;

  const vertices = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  function getPlanform(normX) {
    const sweep = Math.pow(1.0 - normX, 0.45);
    return sweep;
  }

  // 1. Dorsal (top) surface
  for (let j = 0; j <= zSegments; j++) {
    const v = j / zSegments;
    const zBase = (0.45 - v) * chord;

    for (let i = 0; i <= xSegments; i++) {
      const u = i / xSegments;
      const normX = (u - 0.5) * 2.0;
      const absX = Math.abs(normX);
      const x = normX * halfSpan;

      const planform = getPlanform(absX);
      const z = zBase * planform;

      const bodyMass = Math.max(0, 1.0 - absX * 1.5) * Math.sin(v * Math.PI);
      const wingThickness = Math.pow(Math.max(0, 1.0 - absX), 1.5) * 0.12 * Math.sin(v * Math.PI);
      const camber = (bodyMass * 0.28 + wingThickness);

      let hornLift = 0;
      if (v < 0.15 && Math.abs(absX - 0.18) < 0.08) {
        hornLift = Math.sin((v / 0.15) * Math.PI) * 0.08;
      }

      const y = 1.0 + camber + hornLift;

      vertices.push(x, y, z);
      normals.push(0, 1, 0);
      uvs.push(absX * 0.48, v); // 0..0.48 = Dorsal
    }
  }

  // 2. Ventral (bottom) surface
  const dorsalCount = vertices.length / 3;
  for (let j = 0; j <= zSegments; j++) {
    const v = j / zSegments;
    const zBase = (0.45 - v) * chord;

    for (let i = 0; i <= xSegments; i++) {
      const u = i / xSegments;
      const normX = (u - 0.5) * 2.0;
      const absX = Math.abs(normX);
      const x = normX * halfSpan;

      const planform = getPlanform(absX);
      const z = zBase * planform;

      const bodyMass = Math.max(0, 1.0 - absX * 1.5) * Math.sin(v * Math.PI);
      const wingThickness = Math.pow(Math.max(0, 1.0 - absX), 1.5) * 0.08 * Math.sin(v * Math.PI);
      const camber = (bodyMass * 0.14 + wingThickness);

      const y = 1.0 - camber;

      vertices.push(x, y, z);
      normals.push(0, -1, 0);
      uvs.push(0.52 + absX * 0.48, v); // 0.52..1.0 = Ventral
    }
  }

  // Dorsal face indices: Winding [a, d, b] so normals point UPWARD (+Y)
  for (let j = 0; j < zSegments; j++) {
    for (let i = 0; i < xSegments; i++) {
      const a = j * (xSegments + 1) + i;
      const b = (j + 1) * (xSegments + 1) + i;
      const c = (j + 1) * (xSegments + 1) + (i + 1);
      const d = j * (xSegments + 1) + (i + 1);
      indices.push(a, d, b);
      indices.push(b, d, c);
    }
  }

  // Ventral face indices: Winding [a, b, d] so normals point DOWNWARD (-Y)
  for (let j = 0; j < zSegments; j++) {
    for (let i = 0; i < xSegments; i++) {
      const a = dorsalCount + j * (xSegments + 1) + i;
      const b = dorsalCount + (j + 1) * (xSegments + 1) + i;
      const c = dorsalCount + (j + 1) * (xSegments + 1) + (i + 1);
      const d = dorsalCount + j * (xSegments + 1) + (i + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  // Recompute smooth face-averaged normals
  const numVerts = vertices.length / 3;
  const pA = new THREE.Vector3(), pB = new THREE.Vector3(), pC = new THREE.Vector3(), cb = new THREE.Vector3(), ab = new THREE.Vector3();
  const accumNormals = new Float32Array(numVerts * 3);

  for (let i = 0; i < indices.length; i += 3) {
    const iA = indices[i], iB = indices[i + 1], iC = indices[i + 2];
    pA.set(vertices[iA * 3], vertices[iA * 3 + 1], vertices[iA * 3 + 2]);
    pB.set(vertices[iB * 3], vertices[iB * 3 + 1], vertices[iB * 3 + 2]);
    pC.set(vertices[iC * 3], vertices[iC * 3 + 1], vertices[iC * 3 + 2]);

    cb.subVectors(pC, pB);
    ab.subVectors(pA, pB);
    cb.cross(ab).normalize();

    accumNormals[iA * 3] += cb.x; accumNormals[iA * 3 + 1] += cb.y; accumNormals[iA * 3 + 2] += cb.z;
    accumNormals[iB * 3] += cb.x; accumNormals[iB * 3 + 1] += cb.y; accumNormals[iB * 3 + 2] += cb.z;
    accumNormals[iC * 3] += cb.x; accumNormals[iC * 3 + 1] += cb.y; accumNormals[iC * 3 + 2] += cb.z;
  }

  for (let i = 0; i < numVerts; i++) {
    pA.set(accumNormals[i * 3], accumNormals[i * 3 + 1], accumNormals[i * 3 + 2]).normalize();
    normals[i * 3] = pA.x; normals[i * 3 + 1] = pA.y; normals[i * 3 + 2] = pA.z;
  }

  console.log(`Manta Mesh generated: ${numVerts} vertices, ${indices.length / 3} triangles`);

  // 2. Manta Skeleton
  const MANTA_BONES = [
    { name: 'Root', parent: null, pos: [0, 1.0, 0] },
    { name: 'Spine_Head', parent: 'Root', pos: [0, 1.0, 0.7] },
    { name: 'Spine_Mid', parent: 'Root', pos: [0, 1.0, 0.0] },
    { name: 'Spine_TailBase', parent: 'Spine_Mid', pos: [0, 1.0, -0.7] },
    { name: 'Tail_1', parent: 'Spine_TailBase', pos: [0, 1.0, -1.1] },
    { name: 'Tail_2', parent: 'Tail_1', pos: [0, 1.0, -1.5] },

    // Left Wing (x > 0)
    { name: 'Wing_L_1', parent: 'Root', pos: [0.35, 1.0, 0.05] },
    { name: 'Wing_L_2', parent: 'Wing_L_1', pos: [0.75, 1.0, 0.0] },
    { name: 'Wing_L_3', parent: 'Wing_L_2', pos: [1.15, 1.0, -0.05] },
    { name: 'Wing_L_4', parent: 'Wing_L_3', pos: [1.55, 1.0, -0.1] },

    // Right Wing (x < 0)
    { name: 'Wing_R_1', parent: 'Root', pos: [-0.35, 1.0, 0.05] },
    { name: 'Wing_R_2', parent: 'Wing_R_1', pos: [-0.75, 1.0, 0.0] },
    { name: 'Wing_R_3', parent: 'Wing_R_2', pos: [-1.15, 1.0, -0.05] },
    { name: 'Wing_R_4', parent: 'Wing_R_3', pos: [-1.55, 1.0, -0.1] },

    { name: 'Cephalic_L', parent: 'Spine_Head', pos: [0.25, 1.0, 1.0] },
    { name: 'Cephalic_R', parent: 'Spine_Head', pos: [-0.25, 1.0, 1.0] },
  ];

  // 3. Compute 4-bone smooth skin weights
  const joints0 = new Uint16Array(numVerts * 4);
  const weights0 = new Float32Array(numVerts * 4);

  for (let i = 0; i < numVerts; i++) {
    const x = vertices[i * 3];
    const z = vertices[i * 3 + 2];
    const normX = x / halfSpan;

    if (Math.abs(normX) < 0.22) {
      if (z > 0.4) {
        joints0[i * 4] = 1; weights0[i * 4] = 0.8;
        joints0[i * 4 + 1] = 0; weights0[i * 4 + 1] = 0.2;
      } else if (z < -0.5) {
        joints0[i * 4] = 3; weights0[i * 4] = 0.6;
        joints0[i * 4 + 1] = 4; weights0[i * 4 + 1] = 0.4;
      } else {
        joints0[i * 4] = 2; weights0[i * 4] = 0.7;
        joints0[i * 4 + 1] = 0; weights0[i * 4 + 1] = 0.3;
      }
    } else if (normX > 0) {
      const w = normX;
      if (w < 0.45) {
        joints0[i * 4] = 6; weights0[i * 4] = 0.7;
        joints0[i * 4 + 1] = 7; weights0[i * 4 + 1] = 0.3;
      } else if (w < 0.75) {
        joints0[i * 4] = 7; weights0[i * 4] = 0.5;
        joints0[i * 4 + 1] = 8; weights0[i * 4 + 1] = 0.5;
      } else {
        joints0[i * 4] = 8; weights0[i * 4] = 0.3;
        joints0[i * 4 + 1] = 9; weights0[i * 4 + 1] = 0.7;
      }
    } else {
      const w = -normX;
      if (w < 0.45) {
        joints0[i * 4] = 10; weights0[i * 4] = 0.7;
        joints0[i * 4 + 1] = 11; weights0[i * 4 + 1] = 0.3;
      } else if (w < 0.75) {
        joints0[i * 4] = 11; weights0[i * 4] = 0.5;
        joints0[i * 4 + 1] = 12; weights0[i * 4 + 1] = 0.5;
      } else {
        joints0[i * 4] = 12; weights0[i * 4] = 0.3;
        joints0[i * 4 + 1] = 13; weights0[i * 4 + 1] = 0.7;
      }
    }
  }

  // 4. Inverse Bind Matrices
  const ibmArray = new Float32Array(MANTA_BONES.length * 16);
  for (let i = 0; i < MANTA_BONES.length; i++) {
    const b = MANTA_BONES[i];
    const m = new THREE.Matrix4().makeTranslation(b.pos[0], b.pos[1], b.pos[2]);
    const inv = new THREE.Matrix4().copy(m).invert();
    ibmArray.set(inv.elements, i * 16);
  }

  // 5. Bake Textures
  console.log(`>>> Baking Manta Ray PBR + Constellation Emissive textures...`);
  const textures = bakeCharacterTextures('manta_ray', 512);

  // 6. glTF Document
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene('Scene');

  const baseColorTex = doc.createTexture('BaseColor').setImage(textures.baseColor).setMimeType('image/png');
  const mrTex = doc.createTexture('MetallicRoughness').setImage(textures.metallicRoughness).setMimeType('image/png');
  const normalTex = doc.createTexture('Normal').setImage(textures.normal).setMimeType('image/png');
  const emissiveTex = doc.createTexture('Emissive').setImage(textures.emissive).setMimeType('image/png');

  const material = doc.createMaterial('M_MantaRay')
    .setBaseColorTexture(baseColorTex)
    .setMetallicRoughnessTexture(mrTex)
    .setNormalTexture(normalTex)
    .setEmissiveTexture(emissiveTex)
    .setEmissiveFactor([1.0, 1.0, 1.0])
    .setRoughnessFactor(0.85)
    .setMetallicFactor(0.15);

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

  const mesh = doc.createMesh('MantaRay_Mesh').addPrimitive(prim);

  // Nodes
  const boneNodeMap = new Map();
  for (const b of MANTA_BONES) {
    boneNodeMap.set(b.name, doc.createNode(b.name));
  }

  for (const b of MANTA_BONES) {
    const node = boneNodeMap.get(b.name);
    if (b.parent) {
      const parentNode = boneNodeMap.get(b.parent);
      const parentBone = MANTA_BONES.find(x => x.name === b.parent);
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
  const skin = doc.createSkin('MantaRay_Skin').setInverseBindMatrices(ibmAcc);
  for (const b of MANTA_BONES) {
    skin.addJoint(boneNodeMap.get(b.name));
  }

  const meshNode = doc.createNode('MantaRay_Model').setMesh(mesh).setSkin(skin);
  scene.addChild(meshNode);

  // 7. Synthesize Pelagic Marine Animations
  console.log(`>>> Synthesizing Pelagic Manta Animation Clips...`);

  // Clip 1: 'glide' (Effortless sinusoidal wing wave)
  {
    const duration = 3.0;
    const frameCount = 91;
    const times = new Float32Array(frameCount);
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();

    const glideAnim = doc.createAnimation('glide');
    const timeAcc = doc.createAccessor('glide_Time').setArray(times).setType('SCALAR').setBuffer(buffer);
    for (let i = 0; i < frameCount; i++) times[i] = (i / (frameCount - 1)) * duration;

    for (let side of ['L', 'R']) {
      const s = side === 'L' ? 1 : -1;
      for (let k = 1; k <= 4; k++) {
        const boneName = `Wing_${side}_${k}`;
        const targetNode = boneNodeMap.get(boneName);
        const quatVals = new Float32Array(frameCount * 4);
        const phaseLag = k * 0.45;

        for (let i = 0; i < frameCount; i++) {
          const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
          const angle = Math.sin(phase - phaseLag) * (0.15 * k);
          euler.set(0, 0, s * angle);
          quat.setFromEuler(euler);

          quatVals[i * 4] = quat.x;
          quatVals[i * 4 + 1] = quat.y;
          quatVals[i * 4 + 2] = quat.z;
          quatVals[i * 4 + 3] = quat.w;
        }

        const qAcc = doc.createAccessor(`glide_${boneName}_Quat`).setArray(quatVals).setType('VEC4').setBuffer(buffer);
        const sampler = doc.createAnimationSampler().setInput(timeAcc).setOutput(qAcc).setInterpolation('LINEAR');
        const channel = doc.createAnimationChannel().setTargetNode(targetNode).setTargetPath('rotation').setSampler(sampler);
        glideAnim.addSampler(sampler);
        glideAnim.addChannel(channel);
      }
    }

    const rootNode = boneNodeMap.get('Root');
    const posVals = new Float32Array(frameCount * 3);
    for (let i = 0; i < frameCount; i++) {
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      posVals[i * 3] = 0;
      posVals[i * 3 + 1] = 1.0 + Math.cos(phase) * 0.12;
      posVals[i * 3 + 2] = 0;
    }
    const pAcc = doc.createAccessor('glide_Root_Pos').setArray(posVals).setType('VEC3').setBuffer(buffer);
    const posSampler = doc.createAnimationSampler().setInput(timeAcc).setOutput(pAcc).setInterpolation('LINEAR');
    const posChannel = doc.createAnimationChannel().setTargetNode(rootNode).setTargetPath('translation').setSampler(posSampler);
    glideAnim.addSampler(posSampler);
    glideAnim.addChannel(posChannel);
  }

  // Clip 2: 'bank' (30-degree banking graceful reef turn)
  {
    const duration = 3.0;
    const frameCount = 91;
    const times = new Float32Array(frameCount);
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();

    const bankAnim = doc.createAnimation('bank');
    const timeAcc = doc.createAccessor('bank_Time').setArray(times).setType('SCALAR').setBuffer(buffer);
    for (let i = 0; i < frameCount; i++) times[i] = (i / (frameCount - 1)) * duration;

    const rootNode = boneNodeMap.get('Root');
    const quatVals = new Float32Array(frameCount * 4);
    for (let i = 0; i < frameCount; i++) {
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      const bankAngle = Math.sin(phase) * 0.52;
      euler.set(0.08, Math.sin(phase) * 0.2, bankAngle);
      quat.setFromEuler(euler);

      quatVals[i * 4] = quat.x;
      quatVals[i * 4 + 1] = quat.y;
      quatVals[i * 4 + 2] = quat.z;
      quatVals[i * 4 + 3] = quat.w;
    }
    const qAcc = doc.createAccessor('bank_Root_Quat').setArray(quatVals).setType('VEC4').setBuffer(buffer);
    const sampler = doc.createAnimationSampler().setInput(timeAcc).setOutput(qAcc).setInterpolation('LINEAR');
    const channel = doc.createAnimationChannel().setTargetNode(rootNode).setTargetPath('rotation').setSampler(sampler);
    bankAnim.addSampler(sampler);
    bankAnim.addChannel(channel);
  }

  // Clip 3: 'barrel_roll' (360-degree feeding loop)
  {
    const duration = 4.0;
    const frameCount = 121;
    const times = new Float32Array(frameCount);
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();

    const rollAnim = doc.createAnimation('barrel_roll');
    const timeAcc = doc.createAccessor('barrel_roll_Time').setArray(times).setType('SCALAR').setBuffer(buffer);
    for (let i = 0; i < frameCount; i++) times[i] = (i / (frameCount - 1)) * duration;

    const rootNode = boneNodeMap.get('Root');
    const quatVals = new Float32Array(frameCount * 4);
    for (let i = 0; i < frameCount; i++) {
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      euler.set(-phase, 0, Math.sin(phase) * 0.3);
      quat.setFromEuler(euler);

      quatVals[i * 4] = quat.x;
      quatVals[i * 4 + 1] = quat.y;
      quatVals[i * 4 + 2] = quat.z;
      quatVals[i * 4 + 3] = quat.w;
    }
    const qAcc = doc.createAccessor('roll_Root_Quat').setArray(quatVals).setType('VEC4').setBuffer(buffer);
    const sampler = doc.createAnimationSampler().setInput(timeAcc).setOutput(qAcc).setInterpolation('LINEAR');
    const channel = doc.createAnimationChannel().setTargetNode(rootNode).setTargetPath('rotation').setSampler(sampler);
    rollAnim.addSampler(sampler);
    rollAnim.addChannel(channel);
  }

  // Write binary .glb
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
    bones: MANTA_BONES.length,
    clips: ['glide', 'bank', 'barrel_roll'],
  };
}

if (process.argv[1] && process.argv[1].endsWith('build-manta-ray.mjs')) {
  buildMantaRay().catch(err => {
    console.error('Manta Ray build failed:', err);
    process.exit(1);
  });
}
