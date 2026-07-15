## Refactor Status

The original architecture audit has been completed. The site now has a strict,
reproducible deployment path: locked Python and Node dependencies, explicit
embedded-tool staging, release-backed runtime assets, and rendered-site
contracts for routes, language metadata, social metadata, redirects, and
unlisted historical political pages.

## Completed Work

- Strict MkDocs builds are required locally and in Pages deployment.
- i18n homepages, internal links, anchors, canonical URLs, JSON-LD, OpenGraph
  metadata, and theme markup were corrected and are checked after rendering.
- Snippet and tools-index generation is in-memory; no standalone
  `generate-content` phase exists and Markdown is not rewritten during builds.
- Redirects are a versioned compatibility contract. They are rendered after
  MkDocs, checked on every build, and must remain unless replaced explicitly.
- The ten embedded applications follow one staged deployment contract under
  `docs/assets/apps`; Node-built applications require committed lockfiles and
  build in isolated temporary copies.
- The staging cache uses a SHA-256 fingerprint of each app's source tree, its
  configuration, and `scripts/build_tools.py`, rather than timestamps.
- Runtime monkey patches were replaced with owned MkDocs-hook behavior for
  inline SVGs, Mermaid URLs, and Mermaid caching.
- Argos Translate and its obsolete dependency chain were removed.
- Piper models/audio and the canonical Z3 bundle are supplied by the
  `runtime-assets-v1` GitHub Release archive, not Git or Git LFS. The archive
  contains file hashes and is restored before every Pages build.
- Hoare Logic no longer ships its own Z3 copy; it uses the canonical `/z3`
  runtime.
- A monthly dependency audit blocks known production vulnerabilities and saves
  full Node/Python lockfile audit reports for build-time tooling.

## Operating Decisions

- This is a personal site. Direct pushes to `main` are intentional; no pull
  request workflow is required.
- The release asset name is trusted under the current single-maintainer model.
  If contributors are added, review release permissions and add an external
  archive checksum lock before allowing shared publication.
- Historical political pages remain public but unlisted. This is deliberate,
  and their routes and redirects are build-tested.
- Work-in-progress content may remain in source where it is intentionally
  hidden from rendered pages.

## Remaining Maintenance

1. Review the monthly full dependency-audit artifact. Both the production and
  build-time audit baselines are currently clean; update embedded lockfiles
  when future findings have a compatible fix.
2. Maintain runtime asset recovery: retain the published release and a verified
   local backup. If recovery requires a replacement, stop deployment, perform
   a manual security review, publish a new versioned release, update the
   configured release name, and validate with `npm run check-site`.
3. When adding or retiring public pages, preserve old URLs with an explicit
   redirect and keep the rendered redirect contract passing.
4. When adding an embedded tool, add it to `scripts/build_tools.py` with a
   declared deployment contract and ensure its source fingerprint covers its
   build inputs.

## Verification Baseline

- `npm run build-tools`
- `npm run check-site`
- `npm audit --omit=dev --audit-level=moderate` for the root and each
  Node-built embedded app
- `uvx pip-audit --disable-pip` against the locked production export
- GitHub Release archive download, SHA-256 verification, restoration, and a
  complete strict site build
