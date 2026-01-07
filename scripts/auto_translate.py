#!/usr/bin/env python3
"""Generate or refresh auto-translated Markdown companions using Argos Translate.

By default the script inspects ``mkdocs.yml`` to learn the configured locales and
ensures that each Markdown document exists in every language. Use ``--force`` to
retranslate existing auto-generated files without deleting them manually.
"""
from __future__ import annotations

import argparse
from collections import defaultdict
import logging
import re
import sys
from pathlib import Path
from typing import DefaultDict, Dict, List, Optional, Tuple

import yaml
from argostranslate import translate as ar_translate

LOGGER = logging.getLogger(__name__)

INLINE_CODE_PATTERN = re.compile(r"(`+)([^`]+?)\1")
MATH_INLINE_PATTERN = re.compile(r"(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)")
MATH_BLOCK_PATTERN = re.compile(r"\$\$(.+?)\$\$", re.DOTALL)
LINK_PATTERN = re.compile(r"(!?\[)([^\]]+)]\(([^)]+)\)")
HTML_COMMENT_PATTERN = re.compile(r"<!--.*?-->", re.DOTALL)
HTML_TAG_PATTERN = re.compile(r"<(?!!--)(?:/?[A-Za-z][^>]*?)>")
HTML_ENTITY_PATTERN = re.compile(r"&[A-Za-z0-9#]+;")
TOKEN_ID_PATTERN = r"(?:HTMLCOMMENT|HTMLTAG|ENTITY|LINK|MATHBLOCK|MATH|CODE)_\d+"
TOKEN_NOISY_PATTERN = re.compile(r"@*(" + TOKEN_ID_PATTERN + r")@*")
TABLE_SEPARATOR_PATTERN = re.compile(r"^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$")
FENCE_PATTERN = re.compile(r"^(\s*)(`{3,}|~{3,})")
HEADING_PATTERN = re.compile(r"^(\s*#{1,6}\s+)(.+)$")
BLOCKQUOTE_PATTERN = re.compile(r"^(\s*>+\s*)(.+)$")
TASK_LIST_PATTERN = re.compile(r"^(\s*[-*+]\s+\[[ xX]\]\s+)(.+)$")
UNORDERED_LIST_PATTERN = re.compile(r"^(\s*[-*+]\s+)(.+)$")
ORDERED_LIST_PATTERN = re.compile(r"^(\s*\d+[.)]\s+)(.+)$")


class SegmentTranslator:
    """Translate text snippets while preserving inline Markdown constructs."""

    def __init__(self, translator: ar_translate.Translation) -> None:
        self.translator = translator
        self.cache: Dict[str, str] = {}
        self._token_counter = 0

    def _make_token(self, label: str) -> Tuple[str, str]:
        token_id = f"{label.upper()}_{self._token_counter}"
        self._token_counter += 1
        return token_id, f"@@{token_id}@@"

    def translate_inline(self, text: str, allow_links: bool = True) -> str:
        if not text or not text.strip():
            return text

        working = text
        placeholders: Dict[str, str] = {}

        if allow_links:
            working, link_tokens = self._extract_links(working)
            placeholders.update(link_tokens)

        working, comment_tokens = self._protect_pattern(working, HTML_COMMENT_PATTERN, "HTMLCOMMENT")
        placeholders.update(comment_tokens)
        working, tag_tokens = self._protect_pattern(working, HTML_TAG_PATTERN, "HTMLTAG")
        placeholders.update(tag_tokens)
        working, entity_tokens = self._protect_pattern(working, HTML_ENTITY_PATTERN, "ENTITY")
        placeholders.update(entity_tokens)
        working, block_math_tokens = self._protect_pattern(working, MATH_BLOCK_PATTERN, "MATHBLOCK")
        placeholders.update(block_math_tokens)
        working, math_tokens = self._protect_pattern(working, MATH_INLINE_PATTERN, "MATH")
        placeholders.update(math_tokens)
        working, code_tokens = self._protect_pattern(working, INLINE_CODE_PATTERN, "CODE")
        placeholders.update(code_tokens)

        translated = self._translate_preserving_whitespace(working)

        translated = self._restore_placeholders(translated, placeholders)

        return translated

    def _restore_placeholders(self, text: str, placeholders: Dict[str, str]) -> str:
        def _noisy_replacer(match: re.Match[str]) -> str:
            token_id = match.group(1)
            return placeholders.get(token_id, match.group(0))

        return TOKEN_NOISY_PATTERN.sub(_noisy_replacer, text)

    def _translate_preserving_whitespace(self, text: str) -> str:
        if not text.strip():
            return text
        match = re.match(r"^(\s*)(.*?)(\s*)$", text, flags=re.DOTALL)
        if match:
            prefix, core, suffix = match.groups()
        else:
            prefix, core, suffix = "", text, ""
        translated = self._translate_core(core)
        return f"{prefix}{translated}{suffix}"

    def _translate_core(self, text: str) -> str:
        cached = self.cache.get(text)
        if cached is not None:
            return cached
        result = self.translator.translate(text)
        self.cache[text] = result
        return result

    def _protect_pattern(
        self, text: str, pattern: re.Pattern[str], label: str
    ) -> Tuple[str, Dict[str, str]]:
        replacements: Dict[str, str] = {}

        def _replacer(match: re.Match[str]) -> str:
            token_id, token_text = self._make_token(label)
            replacements[token_id] = match.group(0)
            return token_text

        protected = pattern.sub(_replacer, text)
        return protected, replacements

    def _extract_links(self, text: str) -> Tuple[str, Dict[str, str]]:
        replacements: Dict[str, str] = {}

        def _replacer(match: re.Match[str]) -> str:
            token_id, token_text = self._make_token("link")
            prefix = match.group(1)
            label = match.group(2)
            destination = match.group(3)
            translated_label = self.translate_inline(label, allow_links=False)
            replacements[token_id] = f"{prefix}{translated_label}]({destination})"
            return token_text

        protected = LINK_PATTERN.sub(_replacer, text)
        return protected, replacements


