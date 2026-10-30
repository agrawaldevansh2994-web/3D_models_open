// Gold glyph pulses (Pyramids). p = [columns (int), pulse waves per loop (int), row period R (int), glyph scale]
// Abstract glyph-like marks only (no real hieroglyph text, no letters). Seamless: rows wrap with period R and scroll exactly R rows per loop.
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h); }
float glyph(vec2 q, float t){            // q in [-1,1]^2 ; returns distance to strokes
  float d = 9.0;
  if (t < 0.2) {                          // eye
    vec2 e = q*vec2(1.0, 1.7); d = min(abs(length(e) - 0.62), abs(length(q - vec2(0.0,0.0)) - 0.16));
    d = min(d, sdSeg(q, vec2(-0.8,-0.05), vec2(0.8,-0.05)));
  } else if (t < 0.4) {                   // loop-cross
    d = min(abs(length(q - vec2(0.0,0.45)) - 0.28), sdSeg(q, vec2(0.0,0.17), vec2(0.0,-0.8)));
    d = min(d, sdSeg(q, vec2(-0.4,-0.1), vec2(0.4,-0.1)));
  } else if (t < 0.6) {                   // waves
    for (int i = 0; i < 3; i++) { float y = -0.45 + 0.45*float(i); d = min(d, abs(q.y - y - 0.12*sin(q.x*5.0)) ); }
    d = max(d, abs(q.x) - 0.8);
  } else if (t < 0.8) {                   // bird-ish chevron
    d = min(sdSeg(q, vec2(-0.7,0.3), vec2(0.0,-0.1)), sdSeg(q, vec2(0.7,0.3), vec2(0.0,-0.1)));
    d = min(d, sdSeg(q, vec2(0.0,-0.1), vec2(0.0,-0.7)));
  } else {                                // sun disc + rays
    d = abs(length(q) - 0.3);
    for (int i = 0; i < 8; i++) { float an = float(i)*TAU/8.0; vec2 dir = vec2(cos(an), sin(an)); d = min(d, sdSeg(q, dir*0.45, dir*0.75)); }
  }
  return d;
}
vec3 scene(vec2 uv){
  float C = floor(u_p.x), Pn = floor(u_p.y), R = floor(u_p.z);
  float cell = 2.0 / C;                                  // cell size in uv units
  vec2 g = vec2(uv.x, uv.y + u_loop * R * cell) / cell;  // scroll R rows per loop
  vec2 id = floor(g); vec2 q = (fract(g) - 0.5) * 2.0 / u_p.w;
  id.y = mod(id.y, R);                                   // wrap -> loop is exact
  float h = hash21(id + u_seed);
  float d = glyph(q, h);
  float stroke = smoothstep(0.075, 0.035, d), halo = exp(-d*9.0);
  float pulse = pow(0.5 + 0.5*cos(uv.y*2.4 + LA*Pn + h*1.5), 6.0);
  float base = 0.22 + 0.5*step(0.35, h);
  vec3 gold = mix(vec3(1.0, 0.70, 0.18), vec3(1.0, 0.45, 0.10), u_hue);
  vec3 col = gold * (stroke*(base + 1.6*pulse) + halo*0.18*(0.3 + pulse));
  col *= 1.0 - 0.0*h;
  col += vec3(0.05, 0.03, 0.01) * (1.0 - 0.5*(uv.y*0.5+0.5)); // warm dark ground
  col *= smoothstep(2.4, 0.5, length(uv*vec2(0.8,1.0)));
  return col;
}

