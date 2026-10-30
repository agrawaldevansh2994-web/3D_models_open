import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const bundlePath = path.resolve('tools/viewer-bundle.js');
const bundleScript = fs.readFileSync(bundlePath, 'utf8');
const glbBase64 = fs.readFileSync('characters/bird_of_prey/bird_of_prey.glb').toString('base64');

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

  fs.mkdirSync('characters/bird_of_prey/renders', { recursive: true });
  fs.mkdirSync('characters/bird_of_prey/concept', { recursive: true });

  console.log('Rendering daylight bird of prey...');
  await page.evaluate(() => {
    window.setLighting('daylight');
    window.setCamera(35, 3.4, 1.25, 1.00);
  });
  await page.screenshot({ path: 'characters/bird_of_prey/renders/daylight_turnaround.png' });
  await page.screenshot({ path: 'characters/bird_of_prey/concept/turnaround_sheet.png' });

  console.log('Rendering dark rave glowing solar feathers...');
  await page.evaluate(() => {
    window.setLighting('rave');
    window.setCamera(45, 3.2, 1.20, 1.00);
  });
  await page.screenshot({ path: 'characters/bird_of_prey/renders/rave_lighting.png' });

  console.log('Rendering flap action strip...');
  await page.evaluate(() => {
    window.playClip('flap', 0.25);
    window.setCamera(25, 3.3, 1.20, 1.00);
  });
  await page.screenshot({ path: 'characters/bird_of_prey/renders/animation_strip.png' });

  await browser.close();
  console.log('Done rendering bird_of_prey!');
}

render().catch(err => {
  console.error('Render bird of prey failed:', err);
  process.exit(1);
});

