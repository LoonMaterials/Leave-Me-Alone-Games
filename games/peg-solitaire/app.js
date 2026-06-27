(function () {
  "use strict";
  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["green", "blue", "grey", "orange"]);
  const KEY = "leave-me-alone-peg-solitaire-current-game";
  const board = document.getElementById("game-board");
  const status = document.getElementById("status");
  const undoButton = document.getElementById("undo-button");
  const t = (key, values) => window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key;
  let state;
  let undoStack = [];
  let selected = null;

  function applyTheme() { try { const theme = localStorage.getItem(THEME_KEY); document.body.classList.remove("theme-blue", "theme-grey", "theme-orange"); if (THEMES.has(theme) && theme !== "green") document.body.classList.add(`theme-${theme}`); } catch {} }
  function fresh() { return { pegs: [1, 1, 1, 0, 1, 1, 1] }; }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch {} }
  function load() { try { return JSON.parse(sessionStorage.getItem(KEY)) || fresh(); } catch { return fresh(); } }
  function remember() { undoStack.push(clone(state)); if (undoStack.length > 40) undoStack.shift(); }
  function clickHole(index) {
    if (state.pegs[index]) {
      selected = index;
      render();
      return;
    }
    if (selected === null) return;
    const mid = (selected + index) / 2;
    if (Math.abs(selected - index) === 2 && state.pegs[mid]) {
      remember();
      state.pegs[selected] = 0;
      state.pegs[mid] = 0;
      state.pegs[index] = 1;
      selected = null;
      save();
      render();
    }
  }
  function render() {
    board.textContent = "";
    board.className = "board grid";
    board.style.gridTemplateColumns = "repeat(7, auto)";
    state.pegs.forEach((hasPeg, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `peg-cell ${selected === index ? "selected" : ""}`;
      button.setAttribute("aria-label", t("pegHole", { number: index + 1 }));
      button.addEventListener("click", () => clickHole(index));
      if (hasPeg) {
        const peg = document.createElement("span");
        peg.className = "peg";
        button.appendChild(peg);
      }
      board.appendChild(button);
    });
    status.textContent = t("pegPrompt");
    undoButton.disabled = undoStack.length === 0;
  }
  function check() { status.textContent = t(state.pegs.filter(Boolean).length === 1 ? "puzzleSolved" : "puzzleTryAgain"); }
  function newGame() { state = fresh(); undoStack = []; selected = null; save(); render(); }
  function undo() { if (!undoStack.length) return; state = undoStack.pop(); selected = null; save(); render(); }
  applyTheme();
  state = load();
  document.getElementById("check-button").addEventListener("click", check);
  document.getElementById("new-game-button").addEventListener("click", newGame);
  undoButton.addEventListener("click", undo);
  document.addEventListener("lmag:languagechange", render);
  render();
})();
