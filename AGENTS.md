# Gemini Workspace — Agent Operating Rules (`AGENTS.md`)

1. **Headless Browser Only — Never Launch a Window on the User's PC:**
   - **Never** set `server.open: true` in any `vite.config.js` (always `open: false`).
   - **Never** use `chrome-devtools-mcp` to open/leave a visible browser window on the user's machine (it steals focus and pointer lock).
   - Always render and verify worlds using **headless Playwright** (`chromium.launch({ headless: true })`), either via `render-shots.mjs` or a headless capture script using the Playwright package installed in `../Playa_art_foundry/foundry/tools/node_modules/playwright` (or `../Playa_art/promo/node_modules/playwright`).

2. **World Independence & Architecture:**
   - Each world folder (e.g., `beach/`, `bioluminescence_bay/`, `last_train/`, `forest_rave/`) is a standalone Vite + Three.js r160 app.
   - Expose `window.FOUNDRY = { ready, set({ cam, look, time, yaw, tod }), stats() }` when `?shot` is present so `render-shots.mjs` can deterministically position the camera, step frames, and capture screenshots + GPU stats.
   - Always use `import.meta.env.BASE_URL` for runtime assets (`chars/`, `dances/`), never a bare leading `/`.

3. **Visual & Rendering Standards:**
   - **No Washed-Out / Overblown Exposure:** Under `ACESFilmicToneMapping`, keep `toneMappingExposure` around `0.80–0.92`, balance directional sun and hemisphere fill so white architectural surfaces retain crisp shadow modeling (`#d8d2c7` sunlit vs `#7c8b99` shaded) rather than clipping to flat `#ffffff`.
   - **Quaternius Crowd Attributes:** `GLTFLoader` lowercases custom vertex attributes (`_SLOT` -> `_slot`, `_SHADE` -> `_shade`). Always read `_slot` and `_shade` and load `dances/dances.json` + `dances/dances.b64` so characters render with proper skin/hair/clothing palettes and animation clips rather than white fallback meshes.
   - **Fixed Light Count:** Never add/remove Three.js lights dynamically after initial scene load; use a fixed-size light pool and emissive/shader accents.


4. **Flash Shift (asset-creation jobs) — read `FLASH_PLAYBOOK.md` first:**
   - When asked to do a "shift", "queue" or any VJ loop / DJ loop / turnaround / skybox / poster / decal / share-card job, **read `FLASH_PLAYBOOK.md` in full, then `_shift/QUEUE.md`, and follow them.** Take the next unticked job in the lane the user names.
   - **Stay inside this `Gemini/` folder.** `../Playa_art/` is read-only and out of scope: do not read, edit, build, pull or push it. Do not post or push anything anywhere.
   - Do **not** touch `Argon render/`, `3D models/`, `explainer_vid/` (read-only source material at most). New output goes only in the new task folders listed in the playbook.
   - Every asset must pass `node _shift/tools/checks.mjs <file> --kind <kind> --commit ...` (it writes `_shift/manifest.jsonl` or moves the file to `_rejected/`). Never write manifest lines by hand.
