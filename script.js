const display = document.querySelector("#display");
const keys = document.querySelector(".keys");

let current = "0";
let previous = null;
let operator = null;
let overwrite = false;

function render() {
  display.textContent = current;
  document.querySelectorAll("[data-op]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.op === operator && overwrite);
  });
}

function format(value) {
  if (value === "错误") return value;
  if (!Number.isFinite(value)) return "错误";
  const text = String(parseFloat(value.toPrecision(12)));
  return text.length > 12 ? value.toExponential(6) : text;
}

function calculate(left, op, right) {
  const a = parseFloat(left);
  const b = parseFloat(right);
  if (op === "+") return a + b;
  if (op === "-") return a - b;
  if (op === "*") return a * b;
  if (op === "/") return b === 0 ? "错误" : a / b;
  return b;
}

function inputDigit(digit) {
  if (overwrite || current === "错误") {
    current = digit;
    overwrite = false;
  } else {
    current = current === "0" ? digit : current + digit;
  }
  render();
}

function inputDot() {
  if (overwrite || current === "错误") {
    current = "0.";
    overwrite = false;
  } else if (!current.includes(".")) {
    current += ".";
  }
  render();
}

function clearAll() {
  current = "0";
  previous = null;
  operator = null;
  overwrite = false;
  render();
}

function toggleSign() {
  if (current === "0" || current === "错误") return;
  current = current.startsWith("-") ? current.slice(1) : `-${current}`;
  render();
}

function percent() {
  if (current === "错误") return;
  current = format(parseFloat(current) / 100);
  render();
}

function chooseOperator(nextOperator) {
  if (current === "错误") return;
  if (operator && !overwrite) {
    const result = calculate(previous, operator, current);
    current = format(result);
    previous = current;
  } else {
    previous = current;
  }
  operator = nextOperator;
  overwrite = true;
  render();
}

function equals() {
  if (!operator || previous === null || current === "错误") return;
  current = format(calculate(previous, operator, current));
  previous = null;
  operator = null;
  overwrite = true;
  render();
}

keys.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.digit) inputDigit(button.dataset.digit);
  if (button.dataset.op) chooseOperator(button.dataset.op);
  if (button.dataset.action === "dot") inputDot();
  if (button.dataset.action === "clear") clearAll();
  if (button.dataset.action === "sign") toggleSign();
  if (button.dataset.action === "percent") percent();
  if (button.dataset.action === "equals") equals();
});

document.addEventListener("keydown", (event) => {
  if (event.target.closest(".mines, .tetris")) return;

  if (event.key >= "0" && event.key <= "9") inputDigit(event.key);
  if (event.key === ".") inputDot();
  if (["+", "-", "*", "/"].includes(event.key)) chooseOperator(event.key);
  if (event.key === "Enter" || event.key === "=") {
    event.preventDefault();
    equals();
  }
  if (event.key === "Escape") clearAll();
  if (event.key === "Backspace") {
    event.preventDefault();
    if (overwrite || current.length === 1 || current === "错误") {
      current = "0";
      overwrite = false;
    } else {
      current = current.slice(0, -1);
    }
    render();
  }
});

const ROWS = 9;
const COLS = 9;
const MINE_COUNT = 10;

const boardEl = document.querySelector("#mine-board");
const mineCountEl = document.querySelector("#mine-count");
const mineTimeEl = document.querySelector("#mine-time");
const mineResetEl = document.querySelector("#mine-reset");

let grid = [];
let started = false;
let finished = false;
let flags = 0;
let opened = 0;
let seconds = 0;
let timer = null;

function pad(value) {
  if (value < 0) return `-${String(Math.min(99, -value)).padStart(2, "0")}`;
  return String(Math.min(999, value)).padStart(3, "0");
}

function neighbors(row, col) {
  const around = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const nextRow = row + dr;
      const nextCol = col + dc;
      if (nextRow >= 0 && nextRow < ROWS && nextCol >= 0 && nextCol < COLS) {
        around.push([nextRow, nextCol]);
      }
    }
  }
  return around;
}

function cellButton(row, col) {
  return boardEl.children[row * COLS + col];
}

function paintCell(row, col) {
  const cell = grid[row][col];
  const button = cellButton(row, col);
  button.className = "cell";
  button.textContent = "";
  button.removeAttribute("data-n");

  if (cell.flag && !cell.open) {
    button.classList.add("is-flag");
    button.textContent = "🚩";
    button.setAttribute("aria-label", "已插旗");
    return;
  }

  if (!cell.open) {
    button.setAttribute("aria-label", "未翻开");
    return;
  }

  button.classList.add("is-open");
  if (cell.mine) {
    button.classList.add("is-mine");
    button.textContent = "💣";
    button.setAttribute("aria-label", "地雷");
    return;
  }

  if (cell.count > 0) {
    button.dataset.n = String(cell.count);
    button.textContent = String(cell.count);
    button.setAttribute("aria-label", `周围有 ${cell.count} 颗雷`);
  } else {
    button.setAttribute("aria-label", "空白");
  }
}

