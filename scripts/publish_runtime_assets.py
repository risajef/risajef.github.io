#!/usr/bin/env python3
"""Build and publish a new verified runtime release without replacing existing assets."""

import hashlib
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parents[1]
ARCHIVE_NAME = "runtime-assets.tar.gz"
OUTPUT_DIR = PROJECT_DIR / ".cache" / "runtime-assets"


def main() -> None:
    archive_path = OUTPUT_DIR / ARCHIVE_NAME
    checksum_path = archive_path.with_suffix(archive_path.suffix + ".sha256")

    build_site_and_audio()
    pack(archive_path)
    write_checksum(archive_path, checksum_path)
    release_tag = upload(archive_path, checksum_path)
    print(f"Published {ARCHIVE_NAME} to {release_tag}. Existing consumers are unchanged.")


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


def upload(archive_path: Path, checksum_path: Path) -> str:
    repo = resolve_repo_slug()
    digest = file_digest(archive_path)
    release_tag = f"runtime-assets-sha256-{digest}"
    revision = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=PROJECT_DIR, check=True, capture_output=True, text=True,
    ).stdout.strip()
    # A unique draft keeps incomplete uploads away from published consumers.
    # If a prior attempt left this draft, inspect it explicitly; never clobber it.
    subprocess.run(
        ["gh", "release", "create", release_tag, str(archive_path), str(checksum_path),
         "--repo", repo, "--draft", "--target", revision, "--title", release_tag,
         "--notes", f"Runtime assets generated from source revision {revision}.", "--latest=false"],
        cwd=PROJECT_DIR, check=True,
    )
    with tempfile.TemporaryDirectory(prefix="verify-runtime-release-") as directory:
        subprocess.run(
            ["gh", "release", "download", release_tag, "--repo", repo,
             "--pattern", archive_path.name, "--pattern", checksum_path.name, "--dir", directory],
            cwd=PROJECT_DIR, check=True,
        )
        downloaded = Path(directory)
        if file_digest(downloaded / archive_path.name) != digest:
            raise SystemExit("Uploaded runtime archive failed verification; release remains a draft")
        if (downloaded / checksum_path.name).read_bytes() != checksum_path.read_bytes():
            raise SystemExit("Uploaded runtime checksum failed verification; release remains a draft")
    subprocess.run(
        ["gh", "release", "edit", release_tag, "--repo", repo, "--draft=false", "--latest=false"],
        cwd=PROJECT_DIR, check=True,
    )
    return release_tag


def file_digest(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


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
