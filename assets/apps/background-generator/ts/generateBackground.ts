#!/usr/bin/env ts-node
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { generateBackgroundSvg, BackgroundOptions } from "./lib/background";
import { convertSvgToPng } from "./lib/svgExport";

interface CliArgs {
    output: string;
    count: number;
    width: number;
    height: number;
    seed: number | null;
    blobCount: number | null;
    ribbonCount: number | null;
    orbCount: number | null;
    lightCount: number | null;
    lineCount: number | null;
    triangleCount: number | null;
    waveCount: number | null;
    pngScale: number;
}

function parseArgs(): CliArgs {
    const argv = process.argv.slice(2);
    const defaults: CliArgs = {
        output: path.resolve("outputs"),
        count: 3,
        width: 5120,
        height: 1440,
        seed: null,
        blobCount: null,
        ribbonCount: null,
        orbCount: null,
        lightCount: null,
        lineCount: null,
        triangleCount: null,
        waveCount: null,
        pngScale: 1,
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
            case "--blob-count":
                defaults.blobCount = parseInt(next() ?? "0", 10);
                break;
            case "--ribbon-count":
                defaults.ribbonCount = parseInt(next() ?? "0", 10);
                break;
            case "--orb-count":
                defaults.orbCount = parseInt(next() ?? "0", 10);
                break;
            case "--light-count":
                defaults.lightCount = parseInt(next() ?? "0", 10);
                break;
            case "--line-count":
                defaults.lineCount = parseInt(next() ?? "0", 10);
                break;
            case "--triangle-count":
                defaults.triangleCount = parseInt(next() ?? "0", 10);
                break;
            case "--wave-count":
                defaults.waveCount = parseInt(next() ?? "0", 10);
                break;
            case "--png-scale":
                defaults.pngScale = parseFloat(next() ?? "1");
                break;
            default:
                console.warn(`Unknown argument: ${arg}`);
        }
    }

    return defaults;
}

function buildGeneratorOptions(args: CliArgs, seed: number): BackgroundOptions {
    return {
        width: args.width,
        height: args.height,
        seed,
        blobCount: args.blobCount,
        ribbonCount: args.ribbonCount,
        orbCount: args.orbCount,
        lightCount: args.lightCount,
        lineCount: args.lineCount,
        triangleCount: args.triangleCount,
        waveCount: args.waveCount,
    };
}

async function main(): Promise<void> {
    const args = parseArgs();
    const baseSeed = args.seed ?? Date.now();
    fs.mkdirSync(args.output, { recursive: true });

    for (let idx = 0; idx < args.count; idx += 1) {
        const iterationSeed = baseSeed + idx;
        const { svg, palette } = generateBackgroundSvg(buildGeneratorOptions(args, iterationSeed));
        const timestamp = new Date().toISOString().replace(/[:.]/g, "");
        const svgPath = path.join(args.output, `background_${timestamp}_${idx + 1}.svg`);
        await fsp.writeFile(svgPath, svg, "utf8");
        let message = `Generated ${svgPath}`;
        const pngPath = await convertSvgToPng({
            svgPath,
            svgContent: svg,
            width: args.width,
            height: args.height,
            scale: args.pngScale,
        });
        if (pngPath) {
            message += ` and ${pngPath}`;
        }
        message += ` (palette: ${palette.gradient.join(", ")})`;
        console.log(message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
