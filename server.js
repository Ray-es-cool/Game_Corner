/* =========================
   CRITSTRIKE SERVER
   Optimized for Railway deployment

   Health Check: /health or /api/health
   Static Files: All HTML, CSS, JS served from root
========================= */

const express = require("express");
const cors = require("cors");
const path = require("path");

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
    endpoints: ["/health", "/api/health"]
  });
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
  console.log(`  DATABASE: Firebase Firestore (Cloud)`);
  console.log(`  HEALTH: http://localhost:${PORT}/health`);
  console.log("=".repeat(50) + "\n");
  console.log("  IMPORTANT: Configure Firebase in firebase-config.js");
  console.log("  See DEPLOYMENT_GUIDE.md for setup instructions\n");
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
