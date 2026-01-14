#!/usr/bin/env ts-node
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { generatePolygalaxySvg, PolygalaxyOptions, POLYGALAXY_THEMES, POLYGALAXY_STYLES } from "./lib/polygalaxy";
import { convertSvgToPng } from "./lib/svgExport";

type ThemeKey = keyof typeof POLYGALAXY_THEMES;
type StyleKey = keyof typeof POLYGALAXY_STYLES;

interface CliArgs {
    output: string;
    count: number;
    width: number;
    height: number;
    seed: number | null;
    theme: ThemeKey | "random";
    style: StyleKey;
    stars: number | null;
    facets: number | null;
    rings: number | null;
    threads: number | null;
    glows: number | null;
    constellations: number | null;
    pngScale: number;
    scanlines: boolean;
    listThemes: boolean;
    listStyles: boolean;
}

function parseArgs(): CliArgs {
    const argv = process.argv.slice(2);
    const defaults: CliArgs = {
        output: path.resolve("outputs"),
        count: 3,
        width: 5120,
        height: 1440,
        seed: null,
        theme: "random",
        style: "aura",
        stars: null,
        facets: null,
        rings: null,
        threads: null,
        glows: null,
        constellations: null,
        pngScale: 1,
        scanlines: false,
        listThemes: false,
        listStyles: false,
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        const next = () => {
            i += 1;
            return argv[i];
        };
        switch (arg) {
            case "-o":
            case "--output":
                defaults.output = path.resolve(next() ?? defaults.output);
                break;
            case "-n":
            case "--count":
                defaults.count = parseInt(next() ?? `${defaults.count}`, 10);
                break;
            case "--width":
                defaults.width = parseInt(next() ?? `${defaults.width}`, 10);
                break;
            case "--height":
                defaults.height = parseInt(next() ?? `${defaults.height}`, 10);
                break;
            case "--seed":
                defaults.seed = parseInt(next() ?? "0", 10);
                break;
            case "--theme": {
                const value = next();
                if (value && (value in POLYGALAXY_THEMES || value === "random")) {
                    defaults.theme = value as ThemeKey | "random";
                }
                break;
            }
            case "--style": {
                const value = next();
                if (value && value in POLYGALAXY_STYLES) {
                    defaults.style = value as StyleKey;
                }
                break;
            }
            case "--stars":
                defaults.stars = parseInt(next() ?? "0", 10);
                break;
            case "--facets":
                defaults.facets = parseInt(next() ?? "0", 10);
                break;
            case "--rings":
                defaults.rings = parseInt(next() ?? "0", 10);
                break;
            case "--threads":
                defaults.threads = parseInt(next() ?? "0", 10);
                break;
            case "--glows":
                defaults.glows = parseInt(next() ?? "0", 10);
                break;
            case "--constellations":
                defaults.constellations = parseInt(next() ?? "0", 10);
                break;
            case "--png-scale":
                defaults.pngScale = parseFloat(next() ?? "1");
                break;
            case "--scanlines":
                defaults.scanlines = true;
                break;
            case "--list-themes":
                defaults.listThemes = true;
                break;
            case "--list-styles":
                defaults.listStyles = true;
                break;
            default:
                console.warn(`Unknown argument: ${arg}`);
        }
    }

    return defaults;
}

function maybeListAndExit(args: CliArgs): void {
    if (args.listThemes) {
        for (const [key, theme] of Object.entries(POLYGALAXY_THEMES)) {
            console.log(`${key}\t${theme.name}`);
        }
        process.exit(0);
    }
    if (args.listStyles) {
        for (const [key, preset] of Object.entries(POLYGALAXY_STYLES)) {
            console.log(`${key}\t${JSON.stringify(preset)}`);
        }
        process.exit(0);
    }
}

function buildGeneratorOptions(args: CliArgs, seed: number): PolygalaxyOptions {
    return {
        width: args.width,
        height: args.height,
        seed,
        theme: args.theme,
        style: args.style,
        stars: args.stars,
        facets: args.facets,
        rings: args.rings,
        threads: args.threads,
        glows: args.glows,
        constellations: args.constellations,
        scanlines: args.scanlines,
    };
}

async function main(): Promise<void> {
    const args = parseArgs();
    maybeListAndExit(args);
    const baseSeed = args.seed ?? Date.now();
    fs.mkdirSync(args.output, { recursive: true });

    for (let idx = 0; idx < args.count; idx += 1) {
        const iterationSeed = baseSeed + idx;
        const result = generatePolygalaxySvg(buildGeneratorOptions(args, iterationSeed));
        const timestamp = new Date().toISOString().replace(/[:.]/g, "");
        const slug = result.theme.name.toLowerCase().replace(/\s+/g, "-");
        const svgPath = path.join(args.output, `polygalaxy_${slug}_${timestamp}_${idx + 1}.svg`);
        await fsp.writeFile(svgPath, result.svg, "utf8");
        let message = `Generated ${svgPath}`;
        const pngPath = await convertSvgToPng({
            svgPath,
            svgContent: result.svg,
            width: args.width,
            height: args.height,
            scale: args.pngScale,
        });
        if (pngPath) {
            message += ` and ${pngPath}`;
        }
        message += ` (${result.theme.name})`;
        console.log(message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
