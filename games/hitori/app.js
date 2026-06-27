(function () {
  "use strict";
  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["green", "blue", "grey", "orange"]);
  const KEY = "leave-me-alone-hitori-current-game";
  const board = document.getElementById("game-board");
  const status = document.getElementById("status");
  const undoButton = document.getElementById("undo-button");
  const t = (key, values) => window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key;
  const numbers = [[1, 2, 2, 3], [3, 1, 4, 4], [2, 3, 1, 2], [4, 4, 3, 1]];
  const solution = [[0, 0, 1, 0], [0, 0, 0, 1], [1, 0, 0, 0], [0, 1, 0, 0]];
  let state;
  let undoStack = [];

  function applyTheme() { try { const theme = localStorage.getItem(THEME_KEY); document.body.classList.remove("theme-blue", "theme-grey", "theme-orange"); if (THEMES.has(theme) && theme !== "green") document.body.classList.add(`theme-${theme}`); } catch {} }
  function fresh() { return { shade: Array.from({ length: 4 }, () => Array(4).fill(0)) }; }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch {} }
  function load() { try { return JSON.parse(sessionStorage.getItem(KEY)) || fresh(); } catch { return fresh(); } }
  function remember() { undoStack.push(clone(state)); if (undoStack.length > 40) undoStack.shift(); }
  function render() {
    board.textContent = "";
    board.className = "board grid hitori-grid";
    numbers.forEach((row, r) => row.forEach((number, c) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `hitori-cell ${state.shade[r][c] ? "shaded" : ""}`;
      button.textContent = number;
      button.setAttribute("aria-label", t("puzzleCell", { row: r + 1, col: c + 1 }));
      button.addEventListener("click", () => {
        remember();
        state.shade[r][c] = state.shade[r][c] ? 0 : 1;
        save();
        render();
      });
      board.appendChild(button);
    }));
    status.textContent = t("hitoriPrompt");
    undoButton.disabled = undoStack.length === 0;
  }
  function check() {
    const solved = state.shade.flat().every((value, i) => value === solution[Math.floor(i / 4)][i % 4]);
    status.textContent = t(solved ? "puzzleSolved" : "puzzleTryAgain");
  }
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
