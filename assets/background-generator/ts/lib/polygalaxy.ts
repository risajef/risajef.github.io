import { RNG } from "./rng";

export interface Theme {
    name: string;
    background: [string, string, string];
    halo: [string, string];
    facets: [string, string, string];
    glows: [string, string];
    thread: string;
    star: string;
    grid: string;
    accent: string;
}

export interface StylePreset {
    facets: [number, number];
    rings: [number, number];
    threads: [number, number];
    glows: [number, number];
    constellations: [number, number];
    stars: [number, number];
}

export interface PolygalaxyOptions {
    width?: number;
    height?: number;
    seed?: number;
    theme?: keyof typeof THEMES | "random";
    style?: keyof typeof STYLE_PRESETS;
    stars?: number | null;
    facets?: number | null;
    rings?: number | null;
    threads?: number | null;
    glows?: number | null;
    constellations?: number | null;
    scanlines?: boolean;
}

export interface PolygalaxyResult {
    svg: string;
    seed: number;
    theme: Theme;
    counts: Record<string, number>;
}

const THEMES: Record<string, Theme> = {
    nocturne: {
        name: "Nocturne",
        background: ["#050912", "#0c1d3c", "#46237a"],
        halo: ["#ff7edb", "#1c0446"],
        facets: ["#6f00ff", "#ff00ff", "#00d0ff"],
        glows: ["#ffaa00", "#ff4ecd"],
        thread: "#93fff8",
        star: "#f3f5ff",
        grid: "#1f2b55",
        accent: "#00d1ff",
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
        accent: "#ff6f91",
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
        accent: "#ffd166",
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
        accent: "#ff66c4",
    },
};

const STYLE_PRESETS: Record<string, StylePreset> = {
    aura: {
        facets: [6, 9],
        rings: [4, 6],
        threads: [3, 5],
        glows: [4, 6],
        constellations: [2, 3],
        stars: [380, 520],
    },
    loom: {
        facets: [4, 6],
        rings: [6, 9],
        threads: [6, 9],
        glows: [2, 3],
        constellations: [3, 4],
        stars: [420, 620],
    },
    rift: {
        facets: [3, 5],
        rings: [2, 4],
        threads: [2, 3],
        glows: [5, 7],
        constellations: [1, 2],
        stars: [260, 360],
    },
};

export const POLYGALAXY_THEMES = THEMES;
export const POLYGALAXY_STYLES = STYLE_PRESETS;

class SvgBuilder {
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

export function generatePolygalaxySvg(options: PolygalaxyOptions = {}): PolygalaxyResult {
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
        counts,
    };
}

function pickTheme(rng: RNG, key: keyof typeof THEMES | "random"): Theme {
    if (key === "random") {
        const entries = Object.values(THEMES);
        return entries[rng.int(0, entries.length - 1)];
    }
    return THEMES[key];
}

function resolveStyle(
    rng: RNG,
    style: keyof typeof STYLE_PRESETS,
    overrides: PolygalaxyOptions,
): Record<string, number> {
    const preset = STYLE_PRESETS[style];
    const resolved: Record<string, number> = {};
    for (const key of Object.keys(preset) as Array<keyof StylePreset>) {
        const range = preset[key];
        resolved[key] = rng.int(range[0], range[1]);
    }
    for (const key of ["stars", "facets", "rings", "threads", "glows", "constellations"] as const) {
        const override = overrides[key];
        if (typeof override === "number" && !Number.isNaN(override)) {
            resolved[key] = Math.max(0, override);
        }
    }
    return resolved;
}

function addBackground(builder: SvgBuilder, theme: Theme): void {
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
        `<rect width="100%" height="100%" fill="url(#${radialId})" opacity="0.75" />`,
    );
}

function addFacets(builder: SvgBuilder, theme: Theme, count: number, rng: RNG): void {
    for (let i = 0; i < count; i += 1) {
        const sides = rng.int(3, 7);
        const angle = rng.float(0, Math.PI * 2);
        const radius = Math.min(builder.width, builder.height) * rng.float(0.08, 0.22);
        const cx = rng.float(0.05, 0.95) * builder.width;
        const cy = rng.float(0.1, 0.9) * builder.height;
        const points: string[] = [];
        for (let idx = 0; idx < sides; idx += 1) {
            const theta = angle + (idx / sides) * Math.PI * 2;
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
            `<polygon points="${points.join(" ")}" fill="url(#${gradId})" filter="url(#${filterId})" opacity="0.85" />`,
        );
    }
}

