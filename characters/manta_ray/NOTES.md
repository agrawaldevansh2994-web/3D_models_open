# Character Specification: Pelagic Manta Ray (`manta_ray`)

- **Name:** `manta_ray`
- **Archetype:** Pelagic Reef & Space-Ocean Bioluminescent Manta Ray
- **Wingspan:** 3.2 m (Length: 2.4 m, centered at world elevation y = 1.0 m)
- **Triangle Count:** 6,912 triangles
- **Vertex Count:** 3,626 vertices
- **Skeleton:** 16 bones (`Root`, `Spine_Head`, `Spine_Mid`, `Spine_TailBase`, `Tail_1`, `Tail_2`, `Wing_L_1..4`, `Wing_R_1..4`, `Cephalic_L/R`)
- **Materials:** Full glTF 2.0 PBR + Bioluminescent Constellation Emissive Map (Obsidian dorsal with cyan constellation spots, pearl ivory belly)
- **File Size:** 951.3 KB

## Baked Marine Animation Clips
1. `glide` — Effortless traveling sinusoidal wing wave from pectoral base to wingtips (3.0s loop, 91 frames)
2. `bank` — Graceful 30-degree roll and yaw reef turn (3.0s loop, 91 frames)
3. `barrel_roll` — Full 360-degree acrobatic feeding barrel roll loop (4.0s loop, 121 frames)

## Verification Checklist
- [x] Zero errors in Three.js `GLTFLoader`
- [x] Watertight dual-surface hydrofoil geometry with upward-facing dorsal and downward-facing ventral normals
- [x] Multi-bone spanwise wing wave with smooth continuous skinning
- [x] Vivid cyan bioluminescent spots glowing in dark rave and abyssal scenes
- [x] File size under 1 MB (< 5 MB budget)

