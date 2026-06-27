(function () {
  "use strict";
  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["green", "blue", "grey", "orange"]);
  const KEY = "leave-me-alone-nonograms-current-game";
  const board = document.getElementById("game-board");
  const status = document.getElementById("status");
  const undoButton = document.getElementById("undo-button");
  const t = (key, values) => window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key;
  const solution = [[0, 1, 1, 1, 0], [1, 0, 1, 0, 1], [1, 1, 1, 1, 1], [0, 0, 1, 0, 0], [0, 1, 1, 1, 0]];
  let state;
  let undoStack = [];

  function applyTheme() { try { const theme = localStorage.getItem(THEME_KEY); document.body.classList.remove("theme-blue", "theme-grey", "theme-orange"); if (THEMES.has(theme) && theme !== "green") document.body.classList.add(`theme-${theme}`); } catch {} }
  function fresh() { return { marks: Array.from({ length: 5 }, () => Array(5).fill(0)) }; }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch {} }
  function load() { try { return JSON.parse(sessionStorage.getItem(KEY)) || fresh(); } catch { return fresh(); } }
  function remember() { undoStack.push(clone(state)); if (undoStack.length > 40) undoStack.shift(); }
  function clues(line) {
    const runs = [];
    let run = 0;
    line.forEach((cell) => {
      if (cell) run += 1;
      else if (run) { runs.push(run); run = 0; }
    });
    if (run) runs.push(run);
    return runs.length ? runs.join(" ") : "0";
  }
  function label(text) {
    const el = document.createElement("div");
    el.className = "clue-label";
    el.textContent = text;
    return el;
  }
  function render() {
    board.textContent = "";
    board.className = "board";
    const wrap = document.createElement("div");
    wrap.className = "nonogram-wrap";
    const top = document.createElement("div");
    top.className = "top-clues";
    for (let c = 0; c < 5; c += 1) top.appendChild(label(clues(solution.map((row) => row[c]))));
    const side = document.createElement("div");
    side.className = "side-clues";
    solution.forEach((row) => side.appendChild(label(clues(row))));
    const grid = document.createElement("div");
    grid.className = "nonogram-grid";
    state.marks.forEach((row, r) => row.forEach((mark, c) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `nonogram-cell ${mark ? "filled" : ""}`;
      button.setAttribute("aria-label", t("puzzleCell", { row: r + 1, col: c + 1 }));
      button.addEventListener("click", () => {
        remember();
        state.marks[r][c] = state.marks[r][c] ? 0 : 1;
        save();
        render();
      });
      grid.appendChild(button);
    }));
    wrap.appendChild(top);
    wrap.appendChild(side);
    wrap.appendChild(grid);
    board.appendChild(wrap);
    status.textContent = t("nonogramsPrompt");
    undoButton.disabled = undoStack.length === 0;
  }
  function check() {
    const solved = state.marks.flat().every((value, i) => value === solution[Math.floor(i / 5)][i % 5]);
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