class MarkdownTranslator:
    def __init__(self, segment_translator: SegmentTranslator) -> None:
        self.segment_translator = segment_translator

    def translate(self, body: str) -> str:
        lines = body.splitlines()
        output: List[str] = []
        in_code_block = False
        active_fence: str | None = None
        in_html_comment = False

        i = 0
        while i < len(lines):
            line = lines[i]
            stripped = line.strip()

            if in_html_comment:
                output.append(line)
                if "-->" in line:
                    in_html_comment = False
                i += 1
                continue

            if "<!--" in line:
                output.append(line)
                if "-->" not in line:
                    in_html_comment = True
                i += 1
                continue

            if stripped.startswith("<"):
                output.append(line)
                i += 1
                continue

            fence_match = FENCE_PATTERN.match(line)
            if fence_match:
                fence = fence_match.group(2)
                if not in_code_block:
                    in_code_block = True
                    active_fence = fence
                elif active_fence == fence:
                    in_code_block = False
                    active_fence = None
                output.append(line)
                i += 1
                continue

            if in_code_block:
                output.append(line)
                i += 1
                continue

            if stripped.startswith("|"):
                output.append(self._translate_table_row(line))
                i += 1
                continue

            if not stripped:
                output.append(line)
                i += 1
                continue

            translated = self._translate_structured_line(line)
            output.append(translated)
            i += 1

        return "\n".join(output)

    def _translate_table_row(self, line: str) -> str:
        if TABLE_SEPARATOR_PATTERN.match(line.strip()):
            return line
        tokens = re.split(r"(\|)", line)
        rebuilt: List[str] = []
        for token in tokens:
            if token == "|":
                rebuilt.append(token)
                continue
            if token.strip():
                rebuilt.append(self.segment_translator.translate_inline(token))
            else:
                rebuilt.append(token)
        return "".join(rebuilt)

    def _translate_structured_line(self, line: str) -> str:
        for pattern in (
            HEADING_PATTERN,
            BLOCKQUOTE_PATTERN,
            TASK_LIST_PATTERN,
            UNORDERED_LIST_PATTERN,
            ORDERED_LIST_PATTERN,
        ):
            match = pattern.match(line)
            if match:
                prefix, content = match.groups()
                translated = self.segment_translator.translate_inline(content)
                return f"{prefix}{translated}"
        return self.segment_translator.translate_inline(line)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Auto translate Markdown files")
    parser.add_argument("--docs-dir", default="docs", help="Root directory with markdown docs")
    parser.add_argument(
        "--mkdocs-config",
        default="mkdocs.yml",
        help="Path to mkdocs configuration used to infer languages",
    )
    parser.add_argument(
        "--languages",
        help="Comma-separated list of locales (overrides mkdocs configuration)",
    )
    parser.add_argument(
        "--default-language",
        help="Override default/source language (falls back to mkdocs configuration)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Regenerate existing auto translations instead of skipping them",
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Show planned actions without writing files"
    )
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging output")
    return parser.parse_args()


