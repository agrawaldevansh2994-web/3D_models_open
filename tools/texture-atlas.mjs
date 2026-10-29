import { PNG } from 'pngjs';

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

export function bakeAtlasTextures(palette) {
  const width = 16;
  const height = 1;

  const baseColor = createPNG(width, height, (u, v, x) => {
    const p = palette[x] || { baseColor: [128, 128, 128] };
    const c = p.baseColor;
    return [c[0], c[1], c[2], 255];
  });

  const metallicRoughness = createPNG(width, height, (u, v, x) => {
    const p = palette[x] || { roughness: 0.8, metalness: 0.1 };
    return [0, Math.round(p.roughness * 255), Math.round(p.metalness * 255), 255];
  });

  const normal = createPNG(width, height, () => [128, 128, 255, 255]);

  const emissive = createPNG(width, height, (u, v, x) => {
    const p = palette[x] || { emissive: [0, 0, 0] };
    const em = p.emissive || [0, 0, 0];
    return [em[0], em[1], em[2], 255];
  });

  return { baseColor, metallicRoughness, normal, emissive };
}

export const PALETTES = {
  // 1. festival_raver (Cyberpunk Playa Raver with Neon Mohawk & LED Vest)
  festival_raver: [
    { baseColor: [225, 178, 145], roughness: 0.70, metalness: 0.05, emissive: [0, 0, 0] },     // 0: Skin (warm sunlit)
    { baseColor: [35, 30, 28],    roughness: 0.85, metalness: 0.05, emissive: [0, 0, 0] },     // 1: Eyebrows
    { baseColor: [0, 245, 255],   roughness: 0.10, metalness: 0.90, emissive: [0, 255, 250] }, // 2: Eyes / Visor (Brilliant Cyan Glow)
    { baseColor: [240, 240, 245], roughness: 0.60, metalness: 0.10, emissive: [0, 0, 0] },     // 3: White under-vest
    { baseColor: [0, 235, 255],   roughness: 0.40, metalness: 0.20, emissive: [0, 240, 255] }, // 4: Neon Cyan Vest
    { baseColor: [255, 20, 160],  roughness: 0.35, metalness: 0.10, emissive: [255, 20, 160] },// 5: Hair Accent (Neon Magenta)
    { baseColor: [0, 240, 255],   roughness: 0.30, metalness: 0.10, emissive: [0, 240, 255] }, // 6: Mohawk (Electric Cyan Glow)
    { baseColor: [230, 230, 240], roughness: 0.20, metalness: 0.90, emissive: [0, 0, 0] },     // 7: Hardware / Earrings
    { baseColor: [25, 26, 32],    roughness: 0.85, metalness: 0.05, emissive: [0, 0, 0] },     // 8: Cargo Joggers
    { baseColor: [18, 18, 20],    roughness: 0.70, metalness: 0.20, emissive: [0, 0, 0] },     // 9: Platform Boots
  ],

  // 2. dj_decks (Resident Festival DJ in Asymmetric Hooded Vest & Amber Glow)
  dj_decks: [
    { baseColor: [215, 170, 138], roughness: 0.72, metalness: 0.05, emissive: [0, 0, 0] },     // 0: Skin
    { baseColor: [32, 26, 22],    roughness: 0.80, metalness: 0.05, emissive: [0, 0, 0] },     // 1: Studio Hair / Headset band
    { baseColor: [255, 180, 0],   roughness: 0.15, metalness: 0.85, emissive: [255, 180, 0] }, // 2: Eyes / Headphones (Warm Amber Glow)
    { baseColor: [28, 26, 34],    roughness: 0.75, metalness: 0.15, emissive: [255, 160, 0] }, // 3: Asymmetric DJ Hooded Vest (Amber EL-wire)
    { baseColor: [240, 180, 50],  roughness: 0.35, metalness: 0.25, emissive: [255, 170, 0] }, // 4: Sneaker Trim (Amber)
    { baseColor: [240, 240, 245], roughness: 0.60, metalness: 0.10, emissive: [0, 0, 0] },     // 5: White Sneaker Soles
    { baseColor: [35, 36, 42],    roughness: 0.85, metalness: 0.05, emissive: [0, 0, 0] },     // 6: Fitted Joggers
  ],

  // 3. desert_wanderer (Playa Dust Nomad with Weathered Poncho & Brass Goggles)
  desert_wanderer: [
    { baseColor: [195, 150, 120], roughness: 0.80, metalness: 0.05, emissive: [0, 0, 0] },     // 0: Skin
    { baseColor: [85, 70, 52],    roughness: 0.85, metalness: 0.05, emissive: [0, 0, 0] },     // 1: Shemagh / Desert Headscarf
    { baseColor: [255, 190, 50],  roughness: 0.20, metalness: 0.85, emissive: [255, 180, 40] },// 2: Brass Dust Goggles (Amber Glow)
    { baseColor: [160, 130, 95],  roughness: 0.90, metalness: 0.05, emissive: [0, 0, 0] },     // 3: Weathered Poncho / Dust Cloak
    { baseColor: [135, 110, 80],  roughness: 0.90, metalness: 0.05, emissive: [0, 0, 0] },     // 4: Desert Trousers
    { baseColor: [100, 80, 55],   roughness: 0.85, metalness: 0.10, emissive: [0, 0, 0] },     // 5: Wrapped Desert Boots
    { baseColor: [120, 95, 70],   roughness: 0.85, metalness: 0.05, emissive: [0, 0, 0] },     // 6: Cloak Hem
    { baseColor: [210, 160, 70],  roughness: 0.35, metalness: 0.85, emissive: [0, 0, 0] },     // 7: Brass Buckles / Hardware
    { baseColor: [255, 170, 30],  roughness: 0.20, metalness: 0.80, emissive: [255, 160, 20] },// 8: Glowing Amber Lantern Vial
  ],

  // 4. deep_sea_diver (Heavy Abyssal Brass Helmet & Bioluminescent Accents)
  deep_sea_diver: [
    { baseColor: [185, 142, 112], roughness: 0.75, metalness: 0.05, emissive: [0, 0, 0] },     // 0: Skin
    { baseColor: [175, 120, 55],  roughness: 0.35, metalness: 0.85, emissive: [0, 0, 0] },     // 1: Brass Helmet Dome & Hood
    { baseColor: [0, 245, 255],   roughness: 0.10, metalness: 0.90, emissive: [0, 245, 255] }, // 2: Porthole Glass Glow
    { baseColor: [205, 140, 65],  roughness: 0.30, metalness: 0.88, emissive: [0, 0, 0] },     // 3: Copper Collar Breastplate
    { baseColor: [85, 90, 80],    roughness: 0.88, metalness: 0.08, emissive: [0, 0, 0] },     // 4: Canvas Dive Suit
    { baseColor: [115, 120, 130], roughness: 0.50, metalness: 0.75, emissive: [0, 0, 0] },     // 5: Lead-soled Boots
    { baseColor: [0, 255, 180],   roughness: 0.40, metalness: 0.20, emissive: [0, 255, 180] }, // 6: Bioluminescent Barnacles
    { baseColor: [220, 160, 70],  roughness: 0.25, metalness: 0.90, emissive: [0, 0, 0] },     // 7: 12 Heavy Brass Bolts
    { baseColor: [0, 230, 200],   roughness: 0.30, metalness: 0.20, emissive: [0, 230, 200] }, // 8: Abyssal Aqua Trim
  ],
};
