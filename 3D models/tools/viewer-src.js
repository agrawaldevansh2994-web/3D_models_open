import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

window.THREE = THREE;
window.GLTFLoader = GLTFLoader;
window.isReady = false;
window.modelInfo = null;

const W = 1280;
const H = 960;
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H);
renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.88;
renderer.shadowMap.enabled = true;
renderer.autoClear = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, W / H, 0.05, 100);

// Fixed Light Pool
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
dirLight.position.set(2.2, 3.8, 3.2);
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0x6080a0, 0.65);
fillLight.position.set(-2.2, 2.0, -2.0);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xff00aa, 0.4);
rimLight.position.set(0, 2.5, -3.0);
scene.add(rimLight);

// Ground Plane + Subtle Reference Grid
const groundGeo = new THREE.PlaneGeometry(12, 12);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x181a20, roughness: 0.82, metalness: 0.08 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const grid = new THREE.GridHelper(6, 12, 0x2e3545, 0x222632);
grid.position.y = 0.001;
scene.add(grid);

let mixer = null;
let currentGLTF = null;

window.loadModel = (glbBase64) => {
  const raw = atob(glbBase64);
  const uint8 = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) uint8[i] = raw.charCodeAt(i);

  const loader = new GLTFLoader();
  loader.parse(uint8.buffer, '', (gltf) => {
    if (currentGLTF) scene.remove(currentGLTF.scene);
    currentGLTF = gltf;
    scene.add(gltf.scene);

    mixer = gltf.animations && gltf.animations.length > 0
      ? new THREE.AnimationMixer(gltf.scene)
      : null;

    const skinnedMeshes = [];
    let totalTris = 0;
    gltf.scene.traverse((obj) => {
      if (obj.isSkinnedMesh || obj.isMesh) {
        skinnedMeshes.push(obj.name || obj.uuid);
        const idx = obj.geometry.index;
        const pos = obj.geometry.attributes.position;
        totalTris += idx ? idx.count / 3 : (pos ? pos.count / 3 : 0);
      }
    });

    window.mixer = mixer;
    window.modelInfo = {
      clipNames: gltf.animations ? gltf.animations.map(a => a.name) : [],
      clipChannels: gltf.animations ? gltf.animations.map(a => ({ name: a.name, tracks: a.tracks.length, duration: a.duration })) : [],
      hasSkin: !!gltf.scene.getObjectByProperty('type', 'SkinnedMesh'),
      meshNames: skinnedMeshes,
      triangles: totalTris,
    };
    window.isReady = true;
    window.setLighting('daylight');
    window.setCamera(0, 2.7, 1.05, 0.92);
  }, (err) => {
    console.error('GLTF load error:', err);
  });
};

window.setLighting = (mode) => {
  if (mode === 'daylight') {
    scene.background = new THREE.Color(0x20242c);
    scene.fog = null;
    ambientLight.color.setHex(0xffffff);
    ambientLight.intensity = 0.55;
    dirLight.color.setHex(0xfff6ec);
    dirLight.intensity = 1.35;
    fillLight.color.setHex(0x7c96b8);
    fillLight.intensity = 0.65;
    rimLight.color.setHex(0xd8e4ff);
    rimLight.intensity = 0.45;
    ground.material.color.setHex(0x1a1d24);
  } else if (mode === 'rave') {
    scene.background = new THREE.Color(0x05030c);
    scene.fog = new THREE.FogExp2(0x05030c, 0.12);
    ambientLight.color.setHex(0x160728);
    ambientLight.intensity = 0.22;
    dirLight.color.setHex(0x00f0ff);
    dirLight.intensity = 0.85;
    fillLight.color.setHex(0xff1088);
    fillLight.intensity = 0.95;
    rimLight.color.setHex(0x7b2cff);
    rimLight.intensity = 0.90;
    ground.material.color.setHex(0x070610);
  }
};

window.resetPose = () => {
  if (!mixer || !currentGLTF) return;
  mixer.stopAllAction();
  if (currentGLTF.animations.length > 0) {
    const action = mixer.clipAction(currentGLTF.animations[0]);
    action.play();
    mixer.setTime(0);
    action.stop();
  }
  currentGLTF.scene.updateMatrixWorld(true);
};

window.setCamera = (yawDeg, dist = 2.7, y = 1.05, targetY = 0.92) => {
  renderer.setViewport(0, 0, W, H);
  renderer.setScissor(0, 0, W, H);
  renderer.setScissorTest(false);
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  const rad = (yawDeg * Math.PI) / 180;
  camera.position.set(Math.sin(rad) * dist, y, Math.cos(rad) * dist);
  camera.lookAt(0, targetY, 0);
  renderer.clear();
  renderer.render(scene, camera);
};

/**
 * Renders a 3-angle turntable (Front 0°, Side 90°, Back 180°) side-by-side in a single 1280x960 frame.
 */