function placeMines(safeRow, safeCol) {
  let placed = 0;
  while (placed < MINE_COUNT) {
    const row = Math.floor(Math.random() * ROWS);
    const col = Math.floor(Math.random() * COLS);
    if ((row === safeRow && col === safeCol) || grid[row][col].mine) continue;
    grid[row][col].mine = true;
    placed += 1;
  }

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (grid[row][col].mine) continue;
      grid[row][col].count = neighbors(row, col).filter(([r, c]) => grid[r][c].mine).length;
    }
  }
}

function stopTimer() {
  clearInterval(timer);
  timer = null;
}

function revealMines(hitRow, hitCol) {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (!grid[row][col].mine) continue;
      grid[row][col].open = true;
      grid[row][col].flag = false;
      paintCell(row, col);
    }
  }
  cellButton(hitRow, hitCol).classList.add("is-hit");
}

function lose(row, col) {
  if (finished) return;
  finished = true;
  stopTimer();
  mineResetEl.textContent = "😵";
  revealMines(row, col);
}

function win() {
  if (finished) return;
  finished = true;
  stopTimer();
  mineResetEl.textContent = "😎";
  mineCountEl.textContent = "000";
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (!grid[row][col].mine || grid[row][col].flag) continue;
      grid[row][col].flag = true;
      paintCell(row, col);
    }
  }
}

function openCell(row, col) {
  const cell = grid[row][col];
  if (finished || cell.open || cell.flag) return;

  if (!started) {
    placeMines(row, col);
    started = true;
    timer = setInterval(() => {
      seconds += 1;
      mineTimeEl.textContent = pad(seconds);
    }, 1000);
  }

  cell.open = true;
  opened += 1;
  paintCell(row, col);

  if (cell.mine) {
    lose(row, col);
    return;
  }

  if (cell.count === 0) {
    neighbors(row, col).forEach(([nextRow, nextCol]) => openCell(nextRow, nextCol));
  }

  if (opened === ROWS * COLS - MINE_COUNT) win();
}

function toggleFlag(row, col) {
  const cell = grid[row][col];
  if (finished || cell.open) return;
  cell.flag = !cell.flag;
  flags += cell.flag ? 1 : -1;
  mineCountEl.textContent = pad(MINE_COUNT - flags);
  paintCell(row, col);
}

function newGame() {
  grid = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({
      mine: false,
      open: false,
      flag: false,
      count: 0,
    }))
  );
  started = false;
  finished = false;
  flags = 0;
  opened = 0;
  seconds = 0;
  stopTimer();
  mineCountEl.textContent = pad(MINE_COUNT);
  mineTimeEl.textContent = "000";
  mineResetEl.textContent = "🙂";
  boardEl.innerHTML = "";

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cell";
      button.dataset.row = String(row);
      button.dataset.col = String(col);
      button.setAttribute("aria-label", "未翻开");
      boardEl.appendChild(button);
    }
  }
}

boardEl.addEventListener("click", (event) => {
  const button = event.target.closest(".cell");
  if (!button) return;
  openCell(Number(button.dataset.row), Number(button.dataset.col));
});

boardEl.addEventListener("contextmenu", (event) => {
  const button = event.target.closest(".cell");
  if (!button) return;
  event.preventDefault();
  toggleFlag(Number(button.dataset.row), Number(button.dataset.col));
});

mineResetEl.addEventListener("click", newGame);
newGame();

const T_COLS = 10;
const T_ROWS = 20;
const T_TYPES = ["I", "O", "T", "S", "Z", "J", "L"];
const SHAPES = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};
const LINE_POINTS = [0, 100, 300, 500, 800];

const tetrisSection = document.querySelector("#tetris");
const tetrisBoardEl = document.querySelector("#tetris-board");
const tetrisNextEl = document.querySelector("#tetris-next");
const tetrisScoreEl = document.querySelector("#tetris-score");
const tetrisLinesEl = document.querySelector("#tetris-lines");
const tetrisLevelEl = document.querySelector("#tetris-level");
const tetrisStartEl = document.querySelector("#tetris-start");
const tetrisStatusEl = document.querySelector("#tetris-status");
const tetrisPad = document.querySelector(".tetris-pad");

