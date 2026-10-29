import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

/**
 * Round 2 Headless Playwright Three.js Inspector & Multi-Viewport Renderer
 * Note: Does NOT touch `concept/` (concept art must be generated BEFORE mesh build via image-generator).
 * Renders from the final `.glb`:
 * - `renders/daylight_turnaround.png`: 3-angle turntable (0°, 90°, 180°) in studio daylight
 * - `renders/rave_lighting.png`: 3-angle turntable (0°, 90°, 180°) in dark neon rave lighting
 * - `renders/face_closeup.png`: High-res close-up of sculpted face (eyes, nose, mouth, visor) & 5-finger hand
 * - `renders/animation_strip.png`: 6-frame contact sheet of primary action clip
 * - `renders/strip_<clip>.png`: 6-frame contact sheet for EVERY animation clip in the `.glb`
 */

const charName = process.argv[2] || 'festival_raver';
const charDir = path.resolve(`characters/${charName}`);
const glbPath = path.join(charDir, `${charName}.glb`);
const rendersDir = path.join(charDir, 'renders');

fs.mkdirSync(rendersDir, { recursive: true });

if (!fs.existsSync(glbPath)) {
  console.error(`Cannot find ${glbPath}`);
  process.exit(1);
}

const glbBase64 = fs.readFileSync(glbPath).toString('base64');
const bundlePath = path.resolve('tools/viewer-bundle.js');
const bundleScript = fs.readFileSync(bundlePath, 'utf8');

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; background: #000; overflow: hidden; }
    canvas { width: 1280px; height: 960px; display: block; }
  </style>
</head>
<body>
<canvas id="c" width="1280" height="960"></canvas>
<script>
${bundleScript}
</script>
</body>
</html>
`;

async function runVerification() {
  console.log(`>>> Launching Headless Chromium via Playwright for ${charName}...`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 960 } });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
    else console.log('BROWSER:', msg.text());
  });
  page.on('pageerror', err => {
    errors.push(err.message);
    console.error('PAGE ERROR:', err.message);
  });

  await page.setContent(htmlContent, { waitUntil: 'load' });
  await page.evaluate((b64) => window.loadModel(b64), glbBase64);
  await page.waitForFunction(() => window.isReady === true, { timeout: 15000 });

  const info = await page.evaluate(() => window.modelInfo);
  console.log(`>>> Loaded ${charName}.glb | Tris: ${info.triangles} | Meshes: [${info.meshNames.join(', ')}]`);
  console.log(`>>> Clips (${info.clipNames.length}): ${info.clipChannels.map(c => `${c.name}(${c.tracks}ch)`).join(', ')}`);

  const isManta = charName.includes('manta');
  const isFox = charName.includes('fox');
  const dist = isManta ? 4.4 : (isFox ? 1.35 : 2.55);
  const camY = isManta ? 2.4 : (isFox ? 0.52 : 1.02);
  const targetY = isManta ? 1.0 : (isFox ? 0.38 : 0.90);

  // 1. 3-Angle Daylight Turntable
  console.log('>>> Rendering 3-angle daylight_turnaround.png...');
  await page.evaluate(({ d, cy, ty }) => window.renderTurntable('daylight', d, cy, ty), { d: dist, cy: camY, ty: targetY });
  await page.screenshot({ path: path.join(rendersDir, 'daylight_turnaround.png') });

  // 2. 3-Angle Dark Rave Lighting Turntable
  console.log('>>> Rendering 3-angle rave_lighting.png...');
  await page.evaluate(({ d, cy, ty }) => window.renderTurntable('rave', d, cy, ty), { d: dist, cy: camY, ty: targetY });
  await page.screenshot({ path: path.join(rendersDir, 'rave_lighting.png') });

  // 3. Face & Detail Close-Up
  console.log('>>> Rendering face_closeup.png...');
  if (isManta) {
    await page.evaluate(() => window.renderFaceCloseup('daylight', 1.05, [0.8, 1.0, 0.0]));
  } else if (isFox) {
    await page.evaluate(() => window.renderFaceCloseup('daylight', 0.52, [0.08, 0.38, 0.16]));
  } else {
    await page.evaluate(() => window.renderFaceCloseup('daylight', 1.62, [0.60, 1.02, 0.02]));
  }
  await page.screenshot({ path: path.join(rendersDir, 'face_closeup.png') });

  // 4. 6-Frame Strip for Every Clip
  for (const clipName of info.clipNames) {
    console.log(`>>> Rendering 6-frame strip_${clipName}.png...`);
    const mode = (clipName.startsWith('dance') || clipName.includes('rave') || clipName.includes('roll')) ? 'rave' : 'daylight';
    await page.evaluate(({ c, m, d, cy, ty }) => window.renderClipStrip(c, m, d, cy, ty), { c: clipName, m: mode, d: dist, cy: camY, ty: targetY });
    await page.screenshot({ path: path.join(rendersDir, `strip_${clipName}.png`) });
  }

  // Primary animation_strip.png (6-frame sheet rendered from dynamic 35-degree 3/4 action perspective)
  const primaryClip = info.clipNames.includes('glide') ? 'glide' : (info.clipNames.includes('trot') ? 'trot' : (info.clipNames.includes('walk') ? 'walk' : info.clipNames[0]));
  await page.evaluate(({ c, d, cy, ty }) => window.renderClipStrip(c, 'daylight', d * 0.92, cy * 1.18, ty, 35), { c: primaryClip, d: dist, cy: camY, ty: targetY });
  await page.screenshot({ path: path.join(rendersDir, 'animation_strip.png') });

  await browser.close();

  if (errors.length > 0) {
    console.error('WebGL / GLTF Errors detected:', errors);
    process.exit(1);
  }
  console.log(`>>> All renders completed cleanly for ${charName}!`);
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
