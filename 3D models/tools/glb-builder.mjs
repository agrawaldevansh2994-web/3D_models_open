import * as THREE from 'three';

/**
 * High-Resolution Procedural Sculpting, 5-Finger Hand Builder & Multi-Layer Skinning Kernel
 */

function distPointToSegment(p, a, b) {
  const ab = new THREE.Vector3().subVectors(b, a);
  const ap = new THREE.Vector3().subVectors(p, a);
  const abLenSq = ab.lengthSq();
  if (abLenSq < 1e-8) return ap.length();
  const t = Math.max(0, Math.min(1, ap.dot(ab) / abLenSq));
  const projection = new THREE.Vector3().copy(a).addScaledVector(ab, t);
  return p.distanceTo(projection);
}

/**
 * Builds a high-density lofted tube along a 3D waypoint path with elliptical radii
 * and optional sculpted cloth folds / muscle contours.
 */
export function buildLoftedTube({
  points,
  radii,
  radialSegments = 24,
  subdivideRings = 2,
  uvVRange = [0, 1],
  uvURange = [0, 1],
  closeEnds = true,
  foldAmp = 0.0,
  foldFreqU = 6,
  foldFreqV = 8,
  outwardOffset = 0.0,
}) {
  const vertices = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  // Catmull-Rom or linear subdivision along the control path for high-res smoothness
  const rawPts = points.map(p => (Array.isArray(p) ? new THREE.Vector3(...p) : p.clone()));
  const pathPoints = [];
  const interpRadii = [];

  for (let i = 0; i < rawPts.length - 1; i++) {
    const steps = i === rawPts.length - 2 ? subdivideRings + 1 : subdivideRings;
    for (let s = 0; s < steps; s++) {
      const t = i === rawPts.length - 2 ? s / (steps - 1) : s / steps;
      const SmoothT = t * t * (3 - 2 * t);
      const pt = new THREE.Vector3().lerpVectors(rawPts[i], rawPts[i + 1], t);
      const rx = radii[i][0] * (1 - SmoothT) + radii[i + 1][0] * SmoothT;
      const rz = radii[i][1] * (1 - SmoothT) + radii[i + 1][1] * SmoothT;
      pathPoints.push(pt);
      interpRadii.push([rx, rz]);
    }
  }

  const numRings = pathPoints.length;
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

    let norm = new THREE.Vector3(0, 0, 1);
    if (Math.abs(tangent.dot(norm)) > 0.92) {
      norm = new THREE.Vector3(0, 1, 0);
    }
    const binorm = new THREE.Vector3().crossVectors(tangent, norm).normalize();
    norm = new THREE.Vector3().crossVectors(binorm, tangent).normalize();

    normalsPath.push(norm);
    binormals.push(binorm);
  }

  for (let i = 0; i < numRings; i++) {
    const center = pathPoints[i];
    const [baseRx, baseRz] = interpRadii[i];
    const n = normalsPath[i];
    const b = binormals[i];
    const vNorm = i / (numRings - 1);
    const vCoord = uvVRange[0] + vNorm * (uvVRange[1] - uvVRange[0]);

    for (let j = 0; j <= radialSegments; j++) {
      const uNorm = j / radialSegments;
      const theta = uNorm * Math.PI * 2;
      const cosTheta = Math.cos(theta);
      const sinTheta = Math.sin(theta);

      // Sculpted cloth fold / quilted baffle displacement
      const fold = foldAmp > 0
        ? foldAmp * Math.sin(theta * foldFreqU + vNorm * 2.5) * Math.sin(vNorm * Math.PI * foldFreqV)
        : 0;

      const rx = baseRx + outwardOffset + fold;
      const rz = baseRz + outwardOffset + fold;

      const offsetX = b.clone().multiplyScalar(cosTheta * rx);
      const offsetZ = n.clone().multiplyScalar(sinTheta * rz);
      const pos = center.clone().add(offsetX).add(offsetZ);

      const normVec = b.clone().multiplyScalar(cosTheta / Math.max(1e-4, rx))
        .add(n.clone().multiplyScalar(sinTheta / Math.max(1e-4, rz)))
        .normalize();

      vertices.push(pos.x, pos.y, pos.z);
      normals.push(normVec.x, normVec.y, normVec.z);

      const uCoord = uvURange[0] + uNorm * (uvURange[1] - uvURange[0]);
      uvs.push(uCoord, vCoord);
    }
  }

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

  if (closeEnds) {
    const bIdx = vertices.length / 3;
    const bCenter = pathPoints[0];
    vertices.push(bCenter.x, bCenter.y, bCenter.z);
    normals.push(-tangents[0].x, -tangents[0].y, -tangents[0].z);
    uvs.push((uvURange[0] + uvURange[1]) * 0.5, uvVRange[0]);

    for (let j = 0; j < radialSegments; j++) {
      indices.push(bIdx, j + 1, j);
    }

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
 * Builds a high-detail sculpted humanoid head with explicit facial anatomy:
 * - Brow ridge, eye sockets, protruding eyeballs, nose bridge, nostrils, upper/lower lips, chin, jawline, ears
 * - Sculpted cyberpunk braided hair locks
 */
export function buildSculptedHead() {
  const rings = 44;
  const segs = 48;
  const vertices = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= rings; i++) {
    const v = i / rings; // 0 = base of neck (y=1.45), 1 = crown (y=1.76)
    const y = 1.45 + v * 0.31;

    // Base cranium/neck profile
    let baseRx = 0.052;
    let baseRz = 0.054;
    let centerZ = 0.0;

    if (v < 0.22) {
      // Neck column
      const t = v / 0.22;
      baseRx = 0.054 * (1 - t) + 0.052 * t;
      baseRz = 0.056 * (1 - t) + 0.054 * t;
      centerZ = -0.005 * t;
    } else {
      // Head spheroid from chin (v=0.22) to crown (v=1.0)
      const h = (v - 0.22) / 0.78; // 0..1 across head height
      const profile = Math.sin(Math.min(1, h * 0.96 + 0.04) * Math.PI);
      const jawTaper = h < 0.35 ? 0.68 + 0.32 * (h / 0.35) : 1.0;
      baseRx = (0.015 + 0.076 * Math.pow(profile, 0.72)) * jawTaper;
      baseRz = (0.018 + 0.092 * Math.pow(profile, 0.68)) * (h < 0.25 ? 0.82 + 0.18 * (h / 0.25) : 1.0);
      centerZ = 0.014 * Math.sin(h * Math.PI);
    }

    for (let j = 0; j <= segs; j++) {
      const u = j / segs;
      // theta = 0 is +Z (Directly Front of Face), +/- PI/2 is Left/Right Ears, PI is Back of Skull
      const theta = (u - 0.5) * Math.PI * 2;
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);

      let rx = baseRx;
      let rz = baseRz;
      let dy = 0;

      if (v >= 0.22) {
        const h = (v - 0.22) / 0.78; // 0 = chin, 0.24 = mouth, 0.42 = nose tip, 0.56 = eyes, 0.66 = brow
        const frontMask = Math.max(0, cosT);

        // 1. Chin & Jawline prominence
        const chinDist = Math.hypot(theta * 1.2, (h - 0.08) * 3.5);
        if (chinDist < 1.0 && cosT > 0) {
          rz += 0.014 * Math.pow(1 - chinDist, 2);
        }

        // 2. Sculpted Upper & Lower Lips + Mouth Groove
        const mouthX = Math.abs(theta) / 0.30;
        if (mouthX < 1.0 && cosT > 0) {
          const mHoriz = Math.cos(mouthX * Math.PI * 0.5);
          const upperLip = Math.exp(-Math.pow((h - 0.255) / 0.028, 2));
          const lowerLip = Math.exp(-Math.pow((h - 0.205) / 0.030, 2));
          const mouthPart = Math.exp(-Math.pow((h - 0.230) / 0.012, 2));
          rz += mHoriz * (0.013 * upperLip + 0.014 * lowerLip - 0.009 * mouthPart);
        }

        // 3. Sculpted Nose Bridge, Tip & Nostrils
        const noseBridgeW = Math.abs(theta) / 0.14;
        if (noseBridgeW < 1.0 && h >= 0.34 && h <= 0.62 && cosT > 0) {
          const hNorm = (h - 0.34) / 0.28; // 0 at tip/base, 1 at brow
          const tipPeak = Math.sin(Math.pow(1 - hNorm, 0.65) * Math.PI);
          const bridgeProfile = 0.026 * tipPeak + 0.012 * (1 - hNorm);
          rz += Math.cos(noseBridgeW * Math.PI * 0.5) * bridgeProfile;
        }
        // Nostril wings
        const nostrilDist = Math.hypot((Math.abs(theta) - 0.11) / 0.08, (h - 0.36) / 0.045);
        if (nostrilDist < 1.0 && cosT > 0) {
          rz += 0.009 * (1 - nostrilDist);
          rx += 0.005 * (1 - nostrilDist);
        }

        // 4. Eye Sockets, Eyelids & Sculpted Eyeballs
        const eyeAngle = Math.abs(theta) - 0.26;
        const eyeDist = Math.hypot(eyeAngle / 0.14, (h - 0.55) / 0.075);
        if (eyeDist < 1.0 && cosT > 0) {
          // Orbital socket recess
          rz -= 0.012 * Math.cos(eyeDist * Math.PI * 0.5);
          // Protruding eyeball dome inside socket
          const pupilDist = Math.hypot(eyeAngle / 0.085, (h - 0.55) / 0.048);
          if (pupilDist < 1.0) {
            rz += 0.015 * Math.cos(pupilDist * Math.PI * 0.5);
          }
          // Upper & lower eyelid ridges
          const lidRidge = Math.exp(-Math.pow((Math.abs(h - 0.55) - 0.042) / 0.012, 2));
          rz += 0.005 * lidRidge * (1 - eyeDist);
        }

        // 5. Supraorbital Brow Ridge & Cheekbones
        const browDist = Math.abs(h - 0.64) / 0.05;
        if (browDist < 1.0 && Math.abs(theta) < 0.52 && cosT > 0) {
          rz += 0.010 * (1 - browDist) * Math.cos((theta / 0.52) * Math.PI * 0.5);
        }
        const cheekDist = Math.hypot((Math.abs(theta) - 0.48) / 0.22, (h - 0.42) / 0.12);
        if (cheekDist < 1.0 && cosT > 0) {
          rx += 0.009 * (1 - cheekDist);
          rz += 0.007 * (1 - cheekDist);
        }

        // 6. Sculpted Ears at +/- PI/2
        const earAngle = Math.abs(Math.abs(theta) - Math.PI * 0.52);
        const earDist = Math.hypot(earAngle / 0.16, (h - 0.48) / 0.13);
        if (earDist < 1.0) {
          rx += 0.018 * Math.sin((1 - earDist) * Math.PI * 0.5);
          rz -= 0.004 * (1 - earDist);
        }
      }

      const px = sinT * rx;
      const py = y + dy;
      const pz = centerZ + cosT * rz;

      vertices.push(px, py, pz);
      // Placeholder normal (recomputed accurately from triangle faces below)
      normals.push(sinT, 0.1, cosT);
      uvs.push(u, 0.72 + v * 0.28);
    }
  }

  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segs; j++) {
      const a = i * (segs + 1) + j;
      const b = (i + 1) * (segs + 1) + j;
      const c = (i + 1) * (segs + 1) + (j + 1);
      const d = i * (segs + 1) + (j + 1);
      indices.push(a, d, b);
      indices.push(b, d, c);
    }
  }

  const headGeo = { vertices, normals, uvs, indices };
  recomputeSmoothNormals(headGeo);

  // Add 6 braided cyberpunk hair locks flowing from crown down back/sides of head
  const braids = [];
  const braidAngles = [-2.5, -2.0, -1.5, 1.5, 2.0, 2.5];
  for (const ang of braidAngles) {
    const sx = Math.sin(ang);
    const cz = Math.cos(ang);
    braids.push(
      buildLoftedTube({
        points: [
          [sx * 0.055, 1.73, cz * 0.060],
          [sx * 0.088, 1.66, cz * 0.085 - 0.01],
          [sx * 0.095, 1.56, cz * 0.090 - 0.03],
          [sx * 0.092, 1.45, cz * 0.082 - 0.04],
          [sx * 0.085, 1.35, cz * 0.075 - 0.05],
        ],
        radii: [
          [0.018, 0.018],
          [0.022, 0.022],
          [0.020, 0.020],
          [0.016, 0.016],
          [0.008, 0.008],
        ],
        radialSegments: 12,
        subdivideRings: 2,
        uvVRange: [0.80, 0.96],
        uvURange: [0.05, 0.25],
        foldAmp: 0.003,
        foldFreqU: 4,
        foldFreqV: 10,
      })
    );
  }

  return mergeGeometries([headGeo, ...braids]);
}

