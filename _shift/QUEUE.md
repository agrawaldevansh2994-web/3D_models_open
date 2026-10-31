# QUEUE — top unticked job is next. Tick with [x] and note the date. Read `../FLASH_PLAYBOOK.md` first.

Scope: Lane B only (no reels, no 4K recording, nothing outside `Gemini/`).

- [x] **1. AI DJ loop (section 3.2)** — (Completed & Placeholder Frozen 2026-10-30; Hark now owns the DJ mesh replacement). Built `tools/dj_render.mjs`, rendered 2 variants (`dj_groove`, `dj_drop`) × 2 looks (`club`, `green`) = 4 master video files (MP4 + WebM). Fixed skin coloration via exact Quaternius palette slot mapping (`Math.floor(u * 16)`), normal smoothing, added procedural DJ headphones around neck, lit CDJ-style deck touchscreens and buttons, animated 120 BPM beat nodding and drop fist pump, full 3.5m desk eliminating side green spill. Verified with `checks.mjs`, loop SSIMs > 0.957, all 4 committed to `manifest.jsonl`.
- [x] **2. Commit `vj_loops/lasers/lasers_01_twelve_fan.mp4`** — (Completed 2026-10-30). Verified contact sheet and committed to `manifest.jsonl` (loop SSIM = 0.978).
- [x] **3. VJ loops round (25 queued batch)** — (Completed 2026-10-31). Rendered all 25 requested loops at 1080p 30fps CRF 17. 18 loops passed all checks and are committed to `manifest.jsonl` (lasers_04, pan 01/02/06, goa 02-06, pyr 01/02/04, bay 01-06). 7 loops failed loop_ssim and were moved to `_rejected/` with reason notes (shaders untouched per instructions). Remaining to render if requested: lasers 05–06.
- [ ] **4. Skybox tool + 3 skyboxes** (section 3.4). Ask Devansh which 3 worlds; defaults: Dark Castle, Frozen Echo, Pyramids.
- [ ] **5. Share cards** for every world that has a still in `Argon render/out/stills/` (section 3.5).
- [ ] **6. Posters / decals** (section 3.5).
- [ ] **7. Turnaround sheets** (section 3.3) — blocked until an image-generation model is available; see `REQUESTS.md`.

Budget guide: about 35 % VJ, 25 % DJ, 20 % skyboxes, 20 % print. Turnarounds only when unblocked.
