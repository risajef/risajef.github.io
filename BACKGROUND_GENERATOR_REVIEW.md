# Background Generator architecture and code review

Reviewed 5 November 2026. Submodule: `docs/assets/background-generator`, commit `d5c31f571b9dabf7a517e2e8df4998480a2f5a7b`.

## Assessment

The architecture is appropriate for a small procedural-art tool: five SVG generators share a seeded RNG, while browser and CLI adapters handle interaction and output. The core does not depend on the DOM, filesystem, or an application framework. Normal fixed-seed generation works, and all five generators produced SVGs that Sharp could rasterize in this review.

The main weakness is that the public generator functions accept options without establishing valid, bounded inputs. This can produce invalid SVG, excessive work, or a nonterminating loop. Other confirmed problems include controls that do nothing, duplicate SVG IDs, inconsistent CLI flags, and undocumented configuration needed to start the CLIs. I would address these before adding more generators.

A rewrite, backend, or large framework is unnecessary. A small validation layer, shared SVG builder, consistent CLI adapter, and focused regression suite would substantially improve reliability.

## Scope and verification

Inspected the generator libraries, six CLI entry points, browser controller, HTML/CSS, package/build configuration, checked-in browser bundle, and parent website embedding/build integration. No application source was modified. Compilation and probe artifacts were written under `/tmp`.

| Check | Result |
| --- | --- |
| Browser TypeScript check, `tsc -p tsconfig.web.json` | Passed. |
| Browser esbuild command, redirected to `/tmp` | Passed. Generated JavaScript matched checked-in `web/dist/app.js` byte for byte. |
| Strict standalone compilation of all CLI entry points | Passed using explicit CommonJS compiler options. |
| Documented `ts-node ts/generateTerrain.ts --list-themes` invocation | Failed with `ERR_MODULE_NOT_FOUND` on installed Node v26.5.0. |
| Same invocation with `--compiler-options '{"module":"CommonJS"}'` | Passed. |
| All five generators, seed 42 at 640×360 | Repeated calls produced identical SVG; each SVG rasterized successfully with installed Sharp. |
| Targeted runtime probes | Confirmed invalid dimensions, zero-width terrain nontermination, ignored building range, duplicate IDs, incorrect planet metadata, silent CLI success, and ineffective `--no-png`. |
| Interactive browser smoke check | Blocked: Chromium could not launch because sandbox socket operations were denied. |

There is no test script or checked-in automated test suite in the submodule. Browser races and embedding effects below are established by source inspection, not an interactive browser reproduction. This was a local source review, not a live-site assessment or dependency vulnerability audit. No claim is made about every Node version covered by the README's broad “18+” requirement.

## Architecture

The principal flows are:

```text
Browser fields → option builders → generate*Svg → inline preview / SVG download
                                                        └→ image + canvas → PNG

CLI argument parser → generate*Svg → filesystem SVG → Sharp → filesystem PNG

Generator libraries → shared RNG
Parent site embed loader → fetched HTML + global stylesheet + browser bundle
```

**Useful boundaries already present**

- Each art family has its own module and exports a function returning an SVG string plus metadata.
- The same core functions serve browser and CLI consumers.
- RNG state belongs to each generation call; fixed-seed output is repeatable for the tested inputs.
- Native PNG conversion is kept outside the art generators and is not imported by the browser controller.
- A TypeScript strict check and committed lockfile provide a useful baseline.

**Boundaries that need strengthening**

- Validation is fragmented among HTML attributes, browser option builders, CLI parsing, and occasional core clamps. No layer guarantees a valid configuration for every consumer.
- Four almost identical SVG builder classes separately own definitions, layers, and ID allocation. The background generator uses another implementation with randomly allocated IDs.
- Six CLI files repeat parsing, output naming, writing, PNG conversion, and error handling. Their behavior has already diverged.
- `web/app.ts` owns field descriptions, registry, DOM initialization, parsing, option conversion, preview state, and raster export. Its size alone is not a defect, but these responsibilities can be separated without changing the UI.
- The embedded application uses document-global element IDs and global CSS. This makes reuse and host-site integration fragile.