let tBoard = [];
let tPiece = null;
let tNext = null;
let tBag = [];
let tScore = 0;
let tLines = 0;
let tRunning = false;
let tOver = false;
let tTimer = null;

function rotateMatrix(matrix) {
  const size = matrix.length;
  const next = Array.from({ length: size }, () => Array(size).fill(0));
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      next[col][size - 1 - row] = matrix[row][col];
    }
  }
  return next;
}

function takeType() {
  if (tBag.length === 0) {
    tBag = [...T_TYPES];
    for (let index = tBag.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [tBag[index], tBag[swap]] = [tBag[swap], tBag[index]];
    }
  }
  return tBag.pop();
}

function eachBlock(piece, visit) {
  for (let row = 0; row < piece.matrix.length; row += 1) {
    for (let col = 0; col < piece.matrix[row].length; col += 1) {
      if (!piece.matrix[row][col]) continue;
      if (visit(piece.row + row, piece.col + col)) return true;
    }
  }
  return false;
}

function collides(piece) {
  return eachBlock(piece, (row, col) => {
    if (col < 0 || col >= T_COLS || row >= T_ROWS) return true;
    if (row >= 0 && tBoard[row][col]) return true;
    return false;
  });
}

function tLevel() {
  return Math.floor(tLines / 10) + 1;
}

function dropInterval() {
  return Math.max(90, 780 - (tLevel() - 1) * 65);
}

function updateTetrisStats() {
  tetrisScoreEl.textContent = String(tScore);
  tetrisLinesEl.textContent = String(tLines);
  tetrisLevelEl.textContent = String(tLevel());
}

function paintNext() {
  const matrix = SHAPES[tNext];
  let minRow = matrix.length;
  let maxRow = -1;
  let minCol = matrix[0].length;
  let maxCol = -1;
  for (let row = 0; row < matrix.length; row += 1) {
    for (let col = 0; col < matrix[row].length; col += 1) {
      if (!matrix[row][col]) continue;
      minRow = Math.min(minRow, row);
      maxRow = Math.max(maxRow, row);
      minCol = Math.min(minCol, col);
      maxCol = Math.max(maxCol, col);
    }
  }
  const offsetRow = Math.floor((4 - (maxRow - minRow + 1)) / 2);
  const offsetCol = Math.floor((4 - (maxCol - minCol + 1)) / 2);
  Array.from(tetrisNextEl.children).forEach((cell, index) => {
    const row = Math.floor(index / 4);
    const col = index % 4;
    const sourceRow = row - offsetRow + minRow;
    const sourceCol = col - offsetCol + minCol;
    const filled = matrix[sourceRow] && matrix[sourceRow][sourceCol];
    if (filled) cell.dataset.c = tNext;
    else delete cell.dataset.c;
  });
}

function paintTetris() {
  const filled = Array.from({ length: T_ROWS }, () => Array(T_COLS).fill(null));
  const ghost = Array.from({ length: T_ROWS }, () => Array(T_COLS).fill(null));

  for (let row = 0; row < T_ROWS; row += 1) {
    for (let col = 0; col < T_COLS; col += 1) filled[row][col] = tBoard[row][col];
  }

  if (tPiece) {
    const landing = { ...tPiece, row: tPiece.row };
    landing.row += 1;
    while (!collides(landing)) landing.row += 1;
    landing.row -= 1;
    if (landing.row !== tPiece.row) {
      eachBlock(landing, (row, col) => {
        if (row >= 0) ghost[row][col] = tPiece.type;
      });
    }
    eachBlock(tPiece, (row, col) => {
      if (row >= 0) filled[row][col] = tPiece.type;
    });
  }

  Array.from(tetrisBoardEl.children).forEach((cell, index) => {
    const row = Math.floor(index / T_COLS);
    const col = index % T_COLS;
    const type = filled[row][col];
    const ghostType = type ? null : ghost[row][col];
    if (type) {
      cell.dataset.c = type;
      cell.classList.remove("is-ghost");
    } else if (ghostType) {
      cell.dataset.c = ghostType;
      cell.classList.add("is-ghost");
    } else {
      delete cell.dataset.c;
      cell.classList.remove("is-ghost");
    }
  });
}

function stopTetrisLoop() {
  clearInterval(tTimer);
  tTimer = null;
}

function startTetrisLoop() {
  stopTetrisLoop();
  if (!tRunning) return;
  tTimer = setInterval(() => stepDown(false), dropInterval());
}

