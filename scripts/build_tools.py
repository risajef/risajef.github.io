#!/usr/bin/env python3
"""Stage every embedded application into the MkDocs deployment asset directory."""

import enum
import hashlib
import json
import sys
from functools import lru_cache
from urllib.parse import unquote, urlsplit

from bs4 import BeautifulSoup

import os
import shutil
import subprocess
import tempfile
from dataclasses import dataclass, replace
from pathlib import Path

try:
    from .artifact_io import replace_directories
except ImportError:  # Direct script execution.
    from artifact_io import replace_directories

PROJECT_DIR = Path(__file__).resolve().parents[1]
DOCS_DIR = PROJECT_DIR / "docs"
PUBLISH_ROOT = DOCS_DIR / "assets/apps"
IGNORED_SOURCE_DIRECTORIES = {".git", ".vscode", "node_modules", "dist", "build"}
FINGERPRINT_FILE = ".build-input.sha256"
OUTPUT_MANIFEST = ".build-output.json"

class BuildTypes(enum.Enum):
    COPY = "copy"
    VITE = "vite"
    BACKGROUND_GENERATOR = "background-generator"
    PARALLELISMUS = "parallelismus"

@dataclass(frozen=True)
class EmbeddedApp:
    slug: str
    label: str
    source_dir: Path
    publish_dir: Path
    entry_path: Path
    build_kind: BuildTypes = BuildTypes.COPY
    stylesheet: Path | None = None
    publish_paths: tuple[str, ...] = ("index.html", "*.js", "styles.css")


EMBEDDED_APPS = (
    EmbeddedApp(
        slug="np-hard",
        label="NP Studio",
        source_dir=DOCS_DIR / "assets/np-hard",
        publish_dir=PUBLISH_ROOT / "np-hard",
        entry_path=Path("index.html"),
        build_kind=BuildTypes.VITE,
        stylesheet=DOCS_DIR / "assets/np-hard-theme.css",
    ),
    EmbeddedApp(
        slug="python-blocks",
        label="Python Blocks",
        source_dir=DOCS_DIR / "assets/python-blocks",
        publish_dir=PUBLISH_ROOT / "python-blocks",
        entry_path=Path("index.html"),
        build_kind=BuildTypes.VITE,
    ),
    EmbeddedApp(
        slug="hoare-logic",
        label="Hoare Logic",
        source_dir=DOCS_DIR / "assets/hoare-logic",
        publish_dir=PUBLISH_ROOT / "hoare-logic",
        entry_path=Path("index.html"),
        build_kind=BuildTypes.VITE,
    ),
    EmbeddedApp(
        slug="xml-weaver",
        label="XML Weaver",
        source_dir=DOCS_DIR / "assets/xml-weaver",
        publish_dir=PUBLISH_ROOT / "xml-weaver",
        entry_path=Path("index.html"),
        build_kind=BuildTypes.VITE,
    ),
    EmbeddedApp(
        slug="background-generator",
        label="Background Generator",
        source_dir=DOCS_DIR / "assets/background-generator",
        publish_dir=PUBLISH_ROOT / "background-generator",
        entry_path=Path("web/index.html"),
        build_kind=BuildTypes.BACKGROUND_GENERATOR,
        publish_paths=("web/index.html", "web/styles.css", "web/dist/*.js"),
    ),
    EmbeddedApp(
        slug="parallelismus",
        label="Parallelismus",
        source_dir=DOCS_DIR / "assets/parallelismus",
        publish_dir=PUBLISH_ROOT / "parallelismus",
        entry_path=Path("dist/index.html"),
        build_kind=BuildTypes.PARALLELISMUS,
        publish_paths=("dist/*.html", "dist/*.js", "dist/*.css", "dist/data/**/*.json", "dist/data/*.json"),
    ),
    EmbeddedApp(
        "buchfalten", "Buchfaltstudio", DOCS_DIR / "assets/buchfalten", PUBLISH_ROOT / "buchfalten", Path("index.html"),
        publish_paths=("index.html", "*.js", "styles.css", "js/*.js", "vendor/*.js", "vendor/*.LICENSE", "vendor/manifest.json"),
    ),
    EmbeddedApp("csv-editor", "CSV Editor", DOCS_DIR / "assets/csv-editor", PUBLISH_ROOT / "csv-editor", Path("index.html")),
    EmbeddedApp(
        "diabetes-gui", "Diabetes GUI", DOCS_DIR / "assets/diabetes_gui", PUBLISH_ROOT / "diabetes-gui", Path("index.html")
    ),
    EmbeddedApp(
        "linkedin-wysiwyg",
        "LinkedIn WYSIWYG",
        DOCS_DIR / "assets/linkedin-wysiwyg",
        PUBLISH_ROOT / "linkedin-wysiwyg",
        Path("index.html"),
    ),
    EmbeddedApp(
        "office",
        "Office.md",
        DOCS_DIR / "assets/office.md",
        PUBLISH_ROOT / "office",
        Path("index.html"),
        build_kind=BuildTypes.VITE,
    ),
    EmbeddedApp(
        "stammbaum",
        "Stammbaum",
        DOCS_DIR / "assets/stammbaum",
        PUBLISH_ROOT / "stammbaum",
        Path("index.html"),
        build_kind=BuildTypes.VITE,
    ),
    EmbeddedApp(
        "reverse-chart", "Reverse Chart", DOCS_DIR / "assets/reverse-chart", PUBLISH_ROOT / "reverse-chart", Path("index.html"),
        publish_paths=("index.html", "app.js", "styles.css", "*_example.png"),
    ),
)


