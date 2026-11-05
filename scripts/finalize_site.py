#!/usr/bin/env python3
"""Finalize MkDocs output with site-level publication artifacts."""

from __future__ import annotations

import shutil
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit

import yaml
from bs4 import BeautifulSoup

try:
    from .routes import normalize_redirect_target
    from .rendered_audio import audio_urls
except ImportError:
    from routes import normalize_redirect_target
    from rendered_audio import audio_urls


PROJECT_DIR = Path(__file__).resolve().parents[1]
CONFIG_PATH = PROJECT_DIR / "mkdocs.yml"
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


def main() -> None:
    config = yaml.safe_load(CONFIG_PATH.read_text(encoding="utf-8"))
    site_dir = PROJECT_DIR / config.get("site_dir", "site")
    copy_sitemap(site_dir)
    write_redirects(site_dir, config)
    copy_referenced_audio(site_dir, PROJECT_DIR / config.get("docs_dir", "docs"))


def copy_referenced_audio(site_dir: Path, docs_dir: Path) -> None:
    """Preserve all locales after the TTS plugin cleans its per-locale output.

    MkDocs/Piper has already validated the cache. Copy exactly the files referenced
    by emitted players, rather than publishing the entire possibly stale cache.
    """
    audio_root = Path("assets/piper-tts/audio")
    for page in site_dir.rglob("*.html"):
        soup = BeautifulSoup(page.read_text(encoding="utf-8"), "html.parser")
        document_url = "https://site.invalid/" + page.relative_to(site_dir).as_posix()
        for value in audio_urls(soup):
            url = urlsplit(urljoin(document_url, value))
            if url.netloc != "site.invalid" or url.scheme != "https":
                continue
            relative = Path(unquote(url.path).lstrip("/"))
            source = (docs_dir / relative).resolve()
            destination = (site_dir / relative).resolve()
            if not source.is_relative_to((docs_dir / audio_root).resolve()):
                continue
            if not destination.is_relative_to((site_dir / audio_root).resolve()):
                raise ValueError(f"Audio path escapes published audio root: {value}")
            if source.suffix != ".mp3" or not source.is_file() or source.stat().st_size == 0:
                raise RuntimeError(f"Rendered playlist references missing or empty cached audio: {source}")
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)


def copy_sitemap(site_dir: Path) -> None:
    sitemap = site_dir / "sitemap.xml"
    if sitemap.is_file():
        shutil.copy2(sitemap, site_dir / "sitemap2.xml")


def write_redirects(site_dir: Path, config: dict) -> None:
    redirects = ((config.get("extra") or {}).get("redirects") or {}).items()
    base_path = urlsplit(config.get("site_url") or "").path.rstrip("/")
    for old_path, new_path in redirects:
        redirect_file = site_dir / old_path.strip("/") / "index.html"
        if redirect_file.exists():
            print(f"Skipping redirect for {old_path!r}: output already exists")
            continue

        redirect_file.parent.mkdir(parents=True, exist_ok=True)
        redirect_file.write_text(
            REDIRECT_HTML_TEMPLATE.format(url=normalize_redirect_target(new_path, base_path)),
            encoding="utf-8",
        )




if __name__ == "__main__":
    main()
