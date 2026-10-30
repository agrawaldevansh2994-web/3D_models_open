// Goa '95 fractal psychedelia (Goa Trance). p = [kaleidoscope segments (int), fold iterations (int), orbit radius, zoom]
// Seamless: the kaleidoscope turns by exactly one segment per loop, the fractal constant orbits a closed circle.
vec3 scene(vec2 uv){
  float S = floor(u_p.x), seg = TAU / S;
  vec2 p = rot(u_loop * seg) * uv;
  float a = atan(p.y, p.x), r = length(p);
  a = mod(a, seg); a = abs(a - seg*0.5);                // mirror fold -> mandala
  p = r * vec2(cos(a), sin(a)) * u_p.w;
  vec2 c = vec2(0.62, 0.38) + u_p.z * vec2(cos(LA), sin(LA));
  vec2 z = p; float trap = 1e9, trap2 = 1e9, glow = 0.0;
  int IT = int(u_p.y);
  for (int i = 0; i < 12; i++) {
    if (i >= IT) break;
    z = abs(z);
    z = z / (dot(z, z) + 1e-3) - c;
    trap  = min(trap,  length(z));
    trap2 = min(trap2, abs(z.x*z.y));
    glow += exp(-6.0*length(z));
  }
  vec3 col = pal(trap*0.35, u_hue) * (0.035/(trap + 0.05));
  col += pal(trap2*2.0 + 0.5, u_hue + 0.25) * (0.018/(trap2 + 0.03));
  col += pal(0.7, u_hue) * glow * 0.025;
  col = pow(col*1.5, vec3(1.7));                        // contrast: deep blacks, saturated lines
  col *= smoothstep(2.4, 0.6, r);                       // dark edges
  return col;
}