/**
 * Builds an articulated 5-finger hand (sculpted palm + thumb, index, middle, ring, pinky)
 * aligned exactly with the 15 finger bones of LeftHand / RightHand in HUMANOID_BONES.
 */
export function buildArticulatedHand(side = 'Left') {
  const sign = side === 'Left' ? 1 : -1;
  const wristX = sign * 0.57;
  const wristY = 1.06;
  const wristZ = 0.01;

  // 1. Sculpted Palm & Metacarpal Arch
  const palmMesh = buildLoftedTube({
    points: [
      [wristX, wristY, wristZ],
      [wristX + sign * 0.020, wristY - 0.022, wristZ],
      [wristX + sign * 0.038, wristY - 0.045, wristZ],
      [wristX + sign * 0.046, wristY - 0.054, wristZ],
    ],
    radii: [
      [0.018, 0.032],
      [0.016, 0.040],
      [0.015, 0.044],
      [0.012, 0.040],
    ],
    radialSegments: 16,
    subdivideRings: 2,
    uvVRange: [0.72, 0.78],
    uvURange: [0.35, 0.65],
  });

  // 2. Five Individual 3-Phalanx Fingers matching rig-humanoid.mjs coordinates
  const fingerSpecs = [
    { name: 'Thumb', zOff: 0.032, yOff: -0.015, spread: 0.35, len: [0.024, 0.020, 0.016], rad: 0.0095 },
    { name: 'Index', zOff: 0.022, yOff: -0.055, spread: 0.10, len: [0.028, 0.022, 0.016], rad: 0.0080 },
    { name: 'Middle', zOff: 0.006, yOff: -0.058, spread: 0.0, len: [0.030, 0.024, 0.017], rad: 0.0084 },
    { name: 'Ring', zOff: -0.010, yOff: -0.055, spread: -0.08, len: [0.027, 0.021, 0.015], rad: 0.0078 },
    { name: 'Pinky', zOff: -0.024, yOff: -0.050, spread: -0.16, len: [0.022, 0.017, 0.013], rad: 0.0068 },
  ];

  const fingerMeshes = [];
  for (const f of fingerSpecs) {
    let cx = wristX + sign * 0.038;
    let cy = wristY + f.yOff;
    let cz = wristZ + f.zOff;

    const pts = [[cx, cy, cz]];
    const rads = [[f.rad, f.rad]];

    for (let p = 0; p < 3; p++) {
      const segLen = f.len[p];
      cx += sign * segLen * 0.72;
      cy -= segLen * 0.68;
      cz += Math.sin(f.spread) * segLen * 0.25;
      pts.push([cx, cy, cz]);
      const rScale = 1.0 - (p + 1) * 0.16;
      rads.push([f.rad * rScale, f.rad * rScale]);
    }

    fingerMeshes.push(
      buildLoftedTube({
        points: pts,
        radii: rads,
        radialSegments: 10,
        subdivideRings: 2,
        uvVRange: [0.73, 0.78],
        uvURange: [0.40, 0.60],
      })
    );
  }

  return mergeGeometries([palmMesh, ...fingerMeshes]);
}

