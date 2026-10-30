# Character Specification: Desert Wanderer (`desert_wanderer`)

- **Name:** `desert_wanderer`
- **Archetype:** Nomad / Dune Explorer with Shemagh, Weathered Dust Poncho, and Brass Goggles
- **Height:** 1.78 m (Planted at origin, facing +Z)
- **Triangle Count:** 8,806 triangles
- **Vertex Count:** 17,326 vertices
- **Skeleton:** 62 joints (`CharacterArmature` standard)
- **Materials:** Full glTF 2.0 PBR + Emissive Texture Atlas (Skin, Shemagh, Brass Goggles, Poncho, Boots, Trousers)
- **File Size:** 1,200.5 KB

## Baked Animation Clips
1. `walk` — Desert stride through sand (108 channels)
2. `idle` — Horizon scanning and wind sway (`gSW_a`, 132 frames, 145 BPM)
3. `wave` — Signalling with lantern arm across dust storms (`gPT_a`, 132 frames, 145 BPM)

## Verification Checklist
- [x] Zero errors in Three.js `GLTFLoader`
- [x] Correct bone hierarchy and normalized float32 skin weights
- [x] Feet firmly planted at $y = 0$
- [x] High-contrast amber emissive pop from brass dust goggles
- [x] File size under 1.5 MB (< 5 MB budget)

