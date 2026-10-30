# Character Specification: `bird_of_prey`
### Solar & Desert Hawk (Majestic Raptor)

- **Name:** `bird_of_prey`
- **Category:** Sky Creatures & Flyers (Phase 5, Character #10)
- **Target World:** Desert Nomad, Dune Horizons, Saturn Cloudscapes
- **Wingspan:** 2.1 m (Total width x: [-1.05m, 1.05m])
- **File Size:** 73.3 KB
- **Triangles:** 904 tris (535 vertices)
- **Bones:** 15 bones
- **Baked Animation Clips:**
  - `soar` (3.0s loop): Majestic thermal glide with dihedral wingtip flex and tail rudder trim.
  - `flap` (1.0s loop): Powerful figure-eight wingbeat with wrist folding on upstroke and full extension downstroke.
  - `land` (2.0s loop): Flare-back airbrake posture with elevated wings, fanned tail, and forward-reaching talons.

### Rig Hierarchy
```text
Root (y: 1.02, z: 0.00)
├── Spine (y: 1.00, z: 0.18)
│   └── Tail_Fan (y: 0.98, z: 0.38)
├── Neck (y: 1.06, z: -0.15)
│   └── Head (y: 1.10, z: -0.28)
├── Wing_L_Shoulder -> Wing_L_Arm -> Wing_L_Forearm -> Wing_L_Hand
├── Wing_R_Shoulder -> Wing_R_Arm -> Wing_R_Forearm -> Wing_R_Hand
├── Leg_L_Thigh (y: 0.96, z: 0.08)
└── Leg_R_Thigh (y: 0.96, z: 0.08)
```

### Textures & Materials
- **PBR Metallic-Roughness:** Obsidian horn and bronze feather bands (roughness: 0.7, metalness: 0.2).
- **Emissive Channels:**
  - Radiant solar gold primary flight feather trailing edges and tail tips (`#ffaa00`).
  - Luminous golden raptor eyes (`#ffe63c`).

