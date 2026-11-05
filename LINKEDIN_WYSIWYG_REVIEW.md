# LinkedIn WYSIWYG architecture and code review

Reviewed on 2026-11-05. Submodule: `docs/assets/linkedin-wysiwyg`, commit `8553ad560a6c73a39c5fef9e7da40f34e2fc4a56`.

## Assessment

**The current version needs correctness fixes before release.** Startup throws, formatting can change the meaning of text, and formatting changes cannot reliably be undone. These are more consequential than the choice of framework or file layout.

Vanilla JavaScript and static hosting are appropriate for this application. Keep that simplicity. The architectural priority is to define what text the application owns, what transformations are allowed to destroy, and how every editing command participates in selection and undo.

## Scope and verification

Reviewed all three source files (`app.js`, `index.html`, `styles.css`), the submodule file inventory, the parent site's English iframe page, application staging configuration, deployment workflow and site checks. The subrepo has no README, package manifest, test suite or CI configuration in the inspected checkout.

Validation performed:

- `node --check docs/assets/linkedin-wysiwyg/app.js` passed.
- Targeted Node VM checks executed the actual application code with a minimal DOM adapter. They reproduced missing-element failures, destructive normalization, incorrect line boundaries, prose deletion during list cleanup, retained formatting mode after normalization, and false clipboard success.
- After the user requested escalation, **Chromium 131.0.6778.204** ran successfully outside the sandbox against a temporary localhost server. The unmodified application threw during startup; entering `abc` updated the preview but left the character count at `0` and produced further exceptions.
- A separate diagnostic HTML response supplied only the missing `#output` and `#clear-editor` elements. With that workaround, Chromium confirmed broken undo, edits extending into an unselected line, deletion of prose by Clear markers, and false clipboard success when both copy methods fail. Successful Clipboard API copying also worked in this diagnostic page.

The diagnostic workaround existed only in the temporary test server; repository source was not patched. Later defects are therefore independently reachable issues once startup is repaired, rather than claims that the untouched page already completes those workflows. The standalone browser server did not supply the host site's external theme; this was a behavior review, not a visual verification of the deployed site. No LinkedIn account, live publishing, mobile browser, IME, screen reader or cross-browser testing was performed. No dependency vulnerability claim is made.

## Architecture

```text
Parent site: iframe -> staged static files
                         |
                     index.html
                         |
                     app.js
                     ├─ Unicode mapping tables + reverse mapping
                     ├─ format state + cached selection state
                     ├─ text/list/indent transformations
                     ├─ generated toolbar markup
                     ├─ DOM mutation + preview + statistics
                     └─ Clipboard API + legacy fallback

styles.css + host-relative ../../theme/risajef-theme.css
```

The textarea's transformed string is the document. There is no separate source text, style metadata or application-owned undo history. `formatState` describes a global typing mode, not the formatting of the current selection. Selection offsets are cached separately from the browser's textarea selection. Those choices create the main correctness problems below.

Good decisions worth retaining:

- No application backend or runtime JavaScript package dependencies are needed.
- Draft text is processed locally; no network transmission of the draft was found in the inspected JavaScript.
- Preview text uses `textContent`, and copying uses plain text. User input is not inserted into preview HTML.
- Unicode styles and lists are largely declared as data, rather than separate hardcoded event handlers for every alphabet.
- Code point iteration is already used in character transformations. The code does not simply split supplementary Unicode letters into surrogate halves there.
- The entry point is an ES module, so its top-level variables do not become ordinary `window` properties.

The main structural weakness is that the same 1,151-line module defines domain rules, owns mutable UI state, renders controls, edits the document and handles browser integration. Even pure transformations require evaluating a file that queries the DOM immediately and calls `init()` unconditionally. The HTML/JavaScript contract has already drifted enough to break startup.

## Findings

### 1. High — Missing DOM elements break startup and every view update

References: `app.js:9`, `app.js:17`, `app.js:866–872`, `app.js:1126–1139`; `index.html:24–78`.

The JavaScript requires `#clear-editor` and `#output`, but neither exists in the HTML. `bindEvents()` calls `addEventListener` on the null clear button and aborts initialization. Copy handlers are registered later, so the visible Copy output button never receives its handler. Editor handlers were already registered, leaving the application partly active.

