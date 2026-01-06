#!/usr/bin/env python3
"""Test that snippet includes are working correctly in the multilingual setup."""

import re
from pathlib import Path

def test_snippet_includes():
    """Test that --8<-- snippet includes are properly processed."""
    
    # Test English version
    en_html = Path('site/blog/thoughts/index.html')
    if not en_html.exists():
        print("❌ English HTML file doesn't exist")
        return False
    
    en_content = en_html.read_text()
    
    # Check that snippet markers are NOT present in final HTML
    if '--8<--' in en_content:
        print("❌ Snippet markers (--8<--) found in English HTML - snippets not processed!")
        return False
    else:
        print("✓ No snippet markers in English HTML")
    
    # Check that actual article content is present (should include "Du hast doch nichts zu verstecken")
    if 'Du hast doch nichts zu verstecken' in en_content:
        print("✓ Article content found in English version")
    else:
        print("❌ Article content NOT found in English HTML")
        return False
    
    # Check that frontmatter is NOT rendered as HTML
    if '<hr />' in en_content and 'lang: de' in en_content:
        print("❌ Raw frontmatter found in English HTML (--- rendered as <hr />)")
        print("   This means snippet includes are including the wrong version or raw markdown")
        
        # Find and show the problematic section
        hr_matches = list(re.finditer(r'<hr />', en_content))
        if len(hr_matches) >= 2:
            start = hr_matches[0].start()
            end = hr_matches[1].end() + 100
            problematic_section = en_content[max(0, start-100):min(len(en_content), end)]
            print("\n   Problematic section:")
            print("   " + repr(problematic_section[:300]))
        
        return False
    else:
        print("✓ No raw frontmatter in English HTML")
    
    # Test German version
    de_html = Path('site/de/blog/thoughts/index.html')
    if not de_html.exists():
        print("❌ German HTML file doesn't exist")
        return False
    
    de_content = de_html.read_text()
    
    # Check that snippet markers are NOT present
    if '--8<--' in de_content:
        print("❌ Snippet markers (--8<--) found in German HTML - snippets not processed!")
        return False
    else:
        print("✓ No snippet markers in German HTML")
    
    # Check that German article content is present
    if 'Du hast doch nichts zu verstecken' in de_content:
        print("✓ Article content found in German version")
    else:
        print("❌ Article content NOT found in German HTML")
        return False
    
    print("\n✅ All tests passed!")
    return True

if __name__ == '__main__':
    import sys
    success = test_snippet_includes()
    sys.exit(0 if success else 1)
