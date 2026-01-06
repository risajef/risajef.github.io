"""
MkDocs Multilingual Plugin with Auto-Translation

This plugin adds multilingual support to MkDocs with automatic translation
for missing language versions using LibreTranslate API.
"""

import os
import re
import json
import hashlib
from pathlib import Path
from typing import Dict, Optional
import requests
from mkdocs.config import config_options
from mkdocs.plugins import BasePlugin
from mkdocs.structure.files import Files
from mkdocs.structure.pages import Page

try:
    import argostranslate.package
    import argostranslate.translate
    ARGOS_AVAILABLE = True
except ImportError:
    ARGOS_AVAILABLE = False


class MultilingualPlugin(BasePlugin):
    """Plugin for multilingual support with auto-translation."""
    
    config_scheme = (
        ('languages', config_options.Type(list, default=['en', 'de'])),
        ('translation_api', config_options.Type(str, default='https://libretranslate.com/translate')),
        ('cache_dir', config_options.Type(str, default='.translation_cache')),
        ('enable_auto_translate', config_options.Type(bool, default=True)),
    )
    
    def __init__(self):
        super().__init__()
        self.available_translations = {}
        self.failed_translations = []
        self.successful_translations = []
        self.existing_translations = []
        self.argos_initialized = False
        
    def on_config(self, config, **kwargs):
        """Initialize plugin configuration."""
        # Create docs directory reference for writing translated files
        self.docs_dir = Path(config['docs_dir'])
        
        # Create translation cache directory
        self.translation_cache_dir = self.docs_dir.parent / '.translation_cache'
        self.translation_cache_dir.mkdir(exist_ok=True)
        
        # Add language info to config for templates
        config['languages'] = self.config['languages']
        
        # Initialize argos-translate if configured
        if self.config['translation_api'] == 'argos' and ARGOS_AVAILABLE:
            self._init_argos_translate()
        
        return config
    
    def on_files(self, files: Files, config, **kwargs):
        """Scan files and build translation mapping."""
        # Build a map of base files and their language variants
        base_files = {}  # Maps base path -> {lang: file_path}
        
        # Also scan .translation_cache directory for auto-translated files
        cache_files = []
        if self.translation_cache_dir.exists():
            for cache_file in self.translation_cache_dir.rglob('*.md'):
                # Get relative path and add to files as a virtual file
                rel_path = cache_file.relative_to(self.translation_cache_dir)
                cache_files.append((str(rel_path), cache_file))
        
        for file in files:
            if not file.src_path.endswith('.md'):
                continue
            
            # Check if this is a language-specific file
            lang_match = re.search(r'\.(' + '|'.join(self.config['languages']) + r')\.md$', file.src_path)
            
            if lang_match:
                # This is a language-specific file (e.g., index.de.md)
                lang = lang_match.group(1)
                base_path = file.src_path[:lang_match.start()] + '.md'
                
                if base_path not in base_files:
                    base_files[base_path] = {}
                base_files[base_path][lang] = file.src_path
                
                # Fix destination path to use language prefix: blog.de.md -> /de/blog/index.html
                if file.dest_path and config.get('use_directory_urls', True):
                    # Extract the base name without language suffix
                    base_name = file.src_path[:lang_match.start()].rstrip('.')
                    
                    if base_name:
                        # blog.de.md -> de/blog/index.html
                        # politik/e-id.de.md -> de/politik/e-id/index.html
                        file.dest_path = f'{lang}/{base_name}/index.html'
                        file.abs_dest_path = str(Path(config['site_dir']) / file.dest_path)
                        file.url = f'{lang}/{base_name}/'
                    else:
                        # index.de.md -> de/index.html
                        file.dest_path = f'{lang}/index.html'
                        file.abs_dest_path = str(Path(config['site_dir']) / file.dest_path)
                        file.url = f'{lang}/'
            else:
                # This is a base file (e.g., index.md)
                if file.src_path not in base_files:
                    base_files[file.src_path] = {}
                # Store unspecified language; will be resolved when front matter is read
                base_files[file.src_path]['__unspecified__'] = file.src_path
        
        # Now build the available_translations map
        for base_path, lang_files in base_files.items():
            self.available_translations[base_path] = {}
            
            for lang in self.config['languages']:
                if lang in lang_files:
                    self.available_translations[base_path][lang] = lang_files[lang]
                elif self.config['enable_auto_translate']:
                    self.available_translations[base_path][lang] = 'auto'

            if '__unspecified__' in lang_files:
                self.available_translations[base_path]['__unspecified__'] = lang_files['__unspecified__']
        
        # Add cached translation files to the Files collection
        from mkdocs.structure.files import File
        for rel_path_str, cache_file in cache_files:
            # Check if this file already exists in the docs directory
            if not any(f.src_path == rel_path_str for f in files):
                # This is an auto-generated translation - count it
                lang_match_count = re.search(r'\.(' + '|'.join(self.config['languages']) + r')\.md$', rel_path_str)
                if lang_match_count:
                    # Extract base path and determine source language
                    base_path_for_count = rel_path_str[:lang_match_count.start()] + '.md'
                    target_lang = lang_match_count.group(1)
                    
                    # Try to determine source language from base file
                    base_file_path = self.docs_dir / base_path_for_count
                    if base_file_path.exists():
                        # Read source lang from base file
                        try:
                            with open(base_file_path, 'r', encoding='utf-8') as f:
                                content_preview = f.read(500)
                                import yaml
                                fm_match = re.match(r'^---\n(.*?)\n---', content_preview, re.DOTALL)
                                if fm_match:
                                    fm = yaml.safe_load(fm_match.group(1))
                                    source_lang = fm.get('lang', 'en')
                                    trans_key = f"{base_path_for_count} ({source_lang} -> {target_lang})"
                                    if trans_key not in self.existing_translations:
                                        self.existing_translations.append(trans_key)
                        except:
                            pass
                
                # Create a virtual file that reads from the cache
                virtual_file = File(
                    rel_path_str,
                    str(self.translation_cache_dir),
                    config['site_dir'],
                    config.get('use_directory_urls', True)
                )
                
                # Fix destination path for language-suffixed files
                # E.g., blog.de.md should generate /de/blog/index.html
                lang_match_vf = re.search(r'\.(' + '|'.join(self.config['languages']) + r')\.md$', rel_path_str)
                if lang_match_vf:
                    lang = lang_match_vf.group(1)
                    base_name = rel_path_str[:lang_match_vf.start()].rstrip('.')
                    
                    if config.get('use_directory_urls', True):
                        if base_name:
                            # blog.de.md -> de/blog/index.html
                            virtual_file.dest_path = f'{lang}/{base_name}/index.html'
                            virtual_file.abs_dest_path = str(Path(config['site_dir']) / virtual_file.dest_path)
                            virtual_file.url = f'{lang}/{base_name}/'
                        else:
                            # index.de.md -> de/index.html
                            virtual_file.dest_path = f'{lang}/index.html'
                            virtual_file.abs_dest_path = str(Path(config['site_dir']) / virtual_file.dest_path)
                            virtual_file.url = f'{lang}/'
                
                files.append(virtual_file)
                
                # Update base_files tracking
                lang_match = re.search(r'\.(' + '|'.join(self.config['languages']) + r')\.md$', rel_path_str)
                if lang_match:
                    lang = lang_match.group(1)
                    base_path = rel_path_str[:lang_match.start()] + '.md'
                    if base_path not in base_files:
                        base_files[base_path] = {}
                    base_files[base_path][lang] = rel_path_str
                    
                    # Update available_translations
                    if base_path not in self.available_translations:
                        self.available_translations[base_path] = {}
                    self.available_translations[base_path][lang] = rel_path_str
        
        return files
    
    def on_page_markdown(self, markdown: str, page: Page, config, files):
        """Process page markdown, set language metadata."""
        # Detect the source language of this page (checks front matter AND filename)
        source_lang = self._detect_page_language(page)
        
        # Get base path (without language suffix)
        if re.search(r'\.(' + '|'.join(self.config['languages']) + r')\.md$', page.file.src_path):
            # This is a language-specific file (e.g., index.de.md)
            base_path = re.sub(r'\.(' + '|'.join(self.config['languages']) + r')\.md$', '.md', page.file.src_path)
        else:
            # This is a base file
            base_path = page.file.src_path
        
        # Store translation info in page meta
        if not hasattr(page, 'meta'):
            page.meta = {}
        
        # Default to non auto-translated unless explicitly set later for generated variants
        page.meta['is_auto_translated'] = False

        page.meta['page_lang'] = source_lang
        page.meta['source_lang'] = source_lang
        page.meta['base_path'] = base_path
        page.meta['available_languages'] = {}
        # Make sure templates can rely on a lang field even when it was missing
        page.meta['lang'] = source_lang
        
        # Update the available_translations map if the front matter specifies a different language
        # than what the filename suggests
        if base_path in self.available_translations:
            translation_info = self.available_translations[base_path]

            # Resolve unspecified entries to the detected source language
            if translation_info.get('__unspecified__') == page.file.src_path:
                del translation_info['__unspecified__']
                translation_info[source_lang] = page.file.src_path
            elif '__unspecified__' in translation_info:
                # Replace placeholder with detected language
                translation_info[source_lang] = translation_info.pop('__unspecified__')
            else:
                translation_info[source_lang] = page.file.src_path
            
            # Ensure other configured languages are represented
            for lang in self.config['languages']:
                if lang == source_lang:
                    continue
                if lang not in translation_info and self.config['enable_auto_translate']:
                    translation_info[lang] = 'auto'
        
        # Build available languages map
        translation_info = self.available_translations.get(base_path, {})
        for lang in self.config['languages']:
            if lang in translation_info:
                if translation_info[lang] == 'auto':
                    page.meta['available_languages'][lang] = f'auto-{lang}'
                else:
                    page.meta['available_languages'][lang] = translation_info[lang]
            elif self.config['enable_auto_translate']:
                page.meta['available_languages'][lang] = f'auto-{lang}'
        
        # Generate missing translation files (do this once during markdown phase before processing)
        self._generate_translations_for_page(page, markdown, source_lang, config)
        
        return markdown
    
    def _generate_translations_for_page(self, page: Page, markdown: str, source_lang: str, config):
        """Generate translation markdown files for this page if needed."""
        base_path = page.meta.get('base_path', page.file.src_path)
        
        for target_lang in self.config['languages']:
            if target_lang == source_lang:
                continue

            # Check if manual translation exists
            translation_info = self.available_translations.get(base_path, {}).get(target_lang)

            # Check if this is an auto-translation (either 'auto' or a path in .translation_cache)
            is_auto_translation = (
                translation_info == 'auto' or
                (isinstance(translation_info, str) and '.translation_cache' in translation_info)
            )

            if is_auto_translation and self.config['enable_auto_translate']:
                # Check if translated markdown file already exists in .translation_cache
                translated_md_path = self._get_translated_path(page.file.src_path, source_lang, target_lang)
                translated_file = self.translation_cache_dir / translated_md_path
                
                if translated_file.exists():
                    # Translation file exists (was auto-generated previously), count it
                    trans_key = f"{page.file.src_path} ({source_lang} -> {target_lang})"
                    if trans_key not in self.existing_translations and trans_key not in self.successful_translations:
                        self.existing_translations.append(trans_key)
                    continue
                
                # Need to auto-translate and create the file
                translated_markdown = self._translate_content(
                    markdown,
                    source_lang,
                    target_lang
                )

                if translated_markdown is not None:
                    # Write the translated markdown file
                    self._write_translated_markdown(
                        page.file.src_path,
                        translated_markdown,
                        source_lang,
                        target_lang
                    )
                    self.successful_translations.append(f"{page.file.src_path} ({source_lang} -> {target_lang})")
                else:
                    # Translation failed (rate limit or error)
                    self.failed_translations.append(f"{page.file.src_path} ({source_lang} -> {target_lang})")
    
    def on_page_content(self, html: str, page: Page, config, files):
        """Post-process HTML content after rendering (no longer generates translations here)."""
        source_lang = page.meta.get('source_lang')
        if not source_lang:
            raise ValueError(f"Missing source_lang metadata for {page.file.src_path}; ensure 'lang' is set.")

        # Default: this page is not auto-translated (applies to the source language output)
        page.meta.setdefault('is_auto_translated', False)

        return html
    
    def _get_translated_path(self, src_path: str, source_lang: str, target_lang: str) -> str:
        """Get the path for a translated markdown file."""
        # Remove source lang suffix if present
        path = re.sub(r'\.(' + '|'.join(self.config['languages']) + r')\.md$', '.md', src_path)
        # Add target lang suffix
        return path.replace('.md', f'.{target_lang}.md')
    
    def _write_translated_markdown(self, src_path: str, translated_content: str, source_lang: str, target_lang: str):
        """Write translated markdown to .translation_cache with proper front matter."""
        translated_path = self._get_translated_path(src_path, source_lang, target_lang)
        output_file = self.translation_cache_dir / translated_path
        
        # Ensure directory exists
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Parse existing frontmatter from original content to extract metadata
        # Try to read the original file to get its front matter
        original_file = self.docs_dir / src_path
        original_frontmatter = {}
        
        if original_file.exists():
            with open(original_file, 'r', encoding='utf-8') as f:
                original_content = f.read()
                frontmatter_match = re.match(r'^---\n(.*?)\n---\n', original_content, re.DOTALL)
                if frontmatter_match:
                    import yaml
                    try:
                        original_frontmatter = yaml.safe_load(frontmatter_match.group(1)) or {}
                    except:
                        pass
        
        # Build new front matter with lang and auto_translated
        new_frontmatter = original_frontmatter.copy()
        new_frontmatter['lang'] = target_lang
        new_frontmatter['auto_translated'] = True
        new_frontmatter['source_lang'] = source_lang
        
        # Build final content
        import yaml
        frontmatter_yaml = yaml.dump(new_frontmatter, default_flow_style=False, allow_unicode=True, sort_keys=False)
        final_content = f'---\n{frontmatter_yaml}---\n\n{translated_content}'
        
        # Write the file
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(final_content)
        
        print(f"✓ Created translation: .translation_cache/{translated_path}")
    
    def on_post_page(self, output: str, page: Page, config):
        """Add language attributes to HTML output."""
        # Get page language info
        source_lang = page.meta.get('page_lang')
        if not source_lang:
            raise ValueError(f"Missing page_lang metadata for {page.file.src_path}; ensure 'lang' is set.")
        
        is_auto_translated = page.meta.get('is_auto_translated', False)
        auto_attr = ' data-auto-translated="true"' if is_auto_translated else ''
        
        # Update HTML language attributes
        updated_output = output
        
        # Set html lang attribute
        updated_output = re.sub(
            r'<html[^>]*>',
            f'<html lang="{source_lang}" data-page-lang="{source_lang}">',
            updated_output,
            count=1,
            flags=re.IGNORECASE,
        )
        
        # Update meta tags
        updated_output = re.sub(
            r'(<meta\s+http-equiv="content-language"\s+content=")[^"]*("\s*/?>)',
            rf'\1{source_lang}\2',
            updated_output,
            count=1,
            flags=re.IGNORECASE,
        )
        
        updated_output = re.sub(
            r'(<meta\s+name="language"\s+content=")[^"]*("\s*/?>)',
            rf'\1{source_lang}\2',
            updated_output,
            count=1,
            flags=re.IGNORECASE,
        )
        
        # Update body data attributes
        body_match = re.search(r'<body([^>]*)>', updated_output, flags=re.IGNORECASE)
        if body_match:
            existing_attrs = body_match.group(1)
            cleaned_attrs = re.sub(r'\sdata-page-lang="[^"]*"', '', existing_attrs, flags=re.IGNORECASE)
            cleaned_attrs = re.sub(r'\sdata-auto-translated="[^"]*"', '', cleaned_attrs, flags=re.IGNORECASE)
            new_body = f'<body{cleaned_attrs} data-page-lang="{source_lang}"{auto_attr}>'
            updated_output = (
                updated_output[: body_match.start()]
                + new_body
                + updated_output[body_match.end() :]
            )
        
        return updated_output
        outputs_to_write = [(source_lang, output, page.meta.get('is_auto_translated', False), None)]

        translated_versions = page.meta.get('translated_versions', {})
        for target_lang, translated_markdown in translated_versions.items():
            translated_html = self._render_translated_html(translated_markdown, output, config) if translated_markdown else output
            outputs_to_write.append((target_lang, translated_html, translated_markdown is not None, None))

        # Generate language-specific files
        for lang_code, html_content, is_auto, path_override in outputs_to_write:
            if path_override is not None:
                lang_output_path = path_override
            elif output_path.name == 'index.html':
                lang_output_path = output_path.parent / f'index.{lang_code}.html'
            else:
                lang_output_path = output_path.parent / output_path.name.replace('.html', f'.{lang_code}.html')

            updated_output = html_content

            auto_attr = ' data-auto-translated="true"' if is_auto else ''

            # Normalise language markers
            updated_output = re.sub(
                r'<html[^>]*>',
                f'<html lang="{lang_code}" data-page-lang="{lang_code}">',
                updated_output,
                count=1,
                flags=re.IGNORECASE,
            )

            updated_output = re.sub(
                r'(<meta\s+http-equiv="content-language"\s+content=")[^"]*("\s*/?>)',
                rf'\1{lang_code}\2',
                updated_output,
                count=1,
                flags=re.IGNORECASE,
            )

            updated_output = re.sub(
                r'(<meta\s+name="language"\s+content=")[^"]*("\s*/?>)',
                rf'\1{lang_code}\2',
                updated_output,
                count=1,
                flags=re.IGNORECASE,
            )

            body_match = re.search(r'<body([^>]*)>', updated_output, flags=re.IGNORECASE)
            if body_match:
                existing_attrs = body_match.group(1)
                cleaned_attrs = re.sub(r'\sdata-page-lang="[^"]*"', '', existing_attrs, flags=re.IGNORECASE)
                cleaned_attrs = re.sub(r'\sdata-auto-translated="[^"]*"', '', cleaned_attrs, flags=re.IGNORECASE)
                new_body = f'<body{cleaned_attrs} data-page-lang="{lang_code}"{auto_attr}>'
                updated_output = (
                    updated_output[: body_match.start()]
                    + new_body
                    + updated_output[body_match.end() :]
                )

            lang_output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(lang_output_path, 'w', encoding='utf-8') as f:
                f.write(updated_output)

            print(f"✓ Generated {lang_output_path.relative_to(site_dir)} ({lang_code})")

        # Generate a redirect index.html that MkDocs will write
        # Return this so MkDocs writes it to the original output path (index.html)
        redirect_html = self._generate_redirect_html(source_lang, config)
        return redirect_html
    
    def _generate_redirect_html(self, default_lang: str, config) -> str:
        """Generate an index.html that redirects to the appropriate language version."""
        return f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Redirecting...</title>
    <meta http-equiv="refresh" content="0; url=index.{default_lang}.html">
    <script>
    (function() {{
        // Get requested language from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const requestedLang = urlParams.get('lang');
        
        // Available languages
        const languages = {json.dumps(self.config['languages'])};
        
        // Determine target language
        let targetLang = requestedLang && languages.includes(requestedLang) 
            ? requestedLang 
            : '{default_lang}';
        
        // Redirect to language-specific file immediately
        const path = window.location.pathname;
        const basePath = path.endsWith('/') ? path : path.replace(/\\/[^/]*$/, '/');
        window.location.replace(basePath + 'index.' + targetLang + '.html');
    }})();
    </script>