## Prioritized findings

### 1. High — invalid or excessive options can hang generation or exhaust resources

References: [terrain.ts](docs/assets/background-generator/ts/lib/terrain.ts:130), especially `mountainPath` at lines 183–201; [background.ts](docs/assets/background-generator/ts/lib/background.ts:357); [polygalaxy.ts](docs/assets/background-generator/ts/lib/polygalaxy.ts:207); [app.ts](docs/assets/background-generator/web/app.ts:302), numeric collection at line 438 and canvas allocation at line 368.

**Confirmed:** `generateTerrainSvg({ seed: 42, width: 0 })` failed to terminate within a bounded child-process probe and had to be terminated. In `mountainPath`, `x` starts at zero and advances by a random fraction of zero, so the loop never progresses. The terrain CLI accepts `--width 0` and reaches this code.

Every generator also accepted `width: NaN` and returned SVG containing `NaN`. Counts generally have no upper limits; several accept `Infinity`. The browser calls generation synchronously on the main thread, and its count/dimension fields generally have no maximum. Large finite values are enough to request huge strings, DOM trees, filter surfaces, or canvases through ordinary input.

HTML minimums help normal browser submissions but do not protect the CLI or public functions. `Math.max` is not a finite-number check, and rejecting only `NaN` still accepts infinity.

**Recommendation:** validate at the exported generator boundary. Require finite positive integer dimensions, bounded integer counts, valid seeds, and bounded total pixel/scene complexity. Reject invalid input before allocating or looping. Share this validation with adapters. After establishing limits, move potentially expensive browser generation into a worker with a cancellation strategy.

### 2. Medium — skyline building-count controls have no effect

References: [skyline.ts](docs/assets/background-generator/ts/lib/skyline.ts:354), lines 359–379 and 402–440; [app.ts](docs/assets/background-generator/web/app.ts:515); [generateSkyline.ts](docs/assets/background-generator/ts/generateSkyline.ts:133).

`resolveLayerPlans` reads `options.buildingsPerLayer` into `buildingRange`, then never uses it. Building creation fills the available width using hard-coded width ratios.

**Confirmed:** with seed 42 at 640×360, `[1, 1]` and `[100, 100]` both returned exactly the same SVG and reported 55 buildings. Both the browser's Buildings Min/Max fields and the CLI's documented range flags therefore promise behavior they do not provide.

**Recommendation:** decide whether density means an exact count or an approximate range, implement that contract in the core, and add a regression that changing the range changes the result. Enable unused-local checking to catch abandoned configuration such as `buildingRange`.

### 3. Medium — SVG IDs collide, including within a default generated background

References: [background.ts](docs/assets/background-generator/ts/lib/background.ts:303), ID allocation at line 324; [terrain.ts](docs/assets/background-generator/ts/lib/terrain.ts:94); equivalent builder classes in `polygalaxy.ts`, `skyline.ts`, and `botanical.ts`.

**Confirmed:** `generateBackgroundSvg({ seed: 1766 })` emits `id="wave-grad-7303"` twice with default options. Random numbers in a small range are not a uniqueness mechanism. SVG fragment references can consequently resolve to the wrong gradient.

The other builders avoid collisions within one SVG by using counters, but restart those counters for every render. Two terrain SVGs, for example, both define `sky-1`. Inline sibling SVGs therefore introduce duplicate IDs into their containing document. The current UI displays one scene at a time, so the sibling case principally affects the reusable library and future galleries.

**Recommendation:** use one shared builder with deterministic, monotonic IDs and an explicit caller-supplied instance namespace for inline composition. Test uniqueness within each SVG and across two instances. Keep namespace choice separate from the art RNG so allocating an ID does not alter scene geometry.

### 4. Medium — documented CLI startup is not reproducibly configured

References: [package.json](docs/assets/background-generator/package.json:1); [tsconfig.web.json](docs/assets/background-generator/tsconfig.web.json:1); [README.md](docs/assets/background-generator/README.md:16); [.vscode/launch.json](docs/assets/background-generator/.vscode/launch.json:1).

