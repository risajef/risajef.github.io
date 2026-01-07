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
        log.warning("auto_snippets requires a 'lang' metadata entry on %s", page.file.src_path)
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
    lang = (getattr(page, "meta", None) or {}).get("lang") or getattr(page.file, "locale", None)
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
    lines = ["<!-- AUTO-GENERATED: snippet list. Update individual posts instead. -->", ""]
    for entry in entries:
        if entry.start_line > 1:
            directive = f'--8<-- "{entry.rel_path}:{entry.start_line}:"'
        else:
            directive = f'--8<-- "{entry.rel_path}"'
        lines.append(directive)
        lines.append("")
    return "\n".join(lines).strip() + "\n"
