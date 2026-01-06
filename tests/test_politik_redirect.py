"""Test that /politik/ redirects to /de/politik/"""
import os
import unittest

BASE_URL = os.environ.get("MKDOCS_BASE_URL", "http://127.0.0.1:8000")


class TestPolitikRedirect(unittest.TestCase):
    """Tests for politik redirect - requires mkdocs serve to be running"""

    def test_politik_redirect_file_exists(self):
        """Test that site/politik/index.html redirect file was created"""
        redirect_file = os.path.join("site", "politik", "index.html")
        self.assertTrue(os.path.exists(redirect_file),
                        f"Redirect file {redirect_file} should exist")
        
        # Read and verify redirect content
        with open(redirect_file, 'r') as f:
            content = f.read()
        
        self.assertIn('/de/politik/', content,
                      "Redirect file should contain /de/politik/ URL")
        self.assertIn('window.location.replace', content,
                      "Redirect file should have JavaScript redirect")

    def test_de_politik_exists(self):
        """Test that site/de/politik/index.html exists"""
        de_politik = os.path.join("site", "de", "politik", "index.html")
        self.assertTrue(os.path.exists(de_politik),
                        f"German politik page {de_politik} should exist")
        
        # Verify it contains German content
        with open(de_politik, 'r') as f:
            content = f.read()
        
        self.assertIn('Einwohnerrat', content,
                      "German page should contain 'Einwohnerrat'")
        self.assertIn('lang="de"', content,
                      "German page should have lang='de' attribute")

    def test_en_politik_exists(self):
        """Test that site/en/politik/index.html (auto-translated) exists"""
        en_politik = os.path.join("site", "en", "politik", "index.html")
        self.assertTrue(os.path.exists(en_politik),
                        f"English politik page {en_politik} should exist")
        
        # Verify it contains English language attribute
        with open(en_politik, 'r') as f:
            content = f.read()
        
        self.assertIn('lang="en"', content,
                      "English page should have lang='en' attribute")


if __name__ == "__main__":
    unittest.main()
