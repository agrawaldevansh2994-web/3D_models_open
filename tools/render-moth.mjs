import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const bundlePath = path.resolve('tools/viewer-bundle.js');
const bundleScript = fs.readFileSync(bundlePath, 'utf8');
const glbBase64 = fs.readFileSync('characters/firefly_moth/firefly_moth.glb').toString('base64');

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

  fs.mkdirSync('characters/firefly_moth/renders', { recursive: true });
  fs.mkdirSync('characters/firefly_moth/concept', { recursive: true });

  console.log('Rendering daylight firefly moth...');
  await page.evaluate(() => {
    window.setLighting('daylight');
    window.setCamera(35, 0.70, 0.34, 0.24);
  });
  await page.screenshot({ path: 'characters/firefly_moth/renders/daylight_turnaround.png' });
  await page.screenshot({ path: 'characters/firefly_moth/concept/turnaround_sheet.png' });

  console.log('Rendering dark rave glowing moth wings...');
  await page.evaluate(() => {
    window.setLighting('rave');
    window.setCamera(45, 0.65, 0.32, 0.24);
  });
  await page.screenshot({ path: 'characters/firefly_moth/renders/rave_lighting.png' });

  console.log('Rendering fly action strip...');
  await page.evaluate(() => {
    window.playClip('fly', 0.25);
    window.setCamera(25, 0.65, 0.32, 0.24);
  });
  await page.screenshot({ path: 'characters/firefly_moth/renders/animation_strip.png' });

  await browser.close();
  console.log('Done rendering firefly_moth!');
}

render().catch(err => {
  console.error('Render firefly moth failed:', err);
  process.exit(1);
});

