import { generateBackgroundSvg, BACKGROUND_DEFAULTS, BackgroundOptions } from "../ts/lib/background";
import { generatePolygalaxySvg, POLYGALAXY_THEMES, POLYGALAXY_STYLES, PolygalaxyOptions } from "../ts/lib/polygalaxy";
import { generateTerrainSvg, TERRAIN_THEMES, TerrainOptions } from "../ts/lib/terrain";
import { generateSkylineSvg, SKYLINE_THEMES, SkylineOptions } from "../ts/lib/skyline";
import { generateBotanicalSvg, BOTANICAL_THEMES, BotanicalOptions } from "../ts/lib/botanical";

type FieldType = "number" | "text" | "select" | "checkbox";

interface FieldConfig {
    key: string;
    label: string;
    type: FieldType;
    placeholder?: string;
    min?: number;
    max?: number;
    step?: number;
    options?: Array<{ label: string; value: string }>;
    defaultValue?: string | number | boolean;
}

interface GeneratorConfig {
    label: string;
    fields: FieldConfig[];
    run(values: Record<string, unknown>): GeneratorResult;
}

interface GeneratorResult {
    svg: string;
    meta: string;
}

interface GeneratedAsset {
    generatorKey: GeneratorKey;
    svg: string;
}

interface SvgDimensions {
    width: number;
    height: number;
}

type GeneratorKey = keyof typeof GENERATORS;

type DownloadFormat = "svg" | "png";

type ValueMap = Record<string, unknown>;

const backgroundFields: FieldConfig[] = [
    { key: "width", label: "Width", type: "number", defaultValue: BACKGROUND_DEFAULTS.width, min: 320 },
    { key: "height", label: "Height", type: "number", defaultValue: BACKGROUND_DEFAULTS.height, min: 200 },
    { key: "seed", label: "Seed", type: "number", placeholder: "auto" },
    { key: "blobCount", label: "Blob Count", type: "number", placeholder: "random", min: 0 },
    { key: "ribbonCount", label: "Ribbon Count", type: "number", placeholder: "random", min: 0 },
    { key: "orbCount", label: "Orb Count", type: "number", placeholder: "random", min: 0 },
    { key: "lightCount", label: "Light Count", type: "number", placeholder: "random", min: 0 },
    { key: "lineCount", label: "Line Cluster Count", type: "number", placeholder: "random", min: 0 },
    { key: "triangleCount", label: "Triangle Count", type: "number", placeholder: "random", min: 0 },
    { key: "waveCount", label: "Wave Count", type: "number", placeholder: "random", min: 0 },
];

