/**
 * Language Switcher and Auto-Translation Handler
 * 
 * This script handles:
 * - Language detection from URL parameters or browser settings
 * - Language switching UI
 * - Dynamic content loading for different languages
 * - Auto-translation indicator
 */

(function() {
    'use strict';
    
    const STORAGE_KEY = 'preferred_language';
    const LANGUAGES = {
        'en': 'English',
        'de': 'Deutsch'
    };
    
    /**
     * Get current language from URL, localStorage, or browser
     */
    function getCurrentLanguage() {
        // Check URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const urlLang = urlParams.get('lang');
        if (urlLang && LANGUAGES[urlLang]) {
            return urlLang;
        }
        
        // Check page language from attributes (for direct .de.html/.en.html access)
        const pageLang = getPageLanguageFromAttributes();
        if (pageLang && LANGUAGES[pageLang]) {
            return pageLang;
        }
        
        // Check localStorage
        const storedLang = localStorage.getItem(STORAGE_KEY);
        if (storedLang && LANGUAGES[storedLang]) {
            return storedLang;
        }
        
        // Check browser language
        const browserLang = navigator.language.split('-')[0];
        if (LANGUAGES[browserLang]) {
            return browserLang;
        }
        
        // Default to English
        return 'en';
    }
    
    /**
     * Get page language from HTML attributes or URL path
     */
    function getPageLanguageFromAttributes() {
        // First try URL path: /de/blog/ or /en/blog/
        const pathMatch = window.location.pathname.match(/^\/([a-z]{2})\//);
        if (pathMatch && LANGUAGES[pathMatch[1]]) {
            return pathMatch[1];
        }
        
        // Fallback to HTML attributes
        return (
            document.documentElement.getAttribute('data-page-lang') ||
            (document.body && document.body.getAttribute('data-page-lang')) ||
            null
        );
    }
    
    /**
     * Redirect to the correct language version if ?lang= is specified
     */
    function redirectToLanguageVersion() {
        const urlParams = new URLSearchParams(window.location.search);
        const requestedLang = urlParams.get('lang');
        
        if (!requestedLang || !LANGUAGES[requestedLang]) {
            return; // No redirect needed
        }
        
        // Get the current page language from URL path
        const currentPath = window.location.pathname;
        const pathLangMatch = currentPath.match(/^\/([a-z]{2})\//);
        const pathLang = pathLangMatch ? pathLangMatch[1] : null;
        
        if (pathLang === requestedLang) {
            // Already on the correct language, just remove the query parameter
            const url = new URL(window.location.href);
            url.searchParams.delete('lang');
            window.history.replaceState({}, '', url.toString());
            return;
        }
        
        // Build the target URL by replacing the language prefix
        let targetPath;
        
        if (pathLang && LANGUAGES[pathLang]) {
            // Replace existing language prefix: /de/blog/ -> /en/blog/
            targetPath = currentPath.replace(/^\/[a-z]{2}\//, `/${requestedLang}/`);
        } else {
            // No language prefix yet, add one: /blog/ -> /en/blog/
            targetPath = `/${requestedLang}${currentPath}`;
        }
        
        // Perform the redirect without query parameters
        window.location.replace(targetPath);
    }
    
    /**
     * Switch to a different language
     */
    function switchLanguage(lang) {
        if (!LANGUAGES[lang]) {
            console.error('Unsupported language:', lang);
            return;
        }
        
        // Store preference
        localStorage.setItem(STORAGE_KEY, lang);
        
        // Redirect to the language-prefixed URL
        const currentPath = window.location.pathname;
        const pathLangMatch = currentPath.match(/^\/([a-z]{2})\//);
        let targetPath;
        
        if (pathLangMatch) {
            // Replace existing language prefix
            targetPath = currentPath.replace(/^\/[a-z]{2}\//, `/${lang}/`);
        } else {
            // Add language prefix
            targetPath = `/${lang}${currentPath}`;
        }
        
        window.location.href = targetPath;
    }
    
    /**
     * Create language switcher UI
     */
    function createLanguageSwitcher() {
        const currentLang = getCurrentLanguage();
        
        // Create container
        const container = document.createElement('div');
        container.className = 'language-switcher';
        
        // Create dropdown
        const select = document.createElement('select');
        select.className = 'language-select';
        select.setAttribute('aria-label', 'Select language');
        
        // Add options
        Object.entries(LANGUAGES).forEach(([code, name]) => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = name;
            option.selected = code === currentLang;
            select.appendChild(option);
        });
        
        // Handle language change
        select.addEventListener('change', (e) => {
            switchLanguage(e.target.value);
        });
        
        container.appendChild(select);
        
        // Add to header
        const header = document.querySelector('.site-header');
        if (header) {
            header.appendChild(container);
        }
    }
    
    /**
     * Show auto-translation banner if content is auto-translated
     */
    function getPageLanguage() {
        return getPageLanguageFromAttributes() || document.documentElement.getAttribute('lang') || 'en';
    }

    function showAutoTranslationBanner() {
        const currentLang = getCurrentLanguage();
        const pageLang = getPageLanguage();
        
        // Show banner if viewing page in different language than it was written
        const needsTranslation = pageLang !== currentLang;
        
        if (!needsTranslation) {
            return;
        }
        
        // Don't show if already dismissed in this session
        if (sessionStorage.getItem('translation-banner-dismissed') === 'true') {
            return;
        }
        
        const banner = document.createElement('div');
        banner.className = 'auto-translation-banner';
        banner.innerHTML = `
            <div class="auto-translation-content">
                <svg class="auto-translation-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 8h6m-6 4h6m-6 4h6m3-10l2.5 6M17 16l2.5-6"/>
                    <circle cx="18" cy="18" r="3"/>
                </svg>
                <span class="auto-translation-text">
                    ${currentLang === 'de' 
                        ? 'Diese Seite ist auf ' + (pageLang === 'en' ? 'Englisch' : pageLang) + ' verfasst. Eine Übersetzung ist möglicherweise verfügbar, aber Sie sehen die Originalversion.' 
                        : 'This page is written in ' + (pageLang === 'de' ? 'German' : pageLang) + '. Translation may be available, but you are viewing the original version.'}
                </span>
                <button class="auto-translation-close" aria-label="Close banner">&times;</button>
            </div>
        `;
        
        // Add close functionality
        banner.querySelector('.auto-translation-close').addEventListener('click', () => {
            banner.remove();
            sessionStorage.setItem('translation-banner-dismissed', 'true');
        });
        
        // Insert at the top of content
        const content = document.querySelector('.content');
        if (content) {
            content.insertBefore(banner, content.firstChild);
        }
    }
    
    /**
     * Update page language attribute
     */
    function updatePageLanguage() {
        const pageLang = getPageLanguageFromAttributes();
        const currentLang = getCurrentLanguage();
        
        // Only update HTML lang attribute, not body data-page-lang
        // The body data-page-lang should be set correctly by the server/build
        document.documentElement.lang = currentLang;
        document.querySelector('meta[http-equiv="content-language"]')?.setAttribute('content', currentLang);
    }
    
    /**
     * Handle language-specific content visibility
     */
    function handleLanguageSpecificContent() {
        const currentLang = getCurrentLanguage();
        
        // Find all elements with language-specific classes
        document.querySelectorAll('[data-lang]').forEach(element => {
            const elementLang = element.dataset.lang;
            if (elementLang !== currentLang) {
                element.style.display = 'none';
            } else {
                element.style.display = '';
            }
        });
    }
    
    /**
     * Initialize language system
     */
    function init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }
        
        // Redirect to correct language version if ?lang= parameter is present
        redirectToLanguageVersion();
        
        // Update page language
        updatePageLanguage();
        
        // Create language switcher
        createLanguageSwitcher();
        
        // Handle language-specific content
        handleLanguageSpecificContent();
        
        // Show auto-translation banner if needed
        showAutoTranslationBanner();
    }
    
    // Start initialization
    init();
    
    // Expose API for external use
    window.LanguageSwitcher = {
        getCurrentLanguage,
        switchLanguage,
        LANGUAGES
    };
})();