There is a browser compiler configuration, but no ordinary `tsconfig.json`, dedicated CLI configuration, or package scripts defining how to execute the CLIs. The README invokes `ts-node` directly with extensionless imports.

**Confirmed on Node v26.5.0:** the terrain theme-list command fails with `ERR_MODULE_NOT_FOUND`. Passing explicit CommonJS compiler options succeeds. The VS Code launch configurations already pass that override, so IDE and documented terminal execution follow different configurations.

**Recommendation:** choose and configure one Node module strategy, add CLI scripts and a CLI TypeScript configuration, and exercise those exact commands in CI. Declare the supported Node range and verify it. The browser build currently excludes `ts/generate*.ts`, so its success cannot establish CLI health.

### 5. Medium — malformed CLI arguments can report success or write invalid output

References: [generateTerrain.ts](docs/assets/background-generator/ts/generateTerrain.ts:51); [generateSkyline.ts](docs/assets/background-generator/ts/generateSkyline.ts:51); [generateAll.ts](docs/assets/background-generator/ts/generateAll.ts:33).

Parsers call `parseInt`/`parseFloat` without checking the complete token or finiteness. Missing values can consume a following flag, and unknown arguments only warn. Some validation in the batch CLI uses `Math.max`, which preserves `NaN`.

**Confirmed:** the compiled terrain CLI with `--count abc` exited zero without generating files. The skyline CLI with `--width oops --count 1 --height 90 --no-png` exited zero and persisted an SVG containing `NaN`.

**Recommendation:** extract a common parser or use a small argument-parsing library; reject malformed/missing values and unknown options with a nonzero exit status. Use the same core validation as the browser. Add CLI contract tests for malformed counts, zero width, missing values, and valid SVG-only output.

### 6. Medium — `--no-png` is unsupported by three generators despite the documentation

References: [README.md](docs/assets/background-generator/README.md:13); [generateBackground.ts](docs/assets/background-generator/ts/generateBackground.ts:87), conversion at line 125; [generatePolygalaxy.ts](docs/assets/background-generator/ts/generatePolygalaxy.ts:193); [generateTerrain.ts](docs/assets/background-generator/ts/generateTerrain.ts:147).

Background, polygalaxy, and terrain do not parse `--no-png` and always invoke conversion. Skyline, botanical, and the batch CLI support skipping conversion. Background and polygalaxy also do not skip conversion when scale is zero.

**Confirmed:** a small background CLI run with `--no-png` printed `Unknown argument: --no-png`, generated both SVG and PNG, and exited zero. This violates the documented way to avoid expensive PNG work.

**Recommendation:** give every CLI the same explicit `skipPng` flag and share artifact writing. Keep export enablement separate from export scale.

### 7. Medium — broad string dictionaries defeat intended type guarantees

References: [terrain.ts](docs/assets/background-generator/ts/lib/terrain.ts:37), theme selection at line 158; [polygalaxy.ts](docs/assets/background-generator/ts/lib/polygalaxy.ts:199); [app.ts](docs/assets/background-generator/web/app.ts:42), registry at line 165 and option builders at line 465.

Theme catalogs are annotated `Record<string, Theme>`, then option types use `keyof typeof THEMES`. This loses the finite set of valid keys: arbitrary strings are accepted by the type system. The browser registry has the same issue, so `GeneratorKey` does not restrict callers to the five actual generators. Casts from `Record<string, unknown>` assert correctness without validating it.

**Confirmed:** an unknown theme reaches each themed generator and throws an unrelated property-access error rather than a useful validation error. CLI membership checks also use `in`, which accepts inherited keys such as `constructor`.

**Recommendation:** preserve literal keys using `satisfies`, derive finite unions, validate dictionary lookups with own-property checks, and parse unknown values into typed options. Consider `noUncheckedIndexedAccess` and `noUnusedLocals`. Exported catalogs are also mutable shared objects; expose readonly configuration and avoid returning mutable references to internal catalog entries.

### 8. Medium — embedded application styles can alter the surrounding website

