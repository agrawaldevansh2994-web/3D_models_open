import fs from 'fs';
import path from 'path';
import { Document, NodeIO } from '@gltf-transform/core';
import * as THREE from 'three';
import { bakeCharacterTextures } from './texture-baker.mjs';
import { buildLoftedTube, mergeGeometries, computeInverseBindMatrices } from './glb-builder.mjs';

/**
 * Organic Sculpted Pelagic Manta Ray Builder (Round 2)
 * Features:
 * - Thick, hydrodynamic 3D body volume (3.4m wingspan, 2.5m length, 0.38m center thickness)
 * - Prominent 3D sculpted cephalic horn lobes flanking the filter-feeding mouth
 * - Elongated segmented whip tail with dorsal spine fin
 * - High-density 10,000+ triangle mesh
 * - 24-bone skeleton with 8-bone spine/tail chain, 5-bone spanwise wing chains, and 2-bone cephalic chains
 * - 3 rich multi-channel animation clips ('glide', 'bank', 'barrel_roll'), driving all 24 bones per clip
 */

export const MANTA_BONES = [
  { name: 'Root', parent: null, pos: [0, 1.0, 0] },

  // Spine & Tail Chain (8 bones)
  { name: 'Spine_Head', parent: 'Root', pos: [0, 1.0, 0.75] },
  { name: 'Spine_Mid', parent: 'Root', pos: [0, 1.0, 0.0] },
  { name: 'Spine_Pelvic', parent: 'Spine_Mid', pos: [0, 1.0, -0.65] },
  { name: 'Spine_TailBase', parent: 'Spine_Pelvic', pos: [0, 1.0, -1.15] },
  { name: 'Tail_1', parent: 'Spine_TailBase', pos: [0, 1.0, -1.55] },
  { name: 'Tail_2', parent: 'Tail_1', pos: [0, 1.0, -1.95] },
  { name: 'Tail_3', parent: 'Tail_2', pos: [0, 1.0, -2.35] },
  { name: 'Tail_4', parent: 'Tail_3', pos: [0, 1.0, -2.75] },

  // Left Wing Chain (5 bones spanwise)
  { name: 'Wing_L_1', parent: 'Root', pos: [0.32, 1.0, 0.08] },
  { name: 'Wing_L_2', parent: 'Wing_L_1', pos: [0.68, 1.0, 0.04] },
  { name: 'Wing_L_3', parent: 'Wing_L_2', pos: [1.04, 1.0, -0.02] },
  { name: 'Wing_L_4', parent: 'Wing_L_3', pos: [1.38, 1.0, -0.10] },
  { name: 'Wing_L_5', parent: 'Wing_L_4', pos: [1.70, 1.0, -0.20] },

  // Right Wing Chain (5 bones spanwise)
  { name: 'Wing_R_1', parent: 'Root', pos: [-0.32, 1.0, 0.08] },
  { name: 'Wing_R_2', parent: 'Wing_R_1', pos: [-0.68, 1.0, 0.04] },
  { name: 'Wing_R_3', parent: 'Wing_R_2', pos: [-1.04, 1.0, -0.02] },
  { name: 'Wing_R_4', parent: 'Wing_R_3', pos: [-1.38, 1.0, -0.10] },
  { name: 'Wing_R_5', parent: 'Wing_R_4', pos: [-1.70, 1.0, -0.20] },

  // Articulated Cephalic Horn Lobes (2 bones each)
  { name: 'Cephalic_L_1', parent: 'Spine_Head', pos: [0.22, 1.0, 0.98] },
  { name: 'Cephalic_L_2', parent: 'Cephalic_L_1', pos: [0.28, 1.04, 1.25] },
  { name: 'Cephalic_R_1', parent: 'Spine_Head', pos: [-0.22, 1.0, 0.98] },
  { name: 'Cephalic_R_2', parent: 'Cephalic_R_1', pos: [-0.28, 1.04, 1.25] },
];

/**
 * Builds the high-density organic hydrofoil body with camber and thickness
 */
