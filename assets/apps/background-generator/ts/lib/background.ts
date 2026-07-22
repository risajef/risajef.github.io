import { RNG } from "./rng";

const CURATED_PALETTES: Array<[string, string, string]> = [
    ["#0f2027", "#203a43", "#2c5364"],
    ["#11052c", "#5b0eeb", "#f4b942"],
    ["#0d1b2a", "#1b263b", "#e0e1dd"],
    ["#0f0a3c", "#f95738", "#f4d35e"],
    ["#1f1300", "#8f2d56", "#ffcb77"],
    ["#102542", "#f87060", "#ffd166"],
    ["#012a4a", "#2a6f97", "#468faf"],
];

const BLUR_LEVELS = [6, 12, 24];

export interface BackgroundOptions {
    width?: number;
    height?: number;
    seed?: number;
    blobCount?: number | null;
    ribbonCount?: number | null;
    orbCount?: number | null;
    lightCount?: number | null;
    lineCount?: number | null;
    triangleCount?: number | null;
    waveCount?: number | null;
}

export interface BackgroundResult {
    svg: string;
    seed: number;
    palette: PalettePlan;
}

interface PalettePlan {
    gradient: [string, string, string];
    blobColors: [string, string, string];
    accent: string;
    accentAlt: string;
    highlight: string;
    stroke: string;
}

interface ResolvedBackgroundOptions {
    width: number;
    height: number;
    seed: number;
    blobCount: number | null | undefined;
    ribbonCount: number | null | undefined;
    orbCount: number | null | undefined;
    lightCount: number | null | undefined;
    lineCount: number | null | undefined;
    triangleCount: number | null | undefined;
    waveCount: number | null | undefined;
}

export const BACKGROUND_DEFAULTS: Omit<ResolvedBackgroundOptions, "seed"> = {
    width: 5120,
    height: 1440,
    blobCount: null,
    ribbonCount: null,
    orbCount: null,
    lightCount: null,
    lineCount: null,
    triangleCount: null,
    waveCount: null,
};

const DEFAULT_BACKGROUND_OPTIONS: ResolvedBackgroundOptions = {
    ...BACKGROUND_DEFAULTS,
    seed: Date.now(),
};

export function generateBackgroundSvg(partial: BackgroundOptions = {}): BackgroundResult {
    const seed = typeof partial.seed === "number" && !Number.isNaN(partial.seed) ? partial.seed : Date.now();
    const resolved: ResolvedBackgroundOptions = {
        ...DEFAULT_BACKGROUND_OPTIONS,
        ...partial,
        width: partial.width ?? DEFAULT_BACKGROUND_OPTIONS.width,
        height: partial.height ?? DEFAULT_BACKGROUND_OPTIONS.height,
        seed,
    };
    const rng = new RNG(seed);
    const palette = generatePalettePlan(rng);
    const svg = createSvg(rng, resolved, palette);
    return { svg, seed, palette };
}

function hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return [r, g, b];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
    const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
    return `#${clamp(r).toString(16).padStart(2, "0")}${clamp(g).toString(16).padStart(2, "0")}${clamp(b)
        .toString(16)
        .padStart(2, "0")}`;
}

function blendHex(color: string, target: [number, number, number], factor: number): string {
    const [r, g, b] = hexToRgb(color);
    return rgbToHex([
        r + (target[0] - r) * factor,
        g + (target[1] - g) * factor,
        b + (target[2] - b) * factor,
    ]);
}

function tint(color: string, factor: number): string {
    return blendHex(color, [255, 255, 255], factor);
}

function shade(color: string, factor: number): string {
    return blendHex(color, [0, 0, 0], factor);
}

function jitterColor(rng: RNG, color: string, spread = 20): string {
    const [r, g, b] = hexToRgb(color);
    return rgbToHex([
        r + rng.float(-spread, spread),
        g + rng.float(-spread, spread),
        b + rng.float(-spread, spread),
    ]);
}

