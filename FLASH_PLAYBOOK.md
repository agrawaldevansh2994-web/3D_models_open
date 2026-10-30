# FLASH PLAYBOOK — Gemini Flash asset shift for Playa Art (3dart.co.in)

Original plan by Hark, rewritten for this machine by Antigravity (30 Oct 2026). **Flash executes it from `Gemini/`.** Hark audits the output.
Flash is weak at designing whole worlds/meshes and strong at scripted video, renders and image work, so it only gets those jobs.

**Start every session:** read this file → `_shift/STATUS.md` → `_shift/QUEUE.md` → take the first unticked job.

---

## 0. Rules Flash never breaks

1. **Stay inside `C:\Users\agraw\Downloads\backups\Gemini\`.** `..\Playa_art\` is read-only and out of scope: no reading, building, pulling, pushing. If a job needs something from a world, write it in `_shift\REQUESTS.md`.
2. **Never push to GitHub or post anywhere.** Devansh posts.
3. **Headless only** (see `AGENTS.md`). Never `headless:false`, never open a visible browser or app window. All rendering uses headless Chromium through Playwright (`_shift/node_modules`).
4. **Do not modify** `Argon render\`, `3D models\`, `explainer_vid\`. They are **read-only source material** (Argon stills and the Creature Forge `.glb` files may be read). **Reels are already done in `Argon render\`: do not make reels.**
5. **Honest labels.** Procedural/shader/3D-rendered material is `ai_generated:false`. Only output from an image-generation model is `ai_generated:true`. A still is not a video. Never claim motion, 3D or originality you did not check.
6. **Looking is part of the check.** Every asset: run `checks.mjs`, **open the contact sheet / preview image the script prints**, then commit with one honest sentence in `--looked`. If you cannot tell, say so in that sentence.
7. **Never write `manifest.jsonl` by hand.** Use `checks.mjs --commit`. It either appends the line or moves the asset to `_rejected\<name>\` with `reason.txt`.
8. No real people, artists, brands, logos, copyrighted music, or readable text/letters in generated visuals.
9. Same failure twice on a job → stop that job, write what happened in `STATUS.md`, move to the next job.
10. Photosensitivity: no full-screen flashing white/red; soft pulses only, at most 2.5 pulses per second.

---

## 1. Layout (everything already created)

```
Gemini/
  Argon render/  3D models/  explainer_vid/     <- existing, untouched (reels live in Argon render)
  FLASH_PLAYBOOK.md                              <- this file (AGENTS.md points here)
  _shift/
    QUEUE.md  STATUS.md  REQUESTS.md  manifest.jsonl
    package.json, node_modules/                  <- playwright 1.64, three 0.186.1
    _scratch/                                    <- throwaway test frames (safe to delete)
    tools/
      checks.mjs         <- all checks + manifest/_rejected (section 5)
      shader_loop.mjs    <- procedural VJ loops (section 3.1)
      shaders/           <- _prelude.glsl, 5 themes (*.frag), variants.json (6 per theme)
      dj/                <- DJ loop config goes here (Task 1)
      (dj_render.mjs, skybox.mjs, print.mjs  <- Flash writes these, see QUEUE)
  vj_loops/<theme>/  ai_dj/  skyboxes/<world>/  turnarounds/<character>/  print/<world>/  _rejected/
