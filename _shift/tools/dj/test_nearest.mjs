import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const glbPath = path.resolve(__dirname, '../../../3D models/characters/dj_decks/dj_decks.glb');
const glbBase64 = fs.readFileSync(glbPath).toString('base64');

async function testNearest() {
  const http = await import('http');
  const server = http.createServer((req, res) => {
    let filePath = path.resolve(__dirname, '../../', req.url.replace(/^\//, ''));
    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
<!DOCTYPE html>
<html>
<head>
  <style>body { margin: 0; background: #06070c; }</style>
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
  <canvas id="c" width="1920" height="1080"></canvas>
  <script type="module">
    import * as THREE from 'three';
    import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

    const canvas = document.getElementById('c');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(1920, 1080);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.88;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06070c);
    const camera = new THREE.PerspectiveCamera(34, 1920/1080, 0.1, 50);
    camera.position.set(0, 1.68, 3.25);
    camera.lookAt(0, 1.16, 0.30);

    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xfff5ea, 2.0);
    dir.position.set(1.0, 3.2, 2.5);
    scene.add(dir);

    window.load = (b64, useNearest) => {
      const raw = atob(b64);
      const uint8 = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) uint8[i] = raw.charCodeAt(i);
      const loader = new GLTFLoader();
      loader.parse(uint8.buffer, '', (gltf) => {
        gltf.scene.traverse(obj => {
          if (obj.isMesh && obj.material && obj.material.map) {
            if (useNearest) {
              obj.material.map.minFilter = THREE.NearestFilter;
              obj.material.map.magFilter = THREE.NearestFilter;
              obj.material.map.generateMipmaps = false;
              obj.material.map.needsUpdate = true;
            }
          }
        });
        scene.add(gltf.scene);
        renderer.render(scene, camera);
        window.ready = true;
      });
    };
    window.capture = () => canvas.toDataURL('image/png').slice(22);
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

  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('http://127.0.0.1:' + port + '/');
  await page.evaluate((b) => window.load(b, true), glbBase64);
  await page.waitForFunction(() => window.ready === true);
  const b64 = await page.evaluate(() => window.capture());
  fs.writeFileSync(path.resolve(__dirname, '../../_scratch/test_nearest_filter.png'), Buffer.from(b64, 'base64'));
  console.log('Saved _scratch/test_nearest_filter.png');

  await browser.close();
  server.close();
}

testNearest().catch(console.error);

