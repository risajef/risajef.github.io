"""Build-scoped content collections, localized links, and Markdown presentation."""
from __future__ import annotations

import html
import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

import yaml
from mkdocs.plugins import get_plugin_logger

try:
    from .embeds import add_iframe_fallback
except ImportError:
    from embeds import add_iframe_fallback

log = get_plugin_logger(__name__)
PLACEHOLDER = "<!-- AUTO_SNIPPETS -->"
TOOLS_PLACEHOLDER = "<!-- AUTO_TOOLS -->"
BLOG_ARTICLE_HEADING_PATTERN = re.compile(r"^(#\s+)(.+?)\s*$")
MARKDOWN_LINK_PATTERN = re.compile(r"^\[(?P<label>.+)\]\((?P<url>[^)]+)\)$")
MERMAID_IMAGE_PATTERN = re.compile(
    r"(?P<prefix>!\[[^\]]*\]\()(?:(?:\.\./)*)?(?P<path>assets/images/[^)\s]*_mermaid_[^)\s]*\.svg)"
)
HTML_COMMENT_PATTERN = re.compile(r"<!--.*?-->", re.DOTALL)

@dataclass
class SnippetEntry:
    rel_path: str
    start_line: int
    timestamp: int
    auto_translated: bool = False
    source_lang: Optional[str] = None
    heading_text: Optional[str] = None
    url: Optional[str] = None

