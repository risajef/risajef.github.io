type SharpModule = typeof import("sharp");

let cachedSharp: SharpModule | null = null;
let warnSharpMissing = false;

async function loadSharp(): Promise<SharpModule | null> {
    if (cachedSharp) {
        return cachedSharp;
    }
    try {
        const imported = (await import("sharp")) as SharpModule | { default?: SharpModule };
        if (typeof imported === "function") {
            cachedSharp = imported;
        } else if (imported.default && typeof imported.default === "function") {
            cachedSharp = imported.default;
        }
    } catch (error) {
        if (!warnSharpMissing) {
            console.warn("Install sharp to enable PNG export from TypeScript generators.");
            warnSharpMissing = true;
        }
        return null;
    }
    if (!cachedSharp && !warnSharpMissing) {
        console.warn("sharp loaded but had unexpected shape; skipping PNG export.");
        warnSharpMissing = true;
    }
    return cachedSharp;
}

interface ConvertParams {
    svgPath: string;
    svgContent: string;
    width: number;
    height: number;
    scale?: number;
}

export async function convertSvgToPng({ svgPath, svgContent, width, height, scale = 1 }: ConvertParams): Promise<string | null> {
    const sharpModule = await loadSharp();
    if (!sharpModule) {
        return null;
    }
    const safeScale = Math.max(1, scale);
    const density = Math.max(72, 72 * safeScale);
    const pngPath = svgPath.replace(/\.svg$/i, ".png");
    await sharpModule(Buffer.from(svgContent), { density })
        .resize(width, height)
        .png()
        .toFile(pngPath);
    return pngPath;
}
