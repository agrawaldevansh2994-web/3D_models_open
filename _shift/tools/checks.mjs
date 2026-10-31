// Real checks on a finished asset. With --commit it also enforces the playbook's rule 4:
//   all checks pass + a human-readable "looked_at" sentence  -> one line in manifest.jsonl
//   any check fails                                          -> asset moved to _rejected/<name>/ with reason.txt
//
// node tools/checks.mjs <file> --kind vj|dj|image|skybox|decal|card|turnaround
//        [--commit --job vj --world laser-forest --ai false --source shader --looked "what the contact sheet shows"]
//
// Needs ffmpeg + ffprobe on PATH. Prints JSON. Exit code 0 = pass, 1 = fail.
import { spawnSync } from 'node:child_process';
import { appendFileSync, unlinkSync, existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const shift = resolve(here, '..');
const root = resolve(shift, '..');
const argv = process.argv.slice(2);
const file = resolve(argv.find((a) => !a.startsWith('--')) || '');
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const has = (n) => argv.includes('--' + n);
const kind = opt('kind', 'vj');
if (!existsSync(file)) { console.error('file not found: ' + file); process.exit(2); }

const run = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28 });
const probe = () => {
  const r = run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries',
    'stream=width,height,r_frame_rate,codec_name,pix_fmt,nb_frames:format=duration,bit_rate', '-of', 'json', file]);
  const j = JSON.parse(r.stdout || '{}'); const s = (j.streams || [])[0] || {};
  const [n, d] = String(s.r_frame_rate || '0/1').split('/').map(Number);
  return { width: s.width, height: s.height, fps: d ? n / d : 0, codec: s.codec_name, pix_fmt: s.pix_fmt || '',
    duration: Number(j.format?.duration || 0), mbps: Number(j.format?.bit_rate || 0) / 1e6, mb: statSync(file).size / 1048576 };
};

const SPEC = {
  vj:         { w: 1920, h: 1080, fps: 30, dur: [10, 20], maxMB: 8, loop: true },
  dj:         { w: 1920, h: 1080, fps: 30, dur: [8, 12], loop: true },
  image:      {},
  skybox:     { ratio: 2, minW: 4096, seam: true },
  decal:      { alpha: true },
  card:       { w: 1200, h: 630, ext: ['.jpg', '.jpeg'] },
  turnaround: { w: 2048, h: 2048 },
};
const spec = SPEC[kind]; if (!spec) { console.error('unknown --kind ' + kind); process.exit(2); }

const info = probe();
const checks = {}; const fails = [];
const rec = (name, ok, detail) => { checks[name] = ok ? 'pass' : 'FAIL' + (detail ? ` (${detail})` : ''); if (!ok) fails.push(name + (detail ? ': ' + detail : '')); };
const isVideo = ['.mp4', '.webm', '.mov'].includes(extname(file).toLowerCase());
const base = file.replace(/\.[^.]+$/, '');
let ssimLoop = null, ssimRef = null, sheet = null, seamImg = null;

