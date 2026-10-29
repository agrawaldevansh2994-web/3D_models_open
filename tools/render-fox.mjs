import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const bundlePath = path.resolve('tools/viewer-bundle.js');
const bundleScript = fs.readFileSync(bundlePath, 'utf8');
const glbBase64 = fs.readFileSync('characters/desert_fox/desert_fox.glb').toString('base64');

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

  console.log('Rendering daylight desert fox...');
  await page.evaluate(() => {
    window.setLighting('daylight');
    window.setCamera(35, 1.35, 0.55, 0.40);
  });
  await page.screenshot({ path: 'characters/desert_fox/renders/daylight_turnaround.png' });

  console.log('Rendering dark rave glowing runes...');
  await page.evaluate(() => {
    window.setLighting('rave');
    window.setCamera(45, 1.25, 0.52, 0.40);
  });
  await page.screenshot({ path: 'characters/desert_fox/renders/rave_lighting.png' });

  console.log('Rendering trot action strip...');
  await page.evaluate(() => {
    window.playClip('trot', 0.25);
    window.setCamera(65, 1.35, 0.50, 0.40);
  });
  await page.screenshot({ path: 'characters/desert_fox/renders/animation_strip.png' });

  await browser.close();
  console.log('Done!');
}

render().catch(console.error);

