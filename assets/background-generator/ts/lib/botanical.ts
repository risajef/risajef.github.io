import { RNG } from "./rng";

export interface BotanicalTheme {
    name: string;
    backgroundTop: string;
    backgroundBottom: string;
    glow: string;
    canopy: string;
    leafFill: [string, string, string];
    leafStroke: string;
    leafVein: string;
    frondFill: [string, string];
    vine: string;
    bloomCore: string;
    bloomPetal: string;
    dew: string;
    groundLayers: [string, string, string];
    mist: string;
}

export interface BotanicalOptions {
    width?: number;
    height?: number;
    seed?: number;
    theme?: keyof typeof THEMES | "random";
    leaves?: number;
    fronds?: number;
    vines?: number;
    blooms?: number;
    dewDrops?: number;
    groundLayers?: number;
    veil?: boolean;
    noise?: boolean;
}

export interface BotanicalCounts {
    leaves: number;
    fronds: number;
    vines: number;
    blooms: number;
    dewDrops: number;
    groundLayers: number;
}

export interface BotanicalResult {
    svg: string;
    seed: number;
    theme: BotanicalTheme;
    counts: BotanicalCounts;
}

const THEMES: Record<string, BotanicalTheme> = {
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
        mist: "#c4f1f9",
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
        mist: "#e6fffa",
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
        mist: "#c4b5fd",
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
        mist: "#ffd6e0",
    },
};

export const BOTANICAL_THEMES = THEMES;

class GardenBuilder {
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

export function generateBotanicalSvg(options: BotanicalOptions = {}): BotanicalResult {
    const seed = typeof options.seed === "number" && !Number.isNaN(options.seed) ? options.seed : Date.now();
    const rng = new RNG(seed);
    const width = options.width ?? 5120;
    const height = options.height ?? 1440;
    const theme = pickTheme(rng, options.theme ?? "random");
    const counts = resolveCounts(rng, options);
    const builder = new GardenBuilder(width, height);

    addBackground(builder, theme);
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
        addNoise(builder);
    }

    return {
        svg: builder.render(),
        seed,
        theme,
        counts,
    };
}

function pickTheme(rng: RNG, key: keyof typeof THEMES | "random"): BotanicalTheme {
    if (key === "random") {
        const entries = Object.values(THEMES);
        return entries[rng.int(0, entries.length - 1)];
    }
    return THEMES[key];
}

function resolveCounts(rng: RNG, options: BotanicalOptions): BotanicalCounts {
    return {
        leaves: resolveCount(rng, options.leaves, [82, 140]),
        fronds: resolveCount(rng, options.fronds, [26, 42]),
        vines: resolveCount(rng, options.vines, [5, 9]),
        blooms: resolveCount(rng, options.blooms, [8, 14]),
        dewDrops: resolveCount(rng, options.dewDrops, [60, 110]),
        groundLayers: Math.max(2, Math.min(6, options.groundLayers ?? rng.int(3, 5))),
    };
}

function resolveCount(rng: RNG, value: number | undefined, range: [number, number]): number {
    if (typeof value === "number" && !Number.isNaN(value)) {
        return Math.max(0, Math.round(value));
    }
    return rng.int(range[0], range[1]);
}

function addBackground(builder: GardenBuilder, theme: BotanicalTheme): void {
    const gradId = builder.uid("bg");
    builder.addDef(`
        <linearGradient id="${gradId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${theme.backgroundTop}" />
            <stop offset="100%" stop-color="${theme.backgroundBottom}" />
        </linearGradient>
    `);
    builder.addLayer(`<rect width="100%" height="100%" fill="url(#${gradId})" />`);
}

function addGlow(builder: GardenBuilder, theme: BotanicalTheme): void {
    const glowId = builder.uid("glow");
    builder.addDef(`
        <radialGradient id="${glowId}" cx="65%" cy="20%" r="65%">
            <stop offset="0%" stop-color="${theme.glow}" stop-opacity="0.75" />
            <stop offset="100%" stop-color="${theme.glow}" stop-opacity="0" />
        </radialGradient>
    `);
    builder.addLayer(`<rect width="100%" height="100%" fill="url(#${glowId})" opacity="0.8" />`);
}

