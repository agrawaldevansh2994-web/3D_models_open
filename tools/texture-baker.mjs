import { PNG } from 'pngjs';

/**
 * Procedural PBR Texture Baker for Playa Art Creature Forge.
 * Creates sharp, high quality 512x512 / 1024x1024 PBR textures:
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

// Simple deterministic 2D noise / hash functions for procedural textures
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
 * Generate a complete PBR texture set for a character style.
 * UV layout standard for our procedural characters:
 * - v >= 0.75: Head, Visor, Goggles, Face
 * - 0.40 <= v < 0.75: Upper Body (Jacket, Vest, Torso, Arms)
 * - 0.00 <= v < 0.40: Lower Body (Pants, Boots, Legs)
 */
export function bakeCharacterTextures(theme = 'festival_raver', size = 512) {
  // 1. BaseColor Texture
  const baseColorBuffer = createPNG(size, size, (u, v) => {
    if (theme === 'festival_raver') {
      // Techwear jacket, neon trim, cargo pants, boots
      if (v > 0.8) {
        // Head / visor area: dark sleek helmet/visor base + skin/braids
        const isFace = Math.abs(u - 0.5) < 0.22 && v < 0.95;
        if (isFace) {
          // Warm skin tone with tech makeup
          return [215, 175, 148, 255];
        }
        // Visor / hair: dark carbon/onyx with subtle sheen
        return [24, 25, 30, 255];
      } else if (v > 0.4) {
        // Torso / Jacket: matte technical fabric (dark graphite / obsidian) with seam stitches
        const weave = fbm(u * 60, v * 60, 3) * 15;
        const base = 28 + weave;
        // Trim stripes near edges
        const isTrim = Math.abs((u * 4) % 1 - 0.5) < 0.08 || Math.abs(v - 0.72) < 0.02;
        if (isTrim) {
          return [0, 230, 255, 255]; // Neon cyan piping
        }
        return [base, base + 2, base + 6, 255];
      } else {
        // Lower body: Techwear cargo pants & boots
        if (v < 0.12) {
          // Platform boots: rugged dark rubber / tread
          const tread = (Math.sin(u * 80) > 0 ? 1 : 0) * 12;
          return [18 + tread, 20 + tread, 22 + tread, 255];
        }
        // Pants: dark graphite cargo with magenta accent straps
        const isStrap = Math.abs(v - 0.24) < 0.025 || Math.abs(u - 0.5) < 0.03;
        if (isStrap) {
          return [255, 20, 147, 255]; // Neon magenta strap
        }
        const weave = fbm(u * 40, v * 40, 2) * 10;
        return [32 + weave, 34 + weave, 38 + weave, 255];
      }
    } else if (theme === 'manta_ray') {
      // Dorsal: obsidian with cyan constellation spots; Ventral: soft ivory
      const dorsal = u < 0.5;
      const x = (u % 0.5) * 2;
      if (dorsal) {
        const spots = Math.sin(x * 30) * Math.cos(v * 30);
        if (spots > 0.82) {
          return [0, 240, 255, 255]; // Cyan spot
        }
        const noise = fbm(x * 10, v * 10, 3) * 20;
        return [16 + noise, 22 + noise, 35 + noise, 255];
      } else {
        // Ventral (belly): pearlescent soft white / ivory
        const shade = fbm(x * 8, v * 8, 2) * 15;
        return [220 + shade, 225 + shade, 230 + shade, 255];
      }
    }

    // Default neutral cyber / sleek style
    const val = 128 + fbm(u * 20, v * 20, 3) * 50;
    return [val, val, val, 255];
  });

  // 2. Metallic-Roughness Texture (G = roughness, B = metalness)
  const metallicRoughnessBuffer = createPNG(size, size, (u, v) => {
    if (theme === 'festival_raver') {
      if (v > 0.8) {
        // Visor: super shiny glass/mirror (low roughness, high metalness)
        const isVisor = Math.abs(u - 0.5) < 0.28 && v > 0.86;
        if (isVisor) {
          return [0, 25, 220, 255]; // Roughness ~0.1, Metalness ~0.86
        }
        return [0, 160, 40, 255]; // Hair/skin: matte
      } else if (v > 0.4) {
        // Jacket: matte technical cloth (Roughness ~0.7, Metalness ~0.05)
        const isZipper = Math.abs(u - 0.5) < 0.015;
        if (isZipper) {
          return [0, 50, 240, 255]; // Metallic zipper
        }
        return [0, 180, 15, 255];
      } else {
        // Pants / boots
        if (v < 0.12) {
          return [0, 200, 30, 255]; // Boots rubber
        }
        return [0, 190, 10, 255]; // Pants fabric
      }
    }

    // Default
    return [0, 150, 30, 255];
  });

  // 3. Normal Map Texture (Tangent Space Normal: RGB = [X, Y, Z])
  const normalBuffer = createPNG(size, size, (u, v) => {
    // Generate height derivative
    const eps = 1 / size;
    const h = (uu, vv) => fbm(uu * 30, vv * 30, 3);
    const dhdu = (h(u + eps, v) - h(u - eps, v)) / (2 * eps) * 0.08;
    const dhdv = (h(u, v + eps) - h(u, v - eps)) / (2 * eps) * 0.08;

    const nx = -dhdu;
    const ny = -dhdv;
    const nz = 1.0;
    const len = Math.hypot(nx, ny, nz);

    return [
      ((nx / len) * 0.5 + 0.5) * 255,
      ((ny / len) * 0.5 + 0.5) * 255,
      ((nz / len) * 0.5 + 0.5) * 255,
      255
    ];
  });

  // 4. Emissive Texture (High-punch neon for dark rave scenes)
  const emissiveBuffer = createPNG(size, size, (u, v) => {
    if (theme === 'festival_raver') {
      // Visor HUD / LED display
      if (v > 0.88 && v < 0.94 && Math.abs(u - 0.5) < 0.22) {
        // Sound reactive audio visualizer bars on visor
        const barIndex = Math.floor((u - 0.28) * 30);
        const barHeight = 0.88 + Math.abs(Math.sin(barIndex * 1.5)) * 0.05;
        if (v < barHeight) {
          return [0, 255, 240, 255]; // Bright cyan LED
        }
      }
      // Glowing jacket piping & LED sleeve strips
      const isJacketPiping = (Math.abs(v - 0.72) < 0.015 && Math.abs(u - 0.5) > 0.1) ||
                            (Math.abs(u - 0.5) > 0.38 && v > 0.45 && v < 0.7);
      if (isJacketPiping) {
        return [0, 235, 255, 255]; // Electric cyan
      }
      // Knee reactive neon straps
      const isKneeStrap = Math.abs(v - 0.24) < 0.015 && (Math.abs(u - 0.32) < 0.1 || Math.abs(u - 0.68) < 0.1);
      if (isKneeStrap) {
        return [255, 20, 160, 255]; // Vivid neon magenta
      }
    } else if (theme === 'manta_ray') {
      const dorsal = u < 0.5;
      const x = (u % 0.5) * 2;
      if (dorsal) {
        const spots = Math.sin(x * 30) * Math.cos(v * 30);
        if (spots > 0.82) {
          return [0, 255, 230, 255];
        }
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
