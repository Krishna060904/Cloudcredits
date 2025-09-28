// backend/server.js
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// Paths
const FRONTEND_DIR = path.join(__dirname, "../frontend");
const DB_PATH = path.join(__dirname, "portfolio.db");
const PROJECTS_PATH = path.join(__dirname, "projects.json");

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(FRONTEND_DIR));

// Database init
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error("❌ DB connection error:", err);
  else console.log("✅ SQLite connected:", DB_PATH);
});

// Ensure messages table exists
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    subject TEXT,
    message TEXT,
    created_at TEXT
  )`, (err) => {
    if (err) console.error("❌ Could not create messages table:", err);
  });
});

// ---------- ROUTES ----------

// Contact form submit
app.post("/contact", (req, res) => {
  const { name, email, subject, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: "name, email and message are required" });
  }

  const createdAt = new Date().toISOString();
  db.run(
    "INSERT INTO messages (name, email, subject, message, created_at) VALUES (?, ?, ?, ?, ?)",
    [name, email, subject || "", message, createdAt],
    function (err) {
      if (err) {
        console.error("❌ Insert error:", err);
        return res.status(500).json({ error: "Failed to save message" });
      }
      res.json({ success: true, id: this.lastID });
    }
  );
});

// Fetch all messages (admin)
app.get("/messages", (req, res) => {
  db.all("SELECT * FROM messages ORDER BY created_at DESC", [], (err, rows) => {
    if (err) {
      console.error("❌ Fetch error:", err);
      return res.status(500).json({ error: "Failed to fetch messages" });
    }
    res.json(rows);
  });
});

// Projects endpoint (serves backend/projects.json)
app.get("/projects", (req, res) => {
  try {
    if (!fs.existsSync(PROJECTS_PATH)) {
      console.warn("⚠️ projects.json not found at", PROJECTS_PATH);
      return res.status(404).json([]);
    }
    const raw = fs.readFileSync(PROJECTS_PATH, "utf8");
    const projects = JSON.parse(raw);
    res.json(projects);
  } catch (err) {
    console.error("❌ Error reading projects.json:", err);
    res.status(500).json({ error: "Failed to load projects" });
  }
});

// Fallback to index.html for root
app.get("/", (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
