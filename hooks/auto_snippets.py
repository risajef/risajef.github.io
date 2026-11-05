"""Thin MkDocs lifecycle callbacks for parent-owned site integrations."""

from pathlib import Path

try:
    from .site_content import ContentBuilder
    from .mermaid_adapter import inline_mermaid_svg, install_cache
except ImportError:  # MkDocs loads hooks by filename with this directory on sys.path.
    from site_content import ContentBuilder
    from mermaid_adapter import inline_mermaid_svg, install_cache

_content = None


def on_config(config, **_):
    global _content
    project_dir = Path(config.config_file_path).resolve().parent
    docs_dir = Path(config["docs_dir"])
    if not docs_dir.is_absolute():
        docs_dir = project_dir / docs_dir
    _content = ContentBuilder(project_dir, docs_dir.resolve())
    rss_plugin = config.plugins.get("rss")
    if rss_plugin is not None:
        rss_plugin.config.date_from_meta.default_time = "00:00"
    install_cache(config, project_dir)
    return config


def on_pre_build(config, **_):
    if _content is None:
        raise RuntimeError("Site content hook was not configured")
    _content.reset()


def on_page_markdown(markdown, *, page, config, files):
    if _content is None:
        raise RuntimeError("Site content hook was not configured")
    return _content.render_markdown(markdown, page=page, config=config, files=files)


def on_page_content(html, *, page, config, files):
    return inline_mermaid_svg(html, page=page, config=config)