const polygalaxyFields: FieldConfig[] = [
    { key: "width", label: "Width", type: "number", defaultValue: 5120, min: 320 },
    { key: "height", label: "Height", type: "number", defaultValue: 1440, min: 200 },
    { key: "seed", label: "Seed", type: "number", placeholder: "auto" },
    {
        key: "theme",
        label: "Theme",
        type: "select",
        options: [
            { label: "Random", value: "random" },
            ...Object.entries(POLYGALAXY_THEMES).map(([key, theme]) => ({ label: theme.name, value: key })),
        ],
        defaultValue: "random",
    },
    {
        key: "style",
        label: "Style",
        type: "select",
        options: Object.keys(POLYGALAXY_STYLES).map((key) => ({ label: key, value: key })),
        defaultValue: "aura",
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
    { key: "scanlines", label: "Scanlines", type: "checkbox", defaultValue: false },
];

const terrainFields: FieldConfig[] = [
    { key: "width", label: "Width", type: "number", defaultValue: 5120, min: 320 },
    { key: "height", label: "Height", type: "number", defaultValue: 1440, min: 200 },
    { key: "seed", label: "Seed", type: "number", placeholder: "auto" },
    {
        key: "theme",
        label: "Theme",
        type: "select",
        options: [
            { label: "Random", value: "random" },
            ...Object.entries(TERRAIN_THEMES).map(([key, theme]) => ({ label: theme.name, value: key })),
        ],
        defaultValue: "random",
    },
    { key: "mountains", label: "Mountain Layers", type: "number", defaultValue: 3, min: 1 },
    { key: "trees", label: "Trees", type: "number", defaultValue: 40, min: 0 },
    { key: "clouds", label: "Clouds", type: "number", defaultValue: 12, min: 0 },
    { key: "fog", label: "Fog", type: "checkbox", defaultValue: false },
    { key: "noise", label: "Noise", type: "checkbox", defaultValue: false },
    { key: "moon", label: "Moon", type: "checkbox", defaultValue: false },
];

const skylineFields: FieldConfig[] = [
    { key: "width", label: "Width", type: "number", defaultValue: 5120, min: 320 },
    { key: "height", label: "Height", type: "number", defaultValue: 1440, min: 200 },
    { key: "seed", label: "Seed", type: "number", placeholder: "auto" },
    {
        key: "theme",
        label: "Theme",
        type: "select",
        options: [
            { label: "Random", value: "random" },
            ...Object.entries(SKYLINE_THEMES).map(([key, theme]) => ({ label: theme.name, value: key })),
        ],
        defaultValue: "random",
    },
    { key: "layers", label: "Layers", type: "number", defaultValue: 3, min: 1, max: 5 },
    { key: "buildingMin", label: "Buildings Min", type: "number", defaultValue: 8, min: 1 },
    { key: "buildingMax", label: "Buildings Max", type: "number", defaultValue: 18, min: 1 },
    { key: "windowDensity", label: "Window Density", type: "number", defaultValue: 0.55, min: 0, max: 1, step: 0.05 },
    { key: "stars", label: "Stars", type: "checkbox", defaultValue: true },
    { key: "haze", label: "Haze", type: "checkbox", defaultValue: true },
    { key: "rooftops", label: "Rooftop Details", type: "checkbox", defaultValue: true },
    { key: "water", label: "Water", type: "checkbox", defaultValue: true },
    { key: "traffic", label: "Traffic", type: "checkbox", defaultValue: true },
];

const botanicalFields: FieldConfig[] = [
    { key: "width", label: "Width", type: "number", defaultValue: 5120, min: 320 },
    { key: "height", label: "Height", type: "number", defaultValue: 1440, min: 200 },
    { key: "seed", label: "Seed", type: "number", placeholder: "auto" },
    {
        key: "theme",
        label: "Theme",
        type: "select",
        options: [
            { label: "Random", value: "random" },
            ...Object.entries(BOTANICAL_THEMES).map(([key, theme]) => ({ label: theme.name, value: key })),
        ],
        defaultValue: "random",
    },
    { key: "leaves", label: "Leaves", type: "number", placeholder: "auto", min: 0 },
    { key: "fronds", label: "Fronds", type: "number", placeholder: "auto", min: 0 },
    { key: "vines", label: "Vines", type: "number", placeholder: "auto", min: 0 },
    { key: "blooms", label: "Blooms", type: "number", placeholder: "auto", min: 0 },
    { key: "dew", label: "Dew Drops", type: "number", placeholder: "auto", min: 0 },
    { key: "groundLayers", label: "Ground Layers", type: "number", placeholder: "auto", min: 1 },
    { key: "veil", label: "Veil", type: "checkbox", defaultValue: true },
    { key: "noise", label: "Noise", type: "checkbox", defaultValue: false },
];

const GENERATORS: Record<string, GeneratorConfig> = {
    background: {
        label: "Gradient Background",
        fields: backgroundFields,
        run(values) {
            const options: BackgroundOptions = buildBackgroundOptions(values);
            const { svg, seed, palette } = generateBackgroundSvg(options);
            return { svg, meta: `Seed ${seed} • Palette ${palette.gradient.join(" / ")}` };
        },
    },
    polygalaxy: {
        label: "Polygalaxy",
        fields: polygalaxyFields,
        run(values) {
            const options: PolygalaxyOptions = buildPolygalaxyOptions(values);
            const result = generatePolygalaxySvg(options);
            return { svg: result.svg, meta: `${result.theme.name} • Seed ${result.seed}` };
        },
    },
    terrain: {
        label: "Terrain Poem",
        fields: terrainFields,
        run(values) {
            const options: TerrainOptions = buildTerrainOptions(values);
            const result = generateTerrainSvg(options);
            return { svg: result.svg, meta: `${result.theme.name} • Seed ${result.seed}` };
        },
    },
    skyline: {
        label: "Urban Skyline",
        fields: skylineFields,
        run(values) {
            const options: SkylineOptions = buildSkylineOptions(values);
            const result = generateSkylineSvg(options);
            return {
                svg: result.svg,
                meta: `${result.theme.name} • Seed ${result.seed} • ${result.buildingCount} buildings`,
            };
        },
    },
    botanical: {
        label: "Botanical Garden",
        fields: botanicalFields,
        run(values) {
            const options: BotanicalOptions = buildBotanicalOptions(values);
            const result = generateBotanicalSvg(options);
            return {
                svg: result.svg,
                meta: `${result.theme.name} • Seed ${result.seed} • ${result.counts.leaves} leaves`,
            };
        },
    },
};

const form = document.getElementById("generator-form") as HTMLFormElement;
const generatorSelect = document.getElementById("generator-select") as HTMLSelectElement;
const fieldsContainer = document.getElementById("dynamic-fields") as HTMLDivElement;
const preview = document.getElementById("preview") as HTMLDivElement;
const meta = document.getElementById("meta") as HTMLDivElement;
const output = document.getElementById("svg-output") as HTMLTextAreaElement;
const downloadSvgButton = document.getElementById("download-svg") as HTMLButtonElement;
const downloadPngButton = document.getElementById("download-png") as HTMLButtonElement;

let lastGeneratedAsset: GeneratedAsset | null = null;

function init(): void {
    Object.entries(GENERATORS).forEach(([key, config]) => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = config.label;
        generatorSelect.append(option);
    });
    generatorSelect.addEventListener("change", () => renderFields(generatorSelect.value as GeneratorKey));
    renderFields(generatorSelect.value as GeneratorKey);
    form.addEventListener("submit", handleSubmit);
    downloadSvgButton.addEventListener("click", handleSvgDownload);
    downloadPngButton.addEventListener("click", () => {
        void handlePngDownload();
    });
    setDownloadState(false);
}