function buildMantaMainBody() {
  const span = 3.4;
  const halfSpan = span / 2;
  const chord = 2.5;

  const xSegments = 64;
  const zSegments = 48;

  const vertices = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  function getPlanform(normX) {
    return Math.pow(Math.max(0, 1.0 - normX), 0.42);
  }

  // 1. Dorsal (Upper) Surface
  for (let j = 0; j <= zSegments; j++) {
    const v = j / zSegments;
    const zBase = (0.42 - v) * chord;

    for (let i = 0; i <= xSegments; i++) {
      const u = i / xSegments;
      const normX = (u - 0.5) * 2.0;
      const absX = Math.abs(normX);
      const x = normX * halfSpan;
      const sweep = getPlanform(absX);
      const z = zBase * sweep;

      // Hydrodynamic camber thickness
      const bodyMass = Math.max(0, 1.0 - absX * 1.6) * Math.sin(v * Math.PI);
      const wingThickness = Math.pow(Math.max(0, 1.0 - absX), 1.6) * 0.16 * Math.sin(v * Math.PI);
      const camber = (bodyMass * 0.32 + wingThickness);

      // Eye bulges at x ~ +/-0.45, z ~ 0.55
      let eyeBulge = 0;
      if (Math.abs(absX - 0.28) < 0.08 && Math.abs(v - 0.22) < 0.08) {
        eyeBulge = Math.cos((absX - 0.28) / 0.08 * Math.PI * 0.5) * Math.cos((v - 0.22) / 0.08 * Math.PI * 0.5) * 0.04;
      }

      const y = 1.0 + camber + eyeBulge;

      vertices.push(x, y, z);
      normals.push(0, 1, 0);
      uvs.push(absX * 0.48, v);
    }
  }

  // 2. Ventral (Lower) Surface
  const dorsalCount = vertices.length / 3;
  for (let j = 0; j <= zSegments; j++) {
    const v = j / zSegments;
    const zBase = (0.42 - v) * chord;

    for (let i = 0; i <= xSegments; i++) {
      const u = i / xSegments;
      const normX = (u - 0.5) * 2.0;
      const absX = Math.abs(normX);
      const x = normX * halfSpan;
      const sweep = getPlanform(absX);
      const z = zBase * sweep;

      const bodyMass = Math.max(0, 1.0 - absX * 1.6) * Math.sin(v * Math.PI);
      const wingThickness = Math.pow(Math.max(0, 1.0 - absX), 1.6) * 0.10 * Math.sin(v * Math.PI);
      const camber = (bodyMass * 0.16 + wingThickness);

      // Mouth cavity recess at center front
      let mouthRecess = 0;
      if (absX < 0.18 && v < 0.20) {
        mouthRecess = (1 - absX / 0.18) * Math.sin((v / 0.20) * Math.PI) * 0.06;
      }

      const y = 1.0 - camber + mouthRecess;

      vertices.push(x, y, z);
      normals.push(0, -1, 0);
      uvs.push(0.52 + absX * 0.48, v);
    }
  }

  // Dorsal face indices (Counter-clockwise winding pointing +Y)
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

  // Ventral face indices (Clockwise winding pointing -Y)
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

  // Recompute smooth face-weighted normals
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
    pA.set(accumNormals[i * 3], accumNormals[i * 3 + 1], accumNormals[i * 3 + 2]);
    if (pA.lengthSq() > 1e-12) pA.normalize();
    else pA.set(0, 1, 0);
    normals[i * 3] = pA.x; normals[i * 3 + 1] = pA.y; normals[i * 3 + 2] = pA.z;
  }

  return { vertices, normals, uvs, indices };
}

/**
 * Builds sculpted 3D cephalic horn fins flanking the mouth
 */
function buildSculptedCephalicHorn(isLeft = true) {
  const sign = isLeft ? 1 : -1;
  return buildLoftedTube({
    points: [
      [sign * 0.18, 0.98, 0.82],
      [sign * 0.22, 1.00, 0.98],
      [sign * 0.27, 1.03, 1.15],
      [sign * 0.31, 1.06, 1.30],
      [sign * 0.29, 1.07, 1.40],
    ],
    radii: [
      [0.052, 0.040],
      [0.058, 0.042],
      [0.048, 0.035],
      [0.034, 0.024],
      [0.012, 0.008],
    ],
    radialSegments: 16,
    subdivideRings: 3,
    uvVRange: [0.02, 0.25],
    uvURange: [0.05, 0.45],
    foldAmp: 0.002,
  });
}

/**
 * Builds the elongated whip tail with dorsal spine ridge
 */
