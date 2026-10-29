import * as THREE from 'three';

/**
 * Standard Mixamo-compatible Humanoid Bone Hierarchy.
 * All positions defined in Rest Pose (A-pose or T-pose), scaled to total height ~ 1.76m.
 */
export const HUMANOID_BONES = [
  { name: 'mixamorig:Hips', parent: null, pos: [0, 0.95, 0] },
  { name: 'mixamorig:Spine', parent: 'mixamorig:Hips', pos: [0, 1.08, 0] },
  { name: 'mixamorig:Spine1', parent: 'mixamorig:Spine', pos: [0, 1.22, 0] },
  { name: 'mixamorig:Spine2', parent: 'mixamorig:Spine1', pos: [0, 1.36, 0] },
  { name: 'mixamorig:Neck', parent: 'mixamorig:Spine2', pos: [0, 1.48, 0] },
  { name: 'mixamorig:Head', parent: 'mixamorig:Neck', pos: [0, 1.62, 0] },

  // Left Arm Chain (A-pose: ~35 deg downward slant)
  { name: 'mixamorig:LeftShoulder', parent: 'mixamorig:Spine2', pos: [0.08, 1.42, 0] },
  { name: 'mixamorig:LeftArm', parent: 'mixamorig:LeftShoulder', pos: [0.19, 1.40, 0] },
  { name: 'mixamorig:LeftForeArm', parent: 'mixamorig:LeftArm', pos: [0.42, 1.20, 0] },
  { name: 'mixamorig:LeftHand', parent: 'mixamorig:LeftForeArm', pos: [0.62, 1.02, 0] },

  // Right Arm Chain (A-pose)
  { name: 'mixamorig:RightShoulder', parent: 'mixamorig:Spine2', pos: [-0.08, 1.42, 0] },
  { name: 'mixamorig:RightArm', parent: 'mixamorig:RightShoulder', pos: [-0.19, 1.40, 0] },
  { name: 'mixamorig:RightForeArm', parent: 'mixamorig:RightArm', pos: [-0.42, 1.20, 0] },
  { name: 'mixamorig:RightHand', parent: 'mixamorig:RightForeArm', pos: [-0.62, 1.02, 0] },

  // Left Leg Chain
  { name: 'mixamorig:LeftUpLeg', parent: 'mixamorig:Hips', pos: [0.11, 0.90, 0] },
  { name: 'mixamorig:LeftLeg', parent: 'mixamorig:LeftUpLeg', pos: [0.11, 0.50, 0] },
  { name: 'mixamorig:LeftFoot', parent: 'mixamorig:LeftLeg', pos: [0.11, 0.10, 0] },
  { name: 'mixamorig:LeftToeBase', parent: 'mixamorig:LeftFoot', pos: [0.11, 0.02, 0.12] },

  // Right Leg Chain
  { name: 'mixamorig:RightUpLeg', parent: 'mixamorig:Hips', pos: [-0.11, 0.90, 0] },
  { name: 'mixamorig:RightLeg', parent: 'mixamorig:RightUpLeg', pos: [-0.11, 0.50, 0] },
  { name: 'mixamorig:RightFoot', parent: 'mixamorig:RightLeg', pos: [-0.11, 0.10, 0] },
  { name: 'mixamorig:RightToeBase', parent: 'mixamorig:RightFoot', pos: [-0.11, 0.02, 0.12] },
];

/**
 * Procedural Harmonic Dance & Motion Synthesizer.
 * Generates continuous, C-infinity seamless loops over period T.
 *
 * Multi-harmonic Fourier series:
 * θ(t) = θ_0 + ∑ [a_k * sin(2π k t / T) + b_k * cos(2π k t / T)]
 */
