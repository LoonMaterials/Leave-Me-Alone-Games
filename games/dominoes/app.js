(function () {
  "use strict";
  const STORAGE_KEY = "leave-me-alone-dominoes-current-game";
  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["green", "blue", "grey", "orange"]);
  const els = { opponent: document.getElementById("opponent"), chain: document.getElementById("chain"), hand: document.getElementById("hand"), draw: document.getElementById("draw"), status: document.getElementById("status"), undo: document.getElementById("undo"), newGame: document.getElementById("new-game") };
  let state = null, undoSnapshot = null, lastTapAt = 0;
  function t(key, values) { return window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key; }
  function applyTheme() { try { const theme = localStorage.getItem(THEME_KEY); document.body.dataset.theme = THEMES.has(theme) ? theme : "green"; } catch { document.body.dataset.theme = "green"; } }
  function makeSet() { const tiles = []; let id = 0; for (let a = 0; a <= 6; a += 1) for (let b = a; b <= 6; b += 1) tiles.push({ id: `d${id++}`, a, b }); return shuffle(tiles); }
  function shuffle(items) { const copy = items.slice(); for (let i = copy.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; }
  function freshState() {
    const boneyard = makeSet(), player = boneyard.splice(0, 7), computer = boneyard.splice(0, 7);
    const starter = boneyard.shift();
    return { player, computer, boneyard, chain: [starter], left: starter.a, right: starter.b, turn: "p", winner: null, message: "" };
  }
  function clone(source) { return JSON.parse(JSON.stringify(source)); }
  function saveState() { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function loadState() { try { const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY)); return saved?.player && saved?.computer && saved?.chain ? saved : null; } catch { return null; } }
  function canPlay(tile) { return tile.a === state.left || tile.b === state.left || tile.a === state.right || tile.b === state.right; }
  function playableSide(tile) {
    if (tile.a === state.left || tile.b === state.left) return "left";
    if (tile.a === state.right || tile.b === state.right) return "right";
    return null;
  }
  function orient(tile, side) {
    if (side === "left") return tile.b === state.left ? { ...tile, a: tile.a, b: tile.b } : { ...tile, a: tile.b, b: tile.a };
    return tile.a === state.right ? { ...tile, a: tile.a, b: tile.b } : { ...tile, a: tile.b, b: tile.a };
  }
  function playTile(owner, tileId) {
    const hand = owner === "p" ? state.player : state.computer;
    const index = hand.findIndex((tile) => tile.id === tileId);
    if (index < 0) return false;
    const tile = hand[index];
    const side = playableSide(tile);
    if (!side) return false;
    const placed = orient(tile, side);
    hand.splice(index, 1);
    if (side === "left") { state.chain.unshift(placed); state.left = placed.a; }
    else { state.chain.push(placed); state.right = placed.b; }
    if (!hand.length) state.winner = owner;
    return true;
  }
  function drawTile(owner) {
    if (!state.boneyard.length) return false;
    const hand = owner === "p" ? state.player : state.computer;
    hand.push(state.boneyard.shift());
    return true;
  }
  function computerTurn() {
    if (state.winner) return;
    let tile = state.computer.find(canPlay);
    while (!tile && state.boneyard.length) { drawTile("c"); tile = state.computer.find(canPlay); }
    if (tile) playTile("c", tile.id);
    state.turn = "p";
    if (!state.player.some(canPlay) && !state.computer.some(canPlay) && !state.boneyard.length) {
      const playerPips = state.player.reduce((sum, tile) => sum + tile.a + tile.b, 0);
      const computerPips = state.computer.reduce((sum, tile) => sum + tile.a + tile.b, 0);
      state.winner = playerPips <= computerPips ? "p" : "c";
    }
    render();
  }
  function rememberUndo() { undoSnapshot = clone(state); els.undo.disabled = false; }
  function dominoEl(tile, playable) {
    const button = document.createElement("button");
    button.type = "button"; button.className = `domino${playable ? " playable" : ""}`; button.dataset.id = tile.id;
    button.setAttribute("aria-label", t("dominoTile", { left: tile.a, right: tile.b }));
    const left = document.createElement("span"); left.textContent = String(tile.a);
    const right = document.createElement("span"); right.textContent = String(tile.b);
    button.append(left, right);
    return button;
  }
  function render() {
    els.chain.innerHTML = ""; els.hand.innerHTML = "";
    state.chain.forEach((tile) => els.chain.appendChild(dominoEl(tile, false)));
    state.player.forEach((tile) => { const el = dominoEl(tile, canPlay(tile)); el.disabled = state.turn !== "p" || !canPlay(tile) || Boolean(state.winner); el.addEventListener("click", onTileClick); els.hand.appendChild(el); });
    els.draw.disabled = state.turn !== "p" || Boolean(state.winner) || state.player.some(canPlay) || !state.boneyard.length;
    els.opponent.textContent = t("dominoesOpponent", { count: state.computer.length, boneyard: state.boneyard.length });
    els.status.textContent = state.winner ? t(state.winner === "p" ? "youWon" : "computerWon") : state.player.some(canPlay) ? t("yourTurn") : state.boneyard.length ? t("dominoesDrawPrompt") : t("dominoesBlocked");
    saveState();
  }
  function onTileClick(event) {
    if (state.turn !== "p" || state.winner) return;
    rememberUndo();
    if (playTile("p", event.currentTarget.dataset.id)) { state.turn = "c"; render(); window.setTimeout(computerTurn, 340); }
    else render();
  }
  function drawForPlayer() {
    if (state.turn !== "p" || state.winner || state.player.some(canPlay)) return;
    rememberUndo(); drawTile("p"); render();
  }
  function startNewGame() { state = freshState(); undoSnapshot = null; els.undo.disabled = true; render(); }
  function undo() { if (!undoSnapshot) return; state = clone(undoSnapshot); undoSnapshot = null; els.undo.disabled = true; render(); }
  function preventBrowserDoubleClick(event) { const now = Date.now(); if (now - lastTapAt < 420) event.preventDefault(); lastTapAt = now; }
  function preventViewportMove(event) { if (!event.target.closest(".hand, .chain")) event.preventDefault(); }
  function preventGestureZoom(event) { event.preventDefault(); }
  function applyLanguage() { if (window.LMAG_I18N) window.LMAG_I18N.apply(document); render(); }
  function registerServiceWorker() { if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("../../sw.js").catch(() => {})); }
  els.newGame.addEventListener("click", startNewGame); els.undo.addEventListener("click", undo); els.draw.addEventListener("click", drawForPlayer);
  document.addEventListener("contextmenu", (event) => event.preventDefault()); document.addEventListener("dblclick", preventBrowserDoubleClick, { capture: true }); document.addEventListener("dragstart", (event) => event.preventDefault()); document.addEventListener("touchmove", preventViewportMove, { passive: false }); document.addEventListener("gesturestart", preventGestureZoom); document.addEventListener("gesturechange", preventGestureZoom); document.addEventListener("gestureend", preventGestureZoom); document.addEventListener("lmag:languagechange", applyLanguage);
  applyTheme(); state = loadState() || freshState(); render(); registerServiceWorker();
})();
