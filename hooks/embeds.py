"""Localized presentation notes for trusted embedded applications."""

import html

from bs4 import BeautifulSoup
from mkdocs.plugins import get_plugin_logger

log = get_plugin_logger(__name__)
FALLBACK_TEMPLATES = {
    "de": 'Falls die eingebettete Anwendung nicht lädt, öffne <a href="{src}">{title} direkt</a>.',
    "en": 'If the embedded app does not load, open the <a href="{src}">{title} directly</a>.',
}


def add_iframe_fallback(markdown: str, page) -> str:
    meta = getattr(page, "meta", None)
    if meta is None or meta.get("page_type") != "iframe":
        return markdown
    iframe = BeautifulSoup(markdown, "html.parser").find("iframe")
    if iframe is None:
        return markdown
    if not iframe.get("src") or not iframe.get("title"):
        log.warning("Iframe requires src and title on %s", page.file.src_path)
        return markdown
    lang = str(meta.get("lang") or getattr(page.file, "locale", None) or "en").lower().split("-", 1)[0]
    meta["iframe_fallback_note"] = FALLBACK_TEMPLATES.get(lang, FALLBACK_TEMPLATES["en"]).format(
        title=html.escape(str(iframe["title"])), src=html.escape(str(iframe["src"]), quote=True),
    )
    return markdown
