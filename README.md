# Creature Forge: 3D Models for Playa Art

Original, fully rigged, and animated 3D characters engineered specifically for **Three.js** and WebGL worlds (built for [Playa Art](https://www.3dart.co.in)).

Every character is a single self-contained binary glTF 2.0 (`.glb`) file with zero external URI dependencies, true multi-bone skinning, procedural PBR + emissive materials, and seamless looping animation clips baked directly into the file.

---

## 🌟 The Roster (13 Characters Complete)

| Character | Category | Size | Triangles | Bones | Baked Animation Clips |
|---|---|---|---|---|---|
| [`festival_raver`](characters/festival_raver/) | Hero Humanoid | 838 KB | 5,500 | 62 | `walk`, `dance_1` (shuffle), `dance_2` (stomp), `dance_3` (trance) |
| [`dj_decks`](characters/dj_decks/) | Resident DJ | 874 KB | 5,776 | 62 | `walk`, `mixer_hands`, `fist_raise_drop`, `idle_groove` |
| [`desert_wanderer`](characters/desert_wanderer/) | Playa Nomad | 1,200 KB | 8,806 | 62 | `walk`, `idle`, `wave` |
| [`deep_sea_diver`](characters/deep_sea_diver/) | Abyssal Diver | 836 KB | 5,476 | 62 | `walk`, `swim`, `idle` |
| [`manta_ray`](characters/manta_ray/) | Pelagic Marine | 951 KB | 6,912 | 16 | `glide`, `bank`, `barrel_roll` |
| [`biolum_jellyfish`](characters/biolum_jellyfish/) | Abyssal Jelly | 118 KB | 2,176 | 20 | `pulse`, `drift` |
| [`school_fish`](characters/school_fish/) | Swarm Unit | 28 KB | 384 | 6 | `swim`, `dart` |
| [`desert_fox`](characters/desert_fox/) | Land Creature | 55 KB | 816 | 18 | `trot`, `idle` |
| [`forest_spirit`](characters/forest_spirit/) | Land Creature | 79 KB | 1,320 | 13 | `idle`, `walk`, `dance_1`, `pulse` |
| [`bird_of_prey`](characters/bird_of_prey/) | Sky Raptor | 73 KB | 904 | 15 | `soar`, `flap`, `land` |
| [`firefly_moth`](characters/firefly_moth/) | Swarm Unit | 60 KB | 528 | 10 | `fly`, `hover`, `rest` |
| [`paraglider_pilot`](characters/paraglider_pilot/) | Sky Flyer | 53 KB | 726 | 12 | `glide`, `bank_turn`, `thermal_climb` |
| [`festival_mech`](characters/festival_mech/) | Art-Car Machine | 87 KB | 1,152 | 16 | `idle`, `walk`, `rave_mode`, `stomp` |

---

## 📐 Technical Specification

- **Binary glTF 2.0 (`.glb`):** Single binary container with embedded textures and buffer data. Zero runtime network requests.
- **Strict Coordinate Convention:** Planted at world origin $(0, 0, 0)$, facing $+Z$ (`[0, 0, 1]`), $+Y$ up, real-world metric scale.
- **Normalized Vertex Skin Weights:** All `WEIGHTS_0` are normalized `Float32Array` values ($\sum w_i = 1.0$), ensuring zero vertex collapse or spike artifacts across mobile and desktop WebGL runtimes.
- **Mixamo Armature Compatibility:** Humanoids use standard `CharacterArmature` / `mixamorig:` naming, allowing cross-targeting of Mixamo and custom BVH clips.
- **PBR + Emissive Shading:** Procedural `baseColor`, `metallicRoughness`, `normal`, and high-contrast `emissive` textures embedded as PNG. Designed to pop under dark rave / bioluminescent lighting and maintain crisp geometric contrast in daylight.
- **Multi-Harmonic Fourier Motion Synthesis:** Animation loops are sampled at 30 fps using continuous harmonic series $\theta(t) = \theta_0 + \sum (a_k \sin(\dots) + b_k \cos(\dots))$, guaranteeing $C^\infty$ loop continuity without seam popping.

---

## 🚀 Quick Start (Three.js)

```javascript
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
loader.load('characters/festival_mech/festival_mech.glb', (gltf) => {
  const model = gltf.scene;
  scene.add(model);

  // Play animation clip
  const mixer = new THREE.AnimationMixer(model);
  const clip = THREE.AnimationClip.findByName(gltf.animations, 'rave_mode');
  if (clip) {
    mixer.clipAction(clip).play();
  }
});
```

---

## 🛠️ Toolchain (`tools/`)

- `tools/glb-builder.mjs`: Parametric lofted-tube geometry generator and 4-bone envelope skinning.
- `tools/texture-baker.mjs`: Procedural PBR and tangent normal map baker.
- `tools/texture-atlas.mjs`: 16-slot PBR material atlas generator.
- `tools/hero-humanoid.mjs`: Universal compiler for hero humanoids with Mixamo-compatible armatures.
- `tools/viewer-bundle.js`: Bundled Three.js r186 viewer for headless Playwright render verification.
- `tools/audit-all.mjs`: Automated test harness verifying all 13 assets in headless Chromium.

---

## 📁 Repository Structure

```text
characters/
  <character_name>/
    <character_name>.glb      # Standalone binary glTF 2.0 asset
    NOTES.md                  # Character specs, bone count, triangle count, clip list
    concept/
      turnaround_sheet.png    # Orthographic turnaround sheet
    renders/
      daylight_turnaround.png # PBR studio daylight capture
      rave_lighting.png       # Dark neon rave / bioluminescent lighting
      animation_strip.png     # Keyframe contact sheet
tools/                        # Procedural build and verification toolchain
FORGE_LOG.md                  # Executive summary and engineering run log
```

---

## 📄 License

MIT
