const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");

const app = express();

app.use(express.json());

// ===== CORS =====
const ALLOWED_ORIGINS = "*";

app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

// STATIC FILES
app.use(express.static(path.join(__dirname)));

// SECURITY HEADERS
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

const DATA_FILE = path.join(__dirname, "data.json");
const USERS_FILE = path.join(__dirname, "users.json");

/* INIT DATA */
function getData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
      title: "My Site",
      logo: "https://via.placeholder.com/40",
      updates: "- System working<br>- Rewards active",
      slogan: "Play. Learn. Repeat"
    }));
  }
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

/* INIT USERS */
function getUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({}));
  }
  return JSON.parse(fs.readFileSync(USERS_FILE));
}

/* SAFE SAVE */
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

/* SITE API */
app.get("/api/site", (req, res) => {
  res.json(getData());
});

app.post("/api/site", (req, res) => {
  const { user, title, logo, updates, slogan } = req.body;

  if (user !== "CritStrike") {
    return res.status(403).send("Not allowed");
  }

  const data = {
    title: title || "My Site",
    logo: logo || "https://via.placeholder.com/40",
    updates: updates || "- Ready",
    slogan: slogan || "Play. Learn. Repeat"
  };

  fs.writeFileSync(DATA_FILE, JSON.stringify(data));
  res.json({ success: true });
});

/* SIGNUP */
app.post("/api/users/signup", async (req, res) => {
  const { username, password, pfp } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: "Username and password required" });
  }

  const users = getUsers();

  if (users[username]) {
    return res.status(400).json({ success: false, error: "Username already taken" });
  }

  users[username] = {
    pass: await bcrypt.hash(password, 10),
    pfp: pfp || "https://via.placeholder.com/100",
    tokens: 0,
    createdAt: new Date().toISOString(),
    data: {}
  };

  saveUsers(users);

  res.json({ success: true, username });
});

/* LOGIN */
app.post("/api/users/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: "Username and password required" });
  }

  const users = getUsers();
  const user = users[username];

  if (!user) {
    return res.status(401).json({ success: false, error: "Invalid username or password" });
  }

  const match = await bcrypt.compare(password, user.pass);

  if (!match) {
    return res.status(401).json({ success: false, error: "Invalid username or password" });
  }

  res.json({
    success: true,
    username,
    pfp: user.pfp,
    tokens: user.tokens
  });
});

/* GET USER */
app.get("/api/users/:username", (req, res) => {
  const users = getUsers();
  const user = users[req.params.username];

  if (!user) {
    return res.status(404).json({ success: false, error: "User not found" });
  }

  res.json({
    success: true,
    username: req.params.username,
    pfp: user.pfp,
    tokens: user.tokens,
    data: user.data
  });
});

/* UPDATE USER */
app.post("/api/users/:username", (req, res) => {
  const users = getUsers();
  const user = users[req.params.username];

  if (!user) {
    return res.status(404).json({ success: false, error: "User not found" });
  }

  const { pfp, tokens, data } = req.body;

  if (pfp !== undefined) user.pfp = pfp;
  if (tokens !== undefined) user.tokens = tokens;
  if (data !== undefined) user.data = data;

  saveUsers(users);

  res.json({ success: true });
});

/* =========================
   ADMIN FIX ROUTE (OPTIONAL)
========================= */
app.post("/api/fix-admin", async (req, res) => {
  const users = getUsers();

  users["CritStrike"] = {
    pass: await bcrypt.hash("c@ss@n0v@", 10),
    pfp: "https://via.placeholder.com/40",
    tokens: 0,
    createdAt: new Date().toISOString(),
    data: {}
  };

  saveUsers(users);

  res.json({ success: true, message: "Admin reset complete" });
});

/* START SERVER */
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("==================================");
  console.log("CRITSTRIKE SERVER RUNNING");
  console.log("PORT: " + PORT);
  console.log("GLOBAL READY: TRUE");
  console.log("==================================");
});