#!/usr/bin/env ts-node
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { generateSkylineSvg, SkylineOptions, SKYLINE_THEMES } from "./lib/skyline";
import { convertSvgToPng } from "./lib/svgExport";

type ThemeKey = keyof typeof SKYLINE_THEMES;

interface CliArgs {
    output: string;
    count: number;
    width: number;
    height: number;
    theme: ThemeKey | "random";
    seed: number | null;
    layers: number;
    buildings: [number, number];
    windowDensity: number;
    stars: boolean;
    haze: boolean;
    rooftops: boolean;
    water: boolean;
    traffic: boolean;
    pngScale: number;
    listThemes: boolean;
}

function parseArgs(): CliArgs {
    const argv = process.argv.slice(2);
    const defaults: CliArgs = {
        output: path.resolve("outputs"),
        count: 3,
        width: 5120,
        height: 1440,
        theme: "random",
        seed: null,
        layers: 3,
        buildings: [8, 18],
        windowDensity: 0.55,
        stars: true,
        haze: true,
        rooftops: true,
        water: true,
        traffic: true,
        pngScale: 1,
        listThemes: false,
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
            case "--theme": {
                const value = next();
                if (value && (value in SKYLINE_THEMES || value === "random")) {
                    defaults.theme = value as ThemeKey | "random";
                }
                break;
            }
            case "--seed":
                defaults.seed = parseInt(next() ?? "0", 10);
                break;
            case "--layers":
                defaults.layers = parseInt(next() ?? `${defaults.layers}`, 10);
                break;
            case "--buildings-min":
                defaults.buildings[0] = parseInt(next() ?? `${defaults.buildings[0]}`, 10);
                break;
            case "--buildings-max":
                defaults.buildings[1] = parseInt(next() ?? `${defaults.buildings[1]}`, 10);
                break;
            case "--window-density":
                defaults.windowDensity = parseFloat(next() ?? `${defaults.windowDensity}`);
                break;
            case "--no-stars":
                defaults.stars = false;
                break;
            case "--no-haze":
                defaults.haze = false;
                break;
            case "--no-rooftops":
                defaults.rooftops = false;
                break;
            case "--no-water":
                defaults.water = false;
                break;
            case "--no-traffic":
                defaults.traffic = false;
                break;
            case "--png-scale":
                defaults.pngScale = parseFloat(next() ?? "1");
                break;
            case "--no-png":
                defaults.pngScale = 0;
                break;
            case "--list-themes":
                defaults.listThemes = true;
                break;
            default:
                console.warn(`Unknown argument: ${arg}`);
        }
    }

    return defaults;
}

function maybeListThemes(args: CliArgs): void {
    if (!args.listThemes) {
        return;
    }
    for (const [key, theme] of Object.entries(SKYLINE_THEMES)) {
        console.log(`${key}\t${theme.name}`);
    }
    process.exit(0);
}

function buildOptions(args: CliArgs, seed: number): SkylineOptions {
    return {
        width: args.width,
        height: args.height,
        theme: args.theme,
        seed,
        layers: args.layers,
        buildingsPerLayer: args.buildings,
        windowDensity: args.windowDensity,
        stars: args.stars,
        haze: args.haze,
        rooftopDetails: args.rooftops,
        water: args.water,
        traffic: args.traffic,
    };
}

async function main(): Promise<void> {
    const args = parseArgs();
    maybeListThemes(args);
    const baseSeed = args.seed ?? Date.now();
    fs.mkdirSync(args.output, { recursive: true });

    for (let idx = 0; idx < args.count; idx += 1) {
        const iterationSeed = baseSeed + idx;
        const result = generateSkylineSvg(buildOptions(args, iterationSeed));
        const timestamp = new Date().toISOString().replace(/[:.]/g, "");
        const slug = result.theme.name.toLowerCase().replace(/\s+/g, "-");
        const svgPath = path.join(args.output, `skyline_${slug}_${timestamp}_${idx + 1}.svg`);
        await fsp.writeFile(svgPath, result.svg, "utf8");
        let message = `Generated ${svgPath}`;
        if (args.pngScale > 0) {
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
        }
        message += ` (${result.theme.name}, buildings: ${result.buildingCount})`;
        console.log(message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