if (isVideo) {
  if (spec.w) rec('size', info.width === spec.w && info.height === spec.h, `${info.width}x${info.height}, want ${spec.w}x${spec.h}`);
  if (spec.fps) rec('fps', Math.abs(info.fps - spec.fps) < 0.01, String(info.fps));
  if (spec.dur) rec('duration', info.duration >= spec.dur[0] - 0.05 && info.duration <= spec.dur[1] + 0.05, `${info.duration.toFixed(2)}s, want ${spec.dur[0]}-${spec.dur[1]}`);
  if (spec.maxMB) rec('filesize', info.mb <= spec.maxMB, `${info.mb.toFixed(1)} MB > ${spec.maxMB}`);
  const okCodec = extname(file) === '.webm' ? ['vp9', 'vp8', 'av1'].includes(info.codec) : info.codec === 'h264';
  rec('codec', okCodec, info.codec);

  // real motion, not a slideshow
  const fz = run('ffmpeg', ['-hide_banner', '-i', file, '-vf', 'freezedetect=n=0.003:d=0.5', '-map', '0:v', '-an', '-f', 'null', '-']);
  rec('freeze', !/freeze_start/.test(fz.stderr), 'frozen span >= 0.5s');
  // blank / black frames (a dead render shows up here)
  const bk = run('ffmpeg', ['-hide_banner', '-i', file, '-vf', 'blackdetect=d=0.5:pix_th=0.04:pic_th=0.995', '-an', '-f', 'null', '-']);
  rec('black', !/black_start/.test(bk.stderr), 'black span >= 0.5s');

  if (spec.loop) {
    const tmp = base + '__first.png', tmp2 = base + '__last.png';
    run('ffmpeg', ['-y', '-v', 'error', '-i', file, '-vf', 'select=eq(n\\,0)', '-frames:v', '1', tmp]);
    run('ffmpeg', ['-y', '-v', 'error', '-sseof', '-0.1', '-i', file, '-update', '1', tmp2]);
    const ss = run('ffmpeg', ['-hide_banner', '-i', tmp, '-i', tmp2, '-lavfi', 'ssim', '-f', 'null', '-']);
    const m = /All:([0-9.]+)/.exec(ss.stderr); ssimLoop = m ? Number(m[1]) : 0;
    // Reference: SSIM of an ordinary one-frame step at both ends (0->1 and N-2->N-1). Fast thin-line motion can sit
    // just under 0.90 on every step, seam or not; the seam passes if it is >= 0.90 OR no worse than a normal step.
    const nf = Math.round(info.duration * info.fps), tmp3 = base + '__f1.png', tmp4 = base + '__fN2.png';
    run('ffmpeg', ['-y', '-v', 'error', '-i', file, '-vf', 'select=eq(n\\,1)', '-frames:v', '1', tmp3]);
    run('ffmpeg', ['-y', '-v', 'error', '-i', file, '-vf', `select=eq(n\\,${nf - 2})`, '-frames:v', '1', tmp4]);
    const s01 = /All:([0-9.]+)/.exec(run('ffmpeg', ['-hide_banner', '-i', tmp, '-i', tmp3, '-lavfi', 'ssim', '-f', 'null', '-']).stderr);
    const sEnd = /All:([0-9.]+)/.exec(run('ffmpeg', ['-hide_banner', '-i', tmp4, '-i', tmp2, '-lavfi', 'ssim', '-f', 'null', '-']).stderr);
    ssimRef = Math.min(s01 ? Number(s01[1]) : 1, sEnd ? Number(sEnd[1]) : 1);
    rec('loop_ssim', ssimLoop >= 0.90 || ssimLoop >= ssimRef - 0.01, `${ssimLoop} < 0.90 and < normal step ${ssimRef.toFixed(4)} - 0.01`);
    for (const t of [tmp, tmp2, tmp3, tmp4]) try { unlinkSync(t); } catch {}
  }
  sheet = base + '_sheet.jpg';
  run('ffmpeg', ['-y', '-v', 'error', '-i', file, '-vf', `fps=${Math.max(1, Math.round(12 / Math.max(info.duration, 1)))},scale=360:-1,tile=6x2`, '-frames:v', '1', sheet]);
} else {
  if (spec.w) rec('size', info.width === spec.w && info.height === spec.h, `${info.width}x${info.height}, want ${spec.w}x${spec.h}`);
  if (spec.ext) rec('format', spec.ext.includes(extname(file).toLowerCase()), extname(file));
  if (spec.alpha) {
    rec('alpha_channel', /a/.test(info.pix_fmt.replace('gray', '')) && /rgba|ya|argb|bgra/.test(info.pix_fmt), info.pix_fmt);
    const tr = run('ffmpeg', ['-hide_banner', '-i', file, '-vf', 'alphaextract,signalstats,metadata=print:key=lavfi.signalstats.YMIN', '-f', 'null', '-']);
    rec('has_transparency', /YMIN=(\d+)/.test(tr.stderr) && Number(/YMIN=(\d+)/.exec(tr.stderr)[1]) < 16, 'no fully transparent pixels');
  }
  if (spec.ratio) {
    rec('ratio_2to1', info.width === spec.ratio * info.height, `${info.width}x${info.height}`);
    rec('min_width', info.width >= spec.minW, `${info.width} < ${spec.minW}`);
  }
  if (spec.seam) {
    // right 8px strip vs left 8px strip must be neighbours on the sphere
    const ss = run('ffmpeg', ['-hide_banner', '-i', file, '-i', file, '-lavfi',
      '[0:v]crop=8:ih:iw-8:0[a];[1:v]crop=8:ih:0:0[b];[a][b]ssim', '-f', 'null', '-']);
    const m = /All:([0-9.]+)/.exec(ss.stderr); const v = m ? Number(m[1]) : 0;
    rec('seam_ssim', v >= 0.85, `${v} < 0.85`);
    seamImg = base + '_seam.png';
    run('ffmpeg', ['-y', '-v', 'error', '-i', file, '-i', file, '-filter_complex',
      '[0:v]crop=64:ih:iw-64:0[a];[1:v]crop=64:ih:0:0[b];[a][b]hstack,scale=iw*4:ih/2', '-frames:v', '1', seamImg]);
    sheet = base + '_preview.jpg';
    run('ffmpeg', ['-y', '-v', 'error', '-i', file, '-vf', 'scale=1600:-1', '-frames:v', '1', sheet]);
  }
}

