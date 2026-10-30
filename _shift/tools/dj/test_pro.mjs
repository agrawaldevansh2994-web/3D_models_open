import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const glbPath = path.resolve(__dirname, '../../../3D models/characters/dj_decks/dj_decks.glb');
const glbBase64 = fs.readFileSync(glbPath).toString('base64');

async function testHeadphonesAndBooth() {
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
    renderer.toneMappingExposure = 0.92;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06070e);

    const camera = new THREE.PerspectiveCamera(34, 1920 / 1080, 0.1, 50);
    camera.position.set(0, 1.72, 3.10);
    camera.lookAt(0, 1.28, 0.25);

    // Stage Background Lighting & Scenery
    const stageGroup = new THREE.Group();
    scene.add(stageGroup);

    // LED wall backdrop with subtle deep gradient
    const backdropGeom = new THREE.PlaneGeometry(16, 7);
    const backdropMat = new THREE.MeshBasicMaterial({ color: 0x05070e });
    const backdrop = new THREE.Mesh(backdropGeom, backdropMat);
    backdrop.position.set(0, 2.5, -3.5);
    stageGroup.add(backdrop);

    // Stage truss framework
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x181c24, metalness: 0.85, roughness: 0.3 });
    for (const tx of [-2.5, -1.4, 1.4, 2.5]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 5.0, 12), trussMat);
      col.position.set(tx, 2.3, -2.8);
      stageGroup.add(col);

      // Vertical LED tube light on truss
      const tubeMat = new THREE.MeshBasicMaterial({ color: tx < 0 ? 0xcc1855 : 0x00b4d8 });
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 4.2, 12), tubeMat);
      tube.position.set(tx, 2.3, -2.75);
      stageGroup.add(tube);
    }
    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.08, 0.08), trussMat);
    topBeam.position.set(0, 4.0, -2.8);
    stageGroup.add(topBeam);

    // Atmospheric volumetric beam cones
    const beamGeom = new THREE.CylinderGeometry(0.04, 0.75, 4.8, 20, 1, true);
    const beamMatL = new THREE.MeshBasicMaterial({
      color: 0xbb1155,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    const coneL = new THREE.Mesh(beamGeom, beamMatL);
    coneL.position.set(-1.8, 3.9, -2.6);
    coneL.rotation.z = 0.28;
    stageGroup.add(coneL);

    const beamMatR = new THREE.MeshBasicMaterial({
      color: 0x0099cc,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    const coneR = new THREE.Mesh(beamGeom, beamMatR);
    coneR.position.set(1.8, 3.9, -2.6);
    coneR.rotation.z = -0.28;
    stageGroup.add(coneR);

    // Balanced 3-Point Lighting for natural human skin
    const ambient = new THREE.AmbientLight(0x222633, 1.2);
    scene.add(ambient);

    // Warm frontal key light
    const keyLight = new THREE.DirectionalLight(0xffeedd, 2.6);
    keyLight.position.set(0.6, 2.9, 2.6);
    scene.add(keyLight);

    // Soft cool fill light
    const fillLight = new THREE.DirectionalLight(0x607898, 1.0);
    fillLight.position.set(-1.8, 2.2, 2.2);
    scene.add(fillLight);

    // Subtle edge rim lights
    const rimL = new THREE.DirectionalLight(0x991850, 0.9);
    rimL.position.set(-2.2, 2.4, -1.2);
    scene.add(rimL);

    const rimR = new THREE.DirectionalLight(0x0e7899, 0.9);
    rimR.position.set(2.2, 2.4, -1.2);
    scene.add(rimR);

    // Uplight bouncing from console onto DJ's chest & face
    const consoleGlow = new THREE.PointLight(0xff9922, 0.8, 2.5);
    consoleGlow.position.set(0, 1.05, 0.45);
    scene.add(consoleGlow);

    // Full 3.5m wide DJ Booth (spans entire bottom frame, zero green gaps!)
    const boothGroup = new THREE.Group();
    scene.add(boothGroup);

    const tableMat = new THREE.MeshStandardMaterial({ color: 0x151720, roughness: 0.35, metalness: 0.8 });
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.045, 0.65), tableMat);
    tableTop.position.set(0, 0.92, 0.38);
    boothGroup.add(tableTop);

    const standMat = new THREE.MeshStandardMaterial({ color: 0x0a0c12, roughness: 0.7, metalness: 0.4 });
    const stand = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.93, 0.55), standMat);
    stand.position.set(0, 0.45, 0.38);
    boothGroup.add(stand);

    // Front neon accent line & Playa logo
    const neonMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff });
    const neonLine = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.015, 0.01), neonMat);
    neonLine.position.set(0, 0.86, 0.66);
    boothGroup.add(neonLine);

    const logoMat = new THREE.MeshBasicMaterial({ color: 0xff0066 });
    const logoMesh = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.15, 6), logoMat);
    logoMesh.position.set(0, 0.52, 0.66);
    boothGroup.add(logoMesh);

    // Professional DJ Pro Equipment: 2x CDJ-3000 + DJM-900NXS2 mixer
    const cdjMat = new THREE.MeshStandardMaterial({ color: 0x161822, roughness: 0.35, metalness: 0.85 });
    const platterMat = new THREE.MeshStandardMaterial({ color: 0x222632, roughness: 0.25, metalness: 0.95 });
    const jogCenterMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff }); // Center jog LCD display ring

    function createCDJ(x) {
      const g = new THREE.Group();
      g.position.set(x, 0.94 + 0.025, 0.38);

      // Chassis
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 0.46), cdjMat);
      g.add(b);

      // Jog Platter
      const platter = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.014, 32), platterMat);
      platter.position.set(0, 0.032, 0.05);
      g.add(platter);

      // Jog center display
      const jogDisplay = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.016, 24), jogCenterMat);
      jogDisplay.position.set(0, 0.033, 0.05);
      g.add(jogDisplay);

      // White platter position marker
      const marker = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.018, 0.04), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      marker.position.set(0, 0.034, 0.12);
      g.add(marker);

      // Angled waveform touchscreen
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.12), new THREE.MeshBasicMaterial({ color: 0x00b4d8 }));
      scr.rotation.x = -Math.PI / 4.2;
      scr.position.set(0, 0.068, -0.13);
      g.add(scr);

      // Cue (orange) & Play (green) buttons
      const cueBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.008, 16), new THREE.MeshBasicMaterial({ color: 0xff8800 }));
      cueBtn.position.set(-0.12, 0.03, 0.15);
      g.add(cueBtn);

      const playBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.008, 16), new THREE.MeshBasicMaterial({ color: 0x00ff66 }));
      playBtn.position.set(-0.12, 0.03, 0.19);
      g.add(playBtn);

      // Pitch fader track
      const pitchTrack = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.005, 0.12), new THREE.MeshBasicMaterial({ color: 0x333a48 }));
      pitchTrack.position.set(0.13, 0.03, 0.05);
      g.add(pitchTrack);
      const pitchKnob = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.012), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
      pitchKnob.position.set(0.13, 0.036, 0.05);
      g.add(pitchKnob);

      return { group: g, platter, marker };
    }

    const cdjL = createCDJ(-0.48);
    const cdjR = createCDJ(0.48);
    boothGroup.add(cdjL.group);
    boothGroup.add(cdjR.group);

    // 4-Channel Professional Mixer
    const mixerChassis = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.055, 0.46),
      new THREE.MeshStandardMaterial({ color: 0x141620, roughness: 0.45, metalness: 0.8 })
    );
    mixerChassis.position.set(0, 0.94 + 0.027, 0.38);
    boothGroup.add(mixerChassis);

    // Mixer VU Meters (Dual LED bars)
    const vuMatL = new THREE.MeshBasicMaterial({ color: 0xff8800 });
    const vuMatR = new THREE.MeshBasicMaterial({ color: 0xff8800 });
    const vuL = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.006, 0.14), vuMatL);
    vuL.position.set(-0.028, 0.995, 0.38);
    boothGroup.add(vuL);
    const vuR = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.006, 0.14), vuMatR);
    vuR.position.set(0.028, 0.995, 0.38);
    boothGroup.add(vuR);

    // Channel EQ knobs & Faders
    const knobMat = new THREE.MeshStandardMaterial({ color: 0x2e3544, roughness: 0.25, metalness: 0.85 });
    for (let kx = -0.09; kx <= 0.09; kx += 0.06) {
      for (let kz = 0.26; kz <= 0.44; kz += 0.06) {
        const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.012, 16), knobMat);
        knob.position.set(kx, 0.975, kz);
        boothGroup.add(knob);
      }
    }
    // Crossfader
    const xfaderTrack = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.004, 0.012), new THREE.MeshBasicMaterial({ color: 0x333a48 }));
    xfaderTrack.position.set(0, 0.975, 0.52);
    boothGroup.add(xfaderTrack);
    const xfaderKnob = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.014, 0.02), new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
    xfaderKnob.position.set(0, 0.982, 0.52);
    boothGroup.add(xfaderKnob);

    // Loader & Procedural Headphones
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

          // Natural warm healthy skin tone:
          const skinColor   = new THREE.Color(0xdf9f7d);
          // Dark stylish hair:
          const hairColor   = new THREE.Color(0x1a1512);
          // Sleek dark sunglasses:
          const shadesColor = new THREE.Color(0x141418);
          // Deep navy / festival tee:
          const shirtColor  = new THREE.Color(0x222a38);
          // Charcoal pants:
          const pantsColor  = new THREE.Color(0x181a20);
          // Shoes / trim:
          const shoeColor   = new THREE.Color(0xdce0e8);

          for (let i = 0; i < count; i++) {
            const u = uv.getX(i);
            const idx = Math.floor(u * 16);
            let c = skinColor;
            if (idx === 0) c = skinColor;
            else if (idx === 1) c = hairColor;
            else if (idx === 2) c = shadesColor;
            else if (idx === 3) c = shirtColor;
            else if (idx === 6) c = pantsColor;
            else if (idx === 4 || idx === 5 || idx === 9) c = shoeColor;

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

          // Attach DJ Headphones around his neck (anchored to Neck / Chest bone)
          const neckBone = gltf.scene.getObjectByName('Neck');
          if (neckBone) {
            const hpGroup = new THREE.Group();

            const hpMat = new THREE.MeshStandardMaterial({ color: 0x181820, roughness: 0.35, metalness: 0.85 });
            const cushionMat = new THREE.MeshStandardMaterial({ color: 0x282c35, roughness: 0.7, metalness: 0.2 });
            const silverMat = new THREE.MeshStandardMaterial({ color: 0xc0c8d4, roughness: 0.2, metalness: 0.9 });

            // Torus headband resting around neck
            const headband = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.014, 12, 32, Math.PI * 1.5), hpMat);
            headband.rotation.x = Math.PI / 2.3;
            headband.rotation.z = Math.PI * 0.75;
            headband.position.set(0, -0.02, 0.02);
            hpGroup.add(headband);

            // Left ear cup resting on collarbone
            const cupL = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.028, 20), hpMat);
            cupL.position.set(-0.11, -0.04, 0.05);
            cupL.rotation.z = 0.35;
            cupL.rotation.y = 0.2;
            const cushL = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.040, 0.015, 20), cushionMat);
            cushL.position.set(-0.11, -0.03, 0.05);
            cushL.rotation.copy(cupL.rotation);
            const rimMeshL = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.004, 8, 20), silverMat);
            rimMeshL.position.copy(cupL.position);
            rimMeshL.rotation.copy(cupL.rotation);
            hpGroup.add(cupL);
            hpGroup.add(cushL);
            hpGroup.add(rimMeshL);

            // Right ear cup resting on collarbone
            const cupR = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.028, 20), hpMat);
            cupR.position.set(0.11, -0.04, 0.05);
            cupR.rotation.z = -0.35;
            cupR.rotation.y = -0.2;
            const cushR = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.040, 0.015, 20), cushionMat);
            cushR.position.set(0.11, -0.03, 0.05);
            cushR.rotation.copy(cupR.rotation);
            const rimMeshR = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.004, 8, 20), silverMat);
            rimMeshR.position.copy(cupR.position);
            rimMeshR.rotation.copy(cupR.rotation);
            hpGroup.add(cupR);
            hpGroup.add(cushR);
            hpGroup.add(rimMeshR);

            neckBone.add(hpGroup);
          }

          scene.add(gltf.scene);

          // Mixer
          const animMixer = new THREE.AnimationMixer(gltf.scene);
          const clip = gltf.animations.find(c => c.name === 'mixer_hands');
          const act = animMixer.clipAction(clip);
          act.play();
          act.time = 2.4;
          animMixer.update(0);

          // Add subtle DJ head nod to beat
          const headBone = gltf.scene.getObjectByName('Head');
          if (headBone) {
            headBone.rotation.x -= 0.12; // focused nod down towards mixer
          }

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
  const outPath = path.resolve(__dirname, '../../_scratch/dj_pro_test.png');
  fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
  console.log('Saved test image to:', outPath);

  await browser.close();
  server.close();
}

testHeadphonesAndBooth().catch(console.error);

