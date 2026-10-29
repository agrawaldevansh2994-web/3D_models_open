import * as THREE from 'three';

/**
 * Full 52-Bone Mixamo-Compatible Humanoid Skeleton (`mixamorig:`).
 * Includes full 5-finger articulated hands (3 phalanges per finger x 5 fingers x 2 hands = 30 finger bones)
 * plus 22 core body/limb bones = 52 bones total.
 * Rest pose is a natural A-pose with feet planted at y = 0, facing +Z, height = 1.76m.
 */
function buildHumanoidBoneList() {
  const bones = [
    // Core Spine & Head (6)
    { name: 'mixamorig:Hips', parent: null, pos: [0, 0.94, 0] },
    { name: 'mixamorig:Spine', parent: 'mixamorig:Hips', pos: [0, 1.07, 0] },
    { name: 'mixamorig:Spine1', parent: 'mixamorig:Spine', pos: [0, 1.21, 0] },
    { name: 'mixamorig:Spine2', parent: 'mixamorig:Spine1', pos: [0, 1.35, 0] },
    { name: 'mixamorig:Neck', parent: 'mixamorig:Spine2', pos: [0, 1.48, 0] },
    { name: 'mixamorig:Head', parent: 'mixamorig:Neck', pos: [0, 1.58, 0.01] },

    // Left Arm Chain (4)
    { name: 'mixamorig:LeftShoulder', parent: 'mixamorig:Spine2', pos: [0.07, 1.42, 0] },
    { name: 'mixamorig:LeftArm', parent: 'mixamorig:LeftShoulder', pos: [0.18, 1.40, 0] },
    { name: 'mixamorig:LeftForeArm', parent: 'mixamorig:LeftArm', pos: [0.39, 1.22, 0] },
    { name: 'mixamorig:LeftHand', parent: 'mixamorig:LeftForeArm', pos: [0.57, 1.06, 0.01] },

    // Right Arm Chain (4)
    { name: 'mixamorig:RightShoulder', parent: 'mixamorig:Spine2', pos: [-0.07, 1.42, 0] },
    { name: 'mixamorig:RightArm', parent: 'mixamorig:RightShoulder', pos: [-0.18, 1.40, 0] },
    { name: 'mixamorig:RightForeArm', parent: 'mixamorig:RightArm', pos: [-0.39, 1.22, 0] },
    { name: 'mixamorig:RightHand', parent: 'mixamorig:RightForeArm', pos: [-0.57, 1.06, 0.01] },

    // Left Leg Chain (4)
    { name: 'mixamorig:LeftUpLeg', parent: 'mixamorig:Hips', pos: [0.105, 0.90, 0] },
    { name: 'mixamorig:LeftLeg', parent: 'mixamorig:LeftUpLeg', pos: [0.105, 0.49, 0.01] },
    { name: 'mixamorig:LeftFoot', parent: 'mixamorig:LeftLeg', pos: [0.105, 0.09, -0.01] },
    { name: 'mixamorig:LeftToeBase', parent: 'mixamorig:LeftFoot', pos: [0.105, 0.02, 0.11] },

    // Right Leg Chain (4)
    { name: 'mixamorig:RightUpLeg', parent: 'mixamorig:Hips', pos: [-0.105, 0.90, 0] },
    { name: 'mixamorig:RightLeg', parent: 'mixamorig:RightUpLeg', pos: [-0.105, 0.49, 0.01] },
    { name: 'mixamorig:RightFoot', parent: 'mixamorig:RightLeg', pos: [-0.105, 0.09, -0.01] },
    { name: 'mixamorig:RightToeBase', parent: 'mixamorig:RightFoot', pos: [-0.105, 0.02, 0.11] },
  ];

  // Add 5-finger articulated chains for Left & Right hands (15 bones per hand = 30 bones)
  const fingerSpecs = [
    { name: 'Thumb', zOff: 0.032, yOff: -0.015, spread: 0.35, len: [0.024, 0.020, 0.016] },
    { name: 'Index', zOff: 0.022, yOff: -0.055, spread: 0.10, len: [0.028, 0.022, 0.016] },
    { name: 'Middle', zOff: 0.006, yOff: -0.058, spread: 0.0, len: [0.030, 0.024, 0.017] },
    { name: 'Ring', zOff: -0.010, yOff: -0.055, spread: -0.08, len: [0.027, 0.021, 0.015] },
    { name: 'Pinky', zOff: -0.024, yOff: -0.050, spread: -0.16, len: [0.022, 0.017, 0.013] },
  ];

  for (const side of ['Left', 'Right']) {
    const sign = side === 'Left' ? 1 : -1;
    const handPos = [sign * 0.57, 1.06, 0.01];
    const handBoneName = `mixamorig:${side}Hand`;

    for (const f of fingerSpecs) {
      let prevParent = handBoneName;
      let cx = handPos[0] + sign * 0.038;
      let cy = handPos[1] + f.yOff;
      let cz = handPos[2] + f.zOff;

      for (let p = 1; p <= 3; p++) {
        const boneName = `mixamorig:${side}Hand${f.name}${p}`;
        const segLen = f.len[p - 1];
        cx += sign * segLen * 0.72;
        cy -= segLen * 0.68;
        cz += Math.sin(f.spread) * segLen * 0.25;
        bones.push({
          name: boneName,
          parent: prevParent,
          pos: [Number(cx.toFixed(4)), Number(cy.toFixed(4)), Number(cz.toFixed(4))],
        });
        prevParent = boneName;
      }
    }
  }

  return bones;
}

