# Usage

Use a recursive checkout so the thirteen pinned embedded applications are present.
Python 3.11 and Node.js 22 are the deployment toolchain.

- `npm ci`
- `apt-get install libasound2`
- `uv sync --frozen`
- `npm run restore-runtime-assets`
- `npm run build-tools`
- `npm run check-site`
- `PATH="$PWD/node_modules/.bin:$PATH" uv run mkdocs serve`

# Deploying to GitHub Pages

Deployment is manual. For changes that do **not** affect Piper audio, commit
the intended source changes and their lockfiles, then push:

```bash
git add <changed-files>
git commit -m "Describe the change"
git push origin main
.venv/bin/python scripts/deploy.py
```

For a change that affects a spoken page or the TTS configuration, refresh the
runtime-assets release first using the procedure below, then run the same
commit, push, and dispatch commands. The [Deploy GitHub Pages](.github/workflows/deploy-pages.yml) workflow then
checks out submodules, installs the locked Node and Python dependencies,
restores the exact release archive and SHA-256 selected in `runtime-assets.lock.json`, runs
`npm run build-tools` and `npm run check-site`, and deploys the resulting
`site/` directory. A successful workflow publishes
<https://risajef.github.io/>.

The helper requires a clean `main` checkout matching the pushed remote revision
and dispatches that exact commit. It does not stage, commit, push, or publish runtime
assets. Its success means the workflow was requested; inspect GitHub Actions for
the actual build and deployment result.

You can also use **Actions → Deploy GitHub Pages → Run workflow**. Supply the
intended commit SHA in `revision`, or leave it blank to use the selected ref.

## Runtime assets and recovery

`runtime-assets.lock.json` pins the release name, archive filename, and exact
SHA-256. `npm run restore-runtime-assets` downloads and verifies those bytes
before installing only models, audio, and Z3. Tracked article images remain
owned by Git. An old v2 archive can contain images; they are verified but ignored.

The initial lock retains the existing published v2 release for compatibility.
Its downloaded archive bytes, checksum, layout, and every manifest hash were verified. Replacing that release's bytes will fail verification.
Future publication creates a new content-addressed release, never an overwrite.
Retain every referenced release and a verified local backup for historical builds.

To restore a local backup without downloading:

```bash
npm run restore-runtime-assets -- --archive /path/to/runtime-assets.tar.gz
```

When spoken content or TTS configuration changes, generate and verify its audio
locally, then publish a new runtime release:

```bash
PIPER_TTS_GENERATE_AUDIO=true npm run build
PIPER_TTS_GENERATE_AUDIO=false npm run check-site
npm run publish-runtime-assets
```

The publisher builds, packages, creates a uniquely named draft release, downloads
and verifies both uploaded assets, and only then publishes it. It updates
`runtime-assets.lock.json` only after successful publication. Review and commit
that lock together with the corresponding source changes, push, then dispatch
deployment. Never edit the existing release or copy its checksum into the lock
without verifying the archive itself. Failed publication leaves the old release
and lock usable; inspect any leftover draft before retrying.

The archive manifest records source revision and generation input hashes.
Audio generation requires the locally configured Piper GPU/runtime. CI runs
cache-only and fails for stale or absent audio. If that happens, rebuild the
intended source revision locally, publish its runtime release, commit its new
lock, and dispatch that new revision.

If a referenced release is lost, restore its exact bytes from a verified backup.
If exact recovery is impossible, create a new release and commit a new lock;
do not silently substitute assets for an existing source revision.

`npm run build-tools` stages every embedded application under
`docs/assets/apps`. Applications with a committed Node lockfile build in an
isolated temporary copy; source-static applications are copied as deployment
artifacts. `npm run finalize-site` writes redirects and the compatibility
sitemap after MkDocs has rendered the site. `npm run build-site` performs a
normal MkDocs build followed by finalization, while
`npm run check-site` applies the strict CI checks and validates rendered
language, canonical URL, JSON-LD, and redirect contracts.

Redirects in `mkdocs.yml` are permanent compatibility routes. Do not remove a
redirect unless its legacy URL has an explicit replacement; `check-site`
verifies every declared redirect after each build.

# Components and Features

NP Studio is pinned as the `docs/assets/np-hard` submodule and published at
`/assets/apps/np-hard/`. Its website-specific styles live in
`docs/assets/np-hard-theme.css`; `scripts/build_tools.py` adds them after the
application styles and includes them in the build fingerprint. Update the
submodule to upgrade the app while retaining the website theme.

- Framework: [MkDocs](https://www.mkdocs.org)
- Custom Theme: Allows subpages for pages
- RSS Feed: The blog entries are in a RSS feed

## Embedded application trust

All embedded tools are trusted components of this website, pinned by submodule
revision and reviewed before upgrading. Each runs in an iframe to separate its
DOM, styles, and script globals from the theme. The website never injects fetched
application markup or scripts into its own document.

These same-origin iframes deliberately retain origin storage, file selection,
downloads, workers, and clipboard behavior. They are not a security boundary:
a compromised tool could access this origin's storage and parent document. Do
not host untrusted applications under this origin. Supporting untrusted tools
requires a separate origin, a narrow messaging protocol, and a permission review.
Changing origins would also require explicit migration of existing browser data.

## Parent checks

Run `npm test` for focused parent Python regressions and `npm run test:browser`
for Chromium integration checks. These use fixtures, do not build subrepositories,
and do not require voice models. A lightweight CI job runs both on source changes.
For a Python-only checks environment, use `python -m pip install -r tests/requirements.txt`
and `python -m unittest discover -s tests -v`.

Run `npm run build` for the complete application staging and strict rendered-site
validation. The parent checks and full build serve different purposes.
