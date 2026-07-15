#!/usr/bin/env python3
"""Package and restore large site runtime assets from a GitHub Release."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import tarfile
import tempfile
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parents[1]
RUNTIME_PATHS = (
    Path("models/piper-tts"),
    Path("docs/assets/piper-tts/audio"),
    Path("docs/z3"),
)
MANIFEST_NAME = "runtime-assets.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    subcommands = parser.add_subparsers(dest="command", required=True)

    pack = subcommands.add_parser("pack", help="Create a compressed runtime asset bundle")
    pack.add_argument("--output", type=Path, required=True)

    install = subcommands.add_parser("install", help="Restore runtime assets from a bundle")
    install.add_argument("--archive", type=Path, required=True)

    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.command == "pack":
        pack_assets(args.output)
    else:
        install_assets(args.archive)


def pack_assets(output_path: Path) -> None:
    files = list(runtime_files())
    if not files:
        raise SystemExit("No runtime assets found to package")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    manifest = {
        "version": 1,
        "files": {
            path.relative_to(PROJECT_DIR).as_posix(): sha256(path)
            for path in files
        },
    }
    with tarfile.open(output_path, "w:gz") as archive:
        for path in files:
            archive.add(path, arcname=path.relative_to(PROJECT_DIR).as_posix())
        manifest_bytes = (json.dumps(manifest, indent=2, sort_keys=True) + "\n").encode()
        info = tarfile.TarInfo(MANIFEST_NAME)
        info.size = len(manifest_bytes)
        archive.addfile(info, fileobj=BytesReader(manifest_bytes))
    print(f"Packaged {len(files)} runtime assets in {output_path}")


def install_assets(archive_path: Path) -> None:
    if not archive_path.is_file():
        raise SystemExit(f"Runtime asset bundle is missing: {archive_path}")

    with tempfile.TemporaryDirectory(prefix="runtime-assets-") as temp_dir_name:
        temp_dir = Path(temp_dir_name)
        with tarfile.open(archive_path, "r:gz") as archive:
            members = archive.getmembers()
            if any(not is_safe_member(member.name) for member in members):
                raise SystemExit("Runtime asset bundle contains an unsafe path")
            archive.extractall(temp_dir, members, filter="data")

        manifest_path = temp_dir / MANIFEST_NAME
        if not manifest_path.is_file():
            raise SystemExit("Runtime asset bundle is missing its manifest")
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        validate_manifest(temp_dir, manifest)

        for relative_path in RUNTIME_PATHS:
            source = temp_dir / relative_path
            if not source.is_dir():
                raise SystemExit(f"Runtime asset bundle is missing {relative_path}")
            destination = PROJECT_DIR / relative_path
            if destination.exists():
                shutil.rmtree(destination)
            shutil.copytree(source, destination)
    print(f"Installed runtime assets from {archive_path}")


def runtime_files() -> list[Path]:
    files: list[Path] = []
    for relative_path in RUNTIME_PATHS:
        directory = PROJECT_DIR / relative_path
        if not directory.is_dir():
            raise SystemExit(f"Runtime asset directory is missing: {directory}")
        files.extend(path for path in directory.rglob("*") if path.is_file())
    return sorted(files)


def validate_manifest(root: Path, manifest: object) -> None:
    if not isinstance(manifest, dict) or manifest.get("version") != 1:
        raise SystemExit("Runtime asset bundle has an invalid manifest")
    files = manifest.get("files")
    if not isinstance(files, dict):
        raise SystemExit("Runtime asset bundle has no file hashes")
    for relative_path, expected_hash in files.items():
        if not isinstance(relative_path, str) or not isinstance(expected_hash, str):
            raise SystemExit("Runtime asset bundle has an invalid file hash")
        path = root / relative_path
        if not path.is_file() or sha256(path) != expected_hash:
            raise SystemExit(f"Runtime asset checksum failed: {relative_path}")


def is_safe_member(name: str) -> bool:
    path = Path(name)
    return not path.is_absolute() and ".." not in path.parts


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


class BytesReader:
    """Minimal binary stream wrapper for tarfile's generated manifest."""

    def __init__(self, data: bytes) -> None:
        self.data = data
        self.position = 0

    def read(self, size: int = -1) -> bytes:
        if size < 0:
            size = len(self.data) - self.position
        chunk = self.data[self.position : self.position + size]
        self.position += len(chunk)
        return chunk


if __name__ == "__main__":
    main()