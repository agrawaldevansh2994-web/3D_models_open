import fs from 'fs';
import path from 'path';
import { Document, NodeIO } from '@gltf-transform/core';
import { bakeCharacterTextures, bakeJacketTextures } from './texture-baker.mjs';
import { HUMANOID_BONES, synthesizeMotionClips } from './rig-humanoid.mjs';
import {
  buildLoftedTube,
  buildSculptedHead,
  buildArticulatedHand,
  mergeGeometries,
  computeEnvelopeSkinWeights,
  computeInverseBindMatrices,
} from './glb-builder.mjs';

/**
 * Canonical Round 2 Sample Builder: `festival_raver`
 * - 100% original procedural sculpted geometry (zero external assets, relative paths only)
 * - 15,000+ triangles across two separate skinned mesh layers:
 *   1. `Body_Mesh`: Sculpted face (eyes, nose, lips, ears, braids), inner torso, arms, 5-finger hands, cargo joggers, platform boots
 *   2. `Jacket_Mesh`: Separate swappable cropped techwear puffer jacket layer + forehead LED cyber-visor skinned to the same 52-bone skeleton
 * - 52-bone Mixamo-compatible hierarchy (`mixamorig:Hips` + spine/head + limbs + 30 finger bones)
 * - 7 unique seamless looping animation clips (`idle`, `walk`, `run`, `dance_1`, `dance_2`, `dance_3`, `wave`),
 *   each driving all 52 bones (53 channels per clip) with stance-phase foot lock at y = 0.
 */
