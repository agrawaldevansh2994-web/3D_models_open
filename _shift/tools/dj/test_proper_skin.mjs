import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const glbPath = path.resolve(__dirname, '../../../3D models/characters/dj_decks/dj_decks.glb');
const glbBase64 = fs.readFileSync(glbPath).toString('base64');

async function testProperSkin() {
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
    const camera = new THREE.PerspectiveCamera(32, 1920/1080, 0.1, 50);
    camera.position.set(0, 1.55, 1.8); // close-up on head and torso!
    camera.lookAt(0, 1.45, 0.05);

    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xfff6ec, 2.2);
    key.position.set(0.6, 2.8, 2.2);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x607590, 0.8);
    fill.position.set(-1.5, 2.0, 1.5);
    scene.add(fill);

    window.load = (b64) => {
      const raw = atob(b64);
      const uint8 = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) uint8[i] = raw.charCodeAt(i);
      const loader = new GLTFLoader();
      loader.parse(uint8.buffer, '', (gltf) => {
        gltf.scene.traverse((obj) => {
          if (obj.isMesh) {
            // Apply high-quality procedural PBR material to Body_Casual_2
            const geom = obj.geometry;
            const pos = geom.attributes.position;
            const count = pos.count;

            // Generate clean vertex colors based on anatomical regions:
            // - Skin: natural warm tone #d99f7d
            // - Hair: dark brown #251c16
            // - Eyes/Visor: glowing amber #ffaa00
            // - Shirt: clean vibrant yellow #f5a800
            // - Pants: dark charcoal #1e2026
            const colors = new Float32Array(count * 3);
            const skinColor = new THREE.Color(0xd89e7c);
            const hairColor = new THREE.Color(0x241d18);
            const eyeColor  = new THREE.Color(0xffaa00);
            const shirtColor = new THREE.Color(0xfaab00);
            const pantsColor = new THREE.Color(0x1a1c22);

            for (let i = 0; i < count; i++) {
              const x = pos.getX(i);
              const y = pos.getY(i);
              const z = pos.getZ(i);

              let c = skinColor;
              if (y < 0.92) {
                c = pantsColor;
              } else if (y >= 0.92 && y < 1.44 && Math.abs(x) < 0.19) {
                c = shirtColor;
              } else if (y >= 1.44) {
                // Head region
                if (y > 1.63 || (y > 1.54 && z < -0.01)) {
                  c = hairColor; // Hair top and back
                } else if (y >= 1.51 && y <= 1.57 && z > 0.08 && Math.abs(x) < 0.12) {
                  c = eyeColor; // Eyes / Visor
                } else {
                  c = skinColor; // Face, jaw, neck
                }
              } else {
                // Arms
                c = skinColor;
              }

              colors[i * 3]     = c.r;
              colors[i * 3 + 1] = c.g;
              colors[i * 3 + 2] = c.b;
            }

            geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            // Replace material with a clean MeshStandardMaterial with vertexColors = true
            obj.material = new THREE.MeshStandardMaterial({
              vertexColors: true,
              roughness: 0.65,
              metalness: 0.10,
              flatShading: false
            });
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
  await page.evaluate((b) => window.load(b), glbBase64);
  await page.waitForFunction(() => window.ready === true);
  const b64 = await page.evaluate(() => window.capture());
  fs.writeFileSync(path.resolve(__dirname, '../../_scratch/test_proper_skin.png'), Buffer.from(b64, 'base64'));
  console.log('Saved _scratch/test_proper_skin.png');

  await browser.close();
  server.close();
}

testProperSkin().catch(console.error);

