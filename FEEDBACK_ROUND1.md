# Creature Forge: Round 1 Review and Round 2 Orders

Reviewed: commit `9ca0325` in `3D_models_open` (13 characters).

## Verdict

Every file loads, and each one has a skeleton, textures and named clips. That plumbing is solid. Keep it.

But the round didn't do the job. The brief asked for **original characters with their own moves**, built through a real design → mesh → rig → motion pipeline. What came back is reused assets, primitive geometry and copied renders, with a README that calls it all "done". Here is exactly what's wrong, then exactly what to do.

## What went wrong

### 1. The humans aren't original
`festival_raver`, `dj_decks`, `desert_wanderer` and `deep_sea_diver` are the existing Quaternius `crowd_m_*.gltf` models, loaded from `forest_rave`, `last_train` and `beach`, then recoloured. Their dances are the existing `forest_rave/public/dances/dances.b64` clips, renamed. None of that is new work.
- The texture atlas remap broke the look. Skin comes out faceted and blotchy, and clothing patches land in the wrong places.

### 2. The "new moves" barely move
- Dance and idle clips drive **18 of 62 bones**. Fingers, neck, spine and feet are frozen.
- `deep_sea_diver`, `desert_wanderer` and `dj_decks` each carry **two clips named `walk`**.
- `manta_ray` `bank` and `barrel_roll` animate **1 channel each**, so the whole body just rotates. The same goes for `biolum_jellyfish` `drift` (1 channel) and the `desert_fox`, `festival_mech` and `forest_spirit` `idle` clips (2 channels).

### 3. The creatures are box art
- `desert_fox` reads as a deer: cube legs, flat card ears, no fur shape.
- `festival_mech` is a bean on stilts.
- `manta_ray` is a flat diamond disc, with no cephalic fins you can see in render and no body thickness.
- `paraglider_pilot` is a blob under a strip of wing, with no lines, harness or limbs.
- `bird_of_prey` is a tiny flat shape with no feather silhouette.
- Triangle counts of 384 to 1,320 for hero creatures are far too low to carry a shape.

### 4. The renders were faked
In 10 of 13 folders, two "different" images are byte-identical files:
- `concept/turnaround_sheet.png` == `renders/daylight_turnaround.png` (bird, fox, mech, spirit, moth, paraglider)
- `renders/rave_lighting.png` == `renders/animation_strip.png` (DJ, jellyfish, diver, wanderer)

A concept sheet is design art made **before** the model. A render is a picture **of** the model. Copying one file into both slots isn't either.

### 5. The pipeline was skipped
It used no image generation for concepts, no image-to-3D, no Mixamo or equivalent auto-rig, no video-to-motion and no separate clothing layers. Your biggest strength, making images and video, went completely unused.

### 6. It can't rebuild anywhere else
`tools/hero-humanoid.mjs` and `tools/hero-builder.mjs` hardcode `C:/Users/agraw/Downloads/...` paths.

### 7. The log overstates the work
`FORGE_LOG.md` and `README.md` call characters "done", "beautiful" and "seamless" when they aren't. **Report what's true.** A character that's 40% there marked "in progress" is worth more than one falsely marked "done".

## Round 2 rules (non-negotiable)

1. **Don't reuse existing models or clips.** Nothing from `crowd_m_*`, Quaternius, `dances.b64` or any other existing world asset. Every mesh and every clip gets made this round.
2. **Real concept art first.** Generate a proper turnaround (front, side, back, same pose, neutral light, plain background) plus face, hands, outfit and palette close-ups. Use your own image generation. This is where you shine.
3. **Build the mesh from that art.** Use image-to-3D (Hunyuan3D-2, TRELLIS or better) or a serious sculpt/modelling route in Blender Python. Hero humans should have a readable face, fingers and clothing folds, at roughly 15k–40k tris before decimation. Hero creatures should be 5k–20k.
4. **A real rig.** Humans get a Mixamo-compatible skeleton (upload to Mixamo, or match its bone names exactly), with weights painted so elbows, knees and shoulders don't collapse. Creatures get a rig with real chains: a spine of 6+ bones, wings with 3+ bones per side and fins and tail chains.
5. **Real motion.** Every clip drives every bone that should move. For custom moves: generate a reference video of the motion, extract it with video-to-motion (GVHMR, WHAM or better), retarget, then clean the loop. One clip name per clip, no duplicates.
6. **Clothes as layers.** At least the raver gets a separate jacket or top mesh skinned to the same skeleton, so it can be swapped.
7. **Honest renders.** Every image is a fresh render of the final `.glb`, and no two image files may be identical. Render a 3-angle turntable in daylight, the same under dark rave lighting, a 6-frame strip per clip and one close-up of the face or head.
8. **Portable tools.** Use relative paths only. Anyone cloning the repo should be able to rebuild with `npm install && node tools/build-<name>.mjs`.
9. **Honest log.** For each character, list what's done, what's weak and what you'd fix next. Never call something done until every check below passes.

## Round 2 scope: ONE character, done properly

Remake **`festival_raver`** from scratch. Nothing else until it passes.

Deliver:
- `concept/`: turnaround + close-ups (generated art, not renders)
- `festival_raver.glb`: new mesh, Mixamo-style rig, textures with emissive LED trim, and a separate jacket layer
- Clips: `idle`, `walk`, `run`, `dance_1`, `dance_2`, `dance_3`, `wave`, with at least two dances from your own reference videos via video-to-motion
- `moves/`: the reference videos used for the dances
- `renders/`: as in rule 7
- `NOTES.md`: method, tri count, bone count, clips with the channel count of each, and known weaknesses

## Self-check before you say "done"

- [ ] No file in the folder came from an existing asset
- [ ] Concept art exists and was made before the mesh
- [ ] No two image files share the same bytes (check with a hash)
- [ ] The face has eyes, nose and mouth readable in the close-up render
- [ ] Hands have five fingers
- [ ] Every clip animates at least 40 of the skeleton's bones, and no clip names repeat
- [ ] Feet don't slide during `walk` or `run`
- [ ] Each loop's first and last frames match
- [ ] The jacket stays on the body through every clip with no poke-through
- [ ] It loads in https://gltf-viewer.donmccurdy.com with no errors
- [ ] The build runs from a fresh clone

When the raver passes, take the same approach to `manta_ray` next, then `desert_fox`. Push as far as you can on quality. One great character beats thirteen placeholders.
