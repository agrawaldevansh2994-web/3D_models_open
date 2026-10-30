import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const glbPath = path.resolve(__dirname, '../../../3D models/characters/dj_decks/dj_decks.glb');
const glbBase64 = fs.readFileSync(glbPath).toString('base64');

async function testImprovedScene() {
  const http = await import('http');
  const server = http.createServer((req, res) => {
    let filePath = path.resolve(__dirname, '../../', req.url.replace(/^\//, ''));
    if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
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
    renderer.setPixelRatio(1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.90;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060a);

    // Slightly elevated camera framing:
    // camera at y = 1.68m, looking down at y = 1.16m at angle ~12 deg
    const camera = new THREE.PerspectiveCamera(34, 1920 / 1080, 0.1, 50);
    camera.position.set(0, 1.68, 3.25);
    camera.lookAt(0, 1.16, 0.30);

    // Fixed Light Pool
    const ambient = new THREE.AmbientLight(0x181028, 1.0);
    scene.add(ambient);

    // Overhead front key light
    const keyLight = new THREE.DirectionalLight(0xddeeff, 2.0);
    keyLight.position.set(1.2, 3.8, 2.6);
    scene.add(keyLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0x3366aa, 0.9);
    fillLight.position.set(-2.2, 2.6, 2.0);
    scene.add(fillLight);

    // Strong vivid Rim Lights (Magenta and Cyan)
    const rimL = new THREE.DirectionalLight(0xff0077, 3.2);
    rimL.position.set(-2.2, 2.6, -1.2);
    scene.add(rimL);

    const rimR = new THREE.DirectionalLight(0x00d4ff, 3.2);
    rimR.position.set(2.2, 2.6, -1.2);
    scene.add(rimR);

    // Console Uplight (amber bounce on DJ's chest & face)
    const consoleGlow = new THREE.PointLight(0xffaa22, 1.5, 2.0);
    consoleGlow.position.set(0, 1.05, 0.45);
    scene.add(consoleGlow);

    // Background Stage Elements (Club Mode Only)
    const stageBgGroup = new THREE.Group();
    scene.add(stageBgGroup);

    // Stage LED backdrop wall (far z = -3.0)
    const ledWallMat = new THREE.MeshBasicMaterial({ color: 0x0a1020 });
    const ledWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), ledWallMat);
    ledWall.position.set(0, 2.2, -3.0);
    stageBgGroup.add(ledWall);

    // Stage Truss columns
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x222630, metalness: 0.8, roughness: 0.3 });
    for (const x of [-2.8, -1.6, 1.6, 2.8]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 4.5, 12), trussMat);
      col.position.set(x, 2.2, -2.5);
      stageBgGroup.add(col);

      // Vertical neon accent strip on trusses
      const stripMat = new THREE.MeshBasicMaterial({ color: x < 0 ? 0xff0066 : 0x00d4ff });
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.015, 4.2, 0.015), stripMat);
      strip.position.set(x, 2.2, -2.45);
      stageBgGroup.add(strip);
    }

    // Overhead truss crossbeam
    const beam = new THREE.Mesh(new THREE.BoxGeometry(7, 0.08, 0.08), trussMat);
    beam.position.set(0, 3.8, -2.5);
    stageBgGroup.add(beam);

    // DJ Booth geometry
    const boothGroup = new THREE.Group();
    scene.add(boothGroup);

    // Table surface lowered to y = 0.91m so DJ torso & hands are naturally positioned
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x14161f,
      roughness: 0.35,
      metalness: 0.75
    });
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.04, 0.62), tableMat);
    tableTop.position.set(0, 0.91, 0.38);
    boothGroup.add(tableTop);

    // Table Stand / Front Facade
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x0d0f15,
      roughness: 0.65,
      metalness: 0.45
    });
    const stand = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.89, 0.52), standMat);
    stand.position.set(0, 0.445, 0.38);
    boothGroup.add(stand);

    // Front Neon Emissive Line
    const neonMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const neonLine = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.018, 0.01), neonMat);
    neonLine.position.set(0, 0.86, 0.65);
    boothGroup.add(neonLine);

    // Front geometric logo accent on booth
    const logoMat = new THREE.MeshBasicMaterial({ color: 0xff0077 });
    const logoMesh = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.15, 6), logoMat);
    logoMesh.position.set(0, 0.50, 0.65);
    boothGroup.add(logoMesh);

    // Two CDJ Players
    const cdjMat = new THREE.MeshStandardMaterial({ color: 0x1b1d24, roughness: 0.4, metalness: 0.8 });
    const platterMat = new THREE.MeshStandardMaterial({ color: 0x222630, roughness: 0.25, metalness: 0.95 });
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });

    function createCDJ(x) {
      const g = new THREE.Group();
      g.position.set(x, 0.93 + 0.025, 0.38);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.44), cdjMat);
      g.add(base);
      const platter = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.014, 32), platterMat);
      platter.position.set(0, 0.032, 0.04);
      g.add(platter);
      // Platter marker (white dot/line)
      const marker = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.016, 0.04), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      marker.position.set(0, 0.033, 0.11);
      g.add(marker);
      // Screen angled towards DJ
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

    // 4-Channel Mixer
    const mixerChassis = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.055, 0.44), new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.5, metalness: 0.7 }));
    mixerChassis.position.set(0, 0.93 + 0.027, 0.38);
    boothGroup.add(mixerChassis);

    // Mixer LED VU meters
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const vuL = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.006, 0.14), ledMat);
    vuL.position.set(-0.03, 0.985, 0.38);
    boothGroup.add(vuL);
    const vuR = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.006, 0.14), ledMat);
    vuR.position.set(0.03, 0.985, 0.38);
    boothGroup.add(vuR);

    // Knobs / Faders accents on mixer
    const knobMat = new THREE.MeshStandardMaterial({ color: 0x333844, roughness: 0.2, metalness: 0.9 });
    for (let kx = -0.10; kx <= 0.10; kx += 0.065) {
      for (let kz = 0.24; kz <= 0.44; kz += 0.065) {
        const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 16), knobMat);
        knob.position.set(kx, 0.965, kz);
        boothGroup.add(knob);
      }
    }

    let mixer = null;
    let actions = {};
    let isReady = false;

    window.init = (b64) => {
      return new Promise((resolve, reject) => {
        const raw = atob(b64);
        const uint8 = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) uint8[i] = raw.charCodeAt(i);
        const loader = new GLTFLoader();
        loader.parse(uint8.buffer, '', (gltf) => {
          scene.add(gltf.scene);
          mixer = new THREE.AnimationMixer(gltf.scene);
          for (const clip of gltf.animations) {
            const act = mixer.clipAction(clip);
            act.play();
            act.setEffectiveWeight(0);
            actions[clip.name] = act;
          }
          isReady = true;
          resolve(true);
        }, reject);
      });
    };

    window.setMode = (mode) => {
      if (mode === 'green') {
        scene.background = new THREE.Color(0x00ff00);
        stageBgGroup.visible = false;
        renderer.toneMapping = THREE.NoToneMapping;
        ambient.color.setHex(0xffffff);
        ambient.intensity = 1.7;
        keyLight.color.setHex(0xffffff);
        keyLight.intensity = 1.8;
        fillLight.color.setHex(0xffffff);
        fillLight.intensity = 1.1;
        rimL.color.setHex(0xffffff);
        rimL.intensity = 0.5;
        rimR.color.setHex(0xffffff);
        rimR.intensity = 0.5;
        consoleGlow.intensity = 0.2;
        consoleGlow.color.setHex(0xffffff);
        neonMat.color.setHex(0x1a2430);
        screenMat.color.setHex(0x223040);
        ledMat.color.setHex(0x443311);
        logoMat.color.setHex(0x221122);
      } else {
        scene.background = new THREE.Color(0x05060a);
        stageBgGroup.visible = true;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.90;
        ambient.color.setHex(0x181028);
        ambient.intensity = 1.0;
        keyLight.color.setHex(0xddeeff);
        keyLight.intensity = 2.0;
        fillLight.color.setHex(0x3366aa);
        fillLight.intensity = 0.9;
        rimL.color.setHex(0xff0077);
        rimL.intensity = 3.2;
        rimR.color.setHex(0x00d4ff);
        rimR.intensity = 3.2;
        consoleGlow.intensity = 1.5;
        consoleGlow.color.setHex(0xffaa22);
        neonMat.color.setHex(0x00e5ff);
        screenMat.color.setHex(0x00e5ff);
        ledMat.color.setHex(0xffaa00);
        logoMat.color.setHex(0xff0077);
      }
    };

    window.renderFrame = (time, totalDuration, variant) => {
      const loopRatio = time / totalDuration;
      const loopAngle = loopRatio * Math.PI * 2;

      if (variant === 'groove_and_mix') {
        const wGroove = 0.5 + 0.5 * Math.cos(loopAngle);
        const wMixer  = 0.5 - 0.5 * Math.cos(loopAngle);

        actions['idle_groove'].setEffectiveWeight(wGroove);
        actions['mixer_hands'].setEffectiveWeight(wMixer);
        actions['fist_raise_drop'].setEffectiveWeight(0);

        actions['idle_groove'].time = (loopRatio * 2.0 * 6.55) % 6.55;
        actions['mixer_hands'].time = (loopRatio * 6.55) % 6.55;
      } else if (variant === 'drop_and_fist') {
        const a1 = loopAngle;
        const a2 = loopAngle - (2 * Math.PI / 3);
        const a3 = loopAngle - (4 * Math.PI / 3);

        let w1 = Math.max(0, Math.cos(a1));
        let w2 = Math.max(0, Math.cos(a2));
        let w3 = Math.max(0, Math.cos(a3));
        const sum = w1 + w2 + w3 + 1e-6;
        w1 /= sum; w2 /= sum; w3 /= sum;

        actions['mixer_hands'].setEffectiveWeight(w1);
        actions['fist_raise_drop'].setEffectiveWeight(w2);
        actions['idle_groove'].setEffectiveWeight(w3);

        actions['mixer_hands'].time = (loopRatio * 2.0 * 6.55) % 6.55;
        actions['fist_raise_drop'].time = (loopRatio * 6.55) % 6.55;
        actions['idle_groove'].time = (loopRatio * 6.55) % 6.55;
      }

      mixer.update(0);

      // Platter spin: exact 10 whole revolutions over loop
      const platterAngle = loopAngle * 10;
      cdjL.platter.rotation.y = platterAngle;
      cdjL.marker.rotation.y = platterAngle;
      cdjR.platter.rotation.y = -platterAngle;
      cdjR.marker.rotation.y = -platterAngle;

      // VU meters pulse with beat (16 beats per 10s loop)
      const vuScale = 0.5 + 0.5 * Math.sin(loopAngle * 16);
      vuL.scale.set(1, 1, 0.3 + 0.7 * vuScale);
      vuR.scale.set(1, 1, 0.3 + 0.7 * (0.5 + 0.5 * Math.cos(loopAngle * 16)));

      // Subtle light drift in club mode
      if (renderer.toneMapping !== THREE.NoToneMapping) {
        rimL.position.x = -2.2 + 0.35 * Math.sin(loopAngle);
        rimR.position.x = 2.2 + 0.35 * Math.cos(loopAngle);
      }

      renderer.render(scene, camera);
      return canvas.toDataURL('image/png').slice(22);
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

  const browser = await chromium.launch({
    headless: true,
    args: ['--ignore-gpu-blocklist', '--enable-webgl', '--use-gl=angle', '--use-angle=d3d11']
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => window.ready === true);

  console.log('Initializing model...');
  await page.evaluate((b64) => window.init(b64), glbBase64);

  fs.mkdirSync(path.resolve(__dirname, '../../_scratch'), { recursive: true });

  console.log('Rendering improved club preview...');
  await page.evaluate(() => window.setMode('club'));
  const b64Club0 = await page.evaluate(() => window.renderFrame(0, 10, 'groove_and_mix'));
  fs.writeFileSync(path.resolve(__dirname, '../../_scratch/improved_club_f0.png'), Buffer.from(b64Club0, 'base64'));

  const b64Club5 = await page.evaluate(() => window.renderFrame(5, 10, 'groove_and_mix'));
  fs.writeFileSync(path.resolve(__dirname, '../../_scratch/improved_club_f5.png'), Buffer.from(b64Club5, 'base64'));

  console.log('Rendering improved green preview...');
  await page.evaluate(() => window.setMode('green'));
  const b64Green5 = await page.evaluate(() => window.renderFrame(5, 10, 'groove_and_mix'));
  fs.writeFileSync(path.resolve(__dirname, '../../_scratch/improved_green_f5.png'), Buffer.from(b64Green5, 'base64'));

  console.log('Rendering improved drop_and_fist preview...');
  await page.evaluate(() => window.setMode('club'));
  const b64Drop = await page.evaluate(() => window.renderFrame(5, 10, 'drop_and_fist'));
  fs.writeFileSync(path.resolve(__dirname, '../../_scratch/improved_drop_f5.png'), Buffer.from(b64Drop, 'base64'));

  await browser.close();
  server.close();
  console.log('Done! Rendered improved test frames to _scratch/');
}

testImprovedScene().catch(console.error);