Separately, `updateView()` writes `elements.output.value` before updating statistics. Typing updates the preview, then throws, leaving statistics stale. Adding only the missing clear button does not repair this second problem.

**Browser evidence:** startup raised `Cannot read properties of null (reading 'addEventListener')`; after typing `abc`, the preview contained `abc`, character count remained `0`, and additional page errors were recorded.

**Fix:** remove obsolete output dependencies or deliberately restore that element; align the clear-button behavior with actual markup. Validate required DOM references once during initialization and add a browser smoke check that types and copies while failing on any page error. Avoid scattered optional chaining that silently leaves essential controls broken.

### 2. High — Formatting silently destroys legitimate text

References: `app.js:4`, `app.js:225–238`, `app.js:441–469`, `app.js:517–535`, `app.js:591–601`, `app.js:965–975`.

Every formatting operation first calls `normalizeAscii()`. It treats any character found in a reverse style map as generated decoration, then applies compatibility decomposition and removes the entire U+0300–U+036F combining-mark block. The function has no evidence that the user generated those characters in this application.

**Reproduced using the actual functions:**

| Input | `normalizeAscii()` output | Consequence |
| --- | --- | --- |
| `Café Zürich naïve` | `Cafe Zurich naive` | Accents are removed. |
| `straße` | `straBe` | Ordinary German ß becomes uppercase B through the faux Greek reverse map. |
| `α β ρ σ` | `a β p o` | Some genuine Greek letters are converted to Latin lookalikes. |
| `🇨🇭 ❤️` | `CH ❤` | Flag indicators become letters and the emoji variation selector is removed. |

`formatText("straße")` in the default format also produces `straBe`, showing that the destructive step is part of normal formatting, not only the explicit Remove formatting action. In bold typing mode, entering or pasting accented text also runs through this pipeline.

**Fix:** preserve unsupported characters, natural-language diacritics, emoji selectors and regional indicators. Remove only effect marks explicitly supported by this editor. Keep lossy transliteration separate and explicit. Ambiguous faux alphabets cannot be safely reversed without provenance; either retain their source text/style information or stop offering automatic reversal for them. A single reverse map with “first entry wins” is not a valid reversible document model.

### 3. High — Formatting changes are outside a dependable undo history

References: `app.js:705–716`, `app.js:723–729`, `app.js:972`, `app.js:1098–1115`, `app.js:1126–1128`.

Formatting and list commands mutate the textarea with `setRangeText`; normalization and clearing assign `.value`. There is no application undo stack or transaction abstraction. Styled typing additionally cancels native insertion and performs a scripted replacement.

**Browser evidence, with the two missing elements supplied:** type `abc`, select it, click Bold. The value becomes `𝐚𝐛𝐜`; Ctrl+Z leaves it as `𝐚𝐛𝐜`. Thus the demonstrated formatting command cannot be recovered through the expected undo action. Other input methods and browsers need separate verification.

This is particularly serious alongside finding 2: a user can lose text distinctions without a working undo path.

**Fix:** route all document-changing commands through one history-aware editing boundary. Store text plus selection before/after each operation and implement undo/redo, including sensible grouping of typed text. Alternatively, adopt an editor abstraction with a verified transaction/history contract. Test keyboard undo and redo in the supported browsers rather than assuming scripted textarea edits behave like native typing.

### 4. Medium — Line-range calculations modify unselected text

References: `app.js:749–750`, `app.js:762–773`, `app.js:799–821`, `app.js:825–852`.

Textarea selections have an exclusive end offset. `getLineBoundaries()` searches for a newline at that end offset, so a selection ending immediately after a newline includes the following line.

**Browser evidence:** for `a\nb\nc`, select offsets `[0, 2)` (the first line and its newline) and apply bullets. The result is `• a\n• b\nc`; the unselected `b` line was edited too.

A second boundary problem occurs at offset zero when the document begins with a newline: `getLineBoundaries(0, 0)` returns `{start: 1, end: 0}`, an inverted range.

**Fix:** define nonempty line selections using `end - 1`, handle collapsed selections separately, and avoid searching position zero as though it precedes a caret at zero. Cover leading/trailing empty lines and selections ending exactly at a line boundary.

### 5. Medium — List cleanup deletes prose and moves indentation behind the marker

