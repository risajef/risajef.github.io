#!/usr/bin/env python3
"""Stage every embedded application into the MkDocs deployment asset directory."""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parents[1]
DOCS_DIR = PROJECT_DIR / "docs"
PUBLISH_ROOT = DOCS_DIR / "assets/apps"
IGNORED_SOURCE_DIRECTORIES = {".git", ".vscode", "node_modules", "dist", "build"}
IGNORED_PUBLISH_DIRECTORIES = {".git", ".vscode", "node_modules"}


@dataclass(frozen=True)
class EmbeddedApp:
    slug: str
    label: str
    source_dir: Path
    publish_dir: Path
    entry_path: Path
    build_kind: str = "copy"


EMBEDDED_APPS = (
    EmbeddedApp(
        slug="python-blocks",
        label="Python Blocks",
        source_dir=DOCS_DIR / "assets/python-blocks",
        publish_dir=PUBLISH_ROOT / "python-blocks",
        entry_path=Path("index.html"),
        build_kind="vite",
    ),
    EmbeddedApp(
        slug="hoare-logic",
        label="Hoare Logic",
        source_dir=DOCS_DIR / "assets/hoare-logic",
        publish_dir=PUBLISH_ROOT / "hoare-logic",
        entry_path=Path("index.html"),
        build_kind="vite",
    ),
    EmbeddedApp(
        slug="xml-weaver",
        label="XML Weaver",
        source_dir=DOCS_DIR / "assets/xml-weaver",
        publish_dir=PUBLISH_ROOT / "xml-weaver",
        entry_path=Path("index.html"),
        build_kind="vite",
    ),
    EmbeddedApp(
        slug="background-generator",
        label="Background Generator",
        source_dir=DOCS_DIR / "assets/background-generator",
        publish_dir=PUBLISH_ROOT / "background-generator",
        entry_path=Path("web/index.html"),
        build_kind="background-generator",
    ),
    EmbeddedApp(
        slug="parallelismus",
        label="Parallelismus",
        source_dir=DOCS_DIR / "assets/parallelismus",
        publish_dir=PUBLISH_ROOT / "parallelismus",
        entry_path=Path("dist/index.html"),
        build_kind="parallelismus",
    ),
    EmbeddedApp("buchfalten", "Buchfaltstudio", DOCS_DIR / "assets/buchfalten", PUBLISH_ROOT / "buchfalten", Path("index.html")),
    EmbeddedApp("csv-editor", "CSV Editor", DOCS_DIR / "assets/csv-editor", PUBLISH_ROOT / "csv-editor", Path("index.html")),
    EmbeddedApp("diabetes-gui", "Diabetes GUI", DOCS_DIR / "assets/diabetes_gui", PUBLISH_ROOT / "diabetes-gui", Path("index.html")),
    EmbeddedApp("linkedin-wysiwyg", "LinkedIn WYSIWYG", DOCS_DIR / "assets/linkedin-wysiwyg", PUBLISH_ROOT / "linkedin-wysiwyg", Path("index.html")),
    EmbeddedApp("reverse-chart", "Reverse Chart", DOCS_DIR / "assets/reverse-chart", PUBLISH_ROOT / "reverse-chart", Path("index.html")),
)


def main() -> None:
    for app in EMBEDDED_APPS:
        stage_embedded_app(app)


def stage_embedded_app(app: EmbeddedApp) -> None:
    if not app.source_dir.exists():
        raise RuntimeError(
            f"{app.slug} submodule is missing. Run 'git submodule update --init --recursive'."
        )
    if not build_required(app.source_dir, app.publish_dir):
        validate_entry_point(app)
        print(f"{app.label} deployment is up to date")
        return

    if app.build_kind == "copy":
        replace_with_source(app.source_dir, app.publish_dir, IGNORED_SOURCE_DIRECTORIES)
    else:
        if not (app.source_dir / "package-lock.json").is_file():
            raise RuntimeError(f"{app.slug} requires a committed package-lock.json")
        if shutil.which("npm") is None:
            raise RuntimeError(f"npm is required to build {app.slug} but was not found in PATH")
        build_node_app(app)

    validate_entry_point(app)


def build_node_app(app: EmbeddedApp) -> None:
    app.publish_dir.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=f"{app.slug}-build-") as temp_dir_name:
        staging_dir = Path(temp_dir_name) / app.source_dir.name
        shutil.copytree(
            app.source_dir,
            staging_dir,
            ignore=shutil.ignore_patterns(*IGNORED_SOURCE_DIRECTORIES),
        )
        run_command(["npm", "ci"], staging_dir, f"install {app.slug} dependencies")
        if app.build_kind == "vite":
            run_command(
                ["npm", "run", "build", "--", "--base=./", f"--outDir={app.publish_dir}", "--emptyOutDir"],
                staging_dir,
                f"build {app.slug} static bundle",
            )
            inject_base_href(app.publish_dir / app.entry_path, f"/assets/apps/{app.slug}/")
        elif app.build_kind == "background-generator":
            run_command(["npm", "run", "build:web"], staging_dir, f"build {app.slug} static bundle")
            replace_with_source(staging_dir, app.publish_dir, IGNORED_PUBLISH_DIRECTORIES)
        elif app.build_kind == "parallelismus":
            run_command(["npm", "run", "build"], staging_dir, f"build {app.slug} static bundle")
            replace_with_source(staging_dir, app.publish_dir, IGNORED_PUBLISH_DIRECTORIES)
        else:
            raise RuntimeError(f"Unknown build kind '{app.build_kind}' for {app.slug}")


def replace_with_source(source_dir: Path, destination_dir: Path, ignored: set[str]) -> None:
    if destination_dir.exists():
        shutil.rmtree(destination_dir)
    shutil.copytree(
        source_dir,
        destination_dir,
        ignore=shutil.ignore_patterns(*ignored),
    )


def validate_entry_point(app: EmbeddedApp) -> None:
    entry_point = app.publish_dir / app.entry_path
    if not entry_point.is_file():
        raise RuntimeError(f"{app.slug} did not produce {entry_point}")


def build_required(source_dir: Path, publish_dir: Path) -> bool:
    if not publish_dir.is_dir():
        return True
    return latest_mtime(source_dir) > latest_mtime(publish_dir)


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