function renderFields(generatorKey: GeneratorKey): void {
    const config = GENERATORS[generatorKey];
    fieldsContainer.innerHTML = "";
    config.fields.forEach((field) => {
        const label = document.createElement("label");
        label.htmlFor = field.key;
        label.textContent = field.label;
        let input: HTMLInputElement | HTMLSelectElement;
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
                (inputEl as HTMLInputElement).checked = field.defaultValue;
            }
            if (field.placeholder) {
                inputEl.placeholder = field.placeholder;
            }
            if (field.min !== undefined) {
                inputEl.min = String(field.min);
            }
            if (field.max !== undefined) {
                inputEl.max = String(field.max);
            }
            if (field.step !== undefined) {
                inputEl.step = String(field.step);
            }
            input = inputEl;
        }
        label.append(input);
        fieldsContainer.append(label);
    });
}

function handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    const generatorKey = generatorSelect.value as GeneratorKey;
    const config = GENERATORS[generatorKey];
    const values = collectValues(config.fields);
    try {
        const result = config.run(values);
        preview.innerHTML = result.svg;
        meta.textContent = result.meta;
        output.value = result.svg;
        lastGeneratedAsset = { generatorKey, svg: result.svg };
        setDownloadState(true);
    } catch (error) {
        lastGeneratedAsset = null;
        setDownloadState(false);
        meta.textContent = "Generation failed. Check console for details.";
        console.error(error);
    }
}

function handleSvgDownload(): void {
    if (!lastGeneratedAsset) {
        return;
    }
    const blob = new Blob([lastGeneratedAsset.svg], { type: "image/svg+xml;charset=utf-8" });
    triggerDownload(blob, buildDownloadFilename("svg"));
}

async function handlePngDownload(): Promise<void> {
    if (!lastGeneratedAsset) {
        return;
    }
    downloadPngButton.disabled = true;
    try {
        const blob = await renderSvgAsPng(lastGeneratedAsset.svg);
        triggerDownload(blob, buildDownloadFilename("png"));
    } catch (error) {
        meta.textContent = "PNG export failed. Check console for details.";
        console.error(error);
    } finally {
        downloadPngButton.disabled = lastGeneratedAsset === null;
    }
}

function setDownloadState(enabled: boolean): void {
    downloadSvgButton.disabled = !enabled;
    downloadPngButton.disabled = !enabled;
}

function buildDownloadFilename(format: DownloadFormat): string {
    const generatorKey = lastGeneratedAsset?.generatorKey ?? "generator";
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `${generatorKey}-${timestamp}.${format}`;
}

function triggerDownload(blob: Blob, filename: string): void {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

async function renderSvgAsPng(svg: string): Promise<Blob> {
    const { width, height } = parseSvgDimensions(svg);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    const context = canvas.getContext("2d");
    if (!context) {
        throw new Error("Canvas 2D context is unavailable.");
    }
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const objectUrl = URL.createObjectURL(svgBlob);
    try {
        const image = await loadSvgImage(objectUrl);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
                return;
            }
            reject(new Error("Canvas could not encode the generated PNG."));
        }, "image/png");
    });
}

function loadSvgImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Generated SVG could not be decoded for PNG export."));
        image.src = url;
    });
}

function parseSvgDimensions(svg: string): SvgDimensions {
    const svgDocument = new DOMParser().parseFromString(svg, "image/svg+xml");
    if (svgDocument.querySelector("parsererror")) {
        throw new Error("Generated SVG markup is invalid.");
    }
    const svgElement = svgDocument.documentElement;
    const width = parseSvgLength(svgElement.getAttribute("width"));
    const height = parseSvgLength(svgElement.getAttribute("height"));
    if (width !== null && height !== null) {
        return { width, height };
    }
    const viewBox = svgElement.getAttribute("viewBox");
    if (!viewBox) {
        throw new Error("Generated SVG is missing width and height metadata.");
    }
    const values = viewBox
        .split(/[\s,]+/)
        .map((value) => Number.parseFloat(value))
        .filter((value) => Number.isFinite(value));
    if (values.length !== 4 || values[2] <= 0 || values[3] <= 0) {
        throw new Error("Generated SVG has an invalid viewBox.");
    }
    return { width: values[2], height: values[3] };
}

