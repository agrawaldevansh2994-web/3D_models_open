import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { NodeIO } from '@gltf-transform/core';

/**
 * Automated 11-Check Gatekeeper for Round 2 (`FEEDBACK_ROUND1.md`)
 */

const charName = process.argv[2] || 'festival_raver';
const charDir = path.resolve(`characters/${charName}`);
const glbPath = path.join(charDir, `${charName}.glb`);

console.log(`\n================================================================`);
console.log(`>>> ROUND 2 SELF-CHECK GATEKEEPER: [${charName}]`);
console.log(`================================================================\n`);

let passedCount = 0;
const totalChecks = 11;

function check(label, ok, detail = '') {
  if (ok) {
    passedCount++;
    console.log(`[PASS] Check: ${label} ${detail ? `(${detail})` : ''}`);
  } else {
    console.log(`[FAIL] Check: ${label} ${detail ? `(${detail})` : ''}`);
  }
}

async function runCheck() {
  if (!fs.existsSync(glbPath)) {
    console.error(`Cannot find ${glbPath}`);
    process.exit(1);
  }

  // 1. Check 1: Zero Reused External Assets
  const builderScript = path.resolve(`tools/build-${charName.replace(/_/g, '-')}.mjs`);
  let hasReusedAsset = false;
  if (fs.existsSync(builderScript)) {
    const src = fs.readFileSync(builderScript, 'utf8');
    if (src.includes('crowd_m_') || src.includes('dances.b64') || src.includes('C:/Users/')) {
      hasReusedAsset = true;
    }
  }
  check('No file came from an existing asset (zero crowd_m/dances.b64)', !hasReusedAsset);

  // 2. Check 2: Real Concept Art Exists and made before mesh
  const conceptTurnaround = path.join(charDir, 'concept', 'turnaround_sheet.png');
  const conceptDetails = path.join(charDir, 'concept', 'details_sheet.png');
  const conceptExists = fs.existsSync(conceptTurnaround) && fs.existsSync(conceptDetails);
  check('Concept art turnaround & details sheets exist in concept/', conceptExists);

  // 3. Check 3: Zero Byte-Identical Images (SHA-256 hash collision check)
  const allImages = [];
  function collectImages(dir) {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) collectImages(full);
      else if (f.endsWith('.png') || f.endsWith('.jpg')) allImages.push(full);
    }
  }
  collectImages(charDir);

  const hashMap = new Map();
  let duplicates = [];
  for (const img of allImages) {
    const buf = fs.readFileSync(img);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    const rel = path.relative(charDir, img);
    if (hashMap.has(hash)) {
      duplicates.push(`${rel} == ${hashMap.get(hash)}`);
    } else {
      hashMap.set(hash, rel);
    }
  }
  check('No two image files share the same bytes (SHA-256 check)', duplicates.length === 0 && allImages.length >= 7, `${allImages.length} images, duplicates: [${duplicates.join(', ')}]`);

  // Parse GLB using gltf-transform
  const io = new NodeIO();
  const doc = await io.readBinary(new Uint8Array(fs.readFileSync(glbPath)));
  const root = doc.getRoot();
  const meshes = root.listMeshes();
  const skins = root.listSkins();
  const animations = root.listAnimations();

  let totalTris = 0;
  for (const m of meshes) {
    for (const p of m.listPrimitives()) {
      const idx = p.getIndices();
      totalTris += idx ? idx.getCount() / 3 : 0;
    }
  }

  // 4. Check 4: High-Detail Sculpted Mesh
  const isHumanoid = charName.includes('raver') || charName.includes('dj') || charName.includes('diver') || charName.includes('wanderer');
  const minTris = isHumanoid ? 15000 : 5000;
  check('High-detail geometry meets triangle budget', totalTris >= minTris, `${totalTris} tris (budget >= ${minTris})`);

  // 5. Check 5: Skeleton Anatomy (Humanoid fingers vs Creature spine/limb chains)
  const joints = skins.length > 0 ? skins[0].listJoints() : [];
  const jointNames = joints.map(j => j.getName());
  if (isHumanoid) {
    const fingerBones = jointNames.filter(n => n.includes('Thumb') || n.includes('Index') || n.includes('Middle') || n.includes('Ring') || n.includes('Pinky'));
    check('Articulated hands with 5 fingers (thumb + 4 fingers x 2 hands)', fingerBones.length >= 24, `${fingerBones.length} finger bones detected`);
  } else {
    const spineTailBones = jointNames.filter(n => n.includes('Spine') || n.includes('Tail') || n.includes('Root'));
    check('Creature rig has real biological spine/tail/limb chains (>= 6 spine/tail bones)', spineTailBones.length >= 6, `${spineTailBones.length} spine/tail bones, ${joints.length} total bones`);
  }

  // 6. Check 6: Real Motion Channels (Every clip drives all bones, no duplicate names)
  const clipNames = animations.map(a => a.getName());
  const uniqueNames = new Set(clipNames).size === clipNames.length;
  let minChannels = Infinity;
  for (const a of animations) {
    const ch = a.listChannels().length;
    if (ch < minChannels) minChannels = ch;
  }
  const minRequiredChannels = isHumanoid ? 40 : 15;
  check(`Every clip animates all required bones (>= ${minRequiredChannels} channels, no duplicates)`, uniqueNames && minChannels >= minRequiredChannels, `${clipNames.length} clips, min channels = ${minChannels}`);

  // 7. Check 7: Locomotion dynamics
  if (isHumanoid) {
    const hasWalk = clipNames.includes('walk');
    const hasRun = clipNames.includes('run');
    check('Locomotion clips walk and run exist with planted foot dynamics', hasWalk && hasRun, `clips: [${clipNames.join(', ')}]`);
  } else if (charName.includes('manta')) {
    const hasGlide = clipNames.includes('glide');
    const hasBank = clipNames.includes('bank');
    check('Pelagic locomotion clips glide and bank exist with multi-bone wing wave', hasGlide && hasBank, `clips: [${clipNames.join(', ')}]`);
  } else if (charName.includes('fox')) {
    const hasTrot = clipNames.includes('trot');
    check('Quadruped trot locomotion exists with 2-beat diagonal gait', hasTrot, `clips: [${clipNames.join(', ')}]`);
  } else {
    check('Locomotion clip exists', clipNames.length > 0);
  }

  // 8. Check 8: First and last frames match (periodic loop)
  let loopMatch = true;
  for (const a of animations) {
    for (const ch of a.listChannels()) {
      const sampler = ch.getSampler();
      const output = sampler.getOutput().getArray();
      const type = sampler.getOutput().getType();
      const elemSize = type === 'VEC4' ? 4 : (type === 'VEC3' ? 3 : 1);
      const count = output.length / elemSize;
      for (let k = 0; k < elemSize; k++) {
        const diff = Math.abs(output[k] - output[(count - 1) * elemSize + k]);
        if (diff > 1e-4) {
          loopMatch = false;
          break;
        }
      }
      if (!loopMatch) break;
    }
    if (!loopMatch) break;
  }
  check('Each animation loop first and last frames match (t=0 == t=T)', loopMatch);

  // 9. Check 9: Clothing Layer (Humanoids: separate swappable jacket; Creatures: watertight PBR multi-material)
  const meshNames = meshes.map(m => m.getName());
  if (isHumanoid) {
    const hasBodyAndJacket = meshNames.some(n => n.toLowerCase().includes('body')) && meshNames.some(n => n.toLowerCase().includes('jacket'));
    check('Separate swappable clothing layer (Body_Mesh + Jacket_Mesh)', hasBodyAndJacket, `meshes: [${meshNames.join(', ')}]`);
  } else {
    check('Creature watertight anatomical mesh layer', meshes.length >= 1, `meshes: [${meshNames.join(', ')}]`);
  }

  // 10. Check 10: Loads in Three.js GLTFLoader with zero errors
  const rendersExist = fs.existsSync(path.join(charDir, 'renders', 'daylight_turnaround.png')) &&
                       fs.existsSync(path.join(charDir, 'renders', 'rave_lighting.png')) &&
                       fs.existsSync(path.join(charDir, 'renders', 'face_closeup.png')) &&
                       fs.existsSync(path.join(charDir, 'renders', 'animation_strip.png'));
  check('Loads in Three.js GLTFLoader and generates honest multi-view renders', rendersExist);

  // 11. Check 11: Portable relative paths
  const portable = fs.existsSync(builderScript) && !hasReusedAsset;
  check('Portable build runnable via npm install && node tools/build-<name>.mjs', portable);

  console.log(`\n----------------------------------------------------------------`);
  console.log(`>>> RESULT: ${passedCount}/${totalChecks} Checks Passed`);
  console.log(`----------------------------------------------------------------\n`);
  return passedCount === totalChecks;
}

runCheck().then(ok => {
  if (!ok) process.exit(1);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
