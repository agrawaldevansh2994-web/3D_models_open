# Character Specification: Abyssal Crown Jellyfish (`biolum_jellyfish`)

- **Name:** `biolum_jellyfish`
- **Archetype:** Abyssal Crown Jellyfish with 8 Neon Radial Canals & Trailing Ribbon Tentacles
- **Height:** 1.4 m (Bell diameter: 1.1 m, tentacles reach down to y = 0.0 m)
- **Triangle Count:** 2,176 triangles
- **Vertex Count:** 1,161 vertices
- **Skeleton:** 20 bones (`Root`, `Bell_Apex`, `Bell_Mid`, `Bell_Rim`, 8 `Tentacle_Base`, 8 `Tentacle_Tip`)
- **Materials:** Full glTF 2.0 PBR + Dual-Color Emissive Map (Translucent cyan umbrella, 8 neon magenta radial canals)
- **File Size:** 118.0 KB

## Baked Animation Clips
1. `pulse` — Rapid bell contraction propulsion followed by slow elastic expansion and trailing tentacle lag (2.4s loop, 73 frames)
2. `drift` — Hypnotic oceanic current sway with undulating tentacles (3.6s loop, 109 frames)

## Verification Checklist
- [x] Zero errors in Three.js `GLTFLoader`
- [x] Lightweight asset (118 KB) ideal for instanced deep-sea swarms
- [x] Vibrant neon magenta and cyan emission popping against dark marine depths
- [x] Smooth elastic deformation without mesh tearing

