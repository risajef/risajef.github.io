import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import check_site
from scripts.routes import normalize_redirect_target


class SiteTests(unittest.TestCase):
    def test_redirect_contract_uses_independent_expected_examples(self):
        examples = [
            ("tools/app", "", "/tools/app/"),
            ("tools/app", "/project", "/project/tools/app/"),
            ("", "", "/"),
            ("", "/project", "/project/"),
            ("/existing/", "/project", "/existing/"),
            ("https://other.example/path", "", "https://other.example/path"),
        ]
        for path, base, expected in examples:
            with self.subTest(path=path, base=base):
                self.assertEqual(normalize_redirect_target(path, base), expected)

    def test_local_assets_respect_base_urls_queries_and_external_origins(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "nested").mkdir()
            (root / "nested/index.html").write_text('''<head><base href="/nested/"></head>
                <script src="app.js?v=1"></script><iframe src="child/"></iframe>
                <img src="https://external.example/image.png"><img src="data:image/png;base64,AA">''')
            (root / "nested/app.js").write_text("ok")
            (root / "nested/child").mkdir()
            (root / "nested/child/index.html").write_text("child")
            with patch.object(check_site, "SITE_DIR", root):
                self.assertEqual(check_site.check_local_assets(), [])
                (root / "nested/app.js").unlink()
                self.assertEqual(len(check_site.check_local_assets()), 1)
