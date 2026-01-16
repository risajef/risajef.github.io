#!/usr/bin/env ts-node
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { generateBotanicalSvg, BotanicalOptions, BOTANICAL_THEMES } from "./lib/botanical";
import { convertSvgToPng } from "./lib/svgExport";

type ThemeKey = keyof typeof BOTANICAL_THEMES;

interface CliArgs {
    output: string;
    count: number;
    width: number;
    height: number;
    seed: number | null;
    theme: ThemeKey | "random";
    leaves: number | null;
    fronds: number | null;
    vines: number | null;
    blooms: number | null;
    dew: number | null;
    groundLayers: number | null;
    veil: boolean | null;
    noise: boolean;
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
        seed: null,
        theme: "random",
        leaves: null,
        fronds: null,
        vines: null,
        blooms: null,
        dew: null,
        groundLayers: null,
        veil: null,
        noise: false,
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
            case "--seed":
                defaults.seed = parseInt(next() ?? "0", 10);
                break;
            case "--theme": {
                const value = next();
                if (value && (value in BOTANICAL_THEMES || value === "random")) {
                    defaults.theme = value as ThemeKey | "random";
                }
                break;
            }
            case "--leaves":
                defaults.leaves = parseInt(next() ?? "0", 10);
                break;
            case "--fronds":
                defaults.fronds = parseInt(next() ?? "0", 10);
                break;
            case "--vines":
                defaults.vines = parseInt(next() ?? "0", 10);
                break;
            case "--blooms":
                defaults.blooms = parseInt(next() ?? "0", 10);
                break;
            case "--dew":
                defaults.dew = parseInt(next() ?? "0", 10);
                break;
            case "--ground-layers":
                defaults.groundLayers = parseInt(next() ?? "0", 10);
                break;
            case "--veil":
                defaults.veil = true;
                break;
            case "--no-veil":
                defaults.veil = false;
                break;
            case "--noise":
                defaults.noise = true;
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
    for (const [key, theme] of Object.entries(BOTANICAL_THEMES)) {
        console.log(`${key}\t${theme.name}`);
    }
    process.exit(0);
}

function buildOptions(args: CliArgs, seed: number): BotanicalOptions {
    return {
        width: args.width,
        height: args.height,
        seed,
        theme: args.theme,
        leaves: args.leaves ?? undefined,
        fronds: args.fronds ?? undefined,
        vines: args.vines ?? undefined,
        blooms: args.blooms ?? undefined,
        dewDrops: args.dew ?? undefined,
        groundLayers: args.groundLayers ?? undefined,
        veil: args.veil ?? undefined,
        noise: args.noise,
    };
}

async function main(): Promise<void> {
    const args = parseArgs();
    maybeListThemes(args);
    const baseSeed = args.seed ?? Date.now();
    fs.mkdirSync(args.output, { recursive: true });

    for (let idx = 0; idx < args.count; idx += 1) {
        const iterationSeed = baseSeed + idx;
        const result = generateBotanicalSvg(buildOptions(args, iterationSeed));
        const timestamp = new Date().toISOString().replace(/[:.]/g, "");
        const slug = result.theme.name.toLowerCase().replace(/\s+/g, "-");
        const svgPath = path.join(args.output, `botanical_${slug}_${timestamp}_${idx + 1}.svg`);
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
        message += ` (${result.theme.name})`;
        console.log(message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
