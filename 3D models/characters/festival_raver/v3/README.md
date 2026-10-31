# festival_raver_v3
Final: festival_raver_v3.glb (2.92 MB). 26,000 tris, 12,994 verts (Blender count), 52 bones (Mixamo names, no prefix), 2048x2048 JPEG basecolor embedded.
Clips (30 fps, loop; last key = first key): idle 2.50s, walk 1.33s (in-place, move root ~0.95 m/s), dance_bounce 1.00s,
dance_house 8.00s (AIST++ gHO_sFM_cAll_d21_mHO5_ch20), dance_hiphop 8.00s (AIST++ gMH_sFM_cAll_d23_mMH3_ch11), dj 7.50s (procedural, 128 BPM, 16 beats, right-arm raise on beat 8; hands built for a deck top ~1.0 m high, ~0.3 m in front of the hips).
Pipeline: s1_clean.py -> s2_uv.py (Blender) -> fitviews.py/fithead.py -> texture.py -> s3_rig.py + s3b_weights.py (Blender) -> s4_export.py -> assemble.py (make_clips/animlib/ik/dj) -> writeglb.py
Renders (in renders/): raver_v3_views.png, renders/raver_v3_clips.png, renders/raver_v3_face_hands.png, renders/pose_variation.txt
Blender: apt blender 4.3.2 (ARM box); Cycles CPU only, no denoiser, no EEVEE/Workbench (no GL).
