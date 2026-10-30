import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const glbPath = path.resolve(__dirname, '../../../3D models/characters/dj_decks/dj_decks.glb');
const glbBase64 = fs.readFileSync(glbPath).toString('base64');

async function testRender() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; background: #000; overflow: hidden; }
    canvas { width: 1920px; height: 1080px; display: block; }
  </style>
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

    window.THREE = THREE;
    const canvas = document.getElementById('c');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(1920, 1080);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.90;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080a10);

    const camera = new THREE.PerspectiveCamera(35, 1920 / 1080, 0.1, 50);
    camera.position.set(0, 1.70, 3.20);
    camera.lookAt(0, 1.25, 0.20);

    // Warm natural key light
    const keyLight = new THREE.DirectionalLight(0xffeedd, 2.4);
    keyLight.position.set(0.7, 2.8, 2.5);
    scene.add(keyLight);

    // Soft cool fill
    const fillLight = new THREE.DirectionalLight(0x7088a8, 1.0);
    fillLight.position.set(-1.6, 2.0, 2.0);
    scene.add(fillLight);

    // Subtle ambient
    const amb = new THREE.AmbientLight(0x303545, 1.2);
    scene.add(amb);

    // Rim lights
    const rimL = new THREE.DirectionalLight(0x992255, 0.9);
    rimL.position.set(-2.0, 2.2, -1.0);
    scene.add(rimL);

    const rimR = new THREE.DirectionalLight(0x187099, 0.9);
    rimR.position.set(2.0, 2.2, -1.0);
    scene.add(rimR);

    // DJ table
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x161822, roughness: 0.35, metalness: 0.7 });
    const table = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.05, 0.65), tableMat);
    table.position.set(0, 0.92, 0.38);
    scene.add(table);

    const standMat = new THREE.MeshStandardMaterial({ color: 0x0c0e14, roughness: 0.7, metalness: 0.3 });
    const stand = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.92, 0.55), standMat);
    stand.position.set(0, 0.45, 0.38);
    scene.add(stand);

    // CDJs & Mixer
    const cdjMat = new THREE.MeshStandardMaterial({ color: 0x181a24, roughness: 0.4, metalness: 0.8 });
    const platterMat = new THREE.MeshStandardMaterial({ color: 0x252a36, roughness: 0.25, metalness: 0.9 });
    for (const x of [-0.46, 0.46]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.44), cdjMat);
      b.position.set(x, 0.97, 0.38);
      scene.add(b);
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.015, 32), platterMat);
      p.position.set(x, 1.00, 0.42);
      scene.add(p);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.20, 0.11), new THREE.MeshBasicMaterial({ color: 0x00d4ff }));
      scr.rotation.x = -Math.PI / 4;
      scr.position.set(x, 1.03, 0.26);
      scene.add(scr);
    }
    const mixer = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.055, 0.44), cdjMat);
    mixer.position.set(0, 0.97, 0.38);
    scene.add(mixer);

    // Loader
    window.renderModel = (b64) => {
      return new Promise((resolve) => {
        const raw = atob(b64);
        const uint8 = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) uint8[i] = raw.charCodeAt(i);
        new GLTFLoader().parse(uint8.buffer, '', (gltf) => {
          const mesh = gltf.scene.getObjectByName('Body_Casual_2');
          mesh.geometry.computeVertexNormals();

          const uv = mesh.geometry.attributes.uv;
          const count = uv.count;
          const colors = new Float32Array(count * 3);

          // Palettes:
          // Natural warm healthy skin tone:
          const skinColor   = new THREE.Color(0xdf9f7d);
          // Dark stylish hair:
          const hairColor   = new THREE.Color(0x1e1916);
          // Sleek dark sunglasses:
          const shadesColor = new THREE.Color(0x141418);
          // Deep navy/charcoal festival tee:
          const shirtColor  = new THREE.Color(0x222a38);
          // Pants:
          const pantsColor  = new THREE.Color(0x181a20);
          // Shoes / trim:
          const shoeColor   = new THREE.Color(0xdce0e8);

          for (let i = 0; i < count; i++) {
            const u = uv.getX(i);
            const idx = Math.floor(u * 16);
            let c = skinColor;
            if (idx === 0) {
              c = skinColor;
            } else if (idx === 1) {
              c = hairColor;
            } else if (idx === 2) {
              c = shadesColor;
            } else if (idx === 3) {
              c = shirtColor;
            } else if (idx === 6) {
              c = pantsColor;
            } else if (idx === 4 || idx === 5 || idx === 9) {
              c = shoeColor;
            }
            colors[i * 3]     = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
          }

          mesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
          mesh.material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.55,
            metalness: 0.05,
            flatShading: false
          });

          scene.add(gltf.scene);

          // Play mixer_hands animation
          const animMixer = new THREE.AnimationMixer(gltf.scene);
          const clip = gltf.animations.find(c => c.name === 'mixer_hands');
          const act = animMixer.clipAction(clip);
          act.play();
          act.time = 2.0; // mid set cueing
          animMixer.update(0);

          renderer.render(scene, camera);
          resolve(canvas.toDataURL('image/png').slice(22));
        });
      });
    };
    window.ready = true;
  </script>
</body>
</html>
`;

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
      res.end();
    }
  });

  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => window.ready === true);

  const b64 = await page.evaluate((b) => window.renderModel(b), glbBase64);
  const outPath = path.resolve(__dirname, '../../_scratch/uv_test.png');
  fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
  console.log('Saved test image to:', outPath);

  await browser.close();
  server.close();
}

testRender().catch(console.error);

