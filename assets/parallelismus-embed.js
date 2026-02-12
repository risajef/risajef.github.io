(function () {
    const CONTAINER_ID = "parallelismus-root";
    const scriptEl = document.currentScript;
    const scriptBase = scriptEl ? new URL(scriptEl.src, window.location.href) : new URL(window.location.href);
    const assetsBase = new URL("./", scriptBase).href;
    const parallelismusBase = new URL("parallelismus/dist/", assetsBase).href;
    const htmlUrl = new URL("index.html", parallelismusBase).href;
    const mainJsUrl = new URL("index.js", parallelismusBase).href;
    const stylesUrl = new URL("styles.css", parallelismusBase).href;

    function updateContainer(state, message) {
        const container = document.getElementById(CONTAINER_ID);
        if (container) {
            container.setAttribute("data-state", state);
            container.innerHTML = `<p>${message}</p>`;
        }
    }

    function stripEmbeddedScripts(root) {
        root.querySelectorAll("script").forEach((script) => {
            script.remove();
        });
    }

    function fixRelativeLinks(root, baseUrl) {
        // Fix all relative links and make them absolute
        root.querySelectorAll("a[href]").forEach((link) => {
            const href = link.getAttribute("href");
            if (href && !href.startsWith("http://") && !href.startsWith("https://") && !href.startsWith("#")) {
                link.setAttribute("href", new URL(href, baseUrl).href);
            }
        });
    }

    function loadScript(src, type = null) {
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            if (type) {
                script.type = type;
            } else {
                script.defer = true;
            }
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load script ${src}`));
            document.body.appendChild(script);
        });
    }

    function loadStylesheet(href) {
        return new Promise((resolve, reject) => {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = href;
            link.onload = resolve;
            link.onerror = () => reject(new Error(`Failed to load stylesheet ${href}`));
            document.head.appendChild(link);
        });
    }

    async function injectParallelismus() {
        const container = document.getElementById(CONTAINER_ID);
        if (!container) {
            return;
        }

        updateContainer("loading", "Loading Parallelismus...");

        try {
            const response = await fetch(htmlUrl, { cache: "no-cache" });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");
            stripEmbeddedScripts(doc.body);
            fixRelativeLinks(doc.body, parallelismusBase);
            container.removeAttribute("data-state");
            container.innerHTML = doc.body.innerHTML;
            
            // Add import map to resolve relative module imports
            const importMap = document.createElement("script");
            importMap.type = "importmap";
            importMap.textContent = JSON.stringify({
                imports: {
                    "./app.js": new URL("app.js", parallelismusBase).href,
                    "./dom-utils.js": new URL("dom-utils.js", parallelismusBase).href,
                    "./tooltip.js": new URL("tooltip.js", parallelismusBase).href,
                    "./keyboard.js": new URL("keyboard.js", parallelismusBase).href
                }
            });
            document.head.appendChild(importMap);
            
            await Promise.all([
                loadStylesheet(stylesUrl),
                loadScript(mainJsUrl, "module"),
            ]);
        } catch (error) {
            console.error("Unable to load Parallelismus", error);
            updateContainer("error", "Could not load Parallelismus. Reload the page or try again later.");
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", injectParallelismus);
    } else {
        injectParallelismus();
    }
})();
