# Main repository architecture and code review

Date: 2026-11-05  
Baseline: `faa03e1` plus the current main-repository working tree.  
Scope: the parent website repository only. All 13 Git submodules listed in `.gitmodules` are excluded from implementation review. The parent's app staging, embedding, and deployment contracts are included because this repository owns them.

## Overall assessment

MkDocs, static hosting, Markdown content, and independently versioned applications are appropriate choices for this personal website. There is no architectural reason to rewrite it as a server application or a frontend framework project.

The weak point is the custom publishing system. It mixes source files, generated files, caches, mutable release assets, and deployment side effects in ways that make a successful build less trustworthy than it appears. Several problems are confirmed behavior, rather than hypothetical style objections.

The highest priorities are to stop runtime restoration from replacing tracked images, make asset installation and publication failure-safe, and remove automatic staging and committing from the deployment helper. After those, tighten the application artifact contract and add focused regression checks for the custom build code.

No critical remotely exploitable vulnerability was established. The high-priority findings concern source integrity, accidental publication, deployment correctness, and recovery. Security observations below identify trust boundaries; they do not assert that a submodule is malicious or currently vulnerable.

## Architecture as implemented

```text
Markdown + mkdocs.yml + theme
          |
          +-- hooks/auto_snippets.py
          |   collections, translation notices, tool lists,
          |   iframe fallback notes, SVG inlining, Mermaid cache adapter
          |
13 pinned app submodules -- scripts/build_tools.py --> docs/assets/apps/
          |
GitHub runtime-assets-v2 release -- scripts/runtime_assets.py
          |                           |
          |                           +--> models, audio, images, Z3
          v
MkDocs build --> scripts/finalize_site.py --> scripts/check_site.py
          |
          v
site/ --> GitHub Pages
```

The runtime release and Git checkout are independent inputs. The release is overwritten in place, and some of its restored files overlap with tracked content. Consequently, a Git revision and its dependency lockfiles do not completely identify the site that will be produced.

### What is already good

- Static hosting keeps deployment and operational needs modest.
- Submodule revisions and dependency lockfiles provide useful source and dependency boundaries.
- Node application builds use temporary source copies, avoiding direct build mutations in submodules.
- The explicit `EmbeddedApp` registry is more understandable than discovering build behavior dynamically.
- Content collection is performed in memory rather than rewriting Markdown during the build.
- Strict MkDocs builds and rendered checks cover several real compatibility requirements, including redirects and unlisted public pages.
- Runtime extraction uses a data filter and rejects obvious absolute and parent-traversal archive member names. The issue is incomplete validation and replacement behavior, not an absence of extraction safeguards.

## Findings by priority

| ID | Priority | Finding | Evidence |
| --- | --- | --- | --- |
| F1 | High | Runtime restoration replaces a directory containing tracked source images | Reproduced with temporary fixture |
| F2 | High | Deployment helper stages all changes and does not bind publication to the intended revision | Code inspection and mocked command trace |
| F3 | High | Runtime publication deletes live assets before replacement is complete | Code inspection |
| F4 | Medium | Runtime installation can fail after replacing some destinations | Reproduced with temporary fixture |
| F5 | Medium | Runtime manifest does not require complete payload coverage | Reproduced with temporary fixture |
| F6 | Medium | Application publishing copies source trees using a short denylist | Reproduced with temporary fixture |
| F7 | Medium | Application cache accepts missing output dependencies | Reproduced with temporary fixture |
| F8 | Medium | Deployment instructions promise an absent push trigger | Direct configuration mismatch |
| F9 | Medium | Custom build logic lacks focused regression coverage and automatic source-change validation | Main-repository configuration inspection |
| F10 | Medium | Embedded applications share the site's execution and storage trust boundary | Parent integration code inspection |
| F11 | Medium | Mutable runtime release prevents reliable historical rebuilds | Release producer and consumer inspection |
| F12 | Low | Base-tag injection silently fails for valid single-line HTML | Reproduced with temporary fixture |
| F13 | Low | Hook responsibilities and integration details are overly concentrated | Structural inspection |
| F14 | Low | Development configuration and maintenance instructions have drifted | Direct configuration mismatches |

### F1 — Runtime restoration can erase or roll back tracked images

