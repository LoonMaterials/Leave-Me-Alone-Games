(function () {
  "use strict";

  const STORAGE_KEY = "leave-me-alone-mahjong-current-game";
  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["green", "blue", "grey", "orange"]);

  const TILE_TYPES = [
    { id: "char-1", symbol: "\u{1F007}", label: "mahjongCharacter1" },
    { id: "char-2", symbol: "\u{1F008}", label: "mahjongCharacter2" },
    { id: "char-3", symbol: "\u{1F009}", label: "mahjongCharacter3" },
    { id: "char-4", symbol: "\u{1F00A}", label: "mahjongCharacter4" },
    { id: "char-5", symbol: "\u{1F00B}", label: "mahjongCharacter5" },
    { id: "char-6", symbol: "\u{1F00C}", label: "mahjongCharacter6" },
    { id: "char-7", symbol: "\u{1F00D}", label: "mahjongCharacter7" },
    { id: "char-8", symbol: "\u{1F00E}", label: "mahjongCharacter8" },
    { id: "char-9", symbol: "\u{1F00F}", label: "mahjongCharacter9" },
    { id: "bamboo-1", symbol: "\u{1F010}", label: "mahjongBamboo1" },
    { id: "bamboo-2", symbol: "\u{1F011}", label: "mahjongBamboo2" },
    { id: "bamboo-3", symbol: "\u{1F012}", label: "mahjongBamboo3" },
    { id: "bamboo-4", symbol: "\u{1F013}", label: "mahjongBamboo4" },
    { id: "bamboo-5", symbol: "\u{1F014}", label: "mahjongBamboo5" },
    { id: "bamboo-6", symbol: "\u{1F015}", label: "mahjongBamboo6" },
    { id: "bamboo-7", symbol: "\u{1F016}", label: "mahjongBamboo7" },
    { id: "bamboo-8", symbol: "\u{1F017}", label: "mahjongBamboo8" },
    { id: "bamboo-9", symbol: "\u{1F018}", label: "mahjongBamboo9" }
  ];

  const LAYOUT = [
    ...range(1, 6).map((col) => ({ col, row: 0, layer: 0 })),
    ...range(0, 7).map((col) => ({ col, row: 1, layer: 0 })),
    ...range(0, 7).map((col) => ({ col, row: 2, layer: 0 })),
    ...range(1, 6).map((col) => ({ col, row: 3, layer: 0 })),
    ...range(2, 5).map((col) => ({ col, row: 0.55, layer: 1 })),
    ...range(2, 5).map((col) => ({ col, row: 2.45, layer: 1 }))
  ];

  const els = {
    board: document.getElementById("board"),
    status: document.getElementById("status"),
    undo: document.getElementById("undo"),
    newGame: document.getElementById("new-game"),
    win: document.getElementById("win-message")
  };

  let state = null;
  let selectedId = null;
  let undoSnapshot = null;
  let lastTapAt = 0;

  function range(start, end) {
    const values = [];
    for (let value = start; value <= end; value += 1) values.push(value);
    return values;
  }

  function t(key, values) {
    return window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key;
  }

  function tileType(tile) {
    return TILE_TYPES.find((type) => type.id === tile.type) || TILE_TYPES[0];
  }

  function freshState() {
    const typeIds = shuffle(TILE_TYPES.map((type) => type.id));
    const pool = [];
    const assignments = new Array(LAYOUT.length);
    const openingPairs = [[28, 31], [32, 35]];

    openingPairs.forEach(([first, second]) => {
      const type = typeIds.pop();
      assignments[first] = type;
      assignments[second] = type;
    });
    typeIds.forEach((type) => pool.push(type, type));
    shuffle(pool).forEach((type) => {
      const index = assignments.findIndex((value) => !value);
      assignments[index] = type;
    });

    return {
      tiles: LAYOUT.map((position, index) => ({
        id: `tile-${index}`,
        type: assignments[index],
        removed: false,
        ...position
      })),
      won: false
    };
  }

  function shuffle(items) {
    const shuffled = items.slice();
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
    }
    return shuffled;
  }

  function cloneState(source) {
    return JSON.parse(JSON.stringify(source));
  }

  function saveState() {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadState() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
      if (!saved || !Array.isArray(saved.tiles) || saved.tiles.length !== LAYOUT.length) return null;
      return saved;
    } catch {
      return null;
    }
  }

  function getStoredTheme() {
    try {
      const theme = localStorage.getItem(THEME_KEY);
      return THEMES.has(theme) ? theme : "green";
    } catch {
      return "green";
    }
  }

  function applyTheme() {
    document.body.dataset.theme = getStoredTheme();
  }

  function rememberUndo() {
    undoSnapshot = cloneState(state);
    els.undo.disabled = false;
  }

  function activeTiles() {
    return state.tiles.filter((tile) => !tile.removed);
  }

  function tileById(id) {
    return state.tiles.find((tile) => tile.id === id) || null;
  }

  function hasCoveringTile(tile) {
    return activeTiles().some((other) =>
      other.layer > tile.layer &&
      Math.abs(other.col - tile.col) < 1 &&
      Math.abs(other.row - tile.row) < 1
    );
  }

  function sideBlocked(tile, direction) {
    return activeTiles().some((other) =>
      other.id !== tile.id &&
      other.layer === tile.layer &&
      Math.abs(other.row - tile.row) < 0.76 &&
      Math.abs(other.col - (tile.col + direction)) < 0.12
    );
  }

  function isFree(tile) {
    if (!tile || tile.removed || hasCoveringTile(tile)) return false;
    return !sideBlocked(tile, -1) || !sideBlocked(tile, 1);
  }

  function availableMatches() {
    const freeTiles = activeTiles().filter(isFree);
    const matches = [];
    for (let firstIndex = 0; firstIndex < freeTiles.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < freeTiles.length; secondIndex += 1) {
        if (freeTiles[firstIndex].type === freeTiles[secondIndex].type) {
          matches.push([freeTiles[firstIndex], freeTiles[secondIndex]]);
        }
      }
    }
    return matches;
  }

  function clear(element) {
    while (element.firstChild) element.removeChild(element.firstChild);
  }

  function tileElement(tile) {
    const type = tileType(tile);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tile";
    button.dataset.tileId = tile.id;
    button.style.setProperty("--col", String(tile.col));
    button.style.setProperty("--row", String(tile.row));
    button.style.setProperty("--layer", String(tile.layer));
    button.setAttribute("aria-label", t(type.label));

    const free = isFree(tile);
    button.classList.toggle("free", free);
    button.disabled = !free;
    if (selectedId === tile.id) button.classList.add("selected");

    const symbol = document.createElement("span");
    symbol.className = "tile-symbol";
    symbol.textContent = type.symbol;
    button.appendChild(symbol);
    button.addEventListener("click", onTileClick);
    button.addEventListener("dblclick", (event) => event.preventDefault());
    return button;
  }

  function render() {
    clear(els.board);
    state.tiles
      .filter((tile) => !tile.removed)
      .sort((first, second) => first.layer - second.layer || first.row - second.row || first.col - second.col)
      .forEach((tile) => els.board.appendChild(tileElement(tile)));

    const remaining = activeTiles().length / 2;
    const matches = availableMatches();
    els.status.textContent = state.won
      ? t("complete")
      : matches.length
        ? t("mahjongPairsLeft", { count: remaining })
        : t("mahjongNoMoves");
    els.win.hidden = !state.won;
    saveState();
  }

  function onTileClick(event) {
    event.preventDefault();
    const tile = tileById(event.currentTarget.dataset.tileId);
    if (!isFree(tile) || state.won) return;

    if (!selectedId) {
      selectedId = tile.id;
      render();
      return;
    }

    const selected = tileById(selectedId);
    if (selected && selected.id !== tile.id && selected.type === tile.type && isFree(selected)) {
      rememberUndo();
      selected.removed = true;
      tile.removed = true;
      selectedId = null;
      updateWin();
      render();
      return;
    }

    selectedId = selectedId === tile.id ? null : tile.id;
    render();
  }

  function updateWin() {
    state.won = state.tiles.every((tile) => tile.removed);
  }

  function startNewGame() {
    state = freshState();
    selectedId = null;
    undoSnapshot = null;
    els.undo.disabled = true;
    render();
  }

  function undo() {
    if (!undoSnapshot) return;
    state = cloneState(undoSnapshot);
    selectedId = null;
    undoSnapshot = null;
    els.undo.disabled = true;
    render();
  }

  function applyLanguage() {
    if (window.LMAG_I18N) window.LMAG_I18N.apply(document);
    render();
  }

  function preventBrowserDoubleClick(event) {
    const now = Date.now();
    if (now - lastTapAt < 420) event.preventDefault();
    lastTapAt = now;
  }

  function preventViewportMove(event) {
    event.preventDefault();
  }

  function preventGestureZoom(event) {
    event.preventDefault();
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("../../sw.js").catch(() => {});
      });
    }
  }

  els.newGame.addEventListener("click", startNewGame);
  els.undo.addEventListener("click", undo);
  document.addEventListener("contextmenu", (event) => event.preventDefault());
  document.addEventListener("dblclick", preventBrowserDoubleClick, { capture: true });
  document.addEventListener("dragstart", (event) => event.preventDefault());
  document.addEventListener("touchmove", preventViewportMove, { passive: false });
  document.addEventListener("gesturestart", preventGestureZoom);
  document.addEventListener("gesturechange", preventGestureZoom);
  document.addEventListener("gestureend", preventGestureZoom);
  document.addEventListener("lmag:languagechange", applyLanguage);

  applyTheme();
  state = loadState() || freshState();
  updateWin();
  render();
  registerServiceWorker();
})();
