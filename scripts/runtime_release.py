#!/usr/bin/env python3
"""Restore the exact runtime archive selected by the committed release lock."""

import argparse
import json
import re
import subprocess
import tempfile
from pathlib import Path

try:
    from .runtime_assets import install_assets, sha256
except ImportError:
    from runtime_assets import install_assets, sha256

PROJECT_DIR = Path(__file__).resolve().parents[1]
LOCK_PATH = PROJECT_DIR / "runtime-assets.lock.json"


def load_lock() -> dict[str, str]:
    lock = json.loads(LOCK_PATH.read_text(encoding="utf-8"))
    if not isinstance(lock, dict) or lock.get("version") != 1:
        raise SystemExit("Invalid runtime release lock")
    for key, pattern in (("release", r"runtime-assets-[A-Za-z0-9-]+"),
                         ("archive", r"runtime-assets(?:-v[0-9]+)?\.tar\.gz"),
                         ("sha256", r"[0-9a-f]{64}")):
        if not isinstance(lock.get(key), str) or not re.fullmatch(pattern, lock[key]):
            raise SystemExit(f"Invalid runtime release lock field: {key}")
    return lock


def restore(archive_path: Path | None = None) -> None:
    lock = load_lock()
    if archive_path is not None:
        install_locked_archive(archive_path, lock)
        return
    with tempfile.TemporaryDirectory(prefix="runtime-download-") as directory:
        subprocess.run(
            ["gh", "release", "download", lock["release"], "--pattern", lock["archive"], "--dir", directory],
            cwd=PROJECT_DIR, check=True,
        )
        install_locked_archive(Path(directory) / lock["archive"], lock)


def install_locked_archive(archive_path: Path, lock: dict) -> None:
    if sha256(archive_path) != lock["sha256"]:
        raise SystemExit("Runtime archive does not match the committed SHA-256; refusing installation")
    install_assets(archive_path)


def write_lock(release: str, archive: Path) -> None:
    lock = {"version": 1, "release": release, "archive": archive.name, "sha256": sha256(archive)}
    temporary = LOCK_PATH.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(lock, indent=2) + "\n", encoding="utf-8")
    temporary.replace(LOCK_PATH)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path, help="Use a local archive instead of downloading")
    restore(parser.parse_args().archive)


if __name__ == "__main__":
    main()
