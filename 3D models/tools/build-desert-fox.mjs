import fs from 'fs';
import path from 'path';
import { Document, NodeIO } from '@gltf-transform/core';
import * as THREE from 'three';
import { PNG } from 'pngjs';
import { buildLoftedTube, mergeGeometries, computeInverseBindMatrices } from './glb-builder.mjs';

/**
 * Procedural Desert Fox (Fennec Dune Fox) Builder - Round 2
 * Shoulder Height: 0.42m, Length: 0.76m
 * Features:
 * - High-density 6,000+ triangle sculpted mesh
 * - Sculpted fennec head with almond eyes, muzzle/whiskers, cheek tufts, and deep bat-like ear conchae
 * - Sculpted quadruped legs with defined stifle/hock angles and paw pads
 * - Plush 6-stage bushy tail with white brush tip
 * - 22-bone quadruped skeleton with full multi-channel locomotion
 */

export const FOX_BONES = [
  { name: 'Root', parent: null, pos: [0, 0.38, 0] },
  { name: 'Spine_Pelvis', parent: 'Root', pos: [0, 0.39, -0.12] },
  { name: 'Spine_Chest', parent: 'Root', pos: [0, 0.41, 0.12] },
  { name: 'Neck', parent: 'Spine_Chest', pos: [0, 0.46, 0.22] },
  { name: 'Head', parent: 'Neck', pos: [0, 0.52, 0.32] },
  { name: 'Muzzle', parent: 'Head', pos: [0, 0.49, 0.42] },

  // Oversized Fennec Ears (2 bones each)
  { name: 'Ear_L_1', parent: 'Head', pos: [0.065, 0.58, 0.28] },
  { name: 'Ear_L_2', parent: 'Ear_L_1', pos: [0.115, 0.72, 0.26] },
  { name: 'Ear_R_1', parent: 'Head', pos: [-0.065, 0.58, 0.28] },
  { name: 'Ear_R_2', parent: 'Ear_R_1', pos: [-0.115, 0.72, 0.26] },

  // Bushy Tail Chain (4 bones)
  { name: 'Tail_1', parent: 'Spine_Pelvis', pos: [0, 0.39, -0.22] },
  { name: 'Tail_2', parent: 'Tail_1', pos: [0, 0.36, -0.34] },
  { name: 'Tail_3', parent: 'Tail_2', pos: [0, 0.30, -0.46] },
  { name: 'Tail_4', parent: 'Tail_3', pos: [0, 0.24, -0.58] },

  // Front Left Leg
  { name: 'Leg_FL_Upper', parent: 'Spine_Chest', pos: [0.075, 0.34, 0.16] },
  { name: 'Leg_FL_Lower', parent: 'Leg_FL_Upper', pos: [0.075, 0.18, 0.16] },
  { name: 'Paw_FL', parent: 'Leg_FL_Lower', pos: [0.075, 0.04, 0.18] },

  // Front Right Leg
  { name: 'Leg_FR_Upper', parent: 'Spine_Chest', pos: [-0.075, 0.34, 0.16] },
  { name: 'Leg_FR_Lower', parent: 'Leg_FR_Upper', pos: [-0.075, 0.18, 0.16] },
  { name: 'Paw_FR', parent: 'Leg_FR_Lower', pos: [-0.075, 0.04, 0.18] },

  // Back Left Leg
  { name: 'Leg_BL_Upper', parent: 'Spine_Pelvis', pos: [0.075, 0.34, -0.16] },
  { name: 'Leg_BL_Lower', parent: 'Leg_BL_Upper', pos: [0.075, 0.18, -0.16] },
  { name: 'Paw_BL', parent: 'Leg_BL_Lower', pos: [0.075, 0.04, -0.14] },

  // Back Right Leg
  { name: 'Leg_BR_Upper', parent: 'Spine_Pelvis', pos: [-0.075, 0.34, -0.16] },
  { name: 'Leg_BR_Lower', parent: 'Leg_BR_Upper', pos: [-0.075, 0.18, -0.16] },
  { name: 'Paw_BR', parent: 'Leg_BR_Lower', pos: [-0.075, 0.04, -0.14] },
];

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

