# Buchfalten architecture and code review

Reviewed on 2026-11-05. Submodule: `docs/assets/buchfalten`, commit `a1676628dfa78c097ca879758a9346c3619b6138`.

## Assessment

The application is small enough that vanilla JavaScript and static hosting are appropriate. Its module split is a useful starting point. The main weakness is correctness across the full workflow: selected input, asynchronous rendering, physical geometry, preview and downloadable instructions do not share a sufficiently explicit contract.

I would address the high-priority findings before treating generated instructions as dependable. A framework migration or backend would not resolve these problems.

## Scope and evidence

Reviewed all submodule source files, its README, the parent site's embedding script, page configuration and staging declaration. The active entry point is `app.js`; `main.js` is not referenced by the inspected entry points.

Ran targeted Node checks against the actual analysis/PDF modules and the application controller with mocked DOM, image loading and PDF output. These reproduced the state races, stale download, duplicate PDF generation, fractional column behavior, segment selection, dropped PDF metadata, PDF renumbering and scaling described below. These are focused checks, not an existing regression suite.

A Chromium launch failed under the execution sandbox (`setsockopt: Operation not permitted`). Browser interaction, canvas rendering fidelity, real font loading and printed output were therefore not verified. This review does not assert that jsPDF has a particular current vulnerability; no dependency advisory audit was performed. Application source was left unchanged.

## Architecture

Current flow:

```text
index.html / parent-site embed
    -> global CONFIG + global window.jspdf
    -> app.js: DOM events, state, scheduling, source ownership, results, PDF lifecycle
        -> fonts.js -> Google Fonts
        -> textRenderer.js -> canvas -> blob URL
        -> analysis.js -> shared DOM canvas -> pixel regions -> selected fold segments
        -> preview.js -> canvas
        -> pdf.js -> jsPDF -> blob URL
```

Positive aspects:

- Local image processing avoids requiring an image-upload service.
- Native ES modules separate font loading, text rasterization, analysis, preview and export.
- Several analysis helpers already accept plain data and are straightforward to test.
- Successful preview replacement revokes old PDF object URLs.
- The application needs little deployment infrastructure.

The boundaries remain incomplete. `analysis.js` reaches into the document for a fixed canvas ID; modules read an undeclared global `CONFIG`; `pdf.js` depends on `window.jspdf` and receives the whole controller state. `app.js` owns most lifecycle decisions, while the DOM's classes and file input indirectly represent mode and source state. This makes operations difficult to validate independently and asynchronous results difficult to associate with the input that produced them.

## Findings

### 1. High — Old analysis results can overwrite newer results

References: `app.js:147`, `app.js:171`, `app.js:174`.

Each submission creates an independent `Image`. Its load callback writes shared state without checking whether its request is still current. Debouncing submissions does not prevent work already in progress from completing later. Metadata is also read from live text/font controls inside the callback, so it can describe different inputs from the captured artwork.

**Reproduced:** submit for 210 mm, then 300 mm; complete the newer image first and the older image second. Final state returns to 210 mm.

**Fix:** capture an immutable input snapshot and generation ID. Commit results only if that generation is current; invalidate it immediately when relevant input changes. Build metadata from the snapshot.

### 2. High — Clearing text or uploading an image does not invalidate a pending text render

References: `app.js:121`, `app.js:328`, `app.js:356`, `app.js:370`, `app.js:397`.

The text job counter advances only when starting a nonempty render. Clearing text and uploading a file do not advance it. A pending font/text operation can consequently finish after either action, restore its old artwork and clear the uploaded file input.

**Reproduced:** start a text render, clear text before its promise resolves, and let the original render complete. The old text artwork returns.

**Fix:** invalidate pending work on every source transition, including empty text, upload and mode change. Make blob ownership explicit so discarded jobs release their resources.

### 3. High — Visible mode does not determine the analyzed source

References: `app.js:61`, `app.js:69`, `app.js:438`.

Mode buttons change styling and visibility. `resolveArtworkSource()` always prefers `state.textArtUrl`, regardless of the selected mode. Uploading clears the text source, so switching back to Text can also continue analyzing the uploaded image until another text render occurs.

**Reproduced:** with existing text artwork, click Image mode. Source resolution still returns the text blob.

**Fix:** store `mode` and separate source records in application state. Resolve artwork strictly from that mode, and show an empty state if it has no valid source.

### 4. High — Old instructions remain downloadable after input becomes invalid

