"""Pinned Mermaid plugin adaptation and generated-diagram SVG handling."""

import hashlib
import json
import subprocess
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse

from bs4 import BeautifulSoup
from mkdocs.plugins import get_plugin_logger
from mkdocs_mermaid_to_svg.image_generator import MermaidImageGenerator

log = get_plugin_logger(__name__)

def inline_mermaid_svg(html, *, page, config):
    """Inline local SVG images emitted by the Mermaid renderer."""
    soup = BeautifulSoup(html, features="html.parser")
    page_url = urlparse(page.url)
    changed = False

    for image in soup.find_all("img"):
        image_source = image.get("src")
        if not isinstance(image_source, str):
            continue
        image_url = urlparse(image_source)
        if image_url.scheme or image_url.netloc or not image_url.path.endswith(".svg") or "_mermaid_" not in image_url.path:
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
        svg_path = Path(config.docs_dir, *[unquote(part) for part in resolved_path.lstrip("/").split("/")])

        svg_path = svg_path.resolve()
        if not svg_path.is_relative_to((Path(config.docs_dir) / "assets/images").resolve()):
            continue
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

    CLI_TIMEOUT_SECONDS = 120

    def __init__(self, config, project_dir: Path):
        self.project_dir = project_dir
        super().__init__(config)

    def _execute_mermaid_command(self, cmd):
        """Allow cold Chromium renders in CI more time than the plugin default."""
        self.logger.debug("Executing Mermaid CLI command: %s", " ".join(cmd))
        return subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=self.CLI_TIMEOUT_SECONDS,
            check=False,
        )

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
        marker = self.project_dir / ".cache" / "mkdocs-mermaid" / f"{marker_key}.json"

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

def install_cache(config, project_dir: Path) -> None:
    """Install the owned cache adapter after the Mermaid plugin initializes."""
    plugin = config.plugins.get("mermaid-to-svg")
    if plugin is None:
        return
    processor = getattr(plugin, "processor", None)
    if processor is None:
        log.warning("Mermaid plugin did not initialize a processor; SVG caching is disabled")
        return
    if isinstance(processor.image_generator, CachingMermaidImageGenerator):
        return
    processor.image_generator = CachingMermaidImageGenerator(processor.config, project_dir)
