// Bioluminescent caustics (Bioluminescence Bay). p = [scale, warp strength, sparkle density, layers (1-2)]
// Seamless: every wave carries an INTEGER multiple of the loop angle; sparkles twinkle with integer harmonics.
float waves(vec2 p){
  float v = 0.0;
  for (int i = 0; i < 6; i++) {
    float ai = float(i)*1.0471975 + u_seed*0.7;
    vec2 k = vec2(cos(ai), sin(ai)) * (1.0 + 0.33*float(i));
    float m = (i % 2 == 0) ? float(1 + i/2) : -float(1 + i/2);   // integers 1,-1,2,-2,3,-3
    v += sin(dot(p, k) * 1.6 + LA*m + float(i)*1.7);
  }
  return v / 6.0;
}
vec3 scene(vec2 uv){
  vec2 p = uv * u_p.x;
  p += u_p.y * vec2(sin(p.y*1.3 + LA), cos(p.x*1.1 + LA));
  float v1 = waves(p);
  float c1 = pow(exp(-abs(v1)*9.0), 1.5);
  vec2 p2 = rot(0.6) * (uv * u_p.x * 1.9) + 3.1;
  p2 += u_p.y * 0.6 * vec2(cos(p2.y*1.7 - LA), sin(p2.x*1.5 + LA));
  float c2 = (u_p.w > 1.5) ? pow(exp(-abs(waves(p2))*10.0), 1.8) : 0.0;
  vec3 cyan = pal(0.50 + 0.18*u_hue, 0.0), blue = pal(0.62 + 0.18*u_hue, 0.0);
  vec3 col = vec3(0.0, 0.015, 0.05) + vec3(0.0, 0.03, 0.08) * (0.5 - 0.5*uv.y);   // deep water
  col += cyan * c1 * 1.1 + blue * c2 * 0.8;
  // sparkles: plankton glints, twinkling on integer harmonics
  vec2 sg = uv * (8.0 + u_p.z*6.0); vec2 si = floor(sg); vec2 sf = fract(sg) - 0.5;
  float hs = hash21(si + 11.0), tw = pow(0.5 + 0.5*cos(hs*TAU + LA*floor(1.0 + hs*3.0)), 14.0);
  vec2 off = (hash22(si + 5.0) - 0.5) * 0.6;
  float dot_ = smoothstep(0.09, 0.0, length(sf - off));
  col += cyan * dot_ * tw * step(0.55, hs) * 2.2;
  col *= smoothstep(2.6, 0.7, length(uv));
  return col;
}

