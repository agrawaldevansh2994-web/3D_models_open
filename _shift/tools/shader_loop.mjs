// Procedural VJ loop renderer: GLSL fragment shader -> frame-stepped headless WebGL -> ffmpeg (H.264 mp4 + VP9 webm).
// Seamless by construction: frame i uses u_loop = i/N, so frame N would equal frame 0. Shaders must be periodic in u_loop.
// Headless only (AGENTS.md rule 1). No AI involved -> ai_generated:false.
//
//   node tools/shader_loop.mjs list
//   node tools/shader_loop.mjs test <theme> [variant]     # 1 s, 640x360 preview PNG strip in _scratch/, no outputs
//   node tools/shader_loop.mjs render <theme> [variant]   # full 1920x1080 -> vj_loops/<theme>/<variant>.mp4 + .webm
//   options: --gl angle|swiftshader (default angle)
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const shift = resolve(here, '..');
const root = resolve(shift, '..');
const argv = process.argv.slice(2);
const [cmd, theme, only] = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const variants = JSON.parse(readFileSync(join(here, 'shaders', 'variants.json'), 'utf8'));

if (cmd === 'list' || !cmd) {
  for (const [t, v] of Object.entries(variants)) console.log(`${t.padEnd(18)} ${v.world.padEnd(34)} ${v.variants.map((x) => x.name).join(', ')}`);
  process.exit(0);
}
const def = variants[theme];
if (!def) { console.error(`unknown theme "${theme}". run: node tools/shader_loop.mjs list`); process.exit(1); }
const list = def.variants.filter((v) => !only || v.name === only);
if (!list.length) { console.error('no such variant'); process.exit(1); }

const prelude = readFileSync(join(here, 'shaders', '_prelude.glsl'), 'utf8');
const body = readFileSync(join(here, 'shaders', def.shader), 'utf8');
const fsrc = prelude + '\n' + body;
const preludeLines = prelude.split('\n').length;

const glArgs = (flag('gl', 'angle') === 'swiftshader')
  ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  : ['--use-gl=angle', '--use-angle=d3d11', '--disable-gpu-watchdog'];
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined,
  headless: true,
  args: ['--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-watchdog', '--js-flags=--max-old-space-size=4096', ...glArgs]
});

try {
  for (const v of list) {
    const test = cmd === 'test';
    const W = test ? 640 : 1920, H = test ? 360 : 1080, FPS = 30;
    const secs = test ? 1 : v.seconds, N = Math.round(secs * FPS);
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    page.setDefaultTimeout(0);
    page.on('pageerror', (e) => console.error('[page error]', e.message));
    await page.setContent(`<body style="margin:0;background:#000"><canvas id=c width=${W} height=${H}></canvas></body>`);
    const info = await page.evaluate(({ fsrc, W, H }) => {
      const c = document.getElementById('c');
      const gl = c.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
      if (!gl) return { error: 'no webgl2' };
      const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : (() => { throw new Error(gl.getShaderInfoLog(s)); })(); };
      try {
        const vs = mk(gl.VERTEX_SHADER, '#version 300 es\nin vec2 p; void main(){ gl_Position=vec4(p,0.,1.); }');
        const fs = mk(gl.FRAGMENT_SHADER, fsrc);
        const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
        if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
        gl.useProgram(pr);
        const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        const U = (n) => gl.getUniformLocation(pr, n);
        window.draw = (loop, seed, hue, p) => {
          gl.viewport(0, 0, W, H);
          gl.uniform2f(U('u_res'), W, H); gl.uniform1f(U('u_loop'), loop); gl.uniform1f(U('u_seed'), seed);
          gl.uniform1f(U('u_hue'), hue); gl.uniform4f(U('u_p'), p[0], p[1], p[2], p[3]);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          return c.toDataURL('image/png').slice(22);
        };
        return { renderer: (() => { const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; })() };
      } catch (e) { return { error: String(e.message) }; }
    }, { fsrc, W, H });
    if (info.error) {
      console.error('SHADER ERROR (line numbers below are in the combined file; your .frag starts at line ' + (preludeLines + 1) + '):\n' + info.error);
      process.exitCode = 1; break;
    }
    console.log(`[${theme}/${v.name}] ${W}x${H} ${N} frames  GPU: ${info.renderer}`);

    let ff, outBase = null;
    if (test) {
      mkdirSync(join(shift, '_scratch'), { recursive: true });
      outBase = join(shift, '_scratch', `${theme}_${v.name}`);
      const picks = [0, 0.25, 0.5, 0.75];
      const pngs = [];
      for (const q of picks) pngs.push(await page.evaluate(([l, s, h, p]) => window.draw(l, s, h, p), [q, v.seed, v.hue, v.p]));
      pngs.forEach((b, i) => writeFileSync(`${outBase}_f${i}.png`, Buffer.from(b, 'base64')));
      console.log(`test frames: ${outBase}_f0..f3.png  (open them and LOOK before rendering)`);
      await page.close(); continue;
    }
    const dir = join(root, 'vj_loops', theme); mkdirSync(dir, { recursive: true });
    outBase = join(dir, v.name);
    const mbps = (7.2 * 8) / secs; // keep each file under ~7.6 MB (spec is <= 8 MB)
    ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-map', '0:v', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '17', '-maxrate', mbps.toFixed(2) + 'M', '-bufsize', (mbps * 2).toFixed(2) + 'M', '-preset', 'slow', '-movflags', '+faststart', outBase + '.mp4',
      '-map', '0:v', '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuv420p', '-crf', '33', '-b:v', mbps.toFixed(2) + 'M', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', outBase + '.webm'],
      { stdio: ['pipe', 'inherit', 'inherit'] });
    ff.stdin.on('error', () => {}); // ffmpeg died: the exit code below reports it
    const done = new Promise((res) => ff.on('close', res));
    for (let i = 0; i < N; i++) {
      const b64 = await page.evaluate(([l, s, h, p]) => window.draw(l, s, h, p), [i / N, v.seed, v.hue, v.p]);
      if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
      if (i % 90 === 0) process.stdout.write(`  frame ${i}/${N}\r`);
    }
    ff.stdin.end(); const code = await done; await page.close();
    if (code !== 0) { console.error('ffmpeg failed (exit ' + code + ')'); process.exitCode = 1; break; }
    console.log(`\n  -> ${outBase}.mp4 / .webm\n  next: node tools/checks.mjs "${outBase}.mp4" --kind vj   (then open the _sheet.jpg, then re-run with --commit ...)`);
  }
} finally { await browser.close(); }
