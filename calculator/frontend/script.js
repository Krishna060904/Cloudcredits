// frontend/script.js
const display = document.getElementById("display");
const buttons = document.querySelectorAll(".calc-btn");
const historyList = document.getElementById("historyList");
const API_BASE = "http://localhost:5000";

// ---------- Helpers ----------
function setDisplay(val) {
  display.value = val === null || val === undefined ? "" : String(val);
}

async function sendHistory(expression, result) {
  if (!expression || result === undefined || result === null) {
    console.warn("Skipping history save (invalid data)", { expression, result });
    return;
  }
  const payload = {
    customExpression: String(expression),
    customResult: String(result)
  };
  console.log("➡️ sendHistory payload:", payload);
  try {
    await fetch(`${API_BASE}/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error("sendHistory failed:", err);
  }
}

async function loadHistory() {
  try {
    const res = await fetch(`${API_BASE}/history`);
    const history = await res.json();
    historyList.innerHTML = "";
    history.forEach(item => {
      const expr = item.expression ?? item.customExpression ?? "";
      const resu = item.result ?? item.customResult ?? "";
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between";
      li.textContent = `${expr} = ${resu}`;
      historyList.appendChild(li);
    });
  } catch (err) {
    console.error("Failed to load history:", err);
  }
}

// ---------- Calculator State ----------
let currentInput = "";
let firstNum = null;
let operator = "";

// ---------- Eval helpers ----------
function evalBinary(a, b, op) {
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/": return b !== 0 ? a / b : "Error (div/0)";
    case "x^y": return Math.pow(a, b);
    default: return "Invalid";
  }
}

function evalUnary(val, fn) {
  const n = Number(val);
  switch (fn) {
    case "√": return Math.sqrt(n);
    case "x²": return n * n;
    case "%": return n / 100;
    case "sin": return Math.sin(n * Math.PI / 180);
    case "cos": return Math.cos(n * Math.PI / 180);
    case "tan": return Math.tan(n * Math.PI / 180);
    case "log": return n > 0 ? Math.log10(n) : "Error";
    case "ln": return n > 0 ? Math.log(n) : "Error";
    case "1/x": return n !== 0 ? 1 / n : "Error";
    default: return "Invalid";
  }
}

// ---------- Button Handling ----------
buttons.forEach(btn => {
  btn.addEventListener("click", async () => {
    const v = btn.textContent.trim();

    if (/^\d$/.test(v) || v === ".") {
      if (v === "." && currentInput.includes(".")) return;
      currentInput += v;
      setDisplay(currentInput);
      return;
    }

    if (v === "C") {
      currentInput = "";
      firstNum = null;
      operator = "";
      setDisplay("");
      return;
    }

    if (v === "π") { currentInput = String(Math.PI); setDisplay(currentInput); return; }
    if (v === "e") { currentInput = String(Math.E); setDisplay(currentInput); return; }

    const unaryFns = ["√","x²","%","sin","cos","tan","log","ln","1/x"];
    if (unaryFns.includes(v)) {
      if (currentInput === "") return;
      const result = evalUnary(currentInput, v);
      const expr = `${v}(${currentInput})`;
      setDisplay(result);
      await sendHistory(expr, result);
      await loadHistory();
      currentInput = String(result);
      return;
    }

    const binaryOps = ["+","-","*","/","x^y"];
    if (binaryOps.includes(v)) {
      firstNum = Number(currentInput);
      operator = v;
      currentInput = "";
      return;
    }

    if (v === "=") {
      if (firstNum !== null && operator && currentInput !== "") {
        const second = Number(currentInput);
        const result = evalBinary(firstNum, second, operator);
        const expr = `${firstNum} ${operator} ${second}`;
        setDisplay(result);
        await sendHistory(expr, result);
        await loadHistory();
        firstNum = null;
        operator = "";
        currentInput = String(result);
      }
      return;
    }
  });
});

// ---------- History on load ----------
loadHistory();

// ---------- Mode Toggle ----------
const modeToggle = document.getElementById("modeToggle");
const body = document.body;
const calculator = document.querySelector(".calculator");
const historyCard = document.querySelector(".history");

modeToggle.addEventListener("click", () => {
  const isDark = body.classList.contains("dark-mode");
  if (isDark) {
    body.classList.replace("dark-mode", "light-mode");
    calculator.classList.replace("dark-mode", "light-mode");
    historyCard.classList.replace("dark-mode", "light-mode");
    modeToggle.textContent = "Switch to Dark Mode";
    buttons.forEach(btn => {
      if (btn.classList.contains("btn-outline-light"))
        btn.classList.replace("btn-outline-light", "btn-outline-dark");
    });
  } else {
    body.classList.replace("light-mode", "dark-mode");
    calculator.classList.replace("light-mode", "dark-mode");
    historyCard.classList.replace("light-mode", "dark-mode");
    modeToggle.textContent = "Switch to Light Mode";
    buttons.forEach(btn => {
      if (btn.classList.contains("btn-outline-dark"))
        btn.classList.replace("btn-outline-dark", "btn-outline-light");
    });
  }
});
