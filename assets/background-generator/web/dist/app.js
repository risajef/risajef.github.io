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
  const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
  return `#${clamp(r).toString(16).padStart(2, "0")}${clamp(g).toString(16).padStart(2, "0")}${clamp(b).toString(16).padStart(2, "0")}`;
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
    stars: [380, 520]
  },
  loom: {
    facets: [4, 6],
    rings: [6, 9],
    threads: [6, 9],
    glows: [2, 3],
    constellations: [3, 4],
    stars: [420, 620]
  },
  rift: {
    facets: [3, 5],
    rings: [2, 4],
    threads: [2, 3],
    glows: [5, 7],
    constellations: [1, 2],
    stars: [260, 360]
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
  addArcRings(builder, theme, counts.rings, rng);
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
  for (const key of ["stars", "facets", "rings", "threads", "glows", "constellations"]) {
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
init();
//# sourceMappingURL=app.js.map