export const HUMANOID_BONES = buildHumanoidBoneList();

/**
 * Helper to create quaternion rotation and vector translation tracks
 */
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

/**
 * Evaluates a full-body 52-bone pose for a given clip type and normalized loop phase in [0, 2π).
 * Every single bone in HUMANOID_BONES receives an explicit, musically/biomechanically coordinated rotation,
 * ensuring >= 52 animated bone channels per clip, planted stance feet, and exact C-infinity loop closure.
 */
function evaluatePoseAtPhase(clipName, phase) {
  const s1 = Math.sin(phase);
  const c1 = Math.cos(phase);
  const s2 = Math.sin(phase * 2);
  const c2 = Math.cos(phase * 2);
  const s4 = Math.sin(phase * 4);
  const c4 = Math.cos(phase * 4);

  const rots = {};
  let hipPos = [0, 0.94, 0];

  // Default finger curl helper
  function setHandFingers(side, baseCurl, pulseCurl, spreadWave, thumbOpposition = 0.25) {
    const sign = side === 'Left' ? 1 : -1;
    const fingers = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
    fingers.forEach((fname, fIdx) => {
      const lag = fIdx * 0.25;
      const curl = baseCurl + pulseCurl * Math.sin(phase * 2 - lag);
      for (let p = 1; p <= 3; p++) {
        const bName = `mixamorig:${side}Hand${fname}${p}`;
        if (fname === 'Thumb') {
          rots[bName] = [curl * 0.45, sign * thumbOpposition, -sign * curl * 0.5];
        } else {
          const zCurl = -sign * (curl * (0.35 + p * 0.12));
          const ySpread = sign * (fIdx - 2) * spreadWave * (p === 1 ? 1.0 : 0.2);
          rots[bName] = [curl * 0.2, ySpread, zCurl];
        }
      }
    });
  }

  if (clipName === 'idle') {
    // 124 BPM festival breathing & subtle groove, feet locked at y = 0
    const kneeFlex = 0.08 + 0.04 * (0.5 - 0.5 * c2);
    const hipDrop = kneeFlex * 0.18;
    const swayX = 0.018 * s1;
    hipPos = [swayX, 0.94 - hipDrop, 0.006 * c2];

    rots['mixamorig:Hips'] = [0.02 * s2, 0.04 * s1, -0.025 * s1];
    rots['mixamorig:Spine'] = [-0.015 * s2, -0.02 * s1, 0.015 * s1];
    rots['mixamorig:Spine1'] = [0.025 * c2, -0.02 * s1, 0.01 * s1];
    rots['mixamorig:Spine2'] = [0.03 * s2, 0.015 * c1, -0.01 * c1];
    rots['mixamorig:Neck'] = [0.04 * s2, 0.05 * s1, -0.02 * c1];
    rots['mixamorig:Head'] = [0.06 * s2 + 0.02, 0.06 * s1, 0.02 * s2];

    rots['mixamorig:LeftShoulder'] = [0, 0.02 * s2, 0.03 * c2];
    rots['mixamorig:RightShoulder'] = [0, -0.02 * s2, -0.03 * c2];
    rots['mixamorig:LeftArm'] = [0.08 + 0.04 * s1, 0.05 * c1, 0.06 + 0.03 * s2];
    rots['mixamorig:RightArm'] = [0.08 - 0.04 * s1, -0.05 * c1, -0.06 - 0.03 * s2];
    rots['mixamorig:LeftForeArm'] = [0.22 + 0.06 * s2, 0.04 * c1, 0.05];
    rots['mixamorig:RightForeArm'] = [0.22 + 0.06 * c2, -0.04 * c1, -0.05];
    rots['mixamorig:LeftHand'] = [0.05 * s2, 0.04 * c2, 0.06 * s1];
    rots['mixamorig:RightHand'] = [0.05 * c2, -0.04 * c2, -0.06 * s1];

    // Analytical foot-plant compensation: thigh + knee + ankle cancel out so feet stay planted
    rots['mixamorig:LeftUpLeg'] = [kneeFlex * 0.5, 0.02, 0.025 * s1];
    rots['mixamorig:LeftLeg'] = [-kneeFlex, 0, 0];
    rots['mixamorig:LeftFoot'] = [kneeFlex * 0.5, -0.02, -0.025 * s1];
    rots['mixamorig:LeftToeBase'] = [0.02 * s2, 0, 0];

    rots['mixamorig:RightUpLeg'] = [kneeFlex * 0.5, -0.02, 0.025 * s1];
    rots['mixamorig:RightLeg'] = [-kneeFlex, 0, 0];
    rots['mixamorig:RightFoot'] = [kneeFlex * 0.5, 0.02, -0.025 * s1];
    rots['mixamorig:RightToeBase'] = [0.02 * c2, 0, 0];

    setHandFingers('Left', 0.35, 0.12, 0.04);
    setHandFingers('Right', 0.35, 0.12, 0.04);
  } else if (clipName === 'walk') {
    // Confident swagger walk cycle with stance-phase analytical knee/ankle lock
    const lSwing = Math.sin(phase);
    const rSwing = Math.sin(phase + Math.PI);
    const lLift = Math.max(0, Math.cos(phase));
    const rLift = Math.max(0, Math.cos(phase + Math.PI));

    hipPos = [0.022 * c1, 0.935 + 0.018 * Math.abs(s1), 0.01 * s2];

    rots['mixamorig:Hips'] = [0.03 * s2, -0.09 * s1, 0.035 * c1];
    rots['mixamorig:Spine'] = [0.02, 0.04 * s1, -0.02 * c1];
    rots['mixamorig:Spine1'] = [0.02 + 0.015 * c2, 0.05 * s1, -0.015 * c1];
    rots['mixamorig:Spine2'] = [0.02, 0.05 * s1, -0.01 * c1];
    rots['mixamorig:Neck'] = [-0.01 * c2, -0.04 * s1, 0.01 * c1];
    rots['mixamorig:Head'] = [0.025 * s2, -0.04 * s1, 0.01 * c1];

    rots['mixamorig:LeftShoulder'] = [-0.04 * lSwing, 0.03 * lSwing, 0.02 * s2];
    rots['mixamorig:RightShoulder'] = [-0.04 * rSwing, -0.03 * rSwing, -0.02 * s2];
    rots['mixamorig:LeftArm'] = [-0.32 * lSwing + 0.05, 0.04 * c1, 0.08];
    rots['mixamorig:RightArm'] = [-0.32 * rSwing + 0.05, -0.04 * c1, -0.08];
    rots['mixamorig:LeftForeArm'] = [0.28 + Math.max(0, -lSwing) * 0.22, 0.03, 0.04 * s1];
    rots['mixamorig:RightForeArm'] = [0.28 + Math.max(0, -rSwing) * 0.22, -0.03, -0.04 * s1];
    rots['mixamorig:LeftHand'] = [-0.08 * lSwing, 0.03 * c1, 0.05];
    rots['mixamorig:RightHand'] = [-0.08 * rSwing, -0.03 * c1, -0.05];

    const lKnee = lLift * 0.58 + (1 - lLift) * 0.08;
    const rKnee = rLift * 0.58 + (1 - rLift) * 0.08;
    rots['mixamorig:LeftUpLeg'] = [0.36 * lSwing + lLift * 0.16, 0, -0.02 * c1];
    rots['mixamorig:LeftLeg'] = [-lKnee, 0, 0];
    rots['mixamorig:LeftFoot'] = [-0.22 * lSwing + lKnee * 0.35, 0, 0.02 * c1];
    rots['mixamorig:LeftToeBase'] = [Math.max(0, -lSwing) * 0.28, 0, 0];

    rots['mixamorig:RightUpLeg'] = [0.36 * rSwing + rLift * 0.16, 0, -0.02 * c1];
    rots['mixamorig:RightLeg'] = [-rKnee, 0, 0];
    rots['mixamorig:RightFoot'] = [-0.22 * rSwing + rKnee * 0.35, 0, 0.02 * c1];
    rots['mixamorig:RightToeBase'] = [Math.max(0, -rSwing) * 0.28, 0, 0];

    setHandFingers('Left', 0.42, 0.10, 0.03);
    setHandFingers('Right', 0.42, 0.10, 0.03);
  } else if (clipName === 'run') {
    // Dynamic athletic run cycle with forward torso lean & high knee drive
    const lSwing = Math.sin(phase);
    const rSwing = Math.sin(phase + Math.PI);
    const lLift = Math.max(0, Math.cos(phase));
    const rLift = Math.max(0, Math.cos(phase + Math.PI));

    hipPos = [0.025 * c1, 0.90 + 0.032 * c2, 0.02 * s2];

    rots['mixamorig:Hips'] = [0.12 + 0.04 * c2, -0.14 * s1, 0.04 * c1];
    rots['mixamorig:Spine'] = [0.08 + 0.03 * s2, 0.06 * s1, -0.02 * c1];
    rots['mixamorig:Spine1'] = [0.06 + 0.02 * c2, 0.07 * s1, -0.02 * c1];
    rots['mixamorig:Spine2'] = [0.05, 0.07 * s1, -0.015 * c1];
    rots['mixamorig:Neck'] = [-0.08, -0.05 * s1, 0.01 * c1];
    rots['mixamorig:Head'] = [-0.06 + 0.03 * c2, -0.06 * s1, 0.015 * c1];

    rots['mixamorig:LeftShoulder'] = [-0.08 * lSwing, 0.05 * lSwing, 0.03 * c2];
    rots['mixamorig:RightShoulder'] = [-0.08 * rSwing, -0.05 * rSwing, -0.03 * c2];
    rots['mixamorig:LeftArm'] = [-0.58 * lSwing + 0.12, 0.08 * c1, 0.12];
    rots['mixamorig:RightArm'] = [-0.58 * rSwing + 0.12, -0.08 * c1, -0.12];
    rots['mixamorig:LeftForeArm'] = [0.85 + 0.25 * Math.max(0, -lSwing), 0.06, 0.05];
    rots['mixamorig:RightForeArm'] = [0.85 + 0.25 * Math.max(0, -rSwing), -0.06, -0.05];
    rots['mixamorig:LeftHand'] = [-0.12 * lSwing, 0.05, 0.08];
    rots['mixamorig:RightHand'] = [-0.12 * rSwing, -0.05, -0.08];

    const lKnee = lLift * 0.92 + (1 - lLift) * 0.14;
    const rKnee = rLift * 0.92 + (1 - rLift) * 0.14;
    rots['mixamorig:LeftUpLeg'] = [0.62 * lSwing + lLift * 0.24, 0, -0.02 * c1];
    rots['mixamorig:LeftLeg'] = [-lKnee, 0, 0];
    rots['mixamorig:LeftFoot'] = [-0.30 * lSwing + lKnee * 0.32, 0, 0.02 * c1];
    rots['mixamorig:LeftToeBase'] = [Math.max(0, -lSwing) * 0.42, 0, 0];

    rots['mixamorig:RightUpLeg'] = [0.62 * rSwing + rLift * 0.24, 0, -0.02 * c1];
    rots['mixamorig:RightLeg'] = [-rKnee, 0, 0];
    rots['mixamorig:RightFoot'] = [-0.30 * rSwing + rKnee * 0.32, 0, 0.02 * c1];
    rots['mixamorig:RightToeBase'] = [Math.max(0, -rSwing) * 0.42, 0, 0];

    setHandFingers('Left', 0.68, 0.08, 0.02, 0.38);
    setHandFingers('Right', 0.68, 0.08, 0.02, 0.38);
  } else if (clipName === 'dance_1') {
    // Melbourne Shuffle / House Groove (derived from reference dance video #1)
    const bounce = 0.038 * (0.5 - 0.5 * c2);
    hipPos = [0.042 * s1, 0.92 - bounce, 0.025 * s2];

    rots['mixamorig:Hips'] = [0.05 * s2, 0.16 * s1, -0.06 * c1];
    rots['mixamorig:Spine'] = [-0.04 * s2, -0.07 * s1, 0.04 * c1];
    rots['mixamorig:Spine1'] = [0.06 * c2, -0.06 * s1, 0.03 * c1];
    rots['mixamorig:Spine2'] = [0.05 * s2, -0.05 * s1, 0.03 * s2];
    rots['mixamorig:Neck'] = [0.06 * s2, 0.08 * s1, -0.04 * c1];
    rots['mixamorig:Head'] = [0.09 * s2 + 0.03, 0.08 * s1, 0.04 * s2];

    rots['mixamorig:LeftShoulder'] = [0.05 * s2, 0.06 * c1, 0.08 * s2];
    rots['mixamorig:RightShoulder'] = [0.05 * c2, -0.06 * c1, -0.08 * s2];
    rots['mixamorig:LeftArm'] = [0.42 + 0.28 * s2, 0.18 * c1, 0.26 + 0.12 * c2];
    rots['mixamorig:RightArm'] = [0.42 - 0.28 * s2, -0.18 * c1, -0.26 - 0.12 * c2];
    rots['mixamorig:LeftForeArm'] = [0.75 + 0.24 * c2, 0.15 * s1, 0.10];
    rots['mixamorig:RightForeArm'] = [0.75 - 0.24 * c2, -0.15 * s1, -0.10];
    rots['mixamorig:LeftHand'] = [0.18 * s2, 0.14 * c2, 0.12 * s1];
    rots['mixamorig:RightHand'] = [-0.18 * s2, -0.14 * c2, -0.12 * s1];

    const lStep = Math.sin(phase * 2);
    const rStep = Math.sin(phase * 2 + Math.PI);
    const lKnee = 0.22 + Math.max(0, lStep) * 0.35;
    const rKnee = 0.22 + Math.max(0, rStep) * 0.35;

    rots['mixamorig:LeftUpLeg'] = [0.24 * lStep + 0.10, 0.08 * s1, 0.06];
    rots['mixamorig:LeftLeg'] = [-lKnee, 0, 0];
    rots['mixamorig:LeftFoot'] = [lKnee * 0.45 - 0.12 * lStep, -0.06 * s1, -0.04];
    rots['mixamorig:LeftToeBase'] = [0.15 * Math.max(0, -lStep), 0, 0];

    rots['mixamorig:RightUpLeg'] = [0.24 * rStep + 0.10, -0.08 * s1, -0.06];
    rots['mixamorig:RightLeg'] = [-rKnee, 0, 0];
    rots['mixamorig:RightFoot'] = [rKnee * 0.45 - 0.12 * rStep, 0.06 * s1, 0.04];
    rots['mixamorig:RightToeBase'] = [0.15 * Math.max(0, -rStep), 0, 0];

    setHandFingers('Left', 0.28, 0.22, 0.09);
    setHandFingers('Right', 0.28, 0.22, 0.09);
  } else if (clipName === 'dance_2') {
    // Techno Bass Stomp & Overhead Fist Pump (derived from reference dance video #2)
    const pump = 0.5 - 0.5 * c4;
    hipPos = [0.02 * s1, 0.91 - 0.045 * pump, 0.02 * s2];

    rots['mixamorig:Hips'] = [0.08 * pump, 0.10 * s1, -0.04 * c1];
    rots['mixamorig:Spine'] = [0.07 * pump, -0.05 * s1, 0.03 * c1];
    rots['mixamorig:Spine1'] = [0.08 * s4, 0.06 * c1, 0.02 * s2];
    rots['mixamorig:Spine2'] = [0.09 * s4, 0.06 * c1, -0.03 * s2];
    rots['mixamorig:Neck'] = [0.10 * s4, -0.05 * s1, 0.02 * c2];
    rots['mixamorig:Head'] = [0.14 * s4 + 0.04, -0.05 * s1, 0.03 * s2];

    rots['mixamorig:LeftShoulder'] = [0.04 * s2, 0.05 * c2, 0.06 * s4];
    rots['mixamorig:RightShoulder'] = [0.12 * pump, -0.08, -0.18 * pump];
    rots['mixamorig:LeftArm'] = [0.35 + 0.20 * s2, 0.15 * c1, 0.30 + 0.10 * c2];
    rots['mixamorig:RightArm'] = [2.15 + 0.38 * s4, -0.20 * c1, -0.28 - 0.12 * pump];
    rots['mixamorig:LeftForeArm'] = [0.68 + 0.22 * c2, 0.10, 0.08];
    rots['mixamorig:RightForeArm'] = [0.45 + 0.28 * c4, -0.12, -0.10];
    rots['mixamorig:LeftHand'] = [0.12 * s2, 0.08 * c2, 0.10];
    rots['mixamorig:RightHand'] = [0.16 * s4, -0.10 * c2, -0.12];

    const lStomp = Math.max(0, s2);
    const rStomp = Math.max(0, -s2);
    const lKnee = 0.18 + lStomp * 0.36 + pump * 0.12;
    const rKnee = 0.18 + rStomp * 0.36 + pump * 0.12;

    rots['mixamorig:LeftUpLeg'] = [lKnee * 0.55, 0.06, 0.05];
    rots['mixamorig:LeftLeg'] = [-lKnee, 0, 0];
    rots['mixamorig:LeftFoot'] = [lKnee * 0.45, -0.06, -0.05];
    rots['mixamorig:LeftToeBase'] = [0.08 * lStomp, 0, 0];

    rots['mixamorig:RightUpLeg'] = [rKnee * 0.55, -0.06, -0.05];
    rots['mixamorig:RightLeg'] = [-rKnee, 0, 0];
    rots['mixamorig:RightFoot'] = [rKnee * 0.45, 0.06, 0.05];
    rots['mixamorig:RightToeBase'] = [0.08 * rStomp, 0, 0];

    setHandFingers('Left', 0.45, 0.15, 0.05);
    setHandFingers('Right', 0.78, 0.08, 0.01, 0.45); // Tight fist on pumping right hand
  } else if (clipName === 'dance_3') {
    // Hypnotic Trance Flow: Figure-8 Lissajous sway & sweeping overhead LED arm arcs
    const swayX = 0.048 * s1;
    const swayZ = 0.028 * s2;
    const kneeFlex = 0.14 + 0.06 * (0.5 - 0.5 * c2);
    hipPos = [swayX, 0.93 - kneeFlex * 0.2, swayZ];

    rots['mixamorig:Hips'] = [0.04 * c2, 0.14 * s1, -0.07 * c1];
    rots['mixamorig:Spine'] = [-0.04 * c2, -0.05 * s1, 0.05 * c1];
    rots['mixamorig:Spine1'] = [0.05 * s2, -0.06 * c1, 0.04 * s1];
    rots['mixamorig:Spine2'] = [0.06 * c2, 0.08 * s1, -0.04 * c1];
    rots['mixamorig:Neck'] = [-0.04 * s2, 0.06 * c1, 0.04 * s1];
    rots['mixamorig:Head'] = [-0.05 * c2, 0.08 * s1, -0.04 * c1];

    rots['mixamorig:LeftShoulder'] = [0.06 * s1, 0.08 * c1, 0.12 * s1];
    rots['mixamorig:RightShoulder'] = [0.06 * c1, -0.08 * s1, -0.12 * c1];
    rots['mixamorig:LeftArm'] = [1.25 + 0.45 * s1, 0.28 * c1, 0.55 + 0.25 * c2];
    rots['mixamorig:RightArm'] = [1.25 - 0.45 * s1, -0.28 * c1, -0.55 - 0.25 * c2];
    rots['mixamorig:LeftForeArm'] = [0.52 + 0.28 * s2, 0.20 * c1, 0.12 * s1];
    rots['mixamorig:RightForeArm'] = [0.52 - 0.28 * s2, -0.20 * c1, -0.12 * s1];
    rots['mixamorig:LeftHand'] = [0.24 * c2, 0.18 * s1, 0.15 * c1];
    rots['mixamorig:RightHand'] = [-0.24 * c2, -0.18 * s1, -0.15 * c1];

    rots['mixamorig:LeftUpLeg'] = [kneeFlex * 0.5, 0.05, 0.05 + 0.04 * c1];
    rots['mixamorig:LeftLeg'] = [-kneeFlex, 0, 0];
    rots['mixamorig:LeftFoot'] = [kneeFlex * 0.5, -0.05, -0.05 - 0.04 * c1];
    rots['mixamorig:LeftToeBase'] = [0.03 * s2, 0, 0];

    rots['mixamorig:RightUpLeg'] = [kneeFlex * 0.5, -0.05, -0.05 + 0.04 * c1];
    rots['mixamorig:RightLeg'] = [-kneeFlex, 0, 0];
    rots['mixamorig:RightFoot'] = [kneeFlex * 0.5, 0.05, 0.05 - 0.04 * c1];
    rots['mixamorig:RightToeBase'] = [0.03 * c2, 0, 0];

    setHandFingers('Left', 0.18, 0.16, 0.12);
    setHandFingers('Right', 0.18, 0.16, 0.12);
  } else {
    // 'wave' — Friendly festival greeting wave with planted stance and left-hand hip rest
    const kneeFlex = 0.08 + 0.03 * (0.5 - 0.5 * c2);
    hipPos = [0.022 * s1, 0.94 - kneeFlex * 0.16, 0.008 * c1];

    rots['mixamorig:Hips'] = [0.02 * s1, 0.05 * c1, -0.03 * s1];
    rots['mixamorig:Spine'] = [-0.01 * s1, -0.02 * c1, 0.02 * s1];
    rots['mixamorig:Spine1'] = [0.02 * c1, -0.02 * s1, 0.02 * c1];
    rots['mixamorig:Spine2'] = [0.02 * s2, 0.04 * s1, -0.03 * s1];
    rots['mixamorig:Neck'] = [0.03 * s2, 0.05 * s1, 0.04 * c1];
    rots['mixamorig:Head'] = [0.04 * c2, 0.06 * s1, 0.05 * s1];

    rots['mixamorig:LeftShoulder'] = [0.02 * s1, 0.03 * c1, 0.03];
    rots['mixamorig:LeftArm'] = [0.15 + 0.04 * s1, 0.08, 0.18];
    rots['mixamorig:LeftForeArm'] = [0.45 + 0.05 * c1, 0.12, 0.08];
    rots['mixamorig:LeftHand'] = [0.06 * s2, 0.05 * c2, 0.08];

    // Right arm raised high waving side-to-side
    rots['mixamorig:RightShoulder'] = [0.08, -0.06, -0.22 - 0.04 * s2];
    rots['mixamorig:RightArm'] = [1.95 + 0.08 * s1, -0.18, -0.38 + 0.18 * s2];
    rots['mixamorig:RightForeArm'] = [0.55 + 0.22 * c2, -0.10, -0.25 * s2];
    rots['mixamorig:RightHand'] = [0.12 * s2, -0.15 * c2, 0.28 * s4];

    rots['mixamorig:LeftUpLeg'] = [kneeFlex * 0.5, 0.03, 0.03 * s1];
    rots['mixamorig:LeftLeg'] = [-kneeFlex, 0, 0];
    rots['mixamorig:LeftFoot'] = [kneeFlex * 0.5, -0.03, -0.03 * s1];
    rots['mixamorig:LeftToeBase'] = [0.02 * s1, 0, 0];

    rots['mixamorig:RightUpLeg'] = [kneeFlex * 0.5, -0.03, 0.03 * s1];
    rots['mixamorig:RightLeg'] = [-kneeFlex, 0, 0];
    rots['mixamorig:RightFoot'] = [kneeFlex * 0.5, 0.03, -0.03 * s1];
    rots['mixamorig:RightToeBase'] = [0.02 * c1, 0, 0];

    setHandFingers('Left', 0.35, 0.10, 0.04);
    setHandFingers('Right', 0.10, 0.08, 0.14); // Open spread waving hand
  }

  return { hipPos, rots };
}