References: [scripts/runtime_assets.py:16](scripts/runtime_assets.py#L16), [scripts/runtime_assets.py:98](scripts/runtime_assets.py#L98), [.github/workflows/deploy-pages.yml:49](.github/workflows/deploy-pages.yml#L49).

`RUNTIME_PATHS` includes all of `docs/assets/images`. That directory also contains Git-tracked article images and the portrait. Installation removes each destination directory with `shutil.rmtree()` and copies the release's version into its place.

A fresh checkout can therefore contain the correct committed image, only for runtime restoration to replace it with older release bytes or delete it because it is absent from the archive. Locally, this also overwrites working-tree changes. Checksums can pass throughout: the wrong ownership boundary is the problem.

**Confirmed:** installing a synthetic archive deleted a pre-existing image absent from the archive. All operations used a temporary project root.

**Fix:** remove tracked source images from runtime asset ownership. Store generated Mermaid images in a dedicated generated directory, and restore only that directory if restoration is necessary. Add an invariant that runtime destinations cannot overlap Git-tracked source paths.

### F2 — Deployment helper commits unrelated work and can publish another revision

References: [scripts/deploy.py:11](scripts/deploy.py#L11), [.vscode/tasks.json:49](.vscode/tasks.json#L49).

The helper runs `git add -A`, commits everything staged with a generic message, pushes the local `main` ref, and dispatches the workflow without an explicit ref. It does not check the current branch, staged file selection, submodule publication status, or the commit that the workflow will build.

If invoked on a feature branch, it can commit that branch's changes while pushing a different local `main`. Dispatch then uses the workflow's default ref. Even on `main`, unrelated untracked reports and changed submodule pointers may be swept into the commit. A pointer to a submodule commit unavailable remotely can make CI checkout fail.

**Confirmed:** a mocked subprocess trace verified the unconditional staging and unqualified push/dispatch sequence. No real Git mutation, push, or workflow dispatch was performed.

**Fix:** keep committing explicit and separate from deployment. Deploy a clean, already committed revision; verify the branch and remote availability, dispatch the intended ref, and report the workflow run rather than declaring deployment successful immediately after dispatch. Direct pushes to `main` can remain the project's policy.

### F3 — Publishing runtime assets can remove the working release on failure

References: [scripts/publish_runtime_assets.py:60](scripts/publish_runtime_assets.py#L60), [.github/workflows/deploy-pages.yml:53](.github/workflows/deploy-pages.yml#L53).

The publisher deletes the existing archive before uploading its replacement, then separately deletes and replaces the checksum. Deletion failures are ignored, and deletion stderr is suppressed. A failed upload can leave the required archive missing; a failure between uploads can leave a new archive paired with the old checksum. A build starting during replacement can observe the same inconsistent states.

The checksum check correctly makes CI fail in those cases, but the required build input has already been disrupted.

**Fix:** publish a complete archive/checksum pair under a new immutable version, verify it, and only then update the consumer's version in Git. Retain the previous release for recovery. Merely removing the explicit delete does not make a two-file replacement atomic.

### F4 — Runtime installation is not failure-safe

Reference: [scripts/runtime_assets.py:98](scripts/runtime_assets.py#L98).

Required directories are checked inside the same loop that deletes and replaces destinations. If a later required directory is missing, earlier directories have already been replaced. Copy failures can likewise leave partial destinations after deleting their previous contents.

**Confirmed:** an archive containing only the first required directory replaced that destination before installation failed on the second directory.

**Fix:** validate the entire layout before changing any destination. Prepare complete replacement directories first, then switch them with backups and rollback on failure. Apply the same prepare-then-publish principle to `replace_with_source()` in the app builder.

### F5 — Manifest verification does not establish that all installed files were checked

References: [scripts/runtime_assets.py:119](scripts/runtime_assets.py#L119), [scripts/runtime_assets.py:86](scripts/runtime_assets.py#L86).

`validate_manifest()` verifies entries that appear in `manifest.files`; it does not require every extracted payload file to appear there. An empty `files` mapping is accepted. Manifest paths also do not receive the same containment validation as archive member names, and files outside the intended runtime roots are not rejected as a layout error.

**Confirmed:** a synthetic archive with an empty hash mapping and unlisted payload files installed successfully.

The separately downloaded archive checksum remains useful transport-integrity verification. This finding does not mean a network attacker can bypass it. It means the internal manifest does not enforce its apparent per-file integrity contract, particularly for direct local installation.

**Fix:** require exact agreement between allowed payload files and manifest entries, validate relative contained paths and hash format, and reject unsupported member types and duplicate paths. Keep the outer checksum as a separate check.

### F6 — Source-tree copying is too broad a publication contract

References: [scripts/build_tools.py:19](scripts/build_tools.py#L19), [scripts/build_tools.py:139](scripts/build_tools.py#L139), [scripts/build_tools.py:178](scripts/build_tools.py#L178), [scripts/build_tools.py:188](scripts/build_tools.py#L188).

COPY applications publish their source tree minus a few directory names. Background Generator and Parallelismus also publish their temporary source tree after building. `.env`, tests, configuration, caches, and other source-only files are not excluded by that contract. Local copying includes untracked files; CI copying can include any such files committed upstream.

**Confirmed:** the parent COPY path published a synthetic `.env` and a `tests/` directory. No real secret was searched for or disclosed, and no current secret exposure is asserted. The check proves that the publication boundary permits it. Individual hosting behavior may further affect whether a particular dotfile is served.

**Fix:** declare a deployment output directory or explicit runtime file allowlist for every app. Static source apps can use a small explicit set of files and directories. Validate the finished artifact before it enters `docs/`.

### F7 — Cache freshness is confused with output completeness

References: [scripts/build_tools.py:131](scripts/build_tools.py#L131), [scripts/build_tools.py:198](scripts/build_tools.py#L198), [scripts/build_tools.py:204](scripts/build_tools.py#L204).

The cache compares source fingerprints and checks only the entry HTML file. It does not verify required JavaScript, CSS, worker, or data files. Deleting or corrupting those outputs leaves the source fingerprint unchanged, so a broken bundle may be reused.

**Confirmed:** after staging a fixture app, deleting its `app.js` still resulted in “deployment is up to date.”

The fingerprint also omits runtime/toolchain versions and silently continues on file read errors. These weaken the claim that a fingerprint represents all build inputs, although no toolchain-specific output failure was reproduced.

**Fix:** store an output manifest with hashes or at least required runtime paths, and invalidate incomplete artifacts. Include material toolchain inputs and fail on unreadable source inputs. Build fresh artifacts outside the publish directory and swap them only after validation.

### F8 — Following the documented push procedure does not trigger deployment

References: [README.md:15](README.md#L15), [.github/workflows/deploy-pages.yml:3](.github/workflows/deploy-pages.yml#L3).

The README says a push to `main` deploys automatically and repeats that assumption in runtime-refresh instructions. The workflow declares only `workflow_dispatch`.

**Fix:** choose one intended behavior. Add the push trigger if automatic deployment is desired, or document manual dispatch consistently. Avoid a helper that dispatches a duplicate run if push deployment is enabled.

### F9 — Custom build infrastructure has a narrow verification boundary

References: [package.json:7](package.json#L7), [scripts/check_site.py:24](scripts/check_site.py#L24), [.github/workflows/deploy-pages.yml:3](.github/workflows/deploy-pages.yml#L3), [.github/workflows/dependency-audit.yml:3](.github/workflows/dependency-audit.yml#L3).

`npm test` is the full build, including submodule builds. The parent repository has no focused regression suite for the destructive restore paths, manifest validation, output caching, or deployment command selection. Its rendered checker validates metadata on four selected pages plus redirect, unlisted-page, and Mermaid contracts. It does not exercise browser execution or validate the complete dependency graph of embedded applications.

The deployment workflow is manually triggered; the audit is scheduled or manual. Neither provides source-change validation automatically. This is a verification gap even if direct pushes are intentionally allowed.

**Fix:** add small fixture-based tests for F1–F7 and F12, and a separate non-deploying check workflow. Retain the useful rendered checks; add local asset existence checks and a few browser smoke checks for the parent's embedding contracts. Avoid requiring every submodule's full test suite merely to test a parent utility.

### F10 — App embedding is presentation separation, not execution isolation

References: [docs/assets/background-generator-embed.js:59](docs/assets/background-generator-embed.js#L59), [docs/assets/buchfalten-embed.js:1](docs/assets/buchfalten-embed.js#L1), [docs/assets/parallelismus-embed.js:1](docs/assets/parallelismus-embed.js#L1), [docs/tools/office.en.md:13](docs/tools/office.en.md#L13).

Three adapters fetch application HTML, inject it into the parent DOM, and load application scripts and styles into the page. This couples global styles, IDs, browser state, and lifecycle behavior to the website. Removing `<script>` elements from fetched markup is not sanitization of all active HTML, and the adapters intentionally execute app scripts anyway.

Other apps use unsandboxed same-origin iframes. Those improve DOM/style separation but still share the origin and can access parent DOM and origin storage. This matters for a collection of tools that may handle user documents. No exploit or application vulnerability was tested here.

**Fix:** explicitly document whether all apps are trusted as part of the website. Standardize ordinary presentation embedding on iframes where practical. If actual isolation is required, use separate origins and a narrow messaging contract; do not assume a same-origin iframe or a cosmetic sandbox attribute establishes that boundary. Test clipboard, file, download, and worker behavior before changing permissions.

### F11 — Runtime releases are mutable state outside the source revision

References: [scripts/publish_runtime_assets.py:19](scripts/publish_runtime_assets.py#L19), [scripts/publish_runtime_assets.py:60](scripts/publish_runtime_assets.py#L60), [.github/workflows/deploy-pages.yml:53](.github/workflows/deploy-pages.yml#L53), [refactor_plan.md:30](refactor_plan.md#L30).

Every revision consumes the same overwriteable `runtime-assets-v2` release name. The archive and checksum change together outside Git. Rebuilding an older commit can use different assets or fail because the current audio cache no longer satisfies that revision. The checksum verifies the downloaded bytes against the release's current checksum, not against the historical source revision.

The existing maintenance plan explicitly accepts trust in the single maintainer's release. That is a reasonable security assumption, but it does not provide historical reproducibility or dependable rollback.

**Fix:** commit an immutable runtime release identifier and expected digest alongside the source. Record relevant generation inputs in the runtime manifest. Keep content-addressed audio/model objects reusable across versions if archive size makes full versioned bundles expensive.

### F12 — Base-tag insertion silently skips valid HTML

Reference: [scripts/build_tools.py:246](scripts/build_tools.py#L246).

The helper checks for `<head>` but performs replacement only on `<head>\n`. A valid document with `<head><title>…` passes the check, is written unchanged, and is treated as success.

**Confirmed:** a single-line HTML fixture produced no base tag and no error.

This is a latent helper bug; it is not a claim that a currently checked-in submodule build produces that format.

**Fix:** insert after a reliably recognized opening head element, support existing base elements deliberately, and assert the desired resulting base URL. Add fixtures for minified HTML and alternate newline formats.

### F13 — One hook owns too many independent integrations

References: [hooks/auto_snippets.py:54](hooks/auto_snippets.py#L54), [hooks/auto_snippets.py:79](hooks/auto_snippets.py#L79), [hooks/auto_snippets.py:119](hooks/auto_snippets.py#L119), [hooks/auto_snippets.py:181](hooks/auto_snippets.py#L181), [hooks/auto_snippets.py:621](hooks/auto_snippets.py#L621).

The roughly 700-line hook handles content discovery, Git ordering, translation metadata, Markdown rewriting, navigation labels, HTML fallback generation, SVG processing, and a Mermaid plugin adapter. Global project paths and plugin-internal mutations make lifecycle ordering part of its implicit contract.

Specific maintenance hazards include parsing YAML front matter with regular expressions, replacing every local SVG despite a Mermaid-specific docstring, and depending on `processor.image_generator` and an overridden underscored plugin method. These are manageable with pinned dependencies, but deserve explicit boundaries and integration checks.

**Fix:** retain thin MkDocs lifecycle callbacks and move content collection, front-matter parsing, Mermaid integration, and embedding presentation into cohesive modules. Use the existing YAML parser for front matter. Keep plugin-specific adaptations in one adapter with a narrow compatibility test. Cache Git timestamps per build if profiling shows repeated subprocess calls matter.

### F14 — Configuration and operator guidance have drifted

References: [pyproject.toml:6](pyproject.toml#L6), [pyproject.toml:30](pyproject.toml#L30), [refactor_plan.md:1](refactor_plan.md#L1), [.codex/add-tool-workflow.md:17](.codex/add-tool-workflow.md#L17), [scripts/check_site.py:17](scripts/check_site.py#L17), [scripts/finalize_site.py:64](scripts/finalize_site.py#L64).

- Production requires Python 3.11, while formatting and mypy target 3.12. Mypy points at `src tests`, which are not the parent implementation locations.
- The old refactor status calls the deployment reproducible and references runtime-assets-v1 and ten apps; current code uses v2 and thirteen apps.
- The add-tool note still suggests `/assets/NAME/` rather than the staged `/assets/apps/...` route and omits the required app registry update and source exclusion.
- The rendered checker hardcodes site identity separately from `mkdocs.yml`.
- Redirect target normalization is duplicated in producer and checker, so shared mistakes can pass verification.

**Fix:** align Python tooling with the supported interpreter and actual code paths, update the operator notes, and distinguish configurable values from intentionally independent expected contracts. Use explicit expected examples to test redirect normalization instead of relying only on duplicated algorithms.

## Code practices to stop

These are the concrete “no-gos” in this repository, ordered by practical impact:

1. Deleting source-owned directories while installing generated/runtime assets.
2. Combining deployment with unconditional staging and generic commits.
3. Deleting a required published artifact before its replacement is available.
4. Publishing arbitrary source-tree contents through a small denylist.
5. Treating a source fingerprint plus `index.html` existence as proof of a valid application bundle.
6. Accepting a per-file integrity manifest without checking that it covers the payload.
7. Leaving build-tool edge cases untested while treating a full site build as the sole test interface.

Plain subprocess argument lists, static hosting, direct pushes under the documented single-maintainer policy, and submodules themselves are not no-gos.

## Practical improvement order

### First: protect source and release integrity

- Separate tracked images from generated runtime assets.
- Validate complete runtime bundles before changing local files.
- Replace mutable release uploads with complete versioned releases.
- Make deployment consume an explicit committed revision without auto-committing.
- Resolve the README/workflow trigger mismatch.

### Next: make published artifacts explicit

- Give every app a declared runtime output layout.
- Build and validate outside `docs/`, then publish the completed result.
- Validate output files when reusing the cache.
- Add regression fixtures and an automatic non-deploying verification workflow.

### Then: reduce integration maintenance

- Split the hook by responsibility while preserving its public behavior.
- Consolidate tool route/build metadata enough to prevent the registry, navigation, exclusions, and instructions drifting independently.
- Standardize embedding behavior and document its trust model.
- Align developer tools and refresh the outdated maintenance notes.

Keep MkDocs and the static architecture. A small amount of disciplined artifact handling and targeted testing addresses the main risks without introducing a new framework or service.

## Verification performed and limits

Performed:

- Read parent-owned Python scripts, the MkDocs hook and configuration, theme template, JavaScript embedding/RSS adapters, package manifests, workflows, and operating instructions.
- Identified the 13 excluded submodules from Git gitlinks and `.gitmodules`; did not review their implementation.
- Ran `.venv/bin/python scripts/check_site.py` against the existing local `site/` output. It passed its four-page metadata, redirect, unlisted-page, and Mermaid checks. This is not evidence of a fresh build.
- Parsed the parent scripts and hook successfully with Python's AST parser.
- Ran isolated temporary fixtures confirming tracked-image replacement behavior, partial restore on failure, acceptance of unlisted archive payload, broad source copying, stale output reuse, and silent base-tag insertion failure.
- Mocked the deployment helper's subprocess interface to inspect its command selection without changing Git state or contacting GitHub.

Not performed:

- No fresh full build: it would rebuild excluded apps and potentially regenerate source-tree assets. Findings above are based on parent code and controlled fixtures.
- No live deployment, release upload/download, dependency installation, or Git modification.
- No browser interaction/accessibility audit, submodule security audit, or current vulnerability database audit. Dependency versions are not declared vulnerable merely because of age or naming.

Only this report was added. Existing submodule changes and review documents were left untouched.
