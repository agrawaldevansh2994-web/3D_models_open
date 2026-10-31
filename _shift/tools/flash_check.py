#!/usr/bin/env python3
"""Photosensitivity flash check for a VJ loop (approximation of the WCAG 2.3.1 general-flash rule).

python3 tools/flash_check.py <video> [--max 3]

Decodes the video to 64x36 gray. In every 4x4 tile (~1/16 of the screen, larger than the WCAG small-area cut-off)
it finds luminance swings of >= 10% of full scale where the darker side is < 80%. A "flash" is a pair of opposing
swings. Reports the worst flashes-per-second over any 1-second window, per tile, plus the whole-frame mean.
Exit 0 if the worst is <= --max (default 3), else 1.
Relative luminance is approximated from gamma-encoded luma (gray), so it is a screening check, not a certified test.
"""
import subprocess, sys, json
import numpy as np

f = sys.argv[1]
mx = float(sys.argv[sys.argv.index('--max') + 1]) if '--max' in sys.argv else 3.0
W, H, FPS = 64, 36, 30
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-vf', f'scale={W}:{H}:flags=area,format=gray', '-f', 'rawvideo', '-'],
                     capture_output=True, check=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32) / 255.0
lin = np.where(fr <= 0.04045, fr / 12.92, ((fr + 0.055) / 1.055) ** 2.4)   # to linear light
tiles = lin.reshape(len(lin), 4, H // 4, 4, W // 4).mean(axis=(2, 4)).reshape(len(lin), 16)
series = {'frame': lin.mean(axis=(1, 2))}
for i in range(16): series[f't{i}'] = tiles[:, i]

def flashes_per_sec(s):
    # turning points with >=0.1 swing and darker side < 0.8 (hysteresis walk)
    ext, cur_min, cur_max, direction, events = [], s[0], s[0], 0, []
    lo, hi = s[0], s[0]
    for k, v in enumerate(s):
        if direction >= 0:
            if v > hi: hi = v
            if hi - v >= 0.1 and min(v, hi) < 0.8:
                events.append(k); direction = -1; lo = v
        if direction <= 0:
            if v < lo: lo = v
            if v - lo >= 0.1 and lo < 0.8:
                events.append(k); direction = 1; hi = v
    ev = np.array(events)
    worst = 0
    for k in range(len(s)):
        n = ((ev >= k) & (ev < k + FPS)).sum()
        worst = max(worst, n / 2.0)   # two opposing transitions = one flash
    return worst

res = {k: flashes_per_sec(v) for k, v in series.items()}
worst_key = max(res, key=res.get)
jump = float(np.abs(np.diff(series['frame'])).max())
out = {'file': f, 'frames': len(lin), 'worst_flashes_per_sec': res[worst_key], 'worst_region': worst_key,
       'whole_frame_flashes_per_sec': res['frame'], 'max_frame_to_frame_mean_lum_jump': round(jump, 4),
       'limit': mx, 'pass': res[worst_key] <= mx}
print(json.dumps(out, indent=2))
sys.exit(0 if out['pass'] else 1)
