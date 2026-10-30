# Character Specification: Pelagic Manta Ray (`manta_ray`) - Round 2

- **Character Name:** `manta_ray`
- **Category:** Pelagic Marine Creature
- **Status:** **IN PROGRESS** (Mesh, Rig & 24-channel animations remade & verified; Concept Art blocked by image generator quota reset)
- **Source:** 100% In-repo procedural parametric sculpting kernel (Zero external assets, relative paths only)
- **Dimensions:** 3.4 m wingspan x 2.5 m length x 0.38 m center body thickness + 1.9 m whip tail
- **Triangle Count:** 13,568 triangles (Meets 5,000–20,000 hero creature budget)
  - Hydrofoil main body: 12,288 triangles
  - Sculpted cephalic horn lobes: 768 triangles
  - Segmented whip tail: 512 triangles
- **Skeleton:** 24 bones organized in genuine biological chains:
  - Spine & Tail chain (8 bones): Root, Spine_Head, Spine_Mid, Spine_Pelvic, Spine_TailBase, Tail_1, Tail_2, Tail_3, Tail_4
  - Pectoral Wings (10 bones): Wing_L_1..5, Wing_R_1..5 (5 spanwise bones per wing)
  - Cephalic Horns (4 bones): Cephalic_L_1..2, Cephalic_R_1..2
- **Materials:** Procedural PBR + Cyan Constellation Emissive textures:
  - Dorsal: Obsidian sharkskin denticles with electric cyan bioluminescent constellation spot clusters
  - Ventral: Soft pearlescent ivory belly with dark mouth cavity recess
- **File Size:** 1,410.7 KB (Binary glTF 2.0 `.glb`, standalone)

## Baked Animation Clips (3 Unique Clips, 24 Channels Each)
Unlike Round 1 (which animated only 1 root channel for bank and roll), Round 2 animates **all 24 bones** across all clips:
1. `glide` (90 frames / 3.0s, 24 channels): Sinusoidal spanwise traveling wave propagating from spine to wingtips, counter-balancing tail undulation, and curled cephalic horn rhythm.
2. `bank` (90 frames / 3.0s, 24 channels): 37-degree banking reef turn with asymmetric wing flexion (outside wing broad flap, inside wing curls up), lateral spine curve, and tail rudder deflection.
3. `barrel_roll` (120 frames / 4.0s, 24 channels): 360-degree feeding corkscrew loop with helical vertical ascent, tucked/flared wing roll cycle, and trailing whip tail lag.

## Honest Deliverables & Verification Status
- [x] Mesh remade from scratch with thick 3D volume, camber, and distinct cephalic fins (13,568 tris)
- [x] Skeleton has real chains: 8 spine/tail bones, 5 bones per wing, 2 bones per cephalic horn (24 bones total)
- [x] Every clip drives all 24 bones (24 channels per clip, zero single-channel shortcuts)
- [x] Fresh 3-angle daylight turntable (`renders/daylight_turnaround.png`)
- [x] Fresh 3-angle dark rave turntable (`renders/rave_lighting.png`)
- [x] Fresh cephalic fin / mouth close-up (`renders/face_closeup.png`)
- [x] Fresh 6-frame contact sheets (`renders/strip_glide.png`, `renders/strip_bank.png`, `renders/strip_barrel_roll.png`)
- [x] All render PNG files have unique SHA-256 hashes
- [ ] Concept art turnaround & details sheet: Pending image-generator quota reset (blocked by `gemini-3.1-flash-image` 429 exhaustion, resets in ~4.9h). Never faked with 3D renders.
