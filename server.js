/* =========================
   CRITSTRIKE SERVER
   Express + SQLite API + static site
========================= */

const express = require("express");
const cors = require("cors");
const compression = require("compression");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

async function startServer() {
  const db = require("./database");
  await db.waitForReady();
  await db.seedDatabase();

  const app = express();

  app.use(compression());
  app.use(express.json({ limit: "50mb" }));
  app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Username"]
  }));

  app.use((req, res, next) => {
    if (/\.(html|js)$/i.test(req.path)) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    }
    next();
  });

  app.use(express.static(ROOT, { etag: true, lastModified: true, maxAge: 0 }));

  function isGameMasterName(name) {
    return String(name || "").trim().toLowerCase() === "game_master";
  }

  async function requireGameMaster(req, res, next) {
    try {
      const username = req.headers["x-username"] || req.body?.adminUsername;
      if (!isGameMasterName(username)) {
        return res.status(403).json({ success: false, error: "Log in as Game_Master to do this." });
      }
      const user = await db.getGameMasterUser();
      if (!user) {
        return res.status(403).json({ success: false, error: "Game_Master account missing. Default password: master123" });
      }
      next();
    } catch (err) {
      console.error("Admin auth error:", err);
      res.status(500).json({ success: false, error: "Server error" });
    }
  }

  app.get("/health", (req, res) => res.json({ status: "healthy" }));
  app.get("/api/health", (req, res) => res.json({
    status: "ok",
    version: "2.0.0",
    timestamp: new Date().toISOString()
  }));

  // --- USERS ---
  app.post("/api/users/signup", async (req, res) => {
    try {
      const { username, password, pfp } = req.body;
      if (!username || !password) {
        return res.status(400).json({ success: false, error: "Username and password required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ success: false, error: "Password must be at least 6 characters" });
      }
      const trimmed = username.trim();
      if (!trimmed) return res.status(400).json({ success: false, error: "Username cannot be empty" });
      if (await db.getUserByUsername(trimmed)) {
        return res.status(409).json({ success: false, error: "Username already exists" });
      }
      const user = await db.createUser(trimmed, password, pfp);
      res.json({ success: true, uid: user.uid, username: user.username });
    } catch (err) {
      console.error("Signup error:", err);
      res.status(500).json({ success: false, error: "Server error" });
    }
  });

  app.post("/api/users/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ success: false, error: "Username and password required" });
      }
      const user = await db.getUserByUsername(username.trim());
      if (!user || user.password !== password) {
        return res.status(401).json({ success: false, error: "Invalid credentials" });
      }
      res.json({
        success: true,
        uid: user.uid,
        username: user.username,
        tokens: user.tokens,
        pfp: user.pfp
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ success: false, error: "Server error" });
    }
  });

  app.get("/api/users/uid/:uid", async (req, res) => {
    try {
      const user = await db.getUserByUid(req.params.uid);
      if (!user) return res.status(404).json({ success: false, error: "User not found" });
      res.json({
        success: true,
        uid: user.uid,
        username: user.username,
        tokens: user.tokens,
        pfp: user.pfp,
        themes: JSON.parse(user.themes || "[]"),
        inventory: JSON.parse(user.inventory || "[]")
      });
    } catch (err) {
      res.status(500).json({ success: false, error: "Server error" });
    }
  });

  app.get("/api/users/:username", async (req, res) => {
    try {
      const user = await db.getUserByUsername(req.params.username);
      if (!user) return res.status(404).json({ success: false, error: "User not found" });
      res.json({
        success: true,
        uid: user.uid,
        username: user.username,
        tokens: user.tokens,
        pfp: user.pfp,
        themes: JSON.parse(user.themes || "[]"),
        inventory: JSON.parse(user.inventory || "[]")
      });
    } catch (err) {
      res.status(500).json({ success: false, error: "Server error" });
    }
  });

  app.post("/api/users/:username", async (req, res) => {
    try {
      const user = await db.getUserByUsername(req.params.username);
      if (!user) return res.status(404).json({ success: false, error: "User not found" });
      if (req.body.tokens !== undefined) await db.updateTokens(user.uid, req.body.tokens);
      if (req.body.themes !== undefined) await db.updateUserThemes(user.uid, req.body.themes);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: "Server error" });
    }
  });

  // --- GAMES ---
  app.get("/api/games", async (req, res) => {
    try {
      const games = await db.getGames(req.query.published === "true");
      res.json({ success: true, games });
    } catch (err) {
      res.status(500).json({ success: false, error: "Server error" });
    }
  });

  app.post("/api/games", requireGameMaster, async (req, res) => {
    try {
      const { gameData } = req.body;
      if (!gameData || !gameData.name) {
        return res.status(400).json({ success: false, error: "Game data required" });
      }
      const id = await db.createGame(gameData);
      res.json({ success: true, id });
    } catch (err) {
      console.error("Create game error:", err);
      res.status(500).json({ success: false, error: "Server error" });
    }
  });

  app.get("/api/games/:id", async (req, res) => {
    try {
      const game = await db.getGameById(req.params.id);
      if (!game) return res.status(404).json({ success: false, error: "Game not found" });
      res.json({ success: true, game });
    } catch (err) {
      res.status(500).json({ success: false, error: "Server error" });
    }
  });

  app.put("/api/games/:id", requireGameMaster, async (req, res) => {
    try {
      const { adminUsername, ...patch } = req.body;
      await db.updateGameById(req.params.id, patch);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: "Server error" });
    }
  });

  app.delete("/api/games/:id", requireGameMaster, async (req, res) => {
    try {
      await db.deleteGameById(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: "Server error" });
    }
  });

  app.post("/api/games/:id/play", async (req, res) => {
    try {
      await db.incrementPlayCountById(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: "Server error" });
    }
  });

  app.post("/api/games/:id/credit", requireGameMaster, async (req, res) => {
    try {
      await db.setGameCreditEligible(req.params.id, req.body.eligible);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: "Server error" });
    }
  });

  // --- MUSIC ---
  app.get("/api/music", async (req, res) => {
    try {
      res.json({ success: true, playlist: await db.getPlaylist() });
    } catch (err) {
      res.status(500).json({ success: false, error: "Server error" });
    }
  });

  app.post("/api/music", requireGameMaster, async (req, res) => {
    try {
      const id = await db.uploadMusic(req.body.name, req.body.fileData, req.body.fileType);
      res.json({ success: true, id });
    } catch (err) {
      res.status(500).json({ success: false, error: "Server error" });
    }
  });

  app.delete("/api/music/:id", requireGameMaster, async (req, res) => {
    try {
      await db.deleteMusic(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: "Server error" });
    }
  });

  // --- SITE SETTINGS ---
  app.get("/api/site-settings", async (req, res) => {
    try {
      res.json({ success: true, settings: await db.getSiteSettings() });
    } catch (err) {
      res.status(500).json({ success: false, error: "Server error" });
    }
  });

  app.post("/api/site-settings", requireGameMaster, async (req, res) => {
    try {
      const { adminUsername, ...settings } = req.body;
      await db.saveSiteSettings(settings);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: "Server error" });
    }
  });

  app.get("/api/meta/weekly-reset", async (req, res) => {
    try {
      const result = await db.ensureWeeklyReset();
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, error: "Server error" });
    }
  });

  // Unknown API → JSON 404 (never return HTML for /api)
  app.use("/api", (req, res) => {
    res.status(404).json({ success: false, error: "API endpoint not found" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log("CritStrike server running on port", PORT);
  });

  process.on("SIGTERM", () => db.close().then(() => process.exit(0)));
  process.on("SIGINT", () => db.close().then(() => process.exit(0)));
}

startServer().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
