(function () {
  "use strict";

  const STORAGE_KEY = "leave-me-alone-chess-current-game";
  const DIFFICULTY_KEY = "leave-me-alone-chess-difficulty";
  const THEME_KEY = "leave-me-alone-games-theme";
  const SAVE_VERSION = 2;
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange"]);
  const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
  const VALUES = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };
  const PIECE_SQUARES = {
    P: [
      [0,0,0,0,0,0,0,0],
      [50,50,50,50,50,50,50,50],
      [10,10,20,30,30,20,10,10],
      [5,5,10,25,25,10,5,5],
      [0,0,0,20,20,0,0,0],
      [5,-5,-10,0,0,-10,-5,5],
      [5,10,10,-20,-20,10,10,5],
      [0,0,0,0,0,0,0,0]
    ],
    N: [
      [-50,-40,-30,-30,-30,-30,-40,-50],
      [-40,-20,0,5,5,0,-20,-40],
      [-30,5,10,15,15,10,5,-30],
      [-30,0,15,20,20,15,0,-30],
      [-30,5,15,20,20,15,5,-30],
      [-30,0,10,15,15,10,0,-30],
      [-40,-20,0,0,0,0,-20,-40],
      [-50,-40,-30,-30,-30,-30,-40,-50]
    ],
    B: [
      [-20,-10,-10,-10,-10,-10,-10,-20],
      [-10,5,0,0,0,0,5,-10],
      [-10,10,10,10,10,10,10,-10],
      [-10,0,10,10,10,10,0,-10],
      [-10,5,5,10,10,5,5,-10],
      [-10,0,5,10,10,5,0,-10],
      [-10,0,0,0,0,0,0,-10],
      [-20,-10,-10,-10,-10,-10,-10,-20]
    ],
    R: [
      [0,0,0,5,5,0,0,0],
      [-5,0,0,0,0,0,0,-5],
      [-5,0,0,0,0,0,0,-5],
      [-5,0,0,0,0,0,0,-5],
      [-5,0,0,0,0,0,0,-5],
      [-5,0,0,0,0,0,0,-5],
      [5,10,10,10,10,10,10,5],
      [0,0,0,0,0,0,0,0]
    ],
    Q: [
      [-20,-10,-10,-5,-5,-10,-10,-20],
      [-10,0,0,0,0,0,0,-10],
      [-10,0,5,5,5,5,0,-10],
      [-5,0,5,5,5,5,0,-5],
      [0,0,5,5,5,5,0,-5],
      [-10,5,5,5,5,5,0,-10],
      [-10,0,5,0,0,0,0,-10],
      [-20,-10,-10,-5,-5,-10,-10,-20]
    ],
    K: [
      [20,30,10,0,0,10,30,20],
      [20,20,0,0,0,0,20,20],
      [-10,-20,-20,-20,-20,-20,-20,-10],
      [-20,-30,-30,-40,-40,-30,-30,-20],
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-30,-40,-40,-50,-50,-40,-40,-30]
    ]
  };

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
      version: SAVE_VERSION,
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
      winner: null,
      draw: false,
      castling: { wK: true, wQ: true, bK: true, bQ: true },
      enPassant: null,
      halfMove: 0,
      fullMove: 1
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
      if (!saved || saved.version !== SAVE_VERSION || !Array.isArray(saved.board) || saved.board.length !== 8) return null;
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

  function other(color) {
    return color === "w" ? "b" : "w";
  }

  function pieceAt(board, row, col) {
    return inBounds(row, col) ? board[row][col] : null;
  }

  function findKing(board, color) {
    const king = `${color}K`;
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        if (board[row][col] === king) return { row, col };
      }
    }
    return null;
  }

  function isSquareAttacked(board, row, col, byColor) {
    const pawnDir = byColor === "w" ? -1 : 1;
    for (const dc of [-1, 1]) {
      if (pieceAt(board, row - pawnDir, col - dc) === `${byColor}P`) return true;
    }
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      if (pieceAt(board, row + dr, col + dc) === `${byColor}N`) return true;
    }
    for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
      let nextRow = row + dr;
      let nextCol = col + dc;
      while (inBounds(nextRow, nextCol)) {
        const piece = board[nextRow][nextCol];
        if (piece) {
          if (colorOf(piece) === byColor && (typeOf(piece) === "B" || typeOf(piece) === "Q")) return true;
          break;
        }
        nextRow += dr;
        nextCol += dc;
      }
    }
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      let nextRow = row + dr;
      let nextCol = col + dc;
      while (inBounds(nextRow, nextCol)) {
        const piece = board[nextRow][nextCol];
        if (piece) {
          if (colorOf(piece) === byColor && (typeOf(piece) === "R" || typeOf(piece) === "Q")) return true;
          break;
        }
        nextRow += dr;
        nextCol += dc;
      }
    }
    for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
      if (pieceAt(board, row + dr, col + dc) === `${byColor}K`) return true;
    }
    return false;
  }

  function isInCheck(position, color) {
    const king = findKing(position.board, color);
    return king ? isSquareAttacked(position.board, king.row, king.col, other(color)) : true;
  }

  function addSlideMoves(position, moves, row, col, color, directions) {
    directions.forEach(([dr, dc]) => {
      let nextRow = row + dr;
      let nextCol = col + dc;
      while (inBounds(nextRow, nextCol)) {
        const target = position.board[nextRow][nextCol];
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

  function pseudoMovesFor(position, row, col) {
    const piece = position.board[row][col];
    if (!piece || position.winner || position.draw) return [];
    const color = colorOf(piece);
    const type = typeOf(piece);
    const moves = [];
    if (type === "P") {
      const dir = color === "w" ? -1 : 1;
      const start = color === "w" ? 6 : 1;
      const promoteRow = color === "w" ? 0 : 7;
      if (inBounds(row + dir, col) && !position.board[row + dir][col]) {
        moves.push({ from: { row, col }, to: { row: row + dir, col }, promotion: row + dir === promoteRow ? "Q" : null });
        if (row === start && !position.board[row + dir * 2][col]) {
          moves.push({ from: { row, col }, to: { row: row + dir * 2, col }, doublePawn: true });
        }
      }
      [-1, 1].forEach((dc) => {
        const nextRow = row + dir;
        const nextCol = col + dc;
        if (!inBounds(nextRow, nextCol)) return;
        const target = position.board[nextRow][nextCol];
        if (target && colorOf(target) !== color) {
          moves.push({ from: { row, col }, to: { row: nextRow, col: nextCol }, capture: target, promotion: nextRow === promoteRow ? "Q" : null });
        } else if (position.enPassant && position.enPassant.row === nextRow && position.enPassant.col === nextCol) {
          moves.push({ from: { row, col }, to: { row: nextRow, col: nextCol }, capture: `${other(color)}P`, enPassant: true });
        }
      });
    }
    if (type === "N") {
      [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr, dc]) => {
        const nextRow = row + dr;
        const nextCol = col + dc;
        if (!inBounds(nextRow, nextCol)) return;
        const target = position.board[nextRow][nextCol];
        if (!target || colorOf(target) !== color) moves.push({ from: { row, col }, to: { row: nextRow, col: nextCol }, capture: target || null });
      });
    }
    if (type === "B" || type === "Q") addSlideMoves(position, moves, row, col, color, [[-1,-1],[-1,1],[1,-1],[1,1]]);
    if (type === "R" || type === "Q") addSlideMoves(position, moves, row, col, color, [[-1,0],[1,0],[0,-1],[0,1]]);
    if (type === "K") {
      [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr, dc]) => {
        const nextRow = row + dr;
        const nextCol = col + dc;
        if (!inBounds(nextRow, nextCol)) return;
        const target = position.board[nextRow][nextCol];
        if (!target || colorOf(target) !== color) moves.push({ from: { row, col }, to: { row: nextRow, col: nextCol }, capture: target || null });
      });
      addCastles(position, moves, color);
    }
    return moves;
  }

  function addCastles(position, moves, color) {
    const row = color === "w" ? 7 : 0;
    if (position.board[row][4] !== `${color}K` || isInCheck(position, color)) return;
    if (position.castling?.[`${color}K`] && position.board[row][7] === `${color}R` && !position.board[row][5] && !position.board[row][6]) {
      if (!isSquareAttacked(position.board, row, 5, other(color)) && !isSquareAttacked(position.board, row, 6, other(color))) {
        moves.push({ from: { row, col: 4 }, to: { row, col: 6 }, castle: "king" });
      }
    }
    if (position.castling?.[`${color}Q`] && position.board[row][0] === `${color}R` && !position.board[row][1] && !position.board[row][2] && !position.board[row][3]) {
      if (!isSquareAttacked(position.board, row, 3, other(color)) && !isSquareAttacked(position.board, row, 2, other(color))) {
        moves.push({ from: { row, col: 4 }, to: { row, col: 2 }, castle: "queen" });
      }
    }
  }

  function legalMovesFor(position, row, col) {
    const piece = position.board[row]?.[col];
    if (!piece) return [];
    const color = colorOf(piece);
    return pseudoMovesFor(position, row, col).filter((move) => {
      const next = clone(position);
      applyMove(next, clone(move), { updateStatus: false });
      return !isInCheck(next, color);
    });
  }

  function allLegalMoves(position, color) {
    const moves = [];
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        if (colorOf(position.board[row][col]) === color) moves.push(...legalMovesFor(position, row, col));
      }
    }
    return moves;
  }

  function updateCastlingRights(position, piece, move, captured) {
    if (piece === "wK") {
      position.castling.wK = false;
      position.castling.wQ = false;
    }
    if (piece === "bK") {
      position.castling.bK = false;
      position.castling.bQ = false;
    }
    if (piece === "wR" && move.from.row === 7 && move.from.col === 0) position.castling.wQ = false;
    if (piece === "wR" && move.from.row === 7 && move.from.col === 7) position.castling.wK = false;
    if (piece === "bR" && move.from.row === 0 && move.from.col === 0) position.castling.bQ = false;
    if (piece === "bR" && move.from.row === 0 && move.from.col === 7) position.castling.bK = false;
    if (captured === "wR" && move.to.row === 7 && move.to.col === 0) position.castling.wQ = false;
    if (captured === "wR" && move.to.row === 7 && move.to.col === 7) position.castling.wK = false;
    if (captured === "bR" && move.to.row === 0 && move.to.col === 0) position.castling.bQ = false;
    if (captured === "bR" && move.to.row === 0 && move.to.col === 7) position.castling.bK = false;
  }

  function applyMove(position, move, options = {}) {
    const piece = position.board[move.from.row][move.from.col];
    const color = colorOf(piece);
    const captured = move.enPassant ? position.board[move.from.row][move.to.col] : position.board[move.to.row][move.to.col];
    position.board[move.from.row][move.from.col] = null;
    if (move.enPassant) position.board[move.from.row][move.to.col] = null;
    position.board[move.to.row][move.to.col] = move.promotion ? `${color}${move.promotion}` : piece;
    if (move.castle === "king") {
      position.board[move.to.row][5] = position.board[move.to.row][7];
      position.board[move.to.row][7] = null;
    }
    if (move.castle === "queen") {
      position.board[move.to.row][3] = position.board[move.to.row][0];
      position.board[move.to.row][0] = null;
    }
    updateCastlingRights(position, piece, move, captured);
    position.enPassant = move.doublePawn ? { row: (move.from.row + move.to.row) / 2, col: move.from.col } : null;
    position.halfMove = typeOf(piece) === "P" || captured ? 0 : (position.halfMove || 0) + 1;
    if (color === "b") position.fullMove = (position.fullMove || 1) + 1;
    position.turn = other(color);
    if (options.updateStatus !== false) updateGameStatus(position);
  }

  function updateGameStatus(position) {
    const moves = allLegalMoves(position, position.turn);
    position.winner = null;
    position.draw = false;
    if (!moves.length) {
      if (isInCheck(position, position.turn)) position.winner = other(position.turn);
      else position.draw = true;
    } else if ((position.halfMove || 0) >= 100) {
      position.draw = true;
    }
  }

  function evaluate(position) {
    if (position.winner === "b") return 999999;
    if (position.winner === "w") return -999999;
    if (position.draw) return 0;
    let score = 0;
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const piece = position.board[row][col];
        if (!piece) continue;
        const color = colorOf(piece);
        const type = typeOf(piece);
        const tableRow = color === "w" ? row : 7 - row;
        const value = VALUES[type] + (PIECE_SQUARES[type]?.[tableRow]?.[col] || 0);
        score += color === "b" ? value : -value;
      }
    }
    const sideMoves = allLegalMoves(position, position.turn).length;
    score += position.turn === "b" ? sideMoves * 2 : -sideMoves * 2;
    if (isInCheck(position, "w")) score += 35;
    if (isInCheck(position, "b")) score -= 35;
    return score;
  }

  function orderedMoves(position, moves) {
    return moves.slice().sort((a, b) => moveGuess(position, b) - moveGuess(position, a));
  }

  function moveGuess(position, move) {
    const piece = position.board[move.from.row][move.from.col];
    const captured = move.enPassant ? `${other(colorOf(piece))}P` : position.board[move.to.row][move.to.col];
    let score = (VALUES[typeOf(captured)] || 0) * 10 - (VALUES[typeOf(piece)] || 0);
    if (move.promotion) score += VALUES.Q;
    if (move.castle) score += 45;
    return score;
  }

  function minimax(position, depth, alpha, beta) {
    updateGameStatus(position);
    if (depth <= 0 || position.winner || position.draw) return evaluate(position);
    const maximizing = position.turn === "b";
    const moves = orderedMoves(position, allLegalMoves(position, position.turn));
    if (!moves.length) return evaluate(position);
    if (maximizing) {
      let best = -Infinity;
      for (const move of moves) {
        const next = clone(position);
        applyMove(next, clone(move));
        best = Math.max(best, minimax(next, depth - 1, alpha, beta));
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
      return best;
    }
    let best = Infinity;
    for (const move of moves) {
      const next = clone(position);
      applyMove(next, clone(move));
      best = Math.min(best, minimax(next, depth - 1, alpha, beta));
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  function chooseComputerMove(moves) {
    const difficulty = storedDifficulty();
    if (difficulty === "easy") {
      const captures = moves.filter((move) => move.capture);
      const pool = captures.length && Math.random() < 0.65 ? captures : moves;
      return pool[Math.floor(Math.random() * pool.length)];
    }
    const depth = difficulty === "hard" ? 3 : 2;
    const jitter = difficulty === "hard" ? 4 : 22;
    const scored = orderedMoves(state, moves).map((move) => {
      const next = clone(state);
      applyMove(next, clone(move));
      return { move, score: minimax(next, depth - 1, -Infinity, Infinity) + (Math.random() * jitter) };
    }).sort((a, b) => b.score - a.score);
    const best = scored[0].score;
    const nearBest = scored.filter((item) => best - item.score <= (difficulty === "hard" ? 8 : 35));
    return nearBest[Math.floor(Math.random() * nearBest.length)].move;
  }

  function computerMove() {
    if (state.winner || state.draw || state.turn !== "b") return;
    const moves = allLegalMoves(state, "b");
    if (!moves.length) {
      updateGameStatus(state);
      render();
      return;
    }
    applyMove(state, chooseComputerMove(moves));
    state.turn = "w";
    render();
  }

  function rememberUndo() {
    undoSnapshot = clone(state);
    els.undo.disabled = false;
  }

  function statusText() {
    if (state.draw) return t("chessStalemate");
    if (state.winner) return t("chessCheckmate", { winner: state.winner === "w" ? t("youWon") : t("computerWon") });
    if (isInCheck(state, state.turn)) return t("chessCheck");
    return state.turn === "w" ? t("yourTurn") : t("chessThinking");
  }

  function render() {
    els.board.innerHTML = "";
    const targetSet = new Set(legalTargets.map((move) => `${move.to.row},${move.to.col}`));
    const checkedKing = !state.winner && !state.draw && isInCheck(state, state.turn) ? findKing(state.board, state.turn) : null;
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
        if (checkedKing && checkedKing.row === row && checkedKing.col === col) square.classList.add("check");
        square.setAttribute("aria-label", t("chessSquare", { file: "abcdefgh"[col], rank: 8 - row }));
        if (piece) {
          const span = document.createElement("span");
          span.className = `piece ${piece[0] === "w" ? "white" : "black"}`;
          span.textContent = typeOf(piece);
          square.appendChild(span);
        }
        square.addEventListener("click", onSquareClick);
        els.board.appendChild(square);
      }
    }
    els.status.textContent = statusText();
    saveState();
  }

  function onSquareClick(event) {
    if (state.turn !== "w" || state.winner || state.draw) return;
    const row = Number(event.currentTarget.dataset.row);
    const col = Number(event.currentTarget.dataset.col);
    const chosenMove = legalTargets.find((move) => move.to.row === row && move.to.col === col);
    if (chosenMove) {
      rememberUndo();
      applyMove(state, chosenMove);
      selected = null;
      legalTargets = [];
      render();
      if (!state.winner && !state.draw) window.setTimeout(computerMove, storedDifficulty() === "hard" ? 180 : 120);
      return;
    }
    if (colorOf(state.board[row][col]) === "w") {
      selected = { row, col };
      legalTargets = legalMovesFor(state, row, col);
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
  updateGameStatus(state);
  render();
  registerServiceWorker();
})();
