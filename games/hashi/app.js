(function () {
  "use strict";
  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["green", "blue", "grey", "orange"]);
  const KEY = "leave-me-alone-hashi-current-game";
  const board = document.getElementById("game-board");
  const status = document.getElementById("status");
  const undoButton = document.getElementById("undo-button");
  const t = (key, values) => window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key;
  const islands = [{ r: 1, c: 1, need: 2 }, { r: 1, c: 3, need: 2 }, { r: 3, c: 1, need: 2 }, { r: 3, c: 3, need: 2 }];
  const between = { "1,2": "0-1", "2,1": "0-2", "2,3": "1-3", "3,2": "2-3" };
  let state;
  let undoStack = [];

  function applyTheme() { try { const theme = localStorage.getItem(THEME_KEY); document.body.classList.remove("theme-blue", "theme-grey", "theme-orange"); if (THEMES.has(theme) && theme !== "green") document.body.classList.add(`theme-${theme}`); } catch {} }
  function fresh() { return { bridges: { "0-1": 0, "1-3": 0, "0-2": 0, "2-3": 0 } }; }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch {} }
  function load() { try { return JSON.parse(sessionStorage.getItem(KEY)) || fresh(); } catch { return fresh(); } }
  function remember() { undoStack.push(clone(state)); if (undoStack.length > 40) undoStack.shift(); }
  function render() {
    board.textContent = "";
    board.className = "board grid hashi-grid";
    for (let r = 0; r < 5; r += 1) {
      for (let c = 0; c < 5; c += 1) {
        const island = islands.find((item) => item.r === r && item.c === c);
        const key = between[`${r},${c}`];
        const bridge = key ? state.bridges[key] : 0;
        const button = document.createElement("button");
        button.type = "button";
        button.className = `hashi-cell ${bridge ? (r % 2 ? "bridge-h" : "bridge-v") : ""}`;
        button.setAttribute("aria-label", t("puzzleCell", { row: r + 1, col: c + 1 }));
        button.addEventListener("click", () => {
          if (!key) return;
          remember();
          state.bridges[key] = state.bridges[key] ? 0 : 1;
          save();
          render();
        });
        if (island) {
          const dot = document.createElement("span");
          dot.className = "island";
          dot.textContent = island.need;
          button.appendChild(dot);
        }
        board.appendChild(button);
      }
    }
    status.textContent = t("hashiPrompt");
    undoButton.disabled = undoStack.length === 0;
  }
  function check() { status.textContent = t(Object.values(state.bridges).every(Boolean) ? "puzzleSolved" : "puzzleTryAgain"); }
  function newGame() { state = fresh(); undoStack = []; save(); render(); }
  function undo() { if (!undoStack.length) return; state = undoStack.pop(); save(); render(); }
  applyTheme();
  state = load();
  document.getElementById("check-button").addEventListener("click", check);
  document.getElementById("new-game-button").addEventListener("click", newGame);
  undoButton.addEventListener("click", undo);
  document.addEventListener("lmag:languagechange", render);
  render();
})();
