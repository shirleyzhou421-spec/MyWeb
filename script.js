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
  if (event.key >= "0" && event.key <= "9") inputDigit(event.key);
  if (event.key === ".") inputDot();
  if (["+", "-", "*", "/"].includes(event.key)) chooseOperator(event.key);
  if (event.key === "Enter" || event.key === "=") equals();
  if (event.key === "Escape") clearAll();
  if (event.key === "Backspace") {
    if (overwrite || current.length === 1 || current === "错误") {
      current = "0";
      overwrite = false;
    } else {
      current = current.slice(0, -1);
    }
    render();
  }
});
