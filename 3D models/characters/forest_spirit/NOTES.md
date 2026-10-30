# Character Specification: `forest_spirit`
### Night-Forest Mycelial & Mushroom Spirit

- **Name:** `forest_spirit`
- **Category:** Land Creatures (Phase 4, Character #9)
- **Target World:** Forest Rave, Bioluminescence Bay, Dream Garden
- **Height:** 1.15 m
- **File Size:** 79.0 KB
- **Triangles:** 1,320 tris (732 vertices)
- **Bones:** 13 bones
- **Baked Animation Clips:**
  - `idle` (2.0s loop): Rhythmic cap bobbing, breathing root bounce.
  - `walk` (1.0s loop): Alternating bouncy forest waddle with counter-stepping legs.
  - `dance_1` (1.8s loop): Spore-release ritual dance with overhead waving twig arms and yaw swaying.
  - `pulse` (2.4s loop): Elastic crouch disguise into ground mushroom followed by explosive cap pop and celebratory flare.

### Rig Hierarchy
```text
Root (y: 0.40)
├── Stalk_1 (y: 0.55)
│   └── Stalk_2 (y: 0.75)
│       ├── Cap_Base (y: 0.95)
│       │   └── Cap_Apex (y: 1.15)
│       ├── Arm_L_Upper -> Arm_L_Tip
│       └── Arm_R_Upper -> Arm_R_Tip
├── Leg_L_Upper -> Leg_L_Foot (y: 0.02)
└── Leg_R_Upper -> Leg_R_Foot (y: 0.02)
```

### Textures & Materials
- **PBR Metallic-Roughness:** Bark and mycelium stalk (roughness: 0.8, metalness: 0.1).
- **Emissive Channels:**
  - Under-cap radially pleated gills glowing vibrant emerald (`#00ffaa`).
  - Luminous golden ocular spots (`#ffdc3c`) on upper stalk.

