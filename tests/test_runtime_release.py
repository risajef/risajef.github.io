import hashlib
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import runtime_release as release


class RuntimeReleaseTests(unittest.TestCase):
    def test_changed_release_bytes_are_rejected_before_install(self):
        with tempfile.TemporaryDirectory() as directory:
            archive = Path(directory) / "runtime-assets.tar.gz"
            archive.write_bytes(b"original")
            lock = {"sha256": hashlib.sha256(b"original").hexdigest()}
            with patch.object(release, "install_assets") as install:
                release.install_locked_archive(archive, lock)
                install.assert_called_once_with(archive)
                archive.write_bytes(b"replaced")
                with self.assertRaisesRegex(SystemExit, "committed SHA-256"):
                    release.install_locked_archive(archive, lock)
                self.assertEqual(install.call_count, 1)

    def test_written_lock_is_valid_and_pins_archive_digest(self):
        with tempfile.TemporaryDirectory() as directory:
            archive = Path(directory) / "runtime-assets.tar.gz"
            archive.write_bytes(b"bundle")
            with patch.object(release, "LOCK_PATH", Path(directory) / "lock.json"):
                release.write_lock("runtime-assets-sha256-" + "a" * 64, archive)
                lock = release.load_lock()
                self.assertEqual(lock["sha256"], hashlib.sha256(b"bundle").hexdigest())
