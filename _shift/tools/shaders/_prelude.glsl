#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2  u_res;
uniform float u_loop;   // 0..1 over the loop. EVERYTHING that moves must be periodic in this.
uniform float u_seed;
uniform float u_hue;    // 0..1 palette rotation, varies per variant
uniform vec4  u_p;      // per-variant free parameters (see variants.json)
#define TAU 6.28318530718
#define LA  (u_loop * TAU)          // loop angle: use sin(LA*k)/cos(LA*k) with INTEGER k for seamless motion
float hash21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
vec2  hash22(vec2 p){ float n = hash21(p); return vec2(n, hash21(p+n+17.3)); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x), mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x), f.y); }
mat2  rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
vec3  pal(float t, float h){ return pow(0.5 + 0.5*cos(TAU*(t + h + vec3(0.0, 0.33, 0.67))), vec3(1.9)); } // saturated neon palette
vec3  scene(vec2 uv);               // uv: centred, y in [-1,1], x aspect-scaled
void main(){
  vec2 uv = (gl_FragCoord.xy*2. - u_res) / u_res.y;
  vec3 c = scene(uv);
  c = 1. - exp(-c);                                  // soft tone-map (linear in, stays dark)
  c = pow(c, vec3(1./2.2));
  c += (hash21(gl_FragCoord.xy + u_seed) - .5) / 255.; // static dither: no banding in dark gradients, loop-safe
  fragColor = vec4(c, 1.);
}
