# Usage

- `npm ci`
- `apt-get install libasound2`
- `uv sync --frozen`
- `gh release download runtime-assets-v1 --pattern runtime-assets-v1.tar.gz --dir /tmp`
- `npm run install-runtime-assets -- --archive /tmp/runtime-assets-v1.tar.gz`
- `npm run build-tools`
- `npm run check-site`
- `mkdocs serve`

`uv.lock` is the authoritative Python dependency lock. Piper voice models,
generated audio, and the standalone Z3 WASM runtime are published together as
the `runtime-assets-v1` GitHub Release asset, not stored in Git or Git LFS.

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
- Framework: [MkDocs](https://www.mkdocs.org)
- Custom Theme: Allows subpages for pages
- RSS Feed: The blog entries are in a RSS feed
