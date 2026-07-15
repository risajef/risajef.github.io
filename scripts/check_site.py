#!/usr/bin/env python3
"""Validate critical rendered-site contracts after a strict MkDocs build."""

from __future__ import annotations

import json
from pathlib import Path

from bs4 import BeautifulSoup


PROJECT_DIR = Path(__file__).resolve().parents[1]
SITE_DIR = PROJECT_DIR / "site"
SITE_URL = "https://retoweber.info"
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
    if failures:
        raise SystemExit("\n".join(failures))
    print(f"Validated {len(PAGES)} rendered pages")


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
        failures.append(
            f"{relative_path}: expected canonical {expected['canonical']!r}, got {canonical_url!r}"
        )

    switches = {
        link.get_text(strip=True): link.get("href")
        for link in soup.select(".language-switcher a")
    }
    if switches != expected["switches"]:
        failures.append(
            f"{relative_path}: expected language switches {expected['switches']!r}, got {switches!r}"
        )

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


if __name__ == "__main__":
    main()