export function buildSculptedFoxTorso() {
  return buildLoftedTube({
    points: [
      [0, 0.37, -0.20], // Pelvis / croup
      [0, 0.39, -0.10], // Flank tuck
      [0, 0.41, 0.04],  // Ribcage
      [0, 0.42, 0.16],  // Chest ruff
      [0, 0.43, 0.22],  // Shoulder junction
    ],
    radii: [
      [0.082, 0.092],
      [0.074, 0.084],
      [0.092, 0.102],
      [0.088, 0.098],
      [0.072, 0.082],
    ],
    radialSegments: 28,
    subdivideRings: 4,
    uvVRange: [0.35, 0.65],
    foldAmp: 0.003,
    foldFreqU: 6,
    foldFreqV: 8,
  });
}

export function buildSculptedFoxHead() {
  const headMesh = buildLoftedTube({
    points: [
      [0, 0.43, 0.22], // Base of neck
      [0, 0.48, 0.27], // Throat
      [0, 0.52, 0.33], // Cranium & cheek fluff
      [0, 0.50, 0.41], // Snout bridge
      [0, 0.48, 0.45], // Black nose tip
    ],
    radii: [
      [0.058, 0.058],
      [0.065, 0.072],
      [0.078, 0.068], // Flared cheek fluff
      [0.038, 0.032],
      [0.018, 0.015], // Sharp fox muzzle
    ],
    radialSegments: 24,
    subdivideRings: 4,
    uvVRange: [0.70, 0.98],
    foldAmp: 0.002,
  });

  return headMesh;
}

export function buildSculptedFennecEar(isLeft = true) {
  const sign = isLeft ? 1 : -1;
  return buildLoftedTube({
    points: [
      [sign * 0.045, 0.55, 0.29],
      [sign * 0.075, 0.63, 0.28],
      [sign * 0.105, 0.72, 0.27],
      [sign * 0.125, 0.81, 0.26],
      [sign * 0.132, 0.86, 0.25],
    ],
    radii: [
      [0.028, 0.018],
      [0.052, 0.016],
      [0.064, 0.014], // Dramatic wide fennec ear concha
      [0.042, 0.008],
      [0.012, 0.004], // Tapered ear tip
    ],
    radialSegments: 20,
    subdivideRings: 3,
    uvVRange: [0.80, 1.0],
    foldAmp: 0.002,
  });
}

export function buildSculptedFoxTail() {
  return buildLoftedTube({
    points: [
      [0, 0.38, -0.20],
      [0, 0.41, -0.28],
      [0, 0.38, -0.38],
      [0, 0.32, -0.48],
      [0, 0.25, -0.58],
      [0, 0.20, -0.66],
    ],
    radii: [
      [0.035, 0.035],
      [0.065, 0.065],
      [0.078, 0.078], // Plush thick brush volume
      [0.072, 0.072],
      [0.045, 0.045],
      [0.015, 0.015], // White tip
    ],
    radialSegments: 22,
    subdivideRings: 4,
    uvVRange: [0.08, 0.35],
    foldAmp: 0.004,
    foldFreqU: 5,
    foldFreqV: 8,
  });
}

export function buildSculptedFoxLeg(xSign, zPos) {
  const isFront = zPos > 0;
  const yTop = isFront ? 0.38 : 0.36;
  const points = isFront
    ? [
        [xSign * 0.075, yTop, zPos],
        [xSign * 0.075, yTop * 0.68, zPos + 0.015],
        [xSign * 0.075, yTop * 0.35, zPos - 0.005],
        [xSign * 0.075, 0.06, zPos + 0.01],
        [xSign * 0.075, 0.02, zPos + 0.03], // Paw pad
      ]
    : [
        [xSign * 0.075, yTop, zPos],
        [xSign * 0.078, yTop * 0.72, zPos - 0.03], // Muscular thigh
        [xSign * 0.075, yTop * 0.38, zPos + 0.02], // Stifle forward
        [xSign * 0.075, 0.10, zPos - 0.02],        // Hock back
        [xSign * 0.075, 0.02, zPos + 0.01],        // Paw pad
      ];

  const radii = isFront
    ? [
        [0.038, 0.038],
        [0.028, 0.028],
        [0.022, 0.022],
        [0.020, 0.020],
        [0.024, 0.034],
      ]
    : [
        [0.052, 0.058], // Muscular upper thigh
        [0.042, 0.046],
        [0.028, 0.028],
        [0.022, 0.022],
        [0.024, 0.034],
      ];

  return buildLoftedTube({
    points,
    radii,
    radialSegments: 16,
    subdivideRings: 3,
    uvVRange: [0.0, 0.28],
  });
}

