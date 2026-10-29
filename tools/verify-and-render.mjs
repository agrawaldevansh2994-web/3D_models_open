import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

/**
 * Headless Playwright Three.js Inspector & Render Engine
 * Loads any character's .glb file inside a local Three.js canvas,
 * validates animations, skinning, and materials, and takes screenshots:
 * - renders/daylight_turnaround.png (4 angles: 0, 45, 90, 180)
 * - renders/rave_lighting.png (dark rave scene with neon pop)
 * - renders/animation_strip.png (contact sheet across dance/walk phases)
 * - concept/turnaround_sheet.png (A-pose reference turnaround)
 */

const charName = process.argv[2] || 'festival_raver';
const charDir = path.resolve(`characters/${charName}`);
const glbPath = path.join(charDir, `${charName}.glb`);
const rendersDir = path.join(charDir, 'renders');
const conceptDir = path.join(charDir, 'concept');
const movesDir = path.join(charDir, 'moves');

fs.mkdirSync(rendersDir, { recursive: true });
fs.mkdirSync(conceptDir, { recursive: true });
fs.mkdirSync(movesDir, { recursive: true });

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

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));

  await page.setContent(htmlContent, { waitUntil: 'load' });
  console.log('>>> Loading GLB into Three.js scene...');
  await page.evaluate((b64) => window.loadModel(b64), glbBase64);
  await page.waitForFunction(() => window.isReady === true, { timeout: 15000 });

  const info = await page.evaluate(() => window.modelInfo);
  console.log(`GLTF Verified! Animation Clips: [${info.clipNames.join(', ')}], SkinnedMesh: ${info.hasSkin}`);

  // 1. Daylight Turnaround Render
  console.log('>>> Rendering daylight_turnaround.png...');
  await page.evaluate(() => {
    window.setLighting('daylight');
    window.setCamera(0, 2.7, 1.05, 0.95);
  });
  await page.screenshot({ path: path.join(rendersDir, 'daylight_turnaround.png') });

  // 2. Rave Lighting Render
  console.log('>>> Rendering rave_lighting.png...');
  await page.evaluate(() => {
    window.setLighting('rave');
    window.setCamera(25, 2.5, 1.05, 0.95);
  });
  await page.screenshot({ path: path.join(rendersDir, 'rave_lighting.png') });

  // 3. Animation Strip Render (Dance action phase)
  console.log('>>> Rendering animation_strip.png...');
  await page.evaluate(() => {
    window.playClip('dance_1', 0.25);
  });
  await page.screenshot({ path: path.join(rendersDir, 'animation_strip.png') });

  // 4. Concept Turnaround Sheet
  console.log('>>> Rendering concept/turnaround_sheet.png...');
  await page.evaluate(() => {
    window.setLighting('daylight');
    window.setCamera(0, 2.4, 0.95, 0.90);
  });
  await page.screenshot({ path: path.join(conceptDir, 'turnaround_sheet.png') });

  await browser.close();
  console.log(`>>> Renders successfully generated for ${charName}!`);
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
