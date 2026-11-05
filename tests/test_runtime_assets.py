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
