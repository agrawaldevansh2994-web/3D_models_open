# Character Specification: `paraglider_pilot`
### Open-Sky Paraglider & Ram-Air Canopy Rig

- **Name:** `paraglider_pilot`
- **Category:** Sky Creatures & Flyers (Phase 5, Character #12)
- **Target World:** Desert Flyover, Sunset Dunes, Saturn High Atmosphere
- **Wingspan:** 4.5 m (Canopy scaled span x: [-2.25m, 2.25m], y: 3.1m - 3.5m)
- **File Size:** 53.7 KB
- **Triangles:** 726 tris (431 vertices)
- **Bones:** 12 bones
- **Baked Animation Clips:**
  - `glide` (2.4s loop): Steady open-sky cruise with canopy breathing and subtle pendulum harness sway.
  - `bank_turn` (2.0s loop): Coordinated 22° spiral turn with pilot brake toggle pull and outward centrifugal weight shift.
  - `thermal_climb` (2.4s loop): Surging pitch-up and pendulum swing as the cellular canopy hits thermal lift.

### Rig Hierarchy
```text
Root (y: 2.00, z: 0.00)
├── Canopy_Center (y: 3.50, z: 0.00)
│   ├── Canopy_Left_1 -> Canopy_Left_2 (x: 2.25, y: 3.10)
│   └── Canopy_Right_1 -> Canopy_Right_2 (x: -2.25, y: 3.10)
└── Harness_Pivot (y: 1.45, z: 0.00)
    └── Pilot_Torso (y: 1.35, z: -0.02)
        ├── Pilot_Head [Helmet] (y: 1.62, z: -0.08)
        ├── Arm_L (y: 1.55, z: 0.05) [Holding left brake toggle]
        ├── Arm_R (y: 1.55, z: 0.05) [Holding right brake toggle]
        └── Pilot_Legs [Pod Harness] (y: 1.05, z: 0.28)
```

### Textures & Materials
- **PBR Metallic-Roughness:** Ripstop nylon canopy in sunset crimson & blaze orange (roughness: 0.8, metalness: 0.05); golden metallic visor on flight helmet (roughness: 0.15, metalness: 0.9).
- **Emissive Channels:**
  - High-intensity electric cyan LED piping (`#00f5ff`) along the entire cellular ram-air intake leading edge.

