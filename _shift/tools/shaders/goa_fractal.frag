// Goa '95 UV blacklight mandala (Goa Trance).
// Fluorescent UV palette (magenta, acid green, UV orange, deep violet) on pitch black.
// Slow breathing mandala with crisp fine concentric ring detail, 100% seamless mirror fold across +-PI for all integer S.
// Each variant (u_seed 1..6) has a distinct geometric mandala architecture so no two variants read the same at a glance.

vec3 uvGoaPal(float t, float shift) {
  // 4-stop fluorescent blacklight UV palette: Deep Violet -> Electric Magenta -> UV Orange -> Acid Green -> Deep Violet
  float x = fract(t + shift);
  vec3 violet  = vec3(0.32, 0.02, 0.95);
  vec3 magenta = vec3(1.00, 0.04, 0.68);
  vec3 orange  = vec3(1.00, 0.42, 0.02);
  vec3 green   = vec3(0.18, 1.00, 0.08);
  if (x < 0.25) return mix(violet,  magenta, smoothstep(0.0, 0.25, x));
  if (x < 0.50) return mix(magenta, orange,  smoothstep(0.25, 0.50, x));
  if (x < 0.75) return mix(orange,  green,   smoothstep(0.50, 0.75, x));
  return mix(green, violet, smoothstep(0.75, 1.0, x));
}