export function synthesizeMotionClips(fps = 30) {
  const clips = [];

  // Helper to generate rotation keyframe track
  function makeQuatTrack(boneName, times, quatValues) {
    return {
      name: `${boneName}.quaternion`,
      type: 'quaternion',
      times: new Float32Array(times),
      values: new Float32Array(quatValues),
    };
  }

  // Helper to generate position keyframe track
  function makePosTrack(boneName, times, posValues) {
    return {
      name: `${boneName}.position`,
      type: 'vector',
      times: new Float32Array(times),
      values: new Float32Array(posValues),
    };
  }

  // ==========================================
  // CLIP 1: 'idle' (124 BPM subtle festival bounce & breathing, T = 1.935s, 60 frames)
  // ==========================================
  {
    const duration = 60 / fps; // 2.0s
    const frameCount = 61;
    const times = [];
    const hipPos = [];
    const hipRot = [];
    const spineRot = [];
    const headRot = [];
    const lArmRot = [];
    const rArmRot = [];

    const euler = new THREE.Euler();
    const quat = new THREE.Quaternion();

    for (let i = 0; i < frameCount; i++) {
      const t = (i / (frameCount - 1)) * duration;
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      times.push(t);

      // Hip bounce & sway
      const bounce = Math.sin(phase * 2) * 0.015;
      const swayX = Math.sin(phase) * 0.012;
      hipPos.push(swayX, 0.95 + bounce, 0);

      euler.set(Math.sin(phase) * 0.02, 0, Math.cos(phase) * 0.03);
      quat.setFromEuler(euler);
      hipRot.push(quat.x, quat.y, quat.z, quat.w);

      // Spine counter-sway
      euler.set(-Math.sin(phase) * 0.02, Math.sin(phase) * 0.03, -Math.cos(phase) * 0.02);
      quat.setFromEuler(euler);
      spineRot.push(quat.x, quat.y, quat.z, quat.w);

      // Head rhythm bob
      euler.set(Math.sin(phase * 2) * 0.04 + 0.02, Math.sin(phase) * 0.04, 0);
      quat.setFromEuler(euler);
      headRot.push(quat.x, quat.y, quat.z, quat.w);

      // Arms subtle breathing drift
      euler.set(Math.sin(phase) * 0.03, 0, Math.sin(phase) * 0.04);
      quat.setFromEuler(euler);
      lArmRot.push(quat.x, quat.y, quat.z, quat.w);

      euler.set(Math.sin(phase) * 0.03, 0, -Math.sin(phase) * 0.04);
      quat.setFromEuler(euler);
      rArmRot.push(quat.x, quat.y, quat.z, quat.w);
    }

    clips.push({
      name: 'idle',
      duration,
      tracks: [
        makePosTrack('mixamorig:Hips', times, hipPos),
        makeQuatTrack('mixamorig:Hips', times, hipRot),
        makeQuatTrack('mixamorig:Spine', times, spineRot),
        makeQuatTrack('mixamorig:Head', times, headRot),
        makeQuatTrack('mixamorig:LeftArm', times, lArmRot),
        makeQuatTrack('mixamorig:RightArm', times, rArmRot),
      ],
    });
  }

  // ==========================================
  // CLIP 2: 'walk' (Confident festival swagger, planted feet, T = 1.2s, 36 frames)
  // ==========================================
  {
    const duration = 36 / fps; // 1.2s
    const frameCount = 37;
    const times = [];
    const hipPos = [];
    const hipRot = [];
    const spineRot = [];
    const lUpLegRot = [];
    const rUpLegRot = [];
    const lLegRot = [];
    const rLegRot = [];
    const lArmRot = [];
    const rArmRot = [];

    const euler = new THREE.Euler();
    const quat = new THREE.Quaternion();

    for (let i = 0; i < frameCount; i++) {
      const t = (i / (frameCount - 1)) * duration;
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      times.push(t);

      // Hip bob (2 cycles per gait cycle) and lateral sway (1 cycle)
      const hipY = 0.95 + Math.cos(phase * 2) * 0.025;
      const hipX = Math.sin(phase) * 0.02;
      hipPos.push(hipX, hipY, 0);

      euler.set(0, Math.sin(phase) * 0.08, -Math.cos(phase) * 0.03);
      quat.setFromEuler(euler);
      hipRot.push(quat.x, quat.y, quat.z, quat.w);

      // Counter-rotating torso
      euler.set(0.04, -Math.sin(phase) * 0.08, Math.cos(phase) * 0.02);
      quat.setFromEuler(euler);
      spineRot.push(quat.x, quat.y, quat.z, quat.w);

      // Thighs pitch forward / back
      const lThigh = Math.sin(phase) * 0.38;
      const rThigh = Math.sin(phase + Math.PI) * 0.38;

      euler.set(lThigh, 0, 0);
      quat.setFromEuler(euler);
      lUpLegRot.push(quat.x, quat.y, quat.z, quat.w);

      euler.set(rThigh, 0, 0);
      quat.setFromEuler(euler);
      rUpLegRot.push(quat.x, quat.y, quat.z, quat.w);

      // Knees flex during swing phase
      const lKnee = Math.max(0, -Math.sin(phase)) * 0.55;
      const rKnee = Math.max(0, -Math.sin(phase + Math.PI)) * 0.55;

      euler.set(-lKnee, 0, 0);
      quat.setFromEuler(euler);
      lLegRot.push(quat.x, quat.y, quat.z, quat.w);

      euler.set(-rKnee, 0, 0);
      quat.setFromEuler(euler);
      rLegRot.push(quat.x, quat.y, quat.z, quat.w);

      // Arms counter-swing opposite to legs
      euler.set(-lThigh * 0.8, 0, 0.08);
      quat.setFromEuler(euler);
      lArmRot.push(quat.x, quat.y, quat.z, quat.w);

      euler.set(-rThigh * 0.8, 0, -0.08);
      quat.setFromEuler(euler);
      rArmRot.push(quat.x, quat.y, quat.z, quat.w);
    }

    clips.push({
      name: 'walk',
      duration,
      tracks: [
        makePosTrack('mixamorig:Hips', times, hipPos),
        makeQuatTrack('mixamorig:Hips', times, hipRot),
        makeQuatTrack('mixamorig:Spine', times, spineRot),
        makeQuatTrack('mixamorig:LeftUpLeg', times, lUpLegRot),
        makeQuatTrack('mixamorig:RightUpLeg', times, rUpLegRot),
        makeQuatTrack('mixamorig:LeftLeg', times, lLegRot),
        makeQuatTrack('mixamorig:RightLeg', times, rLegRot),
        makeQuatTrack('mixamorig:LeftArm', times, lArmRot),
        makeQuatTrack('mixamorig:RightArm', times, rArmRot),
      ],
    });
  }

  // ==========================================
  // CLIP 3: 'dance_1' (House Shuffle / Groove, fast footwork, bouncing knees, T = 1.935s, 58 frames)
  // ==========================================
  {
    const duration = 58 / fps;
    const frameCount = 59;
    const times = [];
    const hipPos = [];
    const hipRot = [];
    const spineRot = [];
    const lUpLegRot = [];
    const rUpLegRot = [];
    const lLegRot = [];
    const rLegRot = [];
    const lArmRot = [];
    const rArmRot = [];
    const lForeArmRot = [];
    const rForeArmRot = [];

    const euler = new THREE.Euler();
    const quat = new THREE.Quaternion();

    for (let i = 0; i < frameCount; i++) {
      const t = (i / (frameCount - 1)) * duration;
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      times.push(t);

      // 4-beat house bounce
      const bounce = Math.abs(Math.sin(phase * 2)) * 0.045;
      const hipX = Math.sin(phase) * 0.035;
      hipPos.push(hipX, 0.93 - bounce, Math.cos(phase * 2) * 0.02);

      euler.set(Math.sin(phase * 2) * 0.06, Math.sin(phase) * 0.15, -Math.cos(phase) * 0.06);
      quat.setFromEuler(euler);
      hipRot.push(quat.x, quat.y, quat.z, quat.w);

      // Dynamic torso isolation
      euler.set(-Math.sin(phase * 2) * 0.08, -Math.sin(phase) * 0.12, Math.cos(phase) * 0.08);
      quat.setFromEuler(euler);
      spineRot.push(quat.x, quat.y, quat.z, quat.w);

      // Syncopated shuffle leg kicks
      const lKick = Math.sin(phase * 2) * 0.32;
      const rKick = Math.sin(phase * 2 + Math.PI) * 0.32;

      euler.set(lKick, Math.sin(phase) * 0.1, 0.05);
      quat.setFromEuler(euler);
      lUpLegRot.push(quat.x, quat.y, quat.z, quat.w);

      euler.set(rKick, -Math.sin(phase) * 0.1, -0.05);
      quat.setFromEuler(euler);
      rUpLegRot.push(quat.x, quat.y, quat.z, quat.w);

      // Knee spring
      euler.set(-Math.max(0, lKick) * 0.7 - 0.1, 0, 0);
      quat.setFromEuler(euler);
      lLegRot.push(quat.x, quat.y, quat.z, quat.w);

      euler.set(-Math.max(0, rKick) * 0.7 - 0.1, 0, 0);
      quat.setFromEuler(euler);
      rLegRot.push(quat.x, quat.y, quat.z, quat.w);

      // Arm pumping groove (elbows 90 degrees, rhythmic beat punches)
      euler.set(0.3 + Math.sin(phase * 2) * 0.25, 0, 0.2 + Math.cos(phase) * 0.1);
      quat.setFromEuler(euler);
      lArmRot.push(quat.x, quat.y, quat.z, quat.w);

      euler.set(0.3 + Math.sin(phase * 2 + Math.PI) * 0.25, 0, -0.2 - Math.cos(phase) * 0.1);
      quat.setFromEuler(euler);
      rArmRot.push(quat.x, quat.y, quat.z, quat.w);

      euler.set(0.8 + Math.cos(phase * 2) * 0.2, 0, 0);
      quat.setFromEuler(euler);
      lForeArmRot.push(quat.x, quat.y, quat.z, quat.w);

      euler.set(0.8 + Math.cos(phase * 2 + Math.PI) * 0.2, 0, 0);
      quat.setFromEuler(euler);
      rForeArmRot.push(quat.x, quat.y, quat.z, quat.w);
    }

    clips.push({
      name: 'dance_1',
      duration,
      tracks: [
        makePosTrack('mixamorig:Hips', times, hipPos),
        makeQuatTrack('mixamorig:Hips', times, hipRot),
        makeQuatTrack('mixamorig:Spine', times, spineRot),
        makeQuatTrack('mixamorig:LeftUpLeg', times, lUpLegRot),
        makeQuatTrack('mixamorig:RightUpLeg', times, rUpLegRot),
        makeQuatTrack('mixamorig:LeftLeg', times, lLegRot),
        makeQuatTrack('mixamorig:RightLeg', times, rLegRot),
        makeQuatTrack('mixamorig:LeftArm', times, lArmRot),
        makeQuatTrack('mixamorig:RightArm', times, rArmRot),
        makeQuatTrack('mixamorig:LeftForeArm', times, lForeArmRot),
        makeQuatTrack('mixamorig:RightForeArm', times, rForeArmRot),
      ],
    });
  }

  // ==========================================
  // CLIP 4: 'dance_2' (Techno Bass Stomp & Fist Pump, high energy, T = 1.935s, 58 frames)
  // ==========================================
  {
    const duration = 58 / fps;
    const frameCount = 59;
    const times = [];
    const hipPos = [];
    const hipRot = [];
    const spineRot = [];
    const headRot = [];
    const rArmRot = [];
    const rForeArmRot = [];
    const lArmRot = [];

    const euler = new THREE.Euler();
    const quat = new THREE.Quaternion();

    for (let i = 0; i < frameCount; i++) {
      const t = (i / (frameCount - 1)) * duration;
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      times.push(t);

      // Heavy bass drop drop-crouch and rise
      const drop = (Math.sin(phase * 4) > 0 ? 0.05 : 0.0) + Math.sin(phase) * 0.02;
      hipPos.push(0, 0.95 - drop, Math.sin(phase * 2) * 0.03);

      euler.set(0.1 + Math.sin(phase * 4) * 0.08, 0, 0);
      quat.setFromEuler(euler);
      hipRot.push(quat.x, quat.y, quat.z, quat.w);

      euler.set(0.15 + Math.sin(phase * 4) * 0.1, 0, 0);
      quat.setFromEuler(euler);
      spineRot.push(quat.x, quat.y, quat.z, quat.w);

      // Headbanging with the drop
      euler.set(0.2 + Math.sin(phase * 4) * 0.2, 0, 0);
      quat.setFromEuler(euler);
      headRot.push(quat.x, quat.y, quat.z, quat.w);

      // Right arm explosive overhead fist pump
      const fistThrust = Math.sin(phase * 4);
      euler.set(2.4 + fistThrust * 0.4, 0, -0.2);
      quat.setFromEuler(euler);
      rArmRot.push(quat.x, quat.y, quat.z, quat.w);

      euler.set(0.5 + fistThrust * 0.3, 0, 0);
      quat.setFromEuler(euler);
      rForeArmRot.push(quat.x, quat.y, quat.z, quat.w);

      // Left arm balance / flow
      euler.set(0.2, 0, 0.4 + Math.cos(phase * 2) * 0.15);
      quat.setFromEuler(euler);
      lArmRot.push(quat.x, quat.y, quat.z, quat.w);
    }

    clips.push({
      name: 'dance_2',
      duration,
      tracks: [
        makePosTrack('mixamorig:Hips', times, hipPos),
        makeQuatTrack('mixamorig:Hips', times, hipRot),
        makeQuatTrack('mixamorig:Spine', times, spineRot),
        makeQuatTrack('mixamorig:Head', times, headRot),
        makeQuatTrack('mixamorig:RightArm', times, rArmRot),
        makeQuatTrack('mixamorig:RightForeArm', times, rForeArmRot),
        makeQuatTrack('mixamorig:LeftArm', times, lArmRot),
      ],
    });
  }

  // ==========================================
  // CLIP 5: 'dance_3' (Hypnotic Trance Flow, figure-8 hip sway & LED arm arcs, T = 3.0s, 90 frames)
  // ==========================================
  {
    const duration = 90 / fps;
    const frameCount = 91;
    const times = [];
    const hipPos = [];
    const hipRot = [];
    const spineRot = [];
    const lArmRot = [];
    const rArmRot = [];
    const lForeArmRot = [];
    const rForeArmRot = [];

    const euler = new THREE.Euler();
    const quat = new THREE.Quaternion();

    for (let i = 0; i < frameCount; i++) {
      const t = (i / (frameCount - 1)) * duration;
      const phase = (2 * Math.PI * (i % (frameCount - 1))) / (frameCount - 1);
      times.push(t);

      // Figure-eight Lissajous hip sway
      const swayX = Math.sin(phase) * 0.045;
      const swayZ = Math.sin(phase * 2) * 0.03;
      hipPos.push(swayX, 0.95 + Math.cos(phase * 2) * 0.015, swayZ);

      euler.set(Math.cos(phase * 2) * 0.05, Math.sin(phase) * 0.12, -Math.cos(phase) * 0.08);
      quat.setFromEuler(euler);
      hipRot.push(quat.x, quat.y, quat.z, quat.w);

      // Torso wave
      euler.set(-Math.cos(phase * 2) * 0.06, -Math.sin(phase) * 0.10, Math.cos(phase) * 0.06);
      quat.setFromEuler(euler);
      spineRot.push(quat.x, quat.y, quat.z, quat.w);

      // Sweeping overhead LED trails (arms trace graceful arcs)
      euler.set(1.4 + Math.sin(phase) * 0.4, 0, 0.8 + Math.cos(phase) * 0.3);
      quat.setFromEuler(euler);
      lArmRot.push(quat.x, quat.y, quat.z, quat.w);

      euler.set(1.4 + Math.sin(phase + Math.PI) * 0.4, 0, -0.8 - Math.cos(phase + Math.PI) * 0.3);
      quat.setFromEuler(euler);
      rArmRot.push(quat.x, quat.y, quat.z, quat.w);

      euler.set(0.6 + Math.sin(phase * 2) * 0.3, 0, 0);
      quat.setFromEuler(euler);
      lForeArmRot.push(quat.x, quat.y, quat.z, quat.w);

      euler.set(0.6 + Math.sin(phase * 2 + Math.PI) * 0.3, 0, 0);
      quat.setFromEuler(euler);
      rForeArmRot.push(quat.x, quat.y, quat.z, quat.w);
    }

    clips.push({
      name: 'dance_3',
      duration,
      tracks: [
        makePosTrack('mixamorig:Hips', times, hipPos),
        makeQuatTrack('mixamorig:Hips', times, hipRot),
        makeQuatTrack('mixamorig:Spine', times, spineRot),
        makeQuatTrack('mixamorig:LeftArm', times, lArmRot),
        makeQuatTrack('mixamorig:RightArm', times, rArmRot),
        makeQuatTrack('mixamorig:LeftForeArm', times, lForeArmRot),
        makeQuatTrack('mixamorig:RightForeArm', times, rForeArmRot),
      ],
    });
  }

  return clips;
}
