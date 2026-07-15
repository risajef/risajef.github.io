#!/usr/bin/env python3
"""Build static embedded applications into MkDocs asset staging directories."""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parents[1]
DOCS_DIR = PROJECT_DIR / "docs"
IGNORED_SOURCE_DIRECTORIES = {".git", "node_modules", "dist", "build"}


@dataclass(frozen=True)
class StaticApp:
    slug: str
    label: str
    source_dir: Path
    output_dir: Path
    base_href: str


STATIC_APPS = (
    StaticApp(
        slug="python-blocks",
        label="Python Blocks",
        source_dir=DOCS_DIR / "assets/python-blocks",
        output_dir=DOCS_DIR / "assets/python-blocks-dist",
        base_href="/assets/python-blocks-dist/",
    ),
    StaticApp(
        slug="hoare-logic",
        label="Hoare Logic",
        source_dir=DOCS_DIR / "assets/hoare-logic",
        output_dir=DOCS_DIR / "assets/hoare-logic-dist",
        base_href="/assets/hoare-logic-dist/",
    ),
    StaticApp(
        slug="xml-weaver",
        label="XML Weaver",
        source_dir=DOCS_DIR / "assets/xml-weaver",
        output_dir=DOCS_DIR / "assets/xml-weaver-dist",
        base_href="/assets/xml-weaver-dist/",
    ),
)


def main() -> None:
    for app in STATIC_APPS:
        build_static_app(app)


def build_static_app(app: StaticApp) -> None:
    if not app.source_dir.exists():
        raise RuntimeError(
            f"{app.slug} submodule is missing. Run 'git submodule update --init --recursive'."
        )
    if not (app.source_dir / "package-lock.json").is_file():
        raise RuntimeError(f"{app.slug} requires a committed package-lock.json")
    if not build_required(app.source_dir, app.output_dir):
        print(f"{app.label} bundle is up to date")
        return
    if shutil.which("npm") is None:
        raise RuntimeError(f"npm is required to build {app.slug} but was not found in PATH")

    app.output_dir.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=f"{app.slug}-build-") as temp_dir_name:
        staging_dir = Path(temp_dir_name) / app.source_dir.name
        shutil.copytree(
            app.source_dir,
            staging_dir,
            ignore=shutil.ignore_patterns(*IGNORED_SOURCE_DIRECTORIES),
        )
        run_command(["npm", "ci"], staging_dir, f"install {app.slug} dependencies")
        run_command(
            [
                "npm",
                "run",
                "build",
                "--",
                "--base=./",
                f"--outDir={app.output_dir}",
                "--emptyOutDir",
            ],
            staging_dir,
            f"build {app.slug} static bundle",
        )

    inject_base_href(app.output_dir / "index.html", app.base_href)


def build_required(source_dir: Path, output_dir: Path) -> bool:
    output_index = output_dir / "index.html"
    if not output_index.is_file():
        return True
    return latest_mtime(source_dir) > latest_mtime(output_dir)


def latest_mtime(path: Path) -> float:
    latest = 0.0
    for root, directory_names, file_names in os.walk(path):
        directory_names[:] = [
            name for name in directory_names if name not in IGNORED_SOURCE_DIRECTORIES
        ]
        for file_name in file_names:
            try:
                latest = max(latest, (Path(root) / file_name).stat().st_mtime)
            except OSError:
                continue
    return latest


def run_command(command: list[str], cwd: Path, description: str) -> None:
    print(f"Starting to {description}")
    try:
        subprocess.run(command, cwd=cwd, check=True)
    except FileNotFoundError as exc:
        raise RuntimeError(f"Unable to {description}: '{command[0]}' was not found") from exc
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(
            f"Unable to {description}: command exited with status {exc.returncode}"
        ) from exc


def inject_base_href(index_path: Path, base_href: str) -> None:
    try:
        html = index_path.read_text(encoding="utf-8")
    except OSError as exc:
        raise RuntimeError(f"Unable to update {index_path} with a base href") from exc

    base_tag = f'    <base href="{base_href}" />\n'
    if "<base " not in html:
        if "<head>" not in html:
            raise RuntimeError(f"Unable to inject a base href into {index_path}")
        html = html.replace("<head>\n", f"<head>\n{base_tag}", 1)

    try:
        index_path.write_text(html, encoding="utf-8")
    except OSError as exc:
        raise RuntimeError(f"Unable to write updated HTML to {index_path}") from exc


if __name__ == "__main__":
    main()
