"""Prepare complete directory replacements and restore backups on failure."""

import shutil
import tempfile
from pathlib import Path


def replace_directories(replacements: dict[Path, Path]) -> None:
    """Copy all sources before switching any destination; roll back failed switches.

    Readers should not build concurrently with installation. Each rename is atomic,
    but multiple independent directories cannot be switched in one filesystem operation.
    """
    prepared: list[tuple[Path, Path, Path]] = []
    switched: list[tuple[Path, Path, bool]] = []
    preserve_backups = False
    try:
        for destination, source in replacements.items():
            if not source.is_dir() or source.is_symlink():
                raise ValueError(f"Not an artifact directory: {source}")
            if destination.is_symlink() or (destination.exists() and not destination.is_dir()):
                raise ValueError(f"Not a replaceable directory: {destination}")
            destination.parent.mkdir(parents=True, exist_ok=True)
            workspace = Path(tempfile.mkdtemp(prefix=f".{destination.name}-replace-", dir=destination.parent))
            prepared.append((destination, workspace / "new", workspace / "old"))
            shutil.copytree(source, workspace / "new")
        for destination, source, backup in prepared:
            existed = destination.exists()
            if existed:
                destination.rename(backup)
            switched.append((destination, backup, existed))
            source.rename(destination)
    except BaseException:
        try:
            for destination, backup, existed in reversed(switched):
                if destination.exists():
                    shutil.rmtree(destination)
                if existed:
                    backup.rename(destination)
        except BaseException as rollback_error:
            preserve_backups = True
            locations = ", ".join(str(backup.parent) for _, _, backup in prepared)
            raise RuntimeError(f"Rollback failed; retained recovery directories: {locations}") from rollback_error
        raise
    finally:
        if not preserve_backups:
            for _, _, backup in prepared:
                shutil.rmtree(backup.parent)
