# FEEDBACK — Flash Shift 1 (commit 3a637f5)

Audited by Hark, 30 Oct 2026. Read this, then `FLASH_PLAYBOOK.md` and `_shift/QUEUE.md`, then work.

## Verdict
Honest round. All 5 files are real renders with real motion, they meet spec (1920×1080, 30 fps, H.264) and loop cleanly (SSIM 0.957–0.978). No faked checks. Good.

Quality is middling:
- **DJ loops: about 40%.** The motion is real (the arm raise on the drop reads well). But the body is the round 1 recoloured Quaternius crowd model with a faceted face and an orange stripe down the chest. The "headphones" read as two black rings on the shoulders. The decks are two cyan blocks and a glow, in a black void, filmed with a static camera.
- **Laser loop: about 60%.** It's a clean 12-beam tunnel. It's soft (1.8 Mbps), and in some frames the beams kink or break at the frame edges.
- **Volume:** 5 of about 25 creation items.

## 1. Stop work on the DJ (Hark owns it now)
- **Don't spend more time on the DJ loops.** Hark is building a new DJ body from a real image-to-3D mesh (the raver concept). When it's ready, Hark hands over a rigged `.glb` and you re-render with your existing `dj_render.mjs`.
- **Remove the brand name.** Delete every "Pioneer" from `STATUS.md`, `QUEUE.md`, `loops.json`, `manifest.jsonl` notes and code comments. Call them "CDJ-style decks". Playbook rule 5: no brands.
- Leave the 4 current DJ files where they are as placeholders. Don't delete them.

## 2. Fix the laser shader before rendering more
1. **Edge kinks:** beams must run straight past the frame edge, with no bend, mirror seam or break. The usual cause is an `atan`/angle wrap seam or a mirrored UV fold. Fix it in `tunnel_lasers.frag`.
   - Check: take 12 evenly spaced frames, crop the outer 120 px band of each, and look at it. Every beam must be a straight line through the band.
2. **Sharpness:** encode at CRF 16–18 (H.264 High, `-preset slow`), staying ≤ 8 MB. 1.8 Mbps is too soft for a stage screen that fills the view.
3. Re-render `lasers_01_twelve_fan` with both fixes, then run `checks.mjs`, which replaces the old file and manifest line.

## 3. Then the remaining VJ loops (QUEUE job 3)
Order: lasers 02–06, panopticon (6), goa95 (6), pyramids (6), bay (6). That's 29 loops.

Per theme:
- Render **one 3-second preview** first and look at its contact sheet. Write one honest sentence about what it shows. If it looks flat, muddy or repetitive, fix the shader before the full set.
- **Each variant must look different from its siblings,** not just a different hue. Compare contact sheets side by side: two variants that read the same at a glance means one gets reworked or dropped.
- Same edge check as the lasers (section 2.1) for any radial or tiled shader.
- Stop a theme if its first 3 outputs fail checks. Write why in `STATUS.md` and move on.

Bar per theme (what "good" means):
- **Goa '95:** fluorescent UV palette (magenta, acid green, orange, deep violet) on black, slow breathing mandala, with detail in the fine rings, not just colour cycling.
- **Panopticon:** black, orange and white only, hard strobes and sweeps, industrial. Keep strobes ≤ 3 flashes a second (photosensitivity).
- **Pyramids:** gold on deep blue-black, glyph-like marks that never spell real text.
- **Bay:** caustic net in cyan/teal/violet, soft and slow, like light under water.

## 4. After VJ loops
QUEUE jobs 4–6 as written (skyboxes, share cards, posters/decals). Share cards must come from real stills in `Argon render/out/stills/` (read-only there, write to `print/`).

## 5. Housekeeping
- `STATUS.md` says "no commits to GitHub", but commit 3a637f5 exists. Write what actually happened. If Devansh or Claude pushed, say so.
- Manifest lines only through `checks.mjs`, never by hand (already the rule; keep it).
- **Don't touch `3D models/characters/`.** Hark is working on the raver locally.
- **No push.** Devansh pushes when the round is done.

## Done means
- [ ] "Pioneer" gone everywhere
- [ ] Laser shader fixed (edge band check passes on 12 frames), lasers_01 re-rendered at CRF 16–18
- [ ] 29 VJ loops rendered or honestly rejected, each with contact sheet + one-sentence description
- [ ] No two variants in a theme look the same at a glance
- [ ] STATUS.md matches reality
