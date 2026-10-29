import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const bundlePath = path.resolve('tools/viewer-bundle.js');
const bundleScript = fs.readFileSync(bundlePath, 'utf8');
const glbBase64 = fs.readFileSync('characters/paraglider_pilot/paraglider_pilot.glb').toString('base64');

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

  fs.mkdirSync('characters/paraglider_pilot/renders', { recursive: true });
  fs.mkdirSync('characters/paraglider_pilot/concept', { recursive: true });

  console.log('Rendering daylight paraglider...');
  await page.evaluate(() => {
    window.setLighting('daylight');
    window.setCamera(35, 6.2, 2.5, 2.2);
  });
  await page.screenshot({ path: 'characters/paraglider_pilot/renders/daylight_turnaround.png' });
  await page.screenshot({ path: 'characters/paraglider_pilot/concept/turnaround_sheet.png' });

  console.log('Rendering dark rave glowing canopy LED...');
  await page.evaluate(() => {
    window.setLighting('rave');
    window.setCamera(45, 5.8, 2.4, 2.2);
  });
  await page.screenshot({ path: 'characters/paraglider_pilot/renders/rave_lighting.png' });

  console.log('Rendering bank_turn action strip...');
  await page.evaluate(() => {
    window.playClip('bank_turn', 0.25);
    window.setCamera(25, 5.9, 2.4, 2.2);
  });
  await page.screenshot({ path: 'characters/paraglider_pilot/renders/animation_strip.png' });

  await browser.close();
  console.log('Done rendering paraglider_pilot!');
}

render().catch(err => {
  console.error('Render paraglider failed:', err);
  process.exit(1);
});