vec3 scene(vec2 uv) {
  float S = floor(u_p.x), seg = TAU / S;
  int mode = int(floor(u_seed + 0.5));
  float breathe = 1.0 + 0.09 * sin(LA);
  vec2 p = rot(u_loop * seg) * (uv * breathe);
  float r = length(p);

  // Seamless mirror fold across all sectors and +-PI
  float rawA = atan(p.y, p.x);
  float fa = abs(fract(rawA / seg) - 0.5) * seg; // in [0, 0.5*seg]
  float normA = fa / (0.5 * seg);                // in [0, 1] across half-sector

  vec3 col = vec3(0.0);

  if (mode == 1) {
    // Variant 1 (goa_01_mandala_8): 8-fold Lotus & Fine Bindu Ring Mandala + Kalis filigree
    vec2 z = r * vec2(cos(fa), sin(fa)) * u_p.w;
    vec2 c = vec2(0.64, 0.39) + 0.055 * vec2(cos(LA), sin(LA));
    float trap1 = 1e9, trap2 = 1e9;
    for (int i = 0; i < 8; i++) {
      z = abs(z) / (dot(z, z) + 1e-3) - c;
      trap1 = min(trap1, abs(length(z) - 0.45));
      trap2 = min(trap2, min(abs(z.x), abs(z.y)));
    }
    float petalR = 0.42 + 0.16 * cos(normA * 3.14159) + 0.05 * sin(LA);
    float lotus = smoothstep(0.018, 0.002, abs(r - petalR)) + smoothstep(0.016, 0.002, abs(r - petalR * 1.45));
    float fineRings = pow(0.5 + 0.5 * cos(r * 42.0 - LA * 2.0 + 2.5 * cos(normA * 3.14159)), 10.0) * smoothstep(0.1, 0.25, r) * smoothstep(1.35, 0.85, r);
    float bindu = smoothstep(0.018, 0.003, length(vec2(r - 0.72, (normA - 0.5) * 0.22)));
    float fil1 = smoothstep(0.035, 0.003, trap1) * smoothstep(1.25, 0.35, r);
    float fil2 = smoothstep(0.025, 0.002, trap2) * smoothstep(1.15, 0.25, r);
    col += uvGoaPal(0.15 + r * 0.4, u_hue) * (lotus * 1.5 + fil1 * 1.1);
    col += uvGoaPal(0.62 - r * 0.3, u_hue) * (fineRings * 1.15 + fil2 * 0.95);
    col += uvGoaPal(0.40, u_hue) * bindu * 1.8;
    col *= smoothstep(1.45, 0.90, r);
  } else if (mode == 2) {
    // Variant 2 (goa_02_mandala_6): 6-fold Hexagonal Sri-Yantra Sacred Star & Interlocking Triangles
    float poly1 = r * cos(fa);
    float rawA2 = atan(p.y, p.x) + seg * 0.5;
    float fa2 = abs(fract(rawA2 / seg) - 0.5) * seg;
    float poly2 = r * cos(fa2);
    float star1 = smoothstep(0.014, 0.002, abs(fract(poly1 * 4.5 - u_loop) - 0.5) * 0.22);
    float star2 = smoothstep(0.014, 0.002, abs(fract(poly2 * 4.5 + u_loop) - 0.5) * 0.22);
    float hexRings = pow(0.5 + 0.5 * cos(max(poly1, poly2) * 52.0 - LA * 2.0), 12.0);
    float spoke = smoothstep(0.010, 0.001, r * sin(fa)) * smoothstep(0.08, 0.25, r);
    col += uvGoaPal(0.35 + poly1 * 0.5, u_hue) * star1 * 1.35;
    col += uvGoaPal(0.75 + poly2 * 0.5, u_hue) * star2 * 1.35;
    col += uvGoaPal(0.05 + r * 0.3, u_hue) * (hexRings * 0.95 + spoke * 0.8);
    col *= smoothstep(1.38, 0.82, max(poly1, poly2));
  } else if (mode == 3) {
    // Variant 3 (goa_03_mandala_10): 10-fold Spirograph Rose Lattice & Beaded Outer Corona
    float wave1 = abs(r - (0.35 + 0.22 * cos(normA * 3.14159 * 2.0 + LA)));
    float wave2 = abs(r - (0.58 + 0.18 * sin(normA * 3.14159 * 3.0 - LA)));
    float wave3 = abs(r - (0.82 + 0.12 * cos(normA * 3.14159 * 4.0 + LA)));
    float s1 = smoothstep(0.016, 0.002, wave1) + 0.35 * exp(-wave1 / 0.025);
    float s2 = smoothstep(0.015, 0.002, wave2) + 0.35 * exp(-wave2 / 0.025);
    float s3 = smoothstep(0.014, 0.002, wave3) + 0.35 * exp(-wave3 / 0.025);
    // Fine radial tick marks in concentric tracks
    float ticks = smoothstep(0.35, 0.1, abs(fract(normA * 6.0) - 0.5)) * smoothstep(0.015, 0.002, abs(fract(r * 9.0 - u_loop) - 0.5) * 0.11);
    col += uvGoaPal(0.18, u_hue) * s1 * 1.3;
    col += uvGoaPal(0.55, u_hue) * s2 * 1.3;
    col += uvGoaPal(0.82, u_hue) * s3 * 1.25;
    col += uvGoaPal(0.38 + r * 0.2, u_hue) * ticks * 1.4;
    col *= smoothstep(1.28, 0.85, r);
  } else if (mode == 4) {
    // Variant 4 (goa_04_mandala_12): 12-fold Ringed Astrolabe Wheel with separated black channels & fine gear lace
    float bandId = floor(r * 5.2);
    float bf = fract(r * 5.2);
    float inBand = smoothstep(0.12, 0.20, bf) * smoothstep(0.88, 0.80, bf);
    float rim = smoothstep(0.04, 0.006, abs(bf - 0.16)) + smoothstep(0.04, 0.006, abs(bf - 0.84));
    float dir = mod(bandId, 2.0) * 2.0 - 1.0;
    float lace = pow(0.5 + 0.5 * cos(normA * 3.14159 * (2.0 + mod(bandId, 3.0) * 2.0) + bf * 6.28318 + dir * LA), 8.0);
    float centerStar = smoothstep(0.012, 0.002, abs(r - (0.12 + 0.05 * cos(normA * 3.14159))));
    col += uvGoaPal(bandId * 0.23, u_hue) * (inBand * lace * 1.45 + centerStar * 1.6);
    col += uvGoaPal(bandId * 0.23 + 0.45, u_hue) * rim * 1.25;
    col *= smoothstep(1.35, 0.92, r);
  } else if (mode == 5) {
    // Variant 5 (goa_05_mandala_5): 5-fold Pentagonal Shakti Star with bold petal arches & fine inner rings
    float starR = r / (0.55 + 0.30 * pow(1.0 - normA, 1.6));
    float rings = smoothstep(0.022, 0.003, abs(fract(starR * 4.2 - u_loop) - 0.5) * 0.24);
    float fine = pow(0.5 + 0.5 * cos(starR * 36.0 + LA * 2.0), 10.0) * smoothstep(0.15, 0.3, starR);
    vec2 z = r * vec2(cos(fa), sin(fa)) * 1.4;
    for (int i = 0; i < 5; i++) {
      z = abs(z) / (dot(z, z) + 0.02) - vec2(0.58 + 0.04 * cos(LA), 0.42 + 0.04 * sin(LA));
    }
    float tendril = smoothstep(0.04, 0.004, min(abs(z.x), abs(z.y)));
    col += uvGoaPal(0.20 + starR * 0.25, u_hue) * rings * 1.45;
    col += uvGoaPal(0.68 - starR * 0.20, u_hue) * (fine * 0.9 + tendril * 1.1);
    col *= smoothstep(1.30, 0.85, starR);
  } else {
    // Variant 6 (goa_06_mandala_16): 16-fold Cathedral Filigree Dome with high-frequency concentric lace
    float arch = r + 0.065 * cos(normA * 3.14159 * 2.0) * smoothstep(0.1, 0.9, r);
    float domeRings = pow(0.5 + 0.5 * cos(arch * 56.0 - LA * 3.0), 12.0);
    float majorRings = smoothstep(0.012, 0.002, abs(fract(arch * 3.5 - u_loop) - 0.5) * 0.28);
    float ribs = smoothstep(0.08, 0.01, abs(normA - 0.5)) * (0.4 + 0.6 * sin(r * 24.0 - LA * 2.0));
    float innerEye = smoothstep(0.010, 0.001, abs(r - 0.16));
    col += uvGoaPal(arch * 0.65, u_hue) * domeRings * 1.25;
    col += uvGoaPal(arch * 0.65 + 0.5, u_hue) * (majorRings * 1.5 + ribs * 0.9 + innerEye * 1.5);
    col *= smoothstep(1.55, 0.95, r);
  }

  // Deep black floor contrast boost so background stays pitch black and UV lines pop
  col = pow(max(col, vec3(0.0)), vec3(1.25)) * 1.35;
  return col;
}