def configure_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(level=level, format="%(levelname)s %(message)s")


def load_translator(source_lang: str, target_lang: str) -> ar_translate.Translation:
    languages = ar_translate.get_installed_languages()
    from_lang = next((lang for lang in languages if lang.code.startswith(source_lang)), None)
    to_lang = next((lang for lang in languages if lang.code.startswith(target_lang)), None)
    if not from_lang or not to_lang:
        raise RuntimeError(
            "Missing Argos Translate language packs. Install them via "
            "'argos-translate-cli --from-lang {0} --to-lang {1}' or the GUI.".format(
                source_lang, target_lang
            )
        )
    return from_lang.get_translation(to_lang)


def split_front_matter(text: str) -> Tuple[Dict[str, object], str]:
    if not text.startswith("---"):
        return {}, text
    parts = text.splitlines()
    meta_lines: List[str] = []
    closing_index = None
    for idx in range(1, len(parts)):
        if parts[idx].strip() == "---":
            closing_index = idx
            break
        meta_lines.append(parts[idx])
    if closing_index is None:
        return {}, text
    meta_text = "\n".join(meta_lines)
    meta = yaml.safe_load(meta_text) or {}
    body = "\n".join(parts[closing_index + 1 :])
    return meta, body


def build_front_matter(meta: Dict[str, object]) -> str:
    dumped = yaml.safe_dump(meta, sort_keys=False, allow_unicode=True).strip()
    return f"---\n{dumped}\n---\n"


def parse_language_list(raw_value: Optional[str]) -> List[str]:
    if not raw_value:
        return []
    tokens = re.split(r"[,\s]+", raw_value)
    return [token.strip() for token in tokens if token.strip()]


def load_language_settings(config_path: Path) -> Tuple[Optional[str], List[str]]:
    if not config_path.exists():
        return None, []
    data = yaml.safe_load(config_path.read_text(encoding="utf-8")) or {}
    plugins = data.get("plugins", [])
    for plugin in plugins:
        if isinstance(plugin, dict) and "i18n" in plugin:
            cfg = plugin.get("i18n") or {}
            default_lang = cfg.get("default_language") or cfg.get("default_locale")
            languages: List[str] = []
            for entry in cfg.get("languages", []):
                if isinstance(entry, str):
                    languages.append(entry)
                elif isinstance(entry, dict):
                    locale = entry.get("locale")
                    if locale:
                        languages.append(locale)
                    if entry.get("default"):
                        default_lang = locale
            return default_lang, languages
    return None, []


def dedupe_preserve_order(values: List[str]) -> List[str]:
    seen = set()
    result: List[str] = []
    for value in values:
        if value and value not in seen:
            seen.add(value)
            result.append(value)
    return result


def determine_languages(
    mkdocs_config: Path, explicit_languages: Optional[str], default_override: Optional[str]
) -> Tuple[str, List[str]]:
    configured_default, configured_languages = load_language_settings(mkdocs_config)
    languages = (
        parse_language_list(explicit_languages)
        if explicit_languages
        else configured_languages
    )
    languages = dedupe_preserve_order(languages)
    default_lang = default_override or configured_default
    if not languages:
        if not default_lang:
            raise RuntimeError(
                "Unable to determine languages. Provide --languages or configure mkdocs i18n."
            )
        languages = [default_lang]
    if not default_lang:
        default_lang = languages[0]
    if default_lang not in languages:
        languages.insert(0, default_lang)
    return default_lang, languages


def build_language_index(
    docs_dir: Path, languages: List[str]
) -> DefaultDict[Path, Dict[str, Path]]:
    index: DefaultDict[Path, Dict[str, Path]] = defaultdict(dict)
    for lang in languages:
        suffix = f".{lang}.md"
        for path in docs_dir.rglob(f"*{suffix}"):
            rel = path.relative_to(docs_dir)
            stem = rel.name[: -len(suffix)]
            base_rel = rel.with_name(stem)
            index[base_rel][lang] = path
    return index


