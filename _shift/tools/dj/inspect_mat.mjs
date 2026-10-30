import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const glbPath = path.resolve(__dirname, '../../../3D models/characters/dj_decks/dj_decks.glb');
const glbBase64 = fs.readFileSync(glbPath).toString('base64');

async function inspectMat() {
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

    window.inspect = (b64) => {
      return new Promise((resolve) => {
        const raw = atob(b64);
        const uint8 = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) uint8[i] = raw.charCodeAt(i);
        const loader = new GLTFLoader();
        loader.parse(uint8.buffer, '', (gltf) => {
          const details = [];
          gltf.scene.traverse((obj) => {
            if (obj.isMesh) {
              const m = obj.material;
              const canvas = document.createElement('canvas');
              let texDataUrl = null;
              if (m.map && m.map.image) {
                canvas.width = m.map.image.width;
                canvas.height = m.map.image.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(m.map.image, 0, 0);
                texDataUrl = canvas.toDataURL();
              }
              details.push({
                meshName: obj.name,
                hasVertexColors: !!obj.geometry.attributes.color,
                materialName: m.name,
                hasMap: !!m.map,
                mapSize: m.map && m.map.image ? [m.map.image.width, m.map.image.height] : null,
                color: m.color ? m.color.getHexString() : null,
                roughness: m.roughness,
                metalness: m.metalness,
                texDataUrl
              });
            }
          });
          resolve(details);
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

  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:' + port + '/');
  await page.waitForFunction(() => window.ready === true);

  const info = await page.evaluate((b) => window.inspect(b), glbBase64);
  console.log('Mesh count:', info.length);
  for (const d of info) {
    console.log({
      meshName: d.meshName,
      materialName: d.materialName,
      hasVertexColors: d.hasVertexColors,
      hasMap: d.hasMap,
      mapSize: d.mapSize,
      color: d.color
    });
    if (d.texDataUrl) {
      const base64Data = d.texDataUrl.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(path.resolve(__dirname, '../../_scratch/model_texture.png'), Buffer.from(base64Data, 'base64'));
      console.log('Saved texture to _scratch/model_texture.png');
    }
  }

  await browser.close();
  server.close();
}

inspectMat().catch(console.error);

