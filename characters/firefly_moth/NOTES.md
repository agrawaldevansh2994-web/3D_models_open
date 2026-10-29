# Character Specification: `firefly_moth`
### Glowing Saturn / Forest Moth Swarm Unit

- **Name:** `firefly_moth`
- **Category:** Sky Creatures & Flyers (Phase 5, Character #11)
- **Target World:** Saturn Rings, Forest Rave, Bioluminescence Bay
- **Wingspan:** 0.28 m (Instanced swarm unit)
- **File Size:** 60.5 KB
- **Triangles:** 528 tris (334 vertices)
- **Bones:** 10 bones
- **Baked Animation Clips:**
  - `fly` (0.6s loop): Rapid 3-stroke flutter cycle coupled with counter-phase abdomen bobbing.
  - `hover` (0.4s loop): High-frequency figure-8 wing hum for station-keeping.
  - `rest` (2.0s loop): Perched resting pose with gentle respiratory wing flex.

### Rig Hierarchy
```text
Thorax (y: 0.24, z: 0.00)
├── Head (y: 0.25, z: -0.05)
│   ├── Antenna_L (y: 0.27, z: -0.07)
│   └── Antenna_R (y: 0.27, z: -0.07)
├── Abdomen_1 (y: 0.23, z: 0.04)
│   └── Abdomen_2 [Lantern] (y: 0.21, z: 0.09)
├── Forewing_L (x: 0.02, y: 0.25, z: -0.01)
├── Forewing_R (x: -0.02, y: 0.25, z: -0.01)
├── Hindwing_L (x: 0.015, y: 0.24, z: 0.03)
└── Hindwing_R (x: -0.015, y: 0.24, z: 0.03)
```

### Textures & Materials
- **PBR Metallic-Roughness:** Creamy silk moth thorax fur (roughness: 0.9) with specular stained-glass wings (roughness: 0.4, metalness: 0.3).
- **Emissive Channels:**
  - Electric neon cyan stained-glass wing veins (`#1effb4`).
  - Luminous emerald abdomen lantern tip (`#3cffa0`).

