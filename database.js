/* =========================
   SQLITE DATABASE MODULE
   CritStrike — persistent SQLite via sql.js
========================= */

const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

function resolveDbPath() {
  const candidates = [
    process.env.SQLITE_DB_PATH,
    process.env.RENDER_DISK_PATH ? path.join(process.env.RENDER_DISK_PATH, "critstrike.db") : null,
    "/var/data/critstrike.db",
    path.join(__dirname, "data", "critstrike.db"),
    path.join(__dirname, "critstrike.db")
  ].filter(Boolean);

  for (const candidate of candidates) {
    const dir = path.dirname(candidate);
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.accessSync(dir, fs.constants.W_OK);
      return candidate;
    } catch (_) {
      continue;
    }
  }
  return "/tmp/critstrike.db";
}

let DB_PATH = resolveDbPath();
let db = null;
let dbReady = false;

function saveDatabase() {
  if (!db) return;
  try {
    const buffer = Buffer.from(db.export());
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error("[DATABASE] Save failed:", err.message);
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 11);
}

function getWeekKey() {
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  return sunday.toISOString().split("T")[0];
}

function getRow(stmt, params = []) {
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function getRows(stmt, params = []) {
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      uid TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      pfp TEXT DEFAULT 'https://via.placeholder.com/40',
      tokens INTEGER DEFAULT 0,
      themes TEXT DEFAULT '[]',
      inventory TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      slot_index INTEGER,
      name TEXT NOT NULL,
      thumbnail TEXT,
      game_files TEXT,
      players INTEGER DEFAULT 0,
      plays_week INTEGER DEFAULT 0,
      plays_total INTEGER DEFAULT 0,
      credit_eligible INTEGER,
      published INTEGER DEFAULT 0,
      weekly_reset_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS music (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      file_data TEXT,
      file_type TEXT,
      order_index INTEGER DEFAULT 0,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_games_slot ON games(slot_index)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_games_published ON games(published)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_music_order ON music(order_index)`);

  saveDatabase();
  dbReady = true;
  console.log("[DATABASE] Ready:", DB_PATH);
}

initDatabase();

module.exports = {
  waitForReady() {
    return new Promise((resolve) => {
      const check = () => (dbReady ? resolve() : setTimeout(check, 50));
      check();
    });
  },

  async seedDatabase() {
    await this.waitForReady();

    const gm = await this.getGameMasterUser();
    if (!gm) {
      const password = process.env.GAME_MASTER_PASSWORD || "master123";
      await this.createUser("Game_Master", password, "https://via.placeholder.com/40");
      console.log("[DATABASE] Seeded Game_Master account");
    }

    const settings = await this.getSiteSettings();
    const stmt = db.prepare("SELECT COUNT(*) as c FROM site_settings");
    const count = getRow(stmt)?.c || 0;
    if (count === 0) {
      await this.saveSiteSettings({
        title: "Crit Strike",
        logo: "https://via.placeholder.com/200",
        updates: "- Welcome to Crit Strike",
        slogan: "Play. Learn. Repeat"
      });
      console.log("[DATABASE] Seeded default site settings");
    }

    return { path: DB_PATH, hasGameMaster: true };
  },

  async createUser(username, password, pfp) {
    const uid = generateId();
    db.run(
      `INSERT INTO users (uid, username, password, pfp, tokens, themes, inventory)
       VALUES (?, ?, ?, ?, 0, '[]', '[]')`,
      [uid, username, password, pfp || "https://via.placeholder.com/40"]
    );
    saveDatabase();
    return { uid, username };
  },

  async getUserByUsername(username) {
    return getRow(db.prepare("SELECT * FROM users WHERE username = ?"), [username]);
  },

  async getGameMasterUser() {
    return getRow(db.prepare("SELECT * FROM users WHERE LOWER(username) = ?"), ["game_master"]);
  },

  async getUserByUid(uid) {
    return getRow(db.prepare("SELECT * FROM users WHERE uid = ?"), [uid]);
  },

  async updateTokens(uid, tokens) {
    db.run("UPDATE users SET tokens = ? WHERE uid = ?", [tokens, uid]);
    saveDatabase();
  },

  async incrementTokens(uid, delta) {
    const user = await this.getUserByUid(uid);
    if (user) await this.updateTokens(uid, user.tokens + delta);
  },

  async getUserThemes(uid) {
    const user = await this.getUserByUid(uid);
    return user ? JSON.parse(user.themes || "[]") : [];
  },

  async updateUserThemes(uid, themes) {
    db.run("UPDATE users SET themes = ? WHERE uid = ?", [JSON.stringify(themes), uid]);
    saveDatabase();
  },

  async addToInventory(uid, item) {
    const user = await this.getUserByUid(uid);
    const inventory = user ? JSON.parse(user.inventory || "[]") : [];
    if (!inventory.includes(item)) {
      inventory.push(item);
      db.run("UPDATE users SET inventory = ? WHERE uid = ?", [JSON.stringify(inventory), uid]);
      saveDatabase();
    }
  },

  normalizeGameRow(g) {
    if (!g) return null;
    return {
      ...g,
      published: g.published === 1 || g.published === true,
      credit_eligible: g.credit_eligible === null ? null : g.credit_eligible === 1
    };
  },

  async getGames(publishedOnly = false) {
    const stmt = publishedOnly
      ? db.prepare("SELECT * FROM games WHERE published = 1 ORDER BY plays_week DESC")
      : db.prepare("SELECT * FROM games ORDER BY updated_at DESC");
    return getRows(stmt).map((g) => this.normalizeGameRow(g));
  },

  async getGameById(gameId) {
    return this.normalizeGameRow(getRow(db.prepare("SELECT * FROM games WHERE id = ?"), [gameId]));
  },

  async createGame(gameData) {
    const id = generateId();
    const creditEligible =
      typeof gameData.creditEligible === "boolean" ? (gameData.creditEligible ? 1 : 0) : null;

    db.run(
      `INSERT INTO games (id, name, thumbnail, game_files, credit_eligible, published, players, plays_week, plays_total, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, CURRENT_TIMESTAMP)`,
      [
        id,
        gameData.name,
        gameData.thumbnail || "",
        JSON.stringify(gameData.gameFiles || {}),
        creditEligible,
        gameData.publish !== false ? 1 : 0
      ]
    );
    saveDatabase();
    return id;
  },

  async updateGameById(gameId, patch) {
    const game = getRow(db.prepare("SELECT * FROM games WHERE id = ?"), [gameId]);
    if (!game) return;

    const published =
      typeof patch.published === "boolean" ? (patch.published ? 1 : 0) : game.published;
    const creditEligible =
      typeof patch.credit_eligible === "boolean"
        ? patch.credit_eligible ? 1 : 0
        : game.credit_eligible;

    db.run(
      `UPDATE games SET
        name = ?, thumbnail = ?, game_files = ?,
        players = ?, plays_week = ?, plays_total = ?,
        credit_eligible = ?, published = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        patch.name !== undefined ? patch.name : game.name,
        patch.thumbnail !== undefined ? patch.thumbnail : game.thumbnail,
        patch.game_files !== undefined ? patch.game_files : game.game_files,
        patch.players !== undefined ? patch.players : game.players,
        patch.plays_week !== undefined ? patch.plays_week : game.plays_week,
        patch.plays_total !== undefined ? patch.plays_total : game.plays_total,
        creditEligible,
        published,
        gameId
      ]
    );
    saveDatabase();
  },

  async deleteGameById(gameId) {
    db.run("DELETE FROM games WHERE id = ?", [gameId]);
    saveDatabase();
  },

  async incrementPlayCountById(gameId) {
    db.run(
      `UPDATE games SET players = players + 1, plays_week = plays_week + 1,
       plays_total = plays_total + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [gameId]
    );
    saveDatabase();
  },

  async setGameCreditEligible(gameId, eligible) {
    db.run("UPDATE games SET credit_eligible = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [
      eligible ? 1 : 0,
      gameId
    ]);
    saveDatabase();
  },

  async ensureWeeklyReset() {
    const weekKey = getWeekKey();
    const metaResult = getRow(db.prepare("SELECT value FROM meta WHERE key = ?"), ["weekly_reset"]);
    const prevWeek = metaResult ? JSON.parse(metaResult.value).weekKey : null;
    if (prevWeek === weekKey) return { didReset: false, weekKey };

    db.run("UPDATE games SET plays_week = 0");
    db.run(
      `INSERT INTO meta (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      ["weekly_reset", JSON.stringify({ weekKey, updatedAt: new Date().toISOString() })]
    );
    saveDatabase();
    return { didReset: true, weekKey };
  },

  async getPlaylist() {
    return getRows(db.prepare("SELECT * FROM music ORDER BY order_index ASC"));
  },

  async uploadMusic(name, fileData, fileType) {
    const result = getRow(db.prepare("SELECT MAX(order_index) as max_order FROM music"));
    const orderIndex = (result?.max_order ?? -1) + 1;
    const id = generateId();
    db.run(
      `INSERT INTO music (id, name, file_data, file_type, order_index) VALUES (?, ?, ?, ?, ?)`,
      [id, name, fileData, fileType, orderIndex]
    );
    saveDatabase();
    return id;
  },

  async deleteMusic(musicId) {
    db.run("DELETE FROM music WHERE id = ?", [musicId]);
    saveDatabase();
  },

  async clearAllMusic() {
    db.run("DELETE FROM music");
    saveDatabase();
  },

  async getSiteSettings() {
    const defaults = {
      title: "Crit Strike",
      logo: "https://via.placeholder.com/200",
      updates: "- Welcome to Crit Strike",
      slogan: "Play. Learn. Repeat"
    };
    const rows = getRows(db.prepare("SELECT key, value FROM site_settings"));
    if (rows.length === 0) return defaults;

    const settings = {};
    rows.forEach((row) => {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    });
    return { ...defaults, ...settings };
  },

  async saveSiteSettings(settings) {
    for (const [key, value] of Object.entries(settings)) {
      db.run(
        `INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [key, JSON.stringify(value)]
      );
    }
    saveDatabase();
    return true;
  },

  async close() {
    if (db) {
      saveDatabase();
      db.close();
    }
  }
};