function addCanopyBursts(builder: GardenBuilder, theme: BotanicalTheme, rng: RNG): void {
    const clusters = rng.int(7, 11);
    for (let i = 0; i < clusters; i += 1) {
        const cx = rng.float(0.05, 0.95) * builder.width;
        const cy = builder.height * rng.float(-0.1, 0.35);
        const radius = Math.min(builder.width, builder.height) * rng.float(0.18, 0.32);
        const gradId = builder.uid("canopy-burst");
        const colors = shuffle([...theme.leafFill], rng);
        builder.addDef(`
            <radialGradient id="${gradId}">
                <stop offset="0%" stop-color="${colors[0]}" stop-opacity="0.8" />
                <stop offset="65%" stop-color="${colors[1]}" stop-opacity="0.4" />
                <stop offset="100%" stop-color="${theme.canopy}" stop-opacity="0" />
            </radialGradient>
        `);
        const path = buildCanopyBurstPath(cx, cy, radius, rng);
        builder.addLayer(
            `<path d="${path}" fill="url(#${gradId})" opacity="0.55" style="mix-blend-mode:screen;" />`,
        );
    }
}

function addMist(builder: GardenBuilder, theme: BotanicalTheme): void {
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

function addGroundLayers(
    builder: GardenBuilder,
    theme: BotanicalTheme,
    layers: number,
    rng: RNG,
): void {
    const colors = theme.groundLayers;
    for (let i = 0; i < layers; i += 1) {
        const color = colors[i % colors.length];
        const baseY = builder.height * (0.55 + i * 0.07 + rng.float(-0.015, 0.015));
        const amplitude = builder.height * (0.03 + i * 0.005);
        const segments = 6;
        const step = builder.width / segments;
        const parts: string[] = [`M ${(-builder.width * 0.1).toFixed(1)},${builder.height.toFixed(1)}`];
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

function addLeaves(builder: GardenBuilder, theme: BotanicalTheme, count: number, rng: RNG): void {
    for (let i = 0; i < count; i += 1) {
        const baseX = rng.float(-0.05, 1.05) * builder.width;
        const baseY = builder.height * rng.float(0.28, 0.95);
        const length = builder.height * rng.float(0.12, 0.3);
        const width = length * rng.float(0.28, 0.55);
        const tilt = rng.float(-75, 75);
        const curl = rng.float(-0.6, 0.7);
        const gradId = builder.uid("leaf");
        const colors = shuffle([...theme.leafFill], rng);
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
            `<path d="${path}" ${transform} fill="url(#${gradId})" stroke="${theme.leafStroke}" stroke-width="${(length * 0.015).toFixed(2)}" stroke-linejoin="round" opacity="0.85" />`,
        );
        builder.addLayer(
            `<path d="M 0,0 L 0,${(-length).toFixed(1)}" ${transform} fill="none" stroke="${theme.leafVein}" stroke-width="${(length * 0.01).toFixed(2)}" stroke-opacity="0.5" />`,
        );
    }
}

function addFronds(builder: GardenBuilder, theme: BotanicalTheme, count: number, rng: RNG): void {
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
            `<path d="${commands.join(" ")}" ${transform} fill="none" stroke="${stroke}" stroke-width="${(length * 0.01).toFixed(2)}" stroke-linecap="round" opacity="0.9" />`,
        );
        for (let seg = 1; seg < segments; seg += 1) {
            const y = -seg * spacing;
            const span = length * rng.float(0.08, 0.2);
            const angle = rng.float(25, 60) * (seg % 2 === 0 ? 1 : -1);
            const rise = Math.tan((angle * Math.PI) / 180) * span * -0.45;
            const leaflet = `M 0,${y.toFixed(1)} l ${span.toFixed(1)},${rise.toFixed(1)}`;
            builder.addLayer(
                `<path d="${leaflet}" ${transform} fill="none" stroke="${stroke}" stroke-width="${(length * 0.009).toFixed(2)}" stroke-linecap="round" opacity="0.65" />`,
            );
        }
    }
}

