# Character Specification: Deep Sea Diver (`deep_sea_diver`)

- **Name:** `deep_sea_diver`
- **Archetype:** Heavy Abyssal Mark V Diver with Copper/Brass Plate, Lead Boots, and Aqua Glow
- **Height:** 1.85 m (Planted at origin, facing +Z)
- **Triangle Count:** 5,476 triangles
- **Vertex Count:** 11,006 vertices
- **Skeleton:** 62 joints (`CharacterArmature` standard)
- **Materials:** Full glTF 2.0 PBR + Emissive Texture Atlas (Canvas dive suit, Copper breastplate, Lead boots, Aqua porthole glow)
- **File Size:** 836.4 KB

## Baked Animation Clips
1. `walk` — Heavy seabed moon trudge (116 channels)
2. `swim` — Underwater breaststroke drag (`gSM_a`, 132 frames, 145 BPM)
3. `idle` — Low-gravity ocean-current sway (`gSW_a`, 132 frames, 145 BPM)

## Verification Checklist
- [x] Zero errors in Three.js `GLTFLoader`
- [x] Correct bone hierarchy and normalized float32 skin weights
- [x] Feet firmly planted at $y = 0$
- [x] Glowing aqua porthole eyes and neon sole trim
- [x] File size under 1 MB (< 5 MB budget)