References: `app.js:153–157`, `app.js:810–817`.

`stripListPrefix()` accepts any alphabetic word followed by a period or closing parenthesis as a list marker. It also strips repeated matches, so multiple meaningful prefixes can disappear.

**Browser evidence:** Clear markers changes `Hello. world` to `world`. Applying another list style uses the same cleanup and therefore has the same deletion risk. The Node check also changed `1. 2. version` to `version`.

Indentation is retained in `cleanLine`, but the new marker is prepended before it. For example, `  1. nested` becomes `•   nested` when converted to bullets, moving the indentation after the bullet. That also defeats outdent detection, which expects spaces at the beginning of the line.

**Fix:** parse indentation, a narrowly recognized marker and body as separate fields. Preserve indentation before the replacement marker and remove at most the recognized marker. Do not infer that arbitrary sentence-opening words are alphabetic list labels. Where marker/prose ambiguity remains, use an explicit operation or stored list metadata.

### 6. Medium — Clipboard failures are reported as success

References: `app.js:943–962`.

When `navigator.clipboard.writeText()` rejects, the fallback calls `document.execCommand("copy")` but ignores its boolean result and always displays “Copied to clipboard.” The fallback also depends on the currently missing `#output` element. Exceptions raised within the catch block are not handled by another error path, and the click handler does not await or catch `copyOutput()`.

**Browser evidence, on the diagnostic page:** normal copying worked. Forcing the Clipboard API to reject and the legacy fallback to return `false` still produced “Copied to clipboard.”

**Fix:** make copying an adapter that returns a verified success/failure outcome. If using a temporary textarea fallback, own its creation and cleanup, inspect the command result, and catch fallback exceptions. On failure, preserve the draft and offer a clear manual-copy action.

### 7. Medium — Toolbar state reflects previous actions rather than selected text

References: `app.js:471–480`, `app.js:658–697`, `app.js:723–734`, `app.js:1008–1018`, `app.js:965–975`.

Selection changes update positions and button availability, but do not derive the current formatting state from the selected content. The Bold command toggles the global `formatState.bold`, even when the newly selected text is plain.

For example, after making one selection bold, selecting another plain word leaves Bold pressed. Clicking it toggles the global flag off and applies plain formatting to the second word instead of making that word bold. This follows directly from the state transitions; this particular sequence was not run in Chromium.

Remove formatting changes document text without resetting the typing state. The Node check confirmed that bold remains enabled afterward, so subsequent text can immediately acquire the formatting the user just removed.

**Fix:** define selection commands separately from the mode used for future typing. Either derive selection formatting, including mixed states, from a document model or expose explicit “apply style” commands. Define and test what Remove formatting means for the next insertion.

### 8. Medium — Styled insertion has no explicit composition/input-method contract

References: `app.js:1098–1115`.

Only `beforeinput` events whose `inputType` is `insertText` are transformed. There is no composition lifecycle handling or check of `isComposing`/`cancelable`. Composition input types are skipped, while other insertion paths may likewise bypass the style mode. Canceling and replacing text during an input-method session can also conflict with the browser's own editing lifecycle.

**Status:** source-level compatibility concern, not a reproduced IME failure. Desktop synthetic typing does not establish correct behavior for mobile keyboards, accent composition, dictation or CJK input.

**Fix:** specify which insertion paths must honor the current style. Preserve composition until commit, use the browser's supported cancellation semantics, and validate actual supported keyboards/input methods. Integrate these cases with the undo work rather than adding unrelated event-specific patches.

### 9. Medium — Formatting controls lack meaningful accessible names

References: `app.js:894–897`, `app.js:658–665`; `index.html:41`, `index.html:78`.

The four formatting buttons have `aria-pressed`, but their only names are decorative samples such as `𝐀𝐚` or combining-mark variants of `Aa`. There are no explicit labels naming Bold, Strikethrough, Underline and Double underline. Font options similarly use their own decorative transformed labels (`app.js:745–747`, `app.js:887–889`). This obscures the purpose of the control for assistive technology and makes identification depend on glyph interpretation.

The labeled editor and live toast are useful foundations. This finding is based on markup inspection; screen-reader output was not tested.