function addArcRings(builder: SvgBuilder, theme: Theme, count: number, rng: RNG): void {
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
            `<path d="M ${x1.toFixed(1)},${y1.toFixed(1)} A ${rx.toFixed(1)},${ry.toFixed(1)} 0 ${largeFlag} ${sweepFlag} ${x2.toFixed(1)},${y2.toFixed(1)}" stroke="${theme.accent}" stroke-width="${strokeWidth.toFixed(1)}" fill="none" stroke-opacity="${opacity.toFixed(2)}" stroke-linecap="round" />`,
        );
    }
}

function addSignalThreads(builder: SvgBuilder, theme: Theme, count: number, rng: RNG): void {
    for (let i = 0; i < count; i += 1) {
        const segments = rng.int(4, 6);
        const y = rng.float(0.1, 0.9) * builder.height;
        const parts: string[] = [`M ${(-0.1 * builder.width).toFixed(1)},${y.toFixed(1)}`];
        for (let seg = 0; seg < segments; seg += 1) {
            const ctrlX = builder.width * ((seg + rng.float(0.1, 0.9)) / segments);
            const ctrlY = y + rng.float(-0.18, 0.18) * builder.height;
            const endX = builder.width * ((seg + 1) / segments);
            const endY = y + rng.float(-0.12, 0.12) * builder.height;
            parts.push(`Q ${ctrlX.toFixed(1)},${ctrlY.toFixed(1)} ${endX.toFixed(1)},${endY.toFixed(1)}`);
        }
        const thickness = rng.float(6, 16);
        builder.addLayer(
            `<path d="${parts.join(" ")}" fill="none" stroke="${theme.thread}" stroke-width="${thickness.toFixed(1)}" stroke-opacity="0.55" stroke-linecap="round" />`,
        );
    }
}

function addGlowPortals(builder: SvgBuilder, theme: Theme, count: number, rng: RNG): void {
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
            `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${radius.toFixed(1)}" fill="url(#${gradId})" opacity="0.85" />`,
        );
    }
}

function addStarfield(builder: SvgBuilder, theme: Theme, count: number, rng: RNG): void {
    const stars: string[] = [];
    for (let i = 0; i < count; i += 1) {
        const r = rng.float(0.4, 2.4);
        const cx = rng.float(0, builder.width);
        const cy = rng.float(0, builder.height);
        const opacity = rng.float(0.35, 0.95);
        stars.push(
            `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(2)}" fill="${theme.star}" opacity="${opacity.toFixed(2)}" />`,
        );
    }
    builder.addLayer(`<g opacity="0.9">${stars.join(" ")}</g>`);
}

function addConstellations(builder: SvgBuilder, theme: Theme, count: number, rng: RNG): void {
    for (let i = 0; i < count; i += 1) {
        const pointCount = rng.int(4, 6);
        const points: Array<[number, number]> = [];
        for (let p = 0; p < pointCount; p += 1) {
            points.push([
                rng.float(0.05, 0.95) * builder.width,
                rng.float(0.05, 0.95) * builder.height,
            ]);
        }
        const pathParts = [`M ${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`];
        for (const [px, py] of points.slice(1)) {
            pathParts.push(`L ${px.toFixed(1)},${py.toFixed(1)}`);
        }
        builder.addLayer(
            `<path d="${pathParts.join(" ")}" fill="none" stroke="${theme.star}" stroke-width="2.2" stroke-opacity="0.5" stroke-dasharray="6 8" />`,
        );
        for (const [px, py] of points) {
            builder.addLayer(
                `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3.4" fill="${theme.accent}" opacity="0.7" />`,
            );
        }
    }
}

function addScanlines(builder: SvgBuilder, theme: Theme): void {
    const patternId = builder.uid("scan");
    builder.addDef(`
        <pattern id="${patternId}" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="1" fill="${theme.grid}" />
        </pattern>
    `);
    builder.addLayer(`<rect width="100%" height="100%" fill="url(#${patternId})" opacity="0.08" />`);
}

function shuffle<T>(values: T[], rng: RNG): T[] {
    for (let i = values.length - 1; i > 0; i -= 1) {
        const j = rng.int(0, i);
        [values[i], values[j]] = [values[j], values[i]];
    }
    return values;
}