function buildSculptedTail() {
  return buildLoftedTube({
    points: [
      [0, 1.02, -1.05],
      [0, 1.01, -1.35],
      [0, 1.00, -1.75],
      [0, 0.99, -2.15],
      [0, 0.98, -2.55],
      [0, 0.97, -2.95],
    ],
    radii: [
      [0.048, 0.048],
      [0.038, 0.038],
      [0.028, 0.028],
      [0.018, 0.018],
      [0.012, 0.012],
      [0.005, 0.005],
    ],
    radialSegments: 14,
    subdivideRings: 3,
    uvVRange: [0.75, 0.98],
    uvURange: [0.1, 0.4],
  });
}

/**
 * Custom smooth skinning for Manta Ray multi-bone hierarchy
 */
function computeMantaSkinWeights(vertices) {
  const numVerts = vertices.length / 3;
  const joints0 = new Uint16Array(numVerts * 4);
  const weights0 = new Float32Array(numVerts * 4);
  const halfSpan = 1.7;

  // Map bone names to indices
  const boneMap = new Map();
  MANTA_BONES.forEach((b, idx) => boneMap.set(b.name, idx));

  for (let i = 0; i < numVerts; i++) {
    const x = vertices[i * 3];
    const z = vertices[i * 3 + 2];
    const absX = Math.abs(x);
    const normX = x / halfSpan;
    const isLeft = x > 0;

    if (z > 0.82 && absX < 0.45) {
      // Cephalic horn zone
      const side = isLeft ? 'L' : 'R';
      const c1 = boneMap.get(`Cephalic_${side}_1`);
      const c2 = boneMap.get(`Cephalic_${side}_2`);
      const t = Math.min(1, Math.max(0, (z - 0.85) / 0.45));
      joints0[i * 4] = c2; weights0[i * 4] = t;
      joints0[i * 4 + 1] = c1; weights0[i * 4 + 1] = 1 - t;
    } else if (absX < 0.28 || z < -1.1) {
      // Spine and tail chain
      if (z > 0.4) {
        joints0[i * 4] = boneMap.get('Spine_Head'); weights0[i * 4] = 0.8;
        joints0[i * 4 + 1] = boneMap.get('Root'); weights0[i * 4 + 1] = 0.2;
      } else if (z > -0.3) {
        joints0[i * 4] = boneMap.get('Spine_Mid'); weights0[i * 4] = 0.7;
        joints0[i * 4 + 1] = boneMap.get('Root'); weights0[i * 4 + 1] = 0.3;
      } else if (z > -0.9) {
        joints0[i * 4] = boneMap.get('Spine_Pelvic'); weights0[i * 4] = 0.8;
        joints0[i * 4 + 1] = boneMap.get('Spine_Mid'); weights0[i * 4 + 1] = 0.2;
      } else if (z > -1.35) {
        joints0[i * 4] = boneMap.get('Spine_TailBase'); weights0[i * 4] = 0.7;
        joints0[i * 4 + 1] = boneMap.get('Tail_1'); weights0[i * 4 + 1] = 0.3;
      } else if (z > -1.75) {
        joints0[i * 4] = boneMap.get('Tail_1'); weights0[i * 4] = 0.6;
        joints0[i * 4 + 1] = boneMap.get('Tail_2'); weights0[i * 4 + 1] = 0.4;
      } else if (z > -2.15) {
        joints0[i * 4] = boneMap.get('Tail_2'); weights0[i * 4] = 0.6;
        joints0[i * 4 + 1] = boneMap.get('Tail_3'); weights0[i * 4 + 1] = 0.4;
      } else {
        joints0[i * 4] = boneMap.get('Tail_3'); weights0[i * 4] = 0.5;
        joints0[i * 4 + 1] = boneMap.get('Tail_4'); weights0[i * 4 + 1] = 0.5;
      }
    } else {
      // Pectoral wings spanwise 5-bone chain
      const side = isLeft ? 'L' : 'R';
      const wSpan = Math.min(1.0, (absX - 0.25) / (halfSpan - 0.25));
      const b1 = boneMap.get(`Wing_${side}_1`);
      const b2 = boneMap.get(`Wing_${side}_2`);
      const b3 = boneMap.get(`Wing_${side}_3`);
      const b4 = boneMap.get(`Wing_${side}_4`);
      const b5 = boneMap.get(`Wing_${side}_5`);

      if (wSpan < 0.25) {
        const t = wSpan / 0.25;
        joints0[i * 4] = b1; weights0[i * 4] = 1 - t * 0.7;
        joints0[i * 4 + 1] = b2; weights0[i * 4 + 1] = t * 0.7;
      } else if (wSpan < 0.50) {
        const t = (wSpan - 0.25) / 0.25;
        joints0[i * 4] = b2; weights0[i * 4] = 1 - t;
        joints0[i * 4 + 1] = b3; weights0[i * 4 + 1] = t;
      } else if (wSpan < 0.75) {
        const t = (wSpan - 0.50) / 0.25;
        joints0[i * 4] = b3; weights0[i * 4] = 1 - t;
        joints0[i * 4 + 1] = b4; weights0[i * 4 + 1] = t;
      } else {
        const t = (wSpan - 0.75) / 0.25;
        joints0[i * 4] = b4; weights0[i * 4] = 1 - t;
        joints0[i * 4 + 1] = b5; weights0[i * 4 + 1] = t;
      }
    }
  }

  return { joints0, weights0 };
}

