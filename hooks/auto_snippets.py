"""MkDocs hook to auto-generate --8<-- snippet lists for category pages."""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional
from urllib.parse import urlsplit

from mkdocs.plugins import get_plugin_logger

log = get_plugin_logger(__name__)

PLACEHOLDER = "<!-- AUTO_SNIPPETS -->"
REDIRECT_HTML_TEMPLATE = """
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Redirecting...</title>
    <link rel="canonical" href="{url}">
    <script>var anchor=window.location.hash.substr(1);location.href="{url}"+(anchor?"#"+anchor:"")</script>
    <meta http-equiv="refresh" content="0; url={url}">
</head>
<body>
You're being redirected to a <a href="{url}">new destination</a>.
</body>
</html>
""".lstrip()
PROJECT_DIR = Path.cwd()
DOCS_DIR = PROJECT_DIR / "docs"
GIT_AVAILABLE = shutil.which("git") is not None
STATIC_APP_BUILD_IGNORES = (".git", "node_modules", "dist", "build")
PYTHON_BLOCKS_SUBMODULE_DIR = Path("assets/python-blocks")
PYTHON_BLOCKS_OUTPUT_DIR = Path("assets/python-blocks-dist")
HOARE_LOGIC_SUBMODULE_DIR = Path("assets/hoare-logic")
HOARE_LOGIC_OUTPUT_DIR = Path("assets/hoare-logic-dist")
XML_WEAVER_SUBMODULE_DIR = Path("assets/xml-weaver")
XML_WEAVER_OUTPUT_DIR = Path("assets/xml-weaver-dist")


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
    _ensure_hoare_logic_bundle()
    _ensure_xml_weaver_bundle()


