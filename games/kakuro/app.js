(function () {
  "use strict";

  const THEME_KEY = "leave-me-alone-games-theme";
  const THEMES = new Set(["colorblind", "green", "blue", "grey", "orange"]);
  const KEY = "leave-me-alone-kakuro-current-game";
  const SAVE_VERSION = 2;
  const board = document.getElementById("game-board");
  const status = document.getElementById("status");
  const undoButton = document.getElementById("undo-button");
  const t = (key, values) => window.LMAG_I18N ? window.LMAG_I18N.t(key, values) : key;
  const PUZZLES = [
    {
      id: "starter",
      size: 7,
      blocks: [
        [1,1,1,1,1,1,1],
        [1,1,1,0,0,1,1],
        [1,1,0,0,0,1,1],
        [1,0,0,1,0,0,1],
        [1,0,0,0,1,0,1],
        [1,1,0,0,0,0,1],
        [1,1,1,1,1,1,1],
      ],
      solution: {
        "1,3": 4, "1,4": 7,
        "2,2": 6, "2,3": 1, "2,4": 8,
        "3,1": 8, "3,2": 7, "3,4": 5, "3,5": 9,
        "4,1": 9, "4,2": 4, "4,3": 3, "4,5": 1,
        "5,2": 2, "5,3": 9, "5,4": 6, "5,5": 3,
      },
    },
    {
      id: "cross",
      size: 7,
      blocks: [
        [1,1,1,1,1,1,1],
        [1,1,0,0,1,0,0],
        [1,0,0,0,0,0,0],
        [1,0,0,1,0,0,1],
        [1,1,0,0,0,0,1],
        [1,0,0,1,0,0,1],
        [1,1,1,1,1,1,1],
      ],
      solution: {
        "1,2": 3, "1,3": 6, "1,5": 4, "1,6": 8,
        "2,1": 2, "2,2": 9, "2,3": 1, "2,4": 7, "2,5": 6, "2,6": 5,
        "3,1": 7, "3,2": 8, "3,4": 3, "3,5": 9,
        "4,2": 5, "4,3": 4, "4,4": 8, "4,5": 1,
        "5,1": 6, "5,2": 1, "5,4": 5, "5,5": 2,
      },
    },
    {
      id: "wide",
      size: 8,
      blocks: [
        [1,1,1,1,1,1,1,1],
        [1,1,0,0,1,0,0,1],
        [1,0,0,0,0,0,0,1],
        [1,0,0,1,0,0,0,1],
        [1,1,0,0,0,1,0,1],
        [1,0,0,0,1,0,0,1],
        [1,0,0,1,0,0,1,1],
        [1,1,1,1,1,1,1,1],
      ],
      solution: {
        "1,2": 8, "1,3": 3, "1,5": 9, "1,6": 7,
        "2,1": 4, "2,2": 6, "2,3": 2, "2,4": 8, "2,5": 1, "2,6": 5,
        "3,1": 9, "3,2": 1, "3,4": 6, "3,5": 2, "3,6": 4,
        "4,2": 7, "4,3": 9, "4,4": 5, "4,6": 3,
        "5,1": 3, "5,2": 8, "5,3": 6, "5,5": 4, "5,6": 1,
        "6,1": 5, "6,2": 4, "6,4": 7, "6,5": 8,
      },
    },
  ];
  let undoStack = [];
  let state;

  function applyTheme() {
    try {
      const theme = localStorage.getItem(THEME_KEY);
      const selectedTheme = THEMES.has(theme) ? theme : "colorblind";
      document.body.classList.remove("theme-colorblind", "theme-blue", "theme-grey", "theme-orange");
      if (selectedTheme !== "green") document.body.classList.add(`theme-${selectedTheme}`);
    } catch {}
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function key(row, col) {
    return `${row},${col}`;
  }

  function isOpen(puzzle, row, col) {
    return puzzle.blocks[row]?.[col] === 0;
  }

  function clueFor(puzzle, row, col) {
    const down = [];
    const across = [];
    if (!isOpen(puzzle, row + 1, col)) {
      // no down clue
    } else if (!isOpen(puzzle, row - 1, col)) {
      let next = row + 1;
      while (isOpen(puzzle, next, col)) {
        down.push(puzzle.solution[key(next, col)]);
        next += 1;
      }
    }
    if (!isOpen(puzzle, row, col + 1)) {
      // no across clue
    } else if (!isOpen(puzzle, row, col - 1)) {
      let next = col + 1;
      while (isOpen(puzzle, row, next)) {
        across.push(puzzle.solution[key(row, next)]);
        next += 1;
      }
    }
    return {
      down: down.length > 1 ? down.reduce((sum, value) => sum + value, 0) : null,
      across: across.length > 1 ? across.reduce((sum, value) => sum + value, 0) : null,
    };
  }

  function runsForCell(puzzle, row, col) {
    const runs = [];
    let start = col;
    while (isOpen(puzzle, row, start - 1)) start -= 1;
    let cells = [];
    let scan = start;
    while (isOpen(puzzle, row, scan)) {
      cells.push(key(row, scan));
      scan += 1;
    }
    if (cells.length > 1) runs.push(cells);
    start = row;
    while (isOpen(puzzle, start - 1, col)) start -= 1;
    cells = [];
    scan = start;
    while (isOpen(puzzle, scan, col)) {
      cells.push(key(scan, col));
      scan += 1;
    }
    if (cells.length > 1) runs.push(cells);
    return runs;
  }

  function fresh() {
    const puzzle = randomItem(PUZZLES);
    const values = {};
    Object.keys(puzzle.solution).forEach((cell) => { values[cell] = ""; });
    return { version: SAVE_VERSION, puzzleId: puzzle.id, values };
  }

  function currentPuzzle() {
    return PUZZLES.find((puzzle) => puzzle.id === state?.puzzleId) || PUZZLES[0];
  }

  function save() {
    try { sessionStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  }

  function load() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(KEY));
      if (saved?.version !== SAVE_VERSION || !PUZZLES.some((puzzle) => puzzle.id === saved.puzzleId) || !saved.values) return fresh();
      return saved;
    } catch {
      return fresh();
    }
  }

  function remember() {
    undoStack.push(clone(state));
    if (undoStack.length > 40) undoStack.shift();
  }

  function runHasConflict(puzzle, cells) {
    const values = cells.map((cell) => Number(state.values[cell]) || 0).filter(Boolean);
    return values.length !== new Set(values).size;
  }

  function isConflict(puzzle, row, col) {
    const value = Number(state.values[key(row, col)]) || 0;
    if (!value) return false;
    return runsForCell(puzzle, row, col).some((cells) => runHasConflict(puzzle, cells));
  }

  function renderClue(clue) {
    const cell = document.createElement("div");
    cell.className = "kakuro-clue";
    if (clue.down) {
      const down = document.createElement("span");
      down.className = "clue-down";
      down.textContent = `↓${clue.down}`;
      cell.appendChild(down);
    }
    if (clue.across) {
      const across = document.createElement("span");
      across.className = "clue-across";
      across.textContent = `→${clue.across}`;
      cell.appendChild(across);
    }
    return cell;
  }

  function render() {
    const puzzle = currentPuzzle();
    board.textContent = "";
    board.className = "board kakuro-grid";
    board.style.setProperty("--kakuro-size", String(puzzle.size));
    for (let row = 0; row < puzzle.size; row += 1) {
      for (let col = 0; col < puzzle.size; col += 1) {
        if (!isOpen(puzzle, row, col)) {
          board.appendChild(renderClue(clueFor(puzzle, row, col)));
          continue;
        }
        const cell = document.createElement("div");
        cell.className = `kakuro-cell ${isConflict(puzzle, row, col) ? "conflict" : ""}`;
        const input = document.createElement("input");
        input.inputMode = "numeric";
        input.pattern = "[1-9]*";
        input.maxLength = 1;
        input.value = state.values[key(row, col)] || "";
        input.setAttribute("aria-label", t("puzzleCell", { row: row + 1, col: col + 1 }));
        input.addEventListener("input", () => {
          remember();
          state.values[key(row, col)] = input.value.replace(/[^1-9]/g, "").slice(0, 1);
          save();
          undoButton.disabled = false;
          render();
        });
        cell.appendChild(input);
        board.appendChild(cell);
      }
    }
    status.textContent = t("kakuroPrompt");
    undoButton.disabled = undoStack.length === 0;
  }

  function check() {
    const puzzle = currentPuzzle();
    const solved = Object.keys(puzzle.solution).every((cell) => Number(state.values[cell]) === puzzle.solution[cell]);
    status.textContent = t(solved ? "puzzleSolved" : "puzzleTryAgain");
  }

  function newGame() {
    state = fresh();
    undoStack = [];
    save();
    render();
  }

  function undo() {
    if (!undoStack.length) return;
    state = undoStack.pop();
    save();
    render();
  }

  applyTheme();
  state = load();
  save();
  document.getElementById("check-button").addEventListener("click", check);
  document.getElementById("new-game-button").addEventListener("click", newGame);
  undoButton.addEventListener("click", undo);
  document.addEventListener("lmag:languagechange", render);
  render();
})();