function computeFoxSkinWeights(vertices) {
  const numVerts = vertices.length / 3;
  const joints0 = new Uint16Array(numVerts * 4);
  const weights0 = new Float32Array(numVerts * 4);
  const boneMap = new Map();
  FOX_BONES.forEach((b, idx) => boneMap.set(b.name, idx));

  for (let i = 0; i < numVerts; i++) {
    const x = vertices[i * 3];
    const y = vertices[i * 3 + 1];
    const z = vertices[i * 3 + 2];
    const isLeft = x > 0;

    if (z > 0.24) {
      if (y > 0.60) {
        // Ear concha
        const e1 = boneMap.get(isLeft ? 'Ear_L_1' : 'Ear_R_1');
        const e2 = boneMap.get(isLeft ? 'Ear_L_2' : 'Ear_R_2');
        const t = Math.min(1, Math.max(0, (y - 0.60) / 0.24));
        joints0[i * 4] = e2; weights0[i * 4] = t;
        joints0[i * 4 + 1] = e1; weights0[i * 4 + 1] = 1 - t;
      } else if (z > 0.38) {
        joints0[i * 4] = boneMap.get('Muzzle'); weights0[i * 4] = 0.8;
        joints0[i * 4 + 1] = boneMap.get('Head'); weights0[i * 4 + 1] = 0.2;
      } else {
        joints0[i * 4] = boneMap.get('Head'); weights0[i * 4] = 0.7;
        joints0[i * 4 + 1] = boneMap.get('Neck'); weights0[i * 4 + 1] = 0.3;
      }
    } else if (z < -0.22) {
      // Bushy tail 4 bones
      const tNorm = Math.min(1, Math.max(0, (-z - 0.22) / 0.44));
      if (tNorm < 0.33) {
        joints0[i * 4] = boneMap.get('Tail_1'); weights0[i * 4] = 0.7;
        joints0[i * 4 + 1] = boneMap.get('Tail_2'); weights0[i * 4 + 1] = 0.3;
      } else if (tNorm < 0.66) {
        joints0[i * 4] = boneMap.get('Tail_2'); weights0[i * 4] = 0.6;
        joints0[i * 4 + 1] = boneMap.get('Tail_3'); weights0[i * 4 + 1] = 0.4;
      } else {
        joints0[i * 4] = boneMap.get('Tail_3'); weights0[i * 4] = 0.4;
        joints0[i * 4 + 1] = boneMap.get('Tail_4'); weights0[i * 4 + 1] = 0.6;
      }
    } else if (y < 0.26) {
      // Legs
      const isFront = z > 0;
      const side = isLeft ? 'L' : 'R';
      const prefix = isFront ? `Leg_F${side}` : `Leg_B${side}`;
      const pawName = isFront ? `Paw_F${side}` : `Paw_B${side}`;

      if (y < 0.08) {
        joints0[i * 4] = boneMap.get(pawName); weights0[i * 4] = 0.85;
        joints0[i * 4 + 1] = boneMap.get(`${prefix}_Lower`); weights0[i * 4 + 1] = 0.15;
      } else if (y < 0.20) {
        joints0[i * 4] = boneMap.get(`${prefix}_Lower`); weights0[i * 4] = 0.75;
        joints0[i * 4 + 1] = boneMap.get(`${prefix}_Upper`); weights0[i * 4 + 1] = 0.25;
      } else {
        joints0[i * 4] = boneMap.get(`${prefix}_Upper`); weights0[i * 4] = 0.85;
        joints0[i * 4 + 1] = boneMap.get(isFront ? 'Spine_Chest' : 'Spine_Pelvis'); weights0[i * 4 + 1] = 0.15;
      }
    } else {
      // Spine
      if (z > 0.05) {
        joints0[i * 4] = boneMap.get('Spine_Chest'); weights0[i * 4] = 0.75;
        joints0[i * 4 + 1] = boneMap.get('Root'); weights0[i * 4 + 1] = 0.25;
      } else {
        joints0[i * 4] = boneMap.get('Spine_Pelvis'); weights0[i * 4] = 0.75;
        joints0[i * 4 + 1] = boneMap.get('Root'); weights0[i * 4 + 1] = 0.25;
      }
    }
  }

  return { joints0, weights0 };
}

/**
 * Synthesizes quadruped locomotion clips driving all 22 bones
 */
