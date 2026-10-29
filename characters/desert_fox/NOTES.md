# Character Specification: Desert Dune Fox (`desert_fox`) - Round 2

- **Character Name:** `desert_fox`
- **Category:** Land Creature / Quadruped
- **Status:** **IN PROGRESS** (10/11 Checks Passed; 3D Mesh, Rig & 27-channel Quadruped Locomotion complete; Concept Art pending image-generator quota reset)
- **Source:** 100% In-repo procedural parametric sculpting kernel (Zero external assets, relative paths only)
- **Shoulder Height:** 0.42 m, Length: 0.76 m (Planted at origin, facing +Z, metric scale)
- **Triangle Count:** 5,396 triangles (Meets 5,000–20,000 hero creature budget)
  - Torso & flanks: 1,792 triangles
  - Sculpted fennec head with muzzle & cheek tufts: 1,344 triangles
  - Oversized bat-like ear conchae: 960 triangles
  - Plush 6-stage bushy tail: 704 triangles
  - 4 quadruped legs with defined stifle/hock angles & paw pads: 596 triangles
- **Skeleton:** 26 quadruped bones:
  - Spine & Neck: Root, Spine_Pelvis, Spine_Chest, Neck, Head, Muzzle (6)
  - Ears: Ear_L_1..2, Ear_R_1..2 (4)
  - Tail: Tail_1..4 (4)
  - Forelimbs: Leg_FL_Upper, Leg_FL_Lower, Paw_FL, Leg_FR_Upper, Leg_FR_Lower, Paw_FR (6)
  - Hindlimbs: Leg_BL_Upper, Leg_BL_Lower, Paw_BL, Leg_BR_Upper, Leg_BR_Lower, Paw_BR (6)
- **Materials:** Procedural PBR + Amber Rune Emissive textures:
  - Fur: Warm golden dune gradient with white cheek fluff and white tail tip
  - Emissive: Luminous amber eyes and glowing desert rune markings on flanks
- **File Size:** 299.6 KB (Binary glTF 2.0 `.glb`, self-contained)

## Baked Animation Clips (2 Unique Clips, 27 Channels Each)
Unlike Round 1 (which animated only 2 channels on idle and 5 on trot), Round 2 animates **all 26 bones** (27 channels: 1 root translation + 26 rotations):
1. `trot` (24 frames / 0.8s, 27 channels): Energetic 2-beat diagonal quadruped gait (FL+BR vs FR+BL) with paw ankle ground compensation, vertical double-bounce, spine counter-yaw, ear alertness swivels, and tail counter-balance.
2. `idle` (60 frames / 2.0s, 27 channels): Alert sniffing, head curiosity tilts, independent ear swivels, lazy tail sway, and paw micro-weight shifts.

## Honest Deliverables & Verification Status
- [x] High-density sculpted quadruped mesh (5,396 tris, solves the low-poly "cube legs / card ears" critique)
- [x] Full quadruped rig with 26 bones (spine, ears, tail, forelimbs, hindlimbs, paws)
- [x] All clips drive all 26 bones (27 channels per clip, zero shortcuts)
- [x] Fresh 3-angle daylight turntable (`renders/daylight_turnaround.png`)
- [x] Fresh 3-angle dark rave turntable (`renders/rave_lighting.png`)
- [x] Fresh head/ear close-up (`renders/face_closeup.png`)
- [x] Fresh 6-frame contact sheets (`renders/strip_trot.png`, `renders/strip_idle.png`, `renders/animation_strip.png`)
- [x] All render PNG files have unique SHA-256 hashes (zero duplicate files)
- [ ] Concept art turnaround & details sheet: Pending image-generator quota reset (blocked by `gemini-3.1-flash-image` 429 exhaustion, resets in ~4.8h). Never copied from 3D renders.
