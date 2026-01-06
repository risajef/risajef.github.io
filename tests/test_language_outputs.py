import os
import re
import socket
import subprocess
import time
import unittest
from typing import Iterable, Optional

from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE_URL = os.environ.get("MKDOCS_BASE_URL", "http://127.0.0.1:8000")
MKDOCS_CMD = os.environ.get("MKDOCS_CMD", os.path.join(".", ".venv", "bin", "mkdocs"))


def _assert_language(response_text: str, expected_lang: str) -> None:
    html_lang = re.search(r"<html[^>]*lang=\"([^\"]+)\"", response_text, flags=re.IGNORECASE)
    body_lang = re.search(r"<body[^>]*data-page-lang=\"([^\"]+)\"", response_text, flags=re.IGNORECASE)

    if not html_lang:
        raise AssertionError("Missing <html lang=…> attribute")
    if html_lang.group(1) != expected_lang:
        raise AssertionError(f"Expected html lang='{expected_lang}', got '{html_lang.group(1)}'")

    if not body_lang:
        raise AssertionError("Missing <body data-page-lang=…> attribute")
    if body_lang.group(1) != expected_lang:
        raise AssertionError(f"Expected body data-page-lang='{expected_lang}', got '{body_lang.group(1)}'")


def _assert_contains(text: str, snippets: Optional[Iterable[str]] = None) -> None:
    for snippet in snippets or []:
        if snippet not in text:
            raise AssertionError(f"Expected snippet not found: {snippet}")


def _assert_not_contains(text: str, snippets: Optional[Iterable[str]] = None) -> None:
    for snippet in snippets or []:
        if snippet in text:
            raise AssertionError(f"Unexpected snippet present: {snippet}")


def _fetch(url: str) -> str:
    """Fetch URL using headless browser to execute JavaScript redirects."""
    chrome_options = ChromeOptions()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    
    driver = webdriver.Chrome(options=chrome_options)
    try:
        driver.get(url)
        # Clear localStorage to avoid interference between tests
        driver.execute_script("localStorage.clear(); sessionStorage.clear();")
        # Reload after clearing storage
        driver.get(url)
        # Wait for navigation or max 3 seconds
        time.sleep(0.5)  # Give JS time to execute redirect
        return driver.page_source
    finally:
        driver.quit()


def _wait_for_port(host: str, port: int, timeout: float = 10.0) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(0.5)
            try:
                sock.connect((host, port))
                return
            except OSError:
                time.sleep(0.2)
    raise RuntimeError(f"Timed out waiting for {host}:{port}")


class TestLanguageOutputs(unittest.TestCase):
    server_process: Optional[subprocess.Popen] = None

    @classmethod
    def setUpClass(cls):
        # Start mkdocs serve in the background for HTTP checks
        cls.server_process = subprocess.Popen(
            [MKDOCS_CMD, "serve", "-a", "127.0.0.1:8000", "--no-livereload"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        _wait_for_port("127.0.0.1", 8000, timeout=15)

    @classmethod
    def tearDownClass(cls):
        if cls.server_process:
            cls.server_process.terminate()
            try:
                cls.server_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                cls.server_process.kill()

    def test_nichts_zu_verbergen_en(self):
        url = f"{BASE_URL}/blog/thoughts/nichts-zu-verbergen/index.en.html"
        text = _fetch(url)
        _assert_language(text, "en")
        _assert_contains(text, ["You have nothing to hide"])

    def test_nichts_zu_verbergen_en_query(self):
        url = f"{BASE_URL}/blog/thoughts/nichts-zu-verbergen/?lang=en"
        text = _fetch(url)
        _assert_language(text, "en")
        _assert_contains(text, ["You have nothing to hide"])

    def test_nichts_zu_verbergen_de(self):
        url = f"{BASE_URL}/blog/thoughts/nichts-zu-verbergen/index.de.html"
        text = _fetch(url)
        _assert_language(text, "de")
        _assert_contains(text, ["Du hast doch nichts zu verstecken"])

    def test_nichts_zu_verbergen_de_query(self):
        url = f"{BASE_URL}/blog/thoughts/nichts-zu-verbergen/?lang=de"
        text = _fetch(url)
        _assert_language(text, "de")
        _assert_contains(text, ["Du hast doch nichts zu verstecken"])

    def test_meaning_is_perceivable_en(self):
        url = f"{BASE_URL}/blog/thoughts/meaning-is-perceivable/index.en.html"
        text = _fetch(url)
        _assert_language(text, "en")
        _assert_contains(text, ["Meaning is Perceivable"])

    def test_meaning_is_perceivable_en_query(self):
        url = f"{BASE_URL}/blog/thoughts/meaning-is-perceivable/?lang=en"
        text = _fetch(url)
        _assert_language(text, "en")
        _assert_contains(text, ["Meaning is Perceivable"])

    def test_meaning_is_perceivable_de(self):
        url = f"{BASE_URL}/blog/thoughts/meaning-is-perceivable/index.de.html"
        text = _fetch(url)
        _assert_language(text, "de")
        _assert_contains(text, ["Die vielleicht", "Bedeutung des Lebens"])

    def test_meaning_is_perceivable_de_query(self):
        url = f"{BASE_URL}/blog/thoughts/meaning-is-perceivable/?lang=de"
        text = _fetch(url)
        _assert_language(text, "de")
        _assert_contains(text, ["Die vielleicht", "Bedeutung des Lebens"])


if __name__ == "__main__":
    unittest.main()
