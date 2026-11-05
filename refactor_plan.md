# Architecture maintenance status

The 2026-11-05 parent-repository review is recorded in `MAIN_REPO_REVIEW.md`.
Its per-finding implementation and verification record is in
`MAIN_REPO_FIX_PROGRESS.md`. Treat that review as a historical snapshot, not a
description of defects that necessarily remain in the current source.

## Current decisions

- Keep MkDocs, static hosting, Markdown, and thirteen independently versioned tool submodules.
- Direct pushes to `main` remain intentional. Parent checks run automatically; deployment is manually dispatched for an explicit committed revision.
- Application builds use temporary source copies and publish declared runtime files into `docs/assets/apps`. Output manifests detect changed or missing files before cache reuse.
- Models, audio, and Z3 belong to the runtime archive. Article images belong to Git and must never be replaced by archive installation.
- `runtime-assets.lock.json` selects the exact archive digest. Retain referenced releases and backups; future publications create verified, uniquely named releases.
- Application iframes separate document presentation. All tools are trusted same-origin components and share origin storage; this is not an untrusted-code isolation architecture.
- Content collection, iframe notes, and the pinned Mermaid adapter are separate integrations behind thin MkDocs callbacks.
- Historical political pages remain public but unlisted. Their compatibility routes remain checked.

## Ongoing maintenance

1. Follow the README for builds, runtime refresh/recovery, and deployment. Follow `.codex/add-tool-workflow.md` for new tools.
2. Run focused parent regressions and browser checks, then the full build for deployment changes. Keep verification claims scoped to what actually ran.
3. Review scheduled dependency-audit results. A past clean audit is not evidence that current dependencies have no advisories.
4. Preserve redirects when changing public routes, and test normalization against explicit expected examples.
5. Review plugin adapter compatibility when upgrading MkDocs or Mermaid dependencies. Align development tooling with Python 3.11 and the actual `scripts/` and `hooks/` paths.
