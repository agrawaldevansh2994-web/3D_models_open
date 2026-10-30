# Character Specification: `festival_mech`
### Walking Art-Car Walker ("The Scarab Stage")

- **Name:** `festival_mech`
- **Category:** Machines (Phase 6, Character #13)
- **Target World:** Desert Art-Cars, Industrial Rave, Open Playa
- **Height:** 3.8 m tall
- **File Size:** 87.4 KB
- **Triangles:** 1,152 tris (660 vertices)
- **Bones:** 16 bones
- **Baked Animation Clips:**
  - `idle` (2.0s loop): 124 BPM hydraulic breathing suspension bounce + turret scanner pan.
  - `walk` (2.0s loop): Heavy 4-beat quadruped mechanical gait with locked footpads and chassis roll weight transfer.
  - `rave_mode` (1.6s loop): Stationary festival stage mode: chassis deep bass bounce + oscillating sound horns.
  - `stomp` (2.4s loop): Hydraulic anticipation crouch and explosive bass-drop mechanical footpad stomp.

### Rig Hierarchy
```text
Chassis_Root (y: 2.30, z: 0.00)
├── Turret_Deck (y: 2.80, z: 0.00) [Geodesic Dome]
│   ├── Sound_Horn_L (x: 0.65, y: 3.25, z: 0.10)
│   └── Sound_Horn_R (x: -0.65, y: 3.25, z: 0.10)
├── FL_Hip -> FL_Knee -> FL_Ankle [Footpad at y: 0.08, z: 1.15]
├── FR_Hip -> FR_Knee -> FR_Ankle [Footpad at y: 0.08, z: 1.15]
├── BL_Hip -> BL_Knee -> BL_Ankle [Footpad at y: 0.08, z: -1.15]
└── BR_Hip -> BR_Knee -> BR_Ankle [Footpad at y: 0.08, z: -1.15]
```

### Textures & Materials
- **PBR Metallic-Roughness:** Heavy burnished brass and blackened industrial steel armor (roughness: 0.55, metalness: 0.85); tinted acrylic geodesic dome panels.
- **Emissive Channels:**
  - Glowing magenta/violet geodesic dome lattice (`#ff00b4`).
  - Pulsing electric cyan subwoofer LED rings (`#00f0ff`).

