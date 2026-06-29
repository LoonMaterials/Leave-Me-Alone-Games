(function () {
  "use strict";
  const STORAGE_KEY = "leave-me-alone-tic-tac-toe-current-game";
  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange"]);
  const WIN_LINES = [[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]];
  const els = { board: document.getElementById("board"), status: document.getElementById("status"), undo: document.getElementById("undo"), newGame: document.getElementById("new-game") };
  let state = null, undoSnapshot = null, lastTapAt = 0;
  function t(key, values) { return window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key; }
  function applyTheme() { try { const theme = localStorage.getItem(THEME_KEY); document.body.dataset.theme = THEMES.has(theme) ? theme : "colorblind"; } catch { document.body.dataset.theme = "colorblind"; } }
  function freshState() { return { board: Array(9).fill(""), turn: "x", winner: null, winningLine: [] }; }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function saveState() { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function loadState() { try { const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY)); return Array.isArray(saved?.board) && saved.board.length === 9 ? saved : null; } catch { return null; } }
  function winnerFor(board) {
    for (const line of WIN_LINES) {
      const [a, b, c] = line;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) return { winner: board[a], line };
    }
    return board.every(Boolean) ? { winner: "draw", line: [] } : { winner: null, line: [] };
  }
  function emptyCells(board) { return board.map((cell, index) => cell ? -1 : index).filter((index) => index >= 0); }
  function moveWins(board, mark, index) { const test = board.slice(); test[index] = mark; return winnerFor(test).winner === mark; }
  function mediumComputerMove() {
    const cells = emptyCells(state.board);
    if (!cells.length) return -1;
    const win = cells.find((index) => moveWins(state.board, "o", index));
    if (win !== undefined) return win;
    const shouldBlock = Math.random() < 0.72;
    if (shouldBlock) {
      const block = cells.find((index) => moveWins(state.board, "x", index));
      if (block !== undefined) return block;
    }
    if (!state.board[4] && Math.random() < 0.7) return 4;
    const corners = [0, 2, 6, 8].filter((index) => !state.board[index]);
    if (corners.length && Math.random() < 0.65) return corners[Math.floor(Math.random() * corners.length)];
    return cells[Math.floor(Math.random() * cells.length)];
  }
  function updateWinner() {
    const result = winnerFor(state.board);
    state.winner = result.winner;
    state.winningLine = result.line;
  }
  function computerMove() {
    if (state.winner || state.turn !== "o") return;
    const index = mediumComputerMove();
    if (index >= 0) state.board[index] = "o";
    updateWinner();
    state.turn = "x";
    render();
  }
  function onCellClick(event) {
    const index = Number(event.currentTarget.dataset.index);
    if (state.winner || state.turn !== "x" || state.board[index]) return;
    undoSnapshot = clone(state);
    els.undo.disabled = false;
    state.board[index] = "x";
    updateWinner();
    if (!state.winner) { state.turn = "o"; render(); window.setTimeout(computerMove, 240); return; }
    render();
  }
  function statusText() {
    if (state.winner === "x") return t("youWon");
    if (state.winner === "o") return t("computerWon");
    if (state.winner === "draw") return t("draw");
    return t("ticTacToePrompt");
  }
  function render() {
    els.board.innerHTML = "";
    const winSet = new Set(state.winningLine || []);
    state.board.forEach((mark, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `cell ${mark}${winSet.has(index) ? " win" : ""}`;
      button.dataset.index = String(index);
      button.textContent = mark.toUpperCase();
      button.disabled = Boolean(mark) || state.turn !== "x" || Boolean(state.winner);
      button.setAttribute("aria-label", t("ticTacToeCell", { cell: index + 1 }));
      button.addEventListener("click", onCellClick);
      els.board.appendChild(button);
    });
    els.status.textContent = statusText();
    saveState();
  }
  function startNewGame() { state = freshState(); undoSnapshot = null; els.undo.disabled = true; render(); }
  function undo() { if (!undoSnapshot) return; state = clone(undoSnapshot); undoSnapshot = null; els.undo.disabled = true; render(); }
  function preventBrowserDoubleClick(event) { const now = Date.now(); if (now - lastTapAt < 420) event.preventDefault(); lastTapAt = now; }
  function preventViewportMove(event) { event.preventDefault(); }
  function preventGestureZoom(event) { event.preventDefault(); }
  function applyLanguage() { if (window.LMAG_I18N) window.LMAG_I18N.apply(document); render(); }
  function registerServiceWorker() { if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {})); }
  els.newGame.addEventListener("click", startNewGame); els.undo.addEventListener("click", undo);
  document.addEventListener("contextmenu", (event) => event.preventDefault()); document.addEventListener("dblclick", preventBrowserDoubleClick, { capture: true }); document.addEventListener("dragstart", (event) => event.preventDefault()); document.addEventListener("touchmove", preventViewportMove, { passive: false }); document.addEventListener("gesturestart", preventGestureZoom); document.addEventListener("gesturechange", preventGestureZoom); document.addEventListener("gestureend", preventGestureZoom); document.addEventListener("lmag:languagechange", applyLanguage);
  applyTheme(); state = loadState() || freshState(); render(); registerServiceWorker();
})();
