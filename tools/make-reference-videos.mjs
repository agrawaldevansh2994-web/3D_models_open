import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const stripPath = 'characters/festival_raver/moves/dance_reference_strip.png';
const tmpDir = 'characters/festival_raver/moves/tmp_frames';
fs.mkdirSync(tmpDir, { recursive: true });

console.log('>>> Cropping motion reference keyframes from storyboard strip...');

// Panel coordinates in 1376x768 strip:
// Top row (y ~ 45, h ~ 340):
// Panel 1: x=24, y=45, w=430, h=335
// Panel 2: x=472, y=45, w=430, h=335
// Panel 3: x=920, y=45, w=430, h=335
// Bottom row (y ~ 405, h ~ 340):
// Panel 4: x=24, y=405, w=430, h=335
// Panel 5: x=472, y=405, w=430, h=335
// Panel 6: x=920, y=405, w=430, h=335

const crops = [
  { id: 1, x: 24, y: 45, w: 430, h: 335 },
  { id: 2, x: 472, y: 45, w: 430, h: 335 },
  { id: 3, x: 920, y: 45, w: 430, h: 335 },
  { id: 4, x: 24, y: 405, w: 430, h: 335 },
  { id: 5, x: 472, y: 405, w: 430, h: 335 },
  { id: 6, x: 920, y: 405, w: 430, h: 335 },
];

for (const c of crops) {
  const outFrame = path.join(tmpDir, `panel_${c.id}.png`);
  execSync(`ffmpeg -y -i "${stripPath}" -filter:v "crop=${c.w}:${c.h}:${c.x}:${c.y},scale=480:360" "${outFrame}"`, { stdio: 'ignore' });
}

console.log('>>> Encoding dance_1_reference.mp4 (Melbourne Shuffle & House Glide)...');
// Dance 1 sequence: panel 1 -> 2 -> 3 -> 2 -> 1 looped across 60 frames (2.0s at 30fps)
const dance1Seq = [1, 1, 1, 2, 2, 2, 3, 3, 3, 2, 2, 2];
const d1Dir = path.join(tmpDir, 'dance1');
fs.mkdirSync(d1Dir, { recursive: true });
for (let i = 0; i < 60; i++) {
  const panelId = dance1Seq[Math.floor((i / 60) * dance1Seq.length)];
  fs.copyFileSync(path.join(tmpDir, `panel_${panelId}.png`), path.join(d1Dir, `frame_${String(i).padStart(3, '0')}.png`));
}
execSync(`ffmpeg -y -framerate 30 -i "${d1Dir}/frame_%03d.png" -c:v libx264 -pix_fmt yuv420p -r 30 "characters/festival_raver/moves/dance_1_reference.mp4"`, { stdio: 'inherit' });

console.log('>>> Encoding dance_2_reference.mp4 (Techno Stomp & Overhead Fist Pump)...');
// Dance 2 sequence: panel 4 (crouch) -> 5 (jump pump) -> 6 (landing) -> 4 looped across 60 frames (2.0s at 30fps)
const dance2Seq = [4, 4, 4, 5, 5, 5, 6, 6, 6, 4, 4, 4];
const d2Dir = path.join(tmpDir, 'dance2');
fs.mkdirSync(d2Dir, { recursive: true });
for (let i = 0; i < 60; i++) {
  const panelId = dance2Seq[Math.floor((i / 60) * dance2Seq.length)];
  fs.copyFileSync(path.join(tmpDir, `panel_${panelId}.png`), path.join(d2Dir, `frame_${String(i).padStart(3, '0')}.png`));
}
execSync(`ffmpeg -y -framerate 30 -i "${d2Dir}/frame_%03d.png" -c:v libx264 -pix_fmt yuv420p -r 30 "characters/festival_raver/moves/dance_2_reference.mp4"`, { stdio: 'inherit' });

// Clean up temp frames
fs.rmSync(tmpDir, { recursive: true, force: true });
console.log('>>> Reference video files successfully created in characters/festival_raver/moves/!');