function addVines(builder: GardenBuilder, theme: BotanicalTheme, count: number, rng: RNG): void {
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
            `<path d="${path}" fill="none" stroke="${theme.vine}" stroke-width="${(builder.height * 0.009).toFixed(2)}" stroke-linecap="round" opacity="0.45" />`,
        );
    }
}

function addBlooms(builder: GardenBuilder, theme: BotanicalTheme, count: number, rng: RNG): void {
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
            `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${radius.toFixed(1)}" fill="url(#${gradId})" opacity="0.85" />`,
        );
        const petals = rng.int(4, 6);
        const petalPath: string[] = [];
        for (let p = 0; p < petals; p += 1) {
            const angle = (p / petals) * Math.PI * 2;
            const px = cx + Math.cos(angle) * radius * rng.float(1, 1.4);
            const py = cy + Math.sin(angle) * radius * rng.float(1, 1.4);
            petalPath.push(`M ${cx.toFixed(1)},${cy.toFixed(1)} L ${px.toFixed(1)},${py.toFixed(1)}`);
        }
        builder.addLayer(
            `<path d="${petalPath.join(" ")}" stroke="${theme.bloomPetal}" stroke-width="${(radius * 0.3).toFixed(2)}" stroke-linecap="round" opacity="0.35" />`,
        );
    }
}

function addDew(builder: GardenBuilder, theme: BotanicalTheme, count: number, rng: RNG): void {
    for (let i = 0; i < count; i += 1) {
        const cx = rng.float(0, 1) * builder.width;
        const cy = builder.height * rng.float(0.35, 0.95);
        const radius = builder.height * rng.float(0.004, 0.009);
        const highlight = radius * rng.float(0.3, 0.5);
        builder.addLayer(
            `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${radius.toFixed(2)}" fill="${theme.dew}" opacity="0.5" />`,
        );
        builder.addLayer(
            `<circle cx="${(cx - highlight / 2).toFixed(1)}" cy="${(cy - highlight / 2).toFixed(1)}" r="${(highlight / 3).toFixed(2)}" fill="#ffffff" opacity="0.6" />`,
        );
    }
}

function addVeil(builder: GardenBuilder, theme: BotanicalTheme): void {
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

function addNoise(builder: GardenBuilder): void {
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

function buildCanopyBurstPath(cx: number, cy: number, radius: number, rng: RNG): string {
    const steps = rng.int(8, 12);
    const points: Array<[number, number]> = [];
    for (let i = 0; i < steps; i += 1) {
        const angle = (i / steps) * Math.PI * 2;
        const radial = radius * rng.float(0.6, 1.15);
        const x = cx + Math.cos(angle) * radial;
        const y = cy + Math.sin(angle) * radial * rng.float(0.6, 1.25);
        points.push([x, y]);
    }
    if (!points.length) {
        return "";
    }
    const pathParts: string[] = [`M ${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`];
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

function buildLeafPath(length: number, width: number, curl: number): string {
    const halfWidth = width / 2;
    const tipY = -length;
    const ctrlOffset = halfWidth * (1 + curl * 0.35);
    const lowerCtrl = length * 0.25;
    const upperCtrl = length * 0.65;
    return [
        "M 0,0",
        `C ${halfWidth.toFixed(1)},${(-lowerCtrl).toFixed(1)} ${ctrlOffset.toFixed(1)},${(-upperCtrl).toFixed(1)} 0,${tipY.toFixed(1)}`,
        `C ${(-ctrlOffset).toFixed(1)},${(-upperCtrl).toFixed(1)} ${(-halfWidth).toFixed(1)},${(-lowerCtrl).toFixed(1)} 0,0`,
        "Z",
    ].join(" ");
}

function shuffle<T>(values: T[], rng: RNG): T[] {
    for (let i = values.length - 1; i > 0; i -= 1) {
        const j = rng.int(0, i);
        [values[i], values[j]] = [values[j], values[i]];
    }
    return values;
}
