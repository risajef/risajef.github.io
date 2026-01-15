#!/usr/bin/env ts-node
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { generateBackgroundSvg } from "./lib/background";
import { generatePolygalaxySvg } from "./lib/polygalaxy";
import { generateTerrainSvg } from "./lib/terrain";
import { generateSkylineSvg } from "./lib/skyline";
import { convertSvgToPng } from "./lib/svgExport";

interface CliArgs {
    output: string;
    count: number;
    width: number;
    height: number;
    seed: number | null;
    skipPng: boolean;
}

interface JobConfig {
    key: string;
    label: string;
    run(seed: number): { svg: string; detail: string; note: string };
}

const DEFAULT_WIDTH = 5120;
const DEFAULT_HEIGHT = 1440;
const DEFAULT_COUNT = 3;

function parseArgs(): CliArgs {
    const argv = process.argv.slice(2);
    const defaults: CliArgs = {
        output: path.resolve("outputs"),
        count: DEFAULT_COUNT,
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        seed: null,
        skipPng: false,
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
            case "--no-png":
                defaults.skipPng = true;
                break;
            default:
                console.warn(`Unknown argument: ${arg}`);
        }
    }

    defaults.count = Math.max(1, defaults.count);
    defaults.width = Math.max(64, defaults.width);
    defaults.height = Math.max(64, defaults.height);

    return defaults;
}

function slugify(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "scene";
}

async function writeArtifacts(
    args: CliArgs,
    jobKey: string,
    detail: string,
    svg: string,
    width: number,
    height: number,
    index: number,
): Promise<{ svgPath: string; pngPath: string | null }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "");
    const slug = slugify(detail);
    const ordinal = String(index + 1).padStart(2, "0");
    const baseName = `${jobKey}_${slug}_${timestamp}_${ordinal}`;
    const svgPath = path.join(args.output, `${baseName}.svg`);
    await fsp.writeFile(svgPath, svg, "utf8");
    let pngPath: string | null = null;
    if (!args.skipPng) {
        pngPath = await convertSvgToPng({
            svgPath,
            svgContent: svg,
            width,
            height,
            scale: 1,
        });
    }
    return { svgPath, pngPath };
}

async function main(): Promise<void> {
    const args = parseArgs();
    fs.mkdirSync(args.output, { recursive: true });
    const baseSeed = args.seed ?? Date.now();
    let seedCursor = baseSeed;
    const jobs: JobConfig[] = [
        {
            key: "background",
            label: "Gradient Background",
            run(seed: number) {
                const result = generateBackgroundSvg({
                    width: args.width,
                    height: args.height,
                    seed,
                });
                return {
                    svg: result.svg,
                    detail: `seed-${seed}`,
                    note: `Palette ${result.palette.gradient.join(" / ")}`,
                };
            },
        },
        {
            key: "polygalaxy",
            label: "Polygalaxy",
            run(seed: number) {
                const result = generatePolygalaxySvg({
                    width: args.width,
                    height: args.height,
                    seed,
                });
                return {
                    svg: result.svg,
                    detail: result.theme.name,
                    note: `Theme ${result.theme.name}`,
                };
            },
        },
        {
            key: "terrain",
            label: "Terrain",
            run(seed: number) {
                const result = generateTerrainSvg({
                    width: args.width,
                    height: args.height,
                    seed,
                });
                return {
                    svg: result.svg,
                    detail: result.theme.name,
                    note: `Biome ${result.theme.name}`,
                };
            },
        },
        {
            key: "skyline",
            label: "Skyline",
            run(seed: number) {
                const result = generateSkylineSvg({
                    width: args.width,
                    height: args.height,
                    seed,
                });
                return {
                    svg: result.svg,
                    detail: result.theme.name,
                    note: `City ${result.theme.name} • ${result.buildingCount} buildings`,
                };
            },
        },
    ];

    for (const job of jobs) {
        console.log(`\n=== ${job.label} ===`);
        for (let idx = 0; idx < args.count; idx += 1) {
            const seed = seedCursor++;
            const { svg, detail, note } = job.run(seed);
            const { svgPath, pngPath } = await writeArtifacts(
                args,
                job.key,
                detail,
                svg,
                args.width,
                args.height,
                idx,
            );
            let message = `[${job.key}] ${note} -> ${svgPath}`;
            if (pngPath) {
                message += ` + ${pngPath}`;
            }
            console.log(message);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
