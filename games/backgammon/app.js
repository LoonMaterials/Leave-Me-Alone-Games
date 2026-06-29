(function () {
  "use strict";
  const STORAGE_KEY = "leave-me-alone-backgammon-current-game";
  const DIFFICULTY_KEY = "leave-me-alone-backgammon-difficulty";
  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange"]);
  const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
  const POINTS = 24;
  const els = { track: document.getElementById("track"), status: document.getElementById("status"), roll: document.getElementById("roll"), undo: document.getElementById("undo"), newGame: document.getElementById("new-game"), difficulty: document.getElementById("difficulty"), playerOff: document.getElementById("player-off"), computerOff: document.getElementById("computer-off") };
  let state = null, undoSnapshot = null, selected = null, lastTapAt = 0;
  function t(key, values) { return window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key; }
  function storedDifficulty() { try { const difficulty = localStorage.getItem(DIFFICULTY_KEY); return DIFFICULTIES.has(difficulty) ? difficulty : "easy"; } catch { return "easy"; } }
  function applyDifficulty() { if (els.difficulty) els.difficulty.value = storedDifficulty(); }
  function saveDifficulty() { if (!els.difficulty) return; try { localStorage.setItem(DIFFICULTY_KEY, DIFFICULTIES.has(els.difficulty.value) ? els.difficulty.value : "easy"); } catch {} }
  function applyTheme() { try { const theme = localStorage.getItem(THEME_KEY); document.body.dataset.theme = THEMES.has(theme) ? theme : "colorblind"; } catch { document.body.dataset.theme = "colorblind"; } }
  function freshState() { const points = Array.from({ length: POINTS }, () => ({ p: 0, c: 0 })); points[0].p = 15; points[23].c = 15; return { points, playerOff: 0, computerOff: 0, turn: "p", dice: [], winner: null }; }
  function clone(source) { return JSON.parse(JSON.stringify(source)); }
  function saveState() { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function loadState() { try { const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY)); return saved?.points?.length === POINTS ? saved : null; } catch { return null; } }
  function rollDice() { const a = 1 + Math.floor(Math.random() * 6), b = 1 + Math.floor(Math.random() * 6); state.dice = a === b ? [a, a, a, a] : [a, b]; }
  function legalTargets(from) {
    if (state.turn !== "p" || state.winner || !state.dice.length || !state.points[from]?.p) return [];
    return state.dice.map((die, dieIndex) => ({ to: from + die, dieIndex })).filter(move => move.to <= POINTS);
  }
  function canMovePlayer() { return state.points.some((point, index) => point.p && legalTargets(index).length); }
  function rememberUndo() { undoSnapshot = clone(state); els.undo.disabled = false; }
  function movePlayer(from, move) {
    state.points[from].p -= 1;
    if (move.to >= POINTS) state.playerOff += 1; else state.points[move.to].p += 1;
    state.dice.splice(move.dieIndex, 1);
    selected = null;
    if (state.playerOff >= 15) state.winner = "p";
    if (!state.dice.length || !canMovePlayer()) { state.turn = "c"; state.dice = []; render(); window.setTimeout(computerTurn, 360); return; }
    render();
  }
  function computerTurn() {
    if (state.winner) return;
    if (!state.dice.length) rollDice();
    while (state.dice.length) {
      const move = chooseComputerMove();
      if (!move) break;
      const { from, dieIndex } = move;
      const to = from - state.dice[dieIndex];
      state.points[from].c -= 1;
      if (to < 0) state.computerOff += 1; else state.points[to].c += 1;
      state.dice.splice(dieIndex, 1);
      if (state.computerOff >= 15) { state.winner = "c"; break; }
    }
    state.turn = "p"; state.dice = []; render();
  }
  function legalComputerMoves() {
    const moves = [];
    state.points.forEach((point, from) => {
      if (!point.c) return;
      state.dice.forEach((die, dieIndex) => { if (from - die >= -1) moves.push({ from, dieIndex, die, to: from - die }); });
    });
    return moves;
  }
  function chooseComputerMove() {
    const moves = legalComputerMoves();
    if (!moves.length) return null;
    if (storedDifficulty() === "easy") return moves[Math.floor(Math.random() * moves.length)];
    const scored = moves.map((move) => ({ move, score: computerMoveScore(move) })).sort((a, b) => b.score - a.score);
    return scored[0].move;
  }
  function computerMoveScore(move) {
    const bearOff = move.to < 0 ? 40 : 0;
    const advance = move.die * (storedDifficulty() === "hard" ? 4 : 2);
    const stackBonus = move.to >= 0 ? Math.min(state.points[move.to].c, 3) * 3 : 0;
    const farthestBonus = storedDifficulty() === "hard" ? move.from : 0;
    return bearOff + advance + stackBonus + farthestBonus + Math.random();
  }
  function render() {
    els.track.innerHTML = "";
    const legal = selected == null ? [] : legalTargets(selected);
    const legalSet = new Set(legal.map(move => String(move.to)));
    for (let index = POINTS - 1; index >= 0; index -= 1) {
      const point = document.createElement("button");
      point.type = "button"; point.className = "point"; point.dataset.index = String(index);
      if (selected === index || legalSet.has(String(index))) point.classList.add("legal");
      point.setAttribute("aria-label", t("backgammonPoint", { point: index + 1 }));
      const count = state.points[index].p + state.points[index].c;
      const type = state.points[index].p ? "player" : state.points[index].c ? "computer" : "";
      for (let i = 0; i < Math.min(count, 5); i += 1) { const checker = document.createElement("span"); checker.className = `checker ${type}`; point.appendChild(checker); }
      if (count > 5) point.appendChild(document.createTextNode(`+${count - 5}`));
      point.addEventListener("click", onPointClick);
      els.track.appendChild(point);
    }
    els.playerOff.textContent = t("backgammonPlayerOff", { count: state.playerOff });
    els.computerOff.textContent = t("backgammonComputerOff", { count: state.computerOff });
    els.roll.disabled = state.turn !== "p" || state.winner || state.dice.length > 0;
    els.status.textContent = state.winner ? t(state.winner === "p" ? "youWon" : "computerWon") : state.dice.length ? t("diceShowing", { dice: state.dice.join(", ") }) : t("rollDicePrompt");
    saveState();
  }
  function onPointClick(event) {
    if (state.turn !== "p" || state.winner || !state.dice.length) return;
    const index = Number(event.currentTarget.dataset.index);
    if (selected != null) {
      const move = legalTargets(selected).find(item => item.to === index || (item.to >= POINTS && index === POINTS - 1));
      if (move) { rememberUndo(); movePlayer(selected, move); return; }
    }
    selected = state.points[index].p ? index : null;
    render();
  }
  function roll() { if (state.turn !== "p" || state.winner || state.dice.length) return; rememberUndo(); rollDice(); if (!canMovePlayer()) { state.turn = "c"; state.dice = []; window.setTimeout(computerTurn, 360); } render(); }
  function startNewGame() { state = freshState(); selected = null; undoSnapshot = null; els.undo.disabled = true; render(); }
  function undo() { if (!undoSnapshot) return; state = clone(undoSnapshot); selected = null; undoSnapshot = null; els.undo.disabled = true; render(); }
  function preventBrowserDoubleClick(event) { const now = Date.now(); if (now - lastTapAt < 420) event.preventDefault(); lastTapAt = now; }
  function preventViewportMove(event) { event.preventDefault(); }
  function preventGestureZoom(event) { event.preventDefault(); }
  function applyLanguage() { if (window.LMAG_I18N) window.LMAG_I18N.apply(document); render(); }
  function registerServiceWorker() { if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {})); }
  els.roll.addEventListener("click", roll); els.newGame.addEventListener("click", startNewGame); els.undo.addEventListener("click", undo); if (els.difficulty) els.difficulty.addEventListener("change", saveDifficulty);
  document.addEventListener("contextmenu", e => e.preventDefault()); document.addEventListener("dblclick", preventBrowserDoubleClick, { capture: true }); document.addEventListener("dragstart", e => e.preventDefault()); document.addEventListener("touchmove", preventViewportMove, { passive: false }); document.addEventListener("gesturestart", preventGestureZoom); document.addEventListener("gesturechange", preventGestureZoom); document.addEventListener("gestureend", preventGestureZoom); document.addEventListener("lmag:languagechange", applyLanguage);
  applyTheme(); applyDifficulty(); state = loadState() || freshState(); render(); registerServiceWorker();
})();
