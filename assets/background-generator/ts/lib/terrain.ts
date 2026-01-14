import { RNG } from "./rng";

export interface BiomeTheme {
    name: string;
    skyTop: string;
    skyBottom: string;
    sun: string;
    sunGlow: string;
    mountainPalette: [string, string, string];
    treePalette: [string, string];
    riverMain: string;
    riverHighlight: string;
    cloud: string;
    fog: string;
}

export interface TerrainOptions {
    width?: number;
    height?: number;
    seed?: number;
    theme?: keyof typeof THEMES | "random";
    mountains?: number;
    trees?: number;
    clouds?: number;
    fog?: boolean;
    noise?: boolean;
    moon?: boolean;
}

export interface TerrainResult {
    svg: string;
    seed: number;
    theme: BiomeTheme;
}

const THEMES: Record<string, BiomeTheme> = {
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
        fog: "#f4d8c8",
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
        fog: "#d9eff1",
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
        fog: "#b287c3",
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
        fog: "#7cb09f",
    },
};

export const TERRAIN_THEMES = THEMES;

class SceneBuilder {
    private defs: string[] = [];
    private layers: string[] = [];
    private counter = 0;

    constructor(public readonly width: number, public readonly height: number) {}

    uid(prefix: string): string {
        this.counter += 1;
        return `${prefix}-${this.counter}`;
    }

    addDef(snippet: string): void {
        this.defs.push(snippet.trim());
    }

    addLayer(snippet: string): void {
        this.layers.push(snippet.trim());
    }

    render(): string {
        return `
            <svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}">
                <defs>${this.defs.join(" ")}</defs>
                ${this.layers.join(" ")}
            </svg>
        `.trim();
    }
}

export function generateTerrainSvg(options: TerrainOptions = {}): TerrainResult {
    const seed = typeof options.seed === "number" && !Number.isNaN(options.seed) ? options.seed : Date.now();
    const rng = new RNG(seed);
    const width = options.width ?? 5120;
    const height = options.height ?? 1440;
    const theme = pickTheme(rng, options.theme ?? "random");
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
        theme,
    };
}

function pickTheme(rng: RNG, key: keyof typeof THEMES | "random"): BiomeTheme {
    if (key === "random") {
        const entries = Object.values(THEMES);
        return entries[rng.int(0, entries.length - 1)];
    }
    return THEMES[key];
}

function addSky(builder: SceneBuilder, theme: BiomeTheme, moon: boolean): void {
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
        `<circle cx="${(builder.width * 0.78).toFixed(1)}" cy="${(builder.height * 0.22).toFixed(1)}" r="${(builder.height * 0.12).toFixed(1)}" fill="${orbColor}" opacity="0.85" />`,
    );
}

function mountainPath(
    rng: RNG,
    width: number,
    height: number,
    baseY: number,
    roughness: number,
    peakScale: number,
): string {
    const points: string[] = [];
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

function addMountains(builder: SceneBuilder, theme: BiomeTheme, layers: number, rng: RNG): void {
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

function addRiver(builder: SceneBuilder, theme: BiomeTheme, rng: RNG): void {
    const parts: string[] = [`M ${(builder.width * 0.05).toFixed(1)},${(builder.height * 0.8).toFixed(1)}`];
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
        `<path d="${parts.join(" ")}" fill="none" stroke="${theme.riverHighlight}" stroke-width="${(builder.height * 0.03).toFixed(1)}" stroke-opacity="0.35" />`,
    );
}

function addTrees(builder: SceneBuilder, theme: BiomeTheme, count: number, rng: RNG): void {
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
            `<rect x="${(baseX - width * 0.08).toFixed(1)}" y="${(baseY - height * 0.1).toFixed(1)}" width="${(width * 0.16).toFixed(1)}" height="${(height * 0.35).toFixed(1)}" fill="${theme.treePalette[0]}" opacity="0.6" />`,
        );
    }
}

function addClouds(builder: SceneBuilder, theme: BiomeTheme, count: number, rng: RNG): void {
    for (let i = 0; i < count; i += 1) {
        const cx = rng.float(0.05, 0.95) * builder.width;
        const cy = rng.float(0.05, 0.35) * builder.height;
        const rx = builder.width * rng.float(0.04, 0.12);
        const ry = builder.height * rng.float(0.03, 0.08);
        builder.addLayer(
            `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${theme.cloud}" opacity="0.4" />`,
        );
    }
}

function addFog(builder: SceneBuilder, theme: BiomeTheme): void {
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

function addNoise(builder: SceneBuilder): void {
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
