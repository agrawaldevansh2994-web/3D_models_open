import { PNG } from 'pngjs';

/**
 * Procedural PBR Texture Baker for Playa Art Creature Forge (Round 2).
 * Generates 512x512 / 1024x1024 PBR textures:
 * - baseColor: RGB albedo + Alpha
 * - metallicRoughness: G = roughness (0..255), B = metallic (0..255)
 * - normal: Tangent-space normal map (R=X, G=Y, B=Z)
 * - emissive: RGB neon / bioluminescent glow
 */

export function createPNG(width, height, pixelFn) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      const u = x / (width - 1);
      // Note: glTF UV origin (0,0) is top-left or bottom-left depending on sampler;
      // our vertex UVs map v in [0,1] from bottom to top, so we use v directly.
      const v = y / (height - 1);
      const [r, g, b, a = 255] = pixelFn(u, v, x, y);
      png.data[idx] = Math.max(0, Math.min(255, Math.round(r)));
      png.data[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
      png.data[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
      png.data[idx + 3] = Math.max(0, Math.min(255, Math.round(a)));
    }
  }
  return PNG.sync.write(png);
}

function hash2d(x, y) {
  const sinVal = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
  return sinVal - Math.floor(sinVal);
}

function smoothNoise(x, y) {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const n00 = hash2d(i, j);
  const n10 = hash2d(i + 1, j);
  const n01 = hash2d(i, j + 1);
  const n11 = hash2d(i + 1, j + 1);

  const nx0 = n00 * (1 - sx) + n10 * sx;
  const nx1 = n01 * (1 - sx) + n11 * sx;
  return nx0 * (1 - sy) + nx1 * sy;
}

export function fbm(x, y, octaves = 4) {
  let val = 0;
  let amp = 0.5;
  let freq = 1;
  for (let o = 0; o < octaves; o++) {
    val += amp * smoothNoise(x * freq, y * freq);
    freq *= 2;
    amp *= 0.5;
  }
  return val;
}

/**
 * Generates PBR + Emissive textures for the Character Body (`Body_Mesh`):
 * - v in [0.72, 1.00]: Sculpted Head, Face (eyes, irises, eyebrows, nose, lips), Braids & Hands
 * - v in [0.42, 0.72]: Inner athletic crop top, midriff skin, forearms
 * - v in [0.00, 0.42]: Techwear cargo joggers with magenta straps & platform rave boots
 */