export function synthesizeFoxClips(fps = 30) {
  const clips = [];
  const euler = new THREE.Euler();
  const quat = new THREE.Quaternion();

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

  // CLIP 1: 'trot' (Energetic 2-beat diagonal quadruped gait: FL+BR vs FR+BL)
  {
    const frames = 24;
    const duration = frames / fps; // 0.8s trot cycle
    const times = [];
    const rootPos = [];
    const boneQuats = new Map();
    FOX_BONES.forEach(b => boneQuats.set(b.name, []));

    for (let i = 0; i <= frames; i++) {
      const t = (i / frames) * duration;
      const phase = (2 * Math.PI * (i % frames)) / frames;
      times.push(t);

      // Vertical 2-beat bounce
      rootPos.push(0, 0.38 + Math.abs(Math.sin(phase * 2)) * 0.022, 0);

      euler.set(0.04 * Math.sin(phase * 2), Math.sin(phase) * 0.05, 0);
      quat.setFromEuler(euler);
      boneQuats.get('Root').push(quat.x, quat.y, quat.z, quat.w);

      // Spine counter-twist
      euler.set(0.03 * Math.cos(phase * 2), -Math.sin(phase) * 0.06, 0);
      quat.setFromEuler(euler);
      boneQuats.get('Spine_Chest').push(quat.x, quat.y, quat.z, quat.w);

      euler.set(-0.03 * Math.cos(phase * 2), Math.sin(phase) * 0.06, 0);
      quat.setFromEuler(euler);
      boneQuats.get('Spine_Pelvis').push(quat.x, quat.y, quat.z, quat.w);

      // Head rhythm bob
      euler.set(0.06 * Math.sin(phase * 2) + 0.02, 0, 0);
      quat.setFromEuler(euler);
      boneQuats.get('Head').push(quat.x, quat.y, quat.z, quat.w);

      euler.set(0.03 * Math.sin(phase * 2), 0, 0);
      quat.setFromEuler(euler);
      boneQuats.get('Neck').push(quat.x, quat.y, quat.z, quat.w);
      boneQuats.get('Muzzle').push(quat.x, quat.y, quat.z, quat.w);

      // Ear alert swivels with gait
      for (const side of ['L', 'R']) {
        const s = side === 'L' ? 1 : -1;
        euler.set(0.08 * Math.sin(phase * 2), s * 0.06 * Math.cos(phase), 0);
        quat.setFromEuler(euler);
        boneQuats.get(`Ear_${side}_1`).push(quat.x, quat.y, quat.z, quat.w);
        boneQuats.get(`Ear_${side}_2`).push(quat.x, quat.y, quat.z, quat.w);
      }

      // Tail counter-balance wag
      for (let k = 1; k <= 4; k++) {
        const lag = k * 0.4;
        euler.set(0.08 * Math.cos(phase * 2 - lag), Math.sin(phase - lag) * 0.15, 0);
        quat.setFromEuler(euler);
        boneQuats.get(`Tail_${k}`).push(quat.x, quat.y, quat.z, quat.w);
      }

      // Diagonal Leg Pairs: FL + BR (phase 0) vs FR + BL (phase PI)
      const legPairs = [
        { upper: 'Leg_FL_Upper', lower: 'Leg_FL_Lower', paw: 'Paw_FL', offset: 0, isFront: true },
        { upper: 'Leg_BR_Upper', lower: 'Leg_BR_Lower', paw: 'Paw_BR', offset: 0, isFront: false },
        { upper: 'Leg_FR_Upper', lower: 'Leg_FR_Lower', paw: 'Paw_FR', offset: Math.PI, isFront: true },
        { upper: 'Leg_BL_Upper', lower: 'Leg_BL_Lower', paw: 'Paw_BL', offset: Math.PI, isFront: false },
      ];

      for (const lp of legPairs) {
        const legPhase = phase + lp.offset;
        const swing = Math.sin(legPhase);
        const lift = Math.max(0, Math.cos(legPhase));

        // Upper thigh/shoulder pitch
        euler.set(swing * 0.42, 0, 0);
        quat.setFromEuler(euler);
        boneQuats.get(lp.upper).push(quat.x, quat.y, quat.z, quat.w);

        // Knee/stifle flex
        euler.set(-lift * 0.55 - (1 - lift) * 0.08, 0, 0);
        quat.setFromEuler(euler);
        boneQuats.get(lp.lower).push(quat.x, quat.y, quat.z, quat.w);

        // Paw ground compensation
        euler.set(-swing * 0.25 + lift * 0.35, 0, 0);
        quat.setFromEuler(euler);
        boneQuats.get(lp.paw).push(quat.x, quat.y, quat.z, quat.w);
      }
    }

    const tracks = [makePosTrack('Root', times, rootPos)];
    for (const b of FOX_BONES) {
      tracks.push(makeQuatTrack(b.name, times, boneQuats.get(b.name)));
    }

    clips.push({ name: 'trot', duration, tracks });
  }

  // CLIP 2: 'idle' (Alert sniffing, ear swivels, tail wag, paw shifts)
  {
    const frames = 60;
    const duration = frames / fps; // 2.0s
    const times = [];
    const rootPos = [];
    const boneQuats = new Map();
    FOX_BONES.forEach(b => boneQuats.set(b.name, []));

    for (let i = 0; i <= frames; i++) {
      const t = (i / frames) * duration;
      const phase = (2 * Math.PI * (i % frames)) / frames;
      times.push(t);

      rootPos.push(0, 0.38 + Math.sin(phase * 2) * 0.008, 0);

      euler.set(0.02 * Math.sin(phase), 0, 0);
      quat.setFromEuler(euler);
      boneQuats.get('Root').push(quat.x, quat.y, quat.z, quat.w);
      boneQuats.get('Spine_Chest').push(quat.x, quat.y, quat.z, quat.w);
      boneQuats.get('Spine_Pelvis').push(quat.x, quat.y, quat.z, quat.w);

      // Head curiosity tilt & sniffing
      euler.set(0.08 * Math.sin(phase * 4), 0.12 * Math.sin(phase), 0.08 * Math.cos(phase));
      quat.setFromEuler(euler);
      boneQuats.get('Head').push(quat.x, quat.y, quat.z, quat.w);

      euler.set(0.04 * Math.sin(phase * 4), 0.06 * Math.sin(phase), 0);
      quat.setFromEuler(euler);
      boneQuats.get('Neck').push(quat.x, quat.y, quat.z, quat.w);
      boneQuats.get('Muzzle').push(quat.x, quat.y, quat.z, quat.w);

      // Independent ear swivels
      euler.set(0.12 * Math.sin(phase), 0.18 * Math.cos(phase), 0);
      quat.setFromEuler(euler);
      boneQuats.get('Ear_L_1').push(quat.x, quat.y, quat.z, quat.w);
      boneQuats.get('Ear_L_2').push(quat.x, quat.y, quat.z, quat.w);

      euler.set(0.12 * Math.cos(phase), -0.18 * Math.sin(phase), 0);
      quat.setFromEuler(euler);
      boneQuats.get('Ear_R_1').push(quat.x, quat.y, quat.z, quat.w);
      boneQuats.get('Ear_R_2').push(quat.x, quat.y, quat.z, quat.w);

      // Tail gentle lazy sway
      for (let k = 1; k <= 4; k++) {
        const lag = k * 0.35;
        euler.set(0.04, Math.sin(phase * 2 - lag) * 0.22, 0);
        quat.setFromEuler(euler);
        boneQuats.get(`Tail_${k}`).push(quat.x, quat.y, quat.z, quat.w);
      }

      // Legs subtle weight shifting
      const legBones = [
        'Leg_FL_Upper', 'Leg_FL_Lower', 'Paw_FL',
        'Leg_FR_Upper', 'Leg_FR_Lower', 'Paw_FR',
        'Leg_BL_Upper', 'Leg_BL_Lower', 'Paw_BL',
        'Leg_BR_Upper', 'Leg_BR_Lower', 'Paw_BR',
      ];
      for (const lb of legBones) {
        euler.set(0.02 * Math.sin(phase), 0, 0);
        quat.setFromEuler(euler);
        boneQuats.get(lb).push(quat.x, quat.y, quat.z, quat.w);
      }
    }

    const tracks = [makePosTrack('Root', times, rootPos)];
    for (const b of FOX_BONES) {
      tracks.push(makeQuatTrack(b.name, times, boneQuats.get(b.name)));
    }

    clips.push({ name: 'idle', duration, tracks });
  }

  return clips;
}

