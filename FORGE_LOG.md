# Creature Forge: Production Log (`FORGE_LOG.md`)

## 2026-10-29 — festival_raver (Phase 1 & 2 Bootstrap)
- **Status:** in progress (Mesh & Rig compiled; renders pending headless test)
- **Metrics:** `784.7 KB` | `1,464 tris` | `24 bones` | Clips: `idle`, `walk`, `dance_1`, `dance_2`, `dance_3`
- **Output:** [festival_raver.glb](file:///c:/Users/agraw/Downloads/backups/Gemini/3D%20models/characters/festival_raver/festival_raver.glb)
- **Tools + method used:**
  - `tools/texture-baker.mjs`: Procedural PBR textures (`baseColor`, `metallicRoughness`, `normal`, and neon `emissive`).
  - `tools/glb-builder.mjs`: Parametric lofted anatomical geometry kernel with 4-bone envelope skinning.
  - `tools/rig-humanoid.mjs`: Mixamo-compatible 24-bone skeleton + multi-harmonic Fourier motion synthesis (5 seamless looping clips).
  - `tools/build-festival-raver.mjs`: glTF 2.0 binary compiler via `@gltf-transform/core`.
- **What worked:**
  - Successfully compiled a standalone binary `.glb` (784.7 KB) with 5 distinct baked animation clips, embedded PBR textures, and normalized skin weights.
- **Next steps when resuming:**
  - Serve HTML harness over a local HTTP port for Playwright to capture the render screenshots and contact sheets.

## 2026-10-29 — festival_raver
- **Status:** done
- **Metrics:** `838.6 KB` | `5,500 tris` | `62 bones` | Clips: `walk`, `dance_1`, `dance_2`, `dance_3`
- **Output:** [festival_raver.glb](file:///c:/Users/agraw/Downloads/backups/Gemini/3D%20models/characters/festival_raver/festival_raver.glb)
- **Tools + method used:**
  - `tools/texture-atlas.mjs`: Procedural 16-slot PBR + Emissive Texture Atlas resolving slot assignments for skin, hair, eyes, puffer vest, techwear cargo joggers, boots, and hardware.
  - `tools/hero-humanoid.mjs`: glTF 2.0 compiler unpacking compressed mesh data, applying float32 weights, wiring the 62-joint `CharacterArmature` skeleton, and baking Walk + 3 Psytrance dance loops (`gST_a`, `gPU_a`, `gFL_a`).
  - `tools/verify-and-render.mjs`: Automated headless Chromium Playwright test harness generating daylight turnaround, dark rave lighting, and animation contact sheets.
- **What worked:**
  - Beautiful skin, techwear clothing, and cyan/magenta emissive accents popping under night lighting.
  - Seamless, planted looping animations without any mesh tearing.
- **Ideas for the next one:**
  - Build Character #2: `dj_decks` (Resident Festival DJ) with asymmetric vest, studio headphones, and mixer/crossfader hand animations (`gDJ_a`).
## 2026-10-29 — desert_wanderer
- **Status:** done
- **Metrics:** `1,200.5 KB` | `8,806 tris` | `62 bones` | Clips: `walk`, `idle`, `wave`
- **Output:** [desert_wanderer.glb](file:///c:/Users/agraw/Downloads/backups/Gemini/3D%20models/characters/desert_wanderer/desert_wanderer.glb)
- **Tools + method used:**
  - `tools/texture-atlas.mjs`: Desert Nomad PBR palette (warm sand, weathered poncho, brass dust goggles with amber glow).
  - `tools/hero-humanoid.mjs`: Multi-directory source search locating `crowd_m_Adventurer.gltf`, baked walk cycle, horizon sway, and signalling wave.
  - `tools/verify-and-render.mjs`: Automated headless verification and rendering.
- **What worked:**
  - Distinct nomad silhouette with glowing amber goggles and weathered earth tones.
## 2026-10-29 — dj_decks
- **Status:** done
- **Metrics:** `874.3 KB` | `5,776 tris` | `62 bones` | Clips: `walk`, `mixer_hands`, `fist_raise_drop`, `idle_groove`
- **Output:** [dj_decks.glb](file:///c:/Users/agraw/Downloads/backups/Gemini/3D%20models/characters/dj_decks/dj_decks.glb)
- **What worked:**
  - Distinct festival DJ with glowing amber headphones, asymmetric vest, and active mixer/fist-raise animation clips (`gDJ_a`, `gPU_a`, `gHU_a`).

## 2026-10-29 — deep_sea_diver
- **Status:** done
- **Metrics:** `836.4 KB` | `5,476 tris` | `62 bones` | Clips: `walk`, `swim`, `idle`
- **Output:** [deep_sea_diver.glb](file:///c:/Users/agraw/Downloads/backups/Gemini/3D%20models/characters/deep_sea_diver/deep_sea_diver.glb)
- **What worked:**
  - Copper/brass breastplate and glowing aqua porthole eyes with underwater breaststroke drag (`gSM_a`).
## 2026-10-29 — manta_ray
- **Status:** done
- **Metrics:** `951.3 KB` | `6,912 tris` | `16 bones` | Clips: `glide`, `bank`, `barrel_roll`
- **Output:** [manta_ray.glb](file:///c:/Users/agraw/Downloads/backups/Gemini/3D%20models/characters/manta_ray/manta_ray.glb)
- **Tools + method used:**
  - `tools/build-manta-ray.mjs`: Parametric diamond-hydrofoil geometry generator with cephalic horns, dual-surface winding, and spanwise bone hierarchy.
  - `tools/texture-baker.mjs`: In-memory PBR texture synthesis with dorsal constellation spots and ventral ivory shading.
  - `tools/render-manta.mjs`: Headless Playwright Three.js verification confirming graceful pelagic wing waves and vivid bioluminescent glow.
- **What worked:**
  - Distinct 3.2m pelagic creature with fluid sinusoidal wing propagation and zero seam pops.
## 2026-10-29 — biolum_jellyfish
- **Status:** done
- **Metrics:** `118.0 KB` | `2,176 tris` | `20 bones` | Clips: `pulse`, `drift`
- **Output:** [biolum_jellyfish.glb](file:///c:/Users/agraw/Downloads/backups/Gemini/3D%20models/characters/biolum_jellyfish/biolum_jellyfish.glb)
- **Tools + method used:**
  - `tools/build-jellyfish.mjs`: Parametric umbrella bell dome with flared rim and 8 double-sided ribbon tentacles.
  - Procedural PBR + dual-channel emission (translucent cyan bell with 8 neon magenta radial canals).
  - Headless Three.js render confirmation with fluid bell pulsing and tentacle lag undulation.
- **What worked:**
  - Ultra-clean 118 KB asset that glows in dark water worlds and compresses elastically.
## 2026-10-29 — school_fish
- **Status:** done
- **Metrics:** `28.5 KB` | `384 tris` | `6 bones` | Clips: `swim`, `dart`
- **Output:** [school_fish.glb](file:///c:/Users/agraw/Downloads/backups/Gemini/3D%20models/characters/school_fish/school_fish.glb)
- **What worked:**
  - Ultra-lightweight 28.5 KB instanced reef fish with metallic iridescent scales and electric cyan lateral neon glow.
## 2026-10-29 — desert_fox
- **Status:** done
- **Metrics:** `55.5 KB` | `816 tris` | `18 bones` | Clips: `trot`, `idle`
- **Output:** [desert_fox.glb](file:///c:/Users/agraw/Downloads/backups/Gemini/3D%20models/characters/desert_fox/desert_fox.glb)
- **What worked:**
  - Charming 0.42m fennec fox with oversized ears, white-tipped brush tail, and diagonal 2-beat trot loop with grounded paws.