References: [styles.css](docs/assets/background-generator/web/styles.css:1); [background-generator-embed.js](docs/assets/background-generator-embed.js:47), injection at lines 63–75; [app.ts](docs/assets/background-generator/web/app.ts:219).

The parent loader inserts application HTML into the existing page and appends the stylesheet to the document head. The stylesheet targets `:root`, `body`, `main`, `form`, `label`, `button`, headings, and `strong` globally. It can change host margins, colors, layout, and controls outside the tool. The app also queries fixed IDs from the entire document rather than its own root.

This is a concrete scope mismatch visible in the code; the deployed visual impact was not browser-tested. The standalone HTML additionally references a theme stylesheet outside the submodule, so the advertised standalone preview has an implicit host dependency.

**Recommendation:** scope styles beneath a component root and initialize through `mount(root)` with local element queries. Use Shadow DOM or an iframe if stronger isolation is needed. Make the shared theme dependency explicit or provide a standalone fallback.

### 9. Medium — polygalaxy metadata reports requested planets rather than rendered planets

References: [polygalaxy.ts](docs/assets/background-generator/ts/lib/polygalaxy.ts:328), especially lines 339–347 and 371–409; result construction at line 191.

Orbit count is limited to two through four, and each orbit renders at most three planets. Unused allocation may be passed to later systems, but is discarded at the final system. Zero planets is also treated as a request for a random budget, and the budget is raised to at least the number of systems.

**Confirmed:** with seed 42, one system and `planets: 100`, with other count-driven layers disabled, the result reported `counts.planets === 100` while rendering four planet bodies. The returned counts are not a reliable description of the asset.

**Recommendation:** define whether this option is a target, maximum, or exact count. Respect explicit zero, allocate the required orbit capacity or reject impossible requests, and report actual rendered counts separately from requested settings.

## Additional code concerns

- **PNG load errors are collapsed into an optional-feature warning.** [svgExport.ts](docs/assets/background-generator/ts/lib/svgExport.ts:10) catches every import error, discards the cause, and returns `null`. An installed Sharp with a broken native dependency is indistinguishable from an intentionally absent package. CLI runs may exit successfully despite missing requested PNGs. Preserve the cause; distinguish optional absence from failed required export. Sharp is currently a regular dependency, despite documentation describing it as optional.
- **Asynchronous PNG export reads mutable global state after awaiting.** [app.ts](docs/assets/background-generator/web/app.ts:330) renders the old SVG but builds its filename from the current `lastGeneratedAsset`. Generating another scene while export is pending can label the old image with the new generator's name; completion/error messages can also refer to an obsolete scene. Capture an immutable asset before awaiting and associate export state with it. This is source-inspected, not browser-reproduced.
- **Generated artifacts have no automated consistency gate.** `web/dist/app.js` and its map are tracked. They matched a fresh build in this review, but there is no submodule test/CI gate to prevent future drift. Either publish generated output through the build or verify regeneration in CI.

`preview.innerHTML = result.svg` deserves an explicit trust contract, but the present browser form supplies numbers and fixed choices to internal generators. I did not establish a current user-input XSS exploit and would not report that sink alone as one. If external SVG, custom palettes, or arbitrary strings become inputs, revisit validation, escaping, and preview isolation before enabling them.

## Recommended implementation order

1. Add core option validation and resource limits; cover zero-width termination and malformed numeric input first.
2. Fix ignored skyline settings, SVG ID allocation, and planet-count semantics with small regression tests.
3. Configure CLI execution explicitly and consolidate parsing/export behavior, including `--no-png` and failure exit codes.
4. Preserve literal catalog keys and share the SVG builder; keep individual art algorithms in their own modules.
5. Scope the embedded UI, capture export state per asset, and separate browser form handling from raster export.
6. Add a compact CI gate: browser and CLI typechecks, deterministic generator checks, SVG parsing/raster smoke checks, and CLI contract tests. Add a browser test for generate/download once an appropriate browser environment is available.

The strongest code “no-gos” here are accepting unbounded input into synchronous loops, exposing controls that are ignored, using randomness to promise identifier uniqueness, and returning success after invalid or incomplete CLI work. These are observable reliability problems, not preferences about coding style.