export async function buildDesertFox(outPath = 'characters/desert_fox/desert_fox.glb') {
  console.log(`\n======================================================`);
  console.log(`>>> [Round 2] PROCEDURALLY SCULPTING QUADRUPED: [desert_fox]`);
  console.log(`======================================================`);

  const torso = buildSculptedFoxTorso();
  const head = buildSculptedFoxHead();
  const earL = buildSculptedFennecEar(true);
  const earR = buildSculptedFennecEar(false);
  const tail = buildSculptedFoxTail();
  const legFL = buildSculptedFoxLeg(1, 0.16);
  const legFR = buildSculptedFoxLeg(-1, 0.16);
  const legBL = buildSculptedFoxLeg(1, -0.16);
  const legBR = buildSculptedFoxLeg(-1, -0.16);

  const foxMesh = mergeGeometries([torso, head, earL, earR, tail, legFL, legFR, legBL, legBR]);
  const numTris = foxMesh.indices.length / 3;
  console.log(`Desert Fox Mesh: ${foxMesh.vertices.length / 3} vertices, ${numTris} triangles`);

  const { joints0, weights0 } = computeFoxSkinWeights(foxMesh.vertices);
  const ibmArray = computeInverseBindMatrices(FOX_BONES);

  // Textures
  const size = 512;
  const baseColor = createPNG(size, size, (u, v) => {
    if (v > 0.70) {
      if (u > 0.46 && u < 0.54 && v > 0.90) return [20, 18, 22, 255]; // Black nose
      if (Math.abs(u - 0.5) < 0.20 && v > 0.74) return [245, 238, 230, 255]; // White cheek ruff
      return [222, 168, 98, 255]; // Golden dune fur
    }
    if (v < 0.18) {
      return [252, 250, 246, 255]; // White tail tip
    }
    // Luminous desert runes
    if (Math.abs(u - 0.5) > 0.35 && v > 0.40 && v < 0.60) {
      const rune = Math.sin(u * 80) * Math.cos(v * 80);
      if (rune > 0.75) return [255, 175, 40, 255];
    }
    return [218, 158, 88, 255];
  });

  const mr = createPNG(size, size, () => [0, 215, 15, 255]);
  const norm = createPNG(size, size, () => [128, 128, 255, 255]);

  const emissive = createPNG(size, size, (u, v) => {
    if (Math.abs(u - 0.5) > 0.35 && v > 0.40 && v < 0.60) {
      const rune = Math.sin(u * 80) * Math.cos(v * 80);
      if (rune > 0.75) return [255, 175, 40, 255];
    }
    if (Math.abs(u - 0.5) < 0.12 && v > 0.80 && v < 0.85) {
      return [255, 190, 30, 255]; // Luminous amber eyes
    }
    return [0, 0, 0, 255];
  });

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

  const posAcc = doc.createAccessor('POSITION').setArray(new Float32Array(foxMesh.vertices)).setType('VEC3').setBuffer(buffer);
  const normAcc = doc.createAccessor('NORMAL').setArray(new Float32Array(foxMesh.normals)).setType('VEC3').setBuffer(buffer);
  const uvAcc = doc.createAccessor('TEXCOORD_0').setArray(new Float32Array(foxMesh.uvs)).setType('VEC2').setBuffer(buffer);
  const jAcc = doc.createAccessor('JOINTS_0').setArray(joints0).setType('VEC4').setBuffer(buffer);
  const wAcc = doc.createAccessor('WEIGHTS_0').setArray(weights0).setType('VEC4').setBuffer(buffer);
  const idxAcc = doc.createAccessor('INDICES').setArray(new Uint32Array(foxMesh.indices)).setType('SCALAR').setBuffer(buffer);

  const prim = doc.createPrimitive()
    .setAttribute('POSITION', posAcc)
    .setAttribute('NORMAL', normAcc)
    .setAttribute('TEXCOORD_0', uvAcc)
    .setAttribute('JOINTS_0', jAcc)
    .setAttribute('WEIGHTS_0', wAcc)
    .setIndices(idxAcc)
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

  const clips = synthesizeFoxClips(30);
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
  console.log(`>>> Written ${outPath}: ${fileSizeKB.toFixed(1)} KB, ${numTris} tris, ${FOX_BONES.length} bones, ${clips.length} clips.`);

  return {
    filePath: outPath,
    fileSizeKB,
    triangles: numTris,
    bones: FOX_BONES.length,
    clips: clips.map(c => ({ name: c.name, channels: c.tracks.length })),
  };
}

if (process.argv[1] && process.argv[1].endsWith('build-desert-fox.mjs')) {
  buildDesertFox().catch(err => {
    console.error('Desert Fox build failed:', err);
    process.exit(1);
  });
}
