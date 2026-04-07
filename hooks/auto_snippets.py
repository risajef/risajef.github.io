"""MkDocs hook to auto-generate --8<-- snippet lists for category pages."""

from __future__ import annotations

import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

from mkdocs.plugins import get_plugin_logger

log = get_plugin_logger(__name__)

PLACEHOLDER = "<!-- AUTO_SNIPPETS -->"
PROJECT_DIR = Path.cwd()
DOCS_DIR = PROJECT_DIR / "docs"
GIT_AVAILABLE = shutil.which("git") is not None
PYTHON_BLOCKS_SUBMODULE_DIR = Path("assets/python-blocks")
PYTHON_BLOCKS_OUTPUT_DIR = Path("assets/python-blocks-dist")


@dataclass
class SnippetEntry:
    rel_path: str
    start_line: int
    timestamp: int


def on_config(config, **_):
    """Capture project paths once the MkDocs config loads."""
    global PROJECT_DIR, DOCS_DIR

    config_path = getattr(config, "config_file_path", None)
    if config_path:
        PROJECT_DIR = Path(config_path).parent.resolve()
    else:
        PROJECT_DIR = Path.cwd().resolve()

    docs_dir = Path(config["docs_dir"])
    if not docs_dir.is_absolute():
        docs_dir = PROJECT_DIR / docs_dir
    DOCS_DIR = docs_dir.resolve()
    return config


def on_pre_build(config, **_):
    """Build third-party static apps before MkDocs copies docs/ assets."""
    _ensure_python_blocks_bundle()


def on_page_markdown(markdown, *, page, config, files):
    """Replace placeholder blocks with auto-generated snippet directives."""
    meta = getattr(page, "meta", {}) or {}
    auto_cfg = meta.get("auto_snippets")
    if not auto_cfg:
        return markdown

    directory, placeholder = _parse_auto_config(auto_cfg, page)
    if not directory:
        return markdown

    lang = meta.get("lang") or getattr(page.file, "locale", None)
    if not lang:
        log.warning(
            "auto_snippets requires a 'lang' metadata entry on %s", page.file.src_path
        )
        return markdown

    entries = _collect_snippet_entries(directory, lang)
    if not entries:
        log.warning(
            "auto_snippets found no %s content for lang '%s' when rendering %s",
            directory,
            lang,
            page.file.src_path,
        )
        return markdown

    block = _render_entries(entries)
    marker = placeholder or PLACEHOLDER
    if marker in markdown:
        return markdown.replace(marker, block, 1)
    return f"{markdown.rstrip()}\n\n{block}\n"


def _parse_auto_config(auto_cfg, page):
    placeholder = PLACEHOLDER
    directory: Optional[str] = None

    if isinstance(auto_cfg, str):
        directory = auto_cfg.strip()
    elif isinstance(auto_cfg, dict):
        directory = (auto_cfg.get("directory") or auto_cfg.get("path") or "").strip()
        placeholder = auto_cfg.get("placeholder", placeholder)
    else:
        log.warning(
            "auto_snippets expects a string or mapping, got %r on %s",
            auto_cfg,
            page.file.src_path,
        )

    if not directory:
        directory = _infer_directory_from_page(page)
    return directory, placeholder


def _infer_directory_from_page(page) -> Optional[str]:
    lang = (getattr(page, "meta", None) or {}).get("lang") or getattr(
        page.file, "locale", None
    )
    if not lang:
        return None
    src = Path(page.file.src_path)
    suffix = f".{lang}.md"
    if src.name.endswith(suffix):
        base = src.name[: -len(suffix)]
        inferred = (src.parent / base).as_posix()
        return inferred
    return None


def _collect_snippet_entries(directory: str, lang: str) -> List[SnippetEntry]:
    dir_path = Path(directory)
    if not dir_path.is_absolute():
        dir_path = DOCS_DIR / dir_path
    dir_path = dir_path.resolve()

    if not dir_path.exists():
        log.warning("auto_snippets directory '%s' was not found", dir_path)
        return []

    pattern = f"*.{lang}.md"
    entries: List[SnippetEntry] = []
    for file_path in sorted(dir_path.glob(pattern)):
        if file_path.is_dir():
            continue
        rel_path = file_path.relative_to(DOCS_DIR).as_posix()
        entries.append(
            SnippetEntry(
                rel_path=rel_path,
                start_line=_first_content_line(file_path),
                timestamp=_last_modified_timestamp(file_path),
            )
        )

    entries.sort(key=lambda item: (item.timestamp, item.rel_path), reverse=True)
    return entries


def _first_content_line(path: Path) -> int:
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        log.warning("auto_snippets could not read %s", path)
        return 1

    lines = text.splitlines()
    if not lines:
        return 1

    idx = 0
    if lines[0].strip() == "---":
        idx += 1
        while idx < len(lines):
            if lines[idx].strip() == "---":
                idx += 1
                break
            idx += 1

    while idx < len(lines) and not lines[idx].strip():
        idx += 1

    return idx + 1  # Convert zero-indexed counter to 1-indexed line number