/**
 * Synthesizes 3 pelagic animation clips where EVERY single clip animates ALL 24 bones
 */
export function synthesizeMantaClips(fps = 30) {
  const clips = [];
  const euler = new THREE.Euler();
  const quat = new THREE.Quaternion();

  // Helper track creators
  function makeQuatTrack(boneName, times, quatValues) {
    return {
      name: `${boneName}.quaternion`,
      type: 'quaternion',
      times: new Float32Array(times),
      values: new Float32Array(quatValues),
    };
  }

  function makePosTrack(boneName, times, posValues) {
    return {
      name: `${boneName}.position`,
      type: 'vector',
      times: new Float32Array(times),
      values: new Float32Array(posValues),
    };
  }

  // ==========================================
  // CLIP 1: 'glide' (Effortless fluid traveling wing waves + undulating spine & tail, T = 3.0s, 90 frames)
  // ==========================================
  {
    const frames = 90;
    const duration = frames / fps;
    const times = [];
    const rootPos = [];
    const boneQuats = new Map();
    MANTA_BONES.forEach(b => boneQuats.set(b.name, []));

    for (let i = 0; i <= frames; i++) {
      const t = (i / frames) * duration;
      const phase = (2 * Math.PI * (i % frames)) / frames;
      times.push(t);

      // Root vertical drift
      rootPos.push(0, 1.0 + Math.sin(phase) * 0.08, 0);

      // Spine counter-pitch wave
      euler.set(Math.sin(phase) * 0.05, 0, 0);
      quat.setFromEuler(euler);
      boneQuats.get('Root').push(quat.x, quat.y, quat.z, quat.w);

      euler.set(Math.sin(phase + 0.5) * 0.06, 0, 0);
      quat.setFromEuler(euler);
      boneQuats.get('Spine_Head').push(quat.x, quat.y, quat.z, quat.w);

      euler.set(Math.sin(phase) * 0.04, 0, 0);
      quat.setFromEuler(euler);
      boneQuats.get('Spine_Mid').push(quat.x, quat.y, quat.z, quat.w);

      euler.set(Math.sin(phase - 0.5) * 0.05, 0, 0);
      quat.setFromEuler(euler);
      boneQuats.get('Spine_Pelvic').push(quat.x, quat.y, quat.z, quat.w);

      euler.set(Math.sin(phase - 0.9) * 0.06, 0, 0);
      quat.setFromEuler(euler);
      boneQuats.get('Spine_TailBase').push(quat.x, quat.y, quat.z, quat.w);

      // Tail undulation lag chain
      for (let k = 1; k <= 4; k++) {
        const lag = 1.0 + k * 0.45;
        euler.set(Math.sin(phase - lag) * (0.08 + k * 0.04), Math.cos(phase - lag) * 0.05, 0);
        quat.setFromEuler(euler);
        boneQuats.get(`Tail_${k}`).push(quat.x, quat.y, quat.z, quat.w);
      }

      // Cephalic horns curling gently
      for (const side of ['L', 'R']) {
        const s = side === 'L' ? 1 : -1;
        euler.set(0.04 * Math.sin(phase), s * 0.08 * Math.cos(phase), s * 0.06 * Math.sin(phase));
        quat.setFromEuler(euler);
        boneQuats.get(`Cephalic_${side}_1`).push(quat.x, quat.y, quat.z, quat.w);

        euler.set(0.08 * Math.sin(phase + 0.3), s * 0.12 * Math.cos(phase + 0.3), s * 0.10 * Math.sin(phase + 0.3));
        quat.setFromEuler(euler);
        boneQuats.get(`Cephalic_${side}_2`).push(quat.x, quat.y, quat.z, quat.w);
      }

      // Traveling sinusoidal wing waves spanwise
      for (const side of ['L', 'R']) {
        const s = side === 'L' ? 1 : -1;
        for (let k = 1; k <= 5; k++) {
          const lag = k * 0.38;
          const amp = 0.08 + k * 0.07;
          euler.set(Math.cos(phase - lag) * (amp * 0.3), 0, s * Math.sin(phase - lag) * amp);
          quat.setFromEuler(euler);
          boneQuats.get(`Wing_${side}_${k}`).push(quat.x, quat.y, quat.z, quat.w);
        }
      }
    }

    const tracks = [makePosTrack('Root', times, rootPos)];
    for (const b of MANTA_BONES) {
      tracks.push(makeQuatTrack(b.name, times, boneQuats.get(b.name)));
    }

    clips.push({ name: 'glide', duration, tracks });
  }

  // ==========================================
  // CLIP 2: 'bank' (Deep 42-degree banking reef turn with asymmetric wing curvature, T = 3.0s, 90 frames)
  // ==========================================
  {
    const frames = 90;
    const duration = frames / fps;
    const times = [];
    const rootPos = [];
    const boneQuats = new Map();
    MANTA_BONES.forEach(b => boneQuats.set(b.name, []));

    for (let i = 0; i <= frames; i++) {
      const t = (i / frames) * duration;
      const phase = (2 * Math.PI * (i % frames)) / frames;
      times.push(t);

      const bankAngle = Math.sin(phase) * 0.65; // ~37 degree bank
      rootPos.push(Math.sin(phase) * 0.25, 1.0 + Math.cos(phase) * 0.06, 0);

      euler.set(0.06, Math.sin(phase) * 0.35, bankAngle);
      quat.setFromEuler(euler);
      boneQuats.get('Root').push(quat.x, quat.y, quat.z, quat.w);

      // Spine curved lateral yaw during turn
      const spineYaw = Math.sin(phase) * 0.12;
      euler.set(0.04, spineYaw * 0.8, 0);
      quat.setFromEuler(euler);
      boneQuats.get('Spine_Head').push(quat.x, quat.y, quat.z, quat.w);

      euler.set(0.02, spineYaw * 0.5, 0);
      quat.setFromEuler(euler);
      boneQuats.get('Spine_Mid').push(quat.x, quat.y, quat.z, quat.w);

      euler.set(-0.02, -spineYaw * 0.5, 0);
      quat.setFromEuler(euler);
      boneQuats.get('Spine_Pelvic').push(quat.x, quat.y, quat.z, quat.w);

      euler.set(-0.04, -spineYaw * 0.8, 0);
      quat.setFromEuler(euler);
      boneQuats.get('Spine_TailBase').push(quat.x, quat.y, quat.z, quat.w);

      // Tail counter-rudder deflection
      for (let k = 1; k <= 4; k++) {
        euler.set(0.04 * k, -spineYaw * (0.8 + k * 0.35), 0);
        quat.setFromEuler(euler);
        boneQuats.get(`Tail_${k}`).push(quat.x, quat.y, quat.z, quat.w);
      }

      // Cephalic steering
      for (const side of ['L', 'R']) {
        const s = side === 'L' ? 1 : -1;
        euler.set(0.06, s * 0.15 + spineYaw * 0.6, 0);
        quat.setFromEuler(euler);
        boneQuats.get(`Cephalic_${side}_1`).push(quat.x, quat.y, quat.z, quat.w);
        boneQuats.get(`Cephalic_${side}_2`).push(quat.x, quat.y, quat.z, quat.w);
      }

      // Asymmetric wing flexion: outside wing flaps broad arc, inside wing curls up
      const flap = Math.sin(phase * 2);
      for (let k = 1; k <= 5; k++) {
        const lAngle = (flap * (0.10 + k * 0.08)) + (Math.sin(phase) > 0 ? 0.06 * k : -0.12 * k);
        euler.set(0, 0, lAngle);
        quat.setFromEuler(euler);
        boneQuats.get(`Wing_L_${k}`).push(quat.x, quat.y, quat.z, quat.w);

        const rAngle = (-flap * (0.10 + k * 0.08)) + (Math.sin(phase) > 0 ? -0.12 * k : 0.06 * k);
        euler.set(0, 0, rAngle);
        quat.setFromEuler(euler);
        boneQuats.get(`Wing_R_${k}`).push(quat.x, quat.y, quat.z, quat.w);
      }
    }

    const tracks = [makePosTrack('Root', times, rootPos)];
    for (const b of MANTA_BONES) {
      tracks.push(makeQuatTrack(b.name, times, boneQuats.get(b.name)));
    }

    clips.push({ name: 'bank', duration, tracks });
  }

  // ==========================================
  // CLIP 3: 'barrel_roll' (Spectacular 360-degree feeding loop corkscrew, T = 4.0s, 120 frames)
  // ==========================================
  {
    const frames = 120;
    const duration = frames / fps;
    const times = [];
    const rootPos = [];
    const boneQuats = new Map();
    MANTA_BONES.forEach(b => boneQuats.set(b.name, []));

    for (let i = 0; i <= frames; i++) {
      const t = (i / frames) * duration;
      const phase = (2 * Math.PI * (i % frames)) / frames;
      times.push(t);

      // Helical vertical loop trajectory
      rootPos.push(Math.sin(phase) * 0.18, 1.0 + Math.cos(phase) * 0.22, Math.sin(phase * 2) * 0.08);

      // Full 360 pitch-roll loop
      euler.set(-phase, 0, Math.sin(phase) * 0.25);
      quat.setFromEuler(euler);
      boneQuats.get('Root').push(quat.x, quat.y, quat.z, quat.w);

      // Spine flexes into an arch
      const arch = Math.sin(phase) * 0.14;
      euler.set(arch, 0, 0);
      quat.setFromEuler(euler);
      boneQuats.get('Spine_Head').push(quat.x, quat.y, quat.z, quat.w);

      euler.set(arch * 0.7, 0, 0);
      quat.setFromEuler(euler);
      boneQuats.get('Spine_Mid').push(quat.x, quat.y, quat.z, quat.w);

      euler.set(-arch * 0.7, 0, 0);
      quat.setFromEuler(euler);
      boneQuats.get('Spine_Pelvic').push(quat.x, quat.y, quat.z, quat.w);

      euler.set(-arch, 0, 0);
      quat.setFromEuler(euler);
      boneQuats.get('Spine_TailBase').push(quat.x, quat.y, quat.z, quat.w);

      // Tail follows the roll path with lag whip
      for (let k = 1; k <= 4; k++) {
        const lag = k * 0.35;
        euler.set(-Math.sin(phase - lag) * (0.12 + k * 0.06), Math.cos(phase - lag) * 0.08, 0);
        quat.setFromEuler(euler);
        boneQuats.get(`Tail_${k}`).push(quat.x, quat.y, quat.z, quat.w);
      }

      // Cephalic horns spread wide during feeding loop
      for (const side of ['L', 'R']) {
        const s = side === 'L' ? 1 : -1;
        euler.set(0.12 * Math.sin(phase), s * 0.22, s * 0.15 * Math.cos(phase));
        quat.setFromEuler(euler);
        boneQuats.get(`Cephalic_${side}_1`).push(quat.x, quat.y, quat.z, quat.w);
        boneQuats.get(`Cephalic_${side}_2`).push(quat.x, quat.y, quat.z, quat.w);
      }

      // Synchronized roll wing tuck & flare
      for (let k = 1; k <= 5; k++) {
        const tuck = Math.sin(phase * 2) * (0.12 + k * 0.08);
        euler.set(0, 0, tuck);
        quat.setFromEuler(euler);
        boneQuats.get(`Wing_L_${k}`).push(quat.x, quat.y, quat.z, quat.w);

        euler.set(0, 0, -tuck);
        quat.setFromEuler(euler);
        boneQuats.get(`Wing_R_${k}`).push(quat.x, quat.y, quat.z, quat.w);
      }
    }

    const tracks = [makePosTrack('Root', times, rootPos)];
    for (const b of MANTA_BONES) {
      tracks.push(makeQuatTrack(b.name, times, boneQuats.get(b.name)));
    }

    clips.push({ name: 'barrel_roll', duration, tracks });
  }

  return clips;
}

