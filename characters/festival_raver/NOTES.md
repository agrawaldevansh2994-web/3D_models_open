# Character Specification: Festival Raver (`festival_raver`)

- **Name:** `festival_raver`
- **Archetype:** Cyberpunk / Playa Art Hero Festival Dancer
- **Height:** 1.76 m (Planted at origin, facing +Z)
- **Triangle Count:** 5,500 triangles
- **Vertex Count:** 11,040 vertices
- **Skeleton:** 62 joints (Mixamo / Quaternius standard hierarchy with `CharacterArmature`)
- **Materials:** Full glTF 2.0 PBR + Emissive Texture Atlas (Skin, Hair, Eyes, Puffer Vest, Joggers, Platform Boots, Hardware)
- **File Size:** 838.6 KB

## Baked Animation Clips
1. `walk` — Natural swagger walk cycle with forward propulsion (116 channels, seamlessly looping)
2. `dance_1` — **House Stomp (`gST_a`):** Rhythmic low-knee stomp, syncopated hip bounce, and arm wave (132 frames, 145 BPM)
3. `dance_2` — **Techno Fist Pump (`gPU_a`):** Heavy bassline drop, explosive arm drive, and torso isolation (132 frames, 145 BPM)
4. `dance_3` — **Hypnotic Flow (`gFL_a`):** Overhead LED-trail arm arcs and fluid hip sway (132 frames, 145 BPM)

## Verification Checklist
- [x] Zero errors in Three.js `GLTFLoader`
- [x] Correct bone hierarchy and normalized float32 skin weights
- [x] Feet firmly planted at $y = 0$ during stance phases
- [x] High-contrast neon cyan and magenta emissive pop under dark rave lighting
- [x] File size under 1 MB (< 5 MB budget)

