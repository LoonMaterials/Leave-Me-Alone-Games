(function () {
  "use strict";
  const STORAGE_KEY = "leave-me-alone-checkers-current-game";
  const DIFFICULTY_KEY = "leave-me-alone-checkers-difficulty";
  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange"]);
  const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
  const els = { board: document.getElementById("board"), status: document.getElementById("status"), undo: document.getElementById("undo"), newGame: document.getElementById("new-game"), difficulty: document.getElementById("difficulty") };
  let state = null, selected = null, legalTargets = [], undoSnapshot = null, lastTapAt = 0;
  function t(key, values) { return window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key; }
  function storedDifficulty() { try { const difficulty = localStorage.getItem(DIFFICULTY_KEY); return DIFFICULTIES.has(difficulty) ? difficulty : "easy"; } catch { return "easy"; } }
  function applyDifficulty() { if (els.difficulty) els.difficulty.value = storedDifficulty(); }
  function saveDifficulty() { if (!els.difficulty) return; try { localStorage.setItem(DIFFICULTY_KEY, DIFFICULTIES.has(els.difficulty.value) ? els.difficulty.value : "easy"); } catch {} }
  function applyTheme() { try { const theme = localStorage.getItem(THEME_KEY); document.body.dataset.theme = THEMES.has(theme) ? theme : "colorblind"; } catch { document.body.dataset.theme = "colorblind"; } }
  function freshState() {
    const board = Array.from({ length: 8 }, () => Array(8).fill(null));
    for (let row = 0; row < 3; row += 1) for (let col = 0; col < 8; col += 1) if ((row + col) % 2) board[row][col] = { color: "b", king: false };
    for (let row = 5; row < 8; row += 1) for (let col = 0; col < 8; col += 1) if ((row + col) % 2) board[row][col] = { color: "r", king: false };
    return { board, turn: "r", winner: null };
  }
  function clone(source) { return JSON.parse(JSON.stringify(source)); }
  function saveState() { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function loadState() { try { const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY)); return saved?.board?.length === 8 ? saved : null; } catch { return null; } }
  function inBounds(row, col) { return row >= 0 && row < 8 && col >= 0 && col < 8; }
  function directions(piece) { return piece.king ? [[-1,-1],[-1,1],[1,-1],[1,1]] : piece.color === "r" ? [[-1,-1],[-1,1]] : [[1,-1],[1,1]]; }
  function pieceMoves(row, col) {
    const piece = state.board[row][col];
    if (!piece || state.winner) return [];
    const captures = [], moves = [];
    directions(piece).forEach(([dr, dc]) => {
      const nr = row + dr, nc = col + dc, jr = row + dr * 2, jc = col + dc * 2;
      if (inBounds(jr, jc) && state.board[nr][nc] && state.board[nr][nc].color !== piece.color && !state.board[jr][jc]) captures.push({ from: { row, col }, to: { row: jr, col: jc }, jumped: { row: nr, col: nc } });
      else if (inBounds(nr, nc) && !state.board[nr][nc]) moves.push({ from: { row, col }, to: { row: nr, col: nc } });
    });
    return captures.length ? captures : moves;
  }
  function allMoves(color) {
    const all = [];
    for (let row = 0; row < 8; row += 1) for (let col = 0; col < 8; col += 1) if (state.board[row][col]?.color === color) all.push(...pieceMoves(row, col));
    const captures = all.filter((move) => move.jumped);
    return captures.length ? captures : all;
  }
  function updateWinner() {
    const red = state.board.flat().filter((piece) => piece?.color === "r").length;
    const black = state.board.flat().filter((piece) => piece?.color === "b").length;
    if (!red) state.winner = "b";
    else if (!black) state.winner = "r";
    else if (!allMoves(state.turn).length) state.winner = state.turn === "r" ? "b" : "r";
  }
  function movePiece(move) {
    const piece = state.board[move.from.row][move.from.col];
    state.board[move.to.row][move.to.col] = piece;
    state.board[move.from.row][move.from.col] = null;
    if (move.jumped) state.board[move.jumped.row][move.jumped.col] = null;
    if ((piece.color === "r" && move.to.row === 0) || (piece.color === "b" && move.to.row === 7)) piece.king = true;
    state.turn = piece.color === "r" ? "b" : "r";
    updateWinner();
  }
  function computerMove() {
    if (state.winner) return;
    const moves = allMoves("b");
    if (!moves.length) { updateWinner(); render(); return; }
    movePiece(chooseComputerMove(moves));
    state.turn = "r";
    updateWinner();
    render();
  }
  function chooseComputerMove(moves) {
    const captures = moves.filter((move) => move.jumped);
    if (storedDifficulty() !== "medium" && storedDifficulty() !== "hard") return (captures.length ? captures : moves)[Math.floor(Math.random() * (captures.length ? captures.length : moves.length))];
    const scored = moves.map((move) => ({ move, score: checkersMoveScore(move) })).sort((a, b) => b.score - a.score);
    const bestScore = scored[0].score;
    const bestMoves = scored.filter((item) => item.score === bestScore).map((item) => item.move);
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }
  function checkersMoveScore(move) {
    const piece = state.board[move.from.row][move.from.col];
    let score = move.jumped ? 30 : 0;
    if (!piece.king) score += move.to.row * 2;
    if (!piece.king && move.to.row === 7) score += 25;
    if (move.to.col === 0 || move.to.col === 7) score += 4;
    if (storedDifficulty() === "hard") score -= redReplyPenalty(move);
    score += Math.random();
    return score;
  }
  function redReplyPenalty(move) {
    const saved = state;
    state = clone(saved);
    movePiece(clone(move));
    const replies = allMoves("r");
    const penalty = replies.some((reply) => reply.jumped) ? 24 : 0;
    state = saved;
    return penalty;
  }
  function rememberUndo() { undoSnapshot = clone(state); els.undo.disabled = false; }
  function render() {
    els.board.innerHTML = "";
    const targetSet = new Set(legalTargets.map((move) => `${move.to.row},${move.to.col}`));
    for (let row = 0; row < 8; row += 1) for (let col = 0; col < 8; col += 1) {
      const square = document.createElement("button");
      square.type = "button"; square.className = `square ${(row + col) % 2 ? "dark" : "light"}`; square.dataset.row = String(row); square.dataset.col = String(col);
      if (selected && selected.row === row && selected.col === col) square.classList.add("selected");
      if (targetSet.has(`${row},${col}`)) square.classList.add("legal");
      const piece = state.board[row][col];
      square.setAttribute("aria-label", t("checkersSquare", { row: row + 1, col: col + 1 }));
      if (piece) { const div = document.createElement("div"); div.className = `piece ${piece.color === "r" ? "red" : "black"}`; div.textContent = piece.king ? "\u265B" : ""; square.appendChild(div); }
      square.addEventListener("click", onSquareClick); els.board.appendChild(square);
    }
    els.status.textContent = state.winner ? t(state.winner === "r" ? "youWon" : "computerWon") : t("yourTurn");
    saveState();
  }
  function onSquareClick(event) {
    if (state.turn !== "r" || state.winner) return;
    const row = Number(event.currentTarget.dataset.row), col = Number(event.currentTarget.dataset.col);
    const chosenMove = legalTargets.find((move) => move.to.row === row && move.to.col === col);
    if (chosenMove) { rememberUndo(); movePiece(chosenMove); selected = null; legalTargets = []; render(); window.setTimeout(computerMove, 260); return; }
    if (state.board[row][col]?.color === "r") { selected = { row, col }; const forced = allMoves("r").filter((move) => move.jumped); legalTargets = forced.length ? forced.filter((move) => move.from.row === row && move.from.col === col) : pieceMoves(row, col); }
    else { selected = null; legalTargets = []; }
    render();
  }
  function startNewGame() { state = freshState(); selected = null; legalTargets = []; undoSnapshot = null; els.undo.disabled = true; render(); }
  function undo() { if (!undoSnapshot) return; state = clone(undoSnapshot); selected = null; legalTargets = []; undoSnapshot = null; els.undo.disabled = true; render(); }
  function preventBrowserDoubleClick(event) { const now = Date.now(); if (now - lastTapAt < 420) event.preventDefault(); lastTapAt = now; }
  function preventViewportMove(event) { event.preventDefault(); }
  function preventGestureZoom(event) { event.preventDefault(); }
  function applyLanguage() { if (window.LMAG_I18N) window.LMAG_I18N.apply(document); render(); }
  function registerServiceWorker() { if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {})); }
  els.newGame.addEventListener("click", startNewGame); els.undo.addEventListener("click", undo); if (els.difficulty) els.difficulty.addEventListener("change", saveDifficulty);
  document.addEventListener("contextmenu", (event) => event.preventDefault()); document.addEventListener("dblclick", preventBrowserDoubleClick, { capture: true }); document.addEventListener("dragstart", (event) => event.preventDefault()); document.addEventListener("touchmove", preventViewportMove, { passive: false }); document.addEventListener("gesturestart", preventGestureZoom); document.addEventListener("gesturechange", preventGestureZoom); document.addEventListener("gestureend", preventGestureZoom); document.addEventListener("lmag:languagechange", applyLanguage);
  applyTheme(); applyDifficulty(); state = loadState() || freshState(); updateWinner(); render(); registerServiceWorker();
})();
