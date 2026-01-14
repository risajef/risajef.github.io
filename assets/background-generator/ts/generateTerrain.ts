#!/usr/bin/env ts-node
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { generateTerrainSvg, TerrainOptions, TERRAIN_THEMES } from "./lib/terrain";
import { convertSvgToPng } from "./lib/svgExport";

type ThemeKey = keyof typeof TERRAIN_THEMES;

interface CliArgs {
    output: string;
    count: number;
    width: number;
    height: number;
    theme: ThemeKey | "random";
    seed: number | null;
    mountains: number;
    trees: number;
    clouds: number;
    fog: boolean;
    noise: boolean;
    moon: boolean;
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
        mountains: 3,
        trees: 40,
        clouds: 12,
        fog: false,
        noise: false,
        moon: false,
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
                if (value && (value in TERRAIN_THEMES || value === "random")) {
                    defaults.theme = value as ThemeKey | "random";
                }
                break;
            }
            case "--seed":
                defaults.seed = parseInt(next() ?? "0", 10);
                break;
            case "--mountains":
                defaults.mountains = parseInt(next() ?? `${defaults.mountains}`, 10);
                break;
            case "--trees":
                defaults.trees = parseInt(next() ?? `${defaults.trees}`, 10);
                break;
            case "--clouds":
                defaults.clouds = parseInt(next() ?? `${defaults.clouds}`, 10);
                break;
            case "--fog":
                defaults.fog = true;
                break;
            case "--noise":
                defaults.noise = true;
                break;
            case "--moon":
                defaults.moon = true;
                break;
            case "--png-scale":
                defaults.pngScale = parseFloat(next() ?? "1");
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
    if (args.listThemes) {
        for (const [key, theme] of Object.entries(TERRAIN_THEMES)) {
            console.log(`${key}\t${theme.name}`);
        }
        process.exit(0);
    }
}

function buildGeneratorOptions(args: CliArgs, seed: number): TerrainOptions {
    return {
        width: args.width,
        height: args.height,
        theme: args.theme,
        seed,
        mountains: args.mountains,
        trees: args.trees,
        clouds: args.clouds,
        fog: args.fog,
        noise: args.noise,
        moon: args.moon,
    };
}

async function main(): Promise<void> {
    const args = parseArgs();
    maybeListThemes(args);
    const baseSeed = args.seed ?? Date.now();
    fs.mkdirSync(args.output, { recursive: true });

    for (let idx = 0; idx < args.count; idx += 1) {
        const iterationSeed = baseSeed + idx;
        const result = generateTerrainSvg(buildGeneratorOptions(args, iterationSeed));
        const timestamp = new Date().toISOString().replace(/[:.]/g, "");
        const slug = result.theme.name.toLowerCase().replace(/\s+/g, "-");
        const svgPath = path.join(args.output, `terrain_${slug}_${timestamp}_${idx + 1}.svg`);
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