const pass = fails.length === 0;
const out = { file: relative(root, file).replaceAll('\\', '/'), kind, pass, specs: `${info.width}x${info.height}${isVideo ? ` ${info.fps.toFixed(0)}fps ${info.codec} ${info.mbps.toFixed(1)}Mbps ${info.duration.toFixed(1)}s` : ''}`,
  checks, loop_ssim: ssimLoop, loop_ssim_step_ref: ssimRef, look_at: [sheet, seamImg].filter(Boolean).map((p) => relative(root, p).replaceAll('\\', '/')) };
console.log(JSON.stringify(out, null, 2));

if (has('commit')) {
  const looked = (opt('looked', '') || '').trim();
  if (pass && !looked) { console.error('\nNOT COMMITTED: pass --looked "<one honest sentence about what you saw in the contact sheet>" after you open it.'); process.exit(1); }
  if (pass) {
    const line = { file: out.file, job: opt('job', kind), world: opt('world', ''), source: opt('source', ''), ai_generated: opt('ai', 'false') === 'true',
      specs: out.specs, checks: Object.fromEntries(Object.entries(checks).map(([k, v]) => [k, v])), ...(ssimLoop != null ? { loop_ssim: ssimLoop, loop_ssim_step_ref: ssimRef } : {}),
      looked_at: looked, date: new Date().toISOString().slice(0, 10) };
    const mPath = join(shift, 'manifest.jsonl');
    const existing = existsSync(mPath) ? readFileSync(mPath, 'utf8').split('\n').filter((l) => l.trim().length > 0) : [];
    const filtered = existing.filter((l) => { try { return JSON.parse(l).file !== out.file; } catch { return true; } });
    filtered.push(JSON.stringify(line));
    writeFileSync(mPath, filtered.join('\n') + '\n');
    console.log('\nCOMMITTED to manifest.jsonl');
  } else {
    const dest = join(root, '_rejected', basename(file, extname(file))); mkdirSync(dest, { recursive: true });
    for (const p of [file, sheet, seamImg]) if (p && existsSync(p)) renameSync(p, join(dest, basename(p)));
    writeFileSync(join(dest, 'reason.txt'), fails.join('\n') + '\n');
    console.log('\nREJECTED -> ' + relative(root, dest).replaceAll('\\', '/'));
    process.exit(1);
  }
}
process.exit(pass ? 0 : 1);
