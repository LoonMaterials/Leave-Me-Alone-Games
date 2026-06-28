(function () {
  "use strict";
  const STORAGE_KEY = "leave-me-alone-connect4-current-game";
  const DIFFICULTY_KEY = "leave-me-alone-connect4-difficulty";
  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["green", "blue", "grey", "orange"]);
  const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
  const ROWS = 6, COLS = 7;
  const els = { board: document.getElementById("board"), status: document.getElementById("status"), undo: document.getElementById("undo"), newGame: document.getElementById("new-game"), difficulty: document.getElementById("difficulty") };
  let state = null, undoSnapshot = null, lastTapAt = 0;
  function t(key, values) { return window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key; }
  function storedDifficulty() { try { const difficulty = localStorage.getItem(DIFFICULTY_KEY); return DIFFICULTIES.has(difficulty) ? difficulty : "easy"; } catch { return "easy"; } }
  function applyDifficulty() { if (els.difficulty) els.difficulty.value = storedDifficulty(); }
  function saveDifficulty() { if (!els.difficulty) return; try { localStorage.setItem(DIFFICULTY_KEY, DIFFICULTIES.has(els.difficulty.value) ? els.difficulty.value : "easy"); } catch {} }
  function applyTheme() { try { const theme = localStorage.getItem(THEME_KEY); document.body.dataset.theme = THEMES.has(theme) ? theme : "green"; } catch { document.body.dataset.theme = "green"; } }
  function freshState() { return { board: Array.from({ length: ROWS }, () => Array(COLS).fill(null)), turn: "r", winner: null }; }
  function clone(source) { return JSON.parse(JSON.stringify(source)); }
  function saveState() { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function loadState() { try { const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY)); return saved?.board?.length === ROWS ? saved : null; } catch { return null; } }
  function openRow(col) { for (let row = ROWS - 1; row >= 0; row -= 1) if (!state.board[row][col]) return row; return -1; }
  function legalCols() { return Array.from({ length: COLS }, (_, col) => col).filter(col => openRow(col) >= 0); }
  function winnerFor(board) {
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (let row = 0; row < ROWS; row += 1) for (let col = 0; col < COLS; col += 1) {
      const cell = board[row][col]; if (!cell) continue;
      for (const [dr, dc] of dirs) {
        let count = 1;
        for (let step = 1; step < 4; step += 1) if (board[row + dr * step]?.[col + dc * step] === cell) count += 1;
        if (count === 4) return cell;
      }
    }
    return board.flat().every(Boolean) ? "draw" : null;
  }
  function drop(col, color) {
    const row = openRow(col);
    if (row < 0) return false;
    state.board[row][col] = color;
    state.winner = winnerFor(state.board);
    state.turn = color === "r" ? "y" : "r";
    return true;
  }
  function bestComputerCol() {
    const cols = legalCols();
    for (const color of ["y", "r"]) for (const col of cols) {
      const test = clone(state.board);
      for (let row = ROWS - 1; row >= 0; row -= 1) if (!test[row][col]) { test[row][col] = color; break; }
      if (winnerFor(test) === color) return col;
    }
    if (storedDifficulty() === "medium" || storedDifficulty() === "hard") {
      const order = [3, 2, 4, 1, 5, 0, 6].filter((col) => cols.includes(col));
      return order[0];
    }
    return cols.includes(3) ? 3 : cols[Math.floor(Math.random() * cols.length)];
  }
  function computerMove() { if (state.winner || state.turn !== "y") return; drop(bestComputerCol(), "y"); render(); }
  function rememberUndo() { undoSnapshot = clone(state); els.undo.disabled = false; }
  function render() {
    els.board.innerHTML = "";
    for (let row = 0; row < ROWS; row += 1) for (let col = 0; col < COLS; col += 1) {
      const button = document.createElement("button");
      button.type = "button"; button.className = `cell ${state.board[row][col] === "r" ? "red" : state.board[row][col] === "y" ? "yellow" : ""}`;
      button.dataset.col = String(col); button.setAttribute("aria-label", t("connect4Column", { col: col + 1 }));
      button.disabled = state.turn !== "r" || state.winner || openRow(col) < 0;
      button.addEventListener("click", onColumnClick);
      els.board.appendChild(button);
    }
    els.status.textContent = state.winner ? (state.winner === "draw" ? t("draw") : t(state.winner === "r" ? "youWon" : "computerWon")) : t("yourTurn");
    saveState();
  }
  function onColumnClick(event) { if (state.turn !== "r" || state.winner) return; rememberUndo(); if (drop(Number(event.currentTarget.dataset.col), "r")) { render(); window.setTimeout(computerMove, 300); } }
  function startNewGame() { state = freshState(); undoSnapshot = null; els.undo.disabled = true; render(); }
  function undo() { if (!undoSnapshot) return; state = clone(undoSnapshot); undoSnapshot = null; els.undo.disabled = true; render(); }
  function preventBrowserDoubleClick(event) { const now = Date.now(); if (now - lastTapAt < 420) event.preventDefault(); lastTapAt = now; }
  function preventViewportMove(event) { event.preventDefault(); }
  function preventGestureZoom(event) { event.preventDefault(); }
  function applyLanguage() { if (window.LMAG_I18N) window.LMAG_I18N.apply(document); render(); }
  function registerServiceWorker() { if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {})); }
  els.newGame.addEventListener("click", startNewGame); els.undo.addEventListener("click", undo); if (els.difficulty) els.difficulty.addEventListener("change", saveDifficulty);
  document.addEventListener("contextmenu", e => e.preventDefault()); document.addEventListener("dblclick", preventBrowserDoubleClick, { capture: true }); document.addEventListener("dragstart", e => e.preventDefault()); document.addEventListener("touchmove", preventViewportMove, { passive: false }); document.addEventListener("gesturestart", preventGestureZoom); document.addEventListener("gesturechange", preventGestureZoom); document.addEventListener("gestureend", preventGestureZoom); document.addEventListener("lmag:languagechange", applyLanguage);
  applyTheme(); applyDifficulty(); state = loadState() || freshState(); render(); registerServiceWorker();
})();