References: `app.js:151`, `app.js:162`, `app.js:167`, `app.js:186`, `app.js:196`, `app.js:517`.

Starting a run, validation failures, missing sources and image-load errors do not consistently reset previous results or disable the download. Clearing text also returns without resetting the generated instructions. PDF-generation failures can similarly leave an old download in place.

**Reproduced:** generate a successful PDF, then fail the next image load. The link still targets the previous PDF.

**Impact:** the controls or error message can describe the latest input while the download belongs to an earlier one.

**Fix:** track explicit empty/processing/ready/error states and associate results with an input revision. Disable export whenever the current revision lacks a successful result. If retaining previous output, label it explicitly with its original inputs.

### 5. High — PDF silently changes physical scale

References: `js/pdf.js:78`, `js/pdf.js:248`, `index.html:136`.

Portrait A4 provides 259 mm of vertical track space. Taller books are fitted into that space without a scale warning or exact numeric start/end measurements for each fold. The UI permits heights up to 400 mm.

**Reproduced:** for a 400 mm book, a 50 mm segment is drawn 32.375 mm high. The PDF labels the overall book height, but does not state the reduction factor.

**Impact:** someone measuring the printed template directly receives incorrect physical distances. Numeric axis interpretation remains possible, but the file should not leave the intended measuring method ambiguous.

**Fix:** provide true-size tiled output or explicit measurements per fold. If a schematic is scaled, prominently state the scale and supply a calibration ruler and printing instructions.

### 6. Medium — Validation is bypassed and resource usage is unbounded

References: `app.js:81`, `app.js:157`, `js/analysis.js:60`, `js/analysis.js:103`, `config.js:48`.

Automatic analysis dispatches a synthetic submit event, bypassing the form's normal constraint-validation path. The handler only requires a finite positive column count. It does not enforce integer columns, configured bounds, valid book height or threshold ranges. File acceptance is not checked against the configured list, and image dimensions/pixel counts have no budget.

**Reproduced:** a column count of 2.5 produces three columns. Other invalid inputs can produce invalid dimensions or excessive work.

The analysis canvas scales with original image height and book aspect ratio, then pixel scanning and PDF generation run synchronously on the UI thread. For illustration, a 10,000-pixel-tall image at a 1,200/80 book aspect ratio implies a 150,000 × 10,000 canvas: roughly 6 GB for one RGBA buffer before other allocations. Actual browser behavior depends on its limits.

**Fix:** validate at the analysis boundary, enforce finite positive physical dimensions and bounded integer columns, cap decoded/rasterized pixels, and choose analysis resolution independently of raw image size. Consider a worker after resource limits are defined.

### 7. Medium — A successful run generates the PDF twice

References: `app.js:184`, `app.js:225`, `app.js:295`.

`renderResults()` generates and attaches a PDF; the subsequent `maybeAutoPreview()` immediately repeats the same work for nonempty results.

**Reproduced:** one successful image load invokes PDF construction twice.

**Fix:** give one function responsibility for export generation. Generate once per accepted result or on download. This matters because PDF work runs synchronously.

### 8. Medium — PDF metadata is accepted and then dropped

References: `js/pdf.js:41`, `js/pdf.js:60`, `js/pdf.js:161`.

`createPdfDocument()` passes text, font and filename into `createPdfLayout()`, but that function omits these fields from its returned layout. Header rendering reads them from the layout, so those header branches never receive the supplied metadata.

**Reproduced:** supplied marker text, font and filename never reach PDF text drawing calls.

**Fix:** preserve a typed/documented metadata object through the export boundary. Allocate header space according to its content: simply restoring the existing fields would place some lines below the current 28 mm track start.

### 9. Medium — Physical geometry and fold selection need an explicit domain contract

References: `README.md:13`, `config.js:6`, `js/analysis.js:34`, `js/analysis.js:230`, `js/pdf.js:284`.

Several policies are implicit or inconsistent:

- The README states width = pages × 0.25 mm; runtime uses 1.0 mm, a fourfold difference for the same count. This review cannot establish which physical convention is intended.
- Images are fitted to the physical book aspect ratio, then their horizontal active range is stretched over all requested columns. This can undo horizontal containment and change artwork proportions. Metadata continues reporting the full canvas width, hiding the crop in the summary.
- `balanceSegments()` keeps only one segment per column, alternating among bands with a global cursor. **Reproduced:** two bands in every column become alternating top-only and bottom-only segments. This may be an intentional folding technique, but it is lossy and undocumented.
- PDF export independently trims empty edge columns and renumbers them. **Reproduced:** an input column numbered 7 prints as 1 after trimming. This loses correspondence to the preview's original indices.