**Fix:** give each toggle a plain-language accessible name and keep decorative examples separate. Use readable style names for selection controls. Check names, pressed/disabled states and keyboard operation with assistive technology.

### 10. Medium — Verification misses the application's minimum runtime contract

References: subrepo file inventory; parent `scripts/check_site.py:24–54`; `.github/workflows/deploy-pages.yml:61–67`.

The subrepo has no automated checks. The parent deploy pipeline stages the application and runs site checks, but the inspected checks do not exercise this editor's runtime. JavaScript syntax is valid while its first initialization throws.

The DOM mismatch shows the practical cost: removed HTML controls still have mandatory JavaScript behavior and CSS attached to them, yet deployment checks can pass without detecting that contract violation.

**Fix:** add a small runtime smoke check that loads the actual HTML, fails on page errors, types text, formats a selection, checks statistics and copies output. Add focused pure-function tests for preservation of multilingual text, marker recognition and selection boundaries. Add browser undo/redo coverage; a test that merely repeats the implementation's expected mapping will not detect the underlying data-loss policy.

### 11. Low — Presentation and hosting assumptions are coupled and poorly documented

References: `index.html:11`; `styles.css:21–42`, `styles.css:50–72`, `styles.css:429–450`, `styles.css:522–526`; parent `scripts/build_tools.py:97–103`.

The supposedly independent subrepo references `../../theme/risajef-theme.css`, which is outside its checkout. The parent stages it into `/assets/apps/linkedin-wysiwyg/`, where that URL resolves to `/assets/theme/risajef-theme.css`; the existing built site contains that file. The standalone source checkout has no equivalent theme. This is an undocumented host contract, not evidence that the deployed theme is currently missing.

CSS also contains global `!important` overrides, disabled glow components followed by their old definitions, output-field styles for absent markup, and control/layout classes not used by the current generated toolbar. These make it harder to distinguish active design rules from leftovers.

**Fix:** document the supported deployment path and theme ownership or make the stylesheet dependency self-contained. Remove obsolete selectors after reconciling the HTML/JavaScript contract, and scope theme overrides instead of forcing universal rules. A short README should explain running, embedding and checking the application.

## Specific no-gos

The patterns to stop carrying forward are:

1. Silently treating real letters, diacritics and emoji as disposable formatting.
2. Claiming formatting is reversible while storing only a lossy transformed string.
3. Destructive editor commands without a working undo contract.
4. Allowing required HTML and JavaScript references to diverge without a runtime check.
5. Removing arbitrary prose with a broad “list marker” regular expression.
6. Reporting success after a copy operation returns failure.

There is no justification for calling vanilla JavaScript, static hosting or the existing `innerHTML` toolbar templates themselves no-gos. The inspected toolbar templates use internal configuration and escape displayed labels; draft preview content is written safely with `textContent`. No direct user-input-to-HTML injection path was found in this review.

## Recommended architecture and order of work

Start with the release blockers: reconcile DOM references, preserve user text, and establish undo/redo. Correct the range/list behavior and truthful clipboard outcomes before adding styles or more controls.

A proportionate module boundary would be:

| Responsibility | Contract |
| --- | --- |
| Unicode/style registry | Style definitions and explicitly supported conversions; no DOM access. |
| Text commands | Pure functions accepting text, selection and an operation; returning new text and selection. Preserve unrelated content. |
| Editor controller/history | One owner of the document, typing mode, selection and undo transactions. |
| View/browser adapters | DOM validation, controls, preview, statistics, clipboard and input-method integration. |

Native ES modules are sufficient. Keep a single document owner; introducing a second raw string beside the transformed one without range-aware synchronization would create another consistency problem. If reversible rich styling is a requirement, model source text plus styled ranges and derive exported Unicode from it. If retaining direct editing of the transformed string, explicitly limit reversibility and preserve ambiguous characters instead of guessing their origin.

Character statistics also need a named contract: `app.js:861` counts UTF-16 code units, so one generated bold letter counts as two. That is not automatically a LinkedIn-specific counting bug, because this review did not verify LinkedIn's current counting rules. Decide whether the UI means code units, code points, grapheme clusters or a verified destination limit, and test that definition.

A framework migration, backend or elaborate build system would not solve these defects. Small explicit editing contracts, dependable browser behavior and focused regression checks would.
