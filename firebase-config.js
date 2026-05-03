/* =========================
   DATABASE CONFIGURATION
   CritStrike SQLite Database

   This file now uses SQLite via the server API.
   No Firebase configuration needed - data is stored locally.

   RENDER DEPLOYMENT:
   - SQLite database file is stored on Render's persistent disk
   - Add SQLITE_DB_PATH environment variable (optional)
     Default: ./critstrike.db
   - Enable "Persistent Disk" in Render dashboard
========================= */

// SQLite DB is loaded via sqlite-db.js script tag
// FireDB is globally available after sqlite-db.js loads

// Wait for SQLiteDB to be available
if (typeof window !== "undefined") {
  const checkDB = setInterval(() => {
    if (window.SQLiteDB) {
      window.FireDB = window.SQLiteDB;
      clearInterval(checkDB);
    }
  }, 50);

  // Fallback stub if SQLiteDB not loaded
  window.FireDB = window.FireDB || {
    async createUser() { throw new Error("Database not loaded. Ensure sqlite-db.js is included."); },
    async login() { throw new Error("Database not loaded. Ensure sqlite-db.js is included."); },
    async logout() {},
    async getUserData() { return null; },
    async updateTokens() {},
    onAuthChange() {},
    async getSiteSettings() { return { title: "Home", logo: "https://via.placeholder.com/200", updates: "- Database loading...", slogan: "Play. Learn. Repeat" }; },
    async saveSiteSettings() { throw new Error("Database not loaded"); },
    async getGames() { return []; },
    async saveGame() { throw new Error("Database not loaded"); },
    async deleteGame() { throw new Error("Database not loaded"); },
    async incrementPlayCount() {},
    async getPlaylist() { return []; },
    async uploadMusic() { throw new Error("Database not loaded"); },
    async deleteMusic() { throw new Error("Database not loaded"); },
    async clearAllMusic() { throw new Error("Database not loaded"); }
  };
}
