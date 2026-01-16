// ts/lib/rng.ts
var RNG = class {
  state;
  constructor(seed = Date.now()) {
    this.state = seed >>> 0;
  }
  next() {
    this.state += 1831565813;
    let t = this.state;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  float(min, max) {
    return this.next() * (max - min) + min;
  }
  int(min, max) {
    return Math.floor(this.float(min, max + 1));
  }
  choice(values) {
    if (!values.length) {
      throw new Error("choice() called with empty array");
    }
    return values[this.int(0, values.length - 1)];
  }
};

// ts/lib/background.ts
var CURATED_PALETTES = [
  ["#0f2027", "#203a43", "#2c5364"],
  ["#11052c", "#5b0eeb", "#f4b942"],
  ["#0d1b2a", "#1b263b", "#e0e1dd"],
  ["#0f0a3c", "#f95738", "#f4d35e"],
  ["#1f1300", "#8f2d56", "#ffcb77"],
  ["#102542", "#f87060", "#ffd166"],
  ["#012a4a", "#2a6f97", "#468faf"]
];
var BLUR_LEVELS = [6, 12, 24];
var BACKGROUND_DEFAULTS = {
  width: 5120,
  height: 1440,
  blobCount: null,
  ribbonCount: null,
  orbCount: null,
  lightCount: null,
  lineCount: null,
  triangleCount: null,
  waveCount: null
};
var DEFAULT_BACKGROUND_OPTIONS = {
  ...BACKGROUND_DEFAULTS,
  seed: Date.now()
};
function generateBackgroundSvg(partial = {}) {
  const seed = typeof partial.seed === "number" && !Number.isNaN(partial.seed) ? partial.seed : Date.now();
  const resolved = {
    ...DEFAULT_BACKGROUND_OPTIONS,
    ...partial,
    width: partial.width ?? DEFAULT_BACKGROUND_OPTIONS.width,
    height: partial.height ?? DEFAULT_BACKGROUND_OPTIONS.height,
    seed
  };
  const rng = new RNG(seed);
  const palette = generatePalettePlan(rng);
  const svg = createSvg(rng, resolved, palette);
  return { svg, seed, palette };
}
function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b];
}
function rgbToHex([r, g, b]) {
  const clamp2 = (value) => Math.max(0, Math.min(255, Math.round(value)));
  return `#${clamp2(r).toString(16).padStart(2, "0")}${clamp2(g).toString(16).padStart(2, "0")}${clamp2(b).toString(16).padStart(2, "0")}`;
}
function blendHex(color, target, factor) {
  const [r, g, b] = hexToRgb(color);
  return rgbToHex([
    r + (target[0] - r) * factor,
    g + (target[1] - g) * factor,
    b + (target[2] - b) * factor
  ]);
}
function tint(color, factor) {
  return blendHex(color, [255, 255, 255], factor);
}
function shade(color, factor) {
  return blendHex(color, [0, 0, 0], factor);
}
function jitterColor(rng, color, spread = 20) {
  const [r, g, b] = hexToRgb(color);
  return rgbToHex([
    r + rng.float(-spread, spread),
    g + rng.float(-spread, spread),
    b + rng.float(-spread, spread)
  ]);
}
function relativeLuminance(color) {
  const [r, g, b] = hexToRgb(color).map((value) => value / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function generatePalettePlan(rng) {
  const base = CURATED_PALETTES[rng.int(0, CURATED_PALETTES.length - 1)].map(
    (color) => jitterColor(rng, color)
  );
  const sorted = [...base].sort((a, b) => relativeLuminance(a) - relativeLuminance(b));
  const [darkest, mid, lightest] = sorted;
  return {
    gradient: base,
    blobColors: base.map((color) => shade(color, rng.float(0.05, 0.18))),
    accent: tint(mid, 0.25),
    accentAlt: tint(lightest, 0.4),
    highlight: tint(lightest, 0.55),
    stroke: shade(darkest, 0.35)
  };
}
function buildLinearGradient(id, colors) {
  const stops = [];
  const list = Array.from(colors);
  list.forEach((color, index) => {
    const offset = index / Math.max(1, list.length - 1);
    stops.push(`<stop offset="${(offset * 100).toFixed(2)}%" stop-color="${color}" />`);
  });
  return `
        <linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="100%">
            ${stops.join(" ")}
        </linearGradient>
    `.trim();
}
function buildRadialGradient(id, inner, outer) {
  return `
        <radialGradient id="${id}" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stop-color="${inner}" stop-opacity="0.9" />
            <stop offset="70%" stop-color="${outer}" stop-opacity="0.15" />
            <stop offset="100%" stop-color="${outer}" stop-opacity="0" />
        </radialGradient>
    `.trim();
}
function randomBlob(rng, width, height, palette) {
  const cx = rng.float(0.2, 0.8) * width;
  const cy = rng.float(0.25, 0.75) * height;
  const radius = Math.min(width, height) * rng.float(0.12, 0.28);
  const points = [];
  for (let angle = 0; angle < 360; angle += 30) {
    const rad = angle * Math.PI / 180;
    const offset = radius * rng.float(0.8, 1.35);
    points.push([cx + Math.cos(rad) * offset, cy + Math.sin(rad) * offset]);
  }
  const segments = [`M ${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`];
  for (let i = 0; i < points.length; i += 1) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const ctrlAngle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) + rng.float(-0.6, 0.6);
    const ctrlRadius = radius * rng.float(0.4, 0.9);
    const ctrl1 = [
      p1[0] + Math.cos(ctrlAngle) * ctrlRadius,
      p1[1] + Math.sin(ctrlAngle) * ctrlRadius
    ];
    const ctrl2 = [
      p2[0] - Math.cos(ctrlAngle) * ctrlRadius,
      p2[1] - Math.sin(ctrlAngle) * ctrlRadius
    ];
    segments.push(
      `C ${ctrl1[0].toFixed(1)},${ctrl1[1].toFixed(1)} ${ctrl2[0].toFixed(1)},${ctrl2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`
    );
  }
  const opacity = rng.float(0.35, 0.55);
  const blur = rng.choice(BLUR_LEVELS);
  const fill = rng.choice(palette.blobColors);
  return `
        <g opacity="${opacity.toFixed(2)}" filter="url(#blur${blur})">
            <path d="${segments.join(" ")}" fill="${fill}" />
        </g>
    `.trim();
}
function randomLightCone(rng, width, height, palette) {
  const gradientId = `rad-${rng.int(0, 1e4)}`;
  const highlight = rng.choice([palette.highlight, palette.accentAlt]);
  const defs = buildRadialGradient(gradientId, highlight, palette.gradient[0]);
  const radius = Math.min(width, height) * rng.float(0.35, 0.55);
  const cx = rng.float(0.3, 0.7) * width;
  const cy = rng.float(0.25, 0.75) * height;
  const circle = `
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${radius.toFixed(1)}"
            fill="url(#${gradientId})" opacity="0.65" style="mix-blend-mode:screen;" />
    `.trim();
  return [defs, circle];
}
function randomLineCluster(rng, width, height, palette) {
  const count = rng.int(6, 12);
  const rotation = rng.float(-18, 18);
  const startX = -0.2 * width;
  const endX = 1.2 * width;
  const baseY = rng.float(0.2, 0.8) * height;
  const spacing = height * rng.float(0.01, 0.03);
  const lines = Array.from({ length: count }, (_, idx) => {
    const yOffset = baseY + (idx - count / 2) * spacing;
    const opacity = rng.float(0.05, 0.18);
    return `<line x1="${startX.toFixed(1)}" y1="${yOffset.toFixed(1)}" x2="${endX.toFixed(1)}" y2="${yOffset.toFixed(1)}" stroke="${palette.stroke}" stroke-width="${(height * 25e-4).toFixed(2)}" opacity="${opacity.toFixed(2)}" />`;
  });
  return `
        <g transform="rotate(${rotation.toFixed(2)} ${width / 2}, ${height / 2})">
            ${lines.join(" ")}
        </g>
    `.trim();
}
function randomRibbon(rng, width, height, palette) {
  const segments = 8;
  const startY = rng.float(0.15, 0.85) * height;
  const amplitude = height * rng.float(0.05, 0.14);
  const horizontalStep = width / segments;
  const parts = [`M 0,${startY.toFixed(1)}`];
  let currentY = startY;
  for (let idx = 0; idx < segments; idx += 1) {
    const endX = (idx + 1) * horizontalStep;
    const wave = Math.sin((idx + rng.next()) * rng.float(0.4, 1.2));
    const endY = startY + wave * amplitude;
    const ctrl1 = [endX - horizontalStep * 0.6, currentY + amplitude * rng.float(-0.5, 0.5)];
    const ctrl2 = [endX - horizontalStep * 0.2, endY + amplitude * rng.float(-0.5, 0.5)];
    parts.push(
      `C ${ctrl1[0].toFixed(1)},${ctrl1[1].toFixed(1)} ${ctrl2[0].toFixed(1)},${ctrl2[1].toFixed(1)} ${endX.toFixed(1)},${endY.toFixed(1)}`
    );
    currentY = endY;
  }
  const stroke = rng.choice([palette.accent, palette.accentAlt]);
  const strokeWidth = rng.float(height * 0.02, height * 0.06);
  return `
        <path d="${parts.join(" ")}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth.toFixed(1)}"
            stroke-linecap="round" stroke-linejoin="round" opacity="0.65" />
    `.trim();
}
function randomOrbs(rng, width, height, palette, count) {
  return Array.from({ length: count }, () => {
    const radius = Math.min(width, height) * rng.float(0.04, 0.12);
    const cx = rng.float(0.1, 0.9) * width;
    const cy = rng.float(0.1, 0.9) * height;
    const stroke = rng.choice([palette.accentAlt, palette.highlight]);
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${radius.toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="${(radius * 0.2).toFixed(1)}" opacity="0.4" />`;
  }).join("\n");
}
function randomGradientTriangles(rng, width, height, palette, count) {
  const defs = [];
  const shapes = [];
  for (let i = 0; i < count; i += 1) {
    const gradId = `tri-grad-${rng.int(0, 1e4)}`;
    defs.push(buildLinearGradient(gradId, [palette.highlight, palette.accent]));
    const points = Array.from({ length: 3 }, () => {
      const px = rng.float(-0.1, 1.1) * width;
      const py = rng.float(-0.1, 1.1) * height;
      return `${px.toFixed(1)},${py.toFixed(1)}`;
    });
    shapes.push(`<polygon points="${points.join(" ")}" fill="url(#${gradId})" opacity="0.25" />`);
  }
  return [defs, shapes.join("\n")];
}
function randomSurfaceWave(rng, width, height, palette) {
  const baseY = rng.float(0.35, 0.85) * height;
  const amplitude = height * rng.float(0.04, 0.12);
  const segments = 7;
  const horizontalStep = width / segments;
  const parts = [`M 0,${baseY.toFixed(1)}`];
  let currentY = baseY;
  for (let idx = 0; idx < segments; idx += 1) {
    const endX = (idx + 1) * horizontalStep;
    const target = baseY + Math.sin((idx + rng.next()) * rng.float(0.4, 1.1)) * amplitude;
    const ctrl1 = [endX - horizontalStep * 0.7, currentY + amplitude * rng.float(-0.6, 0.6)];
    const ctrl2 = [endX - horizontalStep * 0.3, target + amplitude * rng.float(-0.6, 0.6)];
    parts.push(
      `C ${ctrl1[0].toFixed(1)},${ctrl1[1].toFixed(1)} ${ctrl2[0].toFixed(1)},${ctrl2[1].toFixed(1)} ${endX.toFixed(1)},${target.toFixed(1)}`
    );
    currentY = target;
  }
  parts.push(`L ${width.toFixed(1)},${height.toFixed(1)}`);
  parts.push(`L 0,${height.toFixed(1)} Z`);
  const gradId = `wave-grad-${rng.int(0, 1e4)}`;
  const defs = buildLinearGradient(gradId, [palette.accentAlt, palette.gradient[2]]);
  const shape = `
        <path d="${parts.join(" ")}" fill="url(#${gradId})" opacity="0.35" style="mix-blend-mode:screen;" />
    `.trim();
  return [defs, shape];
}
function getNoiseOverlay(rng, cache) {
  if (!cache.value) {
    const filterId = `grainFilter-${rng.int(0, 1e4)}`;
    const symbolId = `grainSymbol-${rng.int(0, 1e4)}`;
    const defs = `
            <filter id="${filterId}" x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${rng.int(0, 1e4)}" result="noise" />
                <feColorMatrix type="saturate" values="0" in="noise" result="mono" />
                <feComponentTransfer in="mono">
                    <feFuncA type="linear" slope="0.08" />
                </feComponentTransfer>
            </filter>
            <symbol id="${symbolId}" viewBox="0 0 1 1" preserveAspectRatio="none">
                <rect width="1" height="1" fill="#ffffff" />
            </symbol>
        `.trim();
    const overlay = `<use href="#${symbolId}" x="0" y="0" width="100%" height="100%" filter="url(#${filterId})" opacity="0.08" />`;
    cache.value = [defs, overlay];
  }
  return cache.value;
}
function resolveCount(rng, value, fallback) {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return Math.max(0, value);
  }
  const [min, max] = fallback;
  return rng.int(min, max);
}
function createSvg(rng, options, palette) {
  const { width, height } = options;
  const gradientId = `grad-${rng.int(0, 1e4)}`;
  const defs = [buildLinearGradient(gradientId, palette.gradient)];
  BLUR_LEVELS.forEach((blur) => {
    defs.push(
      `
            <filter id="blur${blur}" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="${blur}" />
            </filter>
        `.trim()
    );
  });
  const layers = [];
  const ribbonCount = resolveCount(rng, options.ribbonCount, [1, 2]);
  if (ribbonCount) {
    layers.push(Array.from({ length: ribbonCount }, () => randomRibbon(rng, width, height, palette)).join("\n"));
  }
  const waveCount = resolveCount(rng, options.waveCount, [1, 2]);
  if (waveCount) {
    const waveLayers = [];
    for (let i = 0; i < waveCount; i += 1) {
      const [waveDef, waveShape] = randomSurfaceWave(rng, width, height, palette);
      defs.push(waveDef);
      waveLayers.push(waveShape);
    }
    layers.push(waveLayers.join("\n"));
  }
  const triangleCount = resolveCount(rng, options.triangleCount, [1, 3]);
  if (triangleCount) {
    const [triangleDefs, triangleShapes] = randomGradientTriangles(rng, width, height, palette, triangleCount);
    defs.push(...triangleDefs);
    layers.push(triangleShapes);
  }
  const orbCount = resolveCount(rng, options.orbCount, [4, 7]);
  if (orbCount) {
    layers.push(randomOrbs(rng, width, height, palette, orbCount));
  }
  const lineCount = resolveCount(rng, options.lineCount, [1, 1]);
  if (lineCount) {
    layers.push(
      Array.from({ length: lineCount }, () => randomLineCluster(rng, width, height, palette)).join("\n")
    );
  }
  const blobCount = resolveCount(rng, options.blobCount, [2, 4]);
  if (blobCount) {
    layers.push(Array.from({ length: blobCount }, () => randomBlob(rng, width, height, palette)).join("\n"));
  }
  const lightCount = resolveCount(rng, options.lightCount, [1, 2]);
  if (lightCount) {
    const lights = [];
    for (let i = 0; i < lightCount; i += 1) {
      const [lightDef, lightShape] = randomLightCone(rng, width, height, palette);
      defs.push(lightDef);
      lights.push(lightShape);
    }
    layers.push(lights.join("\n"));
  }
  const noiseCache = { value: null };
  const [noiseDefs, noiseOverlay] = getNoiseOverlay(rng, noiseCache);
  defs.push(noiseDefs);
  return `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
            <defs>
                ${defs.join("\n")}
            </defs>
            <rect width="100%" height="100%" fill="url(#${gradientId})" />
            ${layers.join("\n")}
            ${noiseOverlay}
        </svg>
    `.trim();
}

// ts/lib/polygalaxy.ts
var THEMES = {
  nocturne: {
    name: "Nocturne",
    background: ["#050912", "#0c1d3c", "#46237a"],
    halo: ["#ff7edb", "#1c0446"],
    facets: ["#6f00ff", "#ff00ff", "#00d0ff"],
    glows: ["#ffaa00", "#ff4ecd"],
    thread: "#93fff8",
    star: "#f3f5ff",
    grid: "#1f2b55",
    accent: "#00d1ff"
  },
  solstice: {
    name: "Solstice",
    background: ["#2b1055", "#f83600", "#f9d423"],
    halo: ["#ffe29f", "#ff5f6d"],
    facets: ["#f8d49b", "#f36d21", "#7f53ac"],
    glows: ["#ffe066", "#ff9f68"],
    thread: "#ffe9ba",
    star: "#fff5d7",
    grid: "#6b2d5c",
    accent: "#ff6f91"
  },
  aurora: {
    name: "Aurora",
    background: ["#020c1b", "#03254c", "#2a9d8f"],
    halo: ["#00f5d4", "#046865"],
    facets: ["#00b4d8", "#90f1ef", "#ffd166"],
    glows: ["#cbf3f0", "#ffbf69"],
    thread: "#00f5d4",
    star: "#f8f9fa",
    grid: "#0b3954",
    accent: "#ffd166"
  },
  umbra: {
    name: "Umbra",
    background: ["#120c18", "#2d033b", "#810955"],
    halo: ["#ff57b9", "#5b0060"],
    facets: ["#f70776", "#a01a7d", "#2f195f"],
    glows: ["#ffbd39", "#ff449f"],
    thread: "#ff89c0",
    star: "#ffe0f7",
    grid: "#351f39",
    accent: "#ff66c4"
  }
};
var STYLE_PRESETS = {
  aura: {
    facets: [6, 9],
    rings: [4, 6],
    threads: [3, 5],
    glows: [4, 6],
    constellations: [2, 3],
    stars: [380, 520],
    systems: [2, 3],
    arms: [2, 3],
    planets: [8, 14]
  },
  loom: {
    facets: [4, 6],
    rings: [6, 9],
    threads: [6, 9],
    glows: [2, 3],
    constellations: [3, 4],
    stars: [420, 620],
    systems: [3, 4],
    arms: [3, 4],
    planets: [12, 18]
  },
  rift: {
    facets: [3, 5],
    rings: [2, 4],
    threads: [2, 3],
    glows: [5, 7],
    constellations: [1, 2],
    stars: [260, 360],
    systems: [1, 2],
    arms: [2, 3],
    planets: [5, 9]
  }
};
var POLYGALAXY_THEMES = THEMES;
var POLYGALAXY_STYLES = STYLE_PRESETS;
var SvgBuilder = class {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }
  defs = [];
  layers = [];
  counter = 0;
  uid(prefix) {
    this.counter += 1;
    return `${prefix}-${this.counter}`;
  }
  addDef(snippet) {
    this.defs.push(snippet.trim());
  }
  addLayer(snippet) {
    this.layers.push(snippet.trim());
  }
  render() {
    return `
            <svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}">
                <defs>${this.defs.join(" ")}</defs>
                ${this.layers.join(" ")}
            </svg>
        `.trim();
  }
};
function generatePolygalaxySvg(options = {}) {
  const seed = typeof options.seed === "number" && !Number.isNaN(options.seed) ? options.seed : Date.now();
  const rng = new RNG(seed);
  const width = options.width ?? 5120;
  const height = options.height ?? 1440;
  const themeKey = options.theme ?? "random";
  const theme = pickTheme(rng, themeKey);
  const counts = resolveStyle(rng, options.style ?? "aura", options);
  const builder = new SvgBuilder(width, height);
  addBackground(builder, theme);
  addFacets(builder, theme, counts.facets, rng);
  addGlowPortals(builder, theme, counts.glows, rng);
  addSpiralArms(builder, theme, counts.arms ?? 0, rng);
  addArcRings(builder, theme, counts.rings, rng);
  addOrbitalSystems(builder, theme, counts.systems ?? 0, counts.planets ?? 0, rng);
  addSignalThreads(builder, theme, counts.threads, rng);
  addStarfield(builder, theme, counts.stars, rng);
  addConstellations(builder, theme, counts.constellations, rng);
  if (options.scanlines) {
    addScanlines(builder, theme);
  }
  return {
    svg: builder.render(),
    seed,
    theme,
    counts
  };
}
function pickTheme(rng, key) {
  if (key === "random") {
    const entries = Object.values(THEMES);
    return entries[rng.int(0, entries.length - 1)];
  }
  return THEMES[key];
}
function resolveStyle(rng, style, overrides) {
  const preset = STYLE_PRESETS[style];
  const resolved = {};
  for (const key of Object.keys(preset)) {
    const range = preset[key];
    resolved[key] = rng.int(range[0], range[1]);
  }
  for (const key of ["stars", "facets", "rings", "threads", "glows", "constellations", "systems", "arms", "planets"]) {
    const override = overrides[key];
    if (typeof override === "number" && !Number.isNaN(override)) {
      resolved[key] = Math.max(0, override);
    }
  }
  return resolved;
}
function addBackground(builder, theme) {
  const linearId = builder.uid("bg");
  builder.addDef(`
        <linearGradient id="${linearId}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${theme.background[0]}" />
            <stop offset="50%" stop-color="${theme.background[1]}" />
            <stop offset="100%" stop-color="${theme.background[2]}" />
        </linearGradient>
    `);
  const radialId = builder.uid("halo");
  builder.addDef(`
        <radialGradient id="${radialId}" cx="60%" cy="35%" r="70%">
            <stop offset="0%" stop-color="${theme.halo[0]}" stop-opacity="0.95" />
            <stop offset="100%" stop-color="${theme.halo[1]}" stop-opacity="0" />
        </radialGradient>
    `);
  builder.addLayer(`<rect width="100%" height="100%" fill="url(#${linearId})" />`);
  builder.addLayer(
    `<rect width="100%" height="100%" fill="url(#${radialId})" opacity="0.75" />`
  );
}
function addFacets(builder, theme, count, rng) {
  for (let i = 0; i < count; i += 1) {
    const sides = rng.int(3, 7);
    const angle = rng.float(0, Math.PI * 2);
    const radius = Math.min(builder.width, builder.height) * rng.float(0.08, 0.22);
    const cx = rng.float(0.05, 0.95) * builder.width;
    const cy = rng.float(0.1, 0.9) * builder.height;
    const points = [];
    for (let idx = 0; idx < sides; idx += 1) {
      const theta = angle + idx / sides * Math.PI * 2;
      const wobble = radius * rng.float(0.6, 1.3);
      const x = cx + Math.cos(theta) * wobble;
      const y = cy + Math.sin(theta) * wobble;
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    const gradId = builder.uid("facet");
    const colors = shuffle([...theme.facets], rng);
    builder.addDef(`
            <linearGradient id="${gradId}" gradientTransform="rotate(${rng.float(-45, 45).toFixed(1)})">
                <stop offset="0%" stop-color="${colors[0]}" stop-opacity="0.9" />
                <stop offset="55%" stop-color="${colors[1]}" stop-opacity="0.65" />
                <stop offset="100%" stop-color="${colors[2]}" stop-opacity="0.3" />
            </linearGradient>
        `);
    const blur = rng.choice([5, 10, 15]);
    const filterId = builder.uid("facet-blur");
    builder.addDef(`
            <filter id="${filterId}" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="${blur}" />
            </filter>
        `);
    builder.addLayer(
      `<polygon points="${points.join(" ")}" fill="url(#${gradId})" filter="url(#${filterId})" opacity="0.85" />`
    );
  }
}
function addArcRings(builder, theme, count, rng) {
  for (let i = 0; i < count; i += 1) {
    const cx = rng.float(0.2, 0.8) * builder.width;
    const cy = rng.float(0.2, 0.8) * builder.height;
    const rx = builder.width * rng.float(0.25, 0.7);
    const ry = builder.height * rng.float(0.2, 0.8);
    const startAngle = rng.float(0, Math.PI * 2);
    const span = rng.float(Math.PI / 6, Math.PI * 1.5);
    const endAngle = startAngle + span;
    const x1 = cx + rx * Math.cos(startAngle);
    const y1 = cy + ry * Math.sin(startAngle);
    const x2 = cx + rx * Math.cos(endAngle);
    const y2 = cy + ry * Math.sin(endAngle);
    const largeFlag = span > Math.PI ? 1 : 0;
    const sweepFlag = rng.choice([0, 1]);
    const strokeWidth = rng.float(10, 35);
    const opacity = rng.float(0.25, 0.55);
    builder.addLayer(
      `<path d="M ${x1.toFixed(1)},${y1.toFixed(1)} A ${rx.toFixed(1)},${ry.toFixed(1)} 0 ${largeFlag} ${sweepFlag} ${x2.toFixed(1)},${y2.toFixed(1)}" stroke="${theme.accent}" stroke-width="${strokeWidth.toFixed(1)}" fill="none" stroke-opacity="${opacity.toFixed(2)}" stroke-linecap="round" />`
    );
  }
}
function addSignalThreads(builder, theme, count, rng) {
  for (let i = 0; i < count; i += 1) {
    const segments = rng.int(4, 6);
    const y = rng.float(0.1, 0.9) * builder.height;
    const parts = [`M ${(-0.1 * builder.width).toFixed(1)},${y.toFixed(1)}`];
    for (let seg = 0; seg < segments; seg += 1) {
      const ctrlX = builder.width * ((seg + rng.float(0.1, 0.9)) / segments);
      const ctrlY = y + rng.float(-0.18, 0.18) * builder.height;
      const endX = builder.width * ((seg + 1) / segments);
      const endY = y + rng.float(-0.12, 0.12) * builder.height;
      parts.push(`Q ${ctrlX.toFixed(1)},${ctrlY.toFixed(1)} ${endX.toFixed(1)},${endY.toFixed(1)}`);
    }
    const thickness = rng.float(6, 16);
    builder.addLayer(
      `<path d="${parts.join(" ")}" fill="none" stroke="${theme.thread}" stroke-width="${thickness.toFixed(1)}" stroke-opacity="0.55" stroke-linecap="round" />`
    );
  }
}
function addOrbitalSystems(builder, theme, systems, planetBudget, rng) {
  if (!systems) {
    return;
  }
  const minDim = Math.min(builder.width, builder.height);
  const totalPlanets = planetBudget && planetBudget > 0 ? planetBudget : rng.int(systems * 3, systems * 6);
  let remainingPlanets = Math.max(totalPlanets, systems);
  for (let index = 0; index < systems; index += 1) {
    const cx = rng.float(0.2, 0.8) * builder.width;
    const cy = rng.float(0.2, 0.8) * builder.height;
    const orbitCount = rng.int(2, 4);
    const outerRadius = minDim * rng.float(0.08, 0.16);
    const perSystemBase = Math.max(1, Math.floor(remainingPlanets / Math.max(1, systems - index)));
    let planetsForSystem = Math.min(remainingPlanets, perSystemBase + rng.int(0, 2));
    remainingPlanets -= planetsForSystem;
    const sunGrad = builder.uid("sun-core");
    builder.addDef(`
            <radialGradient id="${sunGrad}">
                <stop offset="0%" stop-color="${theme.glows[0]}" stop-opacity="0.95" />
                <stop offset="70%" stop-color="${theme.glows[1]}" stop-opacity="0.35" />
                <stop offset="100%" stop-color="${theme.glows[1]}" stop-opacity="0" />
            </radialGradient>
        `);
    builder.addLayer(
      `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(minDim * 0.015).toFixed(2)}" fill="url(#${sunGrad})" opacity="0.9" />`
    );
    for (let orbit = 1; orbit <= orbitCount; orbit += 1) {
      const radius = outerRadius / orbitCount * orbit * rng.float(0.92, 1.08);
      builder.addLayer(
        `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${radius.toFixed(2)}" fill="none" stroke="${theme.grid}" stroke-opacity="0.35" stroke-width="${(minDim * 15e-4).toFixed(3)}" stroke-dasharray="${rng.float(18, 32).toFixed(1)} ${rng.float(30, 55).toFixed(1)}" />`
      );
      if (planetsForSystem <= 0) {
        continue;
      }
      const planetsOnOrbit = Math.min(planetsForSystem, rng.int(1, 3));
      planetsForSystem -= planetsOnOrbit;
      for (let p = 0; p < planetsOnOrbit; p += 1) {
        const angle = rng.float(0, Math.PI * 2);
        const px = cx + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;
        const pr = minDim * rng.float(4e-3, 0.011);
        const highlight = pr * rng.float(0.35, 0.6);
        builder.addLayer(
          `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${pr.toFixed(3)}" fill="${theme.star}" opacity="0.85" />`
        );
        builder.addLayer(
          `<circle cx="${(px - highlight / 2).toFixed(1)}" cy="${(py - highlight / 2).toFixed(1)}" r="${(highlight / 2.2).toFixed(3)}" fill="${theme.accent}" opacity="0.5" />`
        );
        const tailAngle = angle + Math.PI / 2;
        const tailLength = pr * rng.float(2.5, 4.5);
        builder.addLayer(
          `<path d="M ${px.toFixed(1)},${py.toFixed(1)} L ${(px + Math.cos(tailAngle) * tailLength).toFixed(1)},${(py + Math.sin(tailAngle) * tailLength).toFixed(1)}" stroke="${theme.accent}" stroke-width="${(pr * 0.4).toFixed(3)}" stroke-opacity="0.35" stroke-linecap="round" />`
        );
      }
    }
    if (planetsForSystem > 0 && index < systems - 1) {
      remainingPlanets += planetsForSystem;
    }
  }
}
function addGlowPortals(builder, theme, count, rng) {
  for (let i = 0; i < count; i += 1) {
    const gradId = builder.uid("portal");
    const [inner, outer] = shuffle([...theme.glows], rng);
    builder.addDef(`
            <radialGradient id="${gradId}">
                <stop offset="0%" stop-color="${inner}" stop-opacity="0.95" />
                <stop offset="65%" stop-color="${outer}" stop-opacity="0.35" />
                <stop offset="100%" stop-color="${outer}" stop-opacity="0" />
            </radialGradient>
        `);
    const radius = Math.min(builder.width, builder.height) * rng.float(0.08, 0.22);
    const cx = rng.float(0.1, 0.9) * builder.width;
    const cy = rng.float(0.15, 0.85) * builder.height;
    builder.addLayer(
      `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${radius.toFixed(1)}" fill="url(#${gradId})" opacity="0.85" />`
    );
  }
}
function addSpiralArms(builder, theme, armCount, rng) {
  if (!armCount) {
    return;
  }
  const centerX = builder.width * rng.float(0.35, 0.65);
  const centerY = builder.height * rng.float(0.35, 0.65);
  const maxRadius = Math.min(builder.width, builder.height) * rng.float(0.42, 0.58);
  const blurId = builder.uid("arm-blur");
  builder.addDef(`
        <filter id="${blurId}" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" />
        </filter>
    `);
  for (let arm = 0; arm < armCount; arm += 1) {
    const baseAngle = arm / armCount * Math.PI * 2 + rng.float(-0.4, 0.4);
    const sweep = Math.PI * rng.float(1.6, 2.4);
    const steps = 48;
    const points = [];
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      const angle = baseAngle + sweep * t;
      const radius = maxRadius * Math.pow(t, 0.85) * (1 + rng.float(-0.05, 0.08));
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius * rng.float(0.92, 1.12);
      points.push([x, y]);
    }
    if (!points.length) {
      continue;
    }
    const path = points.map(([x, y], idx) => `${idx === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const strokeWidth = (builder.height * rng.float(6e-3, 0.012)).toFixed(3);
    const opacity = (0.28 + (1 - arm / Math.max(1, armCount - 1)) * 0.25).toFixed(2);
    builder.addLayer(
      `<path d="${path}" fill="none" stroke="${theme.accent}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="${opacity}" filter="url(#${blurId})" stroke-dasharray="${rng.float(60, 120).toFixed(1)} ${rng.float(18, 36).toFixed(1)}" />`
    );
    const clusters = [];
    for (let step = 0; step < points.length; step += rng.int(3, 6)) {
      const [x, y] = points[step];
      const r = rng.float(2.2, 5.1);
      clusters.push(
        `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${theme.star}" opacity="${rng.float(0.35, 0.8).toFixed(2)}" />`
      );
    }
    builder.addLayer(`<g style="mix-blend-mode:screen;">${clusters.join(" ")}</g>`);
  }
}
function addStarfield(builder, theme, count, rng) {
  const stars = [];
  for (let i = 0; i < count; i += 1) {
    const r = rng.float(0.4, 2.4);
    const cx = rng.float(0, builder.width);
    const cy = rng.float(0, builder.height);
    const opacity = rng.float(0.35, 0.95);
    stars.push(
      `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(2)}" fill="${theme.star}" opacity="${opacity.toFixed(2)}" />`
    );
  }
  builder.addLayer(`<g opacity="0.9">${stars.join(" ")}</g>`);
}
function addConstellations(builder, theme, count, rng) {
  for (let i = 0; i < count; i += 1) {
    const pointCount = rng.int(4, 6);
    const points = [];
    for (let p = 0; p < pointCount; p += 1) {
      points.push([
        rng.float(0.05, 0.95) * builder.width,
        rng.float(0.05, 0.95) * builder.height
      ]);
    }
    const pathParts = [`M ${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`];
    for (const [px, py] of points.slice(1)) {
      pathParts.push(`L ${px.toFixed(1)},${py.toFixed(1)}`);
    }
    builder.addLayer(
      `<path d="${pathParts.join(" ")}" fill="none" stroke="${theme.star}" stroke-width="2.2" stroke-opacity="0.5" stroke-dasharray="6 8" />`
    );
    for (const [px, py] of points) {
      builder.addLayer(
        `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3.4" fill="${theme.accent}" opacity="0.7" />`
      );
    }
  }
}
function addScanlines(builder, theme) {
  const patternId = builder.uid("scan");
  builder.addDef(`
        <pattern id="${patternId}" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="1" fill="${theme.grid}" />
        </pattern>
    `);
  builder.addLayer(`<rect width="100%" height="100%" fill="url(#${patternId})" opacity="0.08" />`);
}
function shuffle(values, rng) {
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

// ts/lib/terrain.ts
var THEMES2 = {
  dawn: {
    name: "Dawn",
    skyTop: "#2f3c75",
    skyBottom: "#f5c3aa",
    sun: "#ffd27d",
    sunGlow: "#ff9b73",
    mountainPalette: ["#352d52", "#5e3f62", "#c26d68"],
    treePalette: ["#5c3f3a", "#3f2a2a"],
    riverMain: "#74c0e3",
    riverHighlight: "#bde0fe",
    cloud: "#ffe6d9",
    fog: "#f4d8c8"
  },
  noon: {
    name: "High Noon",
    skyTop: "#5ec4ff",
    skyBottom: "#fef9d7",
    sun: "#fff3b0",
    sunGlow: "#ffd166",
    mountainPalette: ["#5ca4a9", "#c4ddd8", "#f8edeb"],
    treePalette: ["#3c6e71", "#284b63"],
    riverMain: "#2ec4b6",
    riverHighlight: "#9bf6ff",
    cloud: "#ffffff",
    fog: "#d9eff1"
  },
  dusk: {
    name: "Dusk",
    skyTop: "#0f172a",
    skyBottom: "#f472b6",
    sun: "#ff89bb",
    sunGlow: "#ffb5a7",
    mountainPalette: ["#190b28", "#582f70", "#ff7b9c"],
    treePalette: ["#322450", "#231836"],
    riverMain: "#5ad2f4",
    riverHighlight: "#c0fdff",
    cloud: "#fbe5ff",
    fog: "#b287c3"
  },
  moss: {
    name: "Moss Valley",
    skyTop: "#0b3d2e",
    skyBottom: "#82c09a",
    sun: "#d0ffb7",
    sunGlow: "#8fd694",
    mountainPalette: ["#0d1f1f", "#265947", "#5d8a66"],
    treePalette: ["#2a6049", "#163d30"],
    riverMain: "#4cc9f0",
    riverHighlight: "#a0f3ff",
    cloud: "#c7ffd8",
    fog: "#7cb09f"
  }
};
var TERRAIN_THEMES = THEMES2;
var SceneBuilder = class {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }
  defs = [];
  layers = [];
  counter = 0;
  uid(prefix) {
    this.counter += 1;
    return `${prefix}-${this.counter}`;
  }
  addDef(snippet) {
    this.defs.push(snippet.trim());
  }
  addLayer(snippet) {
    this.layers.push(snippet.trim());
  }
  render() {
    return `
            <svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}">
                <defs>${this.defs.join(" ")}</defs>
                ${this.layers.join(" ")}
            </svg>
        `.trim();
  }
};
function generateTerrainSvg(options = {}) {
  const seed = typeof options.seed === "number" && !Number.isNaN(options.seed) ? options.seed : Date.now();
  const rng = new RNG(seed);
  const width = options.width ?? 5120;
  const height = options.height ?? 1440;
  const theme = pickTheme2(rng, options.theme ?? "random");
  const builder = new SceneBuilder(width, height);
  addSky(builder, theme, options.moon ?? false);
  addClouds(builder, theme, options.clouds ?? 12, rng);
  addMountains(builder, theme, options.mountains ?? 3, rng);
  addRiver(builder, theme, rng);
  addTrees(builder, theme, options.trees ?? 40, rng);
  if (options.fog) {
    addFog(builder, theme);
  }
  if (options.noise) {
    addNoise(builder);
  }
  return {
    svg: builder.render(),
    seed,
    theme
  };
}
function pickTheme2(rng, key) {
  if (key === "random") {
    const entries = Object.values(THEMES2);
    return entries[rng.int(0, entries.length - 1)];
  }
  return THEMES2[key];
}
function addSky(builder, theme, moon) {
  const gradId = builder.uid("sky");
  builder.addDef(`
        <linearGradient id="${gradId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${theme.skyTop}" />
            <stop offset="100%" stop-color="${theme.skyBottom}" />
        </linearGradient>
    `);
  builder.addLayer(`<rect width="100%" height="100%" fill="url(#${gradId})" />`);
  const lightId = builder.uid("sun");
  builder.addDef(`
        <radialGradient id="${lightId}" cx="75%" cy="25%" r="35%">
            <stop offset="0%" stop-color="${theme.sun}" stop-opacity="0.95" />
            <stop offset="100%" stop-color="${theme.sunGlow}" stop-opacity="0" />
        </radialGradient>
    `);
  builder.addLayer(`<rect width="100%" height="100%" fill="url(#${lightId})" opacity="0.9" />`);
  const orbColor = moon ? theme.fog : theme.sun;
  builder.addLayer(
    `<circle cx="${(builder.width * 0.78).toFixed(1)}" cy="${(builder.height * 0.22).toFixed(1)}" r="${(builder.height * 0.12).toFixed(1)}" fill="${orbColor}" opacity="0.85" />`
  );
}
function mountainPath(rng, width, height, baseY, roughness, peakScale) {
  const points = [];
  let x = -0.1 * width;
  while (x <= width * 1.1) {
    let y = baseY + Math.sin(x / (width * 0.18)) * roughness * height * peakScale;
    y += rng.float(-roughness, roughness) * height * 0.4 * peakScale;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    x += rng.float(width * 0.05, width * 0.12);
  }
  points.push(`${(width * 1.1).toFixed(1)},${height.toFixed(1)}`);
  points.push(`${(-0.1 * width).toFixed(1)},${height.toFixed(1)}`);
  return points.join(" ");
}
function addMountains(builder, theme, layers, rng) {
  const palette = [...theme.mountainPalette];
  const layerTotal = Math.max(1, layers);
  for (let idx = 0; idx < layerTotal; idx += 1) {
    const depthRatio = layerTotal > 1 ? idx / (layerTotal - 1) : 0;
    const color = palette[idx % palette.length];
    const baseY = builder.height * (0.28 + depthRatio * 0.22 + rng.float(-0.015, 0.015));
    const roughness = 0.07 + (1 - depthRatio) * 0.04;
    const peakScale = 1.4 - depthRatio * 0.5;
    const opacity = Math.max(0.35, 0.95 - depthRatio * 0.4);
    const path = mountainPath(rng, builder.width, builder.height, baseY, roughness, peakScale);
    builder.addLayer(`<path d="M ${path}" fill="${color}" opacity="${opacity.toFixed(2)}" />`);
  }
}
function addRiver(builder, theme, rng) {
  const parts = [`M ${(builder.width * 0.05).toFixed(1)},${(builder.height * 0.8).toFixed(1)}`];
  const ctrlPoints = 5;
  for (let i = 0; i < ctrlPoints; i += 1) {
    const cx = builder.width * (0.1 + i * 0.18 + rng.float(-0.04, 0.04));
    const cy = builder.height * (0.65 + i * 0.05 + rng.float(-0.04, 0.03));
    const ex = builder.width * (0.2 + i * 0.18);
    const ey = builder.height * (0.78 + i * 0.045);
    parts.push(`Q ${cx.toFixed(1)},${cy.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`);
  }
  parts.push(`L ${builder.width.toFixed(1)},${builder.height.toFixed(1)}`);
  parts.push(`L 0,${builder.height.toFixed(1)} Z`);
  builder.addLayer(`<path d="${parts.join(" ")}" fill="${theme.riverMain}" opacity="0.6" />`);
  builder.addLayer(
    `<path d="${parts.join(" ")}" fill="none" stroke="${theme.riverHighlight}" stroke-width="${(builder.height * 0.03).toFixed(1)}" stroke-opacity="0.35" />`
  );
}
function addTrees(builder, theme, count, rng) {
  for (let i = 0; i < count; i += 1) {
    const baseX = rng.float(-0.05, 1.05) * builder.width;
    const baseY = builder.height * rng.float(0.72, 0.92);
    const height = builder.height * rng.float(0.04, 0.12);
    const width = height * rng.float(0.35, 0.55);
    const color = rng.choice(theme.treePalette);
    const topY = baseY - height;
    const branchY = baseY - height * rng.float(0.6, 0.9);
    const path = `M ${baseX.toFixed(1)},${baseY.toFixed(1)} L ${(baseX + width / 2).toFixed(1)},${topY.toFixed(1)} L ${(baseX - width / 2).toFixed(1)},${branchY.toFixed(1)} Z`;
    builder.addLayer(`<path d="${path}" fill="${color}" opacity="${rng.float(0.65, 0.95).toFixed(2)}" />`);
    builder.addLayer(
      `<rect x="${(baseX - width * 0.08).toFixed(1)}" y="${(baseY - height * 0.1).toFixed(1)}" width="${(width * 0.16).toFixed(1)}" height="${(height * 0.35).toFixed(1)}" fill="${theme.treePalette[0]}" opacity="0.6" />`
    );
  }
}
function addClouds(builder, theme, count, rng) {
  for (let i = 0; i < count; i += 1) {
    const cx = rng.float(0.05, 0.95) * builder.width;
    const cy = rng.float(0.05, 0.35) * builder.height;
    const rx = builder.width * rng.float(0.04, 0.12);
    const ry = builder.height * rng.float(0.03, 0.08);
    builder.addLayer(
      `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${theme.cloud}" opacity="0.4" />`
    );
  }
}
function addFog(builder, theme) {
  const fogId = builder.uid("fog");
  builder.addDef(`
        <linearGradient id="${fogId}" x1="0%" y1="50%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${theme.fog}" stop-opacity="0" />
            <stop offset="40%" stop-color="${theme.fog}" stop-opacity="0.35" />
            <stop offset="100%" stop-color="${theme.fog}" stop-opacity="0.8" />
        </linearGradient>
    `);
  builder.addLayer(`<rect width="100%" height="100%" fill="url(#${fogId})" opacity="0.75" />`);
}
function addNoise(builder) {
  const filterId = builder.uid("grain");
  builder.addDef(`
        <filter id="${filterId}">
            <feTurbulence baseFrequency="0.9" numOctaves="2" type="fractalNoise" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
                <feFuncA type="linear" slope="0.12" />
            </feComponentTransfer>
        </filter>
    `);
  builder.addLayer(`<rect width="100%" height="100%" filter="url(#${filterId})" opacity="0.08" />`);
}

