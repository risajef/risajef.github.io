import hashlib
import io
import json
import subprocess
import tarfile
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import runtime_assets as runtime


class RuntimeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.project = self.root / "project"
        self.project.mkdir()
        subprocess.run(["git", "init", "-q", str(self.project)], check=True)
        self.patcher = patch.object(runtime, "PROJECT_DIR", self.project)
        self.patcher.start()
        self.addCleanup(self.patcher.stop)

    def bundle(self, files=None):
        if files is None:
            files = {f"{path}/asset.bin": b"runtime" for path in runtime.RUNTIME_PATHS}
        manifest = {"version": 1, "files": {
            name: hashlib.sha256(data).hexdigest() for name, data in files.items()
        }}
        archive_path = self.root / "assets.tar.gz"
        with tarfile.open(archive_path, "w:gz") as archive:
            for name, data in {**files, runtime.MANIFEST_NAME: json.dumps(manifest).encode()}.items():
                info = tarfile.TarInfo(name)
                info.size = len(data)
                archive.addfile(info, io.BytesIO(data))
        return archive_path

    def test_restore_preserves_source_images(self):
        image = self.project / "docs/assets/images/source.png"
        image.parent.mkdir(parents=True)
        image.write_bytes(b"source")
        subprocess.run(["git", "add", str(image)], cwd=self.project, check=True)
        runtime.install_assets(self.bundle())
        self.assertEqual(image.read_bytes(), b"source")

    def test_restore_refuses_tracked_runtime_destination(self):
        tracked = self.project / runtime.RUNTIME_PATHS[0] / "source"
        tracked.parent.mkdir(parents=True)
        tracked.write_bytes(b"source")
        subprocess.run(["git", "add", "-f", str(tracked)], cwd=self.project, check=True)
        with self.assertRaisesRegex(SystemExit, "overlap"):
            runtime.install_assets(self.bundle())
        self.assertEqual(tracked.read_bytes(), b"source")

    def test_missing_later_directory_leaves_all_destinations_unchanged(self):
        existing = self.project / runtime.RUNTIME_PATHS[0] / "original"
        existing.parent.mkdir(parents=True)
        existing.write_bytes(b"original")
        archive = self.bundle({f"{runtime.RUNTIME_PATHS[0]}/replacement": b"new"})
        with self.assertRaisesRegex(SystemExit, "missing"):
            runtime.install_assets(archive)
        self.assertEqual(existing.read_bytes(), b"original")

    def test_manifest_rejects_unlisted_files_and_invalid_entries(self):
        root = self.root / "payload"
        asset = root / runtime.RUNTIME_PATHS[0] / "asset"
        asset.parent.mkdir(parents=True)
        asset.write_bytes(b"asset")
        name = asset.relative_to(root).as_posix()
        good = {name: hashlib.sha256(b"asset").hexdigest()}
        runtime.validate_manifest(root, {"version": 1, "files": good})
        for files in ({}, {**good, "../outside": "a" * 64}, {name: "invalid"}):
            with self.subTest(files=files), self.assertRaises(SystemExit):
                runtime.validate_manifest(root, {"version": 1, "files": files})
        (asset.parent / "unlisted").write_bytes(b"unlisted")
        with self.assertRaisesRegex(SystemExit, "exactly cover"):
            runtime.validate_manifest(root, {"version": 1, "files": good})

    def test_rejects_duplicate_members_links_and_outside_roots(self):
        good = tarfile.TarInfo(f"{runtime.RUNTIME_PATHS[0]}/asset")
        link = tarfile.TarInfo(f"{runtime.RUNTIME_PATHS[0]}/link")
        link.type = tarfile.SYMTYPE
        link.linkname = "asset"
        for members in ([good, good], [link], [tarfile.TarInfo("unexpected/file")], [tarfile.TarInfo("../escape")]):
            with self.subTest(members=members), self.assertRaises(SystemExit):
                runtime.validate_archive_members(members)

    def test_legacy_images_are_verified_but_never_installed(self):
        files = {f"{path}/asset": b"runtime" for path in runtime.RUNTIME_PATHS}
        files["docs/assets/images/legacy.png"] = b"legacy"
        runtime.install_assets(self.bundle(files))
        self.assertFalse((self.project / "docs/assets/images").exists())

    def test_duplicate_json_keys_are_rejected(self):
        with self.assertRaisesRegex(SystemExit, "duplicate key"):
            json.loads('{"version":1,"files":{},"files":{}}', object_pairs_hook=runtime.unique_json_object)