function clearTetrisLines() {
  let cleared = 0;
  for (let row = T_ROWS - 1; row >= 0; row -= 1) {
    if (!tBoard[row].every(Boolean)) continue;
    tBoard.splice(row, 1);
    tBoard.unshift(Array(T_COLS).fill(null));
    cleared += 1;
    row += 1;
  }
  if (!cleared) return;
  const level = tLevel();
  tScore += LINE_POINTS[cleared] * level;
  tLines += cleared;
}

function endTetris() {
  tRunning = false;
  tOver = true;
  stopTetrisLoop();
  tetrisBoardEl.classList.add("is-over");
  tetrisStartEl.textContent = "再来一局";
  tetrisStatusEl.textContent = "游戏结束。点「再来一局」重开。";
  paintTetris();
}

function spawnTetris(type) {
  tPiece = {
    type,
    matrix: SHAPES[type].map((row) => row.slice()),
    row: 0,
    col: Math.floor((T_COLS - SHAPES[type][0].length) / 2),
  };
  if (collides(tPiece)) endTetris();
}

function lockTetris() {
  eachBlock(tPiece, (row, col) => {
    if (row >= 0) tBoard[row][col] = tPiece.type;
  });
  clearTetrisLines();
  updateTetrisStats();
  if (tOver) return;
  const upcoming = tNext;
  tNext = takeType();
  spawnTetris(upcoming);
  if (!tRunning) return;
  paintNext();
  paintTetris();
  startTetrisLoop();
}

function stepDown(manual) {
  if (!tRunning || !tPiece) return;
  tPiece.row += 1;
  if (!collides(tPiece)) {
    if (manual) {
      tScore += 1;
      updateTetrisStats();
    }
    paintTetris();
    return;
  }
  tPiece.row -= 1;
  lockTetris();
}

function moveTetris(delta) {
  if (!tRunning || !tPiece) return;
  tPiece.col += delta;
  if (collides(tPiece)) tPiece.col -= delta;
  else paintTetris();
}

function rotateTetris() {
  if (!tRunning || !tPiece) return;
  const previous = tPiece.matrix;
  tPiece.matrix = rotateMatrix(previous);
  const kicks = [0, -1, 1, -2, 2];
  for (let index = 0; index < kicks.length; index += 1) {
    tPiece.col += kicks[index];
    if (!collides(tPiece)) {
      paintTetris();
      return;
    }
    tPiece.col -= kicks[index];
  }
  tPiece.matrix = previous;
}

function hardDrop() {
  if (!tRunning || !tPiece) return;
  let distance = 0;
  tPiece.row += 1;
  while (!collides(tPiece)) {
    distance += 1;
    tPiece.row += 1;
  }
  tPiece.row -= 1;
  tScore += distance * 2;
  lockTetris();
}

function tetrisAct(dir) {
  if (dir === "left") moveTetris(-1);
  if (dir === "right") moveTetris(1);
  if (dir === "rotate") rotateTetris();
  if (dir === "down") stepDown(true);
  if (dir === "drop") hardDrop();
}

function startTetris() {
  tBoard = Array.from({ length: T_ROWS }, () => Array(T_COLS).fill(null));
  tBag = [];
  tScore = 0;
  tLines = 0;
  tOver = false;
  tRunning = true;
  tetrisBoardEl.classList.remove("is-over");
  tetrisStartEl.textContent = "重新开始";
  tetrisStatusEl.textContent = "方向键移动，↑ 旋转，空格直接落下。";
  spawnTetris(takeType());
  tNext = takeType();
  updateTetrisStats();
  paintNext();
  paintTetris();
  startTetrisLoop();
}

function buildTetris() {
  tetrisBoardEl.innerHTML = "";
  for (let index = 0; index < T_ROWS * T_COLS; index += 1) {
    const cell = document.createElement("div");
    cell.className = "tetris-cell";
    tetrisBoardEl.appendChild(cell);
  }
  tetrisNextEl.innerHTML = "";
  for (let index = 0; index < 16; index += 1) {
    const cell = document.createElement("div");
    cell.className = "tetris-mini";
    tetrisNextEl.appendChild(cell);
  }
}

tetrisStartEl.addEventListener("click", () => {
  startTetris();
  tetrisSection.focus();
});

tetrisPad.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  tetrisAct(button.dataset.dir);
});

document.addEventListener("keydown", (event) => {
  if (!tRunning) return;
  if (!tetrisSection.contains(document.activeElement)) return;
  const dirs = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "rotate",
    ArrowDown: "down",
    " ": "drop",
  };
  const dir = dirs[event.key];
  if (!dir) return;
  event.preventDefault();
  tetrisAct(dir);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopTetrisLoop();
  else if (tRunning) startTetrisLoop();
});

buildTetris();
