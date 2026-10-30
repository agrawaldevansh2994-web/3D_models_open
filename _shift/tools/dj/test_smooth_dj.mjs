import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const glbPath = path.resolve(__dirname, '../../../3D models/characters/dj_decks/dj_decks.glb');
const glbBase64 = fs.readFileSync(glbPath).toString('base64');

async function testSmoothDJ() {
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

    // Elevated camera framing showing DJ, arms, decks, mixer
    const camera = new THREE.PerspectiveCamera(34, 1920/1080, 0.1, 50);
    camera.position.set(0, 1.68, 3.25);
    camera.lookAt(0, 1.16, 0.30);

    // Balanced 3-point lighting for natural human skin
    const ambient = new THREE.AmbientLight(0x282a36, 1.1);
    scene.add(ambient);

    // Key Light: warm frontal light that unifies facial planes
    const key = new THREE.DirectionalLight(0xfff3e5, 2.0);
    key.position.set(0.8, 3.2, 2.6);
    scene.add(key);

    // Fill Light: soft cool fill
    const fill = new THREE.DirectionalLight(0x5a7090, 0.8);
    fill.position.set(-1.8, 2.4, 2.0);
    scene.add(fill);

    // Soft colored rims (subtle, non-patchy!)
    const rimL = new THREE.DirectionalLight(0xa02560, 0.8);
    rimL.position.set(-2.2, 2.6, -1.2);
    scene.add(rimL);

    const rimR = new THREE.DirectionalLight(0x1575a0, 0.8);
    rimR.position.set(2.2, 2.6, -1.2);
    scene.add(rimR);

    // Console Uplight (warm glow from mixer onto face & hands)
    const consoleGlow = new THREE.PointLight(0xffaa33, 0.6, 2.2);
    consoleGlow.position.set(0, 1.05, 0.45);
    scene.add(consoleGlow);

    // DJ Booth geometry
    const boothGroup = new THREE.Group();
    scene.add(boothGroup);

    // Table surface
    const tableTop = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 0.04, 0.65),
      new THREE.MeshStandardMaterial({ color: 0x14161f, roughness: 0.35, metalness: 0.75 })
    );
    tableTop.position.set(0, 0.91, 0.38);
    boothGroup.add(tableTop);

    // Table Stand / Front Facade
    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 0.92, 0.55),
      new THREE.MeshStandardMaterial({ color: 0x0c0e14, roughness: 0.65, metalness: 0.45 })
    );
    stand.position.set(0, 0.44, 0.38);
    boothGroup.add(stand);

    // Front Neon Line
    const neonLine = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.015, 0.01),
      new THREE.MeshBasicMaterial({ color: 0x00d4ff })
    );
    neonLine.position.set(0, 0.86, 0.66);
    boothGroup.add(neonLine);

    // CDJ Players
    const cdjMat = new THREE.MeshStandardMaterial({ color: 0x181a22, roughness: 0.45, metalness: 0.8 });
    const platterMat = new THREE.MeshStandardMaterial({ color: 0x222630, roughness: 0.3, metalness: 0.9 });
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x00c8e6 });

    function createCDJ(x) {
      const g = new THREE.Group();
      g.position.set(x, 0.93 + 0.025, 0.38);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.44), cdjMat);
      g.add(base);
      const platter = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.014, 32), platterMat);
      platter.position.set(0, 0.032, 0.04);
      g.add(platter);
      const marker = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.016, 0.04), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      marker.position.set(0, 0.033, 0.11);
      g.add(marker);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.20, 0.11), screenMat);
      scr.rotation.x = -Math.PI / 4;
      scr.position.set(0, 0.065, -0.12);
      g.add(scr);
      return { group: g, platter, marker };
    }
    const cdjL = createCDJ(-0.46);
    const cdjR = createCDJ(0.46);
    boothGroup.add(cdjL.group);
    boothGroup.add(cdjR.group);

    // Mixer
    const mixerChassis = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.055, 0.44),
      new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.5, metalness: 0.7 })
    );
    mixerChassis.position.set(0, 0.93 + 0.027, 0.38);
    boothGroup.add(mixerChassis);

    // Mixer LED VU meters
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xff9900 });
    const vuL = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.006, 0.14), ledMat);
    vuL.position.set(-0.03, 0.985, 0.38);
    boothGroup.add(vuL);
    const vuR = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.006, 0.14), ledMat);
    vuR.position.set(0.03, 0.985, 0.38);
    boothGroup.add(vuR);

    let mixer = null;
    let actions = {};

    window.load = (b64) => {
      const raw = atob(b64);
      const uint8 = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) uint8[i] = raw.charCodeAt(i);
      const loader = new GLTFLoader();
      loader.parse(uint8.buffer, '', (gltf) => {
        gltf.scene.traverse((obj) => {
          if (obj.isMesh) {
            const geom = obj.geometry;
            // Smooth normals so facets don't catch disjoint sharp reflections
            geom.computeVertexNormals();

            const pos = geom.attributes.position;
            const count = pos.count;
            const colors = new Float32Array(count * 3);

            // Natural realistic skin tone (warm Caucasian/Mediterranean tone with natural pinkish subsurface)
            const skinColor = new THREE.Color(0xdfa080);
            const hairColor = new THREE.Color(0x221a16);
            const eyeColor  = new THREE.Color(0xffaa00);
            const shirtColor = new THREE.Color(0xee9900);
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
                if (y > 1.63 || (y > 1.55 && z < -0.01)) {
                  c = hairColor;
                } else if (y >= 1.51 && y <= 1.57 && z > 0.07 && Math.abs(x) < 0.11) {
                  c = eyeColor;
                } else {
                  c = skinColor;
                }
              } else {
                c = skinColor;
              }

              colors[i * 3]     = c.r;
              colors[i * 3 + 1] = c.g;
              colors[i * 3 + 2] = c.b;
            }

            geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            obj.material = new THREE.MeshStandardMaterial({
              vertexColors: true,
              roughness: 0.60,
              metalness: 0.08,
              flatShading: false
            });
          }
        });

        scene.add(gltf.scene);
        mixer = new THREE.AnimationMixer(gltf.scene);
        for (const clip of gltf.animations) {
          const act = mixer.clipAction(clip);
          act.play();
          act.setEffectiveWeight(0);
          actions[clip.name] = act;
        }

        // Set action for DJ playing his set!
        // Hands on mixer & CDJs, head nodding to the beat
        actions['mixer_hands'].setEffectiveWeight(1.0);
        actions['mixer_hands'].time = 1.8;
        mixer.update(0);

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
  fs.writeFileSync(path.resolve(__dirname, '../../_scratch/test_smooth_dj.png'), Buffer.from(b64, 'base64'));
  console.log('Saved _scratch/test_smooth_dj.png');

  await browser.close();
  server.close();
}

testSmoothDJ().catch(console.error);

