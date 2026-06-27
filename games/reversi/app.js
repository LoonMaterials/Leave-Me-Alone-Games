(function () {
  "use strict";
  const STORAGE_KEY = "leave-me-alone-reversi-current-game";
  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["green", "blue", "grey", "orange"]);
  const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  const els = { board: document.getElementById("board"), status: document.getElementById("status"), undo: document.getElementById("undo"), newGame: document.getElementById("new-game") };
  let state = null, undoSnapshot = null, lastTapAt = 0;
  function t(key, values) { return window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key; }
  function applyTheme() { try { const theme = localStorage.getItem(THEME_KEY); document.body.dataset.theme = THEMES.has(theme) ? theme : "green"; } catch { document.body.dataset.theme = "green"; } }
  function freshState() { const board = Array.from({ length: 8 }, () => Array(8).fill(null)); board[3][3] = "w"; board[3][4] = "b"; board[4][3] = "b"; board[4][4] = "w"; return { board, turn: "b", winner: null }; }
  function clone(source) { return JSON.parse(JSON.stringify(source)); }
  function saveState() { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function loadState() { try { const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY)); return saved?.board?.length === 8 ? saved : null; } catch { return null; } }
  function inBounds(row, col) { return row >= 0 && row < 8 && col >= 0 && col < 8; }
  function opponent(color) { return color === "b" ? "w" : "b"; }
  function flipsFor(row, col, color) {
    if (state.board[row][col]) return [];
    const flips = [];
    DIRS.forEach(([dr, dc]) => {
      const line = [];
      let r = row + dr, c = col + dc;
      while (inBounds(r, c) && state.board[r][c] === opponent(color)) { line.push([r, c]); r += dr; c += dc; }
      if (line.length && inBounds(r, c) && state.board[r][c] === color) flips.push(...line);
    });
    return flips;
  }
  function legalMoves(color) {
    const moves = [];
    for (let row = 0; row < 8; row += 1) for (let col = 0; col < 8; col += 1) {
      const flips = flipsFor(row, col, color);
      if (flips.length) moves.push({ row, col, flips });
    }
    return moves;
  }
  function score() { return state.board.flat().reduce((acc, cell) => { if (cell === "b") acc.black += 1; if (cell === "w") acc.white += 1; return acc; }, { black: 0, white: 0 }); }
  function updateWinner() {
    const blackMoves = legalMoves("b"), whiteMoves = legalMoves("w");
    if (blackMoves.length || whiteMoves.length) return;
    const s = score();
    state.winner = s.black === s.white ? "draw" : s.black > s.white ? "b" : "w";
  }
  function playMove(move, color) {
    state.board[move.row][move.col] = color;
    move.flips.forEach(([row, col]) => { state.board[row][col] = color; });
    state.turn = opponent(color);
    if (!legalMoves(state.turn).length) state.turn = color;
    updateWinner();
  }
  function computerMove() {
    if (state.winner || state.turn !== "w") return;
    const moves = legalMoves("w");
    if (!moves.length) { state.turn = "b"; render(); return; }
    const best = moves.slice().sort((a, b) => b.flips.length - a.flips.length)[0];
    playMove(best, "w");
    render();
  }
  function rememberUndo() { undoSnapshot = clone(state); els.undo.disabled = false; }
  function render() {
    els.board.innerHTML = "";
    const moves = state.turn === "b" ? legalMoves("b") : [];
    const legal = new Map(moves.map(move => [`${move.row},${move.col}`, move]));
    for (let row = 0; row < 8; row += 1) for (let col = 0; col < 8; col += 1) {
      const square = document.createElement("button");
      square.type = "button"; square.className = "square"; square.dataset.row = String(row); square.dataset.col = String(col);
      if (legal.has(`${row},${col}`)) square.classList.add("legal");
      square.setAttribute("aria-label", t("reversiSquare", { row: row + 1, col: col + 1 }));
      const cell = state.board[row][col];
      if (cell) { const disc = document.createElement("div"); disc.className = `disc ${cell === "b" ? "black" : "white"}`; square.appendChild(disc); }
      square.addEventListener("click", onSquareClick); els.board.appendChild(square);
    }
    const s = score();
    els.status.textContent = state.winner ? (state.winner === "draw" ? t("draw") : t(state.winner === "b" ? "youWon" : "computerWon")) : t("reversiScore", { player: s.black, computer: s.white });
    saveState();
  }
  function onSquareClick(event) {
    if (state.turn !== "b" || state.winner) return;
    const row = Number(event.currentTarget.dataset.row), col = Number(event.currentTarget.dataset.col);
    const move = legalMoves("b").find(item => item.row === row && item.col === col);
    if (!move) return;
    rememberUndo(); playMove(move, "b"); render(); window.setTimeout(computerMove, 300);
  }
  function startNewGame() { state = freshState(); undoSnapshot = null; els.undo.disabled = true; render(); }
  function undo() { if (!undoSnapshot) return; state = clone(undoSnapshot); undoSnapshot = null; els.undo.disabled = true; render(); }
  function preventBrowserDoubleClick(event) { const now = Date.now(); if (now - lastTapAt < 420) event.preventDefault(); lastTapAt = now; }
  function preventViewportMove(event) { event.preventDefault(); }
  function preventGestureZoom(event) { event.preventDefault(); }
  function applyLanguage() { if (window.LMAG_I18N) window.LMAG_I18N.apply(document); render(); }
  function registerServiceWorker() { if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {})); }
  els.newGame.addEventListener("click", startNewGame); els.undo.addEventListener("click", undo);
  document.addEventListener("contextmenu", e => e.preventDefault()); document.addEventListener("dblclick", preventBrowserDoubleClick, { capture: true }); document.addEventListener("dragstart", e => e.preventDefault()); document.addEventListener("touchmove", preventViewportMove, { passive: false }); document.addEventListener("gesturestart", preventGestureZoom); document.addEventListener("gesturechange", preventGestureZoom); document.addEventListener("gestureend", preventGestureZoom); document.addEventListener("lmag:languagechange", applyLanguage);
  applyTheme(); state = loadState() || freshState(); updateWinner(); render(); registerServiceWorker();
})();
