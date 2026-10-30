// Lasers & tunnels (Laser Forest, Forest Rave). p = [beams (int), ring cycles per loop (int), beam rotation steps per loop (int), glow]
vec3 scene(vec2 uv){
  float N = floor(u_p.x), K = floor(u_p.y), M = floor(u_p.z);
  float r = length(uv) + 1e-3, a = atan(uv.y, uv.x);
  float z = 0.35 / r;                                   // tunnel depth
  float ring = pow(0.5 + 0.5*cos(z*TAU - LA*K), 10.0);  // rings rushing toward camera
  float b1 = pow(abs(cos(a*N*0.5 + LA*M)), 60.0);       // beam set 1 (N beams, seamless across +-pi)
  float b2 = pow(abs(cos(a*N*0.25 - LA*M)), 90.0);      // beam set 2, counter-rotating, fewer beams
  vec3 c1 = pal(0.00, u_hue), c2 = pal(0.50, u_hue);
  float fade = smoothstep(0.02, 0.55, r);               // beams born at the vanishing point
  vec3 col = vec3(0.0);
  col += c1 * b1 * (0.9 + 2.0*ring) * fade;
  col += c2 * b2 * (0.6 + 1.5*ring) * fade;
  col += mix(c1, c2, 0.5) * ring * 0.06 * fade;         // faint ring walls
  col += mix(c1, c2, 0.5) * u_p.w * 0.004 / (r*r + 0.02);// vanishing-point glow
  col *= 1.0 - 0.55*smoothstep(0.9, 2.2, r);            // vignette: dark corners for emissive screens
  return col;
}
