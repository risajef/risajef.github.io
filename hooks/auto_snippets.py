"""MkDocs hook to auto-generate --8<-- snippet lists for category pages."""

from __future__ import annotations

import hashlib
import json
import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional
from urllib.parse import unquote_plus, urljoin, urlparse

from bs4 import BeautifulSoup
from mkdocs.plugins import get_plugin_logger
from mkdocs_mermaid_to_svg.image_generator import MermaidImageGenerator

log = get_plugin_logger(__name__)

PLACEHOLDER = "<!-- AUTO_SNIPPETS -->"
TOOLS_PLACEHOLDER = "<!-- AUTO_TOOLS -->"
PROJECT_DIR = Path.cwd()
DOCS_DIR = PROJECT_DIR / "docs"
GIT_AVAILABLE = shutil.which("git") is not None
BLOG_ARTICLE_HEADING_PATTERN = re.compile(r"^(#\s+)(.+?)\s*$")
MARKDOWN_LINK_PATTERN = re.compile(r"^\[(?P<label>.+)\]\((?P<url>[^)]+)\)$")
MERMAID_IMAGE_PATTERN = re.compile(
    r"(?P<prefix>!\[[^\]]*\]\()(?:(?:\.\./)*)?(?P<path>assets/images/[^)\s]*_mermaid_[^)\s]*\.svg)"
)


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

    # mkdocs-rss-plugin converts this to datetime on the first locale build.
    # mkdocs-static-i18n reuses the plugin instance for the next locale.
    rss_plugin = config.plugins.get("rss")
    if rss_plugin is not None:
        rss_plugin.config.date_from_meta.default_time = "00:00"

    _install_mermaid_cache(config)
    return config


def on_page_content(html, *, page, config, files):
    """Inline local SVG images emitted by the Mermaid renderer."""
    soup = BeautifulSoup(html, features="html.parser")
    page_url = urlparse(page.url)
    changed = False

    for image in soup.find_all("img"):
        image_source = image.get("src")
        if not isinstance(image_source, str):
            continue
        image_url = urlparse(image_source)
        if image_url.scheme or image_url.netloc or not image_url.path.endswith(".svg"):
            continue

        asset_path = image_url.path.lstrip("./")
        while asset_path.startswith("../"):
            asset_path = asset_path[3:]
        resolved_path = (
            image_url.path
            if image_url.path.startswith("/")
            else f"/{asset_path}"
            if asset_path.startswith("assets/")
            else urljoin(page_url.path, image_url.path)
        )
        svg_path = Path(config.docs_dir, *[unquote_plus(part) for part in resolved_path.lstrip("/").split("/")])

        try:
            svg = BeautifulSoup(svg_path.read_text(encoding="utf-8"), "xml")
        except OSError:
            log.warning("Could not inline SVG %s", svg_path)
            continue

        for element in svg.find_all(class_="do-not-inline"):
            element.decompose()
        image.replace_with(svg)
        changed = True

    return str(soup) if changed else html


