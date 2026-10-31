# STATUS (update at the end of every session)

## 2026-10-31 — Shift 2 Progress (Batch Render of 25 VJ Loops)

Pulled latest updates from `3D_models_open.git` (commit `df8a2e2`) containing Hark's shader tweaks, checks update, and `flash_check.py`.
Rendered all 25 queued VJ loops at 1920×1080 @ 30 fps using script settings (`-crf 17 -preset slow`).
No shader or tool files were edited.

### Summary
- **Rendered:** 25 loops
- **Passed & Committed to `manifest.jsonl`:** 18 loops
- **Failed & Moved to `_rejected/` with `reason.txt`:** 7 loops (loop SSIM < 0.90 and below single-step reference)

---

### Committed Loops (18 new + 3 prior lasers + 4 DJ = 25 total in manifest)
1. `vj_loops/lasers/lasers_04_thirtytwo_rays.mp4` (16.0s, 2.5 Mbps, loop SSIM 0.9306)
2. `vj_loops/panopticon/pan_01_hazard_rings.mp4` (12.0s, 4.9 Mbps, loop SSIM 0.9058)
3. `vj_loops/panopticon/pan_02_radar_sweep.mp4` (16.0s, 3.1 Mbps, loop SSIM 0.8642 vs ref 0.8735)
4. `vj_loops/panopticon/pan_06_amber_pulse.mp4` (15.0s, 2.8 Mbps, loop SSIM 0.9085)
5. `vj_loops/goa95/goa_02_mandala_6.mp4` (12.0s, 3.4 Mbps, loop SSIM 0.9299)
6. `vj_loops/goa95/goa_03_mandala_10.mp4` (18.0s, 3.2 Mbps, loop SSIM 0.9368)
7. `vj_loops/goa95/goa_04_mandala_12.mp4` (16.0s, 3.0 Mbps, loop SSIM 0.9304)
8. `vj_loops/goa95/goa_05_mandala_5.mp4` (14.0s, 4.3 Mbps, loop SSIM 0.9399)
9. `vj_loops/goa95/goa_06_mandala_16.mp4` (20.0s, 2.8 Mbps, loop SSIM 0.9277)
10. `vj_loops/pyramids/pyr_01_gold_columns.mp4` (15.0s, 2.5 Mbps, loop SSIM 0.8536 vs ref 0.8546)
11. `vj_loops/pyramids/pyr_02_wide_glyphs.mp4` (12.0s, 2.2 Mbps, loop SSIM 0.8959 vs ref 0.9012)
12. `vj_loops/pyramids/pyr_04_ember_rain.mp4` (14.0s, 4.2 Mbps, loop SSIM 0.7897 vs ref 0.7966)
13. `vj_loops/bay/bay_01_cyan_net.mp4` (15.0s, 3.2 Mbps, loop SSIM 0.9728)
14. `vj_loops/bay/bay_02_deep_violet.mp4` (18.0s, 2.5 Mbps, loop SSIM 0.9778)
15. `vj_loops/bay/bay_03_green_tide.mp4` (12.0s, 3.4 Mbps, loop SSIM 0.9592)
16. `vj_loops/bay/bay_04_fine_caustics.mp4` (16.0s, 2.4 Mbps, loop SSIM 0.9784)
17. `vj_loops/bay/bay_05_slow_swell.mp4` (20.0s, 1.7 Mbps, loop SSIM 0.9827)
18. `vj_loops/bay/bay_06_sparkle_storm.mp4` (14.0s, 3.8 Mbps, loop SSIM 0.9482)

---

### Rejected Loops (7 loops moved to `_rejected/` with `reason.txt`)
- `_rejected/goa_01_mandala_8/`: loop SSIM 0.8372 < 0.90 (ref step 0.9084 - 0.01)
- `_rejected/pan_03_tight_stripes/`: loop SSIM 0.8779 < 0.90 (ref step 0.9016 - 0.01)
- `_rejected/pan_04_slow_tiers/`: loop SSIM 0.8486 < 0.90 (ref step 0.9537 - 0.01)
- `_rejected/pan_05_double_sweep/`: loop SSIM 0.8835 < 0.90 (ref step 0.9014 - 0.01)
- `_rejected/pyr_03_dense_script/`: loop SSIM 0.8113 < 0.90 (ref step 0.9919 - 0.01)
- `_rejected/pyr_05_slow_temple/`: loop SSIM 0.6395 < 0.90 (ref step 0.9506 - 0.01)
- `_rejected/pyr_06_pulse_grid/`: loop SSIM 0.8275 < 0.90 (ref step 0.9876 - 0.01)

Per instructions, shaders were untouched.

---

### Operating Rules Compliance
- 100% headless.
- Remained strictly inside `C:\Users\agraw\Downloads\backups\Gemini\`.
- Shift 2 VJ loop batch committed and pushed to `3D_models_open.git` on user command.

## 2026-10-31 Hark final pass
- Fixed the seam bugs in pan_04, pyr_03, pyr_05 and pyr_06 (shaders in 262c8e1), then re-rendered all four.
- Restored goa_01, pan_03 and pan_05 from _rejected/. They were seamless and were false rejects.
- Added lasers_05 and lasers_06, plus the festival_raver v3 character.
- All 30 loops in vj_loops/ pass the frame-diff seam check. _rejected/ is now empty.
