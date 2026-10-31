# festival_raver v3 — notes

Built by Hark in its Linux sandbox (Blender 4.3.2, Cycles CPU, no GPU), 30 Oct 2026. Replaces the round-1/round-2 placeholder body for the DJ loop and crowd work. The older `../festival_raver.glb` is left untouched.

## What it is
- **Mesh:** Hunyuan3D-2 image-to-3D output from the turnaround concept (`../concept/turnaround_sheet.png`), cleaned and decimated to **~26k tris** (12,994 verts).
- **Texture:** one **2048×2048** basecolor JPEG, projected from the concept views and embedded in the `.glb`.
- **Rig:** **52 bones**, Mixamo bone names (no `mixamorig:` prefix), automatic weights + manual weight fixes.
- **Size:** `festival_raver_v3.glb` 2.9 MB.

## Clips (30 fps, looping: last key = first key)
| clip | length | source |
|---|---|---|
| `idle` | 2.50 s | animation library retarget (Idle_Loop) |
| `walk` | 1.33 s | animation library retarget (Walk_Loop), in place; move the root at ~0.95 m/s |
| `dance_bounce` | 1.00 s | animation library retarget (Dance_Loop) |
| `dance_house` | 8.00 s | AIST++ mocap `gHO_sFM_cAll_d21_mHO5_ch20` |
| `dance_hiphop` | 8.00 s | AIST++ mocap `gMH_sFM_cAll_d23_mMH3_ch11` |
| `dj` | 7.50 s | procedural, 128 BPM, 16 beats, right arm up on beat 8 |

Per-bone motion ranges are in `renders/pose_variation.txt`.

## Known weak spots (be honest about these in any render)
- **Cheek seam** shows when the head is turned roughly **35–70°** from front (texture projection seam).
- **Mitten hands:** no separated fingers.
- **Stiff wrists:** hand bones barely rotate in the mocap clips (AIST++ has no wrist data).
- **`dance_house` drifts ~0.3 m** across the loop (hips travel in the source mocap). Pin or re-centre the root if the character must stay on a mark.
- **`dj` hands are tuned for a deck top ~1.0 m high, ~0.3 m in front of the hips.** Other deck heights will need the IK targets re-tuned.

## Licences / sources to check before public or commercial use
- Hunyuan3D-2 output: Tencent Hunyuan 3D community licence (it has territory limits; read it before commercial use).
- AIST++ motion annotations: CC BY 4.0, so credit "AIST++ (Li et al. 2021)".
- idle/walk/bounce: retargeted from an animation library glTF (`AnimationLibrary_Godot_Standard`). This is most likely Quaternius' Universal Animation Library (CC0). Unverified, so confirm before relying on it.

## Files
- `festival_raver_v3.glb`: the deliverable.
- `renders/raver_v3_views.png`, `raver_v3_clips.png`, `raver_v3_face_hands.png`: Cycles check renders.
- `README.md`: pipeline summary.
- `tools/`: the build scripts as run (Python + Blender). They hard-code Hark sandbox paths (`/workspace/work/...`) and expect the AIST++ motions and the animation-library glTF, which are **not** in this repo. They're a record of how it was built, not a turnkey build.
