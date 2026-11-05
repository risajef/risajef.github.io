import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import check_site


class SiteTests(unittest.TestCase):
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
