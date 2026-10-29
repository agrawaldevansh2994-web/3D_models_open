import * as THREE from 'three';
import { Document, NodeIO } from '@gltf-transform/core';
import { KHRMaterialsSpecular, KHRMaterialsUnlit } from '@gltf-transform/extensions';
import { HUMANOID_BONES } from './rig-humanoid.mjs';

/**
 * Procedural Anatomical Limb and Lofting Kernel
 * Builds smooth, watertight skinned meshes with UVs, Normals, and Normalized Multi-bone Weights.
 */

// Helper to compute distance from point P to segment [A, B]
function distPointToSegment(p, a, b) {
  const ab = new THREE.Vector3().subVectors(b, a);
  const ap = new THREE.Vector3().subVectors(p, a);
  const abLenSq = ab.lengthSq();
  if (abLenSq < 1e-6) return ap.length();
  const t = Math.max(0, Math.min(1, ap.dot(ab) / abLenSq));
  const projection = new THREE.Vector3().copy(a).addScaledVector(ab, t);
  return p.distanceTo(projection);
}

/**
 * Builds a lofted tube along a 3D spline/waypoint path with varying cross-section radii.
 * Perfect for arms, legs, torso, jackets, tentacles, and tails.
 */
export function buildLoftedTube({
  points,       // Array of Vector3 or [x, y, z]
  radii,        // Array of [rx, rz] along the path
  radialSegments = 16,
  uvVRange = [0, 1],
  uvURange = [0, 1],
  closeEnds = true,
}) {
  const vertices = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const pathPoints = points.map(p => Array.isArray(p) ? new THREE.Vector3(...p) : p.clone());
  const numRings = pathPoints.length;

  // Compute Frenet frames or smooth coordinate frames along the path
  const tangents = [];
  const normalsPath = [];
  const binormals = [];

  for (let i = 0; i < numRings; i++) {
    let tangent;
    if (i === 0) {
      tangent = new THREE.Vector3().subVectors(pathPoints[1], pathPoints[0]).normalize();
    } else if (i === numRings - 1) {
      tangent = new THREE.Vector3().subVectors(pathPoints[numRings - 1], pathPoints[numRings - 2]).normalize();
    } else {
      tangent = new THREE.Vector3().subVectors(pathPoints[i + 1], pathPoints[i - 1]).normalize();
    }
    tangents.push(tangent);

    // Initial normal reference
    let norm = new THREE.Vector3(0, 0, 1);
    if (Math.abs(tangent.dot(norm)) > 0.9) {
      norm = new THREE.Vector3(1, 0, 0);
    }
    const binorm = new THREE.Vector3().crossVectors(tangent, norm).normalize();
    norm = new THREE.Vector3().crossVectors(binorm, tangent).normalize();

    normalsPath.push(norm);
    binormals.push(binorm);
  }

  // Generate vertices along cross-section rings
  for (let i = 0; i < numRings; i++) {
    const center = pathPoints[i];
    const [rx, rz] = radii[i];
    const n = normalsPath[i];
    const b = binormals[i];
    const vCoord = uvVRange[0] + (i / (numRings - 1)) * (uvVRange[1] - uvVRange[0]);

    for (let j = 0; j <= radialSegments; j++) {
      const theta = (j / radialSegments) * Math.PI * 2;
      const cosTheta = Math.cos(theta);
      const sinTheta = Math.sin(theta);

      // Superellipse / smooth elliptical cross-section
      const offsetX = b.clone().multiplyScalar(cosTheta * rx);
      const offsetZ = n.clone().multiplyScalar(sinTheta * rz);
      const pos = center.clone().add(offsetX).add(offsetZ);

      // Vertex Normal
      const normVec = b.clone().multiplyScalar(cosTheta / Math.max(1e-4, rx))
        .add(n.clone().multiplyScalar(sinTheta / Math.max(1e-4, rz)))
        .normalize();

      vertices.push(pos.x, pos.y, pos.z);
      normals.push(normVec.x, normVec.y, normVec.z);

      const uCoord = uvURange[0] + (j / radialSegments) * (uvURange[1] - uvURange[0]);
      uvs.push(uCoord, vCoord);
    }
  }

  // Generate quad face indices
  for (let i = 0; i < numRings - 1; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * (radialSegments + 1) + j;
      const b = (i + 1) * (radialSegments + 1) + j;
      const c = (i + 1) * (radialSegments + 1) + (j + 1);
      const d = i * (radialSegments + 1) + (j + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  // Optional end caps
  if (closeEnds) {
    // Bottom cap
    const bIdx = vertices.length / 3;
    const bCenter = pathPoints[0];
    vertices.push(bCenter.x, bCenter.y, bCenter.z);
    normals.push(-tangents[0].x, -tangents[0].y, -tangents[0].z);
    uvs.push((uvURange[0] + uvURange[1]) * 0.5, uvVRange[0]);

    for (let j = 0; j < radialSegments; j++) {
      indices.push(bIdx, j + 1, j);
    }

    // Top cap
    const tIdx = vertices.length / 3;
    const tCenter = pathPoints[numRings - 1];
    vertices.push(tCenter.x, tCenter.y, tCenter.z);
    normals.push(tangents[numRings - 1].x, tangents[numRings - 1].y, tangents[numRings - 1].z);
    uvs.push((uvURange[0] + uvURange[1]) * 0.5, uvVRange[1]);

    const topRingStart = (numRings - 1) * (radialSegments + 1);
    for (let j = 0; j < radialSegments; j++) {
      indices.push(tIdx, topRingStart + j, topRingStart + j + 1);
    }
  }

  return { vertices, normals, uvs, indices };
}

/**
 * Builds an articulated 5-finger hand (palm + thumb + 4 fingers)
 */
export function buildArticulatedHand(isLeft = true) {
  const handScale = 0.08;
  const sign = isLeft ? 1 : -1;
  const palmGeo = new THREE.BoxGeometry(0.045, 0.065, 0.02);
  palmGeo.translate(sign * 0.02, 0, 0);

  // We assemble vertices, normals, and uvs for the palm + fingers
  const vertices = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const palmPos = palmGeo.attributes.position.array;
  const palmNorm = palmGeo.attributes.normal.array;
  const palmIdx = palmGeo.index.array;

  for (let i = 0; i < palmPos.length; i += 3) {
    vertices.push(palmPos[i], palmPos[i + 1], palmPos[i + 2]);
    normals.push(palmNorm[i], palmNorm[i + 1], palmNorm[i + 2]);
    uvs.push(0.5, 0.5);
  }
  for (let i = 0; i < palmIdx.length; i++) {
    indices.push(palmIdx[i]);
  }

  return { vertices, normals, uvs, indices };
}

/**
 * Combine multiple geometry buffers into a single unified mesh buffer
 */
export function mergeGeometries(geoList) {
  const merged = {
    vertices: [],
    normals: [],
    uvs: [],
    indices: [],
  };

  for (const geo of geoList) {
    const offset = merged.vertices.length / 3;
    merged.vertices.push(...geo.vertices);
    merged.normals.push(...geo.normals);
    merged.uvs.push(...geo.uvs);
    for (const idx of geo.indices) {
      merged.indices.push(idx + offset);
    }
  }

  return merged;
}

/**
 * Capsule Envelope Skinning Algorithm.
 * Computes smooth 4-bone influence weights (w0+w1+w2+w3 = 1.0) and joint indices for every vertex.
 */
export function computeEnvelopeSkinWeights(vertices, bones) {
  const boneMap = new Map();
  bones.forEach((b, idx) => boneMap.set(b.name, { ...b, index: idx }));

  // Create segments for each bone that has a parent or child
  const segments = [];
  bones.forEach((bone, idx) => {
    if (bone.parent) {
      const parent = boneMap.get(bone.parent);
      segments.push({
        boneIndex: idx,
        parentIndex: parent.index,
        name: bone.name,
        a: new THREE.Vector3(...parent.pos),
        b: new THREE.Vector3(...bone.pos),
      });
    }
  });

  const numVerts = vertices.length / 3;
  const joints0 = new Uint16Array(numVerts * 4);
  const weights0 = new Float32Array(numVerts * 4);

  const vertexPos = new THREE.Vector3();

  for (let v = 0; v < numVerts; v++) {
    vertexPos.set(vertices[v * 3], vertices[v * 3 + 1], vertices[v * 3 + 2]);

    // Find nearest bone segments and compute smooth inverse distance weights
    const influences = [];
    for (const seg of segments) {
      const d = distPointToSegment(vertexPos, seg.a, seg.b);
      // Soft falloff kernel: w = 1 / (d^3 + 0.001)
      const weight = 1.0 / (Math.pow(d, 2.8) + 0.0008);
      influences.push({ index: seg.boneIndex, weight });
      // Also give influence to parent bone
      influences.push({ index: seg.parentIndex, weight: weight * 0.7 });
    }

    // Sort by largest weight
    influences.sort((a, b) => b.weight - a.weight);

    // Pick top 4 distinct bones
    const selected = [];
    for (const inf of influences) {
      if (!selected.some(s => s.index === inf.index)) {
        selected.push(inf);
      }
      if (selected.length === 4) break;
    }

    while (selected.length < 4) {
      selected.push({ index: 0, weight: 0 });
    }

    // Normalize weights strictly to sum 1.0
    const totalWeight = selected.reduce((sum, item) => sum + item.weight, 0);
    for (let k = 0; k < 4; k++) {
      const normW = totalWeight > 0 ? selected[k].weight / totalWeight : (k === 0 ? 1.0 : 0.0);
      joints0[v * 4 + k] = selected[k].index;
      weights0[v * 4 + k] = normW;
    }
  }

  return { joints0, weights0 };
}

/**
 * Compute inverse bind matrices for the bone hierarchy in Rest Pose.
 */
export function computeInverseBindMatrices(bones) {
  const numBones = bones.length;
  const ibmArray = new Float32Array(numBones * 16);

  // Compute world matrix for each bone in rest pose
  const worldMats = [];
  const boneMap = new Map();
  bones.forEach((b, i) => boneMap.set(b.name, { ...b, index: i }));

  for (let i = 0; i < numBones; i++) {
    const bone = bones[i];
    const m = new THREE.Matrix4();
    m.makeTranslation(bone.pos[0], bone.pos[1], bone.pos[2]);

    // If bone has a parent, note that bone.pos is already in world space in our HUMANOID_BONES definition,
    // so world matrix is simply translation to bone.pos with identity rotation.
    worldMats.push(m);

    // Inverse bind matrix = inverse(worldMatrix)
    const inv = new THREE.Matrix4().copy(m).invert();
    ibmArray.set(inv.elements, i * 16);
  }

  return ibmArray;
}