/**
 * Recomputes smooth area-weighted vertex normals from triangle indices
 */
export function recomputeSmoothNormals(geo) {
  const numVerts = geo.vertices.length / 3;
  const norms = new Float32Array(numVerts * 3);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (let i = 0; i < geo.indices.length; i += 3) {
    const ia = geo.indices[i];
    const ib = geo.indices[i + 1];
    const ic = geo.indices[i + 2];

    a.set(geo.vertices[ia * 3], geo.vertices[ia * 3 + 1], geo.vertices[ia * 3 + 2]);
    b.set(geo.vertices[ib * 3], geo.vertices[ib * 3 + 1], geo.vertices[ib * 3 + 2]);
    c.set(geo.vertices[ic * 3], geo.vertices[ic * 3 + 1], geo.vertices[ic * 3 + 2]);

    ab.subVectors(b, a);
    ac.subVectors(c, a);
    n.crossVectors(ab, ac);

    norms[ia * 3] += n.x; norms[ia * 3 + 1] += n.y; norms[ia * 3 + 2] += n.z;
    norms[ib * 3] += n.x; norms[ib * 3 + 1] += n.y; norms[ib * 3 + 2] += n.z;
    norms[ic * 3] += n.x; norms[ic * 3 + 1] += n.y; norms[ic * 3 + 2] += n.z;
  }

  for (let v = 0; v < numVerts; v++) {
    n.set(norms[v * 3], norms[v * 3 + 1], norms[v * 3 + 2]);
    if (n.lengthSq() > 1e-12) n.normalize();
    else n.set(0, 1, 0);
    geo.normals[v * 3] = n.x;
    geo.normals[v * 3 + 1] = n.y;
    geo.normals[v * 3 + 2] = n.z;
  }
}

