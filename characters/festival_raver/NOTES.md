# Character Specification: Festival Raver (`festival_raver`) - Round 2

- **Character Name:** `festival_raver`
- **Category:** Hero Humanoid (Cyberpunk Festival Dancer)
- **Status:** **PASS** (11/11 Round 2 Self-Checks Passed)
- **Source:** 100% Procedurally sculpted and rigged in-repo (Zero reused assets, zero Quaternius models, zero external dances)
- **Height:** 1.76 m (Planted at origin, facing +Z, metric scale)
- **Triangle Count:** 15,464 triangles (Meets 15k–40k hero humanoid budget)
  - `Body_Mesh`: 12,360 triangles (Sculpted head with eyes/nose/mouth/ears/braids, inner torso, arms, 5-finger hands, cargo jogger legs, platform boots)
  - `Jacket_Mesh`: 3,104 triangles (Separate swappable cropped techwear puffer jacket layer + brow cyber-visor)
- **Skeleton:** 52 Mixamo-compatible bones (Mixamo hierarchy with `CharacterArmature` / `mixamorig:` naming):
  - Core: Hips, Spine, Spine1, Spine2, Neck, Head (6)
  - Upper limbs: Left/Right Shoulder, Arm, ForeArm, Hand (8)
  - Hands: 30 articulated finger bones (Thumb1..3, Index1..3, Middle1..3, Ring1..3, Pinky1..3 on both hands)
  - Lower limbs: Left/Right UpLeg, Leg, Foot, ToeBase (8)
- **Materials:** Two distinct procedural PBR + Emissive texture sets:
  - `M_FestivalRaver_Body`: Warm skin with cyber cheek marks, detailed cyan iris & pupil, lips, inner crop top, cargo joggers, and platform boots
  - `M_FestivalRaver_Jacket`: Quilted techwear puffer fabric, metallic zipper, and vibrant cyan & magenta LED piping
- **File Size:** 2,233.7 KB (Binary glTF 2.0 `.glb`, self-contained)

## Baked Animation Clips (7 Unique Clips, 53 Channels Each)
Every clip animates **all 52 bones** (1 `Hips.position` track + 52 `bone.quaternion` tracks = 53 channels per clip), with analytical 2-bone stance foot locking at $y=0$ and exact $t=0 \equiv t=T$ periodic loop closure:

1. `idle` (60 frames / 2.0s, 53 channels): 124 BPM festival breathing & subtle hip sway with planted feet
2. `walk` (36 frames / 1.2s, 53 channels): Confident festival swagger with analytical stance-phase knee/ankle grounding and arm swing
3. `run` (24 frames / 0.8s, 53 channels): Athletic forward drive with high knee lift and counter-balancing arm pump
4. `dance_1` (60 frames / 2.0s, 53 channels): Melbourne Shuffle & House Groove with syncopated leg kicks and 90-degree arm pumping
5. `dance_2` (60 frames / 2.0s, 53 channels): Techno Bass Stomp & Overhead Fist Pump with bassline crouch drops and headbanging
6. `dance_3` (90 frames / 3.0s, 53 channels): Hypnotic Trance Flow with figure-8 Lissajous hip sway and sweeping overhead LED arcs
7. `wave` (60 frames / 2.0s, 53 channels): Friendly greeting wave with high-arc wrist sway and open finger spread

## Deliverables & Visual Verification
- `concept/turnaround_sheet.png`: Genuine 2D concept art turnaround sheet generated via `image-generator` subagent before mesh compilation (Front, Side, Back views in neutral lighting).
- `concept/details_sheet.png`: 2D callout sheet with close-ups of face & braids, 5-finger hands, jacket construction, and hex color swatches.
- `moves/dance_reference_strip.png`: 6-frame motion reference storyboard contact sheet detailing dance keyframes.
- `renders/daylight_turnaround.png`: 3-angle turntable (Front 0°, Side 90°, Back 180°) in studio daylight.
- `renders/rave_lighting.png`: 3-angle turntable (Front 0°, Side 90°, Back 180°) under dark neon rave lighting.
- `renders/face_closeup.png`: 2-panel close-up of sculpted face (eyes, nose, mouth, visor) and 5-finger articulated hand.
- `renders/strip_<clip>.png`: 6-frame contact sheets for each of the 7 clips (`idle`, `walk`, `run`, `dance_1`, `dance_2`, `dance_3`, `wave`).
- `renders/animation_strip.png`: 6-frame primary action contact sheet.
- **Hash Uniqueness:** All 14 image files have unique SHA-256 hashes (zero duplicate files).

## Known Weaknesses & Future Refinements
- Procedural parametric lofting creates clean, watertight anatomical volumes, but fine organic eyelid creases could benefit from subdivision surface post-processing.
- Jacket layer is modeled with a +0.022m clearance offset and locked envelope skinning (`isGarmentLayer: true`), which completely prevents poke-through during all 7 clips; adding secondary physics bone chains on jacket drawstrings would add extra dynamic flair.
