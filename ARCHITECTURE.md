# Multilingual Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        MkDocs Build Process                      │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Multilingual Plugin Hooks                      │
├─────────────────────────────────────────────────────────────────┤
│  on_config()    → Initialize cache, add language config         │
│  on_files()     → Detect available translations                 │
│  on_page_markdown() → Auto-translate if needed                  │
│  on_page_context()  → Add language info to templates            │
│  on_post_build()    → Save translation cache                    │
└─────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
        ┌──────────────────┐         ┌──────────────────┐
        │  Manual          │         │  Auto-           │
        │  Translation     │         │  Translation     │
        │  (page.de.md)    │         │  (API call)      │
        └──────────────────┘         └──────────────────┘
                    │                           │
                    └─────────────┬─────────────┘
                                  ▼
                    ┌──────────────────────────┐
                    │   Translation Cache      │
                    │   .translation_cache/    │
                    └──────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      HTML Output                                 │
│  - Contains language metadata                                    │
│  - data-auto-translated attribute                                │
│  - Template variables for language context                       │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Frontend (User's Browser)                       │
└─────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
        ┌──────────────────┐         ┌──────────────────┐
        │  Language        │         │  Auto-           │
        │  Detection       │         │  Translation     │
        │  (JS)            │         │  Banner          │
        └──────────────────┘         └──────────────────┘
                    │                           │
                    ▼                           ▼
        ┌──────────────────┐         ┌──────────────────┐
        │  Language        │         │  Session         │
        │  Switcher UI     │         │  Storage         │
        └──────────────────┘         └──────────────────┘
                    │
                    ▼
        ┌──────────────────────────┐
        │   localStorage           │
        │   (Persistent Pref)      │
        └──────────────────────────┘
```

## Data Flow

### Build Time (Server-Side)

1. **Page Discovery**
   ```
   docs/
   ├── index.md        → English (default)
   ├── index.de.md     → German (manual)
   └── blog/
       ├── post.md     → English (default)
       └── [no .de.md] → Will auto-translate
   ```

2. **Translation Decision**
   ```
   For each page:
     IF manual translation exists (.de.md)
       → Use manual translation
     ELSE IF auto-translate enabled
       → Call translation API
       → Cache result
     ELSE
       → Use default language
   ```

3. **Content Processing**
   ```
   Original Markdown
        ↓
   Parse line-by-line
        ↓
   ┌─────────────────────┬─────────────────────┐
   │  Structure          │  Preserve           │
   │  - ##, ###, ####    │  - Code blocks      │
   │  - -, *, 1.         │  - Frontmatter      │
   │  - >, ---           │  - Link URLs        │
   │  - --8<--           │  - Inline code      │
   └─────────────────────┴─────────────────────┘
        ↓                     ↓
   Translate content    Keep markers as-is
        ↓                     ↓
        └──────────┬──────────┘
                   ↓
   Structure + Translated Content
                   ↓
      Save to .translation_cache/
                   ↓
           Render to HTML
   ```

### Runtime (Client-Side)

1. **Language Detection**
   ```
   User visits site
        ↓
   Check URL path (/en/ or /de/)
        ↓ (if not found)
   Check localStorage
        ↓ (if not found)
   Check browser language
        ↓ (if not found)
   Use default (en)
   ```

2. **Content Display**
   ```
   Language determined
        ↓
   Update <html lang="...">
        ↓
   Show language in switcher
        ↓
   IF page is auto-translated
     → Show banner
   ```

3. **Language Switch**
   ```
   User selects language
        ↓
   Save to localStorage
        ↓
   Replace URL path prefix (/en/ ↔ /de/)
        ↓
   Reload page
        ↓
   New language displayed
   ```

## Component Interactions

### Backend (Python/MkDocs)

```
┌─────────────────────────────────────────┐
│         MultilingualPlugin              │
├─────────────────────────────────────────┤
│  Properties:                            │
│  - config (languages, cache)            │
│  - existing_translations (list)         │
│  - successful_translations (list)       │
│                                         │
│  Methods:                               │
│  - _detect_page_language()              │
│  - _translate_content()                 │
│  - _split_content_for_translation()     │
│  - _preserve_inline_elements()          │
│  - _process_inline_in_line()            │
│  - _call_translation_api()              │
└─────────────────────────────────────────┘
          │
          ├── Uses ──────────────┐
          │                      │
          ▼                      ▼
┌──────────────────┐   ┌──────────────────┐
│  Argos Translate │   │  Translation     │
│  (Offline)       │   │  Cache (*.md)    │
└──────────────────┘   └──────────────────┘
```

### Frontend (JavaScript)

```
┌─────────────────────────────────────────┐
│         LanguageSwitcher               │
├─────────────────────────────────────────┤
│  Functions:                             │
│  - getCurrentLanguage()                 │
│  - switchLanguage(lang)                 │
│  - createLanguageSwitcher()             │
│  - showAutoTranslationBanner()          │
│  - updatePageLanguage()                 │
│  - handleLanguageSpecificContent()      │
└─────────────────────────────────────────┘
          │
          ├── Interacts with ───┐
          │                     │
          ▼                     ▼
┌──────────────────┐   ┌──────────────────┐
│  DOM             │   │  localStorage    │
│  (UI Elements)   │   │  sessionStorage  │
└──────────────────┘   └──────────────────┘
```

## File Organization

```
risajef.github.io/
│
├── plugins/                    # Backend Plugin
│   ├── multilingual_plugin.py  # Core logic
│   ├── setup.py                # Installation
│   └── README.md               # Plugin docs
│
├── docs/                       # Content
│   ├── index.md                # English pages
│   ├── index.de.md             # German pages
│   │
│   └── assets/                 # Frontend assets
│       ├── language-switcher.js   # UI logic
│       └── language-switcher.css  # Styling
│
├── theme/                      # Theme files
│   ├── main.html               # Template (includes language context)
│   └── style.css               # Main styles
│
├── .translation_cache/         # Build cache
│   ├── blog.de.md              # Auto-generated translations
│   ├── programming.de.md       # (Markdown with front matter)
│   └── ...                     # 
│
├── site/                       # Build output
│   ├── en/                     # English pages (/en/blog/)
│   └── de/                     # German pages (/de/blog/)
│
├── mkdocs.yml                  # Configuration
└── [DOCUMENTATION].md          # Setup guides
```

## Configuration Flow

```yaml
# mkdocs.yml
plugins:
  - multilingual:
      languages: ['en', 'de']
      default_language: 'en'
      translation_api: 'https://...'
      cache_dir: '.translation_cache'
      enable_auto_translate: true

        ↓ Applied at build time

# Python Plugin
config['languages'] = ['en', 'de']
config['default_language'] = 'en'

        ↓ Passed to templates

# Jinja2 Template (main.html)
<html lang="{{ current_language }}">
<body data-auto-translated="{{ is_auto_translated }}">

        ↓ Read by JavaScript

# Frontend JS
const isAutoTranslated = 
  document.body.dataset.autoTranslated === 'true';
```

## Translation Cache Structure

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

**File Format**: `{base_name}.{target_lang}.md`
- Preserves markdown structure (##, -, >, etc.)
- Contains front matter with metadata
- Treated as virtual files during build

**Benefits**:
- Human-readable and editable
- Preserves document structure
- Automatic rebuild when source changes
- Can be manually corrected if needed

## Translation Provider

```
┌─────────────┐                     ┌──────────────────┐
│   Plugin    │                     │  Argos Translate │
│  (Python)   │                     │  (Offline)       │
└─────────────┘                     └──────────────────┘
      │                                      │
      │  translate("Hello", "en", "de")     │
      ├─────────────────────────────────────>│
      │                                      │
      │                               Process
      │                                      │
      │  "Hallo"                             │
      │<─────────────────────────────────────┤
      │                                      │
```

**Translation Method**:
- Offline translation using Argos Translate
- No external API calls or network dependency
- Language models loaded locally
- Instant translation during build

## State Management

### Server-Side (Build Time)

```
Plugin State:
├── existing_translations: List
│   └── Pre-existing auto-translations from cache
│
└── successful_translations: List
    └── Newly generated translations this build

File State:
├── .translation_cache/*.md
│   └── Auto-generated markdown files with front matter
│
└── site/en/, site/de/
    └── Language-prefixed output directories
```

### Client-Side (Runtime)

```
Session State:
└── sessionStorage
    └── translation-banner-dismissed: bool

Persistent State:
└── localStorage
    └── preferred_language: string ('en' | 'de')

URL State:
└── Path Prefix
    └── /en/blog/ or /de/blog/
```

## Performance Optimization

### Build Time
1. **Translation Cache**: Avoid re-translating unchanged content
2. **Parallel Processing**: Process pages independently
3. **Smart Chunking**: Only translate necessary parts

### Runtime
1. **No Page Reload**: Language switch via URL update only
2. **Cached Preferences**: Instant language detection
3. **Minimal JavaScript**: ~5KB gzipped
4. **CSS-only Styling**: No runtime style calculations

### Network
1. **No Runtime API Calls**: All translation done at build time
2. **Self-hosted Assets**: No external dependencies
3. **CDN-friendly**: Static files cache well

---

This architecture provides a robust, performant, and user-friendly multilingual experience while maintaining simplicity for content creators.
