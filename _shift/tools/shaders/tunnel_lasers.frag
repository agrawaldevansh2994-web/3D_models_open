// Lasers & tunnels (Laser Forest, Forest Rave).
// Straight beams: distance is the Euclidean distance to each ray, so beams stay straight through the frame edges
// (checked with tools/edge_check.mjs; no atan wrap seam lands on a beam).
// Each variant (u_seed 1..6) has a distinct stage laser geometry so no two variants read the same at a glance.

// Exact Euclidean distance to N_even straight radial rays from `orig`, rotated by `ang`.
// Because N_even is an even integer and rays sit at fract(a/seg) = 0.5, the atan +-PI branch cut
// always lands at fract = 0.0 (the dark midpoint between rays), never on a beam.
vec2 laserFan(vec2 uv, vec2 orig, float nBeams, float ang, float baseW, float spreadW) {
  float N = max(4.0, 2.0 * floor(nBeams * 0.5 + 0.5));
  float seg = TAU / N;
  vec2 q = rot(-ang) * (uv - orig);
  float rq = length(q) + 1e-5;
  float a = atan(q.y, q.x);
  float cell = floor(a / seg);
  float relA = (fract(a / seg) - 0.5) * seg;
  float d = rq * sin(min(abs(relA), 1.5707963));
  float w = baseW + spreadW * rq;
  float core = smoothstep(w, w * 0.12, d);
  float halo = exp(-d / (w * 2.4));
  float fade = smoothstep(0.015, 0.18, rq);
  float parity = mod(abs(cell), 2.0);
  return vec2((core * 1.35 + halo * 0.55) * fade, parity);
}

// Straight laser line segment / infinite line helper for scanning sheets
float laserLine(vec2 uv, vec2 p0, vec2 dir, float w) {
  vec2 dVec = uv - p0;
  float perp = abs(dVec.x * dir.y - dVec.y * dir.x);
  return smoothstep(w, w * 0.15, perp) * 1.2 + exp(-perp / (w * 2.5)) * 0.5;
}