/**
 * Combine multiple geometry buffers into a single mesh primitive buffer
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
 * Region-Aware Capsule Envelope Skinning Algorithm.
 * Guarantees:
 * - Left/Right limb isolation (left leg never weights to right leg, etc.)
 * - Finger bone precision for hand meshes
 * - Locked garment/jacket projection (optional `isGarmentLayer: true`) so outer clothing layers
 *   receive the exact same torso/shoulder/arm skin weights as the underlying body, preventing poke-through.
 */
export function computeEnvelopeSkinWeights(vertices, bones, options = {}) {
  const { isGarmentLayer = false } = options;
  const boneMap = new Map();
  bones.forEach((b, idx) => boneMap.set(b.name, { ...b, index: idx }));

  const segments = [];
  bones.forEach((bone, idx) => {
    if (bone.parent) {
      const parent = boneMap.get(bone.parent);
      const isFinger = bone.name.includes('Thumb') || bone.name.includes('Index') ||
        bone.name.includes('Middle') || bone.name.includes('Ring') || bone.name.includes('Pinky');
      const isLeft = bone.name.includes('Left');
      const isRight = bone.name.includes('Right');
      const isLeg = bone.name.includes('Leg') || bone.name.includes('Foot') || bone.name.includes('Toe');
      segments.push({
        boneIndex: idx,
        parentIndex: parent.index,
        name: bone.name,
        isFinger,
        isLeft,
        isRight,
        isLeg,
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
    let vx = vertices[v * 3];
    let vy = vertices[v * 3 + 1];
    let vz = vertices[v * 3 + 2];

    // If skinning an outer garment layer (like the techwear jacket), slightly contract the sample point
    // toward the body core/limb axis so its skin weights match the underlying torso/arm surface in lockstep
    if (isGarmentLayer) {
      vz *= 0.82;
      if (Math.abs(vx) < 0.22) vx *= 0.88;
    }

    vertexPos.set(vx, vy, vz);
    const inHandZone = Math.abs(vx) > 0.54 && vy < 1.12;

    const influences = [];
    for (const seg of segments) {
      // Never weight non-hand vertices to tiny finger bones
      if (seg.isFinger && (!inHandZone || isGarmentLayer)) continue;
      // Never weight jacket vertices to lower legs
      if (isGarmentLayer && seg.isLeg) continue;
      // Prevent cross-leg weighting across the x=0 midline
      if (seg.isLeg && seg.isLeft && vx < -0.01) continue;
      if (seg.isLeg && seg.isRight && vx > 0.01) continue;
      // Prevent cross-arm weighting
      if (!seg.isLeg && seg.isLeft && vx < -0.02) continue;
      if (!seg.isLeg && seg.isRight && vx > 0.02) continue;

      const d = distPointToSegment(vertexPos, seg.a, seg.b);
      const power = seg.isFinger ? 3.6 : 3.0;
      const eps = seg.isFinger ? 0.0001 : 0.0006;
      const weight = 1.0 / (Math.pow(d, power) + eps);
      influences.push({ index: seg.boneIndex, weight });
      influences.push({ index: seg.parentIndex, weight: weight * 0.65 });
    }

    // Combine duplicate bone indices before sorting
    const combinedMap = new Map();
    for (const inf of influences) {
      combinedMap.set(inf.index, (combinedMap.get(inf.index) || 0) + inf.weight);
    }

    const selected = Array.from(combinedMap.entries())
      .map(([index, weight]) => ({ index, weight }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 4);

    while (selected.length < 4) {
      selected.push({ index: 0, weight: 0 });
    }

    const totalWeight = selected.reduce((sum, item) => sum + item.weight, 0);
    let accum = 0;
    for (let k = 0; k < 4; k++) {
      const normW = totalWeight > 0 ? selected[k].weight / totalWeight : (k === 0 ? 1.0 : 0.0);
      joints0[v * 4 + k] = selected[k].index;
      weights0[v * 4 + k] = normW;
      accum += normW;
    }
    if (accum > 0) {
      weights0[v * 4] += (1.0 - accum);
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

  for (let i = 0; i < numBones; i++) {
    const bone = bones[i];
    const m = new THREE.Matrix4();
    m.makeTranslation(bone.pos[0], bone.pos[1], bone.pos[2]);
    const inv = new THREE.Matrix4().copy(m).invert();
    ibmArray.set(inv.elements, i * 16);
  }

  return ibmArray;
}
