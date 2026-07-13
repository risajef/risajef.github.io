from __future__ import annotations

import hashlib
import html
import json
import posixpath
import re
import shutil
import subprocess
import tempfile
import wave
from html.parser import HTMLParser
from pathlib import Path

from markupsafe import Markup
from mkdocs.config import config_options
from mkdocs.exceptions import PluginError
from mkdocs.plugins import BasePlugin, get_plugin_logger


log = get_plugin_logger(__name__)

GENERATOR_VERSION = "2"
DEFAULT_LANGUAGES = {
    "de": {"model": "de_DE-thorsten-medium.onnx", "label": "Vorlesen"},
    "en": {"model": "en_US-lessac-medium.onnx", "label": "Listen"},
}


class _PageTextExtractor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.ignored_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "noscript"}:
            self.ignored_depth += 1
        elif not self.ignored_depth and tag in {
            "br", "div", "h1", "h2", "h3", "h4", "h5", "h6", "li", "p", "pre"
        }:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in {"script", "style", "noscript"} and self.ignored_depth:
            self.ignored_depth -= 1
        elif not self.ignored_depth and tag in {"div", "li", "p", "pre"}:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.ignored_depth:
            self.parts.append(data)


class PiperTTSPlugin(BasePlugin):
    config_scheme = (
        ("asset_dir", config_options.Type(str, default="assets/piper-tts")),
        ("audio_dir", config_options.Type(str, default="audio")),
        ("model_dir", config_options.Type(str, default="models/piper-tts")),
        ("languages", config_options.Type(dict, default={})),
        ("button_class", config_options.Type(str, default="piper-tts-button")),
        ("ffmpeg_path", config_options.Type(str, default="ffmpeg")),
        ("use_cuda", config_options.Type(bool, default=False)),
    )

    def on_config(self, config):
        config_path = getattr(config, "config_file_path", None)
        self._project_dir = (
            Path(config_path).parent.resolve() if config_path else Path.cwd().resolve()
        )
        self._docs_dir = Path(config["docs_dir"])
        if not self._docs_dir.is_absolute():
            self._docs_dir = self._project_dir / self._docs_dir
        self._asset_dir = self.config["asset_dir"].strip("/")
        self._audio_dir = self.config["audio_dir"].strip("/")
        self._model_dir = Path(self.config["model_dir"])
        if not self._model_dir.is_absolute():
            self._model_dir = self._project_dir / self._model_dir
        self._languages = self._configured_languages()
        self._audio_cache_dir = self._docs_dir / self._asset_dir / self._audio_dir
        self._audio_by_page = {}
        self._file_hashes = {}
        self._voices = {}
        return config

    def on_env(self, env, config, files):
        env.globals["piper_tts_button"] = self.render_button
        return env

    def on_page_content(self, html_content, *, page, config, files):
        metadata = getattr(page, "meta", {}) or {}
        language = str(metadata.get("lang") or "").lower().split("-")[0]
        voice = self._languages.get(language)
        if voice is None or not getattr(page, "file", None):
            return html_content

        source_path = Path(getattr(page.file, "abs_src_path", ""))
        if not source_path.is_file():
            source_path = self._docs_dir / page.file.src_path
        if not source_path.is_file():
            raise PluginError(f"Piper TTS source Markdown is missing: {source_path}")

        model_path, config_path = self._voice_files(voice, language)
        speaker_id = self._resolve_speaker_id(voice, config_path, language)
        source_hash = self._hash_file(source_path)
        model_hash = self._hash_file(model_path)
        config_hash = self._hash_file(config_path)
        text = self._extract_text(html_content)
        content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
        audio_path, metadata_path = self._cache_paths(page.file.src_path, source_hash)
        expected_metadata = {
            "generator_version": GENERATOR_VERSION,
            "source_hash": source_hash,
            "content_hash": content_hash,
            "model": str(model_path),
            "model_hash": model_hash,
            "config_hash": config_hash,
            "language": language,
        }
        if "speaker" in voice:
            expected_metadata["speaker"] = str(voice["speaker"])
            expected_metadata["speaker_id"] = speaker_id

        if not self._cache_is_valid(audio_path, metadata_path, expected_metadata):
            self._generate_audio(
                audio_path,
                model_path,
                config_path,
                text,
                speaker_id,
            )
            metadata_path.write_text(
                json.dumps(expected_metadata, indent=2, sort_keys=True) + "\n",
                encoding="utf-8",
            )
            log.info("Generated Piper TTS MP3 for %s", page.file.src_path)
        else:
            log.debug("Reusing cached Piper TTS MP3 for %s", page.file.src_path)

        self._audio_by_page[page.file.src_path] = audio_path
        return html_content

    def on_post_build(self, config):
        site_audio_dir = Path(config.site_dir) / self._asset_dir / self._audio_dir
        site_audio_dir.mkdir(parents=True, exist_ok=True)
        copied = 0
        for audio_path in set(self._audio_by_page.values()):
            if audio_path.is_file():
                shutil.copy2(audio_path, site_audio_dir / audio_path.name)
                copied += 1
        self._remove_stale_audio(site_audio_dir)
        log.info("Copied %d Piper TTS MP3 files to %s", copied, site_audio_dir)

    def render_button(self, page=None, label=None):
        if page is None:
            return Markup("")

        audio_path = self._audio_by_page.get(getattr(page.file, "src_path", ""))
        if audio_path is None:
            return Markup("")

        metadata = getattr(page, "meta", {}) or {}
        language = str(metadata.get("lang") or "").lower().split("-")[0]
        voice = self._languages.get(language, {})
        audio_label = label or voice.get("label") or language
        audio_rel_path = posixpath.join(
            self._asset_dir, self._audio_dir, audio_path.name
        )
        audio_url = self._relative_url(page, audio_rel_path)
        audio_class = self.config["button_class"].strip() or "piper-tts-button"
        attributes = {
            "class": audio_class,
            "controls": "",
            "preload": "none",
            "aria-label": audio_label,
            "title": audio_label,
        }
        rendered_attributes = " ".join(
            f'{name}="{html.escape(str(value), quote=True)}"'
            if value
            else name
            for name, value in attributes.items()
        )
        return Markup(
            f'<audio {rendered_attributes}>'
            f'<source src="{html.escape(audio_url, quote=True)}" type="audio/mpeg">'
            f"{html.escape(str(audio_label))}</audio>"
        )

    def _configured_languages(self):
        languages = {
            language: dict(voice) for language, voice in DEFAULT_LANGUAGES.items()
        }
        for language, configured_voice in (self.config["languages"] or {}).items():
            normalized_language = str(language).lower().split("-")[0]
            voice = dict(configured_voice or {})
            if "model" not in voice:
                raise PluginError(
                    f"Piper TTS language {language!r} must define a model"
                )
            languages[normalized_language] = voice

        for voice in languages.values():
            model = Path(str(voice["model"]))
            voice.setdefault("config", f"{model.name}.json")
        return languages

    def _voice_files(self, voice, language):
        model_value = Path(str(voice["model"]))
        model_path = model_value if model_value.is_absolute() else self._model_dir / model_value
        config_value = Path(str(voice["config"]))
        config_path = config_value if config_value.is_absolute() else self._model_dir / config_value
        if not model_path.is_file() or not config_path.is_file():
            raise PluginError(
                f"Piper TTS model for language {language!r} is missing: "
                f"{model_path} and {config_path}"
            )
        return model_path.resolve(), config_path.resolve()

    def _resolve_speaker_id(self, voice, config_path, language):
        speaker = voice.get("speaker")
        if speaker is None:
            return None

        try:
            speaker_map = json.loads(config_path.read_text(encoding="utf-8"))[
                "speaker_id_map"
            ]
        except (OSError, json.JSONDecodeError, KeyError) as error:
            raise PluginError(
                f"Could not read Piper speaker map for language {language!r}"
            ) from error

        if str(speaker) in speaker_map:
            return int(speaker_map[str(speaker)])
        try:
            speaker_id = int(speaker)
        except (TypeError, ValueError) as error:
            raise PluginError(
                f"Unknown Piper speaker {speaker!r} for language {language!r}"
            ) from error

        if speaker_id not in speaker_map.values():
            raise PluginError(
                f"Unknown Piper speaker {speaker!r} for language {language!r}"
            )
        return speaker_id

    def _extract_text(self, html_content):
        parser = _PageTextExtractor()
        parser.feed(html_content)
        parser.close()
        return " ".join("".join(parser.parts).split())

    def _cache_paths(self, source_rel_path, source_hash):
        source_path = Path(source_rel_path)
        source_id = hashlib.sha256(source_rel_path.encode("utf-8")).hexdigest()[:12]
        slug = re.sub(r"[^A-Za-z0-9_-]+", "-", source_path.with_suffix("").as_posix())
        slug = slug.strip("-")[-80:] or "page"
        filename = f"{slug}-{source_id}-{source_hash[:12]}.mp3"
        audio_path = self._audio_cache_dir / filename
        return audio_path, audio_path.with_suffix(".mp3.json")

    def _cache_is_valid(self, audio_path, metadata_path, expected):
        if not audio_path.is_file() or audio_path.stat().st_size == 0:
            return False
        try:
            actual = json.loads(metadata_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return False
        return actual == expected

    def _generate_audio(self, audio_path, model_path, config_path, text, speaker_id):
        try:
            voice = self._load_voice(model_path, config_path)
        except Exception as error:
            raise PluginError(f"Could not load Piper TTS voice: {error}") from error

        audio_path.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=audio_path.parent) as temporary_dir:
            wav_path = Path(temporary_dir) / "speech.wav"
            mp3_path = Path(temporary_dir) / "speech.mp3"
            try:
                from piper.config import SynthesisConfig

                synthesis_config = (
                    SynthesisConfig(speaker_id=speaker_id)
                    if speaker_id is not None
                    else None
                )
                with wave.open(str(wav_path), "wb") as wav_file:
                    voice.synthesize_wav(
                        text,
                        wav_file,
                        syn_config=synthesis_config,
                    )
            except Exception as error:
                raise PluginError(f"Piper TTS synthesis failed: {error}") from error

            result = subprocess.run(
                [
                    self.config["ffmpeg_path"],
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-i",
                    str(wav_path),
                    "-codec:a",
                    "libmp3lame",
                    "-q:a",
                    "3",
                    "-y",
                    str(mp3_path),
                ],
                capture_output=True,
                text=True,
            )
            if result.returncode != 0:
                error = result.stderr.strip() or f"ffmpeg exited with code {result.returncode}"
                raise PluginError(f"Piper TTS MP3 conversion failed: {error}")

            mp3_path.replace(audio_path)

    def _load_voice(self, model_path, config_path):
        key = (model_path, config_path)
        if key in self._voices:
            return self._voices[key]

        try:
            from piper import PiperVoice
        except ImportError as error:
            raise PluginError(
                "The piper-tts Python package is required for Piper TTS"
            ) from error

        voice = PiperVoice.load(
            model_path,
            config_path=config_path,
            use_cuda=self.config["use_cuda"],
        )
        self._voices[key] = voice
        return voice

    def _remove_stale_audio(self, site_audio_dir):
        current_paths = set(self._audio_by_page.values())
        for stale_path in self._audio_cache_dir.glob("*.mp3"):
            if stale_path in current_paths:
                continue
            stale_path.unlink(missing_ok=True)
            stale_path.with_suffix(".mp3.json").unlink(missing_ok=True)
            (site_audio_dir / stale_path.name).unlink(missing_ok=True)

    def _hash_file(self, path):
        cache_key = str(path)
        if cache_key in self._file_hashes:
            return self._file_hashes[cache_key]
        digest = hashlib.sha256()
        with path.open("rb") as source:
            for chunk in iter(lambda: source.read(1024 * 1024), b""):
                digest.update(chunk)
        value = digest.hexdigest()
        self._file_hashes[cache_key] = value
        return value

    def _relative_url(self, page, target_path):
        page_url = "/" + str(getattr(page, "url", "") or "").lstrip("/")
        if page_url == "/" or page_url.endswith("/"):
            page_directory = page_url
        else:
            page_directory = posixpath.dirname(page_url) + "/"
        return posixpath.relpath(f"/{target_path}", page_directory)