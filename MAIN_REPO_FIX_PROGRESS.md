# Main repository fix progress

Scope: findings F1–F14 in `MAIN_REPO_REVIEW.md`. One commit per finding, including its progress entry and relevant verification. Subrepository contents and gitlinks must remain unchanged. No deployment or release publication is part of this work.

| Finding | Status | Change and verification |
| --- | --- | --- |
| F1 | Complete | Removed source images from runtime ownership; guard rejects tracked files in runtime destinations. Two isolated regression tests pass. Mermaid diagrams remain generated locally by the existing renderer. |
| F2 | Complete | Deployment refuses dirty or non-main checkouts and unpushed revisions; dispatch pins checkout to the verified SHA. Removed automatic runtime publishing from the IDE deploy task. Mocked tests verify rejection and exact command selection. |
| F3 | Complete | Publisher creates a uniquely named draft with both assets, downloads and verifies them, then publishes. Existing releases are never deleted or overwritten. Mocked success/failure tests pass; no real upload performed. Consumer pinning follows in F11. |
| F4 | Complete | Validates all required directories before preparing replacements; complete copies precede destination switches, with rollback and retained backups if rollback itself fails. Regression tests cover missing later roots, copy failure and mid-switch failure. |
| F5 | Complete | Exact manifest coverage, canonical contained paths, SHA-256 format, duplicate JSON/archive keys, and regular-file-only payloads enforced. Legacy image payloads remain verified but are never installed. Malformed archive/manifest regression tests pass. |
| F6 | Pending | |
| F7 | Pending | |
| F8 | Pending | |
| F9 | Pending | |
| F10 | Pending | |
| F11 | Pending | |
| F12 | Pending | |
| F13 | Pending | |
| F14 | Pending | |

Commit subjects identify each finding; use `git log --oneline --grep='fix(F'` to list them.
