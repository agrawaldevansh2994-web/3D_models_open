# Creature Forge: Round 2 Execution Plan & Operating Manual for Flash

---

## 0. Hard Operating Constraints (Read First)

1. **Workspace Boundary & Portability:**
   - Work **strictly inside** `C:\Users\agraw\Downloads\backups\Gemini\3D models\`.
   - Use **relative paths only** (`characters/...`, `tools/...`). Never hardcode `C:/Users/...` or read external `.gltf` / `dances.b64` files.
   - Any clone must build cleanly via `npm install && node tools/build-<name>.mjs`.
2. **Headless Browser Only — Never Open a Window:**
   - **Never** launch a visible browser window (`headless: false` or `server.open: true`).
   - Always render and verify `.glb` assets using **headless Chromium via Playwright** (`chromium.launch({ headless: true })`).
3. **Strict Round 2 Scope Order (One Character at a Time):**
   - **Priority #1:** Remake `festival_raver` from scratch until every check in Section 4 passes.
   - **Priority #2:** Once `festival_raver` passes, remake `manta_ray` (5k–20k tris, multi-bone spine/wing/tail chains, multi-channel clips).
   - **Priority #3:** Once `manta_ray` passes, remake `desert_fox` (5k–20k tris, sculpted muzzle/ears/fur volume, full quadruped rig).

---

## 1. Non-Negotiable Round 2 Rules (`FEEDBACK_ROUND1.md`)

1. **Zero Reused Assets:** Never load `crowd_m_*.gltf`, Quaternius meshes, or `dances.b64`. Every mesh and every animation clip must be built from scratch in this repo.
2. **Real Concept Art First (`concept/`):**
   - Before building or rendering a character, invoke the `image-generator` subagent to generate genuine 2D concept art saved into `characters/<name>/concept/`:
     - `concept/turnaround_sheet.png`: Orthographic front, side, and back views in neutral lighting on a plain background.
     - `concept/details_sheet.png`: Close-ups of face/head, 5-finger hands, outfit layers, and color palette swatches.
   - **Never** copy a 3D render into `concept/`.
3. **High-Detail Sculpted Mesh (`15k–40k` tris for humanoids, `5k–20k` tris for creatures):**
   - Follow the golden sample in [`tools/build-festival-raver.mjs`](file:///c:/Users/agraw/Downloads/backups/Gemini/3D%20models/tools/build-festival-raver.mjs), [`tools/glb-builder.mjs`](file:///c:/Users/agraw/Downloads/backups/Gemini/3D%20models/tools/glb-builder.mjs), and [`tools/texture-baker.mjs`](file:///c:/Users/agraw/Downloads/backups/Gemini/3D%20models/tools/texture-baker.mjs).
   - Humanoids must have a sculpted face (`buildSculptedHead`: brow, eye sockets, eyeballs, nose bridge, nostrils, lips, chin, ears, hair braids), 5-finger articulated hands (`buildArticulatedHand`), and cloth folds (`foldAmp`, `foldFreqU`, `foldFreqV`).
4. **Separate Swappable Clothing Layer:**
   - `festival_raver` must contain at least **two separate skinned meshes** in the `.glb`: `Body_Mesh` (`FestivalRaver_Body`) and `Jacket_Mesh` (`FestivalRaver_Jacket`) skinned to the same `Humanoid_Skin` using `computeEnvelopeSkinWeights(..., { isGarmentLayer: true })` so the jacket never pokes through the body.
5. **Full Skeleton & Real Multi-Bone Motion:**
   - Humanoids use the **52-bone Mixamo hierarchy** in [`tools/rig-humanoid.mjs`](file:///c:/Users/agraw/Downloads/backups/Gemini/3D%20models/tools/rig-humanoid.mjs) (`mixamorig:Hips` + spine/neck/head + arms + 30 finger bones + legs/toes).
   - Required `festival_raver` clips (7 unique clips, zero duplicate names): `idle`, `walk`, `run`, `dance_1`, `dance_2`, `dance_3`, `wave`.
   - Every clip on `festival_raver` must animate **at least 40+ bones** (52 bones / 53 channels in `rig-humanoid.mjs`), lock stance feet at `y = 0` without sliding, and match first/last frames (`phase = 0` at `i = 0` and `i = N`).
   - Store motion reference preview strips/videos in `characters/<name>/moves/`.
6. **Honest Multi-Viewport Renders (`renders/`):**
   - Bundle the viewer first if `tools/viewer-src.js` changed:
     `npx esbuild tools/viewer-src.js --bundle --format=iife --outfile=tools/viewer-bundle.js`
   - Run `node tools/verify-and-render.mjs <name>` to produce fresh multi-viewport renders:
     - `renders/daylight_turnaround.png`: 3-angle turntable (`0°`, `90°`, `180°`) in daylight.
     - `renders/rave_lighting.png`: 3-angle turntable (`0°`, `90°`, `180°`) in dark neon rave lighting.
     - `renders/face_closeup.png`: 2-panel close-up of the face/head and 5-finger hand.
     - `renders/strip_<clip>.png` (for every clip) + `renders/animation_strip.png`: 6-frame contact sheet (`3x2` grid across phases `0..5/6`).
   - **No two image files anywhere in `characters/<name>/` may share the same SHA-256 hash.**

---

## 2. Scoped Single-Character Layout (Follow Exactly)

```text
characters/festival_raver/
  festival_raver.glb            # 15k-40k tris, Body_Mesh + Jacket_Mesh, 52 Mixamo bones, 7 clips (53ch each)
  concept/
    turnaround_sheet.png        # Generated via image-generator BEFORE mesh build
    details_sheet.png           # Generated via image-generator (face, 5-finger hands, jacket, palette)
  moves/
    dance_reference_strip.png   # Motion reference / trajectory preview for dance_1..3
  renders/
    daylight_turnaround.png     # 3-angle daylight turntable (0°, 90°, 180°)
    rave_lighting.png           # 3-angle dark rave turntable (0°, 90°, 180°)
    face_closeup.png            # Close-up of sculpted face & 5-finger hand
    animation_strip.png         # 6-frame primary clip strip
    strip_idle.png              # 6-frame strip for 'idle'
    strip_walk.png              # 6-frame strip for 'walk'
    strip_run.png               # 6-frame strip for 'run'
    strip_dance_1.png           # 6-frame strip for 'dance_1'
    strip_dance_2.png           # 6-frame strip for 'dance_2'
    strip_dance_3.png           # 6-frame strip for 'dance_3'
    strip_wave.png              # 6-frame strip for 'wave'
  NOTES.md                      # Method, tri count, bone count, per-clip channel count, and known weaknesses
```

---

## 3. Execution Steps for Flash (Resume Here)

1. **Bundle Viewer:** Run `npx esbuild tools/viewer-src.js --bundle --format=iife --outfile=tools/viewer-bundle.js`.
2. **Generate Concept Art (`festival_raver`):** Call `invoke_subagent` with ` image-generator` to create `characters/festival_raver/concept/turnaround_sheet.png` and `characters/festival_raver/concept/details_sheet.png` (plus motion reference sheets in `characters/festival_raver/moves/`).
3. **Build `.glb`:** Run `node tools/build-festival-raver.mjs`.
4. **Render All Views & Clip Strips:** Run `node tools/verify-and-render.mjs festival_raver` and inspect the PNG renders with `read_file`.
5. **Verify All 11 Self-Checks:** Verify unique SHA-256 hashes for all PNGs, `>= 15,000` tris, separate `Body_Mesh` + `Jacket_Mesh`, 52 bones, 7 unique clips with 53 channels each, and update `characters/festival_raver/NOTES.md` and `FORGE_LOG.md` honestly.
6. **Proceed to `manta_ray` and `desert_fox`:** Apply the exact same high-density procedural sculpting, multi-chain rigging, multi-channel animation synthesis, and 3-angle / 6-frame rendering pipeline.