```
New work always goes into these folders (make a new root folder if none fits).

Tools on PATH: `ffmpeg`, `ffprobe`, `node 20`. GPU is an **Intel iGPU only**: renders are slower than a real GPU but fine for 1080p (a 12 s 1080p shader loop took ~57 s).

---

## 2. How the pieces work (verified 30 Oct)

- Headless WebGL works: Playwright Chromium with `--use-gl=angle --use-angle=d3d11` reports `ANGLE (Intel ... Direct3D11)`.
- Pattern for any procedural video: frame-step a headless page, pull each frame as PNG (`canvas.toDataURL`), pipe into one `ffmpeg -f image2pipe`. Copy the structure of `tools/shader_loop.mjs`.
- **Seamless loop rule:** frame `i` uses phase `i/N` (N = seconds × 30), so frame N would equal frame 0. Everything that moves must be periodic in phase (integer multiples of the loop angle).
- Check status: only `vj` video checks have been run on real output (1 file passed: loop_ssim 0.978). `image`, `skybox`, `decal`, `card`, `turnaround`, `dj` kinds are **untested**: when you first use one, test the check itself on a known-good and a known-bad file and fix `checks.mjs` if it misjudges.

---

## 3. Jobs

### 3.1 VJ loops (ready to run)
- 1920×1080, 30 fps, 10–20 s seamless, H.264 mp4 + VP9 webm, ≤ 8 MB. No text/faces/logos. Dark backgrounds (they play on emissive screens).
- 5 themes × 6 variants are defined: `node tools/shader_loop.mjs list`.
  | theme | world |
  |---|---|
  | `lasers` | Laser Forest / Forest Rave |
  | `goa95` | Goa Trance |
  | `panopticon` | Panopticon (black-and-orange) |
  | `pyramids` | Pyramids at Night (gold glyph marks, not real text) |
  | `bay` | Bioluminescence Bay |
- Workflow per loop: `test <theme> <variant>` (4 preview PNGs in `_scratch/`, **look**) → `render <theme> <variant>` → `checks.mjs <mp4> --kind vj` → open `<name>_sheet.jpg` → rerun with `--commit --job vj --world <w> --source shader --ai false --looked "..."`.
- Variant names do not predict colour (the palette is a cosine palette; look at the preview). If a variant looks bad (washed out, too busy, no black), change its numbers in `variants.json` or the shader and re-test. You may add shaders/variants; keep them periodic in `u_loop`.
- Known look notes: `lasers` is strong; `goa95` fills the whole frame with haze (little true black, acceptable but could be darker); `panopticon`, `pyramids`, `bay` previews looked good. `lasers_01_twelve_fan` is rendered and passes but is **not committed** to the manifest yet (needs the look step).

### 3.2 DJ loop — **Task 1** (needs a tool written first)
Goal: fictional DJ behind decks, wide shot, **1920×1080, 30 fps, 8–12 s seamless loop**, plus a **green-screen version** for keying. Small moves only: nod, hand on mixer, one arm up.
Decision: this is **rendered from our own 3D character, not generated by an AI model** (this machine has no video-generation backend). That makes it exactly loopable and keyable. Label `ai_generated:false`, `source: three-render dj_decks.glb`.

Build `tools/dj_render.mjs` (Playwright headless + three r186 from `_shift/node_modules`). Findings so far, so you don't redo them:
- Character: `3D models/characters/dj_decks/dj_decks.glb` (read it, never write there). Round-1 placeholder quality: 5.8k tris, 62 bones (`CharacterArmature`, mixamo-style), faces +Z, 1.8 m. Clips: `walk`, `mixer_hands`, `fist_raise_drop`, `idle_groove`. First step: an `inspect` mode that prints clip durations, bone names (find the hand bones) and the bounding box.
- Existing viewer code to learn from: `3D models/tools/viewer-src.js` (load GLB from base64, `AnimationMixer`, ACES, fixed light pool). Do not import from it; make your own page. ES modules do not load from `file://`, so serve `_shift/` with a tiny local `http` server on 127.0.0.1 and use an importmap for `three`.
- Scene: add a booth in front of the DJ (table about 0.9–0.95 m high; two decks with platters/jog wheels, centre mixer with small emissive lights). Align table height to the hands of `mixer_hands` after inspecting. Camera in front (+Z) at about 4 m, FOV 35, full body plus booth in a wide shot.
- **Loop construction:** build a circular timeline of length L (8–12 s) from clip segments, e.g. `idle_groove` → `mixer_hands` → `fist_raise_drop`, with 0.4–0.6 s crossfades, **including a crossfade from the last segment back into the first**. Drive each action's `time` and weight yourself as functions of `t mod L` and call `mixer.update(0)`. Each segment's local clip time must be the circular elapsed time since its start. Platter spin and light colour shifts must use whole turns per loop. Keep the light count fixed (no adding lights after load).
- Two looks, same timeline:
  - `club`: dark stage, haze, 3–4 coloured lights drifting periodically, emissive deck details. No tone-map blowout (exposure about 0.85, AGENTS.md).
  - `green`: background exactly `#00FF00` (0,255,0), flat even white lighting, no fog, no bloom, no tone mapping, no green-tinted lights or materials (avoids spill), no shadows on the background. Encode with `-crf 12 -pix_fmt yuv420p` so edges stay clean.
