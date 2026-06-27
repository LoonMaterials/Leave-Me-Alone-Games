(function () {
  "use strict";
  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["green", "blue", "grey", "orange"]);
  const KEY = "leave-me-alone-sudoku-current-game";
  const board = document.getElementById("game-board");
  const status = document.getElementById("status");
  const undoButton = document.getElementById("undo-button");
  const t = (key, values) => window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key;
  let undoStack = [];
  let state;

  function applyTheme() {
    try {
      const theme = localStorage.getItem(THEME_KEY);
      document.body.classList.remove("theme-blue", "theme-grey", "theme-orange");
      if (THEMES.has(theme) && theme !== "green") document.body.classList.add(`theme-${theme}`);
    } catch {}
  }
  function fresh() {
    return {
      values: [[1, 0, 0, 4], [0, 4, 1, 0], [0, 1, 4, 0], [4, 0, 0, 1]],
      fixed: [[1, 0, 0, 1], [0, 1, 1, 0], [0, 1, 1, 0], [1, 0, 0, 1]],
      solution: [[1, 2, 3, 4], [3, 4, 1, 2], [2, 1, 4, 3], [4, 3, 2, 1]]
    };
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch {} }
  function load() { try { return JSON.parse(sessionStorage.getItem(KEY)) || fresh(); } catch { return fresh(); } }
  function remember() { undoStack.push(clone(state)); if (undoStack.length > 40) undoStack.shift(); }
  function render() {
    board.textContent = "";
    board.className = "board grid";
    board.style.gridTemplateColumns = "repeat(4, auto)";
    state.values.forEach((row, r) => row.forEach((value, c) => {
      const fixed = Boolean(state.fixed[r][c]);
      const cell = document.createElement("div");
      cell.className = `number-cell ${fixed ? "fixed" : ""}`;
      if (fixed) {
        cell.textContent = value;
      } else {
        const input = document.createElement("input");
        input.inputMode = "numeric";
        input.maxLength = 1;
        input.value = value || "";
        input.setAttribute("aria-label", t("puzzleCell", { row: r + 1, col: c + 1 }));
        input.addEventListener("input", () => {
          remember();
          const next = Number(input.value.replace(/[^1-4]/g, "").slice(0, 1)) || 0;
          state.values[r][c] = next;
          input.value = next || "";
          save();
          undoButton.disabled = false;
        });
        cell.appendChild(input);
      }
      board.appendChild(cell);
    }));
    status.textContent = t("sudokuPrompt");
    undoButton.disabled = undoStack.length === 0;
  }
  function check() {
    const solved = state.values.flat().every((value, i) => value === state.solution[Math.floor(i / 4)][i % 4]);
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
