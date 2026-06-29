(function () {
  "use strict";

  const STORAGE_KEY = "leave-me-alone-chess-current-game";
  const DIFFICULTY_KEY = "leave-me-alone-chess-difficulty";
  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange"]);
  const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
  const SYMBOLS = {
    wK: "\u2654", wQ: "\u2655", wR: "\u2656", wB: "\u2657", wN: "\u2658", wP: "\u2659",
    bK: "\u265A", bQ: "\u265B", bR: "\u265C", bB: "\u265D", bN: "\u265E", bP: "\u265F"
  };
  const VALUES = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 100 };

  const els = {
    board: document.getElementById("board"),
    status: document.getElementById("status"),
    undo: document.getElementById("undo"),
    newGame: document.getElementById("new-game"),
    difficulty: document.getElementById("difficulty")
  };
  let state = null;
  let selected = null;
  let legalTargets = [];
  let undoSnapshot = null;
  let lastTapAt = 0;

  function t(key, values) {
    return window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key;
  }

  function storedDifficulty() {
    try {
      const difficulty = localStorage.getItem(DIFFICULTY_KEY);
      return DIFFICULTIES.has(difficulty) ? difficulty : "easy";
    } catch {
      return "easy";
    }
  }

  function applyDifficulty() {
    if (els.difficulty) els.difficulty.value = storedDifficulty();
  }

  function saveDifficulty() {
    if (!els.difficulty) return;
    try {
      localStorage.setItem(DIFFICULTY_KEY, DIFFICULTIES.has(els.difficulty.value) ? els.difficulty.value : "easy");
    } catch {}
  }

  function applyTheme() {
    try {
      const theme = localStorage.getItem(THEME_KEY);
      document.body.dataset.theme = THEMES.has(theme) ? theme : "colorblind";
    } catch {
      document.body.dataset.theme = "colorblind";
    }
  }

  function freshState() {
    return {
      board: [
        ["bR","bN","bB","bQ","bK","bB","bN","bR"],
        ["bP","bP","bP","bP","bP","bP","bP","bP"],
        [null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
        ["wP","wP","wP","wP","wP","wP","wP","wP"],
        ["wR","wN","wB","wQ","wK","wB","wN","wR"]
      ],
      turn: "w",
      winner: null
    };
  }

  function clone(source) {
    return JSON.parse(JSON.stringify(source));
  }

  function saveState() {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadState() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
      if (!saved || !Array.isArray(saved.board) || saved.board.length !== 8) return null;
      return saved;
    } catch {
      return null;
    }
  }

  function inBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  function colorOf(piece) {
    return piece ? piece[0] : null;
  }

  function typeOf(piece) {
    return piece ? piece[1] : null;
  }

  function addSlideMoves(moves, row, col, color, directions) {
    directions.forEach(([dr, dc]) => {
      let nextRow = row + dr;
      let nextCol = col + dc;
      while (inBounds(nextRow, nextCol)) {
        const target = state.board[nextRow][nextCol];
        if (!target) {
          moves.push({ from: { row, col }, to: { row: nextRow, col: nextCol } });
        } else {
          if (colorOf(target) !== color) moves.push({ from: { row, col }, to: { row: nextRow, col: nextCol }, capture: target });
          break;
        }
        nextRow += dr;
        nextCol += dc;
      }
    });
  }

  function pieceMoves(row, col) {
    const piece = state.board[row][col];
    if (!piece || state.winner) return [];
    const color = colorOf(piece);
    const type = typeOf(piece);
    const moves = [];
    if (type === "P") {
      const dir = color === "w" ? -1 : 1;
      const start = color === "w" ? 6 : 1;
      if (inBounds(row + dir, col) && !state.board[row + dir][col]) {
        moves.push({ from: { row, col }, to: { row: row + dir, col } });
        if (row === start && !state.board[row + dir * 2][col]) moves.push({ from: { row, col }, to: { row: row + dir * 2, col } });
      }
      [-1, 1].forEach((dc) => {
        const target = state.board[row + dir]?.[col + dc];
        if (target && colorOf(target) !== color) moves.push({ from: { row, col }, to: { row: row + dir, col: col + dc }, capture: target });
      });
    }
    if (type === "N") {
      [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr, dc]) => {
        const nextRow = row + dr;
        const nextCol = col + dc;
        if (!inBounds(nextRow, nextCol)) return;
        const target = state.board[nextRow][nextCol];
        if (!target || colorOf(target) !== color) moves.push({ from: { row, col }, to: { row: nextRow, col: nextCol }, capture: target || null });
      });
    }
    if (type === "B" || type === "Q") addSlideMoves(moves, row, col, color, [[-1,-1],[-1,1],[1,-1],[1,1]]);
    if (type === "R" || type === "Q") addSlideMoves(moves, row, col, color, [[-1,0],[1,0],[0,-1],[0,1]]);
    if (type === "K") {
      [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr, dc]) => {
        const nextRow = row + dr;
        const nextCol = col + dc;
        if (!inBounds(nextRow, nextCol)) return;
        const target = state.board[nextRow][nextCol];
        if (!target || colorOf(target) !== color) moves.push({ from: { row, col }, to: { row: nextRow, col: nextCol }, capture: target || null });
      });
    }
    return moves;
  }

  function allMoves(color) {
    const moves = [];
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        if (colorOf(state.board[row][col]) === color) moves.push(...pieceMoves(row, col));
      }
    }
    return moves;
  }

  function movePiece(move) {
    const piece = state.board[move.from.row][move.from.col];
    const captured = state.board[move.to.row][move.to.col];
    state.board[move.to.row][move.to.col] = piece;
    state.board[move.from.row][move.from.col] = null;
    if (piece[1] === "P" && (move.to.row === 0 || move.to.row === 7)) state.board[move.to.row][move.to.col] = `${piece[0]}Q`;
    if (captured?.[1] === "K") state.winner = piece[0];
    state.turn = piece[0] === "w" ? "b" : "w";
  }

  function computerMove() {
    if (state.winner) return;
    const moves = allMoves("b");
    if (!moves.length) return;
    movePiece(chooseComputerMove(moves));
    state.turn = "w";
    render();
  }

  function chooseComputerMove(moves) {
    if (storedDifficulty() !== "medium" && storedDifficulty() !== "hard") {
      const sorted = moves.slice().sort((a, b) => (VALUES[typeOf(b.capture)] || 0) - (VALUES[typeOf(a.capture)] || 0));
      const bestValue = VALUES[typeOf(sorted[0].capture)] || 0;
      const bestMoves = sorted.filter((move) => (VALUES[typeOf(move.capture)] || 0) === bestValue);
      return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }
    const scored = moves.map((move) => ({ move, score: chessMoveScore(move) })).sort((a, b) => b.score - a.score);
    const bestScore = scored[0].score;
    const bestMoves = scored.filter((item) => item.score === bestScore).map((item) => item.move);
    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  function chessMoveScore(move) {
    const piece = state.board[move.from.row][move.from.col];
    const type = typeOf(piece);
    let score = (VALUES[typeOf(move.capture)] || 0) * 12;
    if (type === "P" && move.to.row === 7) score += VALUES.Q * 7;
    score += 4 - Math.abs(3.5 - move.to.col);
    score += 4 - Math.abs(3.5 - move.to.row);
    if (move.capture && (VALUES[typeOf(move.capture)] || 0) >= (VALUES[type] || 0)) score += 6;
    if (storedDifficulty() === "hard") score -= whiteReplyPenalty(move);
    return score;
  }

  function whiteReplyPenalty(move) {
    const saved = state;
    state = clone(saved);
    movePiece(clone(move));
    const replies = allMoves("w");
    const bestCapture = replies.reduce((best, reply) => Math.max(best, VALUES[typeOf(reply.capture)] || 0), 0);
    state = saved;
    return bestCapture * 9;
  }

  function rememberUndo() {
    undoSnapshot = clone(state);
    els.undo.disabled = false;
  }

  function render() {
    els.board.innerHTML = "";
    const targetSet = new Set(legalTargets.map((move) => `${move.to.row},${move.to.col}`));
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const square = document.createElement("button");
        square.type = "button";
        square.className = `square ${(row + col) % 2 ? "dark" : "light"}`;
        square.dataset.row = String(row);
        square.dataset.col = String(col);
        const piece = state.board[row][col];
        if (selected && selected.row === row && selected.col === col) square.classList.add("selected");
        if (targetSet.has(`${row},${col}`)) square.classList.add(piece ? "capture" : "legal");
        square.setAttribute("aria-label", t("chessSquare", { file: "abcdefgh"[col], rank: 8 - row }));
        if (piece) {
          const span = document.createElement("span");
          span.className = `piece ${piece[0] === "w" ? "white" : "black"}`;
          span.textContent = SYMBOLS[piece];
          square.appendChild(span);
        }
        square.addEventListener("click", onSquareClick);
        els.board.appendChild(square);
      }
    }
    els.status.textContent = state.winner ? t(state.winner === "w" ? "youWon" : "computerWon") : t("yourTurn");
    saveState();
  }

  function onSquareClick(event) {
    if (state.turn !== "w" || state.winner) return;
    const row = Number(event.currentTarget.dataset.row);
    const col = Number(event.currentTarget.dataset.col);
    const chosenMove = legalTargets.find((move) => move.to.row === row && move.to.col === col);
    if (chosenMove) {
      rememberUndo();
      movePiece(chosenMove);
      selected = null;
      legalTargets = [];
      render();
      window.setTimeout(computerMove, 260);
      return;
    }
    if (colorOf(state.board[row][col]) === "w") {
      selected = { row, col };
      legalTargets = pieceMoves(row, col);
    } else {
      selected = null;
      legalTargets = [];
    }
    render();
  }

  function startNewGame() {
    state = freshState();
    selected = null;
    legalTargets = [];
    undoSnapshot = null;
    els.undo.disabled = true;
    render();
  }

  function undo() {
    if (!undoSnapshot) return;
    state = clone(undoSnapshot);
    selected = null;
    legalTargets = [];
    undoSnapshot = null;
    els.undo.disabled = true;
    render();
  }

  function preventBrowserDoubleClick(event) {
    const now = Date.now();
    if (now - lastTapAt < 420) event.preventDefault();
    lastTapAt = now;
  }

  function preventViewportMove(event) { event.preventDefault(); }
  function preventGestureZoom(event) { event.preventDefault(); }
  function applyLanguage() { if (window.LMAG_I18N) window.LMAG_I18N.apply(document); render(); }
  function registerServiceWorker() {
    if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {}));
  }

  els.newGame.addEventListener("click", startNewGame);
  els.undo.addEventListener("click", undo);
  if (els.difficulty) els.difficulty.addEventListener("change", saveDifficulty);
  document.addEventListener("contextmenu", (event) => event.preventDefault());
  document.addEventListener("dblclick", preventBrowserDoubleClick, { capture: true });
  document.addEventListener("dragstart", (event) => event.preventDefault());
  document.addEventListener("touchmove", preventViewportMove, { passive: false });
  document.addEventListener("gesturestart", preventGestureZoom);
  document.addEventListener("gesturechange", preventGestureZoom);
  document.addEventListener("gestureend", preventGestureZoom);
  document.addEventListener("lmag:languagechange", applyLanguage);

  applyTheme();
  applyDifficulty();
  state = loadState() || freshState();
  render();
  registerServiceWorker();
})();