def select_source_document(
    language_paths: Dict[str, Path], default_lang: str
) -> Tuple[str, Path, Dict[str, object], str]:
    cache: Dict[str, Tuple[Dict[str, object], str]] = {}

    def get_content(lang: str) -> Tuple[Dict[str, object], str]:
        if lang not in cache:
            text = language_paths[lang].read_text(encoding="utf-8")
            cache[lang] = split_front_matter(text)
        return cache[lang]

    def first_manual(candidates: List[str]) -> Optional[Tuple[str, Path, Dict[str, object], str]]:
        for lang in candidates:
            if lang not in language_paths:
                continue
            meta, body = get_content(lang)
            if not meta.get("auto_translated"):
                return lang, language_paths[lang], meta, body
        return None

    preferred_order = [default_lang]
    manual = first_manual(preferred_order)
    if manual:
        return manual

    manual = first_manual(list(language_paths.keys()))
    if manual:
        return manual

    fallback_lang = default_lang if default_lang in language_paths else next(iter(language_paths))
    meta, body = get_content(fallback_lang)
    return fallback_lang, language_paths[fallback_lang], meta, body


class TranslatorCache:
    def __init__(self) -> None:
        self._cache: Dict[Tuple[str, str], MarkdownTranslator] = {}

    def get(self, source_lang: str, target_lang: str) -> MarkdownTranslator:
        key = (source_lang, target_lang)
        if key not in self._cache:
            translation = load_translator(source_lang, target_lang)
            self._cache[key] = MarkdownTranslator(SegmentTranslator(translation))
        return self._cache[key]


def main() -> None:
    args = parse_args()
    configure_logging(args.verbose)

    docs_dir = Path(args.docs_dir).resolve()
    if not docs_dir.is_dir():
        LOGGER.error("Docs directory %s does not exist", docs_dir)
        sys.exit(1)
    mkdocs_config = Path(args.mkdocs_config).resolve()
    default_lang, languages = determine_languages(
        mkdocs_config, args.languages, args.default_language
    )
    if len(languages) < 2:
        LOGGER.warning("Only one language (%s) configured; nothing to translate.", languages[0])
        return

    language_index = build_language_index(docs_dir, languages)
    if not language_index:
        LOGGER.warning("No localized documents found in %s", docs_dir)
        return

    translator_cache = TranslatorCache()
    created_files = 0

    for base_rel, lang_paths in sorted(language_index.items(), key=lambda item: str(item[0])):
        source_lang, source_path, source_meta, source_body = select_source_document(
            lang_paths, default_lang
        )

        if not source_meta:
            LOGGER.warning("%s has no front matter; skipping", source_path)
            continue

        source_meta_lang = source_meta.get("lang", source_lang)

        for target_lang in languages:
            if target_lang == source_lang:
                continue

            target_rel = base_rel.with_name(f"{base_rel.name}.{target_lang}.md")
            target_path = docs_dir / target_rel

            if target_path.exists():
                target_text = target_path.read_text(encoding="utf-8")
                target_meta, _ = split_front_matter(target_text)
                if not target_meta:
                    target_meta = {}

                if not target_meta.get("auto_translated"):
                    LOGGER.info("Skip %s (manual translation exists)", target_path)
                    continue
                if not args.force:
                    LOGGER.debug("Skip %s (auto translation already present)", target_path)
                    continue

            md_translator = translator_cache.get(source_meta_lang, target_lang)
            translated_body = md_translator.translate(source_body)
            cleaned_body = translated_body.strip("\n")

            target_meta = dict(source_meta)
            target_meta["lang"] = target_lang
            target_meta["source_lang"] = source_meta_lang
            target_meta["auto_translated"] = True

            new_document = build_front_matter(target_meta) + "\n" + cleaned_body + "\n"

            LOGGER.info(
                "%s %s",
                "Update" if target_path.exists() else "Create",
                target_path.relative_to(docs_dir.parent),
            )
            if not args.dry_run:
                target_path.parent.mkdir(parents=True, exist_ok=True)
                target_path.write_text(new_document, encoding="utf-8")
            created_files += 1

    LOGGER.info("Generated or updated %d auto-translated files", created_files)


if __name__ == "__main__":
    main()