- Outputs: `ai_dj/dj_<name>_club.mp4` and `ai_dj/dj_<name>_green.mp4` (+ keep config in `tools/dj/loops.json`). Make 2 variants (e.g. groove, drop).
- Checks: `checks.mjs <file> --kind dj` (size, fps, 8–12 s, freeze, black, loop SSIM ≥ 0.90). For the green file additionally verify the corner pixels are ≈ (0,255,0) with `ffmpeg ... crop=8:8:0:0,signalstats` and key it once with `chromakey=0x00FF00:0.12:0.05` over a grey background and **look** at the result for green fringes or holes. Write the observation in `--looked`. Be honest if the placeholder character looks crude.
- Pose check: open frames at phase 0, 0.25, 0.5, 0.75 of the loop and confirm the character really moves (hands move on the mixer, nod visible) and nothing clips through the table.
- Optional Route B (only if a generative image model is available, see `REQUESTS.md`): keyframes from the `image-generator` subagent, morphed into a loop. Label `ai_generated:true`. Not needed for Task 1.

### 3.3 Turnaround sheets (for image-to-3D) — needs an image generator
- Characters: festival raver, then manta ray, fox. Source concept art exists: `3D models/characters/festival_raver/concept/turnaround_sheet.png` and `details_sheet.png` (read only).
- Output `turnarounds/<character>/`: **front, back, left, right, 3/4-front**, same character, A-pose (arms about 45°, fingers apart), neutral even light, no shadows, plain mid-grey background, full body, **2048×2048 each**.
- Generation: `gemini` CLI has **no image-generation tool** here. Use the Antigravity `image-generator` subagent (as Creature Forge did) with the front image as reference for every other view, or log the need in `REQUESTS.md` and skip. `ai_generated:true`.
- Check: `checks.mjs <png> --kind turnaround`; then overlay front and back at 50 % (`ffmpeg ... blend=all_mode=average`), open it, and confirm head/shoulder/hip lines match. Reject sheets with different outfits, motion blur, or hidden hands/feet.

### 3.4 Skyboxes (procedural, write `tools/skybox.mjs`)
- Equirectangular 2:1, **8192×4096** (4096×2048 fallback), horizon on the middle line, no text.
- Build it as a fragment shader that turns `(lon, lat)` into a 3D direction and samples 3D noise/gradients, so it is seamless at the left/right edge and has no pole smear by construction. Render in tiles (for example 8 tiles of 2048×2048) and stitch with `pngjs` or ffmpeg because one 8192 canvas may not fit the iGPU.
- Moods (picked by Devansh; suggestions): violet foggy night (Dark Castle), aurora (Frozen Echo), dusk desert (Pyramids). Procedural quality is stylised; say so in `looked_at`.
- Check: `checks.mjs <png> --kind skybox` prints `_seam.png` (right 64 px beside left 64 px) and `_preview.jpg`: open both.

### 3.5 Posters, decals, share cards (write `tools/print.mjs`)
- HTML/CSS templates rendered with headless Playwright. Posters 2048×2048 PNG; graffiti/stickers transparent PNG (`omitBackground`); **share cards 1200×630 JPG**: world name + "free in your browser · 3dart.co.in".
- Share-card backgrounds must be real frames: read stills from `Argon render/out/stills/` (read only; names like `01-colosseum-reel-hero.png`). Do not invent scenery.
- Check kinds: `image`, `decal`, `card`.

---

## 4. Revised from Hark's original (what changed and why)
- Dropped: reel factory, 4K world recording, `worlds.json`, idle/GPU lane. Reels exist in `Argon render\`; the recorder lives in the Playa_art repo/live site which is out of scope here.
- Dropped: headed Chrome (conflicts with the headless-only rule).
- "AI DJ" is now a 3D render of our own character (loopable, keyable, honest). AI generation is only used where it is genuinely needed (turnarounds) and only with an image-generation model.
- VJ loops, skyboxes, posters are procedural: no cloud API needed, no AI label.
- Checks are one real script instead of a list of snippets, and it controls the manifest.

---

## 5. Checks (`tools/checks.mjs`)
```
node tools/checks.mjs <file> --kind vj|dj|image|skybox|decal|card|turnaround
     [--commit --job <j> --world <w> --source <s> --ai true|false --looked "<what you saw>"]
```
Exit 0 pass, 1 fail. Video: size, fps, duration, codec, file size (vj ≤ 8 MB), freeze (≥ 0.5 s frozen = fail), black (≥ 0.5 s = fail), loop SSIM first-vs-last ≥ 0.90, writes `<name>_sheet.jpg`. Image kinds check dimensions/format/alpha; skybox also 2:1 and seam SSIM. `--commit` appends to `manifest.jsonl` only if everything passes and `--looked` is non-empty; otherwise it moves the file to `_rejected\` with the reason.

## 6. Handover each session
Update `_shift/STATUS.md` (done / failed / render times / what Devansh must do). Devansh sends Hark the manifest and contact sheets; Hark audits and returns a FEEDBACK file. Nothing is posted or pushed until Devansh says so.
