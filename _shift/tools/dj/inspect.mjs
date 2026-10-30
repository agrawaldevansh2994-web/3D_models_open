import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const glbPath = path.resolve(__dirname, '../../../3D models/characters/dj_decks/dj_decks.glb');
const glbBase64 = fs.readFileSync(glbPath).toString('base64');

async function inspect() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Create an HTML page with three.js
  const html = `
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

    window.inspectModel = (b64) => {
      return new Promise((resolve, reject) => {
        try {
          const raw = atob(b64);
          const uint8 = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) uint8[i] = raw.charCodeAt(i);
          const loader = new GLTFLoader();
          loader.parse(uint8.buffer, '', (gltf) => {
            const mixer = new THREE.AnimationMixer(gltf.scene);
            const clip = gltf.animations.find(c => c.name === 'mixer_hands');
            const act = mixer.clipAction(clip);
            act.play();
            
            // Sample at t = 0, 1, 2, 3
            const samples = [];
            for (const t of [0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0]) {
              mixer.setTime(t);
              gltf.scene.updateMatrixWorld(true);
              const head = gltf.scene.getObjectByName('Head');
              const handL = gltf.scene.getObjectByName('WristL');
              const handR = gltf.scene.getObjectByName('WristR');
              const hPos = new THREE.Vector3(); head.getWorldPosition(hPos);
              const lPos = new THREE.Vector3(); handL.getWorldPosition(lPos);
              const rPos = new THREE.Vector3(); handR.getWorldPosition(rPos);
              samples.push({
                t,
                head: [Number(hPos.x.toFixed(2)), Number(hPos.y.toFixed(2)), Number(hPos.z.toFixed(2))],
                handL: [Number(lPos.x.toFixed(2)), Number(lPos.y.toFixed(2)), Number(lPos.z.toFixed(2))],
                handR: [Number(rPos.x.toFixed(2)), Number(rPos.y.toFixed(2)), Number(rPos.z.toFixed(2))]
              });
            }
            resolve({ samples });
          }, (err) => reject(String(err)));
        } catch (e) {
          reject(String(e));
        }
      });
    };
    window.ready = true;
  </script>
</body>
</html>
`;

  // Start a simple server or use file scheme if possible. But importmap needs http
  // Let's use a tiny http server to serve node_modules
  const http = await import('http');
  const server = http.createServer((req, res) => {
    let filePath = path.resolve(__dirname, '../../', req.url.replace(/^\//, ''));
    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
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

  const info = await page.evaluate((b64) => window.inspectModel(b64), glbBase64);
  console.log(JSON.stringify(info, null, 2));

  await browser.close();
  server.close();
}

inspect().catch(console.error);

