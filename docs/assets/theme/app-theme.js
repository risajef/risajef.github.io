(() => {
  const storageKey = "retoweber-theme";
  const root = document.documentElement;
  const systemPreference = window.matchMedia("(prefers-color-scheme: dark)");
  let savedTheme = null;

  const isTheme = (value) => value === "dark" || value === "light";
  const systemTheme = () => (systemPreference.matches ? "dark" : "light");
  const applyTheme = (theme) => {
    root.dataset.siteTheme = theme;
    root.style.colorScheme = theme;
  };

  try {
    const storedTheme = window.localStorage.getItem(storageKey);
    if (isTheme(storedTheme)) {
      savedTheme = storedTheme;
    }
  } catch (error) {
    console.error("Unable to read the saved site theme for this tool.", error);
  }

  applyTheme(savedTheme ?? systemTheme());

  systemPreference.addEventListener("change", (event) => {
    if (savedTheme === null) {
      applyTheme(event.matches ? "dark" : "light");
    }
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== storageKey && event.key !== null) {
      return;
    }
    savedTheme = isTheme(event.newValue) ? event.newValue : null;
    applyTheme(savedTheme ?? systemTheme());
  });
})();
