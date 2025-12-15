(function () {
  const CONTAINER_ID = "buchfaltstudio-root";
  const scriptEl = document.currentScript;
  const scriptBase = scriptEl ? new URL(scriptEl.src, window.location.href) : new URL(window.location.href);
  const assetsBase = new URL("./", scriptBase).href;
  const buchfaltenBase = new URL("buchfalten/", assetsBase).href;
  const htmlUrl = new URL("index.html", buchfaltenBase).href;
  const mainJsUrl = new URL("app.js", buchfaltenBase).href;

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

  async function injectBuchfaltstudio() {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) {
      return;
    }

    updateContainer("loading", "Lade Buchfaltstudio...");

    try {
      const response = await fetch(htmlUrl, { cache: "no-cache" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      stripEmbeddedScripts(doc.body);
      container.removeAttribute("data-state");
      container.innerHTML = doc.body.innerHTML;
      await loadScript(mainJsUrl, "module");
    } catch (error) {
      console.error("Unable to load Buchfaltstudio", error);
      updateContainer("error", "Konnte Buchfaltstudio nicht laden. Lade die Seite neu oder versuche es später erneut.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectBuchfaltstudio);
  } else {
    injectBuchfaltstudio();
  }
})();
