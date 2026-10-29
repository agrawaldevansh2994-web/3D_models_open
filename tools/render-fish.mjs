import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const bundlePath = path.resolve('tools/viewer-bundle.js');
const bundleScript = fs.readFileSync(bundlePath, 'utf8');
const glbBase64 = fs.readFileSync('characters/school_fish/school_fish.glb').toString('base64');

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

  console.log('Rendering close-up daylight fish...');
  await page.evaluate(() => {
    window.setLighting('daylight');
    window.setCamera(45, 0.65, 1.05, 1.0); // Close-up camera dist 0.65m
  });
  await page.screenshot({ path: 'characters/school_fish/renders/daylight_turnaround.png' });

  console.log('Rendering close-up rave fish...');
  await page.evaluate(() => {
    window.setLighting('rave');
    window.setCamera(50, 0.60, 1.04, 1.0);
  });
  await page.screenshot({ path: 'characters/school_fish/renders/rave_lighting.png' });

  console.log('Rendering swim action strip...');
  await page.evaluate(() => {
    window.playClip('swim', 0.25);
    window.setCamera(35, 0.65, 1.05, 1.0);
  });
  await page.screenshot({ path: 'characters/school_fish/renders/animation_strip.png' });

  await browser.close();
  console.log('Done!');
}

render().catch(console.error);

