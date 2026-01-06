#!/usr/bin/env python3
"""Fix snippet includes to skip front matter by using line ranges."""

import re
from pathlib import Path

def count_frontmatter_lines(md_file):
    """Count how many lines of frontmatter a file has."""
    content = md_file.read_text()
    lines = content.split('\n')
    
    if not lines[0].strip() == '---':
        return 0
    
    # Find the closing ---
    for i, line in enumerate(lines[1:], start=1):
        if line.strip() == '---':
            return i + 1  # Return line number after closing ---
    
    return 0

def fix_snippet_includes(file_path):
    """Update snippet includes in a file to skip frontmatter."""
    content = file_path.read_text()
    original_content = content
    
    # Find all --8<-- includes
    pattern = r'--8<--\s*"([^"]+)"'
    matches = list(re.finditer(pattern, content))
    
    if not matches:
        return False
    
    changes_made = False
    for match in reversed(matches):  # Process in reverse to maintain positions
        include_path = match.group(1)
        full_match = match.group(0)
        
        # Resolve the actual file path
        docs_base = Path('docs')
        included_file = docs_base / include_path
        
        if not included_file.exists():
            print(f"  ⚠️  File not found: {included_file}")
            continue
        
        # Check if this file has frontmatter
        fm_lines = count_frontmatter_lines(included_file)
        
        if fm_lines > 0:
            # Skip the frontmatter lines and any blank line after
            start_line = fm_lines + 2  # Skip frontmatter + 1 blank line typically
            new_include = f'--8<-- "{include_path}:{start_line}:"'
            
            # Replace in content
            start_pos = match.start()
            end_pos = match.end()
            content = content[:start_pos] + new_include + content[end_pos:]
            changes_made = True
            print(f"  ✓ Fixed: {include_path} (skip {fm_lines} lines → start at line {start_line})")
        else:
            print(f"  ℹ️  No frontmatter: {include_path}")
    
    if changes_made:
        file_path.write_text(content)
        return True
    
    return False

def main():
    """Fix all markdown files with snippet includes."""
    docs_dir = Path('docs')
    md_files = list(docs_dir.rglob('*.md'))
    
    print("Scanning for files with snippet includes...")
    print()
    
    fixed_count = 0
    for md_file in md_files:
        # Skip translation cache
        if '.translation_cache' in str(md_file):
            continue
        
        # Check if file has snippet includes
        content = md_file.read_text()
        if '--8<--' in content:
            print(f"Processing: {md_file}")
            if fix_snippet_includes(md_file):
                fixed_count += 1
            print()
    
    print(f"\n✅ Fixed {fixed_count} file(s)")
    print("\nNow run: mkdocs build")

if __name__ == '__main__':
    main()