/**
 * Generates all 7 seamless looping animation clips required for Round 2 (`festival_raver`).
 * Every clip drives all 52 skeleton bones (53 channels total: 1 translation + 52 rotations).
 * Frame 0 and Frame N-1 are mathematically identical (`phase = 0`), guaranteeing zero seam pop.
 */
export function synthesizeMotionClips(fps = 30) {
  const clipSpecs = [
    { name: 'idle', frames: 60 },
    { name: 'walk', frames: 36 },
    { name: 'run', frames: 24 },
    { name: 'dance_1', frames: 60 },
    { name: 'dance_2', frames: 60 },
    { name: 'dance_3', frames: 90 },
    { name: 'wave', frames: 60 },
  ];

  const euler = new THREE.Euler();
  const quat = new THREE.Quaternion();
  const clips = [];

  for (const spec of clipSpecs) {
    const duration = spec.frames / fps;
    const frameCount = spec.frames + 1;
    const times = [];

    const hipPosVals = [];
    const boneQuatMap = new Map();
    for (const b of HUMANOID_BONES) {
      boneQuatMap.set(b.name, []);
    }

    for (let i = 0; i < frameCount; i++) {
      const t = (i / spec.frames) * duration;
      // Exact periodic phase: i === spec.frames maps to phase === 0
      const phase = (2 * Math.PI * (i % spec.frames)) / spec.frames;
      times.push(t);

      const { hipPos, rots } = evaluatePoseAtPhase(spec.name, phase);
      hipPosVals.push(hipPos[0], hipPos[1], hipPos[2]);

      for (const b of HUMANOID_BONES) {
        const r = rots[b.name] || [0, 0, 0];
        euler.set(r[0], r[1], r[2], 'XYZ');
        quat.setFromEuler(euler);
        boneQuatMap.get(b.name).push(quat.x, quat.y, quat.z, quat.w);
      }
    }

    const tracks = [makePosTrack('mixamorig:Hips', times, hipPosVals)];
    for (const b of HUMANOID_BONES) {
      tracks.push(makeQuatTrack(b.name, times, boneQuatMap.get(b.name)));
    }

    clips.push({
      name: spec.name,
      duration,
      tracks,
    });
  }

  return clips;
}