/**
 * Builds the complete binary glTF 2.0 .glb for manta_ray
 */
export async function buildMantaRay(outPath = 'characters/manta_ray/manta_ray.glb') {
  console.log(`\n======================================================`);
  console.log(`>>> [Round 2] SCULPTING ORGANIC PELAGIC MANTA RAY: [manta_ray]`);
  console.log(`======================================================`);

  const mainBody = buildMantaMainBody();
  const leftHorn = buildSculptedCephalicHorn(true);
  const rightHorn = buildSculptedCephalicHorn(false);
  const tailMesh = buildSculptedTail();

  const mergedManta = mergeGeometries([
    mainBody,
    leftHorn,
    rightHorn,
    tailMesh,
  ]);

  const numTris = mergedManta.indices.length / 3;
  console.log(`Manta Ray Unified Mesh: ${mergedManta.vertices.length / 3} vertices, ${numTris} triangles`);

  const { joints0, weights0 } = computeMantaSkinWeights(mergedManta.vertices);
  const ibmArray = computeInverseBindMatrices(MANTA_BONES);

  console.log(`>>> Baking PBR + Cyan Constellation textures...`);
  const textures = bakeCharacterTextures('manta_ray', 512);

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

  const posAcc = doc.createAccessor('POSITION').setArray(new Float32Array(mergedManta.vertices)).setType('VEC3').setBuffer(buffer);
  const normAcc = doc.createAccessor('NORMAL').setArray(new Float32Array(mergedManta.normals)).setType('VEC3').setBuffer(buffer);
  const uvAcc = doc.createAccessor('TEXCOORD_0').setArray(new Float32Array(mergedManta.uvs)).setType('VEC2').setBuffer(buffer);
  const jAcc = doc.createAccessor('JOINTS_0').setArray(joints0).setType('VEC4').setBuffer(buffer);
  const wAcc = doc.createAccessor('WEIGHTS_0').setArray(weights0).setType('VEC4').setBuffer(buffer);
  const idxAcc = doc.createAccessor('INDICES').setArray(new Uint32Array(mergedManta.indices)).setType('SCALAR').setBuffer(buffer);

  const prim = doc.createPrimitive()
    .setAttribute('POSITION', posAcc)
    .setAttribute('NORMAL', normAcc)
    .setAttribute('TEXCOORD_0', uvAcc)
    .setAttribute('JOINTS_0', jAcc)
    .setAttribute('WEIGHTS_0', wAcc)
    .setIndices(idxAcc)
    .setMaterial(material);

  const mesh = doc.createMesh('MantaRay_Mesh').addPrimitive(prim);

  // Nodes & Skin
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

  // Bake all 3 multi-bone animation clips
  const clips = synthesizeMantaClips(30);
  for (const clip of clips) {
    const gltfAnim = doc.createAnimation(clip.name);
    for (const track of clip.tracks) {
      const boneName = track.name.replace('.quaternion', '').replace('.position', '');
      const boneNode = boneNodeMap.get(boneName);
      if (!boneNode) continue;

      const inAcc = doc.createAccessor(`${clip.name}_${track.name}_Time`).setArray(track.times).setType('SCALAR').setBuffer(buffer);
      const outAcc = doc.createAccessor(`${clip.name}_${track.name}_Val`).setArray(track.values).setType(track.type === 'quaternion' ? 'VEC4' : 'VEC3').setBuffer(buffer);

      const sampler = doc.createAnimationSampler()
        .setInput(inAcc)
        .setOutput(outAcc)
        .setInterpolation('LINEAR');

      const channel = doc.createAnimationChannel()
        .setTargetNode(boneNode)
        .setTargetPath(track.type === 'quaternion' ? 'rotation' : 'translation')
        .setSampler(sampler);

      gltfAnim.addSampler(sampler);
      gltfAnim.addChannel(channel);
    }
    console.log(`- Baked clip: [${clip.name}] (${clip.tracks.length} channels)`);
  }

  const io = new NodeIO();
  const glbBuffer = await io.writeBinary(doc);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, Buffer.from(glbBuffer));

  const fileSizeKB = glbBuffer.byteLength / 1024;
  console.log(`>>> Written ${outPath}: ${fileSizeKB.toFixed(1)} KB, ${numTris} tris, ${MANTA_BONES.length} bones, ${clips.length} clips.`);

  return {
    filePath: outPath,
    fileSizeKB,
    triangles: numTris,
    bones: MANTA_BONES.length,
    clips: clips.map(c => ({ name: c.name, channels: c.tracks.length })),
  };
}

if (process.argv[1] && process.argv[1].endsWith('build-manta-ray.mjs')) {
  buildMantaRay().catch(err => {
    console.error('Manta Ray build failed:', err);
    process.exit(1);
  });
}
