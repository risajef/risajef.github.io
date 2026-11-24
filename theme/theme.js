(() => {
    const storageKey = "retoweber-theme";
    const root = document.documentElement;
    const systemPreference = window.matchMedia("(prefers-color-scheme: dark)");
    const isTheme = (value) => value === "light" || value === "dark";
    let savedTheme = null;

    try {
        const storedTheme = window.localStorage.getItem(storageKey);
        if (isTheme(storedTheme)) savedTheme = storedTheme;
    } catch (error) {
        console.error("Could not read the saved color theme.", error);
    }

    function updateToggle(theme) {
        const toggle = document.getElementById("theme-toggle");
        if (!toggle) return;

        const isDark = theme === "dark";
        toggle.setAttribute("aria-pressed", String(isDark));
        toggle.title = isDark ? toggle.dataset.enableLight : toggle.dataset.enableDark;
    }

    function applyTheme(theme) {
        root.dataset.theme = theme;

        const themeColor = document.querySelector('meta[name="theme-color"]');
        if (themeColor) themeColor.content = theme === "dark" ? "#171717" : "#FFFFFF";

        const darkBadgeSource = document.getElementById("simple-analytics-badge-dark");
        if (darkBadgeSource) darkBadgeSource.media = theme === "dark" ? "all" : "not all";

        updateToggle(theme);
    }

    applyTheme(savedTheme ?? (systemPreference.matches ? "dark" : "light"));

    systemPreference.addEventListener("change", (event) => {
        if (savedTheme === null) applyTheme(event.matches ? "dark" : "light");
    });

    window.addEventListener("storage", (event) => {
        if (event.key !== storageKey && event.key !== null) return;
        savedTheme = isTheme(event.newValue) ? event.newValue : null;
        applyTheme(savedTheme ?? (systemPreference.matches ? "dark" : "light"));
    });

    document.addEventListener("DOMContentLoaded", () => {
        applyTheme(root.dataset.theme);

        const toggle = document.getElementById("theme-toggle");
        if (!toggle) return;

        toggle.addEventListener("click", () => {
            savedTheme = root.dataset.theme === "dark" ? "light" : "dark";
            applyTheme(savedTheme);

            try {
                window.localStorage.setItem(storageKey, savedTheme);
            } catch (error) {
                console.error("Could not save the color theme preference.", error);
            }
        });
    }, { once: true });
})();
