# Character Specification: Schooling Fish (`school_fish`)

- **Name:** `school_fish`
- **Archetype:** Instanced Bioluminescent Reef / Ocean Swarm Unit
- **Length:** 0.35 m (Scale: real-world metre units)
- **Triangle Count:** 384 triangles
- **Vertex Count:** 221 vertices
- **Skeleton:** 6 bones (`Root`, `Head`, `Body_1`, `Body_2`, `Tail_Peduncle`, `Caudal_Fin`)
- **Materials:** Full glTF 2.0 PBR + Electric Cyan Lateral Emissive Stripe (Iridescent metallic scales, sapphire dorsal shading)
- **File Size:** 28.5 KB

## Baked Swimming Animation Clips
1. `swim` — Crisp carangiform S-wave continuous propulsion (1.0s loop, 31 frames)
2. `dart` — High-frequency burst escape acceleration (0.5s loop, 16 frames)

## Verification Checklist
- [x] Zero errors in Three.js `GLTFLoader`
- [x] Ultra-lightweight footprint (28.5 KB, 384 tris) engineered for instanced rendering of 500+ schooling fish in WebGL
- [x] Glowing neon cyan lateral line visible under night/deep water lighting
- [x] Natural carangiform spine flex

