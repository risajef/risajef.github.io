import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts.artifact_io import replace_directories


class ReplacementTests(unittest.TestCase):
    def test_copy_and_switch_failures_preserve_all_originals(self):
        for failure in ("copy", "switch", "none"):
            with self.subTest(failure=failure), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                pairs = {root / f"dest-{i}": root / f"src-{i}" for i in range(2)}
                for destination, source in pairs.items():
                    destination.mkdir()
                    source.mkdir()
                    (destination / "file").write_text("old")
                    (source / "file").write_text("new")
                rename = Path.rename

                def failing_rename(path, target):
                    if path.name == "new" and Path(target).name == "dest-1":
                        raise OSError("synthetic switch failure")
                    return rename(path, target)

                if failure == "copy":
                    with patch("scripts.artifact_io.shutil.copytree", side_effect=OSError("copy")):
                        with self.assertRaises(OSError):
                            replace_directories(pairs)
                elif failure == "switch":
                    with patch.object(Path, "rename", failing_rename):
                        with self.assertRaises(OSError):
                            replace_directories(pairs)
                else:
                    replace_directories(pairs)
                for destination in pairs:
                    self.assertEqual((destination / "file").read_text(), "new" if failure == "none" else "old")
