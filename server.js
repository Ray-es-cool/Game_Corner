/* =========================
   CRITSTRIKE SERVER
   Optimized for Railway deployment

   Health Check: /health or /api/health
   Static Files: All HTML, CSS, JS served from root
========================= */

const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./database");

const app = express();

// Railway sets PORT environment variable automatically
const PORT = process.env.PORT || 3000;

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// SECURITY HEADERS
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});

// STATIC FILES - Serve all HTML, CSS, JS, and assets
app.use(express.static(path.join(__dirname), {
  maxAge: '1d', // Cache static assets for 1 day
  etag: true,
  lastModified: true
}));

// Runtime Firebase env injection for browser (Render/Railway/etc.)
// Served as JS so it can be included before firebase-config.js.
app.get("/firebase-env.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  const cfg = {
    apiKey: process.env.FIREBASE_API_KEY || "",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.FIREBASE_APP_ID || ""
  };

  res.status(200).send(
    `// Auto-generated at request time\n` +
    `window.__FIREBASE_CONFIG__ = ${JSON.stringify(cfg)};\n`
  );
});

// Runtime Supabase env injection for browser
app.get("/supabase-env.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  const cfg = {
    url: process.env.SUPABASE_URL || "",
    anonKey: process.env.SUPABASE_ANON_KEY || ""
  };

  res.status(200).send(
    `// Auto-generated at request time\n` +
    `window.__SUPABASE_CONFIG__ = ${JSON.stringify(cfg)};\n`
  );
});

// Health check endpoint for Railway monitoring
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "CritStrike server running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: "1.0.0"
  });
});

// Railway health check endpoint (simple)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

// API info endpoint
app.get("/api", (req, res) => {
  res.json({
    name: "CritStrike API",
    version: "1.0.0",
    database: "SQLite",
    endpoints: [
      "/health", "/api/health",
      "/api/users/signup", "/api/users/login", "/api/users/:username",
      "/api/games", "/api/music", "/api/site-settings"
    ]
  });
});

// =========================
// USER API ENDPOINTS
// =========================

app.post("/api/users/signup", async (req, res) => {
  try {
    const { username, password, pfp } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: "Username and password required" });
    }

    const existing = db.getUserByUsername(username);
    if (existing) {
      return res.status(409).json({ success: false, error: "Username already exists" });
    }

    const user = await db.createUser(username, password, pfp);
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

    const user = db.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    if (user.password !== password) {
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

app.get("/api/users/:username", async (req, res) => {
  try {
    const user = db.getUserByUsername(req.params.username);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({
      success: true,
      uid: user.uid,
      username: user.username,
      tokens: user.tokens,
      pfp: user.pfp,
      themes: JSON.parse(user.themes || '[]'),
      inventory: JSON.parse(user.inventory || '[]')
    });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

app.get("/api/users/uid/:uid", async (req, res) => {
  try {
    const user = db.getUserByUid(req.params.uid);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({
      success: true,
      uid: user.uid,
      username: user.username,
      tokens: user.tokens,
      pfp: user.pfp,
      themes: JSON.parse(user.themes || '[]'),
      inventory: JSON.parse(user.inventory || '[]')
    });
  } catch (err) {
    console.error("Get user by uid error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

app.post("/api/users/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const updates = req.body;
    const user = db.getUserByUsername(username);

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    if (updates.tokens !== undefined) {
      await db.updateTokens(user.uid, updates.tokens);
    }
    if (updates.themes !== undefined) {
      await db.updateUserThemes(user.uid, updates.themes);
    }
    if (updates.inventory !== undefined) {
      await db.addToInventory(user.uid, updates.inventory);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// =========================
// GAMES API ENDPOINTS
// =========================

app.get("/api/games", async (req, res) => {
  try {
    const publishedOnly = req.query.published === 'true';
    const games = await db.getGames(publishedOnly);
    res.json({ success: true, games });
  } catch (err) {
    console.error("Get games error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

app.post("/api/games", async (req, res) => {
  try {
    const { slotIndex, gameData } = req.body;

    if (slotIndex !== undefined) {
      const id = await db.saveGame(slotIndex, gameData);
      res.json({ success: true, id });
    } else {
      const id = await db.createGame(gameData);
      res.json({ success: true, id });
    }
  } catch (err) {
    console.error("Save game error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

app.delete("/api/games/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteGameById(id);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete game error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

app.post("/api/games/:id/play", async (req, res) => {
  try {
    await db.incrementPlayCountById(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("Increment play error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

app.post("/api/games/:id/credit", async (req, res) => {
  try {
    const { eligible } = req.body;
    await db.setGameCreditEligible(req.params.id, eligible);
    res.json({ success: true });
  } catch (err) {
    console.error("Set credit error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// =========================
// MUSIC API ENDPOINTS
// =========================

app.get("/api/music", async (req, res) => {
  try {
    const playlist = await db.getPlaylist();
    res.json({ success: true, playlist });
  } catch (err) {
    console.error("Get music error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

app.post("/api/music", async (req, res) => {
  try {
    const { name, fileData, fileType } = req.body;
    const id = await db.uploadMusic(name, fileData, fileType);
    res.json({ success: true, id });
  } catch (err) {
    console.error("Upload music error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

app.delete("/api/music/:id", async (req, res) => {
  try {
    await db.deleteMusic(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete music error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

app.delete("/api/music", async (req, res) => {
  try {
    await db.clearAllMusic();
    res.json({ success: true });
  } catch (err) {
    console.error("Clear music error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// =========================
// SITE SETTINGS API ENDPOINTS
// =========================

app.get("/api/site-settings", async (req, res) => {
  try {
    const settings = await db.getSiteSettings();
    res.json({ success: true, settings });
  } catch (err) {
    console.error("Get site settings error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

app.post("/api/site-settings", async (req, res) => {
  try {
    await db.saveSiteSettings(req.body);
    res.json({ success: true });
  } catch (err) {
    console.error("Save site settings error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// =========================
// META API ENDPOINTS
// =========================

app.get("/api/meta/weekly-reset", async (req, res) => {
  try {
    const result = await db.ensureWeeklyReset();
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Weekly reset error:", err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// Catch-all route - serve index.html for any unknown routes
// This enables SPA-like behavior for all HTML pages
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// START SERVER
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log("\n" + "=".repeat(50));
  console.log("  CRITSTRIKE SERVER RUNNING");
  console.log("=".repeat(50));
  console.log(`  PORT: ${PORT}`);
  console.log(`  ENV: ${process.env.NODE_ENV || "production"}`);
  console.log(`  DATABASE: Turso Cloud SQLite`);
  console.log(`  HEALTH: http://localhost:${PORT}/health`);
  console.log("=".repeat(50) + "\n");
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.log("  WARNING: Turso not configured!");
    console.log("  Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables");
    console.log("  See RENDER_DEPLOYMENT.md for setup instructions\n");
  }
});

// Graceful shutdown for Railway
process.on("SIGTERM", () => {
  console.log("[INFO] SIGTERM received, shutting down gracefully...");
  server.close(() => {
    console.log("[INFO] Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("[INFO] SIGINT received, shutting down gracefully...");
  server.close(() => {
    console.log("[INFO] Server closed");
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught Exception:", err.message);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[FATAL] Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