def main() -> None:
    for app in EMBEDDED_APPS:
        stage_embedded_app(app)


def stage_embedded_app(app: EmbeddedApp) -> None:
    if not app.source_dir.exists():
        raise RuntimeError(f"{app.slug} submodule is missing. Run 'git submodule update --init --recursive'.")
    if not build_required(app):
        validate_entry_point(app)
        print(f"{app.label} deployment is up to date")
        return

    app.publish_dir.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=f".{app.slug}-artifact-", dir=app.publish_dir.parent) as directory:
        staged = replace(app, publish_dir=Path(directory) / "artifact")
        prepare_embedded_app(staged)
        replace_directories({app.publish_dir: staged.publish_dir})


def prepare_embedded_app(app: EmbeddedApp) -> None:
    if app.build_kind == BuildTypes.COPY:
        copy_runtime_files(app.source_dir, app.publish_dir, app.publish_paths)
    else:
        if not (app.source_dir / "package-lock.json").is_file():
            raise RuntimeError(f"{app.slug} requires a committed package-lock.json")
        if shutil.which("npm") is None:
            raise RuntimeError(f"npm is required to build {app.slug} but was not found in PATH")
        build_node_app(app)

    if app.stylesheet:
        shutil.copyfile(app.stylesheet, app.publish_dir / "site-theme.css")
        index_path = app.publish_dir / app.entry_path
        html = index_path.read_text(encoding="utf-8")
        html = html.replace("</head>", '    <link rel="stylesheet" href="site-theme.css" />\n  </head>', 1)
        index_path.write_text(html, encoding="utf-8")

    validate_entry_point(app)
    (app.publish_dir / OUTPUT_MANIFEST).write_text(json.dumps(output_hashes(app), sort_keys=True) + "\n", encoding="utf-8")
    (app.publish_dir / FINGERPRINT_FILE).write_text(input_fingerprint(app) + "\n", encoding="utf-8")


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

        match app.build_kind:
            case BuildTypes.VITE:
                run_command(
                    ["npm", "run", "build", "--", "--base=./", f"--outDir={app.publish_dir}", "--emptyOutDir"],
                    staging_dir,
                    f"build {app.slug} static bundle",
                )
                inject_base_href(app.publish_dir / app.entry_path, f"/assets/apps/{app.slug}/")
            case BuildTypes.BACKGROUND_GENERATOR:
                run_command(["npm", "run", "build:web"], staging_dir, f"build {app.slug} static bundle")
                copy_runtime_files(staging_dir, app.publish_dir, app.publish_paths)
            case BuildTypes.PARALLELISMUS:
                run_command(["npm", "run", "build"], staging_dir, f"build {app.slug} static bundle")
                copy_runtime_files(staging_dir, app.publish_dir, app.publish_paths)
            case _:
                raise RuntimeError(f"Unknown build kind '{app.build_kind}' for {app.slug}")


