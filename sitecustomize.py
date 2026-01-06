"""Project-local runtime tweaks.

Loaded automatically when this repo is on ``sys.path``. We use it to:
- silence the argostranslate swigvarlink deprecation spam
- harden MkDocs' State.__del__ against shutdown teardown
- cache Mermaid SVG generation when the target already exists
"""

from __future__ import annotations

import logging
from pathlib import Path
import warnings


# 1) Silence noisy swigvarlink deprecation warning
warnings.filterwarnings(
    "ignore",
    message="builtin type swigvarlink has no __module__ attribute",
    category=DeprecationWarning,
)


def _patch_mkdocs_state_destructor() -> None:
    """Guard MkDocs State.__del__ against shutdown races."""

    try:
        from mkdocs import __main__ as mk_main
    except Exception:
        return

    State = getattr(mk_main, "State", None)
    if State is None or not hasattr(State, "__del__"):
        return

    def safe_del(self) -> None:  # type: ignore[override]
        try:
            self.logger.removeHandler(self.stream)
        except Exception:
            pass

    State.__del__ = safe_del  # type: ignore[assignment]


def _patch_mermaid_cache() -> None:
    """Skip Mermaid CLI if the target SVG already exists (filenames include code hash)."""

    try:
        from mkdocs_mermaid_to_svg.image_generator import MermaidImageGenerator
    except Exception:
        return

    original_generate = getattr(MermaidImageGenerator, "generate", None)
    if not callable(original_generate):
        return

    def cached_generate(self, mermaid_code, output_path, config, page_file=None):
        output_path_obj = Path(output_path)
        if output_path_obj.exists():
            mk_logger = logging.getLogger("mkdocs")
            source_info = f" from {page_file}" if page_file else ""
            mk_logger.info(
                f"Skipping Mermaid conversion (cached): {output_path_obj.name}{source_info}"
            )
            return True
        return original_generate(self, mermaid_code, output_path, config, page_file)

    MermaidImageGenerator.generate = cached_generate  # type: ignore[assignment]


_patch_mkdocs_state_destructor()
_patch_mermaid_cache()
