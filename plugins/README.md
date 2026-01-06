# Multilingual Plugin for MkDocs

A custom MkDocs plugin that provides multilingual support with automatic translation capabilities.

## Features

- **Multiple Language Support**: Support for any number of languages (default: English and German)
- **Offline Auto-Translation**: Automatically translates missing content using Argos Translate (no external API)
- **Translation Caching**: Saves translations as markdown files in `.translation_cache/`
- **Structure Preservation**: Line-by-line parsing keeps markdown elements intact (##, -, >, --8<--, etc.)
- **Clean URLs**: Language-prefixed paths (/en/blog/, /de/blog/)
- **Visual Indicators**: Marks auto-translated pages with a banner

## Installation

```bash
pip install -e .
```

## Configuration

Add to your `mkdocs.yml`:

```yaml
plugins:
  - multilingual:
      languages: ['en', 'de']              # List of supported languages
      default_language: 'en'               # Default language
      cache_dir: '.translation_cache'      # Directory for translation cache
      enable_auto_translate: true          # Enable/disable auto-translation
```

## Usage

### Manual Translations (Recommended)

Create language-specific versions of your pages:

```
docs/
  index.md       # English (default)
  index.de.md    # German translation
```

### Auto-Translation (Fallback)

If a manual translation doesn't exist, the plugin will:
1. Detect the missing translation
2. Automatically translate the content
3. Cache the translation
4. Mark the page as auto-translated

## How It Works

1. **File Detection**: Scans for language-specific files (e.g., `page.de.md`) and cache files
2. **Content Processing**: Line-by-line parsing preserves markdown structure (##, -, >, etc.)
3. **Translation**: Uses Argos Translate offline for missing translations
4. **Caching**: Saves complete markdown files with front matter to `.translation_cache/`
5. **URL Generation**: Creates language-prefixed paths (site/en/, site/de/)
6. **Page Context**: Adds language information to page templates

## Content Preservation

The plugin preserves markdown structure while translating content:

**Structure Elements (kept as-is)**:
- YAML frontmatter
- Headings markers (##, ###, etc.)
- List markers (-, *, 1., 2., etc.)
- Blockquote markers (>)
- Horizontal rules (---)
- Snippet includes (--8<-- "path")
- Code blocks (fenced and inline)
- HTML tags

**Translatable Content**:
- Heading text
- Paragraph text
- List item content
- Bold/italic content
- Link text (URLs preserved)

## Translation Provider

The plugin uses **Argos Translate** for offline translation:

- **No external API calls**: All translation happens locally during build
- **No network dependency**: Works completely offline
- **Language models**: Automatically downloads required language pairs
- **Privacy**: Your content never leaves your system

### Installing Language Models

```python
import argostranslate.package
import argostranslate.translate

# Update package index
argostranslate.package.update_package_index()
available_packages = argostranslate.package.get_available_packages()

# Install English-German
package_to_install = next(
    filter(lambda x: x.from_code == "en" and x.to_code == "de", available_packages)
)
argostranslate.package.install_from_path(package_to_install.download())
```

## Translation Cache

Translations are cached as markdown files with front matter:

```markdown
# .translation_cache/blog.de.md
---
lang: de
auto_translated: true
source_lang: en
---

## Translated Heading

Translated content...
```

**Benefits**:
- Human-readable and editable
- Preserves document structure
- Can be manually corrected
- Treated as virtual files during build
- Automatic rebuild when source changes

## Template Context

The plugin adds these variables to page context:

- `current_language`: The language of the current page
- `available_languages`: Dict of available language versions and their URLs
- `is_auto_translated`: Boolean indicating if page is auto-translated
- `all_languages`: List of all configured languages

## Example Template Usage

```html
<!-- Show language switcher -->
{% if available_languages %}
<select onchange="window.location.href=this.value">
  {% for lang, url in available_languages.items() %}
  <option value="{{ url }}" {% if lang == current_language %}selected{% endif %}>
    {{ lang }}
  </option>
  {% endfor %}
</select>
{% endif %}

<!-- Show auto-translation warning -->
{% if is_auto_translated %}
<div class="warning">
  This page has been automatically translated.
</div>
{% endif %}
```

## Dependencies

- `mkdocs>=1.0`
- `argostranslate>=1.9.0`
- `PyYAML>=6.0`

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Build Summary

The plugin reports translation statistics:

```
📊 MULTILINGUAL BUILD SUMMARY
============================================================

📄 Using 47 existing auto-translation(s) from cache:
   • blog.md (en -> de)
   • programming.md (en -> de)
   ... and 45 more

============================================================
```
- [ ] Support for partial translations
- [ ] Translation memory/glossary support
- [ ] Better handling of markdown tables and complex structures
