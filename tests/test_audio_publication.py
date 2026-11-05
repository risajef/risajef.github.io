import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts import check_site
from scripts.finalize_site import copy_referenced_audio


class AudioPublicationTests(unittest.TestCase):
    def test_all_locale_and_later_playlist_tracks_are_published(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            docs, site = root / "docs", root / "site"
            site.mkdir()
            for lang, page_path in (("en", site / "index.html"), ("de", site / "de/index.html")):
                page_path.parent.mkdir(parents=True, exist_ok=True)
                urls = []
                for number in range(2):
                    relative = f"assets/piper-tts/audio/page.{lang}/track{number}.mp3"
                    source = docs / relative
                    source.parent.mkdir(parents=True, exist_ok=True)
                    source.write_bytes(f"audio {lang} {number}".encode())
                    urls.append("/" + relative)
                playlist = json.dumps([{"url": url} for url in urls])
                page_path.write_text(f"<audio src='{urls[0]}' data-playlist='{playlist}'></audio>")
            # An unreferenced stale track must not be published.
            (docs / "assets/piper-tts/audio/stale.mp3").write_bytes(b"stale")
            copy_referenced_audio(site, docs)
            self.assertEqual(len(list(site.rglob("*.mp3"))), 4)
            with patch.object(check_site, "SITE_DIR", site):
                self.assertEqual(check_site.check_local_assets(), [])
                (site / "assets/piper-tts/audio/page.en/track1.mp3").unlink()
                self.assertEqual(len(check_site.check_local_assets()), 1)

    def test_missing_cache_fails_instead_of_publishing_broken_player(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            site = root / "site"
            site.mkdir()
            (site / "index.html").write_text('<audio src="/assets/piper-tts/audio/missing.mp3"></audio>')
            with self.assertRaisesRegex(RuntimeError, "missing or empty"):
                copy_referenced_audio(site, root / "docs")
