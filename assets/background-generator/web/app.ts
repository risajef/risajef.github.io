import { generateBackgroundSvg, BACKGROUND_DEFAULTS, BackgroundOptions } from "../ts/lib/background";
import { generatePolygalaxySvg, POLYGALAXY_THEMES, POLYGALAXY_STYLES, PolygalaxyOptions } from "../ts/lib/polygalaxy";
import { generateTerrainSvg, TERRAIN_THEMES, TerrainOptions } from "../ts/lib/terrain";

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

type GeneratorKey = keyof typeof GENERATORS;

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
};

const form = document.getElementById("generator-form") as HTMLFormElement;
const generatorSelect = document.getElementById("generator-select") as HTMLSelectElement;
const fieldsContainer = document.getElementById("dynamic-fields") as HTMLDivElement;
const preview = document.getElementById("preview") as HTMLDivElement;
const meta = document.getElementById("meta") as HTMLDivElement;
const output = document.getElementById("svg-output") as HTMLTextAreaElement;

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
    } catch (error) {
        meta.textContent = "Generation failed. Check console for details.";
        console.error(error);
    }
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

init();
