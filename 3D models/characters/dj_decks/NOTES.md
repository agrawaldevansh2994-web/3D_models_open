# Character Specification: `dj_decks`
### Resident Festival DJ

- **Name:** `dj_decks`
- **Category:** People (Phase 2, Character #2)
- **Target World:** Forest Rave, Beach Party, Saturn Stage
- **Height:** 1.80 m
- **File Size:** 874.3 KB
- **Triangles:** 5,776 tris
- **Bones:** 62 bones (`CharacterArmature` Mixamo-compatible rig)
- **Baked Animation Clips:**
  - `walk` (1.0s loop): Confident swagger walk cycle with stance-phase foot grounding.
  - `mixer_hands` (gDJ_a): Precision DJ mixer hands tweaking EQ knobs and crossfading.
  - `fist_raise_drop` (gPU_a): High-energy bass-drop build with explosive right-arm fist pump and head bounce.
  - `idle_groove` (gHU_a): Behind-the-booth rhythmic groove, nodding to monitor beat with hand on headphone cup.

### Rig Hierarchy
- Standard 62-bone `CharacterArmature` rooted at `mixamorig:Hips`.
- Fully Mixamo-compatible for animation retargeting.

### Textures & Materials
- **PBR Metallic-Roughness:** Asymmetric festival vest, techwear trousers, studio headphone casing.
- **Emissive Channels:**
  - Amber glowing EL-wire vest piping and headphone ring accents (`#ffaa00`).
