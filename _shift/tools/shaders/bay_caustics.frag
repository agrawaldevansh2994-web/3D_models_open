// Bioluminescent caustics (Bioluminescence Bay).
// Caustic net in cyan, teal and violet, soft and slow, like light under water.
// Seamless: every wave and Voronoi cell orbit uses integer harmonics of LA.
// Each variant (u_seed 1..6) has a distinct underwater flow/structure so no two variants read the same at a glance.

// Seamless 2nd-order Voronoi distance difference -> organic polygonal underwater caustic net
float voronoiCaustic(vec2 p, float phaseOffset) {
  vec2 n = floor(p);
  vec2 f = fract(p);
  float d1 = 8.0, d2 = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 h = hash22(n + g);
      float ang = h.x * TAU + LA + phaseOffset;
      vec2 o = 0.5 + 0.36 * vec2(cos(ang), sin(ang + h.y * TAU));
      vec2 r = g + o - f;
      float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; }
      else if (d < d2) { d2 = d; }
    }
  }
  float edge = sqrt(d2) - sqrt(d1);
  return exp(-edge * 6.5);
}

float waveNet(vec2 p) {
  float v = 0.0;
  for (int i = 0; i < 6; i++) {
    float ai = float(i) * 1.0471975 + u_seed * 0.7;
    vec2 k = vec2(cos(ai), sin(ai)) * (1.0 + 0.28 * float(i));
    float m = (i % 2 == 0) ? 1.0 : -1.0;
    v += sin(dot(p, k) * 1.5 + LA * m + float(i) * 1.7);
  }
  return exp(-abs(v / 6.0) * 7.5);
}

float planktonLayer(vec2 uv, float density, float seedOff) {
  vec2 sg = uv * density;
  vec2 si = floor(sg);
  vec2 sf = fract(sg) - 0.5;
  float hs = hash21(si + seedOff);
  vec2 orbit = 0.14 * vec2(cos(LA + hs * TAU), sin(LA + hs * TAU));
  vec2 off = (hash22(si + seedOff + 5.0) - 0.5) * 0.52 + orbit;
  float tw = 0.35 + 0.65 * (0.5 + 0.5 * cos(hs * TAU + LA * floor(1.0 + hs * 2.0)));
  float d = length(sf - off);
  return (smoothstep(0.085, 0.0, d) + 0.35 * exp(-d * 14.0)) * tw * step(0.52, hs);
}

