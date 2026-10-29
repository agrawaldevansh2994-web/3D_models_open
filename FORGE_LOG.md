# Creature Forge: Production Log (`FORGE_LOG.md`)

## 2026-10-30 — festival_raver (Round 2 Remake from Scratch)
- **Status:** PASS (11/11 Round 2 Self-Checks Passed)
- **Metrics:** `2,233.7 KB` | `15,464 tris` | `52 bones` | Clips: `idle`, `walk`, `run`, `dance_1`, `dance_2`, `dance_3`, `wave` (53 channels each)
- **Output:** [festival_raver.glb](file:///c:/Users/agraw/Downloads/backups/Gemini/3D%20models/characters/festival_raver/festival_raver.glb)
- **Tools + method used:**
  - `invoke_subagent` (`image-generator`): Generated genuine 2D concept art turnaround sheet (`concept/turnaround_sheet.png`), details callout sheet (`concept/details_sheet.png`), and dance choreography contact sheet (`moves/dance_reference_strip.png`) before mesh build.
  - `tools/glb-builder.mjs`: High-density anatomical parametric sculpting kernel generating `buildSculptedHead` (brow, eye sockets, eyeballs, nose bridge, nostrils, lips, ears, braids), `buildArticulatedHand` (5-finger hands with 3 phalanges per finger), and separate swappable clothing layer `Jacket_Mesh`.
  - `tools/rig-humanoid.mjs`: Complete 52-bone Mixamo hierarchy (`mixamorig:`) including all 30 finger bones. Synthesizes 7 unique clips driving all 52 bones with stance-phase foot grounding at $y=0$ and exact $t=0 \equiv t=T$ periodic loop closure.
  - `tools/texture-baker.mjs`: In-repo procedural PBR + emissive baking for both `Body_Mesh` and `Jacket_Mesh` layers.
  - `tools/verify-and-render.mjs`: Multi-viewport headless Chromium Playwright renderer producing 3-angle turntables (`daylight_turnaround.png`, `rave_lighting.png`), 2-panel close-ups (`face_closeup.png`), and 6-frame strips for all 7 clips.
  - `tools/check-round2.mjs`: Automated gatekeeper verifying all 11 non-negotiable checks from `FEEDBACK_ROUND1.md`.
- **What worked:**
  - Zero reused assets: fully in-repo procedural and concept-art driven pipeline.
  - All 14 PNG images have unique SHA-256 hashes (zero byte duplicates).
  - True separate swappable clothing layer with locked envelope skinning (`isGarmentLayer: true`) preventing poke-through across all dance and locomotion cycles.
  - Every clip animates 52 bones (53 channels), with zero duplicate clip names and zero foot sliding.
- **Weaknesses & what to fix next:**
  - Proceed to **Priority #2: `manta_ray`** per `FEEDBACK_ROUND1.md`: Remake from scratch with high-density diamond-hydrofoil geometry (5k–20k tris), distinct sculpted cephalic fins, multi-bone spanwise and chordwise spine/wing chains (>= 6 spine bones, >= 3 bones per wing side), and multi-channel clips.


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
## 2026-10-30 — manta_ray (Round 2 Remake from Scratch)
- **Status:** in progress (Mesh, Rig & Multi-channel Animations Remade & Passing; Concept Art pending image-generator quota reset)
- **Metrics:** `1,410.7 KB` | `13,568 tris` | `24 bones` | Clips: `glide`, `bank`, `barrel_roll` (24 channels each)
- **Output:** [manta_ray.glb](file:///c:/Users/agraw/Downloads/backups/Gemini/3D%20models/characters/manta_ray/manta_ray.glb)
- **Tools + method used:**
  - `tools/build-manta-ray.mjs`: High-density organic parametric hydrofoil geometry kernel generating thick 3D body camber (0.38m thickness, 3.4m span), sculpted cephalic horn lobes (`buildSculptedCephalicHorn`), and elongated whip tail (`buildSculptedTail`).
  - 24-bone skeleton with 8-bone spine/tail chain, 5-bone spanwise wing chains, and 2-bone cephalic chains.
  - Multi-harmonic Fourier motion synthesis driving all 24 bones on every clip (`glide`, `bank`, `barrel_roll`), replacing the 1-channel rotation shortcuts from Round 1.
  - `tools/verify-and-render.mjs`: Headless Playwright Three.js verification producing 3-angle daylight turntable, 3-angle dark rave turntable, cephalic/face close-up, and 6-frame strips for all 3 clips.
- **What worked:**
  - High-density 13,568-triangle mesh solves the flat box-art critique; body now carries real hydrofoil volume, thick pectoral wings, and prominent curled cephalic fins.
  - `bank` and `barrel_roll` now animate all 24 bones with asymmetric wing curvature, lateral spine bending, and tail rudder stabilization instead of 1-channel rigid rotation.
  - All renders have unique SHA-256 hashes.
- **Weaknesses & what to fix next:**
  - Concept art generation encountered a 429 quota exhaustion on `gemini-3.1-flash-image` (reset in ~4.9h). Concept art must be generated once quota refreshes; never copied from 3D renders.
  - Proceed to **Priority #3: `desert_fox`** to rebuild geometry, quadruped rig, and trot/idle locomotion.

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
## 2026-10-30 — desert_fox (Round 2 Remake from Scratch)
- **Status:** in progress (10/11 Checks Passed; 3D Mesh, Rig & 27-channel Quadruped Locomotion complete; Concept Art pending image-generator quota reset)
- **Metrics:** `299.6 KB` | `5,396 tris` | `26 bones` | Clips: `trot`, `idle` (27 channels each)
- **Output:** [desert_fox.glb](file:///c:/Users/agraw/Downloads/backups/Gemini/3D%20models/characters/desert_fox/desert_fox.glb)
- **Tools + method used:**
  - `tools/build-desert-fox.mjs`: Procedural quadruped parametric sculpting kernel generating plush body volume (`buildSculptedFoxTorso`), tapered fennec muzzle with cheek fluff (`buildSculptedFoxHead`), deep bat-like ear conchae (`buildSculptedFennecEar`), 6-segment plush tail (`buildSculptedFoxTail`), and articulated legs with defined stifle/hock angles and paw pads (`buildSculptedFoxLeg`).
  - 26-bone quadruped skeleton with spine, ears, tail, forelimbs, hindlimbs, and paw pads.
  - Multi-harmonic Fourier motion synthesis driving all 26 bones on every clip (`trot`, `idle`), solving the Round 1 critique where idle only animated 2 channels.
  - `tools/verify-and-render.mjs`: Headless Playwright Three.js verification producing 3-angle daylight turntable, 3-angle dark rave turntable, head/ear close-up, and 6-frame strips.
- **What worked:**
  - 5,396-triangle sculpted mesh resolves the low-poly "deer / cube legs / card ears" critique; fennec fox now features distinctive oversized ear conchae, sharp muzzle, and plush brush tail.
  - All 26 bones actively move during both trot and idle with zero sliding paws.
  - All renders have unique SHA-256 hashes.
- **Weaknesses & what to fix next:**
  - Concept art generation in `concept/` pending image-generator quota reset (blocked by `gemini-3.1-flash-image` 429 exhaustion, resets in ~4.8h). Never copied from 3D renders.

