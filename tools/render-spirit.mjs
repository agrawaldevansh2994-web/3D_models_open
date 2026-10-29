import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const bundlePath = path.resolve('tools/viewer-bundle.js');
const bundleScript = fs.readFileSync(bundlePath, 'utf8');
const glbBase64 = fs.readFileSync('characters/forest_spirit/forest_spirit.glb').toString('base64');

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

  fs.mkdirSync('characters/forest_spirit/renders', { recursive: true });
  fs.mkdirSync('characters/forest_spirit/concept', { recursive: true });

  console.log('Rendering daylight forest spirit...');
  await page.evaluate(() => {
    window.setLighting('daylight');
    window.setCamera(35, 2.2, 0.85, 0.65);
  });
  await page.screenshot({ path: 'characters/forest_spirit/renders/daylight_turnaround.png' });
  await page.screenshot({ path: 'characters/forest_spirit/concept/turnaround_sheet.png' });

  console.log('Rendering dark rave glowing gills...');
  await page.evaluate(() => {
    window.setLighting('rave');
    window.setCamera(45, 2.0, 0.80, 0.65);
  });
  await page.screenshot({ path: 'characters/forest_spirit/renders/rave_lighting.png' });

  console.log('Rendering dance_1 action strip...');
  await page.evaluate(() => {
    window.playClip('dance_1', 0.45);
    window.setCamera(25, 2.1, 0.85, 0.65);
  });
  await page.screenshot({ path: 'characters/forest_spirit/renders/animation_strip.png' });

  await browser.close();
  console.log('Done rendering forest_spirit!');
}

render().catch(err => {
  console.error('Render spirit failed:', err);
  process.exit(1);
});