function parseSvgLength(value: string | null): number | null {
    if (!value) {
        return null;
    }
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function collectValues(fields: FieldConfig[]): ValueMap {
    const values: ValueMap = {};
    fields.forEach((field) => {
        const element = form.elements.namedItem(field.key) as HTMLInputElement | HTMLSelectElement | null;
        if (!element) {
            return;
        }
        if (field.type === "checkbox") {
            values[field.key] = (element as HTMLInputElement).checked;
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

function buildBackgroundOptions(values: ValueMap): BackgroundOptions {
    return {
        width: (values.width as number) ?? BACKGROUND_DEFAULTS.width,
        height: (values.height as number) ?? BACKGROUND_DEFAULTS.height,
        seed: values.seed as number | undefined,
        blobCount: values.blobCount as number | undefined,
        ribbonCount: values.ribbonCount as number | undefined,
        orbCount: values.orbCount as number | undefined,
        lightCount: values.lightCount as number | undefined,
        lineCount: values.lineCount as number | undefined,
        triangleCount: values.triangleCount as number | undefined,
        waveCount: values.waveCount as number | undefined,
    };
}

function buildPolygalaxyOptions(values: ValueMap): PolygalaxyOptions {
    return {
        width: (values.width as number) ?? 5120,
        height: (values.height as number) ?? 1440,
        seed: values.seed as number | undefined,
        theme: (values.theme as string | undefined) as PolygalaxyOptions["theme"],
        style: (values.style as string | undefined) as PolygalaxyOptions["style"],
        stars: values.stars as number | undefined,
        facets: values.facets as number | undefined,
        rings: values.rings as number | undefined,
        threads: values.threads as number | undefined,
        glows: values.glows as number | undefined,
        constellations: values.constellations as number | undefined,
        systems: values.systems as number | undefined,
        arms: values.arms as number | undefined,
        planets: values.planets as number | undefined,
        scanlines: (values.scanlines as boolean | undefined) ?? false,
    };
}

function buildTerrainOptions(values: ValueMap): TerrainOptions {
    return {
        width: (values.width as number) ?? 5120,
        height: (values.height as number) ?? 1440,
        seed: values.seed as number | undefined,
        theme: (values.theme as string | undefined) as TerrainOptions["theme"],
        mountains: values.mountains as number | undefined,
        trees: values.trees as number | undefined,
        clouds: values.clouds as number | undefined,
        fog: (values.fog as boolean | undefined) ?? false,
        noise: (values.noise as boolean | undefined) ?? false,
        moon: (values.moon as boolean | undefined) ?? false,
    };
}

function buildSkylineOptions(values: ValueMap): SkylineOptions {
    const minValue = typeof values.buildingMin === "number" ? values.buildingMin : 8;
    const maxValue = typeof values.buildingMax === "number" ? values.buildingMax : 18;
    const minBuildings = Math.min(minValue, maxValue);
    const maxBuildings = Math.max(minValue, maxValue);
    const rawDensity = typeof values.windowDensity === "number" ? values.windowDensity : 0.55;
    const windowDensity = Math.max(0, Math.min(1, rawDensity));
    return {
        width: (values.width as number) ?? 5120,
        height: (values.height as number) ?? 1440,
        seed: values.seed as number | undefined,
        theme: (values.theme as string | undefined) as SkylineOptions["theme"],
        layers: (values.layers as number | undefined) ?? 3,
        buildingsPerLayer: [minBuildings, maxBuildings],
        windowDensity,
        stars: values.stars as boolean | undefined,
        haze: values.haze as boolean | undefined,
        rooftopDetails: values.rooftops as boolean | undefined,
        water: values.water as boolean | undefined,
        traffic: values.traffic as boolean | undefined,
    };
}

function buildBotanicalOptions(values: ValueMap): BotanicalOptions {
    return {
        width: (values.width as number) ?? 5120,
        height: (values.height as number) ?? 1440,
        seed: values.seed as number | undefined,
        theme: (values.theme as string | undefined) as BotanicalOptions["theme"],
        leaves: values.leaves as number | undefined,
        fronds: values.fronds as number | undefined,
        vines: values.vines as number | undefined,
        blooms: values.blooms as number | undefined,
        dewDrops: values.dew as number | undefined,
        groundLayers: values.groundLayers as number | undefined,
        veil: values.veil as boolean | undefined,
        noise: values.noise as boolean | undefined,
    };
}

init();
