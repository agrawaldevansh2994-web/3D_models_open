import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const glbPath = path.resolve(__dirname, '../../../3D models/characters/dj_decks/dj_decks.glb');
const glbBase64 = fs.readFileSync(glbPath).toString('base64');

async function checkHands() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
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

    window.sampleBones = (b64, clipName, times) => {
      return new Promise((resolve) => {
        const raw = atob(b64);
        const uint8 = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) uint8[i] = raw.charCodeAt(i);
        const loader = new GLTFLoader();
        loader.parse(uint8.buffer, '', (gltf) => {
          const mixer = new THREE.AnimationMixer(gltf.scene);
          const clip = gltf.animations.find(a => a.name === clipName);
          const action = mixer.clipAction(clip);
          action.play();

          let wristL = null, wristR = null, head = null;
          gltf.scene.traverse(obj => {
            if (obj.name === 'WristL') wristL = obj;
            if (obj.name === 'WristR') wristR = obj;
            if (obj.name === 'Head') head = obj;
          });

          const results = [];
          const posL = new THREE.Vector3();
          const posR = new THREE.Vector3();
          const posH = new THREE.Vector3();

          for (const t of times) {
            mixer.setTime(t);
            gltf.scene.updateMatrixWorld(true);
            wristL.getWorldPosition(posL);
            wristR.getWorldPosition(posR);
            head.getWorldPosition(posH);
            results.push({
              t,
              wristL: [posL.x.toFixed(3), posL.y.toFixed(3), posL.z.toFixed(3)],
              wristR: [posR.x.toFixed(3), posR.y.toFixed(3), posR.z.toFixed(3)],
              head: [posH.x.toFixed(3), posH.y.toFixed(3), posH.z.toFixed(3)]
            });
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
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => window.ready === true);

  console.log('--- mixer_hands ---');
  const mixerSamples = await page.evaluate(
    ({ b64 }) => window.sampleBones(b64, 'mixer_hands', [0, 1.5, 3.0, 4.5, 6.0]),
    { b64: glbBase64 }
  );
  console.log(mixerSamples);

  console.log('--- idle_groove ---');
  const idleSamples = await page.evaluate(
    ({ b64 }) => window.sampleBones(b64, 'idle_groove', [0, 1.5, 3.0, 4.5, 6.0]),
    { b64: glbBase64 }
  );
  console.log(idleSamples);

  console.log('--- fist_raise_drop ---');
  const fistSamples = await page.evaluate(
    ({ b64 }) => window.sampleBones(b64, 'fist_raise_drop', [0, 1.5, 3.0, 4.5, 6.0]),
    { b64: glbBase64 }
  );
  console.log(fistSamples);

  await browser.close();
  server.close();
}

checkHands().catch(console.error);

