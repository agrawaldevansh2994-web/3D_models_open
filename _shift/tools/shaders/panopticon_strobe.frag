// Strobe / industrial black-and-orange (Panopticon). p = [rings (int), hazard stripes per ring (int), sweep rotations per loop (int), soft pulses per loop (int)]
// Photosensitivity: pulses are SOFT (+-30% brightness, never to white). Keep pulses/loop <= 2.5 x loop seconds (<= 2.5 per second).
vec3 scene(vec2 uv){
  float R = floor(u_p.x), M = floor(u_p.y), K = floor(u_p.z), Pn = floor(u_p.w);
  float r = length(uv), a = atan(uv.y, uv.x);
  float rr = r * R * 0.5, band = floor(rr), f = fract(rr);
  float dir = mod(band, 2.0) * 2.0 - 1.0;
  vec3 orange = mix(vec3(1.0, 0.30, 0.02), vec3(1.0, 0.55, 0.04), u_hue);
  // hazard stripes, alternate bands counter-rotate
  float s = fract(a/TAU*M + f*2.0 + dir*u_loop*K);
  float stripe = smoothstep(0.46, 0.50, s) * smoothstep(0.96, 0.92, s);
  float body = smoothstep(0.08, 0.14, f) * smoothstep(0.92, 0.86, f);
  float edge = smoothstep(0.035, 0.0, abs(f - 0.03)) + smoothstep(0.035, 0.0, abs(f - 0.97));
  float sweep = pow(max(0.0, cos(a - LA*K)), 40.0) * smoothstep(0.0, 0.3, r);
  float pulse = 0.7 + 0.3 * (0.5 + 0.5*cos(LA*Pn));
  vec3 col = orange * (stripe*body*0.55 + edge*1.1 + sweep*1.4);
  col *= pulse;
  col += orange * 0.02 / (r*r + 0.05);
  col *= smoothstep(2.3, 0.7, r);
  return col;
}

