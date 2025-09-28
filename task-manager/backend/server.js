// backend/server.js
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = 5000;
const SECRET = "supersecret"; // ⚠️ Use env var in production

app.use(cors());
app.use(bodyParser.json());

const DB_PATH = path.join(__dirname, "db.sqlite");
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, "");

const db = new sqlite3.Database(DB_PATH);

// Init tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'medium',
      due_date TEXT,
      tags TEXT,
      recurrence TEXT DEFAULT 'none', -- none, daily, weekly
      archived INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// Helpers
function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}
function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}
function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

// ---------- AUTH ROUTES ----------
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Missing email/password" });
  const hash = await bcrypt.hash(password, 10);
  try {
    await runAsync("INSERT INTO users (name,email,password) VALUES (?,?,?)", [name, email, hash]);
    res.json({ success: true });
  } catch {
    res.status(400).json({ error: "Email already exists" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await getAsync("SELECT * FROM users WHERE email=?", [email]);
  if (!user) return res.status(400).json({ error: "Invalid email/password" });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: "Invalid email/password" });
  const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: "1h" });
  res.json({ token, name: user.name });
});

// Auth middleware
function auth(req, res, next) {
  const header = req.headers["authorization"];
  if (!header) return res.status(401).json({ error: "No token" });
  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ---------- TASK ROUTES (protected) ----------
app.use("/task", auth);
app.use("/tasks", auth);

app.post("/task", async (req, res) => {
  const { title, description = "", priority = "medium", due_date = null, tags = "", recurrence = "none", status = "pending" } = req.body;
  if (!title) return res.status(400).json({ error: "Title required" });
  const now = new Date().toISOString();
  const stmt = await runAsync(
    `INSERT INTO tasks (user_id,title,description,priority,due_date,tags,recurrence,status,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [req.userId, title, description, priority, due_date, tags, recurrence, status, now, now]
  );
  const row = await getAsync("SELECT * FROM tasks WHERE id=?", [stmt.lastID]);
  res.json(row);
});

app.get("/tasks", async (req, res) => {
  const { status, priority, archived = "0" } = req.query;
  const where = ["user_id=?"];
  const params = [req.userId];
  if (status) { where.push("status=?"); params.push(status); }
  if (priority) { where.push("priority=?"); params.push(priority); }
  where.push("archived=?"); params.push(Number(archived));
  const rows = await allAsync(`SELECT * FROM tasks WHERE ${where.join(" AND ")} ORDER BY created_at DESC`, params);
  res.json(rows);
});

app.put("/task/:id", async (req, res) => {
  const { id } = req.params;
  const updates = [];
  const params = [];
  const allowed = ["title","description","status","priority","due_date","tags","recurrence","archived"];
  for (const k of allowed) {
    if (req.body[k] !== undefined) { updates.push(`${k}=?`); params.push(req.body[k]); }
  }
  params.push(new Date().toISOString(), id, req.userId);
  await runAsync(`UPDATE tasks SET ${updates.join(", ")}, updated_at=? WHERE id=? AND user_id=?`, params);
  const row = await getAsync("SELECT * FROM tasks WHERE id=? AND user_id=?", [id, req.userId]);

  // Handle recurrence
  if (req.body.status === "complete" && row.recurrence !== "none" && row.due_date) {
    let due = new Date(row.due_date);
    if (row.recurrence === "daily") due.setDate(due.getDate() + 1);
    if (row.recurrence === "weekly") due.setDate(due.getDate() + 7);
    await runAsync(
      `INSERT INTO tasks (user_id,title,description,priority,due_date,tags,recurrence,status,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [req.userId, row.title, row.description, row.priority, due.toISOString().split("T")[0], row.tags, row.recurrence, "pending", new Date().toISOString(), new Date().toISOString()]
    );
  }

  res.json(row);
});

app.delete("/task/:id", async (req, res) => {
  const { id } = req.params;
  await runAsync("UPDATE tasks SET archived=1, updated_at=? WHERE id=? AND user_id=?", [new Date().toISOString(), id, req.userId]);
  res.json({ success: true });
});

// ---------- Serve Frontend ----------
app.use(express.static(path.join(__dirname, "../frontend")));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "../frontend/login.html")));

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
