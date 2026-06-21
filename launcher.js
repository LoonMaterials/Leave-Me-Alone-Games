(function () {
  "use strict";

  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["green", "blue", "grey", "orange"]);
  const themeSelect = document.getElementById("theme-select");

  function storedTheme() {
    try {
      const theme = localStorage.getItem(THEME_KEY);
      return THEMES.has(theme) ? theme : "green";
    } catch (error) {
      return "green";
    }
  }

  function applyTheme(theme) {
    const nextTheme = THEMES.has(theme) ? theme : "green";
    document.body.dataset.theme = nextTheme;
    themeSelect.value = nextTheme;
    try {
      localStorage.setItem(THEME_KEY, nextTheme);
    } catch (error) {
      // The selected background still applies to this page.
    }
  }

  themeSelect.addEventListener("change", () => applyTheme(themeSelect.value));
  applyTheme(storedTheme());

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
})();
