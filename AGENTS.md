# Creature Forge: Build Our Own 3D Characters for Playa Art
### Final Execution Plan & Operating Manual for Flash

---

## 0. Hard Operating Constraints (Read First)

1. **Workspace Boundary:** Work **strictly inside** `C:\Users\agraw\Downloads\backups\Gemini\3D models\`. Do not read, modify, or write files outside this directory (except referencing global Node/Playwright packages if needed for headless verification).
2. **Headless Browser Only — Never Open a Window:**
   - **Never** launch a visible browser window (`headless: false` or `server.open: true`). It steals focus and breaks the user's workflow.
   - Always render and verify `.glb` assets using **headless Chromium via Playwright** (`chromium.launch({ headless: true })`) against a local Three.js harness.
3. **Autonomous Execution Loop:**
   - You (Flash) are executing a multi-character production run. Do not stop after one character or ask for permission between steps.
   - Build the shared toolchain (`tools/`) first, verify it works end-to-end on Character #1 (`festival_raver`), inspect the rendered images critically, upgrade the generator/rig/shaders, and proceed through the entire roster in priority order.

---

## 1. Mission & Quality Bar

You are the character studio for **Playa Art** (`www.3dart.co.in`), a collection of explorable first-person 3D worlds built with Three.js: raves in forests and on Saturn, drowned cities, deserts, castles, Arctic festivals, scenic drives. The worlds are alive with light and music, and they need **their own inhabitants**: people, creatures, animals, and machines that nobody else has.

Your job: design and build **original, fully rigged, animated 3D characters** that load straight into a Three.js world (`GLTFLoader`), the way Mixamo characters do, but ours—with custom geometry, PBR + emissive textures, clean skeletons, and multi-clip procedural/keyframed animations baked directly into each `.glb`.

### Required Folder Structure per Character

```text
characters/<name>/
  <name>.glb            # Final binary glTF 2.0: mesh, PBR+emissive materials, skin/skeleton, all animation clips
  concept/              # Design turnaround sheet (front/side/back + close-ups + color palette PNG/SVG)
  renders/              # Headless Three.js renders: daylight turnaround, dark rave lighting, & action pose sheets
  moves/                # Motion specification / trajectory previews / animation frame strips
  NOTES.md              # Character spec, bone count, triangle count, file size, clip list, and lessons learned
