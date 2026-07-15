# Usage

- `npm ci`
- `apt-get install libasound2`
- `uv sync --frozen`
- `uv sync --group translate` (optional, only if you use `scripts/auto_translate.py`)
- `npm run build-tools`
- `npm run check-site`
- `mkdocs serve`

`uv.lock` is the authoritative Python dependency lock. Git LFS is required for
the Piper voice models, generated audio, and standalone Z3 WASM binaries.

`npm run build-tools` stages every embedded application under
`docs/assets/apps`. Applications with a committed Node lockfile build in an
isolated temporary copy; source-static applications are copied as deployment
artifacts. `npm run build-site` performs a normal MkDocs build, while
`npm run check-site` applies the strict CI checks and validates rendered
language, canonical URL, and JSON-LD contracts.

# Components and Features
- Framework: [MkDocs](https://www.mkdocs.org)
- Custom Theme: Allows subpages for pages
- RSS Feed: The blog entries are in a RSS feed
