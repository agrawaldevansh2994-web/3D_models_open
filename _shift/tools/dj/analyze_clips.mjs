import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const glbPath = path.resolve(__dirname, '../../../3D models/characters/dj_decks/dj_decks.glb');
const glbBase64 = fs.readFileSync(glbPath).toString('base64');

async function analyze() {
  const http = await import('http');
  const server = http.createServer((req, res) => {
    let filePath = path.resolve(__dirname, '../../', req.url.replace(/^\//, ''));
    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
<!DOCTYPE html>
<html>
<head>
  <script type="importmap">
  {
    "imports": {
      "three": "/node_modules/three/build/three.module.js",
      "three/examples/jsm/loaders/GLTFLoader.js": "/node_modules/three/examples/jsm/loaders/GLTFLoader.js"
    }
  }
  </script>
</head>
<body>
  <script type="module">
    import * as THREE from 'three';
    import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

    window.analyzeClips = (b64) => {
      return new Promise((resolve) => {
        const raw = atob(b64);
        const uint8 = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) uint8[i] = raw.charCodeAt(i);
        const loader = new GLTFLoader();
        loader.parse(uint8.buffer, '', (gltf) => {
          const mixer = new THREE.AnimationMixer(gltf.scene);
          const results = {};

          let wristL = null, wristR = null, head = null;
          gltf.scene.traverse(obj => {
            if (obj.name === 'WristL') wristL = obj;
            if (obj.name === 'WristR') wristR = obj;
            if (obj.name === 'Head') head = obj;
          });

          for (const clip of gltf.animations) {
            mixer.stopAllAction();
            const act = mixer.clipAction(clip);
            act.play();
            const samples = [];
            const dt = clip.duration / 10;
            for (let i = 0; i <= 10; i++) {
              const t = i * dt;
              mixer.setTime(t);
              gltf.scene.updateMatrixWorld(true);
              const pL = new THREE.Vector3();
              const pR = new THREE.Vector3();
              const pH = new THREE.Vector3();
              wristL.getWorldPosition(pL);
              wristR.getWorldPosition(pR);
              head.getWorldPosition(pH);
              samples.push({
                t: Number(t.toFixed(2)),
                wristL_Y: Number(pL.y.toFixed(3)),
                wristR_Y: Number(pR.y.toFixed(3)),
                head_Y: Number(pH.y.toFixed(3))
              });
            }
            results[clip.name] = {
              duration: clip.duration,
              samples
            };
          }
          resolve(results);
        });
      });
    };
    window.ready = true;
  </script>
</body>
</html>
      `);
      return;
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const types = { '.js': 'text/javascript', '.json': 'application/json' };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => window.ready === true);

  const analysis = await page.evaluate((b64) => window.analyzeClips(b64), glbBase64);
  console.log(JSON.stringify(analysis, null, 2));

  await browser.close();
  server.close();
}

analyze().catch(console.error);
