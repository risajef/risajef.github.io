import { RNG } from "./rng";

export interface SkylineTheme {
    name: string;
    skyGradient: [string, string];
    horizonGlow: string;
    aurora: string;
    buildingBases: [string, string, string];
    windowLit: [string, string];
    windowDim: string;
    neon: string;
    star: string;
    haze: string;
    waterSurface: [string, string];
    trafficLights: [string, string];
    road: string;
}

export interface SkylineOptions {
    width?: number;
    height?: number;
    seed?: number;
    theme?: keyof typeof THEMES | "random";
    layers?: number;
    buildingsPerLayer?: [number, number];
    windowDensity?: number;
    stars?: boolean;
    haze?: boolean;
    rooftopDetails?: boolean;
    water?: boolean;
    traffic?: boolean;
}

export interface SkylineResult {
    svg: string;
    seed: number;
    theme: SkylineTheme;
    buildingCount: number;
}

const THEMES: Record<string, SkylineTheme> = {
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
        road: "#050713",
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
        road: "#02030b",
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
        road: "#2b0530",
    },
};

export const SKYLINE_THEMES = THEMES;

class CityBuilder {
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

interface LayerPlan {
    baseRatio: number;
    heightRange: [number, number];
    widthRange: [number, number];
    color: string;
    depth: number;
    windowDensity: number;
    rooftopDetails: boolean;
}

export function generateSkylineSvg(options: SkylineOptions = {}): SkylineResult {
    const seed = typeof options.seed === "number" && !Number.isNaN(options.seed) ? options.seed : Date.now();
    const width = options.width ?? 5120;
    const height = options.height ?? 1440;
    const rng = new RNG(seed);
    const theme = pickTheme(rng, options.theme ?? "random");
    const builder = new CityBuilder(width, height);

    addSky(builder, theme);
    addAurora(builder, theme);
    if (options.stars ?? true) {
        addStarfield(builder, theme, rng);
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
        buildingCount,
    };
}

function pickTheme(rng: RNG, key: keyof typeof THEMES | "random"): SkylineTheme {
    if (key === "random") {
        const entries = Object.values(THEMES);
        return entries[rng.int(0, entries.length - 1)];
    }
    return THEMES[key];
}

function addSky(builder: CityBuilder, theme: SkylineTheme): void {
    const gradId = builder.uid("sky");
    builder.addDef(`
        <linearGradient id="${gradId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${theme.skyGradient[0]}" />
            <stop offset="100%" stop-color="${theme.skyGradient[1]}" />
        </linearGradient>
    `);
    builder.addLayer(`<rect width="100%" height="100%" fill="url(#${gradId})" />`);
}

function addAurora(builder: CityBuilder, theme: SkylineTheme): void {
    const radId = builder.uid("aurora");
    builder.addDef(`
        <radialGradient id="${radId}" cx="70%" cy="20%" r="60%">
            <stop offset="0%" stop-color="${theme.horizonGlow}" stop-opacity="0.85" />
            <stop offset="100%" stop-color="${theme.aurora}" stop-opacity="0" />
        </radialGradient>
    `);
    builder.addLayer(`<rect width="100%" height="100%" fill="url(#${radId})" opacity="0.8" />`);
}

function addGroundGlow(builder: CityBuilder, theme: SkylineTheme): void {
    const gradId = builder.uid("ground-glow");
    builder.addDef(`
        <linearGradient id="${gradId}" x1="0%" y1="70%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${theme.horizonGlow}" stop-opacity="0.45" />
            <stop offset="100%" stop-color="${theme.horizonGlow}" stop-opacity="0" />
        </linearGradient>
    `);
    builder.addLayer(`<rect width="100%" height="100%" fill="url(#${gradId})" />`);
}

function addStarfield(builder: CityBuilder, theme: SkylineTheme, rng: RNG): void {
    const count = Math.max(40, Math.round((builder.width * builder.height) / 90000));
    const stars: string[] = [];
    const twinkles: string[] = [];
    for (let i = 0; i < count; i += 1) {
        const cx = rng.float(0, builder.width);
        const cy = rng.float(0, builder.height * 0.45);
        const r = rng.float(0.35, 1.8);
        const opacity = rng.float(0.25, 0.9);
        stars.push(
            `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(2)}" fill="${theme.star}" opacity="${opacity.toFixed(2)}" />`,
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

function addHaze(builder: CityBuilder, theme: SkylineTheme): void {
    const gradId = builder.uid("haze");
    builder.addDef(`
        <linearGradient id="${gradId}" x1="0%" y1="60%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${theme.haze}" stop-opacity="0" />
            <stop offset="100%" stop-color="${theme.haze}" stop-opacity="0.8" />
        </linearGradient>
    `);
    builder.addLayer(`<rect width="100%" height="100%" fill="url(#${gradId})" opacity="0.65" />`);
}

function addWaterSurface(builder: CityBuilder, theme: SkylineTheme, rng: RNG): void {
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
        `<rect x="${(-builder.width * 0.05).toFixed(1)}" y="${waterTop.toFixed(1)}" width="${rectWidth.toFixed(1)}" height="${waterHeight.toFixed(1)}" fill="url(#${gradId})" opacity="0.82" />`,
    );

    const rippleCount = rng.int(4, 7);
    const ripples: string[] = [];
    for (let i = 0; i < rippleCount; i += 1) {
        const y = waterTop + ((i + 1) / (rippleCount + 2)) * waterHeight * rng.float(0.6, 0.95);
        const amplitude = builder.width * rng.float(0.01, 0.025);
        const segments = 6;
        const span = builder.width * 1.2;
        const step = span / segments;
        let x = -builder.width * 0.1;
        const parts: string[] = [`M ${x.toFixed(1)},${y.toFixed(1)}`];
        for (let seg = 0; seg < segments; seg += 1) {
            const ctrlX = x + step / 2;
            const ctrlY = y + Math.sin((seg + rng.next()) * Math.PI) * amplitude;
            const endX = x + step;
            parts.push(`Q ${ctrlX.toFixed(1)},${ctrlY.toFixed(1)} ${endX.toFixed(1)},${y.toFixed(1)}`);
            x = endX;
        }
        ripples.push(
            `<path d="${parts.join(" ")}" fill="none" stroke="${theme.waterSurface[1]}" stroke-width="${(builder.height * 0.0035).toFixed(2)}" opacity="${rng.float(0.25, 0.5).toFixed(2)}" />`,
        );
    }
    builder.addLayer(`<g opacity="0.6" style="mix-blend-mode:screen;">${ripples.join(" ")}</g>`);
}

function addTrafficFlow(builder: CityBuilder, theme: SkylineTheme, rng: RNG): void {
    const roadTop = builder.height * 0.9;
    const roadHeight = builder.height * 0.08;
    const rectWidth = builder.width * 1.1;
    builder.addLayer(
        `<rect x="${(-builder.width * 0.05).toFixed(1)}" y="${roadTop.toFixed(1)}" width="${rectWidth.toFixed(1)}" height="${roadHeight.toFixed(1)}" fill="${theme.road}" opacity="0.95" />`,
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
        const step = (span / segments) * direction;
        let x = direction > 0 ? -builder.width * 0.15 : builder.width * 1.15;
        const parts: string[] = [`M ${x.toFixed(1)},${y.toFixed(1)}`];
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
            `<path d="${parts.join(" ")}" fill="none" stroke="url(#${gradient})" stroke-width="${stroke.toFixed(2)}" stroke-linecap="round" filter="url(#${blurId})" opacity="0.75" />`,
        );
        builder.addLayer(
            `<path d="${parts.join(" ")}" fill="none" stroke="${theme.trafficLights[direction > 0 ? 1 : 0]}" stroke-width="${(stroke * 0.45).toFixed(2)}" stroke-linecap="round" opacity="0.9" />`,
        );
    }

    const dashY = roadTop + roadHeight * 0.5;
    builder.addLayer(
        `<line x1="0" y1="${dashY.toFixed(1)}" x2="${builder.width.toFixed(1)}" y2="${dashY.toFixed(1)}" stroke="${theme.waterSurface[1]}" stroke-width="${(builder.height * 0.004).toFixed(2)}" stroke-dasharray="20 18" opacity="0.35" />`,
    );
}

function resolveLayerPlans(
    theme: SkylineTheme,
    options: SkylineOptions,
    rng: RNG,
): LayerPlan[] {
    const requested = Math.max(1, Math.min(5, options.layers ?? 3));
    const windowDensity = clamp(options.windowDensity ?? 0.55, 0, 1);
    const buildingRange: [number, number] = options.buildingsPerLayer ?? [8, 18];
    const plans: LayerPlan[] = [];
    for (let i = 0; i < requested; i += 1) {
        const depth = i / Math.max(1, requested - 1);
        const baseRatio = 0.62 + depth * 0.12 + rng.float(-0.01, 0.015);
        const heightRange: [number, number] = [
            Math.max(0.12, 0.28 - depth * 0.06),
            Math.max(0.18, 0.38 - depth * 0.05),
        ];
        const widthRange: [number, number] = [
            0.03 + depth * 0.01,
            0.09 + depth * 0.04,
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
            rooftopDetails,
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
            rooftopDetails: options.rooftopDetails ?? true,
        });
    }
    return plans;
}

function addBuildingLayer(
    builder: CityBuilder,
    plan: LayerPlan,
    theme: SkylineTheme,
    rng: RNG,
): number {
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
                `<g clip-path="url(#${clipId})">` +
                    `<rect x="${x.toFixed(1)}" y="${topY.toFixed(1)}" width="${width.toFixed(1)}" height="${(baseY - topY).toFixed(1)}" fill="url(#${glowId})" opacity="0.8" />` +
                    `${windows}` +
                `</g>`,
            );
        }
        x += width * rng.float(0.65, 1.15);
        count += 1;
    }
    return count;
}

