#!/usr/bin/env python3
"""Package and restore large site runtime assets from a GitHub Release."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import tarfile
import tempfile
from pathlib import Path

try:
    from .artifact_io import replace_directories
except ImportError:  # Direct script execution.
    from artifact_io import replace_directories

PROJECT_DIR = Path(__file__).resolve().parents[1]
RUNTIME_PATHS = (
    Path("models/piper-tts"),
    Path("docs/assets/piper-tts/audio"),
    Path("docs/z3"),
)
MANIFEST_NAME = "runtime-assets.json"
# Read-only compatibility with previously published v2 archives. Never installed.
LEGACY_PAYLOAD_ROOTS = (Path("docs/assets/images"),)


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
    validate_runtime_ownership()
    files = list(runtime_files())
    if not files:
        raise SystemExit("No runtime assets found to package")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    file_hashes: dict[str, str] = {}

    with tarfile.open(output_path, "w:gz") as archive:
        for path in files:
            rel_path = path.relative_to(PROJECT_DIR).as_posix()
            # Read the file exactly once and archive/hash that same snapshot of
            # bytes. Hashing a separate re-read (the previous approach) is
            # racy: a concurrent process (e.g. `mkdocs serve` regenerating
            # Piper TTS audio in the background) can rewrite the file between
            # the archive read and the hash read, producing a manifest hash
            # that doesn't match what was actually packaged.
            data = path.read_bytes()
            info = archive.gettarinfo(path, arcname=rel_path)
            info.size = len(data)
            archive.addfile(info, fileobj=BytesReader(data))
            file_hashes[rel_path] = hashlib.sha256(data).hexdigest()

        manifest = {
            "version": 1,
            "files": file_hashes,
        }
        manifest_bytes = (json.dumps(manifest, indent=2, sort_keys=True) + "\n").encode()
        info = tarfile.TarInfo(MANIFEST_NAME)
        info.size = len(manifest_bytes)
        archive.addfile(info, fileobj=BytesReader(manifest_bytes))
    print(f"Packaged {len(files)} runtime assets in {output_path}")


def install_assets(archive_path: Path) -> None:
    validate_runtime_ownership()
    if not archive_path.is_file():
        raise SystemExit(f"Runtime asset bundle is missing: {archive_path}")

    with tempfile.TemporaryDirectory(prefix="runtime-assets-") as temp_dir_name:
        temp_dir = Path(temp_dir_name)
        with tarfile.open(archive_path, "r:gz") as archive:
            members = archive.getmembers()
            validate_archive_members(members)
            archive.extractall(temp_dir, members, filter="data")

        manifest_path = temp_dir / MANIFEST_NAME
        if not manifest_path.is_file():
            raise SystemExit("Runtime asset bundle is missing its manifest")
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"), object_pairs_hook=unique_json_object)
        validate_manifest(temp_dir, manifest)

        replacements = {}
        for relative_path in RUNTIME_PATHS:
            source = temp_dir / relative_path
            if not source.is_dir():
                raise SystemExit(f"Runtime asset bundle is missing {relative_path}")
            replacements[PROJECT_DIR / relative_path] = source
        replace_directories(replacements)
    print(f"Installed runtime assets from {archive_path}")


def runtime_files() -> list[Path]:
    files: list[Path] = []
    for relative_path in RUNTIME_PATHS:
        directory = PROJECT_DIR / relative_path
        if not directory.is_dir():
            raise SystemExit(f"Runtime asset directory is missing: {directory}")
        for path in directory.rglob("*"):
            if path.is_symlink():
                raise SystemExit(f"Runtime assets must not contain symlinks: {path}")
            if path.is_file():
                files.append(path)
    return sorted(files)


def validate_runtime_ownership() -> None:
    """Never let a runtime restore replace version-controlled source files."""
    result = subprocess.run(
        ["git", "ls-files", "-z", "--", *(str(path) for path in RUNTIME_PATHS)],
        cwd=PROJECT_DIR, check=True, capture_output=True,
    )
    if result.stdout:
        raise SystemExit("Runtime directories overlap Git-tracked source files")


def validate_manifest(root: Path, manifest: object) -> None:
    if not isinstance(manifest, dict) or manifest.get("version") != 1:
        raise SystemExit("Runtime asset bundle has an invalid manifest")
    files = manifest.get("files")
    if not isinstance(files, dict) or not files:
        raise SystemExit("Runtime asset bundle has no file hashes")
    for relative_path, expected_hash in files.items():
        if not isinstance(relative_path, str) or not isinstance(expected_hash, str):
            raise SystemExit("Runtime asset bundle has an invalid file hash")
        if not is_payload_path(relative_path) or not re.fullmatch(r"[0-9a-f]{64}", expected_hash):
            raise SystemExit(f"Runtime asset bundle has an invalid manifest entry: {relative_path}")
        path = root / relative_path
        if path.is_symlink() or not path.is_file() or sha256(path) != expected_hash:
            raise SystemExit(f"Runtime asset checksum failed: {relative_path}")
    actual = {path.relative_to(root).as_posix() for path in root.rglob("*")
              if path.is_file() and path.relative_to(root).as_posix() != MANIFEST_NAME}
    if actual != set(files):
        raise SystemExit("Runtime manifest does not exactly cover the archive payload")


def is_safe_member(name: str) -> bool:
    path = Path(name)
    return bool(name) and not path.is_absolute() and ".." not in path.parts and path.as_posix() == name


def is_payload_path(name: str) -> bool:
    return is_safe_member(name) and any(root in Path(name).parents for root in RUNTIME_PATHS + LEGACY_PAYLOAD_ROOTS)


def validate_archive_members(members: list[tarfile.TarInfo]) -> None:
    seen = set()
    for member in members:
        name = member.name
        if not is_safe_member(name) or name in seen:
            raise SystemExit(f"Runtime archive has an unsafe or duplicate path: {name}")
        seen.add(name)
        if member.isfile():
            allowed = name == MANIFEST_NAME or is_payload_path(name)
        elif member.isdir():
            path = Path(name)
            allowed = any(path == root or path in root.parents or root in path.parents
                          for root in RUNTIME_PATHS + LEGACY_PAYLOAD_ROOTS)
        else:
            allowed = False
        if not allowed:
            raise SystemExit(f"Runtime archive has an unsupported member: {name}")


def unique_json_object(pairs: list[tuple[str, object]]) -> dict:
    result = {}
    for key, value in pairs:
        if key in result:
            raise SystemExit(f"Runtime manifest has a duplicate key: {key}")
        result[key] = value
    return result


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
