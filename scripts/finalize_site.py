#!/usr/bin/env python3
"""Finalize MkDocs output with site-level publication artifacts."""

from __future__ import annotations

import shutil
from pathlib import Path
from urllib.parse import urlsplit

import yaml


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
            REDIRECT_HTML_TEMPLATE.format(
                url=normalize_redirect_target(new_path, base_path)
            ),
            encoding="utf-8",
        )


def normalize_redirect_target(path: str, base_path: str) -> str:
    if path.startswith(("http://", "https://", "/")):
        return path

    normalized = path.strip().strip("/")
    if not normalized:
        return f"{base_path}/" if base_path else "/"
    return f"{base_path}/{normalized}/" if base_path else f"/{normalized}/"


if __name__ == "__main__":
    main()
