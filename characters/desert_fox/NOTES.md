# Character Specification: Desert Fox (`desert_fox`)

- **Name:** `desert_fox`
- **Archetype:** Fennec / Dune Fox Quadruped with Bat Ears, White Tail Brush, and Glowing Desert Runes
- **Shoulder Height:** 0.42 m (Length: 0.75 m nose-to-tail, planted firmly on paws at y = 0.0)
- **Triangle Count:** 816 triangles
- **Vertex Count:** 460 vertices
- **Skeleton:** 18 bones (`Root`, `Spine_Pelvis`, `Spine_Chest`, `Neck`, `Head`, `Ear_L/R`, `Tail_Base/Mid/Tip`, `Leg_FL/FR/BL/BR_Upper/Lower`)
- **Materials:** Full glTF 2.0 PBR + Glowing Amber Desert Runes (Sandy gold fur gradient, plush white tail tip)
- **File Size:** 55.5 KB

## Baked Quadruped Animation Clips
1. `trot` — Diagonal two-beat quadruped trot with forward propulsion (FL+BR alternating with FR+BL, 0.8s loop, 25 frames)
2. `idle` — Alert breathing, independent ear swivels, and rhythmic tail sway (2.4s loop, 73 frames)

## Verification Checklist
- [x] Zero errors in Three.js `GLTFLoader`
- [x] Ultra-clean quadruped rig with grounded stance-phase paws at $y = 0$
- [x] Oversized fennec ears and plush brush tail
- [x] Glowing amber constellation runes popping on flanks under dark night lighting
- [x] File size under 60 KB (< 5 MB budget)