function buildBuildingPath(
    x: number,
    width: number,
    baseY: number,
    topY: number,
    rng: RNG,
    rooftopDetails: boolean,
): string {
    const variant = rooftopDetails ? rng.choice(["flat", "notch", "spire", "tier"]) : "flat";
    const right = x + width;
    const points: string[] = [];
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

function buildWindows(
    x: number,
    width: number,
    baseY: number,
    topY: number,
    density: number,
    theme: SkylineTheme,
    rng: RNG,
): string {
    const height = baseY - topY;
    const windowWidth = clamp(width * 0.06, 6, 28);
    const windowHeight = windowWidth * rng.float(1.2, 1.45);
    const spacingX = windowWidth * 0.5;
    const spacingY = windowHeight * 0.55;
    const columns = Math.max(1, Math.floor((width - windowWidth) / (windowWidth + spacingX)));
    const rows = Math.max(1, Math.floor((height - windowHeight) / (windowHeight + spacingY)));
    const startX = x + (width - (columns * (windowWidth + spacingX) - spacingX)) / 2;
    const startY = topY + (height - (rows * (windowHeight + spacingY) - spacingY)) / 2;
    const windows: string[] = [];
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
                `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="${windowWidth.toFixed(1)}" height="${windowHeight.toFixed(1)}" fill="${color}" opacity="${opacity.toFixed(2)}" rx="${(windowWidth * 0.08).toFixed(1)}" />`,
            );
        }
    }
    return windows.join(" ");
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}
