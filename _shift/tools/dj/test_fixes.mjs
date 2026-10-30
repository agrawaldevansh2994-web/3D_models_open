import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const glbPath = path.resolve(__dirname, '../../../3D models/characters/dj_decks/dj_decks.glb');
const glbBase64 = fs.readFileSync(glbPath).toString('base64');

async function testFixes() {
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
    renderer.toneMappingExposure = 0.85;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06070c);

    // Camera framing: elevated angle showing DJ torso, hands, CDJs, mixer
    const camera = new THREE.PerspectiveCamera(34, 1920 / 1080, 0.1, 50);
    camera.position.set(0, 1.68, 3.25);
    camera.lookAt(0, 1.16, 0.30);

    // Fixed Light Pool with balanced, natural skin illumination
    // Ambient light: neutral warm baseline
    const ambient = new THREE.AmbientLight(0x242630, 1.1);
    scene.add(ambient);

    // Primary Key Light: warm frontal light that unifies facial planes
    const keyLight = new THREE.DirectionalLight(0xfff5ea, 2.2);
    keyLight.position.set(0.8, 3.2, 2.8);
    scene.add(keyLight);

    // Soft neutral Fill Light
    const fillLight = new THREE.DirectionalLight(0x607895, 0.85);
    fillLight.position.set(-1.8, 2.4, 2.0);
    scene.add(fillLight);

    // Softened Rim Lights (0.85 intensity instead of 3.2, so skin doesn't become a patchy mosaic!)
    const rimL = new THREE.DirectionalLight(0xb03070, 0.9);
    rimL.position.set(-2.2, 2.6, -1.2);
    scene.add(rimL);

    const rimR = new THREE.DirectionalLight(0x2088b0, 0.9);
    rimR.position.set(2.2, 2.6, -1.2);
    scene.add(rimR);

    // Console Uplight: gentle warm bounce on DJ chest and lower jaw
    const consoleGlow = new THREE.PointLight(0xffaa33, 0.65, 2.2);
    consoleGlow.position.set(0, 1.05, 0.45);
    scene.add(consoleGlow);

    // Stage Background elements
    const stageBgGroup = new THREE.Group();
    scene.add(stageBgGroup);

    const ledWallMat = new THREE.MeshBasicMaterial({ color: 0x070b14 });
    const ledWall = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), ledWallMat);
    ledWall.position.set(0, 2.4, -3.2);
    stageBgGroup.add(ledWall);

    const trussMat = new THREE.MeshStandardMaterial({ color: 0x1e222a, metalness: 0.8, roughness: 0.35 });
    for (const x of [-2.8, -1.6, 1.6, 2.8]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 4.8, 12), trussMat);
      col.position.set(x, 2.2, -2.5);
      stageBgGroup.add(col);

      const stripMat = new THREE.MeshBasicMaterial({ color: x < 0 ? 0xb02060 : 0x1080b0 });
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.015, 4.5, 0.015), stripMat);
      strip.position.set(x, 2.2, -2.45);
      stageBgGroup.add(strip);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.08, 0.08), trussMat);
    beam.position.set(0, 3.9, -2.5);
    stageBgGroup.add(beam);

    // Two subtle moving spotlights
    const beamMatL = new THREE.MeshBasicMaterial({
      color: 0x992066,
      transparent: true,
      opacity: 0.10,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    const beamMatR = new THREE.MeshBasicMaterial({
      color: 0x107799,
      transparent: true,
      opacity: 0.10,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    const beamGeom = new THREE.CylinderGeometry(0.03, 0.70, 4.5, 16, 1, true);
    const coneL = new THREE.Mesh(beamGeom, beamMatL);
    coneL.position.set(-1.8, 3.8, -2.4);
    stageBgGroup.add(coneL);
    const coneR = new THREE.Mesh(beamGeom, beamMatR);
    coneR.position.set(1.8, 3.8, -2.4);
    stageBgGroup.add(coneR);

    // DJ Booth geometry
    const boothGroup = new THREE.Group();
    scene.add(boothGroup);

    // Table surface
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x14161f,
      roughness: 0.35,
      metalness: 0.75
    });
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.04, 0.65), tableMat);
    tableTop.position.set(0, 0.91, 0.38);
    boothGroup.add(tableTop);

    // Table Stand / Front Facade: full-width (3.5m) to cleanly fill lower third in green-screen mode!
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x0c0e14,
      roughness: 0.65,
      metalness: 0.45
    });
    const stand = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.92, 0.55), standMat);
    stand.position.set(0, 0.44, 0.38);
    boothGroup.add(stand);

    // Front Neon Emissive Line
    const neonMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff });
    const neonLine = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.015, 0.01), neonMat);
    neonLine.position.set(0, 0.86, 0.66);
    boothGroup.add(neonLine);

    // Front hexagon logo accent on booth
    const logoMat = new THREE.MeshBasicMaterial({ color: 0xcc2070 });
    const logoMesh = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.15, 6), logoMat);
    logoMesh.position.set(0, 0.50, 0.66);
    boothGroup.add(logoMesh);

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

    // 4-Channel Mixer
    const mixerChassis = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.055, 0.44), new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.5, metalness: 0.7 }));
    mixerChassis.position.set(0, 0.93 + 0.027, 0.38);
    boothGroup.add(mixerChassis);

    const ledMat = new THREE.MeshBasicMaterial({ color: 0xff9900 });
    const vuL = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.006, 0.14), ledMat);
    vuL.position.set(-0.03, 0.985, 0.38);
    boothGroup.add(vuL);
    const vuR = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.006, 0.14), ledMat);
    vuR.position.set(0.03, 0.985, 0.38);
    boothGroup.add(vuR);

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
        fillLight.intensity = 1.0;
        rimL.intensity = 0;
        rimR.intensity = 0;
        consoleGlow.intensity = 0;
        neonMat.color.setHex(0x182028);
        screenMat.color.setHex(0x202832);
        ledMat.color.setHex(0x352810);
        logoMat.color.setHex(0x1a1218);
      } else {
        scene.background = new THREE.Color(0x06070c);
        stageBgGroup.visible = true;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.85;
        ambient.color.setHex(0x242630);
        ambient.intensity = 1.1;
        keyLight.color.setHex(0xfff5ea);
        keyLight.intensity = 2.2;
        fillLight.color.setHex(0x607895);
        fillLight.intensity = 0.85;
        rimL.intensity = 0.9;
        rimR.intensity = 0.9;
        consoleGlow.intensity = 0.65;
        neonMat.color.setHex(0x00d4ff);
        screenMat.color.setHex(0x00c8e6);
        ledMat.color.setHex(0xff9900);
        logoMat.color.setHex(0xcc2070);
      }
    };

    window.renderFrame = (time, totalDuration, variant) => {
      const loopRatio = time / totalDuration;
      const loopAngle = loopRatio * Math.PI * 2;

      if (variant === 'dj_groove') {
        // Calm, small-moves groove: hands stay down working mixer faders and CDJ platters,
        // with rhythmic head nodding to the beat!
        // We use mixer_hands (0.0 to 4.5s range where both hands are on mixer/decks)
        actions['mixer_hands'].setEffectiveWeight(1.0);
        actions['idle_groove'].setEffectiveWeight(0.0);
        actions['fist_raise_drop'].setEffectiveWeight(0.0);

        // Advance mixer_hands within the 0 to 4.2s range smoothly back and forth or cyclic:
        // Using a smooth cosine oscillation over 0.5s to 3.8s range:
        const tRange = 0.6 + 3.0 * (0.5 - 0.5 * Math.cos(loopAngle));
        actions['mixer_hands'].time = tRange;
      } else if (variant === 'dj_drop') {
        // High-energy drop variant:
        // 0 to 3.5s: mixer_hands (build-up)
        // 3.5 to 7.0s: fist_raise_drop (one arm raised high pumping fist on bass drop)
        // 7.0 to 10.0s: return smoothly to mixer_hands
        const a1 = loopAngle;
        const wBuild = Math.max(0, Math.cos(a1));
        const wDrop  = Math.max(0, -Math.cos(a1));
        const sum = wBuild + wDrop + 1e-6;

        actions['mixer_hands'].setEffectiveWeight(wBuild / sum);
        actions['fist_raise_drop'].setEffectiveWeight(wDrop / sum);
        actions['idle_groove'].setEffectiveWeight(0);

        // Cyclic time:
        actions['mixer_hands'].time = (0.5 + 3.0 * (0.5 + 0.5 * Math.cos(loopAngle)));
        actions['fist_raise_drop'].time = (0.5 + 3.5 * (0.5 - 0.5 * Math.cos(loopAngle)));
      }

      mixer.update(0);

      // Platter spin: exact 10 whole revolutions over 10s loop
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
        coneL.rotation.z = 0.30 * Math.sin(loopAngle);
        coneR.rotation.z = -0.30 * Math.sin(loopAngle);
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
  await page.evaluate((b64) => window.init(b64), glbBase64);

  fs.mkdirSync(path.resolve(__dirname, '../../_scratch'), { recursive: true });

  console.log('Rendering fixed groove test frame...');
  await page.evaluate(() => window.setMode('club'));
  const b64Club0 = await page.evaluate(() => window.renderFrame(0, 10, 'dj_groove'));
  fs.writeFileSync(path.resolve(__dirname, '../../_scratch/fix_groove_club_f0.png'), Buffer.from(b64Club0, 'base64'));

  const b64Club5 = await page.evaluate(() => window.renderFrame(5, 10, 'dj_groove'));
  fs.writeFileSync(path.resolve(__dirname, '../../_scratch/fix_groove_club_f5.png'), Buffer.from(b64Club5, 'base64'));

  console.log('Rendering fixed drop test frame...');
  const b64Drop5 = await page.evaluate(() => window.renderFrame(5, 10, 'dj_drop'));
  fs.writeFileSync(path.resolve(__dirname, '../../_scratch/fix_drop_club_f5.png'), Buffer.from(b64Drop5, 'base64'));

  console.log('Rendering fixed green test frame...');
  await page.evaluate(() => window.setMode('green'));
  const b64Green = await page.evaluate(() => window.renderFrame(0, 10, 'dj_groove'));
  fs.writeFileSync(path.resolve(__dirname, '../../_scratch/fix_groove_green_f0.png'), Buffer.from(b64Green, 'base64'));

  await browser.close();
  server.close();
  console.log('Rendered fixed frames to _scratch/');
}

testFixes().catch(console.error);
