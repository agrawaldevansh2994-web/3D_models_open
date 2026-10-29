import fs from 'fs';
import path from 'path';
import { Document, NodeIO } from '@gltf-transform/core';
import { KHRMaterialsSpecular, KHRMaterialsUnlit } from '@gltf-transform/extensions';
import * as THREE from 'three';
import { bakeCharacterTextures } from './texture-baker.mjs';
import { HUMANOID_BONES, synthesizeMotionClips } from './rig-humanoid.mjs';
import {
  buildLoftedTube,
  mergeGeometries,
  computeEnvelopeSkinWeights,
  computeInverseBindMatrices,
} from './glb-builder.mjs';

/**
 * Builds the complete 3D model for 'festival_raver'
 * Height: 1.76m
 * Includes: Techwear cropped puffer jacket, cargo joggers, rave boots, visor glasses, skin & hair.
 */
export async function buildFestivalRaver(outPath) {
  console.log('>>> Building Festival Raver character mesh and skeleton...');

  // 1. Loft Head, Hair & Cyber Visor (y: 1.50 to 1.76)
  const headMesh = buildLoftedTube({
    points: [
      [0, 1.48, 0],     // Neck junction
      [0, 1.54, 0.01],  // Jaw / chin
      [0, 1.62, 0.02],  // Nose / Visor level
      [0, 1.68, 0.01],  // Forehead / Temples
      [0, 1.74, -0.01], // Crown
      [0, 1.76, -0.02], // Top of hair
    ],
    radii: [
      [0.055, 0.055],
      [0.075, 0.085],
      [0.092, 0.105],
      [0.090, 0.100],
      [0.075, 0.085],
      [0.020, 0.020],
    ],
    radialSegments: 20,
    uvVRange: [0.75, 1.0],
  });

  // Sound-reactive visor band wrapping front of face
  const visorMesh = buildLoftedTube({
    points: [
      [-0.085, 1.63, 0.02],
      [-0.065, 1.63, 0.08],
      [0.0, 1.63, 0.10],
      [0.065, 1.63, 0.08],
      [0.085, 1.63, 0.02],
    ],
    radii: [
      [0.012, 0.025],
      [0.015, 0.030],
      [0.018, 0.032],
      [0.015, 0.030],
      [0.012, 0.025],
    ],
    radialSegments: 12,
    uvVRange: [0.88, 0.94],
  });

  // 2. Loft Torso & Cropped Techwear Puffer Jacket (y: 0.95 to 1.48)
  const torsoMesh = buildLoftedTube({
    points: [
      [0, 0.95, 0],     // Hips / waist
      [0, 1.08, 0.01],  // Lower abdomen / navel
      [0, 1.22, 0.02],  // Ribcage / Puffer jacket crop line
      [0, 1.34, 0.01],  // Chest / Puffer volume
      [0, 1.44, 0],     // Upper chest / shoulders
      [0, 1.48, 0],     // Base of neck
    ],
    radii: [
      [0.150, 0.115],
      [0.140, 0.105],
      [0.165, 0.125],
      [0.190, 0.140], // Puffer puffy shoulders/chest
      [0.180, 0.130],
      [0.065, 0.065],
    ],
    radialSegments: 24,
    uvVRange: [0.42, 0.75],
  });

  // 3. Loft Left Arm & Sleeve
  const leftArmMesh = buildLoftedTube({
    points: [
      [0.18, 1.40, 0],
      [0.30, 1.30, 0],
      [0.42, 1.20, 0],   // Elbow
      [0.52, 1.11, 0],
      [0.62, 1.02, 0],   // Wrist cuff
      [0.66, 0.98, 0],   // Palm
    ],
    radii: [
      [0.065, 0.065],
      [0.060, 0.060],
      [0.052, 0.052],
      [0.045, 0.045],
      [0.042, 0.042],
      [0.035, 0.018],
    ],
    radialSegments: 16,
    uvVRange: [0.45, 0.72],
    uvURange: [0.75, 1.0],
  });

  // 4. Loft Right Arm & Sleeve
  const rightArmMesh = buildLoftedTube({
    points: [
      [-0.18, 1.40, 0],
      [-0.30, 1.30, 0],
      [-0.42, 1.20, 0],   // Elbow
      [-0.52, 1.11, 0],
      [-0.62, 1.02, 0],   // Wrist cuff
      [-0.66, 0.98, 0],   // Palm
    ],
    radii: [
      [0.065, 0.065],
      [0.060, 0.060],
      [0.052, 0.052],
      [0.045, 0.045],
      [0.042, 0.042],
      [0.035, 0.018],
    ],
    radialSegments: 16,
    uvVRange: [0.45, 0.72],
    uvURange: [0.0, 0.25],
  });

  // 5. Loft Left Leg (Cargo Jogger + Platform Rave Boot)
  const leftLegMesh = buildLoftedTube({
    points: [
      [0.11, 0.92, 0],     // Hip joint
      [0.11, 0.72, 0.01],  // Upper thigh
      [0.11, 0.50, 0.02],  // Knee / reactive strap
      [0.11, 0.30, 0.01],  // Calf / baggy cuff
      [0.11, 0.12, 0.0],   // Boot collar
      [0.11, 0.03, 0.03],  // Sole
    ],
    radii: [
      [0.085, 0.085],
      [0.080, 0.080],
      [0.072, 0.072],
      [0.068, 0.068],
      [0.062, 0.075],
      [0.055, 0.095], // Chunky platform boot base
    ],
    radialSegments: 18,
    uvVRange: [0.02, 0.42],
    uvURange: [0.5, 0.8],
  });

  // 6. Loft Right Leg (Cargo Jogger + Platform Rave Boot)
  const rightLegMesh = buildLoftedTube({
    points: [
      [-0.11, 0.92, 0],
      [-0.11, 0.72, 0.01],
      [-0.11, 0.50, 0.02],
      [-0.11, 0.30, 0.01],
      [-0.11, 0.12, 0.0],
      [-0.11, 0.03, 0.03],
    ],
    radii: [
      [0.085, 0.085],
      [0.080, 0.080],
      [0.072, 0.072],
      [0.068, 0.068],
      [0.062, 0.075],
      [0.055, 0.095],
    ],
    radialSegments: 18,
    uvVRange: [0.02, 0.42],
    uvURange: [0.2, 0.5],
  });

  // Merge all body parts into one cohesive, single-draw-call mesh
  const mergedBody = mergeGeometries([
    headMesh,
    visorMesh,
    torsoMesh,
    leftArmMesh,
    rightArmMesh,
    leftLegMesh,
    rightLegMesh,
  ]);

  console.log(`Unified body vertices: ${mergedBody.vertices.length / 3}, triangles: ${mergedBody.indices.length / 3}`);

  // 7. Calculate 4-bone smooth skin weights
  const { joints0, weights0 } = computeEnvelopeSkinWeights(mergedBody.vertices, HUMANOID_BONES);
  const ibmArray = computeInverseBindMatrices(HUMANOID_BONES);

  // 8. Bake Procedural PBR Textures
  console.log('>>> Baking PBR textures (baseColor, metallicRoughness, normal, emissive)...');
  const textures = bakeCharacterTextures('festival_raver', 512);

  // 9. Assemble glTF Document with @gltf-transform/core
  console.log('>>> Assembling glTF 2.0 Document & Skeleton Skin...');
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene('Scene');

  // Textures
  const baseColorTex = doc.createTexture('BaseColor').setImage(textures.baseColor).setMimeType('image/png');
  const mrTex = doc.createTexture('MetallicRoughness').setImage(textures.metallicRoughness).setMimeType('image/png');
  const normalTex = doc.createTexture('Normal').setImage(textures.normal).setMimeType('image/png');
  const emissiveTex = doc.createTexture('Emissive').setImage(textures.emissive).setMimeType('image/png');

  // PBR Material
  const material = doc.createMaterial('M_FestivalRaver')
    .setBaseColorTexture(baseColorTex)
    .setMetallicRoughnessTexture(mrTex)
    .setNormalTexture(normalTex)
    .setEmissiveTexture(emissiveTex)
    .setEmissiveFactor([1.0, 1.0, 1.0])
    .setRoughnessFactor(1.0)
    .setMetallicFactor(1.0);

  // Mesh Attributes Accessors
  const posAcc = doc.createAccessor('POSITION')
    .setArray(new Float32Array(mergedBody.vertices))
    .setType('VEC3')
    .setBuffer(buffer);

  const normAcc = doc.createAccessor('NORMAL')
    .setArray(new Float32Array(mergedBody.normals))
    .setType('VEC3')
    .setBuffer(buffer);

  const uvAcc = doc.createAccessor('TEXCOORD_0')
    .setArray(new Float32Array(mergedBody.uvs))
    .setType('VEC2')
    .setBuffer(buffer);

  const jointsAcc = doc.createAccessor('JOINTS_0')
    .setArray(joints0)
    .setType('VEC4')
    .setBuffer(buffer);

  const weightsAcc = doc.createAccessor('WEIGHTS_0')
    .setArray(weights0)
    .setType('VEC4')
    .setBuffer(buffer);

  const indicesAcc = doc.createAccessor('INDICES')
    .setArray(new Uint32Array(mergedBody.indices))
    .setType('SCALAR')
    .setBuffer(buffer);

  // Primitive
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', posAcc)
    .setAttribute('NORMAL', normAcc)
    .setAttribute('TEXCOORD_0', uvAcc)
    .setAttribute('JOINTS_0', jointsAcc)
    .setAttribute('WEIGHTS_0', weightsAcc)
    .setIndices(indicesAcc)
    .setMaterial(material);

  const mesh = doc.createMesh('FestivalRaver_Mesh').addPrimitive(prim);

  // 10. Build Skeleton Node Hierarchy
  console.log('>>> Building Bone Nodes and glTF Skin...');
  const boneNodeMap = new Map();
  const rootBones = [];

  // Create glTF Node for every bone
  for (let i = 0; i < HUMANOID_BONES.length; i++) {
    const b = HUMANOID_BONES[i];
    const node = doc.createNode(b.name);
    boneNodeMap.set(b.name, node);
  }

  // Set parent-child hierarchy and local rest-pose translations
  for (let i = 0; i < HUMANOID_BONES.length; i++) {
    const b = HUMANOID_BONES[i];
    const node = boneNodeMap.get(b.name);

    if (b.parent) {
      const parentNode = boneNodeMap.get(b.parent);
      const parentBone = HUMANOID_BONES.find(x => x.name === b.parent);
      // Local translation relative to parent
      const lx = b.pos[0] - parentBone.pos[0];
      const ly = b.pos[1] - parentBone.pos[1];
      const lz = b.pos[2] - parentBone.pos[2];
      node.setTranslation([lx, ly, lz]);
      parentNode.addChild(node);
    } else {
      // Root bone translation
      node.setTranslation(b.pos);
      rootBones.push(node);
    }
  }

  // Create glTF Skin
  const ibmAcc = doc.createAccessor('IBM')
    .setArray(ibmArray)
    .setType('MAT4')
    .setBuffer(buffer);

  const skin = doc.createSkin('Humanoid_Skin')
    .setInverseBindMatrices(ibmAcc);

  for (const b of HUMANOID_BONES) {
    skin.addJoint(boneNodeMap.get(b.name));
  }

  // Character Mesh Node referencing skin
  const meshNode = doc.createNode('FestivalRaver_Model')
    .setMesh(mesh)
    .setSkin(skin);

  scene.addChild(meshNode);
  for (const rb of rootBones) {
    scene.addChild(rb);
  }

  // 11. Bake Animation Clips
  console.log('>>> Synthesizing 5 distinct looping animation clips...');
  const clips = synthesizeMotionClips(30);

  for (const clip of clips) {
    const gltfAnim = doc.createAnimation(clip.name);

    for (const track of clip.tracks) {
      const boneNode = boneNodeMap.get(track.name.replace('.quaternion', '').replace('.position', ''));
      if (!boneNode) continue;

      const inputAcc = doc.createAccessor(`${clip.name}_${track.name}_Time`)
        .setArray(track.times)
        .setType('SCALAR')
        .setBuffer(buffer);

      const outputAcc = doc.createAccessor(`${clip.name}_${track.name}_Value`)
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

  // 12. Write Binary .glb File
  const io = new NodeIO();
  const glbBuffer = await io.writeBinary(doc);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, Buffer.from(glbBuffer));

  console.log(`Successfully compiled binary glTF: ${outPath} (${(glbBuffer.byteLength / 1024).toFixed(1)} KB)`);
  return {
    filePath: outPath,
    fileSizeKB: glbBuffer.byteLength / 1024,
    triangles: mergedBody.indices.length / 3,
    bones: HUMANOID_BONES.length,
    clips: clips.map(c => c.name),
  };
}

// Allow direct CLI execution: node tools/build-festival-raver.mjs
if (process.argv[1] && process.argv[1].endsWith('build-festival-raver.mjs')) {
  buildFestivalRaver('characters/festival_raver/festival_raver.glb').catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
  });
}
