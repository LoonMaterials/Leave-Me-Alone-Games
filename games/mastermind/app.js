(function () {
  "use strict";
  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange"]);
  const KEY = "leave-me-alone-mastermind-current-game";
  const colors = ["red", "blue", "green", "yellow", "purple"];
  const board = document.getElementById("game-board");
  const status = document.getElementById("status");
  const undoButton = document.getElementById("undo-button");
  const t = (key, values) => window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key;
  let state;
  let undoStack = [];

  function applyTheme() { try { const theme = localStorage.getItem(THEME_KEY); const selectedTheme = THEMES.has(theme) ? theme : "colorblind"; document.body.classList.remove("theme-colorblind", "theme-blue", "theme-grey", "theme-orange"); if (selectedTheme !== "green") document.body.classList.add(`theme-${selectedTheme}`); } catch {} }
  function fresh() { return { code: ["red", "blue", "green", "yellow"], guess: ["", "", "", ""], history: [] }; }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch {} }
  function load() { try { return JSON.parse(sessionStorage.getItem(KEY)) || fresh(); } catch { return fresh(); } }
  function remember() { undoStack.push(clone(state)); if (undoStack.length > 40) undoStack.shift(); }
  function dot(className, label, action) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.setAttribute("aria-label", label);
    button.addEventListener("click", action);
    return button;
  }
  function render() {
    board.textContent = "";
    board.className = "board mastermind";
    state.history.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "mm-row";
      entry.guess.forEach((color) => row.appendChild(dot(`mm-slot ${color || "blank"}`, color || "blank", () => {})));
      const feedback = document.createElement("span");
      feedback.className = "mm-feedback";
      feedback.textContent = t("mastermindFeedback", entry);
      row.appendChild(feedback);
      board.appendChild(row);
    });
    const guessRow = document.createElement("div");
    guessRow.className = "mm-row";
    state.guess.forEach((color, index) => {
      guessRow.appendChild(dot(`mm-slot ${color || "blank"}`, t("mastermindSlot", { number: index + 1 }), () => {
        remember();
        state.guess[index] = "";
        save();
        render();
      }));
    });
    board.appendChild(guessRow);
    const choices = document.createElement("div");
    choices.className = "mm-choices";
    colors.forEach((color) => choices.appendChild(dot(`mm-choice ${color}`, color, () => {
      const open = state.guess.findIndex((item) => !item);
      if (open === -1) return;
      remember();
      state.guess[open] = color;
      save();
      render();
    })));
    board.appendChild(choices);
    status.textContent = t("mastermindPrompt");
    undoButton.disabled = undoStack.length === 0;
  }
  function check() {
    if (state.guess.some((color) => !color)) { status.textContent = t("puzzleTryAgain"); return; }
    const exact = state.guess.filter((color, i) => color === state.code[i]).length;
    const pool = state.code.slice();
    let near = 0;
    state.guess.forEach((color, i) => { if (color === state.code[i]) pool[i] = null; });
    state.guess.forEach((color, i) => {
      if (color === state.code[i]) return;
      const found = pool.indexOf(color);
      if (found >= 0) { near += 1; pool[found] = null; }
    });
    remember();
    state.history.push({ guess: state.guess.slice(), exact, near });
    state.guess = ["", "", "", ""];
    save();
    render();
    status.textContent = t(exact === 4 ? "puzzleSolved" : "puzzleTryAgain");
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
