// DJ Loop Renderer: 3D character (dj_decks.glb) + procedural DJ booth -> headless Three.js -> ffmpeg (MP4 + WebM).
// Seamless circular timeline by construction: frame N mathematically matches frame 0.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const shift = resolve(here, '../..');
const root = resolve(shift, '..');
const argv = process.argv.slice(2);
const [cmd, variantArg, lookArg] = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));

const loopsConfig = JSON.parse(readFileSync(join(here, 'loops.json'), 'utf8'));

if (cmd === 'list' || !cmd) {
  console.log('Available DJ Loop Variants:');
  for (const [k, v] of Object.entries(loopsConfig)) {
    console.log(`  ${k.padEnd(14)} (${v.seconds}s @ ${v.fps}fps) -> ${v.description}`);
  }
  process.exit(0);
}

const glbPath = join(root, '3D models', 'characters', 'dj_decks', 'dj_decks.glb');
if (!existsSync(glbPath)) {
  console.error('Character GLB not found:', glbPath);
  process.exit(1);
}
const glbBase64 = readFileSync(glbPath).toString('base64');

// Target job list
let jobs = [];
if (cmd === 'all') {
  for (const k of Object.keys(loopsConfig)) {
    jobs.push({ variant: k, look: 'club' });
    jobs.push({ variant: k, look: 'green' });
  }
} else {
  if (!loopsConfig[variantArg]) {
    console.error(`Unknown variant "${variantArg}".`);
    process.exit(1);
  }
  const looks = (lookArg === 'all') ? ['club', 'green'] : [lookArg || 'club'];
  for (const l of looks) {
    if (l !== 'club' && l !== 'green') {
      console.error(`Invalid look "${l}". Must be "club" or "green".`);
      process.exit(1);
    }
    jobs.push({ variant: variantArg, look: l });
  }
}

