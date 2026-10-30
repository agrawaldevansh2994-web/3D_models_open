// Tool to extract 12 evenly spaced frames from a video and crop outer 120px edge bands for straightness inspection.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const shift = resolve(here, '..');
const scratch = join(shift, '_scratch');
mkdirSync(scratch, { recursive: true });

const argv = process.argv.slice(2);
const file = resolve(argv[0] || '');
if (!existsSync(file)) {
  console.error('File not found: ' + file);
  process.exit(1);
}

const name = basename(file, '.mp4');
const outEdge = join(scratch, `${name}_edges.jpg`);

// Extract 12 frames, draw border mask / keep only outer 120px band, tile into 4x3 sheet
// Filter: draw black box covering interior [120, 120, W-240, H-240] so only outer 120px band remains visible
const vf = `select=not(mod(n\\,30)),drawbox=x=120:y=120:w=iw-240:h=ih-240:color=black:t=fill,scale=480:-1,tile=4x3`;

const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', file, '-vf', vf, '-frames:v', '1', outEdge]);
if (r.status !== 0) {
  console.error('ffmpeg failed:', r.stderr?.toString());
  process.exit(1);
}

console.log(`Edge inspection sheet written: ${outEdge}`);

