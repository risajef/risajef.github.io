import inspect
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from mkdocs.commands.build import build as mkdocs_build
from mkdocs.config import load_config
from mkdocs_mermaid_to_svg.image_generator import MermaidImageGenerator
from mkdocs_mermaid_to_svg.plugin import MermaidSvgConverterPlugin

from hooks.embeds import add_iframe_fallback
from hooks.mermaid_adapter import CachingMermaidImageGenerator, inline_mermaid_svg, install_cache
from hooks.site_content import ContentBuilder


class HookTests(unittest.TestCase):
    def test_real_yaml_metadata_and_build_scoped_reset(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / "article.en.md"
            path.write_text('---\nauto_translated: true # comment\nsource_lang: "de" # comment\n---\n# Article\n')
            content = ContentBuilder(root, root)
            self.assertEqual(content._entry_translation_info(path), (True, "de"))
            path.write_text('---\nauto_translated: false\n---\n# Article\n')
            content.reset()
            self.assertEqual(content._entry_translation_info(path), (False, None))

    def test_iframe_note_handles_quotes_localization_and_escaping(self):
        page = SimpleNamespace(meta={"page_type": "iframe", "lang": "de"}, file=SimpleNamespace(src_path="tool.de.md"))
        markdown = "<iframe src='/assets/apps/app/?a=1&amp;b=2' title='A &amp; B'></iframe>"
        self.assertEqual(add_iframe_fallback(markdown, page), markdown)
        self.assertIn("Falls", page.meta["iframe_fallback_note"])
        self.assertIn("A &amp; B", page.meta["iframe_fallback_note"])

    def test_only_generated_mermaid_svgs_are_inlined(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            images = root / "assets/images"
            images.mkdir(parents=True)
            for name in ("diagram_mermaid_1_test.svg", "logo.svg"):
                (images / name).write_text('<svg xmlns="http://www.w3.org/2000/svg"><text>Diagram</text></svg>')
            result = inline_mermaid_svg(
                '<img src="/assets/images/diagram_mermaid_1_test.svg"><img src="/assets/images/logo.svg">',
                page=SimpleNamespace(url="page/"), config=SimpleNamespace(docs_dir=root),
            )
            self.assertIn("<svg", result)
            self.assertIn('src="/assets/images/logo.svg"', result)
            self.assertNotIn('src="/assets/images/diagram_mermaid_', result)

    def test_pinned_mermaid_processor_adapter_and_cache_invalidation(self):
        self.assertEqual(list(inspect.signature(MermaidImageGenerator.generate).parameters),
                         ["self", "mermaid_code", "output_path", "config", "page_file"])
        self.assertEqual(list(inspect.signature(MermaidImageGenerator._execute_mermaid_command).parameters), ["self", "cmd"])
        with tempfile.TemporaryDirectory() as directory, patch.object(MermaidImageGenerator, "_validate_dependencies"):
            plugin = MermaidSvgConverterPlugin()
            errors, _ = plugin.load_config({})
            self.assertEqual(errors, [])
            plugin.on_config({})
            config = SimpleNamespace(plugins={"mermaid-to-svg": plugin})
            install_cache(config, Path(directory))
            generator = plugin.processor.image_generator
            self.assertIsInstance(generator, CachingMermaidImageGenerator)
            install_cache(config, Path(directory))
            self.assertIs(plugin.processor.image_generator, generator)
            output = Path(directory) / "diagram.svg"

            def generate(code, output_path, settings, page_file):
                Path(output_path).write_text("<svg/>")
                return True

            with patch.object(MermaidImageGenerator, "generate", side_effect=generate) as render:
                generator.generate("graph TD; A-->B", str(output), {})
                generator.generate("graph TD; A-->B", str(output), {})
                self.assertEqual(render.call_count, 1)
                generator.generate("graph TD; A-->C", str(output), {})
                self.assertEqual(render.call_count, 2)

    def test_mkdocs_loads_split_hook_and_renders_collection(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            docs = root / "docs"
            (docs / "blog/thoughts").mkdir(parents=True)
            (docs / "index.md").write_text('---\nlang: en\nauto_snippets: blog/thoughts\n---\n<!-- AUTO_SNIPPETS -->')
            (docs / "blog/thoughts/article.en.md").write_text('---\nlang: en\n---\n# Article\n\nHello collection.\n')
            hook = (Path.cwd() / "hooks/auto_snippets.py").as_posix()
            config_path = root / "mkdocs.yml"
            config_path.write_text(f'''site_name: Fixture
site_url: https://example.test/
docs_dir: docs
site_dir: site
hooks: ['{hook}']
plugins: []
markdown_extensions:
  - pymdownx.snippets:
      base_path: ['{docs.as_posix()}']
      check_paths: true
''')
            config = load_config(config_file=str(config_path))
            mkdocs_build(config)
            self.assertIn("Hello collection.", (root / "site/index.html").read_text())
