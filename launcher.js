(function () {
  "use strict";

  const THEME_KEY = "leave-me-alone-games-theme";
  const AUTO_FINISH_KEY = "leave-me-alone-games-auto-finish";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange"]);
  const themeSelect = document.getElementById("theme-select");
  const autoFinishToggle = document.getElementById("auto-finish-toggle");

  function storedTheme() {
    try {
      const theme = localStorage.getItem(THEME_KEY);
      return THEMES.has(theme) ? theme : "colorblind";
    } catch (error) {
      return "colorblind";
    }
  }

  function applyTheme(theme) {
    const nextTheme = THEMES.has(theme) ? theme : "colorblind";
    document.body.dataset.theme = nextTheme;
    themeSelect.value = nextTheme;
    try {
      localStorage.setItem(THEME_KEY, nextTheme);
    } catch (error) {
      // The selected background still applies to this page.
    }
  }

  function storedAutoFinish() {
    try {
      return localStorage.getItem(AUTO_FINISH_KEY) !== "false";
    } catch (error) {
      return true;
    }
  }

  function applyAutoFinish(enabled) {
    autoFinishToggle.checked = Boolean(enabled);
    try {
      localStorage.setItem(AUTO_FINISH_KEY, String(Boolean(enabled)));
    } catch (error) {
      // The selected setting still applies to this page.
    }
  }

  themeSelect.addEventListener("change", () => applyTheme(themeSelect.value));
  autoFinishToggle.addEventListener("change", () => applyAutoFinish(autoFinishToggle.checked));
  applyTheme(storedTheme());
  applyAutoFinish(storedAutoFinish());

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
})();
