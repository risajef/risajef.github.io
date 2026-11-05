import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from scripts import publish_runtime_assets as publish


class PublishTests(unittest.TestCase):
    def test_publishes_only_after_download_verification(self):
        for corrupt in (False, True):
            with self.subTest(corrupt=corrupt), tempfile.TemporaryDirectory() as directory:
                archive = Path(directory) / publish.ARCHIVE_NAME
                checksum = Path(directory) / (publish.ARCHIVE_NAME + ".sha256")
                archive.write_bytes(b"bundle")
                publish.write_checksum(archive, checksum)
                calls = []

                def run(command, **kwargs):
                    calls.append(command)
                    if command[:3] == ["gh", "release", "download"]:
                        target = Path(command[command.index("--dir") + 1])
                        shutil.copyfile(archive, target / archive.name)
                        shutil.copyfile(checksum, target / checksum.name)
                        if corrupt:
                            (target / archive.name).write_bytes(b"corrupt")
                    return SimpleNamespace(stdout="a" * 40)

                with patch.object(publish, "resolve_repo_slug", return_value="owner/repo"), patch.object(
                    publish.subprocess, "run", side_effect=run
                ):
                    if corrupt:
                        with self.assertRaisesRegex(SystemExit, "verification"):
                            publish.upload(archive, checksum)
                    else:
                        tag = publish.upload(archive, checksum)
                        self.assertEqual(tag, "runtime-assets-sha256-" + publish.file_digest(archive))
                self.assertFalse(any("delete-asset" in cmd or "--clobber" in cmd for cmd in calls))
                self.assertEqual(any(cmd[:3] == ["gh", "release", "edit"] for cmd in calls), not corrupt)

    def test_failed_create_never_publishes(self):
        with tempfile.TemporaryDirectory() as directory:
            archive = Path(directory) / "archive"
            archive.write_bytes(b"bundle")
            with patch.object(publish, "resolve_repo_slug", return_value="owner/repo"), patch.object(
                publish.subprocess, "run", side_effect=[SimpleNamespace(stdout="a" * 40), subprocess.CalledProcessError(1, "gh")]
            ) as run:
                with self.assertRaises(subprocess.CalledProcessError):
                    publish.upload(archive, archive)
                self.assertEqual(run.call_count, 2)