class ContentBuilder:
    def __init__(self, project_dir: Path, docs_dir: Path):
        self.project_dir = project_dir
        self.docs_dir = docs_dir
        self.git_available = shutil.which("git") is not None
        self.reset()

    def reset(self):
        self.metadata = {}
        self.timestamps = {}

    def render_markdown(self, markdown, *, page, config, files):
        """Replace placeholder blocks with auto-generated Markdown."""
        meta = getattr(page, "meta", None)
        if meta is not None:
            meta["suppress_translation_banner"] = meta.get("page_type") == "iframe" or self._has_no_own_content(markdown)

        markdown = MERMAID_IMAGE_PATTERN.sub(
            lambda match: f"{match.group('prefix')}/{match.group('path')}", markdown
        )
        markdown = self._ensure_blog_self_reference(markdown, page)
        markdown = self._ensure_tools_index(markdown, page, config)
        markdown = add_iframe_fallback(markdown, page)

        meta = getattr(page, "meta", {}) or {}
        auto_cfg = meta.get("auto_snippets")
        if not auto_cfg:
            return markdown

        directory, source_files, placeholder = self._parse_auto_config(auto_cfg, page)
        if not directory and not source_files:
            return markdown

        lang = meta.get("lang") or getattr(page.file, "locale", None)
        if not lang:
            log.warning("auto_snippets requires a 'lang' metadata entry on %s", page.file.src_path)
            return markdown

        entries: List[SnippetEntry] = []
        if source_files:
            entries.extend(self._collect_source_entries(source_files, lang, page, files))
        if directory:
            entries.extend(self._collect_snippet_entries(directory, lang, files))

        if not entries:
            log.warning("auto_snippets found no content when rendering %s", page.file.src_path)
            return markdown

        block = self._render_entries(entries, lang, config)
        marker = placeholder or PLACEHOLDER
        if marker in markdown:
            return markdown.replace(marker, block, 1)
        return f"{markdown.rstrip()}\n\n{block}\n"

    def _ensure_tools_index(self, markdown: str, page, config) -> str:
        meta = getattr(page, "meta", {}) or {}
        auto_cfg = meta.get("auto_tools")
        if not auto_cfg:
            return markdown

        lang = meta.get("lang") or getattr(page.file, "locale", None)
        if not lang:
            log.warning("auto_tools requires a 'lang' metadata entry on %s", page.file.src_path)
            return markdown

        entries = self._collect_tool_entries(lang, config)
        if not entries:
            log.warning("auto_tools found no tools when rendering %s", page.file.src_path)
            return markdown

        block = self._render_tool_entries(entries, lang)
        placeholder = TOOLS_PLACEHOLDER
        if isinstance(auto_cfg, dict):
            placeholder = auto_cfg.get("placeholder", placeholder)

        if placeholder in markdown:
            return markdown.replace(placeholder, block, 1)
        return f"{markdown.rstrip()}\n\n{block}\n"

    def _has_no_own_content(self, markdown: str) -> bool:
        """Detect collection pages that only hold HTML comments and a placeholder.

        Category pages (e.g. blog/philosophy.de.md) exist solely to assemble other
        articles via ``--8<--`` snippets; the "auto-translated" banner should not
        apply to them since they have no genuine prose of their own to mistranslate.
        """
        return not HTML_COMMENT_PATTERN.sub("", markdown).strip()

    def _collect_tool_entries(self, lang: str, config) -> List[tuple[str, str]]:
        labels = self._tool_nav_labels(config, lang)
        tool_dir = self.docs_dir / "tools"
        entries: List[tuple[str, str]] = []

        for file_path in sorted(tool_dir.glob(f"*.{lang}.md")):
            if not file_path.is_file():
                continue
            slug = file_path.name[: -len(f".{lang}.md")]
            title = labels.get(slug) or self._title_from_slug(slug)
            entries.append((title, slug))

        return sorted(entries, key=lambda item: item[0].casefold())

    def _tool_nav_labels(self, config, lang: str) -> dict[str, str]:
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

    def _title_from_slug(self, slug: str) -> str:
        return " ".join(part.upper() if part in {"csv", "xml"} else part.capitalize() for part in slug.split("-"))

    def _render_tool_entries(self, entries: List[tuple[str, str]], lang: str) -> str:
        return "\n".join(f"- [{title}](tools/{slug}.md)" for title, slug in entries)

    def _ensure_blog_self_reference(self, markdown: str, page) -> str:
        if not self._is_blog_article_page(page):
            return markdown

        lines = markdown.splitlines()
        for idx, line in enumerate(lines):
            match = BLOG_ARTICLE_HEADING_PATTERN.match(line)
            if not match:
                continue

            heading_text = self._strip_markdown_link(match.group(2).strip())
            if not heading_text:
                return markdown

            self_url = self._blog_article_url(page)
            lines[idx] = f"# [{heading_text}]({self_url})"
            return "\n".join(lines)

        return markdown

    def _is_blog_article_page(self, page) -> bool:
        src = Path(page.file.src_path).as_posix()
        return bool(re.match(r"^blog/(thoughts|philosophy|science)/[^/]+\.[a-z]{2}\.md$", src))

    def _blog_article_url(self, page) -> str:
        abs_url = getattr(page, "abs_url", None)
        if abs_url:
            return abs_url

        src = Path(page.file.src_path)
        lang = (getattr(page, "meta", None) or {}).get("lang") or getattr(page.file, "locale", None)
        stem = src.stem
        if lang:
            suffix = f".{lang}"
            if stem.endswith(suffix):
                stem = stem[: -len(suffix)]
        return f"/{src.parent.as_posix()}/{stem}/"

    def _resolve_entry_url(self, files, rel_path: str) -> Optional[str]:
        """Look up a collected article's own locale-correct URL via MkDocs' Files collection.

        Headings stored on disk (e.g. ``# [Title](/blog/philosophy/title/)``) are not
        locale-prefixed, so relying on them verbatim sends German readers to the
        English URL. ``files`` already reflects each file's final, locale-aware
        destination, so it is the source of truth instead.
        """
        if files is None:
            return None
        entry_file = files.get_file_from_path(rel_path)
        if entry_file is None:
            return None
        return "/" + entry_file.url.lstrip("/")

    def _read_heading_text(self, path: Path, line_number: int) -> Optional[str]:
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except OSError:
            return None
        if line_number < 1 or line_number > len(lines):
            return None
        match = BLOG_ARTICLE_HEADING_PATTERN.match(lines[line_number - 1])
        if not match:
            return None
        return self._strip_markdown_link(match.group(2).strip())

    def _strip_markdown_link(self, text: str) -> str:
        link_match = MARKDOWN_LINK_PATTERN.match(text)
        if link_match:
            return link_match.group("label")
        return text

    def _parse_auto_config(self, auto_cfg, page):
        placeholder = PLACEHOLDER
        directory: Optional[str] = None
        source_files: List[str] = []

        if isinstance(auto_cfg, str):
            directory = auto_cfg.strip()
        elif isinstance(auto_cfg, dict):
            directory = (auto_cfg.get("directory") or auto_cfg.get("path") or "").strip()
            source_files = self._normalize_source_files(auto_cfg.get("files") or auto_cfg.get("sources"), page)
            placeholder = auto_cfg.get("placeholder", placeholder)
        else:
            log.warning(
                "auto_snippets expects a string or mapping, got %r on %s",
                auto_cfg,
                page.file.src_path,
            )

        if not directory and not source_files:
            directory = self._infer_directory_from_page(page)
        return directory, source_files, placeholder

    def _normalize_source_files(self, raw_value, page) -> List[str]:
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

    def _infer_directory_from_page(self, page) -> Optional[str]:
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

    def _collect_snippet_entries(self, directory: str, lang: str, files) -> List[SnippetEntry]:
        dir_path = Path(directory)
        if not dir_path.is_absolute():
            dir_path = self.docs_dir / dir_path
        dir_path = dir_path.resolve()

        if not dir_path.exists():
            log.warning("auto_snippets directory '%s' was not found", dir_path)
            return []

        pattern = f"*.{lang}.md"
        entries: List[SnippetEntry] = []
        for file_path in sorted(dir_path.glob(pattern)):
            if file_path.is_dir():
                continue
            rel_path = file_path.relative_to(self.docs_dir).as_posix()
            auto_translated, source_lang = self._entry_translation_info(file_path)
            heading_line = self._first_content_line(file_path)
            entries.append(
                SnippetEntry(
                    rel_path=rel_path,
                    start_line=heading_line,
                    timestamp=self._last_modified_timestamp(file_path),
                    auto_translated=auto_translated,
                    source_lang=source_lang,
                    heading_text=self._read_heading_text(file_path, heading_line),
                    url=self._resolve_entry_url(files, rel_path),
                )
            )

        entries.sort(key=lambda item: (item.timestamp, item.rel_path), reverse=True)
        return entries

    def _collect_source_entries(self, source_files: List[str], lang: str, page, files) -> List[SnippetEntry]:
        entries: List[SnippetEntry] = []

        for source in source_files:
            file_path = self._resolve_source_file_path(source, lang, page)
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
                rel_path = file_path.relative_to(self.docs_dir).as_posix()
            except ValueError:
                log.warning(
                    "auto_snippets source '%s' is outside docs_dir when rendering %s",
                    source,
                    page.file.src_path,
                )
                continue

            auto_translated, source_lang = self._entry_translation_info(file_path)
            heading_line = self._first_content_line(file_path)
            entries.append(
                SnippetEntry(
                    rel_path=rel_path,
                    start_line=heading_line,
                    timestamp=0,
                    auto_translated=auto_translated,
                    source_lang=source_lang,
                    heading_text=self._read_heading_text(file_path, heading_line),
                    url=self._resolve_entry_url(files, rel_path),
                )
            )

        return entries

    def _resolve_source_file_path(self, source: str, lang: str, page) -> Path:
        source_path = self._localize_source_path(Path(source), lang)
        if source_path.is_absolute():
            return source_path.resolve()

        if source.startswith(("./", "../")):
            page_dir = (self.docs_dir / Path(page.file.src_path).parent).resolve()
            return (page_dir / source_path).resolve()

        return (self.docs_dir / source_path).resolve()

    def _localize_source_path(self, path: Path, lang: str) -> Path:
        if path.name.endswith(f".{lang}.md"):
            return path

        if path.suffix == ".md":
            if "." in path.stem:
                return path
            return path.with_name(f"{path.stem}.{lang}.md")

        return path.with_name(f"{path.name}.{lang}.md")

    def _first_content_line(self, path: Path) -> int:
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

        return idx + 1

    def _entry_translation_info(self, path: Path) -> tuple[bool, Optional[str]]:
        """Read a collected article's own ``auto_translated``/``source_lang`` front matter."""
        auto_translated_raw = self._read_front_matter_field(path, "auto_translated")
        auto_translated = (auto_translated_raw or "").strip().lower() == "true"
        source_lang = self._read_front_matter_field(path, "source_lang")
        return auto_translated, source_lang

    def _read_front_matter_field(self, path: Path, field: str):
        if path not in self.metadata:
            try:
                text = path.read_text(encoding="utf-8")
            except OSError:
                return None
            lines = text.splitlines()
            value = {}
            if lines and lines[0].strip() == "---":
                for end in range(1, len(lines)):
                    if lines[end].strip() == "---":
                        parsed = yaml.safe_load("\n".join(lines[1:end])) or {}
                        if not isinstance(parsed, dict):
                            raise ValueError(f"Front matter must be a mapping: {path}")
                        value = parsed
                        break
            self.metadata[path] = value
        value = self.metadata[path].get(field)
        return str(value) if value is not None else None

    def _last_modified_timestamp(self, path: Path) -> int:
        if path in self.timestamps:
            return self.timestamps[path]
        timestamp = self._read_last_modified_timestamp(path)
        self.timestamps[path] = timestamp
        return timestamp

    def _read_last_modified_timestamp(self, path: Path) -> int:
        if self.git_available:
            rel_path = path
            try:
                rel_path = path.relative_to(self.project_dir)
            except ValueError:
                rel_path = path
            try:
                result = subprocess.run(
                    ["git", "log", "-1", "--format=%ct", "--", str(rel_path)],
                    cwd=self.project_dir,
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

    def _render_entries(self, entries: List[SnippetEntry], lang: str, config) -> str:
        """Render each collected article, inserting a translation notice right after its own heading."""
        lines = [
            "<!-- AUTO-GENERATED: snippet list. Update individual posts instead. -->",
            "",
        ]
        for entry in entries:
            if entry.start_line > 1 and entry.heading_text and entry.url:
                heading_line = entry.start_line
                lines.append(f"# [{entry.heading_text}]({entry.url})")
                lines.append("")
                if entry.auto_translated:
                    lines.append(self._collected_translation_notice(config, lang, entry.source_lang))
                    lines.append("")
                lines.append(f'--8<-- "{entry.rel_path}:{heading_line + 1}:"')
            elif entry.start_line > 1:
                lines.append(f'--8<-- "{entry.rel_path}:{entry.start_line}:"')
            else:
                lines.append(f'--8<-- "{entry.rel_path}"')
            lines.append("")
        return "\n".join(lines).strip() + "\n"

    def _collected_translation_notice(self, config, lang: str, source_lang: Optional[str]) -> str:
        """Render a per-article disclaimer matching the whole-page auto-translation banner."""
        translations = (config.get("extra") or {}).get("translations", {}).get(lang, {})
        title = translations.get("auto_translation_title", "Automated translation.")
        if source_lang:
            template = translations.get(
                "collected_translation_notice",
                "This article was machine translated from {lang} and may contain mistakes.",
            )
            sentence = template.replace("{lang}", source_lang.upper())
        else:
            sentence = translations.get(
                "collected_translation_notice_generic",
                "This article was machine translated and may contain mistakes.",
            )
        return (
            '<div class="collected-translation-notice" role="status">'
            f"<strong>{html.escape(title)}</strong> {html.escape(sentence)}"
            "</div>"
        )
