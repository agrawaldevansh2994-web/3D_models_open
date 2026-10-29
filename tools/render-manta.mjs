import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const bundlePath = path.resolve('tools/viewer-bundle.js');
const bundleScript = fs.readFileSync(bundlePath, 'utf8');
const glbBase64 = fs.readFileSync('characters/manta_ray/manta_ray.glb').toString('base64');

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

  console.log('Rendering daylight front-top view...');
  await page.evaluate(() => {
    window.setLighting('daylight');
    window.setCamera(180, 4.4, 3.2, 1.0);
  });
  await page.screenshot({ path: 'characters/manta_ray/renders/daylight_turnaround.png' });

  console.log('Rendering dark rave glowing bioluminescence...');
  await page.evaluate(() => {
    window.setLighting('rave');
    window.setCamera(180, 4.0, 2.8, 1.0);
  });
  await page.screenshot({ path: 'characters/manta_ray/renders/rave_lighting.png' });

  console.log('Rendering action glide strip...');
  await page.evaluate(() => {
    window.playClip('glide', 0.25);
    window.setCamera(165, 4.2, 2.6, 1.0);
  });
  await page.screenshot({ path: 'characters/manta_ray/renders/animation_strip.png' });

  await browser.close();
  console.log('Done!');
}

render().catch(console.error);