// Minimal local HTTP server for serving node_modules (Three.js importmap)
const server = http.createServer((req, res) => {
  let filePath = resolve(shift, req.url.replace(/^\//, ''));
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(getHtml());
    return;
  }
  if (existsSync(filePath) && readFileSync(filePath)) {
    const ext = filePath.split('.').pop();
    const mime = ext === 'js' ? 'text/javascript' : ext === 'json' ? 'application/json' : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

await new Promise((res) => server.listen(0, '127.0.0.1', res));
const port = server.address().port;

function getHtml() {
  return `<!DOCTYPE html>
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
    renderer.toneMappingExposure = 0.92;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06070e);

    // Elevated camera framing showing DJ, arms, hands, CDJ platters, mixer
    const camera = new THREE.PerspectiveCamera(34, 1920 / 1080, 0.1, 50);
    camera.position.set(0, 1.72, 3.10);
    camera.lookAt(0, 1.28, 0.25);

    // Stage Background (Club Mode Only)
    const stageBgGroup = new THREE.Group();
    scene.add(stageBgGroup);

    const ledWallMat = new THREE.MeshBasicMaterial({ color: 0x05070e });
    const ledWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 7), ledWallMat);
    ledWall.position.set(0, 2.5, -3.5);
    stageBgGroup.add(ledWall);

    const trussMat = new THREE.MeshStandardMaterial({ color: 0x181c24, metalness: 0.85, roughness: 0.3 });
    for (const x of [-2.5, -1.4, 1.4, 2.5]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 5.0, 12), trussMat);
      col.position.set(x, 2.3, -2.8);
      stageBgGroup.add(col);

      const tubeMat = new THREE.MeshBasicMaterial({ color: x < 0 ? 0xcc1855 : 0x00b4d8 });
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 4.2, 12), tubeMat);
      tube.position.set(x, 2.3, -2.75);
      stageBgGroup.add(tube);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.08, 0.08), trussMat);
    beam.position.set(0, 4.0, -2.8);
    stageBgGroup.add(beam);

    // Two moving spotlights
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
    stageBgGroup.add(coneL);

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
    stageBgGroup.add(coneR);

    // Balanced 3-point lighting for natural human skin
    const ambient = new THREE.AmbientLight(0x222633, 1.2);
    scene.add(ambient);

    // Primary Key Light: warm frontal light that unifies facial planes
    const keyLight = new THREE.DirectionalLight(0xffeedd, 2.6);
    keyLight.position.set(0.6, 2.9, 2.6);
    scene.add(keyLight);

    // Soft neutral fill
    const fillLight = new THREE.DirectionalLight(0x607898, 1.0);
    fillLight.position.set(-1.8, 2.2, 2.2);
    scene.add(fillLight);

    // Soft rim accents (gentle edge definition)
    const rimL = new THREE.DirectionalLight(0x991850, 0.9);
    rimL.position.set(-2.2, 2.4, -1.2);
    scene.add(rimL);

    const rimR = new THREE.DirectionalLight(0x0e7899, 0.9);
    rimR.position.set(2.2, 2.4, -1.2);
    scene.add(rimR);

    // Console Uplight (warm bounce on DJ chest and face)
    const consoleGlow = new THREE.PointLight(0xff9922, 0.8, 2.5);
    consoleGlow.position.set(0, 1.05, 0.45);
    scene.add(consoleGlow);

    // DJ Booth geometry
    const boothGroup = new THREE.Group();
    scene.add(boothGroup);

    // Full-width desk across the bottom (3.5m) to cleanly eliminate green gaps on the sides!
    const tableMat = new THREE.MeshStandardMaterial({
      color: 0x151720,
      roughness: 0.35,
      metalness: 0.8
    });
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.045, 0.65), tableMat);
    tableTop.position.set(0, 0.92, 0.38);
    boothGroup.add(tableTop);

    const standMat = new THREE.MeshStandardMaterial({
      color: 0x0a0c12,
      roughness: 0.7,
      metalness: 0.4
    });
    const stand = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.93, 0.55), standMat);
    stand.position.set(0, 0.45, 0.38);
    boothGroup.add(stand);

    const neonMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff });
    const neonLine = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.015, 0.01), neonMat);
    neonLine.position.set(0, 0.86, 0.66);
    boothGroup.add(neonLine);

    const logoMat = new THREE.MeshBasicMaterial({ color: 0xff0066 });
    const logoMesh = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.15, 6), logoMat);
    logoMesh.position.set(0, 0.52, 0.66);
    boothGroup.add(logoMesh);

    // CDJ Players
    const cdjMat = new THREE.MeshStandardMaterial({ color: 0x161822, roughness: 0.35, metalness: 0.85 });
    const platterMat = new THREE.MeshStandardMaterial({ color: 0x222632, roughness: 0.25, metalness: 0.95 });
    const jogCenterMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff });
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x00b4d8 });
    const cueMat = new THREE.MeshBasicMaterial({ color: 0xff8800 });
    const playMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });

    function createCDJ(x) {
      const g = new THREE.Group();
      g.position.set(x, 0.94 + 0.025, 0.38);

      const b = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 0.46), cdjMat);
      g.add(b);

      const platter = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.014, 32), platterMat);
      platter.position.set(0, 0.032, 0.05);
      g.add(platter);

      const jogDisplay = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.016, 24), jogCenterMat);
      jogDisplay.position.set(0, 0.033, 0.05);
      g.add(jogDisplay);

      const marker = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.018, 0.04), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      marker.position.set(0, 0.034, 0.12);
      g.add(marker);

      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.12), screenMat);
      scr.rotation.x = -Math.PI / 4.2;
      scr.position.set(0, 0.068, -0.13);
      g.add(scr);

      const cueBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.008, 16), cueMat);
      cueBtn.position.set(-0.12, 0.03, 0.15);
      g.add(cueBtn);

      const playBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.008, 16), playMat);
      playBtn.position.set(-0.12, 0.03, 0.19);
      g.add(playBtn);

      const pitchTrack = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.005, 0.12), new THREE.MeshBasicMaterial({ color: 0x333a48 }));
      pitchTrack.position.set(0.13, 0.03, 0.05);
      g.add(pitchTrack);
      const pitchKnob = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.015, 0.012), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
      pitchKnob.position.set(0.13, 0.036, 0.05);
      g.add(pitchKnob);

      return { group: g, platter, marker, jogDisplay };
    }

    const cdjL = createCDJ(-0.48);
    const cdjR = createCDJ(0.48);
    boothGroup.add(cdjL.group);
    boothGroup.add(cdjR.group);

    // 4-Channel Mixer
    const mixerChassis = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.055, 0.46),
      new THREE.MeshStandardMaterial({ color: 0x141620, roughness: 0.45, metalness: 0.8 })
    );
    mixerChassis.position.set(0, 0.94 + 0.027, 0.38);
    boothGroup.add(mixerChassis);

    const vuMatL = new THREE.MeshBasicMaterial({ color: 0xff8800 });
    const vuMatR = new THREE.MeshBasicMaterial({ color: 0xff8800 });
    const vuL = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.006, 0.14), vuMatL);
    vuL.position.set(-0.028, 0.995, 0.38);
    boothGroup.add(vuL);
    const vuR = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.006, 0.14), vuMatR);
    vuR.position.set(0.028, 0.995, 0.38);
    boothGroup.add(vuR);

    // Knobs / Faders
    const knobMat = new THREE.MeshStandardMaterial({ color: 0x2e3544, roughness: 0.25, metalness: 0.85 });
    for (let kx = -0.09; kx <= 0.09; kx += 0.06) {
      for (let kz = 0.26; kz <= 0.44; kz += 0.06) {
        const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.012, 16), knobMat);
        knob.position.set(kx, 0.975, kz);
        boothGroup.add(knob);
      }
    }
    const xfaderTrack = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.004, 0.012), new THREE.MeshBasicMaterial({ color: 0x333a48 }));
    xfaderTrack.position.set(0, 0.975, 0.52);
    boothGroup.add(xfaderTrack);
    const xfaderKnob = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.014, 0.02), new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
    xfaderKnob.position.set(0, 0.982, 0.52);
    boothGroup.add(xfaderKnob);

    let mixer = null;
    let actions = {};
    let bones = {};
    let djGroup = null;
    let isReady = false;

    window.init = (b64) => {
      return new Promise((resolve, reject) => {
        const raw = atob(b64);
        const uint8 = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) uint8[i] = raw.charCodeAt(i);
        const loader = new GLTFLoader();
        loader.parse(uint8.buffer, '', (gltf) => {
          djGroup = gltf.scene;
          gltf.scene.traverse((obj) => {
            if (obj.isMesh) {
              const geom = obj.geometry;
              geom.computeVertexNormals();

              const uv = geom.attributes.uv;
              const count = uv.count;
              const colors = new Float32Array(count * 3);

              // Exact Quaternius palette slot mapping:
              // idx 0: Skin (face, neck, arms, hands)
              // idx 1: Hair (dark natural hair)
              // idx 2: Sunglasses / eyes (sleek shades)
              // idx 3: Festival shirt (deep navy festival tee)
              // idx 6: Pants (charcoal trousers)
              // idx 4, 5, 9: Shoes / sneaker trim
              const skinColor   = new THREE.Color(0xdf9f7d);
              const hairColor   = new THREE.Color(0x1a1512);
              const shadesColor = new THREE.Color(0x141418);
              const shirtColor  = new THREE.Color(0x222a38);
              const pantsColor  = new THREE.Color(0x181a20);
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

              geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

              obj.material = new THREE.MeshStandardMaterial({
                vertexColors: true,
                roughness: 0.55,
                metalness: 0.05,
                flatShading: false
              });
            }
            if (obj.isBone) {
              bones[obj.name] = obj;
            }
          });

          // Procedural DJ Headphones around the neck
          const neckBone = gltf.scene.getObjectByName('Neck');
          if (neckBone) {
            const hpGroup = new THREE.Group();
            const hpMat = new THREE.MeshStandardMaterial({ color: 0x181820, roughness: 0.35, metalness: 0.85 });
            const cushionMat = new THREE.MeshStandardMaterial({ color: 0x282c35, roughness: 0.7, metalness: 0.2 });
            const silverMat = new THREE.MeshStandardMaterial({ color: 0xc0c8d4, roughness: 0.2, metalness: 0.9 });

            const headband = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.014, 12, 32, Math.PI * 1.5), hpMat);
            headband.rotation.x = Math.PI / 2.3;
            headband.rotation.z = Math.PI * 0.75;
            headband.position.set(0, -0.02, 0.02);
            hpGroup.add(headband);

            for (const side of [-1, 1]) {
              const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.028, 20), hpMat);
              cup.position.set(side * 0.11, -0.04, 0.05);
              cup.rotation.z = -side * 0.35;
              cup.rotation.y = -side * 0.20;
              const cush = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.040, 0.015, 20), cushionMat);
              cush.position.copy(cup.position);
              cush.rotation.copy(cup.rotation);
              const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.004, 8, 20), silverMat);
              rimMesh.position.copy(cup.position);
              rimMesh.rotation.copy(cup.rotation);
              hpGroup.add(cup);
              hpGroup.add(cush);
              hpGroup.add(rimMesh);
            }
            neckBone.add(hpGroup);
          }

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
        ambient.intensity = 1.8;
        keyLight.color.setHex(0xffffff);
        keyLight.intensity = 2.0;
        fillLight.color.setHex(0xffffff);
        fillLight.intensity = 1.1;
        rimL.intensity = 0;
        rimR.intensity = 0;
        consoleGlow.intensity = 0;
        neonMat.color.setHex(0x00d4ff);
        screenMat.color.setHex(0x00b4d8);
        jogCenterMat.color.setHex(0x00d4ff);
        cueMat.color.setHex(0xff8800);
        playMat.color.setHex(0x00ff66);
        vuMatL.color.setHex(0xff8800);
        vuMatR.color.setHex(0xff8800);
        logoMat.color.setHex(0xff0066);
      } else {
        scene.background = new THREE.Color(0x06070e);
        stageBgGroup.visible = true;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.92;
        ambient.color.setHex(0x222633);
        ambient.intensity = 1.2;
        keyLight.color.setHex(0xffeedd);
        keyLight.intensity = 2.6;
        fillLight.color.setHex(0x607898);
        fillLight.intensity = 1.0;
        rimL.intensity = 0.9;
        rimR.intensity = 0.9;
        consoleGlow.intensity = 0.8;
        neonMat.color.setHex(0x00d4ff);
        screenMat.color.setHex(0x00b4d8);
        jogCenterMat.color.setHex(0x00d4ff);
        cueMat.color.setHex(0xff8800);
        playMat.color.setHex(0x00ff66);
        vuMatL.color.setHex(0xff8800);
        vuMatR.color.setHex(0xff8800);
        logoMat.color.setHex(0xff0066);
      }
    };

    window.renderFrame = (time, totalDuration, variant) => {
      const loopRatio = time / totalDuration;
      const loopAngle = loopRatio * Math.PI * 2;
      const phase = 0.5 - 0.44 * Math.cos(loopAngle) + 0.06 * Math.sin(loopAngle * 2);

      if (variant === 'dj_groove') {
        // Professional resident DJ working the set:
        // Hands constantly active on CDJ platters and mixer knobs/faders
        actions['mixer_hands'].setEffectiveWeight(1.0);
        actions['idle_groove'].setEffectiveWeight(0.0);
        actions['fist_raise_drop'].setEffectiveWeight(0.0);
        actions['mixer_hands'].time = 1.0 + 3.0 * phase;
      } else if (variant === 'dj_drop') {
        // High-energy drop variant:
        // Build-up on mixer EQ/filters -> explosive right fist pump on the drop -> return to mixer
        const dropFactor = Math.pow(Math.sin(loopRatio * Math.PI), 4);
        actions['mixer_hands'].setEffectiveWeight(1.0 - dropFactor);
        actions['fist_raise_drop'].setEffectiveWeight(dropFactor);
        actions['idle_groove'].setEffectiveWeight(0.0);

        actions['mixer_hands'].time = 1.0 + 2.5 * phase;
        actions['fist_raise_drop'].time = 1.0 + 3.0 * phase;
      }

      mixer.update(0);

      // DJ Rhythmic Groove Offsets on Bones:
      // 20 beats per 10-second loop = 120 BPM club tempo
      const beatAngle = loopAngle * 20;

      // Realistic body bounce with music tempo
      if (djGroup) {
        djGroup.position.y = -0.012 + Math.abs(Math.sin(beatAngle)) * 0.024;
      }

      if (bones['Head']) {
        // Focused head nodding down toward decks to the beat + scanning between CDJs
        bones['Head'].rotation.x = -0.14 + Math.sin(beatAngle) * 0.065;
        bones['Head'].rotation.y = Math.sin(loopAngle * 2) * 0.09;
      }
      if (bones['Torso'] || bones['Chest']) {
        const bodyBone = bones['Chest'] || bones['Torso'];
        bodyBone.rotation.z = Math.sin(loopAngle * 4) * 0.035;
      }

      // High-energy fist pumping to the beat during the drop!
      if (variant === 'dj_drop' && bones['UpperArmR']) {
        const dropFactor = Math.pow(Math.sin(loopRatio * Math.PI), 4);
        bones['UpperArmR'].rotation.x += dropFactor * Math.sin(beatAngle) * 0.22;
      }

      // Platter spin: exact 10 revolutions over 10s loop (60 RPM CDJ feel)
      const platterAngle = loopAngle * 10;
      cdjL.platter.rotation.y = platterAngle;
      cdjL.marker.rotation.y = platterAngle;
      cdjR.platter.rotation.y = -platterAngle;
      cdjR.marker.rotation.y = -platterAngle;

      // VU meters pulse with beat
      const vuScale = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(beatAngle));
      vuL.scale.set(1, 1, vuScale);
      vuR.scale.set(1, 1, 0.4 + 0.6 * (0.5 + 0.5 * Math.cos(beatAngle)));

      // Crossfader subtle movement between channels
      xfaderKnob.position.x = 0.035 * Math.sin(loopAngle * 2);

      // Subtle handheld / crane camera breathe with non-zero derivative across loop
      camera.position.x = 0.045 * Math.sin(loopAngle) + 0.014 * Math.cos(loopAngle * 2);
      camera.position.y = 1.72 + 0.020 * Math.cos(loopAngle) + 0.010 * Math.sin(loopAngle * 2);
      camera.lookAt(0, 1.28 + 0.012 * Math.sin(loopAngle), 0.25);

      // Club mode lighting sweeps
      if (renderer.toneMapping !== THREE.NoToneMapping) {
        rimL.position.x = -2.2 + 0.35 * Math.sin(loopAngle);
        rimR.position.x = 2.2 + 0.35 * Math.cos(loopAngle);
        coneL.rotation.z = 0.28 + 0.15 * Math.sin(loopAngle);
        coneR.rotation.z = -0.28 - 0.15 * Math.cos(loopAngle);
      }

      renderer.render(scene, camera);
      return canvas.toDataURL('image/png').slice(22);
    };

    window.ready = true;
  </script>
</body>
</html>`;
}

const browser = await chromium.launch({
  headless: true,
  args: ['--ignore-gpu-blocklist', '--enable-webgl', '--use-gl=angle', '--use-angle=d3d11']
});

try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => window.ready === true);
  await page.evaluate((b64) => window.init(b64), glbBase64);

  for (const job of jobs) {
    const v = loopsConfig[job.variant];
    const look = job.look;
    const W = 1920, H = 1080, FPS = v.fps, secs = v.seconds;
    const N = Math.round(secs * FPS);
    const outName = `${job.variant}_${look}`;

    console.log(`\n=== [${job.variant}] Look: ${look} | ${W}x${H} ${N} frames (${secs}s @ ${FPS}fps) ===`);

    await page.evaluate((l) => window.setMode(l), look);

    if (cmd === 'test') {
      const scratchDir = join(shift, '_scratch');
      mkdirSync(scratchDir, { recursive: true });
      const testPicks = [0, 2.5, 5.0, 7.5];
      for (let idx = 0; idx < testPicks.length; idx++) {
        const t = testPicks[idx];
        const b64 = await page.evaluate(([curTime, dur, varName]) => window.renderFrame(curTime, dur, varName), [t, secs, job.variant]);
        const p = join(scratchDir, `${outName}_f${idx}.png`);
        writeFileSync(p, Buffer.from(b64, 'base64'));
        console.log(`  test frame ${idx} (t=${t}s) -> ${p}`);
      }
      continue;
    }

    // Full Render mode
    const outDir = join(root, 'ai_dj');
    mkdirSync(outDir, { recursive: true });
    const outBase = join(outDir, outName);
    const mp4Path = outBase + '.mp4';
    const webmPath = outBase + '.webm';

    const crf = look === 'green' ? '12' : '18';
    const mbps = look === 'green' ? '12M' : '8M';

    const ff = spawn('ffmpeg', [
      '-y', '-v', 'error',
      '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      // MP4 stream
      '-map', '0:v', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
      '-crf', crf, '-preset', 'slow', '-movflags', '+faststart', mp4Path,
      // WebM stream
      '-map', '0:v', '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuv420p',
      '-crf', '30', '-b:v', mbps, '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', webmPath
    ], { stdio: ['pipe', 'inherit', 'inherit'] });

    ff.stdin.on('error', () => {});
    const done = new Promise((res) => ff.on('close', res));

    const startTime = Date.now();
    for (let i = 0; i < N; i++) {
      const curTime = i / FPS;
      const b64 = await page.evaluate(([t, dur, varName]) => window.renderFrame(t, dur, varName), [curTime, secs, job.variant]);
      if (!ff.stdin.write(Buffer.from(b64, 'base64'))) {
        await new Promise((r) => ff.stdin.once('drain', r));
      }
      if (i % 60 === 0 || i === N - 1) {
        process.stdout.write(`  Rendering frame ${i + 1}/${N} (${Math.round((i + 1) / N * 100)}%)\r`);
      }
    }
    ff.stdin.end();
    const code = await done;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (code !== 0) {
      console.error(`\nFFmpeg failed with exit code ${code} for ${outName}`);
      process.exitCode = 1;
      break;
    }
    console.log(`\n  Done in ${elapsed}s -> ${mp4Path} & ${webmPath}`);
    console.log(`  Next verify with: node tools/checks.mjs "${mp4Path}" --kind dj`);
  }
} finally {
  await browser.close();
  server.close();
}

