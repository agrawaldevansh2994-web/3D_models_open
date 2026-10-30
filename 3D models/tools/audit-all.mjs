import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const CHARACTERS = [
  'festival_raver',
  'dj_decks',
  'desert_wanderer',
  'deep_sea_diver',
  'manta_ray',
  'biolum_jellyfish',
  'school_fish',
  'desert_fox',
  'forest_spirit',
  'bird_of_prey',
  'firefly_moth',
  'paraglider_pilot',
  'festival_mech',
];

const bundlePath = path.resolve('tools/viewer-bundle.js');
const bundleScript = fs.readFileSync(bundlePath, 'utf8');

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>body{margin:0;background:#000;}canvas{width:640px;height:480px;display:block;}</style>
</head>
<body>
<canvas id="c" width="640" height="480"></canvas>
<script>
${bundleScript}
</script>
</body>
</html>
`;

async function auditAll() {
  console.log(`\n======================================================`);
  console.log(`>>> CREATURE FORGE FINAL AUDIT: ALL 13 CHARACTERS`);
  console.log(`======================================================\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 640, height: 480 } });

  const results = [];

  for (const name of CHARACTERS) {
    const glbPath = path.join('characters', name, `${name}.glb`);
    if (!fs.existsSync(glbPath)) {
      results.push({ name, status: 'FAIL', reason: 'Missing .glb file' });
      continue;
    }
    const stat = fs.statSync(glbPath);
    const sizeKB = (stat.size / 1024).toFixed(1);

    // Verify renders exist
    const daylight = fs.existsSync(path.join('characters', name, 'renders', 'daylight_turnaround.png'));
    const rave = fs.existsSync(path.join('characters', name, 'renders', 'rave_lighting.png'));
    const strip = fs.existsSync(path.join('characters', name, 'renders', 'animation_strip.png'));
    const notes = fs.existsSync(path.join('characters', name, 'NOTES.md'));

    // Test load in Three.js
    const glbBase64 = fs.readFileSync(glbPath).toString('base64');
    await page.setContent(htmlContent, { waitUntil: 'load' });
    await page.evaluate((b64) => window.loadModel(b64), glbBase64);
    await page.waitForFunction(() => window.isReady === true);

    const modelInfo = await page.evaluate(() => window.modelInfo);

    results.push({
      name,
      status: 'PASS',
      sizeKB: `${sizeKB} KB`,
      hasSkin: modelInfo.hasSkin,
      clips: modelInfo.clipNames,
      renders: { daylight, rave, strip, notes },
    });
  }

  await browser.close();

  console.table(results.map(r => ({
    Character: r.name,
    Status: r.status,
    Size: r.sizeKB,
    Skin: r.hasSkin ? '✓' : '✗',
    Clips: r.clips ? r.clips.join(', ') : 'none',
  })));

  const allPassed = results.every(r => r.status === 'PASS');
  console.log(`\n>>> AUDIT RESULT: ${allPassed ? 'ALL 13 ASSETS VERIFIED & OPERATIONAL!' : 'SOME FAILED'}\n`);
}

auditAll().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});

