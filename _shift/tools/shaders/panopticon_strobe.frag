// Strobe / industrial black, orange and white only (Panopticon).
// Strobe rate is capped by Pn <= 16 pulses per loop (<= ~1.4/s for these loop lengths). Strobes are localized, never a full-screen
// white flash. Check each render with tools/flash_check.py (WCAG-style screening, not a certified test).
// All radial spokes/beams use Euclidean perpendicular distance so they run straight through the outer 120px edge band.
// Each variant (u_seed 1..6) has a distinct industrial structure so no two variants look the same at a glance.

float straightSpokes(vec2 uv, vec2 orig, float nSpokes, float ang, float w) {
  float N = max(4.0, 2.0 * floor(nSpokes * 0.5 + 0.5));
  float seg = TAU / N;
  vec2 q = rot(-ang) * (uv - orig);
  float rq = length(q) + 1e-5;
  float relA = (fract(atan(q.y, q.x) / seg) - 0.5) * seg;
  float d = rq * sin(min(abs(relA), 1.5707963));
  return smoothstep(w, w * 0.15, d) * smoothstep(0.02, 0.12, rq);
}

vec3 scene(vec2 uv) {
  float R = floor(u_p.x), M = 2.0 * floor(u_p.y * 0.5 + 0.5), K = floor(u_p.z);
  float Pn = min(floor(u_p.w), 16.0); // safely <= ~1.3 pulses/sec
  int mode = int(floor(u_seed + 0.5));

  vec3 orange = mix(vec3(1.0, 0.34, 0.01), vec3(1.0, 0.52, 0.03), clamp(u_hue, 0.0, 1.0));
  vec3 white  = vec3(1.0, 0.98, 0.95);
  float strobe = 0.30 + 0.70 * step(0.15, cos(LA * Pn)); // crisp industrial stepped strobe, localized
  vec3 col = vec3(0.0);

  if (mode == 1) {
    // Variant 1 (pan_01_hazard_rings): Concentric turbine hazard rings + white rims + dual straight searchlight sweeps
    float r = length(uv);
    float rr = r * R * 0.52, band = floor(rr), f = fract(rr);
    float dir = mod(band, 2.0) * 2.0 - 1.0;
    vec2 q = rot(-dir * (u_loop * K) * (TAU / M)) * uv;
    float s = fract(atan(q.y, q.x) / TAU * M + f * 1.5);
    float stripe = smoothstep(0.42, 0.46, s) * smoothstep(0.94, 0.90, s);
    float body = smoothstep(0.12, 0.16, f) * smoothstep(0.88, 0.84, f);
    float rim  = smoothstep(0.035, 0.005, abs(f - 0.06)) + smoothstep(0.035, 0.005, abs(f - 0.94));
    float sweepCore = straightSpokes(uv, vec2(0.0), 4.0, LA * K, 0.010 + 0.004 * r);
    float sweepHalo = straightSpokes(uv, vec2(0.0), 4.0, LA * K, 0.045 + 0.020 * r);
    float bandStrobe = 0.5 + 0.5 * step(0.2, cos(LA * Pn - band * 1.1));
    col += orange * (stripe * body * 0.85 * bandStrobe + sweepHalo * 1.1);
    col += white  * (rim * 0.95 * strobe + sweepCore * 1.6);
    col *= smoothstep(2.2, 0.4, r);
    col += white * sweepCore * 0.9; // keep sweep beams crisp through outer edge
  } else if (mode == 2) {
    // Variant 2 (pan_02_radar_sweep): Octagonal watchtower HUD crosshair + 8 straight struts + stepped octagonal radar rings
    vec2 qp = rot(TAU / 16.0) * uv;
    float seg8 = TAU / 8.0;
    float rel8 = (fract(atan(qp.y, qp.x) / seg8) - 0.5) * seg8;
    float octR = length(qp) * cos(rel8);
    float rr = octR * R * 0.65 - u_loop * K * 2.0;
    float f = fract(rr);
    float octRing = smoothstep(0.06, 0.01, abs(f - 0.5));
    float octWhite = smoothstep(0.025, 0.004, abs(fract(octR * 2.5) - 0.5));
    float struts = straightSpokes(uv, vec2(0.0), 8.0, 0.0, 0.006);
    float sweep = straightSpokes(uv, vec2(0.0), 2.0, LA * K, 0.014);
    float sweepGlow = straightSpokes(uv, vec2(0.0), 2.0, LA * K, 0.065);
    col += orange * (octRing * 0.95 + sweepGlow * 1.2 + struts * 0.6);
    col += white  * (octWhite * 0.85 * strobe + sweep * 1.8 + struts * 0.35);
  } else if (mode == 3) {
    // Variant 3 (pan_03_tight_stripes): Brutalist vertical prison-bar slits + diagonal hazard shutters + horizontal white scanner
    float colIdx = floor((uv.x + 2.0) * 4.5);
    float barX = fract((uv.x + 2.0) * 4.5);
    float slit = smoothstep(0.18, 0.22, barX) * smoothstep(0.82, 0.78, barX);
    float barEdge = smoothstep(0.04, 0.008, abs(barX - 0.20)) + smoothstep(0.04, 0.008, abs(barX - 0.80));
    float dir = mod(colIdx, 2.0) * 2.0 - 1.0;
    float diag = fract((uv.y * 3.0 + uv.x * 1.5 * dir) + dir * u_loop * K * 4.0);
    float hazard = smoothstep(0.35, 0.40, diag) * smoothstep(0.85, 0.80, diag);
    float colStrobe = step(0.0, cos(LA * Pn + colIdx * 0.9));
    float scanY = 0.85 * sin(LA * K);
    float scanDist = abs(uv.y - scanY);
    float scanCore = smoothstep(0.012, 0.002, scanDist);
    float scanHalo = exp(-scanDist / 0.055);
    col += orange * (slit * hazard * (0.45 + 0.75 * colStrobe) + scanHalo * 1.1);
    col += white  * (barEdge * hazard * 0.75 * strobe + scanCore * 1.8);
  } else if (mode == 4) {
    // Variant 4 (pan_04_slow_tiers): Rectangular cell-block corridor perspective tunnel with chasing orange/white frame strobes
    vec2 b = abs(uv) / vec2(1.7778, 1.0);
    float boxR = max(b.x, b.y) + 1e-3;
    float z = 0.42 / (boxR + 0.05) - u_loop * K * 3.0;
    float cellId = floor(z);
    float fz = fract(z);
    float frameO = smoothstep(0.12, 0.02, abs(fz - 0.5)) * smoothstep(0.04, 0.14, boxR);
    float frameW = smoothstep(0.035, 0.005, abs(fz - 0.5)) * smoothstep(0.04, 0.14, boxR);
    // Corner diagonal structural rails (exact diagonals of 16:9 frame)
    float diagD = abs(b.x - b.y);
    float rails = smoothstep(0.012, 0.002, diagD) * smoothstep(0.03, 0.12, boxR);
    // Horizontal & vertical axis struts
    float crossStrut = (smoothstep(0.007, 0.001, abs(uv.x)) + smoothstep(0.007, 0.001, abs(uv.y))) * smoothstep(0.05, 0.18, boxR);
    float tierPulse = step(0.1, cos(LA * Pn - cellId * 2.0943951)); // cellId shifts by 3K per loop -> whole turns
    col += orange * (frameO * (0.6 + 0.8 * tierPulse) + rails * 0.9);
    col += white  * (frameW * tierPulse * 1.4 + rails * 0.55 + crossStrut * 0.75 * strobe);
  } else if (mode == 5) {
    // Variant 5 (pan_05_double_sweep): Twin off-axis industrial searchlight towers with crisscrossing white-core beams
    vec2 tL = vec2(-0.75, 0.0);
    vec2 tR = vec2( 0.75, 0.0);
    float angL =  (u_loop * K) * (TAU / 6.0);
    float angR = -(u_loop * K) * (TAU / 6.0);
    float coreL = straightSpokes(uv, tL, 6.0, angL, 0.008);
    float haloL = straightSpokes(uv, tL, 6.0, angL, 0.042);
    float coreR = straightSpokes(uv, tR, 6.0, angR, 0.008);
    float haloR = straightSpokes(uv, tR, 6.0, angR, 0.042);
    // Subtle industrial background grid
    vec2 g = abs(fract(uv * 3.0) - 0.5);
    float grid = smoothstep(0.025, 0.005, min(g.x, g.y));
    float rL = length(uv - tL), rR = length(uv - tR);
    float ringL = smoothstep(0.02, 0.004, abs(rL - 0.22)), ringR = smoothstep(0.02, 0.004, abs(rR - 0.22));
    col += orange * ((haloL + haloR) * 1.15 + grid * 0.22 * strobe);
    col += white  * ((coreL + coreR) * 1.65 + (ringL + ringR) * 1.2);
  } else {
    // Variant 6 (pan_06_amber_pulse): Heavy 6-blade hexagonal mechanical blast-door shutter + radial white strobe needles
    float r = length(uv);
    float seg6 = TAU / 6.0;
    vec2 qp = rot(u_loop * K * seg6) * uv;
    float rel6 = (fract(atan(qp.y, qp.x) / seg6) - 0.5) * seg6;
    float hexR = r * cos(rel6);
    float openAmt = 0.28 + 0.18 * (0.5 + 0.5 * cos(LA * 2.0));
    float bladeEdge = smoothstep(0.018, 0.003, abs(hexR - openAmt));
    float outerHex  = smoothstep(0.022, 0.004, abs(fract(hexR * 3.2 - u_loop * K * 2.0) - 0.5)) * step(openAmt, hexR);
    float needles   = straightSpokes(uv, vec2(0.0), 12.0, -u_loop * K * (TAU / 12.0), 0.006);
    float coreFlash = smoothstep(openAmt, openAmt * 0.2, hexR) * strobe;
    col += orange * (outerHex * 1.05 + coreFlash * 1.1 + needles * 0.85);
    col += white  * (bladeEdge * 1.7 + needles * 0.9 * strobe + smoothstep(0.08, 0.01, hexR) * 1.4);
  }

  return col;
}
