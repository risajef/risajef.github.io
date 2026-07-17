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

# Deploying to GitHub Pages

Deployment is automatic after a push to `main`. For changes that do **not**
affect Piper audio, commit the source changes and their lockfiles, then push:

```bash
git add <changed-files>
git commit -m "Describe the change"
git push origin main
```

For a change that affects a spoken page or the TTS configuration, refresh the
runtime-assets release first using the procedure below, then run the same
commit-and-push commands. The [Deploy GitHub Pages](.github/workflows/deploy-pages.yml) workflow then
checks out submodules, installs the locked Node and Python dependencies,
restores the verified `runtime-assets-v2` release archive, runs
`npm run build-tools` and `npm run check-site`, and deploys the resulting
`site/` directory. A successful workflow publishes
<https://risajef.github.io/>.

You can also start the same workflow manually from the repository's **Actions**
tab using **Deploy GitHub Pages → Run workflow**. Do this only after the branch
contains the intended committed changes; the workflow deploys the selected
branch revision, not uncommitted local files.

Before deploying a change that requires Piper audio, voice models, or the Z3
runtime, ensure the required files are present in the checksummed
`runtime-assets-v2` GitHub Release archive. The workflow deliberately fails if
that release is missing, corrupted, or stale. Generated `site/` output and
embedded-app bundles do not need to be committed: GitHub Actions rebuilds them
from the committed source and lockfiles.

## Refresh runtime assets before deployment

Pages is a cache-only Piper build: it never generates audio. Any change to a
spoken page (or to the TTS configuration/plugin) must therefore be handled
locally before pushing the source commit. After restoring the current runtime
archive and making the source changes, run:

```bash
# Generate missing or stale Piper audio locally.
PIPER_TTS_GENERATE_AUDIO=true npm run build-site

# Verify the exact cache-only behaviour used by GitHub Pages.
PIPER_TTS_GENERATE_AUDIO=false npm run check-site

# Package the models, generated audio, and Z3 runtime, then create its checksum.
npm run pack-runtime-assets -- --output /tmp/runtime-assets-v2.tar.gz
(cd /tmp && sha256sum runtime-assets-v2.tar.gz > runtime-assets-v2.tar.gz.sha256)

# Replace the two assets consumed by the deployment workflow.
gh release upload runtime-assets-v2 \
  /tmp/runtime-assets-v2.tar.gz \
  /tmp/runtime-assets-v2.tar.gz.sha256 \
  --clobber
```

Then commit and push the source changes to `main`. Upload the refreshed release
*before* pushing: a push triggers Pages immediately, and it will fail if its
cache-only check sees audio that is absent or stale in the release archive.
Audio generation requires the locally configured Piper GPU/runtime; do not try
to generate it in GitHub Actions.

If a push has already failed with `Piper TTS cache-only build found missing or
stale audio`, check out that exact revision locally, run the commands above,
and use **Deploy GitHub Pages → Run workflow** from the **Actions** tab to
retry. No additional source commit is required if the failed revision is still
the one you want to publish.

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
instead of generating speech in GitHub Actions. Refresh the assets on the
existing `runtime-assets-v2` release with the procedure above before deploying.

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
