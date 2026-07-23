#!/usr/bin/env python3
"""Pack local runtime assets (Piper TTS audio, models, z3) and publish them
to the ``runtime-assets-v2`` GitHub Release so CI's cache-only build has an
up-to-date bundle to restore.

This must run after the site has been built with audio generation enabled
(``PIPER_TTS_GENERATE_AUDIO=true``, the default), so the local audio cache
under ``docs/assets/piper-tts/audio`` is current before packaging.
"""

import hashlib
import os
import re
import subprocess
import sys
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parents[1]
RELEASE_TAG = "runtime-assets-v2"
ARCHIVE_NAME = "runtime-assets-v2.tar.gz"
OUTPUT_DIR = PROJECT_DIR / ".cache" / "runtime-assets"


def main() -> None:
    archive_path = OUTPUT_DIR / ARCHIVE_NAME
    checksum_path = archive_path.with_suffix(archive_path.suffix + ".sha256")

    build_site_and_audio()
    pack(archive_path)
    write_checksum(archive_path, checksum_path)
    upload(archive_path, checksum_path)
    print(f"Published {ARCHIVE_NAME} to the '{RELEASE_TAG}' release.")


def build_site_and_audio() -> None:
    env = dict(os.environ)
    env["PIPER_TTS_GENERATE_AUDIO"] = "true"
    subprocess.run(["npm", "run", "build"], cwd=PROJECT_DIR, env=env, check=True)


def pack(archive_path: Path) -> None:
    archive_path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [sys.executable, str(PROJECT_DIR / "scripts" / "runtime_assets.py"), "pack", "--output", str(archive_path)],
        cwd=PROJECT_DIR,
        check=True,
    )
    if not archive_path.is_file():
        raise SystemExit(f"Packing runtime assets did not produce {archive_path}")


def write_checksum(archive_path: Path, checksum_path: Path) -> None:
    digest = hashlib.sha256()
    with archive_path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    checksum_path.write_text(f"{digest.hexdigest()}  {archive_path.name}\n", encoding="utf-8")


def upload(archive_path: Path, checksum_path: Path) -> None:
    repo = resolve_repo_slug()
    for file_path in (archive_path, checksum_path):
        subprocess.run(
            ["gh", "release", "delete-asset", RELEASE_TAG, file_path.name, "--repo", repo, "-y"],
            cwd=PROJECT_DIR,
            stderr=subprocess.DEVNULL,
        )
        subprocess.run(
            ["gh", "release", "upload", RELEASE_TAG, str(file_path), "--repo", repo, "--clobber"],
            cwd=PROJECT_DIR,
            check=True,
        )


def resolve_repo_slug() -> str:
    result = subprocess.run(
        ["git", "remote", "get-url", "origin"],
        cwd=PROJECT_DIR,
        capture_output=True,
        text=True,
        check=True,
    )
    url = result.stdout.strip()
    match = re.search(r"github\.com[:/](?P<slug>[^/]+/[^/]+?)(?:\.git)?$", url)
    if not match:
        raise SystemExit(f"Could not determine GitHub repo slug from remote URL: {url}")
    return match.group("slug")


if __name__ == "__main__":
    main()