// ts/lib/skyline.ts
var THEMES3 = {
  ember: {
    name: "Ember Dusk",
    skyGradient: ["#120c42", "#ff5f6d"],
    horizonGlow: "#ffd166",
    aurora: "#f15bb5",
    buildingBases: ["#04050b", "#1f2448", "#3d315b"],
    windowLit: ["#ffe066", "#ff9a8b"],
    windowDim: "#0d1321",
    neon: "#08d9d6",
    star: "#f8f9fa",
    haze: "#ffd6e0",
    waterSurface: ["#090a1d", "#1d2f55"],
    trafficLights: ["#ff6b6b", "#ffd166"],
    road: "#050713"
  },
  midnight: {
    name: "Midnight Pulse",
    skyGradient: ["#030712", "#162447"],
    horizonGlow: "#5dd9c1",
    aurora: "#4d39ce",
    buildingBases: ["#010104", "#0b1231", "#152645"],
    windowLit: ["#7ef9ff", "#ffd23f"],
    windowDim: "#050914",
    neon: "#00f5d4",
    star: "#c7f9cc",
    haze: "#5dd9c155",
    waterSurface: ["#03111a", "#0f3057"],
    trafficLights: ["#ff4ecd", "#00f5d4"],
    road: "#02030b"
  },
  sunrise: {
    name: "Neon Sunrise",
    skyGradient: ["#f72585", "#ffdd00"],
    horizonGlow: "#fcbf49",
    aurora: "#3a86ff",
    buildingBases: ["#210124", "#541388", "#7c3aed"],
    windowLit: ["#fee440", "#ff8fab"],
    windowDim: "#2b0b3f",
    neon: "#4cc9f0",
    star: "#ffffff",
    haze: "#ffd6a5",
    waterSurface: ["#2a0c46", "#ff79c6"],
    trafficLights: ["#ff0266", "#f8ff95"],
    road: "#2b0530"
  }
};
var SKYLINE_THEMES = THEMES3;
var CityBuilder = class {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }
  defs = [];
  layers = [];
  counter = 0;
  uid(prefix) {
    this.counter += 1;
    return `${prefix}-${this.counter}`;
  }
  addDef(snippet) {
    this.defs.push(snippet.trim());
  }
  addLayer(snippet) {
    this.layers.push(snippet.trim());
  }
  render() {
    return `
            <svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}">
                <defs>${this.defs.join(" ")}</defs>
                ${this.layers.join(" ")}
            </svg>
        `.trim();
  }
};
function generateSkylineSvg(options = {}) {
  const seed = typeof options.seed === "number" && !Number.isNaN(options.seed) ? options.seed : Date.now();
  const width = options.width ?? 5120;
  const height = options.height ?? 1440;
  const rng = new RNG(seed);
  const theme = pickTheme3(rng, options.theme ?? "random");
  const builder = new CityBuilder(width, height);
  addSky2(builder, theme);
  addAurora(builder, theme);
  if (options.stars ?? true) {
    addStarfield2(builder, theme, rng);
  }
  const layers = resolveLayerPlans(theme, options, rng);
  let buildingCount = 0;
  layers.forEach((plan) => {
    buildingCount += addBuildingLayer(builder, plan, theme, rng);
  });
  addGroundGlow(builder, theme);
  if (options.water ?? true) {
    addWaterSurface(builder, theme, rng);
  }
  if (options.traffic ?? true) {
    addTrafficFlow(builder, theme, rng);
  }
  if (options.haze ?? true) {
    addHaze(builder, theme);
  }
  return {
    svg: builder.render(),
    seed,
    theme,
    buildingCount
  };
}
function pickTheme3(rng, key) {
  if (key === "random") {
    const entries = Object.values(THEMES3);
    return entries[rng.int(0, entries.length - 1)];
  }
  return THEMES3[key];
}
function addSky2(builder, theme) {
  const gradId = builder.uid("sky");
  builder.addDef(`
        <linearGradient id="${gradId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${theme.skyGradient[0]}" />
            <stop offset="100%" stop-color="${theme.skyGradient[1]}" />
        </linearGradient>
    `);
  builder.addLayer(`<rect width="100%" height="100%" fill="url(#${gradId})" />`);
}
function addAurora(builder, theme) {
  const radId = builder.uid("aurora");
  builder.addDef(`
        <radialGradient id="${radId}" cx="70%" cy="20%" r="60%">
            <stop offset="0%" stop-color="${theme.horizonGlow}" stop-opacity="0.85" />
            <stop offset="100%" stop-color="${theme.aurora}" stop-opacity="0" />
        </radialGradient>
    `);
  builder.addLayer(`<rect width="100%" height="100%" fill="url(#${radId})" opacity="0.8" />`);
}
function addGroundGlow(builder, theme) {
  const gradId = builder.uid("ground-glow");
  builder.addDef(`
        <linearGradient id="${gradId}" x1="0%" y1="70%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${theme.horizonGlow}" stop-opacity="0.45" />
            <stop offset="100%" stop-color="${theme.horizonGlow}" stop-opacity="0" />
        </linearGradient>
    `);
  builder.addLayer(`<rect width="100%" height="100%" fill="url(#${gradId})" />`);
}
function addStarfield2(builder, theme, rng) {
  const count = Math.max(40, Math.round(builder.width * builder.height / 9e4));
  const stars = [];
  const twinkles = [];
  for (let i = 0; i < count; i += 1) {
    const cx = rng.float(0, builder.width);
    const cy = rng.float(0, builder.height * 0.45);
    const r = rng.float(0.35, 1.8);
    const opacity = rng.float(0.25, 0.9);
    stars.push(
      `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(2)}" fill="${theme.star}" opacity="${opacity.toFixed(2)}" />`
    );
  }
  const twinkleCount = Math.max(6, Math.round(count * 0.18));
  for (let i = 0; i < twinkleCount; i += 1) {
    const cx = rng.float(0, builder.width);
    const cy = rng.float(0, builder.height * 0.5);
    const length = rng.float(6, 16);
    const rotation = rng.float(0, 360);
    const opacity = rng.float(0.3, 0.8);
    const thickness = length * 0.08;
    twinkles.push(`
            <g transform="translate(${cx.toFixed(1)},${cy.toFixed(1)}) rotate(${rotation.toFixed(1)})" opacity="${opacity.toFixed(2)}">
                <rect x="${(-length / 2).toFixed(1)}" y="${(-thickness / 2).toFixed(1)}" width="${length.toFixed(1)}" height="${thickness.toFixed(1)}" fill="${theme.star}" />
                <rect x="${(-thickness / 2).toFixed(1)}" y="${(-length / 2).toFixed(1)}" width="${thickness.toFixed(1)}" height="${length.toFixed(1)}" fill="${theme.neon}" />
            </g>
        `);
  }
  builder.addLayer(`<g opacity="0.9">${stars.join(" ")}</g>`);
  builder.addLayer(`<g opacity="0.85" style="mix-blend-mode:screen;">${twinkles.join(" ")}</g>`);
}
function addHaze(builder, theme) {
  const gradId = builder.uid("haze");
  builder.addDef(`
        <linearGradient id="${gradId}" x1="0%" y1="60%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${theme.haze}" stop-opacity="0" />
            <stop offset="100%" stop-color="${theme.haze}" stop-opacity="0.8" />
        </linearGradient>
    `);
  builder.addLayer(`<rect width="100%" height="100%" fill="url(#${gradId})" opacity="0.65" />`);
}
function addWaterSurface(builder, theme, rng) {
  const waterTop = builder.height * 0.78;
  const waterHeight = builder.height - waterTop;
  const rectWidth = builder.width * 1.1;
  const gradId = builder.uid("water");
  builder.addDef(`
        <linearGradient id="${gradId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${theme.waterSurface[0]}" stop-opacity="0.85" />
            <stop offset="100%" stop-color="${theme.waterSurface[1]}" stop-opacity="0.95" />
        </linearGradient>
    `);
  builder.addLayer(
    `<rect x="${(-builder.width * 0.05).toFixed(1)}" y="${waterTop.toFixed(1)}" width="${rectWidth.toFixed(1)}" height="${waterHeight.toFixed(1)}" fill="url(#${gradId})" opacity="0.82" />`
  );
  const rippleCount = rng.int(4, 7);
  const ripples = [];
  for (let i = 0; i < rippleCount; i += 1) {
    const y = waterTop + (i + 1) / (rippleCount + 2) * waterHeight * rng.float(0.6, 0.95);
    const amplitude = builder.width * rng.float(0.01, 0.025);
    const segments = 6;
    const span = builder.width * 1.2;
    const step = span / segments;
    let x = -builder.width * 0.1;
    const parts = [`M ${x.toFixed(1)},${y.toFixed(1)}`];
    for (let seg = 0; seg < segments; seg += 1) {
      const ctrlX = x + step / 2;
      const ctrlY = y + Math.sin((seg + rng.next()) * Math.PI) * amplitude;
      const endX = x + step;
      parts.push(`Q ${ctrlX.toFixed(1)},${ctrlY.toFixed(1)} ${endX.toFixed(1)},${y.toFixed(1)}`);
      x = endX;
    }
    ripples.push(
      `<path d="${parts.join(" ")}" fill="none" stroke="${theme.waterSurface[1]}" stroke-width="${(builder.height * 35e-4).toFixed(2)}" opacity="${rng.float(0.25, 0.5).toFixed(2)}" />`
    );
  }
  builder.addLayer(`<g opacity="0.6" style="mix-blend-mode:screen;">${ripples.join(" ")}</g>`);
}
function addTrafficFlow(builder, theme, rng) {
  const roadTop = builder.height * 0.9;
  const roadHeight = builder.height * 0.08;
  const rectWidth = builder.width * 1.1;
  builder.addLayer(
    `<rect x="${(-builder.width * 0.05).toFixed(1)}" y="${roadTop.toFixed(1)}" width="${rectWidth.toFixed(1)}" height="${roadHeight.toFixed(1)}" fill="${theme.road}" opacity="0.95" />`
  );
  const blurId = builder.uid("traffic-blur");
  builder.addDef(`
        <filter id="${blurId}" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
        </filter>
    `);
  const forwardGrad = builder.uid("traffic-forward");
  const reverseGrad = builder.uid("traffic-reverse");
  builder.addDef(`
        <linearGradient id="${forwardGrad}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${theme.trafficLights[0]}" />
            <stop offset="100%" stop-color="${theme.trafficLights[1]}" />
        </linearGradient>
    `);
  builder.addDef(`
        <linearGradient id="${reverseGrad}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${theme.trafficLights[1]}" />
            <stop offset="100%" stop-color="${theme.trafficLights[0]}" />
        </linearGradient>
    `);
  const laneCount = 3;
  for (let lane = 0; lane < laneCount; lane += 1) {
    const direction = lane % 2 === 0 ? 1 : -1;
    const y = roadTop + roadHeight * (0.2 + lane * 0.28);
    const span = builder.width * 1.3;
    const segments = 6;
    const step = span / segments * direction;
    let x = direction > 0 ? -builder.width * 0.15 : builder.width * 1.15;
    const parts = [`M ${x.toFixed(1)},${y.toFixed(1)}`];
    for (let seg = 0; seg < segments; seg += 1) {
      const ctrlX = x + step / 2;
      const ctrlY = y + Math.sin((lane + seg + rng.next()) * 0.9) * builder.height * 0.01;
      const endX = x + step;
      parts.push(`Q ${ctrlX.toFixed(1)},${ctrlY.toFixed(1)} ${endX.toFixed(1)},${y.toFixed(1)}`);
      x = endX;
    }
    const stroke = builder.height * rng.float(0.01, 0.018);
    const gradient = direction > 0 ? forwardGrad : reverseGrad;
    builder.addLayer(
      `<path d="${parts.join(" ")}" fill="none" stroke="url(#${gradient})" stroke-width="${stroke.toFixed(2)}" stroke-linecap="round" filter="url(#${blurId})" opacity="0.75" />`
    );
    builder.addLayer(
      `<path d="${parts.join(" ")}" fill="none" stroke="${theme.trafficLights[direction > 0 ? 1 : 0]}" stroke-width="${(stroke * 0.45).toFixed(2)}" stroke-linecap="round" opacity="0.9" />`
    );
  }
  const dashY = roadTop + roadHeight * 0.5;
  builder.addLayer(
    `<line x1="0" y1="${dashY.toFixed(1)}" x2="${builder.width.toFixed(1)}" y2="${dashY.toFixed(1)}" stroke="${theme.waterSurface[1]}" stroke-width="${(builder.height * 4e-3).toFixed(2)}" stroke-dasharray="20 18" opacity="0.35" />`
  );
}
function resolveLayerPlans(theme, options, rng) {
  const requested = Math.max(1, Math.min(5, options.layers ?? 3));
  const windowDensity = clamp(options.windowDensity ?? 0.55, 0, 1);
  const buildingRange = options.buildingsPerLayer ?? [8, 18];
  const plans = [];
  for (let i = 0; i < requested; i += 1) {
    const depth = i / Math.max(1, requested - 1);
    const baseRatio = 0.62 + depth * 0.12 + rng.float(-0.01, 0.015);
    const heightRange = [
      Math.max(0.12, 0.28 - depth * 0.06),
      Math.max(0.18, 0.38 - depth * 0.05)
    ];
    const widthRange = [
      0.03 + depth * 0.01,
      0.09 + depth * 0.04
    ];
    const paletteIndex = Math.min(theme.buildingBases.length - 1, i % theme.buildingBases.length);
    const color = theme.buildingBases[paletteIndex];
    const rooftopDetails = (options.rooftopDetails ?? true) && depth > 0.35;
    const densityDecay = 1 - depth * 0.5;
    plans.push({
      baseRatio,
      heightRange,
      widthRange,
      color,
      depth,
      windowDensity: windowDensity * densityDecay,
      rooftopDetails
    });
  }
  if (plans.length === 0) {
    plans.push({
      baseRatio: 0.72,
      heightRange: [0.25, 0.32],
      widthRange: [0.04, 0.08],
      color: theme.buildingBases[0],
      depth: 0,
      windowDensity,
      rooftopDetails: options.rooftopDetails ?? true
    });
  }
  return plans;
}
function addBuildingLayer(builder, plan, theme, rng) {
  const baseY = builder.height * plan.baseRatio;
  const minWidth = builder.width * plan.widthRange[0];
  const maxWidth = builder.width * plan.widthRange[1];
  let x = -builder.width * 0.12;
  let count = 0;
  while (x < builder.width * 1.12) {
    const width = clamp(rng.float(minWidth, maxWidth), minWidth, maxWidth);
    const height = builder.height * rng.float(plan.heightRange[0], plan.heightRange[1]);
    const topY = baseY - height;
    const path = buildBuildingPath(x, width, baseY, topY, rng, plan.rooftopDetails);
    const opacity = 0.45 + (1 - plan.depth) * 0.4;
    builder.addLayer(`<path d="${path}" fill="${plan.color}" opacity="${opacity.toFixed(2)}" />`);
    if (plan.windowDensity > 0.05) {
      const clipId = builder.uid("clip");
      builder.addDef(`<clipPath id="${clipId}"><path d="${path}" /></clipPath>`);
      const glowId = builder.uid("grad");
      builder.addDef(`
                <linearGradient id="${glowId}" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="${theme.neon}" stop-opacity="${(0.15 + plan.depth * 0.2).toFixed(2)}" />
                    <stop offset="100%" stop-color="${plan.color}" stop-opacity="0" />
                </linearGradient>
            `);
      const windows = buildWindows(x, width, baseY, topY, plan.windowDensity, theme, rng);
      builder.addLayer(
        `<g clip-path="url(#${clipId})"><rect x="${x.toFixed(1)}" y="${topY.toFixed(1)}" width="${width.toFixed(1)}" height="${(baseY - topY).toFixed(1)}" fill="url(#${glowId})" opacity="0.8" />${windows}</g>`
      );
    }
    x += width * rng.float(0.65, 1.15);
    count += 1;
  }
  return count;
}
function buildBuildingPath(x, width, baseY, topY, rng, rooftopDetails) {
  const variant = rooftopDetails ? rng.choice(["flat", "notch", "spire", "tier"]) : "flat";
  const right = x + width;
  const points = [];
  points.push(`M ${x.toFixed(1)},${baseY.toFixed(1)}`);
  switch (variant) {
    case "notch": {
      const notchWidth = width * rng.float(0.2, 0.4);
      const notchHeight = (baseY - topY) * rng.float(0.15, 0.3);
      points.push(`L ${x.toFixed(1)},${(topY + notchHeight).toFixed(1)}`);
      points.push(`L ${(x + notchWidth).toFixed(1)},${(topY + notchHeight).toFixed(1)}`);
      points.push(`L ${(x + notchWidth).toFixed(1)},${topY.toFixed(1)}`);
      points.push(`L ${(right - notchWidth).toFixed(1)},${topY.toFixed(1)}`);
      points.push(`L ${(right - notchWidth).toFixed(1)},${(topY + notchHeight).toFixed(1)}`);
      points.push(`L ${right.toFixed(1)},${(topY + notchHeight).toFixed(1)}`);
      break;
    }
    case "spire": {
      const peakX = x + width / 2;
      points.push(`L ${x.toFixed(1)},${topY.toFixed(1)}`);
      points.push(`L ${peakX.toFixed(1)},${(topY - (baseY - topY) * 0.15).toFixed(1)}`);
      points.push(`L ${right.toFixed(1)},${topY.toFixed(1)}`);
      break;
    }
    case "tier": {
      const tierY = topY + (baseY - topY) * 0.2;
      const inset = width * 0.12;
      points.push(`L ${x.toFixed(1)},${tierY.toFixed(1)}`);
      points.push(`L ${(x + inset).toFixed(1)},${tierY.toFixed(1)}`);
      points.push(`L ${(x + inset).toFixed(1)},${topY.toFixed(1)}`);
      points.push(`L ${(right - inset).toFixed(1)},${topY.toFixed(1)}`);
      points.push(`L ${(right - inset).toFixed(1)},${tierY.toFixed(1)}`);
      points.push(`L ${right.toFixed(1)},${tierY.toFixed(1)}`);
      break;
    }
    default:
      points.push(`L ${x.toFixed(1)},${topY.toFixed(1)}`);
      points.push(`L ${right.toFixed(1)},${topY.toFixed(1)}`);
  }
  points.push(`L ${right.toFixed(1)},${baseY.toFixed(1)}`);
  points.push("Z");
  return points.join(" ");
}
function buildWindows(x, width, baseY, topY, density, theme, rng) {
  const height = baseY - topY;
  const windowWidth = clamp(width * 0.06, 6, 28);
  const windowHeight = windowWidth * rng.float(1.2, 1.45);
  const spacingX = windowWidth * 0.5;
  const spacingY = windowHeight * 0.55;
  const columns = Math.max(1, Math.floor((width - windowWidth) / (windowWidth + spacingX)));
  const rows = Math.max(1, Math.floor((height - windowHeight) / (windowHeight + spacingY)));
  const startX = x + (width - (columns * (windowWidth + spacingX) - spacingX)) / 2;
  const startY = topY + (height - (rows * (windowHeight + spacingY) - spacingY)) / 2;
  const windows = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      if (rng.next() > density) {
        continue;
      }
      const wx = startX + col * (windowWidth + spacingX);
      const wy = startY + row * (windowHeight + spacingY);
      const lit = rng.next() > 0.35;
      const color = lit ? rng.choice(theme.windowLit) : theme.windowDim;
      const opacity = lit ? rng.float(0.6, 0.95) : rng.float(0.2, 0.35);
      windows.push(
        `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="${windowWidth.toFixed(1)}" height="${windowHeight.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}" rx="${(windowWidth * 0.08).toFixed(1)}" />`
      );
    }
  }
  return windows.join(" ");
}
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// ts/lib/botanical.ts
var THEMES4 = {
  canopy: {
    name: "Forest Canopy",
    backgroundTop: "#0b2b2b",
    backgroundBottom: "#134e4a",
    glow: "#0d9488",
    canopy: "#052e16",
    leafFill: ["#166534", "#065f46", "#4ade80"],
    leafStroke: "#022c22",
    leafVein: "#bbf7d0",
    frondFill: ["#16a34a", "#22c55e"],
    vine: "#115e59",
    bloomCore: "#fef08a",
    bloomPetal: "#f9a8d4",
    dew: "#d1fae5",
    groundLayers: ["#052e16", "#064e3b", "#0f172a"],
    mist: "#c4f1f9"
  },
  greenhouse: {
    name: "Glasshouse",
    backgroundTop: "#102a43",
    backgroundBottom: "#2f855a",
    glow: "#81e6d9",
    canopy: "#22543d",
    leafFill: ["#2f855a", "#38a169", "#9ae6b4"],
    leafStroke: "#1a202c",
    leafVein: "#d9f99d",
    frondFill: ["#48bb78", "#68d391"],
    vine: "#276749",
    bloomCore: "#f6e05e",
    bloomPetal: "#fbd38d",
    dew: "#bee3f8",
    groundLayers: ["#1c4532", "#1f2933", "#0f172a"],
    mist: "#e6fffa"
  },
  moonlit: {
    name: "Moonlit Fern",
    backgroundTop: "#0f172a",
    backgroundBottom: "#1e3a8a",
    glow: "#38bdf8",
    canopy: "#0f172a",
    leafFill: ["#0ea5e9", "#2563eb", "#6ee7b7"],
    leafStroke: "#0f172a",
    leafVein: "#e0f2fe",
    frondFill: ["#22d3ee", "#c084fc"],
    vine: "#155e75",
    bloomCore: "#fcd34d",
    bloomPetal: "#f472b6",
    dew: "#bae6fd",
    groundLayers: ["#111827", "#1e293b", "#312e81"],
    mist: "#c4b5fd"
  },
  tropic: {
    name: "Tropic Bloom",
    backgroundTop: "#3a0ca3",
    backgroundBottom: "#f72585",
    glow: "#fee440",
    canopy: "#2d264b",
    leafFill: ["#06d6a0", "#1dd3b0", "#ff9f1c"],
    leafStroke: "#1b1b2f",
    leafVein: "#fff3b0",
    frondFill: ["#ffd166", "#ff9770"],
    vine: "#ff8fa3",
    bloomCore: "#fff7ae",
    bloomPetal: "#ff5d8f",
    dew: "#ffdada",
    groundLayers: ["#22184f", "#321d59", "#431c63"],
    mist: "#ffd6e0"
  }
};
var BOTANICAL_THEMES = THEMES4;
var GardenBuilder = class {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }
  defs = [];
  layers = [];
  counter = 0;
  uid(prefix) {
    this.counter += 1;
    return `${prefix}-${this.counter}`;
  }
  addDef(snippet) {
    this.defs.push(snippet.trim());
  }
  addLayer(snippet) {
    this.layers.push(snippet.trim());
  }
  render() {
    return `
            <svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}">
                <defs>${this.defs.join(" ")}</defs>
                ${this.layers.join(" ")}
            </svg>
        `.trim();
  }
};
function generateBotanicalSvg(options = {}) {
  const seed = typeof options.seed === "number" && !Number.isNaN(options.seed) ? options.seed : Date.now();
  const rng = new RNG(seed);
  const width = options.width ?? 5120;
  const height = options.height ?? 1440;
  const theme = pickTheme4(rng, options.theme ?? "random");
  const counts = resolveCounts(rng, options);
  const builder = new GardenBuilder(width, height);
  addBackground2(builder, theme);
  addGlow(builder, theme);
  addCanopyBursts(builder, theme, rng);
  addMist(builder, theme);
  addGroundLayers(builder, theme, counts.groundLayers, rng);
  addVines(builder, theme, counts.vines, rng);
  addLeaves(builder, theme, counts.leaves, rng);
  addFronds(builder, theme, counts.fronds, rng);
  addBlooms(builder, theme, counts.blooms, rng);
  addDew(builder, theme, counts.dewDrops, rng);
  if (options.veil ?? true) {
    addVeil(builder, theme);
  }
  if (options.noise ?? false) {
    addNoise2(builder);
  }
  return {
    svg: builder.render(),
    seed,
    theme,
    counts
  };
}
function pickTheme4(rng, key) {
  if (key === "random") {
    const entries = Object.values(THEMES4);
    return entries[rng.int(0, entries.length - 1)];
  }
  return THEMES4[key];
}
function resolveCounts(rng, options) {
  return {
    leaves: resolveCount2(rng, options.leaves, [82, 140]),
    fronds: resolveCount2(rng, options.fronds, [26, 42]),
    vines: resolveCount2(rng, options.vines, [5, 9]),
    blooms: resolveCount2(rng, options.blooms, [8, 14]),
    dewDrops: resolveCount2(rng, options.dewDrops, [60, 110]),
    groundLayers: Math.max(2, Math.min(6, options.groundLayers ?? rng.int(3, 5)))
  };
}
function resolveCount2(rng, value, range) {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return Math.max(0, Math.round(value));
  }
  return rng.int(range[0], range[1]);
}
function addBackground2(builder, theme) {
  const gradId = builder.uid("bg");
  builder.addDef(`
        <linearGradient id="${gradId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${theme.backgroundTop}" />
            <stop offset="100%" stop-color="${theme.backgroundBottom}" />
        </linearGradient>
    `);
  builder.addLayer(`<rect width="100%" height="100%" fill="url(#${gradId})" />`);
}
function addGlow(builder, theme) {
  const glowId = builder.uid("glow");
  builder.addDef(`
        <radialGradient id="${glowId}" cx="65%" cy="20%" r="65%">
            <stop offset="0%" stop-color="${theme.glow}" stop-opacity="0.75" />
            <stop offset="100%" stop-color="${theme.glow}" stop-opacity="0" />
        </radialGradient>
    `);
  builder.addLayer(`<rect width="100%" height="100%" fill="url(#${glowId})" opacity="0.8" />`);
}
function addCanopyBursts(builder, theme, rng) {
  const clusters = rng.int(7, 11);
  for (let i = 0; i < clusters; i += 1) {
    const cx = rng.float(0.05, 0.95) * builder.width;
    const cy = builder.height * rng.float(-0.1, 0.35);
    const radius = Math.min(builder.width, builder.height) * rng.float(0.18, 0.32);
    const gradId = builder.uid("canopy-burst");
    const colors = shuffle2([...theme.leafFill], rng);
    builder.addDef(`
            <radialGradient id="${gradId}">
                <stop offset="0%" stop-color="${colors[0]}" stop-opacity="0.8" />
                <stop offset="65%" stop-color="${colors[1]}" stop-opacity="0.4" />
                <stop offset="100%" stop-color="${theme.canopy}" stop-opacity="0" />
            </radialGradient>
        `);
    const path = buildCanopyBurstPath(cx, cy, radius, rng);
    builder.addLayer(
      `<path d="${path}" fill="url(#${gradId})" opacity="0.55" style="mix-blend-mode:screen;" />`
    );
  }
}
function addMist(builder, theme) {
  const mistId = builder.uid("mist");
  builder.addDef(`
        <linearGradient id="${mistId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${theme.mist}" stop-opacity="0.35" />
            <stop offset="60%" stop-color="${theme.mist}" stop-opacity="0.05" />
            <stop offset="100%" stop-color="${theme.mist}" stop-opacity="0" />
        </linearGradient>
    `);
  builder.addLayer(`<rect width="100%" height="100%" fill="url(#${mistId})" opacity="0.5" />`);
}
function addGroundLayers(builder, theme, layers, rng) {
  const colors = theme.groundLayers;
  for (let i = 0; i < layers; i += 1) {
    const color = colors[i % colors.length];
    const baseY = builder.height * (0.55 + i * 0.07 + rng.float(-0.015, 0.015));
    const amplitude = builder.height * (0.03 + i * 5e-3);
    const segments = 6;
    const step = builder.width / segments;
    const parts = [`M ${(-builder.width * 0.1).toFixed(1)},${builder.height.toFixed(1)}`];
    let x = -builder.width * 0.1;
    for (let seg = 0; seg <= segments; seg += 1) {
      const targetX = x + step;
      const y = baseY + Math.sin((seg + rng.next()) * 1.1) * amplitude;
      const ctrlX = x + step / 2;
      const ctrlY = (y + baseY) / 2 + rng.float(-amplitude, amplitude);
      parts.push(`Q ${ctrlX.toFixed(1)},${ctrlY.toFixed(1)} ${targetX.toFixed(1)},${y.toFixed(1)}`);
      x = targetX;
    }
    parts.push(`L ${(builder.width * 1.1).toFixed(1)},${builder.height.toFixed(1)}`);
    parts.push(`Z`);
    const opacity = 0.45 + i * 0.08;
    builder.addLayer(`<path d="${parts.join(" ")}" fill="${color}" opacity="${Math.min(opacity, 0.95).toFixed(2)}" />`);
  }
}
function addLeaves(builder, theme, count, rng) {
  for (let i = 0; i < count; i += 1) {
    const baseX = rng.float(-0.05, 1.05) * builder.width;
    const baseY = builder.height * rng.float(0.28, 0.95);
    const length = builder.height * rng.float(0.12, 0.3);
    const width = length * rng.float(0.28, 0.55);
    const tilt = rng.float(-75, 75);
    const curl = rng.float(-0.6, 0.7);
    const gradId = builder.uid("leaf");
    const colors = shuffle2([...theme.leafFill], rng);
    builder.addDef(`
            <linearGradient id="${gradId}" gradientTransform="rotate(${rng.float(-40, 40).toFixed(1)})">
                <stop offset="0%" stop-color="${colors[0]}" stop-opacity="0.95" />
                <stop offset="65%" stop-color="${colors[1]}" stop-opacity="0.8" />
                <stop offset="100%" stop-color="${colors[2]}" stop-opacity="0.5" />
            </linearGradient>
        `);
    const path = buildLeafPath(length, width, curl);
    const transformParts = [`translate(${baseX.toFixed(1)},${baseY.toFixed(1)})`, `rotate(${tilt.toFixed(1)})`];
    if (rng.next() > 0.35) {
      transformParts.push("scale(1,-1)");
    }
    const transform = `transform="${transformParts.join(" ")}"`;
    builder.addLayer(
      `<path d="${path}" ${transform} fill="url(#${gradId})" stroke="${theme.leafStroke}" stroke-width="${(length * 0.015).toFixed(2)}" stroke-linejoin="round" opacity="0.85" />`
    );
    builder.addLayer(
      `<path d="M 0,0 L 0,${(-length).toFixed(1)}" ${transform} fill="none" stroke="${theme.leafVein}" stroke-width="${(length * 0.01).toFixed(2)}" stroke-opacity="0.5" />`
    );
  }
}
function addFronds(builder, theme, count, rng) {
  for (let i = 0; i < count; i += 1) {
    const baseX = rng.float(0, 1) * builder.width;
    const baseY = builder.height * rng.float(0.38, 0.9);
    const length = builder.height * rng.float(0.16, 0.34);
    const segments = rng.int(6, 9);
    const spacing = length / segments;
    const tilt = rng.float(-55, 55);
    const stroke = rng.choice(theme.frondFill);
    const commands = [`M 0,0`];
    for (let seg = 0; seg < segments; seg += 1) {
      const wave = rng.float(0.25, 0.55) * spacing;
      commands.push(`Q ${(spacing * 0.35).toFixed(1)},${(-(seg + 1) * spacing - wave).toFixed(1)} 0,${(-(seg + 1) * spacing).toFixed(1)}`);
    }
    const transformParts = [`translate(${baseX.toFixed(1)},${baseY.toFixed(1)})`, `rotate(${tilt.toFixed(1)})`];
    if (rng.next() > 0.45) {
      transformParts.push("scale(1,-1)");
    }
    const transform = `transform="${transformParts.join(" ")}"`;
    builder.addLayer(
      `<path d="${commands.join(" ")}" ${transform} fill="none" stroke="${stroke}" stroke-width="${(length * 0.01).toFixed(2)}" stroke-linecap="round" opacity="0.9" />`
    );
    for (let seg = 1; seg < segments; seg += 1) {
      const y = -seg * spacing;
      const span = length * rng.float(0.08, 0.2);
      const angle = rng.float(25, 60) * (seg % 2 === 0 ? 1 : -1);
      const rise = Math.tan(angle * Math.PI / 180) * span * -0.45;
      const leaflet = `M 0,${y.toFixed(1)} l ${span.toFixed(1)},${rise.toFixed(1)}`;
      builder.addLayer(
        `<path d="${leaflet}" ${transform} fill="none" stroke="${stroke}" stroke-width="${(length * 9e-3).toFixed(2)}" stroke-linecap="round" opacity="0.65" />`
      );
    }
  }
}
function addVines(builder, theme, count, rng) {
  for (let i = 0; i < count; i += 1) {
    const startY = builder.height * rng.float(0.2, 0.5);
    const segments = rng.int(5, 7);
    let path = `M ${(-builder.width * 0.1).toFixed(1)},${startY.toFixed(1)}`;
    let x = -builder.width * 0.1;
    const span = builder.width * 1.2;
    const step = span / segments;
    for (let seg = 0; seg < segments; seg += 1) {
      const ctrlX = x + step / 2;
      const ctrlY = startY + Math.sin((seg + rng.next()) * 0.9) * builder.height * 0.18;
      const endX = x + step;
      const endY = startY + Math.sin((seg + rng.next()) * 1.1) * builder.height * 0.22;
      path += ` Q ${ctrlX.toFixed(1)},${ctrlY.toFixed(1)} ${endX.toFixed(1)},${endY.toFixed(1)}`;
      x = endX;
    }
    builder.addLayer(
      `<path d="${path}" fill="none" stroke="${theme.vine}" stroke-width="${(builder.height * 9e-3).toFixed(2)}" stroke-linecap="round" opacity="0.45" />`
    );
  }
}
function addBlooms(builder, theme, count, rng) {
  for (let i = 0; i < count; i += 1) {
    const cx = rng.float(0.05, 0.95) * builder.width;
    const cy = builder.height * rng.float(0.4, 0.9);
    const radius = builder.height * rng.float(0.015, 0.03);
    const gradId = builder.uid("bloom");
    builder.addDef(`
            <radialGradient id="${gradId}">
                <stop offset="0%" stop-color="${theme.bloomCore}" stop-opacity="0.95" />
                <stop offset="100%" stop-color="${theme.bloomPetal}" stop-opacity="0.2" />
            </radialGradient>
        `);
    builder.addLayer(
      `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${radius.toFixed(1)}" fill="url(#${gradId})" opacity="0.85" />`
    );
    const petals = rng.int(4, 6);
    const petalPath = [];
    for (let p = 0; p < petals; p += 1) {
      const angle = p / petals * Math.PI * 2;
      const px = cx + Math.cos(angle) * radius * rng.float(1, 1.4);
      const py = cy + Math.sin(angle) * radius * rng.float(1, 1.4);
      petalPath.push(`M ${cx.toFixed(1)},${cy.toFixed(1)} L ${px.toFixed(1)},${py.toFixed(1)}`);
    }
    builder.addLayer(
      `<path d="${petalPath.join(" ")}" stroke="${theme.bloomPetal}" stroke-width="${(radius * 0.3).toFixed(2)}" stroke-linecap="round" opacity="0.35" />`
    );
  }
}
function addDew(builder, theme, count, rng) {
  for (let i = 0; i < count; i += 1) {
    const cx = rng.float(0, 1) * builder.width;
    const cy = builder.height * rng.float(0.35, 0.95);
    const radius = builder.height * rng.float(4e-3, 9e-3);
    const highlight = radius * rng.float(0.3, 0.5);
    builder.addLayer(
      `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${radius.toFixed(2)}" fill="${theme.dew}" opacity="0.5" />`
    );
    builder.addLayer(
      `<circle cx="${(cx - highlight / 2).toFixed(1)}" cy="${(cy - highlight / 2).toFixed(1)}" r="${(highlight / 3).toFixed(2)}" fill="#ffffff" opacity="0.6" />`
    );
  }
}
function addVeil(builder, theme) {
  const veilId = builder.uid("veil");
  builder.addDef(`
        <linearGradient id="${veilId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${theme.canopy}" stop-opacity="0" />
            <stop offset="60%" stop-color="${theme.canopy}" stop-opacity="0.15" />
            <stop offset="100%" stop-color="${theme.canopy}" stop-opacity="0.45" />
        </linearGradient>
    `);
  builder.addLayer(`<rect width="100%" height="100%" fill="url(#${veilId})" />`);
}
function addNoise2(builder) {
  const filterId = builder.uid("grain");
  builder.addDef(`
        <filter id="${filterId}" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="noise" />
            <feColorMatrix type="saturate" values="0" in="noise" />
            <feComponentTransfer>
                <feFuncA type="linear" slope="0.08" />
            </feComponentTransfer>
        </filter>
    `);
  builder.addLayer(`<rect width="100%" height="100%" filter="url(#${filterId})" opacity="0.1" />`);
}
function buildCanopyBurstPath(cx, cy, radius, rng) {
  const steps = rng.int(8, 12);
  const points = [];
  for (let i = 0; i < steps; i += 1) {
    const angle = i / steps * Math.PI * 2;
    const radial = radius * rng.float(0.6, 1.15);
    const x = cx + Math.cos(angle) * radial;
    const y = cy + Math.sin(angle) * radial * rng.float(0.6, 1.25);
    points.push([x, y]);
  }
  if (!points.length) {
    return "";
  }
  const pathParts = [`M ${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`];
  for (let i = 1; i < points.length; i += 1) {
    const curr = points[i];
    const prev = points[i - 1];
    const midX = (prev[0] + curr[0]) / 2;
    const midY = (prev[1] + curr[1]) / 2;
    pathParts.push(`Q ${curr[0].toFixed(1)},${curr[1].toFixed(1)} ${midX.toFixed(1)},${midY.toFixed(1)}`);
  }
  const last = points[points.length - 1];
  const first = points[0];
  const closeMidX = (last[0] + first[0]) / 2;
  const closeMidY = (last[1] + first[1]) / 2;
  pathParts.push(`Q ${first[0].toFixed(1)},${first[1].toFixed(1)} ${closeMidX.toFixed(1)},${closeMidY.toFixed(1)}`);
  pathParts.push("Z");
  return pathParts.join(" ");
}
function buildLeafPath(length, width, curl) {
  const halfWidth = width / 2;
  const tipY = -length;
  const ctrlOffset = halfWidth * (1 + curl * 0.35);
  const lowerCtrl = length * 0.25;
  const upperCtrl = length * 0.65;
  return [
    "M 0,0",
    `C ${halfWidth.toFixed(1)},${(-lowerCtrl).toFixed(1)} ${ctrlOffset.toFixed(1)},${(-upperCtrl).toFixed(1)} 0,${tipY.toFixed(1)}`,
    `C ${(-ctrlOffset).toFixed(1)},${(-upperCtrl).toFixed(1)} ${(-halfWidth).toFixed(1)},${(-lowerCtrl).toFixed(1)} 0,0`,
    "Z"
  ].join(" ");
}
function shuffle2(values, rng) {
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

// web/app.ts
var backgroundFields = [
  { key: "width", label: "Width", type: "number", defaultValue: BACKGROUND_DEFAULTS.width, min: 320 },
  { key: "height", label: "Height", type: "number", defaultValue: BACKGROUND_DEFAULTS.height, min: 200 },
  { key: "seed", label: "Seed", type: "number", placeholder: "auto" },
  { key: "blobCount", label: "Blob Count", type: "number", placeholder: "random", min: 0 },
  { key: "ribbonCount", label: "Ribbon Count", type: "number", placeholder: "random", min: 0 },
  { key: "orbCount", label: "Orb Count", type: "number", placeholder: "random", min: 0 },
  { key: "lightCount", label: "Light Count", type: "number", placeholder: "random", min: 0 },
  { key: "lineCount", label: "Line Cluster Count", type: "number", placeholder: "random", min: 0 },
  { key: "triangleCount", label: "Triangle Count", type: "number", placeholder: "random", min: 0 },
  { key: "waveCount", label: "Wave Count", type: "number", placeholder: "random", min: 0 }
];
var polygalaxyFields = [
  { key: "width", label: "Width", type: "number", defaultValue: 5120, min: 320 },
  { key: "height", label: "Height", type: "number", defaultValue: 1440, min: 200 },
  { key: "seed", label: "Seed", type: "number", placeholder: "auto" },
  {
    key: "theme",
    label: "Theme",
    type: "select",
    options: [
      { label: "Random", value: "random" },
      ...Object.entries(POLYGALAXY_THEMES).map(([key, theme]) => ({ label: theme.name, value: key }))
    ],
    defaultValue: "random"
  },
  {
    key: "style",
    label: "Style",
    type: "select",
    options: Object.keys(POLYGALAXY_STYLES).map((key) => ({ label: key, value: key })),
    defaultValue: "aura"
  },
  { key: "stars", label: "Stars", type: "number", placeholder: "style default", min: 0 },
  { key: "facets", label: "Facets", type: "number", placeholder: "style default", min: 0 },
  { key: "rings", label: "Rings", type: "number", placeholder: "style default", min: 0 },
  { key: "threads", label: "Threads", type: "number", placeholder: "style default", min: 0 },
  { key: "glows", label: "Glows", type: "number", placeholder: "style default", min: 0 },
  { key: "constellations", label: "Constellations", type: "number", placeholder: "style default", min: 0 },
  { key: "systems", label: "Solar Systems", type: "number", placeholder: "style default", min: 0 },
  { key: "arms", label: "Spiral Arms", type: "number", placeholder: "style default", min: 0 },
  { key: "planets", label: "Planets", type: "number", placeholder: "style default", min: 0 },
  { key: "scanlines", label: "Scanlines", type: "checkbox", defaultValue: false }
];
var terrainFields = [
  { key: "width", label: "Width", type: "number", defaultValue: 5120, min: 320 },
  { key: "height", label: "Height", type: "number", defaultValue: 1440, min: 200 },
  { key: "seed", label: "Seed", type: "number", placeholder: "auto" },
  {
    key: "theme",
    label: "Theme",
    type: "select",
    options: [
      { label: "Random", value: "random" },
      ...Object.entries(TERRAIN_THEMES).map(([key, theme]) => ({ label: theme.name, value: key }))
    ],
    defaultValue: "random"
  },
  { key: "mountains", label: "Mountain Layers", type: "number", defaultValue: 3, min: 1 },
  { key: "trees", label: "Trees", type: "number", defaultValue: 40, min: 0 },
  { key: "clouds", label: "Clouds", type: "number", defaultValue: 12, min: 0 },
  { key: "fog", label: "Fog", type: "checkbox", defaultValue: false },
  { key: "noise", label: "Noise", type: "checkbox", defaultValue: false },
  { key: "moon", label: "Moon", type: "checkbox", defaultValue: false }
];
var skylineFields = [
  { key: "width", label: "Width", type: "number", defaultValue: 5120, min: 320 },
  { key: "height", label: "Height", type: "number", defaultValue: 1440, min: 200 },
  { key: "seed", label: "Seed", type: "number", placeholder: "auto" },
  {
    key: "theme",
    label: "Theme",
    type: "select",
    options: [
      { label: "Random", value: "random" },
      ...Object.entries(SKYLINE_THEMES).map(([key, theme]) => ({ label: theme.name, value: key }))
    ],
    defaultValue: "random"
  },
  { key: "layers", label: "Layers", type: "number", defaultValue: 3, min: 1, max: 5 },
  { key: "buildingMin", label: "Buildings Min", type: "number", defaultValue: 8, min: 1 },
  { key: "buildingMax", label: "Buildings Max", type: "number", defaultValue: 18, min: 1 },
  { key: "windowDensity", label: "Window Density", type: "number", defaultValue: 0.55, min: 0, max: 1, step: 0.05 },
  { key: "stars", label: "Stars", type: "checkbox", defaultValue: true },
  { key: "haze", label: "Haze", type: "checkbox", defaultValue: true },
  { key: "rooftops", label: "Rooftop Details", type: "checkbox", defaultValue: true },
  { key: "water", label: "Water", type: "checkbox", defaultValue: true },
  { key: "traffic", label: "Traffic", type: "checkbox", defaultValue: true }
];
var botanicalFields = [
  { key: "width", label: "Width", type: "number", defaultValue: 5120, min: 320 },
  { key: "height", label: "Height", type: "number", defaultValue: 1440, min: 200 },
  { key: "seed", label: "Seed", type: "number", placeholder: "auto" },
  {
    key: "theme",
    label: "Theme",
    type: "select",
    options: [
      { label: "Random", value: "random" },
      ...Object.entries(BOTANICAL_THEMES).map(([key, theme]) => ({ label: theme.name, value: key }))
    ],
    defaultValue: "random"
  },
  { key: "leaves", label: "Leaves", type: "number", placeholder: "auto", min: 0 },
  { key: "fronds", label: "Fronds", type: "number", placeholder: "auto", min: 0 },
  { key: "vines", label: "Vines", type: "number", placeholder: "auto", min: 0 },
  { key: "blooms", label: "Blooms", type: "number", placeholder: "auto", min: 0 },
  { key: "dew", label: "Dew Drops", type: "number", placeholder: "auto", min: 0 },
  { key: "groundLayers", label: "Ground Layers", type: "number", placeholder: "auto", min: 1 },
  { key: "veil", label: "Veil", type: "checkbox", defaultValue: true },
  { key: "noise", label: "Noise", type: "checkbox", defaultValue: false }
];
var GENERATORS = {
  background: {
    label: "Gradient Background",
    fields: backgroundFields,
    run(values) {
      const options = buildBackgroundOptions(values);
      const { svg, seed, palette } = generateBackgroundSvg(options);
      return { svg, meta: `Seed ${seed} \u2022 Palette ${palette.gradient.join(" / ")}` };
    }
  },
  polygalaxy: {
    label: "Polygalaxy",
    fields: polygalaxyFields,
    run(values) {
      const options = buildPolygalaxyOptions(values);
      const result = generatePolygalaxySvg(options);
      return { svg: result.svg, meta: `${result.theme.name} \u2022 Seed ${result.seed}` };
    }
  },
  terrain: {
    label: "Terrain Poem",
    fields: terrainFields,
    run(values) {
      const options = buildTerrainOptions(values);
      const result = generateTerrainSvg(options);
      return { svg: result.svg, meta: `${result.theme.name} \u2022 Seed ${result.seed}` };
    }
  },
  skyline: {
    label: "Urban Skyline",
    fields: skylineFields,
    run(values) {
      const options = buildSkylineOptions(values);
      const result = generateSkylineSvg(options);
      return {
        svg: result.svg,
        meta: `${result.theme.name} \u2022 Seed ${result.seed} \u2022 ${result.buildingCount} buildings`
      };
    }
  },
  botanical: {
    label: "Botanical Garden",
    fields: botanicalFields,
    run(values) {
      const options = buildBotanicalOptions(values);
      const result = generateBotanicalSvg(options);
      return {
        svg: result.svg,
        meta: `${result.theme.name} \u2022 Seed ${result.seed} \u2022 ${result.counts.leaves} leaves`
      };
    }
  }
};
var form = document.getElementById("generator-form");
var generatorSelect = document.getElementById("generator-select");
var fieldsContainer = document.getElementById("dynamic-fields");
var preview = document.getElementById("preview");
var meta = document.getElementById("meta");
var output = document.getElementById("svg-output");
function init() {
  Object.entries(GENERATORS).forEach(([key, config]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = config.label;
    generatorSelect.append(option);
  });
  generatorSelect.addEventListener("change", () => renderFields(generatorSelect.value));
  renderFields(generatorSelect.value);
  form.addEventListener("submit", handleSubmit);
}
function renderFields(generatorKey) {
  const config = GENERATORS[generatorKey];
  fieldsContainer.innerHTML = "";
  config.fields.forEach((field) => {
    const label = document.createElement("label");
    label.htmlFor = field.key;
    label.textContent = field.label;
    let input;
    if (field.type === "select") {
      const select = document.createElement("select");
      select.name = field.key;
      select.id = field.key;
      field.options?.forEach((opt) => {
        const option = document.createElement("option");
        option.value = opt.value;
        option.textContent = opt.label;
        select.append(option);
      });
      if (field.defaultValue) {
        select.value = String(field.defaultValue);
      }
      input = select;
    } else {
      const inputEl = document.createElement("input");
      inputEl.type = field.type === "checkbox" ? "checkbox" : field.type;
      inputEl.name = field.key;
      inputEl.id = field.key;
      if (field.type === "number" && typeof field.defaultValue === "number") {
        inputEl.value = String(field.defaultValue);
      }
      if (field.type === "text" && typeof field.defaultValue === "string") {
        inputEl.value = field.defaultValue;
      }
      if (field.type === "checkbox" && typeof field.defaultValue === "boolean") {
        inputEl.checked = field.defaultValue;
      }
      if (field.placeholder) {
        inputEl.placeholder = field.placeholder;
      }
      if (field.min !== void 0) {
        inputEl.min = String(field.min);
      }
      if (field.max !== void 0) {
        inputEl.max = String(field.max);
      }
      if (field.step !== void 0) {
        inputEl.step = String(field.step);
      }
      input = inputEl;
    }
    label.append(input);
    fieldsContainer.append(label);
  });
}
function handleSubmit(event) {
  event.preventDefault();
  const generatorKey = generatorSelect.value;
  const config = GENERATORS[generatorKey];
  const values = collectValues(config.fields);
  try {
    const result = config.run(values);
    preview.innerHTML = result.svg;
    meta.textContent = result.meta;
    output.value = result.svg;
  } catch (error) {
    meta.textContent = "Generation failed. Check console for details.";
    console.error(error);
  }
}
function collectValues(fields) {
  const values = {};
  fields.forEach((field) => {
    const element = form.elements.namedItem(field.key);
    if (!element) {
      return;
    }
    if (field.type === "checkbox") {
      values[field.key] = element.checked;
      return;
    }
    const value = element.value.trim();
    if (value === "") {
      return;
    }
    if (field.type === "number") {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        values[field.key] = parsed;
      }
      return;
    }
    values[field.key] = value;
  });
  return values;
}
function buildBackgroundOptions(values) {
  return {
    width: values.width ?? BACKGROUND_DEFAULTS.width,
    height: values.height ?? BACKGROUND_DEFAULTS.height,
    seed: values.seed,
    blobCount: values.blobCount,
    ribbonCount: values.ribbonCount,
    orbCount: values.orbCount,
    lightCount: values.lightCount,
    lineCount: values.lineCount,
    triangleCount: values.triangleCount,
    waveCount: values.waveCount
  };
}
function buildPolygalaxyOptions(values) {
  return {
    width: values.width ?? 5120,
    height: values.height ?? 1440,
    seed: values.seed,
    theme: values.theme,
    style: values.style,
    stars: values.stars,
    facets: values.facets,
    rings: values.rings,
    threads: values.threads,
    glows: values.glows,
    constellations: values.constellations,
    systems: values.systems,
    arms: values.arms,
    planets: values.planets,
    scanlines: values.scanlines ?? false
  };
}
function buildTerrainOptions(values) {
  return {
    width: values.width ?? 5120,
    height: values.height ?? 1440,
    seed: values.seed,
    theme: values.theme,
    mountains: values.mountains,
    trees: values.trees,
    clouds: values.clouds,
    fog: values.fog ?? false,
    noise: values.noise ?? false,
    moon: values.moon ?? false
  };
}
function buildSkylineOptions(values) {
  const minValue = typeof values.buildingMin === "number" ? values.buildingMin : 8;
  const maxValue = typeof values.buildingMax === "number" ? values.buildingMax : 18;
  const minBuildings = Math.min(minValue, maxValue);
  const maxBuildings = Math.max(minValue, maxValue);
  const rawDensity = typeof values.windowDensity === "number" ? values.windowDensity : 0.55;
  const windowDensity = Math.max(0, Math.min(1, rawDensity));
  return {
    width: values.width ?? 5120,
    height: values.height ?? 1440,
    seed: values.seed,
    theme: values.theme,
    layers: values.layers ?? 3,
    buildingsPerLayer: [minBuildings, maxBuildings],
    windowDensity,
    stars: values.stars,
    haze: values.haze,
    rooftopDetails: values.rooftops,
    water: values.water,
    traffic: values.traffic
  };
}
function buildBotanicalOptions(values) {
  return {
    width: values.width ?? 5120,
    height: values.height ?? 1440,
    seed: values.seed,
    theme: values.theme,
    leaves: values.leaves,
    fronds: values.fronds,
    vines: values.vines,
    blooms: values.blooms,
    dewDrops: values.dew,
    groundLayers: values.groundLayers,
    veil: values.veil,
    noise: values.noise
  };
}
init();
//# sourceMappingURL=app.js.map
