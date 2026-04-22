/* =========================
   CRITSTRIKE SERVER
   Optimized for Railway deployment
========================= */

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// Railway sets PORT environment variable automatically
const PORT = process.env.PORT || 3000;

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
  next();
});

// STATIC FILES - Serve all HTML, CSS, JS files
app.use(express.static(path.join(__dirname)));

// Health check endpoint for Railway
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "CritStrike server running on Railway",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Railway health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

// Catch-all route - serve index.html for any unknown routes
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// START SERVER
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log("==================================");
  console.log("CRITSTRIKE SERVER RUNNING");
  console.log("PORT: " + PORT);
  console.log("DATABASE: Firebase Firestore (Cloud)");
  console.log("ENV: " + (process.env.NODE_ENV || "production"));
  console.log("==================================");
  console.log("");
  console.log("IMPORTANT: Configure Firebase in firebase-config.js");
  console.log("See FIREBASE_SETUP.md for instructions");
  console.log("==================================");
});

// Graceful shutdown for Railway
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