```

### Strict Technical Specification for Every `<name>.glb`

| Requirement | Specification |
| :--- | :--- |
| **Format** | Binary glTF 2.0 (`.glb`), single self-contained file (embedded buffers & textures), zero external URI dependencies. |
| **Compatibility** | Must load in Three.js `GLTFLoader` and `gltf-viewer.donmccurdy.com` with **zero errors or warnings** (valid accessor bounds, normalized `JOINTS_0` / `WEIGHTS_0` where $\sum w_i = 1.0$, matching `inverseBindMatrices` count). |
| **Coordinate System** | Feet/base planted at world origin `(0, 0, 0)`, facing `+Z` (`[0, 0, 1]`), `+Y` up, real-world scale in **metres** (e.g., humanoids `1.70m–1.85m`, manta ray `3.2m` wingspan, desert fox `0.45m` shoulder height). |
| **Skeleton & Rigging** | True `SKIN` + `JOINTS` hierarchy with smooth multi-bone vertex weights (`JOINTS_0` `UNSIGNED_BYTE`/`UNSIGNED_SHORT`, `WEIGHTS_0` `FLOAT`). Humanoids **must** use standard `mixamorig:` bone naming (`mixamorig:Hips`, `mixamorig:Spine`, etc.) so animations can cross-target. Creatures/machines use purpose-built hierarchical rigs. |
| **Materials (PBR + Emissive)** | `pbrMetallicRoughness` with high-resolution procedural textures (`baseColorTexture`, `metallicRoughnessTexture`, `normalTexture`, `emissiveTexture` embedded as PNG/WebP) + `emissiveFactor` `[R, G, B]` so characters pop in dark rave/bioluminescent worlds and retain crisp shading in daylight. |
| **Animation Clips** | At least **3 to 5 distinct, seamless looping animation clips** baked into the `.glb` (`animations` array), plainly named (`idle`, `walk`, `run`, `dance_1`, `dance_2`, `dance_3`, `swim`, `fly`, `pulse`, etc.). Every loop must match start/end pose and velocity ($t=0$ equals $t=T$) with **zero seam pop** and **planted feet**. |
| **Performance Budget** | `3,000 – 15,000` triangles for hero characters; `400 – 1,500` triangles for instanced swarm/school units (`school_fish`, `firefly_moth`). File size target `< 5 MB` per `.glb`. |

---

## 2. Shared Forge Architecture (`tools/`)

Before building characters, initialize a clean Node.js workspace at the root of `C:\Users\agraw\Downloads\backups\Gemini\3D models\` (`package.json` with `three`, `@gltf-transform/core`, `@gltf-transform/extensions`, `@gltf-transform/functions`, `sharp` or `canvas` / pure-buffer PNG encoder, and `playwright`).

Build the following modular toolkit inside `tools/`:

### 2.1 `tools/glb-builder.mjs` — Core Parametric Mesh, Skinning & glTF 2.0 Compiler
Do **not** build characters out of primitive boxes or spheres. Build an expressive subdivision & lofted-surface geometry kernel:
- **Lofted Cross-Section Tubes (`buildLoftedLimb`, `buildTorso`, `buildGarment`):** Generate smooth anatomical limbs, torsos, cloaks, jackets, wings, tentacles, and fins using spline paths with elliptical/superellipse cross-sections, anatomical muscle tapers, collar/cuff extrusions, and creased cloth folds.
- **Sculpted Heads, Hands & Details:** Build articulated 5-finger hands (palm + thumb + index/middle/ring/pinky chains), sculpted heads/helmets/masks/muzzles, footwear, goggles, and LED piping geometry.
- **Automatic Geodesic / Segment Envelope Skinning:** Compute smooth 4-bone vertex weights (`JOINTS_0`, `WEIGHTS_0`) automatically from bone segment capsule distances with hermite blending across joints (hips, knees, ankles, shoulders, elbows, wrists, spine, neck, tail/wing/tentacle chains) and normalize weights strictly so `w0 + w1 + w2 + w3 === 1.0`.
- **Procedural PBR Texture Baker (`tools/texture-baker.mjs`):** Generate crisp `1024x1024` (or `512x512`) PNG textures in-memory:
  - `baseColor`: fabric weaves, weathered brass, organic skin/scales, gradient bioluminescence, panel seams.
  - `normal`: tangent-space normal maps from heightfields (cloth ribs, armor plates, scales, stitching, glowing circuit grooves).
  - `metallicRoughness`: glTF-standard packed texture (`G = roughness`, `B = metalness`).
  - `emissive`: sharp neon LED strips, EL-wire patterns, glowing eyes/spores/photophores.
- **Binary `.glb` Assembler:** Construct compliant glTF 2.0 JSON + binary `BIN` chunk (or use `@gltf-transform/core` `Document` + `NodeIO`) with explicit `inverseBindMatrices` (column-major $4\times 4$ inverse world matrices of joints in bind pose) and quaternion/translation `ANIMATION` samplers.

### 2.2 `tools/rig-humanoid.mjs` & `tools/rig-creature.mjs` — Standard Rigs & Motion Engine
- **Mixamo-Compatible Humanoid Skeleton (24–52 bones):**
  - `mixamorig:Hips` (root translation + rotation)
  - `mixamorig:Spine`, `mixamorig:Spine1`, `mixamorig:Spine2`, `mixamorig:Neck`, `mixamorig:Head`
  - `mixamorig:LeftShoulder`, `mixamorig:LeftArm`, `mixamorig:LeftForeArm`, `mixamorig:LeftHand` (+ thumb/finger bones)
  - `mixamorig:RightShoulder`, `mixamorig:RightArm`, `mixamorig:RightForeArm`, `mixamorig:RightHand` (+ thumb/finger bones)
  - `mixamorig:LeftUpLeg`, `mixamorig:LeftLeg`, `mixamorig:LeftFoot`, `mixamorig:LeftToeBase`
  - `mixamorig:RightUpLeg`, `mixamorig:RightLeg`, `mixamorig:RightFoot`, `mixamorig:RightToeBase`
  - Secondary cloth/coat/hem bones where needed (`Coat_FL`, `Coat_FR`, `Coat_BL`, `Coat_BR`).
- **Harmonic & Analytical IK Motion Synthesis:**
  - Every animation clip is sampled at `30 fps` over an exact loop period $T$ using multi-harmonic Fourier series $\theta(t) = \theta_0 + \sum_{k=1}^{K} \left(a_k \sin(2\pi k t / T) + b_k \cos(2\pi k t / T)\right)$ plus two-bone analytical leg IK during stance phases so **feet lock to the ground (`y = 0`) without sliding** and loops are $C^\infty$ seamless at $t = 0 \equiv T$.

### 2.3 `tools/verify-and-render.mjs` — Headless Playwright Inspector & Concept/Render Generator
Every time a character is built, run `node tools/verify-and-render.mjs <character_name>` to automatically:
1. Validate the `.glb` structure (bone hierarchy, skin weights sum, accessor min/max, animation track count, file size).
2. Generate `concept/turnaround_sheet.png` (orthographic Front, Side, Back A-pose views + close-ups of head/hands + color palette swatches).
3. Launch headless Chromium via Playwright (`headless: true`) with an embedded Three.js r160 scene (`ACESFilmicToneMapping`, `toneMappingExposure = 0.88`):
   - **Render 1 (`renders/daylight_turnaround.png`):** 4-angle studio daylight turnaround (`0°`, `45°`, `90°`, `180°`) verifying silhouette, proportions, and PBR roughness/metalness.
   - **Render 2 (`renders/rave_lighting.png`):** Dark neon forest rave lighting (deep indigo fog, magenta/cyan point lights, bloom/emissive pop) verifying how the character looks in Playa Art night worlds.
   - **Render 3 (`renders/animation_strip.png`):** Multi-frame contact sheet sampling each animation clip (`idle`, `walk`, `dance_1`, etc.) across phases `t = 0.0, 0.25, 0.5, 0.75` to visually confirm dynamic poses, foot plant, and zero mesh tearing.
   - **Motion Preview (`moves/motion_curves.png` or `.webm`):** Visual trajectory and phase chart of the clips inside `moves/`.
4. Fail fast if any console error, WebGL warning, NaN vertex, or blank render occurs.

---

## 3. Execution Phases & Character Roster

Execute the following phases in order. Log every completed character in `FORGE_LOG.md` (newest at top) and write its `characters/<name>/NOTES.md`.

### Phase 1: Bootstrap the Forge (`tools/`)
1. Create `package.json` and install dependencies (`three`, `@gltf-transform/core`, `pngjs` or `sharp`, `playwright` or link existing Playwright installation).
2. Implement `tools/texture-baker.mjs`, `tools/glb-builder.mjs`, `tools/rig-humanoid.mjs`, `tools/rig-creature.mjs`, and `tools/verify-and-render.mjs`.
3. Create `FORGE_LOG.md`.

---

### Phase 2: People (For the Party & Story Worlds)

#### 1. `festival_raver` — **START HERE (Priority #1)**
- **Design:** Cyberpunk/Playa festival dancer (`1.76m` tall) wearing an open cropped techwear puffer jacket with glowing cyan/magenta LED piping along the lapel and sleeves, cargo joggers with reactive neon knee straps, platform rave boots, sound-reactive LED visor glasses, and braided hair.
- **Skeleton:** Full `mixamorig:` humanoid rig + coat hem secondary bones.
- **Clips (minimum 5):**
  - `idle` — relaxed festival weight-shift, head bobbing on 124 BPM beat, subtle breathing.
  - `walk` — confident swagger walk cycle with planted stance-phase foot lock and counter-rotating hips/shoulders.
  - `dance_1` — **House Groove / Shuffle:** rhythmic heel-toe footwork, bouncing knees, fluid arm waves and torso isolation.
  - `dance_2` — **Techno Stomp & Fist Pump:** driving bassline stomp, syncopated torso twist, two-bar build into high energy arm pump.
  - `dance_3` — **Hypnotic Trance Flow:** wide stance, figure-eight hip sway, sweeping overhead LED-trail arm arcs.

#### 2. `dj_decks` — **Resident Festival DJ**
- **Design:** Headliner DJ (`1.80m` tall) in an asymmetric sleeveless hooded vest with warm amber/violet EL-wire trim, tilted one-ear studio headphones resting on neck/head, finger rings, and articulated hands built for close-up mixer work.
- **Skeleton:** Full `mixamorig:` humanoid rig.
- **Clips (minimum 4):**
  - `idle_groove` — rhythmic DJ bounce behind the booth, nodding head to the monitor beat, one hand resting near headphone cup.
  - `mixer_hands` — left hand tweaking EQ knobs and filter sweeps while right hand works the crossfader and jog wheel.
  - `fist_raise_drop` — tension build crouching over the decks followed by an explosive right-arm fist raise and head-back hype on the drop.
  - `dance_1` — booth step-touch groove with double-hand crowd clap overhead.

#### 3. `desert_wanderer` — **Playa Dust Nomad**
- **Design:** Nomad (`1.78m` tall) wrapped in a layered desert dust cloak/poncho with weathered fabric folds, brass-rimmed tinted dust goggles, headscarf/shemagh, utility belt with glowing amber lantern vial, and wrapped desert boots.
- **Skeleton:** `mixamorig:` humanoid rig + 4 cloak/cape bones (`Cloak_Back_1`, `Cloak_Back_2`, `Cloak_Left`, `Cloak_Right`) for wind-blown cloth motion.
- **Clips (minimum 4):**
  - `idle` — scanning the horizon, cloak rippling in desert crosswind.
  - `walk` — trudging headwind walk with forward lean and trailing cloak wave.
  - `run` — desert stride with billowing cape and dynamic arm drive.
  - `wave` — raising lantern/arm to signal across the dust storm.

#### 4. `deep_sea_diver` — **Abyssal Brass-Helmet Diver**
- **Design:** Heavy vintage Mark V deep-sea diver (`1.85m` tall) in a riveted oxidized copper/brass 12-bolt diving helmet with warm glowing porthole glass, weighted chest plate, heavy canvas suit with ribbed joints, lead-soled boots, and glowing bioluminescent barnacle accents.
- **Skeleton:** `mixamorig:` humanoid rig.
- **Clips (minimum 4):**
  - `idle` — low-gravity underwater hover/sway, slow head pan scanning the dark sea floor.
  - `walk` — heavy moon-walk / seabed trudge with high knee lift and slow hydrodynamic drag.
  - `swim` — breaststroke / abyssal drift through deep water.
  - `wave` — slow two-handed underwater beacon signal.

---

### Phase 3: Sea Creatures

#### 5. `manta_ray` — **Pelagic Reef & Space-Ocean Manta**
- **Design:** `3.2m` wingspan pelagic manta ray with sleek hydrofoil pectoral fins, cephalic horn lobes, gill slits on the ventral pale belly, dark obsidian dorsal skin patterned with pulsing cyan/aqua bioluminescent constellations, and whip tail.
- **Skeleton:** `Root` -> `Spine_1..4` -> `Tail_1..5` + `LeftWing_1..5` & `RightWing_1..5` (spanwise + chordwise fin chains) + `Cephalic_L/R`.
- **Clips (minimum 3):**
  - `glide` — effortless travelling sinusoidal wing wave from shoulder to wingtip with subtle tail trail.
  - `bank` — graceful 30° banking turn with differential wing curl.
  - `barrel_roll` — full 360° pelagic feeding barrel roll loop with spiral fin follow-through.

#### 6. `biolum_jellyfish` — **Abyssal Crown Jellyfish**
- **Design:** Translucent-look bell (`1.4m` tall) with 8 glowing neon magenta/cyan radial canals, ruffled oral arms, and 8 long trailing marginal tentacles studded with glowing nematocyst beads.
- **Skeleton:** `Root` -> `Bell_Top` -> `Bell_Mid` -> `Bell_Rim_1..8` + `OralArm_1..4` (3 bones each) + `Tentacle_1..8` (5 bones each).
- **Clips (minimum 3):**
  - `pulse` — rapid bell contraction propulsion phase followed by slow elastic expansion and cascading tentacle lag wave.
  - `drift` — gentle ocean-current sway with hypnotic undulating tentacle ribbons.
  - `bloom` — wide bell flare with corkscrewing oral arms.

#### 7. `school_fish` — **Instanced Bioluminescent Schooling Fish**
- **Design:** Ultra-clean, low-poly (`~600–900` tris, `0.35m` long) streamlined fusiform reef fish with metallic iridescent scales and lateral neon stripe, built to be instanced by the hundreds.
- **Skeleton:** Compact 6-bone spine chain (`Root`, `Head`, `Body_1`, `Body_2`, `Tail_Peduncle`, `Caudal_Fin`) + `Pectoral_L/R`.
- **Clips (minimum 3):**
  - `swim` — crisp carangiform S-wave body propulsion.
  - `dart` — rapid double-tail burst acceleration.
  - `idle` — gentle station-keeping fin flutter.

---

### Phase 4: Land Creatures

#### 8. `desert_fox` — **Fennec / Dune Fox**
- **Design:** Agile desert fox (`0.42m` shoulder height, `0.75m` nose-to-tail) with oversized expressive ears, sandy-gold fur gradient, dark eye markings, slender legs, and a plush white-tipped tail with subtle glowing desert-rune markings.
- **Skeleton:** Full quadruped rig (`Root/Pelvis`, `Spine_1..3`, `Neck`, `Head`, `Ear_L/R`, `Tail_1..4`, and 4-bone `FL/FR/BL/BR` leg chains).
- **Clips (minimum 4):**
  - `idle` — alert breathing, independent ear swivels listening for sounds, gentle tail sway.
  - `trot` — diagonal two-beat quadruped trot (`FL+BR` alternating with `FR+BL`) with clean ground contact.
  - `sit` — lowering hindquarters into a seated posture with upright chest and curled tail loop.
  - `look_around` — curious head tilt left/right and ear perk.

#### 9. `forest_spirit` — **Glowing Mycelial / Mushroom Spirit**
- **Design:** Whimsical night-forest inhabitant (`1.15m` tall) with a wide pleated bioluminescent mushroom cap (indigo/emerald/gold gills that glow from underneath), twisted bark-and-mycelium limbs, glowing spore tendrils hanging from the cap rim, and expressive luminous eyes.
- **Skeleton:** Custom bipedal creature rig (`Hips`, `Stalk_1..2`, `Cap_Base`, `Cap_Rim_L/R/F/B`, `Arm_L/R`, `Leg_L/R`).
- **Clips (minimum 4):**
  - `idle` — gentle cap bobbing and spore-tendril shimmer.
  - `walk` — bouncy forest waddle/hop step.
  - `dance_1` — joyous spinning spore-release ritual dance.
  - `pulse` — crouching down into a disguised mushroom and popping back up with a cap flare.

---

### Phase 5: Sky Creatures & Flyers

#### 10. `bird_of_prey` — **Solar / Desert Hawk**
- **Design:** Majestic raptor (`2.1m` wingspan) with layered primary/secondary flight feathers, hooked beak, sharp talons, bronze-and-obsidian plumage, and glowing solar-gold feather tips.
- **Skeleton:** `Root/Pelvis`, `Spine`, `Neck`, `Head`, `Tail_Fan_L/C/R`, `Leg_L/R` + articulated multi-segment wings (`Shoulder`, `Arm`, `Forearm`, `Hand_Primary`, `Feathers_Outer`, `Feathers_Mid`).
- **Clips (minimum 3):**
  - `soar` — thermal glide with subtle wingtip feather twist and tail rudder adjustments.
  - `flap` — powerful figure-eight wingbeat with wrist folding on the upstroke and full extension on the downstroke.
  - `land` — flare-back braking posture, talons extended forward, rapid deceleration wing strokes settling onto perch.

#### 11. `firefly_moth` — **Glowing Saturn / Forest Moth Swarm Unit**
- **Design:** Lightweight (`~500–800` tris, `0.28m` wingspan) ornate luna/silk moth with feathery antennae, furry thorax, and stained-glass wings with high-contrast emissive veins.
- **Skeleton:** `Thorax`, `Abdomen_1..2`, `Head`, `Antenna_L/R`, `Forewing_L/R`, `Hindwing_L/R`.
- **Clips (minimum 3):**
  - `fly` — fluttering erratic moth flight with phase-coupled abdomen bob.
  - `hover` — high-frequency wing hum in place.
  - `rest` — perched slow breathing wing open/close.

#### 12. `paraglider_pilot` — **Open-Sky Paraglider & Canopy Rig**
- **Design:** Airborne pilot in aerodynamic flight harness + helmet suspended beneath a curved cellular ram-air paraglider wing canopy (`4.5m` scaled span) with tensioned risers/brake lines and LED canopy leading-edge lights.
- **Skeleton:** `Root` -> `Canopy_Center`, `Canopy_Left_1..2`, `Canopy_Right_1..2` + `Harness_Pivot` -> pilot body (`Torso`, `Head`, `Arm_L/R` holding brake toggles, `Leg_L/R`).
- **Clips (minimum 3):**
  - `glide` — steady open-sky cruise with subtle canopy breathing and pilot weight balance.
  - `bank_turn` — pilot pulling one brake toggle, weight-shifting in harness while canopy rolls into a spiral turn.
  - `thermal_climb` — surging pitch up and pendulum swing as the wing hits lift.

---

### Phase 6: Machines

#### 13. `festival_mech` — **Walking Art-Car Walker ("The Scarab Stage")**
- **Design:** Hexapod or bipedal brass-and-neon festival art-car mech (`3.8m` tall) blending desert punk steel linkages, geodesic light domes, subwoofer arrays on its chassis, flame/laser horns, and articulated hydraulic legs.
- **Skeleton:** `Chassis_Root` -> `Turret_Deck` -> `Sound_Horns_L/R` + multi-jointed mechanical legs (`Hip_Yaw`, `Thigh_Pitch`, `Knee_Pitch`, `Ankle_Pad`) with piston look-at motion.
- **Clips (minimum 4):**
  - `idle` — hydraulic breathing suspension bounce + subwoofer turret pulse.
  - `walk` — heavy mechanical gait with crisp footpad lock and chassis weight transfer.
  - `rave_mode` — stationary festival stage mode: chassis pumping to the beat while turret scans and speaker arrays flare.
  - `stomp` — rhythmic bass-drop mechanical stomp.

---

## 4. Quality Gate Checklist (Run on Every Character Before Logging "Done")

Before marking any character `done` in `FORGE_LOG.md`, inspect the PNGs in `characters/<name>/renders/` using `read_file` and verify every item below:

1. **Would it look at home walking through a neon forest rave at night?**
   - Check `renders/rave_lighting.png`: Emissive accents must glow clearly against dark fog without blowing out the silhouette.
2. **Do the hands, face, and clothes hold up close?**
   - Check `concept/turnaround_sheet.png` and `renders/daylight_turnaround.png`: Characters must have recognizable garments, fingers/thumbs, headgear/visors/faces, and surface normal/roughness variation—never raw untextured primitives.
3. **Does each loop play without a pop at the seam?**
   - All animation tracks must use periodic functions over $t \in [0, T]$ where keyframe $0$ and keyframe $N$ are mathematically identical in position, rotation, and tangent velocity.
4. **Do the feet stay planted on the ground with no sliding?**
   - Stance-phase feet in `walk`, `run`, `dance_*`, and `trot` must remain anchored at `y = 0` during contact frames (`renders/animation_strip.png`).
5. **Does it load fast and error-free in a browser?**
   - `verify-and-render.mjs` must confirm `GLTFLoader` loads `<name>.glb` with `0` console errors, valid skinning, and file size `< 5 MB`.
6. **Is it better than the last one you made?**
   - Continuously refine `tools/glb-builder.mjs` and `tools/texture-baker.mjs` as you progress through the roster.

---

## 5. Logging Protocol (`FORGE_LOG.md`)

Maintain `FORGE_LOG.md` at the root (`C:\Users\agraw\Downloads\backups\Gemini\3D models\FORGE_LOG.md`), newest entry at the top:

```markdown
## <timestamp> — <character_name>
- **Status:** done / in progress / redo
- **Metrics:** `<file_size_KB> KB` | `<tri_count> tris` | `<bone_count> bones` | Clips: `<clip_list>`
- **Tools + method used:**
- **What worked:**
- **What broke and how you got past it:**
- **Ideas for the next one:**
```

When you complete the roster (or when time runs out), write an **Executive Summary** at the very top of `FORGE_LOG.md` listing every character built, your strongest piece, and the best procedural/rigging/animation techniques discovered during the run.
