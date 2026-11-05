#!/usr/bin/env python3
"""Validate critical rendered-site contracts after a strict MkDocs build."""

from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit

from bs4 import BeautifulSoup
import yaml

try:
    from .routes import normalize_redirect_target
except ImportError:
    from routes import normalize_redirect_target


PROJECT_DIR = Path(__file__).resolve().parents[1]
CONFIG_PATH = PROJECT_DIR / "mkdocs.yml"
CONFIG = yaml.safe_load(CONFIG_PATH.read_text(encoding="utf-8"))
SITE_DIR = PROJECT_DIR / CONFIG.get("site_dir", "site")
SITE_URL = CONFIG["site_url"].rstrip("/")
DEFAULT_SOCIAL_IMAGE = f"{SITE_URL}/output.png"
UNLISTED_PUBLIC_PAGES = (
    "zonenplanaenderung",
    "werkhof-baukredit",
    "e-id",
)
PAGES = {
    "index.html": {
        "language": "en",
        "canonical": f"{SITE_URL}/",
        "switches": {"En": "./", "De": "de/"},
    },
    "de/index.html": {
        "language": "de",
        "canonical": f"{SITE_URL}/de/",
        "switches": {"En": "../", "De": "./"},
    },
    "politik/index.html": {
        "language": "en",
        "canonical": f"{SITE_URL}/politik/",
        "switches": {"En": "./", "De": "../de/politik/"},
    },
    "de/politik/index.html": {
        "language": "de",
        "canonical": f"{SITE_URL}/de/politik/",
        "switches": {"En": "../../politik/", "De": "./"},
    },
}


def main() -> None:
    failures: list[str] = []
    for relative_path, expected in PAGES.items():
        failures.extend(check_page(relative_path, expected))
    failures.extend(check_redirects())
    failures.extend(check_unlisted_public_pages())
    failures.extend(check_inline_mermaid_svg())
    failures.extend(check_local_assets())
    if failures:
        raise SystemExit("\n".join(failures))
    print(f"Validated {len(PAGES)} rendered pages, redirects, and unlisted public pages")


def check_page(relative_path: str, expected: dict[str, object]) -> list[str]:
    page_path = SITE_DIR / relative_path
    if not page_path.is_file():
        return [f"Missing rendered page: {relative_path}"]

    soup = BeautifulSoup(page_path.read_text(encoding="utf-8"), "html.parser")
    failures: list[str] = []
    language = expected["language"]
    if soup.html is None or soup.html.get("lang") != language:
        failures.append(f"{relative_path}: expected html lang={language!r}")

    canonical = soup.select_one('link[rel="canonical"]')
    canonical_url = canonical.get("href") if canonical else None
    if canonical_url != expected["canonical"]:
        failures.append(f"{relative_path}: expected canonical {expected['canonical']!r}, got {canonical_url!r}")

    for selector in ('meta[property="og:image"]', 'meta[name="twitter:image"]'):
        image = soup.select_one(selector)
        image_url = image.get("content") if image else None
        if image_url != DEFAULT_SOCIAL_IMAGE:
            failures.append(f"{relative_path}: expected {selector} to be {DEFAULT_SOCIAL_IMAGE!r}, got {image_url!r}")

    switches = {link.get_text(strip=True): link.get("href") for link in soup.select(".language-switcher a")}
    if switches != expected["switches"]:
        failures.append(f"{relative_path}: expected language switches {expected['switches']!r}, got {switches!r}")

    script = soup.select_one('script[type="application/ld+json"]')
    if script is None or not script.string:
        failures.append(f"{relative_path}: missing JSON-LD script")
    else:
        try:
            structured_data = json.loads(script.string)
        except json.JSONDecodeError as error:
            failures.append(f"{relative_path}: invalid JSON-LD: {error}")
        else:
            if structured_data.get("mainEntityOfPage", {}).get("@id") != expected["canonical"]:
                failures.append(f"{relative_path}: JSON-LD canonical URL does not match")

    return failures


