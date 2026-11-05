import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import build_tools as build


class BuildTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "source"
        self.source.mkdir()
        self.output = self.root / "output"
        self.app = build.EmbeddedApp("fixture", "Fixture", self.source, self.output, Path("index.html"))
        (self.source / "index.html").write_text('<html><head></head><body><script src="app.js"></script></body></html>')
        (self.source / "app.js").write_text("console.log('ok')")

    def test_only_declared_runtime_files_are_published(self):
        (self.source / ".env").write_text("SYNTHETIC=1")
        (self.source / "tests").mkdir()
        (self.source / "tests/test.js").write_text("test")
        (self.source / "package.json").write_text("{}")
        build.stage_embedded_app(self.app)
        self.assertTrue((self.output / "app.js").is_file())
        for unwanted in (".env", "tests", "package.json"):
            self.assertFalse((self.output / unwanted).exists())

    def test_symlink_cannot_publish_outside_file(self):
        outside = self.root / "outside.js"
        outside.write_text("private")
        (self.source / "linked.js").symlink_to(outside)
        with self.assertRaisesRegex(RuntimeError, "Unsafe"):
            build.stage_embedded_app(self.app)

    def test_deleted_corrupt_and_extra_outputs_invalidate_cache(self):
        for mutation in ("delete", "corrupt", "extra"):
            with self.subTest(mutation=mutation):
                build.stage_embedded_app(self.app)
                self.assertFalse(build.build_required(self.app))
                if mutation == "delete":
                    (self.output / "app.js").unlink()
                elif mutation == "corrupt":
                    (self.output / "app.js").write_text("broken")
                else:
                    (self.output / "extra.js").write_text("extra")
                self.assertTrue(build.build_required(self.app))
                build.stage_embedded_app(self.app)
                self.assertFalse(build.build_required(self.app))

    def test_invalid_new_artifact_preserves_previous_output(self):
        build.stage_embedded_app(self.app)
        (self.source / "app.js").unlink()
        with self.assertRaisesRegex(RuntimeError, "missing runtime"):
            build.stage_embedded_app(self.app)
        self.assertEqual((self.output / "app.js").read_text(), "console.log('ok')")

    def test_unreadable_source_does_not_produce_fingerprint(self):
        original = Path.open

        def fail(path, *args, **kwargs):
            if path == self.source / "app.js":
                raise PermissionError("synthetic unreadable file")
            return original(path, *args, **kwargs)

        with patch.object(Path, "open", fail), self.assertRaises(PermissionError):
            build.input_fingerprint(self.app)