def copy_runtime_files(source_dir: Path, destination_dir: Path, patterns: tuple[str, ...]) -> None:
    """Publish only the app's declared runtime paths, never its source tree."""
    selected = set()
    for pattern in patterns:
        if Path(pattern).is_absolute() or ".." in Path(pattern).parts:
            raise ValueError(f"Invalid deployment path: {pattern}")
        selected.update(path for path in source_dir.glob(pattern) if path.is_file())
    for path in selected:
        relative = path.relative_to(source_dir)
        if any(part.startswith(".") for part in relative.parts) or any(
            parent.is_symlink() for parent in (path, *path.parents) if parent != source_dir.parent
        ):
            raise RuntimeError(f"Unsafe runtime artifact: {path}")
    if destination_dir.exists():
        shutil.rmtree(destination_dir)
    destination_dir.mkdir(parents=True)
    for path in sorted(selected):
        destination = destination_dir / path.relative_to(source_dir)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, destination)


def validate_entry_point(app: EmbeddedApp) -> None:
    entry_point = app.publish_dir / app.entry_path
    if not entry_point.is_file():
        raise RuntimeError(f"{app.slug} did not produce {entry_point}")
    for html_path in app.publish_dir.rglob("*.html"):
        soup = BeautifulSoup(html_path.read_text(encoding="utf-8"), "html.parser")
        for element in soup.select("script[src], link[rel=stylesheet][href], img[src]"):
            value = str(element.get("src") or element.get("href"))
            url = urlsplit(value)
            if url.scheme or url.netloc or not url.path or url.path.startswith("/"):
                continue
            dependency = (html_path.parent / unquote(url.path)).resolve()
            # Shared site styles live outside the app's artifact root.
            if dependency.is_relative_to(app.publish_dir.resolve()) and not dependency.is_file():
                raise RuntimeError(f"{app.slug} references missing runtime file: {value}")


def output_hashes(app: EmbeddedApp) -> dict[str, str]:
    hashes = {}
    for path in sorted(app.publish_dir.rglob("*")):
        if path.is_symlink():
            raise RuntimeError(f"Artifact contains a symlink: {path}")
        if path.is_file() and path.name not in {FINGERPRINT_FILE, OUTPUT_MANIFEST}:
            digest = hashlib.sha256()
            with path.open("rb") as handle:
                for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                    digest.update(chunk)
            hashes[path.relative_to(app.publish_dir).as_posix()] = digest.hexdigest()
    return hashes


def build_required(app: EmbeddedApp) -> bool:
    if not app.publish_dir.is_dir():
        return True
    try:
        stored_fingerprint = (app.publish_dir / FINGERPRINT_FILE).read_text(encoding="utf-8").strip()
        outputs = json.loads((app.publish_dir / OUTPUT_MANIFEST).read_text(encoding="utf-8"))
        if not outputs or outputs != output_hashes(app):
            return True
    except (OSError, ValueError, RuntimeError):
        return True
    return stored_fingerprint != input_fingerprint(app)


@lru_cache(maxsize=1)
def node_toolchain() -> bytes:
    return b"\0".join(subprocess.run([name, "--version"], check=True, capture_output=True).stdout.strip()
                       for name in ("node", "npm"))


def input_fingerprint(app: EmbeddedApp) -> str:
    digest = hashlib.sha256()
    digest.update(f"{app.slug}\0{app.build_kind.value}\0{app.entry_path}\0".encode())
    digest.update(Path(__file__).read_bytes())
    digest.update(sys.version.encode())
    digest.update(json.dumps(app.publish_paths).encode())
    if app.build_kind != BuildTypes.COPY:
        digest.update(node_toolchain())
    if app.stylesheet:
        digest.update(app.stylesheet.read_bytes())
    for root, directory_names, file_names in os.walk(app.source_dir):
        directory_names[:] = sorted(name for name in directory_names if name not in IGNORED_SOURCE_DIRECTORIES)
        for file_name in sorted(file_names):
            file_path = Path(root) / file_name
            if file_name in IGNORED_SOURCE_DIRECTORIES:
                continue
            if file_path.is_symlink():
                raise RuntimeError(f"Source contains a symlink: {file_path}")
            digest.update(file_path.relative_to(app.source_dir).as_posix().encode())
            with file_path.open("rb") as source_file:
                while chunk := source_file.read(1024 * 1024):
                    digest.update(chunk)
    return digest.hexdigest()


def run_command(command: list[str], cwd: Path, description: str) -> None:
    print(f"Starting to {description}")
    try:
        subprocess.run(command, cwd=cwd, check=True)
    except FileNotFoundError as exc:
        raise RuntimeError(f"Unable to {description}: '{command[0]}' was not found") from exc
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(f"Unable to {description}: command exited with status {exc.returncode}") from exc


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
