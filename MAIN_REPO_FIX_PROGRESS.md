# Main repository fix progress

Scope: findings F1–F14 in `MAIN_REPO_REVIEW.md`. One commit per finding, including its progress entry and relevant verification. Subrepository contents and gitlinks must remain unchanged. No deployment or release publication is part of this work.

| Finding | Status | Change and verification |
| --- | --- | --- |
| F1 | Complete | Removed source images from runtime ownership; guard rejects tracked files in runtime destinations. Two isolated regression tests pass. Mermaid diagrams remain generated locally by the existing renderer. |
| F2 | Complete | Deployment refuses dirty or non-main checkouts and unpushed revisions; dispatch pins checkout to the verified SHA. Removed automatic runtime publishing from the IDE deploy task. Mocked tests verify rejection and exact command selection. |
| F3 | Complete | Publisher creates a uniquely named draft with both assets, downloads and verifies them, then publishes. Existing releases are never deleted or overwritten. Mocked success/failure tests pass; no real upload performed. Consumer pinning follows in F11. |
| F4 | Complete | Validates all required directories before preparing replacements; complete copies precede destination switches, with rollback and retained backups if rollback itself fails. Regression tests cover missing later roots, copy failure and mid-switch failure. |
| F5 | Complete | Exact manifest coverage, canonical contained paths, SHA-256 format, duplicate JSON/archive keys, and regular-file-only payloads enforced. Legacy image payloads remain verified but are never installed. Malformed archive/manifest regression tests pass. |
| F6 | Complete | Per-app runtime allowlists replace source-tree publication, including explicit Background Generator web output and Parallelismus dist/data paths. Source-only files, dotfiles and symlinks are excluded/rejected. Fixture tests verify the boundary. No subrepo files changed. |
| F7 | Complete | Cache checks an exact hashed output manifest; HTML dependencies are checked before publication. All app builds now prepare and validate in a temporary artifact directory before rollback-capable replacement. Fingerprints include publish rules/toolchain and fail on unreadable inputs. Missing/corrupt output and failed-build preservation tests pass. |
| F8 | Complete | Kept the existing manual-deployment policy and corrected README procedures and retry guidance. Workflow input/checkout and manual-only trigger assertions pass; no duplicate push dispatch introduced. |
| F9 | Complete | Added push/PR/manual parent-only CI, a lightweight Python regression entry point, browser RSS success/error checks, and emitted local-asset validation. Python tests pass. Chromium browser checks pass (localhost execution required sandbox escalation). No app builds or model downloads required for parent tests. |
| F10 | Complete | Replaced all three DOM-injection adapters with native app iframes in both languages; removed obsolete adapters and parent-loaded app scripts/styles. Documented trusted same-origin apps and the remaining shared-storage boundary explicitly. Browser fixtures verify separate DOM/globals and relative-link behavior. No sandbox/origin migration that would break stored user data. |
| F11 | Complete | Committed release/digest lock and lock-aware restore used by CI. Downloaded the existing published v2 archive and verified its SHA-256, layout, and all 1,211 payload hashes without installation; its digest differs from the older local backup, so the lock selects the verified published bytes. Future publication uses new content-addressed releases and updates the lock only after verification. Added generation provenance and digest-replacement tests. No external release was created. |
| F12 | Complete | Base insertion now parses HTML, supports minified/CRLF/case-varied heads, replaces an existing base deliberately, and rejects missing heads or duplicate bases. Format and idempotency fixtures pass. |
| F13 | Complete | Thin lifecycle hook delegates to build-scoped content collection, iframe presentation and a pinned Mermaid adapter. YAML parser replaces regex metadata parsing; only generated diagrams are inlined. Tests cover metadata refresh, locale/escaping, real plugin adapter/cache behavior, and a real fixture MkDocs collection build. |
| F14 | Complete | Aligned Python tooling with 3.11 and actual source paths, declared existing PyYAML dependency and refreshed uv.lock offline, corrected tool/IDE procedures and stale maintenance notes, derived checker identity from MkDocs configuration, and centralized redirect normalization with independent expected examples. Thirty parent tests pass. Final integration verification follows below. |

| F15 (integration discovery) | Complete | TTS plugin cleanup retained only the last locale. Finalization now publishes the union of MP3s referenced by rendered players in all locales; the checker also validates later playlist tracks. Two regression fixtures pass. |

## Final integration verification

- 32 parent regression tests pass, including a real fixture MkDocs build.
- Chromium RSS success/error and iframe document-separation fixtures pass.
- All thirteen applications staged successfully using temporary source copies. The first offline attempt lacked a dependency; the complete retry installed locked dependencies and passed.
- A complete `PIPER_TTS_GENERATE_AUDIO=false npm run build` passes: all thirteen staging caches, strict MkDocs, finalization, metadata/redirect contracts, and local runtime dependencies including every audio playlist track. All thirteen output manifests were also checked independently.
- No runtime generation, external publication, workflow dispatch, or push performed.
- Parent gitlinks are unchanged from `faa03e1`; the four pre-existing modified subrepositories and other untracked review reports are left alone.

Commit subjects identify each finding; use `git log --oneline --grep='fix(F'` to list them.

## Publication preparation (2026-11-05)

The user authorized publishing all subrepositories, updating the parent, and deploying.
All local subrepository revisions are published. Four parent references advance:

| Tool | Published revision |
| --- | --- |
| Buchfaltstudio | `a586e77f6618416c249f0448449614a2c3ad767d` |
| Hoare Logic | `458d2abf3905cabb911b39ab2a8d0c622639d268` |
| LinkedIn WYSIWYG | `4cb9d67f5c3423f16d7379ec9895f623755f7de3` |
| Parallelismus | `be4c82ac0b923aad0160ac3d606c11ddf4272989` |

The other tools keep their tested pins. Stammbaum's remote has one additional
commit; its existing local pin is already published and was deliberately retained.
The five subrepository review reports are included in this parent update.

Predeployment verification: `npm test` passed all 32 tests. Restoring the exact
archive selected by `runtime-assets.lock.json`, followed by
`PIPER_TTS_GENERATE_AUDIO=false npm run build`, also passed. This matches the
cache-only runtime input used by the Pages workflow. Deployment will use the
explicit parent commit SHA; the GitHub Actions run is the authoritative deployment
record. No runtime release refresh was needed.