def on_page_markdown(markdown, *, page, config, files):
    """Replace placeholder blocks with auto-generated snippet directives."""
    meta = getattr(page, "meta", {}) or {}
    auto_cfg = meta.get("auto_snippets")
    if not auto_cfg:
        return markdown

    directory, source_files, placeholder = _parse_auto_config(auto_cfg, page)
    if not directory and not source_files:
        return markdown

    lang = meta.get("lang") or getattr(page.file, "locale", None)
    if not lang:
        log.warning(
            "auto_snippets requires a 'lang' metadata entry on %s", page.file.src_path
        )
        return markdown

    entries: List[SnippetEntry] = []
    if source_files:
        entries.extend(_collect_source_entries(source_files, lang, page))
    if directory:
        entries.extend(_collect_snippet_entries(directory, lang))

    if not entries:
        log.warning(
            "auto_snippets found no content when rendering %s", page.file.src_path
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
    source_files: List[str] = []

    if isinstance(auto_cfg, str):
        directory = auto_cfg.strip()
    elif isinstance(auto_cfg, dict):
        directory = (auto_cfg.get("directory") or auto_cfg.get("path") or "").strip()
        source_files = _normalize_source_files(
            auto_cfg.get("files") or auto_cfg.get("sources"), page
        )
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


def _collect_source_entries(
    source_files: List[str], lang: str, page
) -> List[SnippetEntry]:
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


def on_post_build(config, **_):
    """Copy sitemap.xml and generate manual redirects in the site directory."""
    site_dir = Path(config["site_dir"])
    src = site_dir / "sitemap.xml"
    dst = site_dir / "sitemap2.xml"
    if src.exists():
        shutil.copy2(src, dst)
        log.info("Copied sitemap.xml → sitemap2.xml")
    _write_redirect_files(site_dir, config)


def _write_redirect_files(site_dir: Path, config) -> None:
    redirect_map = ((config.get("extra") or {}).get("redirects") or {}).items()
    if not redirect_map:
        return

    base_path = urlsplit(config.get("site_url") or "").path.rstrip("/")
    for old_path, new_path in redirect_map:
        old_file = site_dir / _site_path_to_output(old_path)
        if old_file.exists():
            log.warning(
                "Skipping redirect for '%s' because '%s' already exists",
                old_path,
                old_file.relative_to(site_dir),
            )
            continue

        old_file.parent.mkdir(parents=True, exist_ok=True)
        old_file.write_text(
            REDIRECT_HTML_TEMPLATE.format(
                url=_normalize_redirect_target(new_path, base_path)
            ),
            encoding="utf-8",
        )
        log.info("Created redirect %s → %s", old_path, new_path)


def _site_path_to_output(path: str) -> Path:
    normalized = path.strip().strip("/")
    if not normalized:
        return Path("index.html")
    return Path(normalized) / "index.html"


def _normalize_redirect_target(path: str, base_path: str) -> str:
    if path.startswith(("http://", "https://", "/")):
        return path

    normalized = path.strip().strip("/")
    if not normalized:
        return f"{base_path}/" if base_path else "/"

    if base_path:
        return f"{base_path}/{normalized}/"
    return f"/{normalized}/"


def _ensure_python_blocks_bundle() -> None:
    _ensure_static_app_bundle(
        slug="python-blocks",
        label="Python Blocks",
        submodule_dir=PYTHON_BLOCKS_SUBMODULE_DIR,
        output_dir=PYTHON_BLOCKS_OUTPUT_DIR,
        base_href="/assets/python-blocks-dist/",
    )


def _ensure_hoare_logic_bundle() -> None:
    _ensure_static_app_bundle(
        slug="hoare-logic",
        label="Hoare Logic",
        submodule_dir=HOARE_LOGIC_SUBMODULE_DIR,
        output_dir=HOARE_LOGIC_OUTPUT_DIR,
        base_href="/assets/hoare-logic-dist/",
    )


def _ensure_xml_weaver_bundle() -> None:
    _ensure_static_app_bundle(
        slug="xml-weaver",
        label="XML Weaver",
        submodule_dir=XML_WEAVER_SUBMODULE_DIR,
        output_dir=XML_WEAVER_OUTPUT_DIR,
        base_href="/assets/xml-weaver-dist/",
    )


def _ensure_static_app_bundle(
    *, slug: str, label: str, submodule_dir: Path, output_dir: Path, base_href: str
) -> None:
    source_dir = (DOCS_DIR / submodule_dir).resolve()
    resolved_output_dir = (DOCS_DIR / output_dir).resolve()

    if not source_dir.exists():
        raise RuntimeError(
            f"{slug} submodule is missing. Run 'git submodule update --init --recursive'."
        )

    if not _static_app_build_required(source_dir, resolved_output_dir):
        log.info("%s bundle is up to date", label)
        return

    if shutil.which("npm") is None:
        raise RuntimeError(f"npm is required to build {slug} but was not found in PATH")

    resolved_output_dir.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix=f"{slug}-build-") as temp_dir_name:
        staging_dir = Path(temp_dir_name) / source_dir.name
        shutil.copytree(
            source_dir,
            staging_dir,
            ignore=shutil.ignore_patterns(*STATIC_APP_BUILD_IGNORES),
        )
        _run_external_command(
            _npm_install_command(staging_dir),
            cwd=staging_dir,
            description=f"install {slug} dependencies",
        )
        _run_external_command(
            [
                "npm",
                "run",
                "build",
                "--",
                "--base=./",
                f"--outDir={resolved_output_dir}",
                "--emptyOutDir",
            ],
            cwd=staging_dir,
            description=f"build {slug} static bundle",
        )

    _inject_base_href(resolved_output_dir / "index.html", base_href)


def _npm_install_command(source_dir: Path) -> List[str]:
    if (source_dir / "package-lock.json").exists():
        return ["npm", "ci"]
    return ["npm", "install", "--no-package-lock"]


def _static_app_build_required(source_dir: Path, output_dir: Path) -> bool:
    output_index = output_dir / "index.html"
    if not output_index.exists():
        return True

    try:
        if not any(output_dir.iterdir()):
            return True
    except OSError:
        return True

    return _latest_mtime(
        [source_dir], ignored_dir_names=set(STATIC_APP_BUILD_IGNORES)
    ) > _latest_mtime([output_dir], ignored_dir_names=set(STATIC_APP_BUILD_IGNORES))


def _latest_mtime(
    paths: List[Path], ignored_dir_names: Optional[set[str]] = None
) -> float:
    latest = 0.0
    ignored = ignored_dir_names or set()
    for path in paths:
        if not path.exists():
            continue
        if path.is_dir():
            for root, dirnames, filenames in os.walk(path):
                dirnames[:] = [name for name in dirnames if name not in ignored]
                for filename in filenames:
                    candidate = Path(root) / filename
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