def check_redirects() -> list[str]:
    config = yaml.safe_load(CONFIG_PATH.read_text(encoding="utf-8"))
    redirects = ((config.get("extra") or {}).get("redirects") or {}).items()
    base_path = urlsplit(config.get("site_url") or "").path.rstrip("/")
    failures: list[str] = []

    for old_path, new_path in redirects:
        expected_url = normalize_redirect_target(new_path, base_path)
        redirect_path = SITE_DIR / old_path / "index.html"
        if not redirect_path.is_file():
            failures.append(f"Missing redirect page: {old_path}")
            continue

        soup = BeautifulSoup(redirect_path.read_text(encoding="utf-8"), "html.parser")
        canonical = soup.select_one('link[rel="canonical"]')
        canonical_url = canonical.get("href") if canonical else None
        refresh = soup.select_one('meta[http-equiv="refresh"]')
        refresh_target = refresh.get("content") if refresh else None
        if canonical_url != expected_url:
            failures.append(f"{old_path}: expected redirect canonical {expected_url!r}, got {canonical_url!r}")
        if refresh_target != f"0; url={expected_url}":
            failures.append(f"{old_path}: expected redirect refresh target {expected_url!r}, got {refresh_target!r}")

    return failures




def check_unlisted_public_pages() -> list[str]:
    failures: list[str] = []
    for locale_prefix in ("", "de/"):
        index_path = f"{locale_prefix}politik/index.html"
        index_file = SITE_DIR / index_path
        if not index_file.is_file():
            failures.append(f"Missing politics index: {index_path}")
            continue

        soup = BeautifulSoup(index_file.read_text(encoding="utf-8"), "html.parser")
        navigation_urls = [link.get("href", "") for link in soup.select("#main-navigation a")]
        for slug in UNLISTED_PUBLIC_PAGES:
            page_path = f"{locale_prefix}politik/{slug}/index.html"
            if not (SITE_DIR / page_path).is_file():
                failures.append(f"Missing unlisted public page: {page_path}")
            if any(slug in url for url in navigation_urls):
                failures.append(f"{index_path}: unlisted page appears in navigation: {slug}")

    return failures


def check_inline_mermaid_svg() -> list[str]:
    relative_path = "de/politik/finanzen-beringen/index.html"
    page_path = SITE_DIR / relative_path
    if not page_path.is_file():
        return [f"Missing Mermaid page: {relative_path}"]

    soup = BeautifulSoup(page_path.read_text(encoding="utf-8"), "html.parser")
    if soup.select('img[src*="_mermaid_"]'):
        return [f"{relative_path}: Mermaid SVGs were not inlined"]
    if not soup.select("svg"):
        return [f"{relative_path}: expected inline Mermaid SVGs"]
    return []


def check_local_assets() -> list[str]:
    """Check emitted HTML's local runtime dependencies without executing app code."""
    failures = []
    origin = urlsplit(SITE_URL).netloc
    for page in SITE_DIR.rglob("*.html"):
        relative = page.relative_to(SITE_DIR).as_posix()
        soup = BeautifulSoup(page.read_text(encoding="utf-8"), "html.parser")
        document_url = f"{SITE_URL}/{relative}"
        base = soup.find("base", href=True)
        base_url = urljoin(document_url, str(base["href"])) if base else document_url
        for element in soup.select("script[src], link[rel=stylesheet][href], img[src], iframe[src], audio[src], source[src]"):
            value = str(element.get("src") or element.get("href"))
            resolved = urlsplit(urljoin(base_url, value))
            if resolved.scheme not in {"http", "https"} or resolved.netloc != origin:
                continue
            target = (SITE_DIR / unquote(resolved.path).lstrip("/")).resolve()
            if not target.is_relative_to(SITE_DIR.resolve()):
                failures.append(f"{relative}: asset escapes site directory: {value}")
                continue
            if resolved.path.endswith("/"):
                target /= "index.html"
            if not target.is_file():
                failures.append(f"{relative}: missing local asset: {value}")
    return failures


if __name__ == "__main__":
    main()