function relativeLuminance(color: string): number {
    const [r, g, b] = hexToRgb(color).map((value) => value / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function generatePalettePlan(rng: RNG): PalettePlan {
    const base = CURATED_PALETTES[rng.int(0, CURATED_PALETTES.length - 1)].map((color) =>
        jitterColor(rng, color),
    ) as [string, string, string];
    const sorted = [...base].sort((a, b) => relativeLuminance(a) - relativeLuminance(b));
    const [darkest, mid, lightest] = sorted;
    return {
        gradient: base,
        blobColors: base.map((color) => shade(color, rng.float(0.05, 0.18))) as [string, string, string],
        accent: tint(mid, 0.25),
        accentAlt: tint(lightest, 0.4),
        highlight: tint(lightest, 0.55),
        stroke: shade(darkest, 0.35),
    };
}

function buildLinearGradient(id: string, colors: Iterable<string>): string {
    const stops: string[] = [];
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

function buildRadialGradient(id: string, inner: string, outer: string): string {
    return `
        <radialGradient id="${id}" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stop-color="${inner}" stop-opacity="0.9" />
            <stop offset="70%" stop-color="${outer}" stop-opacity="0.15" />
            <stop offset="100%" stop-color="${outer}" stop-opacity="0" />
        </radialGradient>
    `.trim();
}

function randomBlob(rng: RNG, width: number, height: number, palette: PalettePlan): string {
    const cx = rng.float(0.2, 0.8) * width;
    const cy = rng.float(0.25, 0.75) * height;
    const radius = Math.min(width, height) * rng.float(0.12, 0.28);
    const points: Array<[number, number]> = [];
    for (let angle = 0; angle < 360; angle += 30) {
        const rad = (angle * Math.PI) / 180;
        const offset = radius * rng.float(0.8, 1.35);
        points.push([cx + Math.cos(rad) * offset, cy + Math.sin(rad) * offset]);
    }
    const segments: string[] = [`M ${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`];
    for (let i = 0; i < points.length; i += 1) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        const ctrlAngle = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) + rng.float(-0.6, 0.6);
        const ctrlRadius = radius * rng.float(0.4, 0.9);
        const ctrl1: [number, number] = [
            p1[0] + Math.cos(ctrlAngle) * ctrlRadius,
            p1[1] + Math.sin(ctrlAngle) * ctrlRadius,
        ];
        const ctrl2: [number, number] = [
            p2[0] - Math.cos(ctrlAngle) * ctrlRadius,
            p2[1] - Math.sin(ctrlAngle) * ctrlRadius,
        ];
        segments.push(
            `C ${ctrl1[0].toFixed(1)},${ctrl1[1].toFixed(1)} ${ctrl2[0].toFixed(1)},${ctrl2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`,
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

function randomLightCone(rng: RNG, width: number, height: number, palette: PalettePlan): [string, string] {
    const gradientId = `rad-${rng.int(0, 10000)}`;
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

function randomLineCluster(rng: RNG, width: number, height: number, palette: PalettePlan): string {
    const count = rng.int(6, 12);
    const rotation = rng.float(-18, 18);
    const startX = -0.2 * width;
    const endX = 1.2 * width;
    const baseY = rng.float(0.2, 0.8) * height;
    const spacing = height * rng.float(0.01, 0.03);
    const lines = Array.from({ length: count }, (_, idx) => {
        const yOffset = baseY + (idx - count / 2) * spacing;
        const opacity = rng.float(0.05, 0.18);
        return `<line x1="${startX.toFixed(1)}" y1="${yOffset.toFixed(1)}" x2="${endX.toFixed(1)}" y2="${yOffset.toFixed(1)}" stroke="${palette.stroke}" stroke-width="${(height * 0.0025).toFixed(2)}" opacity="${opacity.toFixed(2)}" />`;
    });
    return `
        <g transform="rotate(${rotation.toFixed(2)} ${width / 2}, ${height / 2})">
            ${lines.join(" ")}
        </g>
    `.trim();
}

function randomRibbon(rng: RNG, width: number, height: number, palette: PalettePlan): string {
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
            `C ${ctrl1[0].toFixed(1)},${ctrl1[1].toFixed(1)} ${ctrl2[0].toFixed(1)},${ctrl2[1].toFixed(1)} ${endX.toFixed(1)},${endY.toFixed(1)}`,
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

function randomOrbs(rng: RNG, width: number, height: number, palette: PalettePlan, count: number): string {
    return Array.from({ length: count }, () => {
        const radius = Math.min(width, height) * rng.float(0.04, 0.12);
        const cx = rng.float(0.1, 0.9) * width;
        const cy = rng.float(0.1, 0.9) * height;
        const stroke = rng.choice([palette.accentAlt, palette.highlight]);
        return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${radius.toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="${(radius * 0.2).toFixed(1)}" opacity="0.4" />`;
    }).join("\n");
}

function randomGradientTriangles(
    rng: RNG,
    width: number,
    height: number,
    palette: PalettePlan,
    count: number,
): [string[], string] {
    const defs: string[] = [];
    const shapes: string[] = [];
    for (let i = 0; i < count; i += 1) {
        const gradId = `tri-grad-${rng.int(0, 10000)}`;
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

function randomSurfaceWave(
    rng: RNG,
    width: number,
    height: number,
    palette: PalettePlan,
): [string, string] {
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
            `C ${ctrl1[0].toFixed(1)},${ctrl1[1].toFixed(1)} ${ctrl2[0].toFixed(1)},${ctrl2[1].toFixed(1)} ${endX.toFixed(1)},${target.toFixed(1)}`,
        );
        currentY = target;
    }
    parts.push(`L ${width.toFixed(1)},${height.toFixed(1)}`);
    parts.push(`L 0,${height.toFixed(1)} Z`);
    const gradId = `wave-grad-${rng.int(0, 10000)}`;
    const defs = buildLinearGradient(gradId, [palette.accentAlt, palette.gradient[2]]);
    const shape = `
        <path d="${parts.join(" ")}" fill="url(#${gradId})" opacity="0.35" style="mix-blend-mode:screen;" />
    `.trim();
    return [defs, shape];
}

function getNoiseOverlay(rng: RNG, cache: { value: [string, string] | null }): [string, string] {
    if (!cache.value) {
        const filterId = `grainFilter-${rng.int(0, 10000)}`;
        const symbolId = `grainSymbol-${rng.int(0, 10000)}`;
        const defs = `
            <filter id="${filterId}" x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${rng.int(0, 10000)}" result="noise" />
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

function resolveCount(rng: RNG, value: number | null | undefined, fallback: [number, number]): number {
    if (typeof value === "number" && !Number.isNaN(value)) {
        return Math.max(0, value);
    }
    const [min, max] = fallback;
    return rng.int(min, max);
}

function createSvg(rng: RNG, options: ResolvedBackgroundOptions, palette: PalettePlan): string {
    const { width, height } = options;
    const gradientId = `grad-${rng.int(0, 10000)}`;
    const defs: string[] = [buildLinearGradient(gradientId, palette.gradient)];

    BLUR_LEVELS.forEach((blur) => {
        defs.push(
            `
            <filter id="blur${blur}" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="${blur}" />
            </filter>
        `.trim(),
        );
    });

    const layers: string[] = [];

    const ribbonCount = resolveCount(rng, options.ribbonCount, [1, 2]);
    if (ribbonCount) {
        layers.push(Array.from({ length: ribbonCount }, () => randomRibbon(rng, width, height, palette)).join("\n"));
    }

    const waveCount = resolveCount(rng, options.waveCount, [1, 2]);
    if (waveCount) {
        const waveLayers: string[] = [];
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
            Array.from({ length: lineCount }, () => randomLineCluster(rng, width, height, palette)).join("\n"),
        );
    }

    const blobCount = resolveCount(rng, options.blobCount, [2, 4]);
    if (blobCount) {
        layers.push(Array.from({ length: blobCount }, () => randomBlob(rng, width, height, palette)).join("\n"));
    }

    const lightCount = resolveCount(rng, options.lightCount, [1, 2]);
    if (lightCount) {
        const lights: string[] = [];
        for (let i = 0; i < lightCount; i += 1) {
            const [lightDef, lightShape] = randomLightCone(rng, width, height, palette);
            defs.push(lightDef);
            lights.push(lightShape);
        }
        layers.push(lights.join("\n"));
    }

    const noiseCache = { value: null as [string, string] | null };
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