export function bakeCharacterTextures(theme = 'festival_raver', size = 512) {
  const baseColorBuffer = createPNG(size, size, (u, v) => {
    if (theme === 'festival_raver') {
      if (v >= 0.72) {
        // Hands & Neck/Face zone (front of head is |u - 0.5| < 0.24, below hairline v < 0.945)
        const du = Math.abs(u - 0.5);
        const isHairOrBraids = v > 0.945 || du > 0.24;
        if (isHairOrBraids) {
          const strand = Math.sin(u * 140 + v * 30) * 10;
          const isNeonBraid = Math.abs((u * 12) % 1 - 0.5) < 0.08;
          if (isNeonBraid) return [0, 210, 245, 255];
          return [22 + strand, 20 + strand, 28 + strand, 255];
        }

        // Facial features aligned with buildSculptedHead() UV coordinates:
        // Eyes at du = 0.041, v = 0.902
        const eyeDist = Math.hypot((du - 0.041) / 0.020, (v - 0.902) / 0.013);
        if (eyeDist < 1.0) {
          const irisDist = Math.hypot((du - 0.040) / 0.011, (v - 0.902) / 0.010);
          if (irisDist < 0.42) return [12, 14, 18, 255]; // Pupil
          if (irisDist < 1.0) return [20, 225, 245, 255]; // Luminous cyan iris
          if (v - 0.902 > 0.008) return [25, 20, 24, 255]; // Upperlash line
          return [242, 244, 248, 255]; // Sclera white
        }

        // Eyebrows at du in [0.020, 0.065], v = 0.922
        if (du > 0.018 && du < 0.066 && Math.abs(v - 0.922 + (du - 0.04) * 0.08) < 0.0045) {
          return [32, 24, 28, 255];
        }

        // Nose nostrils & tip shadow at du < 0.018, v = 0.858
        const nostrilDist = Math.hypot((du - 0.009) / 0.005, (v - 0.856) / 0.004);
        if (nostrilDist < 1.0) {
          return [115, 82, 68, 255];
        }

        // Sculpted Lips at du < 0.032, v = 0.832
        const lipW = du / 0.032;
        if (lipW < 1.0 && Math.abs(v - 0.832) < 0.011 * Math.cos(lipW * 1.2)) {
          if (Math.abs(v - 0.832) < 0.002) return [95, 35, 55, 255]; // Lip part line
          return [198, 92, 112, 255]; // Rose-berry lip tone
        }

        // Cyber rave cheek LED stripe at du in [0.055, 0.095], v = 0.878
        if (du > 0.052 && du < 0.095 && Math.abs(v - 0.876 - (du - 0.052) * 0.15) < 0.003) {
          return [255, 30, 165, 255];
        }

        // Warm natural skin with subtle pore micro-texture & cheek warmth
        const pore = fbm(u * 80, v * 80, 2) * 8;
        const blush = Math.exp(-Math.pow((du - 0.055) / 0.03, 2) - Math.pow((v - 0.875) / 0.02, 2)) * 16;
        return [216 + pore + blush * 0.5, 168 + pore - blush * 0.2, 142 + pore - blush * 0.2, 255];
      } else if (v >= 0.42) {
        // Midriff skin (0.42..0.52) + Inner tech crop top (0.52..0.72)
        if (v < 0.52 && Math.abs(u - 0.5) < 0.35) {
          const pore = fbm(u * 60, v * 60, 2) * 8;
          return [210 + pore, 162 + pore, 136 + pore, 255];
        }
        const rib = Math.sin(u * 90) * 6;
        const isTrim = Math.abs(v - 0.525) < 0.012;
        if (isTrim) return [0, 240, 255, 255];
        return [34 + rib, 36 + rib, 44 + rib, 255];
      } else {
        // Lower body: Platform boots (v < 0.13) & Techwear Cargo Joggers (0.13..0.42)
        if (v < 0.13) {
          const tread = (Math.sin(u * 90) > 0 ? 1 : 0) * 10;
          const isSoleNeon = Math.abs(v - 0.025) < 0.008;
          if (isSoleNeon) return [0, 245, 255, 255];
          return [20 + tread, 22 + tread, 26 + tread, 255];
        }
        const isKneeStrap = Math.abs(v - 0.24) < 0.018 || Math.abs(v - 0.31) < 0.012;
        if (isKneeStrap) return [255, 25, 155, 255];
        const weave = fbm(u * 45, v * 45, 3) * 14;
        return [30 + weave, 33 + weave, 40 + weave, 255];
      }
    } else if (theme === 'manta_ray') {
      const dorsal = u < 0.5;
      const x = (u % 0.5) * 2;
      if (dorsal) {
        const spots = Math.sin(x * 30) * Math.cos(v * 30);
        if (spots > 0.82) return [0, 240, 255, 255];
        const noise = fbm(x * 10, v * 10, 3) * 20;
        return [16 + noise, 22 + noise, 35 + noise, 255];
      } else {
        const shade = fbm(x * 8, v * 8, 2) * 15;
        return [220 + shade, 225 + shade, 230 + shade, 255];
      }
    }

    const val = 128 + fbm(u * 20, v * 20, 3) * 50;
    return [val, val, val, 255];
  });

  const metallicRoughnessBuffer = createPNG(size, size, (u, v) => {
    if (theme === 'festival_raver') {
      if (v >= 0.72) {
        return [0, 145, 15, 255]; // Natural skin & hair sheen
      } else if (v >= 0.42) {
        return [0, 165, 20, 255];
      } else {
        if (v < 0.13) return [0, 120, 65, 255]; // Semi-gloss platform boots
        return [0, 185, 15, 255]; // Matte cargo fabric
      }
    }
    return [0, 150, 30, 255];
  });

  const normalBuffer = createPNG(size, size, (u, v) => {
    const eps = 1 / size;
    const h = (uu, vv) => fbm(uu * 36, vv * 36, 3);
    const dhdu = ((h(u + eps, v) - h(u - eps, v)) / (2 * eps)) * 0.08;
    const dhdv = ((h(u, v + eps) - h(u, v - eps)) / (2 * eps)) * 0.08;
    const nx = -dhdu;
    const ny = -dhdv;
    const nz = 1.0;
    const len = Math.hypot(nx, ny, nz);
    return [
      ((nx / len) * 0.5 + 0.5) * 255,
      ((ny / len) * 0.5 + 0.5) * 255,
      ((nz / len) * 0.5 + 0.5) * 255,
      255,
    ];
  });

  const emissiveBuffer = createPNG(size, size, (u, v) => {
    if (theme === 'festival_raver') {
      const du = Math.abs(u - 0.5);
      // Cheek cyber stripe & braid neon highlights
      if (v >= 0.72) {
        if (du > 0.052 && du < 0.095 && Math.abs(v - 0.876 - (du - 0.052) * 0.15) < 0.003) {
          return [255, 30, 165, 255];
        }
        const isHairOrBraids = v > 0.945 || du > 0.24;
        if (isHairOrBraids && Math.abs((u * 12) % 1 - 0.5) < 0.06) {
          return [0, 180, 220, 255];
        }
      }
      // Crop top lower trim
      if (Math.abs(v - 0.525) < 0.010) {
        return [0, 230, 255, 255];
      }
      // Knee reactive neon magenta straps
      if (Math.abs(v - 0.24) < 0.014 || Math.abs(v - 0.31) < 0.010) {
        return [255, 20, 160, 255];
      }
      // Platform boot sole LED strip
      if (Math.abs(v - 0.025) < 0.007) {
        return [0, 245, 255, 255];
      }
    }
    return [0, 0, 0, 255];
  });

  return {
    baseColor: baseColorBuffer,
    metallicRoughness: metallicRoughnessBuffer,
    normal: normalBuffer,
    emissive: emissiveBuffer,
  };
}

