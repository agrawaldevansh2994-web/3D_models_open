// Gold glyph marks on deep blue-black (Pyramids at Night).
// Abstract geometric glyph-like symbols only (never real letters or readable text).
// Each variant (u_seed 1..6) has a distinct architectural/geometric layout so no two variants look the same at a glance.

float sdSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

// 8 distinct geometric pseudo-glyphs (eye, loop-cross, waves, pyramid, diamond-scarab, sun-disc, djed-pillar, crescent)
float glyph(vec2 q, float t) {
  float d = 9.0;
  if (t < 0.125) {
    // 1. Geometric Eye
    vec2 e = q * vec2(1.0, 1.75);
    d = min(abs(length(e) - 0.62), abs(length(q) - 0.16));
    d = min(d, sdSeg(q, vec2(-0.75, 0.48), vec2(0.75, 0.48)));
    d = min(d, sdSeg(q, vec2(0.0, -0.35), vec2(0.25, -0.72)));
  } else if (t < 0.25) {
    // 2. Loop-cross (Ankh-like geometric mark)
    d = min(abs(length(q - vec2(0.0, 0.42)) - 0.26), sdSeg(q, vec2(0.0, 0.16), vec2(0.0, -0.78)));
    d = min(d, sdSeg(q, vec2(-0.42, -0.05), vec2(0.42, -0.05)));
  } else if (t < 0.375) {
    // 3. Triple Nile water waves
    for (int i = 0; i < 3; i++) {
      float y = -0.45 + 0.45 * float(i);
      d = min(d, abs(q.y - y - 0.11 * sin(q.x * 5.2)));
    }
    d = max(d, abs(q.x) - 0.76);
  } else if (t < 0.50) {
    // 4. Stepped Pyramid + Apex Sun
    d = min(sdSeg(q, vec2(-0.75, -0.65), vec2(0.75, -0.65)), sdSeg(q, vec2(-0.75, -0.65), vec2(0.0, 0.45)));
    d = min(d, sdSeg(q, vec2(0.75, -0.65), vec2(0.0, 0.45)));
    d = min(d, sdSeg(q, vec2(-0.45, -0.20), vec2(0.45, -0.20)));
    d = min(d, abs(length(q - vec2(0.0, 0.68)) - 0.12));
  } else if (t < 0.625) {
    // 5. Nested Diamond + Wing Bars
    float dia = abs(q.x) + abs(q.y);
    d = min(abs(dia - 0.55) * 0.707, abs(dia - 0.25) * 0.707);
    d = min(d, sdSeg(q, vec2(-0.78, 0.0), vec2(-0.55, 0.0)));
    d = min(d, sdSeg(q, vec2( 0.55, 0.0), vec2( 0.78, 0.0)));
  } else if (t < 0.75) {
    // 6. Sun Disc + 8 Rays
    d = abs(length(q) - 0.28);
    for (int i = 0; i < 8; i++) {
      float an = float(i) * TAU / 8.0;
      vec2 dir = vec2(cos(an), sin(an));
      d = min(d, sdSeg(q, dir * 0.42, dir * 0.74));
    }
  } else if (t < 0.875) {
    // 7. Tiered Djed Pillar
    d = min(sdSeg(q, vec2(-0.18, -0.75), vec2(-0.12, 0.65)), sdSeg(q, vec2(0.18, -0.75), vec2(0.12, 0.65)));
    for (int i = 0; i < 4; i++) {
      float y = 0.15 + 0.18 * float(i);
      d = min(d, sdSeg(q, vec2(-0.46, y), vec2(0.46, y)));
    }
    d = min(d, sdSeg(q, vec2(-0.42, -0.75), vec2(0.42, -0.75)));
  } else {
    // 8. Lotus / Crescent Arc + Vertical Plume
    d = min(abs(length(q - vec2(0.0, -0.15)) - 0.52), sdSeg(q, vec2(0.0, -0.67), vec2(0.0, 0.70)));
    d = min(d, sdSeg(q, vec2(0.0, -0.15), vec2(-0.45, 0.45)));
    d = min(d, sdSeg(q, vec2(0.0, -0.15), vec2( 0.45, 0.45)));
  }
  return d;
}