window.renderTurntable = (mode = 'daylight', dist = 2.55, y = 1.02, targetY = 0.90) => {
  window.setLighting(mode);
  if (mixer && currentGLTF && currentGLTF.animations.length > 0) {
    mixer.stopAllAction();
    const idleClip = currentGLTF.animations.find(a => a.name === 'idle') || currentGLTF.animations[0];
    const act = mixer.clipAction(idleClip);
    act.play();
    mixer.setTime(0);
  }

  renderer.setViewport(0, 0, W, H);
  renderer.setScissorTest(false);
  renderer.clear();
  renderer.setScissorTest(true);

  const angles = [0, 90, 180];
  const panelW = Math.floor(W / 3);

  for (let i = 0; i < 3; i++) {
    const x0 = i * panelW;
    const pw = i === 2 ? W - x0 : panelW;
    renderer.setViewport(x0, 0, pw, H);
    renderer.setScissor(x0, 0, pw, H);
    camera.aspect = pw / H;
    camera.updateProjectionMatrix();

    const rad = (angles[i] * Math.PI) / 180;
    camera.position.set(Math.sin(rad) * dist, y, Math.cos(rad) * dist);
    camera.lookAt(0, targetY, 0);
    renderer.render(scene, camera);
  }
  renderer.setScissorTest(false);
};

/**
 * Renders a 6-frame animation strip (3 columns x 2 rows) across phases [0, 1/6, 2/6, 3/6, 4/6, 5/6].
 */
window.renderClipStrip = (clipName, mode = 'daylight', dist = 2.55, y = 1.04, targetY = 0.90, customYaw = null) => {
  window.setLighting(mode);
  if (!mixer || !currentGLTF) return false;
  const clip = currentGLTF.animations.find(a => a.name === clipName) || currentGLTF.animations[0];
  if (!clip) return false;

  renderer.setViewport(0, 0, W, H);
  renderer.setScissorTest(false);
  renderer.clear();
  renderer.setScissorTest(true);

  const cols = 3;
  const rows = 2;
  const pw = Math.floor(W / cols);
  const ph = Math.floor(H / rows);

  for (let f = 0; f < 6; f++) {
    const col = f % cols;
    const row = Math.floor(f / cols);
    const x0 = col * pw;
    // WebGL viewport y=0 is bottom, so top row is row=0 -> y0 = ph
    const y0 = (rows - 1 - row) * ph;

    mixer.stopAllAction();
    const action = mixer.clipAction(clip);
    action.play();
    const phase = f / 6;
    mixer.setTime(clip.duration * phase);

    renderer.setViewport(x0, y0, pw, ph);
    renderer.setScissor(x0, y0, pw, ph);
    camera.aspect = pw / ph;
    camera.updateProjectionMatrix();

    const yawDeg = customYaw !== null ? customYaw : 18; // Slight 3/4 angle so depth, foot lock & arm trajectories read clearly
    const rad = (yawDeg * Math.PI) / 180;
    camera.position.set(Math.sin(rad) * dist, y, Math.cos(rad) * dist);
    camera.lookAt(0, targetY, 0);
    renderer.render(scene, camera);
  }
  renderer.setScissorTest(false);
  return true;
};

/**
 * Renders a 2-panel close-up: Panel 1 = Face/Head/Visor close-up, Panel 2 = 5-Finger Hand & Upper Jacket detail.
 */
window.renderFaceCloseup = (mode = 'daylight', headY = 1.62, handPos = [0.60, 1.02, 0.02]) => {
  window.setLighting(mode);
  if (mixer && currentGLTF && currentGLTF.animations.length > 0) {
    mixer.stopAllAction();
    const idleClip = currentGLTF.animations.find(a => a.name === 'idle') || currentGLTF.animations[0];
    const act = mixer.clipAction(idleClip);
    act.play();
    mixer.setTime(0);
  }

  renderer.setViewport(0, 0, W, H);
  renderer.setScissorTest(false);
  renderer.clear();
  renderer.setScissorTest(true);

  const halfW = Math.floor(W / 2);

  // Left Half: Tight Face Close-up (eyes, nose, lips, visor, braids)
  renderer.setViewport(0, 0, halfW, H);
  renderer.setScissor(0, 0, halfW, H);
  camera.aspect = halfW / H;
  camera.updateProjectionMatrix();
  camera.position.set(0.06, headY + 0.01, 0.52);
  camera.lookAt(0, headY - 0.01, 0.02);
  renderer.render(scene, camera);

  // Right Half: 3/4 Upper Body + 5-Finger Hand Close-up
  renderer.setViewport(halfW, 0, W - halfW, H);
  renderer.setScissor(halfW, 0, W - halfW, H);
  camera.aspect = (W - halfW) / H;
  camera.updateProjectionMatrix();
  camera.position.set(handPos[0] + 0.18, handPos[1] + 0.08, handPos[2] + 0.48);
  camera.lookAt(handPos[0] * 0.75, handPos[1] - 0.02, handPos[2]);
  renderer.render(scene, camera);

  renderer.setScissorTest(false);
};