/**
 * Generates a dedicated PBR + Emissive texture set for the separate `Jacket_Mesh` layer
 * (Cropped Techwear Puffer Jacket with quilted baffles, cyan/magenta LED lapel & cuff piping, and LED visor).
 */
export function bakeJacketTextures(size = 512) {
  const baseColorBuffer = createPNG(size, size, (u, v) => {
    // Visor region (v > 0.85)
    if (v > 0.85) {
      return [18, 22, 32, 255];
    }
    // Quilted puffer jacket fabric with cyan lapel edges (u near 0.08 or 0.92) & hem piping (v < 0.08 or v > 0.78)
    const isLapelLED = Math.abs(u - 0.12) < 0.025 || Math.abs(u - 0.88) < 0.025;
    const isHemLED = v < 0.055 || (v > 0.78 && v < 0.83);
    const isSleeveStripe = Math.abs(u - 0.5) < 0.03;
    if (isLapelLED || isHemLED) return [0, 245, 255, 255];
    if (isSleeveStripe) return [255, 25, 165, 255];

    const baffle = Math.sin(v * Math.PI * 10) * 12;
    const weave = fbm(u * 50, v * 50, 3) * 10;
    const c = 26 + baffle + weave;
    return [c, c + 3, c + 10, 255];
  });

  const metallicRoughnessBuffer = createPNG(size, size, (u, v) => {
    if (v > 0.85) return [0, 25, 230, 255]; // Mirror cyber visor
    return [0, 115, 55, 255]; // Sleek satin-nylon techwear puffer shell
  });

  const normalBuffer = createPNG(size, size, (u, v) => {
    const eps = 1 / size;
    const h = (uu, vv) => Math.sin(vv * Math.PI * 10) * 0.25 + fbm(uu * 40, vv * 40, 2) * 0.1;
    const dhdu = ((h(u + eps, v) - h(u - eps, v)) / (2 * eps)) * 0.06;
    const dhdv = ((h(u, v + eps) - h(u, v - eps)) / (2 * eps)) * 0.06;
    const nx = -dhdu;
    const ny = -dhdv;
    const nz = 1.0;
    const len = Math.hypot(nx, ny, nz);
    return [
      ((nx / len) * 0.5 + 0.5) * 255,
      ((ny / len) * 0.5 + 0.5) * 255,
      ((nz / len) * 0.5 + 0.5) * 255,
      255,
    ];
  });

  const emissiveBuffer = createPNG(size, size, (u, v) => {
    if (v > 0.85) {
      // Equalizer bars across visor front
      const bar = Math.floor(u * 28);
      const barH = 0.86 + Math.abs(Math.sin(bar * 1.7)) * 0.09;
      if (v < barH && (u * 28) % 1 < 0.7) {
        return [0, 255, 240, 255];
      }
      return [0, 0, 0, 255];
    }
    const isLapelLED = Math.abs(u - 0.12) < 0.022 || Math.abs(u - 0.88) < 0.022;
    const isHemLED = v < 0.05 || (v > 0.78 && v < 0.825);
    const isSleeveStripe = Math.abs(u - 0.5) < 0.025;
    if (isLapelLED || isHemLED) return [0, 240, 255, 255];
    if (isSleeveStripe) return [255, 25, 165, 255];
    return [0, 0, 0, 255];
  });

  return {
    baseColor: baseColorBuffer,
    metallicRoughness: metallicRoughnessBuffer,
    normal: normalBuffer,
    emissive: emissiveBuffer,
  };
}