vec3 scene(vec2 uv) {
  float N = floor(u_p.x), K = floor(u_p.y), M = floor(u_p.z);
  int mode = int(floor(u_seed + 0.5));
  vec3 c1 = pal(0.00, u_hue);
  vec3 c2 = pal(0.42, u_hue);
  vec3 c3 = mix(c1, c2, 0.5);
  vec3 col = vec3(0.0);

  if (mode == 1) {
    // Variant 1 (lasers_01_twelve_fan): Classic 12-beam symmetric tunnel fan, straight beams to the frame edges
    float r = length(uv) + 1e-3;
    float rot1 = (u_loop * 2.0 * M) * (TAU / N) + 0.12 * sin(LA);
    vec2 f1 = laserFan(uv, vec2(0.0), N, rot1, 0.0055, 0.0035);
    vec3 bCol = mix(c1, c2, f1.y);
    // Subtle secondary counter-rotating thin needle set (locked to sharp core so crossings never smudge)
    float rot2 = -(u_loop * 2.0 * M) * (TAU / N) + 0.5 * (TAU / N);
    vec2 f2 = laserFan(uv, vec2(0.0), N * 0.5, rot2, 0.0035, 0.0020);
    // Perspective tunnel depth rings in the background only (does not pinch beam width at edges)
    float z = 0.45 / (r + 0.08);
    float ring = pow(0.5 + 0.5 * cos(z * TAU - LA * K), 12.0) * smoothstep(0.05, 0.35, r) * smoothstep(1.8, 0.4, r);
    col += bCol * f1.x * (1.05 + 0.35 * ring);
    col += c2 * f2.x * 0.85;
    col += c3 * ring * 0.12;
    col += c3 * u_p.w * 0.0035 / (r * r + 0.015);
  } else if (mode == 2) {
    // Variant 2 (lasers_02_dense_fan): Twin bottom stage-floor laser cannons sweeping crisscrossing straight beams upward
    vec2 origL = vec2(-0.72, -0.88);
    vec2 origR = vec2( 0.72, -0.88);
    float swayL = 0.18 * sin(LA * M) + (u_loop * 2.0) * (TAU / N);
    float swayR = -0.18 * cos(LA * M) - (u_loop * 2.0) * (TAU / N);
    vec2 fL = laserFan(uv, origL, N, swayL, 0.0040, 0.0025);
    vec2 fR = laserFan(uv, origR, N, swayR, 0.0040, 0.0025);
    col += c1 * fL.x * 1.1;
    col += c2 * fR.x * 1.1;
    // Emitter floor hotspots
    col += c1 * 0.003 / (dot(uv - origL, uv - origL) + 0.012);
    col += c2 * 0.003 / (dot(uv - origR, uv - origR) + 0.012);
  } else if (mode == 3) {
    // Variant 3 (lasers_03_wide_beams): Architectural 8-beam heavy rails + rushing straight-edged octagonal laser frames
    float r = length(uv) + 1e-3;
    float rot1 = (u_loop * 2.0 * M) * (TAU / 8.0);
    vec2 f1 = laserFan(uv, vec2(0.0), 8.0, rot1, 0.0080, 0.0045);
    // Octagonal polygon distance for straight-edged tunnel rings
    vec2 qp = rot(-rot1 + TAU / 16.0) * uv;
    float seg8 = TAU / 8.0;
    float rel8 = (fract(atan(qp.y, qp.x) / seg8) - 0.5) * seg8;
    float polyR = length(qp) * cos(rel8) + 1e-3;
    float z = 0.50 / (polyR + 0.06);
    float octRing = pow(0.5 + 0.5 * cos(z * TAU - LA * K), 16.0) * smoothstep(0.06, 0.25, polyR);
    col += c1 * f1.x * 1.25;
    col += c2 * octRing * (0.45 + 0.55 * f1.x);
    col += c3 * 0.004 / (polyR * polyR + 0.02);
  } else if (mode == 4) {
    // Variant 4 (lasers_04_thirtytwo_rays): 32-ray high-density starburst needles + dual horizontal scanning laser sheets
    float r = length(uv) + 1e-3;
    float rot1 = (u_loop * 2.0) * (TAU / 32.0) + 0.035 * sin(LA); // slower: 32 thin rays at 4 steps/loop dropped the loop-seam SSIM to 0.899
    vec2 f1 = laserFan(uv, vec2(0.0), 32.0, rot1, 0.0030, 0.0018);
    float scanY1 = 0.55 * sin(LA * M);
    float scanY2 = -0.55 * cos(LA * M);
    float sheet1 = laserLine(uv, vec2(0.0, scanY1), vec2(1.0, 0.0), 0.006);
    float sheet2 = laserLine(uv, vec2(0.0, scanY2), vec2(1.0, 0.0), 0.006);
    // Crisp central aperture ring
    float ringD = abs(r - (0.28 + 0.04 * sin(LA * K)));
    float aperture = smoothstep(0.010, 0.002, ringD) + 0.4 * exp(-ringD / 0.02);
    col += mix(c1, c2, f1.y) * f1.x * 1.05;
    col += c2 * sheet1 * 0.85 + c1 * sheet2 * 0.85;
    col += c3 * aperture * 0.9;
  } else if (mode == 5) {
    // Variant 5 (lasers_05_slow_sixteen): Overhead truss laser harp canopy fanning downward across the stage
    vec2 origTop = vec2(0.0, 0.92);
    float rotTop = 0.14 * sin(LA * M) + (u_loop * 2.0) * (TAU / 16.0);
    vec2 fTop = laserFan(uv, origTop, 16.0, rotTop, 0.0055, 0.0032);
    // Secondary upward counter-fan from bottom center
    vec2 origBot = vec2(0.0, -0.92);
    float rotBot = -0.14 * cos(LA * M) - (u_loop * 2.0) * (TAU / 12.0);
    vec2 fBot = laserFan(uv, origBot, 12.0, rotBot, 0.0040, 0.0025);
    col += c1 * fTop.x * 1.15;
    col += c2 * fBot.x * 0.75;
    col += c1 * 0.004 / (dot(uv - origTop, uv - origTop) + 0.015);
  } else {
    // Variant 6 (lasers_06_twin_spin): Dual horizontally opposed laser hubs spinning in opposite directions
    vec2 hubL = vec2(-0.58, 0.08 * sin(LA));
    vec2 hubR = vec2( 0.58, -0.08 * sin(LA));
    float rotL =  (u_loop * 2.0 * M) * (TAU / 16.0);
    float rotR = -(u_loop * 2.0 * M) * (TAU / 16.0);
    vec2 fL = laserFan(uv, hubL, 16.0, rotL, 0.0045, 0.0028);
    vec2 fR = laserFan(uv, hubR, 16.0, rotR, 0.0045, 0.0028);
    col += c1 * fL.x * 1.1;
    col += c2 * fR.x * 1.1;
    col += c1 * 0.0035 / (dot(uv - hubL, uv - hubL) + 0.015);
    col += c2 * 0.0035 / (dot(uv - hubR, uv - hubR) + 0.015);
  }

  return col;
}
