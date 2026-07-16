# Usage

- `npm ci`
- `apt-get install libasound2`
- `uv sync --frozen`
- `gh release download runtime-assets-v2 --pattern 'runtime-assets-v2.tar.gz*' --dir /tmp`
- `cd /tmp && sha256sum --check runtime-assets-v2.tar.gz.sha256`
- `npm run install-runtime-assets -- --archive /tmp/runtime-assets-v2.tar.gz`
- `npm run build-tools`
- `npm run check-site`
- `mkdocs serve`

`uv.lock` is the authoritative Python dependency lock. Piper voice models,
generated audio, and the standalone Z3 WASM runtime are published together as
the `runtime-assets-v2` GitHub Release asset, not stored in Git or Git LFS.
The release archive is a required build input and must be retained. If local
runtime assets are missing, restore them from the release and verify the
published SHA-256 before building. If the release itself is lost or corrupted,
stop deployment, recreate the archive from a verified local backup, manually
review it, upload a new versioned release, update the pinned release name in
the build configuration, and run `npm run check-site` before deployment.

Normal local MkDocs builds generate missing Piper audio with the configured
GPU provider. Pages builds set `PIPER_TTS_GENERATE_AUDIO=false`: they restore
the checksummed release archive and fail on a stale or missing audio entry
instead of generating speech in GitHub Actions. After local audio generation,
create and publish a new versioned runtime-assets release before deploying.

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
