#!/usr/bin/env python3
"""Deploy the site: commit git changes, push main, and trigger GitHub Actions deployment."""

import subprocess
import sys
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parents[1]


def main() -> None:
    subprocess.run(["git", "add", "-A"], cwd=PROJECT_DIR, check=True)
    res = subprocess.run(["git", "diff", "--staged", "--quiet"], cwd=PROJECT_DIR)
    if res.returncode != 0:
        subprocess.run(["git", "commit", "-m", "deploy: update site content"], cwd=PROJECT_DIR, check=True)
    subprocess.run(["git", "push", "origin", "main"], cwd=PROJECT_DIR, check=True)
    subprocess.run(["gh", "workflow", "run", "deploy-pages.yml"], cwd=PROJECT_DIR, check=True)
    print("Deployment workflow triggered successfully.")


if __name__ == "__main__":
    main()