</head>
<body>
    <p>Redirecting to <a href="index.{default_lang}.html">index.{default_lang}.html</a>...</p>
</body>
</html>'''

    def _render_translated_html(self, translated_markdown: str, original_output: str, config) -> str:
        """Render translated markdown into the existing HTML shell by replacing the article content."""
        try:
            import re
            from markdown import Markdown

            md = Markdown(
                extensions=config.get('markdown_extensions', []),
                extension_configs=config.get('mdx_configs', {})
            )
            translated_body = md.convert(translated_markdown)

            # Strategy 1: replace <article class="markdown">...</article>
            pattern_article = re.compile(r'<article[^>]*class="[^"]*markdown[^"]*"[^>]*>.*?</article>', re.DOTALL | re.IGNORECASE)
            replacement_article = f'<article class="markdown">{translated_body}</article>'
            new_output, count = pattern_article.subn(replacement_article, original_output, count=1)
            if count:
                return new_output

            # Strategy 2: replace inner HTML of <div class="content">...</div> (first occurrence)
            pattern_content = re.compile(r'(<div\s+class="content">).*?(</div>\s*</div>\s*<div id="mkdocs-search-popup")', re.DOTALL | re.IGNORECASE)
            replacement_content = rf'\1{translated_body}\2'
            new_output, count = pattern_content.subn(replacement_content, original_output, count=1)
            if count:
                return new_output

            return original_output
        except Exception:
            return original_output
    
    def on_page_context(self, context, page, config, nav):
        """Add language information to page context."""
        if 'page_lang' not in page.meta or not page.meta['page_lang']:
            raise ValueError(f"Missing page_lang metadata for {page.file.src_path}; ensure 'lang' is set.")

        context['current_language'] = page.meta['page_lang']
        context['available_languages'] = page.meta.get('available_languages', {})
        context['is_auto_translated'] = page.meta.get('is_auto_translated', False)
        context['all_languages'] = self.config['languages']
        
        return context
    
    def on_post_build(self, config, **kwargs):
        """Show translation summary after build."""
        # Print translation summary
        print("\n" + "="*60)
        print("📊 MULTILINGUAL BUILD SUMMARY")
        print("="*60)
        
        if self.successful_translations:
            print(f"\n✅ Successfully translated {len(self.successful_translations)} page(s):")
            for trans in self.successful_translations[:10]:  # Show first 10
                print(f"   • {trans}")
            if len(self.successful_translations) > 10:
                print(f"   ... and {len(self.successful_translations) - 10} more")
        
        if self.existing_translations:
            print(f"\n📄 Using {len(self.existing_translations)} existing auto-translation(s) from cache:")
            for trans in self.existing_translations[:5]:  # Show first 5
                print(f"   • {trans}")
            if len(self.existing_translations) > 5:
                print(f"   ... and {len(self.existing_translations) - 5} more")
        
        if self.failed_translations:
            print(f"\n❌ Failed to translate {len(self.failed_translations)} page(s) (rate limit or error):")
            for trans in self.failed_translations:
                print(f"   • {trans}")
            print("\n💡 Tip: Use a self-hosted LibreTranslate instance or create manual translations")
        
        total_auto = len(self.successful_translations) + len(self.existing_translations)
        if not total_auto and not self.failed_translations:
            print("\nℹ️  No auto-translations needed (all pages have manual translations)")
        
        print("\n" + "="*60 + "\n")
    
    def _detect_page_language(self, page: Page) -> str:
        """Detect the language of a page."""
        if hasattr(page, 'meta') and page.meta.get('lang'):
            return page.meta['lang']

        raise ValueError(f"Missing required 'lang' front matter in {page.file.src_path}")
    
    def _get_base_path(self, src_path: str) -> str:
        """Get the base path without language suffix."""
        return re.sub(r'\.[a-z]{2}\.md$', '', src_path).replace('.md', '')
    
    def _get_available_languages(self, base_path: str, page: Page) -> Dict[str, str]:
        """Get available language versions for a page."""
        languages = {}
        
        if base_path in self.available_translations:
            for lang, file_path in self.available_translations[base_path].items():
                url = self._generate_language_url(page, lang)
                languages[lang] = url
        
        # Add all configured languages (for auto-translation)
        for lang in self.config['languages']:
            if lang not in languages:
                languages[lang] = self._generate_language_url(page, lang)
        
        return languages
    
    def _generate_language_url(self, page: Page, lang: str) -> str:
        """Generate URL for a specific language version."""
        url = page.url
        if url.endswith('/'):
            url = url[:-1]
        
        # Add language parameter
        return f"{url}?lang={lang}"
    
    def _translate_content(self, content: str, source_lang: str, target_lang: str) -> str:
        """Translate content, preserving code blocks, HTML, and mermaid diagrams."""
        # Split content into translatable chunks (preserve markdown structure)
        chunks = self._split_content_for_translation(content)
        translated_chunks = []
        
        for chunk in chunks:
            if chunk['translatable']:
                translated_text = self._call_translation_api(
                    chunk['text'], 
                    source_lang, 
                    target_lang
                )
                if translated_text is None:
                    # Translation failed, return None to indicate failure
                    return None
                translated_chunks.append(translated_text)
            else:
                # Keep code blocks, frontmatter, HTML, etc. untranslated
                translated_chunks.append(chunk['text'])
        
        translated_content = ''.join(translated_chunks)
        
        return translated_content
    
    def _split_content_for_translation(self, content: str) -> list:
        """Split content into translatable and non-translatable chunks.
        
        Preserves:
        - Frontmatter (---)
        - Code blocks (```)
        - Inline code (`)
        - HTML tags
        - Mermaid diagrams
        """
        chunks = []
        pos = 0
        
        # State machine for parsing
        in_code_block = False
        in_frontmatter = False
        code_fence = None
        frontmatter_processed = False  # Track if we've already seen frontmatter
        
        lines = content.split('\n')
        current_chunk = []
        current_translatable = True
        
        i = 0
        while i < len(lines):
            line = lines[i]
            
            # Check for frontmatter start/end (only at beginning of document)
            if line.strip() == '---' and not frontmatter_processed:
                if i == 0:
                    # Start of frontmatter
                    if current_chunk:
                        text = '\n'.join(current_chunk) + '\n'
                        if text.strip():
                            chunks.append({'text': text, 'translatable': current_translatable})
                        current_chunk = []
                    in_frontmatter = True
                    current_translatable = False
                    current_chunk.append(line)
                    i += 1
                    continue
                elif in_frontmatter:
                    # End of frontmatter
                    current_chunk.append(line)
                    text = '\n'.join(current_chunk) + '\n'
                    chunks.append({'text': text, 'translatable': False})
                    current_chunk = []
                    in_frontmatter = False
                    frontmatter_processed = True
                    current_translatable = True
                    i += 1
                    continue
            
            # Check for code fence
            if line.strip().startswith('```'):
                if not in_code_block:
                    # Start of code block
                    if current_chunk and current_translatable:
                        text = '\n'.join(current_chunk)
                        if text.strip():
                            # Process inline elements in the accumulated text
                            processed = self._preserve_inline_elements(text)
                            chunks.extend(processed)
                        current_chunk = []
                    in_code_block = True
                    code_fence = line
                    current_translatable = False
                    current_chunk.append(line)
                else:
                    # End of code block
                    current_chunk.append(line)
                    text = '\n'.join(current_chunk) + '\n'
                    chunks.append({'text': text, 'translatable': False})
                    current_chunk = []
                    in_code_block = False
                    code_fence = None
                    current_translatable = True
                i += 1
                continue
            
            # Inside code block or frontmatter
            if in_code_block or in_frontmatter:
                current_chunk.append(line)
                i += 1
                continue
            
            # Regular line - accumulate for inline element processing
            current_chunk.append(line)
            i += 1
        
        # Process remaining chunk
        if current_chunk:
            text = '\n'.join(current_chunk)
            if in_code_block or in_frontmatter:
                if text.strip():
                    chunks.append({'text': text, 'translatable': False})
            else:
                if text.strip():
                    processed = self._preserve_inline_elements(text)
                    chunks.extend(processed)
        
        return chunks
    
    def _preserve_inline_elements(self, text: str) -> list:
        """Preserve inline code, HTML tags, markdown structure, and other non-translatable inline elements."""
        chunks = []
        
        # Process line by line to handle markdown structure
        lines = text.split('\n')
        for i, line in enumerate(lines):
            # Add newline after each line except the last
            add_newline = (i < len(lines) - 1)
            
            # Check for markdown structure elements
            # Headings: ## Title or ##Title
            heading_match = re.match(r'^(#{1,6})\s*(.*)', line)
            if heading_match and heading_match.group(1):
                # Preserve the heading markers and one space if present
                heading_markers = heading_match.group(1)
                content = heading_match.group(2)
                
                chunks.append({'text': heading_markers + ' ', 'translatable': False})
                if content.strip():
                    self._process_inline_in_line(content, chunks)
                if add_newline:
                    chunks.append({'text': '\n', 'translatable': False})
                continue
            
            # Unordered lists: - Item or * Item
            list_match = re.match(r'^(\s*[-*]\s+)', line)
            if list_match:
                chunks.append({'text': list_match.group(1), 'translatable': False})
                content = line[len(list_match.group(1)):]
                if content.strip():
                    self._process_inline_in_line(content, chunks)
                if add_newline:
                    chunks.append({'text': '\n', 'translatable': False})
                continue
            
            # Ordered lists: 1. Item
            ordered_list_match = re.match(r'^(\s*\d+\.\s+)', line)
            if ordered_list_match:
                chunks.append({'text': ordered_list_match.group(1), 'translatable': False})
                content = line[len(ordered_list_match.group(1)):]
                if content.strip():
                    self._process_inline_in_line(content, chunks)
                if add_newline:
                    chunks.append({'text': '\n', 'translatable': False})
                continue
            
            # Blockquotes: > Text
            blockquote_match = re.match(r'^(>\s*)', line)
            if blockquote_match:
                chunks.append({'text': blockquote_match.group(1), 'translatable': False})
                content = line[len(blockquote_match.group(1)):]
                if content.strip():
                    self._process_inline_in_line(content, chunks)
                if add_newline:
                    chunks.append({'text': '\n', 'translatable': False})
                continue
            
            # Horizontal rules: ---, ***, ___
            if re.match(r'^(\s*[-*_]{3,}\s*)$', line):
                chunks.append({'text': line, 'translatable': False})
                if add_newline:
                    chunks.append({'text': '\n', 'translatable': False})
                continue
            
            # HTML/Markdown attributes: {:.class} or {:#id}
            if re.match(r'^\s*\{[:.#].*\}\s*$', line):
                chunks.append({'text': line, 'translatable': False})
                if add_newline:
                    chunks.append({'text': '\n', 'translatable': False})
                continue
            
            # Regular line - process inline elements
            if line.strip():
                self._process_inline_in_line(line, chunks)
            else:
                chunks.append({'text': line, 'translatable': False})
            
            if add_newline:
                chunks.append({'text': '\n', 'translatable': False})
        
        return chunks
    
    def _process_inline_in_line(self, line: str, chunks: list):
        """Process inline elements (code, HTML, math, links) within a line."""
        pos = 0
        
        # Pattern for inline elements to preserve
        # Order matters: try more specific patterns first
        pattern = re.compile(
            r'('
            r'--8<--\s*"[^"]+"|'  # Snippet includes --8<-- "path"
            r'\[([^\]]+)\]\(([^)]+)\)|'  # Markdown links [text](url) - groups 2 and 3
            r'<[^>]+>|'  # HTML tags
            r'`[^`\n]+`|'  # Inline code
            r'\*\*[^*\n]+\*\*|'  # Bold
            r'\*[^*\n]+\*|'  # Italic
            r'__[^_\n]+__|'  # Bold underscore
            r'_[^_\n]+_|'  # Italic underscore
            r'\$\$[^\$]+\$\$|'  # Block math
            r'\$[^\$\n]+\$'  # Inline math
            r')',
            re.DOTALL
        )
        
        for match in pattern.finditer(line):
            start, end = match.span()
            
            # Add translatable text before this match
            if start > pos:
                before_text = line[pos:start]
                if before_text.strip():
                    chunks.append({'text': before_text, 'translatable': True})
            
            # Check if this is a snippet include - preserve completely
            if match.group(0).startswith('--8<--'):
                chunks.append({'text': match.group(0), 'translatable': False})
            # Handle markdown links specially - translate the text but keep the structure
            elif match.group(2) and match.group(3):  # This is a [text](url) link
                link_text = match.group(2)
                link_url = match.group(3)
                chunks.append({'text': '[', 'translatable': False})
                chunks.append({'text': link_text, 'translatable': True})
                chunks.append({'text': '](', 'translatable': False})
                chunks.append({'text': link_url, 'translatable': False})
                chunks.append({'text': ')', 'translatable': False})
            # Handle bold/italic - translate the content but keep the markers
            elif match.group(0).startswith('**') and match.group(0).endswith('**'):
                content = match.group(0)[2:-2]
                chunks.append({'text': '**', 'translatable': False})
                chunks.append({'text': content, 'translatable': True})
                chunks.append({'text': '**', 'translatable': False})
            elif match.group(0).startswith('__') and match.group(0).endswith('__'):
                content = match.group(0)[2:-2]
                chunks.append({'text': '__', 'translatable': False})
                chunks.append({'text': content, 'translatable': True})
                chunks.append({'text': '__', 'translatable': False})
            elif match.group(0).startswith('*') and match.group(0).endswith('*') and not match.group(0).startswith('**'):
                content = match.group(0)[1:-1]
                chunks.append({'text': '*', 'translatable': False})
                chunks.append({'text': content, 'translatable': True})
                chunks.append({'text': '*', 'translatable': False})
            elif match.group(0).startswith('_') and match.group(0).endswith('_') and not match.group(0).startswith('__'):
                content = match.group(0)[1:-1]
                chunks.append({'text': '_', 'translatable': False})
                chunks.append({'text': content, 'translatable': True})
                chunks.append({'text': '_', 'translatable': False})
            else:
                # Add other non-translatable matches (code, HTML, math)
                chunks.append({'text': match.group(0), 'translatable': False})
            
            pos = end
        
        # Add remaining translatable text
        if pos < len(line):
            after_text = line[pos:]
            if after_text.strip():
                chunks.append({'text': after_text, 'translatable': True})
    
    def _call_translation_api(self, text: str, source_lang: str, target_lang: str) -> str:
        """Translate text using configured backend (argos-translate or API)."""
        # Use argos-translate if configured
        if self.config['translation_api'] == 'argos' and ARGOS_AVAILABLE:
            return self._translate_with_argos(text, source_lang, target_lang)
        
        # Fall back to API translation
        return self._translate_with_api(text, source_lang, target_lang)
    
    def _init_argos_translate(self):
        """Initialize argos-translate and download required language packages."""
        if not ARGOS_AVAILABLE:
            return
        
        try:
            # Update package index
            argostranslate.package.update_package_index()
            available_packages = argostranslate.package.get_available_packages()
            
            # Get language pairs we need
            language_pairs = []
            for source in self.config['languages']:
                for target in self.config['languages']:
                    if source != target:
                        language_pairs.append((source, target))
            
            # Install missing packages
            installed_packages = argostranslate.package.get_installed_packages()
            installed_pairs = set((pkg.from_code, pkg.to_code) for pkg in installed_packages)
            
            for source, target in language_pairs:
                if (source, target) not in installed_pairs:
                    # Find and install the package
                    package = next(
                        (pkg for pkg in available_packages 
                         if pkg.from_code == source and pkg.to_code == target),
                        None
                    )
                    if package:
                        print(f"📦 Installing translation package: {source} -> {target}")
                        argostranslate.package.install_from_path(package.download())
                    else:
                        print(f"⚠️  No translation package available for {source} -> {target}")
            
            print(f"✓ Argos Translate initialized for languages: {', '.join(self.config['languages'])}")
            
        except Exception as e:
            print(f"❌ Failed to initialize argos-translate: {e}")
            self.config['enable_auto_translate'] = False
    
    def _translate_with_argos(self, text: str, source_lang: str, target_lang: str) -> Optional[str]:
        """Translate using argos-translate (offline)."""
        try:
            # Translate text
            translated = argostranslate.translate.translate(text, source_lang, target_lang)
            return translated
        except Exception as e:
            print(f"❌ Argos translation error ({source_lang} -> {target_lang}): {e}")
            return None
    
    def _translate_with_api(self, text: str, source_lang: str, target_lang: str) -> Optional[str]:
        """Translate using LibreTranslate API."""
        try:
            response = requests.post(
                self.config['translation_api'],
                json={
                    'q': text,
                    'source': source_lang,
                    'target': target_lang,
                    'format': 'text'
                },
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get('translatedText', text)
            elif response.status_code == 429:
                print(f"⚠️  Translation API rate limit reached for {source_lang} -> {target_lang}")
                return None
            else:
                print(f"❌ Translation API error {response.status_code} for {source_lang} -> {target_lang}")
                return None
                
        except Exception as e:
            print(f"❌ Translation error: {e}")
            return None