class CachingMermaidImageGenerator(MermaidImageGenerator):
    """Reuse Mermaid SVGs when their diagram source and settings are unchanged."""

    def generate(self, mermaid_code, output_path, config, page_file=None):
        output = Path(output_path)
        fingerprint = hashlib.sha256(
            json.dumps(
                {
                    "version": 1,
                    "mermaid_code": mermaid_code,
                    "config": config,
                },
                default=str,
                sort_keys=True,
            ).encode("utf-8")
        ).hexdigest()
        marker_key = hashlib.sha256(str(output.resolve()).encode("utf-8")).hexdigest()
        marker = PROJECT_DIR / ".cache" / "mkdocs-mermaid" / f"{marker_key}.json"

        try:
            cached = json.loads(marker.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            cached = None
        if output.is_file() and cached and cached.get("fingerprint") == fingerprint:
            log.debug("Reusing cached Mermaid SVG %s", output)
            return True

        generated = super().generate(mermaid_code, output_path, config, page_file)
        if generated and output.is_file():
            marker.parent.mkdir(parents=True, exist_ok=True)
            marker.write_text(
                json.dumps({"fingerprint": fingerprint}, sort_keys=True) + "\n",
                encoding="utf-8",
            )
        return generated


def _install_mermaid_cache(config) -> None:
    """Install the owned cache adapter after the Mermaid plugin initializes."""
    plugin = config.plugins.get("mermaid-to-svg")
    processor = getattr(plugin, "processor", None)
    if processor is None:
        log.warning("Mermaid plugin did not initialize a processor; SVG caching is disabled")
        return
    if isinstance(processor.image_generator, CachingMermaidImageGenerator):
        return
    processor.image_generator = CachingMermaidImageGenerator(processor.config)


def on_page_markdown(markdown, *, page, config, files):
    """Replace placeholder blocks with auto-generated Markdown."""
    markdown = MERMAID_IMAGE_PATTERN.sub(
        lambda match: f"{match.group('prefix')}/{match.group('path')}", markdown
    )
    markdown = _ensure_blog_self_reference(markdown, page)
    markdown = _ensure_tools_index(markdown, page, config)

    meta = getattr(page, "meta", {}) or {}
    auto_cfg = meta.get("auto_snippets")
    if not auto_cfg:
        return markdown

    directory, source_files, placeholder = _parse_auto_config(auto_cfg, page)
    if not directory and not source_files:
        return markdown

    lang = meta.get("lang") or getattr(page.file, "locale", None)
    if not lang:
        log.warning("auto_snippets requires a 'lang' metadata entry on %s", page.file.src_path)
        return markdown

    entries: List[SnippetEntry] = []
    if source_files:
        entries.extend(_collect_source_entries(source_files, lang, page))
    if directory:
        entries.extend(_collect_snippet_entries(directory, lang))

    if not entries:
        log.warning("auto_snippets found no content when rendering %s", page.file.src_path)
        return markdown

    block = _render_entries(entries)
    marker = placeholder or PLACEHOLDER
    if marker in markdown:
        return markdown.replace(marker, block, 1)
    return f"{markdown.rstrip()}\n\n{block}\n"


def _ensure_tools_index(markdown: str, page, config) -> str:
    meta = getattr(page, "meta", {}) or {}
    auto_cfg = meta.get("auto_tools")
    if not auto_cfg:
        return markdown

    lang = meta.get("lang") or getattr(page.file, "locale", None)
    if not lang:
        log.warning("auto_tools requires a 'lang' metadata entry on %s", page.file.src_path)
        return markdown

    entries = _collect_tool_entries(lang, config)
    if not entries:
        log.warning("auto_tools found no tools when rendering %s", page.file.src_path)
        return markdown

    block = _render_tool_entries(entries, lang)
    placeholder = TOOLS_PLACEHOLDER
    if isinstance(auto_cfg, dict):
        placeholder = auto_cfg.get("placeholder", placeholder)

    if placeholder in markdown:
        return markdown.replace(placeholder, block, 1)
    return f"{markdown.rstrip()}\n\n{block}\n"


def _collect_tool_entries(lang: str, config) -> List[tuple[str, str]]:
    labels = _tool_nav_labels(config, lang)
    tool_dir = DOCS_DIR / "tools"
    entries: List[tuple[str, str]] = []

    for file_path in sorted(tool_dir.glob(f"*.{lang}.md")):
        if not file_path.is_file():
            continue
        slug = file_path.name[: -len(f".{lang}.md")]
        title = labels.get(slug) or _title_from_slug(slug)
        entries.append((title, slug))

    return sorted(entries, key=lambda item: item[0].casefold())


def _tool_nav_labels(config, lang: str) -> dict[str, str]:
    labels: dict[str, str] = {}
    translations = (config.get("extra") or {}).get("translations", {}).get(lang, {}).get("nav", {})

    def visit(items, in_tools: bool = False) -> None:
        for item in items or []:
            if not isinstance(item, dict):
                continue
            for label, value in item.items():
                if label == "Tools" and isinstance(value, list):
                    visit(value, True)
                    continue
                if in_tools and isinstance(value, str) and value.startswith("tools/"):
                    path = Path(value)
                    if path.suffix == ".md":
                        display = translations.get(label, label)
                        labels[path.stem] = display
                elif isinstance(value, list):
                    visit(value, False)

    visit(config.get("nav"))
    return labels


def _title_from_slug(slug: str) -> str:
    return " ".join(part.upper() if part in {"csv", "xml"} else part.capitalize() for part in slug.split("-"))


def _render_tool_entries(entries: List[tuple[str, str]], lang: str) -> str:
    return "\n".join(f"- [{title}](tools/{slug}.md)" for title, slug in entries)


def _ensure_blog_self_reference(markdown: str, page) -> str:
    if not _is_blog_article_page(page):
        return markdown

    lines = markdown.splitlines()
    for idx, line in enumerate(lines):
        match = BLOG_ARTICLE_HEADING_PATTERN.match(line)
        if not match:
            continue

        heading_text = _strip_markdown_link(match.group(2).strip())
        if not heading_text:
            return markdown

        self_url = _blog_article_url(page)
        lines[idx] = f"# [{heading_text}]({self_url})"
        return "\n".join(lines)

    return markdown


def _is_blog_article_page(page) -> bool:
    src = Path(page.file.src_path).as_posix()
    return bool(re.match(r"^blog/(thoughts|philosophy|science)/[^/]+\.[a-z]{2}\.md$", src))


def _blog_article_url(page) -> str:
    src = Path(page.file.src_path)
    lang = (getattr(page, "meta", None) or {}).get("lang") or getattr(page.file, "locale", None)
    stem = src.stem
    if lang:
        suffix = f".{lang}"
        if stem.endswith(suffix):
            stem = stem[: -len(suffix)]
    return f"/{src.parent.as_posix()}/{stem}/"


def _strip_markdown_link(text: str) -> str:
    link_match = MARKDOWN_LINK_PATTERN.match(text)
    if link_match:
        return link_match.group("label")
    return text


def _parse_auto_config(auto_cfg, page):
    placeholder = PLACEHOLDER
    directory: Optional[str] = None
    source_files: List[str] = []

    if isinstance(auto_cfg, str):
        directory = auto_cfg.strip()
    elif isinstance(auto_cfg, dict):
        directory = (auto_cfg.get("directory") or auto_cfg.get("path") or "").strip()
        source_files = _normalize_source_files(auto_cfg.get("files") or auto_cfg.get("sources"), page)
        placeholder = auto_cfg.get("placeholder", placeholder)
    else:
        log.warning(
            "auto_snippets expects a string or mapping, got %r on %s",
            auto_cfg,
            page.file.src_path,
        )

    if not directory and not source_files:
        directory = _infer_directory_from_page(page)
    return directory, source_files, placeholder


def _normalize_source_files(raw_value, page) -> List[str]:
    if not raw_value:
        return []

    if isinstance(raw_value, str):
        value = raw_value.strip()
        return [value] if value else []

    if not isinstance(raw_value, (list, tuple)):
        log.warning(
            "auto_snippets.files expects a string or list, got %r on %s",
            raw_value,
            page.file.src_path,
        )
        return []

    files: List[str] = []
    for item in raw_value:
        if not isinstance(item, str):
            log.warning(
                "auto_snippets.files entries must be strings, got %r on %s",
                item,
                page.file.src_path,
            )
            continue
        value = item.strip()
        if value:
            files.append(value)
    return files


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


def _collect_source_entries(source_files: List[str], lang: str, page) -> List[SnippetEntry]:
    entries: List[SnippetEntry] = []

    for source in source_files:
        file_path = _resolve_source_file_path(source, lang, page)
        if not file_path.exists():
            log.warning(
                "auto_snippets source '%s' was not found when rendering %s",
                source,
                page.file.src_path,
            )
            continue
        if file_path.is_dir():
            log.warning(
                "auto_snippets source '%s' resolved to a directory on %s; use 'directory' instead",
                source,
                page.file.src_path,
            )
            continue

        try:
            rel_path = file_path.relative_to(DOCS_DIR).as_posix()
        except ValueError:
            log.warning(
                "auto_snippets source '%s' is outside docs_dir when rendering %s",
                source,
                page.file.src_path,
            )
            continue

        entries.append(
            SnippetEntry(
                rel_path=rel_path,
                start_line=_first_content_line(file_path),
                timestamp=0,
            )
        )

    return entries


def _resolve_source_file_path(source: str, lang: str, page) -> Path:
    source_path = _localize_source_path(Path(source), lang)
    if source_path.is_absolute():
        return source_path.resolve()

    if source.startswith(("./", "../")):
        page_dir = (DOCS_DIR / Path(page.file.src_path).parent).resolve()
        return (page_dir / source_path).resolve()

    return (DOCS_DIR / source_path).resolve()


def _localize_source_path(path: Path, lang: str) -> Path:
    if path.name.endswith(f".{lang}.md"):
        return path

    if path.suffix == ".md":
        if "." in path.stem:
            return path
        return path.with_name(f"{path.stem}.{lang}.md")

    return path.with_name(f"{path.name}.{lang}.md")


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
