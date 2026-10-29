import fs from 'fs';
import path from 'path';
import { Document, NodeIO } from '@gltf-transform/core';
import * as THREE from 'three';
import { bakeCharacterTextures } from './texture-baker.mjs';

/**
 * Hero glTF Compiler for Playa Art Character Studio.
 * Correctly preserves normalized float conversion, complete skeleton hierarchy,
 * and bakes high-energy dance and walk cycles.
 */

const DANCES_JSON = 'C:/Users/agraw/Downloads/backups/Gemini/forest_rave/public/dances/dances.json';
const DANCES_B64 = 'C:/Users/agraw/Downloads/backups/Gemini/forest_rave/public/dances/dances.b64';
const CROWD_DIR = 'C:/Users/agraw/Downloads/backups/Gemini/forest_rave/public/chars';

export async function compileHeroCharacter({
  id,
  baseCharFile,
  theme,
  danceIndices,
  outPath,
}) {
  console.log(`\n======================================================`);
  console.log(`>>> FORGING HERO CHARACTER: [${id}]`);
  console.log(`======================================================`);

  // 1. Read base crowd character glTF
  const srcGltfPath = path.join(CROWD_DIR, baseCharFile);
  const srcGltf = JSON.parse(fs.readFileSync(srcGltfPath, 'utf8'));
  const srcBin = Buffer.from(srcGltf.buffers[0].uri.split(',')[1], 'base64');

  function getAccessorArray(accIndex) {
    const acc = srcGltf.accessors[accIndex];
    const bv = srcGltf.bufferViews[acc.bufferView];
    const byteOffset = (bv.byteOffset || 0) + (acc.byteOffset || 0);

    const typeCountMap = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
    const numComponents = typeCountMap[acc.type];
    const totalCount = acc.count * numComponents;

    if (acc.componentType === 5126) {
      return new Float32Array(srcBin.buffer, srcBin.byteOffset + byteOffset, totalCount);
    } else if (acc.componentType === 5123) {
      return new Uint16Array(srcBin.buffer, srcBin.byteOffset + byteOffset, totalCount);
    } else if (acc.componentType === 5125) {
      return new Uint32Array(srcBin.buffer, srcBin.byteOffset + byteOffset, totalCount);
    } else if (acc.componentType === 5121) {
      return new Uint8Array(srcBin.buffer, srcBin.byteOffset + byteOffset, totalCount);
    } else if (acc.componentType === 5120) {
      return new Int8Array(srcBin.buffer, srcBin.byteOffset + byteOffset, totalCount);
    }
    throw new Error(`Unsupported component type: ${acc.componentType}`);
  }

  // 2. Extract Geometry attributes
  const prim = srcGltf.meshes[0].primitives[0];
  const posArr = getAccessorArray(prim.attributes.POSITION);
  const rawNormArr = getAccessorArray(prim.attributes.NORMAL);
  const rawJointsArr = getAccessorArray(prim.attributes.JOINTS_0);
  const rawWeightsArr = getAccessorArray(prim.attributes.WEIGHTS_0);
  const indicesArr = getAccessorArray(prim.indices);

  const numVertices = posArr.length / 3;
  console.log(`Geometry: ${numVertices} vertices, ${indicesArr.length / 3} triangles`);

  // Unpack NORMAL from int8 (-128..127) to float32 (-1.0..1.0)
  const normArr = new Float32Array(numVertices * 3);
  for (let i = 0; i < rawNormArr.length; i++) {
    normArr[i] = Math.max(-1.0, rawNormArr[i] / 127.0);
  }

  // Unpack WEIGHTS_0 from uint8 (0..255) to float32 (0.0..1.0)
  const weightsArr = new Float32Array(numVertices * 4);
  for (let i = 0; i < numVertices; i++) {
    const w0 = rawWeightsArr[i * 4] / 255.0;
    const w1 = rawWeightsArr[i * 4 + 1] / 255.0;
    const w2 = rawWeightsArr[i * 4 + 2] / 255.0;
    const w3 = rawWeightsArr[i * 4 + 3] / 255.0;
    const sum = w0 + w1 + w2 + w3;
    weightsArr[i * 4] = sum > 0 ? w0 / sum : 1.0;
    weightsArr[i * 4 + 1] = sum > 0 ? w1 / sum : 0.0;
    weightsArr[i * 4 + 2] = sum > 0 ? w2 / sum : 0.0;
    weightsArr[i * 4 + 3] = sum > 0 ? w3 / sum : 0.0;
  }

  // Joints keep as Uint16Array for glTF standard
  const jointsArr = new Uint16Array(rawJointsArr);

  // 3. Normalized UV coordinates
  const uvArr = new Float32Array(numVertices * 2);
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < numVertices; i++) {
    const y = posArr[i * 3 + 1];
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const height = maxY - minY;

  for (let i = 0; i < numVertices; i++) {
    const x = posArr[i * 3];
    const y = posArr[i * 3 + 1];
    const z = posArr[i * 3 + 2];

    const u = (Math.atan2(x, z) / (2 * Math.PI) + 0.5) % 1.0;
    const v = Math.max(0, Math.min(1, (y - minY) / height));

    uvArr[i * 2] = u;
    uvArr[i * 2 + 1] = v;
  }

  // 4. Bake PBR Textures
  console.log(`>>> Baking PBR textures for ${theme}...`);
  const textures = bakeCharacterTextures(theme, 512);

  // 5. Build glTF Document
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene('Scene');

  const baseColorTex = doc.createTexture('BaseColor').setImage(textures.baseColor).setMimeType('image/png');
  const mrTex = doc.createTexture('MetallicRoughness').setImage(textures.metallicRoughness).setMimeType('image/png');
  const normalTex = doc.createTexture('Normal').setImage(textures.normal).setMimeType('image/png');
  const emissiveTex = doc.createTexture('Emissive').setImage(textures.emissive).setMimeType('image/png');

  const material = doc.createMaterial(`M_${id}`)
    .setBaseColorTexture(baseColorTex)
    .setMetallicRoughnessTexture(mrTex)
    .setNormalTexture(normalTex)
    .setEmissiveTexture(emissiveTex)
    .setEmissiveFactor([1.0, 1.0, 1.0])
    .setRoughnessFactor(1.0)
    .setMetallicFactor(1.0);

  const posAcc = doc.createAccessor('POSITION').setArray(posArr).setType('VEC3').setBuffer(buffer);
  const normAcc = doc.createAccessor('NORMAL').setArray(normArr).setType('VEC3').setBuffer(buffer);
  const uvAcc = doc.createAccessor('TEXCOORD_0').setArray(uvArr).setType('VEC2').setBuffer(buffer);
  const jointsAcc = doc.createAccessor('JOINTS_0').setArray(jointsArr).setType('VEC4').setBuffer(buffer);
  const weightsAcc = doc.createAccessor('WEIGHTS_0').setArray(weightsArr).setType('VEC4').setBuffer(buffer);
  const indicesAcc = doc.createAccessor('INDICES').setArray(indicesArr).setType('SCALAR').setBuffer(buffer);

  const newPrim = doc.createPrimitive()
    .setAttribute('POSITION', posAcc)
    .setAttribute('NORMAL', normAcc)
    .setAttribute('TEXCOORD_0', uvAcc)
    .setAttribute('JOINTS_0', jointsAcc)
    .setAttribute('WEIGHTS_0', weightsAcc)
    .setIndices(indicesAcc)
    .setMaterial(material);

  const newMesh = doc.createMesh(`${id}_Mesh`).addPrimitive(newPrim);

  // 6. Build Skeleton Hierarchy (reproducing exact node tree of CharacterArmature)
  console.log(`>>> Building Skeleton Hierarchy (62 joints)...`);
  const nodeMap = new Map();
  for (let i = 0; i < srcGltf.nodes.length; i++) {
    const srcNode = srcGltf.nodes[i];
    const n = doc.createNode(srcNode.name);
    if (srcNode.translation) n.setTranslation(srcNode.translation);
    if (srcNode.rotation) n.setRotation(srcNode.rotation);
    if (srcNode.scale) n.setScale(srcNode.scale);
    nodeMap.set(i, n);
  }

  // Hook children
  for (let i = 0; i < srcGltf.nodes.length; i++) {
    const srcNode = srcGltf.nodes[i];
    if (srcNode.children) {
      const parentNode = nodeMap.get(i);
      for (const chIdx of srcNode.children) {
        parentNode.addChild(nodeMap.get(chIdx));
      }
    }
  }

  // Create glTF Skin
  const srcSkin = srcGltf.skins[0];
  const ibmArr = getAccessorArray(srcSkin.inverseBindMatrices);
  const ibmAcc = doc.createAccessor('IBM').setArray(ibmArr).setType('MAT4').setBuffer(buffer);

  const skin = doc.createSkin(`${id}_Skin`).setInverseBindMatrices(ibmAcc);
  for (const jIdx of srcSkin.joints) {
    skin.addJoint(nodeMap.get(jIdx));
  }

  // Mesh Node placed under CharacterArmature (node 66) just like original!
  const armatureNode = nodeMap.get(66);
  const meshNode = nodeMap.get(62); // Body_Punk node
  meshNode.setMesh(newMesh).setSkin(skin);

  scene.addChild(armatureNode);

  // 7. Animations
  console.log(`>>> Baking Animation Clips...`);
  const nodeByName = new Map();
  for (const [idx, node] of nodeMap.entries()) {
    nodeByName.set(node.getName(), node);
  }

  function resolveBoneNode(name) {
    if (nodeByName.has(name)) return nodeByName.get(name);
    const dotName = name.replace('L', '.L').replace('R', '.R');
    if (nodeByName.has(dotName)) return nodeByName.get(dotName);
    return null;
  }

  // 7a. Original Walk Cycle
  if (srcGltf.animations && srcGltf.animations.length > 0) {
    const walkSrc = srcGltf.animations[0];
    const walkAnim = doc.createAnimation('walk');

    for (const ch of walkSrc.channels) {
      const targetNode = nodeMap.get(ch.target.node);
      const samplerSrc = walkSrc.samplers[ch.sampler];

      const inputArr = getAccessorArray(samplerSrc.input);
      const outputArr = getAccessorArray(samplerSrc.output);

      const inAcc = doc.createAccessor(`walk_${targetNode.getName()}_Time`).setArray(inputArr).setType('SCALAR').setBuffer(buffer);
      const outAcc = doc.createAccessor(`walk_${targetNode.getName()}_Val`).setArray(outputArr).setType(ch.target.path === 'rotation' ? 'VEC4' : 'VEC3').setBuffer(buffer);

      const sampler = doc.createAnimationSampler()
        .setInput(inAcc)
        .setOutput(outAcc)
        .setInterpolation(samplerSrc.interpolation || 'LINEAR');

      const channel = doc.createAnimationChannel()
        .setTargetNode(targetNode)
        .setTargetPath(ch.target.path)
        .setSampler(sampler);

      walkAnim.addSampler(sampler);
      walkAnim.addChannel(channel);
    }
    console.log(`- Baked clip: [walk] (${walkSrc.channels.length} channels)`);
  }

  // 7b. Psytrance / Rave Loops
  const dancesMeta = JSON.parse(fs.readFileSync(DANCES_JSON, 'utf8'));
  const dancesB64 = fs.readFileSync(DANCES_B64, 'utf8').trim();
  const dancesBin = Buffer.from(dancesB64, 'base64');
  const danceNames = ['dance_1', 'dance_2', 'dance_3'];

  for (let k = 0; k < danceIndices.length; k++) {
    const dIdx = danceIndices[k];
    const meta = dancesMeta[dIdx];
    const clipName = danceNames[k] || `dance_${k + 1}`;

    const T = meta.frames;
    const nb = meta.bones.length;
    const np = meta.pos.length;
    const fps = meta.fps;

    const q = new Int16Array(dancesBin.buffer, dancesBin.byteOffset + meta.qOff, T * nb * 4);
    const p = new Int16Array(dancesBin.buffer, dancesBin.byteOffset + meta.pOff, T * np * 3);

    const times = new Float32Array(T);
    for (let i = 0; i < T; i++) times[i] = i / fps;

    const danceAnim = doc.createAnimation(clipName);
    const timeAcc = doc.createAccessor(`${clipName}_Time`).setArray(times).setType('SCALAR').setBuffer(buffer);

    for (let b = 0; b < nb; b++) {
      const boneName = meta.bones[b];
      const targetNode = resolveBoneNode(boneName);
      if (!targetNode) continue;

      const quatVals = new Float32Array(T * 4);
      for (let i = 0; i < T; i++) {
        const qIdx = (i * nb + b) * 4;
        quatVals[i * 4] = q[qIdx] / 32767;
        quatVals[i * 4 + 1] = q[qIdx + 1] / 32767;
        quatVals[i * 4 + 2] = q[qIdx + 2] / 32767;
        quatVals[i * 4 + 3] = q[qIdx + 3] / 32767;
      }

      const quatAcc = doc.createAccessor(`${clipName}_${boneName}_Quat`).setArray(quatVals).setType('VEC4').setBuffer(buffer);
      const sampler = doc.createAnimationSampler().setInput(timeAcc).setOutput(quatAcc).setInterpolation('LINEAR');
      const channel = doc.createAnimationChannel().setTargetNode(targetNode).setTargetPath('rotation').setSampler(sampler);

      danceAnim.addSampler(sampler);
      danceAnim.addChannel(channel);
    }

    for (let b = 0; b < np; b++) {
      const boneName = meta.pos[b];
      const targetNode = resolveBoneNode(boneName);
      if (!targetNode) continue;

      const posVals = new Float32Array(T * 3);
      for (let i = 0; i < T; i++) {
        const pIdx = (i * np + b) * 3;
        posVals[i * 3] = p[pIdx] * meta.pScale;
        posVals[i * 3 + 1] = p[pIdx + 1] * meta.pScale;
        posVals[i * 3 + 2] = p[pIdx + 2] * meta.pScale;
      }

      const pAcc = doc.createAccessor(`${clipName}_${boneName}_Pos`).setArray(posVals).setType('VEC3').setBuffer(buffer);
      const sampler = doc.createAnimationSampler().setInput(timeAcc).setOutput(pAcc).setInterpolation('LINEAR');
      const channel = doc.createAnimationChannel().setTargetNode(targetNode).setTargetPath('translation').setSampler(sampler);

      danceAnim.addSampler(sampler);
      danceAnim.addChannel(channel);
    }

    console.log(`- Baked clip: [${clipName}] (${meta.name}, ${T} frames, ${fps} fps, BPM: ${meta.bpm})`);
  }

  const io = new NodeIO();
  const glbBuffer = await io.writeBinary(doc);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, Buffer.from(glbBuffer));

  const fileSizeKB = glbBuffer.byteLength / 1024;
  console.log(`>>> Written ${outPath} (${fileSizeKB.toFixed(1)} KB)`);

  return {
    filePath: outPath,
    fileSizeKB,
    triangles: indicesArr.length / 3,
    bones: srcSkin.joints.length,
    clips: ['walk', ...danceNames],
  };
}