vec3 scene(vec2 uv) {
  int mode = int(floor(u_seed + 0.5));
  vec3 cyan   = vec3(0.04, 0.88, 1.00);
  vec3 teal   = vec3(0.02, 0.72, 0.62);
  vec3 violet = vec3(0.48, 0.16, 0.92);
  vec3 deepBg = vec3(0.004, 0.016, 0.048) + vec3(0.006, 0.022, 0.055) * (0.5 - 0.5 * uv.y);
  vec3 col = deepBg;

  if (mode == 1) {
    // Variant 1 (bay_01_cyan_net): Classic cellular Voronoi shallow-reef caustic net in cyan, teal & violet
    vec2 w = uv * 2.4 + 0.18 * vec2(sin(uv.y * 2.0 + LA), cos(uv.x * 1.8 + LA));
    float c1 = voronoiCaustic(w, 0.0);
    float c2 = voronoiCaustic(rot(0.55) * w * 1.55 + 2.3, 1.5);
    float sp = planktonLayer(uv, 11.0, 11.0);
    col += cyan   * pow(c1, 1.35) * 0.95;
    col += teal   * pow(c2, 1.45) * 0.75;
    col += violet * (c1 * c2) * 0.85;
    col += mix(cyan, violet, 0.35) * sp * 1.35;
  } else if (mode == 2) {
    // Variant 2 (bay_02_deep_violet): Pelagic violet & cyan undulating ribbon currents + soft medusa rings
    vec2 p = uv;
    float ribbon1 = exp(-abs(p.x + 0.35 * sin(p.y * 2.2 + LA) - 0.32 * cos(LA)) * 4.5);
    float ribbon2 = exp(-abs(p.x - 0.35 * cos(p.y * 1.9 - LA) + 0.32 * sin(LA)) * 4.5);
    float net = voronoiCaustic(uv * 2.8 + vec2(0.0, sin(LA) * 0.4), 0.7);
    float r = length(uv * vec2(0.85, 1.0));
    float medusa = exp(-abs(fract(r * 1.8 - u_loop) - 0.5) * 9.0) * smoothstep(1.4, 0.2, r);
    col += violet * (ribbon1 * 0.95 + medusa * 0.75 + net * 0.45);
    col += cyan   * (ribbon2 * 0.85 + net * ribbon1 * 1.1);
    col += teal   * (net * ribbon2 * 0.95 + planktonLayer(uv, 10.0, 23.0) * 1.1);
  } else if (mode == 3) {
    // Variant 3 (bay_03_green_tide): Swirling tidal lagoon eddy + sweeping bioluminescent surf crests
    float r = length(uv);
    float swirlAng = 0.65 * exp(-r * 0.8) * sin(LA);
    vec2 sp = rot(swirlAng) * uv;
    float tideCrest1 = exp(-abs(sp.y - 0.32 * sin(sp.x * 2.1 + LA) - 0.25 * sin(LA)) * 6.0);
    float tideCrest2 = exp(-abs(sp.y + 0.28 * cos(sp.x * 2.5 - LA) + 0.25 * cos(LA)) * 6.5);
    float cNet = voronoiCaustic(sp * 2.2, 2.1);
    col += teal   * (cNet * 0.95 + tideCrest1 * 0.85);
    col += cyan   * (tideCrest1 * cNet * 1.35 + tideCrest2 * 0.90);
    col += violet * (tideCrest2 * cNet * 0.95 + planktonLayer(sp, 12.0, 37.0) * 1.2);
  } else if (mode == 4) {
    // Variant 4 (bay_04_fine_caustics): Slanting underwater cathedral light shafts + fine diamond caustic mesh
    vec2 topOrig = vec2(-0.2 + 0.15 * sin(LA), 1.45);
    vec2 d = uv - topOrig;
    float shaftAng = atan(d.x, -d.y);
    float shafts = pow(0.5 + 0.5 * cos(shaftAng * 14.0 + LA), 4.0) * smoothstep(2.6, 0.3, length(d));
    float fine1 = voronoiCaustic(uv * 3.8 + 0.15 * vec2(cos(LA), sin(LA)), 0.4);
    float fine2 = waveNet(uv * 3.2);
    col += cyan   * (fine1 * (0.55 + 0.85 * shafts) + shafts * 0.32);
    col += teal   * (fine2 * 0.85 + shafts * 0.25);
    col += violet * (fine1 * fine2 * 1.25);
  } else if (mode == 5) {
    // Variant 5 (bay_05_slow_swell): Slow concentric abyssal swell ripples illuminating deep caustic cells
    float r1 = length(uv - vec2(-0.35, 0.15));
    float r2 = length(uv - vec2( 0.38, -0.18));
    float swell1 = pow(0.5 + 0.5 * cos(r1 * 6.28318 - LA), 4.0) * smoothstep(2.0, 0.1, r1);
    float swell2 = pow(0.5 + 0.5 * cos(r2 * 6.28318 - LA + 1.5), 4.0) * smoothstep(2.0, 0.1, r2);
    vec2 disp = 0.12 * (swell1 - swell2) * normalize(uv + 1e-4);
    float cells = voronoiCaustic((uv + disp) * 1.9, 1.2);
    col += teal   * cells * (0.45 + 0.95 * swell1);
    col += cyan   * (swell1 * 0.55 + cells * swell2 * 1.15);
    col += violet * (swell2 * 0.65 + cells * 0.45);
  } else {
    // Variant 6 (bay_06_sparkle_storm): Dense bioluminescent dinoflagellate bloom in a twin-gyre current
    vec2 flow = uv + 0.22 * vec2(sin(uv.y * 2.4 + LA), cos(uv.x * 2.4 - LA));
    float baseNet = voronoiCaustic(flow * 2.5, 3.1);
    float p1 = planktonLayer(flow, 9.0, 51.0);
    float p2 = planktonLayer(rot(0.7) * flow, 14.0, 67.0);
    float p3 = planktonLayer(rot(-0.5) * flow, 19.0, 83.0);
    col += teal   * (baseNet * 0.65 + p2 * 1.35);
    col += cyan   * (baseNet * 0.45 + p1 * 1.65);
    col += violet * (baseNet * 0.55 + p3 * 1.55 + p1 * p2 * 1.2);
  }

  // Soft underwater edge falloff
  col *= smoothstep(2.5, 0.65, length(uv * vec2(0.85, 1.0)));
  return col;
}