def _last_modified_timestamp(path: Path) -> int:
    if GIT_AVAILABLE:
        rel_path = path
        try:
            rel_path = path.relative_to(PROJECT_DIR)
        except ValueError:
            rel_path = path
        try:
            result = subprocess.run(
                ["git", "log", "-1", "--format=%ct", "--", str(rel_path)],
                cwd=PROJECT_DIR,
                capture_output=True,
                text=True,
                check=True,
            )
            output = result.stdout.strip()
            if output:
                return int(float(output))
        except (subprocess.CalledProcessError, ValueError, FileNotFoundError):
            pass

    try:
        return int(path.stat().st_mtime)
    except OSError:
        return 0


def _render_entries(entries: List[SnippetEntry]) -> str:
    lines = [
        "<!-- AUTO-GENERATED: snippet list. Update individual posts instead. -->",
        "",
    ]
    for entry in entries:
        if entry.start_line > 1:
            directive = f'--8<-- "{entry.rel_path}:{entry.start_line}:"'
        else:
            directive = f'--8<-- "{entry.rel_path}"'
        lines.append(directive)
        lines.append("")
    return "\n".join(lines).strip() + "\n"


def on_post_build(config, **_):
    """Copy sitemap.xml to sitemap2.xml in the site directory."""
    site_dir = Path(config["site_dir"])
    src = site_dir / "sitemap.xml"
    dst = site_dir / "sitemap2.xml"
    if src.exists():
        shutil.copy2(src, dst)
        log.info("Copied sitemap.xml → sitemap2.xml")


def _ensure_python_blocks_bundle() -> None:
    source_dir = (DOCS_DIR / PYTHON_BLOCKS_SUBMODULE_DIR).resolve()
    output_dir = (DOCS_DIR / PYTHON_BLOCKS_OUTPUT_DIR).resolve()

    if not source_dir.exists():
        raise RuntimeError(
            "python-blocks submodule is missing. Run 'git submodule update --init --recursive'."
        )

    if not _python_blocks_build_required(source_dir, output_dir):
        log.info("Python Blocks bundle is up to date")
        return

    if shutil.which("npm") is None:
        raise RuntimeError(
            "npm is required to build python-blocks but was not found in PATH"
        )

    if _python_blocks_install_required(source_dir):
        _run_external_command(
            ["npm", "ci"],
            cwd=source_dir,
            description="install python-blocks dependencies",
        )

    output_dir.parent.mkdir(parents=True, exist_ok=True)
    _run_external_command(
        [
            "npm",
            "run",
            "build",
            "--",
            "--base=./",
            f"--outDir={output_dir}",
            "--emptyOutDir",
        ],
        cwd=source_dir,
        description="build python-blocks static bundle",
    )
    _inject_base_href(output_dir / "index.html", "/assets/python-blocks-dist/")


def _python_blocks_install_required(source_dir: Path) -> bool:
    node_modules_dir = source_dir / "node_modules"
    lockfile = source_dir / "package-lock.json"
    if not node_modules_dir.exists():
        return True
    if not lockfile.exists():
        return False
    try:
        return node_modules_dir.stat().st_mtime < lockfile.stat().st_mtime
    except OSError:
        return True


def _python_blocks_build_required(source_dir: Path, output_dir: Path) -> bool:
    output_index = output_dir / "index.html"
    output_assets = output_dir / "assets"
    if not output_index.exists() or not output_assets.exists():
        return True

    source_paths = [
        source_dir / "index.html",
        source_dir / "package.json",
        source_dir / "package-lock.json",
        source_dir / "vite.config.js",
        source_dir / "postcss.config.cjs",
        source_dir / "tailwind.config.cjs",
        source_dir / "src",
        source_dir / "public",
    ]
    output_paths = [output_index, output_assets]
    return _latest_mtime(source_paths) > _latest_mtime(output_paths)


def _latest_mtime(paths: List[Path]) -> float:
    latest = 0.0
    for path in paths:
        if not path.exists():
            continue
        if path.is_dir():
            for candidate in path.rglob("*"):
                if not candidate.is_file():
                    continue
                try:
                    latest = max(latest, candidate.stat().st_mtime)
                except OSError:
                    continue
            continue
        try:
            latest = max(latest, path.stat().st_mtime)
        except OSError:
            continue
    return latest


def _run_external_command(command: List[str], *, cwd: Path, description: str) -> None:
    log.info("Starting to %s", description)
    try:
        subprocess.run(command, cwd=cwd, check=True)
    except FileNotFoundError as exc:
        raise RuntimeError(
            f"Unable to {description}: '{command[0]}' was not found"
        ) from exc
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(
            f"Unable to {description}: command exited with status {exc.returncode}"
        ) from exc


def _inject_base_href(index_path: Path, base_href: str) -> None:
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
