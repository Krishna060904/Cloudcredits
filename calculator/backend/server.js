// backend/server.js
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs-extra");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

const historyFile = path.join(__dirname, "history.json");

app.use(cors());
app.use(bodyParser.json());

// Ensure history.json exists
if (!fs.existsSync(historyFile)) {
  fs.writeJsonSync(historyFile, []);
}

// Helper to append history safely
function appendHistory(entry) {
  let history = [];
  try {
    history = fs.readJsonSync(historyFile);
  } catch {
    history = [];
  }
  history.unshift(entry);
  if (history.length > 10) history.length = 10;
  fs.writeJsonSync(historyFile, history);
}

// POST /calculate
app.post("/calculate", (req, res) => {
  console.log("POST /calculate body:", req.body);

  // Prefer customExpression/customResult
  if (req.body.customExpression && req.body.customResult !== undefined) {
    const newEntry = {
      expression: String(req.body.customExpression),
      result: String(req.body.customResult),
      time: new Date().toLocaleString()
    };
    appendHistory(newEntry);
    return res.json(newEntry);
  }

  // Otherwise, handle basic num1,num2,operator
  const { num1, num2, operator } = req.body || {};
  const a = Number(num1);
  const b = Number(num2);

  if (Number.isNaN(a) || Number.isNaN(b) || !operator) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  let result;
  switch (operator) {
    case "+": result = a + b; break;
    case "-": result = a - b; break;
    case "*": result = a * b; break;
    case "/": result = b !== 0 ? a / b : "Error (divide by zero)"; break;
    case "%": result = a % b; break;
    case "x^y": result = Math.pow(a, b); break;
    default: result = "Invalid operator";
  }

  const newEntry = {
    expression: `${a} ${operator} ${b}`,
    result,
    time: new Date().toLocaleString()
  };
  appendHistory(newEntry);
  res.json(newEntry);
});

// GET /history
app.get("/history", (req, res) => {
  try {
    const history = fs.readJsonSync(historyFile);
    res.json(history);
  } catch {
    res.json([]);
  }
});

// Serve frontend
app.use(express.static(path.join(__dirname, "../frontend")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
