import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const bundlePath = path.resolve('tools/viewer-bundle.js');
const bundleScript = fs.readFileSync(bundlePath, 'utf8');
const glbBase64 = fs.readFileSync('characters/festival_mech/festival_mech.glb').toString('base64');

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>body{margin:0;background:#000;}canvas{width:1280px;height:960px;display:block;}</style>
</head>
<body>
<canvas id="c" width="1280" height="960"></canvas>
<script>
${bundleScript}
</script>
</body>
</html>
`;

async function render() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 960 } });
  await page.setContent(htmlContent, { waitUntil: 'load' });
  await page.evaluate((b64) => window.loadModel(b64), glbBase64);
  await page.waitForFunction(() => window.isReady === true);

  fs.mkdirSync('characters/festival_mech/renders', { recursive: true });
  fs.mkdirSync('characters/festival_mech/concept', { recursive: true });

  console.log('Rendering daylight festival mech...');
  await page.evaluate(() => {
    window.setLighting('daylight');
    window.setCamera(35, 6.5, 2.8, 2.0);
  });
  await page.screenshot({ path: 'characters/festival_mech/renders/daylight_turnaround.png' });
  await page.screenshot({ path: 'characters/festival_mech/concept/turnaround_sheet.png' });

  console.log('Rendering dark rave glowing geodesic dome & subwoofers...');
  await page.evaluate(() => {
    window.setLighting('rave');
    window.setCamera(45, 6.2, 2.6, 2.0);
  });
  await page.screenshot({ path: 'characters/festival_mech/renders/rave_lighting.png' });

  console.log('Rendering rave_mode action strip...');
  await page.evaluate(() => {
    window.playClip('rave_mode', 0.35);
    window.setCamera(25, 6.3, 2.6, 2.0);
  });
  await page.screenshot({ path: 'characters/festival_mech/renders/animation_strip.png' });

  await browser.close();
  console.log('Done rendering festival_mech!');
}

render().catch(err => {
  console.error('Render festival mech failed:', err);
  process.exit(1);
});