export async function buildFestivalRaver(outPath = 'characters/festival_raver/festival_raver.glb') {
  console.log('>>> [Round 2 Sample] Building Festival Raver (Body + Separate Jacket Layer + 52-Bone Rig)...');

  // =========================================================================
  // LAYER 1: BODY MESH (Head, Braids, Inner Torso, Forearms, 5-Finger Hands, Cargo Joggers, Boots)
  // =========================================================================
  const headAndBraids = buildSculptedHead();

  const innerTorso = buildLoftedTube({
    points: [
      [0, 0.92, 0],
      [0, 1.04, 0.01],
      [0, 1.16, 0.015],
      [0, 1.28, 0.015],
      [0, 1.40, 0.005],
      [0, 1.46, 0],
    ],
    radii: [
      [0.138, 0.102],
      [0.122, 0.092],
      [0.130, 0.098],
      [0.146, 0.108],
      [0.152, 0.102],
      [0.056, 0.056],
    ],
    radialSegments: 36,
    subdivideRings: 3,
    uvVRange: [0.42, 0.72],
    foldAmp: 0.002,
    foldFreqU: 8,
    foldFreqV: 6,
  });

  const leftInnerArm = buildLoftedTube({
    points: [
      [0.16, 1.40, 0],
      [0.28, 1.31, 0],
      [0.39, 1.22, 0],
      [0.48, 1.14, 0.005],
      [0.57, 1.06, 0.01],
    ],
    radii: [
      [0.048, 0.048],
      [0.044, 0.044],
      [0.039, 0.039],
      [0.035, 0.035],
      [0.028, 0.028],
    ],
    radialSegments: 20,
    subdivideRings: 3,
    uvVRange: [0.44, 0.50],
    uvURange: [0.25, 0.75],
  });

  const rightInnerArm = buildLoftedTube({
    points: [
      [-0.16, 1.40, 0],
      [-0.28, 1.31, 0],
      [-0.39, 1.22, 0],
      [-0.48, 1.14, 0.005],
      [-0.57, 1.06, 0.01],
    ],
    radii: [
      [0.048, 0.048],
      [0.044, 0.044],
      [0.039, 0.039],
      [0.035, 0.035],
      [0.028, 0.028],
    ],
    radialSegments: 20,
    subdivideRings: 3,
    uvVRange: [0.44, 0.50],
    uvURange: [0.25, 0.75],
  });

  const leftHandMesh = buildArticulatedHand('Left');
  const rightHandMesh = buildArticulatedHand('Right');

  const leftLegMesh = buildLoftedTube({
    points: [
      [0.105, 0.92, 0],
      [0.105, 0.72, 0.01],
      [0.105, 0.49, 0.015],
      [0.105, 0.28, 0.005],
      [0.105, 0.13, -0.005],
      [0.105, 0.05, 0.02],
      [0.105, 0.00, 0.035],
    ],
    radii: [
      [0.088, 0.090],
      [0.084, 0.084],
      [0.075, 0.075],
      [0.078, 0.078],
      [0.062, 0.072],
      [0.058, 0.098],
      [0.060, 0.102],
    ],
    radialSegments: 28,
    subdivideRings: 4,
    uvVRange: [0.01, 0.41],
    uvURange: [0.5, 0.9],
    foldAmp: 0.0045,
    foldFreqU: 7,
    foldFreqV: 9,
  });

  const rightLegMesh = buildLoftedTube({
    points: [
      [-0.105, 0.92, 0],
      [-0.105, 0.72, 0.01],
      [-0.105, 0.49, 0.015],
      [-0.105, 0.28, 0.005],
      [-0.105, 0.13, -0.005],
      [-0.105, 0.05, 0.02],
      [-0.105, 0.00, 0.035],
    ],
    radii: [
      [0.088, 0.090],
      [0.084, 0.084],
      [0.075, 0.075],
      [0.078, 0.078],
      [0.062, 0.072],
      [0.058, 0.098],
      [0.060, 0.102],
    ],
    radialSegments: 28,
    subdivideRings: 4,
    uvVRange: [0.01, 0.41],
    uvURange: [0.1, 0.5],
    foldAmp: 0.0045,
    foldFreqU: 7,
    foldFreqV: 9,
  });

  const mergedBody = mergeGeometries([
    headAndBraids,
    innerTorso,
    leftInnerArm,
    rightInnerArm,
    leftHandMesh,
    rightHandMesh,
    leftLegMesh,
    rightLegMesh,
  ]);

  // =========================================================================
  // LAYER 2: SEPARATE SWAPPABLE JACKET LAYER (`Jacket_Mesh`)
  // Cropped Techwear Puffer Jacket + Quilted Sleeves + High Collar + Brow Cyber-Visor
  // Strictly outside Body_Mesh radii (+0.022m clearance) + locked garment skinning => 0 poke-through
  // =========================================================================
  const jacketTorso = buildLoftedTube({
    points: [
      [0, 1.17, 0.015], // Cropped hem above waist
      [0, 1.26, 0.015],
      [0, 1.35, 0.010],
      [0, 1.43, 0.005],
      [0, 1.49, -0.005], // High techwear stand collar
    ],
    radii: [
      [0.164, 0.128],
      [0.178, 0.138],
      [0.186, 0.142],
      [0.182, 0.132],
      [0.082, 0.082],
    ],
    radialSegments: 40,
    subdivideRings: 4,
    uvVRange: [0.02, 0.82],
    uvURange: [0.0, 1.0],
    foldAmp: 0.006,
    foldFreqU: 8,
    foldFreqV: 6,
  });

  const jacketLeftSleeve = buildLoftedTube({
    points: [
      [0.16, 1.41, 0],
      [0.28, 1.31, 0],
      [0.39, 1.22, 0],
      [0.50, 1.12, 0.005], // Cropped 3/4 cyber cuff above wrist
    ],
    radii: [
      [0.072, 0.072],
      [0.068, 0.068],
      [0.062, 0.062],
      [0.054, 0.054],
    ],
    radialSegments: 28,
    subdivideRings: 4,
    uvVRange: [0.05, 0.80],
    uvURange: [0.0, 1.0],
    foldAmp: 0.004,
    foldFreqU: 6,
    foldFreqV: 6,
  });

  const jacketRightSleeve = buildLoftedTube({
    points: [
      [-0.16, 1.41, 0],
      [-0.28, 1.31, 0],
      [-0.39, 1.22, 0],
      [-0.50, 1.12, 0.005],
    ],
    radii: [
      [0.072, 0.072],
      [0.068, 0.068],
      [0.062, 0.062],
      [0.054, 0.054],
    ],
    radialSegments: 28,
    subdivideRings: 4,
    uvVRange: [0.05, 0.80],
    uvURange: [0.0, 1.0],
    foldAmp: 0.004,
    foldFreqU: 6,
    foldFreqV: 6,
  });

  // Forehead / Crown LED Cyber-Visor (positioned at y=1.68 above eyes so eyes, nose & mouth stay 100% visible)
  const visorCrownBand = buildLoftedTube({
    points: [
      [-0.082, 1.675, 0.01],
      [-0.060, 1.680, 0.075],
      [0.0, 1.682, 0.098],
      [0.060, 1.680, 0.075],
      [0.082, 1.675, 0.01],
    ],
    radii: [
      [0.010, 0.018],
      [0.012, 0.022],
      [0.014, 0.024],
      [0.012, 0.022],
      [0.010, 0.018],
    ],
    radialSegments: 16,
    subdivideRings: 2,
    uvVRange: [0.86, 0.98],
    uvURange: [0.0, 1.0],
  });

  const mergedJacket = mergeGeometries([
    jacketTorso,
    jacketLeftSleeve,
    jacketRightSleeve,
    visorCrownBand,
  ]);

  const bodyTris = mergedBody.indices.length / 3;
  const jacketTris = mergedJacket.indices.length / 3;
  const totalTris = bodyTris + jacketTris;
  console.log(`Body_Mesh: ${bodyTris} tris | Jacket_Mesh: ${jacketTris} tris | Total: ${totalTris} tris`);

  // =========================================================================
  // SKINNING & GLTF 2.0 COMPILATION
  // =========================================================================
  const bodySkinWeights = computeEnvelopeSkinWeights(mergedBody.vertices, HUMANOID_BONES, { isGarmentLayer: false });
  const jacketSkinWeights = computeEnvelopeSkinWeights(mergedJacket.vertices, HUMANOID_BONES, { isGarmentLayer: true });
  const ibmArray = computeInverseBindMatrices(HUMANOID_BONES);

  console.log('>>> Baking Body & Jacket PBR + Emissive texture sets...');
  const bodyTextures = bakeCharacterTextures('festival_raver', 512);
  const jacketTextures = bakeJacketTextures(512);

  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene('Scene');

  function makeMaterial(name, texSet) {
    const baseTex = doc.createTexture(`${name}_BaseColor`).setImage(texSet.baseColor).setMimeType('image/png');
    const mrTex = doc.createTexture(`${name}_MR`).setImage(texSet.metallicRoughness).setMimeType('image/png');
    const normTex = doc.createTexture(`${name}_Normal`).setImage(texSet.normal).setMimeType('image/png');
    const emiTex = doc.createTexture(`${name}_Emissive`).setImage(texSet.emissive).setMimeType('image/png');

    return doc.createMaterial(name)
      .setBaseColorTexture(baseTex)
      .setMetallicRoughnessTexture(mrTex)
      .setNormalTexture(normTex)
      .setEmissiveTexture(emiTex)
      .setEmissiveFactor([1.0, 1.0, 1.0])
      .setRoughnessFactor(1.0)
      .setMetallicFactor(1.0);
  }

  const matBody = makeMaterial('M_FestivalRaver_Body', bodyTextures);
  const matJacket = makeMaterial('M_FestivalRaver_Jacket', jacketTextures);

  function createSkinnedMesh(meshName, geo, skinData, mat) {
    const posAcc = doc.createAccessor(`${meshName}_POS`).setArray(new Float32Array(geo.vertices)).setType('VEC3').setBuffer(buffer);
    const normAcc = doc.createAccessor(`${meshName}_NORM`).setArray(new Float32Array(geo.normals)).setType('VEC3').setBuffer(buffer);
    const uvAcc = doc.createAccessor(`${meshName}_UV`).setArray(new Float32Array(geo.uvs)).setType('VEC2').setBuffer(buffer);
    const jAcc = doc.createAccessor(`${meshName}_JOINTS`).setArray(skinData.joints0).setType('VEC4').setBuffer(buffer);
    const wAcc = doc.createAccessor(`${meshName}_WEIGHTS`).setArray(skinData.weights0).setType('VEC4').setBuffer(buffer);
    const idxAcc = doc.createAccessor(`${meshName}_INDICES`).setArray(new Uint32Array(geo.indices)).setType('SCALAR').setBuffer(buffer);

    const prim = doc.createPrimitive()
      .setAttribute('POSITION', posAcc)
      .setAttribute('NORMAL', normAcc)
      .setAttribute('TEXCOORD_0', uvAcc)
      .setAttribute('JOINTS_0', jAcc)
      .setAttribute('WEIGHTS_0', wAcc)
      .setIndices(idxAcc)
      .setMaterial(mat);

    return doc.createMesh(meshName).addPrimitive(prim);
  }

  const bodyMesh = createSkinnedMesh('Body_Mesh', mergedBody, bodySkinWeights, matBody);
  const jacketMesh = createSkinnedMesh('Jacket_Mesh', mergedJacket, jacketSkinWeights, matJacket);

  // Build 52-Bone Mixamo Skeleton Node Hierarchy
  const boneNodeMap = new Map();
  const rootBones = [];

  for (const b of HUMANOID_BONES) {
    const node = doc.createNode(b.name);
    boneNodeMap.set(b.name, node);
  }

  for (const b of HUMANOID_BONES) {
    const node = boneNodeMap.get(b.name);
    if (b.parent) {
      const parentNode = boneNodeMap.get(b.parent);
      const parentBone = HUMANOID_BONES.find(x => x.name === b.parent);
      node.setTranslation([
        b.pos[0] - parentBone.pos[0],
        b.pos[1] - parentBone.pos[1],
        b.pos[2] - parentBone.pos[2],
      ]);
      parentNode.addChild(node);
    } else {
      node.setTranslation(b.pos);
      rootBones.push(node);
    }
  }

  const ibmAcc = doc.createAccessor('IBM').setArray(ibmArray).setType('MAT4').setBuffer(buffer);
  const skin = doc.createSkin('Humanoid_Skin').setInverseBindMatrices(ibmAcc);
  for (const b of HUMANOID_BONES) {
    skin.addJoint(boneNodeMap.get(b.name));
  }

  // Add separate SkinnedMesh nodes for Body and swappable Jacket layer
  const bodyNode = doc.createNode('FestivalRaver_Body').setMesh(bodyMesh).setSkin(skin);
  const jacketNode = doc.createNode('FestivalRaver_Jacket').setMesh(jacketMesh).setSkin(skin);

  scene.addChild(bodyNode);
  scene.addChild(jacketNode);
  for (const rb of rootBones) {
    scene.addChild(rb);
  }

  // Bake all 7 full-body 52-bone animation clips
  const clips = synthesizeMotionClips(30);
  for (const clip of clips) {
    const gltfAnim = doc.createAnimation(clip.name);
    for (const track of clip.tracks) {
      const boneName = track.name.replace('.quaternion', '').replace('.position', '');
      const boneNode = boneNodeMap.get(boneName);
      if (!boneNode) continue;

      const inputAcc = doc.createAccessor(`${clip.name}_${track.name}_Time`)
        .setArray(track.times)
        .setType('SCALAR')
        .setBuffer(buffer);
      const outputAcc = doc.createAccessor(`${clip.name}_${track.name}_Val`)
        .setArray(track.values)
        .setType(track.type === 'quaternion' ? 'VEC4' : 'VEC3')
        .setBuffer(buffer);

      const sampler = doc.createAnimationSampler()
        .setInput(inputAcc)
        .setOutput(outputAcc)
        .setInterpolation('LINEAR');

      const channel = doc.createAnimationChannel()
        .setTargetNode(boneNode)
        .setTargetPath(track.type === 'quaternion' ? 'rotation' : 'translation')
        .setSampler(sampler);

      gltfAnim.addSampler(sampler);
      gltfAnim.addChannel(channel);
    }
  }

  const io = new NodeIO();
  const glbBuffer = await io.writeBinary(doc);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, Buffer.from(glbBuffer));

  console.log(`>>> Compiled ${outPath}: ${(glbBuffer.byteLength / 1024).toFixed(1)} KB, ${totalTris} tris, ${HUMANOID_BONES.length} bones, ${clips.length} clips.`);
  return {
    filePath: outPath,
    fileSizeKB: glbBuffer.byteLength / 1024,
    triangles: totalTris,
    bodyTris,
    jacketTris,
    bones: HUMANOID_BONES.length,
    clips: clips.map(c => ({ name: c.name, channels: c.tracks.length })),
  };
}

if (process.argv[1] && process.argv[1].endsWith('build-festival-raver.mjs')) {
  buildFestivalRaver('characters/festival_raver/festival_raver.glb').catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
  });
}