vec3 scene(vec2 uv) {
  float C = floor(u_p.x), Pn = floor(u_p.y), R = floor(u_p.z);
  int mode = int(floor(u_seed + 0.5));

  // Deep midnight blue-black ground + burnished 24k gold palette
  vec3 bgBlue = vec3(0.0025, 0.0065, 0.022) * (1.1 - 0.35 * length(uv * vec2(0.6, 0.9)));
  vec3 gold   = mix(vec3(1.0, 0.76, 0.18), vec3(1.0, 0.56, 0.10), clamp(u_hue, 0.0, 1.0));
  vec3 hiGold = vec3(1.0, 0.94, 0.72);
  vec3 col = bgBlue;

  if (mode == 1) {
    // Variant 1 (pyr_01_gold_columns): Vertical temple cartouche columns with double golden borders
    float cell = 2.0 / C;
    vec2 g = vec2(uv.x, uv.y + u_loop * R * cell) / cell;
    vec2 id = floor(g);
    vec2 f = fract(g);
    vec2 q = (f - 0.5) * 2.0 / u_p.w;
    id.y = mod(id.y, R);
    float h = hash21(id + u_seed);
    float d = glyph(q, h);
    float stroke = smoothstep(0.075, 0.030, d), halo = exp(-d * 9.0);
    // Double vertical cartouche pillar lines between columns
    float colBorder = smoothstep(0.045, 0.012, abs(f.x - 0.04)) + smoothstep(0.045, 0.012, abs(f.x - 0.96));
    float pulse = pow(0.5 + 0.5 * cos(uv.y * 2.6 + LA * Pn + id.x * 0.9), 5.0);
    col += gold * (stroke * (0.45 + 1.45 * pulse) + halo * 0.22 * (0.4 + pulse) + colBorder * 0.55);
    col += hiGold * smoothstep(0.032, 0.008, d) * pulse * 0.85;
  } else if (mode == 2) {
    // Variant 2 (pyr_02_wide_glyphs): Monumental central stepped pyramid + horizontal counter-scrolling glyph friezes
    vec2 puv = uv - vec2(0.0, -0.15);
    float pyrDist = max(abs(puv.x) * 1.15 + puv.y * 0.85 - 0.42, -puv.y - 0.48);
    float inPyr = smoothstep(0.02, -0.02, pyrDist);
    float pyrOutline = smoothstep(0.022, 0.004, abs(pyrDist)) + smoothstep(0.018, 0.003, abs(pyrDist + 0.12));
    // Horizontal frieze bands in background
    float cell = 2.0 / 6.0;
    float rowIdx = floor((uv.y + 1.0) / cell);
    float dir = mod(rowIdx, 2.0) * 2.0 - 1.0;
    vec2 g = vec2(uv.x / cell + dir * u_loop * R, (uv.y + 1.0) / cell);
    vec2 id = vec2(mod(floor(g.x), R), rowIdx);
    vec2 f = fract(g);
    float h = hash21(id + 13.0);
    float d = glyph((f - 0.5) * 2.4, h);
    float frieze = (smoothstep(0.075, 0.03, d) + 0.2 * exp(-d * 8.0)) * (1.0 - 0.82 * inPyr);
    float rowLine = smoothstep(0.04, 0.01, abs(f.y - 0.04));
    // Glowing apex eye inside pyramid
    float apexD = glyph((uv - vec2(0.0, 0.04)) * 3.8, 0.05);
    float apex = smoothstep(0.06, 0.015, apexD) * inPyr;
    float pulse = 0.5 + 0.5 * cos(LA * Pn - length(uv) * 3.0);
    col += gold * (frieze * (0.55 + 0.75 * pulse) + rowLine * 0.45 * (1.0 - inPyr) + pyrOutline * 1.65);
    col += hiGold * (apex * (1.2 + 0.8 * pulse) + pyrOutline * 0.65 * pulse);
  } else if (mode == 3) {
    // Variant 3 (pyr_03_dense_script): Concentric circular Zodiac / Temple Astrolabe wheel of rotating golden glyphs
    float r = length(uv);
    float ringW = 0.24;
    float ringIdx = floor(r / ringW);
    float rf = fract(r / ringW);
    float nCells = max(6.0, ringIdx * 6.0);
    float dir = mod(ringIdx, 2.0) * 2.0 - 1.0;
    float seg = TAU / nCells;
    vec2 qp = rot(-dir * (u_loop * 2.0) * seg) * uv;
    float a = atan(qp.y, qp.x);
    float cellA = mod(floor(a / seg), nCells);
    float af = fract(a / seg);
    vec2 q = vec2((af - 0.5) * 2.3, (rf - 0.5) * 2.3);
    float h = hash21(vec2(cellA, ringIdx) + 29.0);
    float d = (ringIdx >= 1.0 && ringIdx <= 4.0) ? glyph(q, h) : 9.0;
    float stroke = smoothstep(0.085, 0.03, d);
    float ringRim = smoothstep(0.045, 0.010, abs(rf - 0.05)) * step(ringIdx, 4.5);
    float sunCenter = smoothstep(0.04, 0.008, glyph(uv * 5.2, 0.68));
    float pulse = pow(0.5 + 0.5 * cos(LA * Pn - ringIdx * 1.1), 4.0);
    col += gold * (stroke * (0.65 + 1.15 * pulse) + ringRim * 0.85 + sunCenter * 1.6);
    col += hiGold * stroke * pulse * 0.75;
  } else if (mode == 4) {
    // Variant 4 (pyr_04_ember_rain): Diagonal 45-degree diamond-coffered tomb wall carvings + rising golden sparks
    float scale = 3.2;
    vec2 dUv = rot(0.785398) * uv * scale + vec2(u_loop * 4.0, u_loop * 4.0);
    vec2 id = mod(floor(dUv), 4.0);
    vec2 f = fract(dUv);
    float coffer = smoothstep(0.05, 0.012, min(abs(f.x - 0.04), abs(f.y - 0.04)));
    vec2 q = rot(-0.785398) * ((f - 0.5) * 2.5);
    float h = hash21(id + 41.0);
    float d = glyph(q, h);
    float stroke = smoothstep(0.08, 0.03, d);
    float pulse = pow(0.5 + 0.5 * cos(LA * Pn + h * TAU), 5.0);
    // Rising golden desert embers
    vec2 eUv = vec2(uv.x * 6.0, uv.y * 6.0 - u_loop * 6.0);
    vec2 eId = vec2(floor(eUv.x), mod(floor(eUv.y), 6.0));
    vec2 eF = fract(eUv) - 0.5;
    vec2 eOff = (hash22(eId + 73.0) - 0.5) * 0.55;
    float ember = smoothstep(0.08, 0.01, length(eF - eOff)) * step(0.45, hash21(eId + 19.0));
    col += gold * (stroke * (0.45 + 1.25 * pulse) + coffer * 0.45 + ember * 1.4);
    col += hiGold * (ember * 0.9 + stroke * pulse * 0.6);
  } else if (mode == 5) {
    // Variant 5 (pyr_05_slow_temple): Receding 3D square temple portal frames with glyph-carved stone lintels
    vec2 b = abs(uv) / vec2(1.45, 1.0);
    float boxR = max(b.x, b.y) + 1e-3;
    float z = 0.65 / (boxR + 0.08) - u_loop * 2.0;
    float tierId = mod(floor(z), 4.0);
    float fz = fract(z);
    float portalRim = smoothstep(0.05, 0.01, abs(fz - 0.08)) + smoothstep(0.05, 0.01, abs(fz - 0.92));
    float along = (b.x > b.y) ? (uv.y / boxR) : (uv.x / boxR);
    float gCell = fract(along * 4.0);
    float gIdx = mod(floor(along * 4.0), 8.0);
    vec2 q = vec2((gCell - 0.5) * 2.3, (fz - 0.5) * 2.3);
    float h = hash21(vec2(gIdx, tierId) + 53.0);
    float d = glyph(q, h);
    float stroke = smoothstep(0.085, 0.03, d) * smoothstep(0.08, 0.22, boxR);
    float pulse = 0.5 + 0.5 * cos(LA * Pn - z * 1.8);
    col += gold * (stroke * (0.55 + 1.1 * pulse) + portalRim * 0.85 * smoothstep(0.06, 0.18, boxR));
    col += hiGold * portalRim * pulse * 0.55 * smoothstep(0.06, 0.18, boxR);
  } else {
    // Variant 6 (pyr_06_pulse_grid): Sacred hexagonal/triangular monument grid + radial golden shockwave rings
    float cell = 2.0 / C;
    float row = floor((uv.y + 1.0) / cell);
    float xShift = mod(row, 2.0) * 0.5 * cell;
    vec2 g = vec2((uv.x + xShift) / cell, (uv.y + 1.0) / cell);
    vec2 id = floor(g);
    vec2 f = fract(g);
    vec2 q = (f - 0.5) * 2.25;
    float hexFrame = smoothstep(0.05, 0.012, abs(max(abs(q.x) * 0.866 + abs(q.y) * 0.5, abs(q.y)) - 0.95));
    float h = hash21(id + 67.0);
    float d = glyph(q, mod(h + u_loop, 1.0));
    float stroke = smoothstep(0.08, 0.03, d);
    float r = length(uv);
    float wave = pow(0.5 + 0.5 * cos(r * 7.5 - LA * Pn), 8.0);
    col += gold * (stroke * (0.45 + 1.65 * wave) + hexFrame * (0.28 + 0.65 * wave));
    col += hiGold * (stroke * wave * 0.95 + exp(-abs(r - fract(u_loop * Pn) * 1.6) * 14.0) * 0.55);
  }

  return col;
}