**Fix:** define whether counts mean leaves, numbered pages or foldable columns; define effective folded thickness, fit/crop policy, blank-page handling and multi-band allocation. Preserve a canonical fold plan and original indices across preview and export. Treat lossy allocation as an explicit planning step with visible limitations.

### 10. Medium — Font loading has fragile input and failure handling

References: `js/fonts.js:12`, `js/fonts.js:99`, `js/fonts.js:107`, `js/fonts.js:132`.

Free-form font names are interpolated directly into a CSS selector and font descriptor. Quotes or selector syntax can break lookups; URL construction only replaces spaces instead of encoding the family value. The advertised timeout applies to the final width probe, after stylesheet/font promises have already been awaited.

On stylesheet failure, the cache entry is deleted but the failed link remains. A retry finds that link and treats it as ready, potentially rendering a fallback font as if the requested font had loaded.

**Fix:** avoid interpolated selectors, encode URL parameters, bound the complete loading operation and remove failed links. Record whether rendering used the requested font or a fallback. These are robustness issues; this review does not establish an XSS exploit.

### 11. Medium — Duplicate implementations and hidden dependencies invite drift

References: `main.js:1`, `main.js:694`, `index.html:224`, `js/analysis.js:27`, `js/pdf.js:7`.

The unused roughly 1,100-line `main.js` duplicates the active modules and already contains different layout/metadata behavior. A maintainer can reasonably patch the wrong implementation. Utility functions are also copied despite `js/utils.js` existing.

The active modules rely on global configuration and browser state; the parent embed must separately arrange configuration and jsPDF loading after stripping scripts from fetched HTML. These dependencies are operational knowledge rather than explicit module interfaces.

**Fix:** remove the inactive implementation once compatibility is confirmed, consolidate helpers, export/import configuration, and pass dependencies at initialization. Expose `mount(root, dependencies)` with cleanup for event listeners and object URLs instead of relying on module evaluation and document-wide IDs.

### 12. Medium — No submodule regression suite protects the physical output

There are no tests, test commands, dependency manifest or CI configuration in the checked-out submodule. The parent site's build checks do not establish the correctness of folding geometry or asynchronous state transitions.

**Fix:** prioritize tests for the reproduced races, output invalidation, dimensions, segment bounds, blank artwork, multi-band allocation and original page-index preservation. Add a small browser smoke test for font/image input and PDF download, plus representative PDF geometry checks. Avoid screenshot-heavy coverage of cosmetic details.

## Lower-priority observations

- Configuration is repeated in HTML and JavaScript: height maximum is 400 in HTML versus 259 in `CONFIG`. Some configured limits and accepted types are not enforced.
- The "immutable" configuration leaves its arrays mutable. `activeRange` is declared twice in the analysis result object. Both are maintenance issues rather than the main defects.
- The standalone HTML requests a theme stylesheet outside the subrepo, despite the README describing running the subrepo alone. The parent embed supplies its own surrounding page styling; standalone portability needs its own check.
- The page declares English while most interface text is German. Status updates lack live-region announcements, and the mode controls do not expose selected state through ARIA.
- jsPDF is version-pinned on a CDN but lacks subresource integrity. Google Fonts is another runtime network dependency. Document these availability/privacy dependencies and consider vendoring the required assets. No current exploitability conclusion is made here.
- The active controller uses constant HTML snippets and text setters for inspected user labels. I found no obvious direct user-input-to-`innerHTML` path in that controller. This is not a complete security audit.

## Suggested repair sequence

1. Fix source/mode state, request invalidation and stale downloads together. Add regression tests for these transitions.
2. Define physical units and a canonical fold plan; settle multi-band and cropping policies. Lock those rules down with small deterministic fixtures.
3. Correct PDF scale communication, measurements, numbering and metadata. Remove duplicate generation.
4. Enforce input and rasterization budgets; make font failures bounded and explicit.
5. Delete the inactive implementation, make dependencies explicit and add a scoped mounting API only as needed by embedding.

A suitable target flow is `validated input snapshot -> bounded raster -> detected regions -> explicit fold planning policy -> immutable fold plan -> preview / PDF`. Both renderers should consume the same plan, and only the current input generation should be allowed to publish it.
