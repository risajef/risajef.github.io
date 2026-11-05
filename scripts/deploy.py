#!/usr/bin/env python3
"""Dispatch deployment of a clean, already pushed main revision."""

import subprocess
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parents[1]


def git_output(*args: str) -> str:
    return subprocess.run(
        ["git", *args], cwd=PROJECT_DIR, check=True, capture_output=True, text=True,
    ).stdout.strip()


def main() -> None:
    if git_output("branch", "--show-current") != "main":
        raise SystemExit("Deploy from main after committing and pushing the intended changes")
    if git_output("status", "--porcelain", "--untracked-files=normal"):
        raise SystemExit("Commit or set aside local changes before deploying (including submodules)")
    revision = git_output("rev-parse", "HEAD")
    remote = git_output("ls-remote", "--exit-code", "origin", "refs/heads/main")
    if not remote or remote.split()[0] != revision:
        raise SystemExit("Push the intended main revision before deploying")
    subprocess.run(
        ["gh", "workflow", "run", "deploy-pages.yml", "--ref", "main", "-f", f"revision={revision}"],
        cwd=PROJECT_DIR, check=True,
    )
    print(f"Deployment requested for {revision}; inspect the Deploy GitHub Pages run in GitHub Actions.")


if __name__ == "__main__":
    main()
