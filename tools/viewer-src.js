import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

window.THREE = THREE;
window.GLTFLoader = GLTFLoader;
window.isReady = false;
window.modelInfo = null;

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(1280, 960);
renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.88;
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1280 / 960, 0.1, 100);
camera.position.set(0, 1.1, 3.0);
camera.lookAt(0, 0.95, 0);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(2, 4, 3);
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0x6080a0, 0.6);
fillLight.position.set(-2, 2, -2);
scene.add(fillLight);

// Ground
const groundGeo = new THREE.PlaneGeometry(10, 10);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x181a1e, roughness: 0.8 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

let mixer = null;
let currentGLTF = null;

window.loadModel = (glbBase64) => {
  const raw = atob(glbBase64);
  const uint8 = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) uint8[i] = raw.charCodeAt(i);

  const loader = new GLTFLoader();
  loader.parse(uint8.buffer, '', (gltf) => {
    if (currentGLTF) {
      scene.remove(currentGLTF.scene);
    }
    currentGLTF = gltf;
    scene.add(gltf.scene);

    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(gltf.scene);
    } else {
      mixer = null;
    }

    window.mixer = mixer;
    window.modelInfo = {
      clipNames: gltf.animations ? gltf.animations.map(a => a.name) : [],
      hasSkin: !!gltf.scene.getObjectByProperty('type', 'SkinnedMesh'),
    };
    window.isReady = true;
    renderer.render(scene, camera);
  }, (err) => {
    console.error('GLTF load error:', err);
  });
};

window.setLighting = (mode) => {
  if (mode === 'daylight') {
    scene.background = new THREE.Color(0x22252a);
    scene.fog = null;
    ambientLight.color.setHex(0xffffff);
    ambientLight.intensity = 0.5;
    dirLight.color.setHex(0xfff5ea);
    dirLight.intensity = 1.3;
    fillLight.intensity = 0.6;
    ground.material.color.setHex(0x181a1e);
  } else if (mode === 'rave') {
    scene.background = new THREE.Color(0x05030a);
    scene.fog = new THREE.FogExp2(0x05030a, 0.15);
    ambientLight.color.setHex(0x1a0526);
    ambientLight.intensity = 0.15;
    dirLight.color.setHex(0x00ffff);
    dirLight.intensity = 0.7;
    fillLight.color.setHex(0xff0077);
    fillLight.intensity = 0.9;
    ground.material.color.setHex(0x06060c);
  }
};

window.setCamera = (yawDeg, dist = 2.8, y = 1.05, targetY = 0.95) => {
  const rad = (yawDeg * Math.PI) / 180;
  camera.position.set(Math.sin(rad) * dist, y, Math.cos(rad) * dist);
  camera.lookAt(0, targetY, 0);
  renderer.render(scene, camera);
};

window.playClip = (clipName, phase0to1) => {
  if (!mixer || !currentGLTF) return;
  mixer.stopAllAction();
  const clip = currentGLTF.animations.find(a => a.name === clipName);
  if (!clip) return;
  const action = mixer.clipAction(clip);
  action.play();
  mixer.setTime(clip.duration * phase0to1);
  renderer.render(scene, camera);
};

