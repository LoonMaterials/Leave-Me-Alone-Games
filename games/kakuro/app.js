(function () {
  "use strict";
  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange"]);
  const KEY = "leave-me-alone-kakuro-current-game";
  const board = document.getElementById("game-board");
  const status = document.getElementById("status");
  const undoButton = document.getElementById("undo-button");
  const t = (key, values) => window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key;
  let undoStack = [];
  let state;

  function applyTheme() { try { const theme = localStorage.getItem(THEME_KEY); const selectedTheme = THEMES.has(theme) ? theme : "colorblind"; document.body.classList.remove("theme-colorblind", "theme-blue", "theme-grey", "theme-orange"); if (selectedTheme !== "green") document.body.classList.add(`theme-${selectedTheme}`); } catch {} }
  function fresh() { return { values: { a: "", b: "", c: "", d: "" }, solution: { a: 1, b: 3, c: 3, d: 1 } }; }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch {} }
  function load() { try { return JSON.parse(sessionStorage.getItem(KEY)) || fresh(); } catch { return fresh(); } }
  function remember() { undoStack.push(clone(state)); if (undoStack.length > 40) undoStack.shift(); }
  function render() {
    board.textContent = "";
    board.className = "board grid";
    board.style.gridTemplateColumns = "repeat(3, auto)";
    [["x", "c4", "c4"], ["r4", "a", "b"], ["r4", "c", "d"]].flat().forEach((item) => {
      if (item === "x" || item.startsWith("c") || item.startsWith("r")) {
        const clue = document.createElement("div");
        clue.className = "number-cell clue";
        clue.textContent = item === "x" ? "" : item === "c4" ? "↓4" : "→4";
        board.appendChild(clue);
        return;
      }
      const cell = document.createElement("div");
      cell.className = "number-cell";
      const input = document.createElement("input");
      input.inputMode = "numeric";
      input.maxLength = 1;
      input.value = state.values[item];
      input.setAttribute("aria-label", t("kakuroCell", { cell: item.toUpperCase() }));
      input.addEventListener("input", () => {
        remember();
        state.values[item] = input.value.replace(/[^1-4]/g, "").slice(0, 1);
        input.value = state.values[item];
        save();
        undoButton.disabled = false;
      });
      cell.appendChild(input);
      board.appendChild(cell);
    });
    const hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent = t("kakuroPrompt");
    board.appendChild(hint);
    status.textContent = t("kakuroPrompt");
    undoButton.disabled = undoStack.length === 0;
  }
  function check() {
    const solved = Object.keys(state.solution).every((key) => Number(state.values[key]) === state.solution[key]);
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
