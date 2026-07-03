/* =========================
   SQLITE DATABASE MODULE
   CritStrike Local SQLite Storage

   Uses sql.js - pure JavaScript SQLite (no native dependencies)
   Database file: critstrike.db
========================= */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

// Local SQLite database file
// On Render, use /tmp if /render_disk isn't available yet
let DB_PATH = process.env.SQLITE_DB_PATH ||
                path.join(__dirname, 'critstrike.db');

let db = null;
let dbReady = false;

// Ensure database directory exists (skip if no permission)
const dbDir = path.dirname(DB_PATH);
try {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
} catch (err) {
  console.warn('[DATABASE] Cannot create', dbDir, '- using /tmp instead');
  DB_PATH = '/tmp/critstrike.db';
}

// Initialize database
async function initDatabase() {
  const SQL = await initSqlJs();

  // Load existing database or create new
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
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

  // Create indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_games_slot ON games(slot_index)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_games_published ON games(published)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_music_order ON music(order_index)`);

  // Save initial database
  saveDatabase();
  dbReady = true;

  console.log('[DATABASE] SQLite initialized: ' + DB_PATH);
}

// Save database to file
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// Initialize on load
initDatabase();

// Helper functions
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function getWeekKey() {
  const now = new Date();
  const day = now.getDay();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - day);
  return sunday.toISOString().split('T')[0];
}

// Helper to get single row
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

// Helper to get all rows
function getRows(stmt, params = []) {
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Database API - all methods are async for compatibility
module.exports = {
  // Wait for database to be ready
  waitForReady() {
    return new Promise((resolve) => {
      const check = () => {
        if (dbReady) resolve();
        else setTimeout(check, 50);
      };
      check();
    });
  },

  // USERS
  async createUser(username, password, pfp) {
    const uid = generateId();
    db.run(`
      INSERT INTO users (uid, username, password, pfp, tokens, themes, inventory)
      VALUES (?, ?, ?, ?, 0, '[]', '[]')
    `, [uid, username, password, pfp || 'https://via.placeholder.com/40']);
    saveDatabase();
    return { uid, username };
  },

  async getUserByUsername(username) {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return getRow(stmt, [username]);
  },

  async getGameMasterUser() {
    const stmt = db.prepare('SELECT * FROM users WHERE LOWER(username) = ?');
    return getRow(stmt, ['game_master']);
  },

  async getUserByUid(uid) {
    const stmt = db.prepare('SELECT * FROM users WHERE uid = ?');
    return getRow(stmt, [uid]);
  },

  async updateTokens(uid, tokens) {
    db.run('UPDATE users SET tokens = ? WHERE uid = ?', [tokens, uid]);
    saveDatabase();
  },

  async incrementTokens(uid, delta) {
    const user = await this.getUserByUid(uid);
    if (user) {
      await this.updateTokens(uid, user.tokens + delta);
    }
  },

  async getUserThemes(uid) {
    const user = await this.getUserByUid(uid);
    return user ? JSON.parse(user.themes || '[]') : [];
  },

  async addUserTheme(uid, themeName) {
    const themes = await this.getUserThemes(uid);
    if (!themes.includes(themeName)) {
      themes.push(themeName);
      db.run('UPDATE users SET themes = ? WHERE uid = ?', [JSON.stringify(themes), uid]);
      saveDatabase();
    }
  },

  async updateUserThemes(uid, themes) {
    db.run('UPDATE users SET themes = ? WHERE uid = ?', [JSON.stringify(themes), uid]);
    saveDatabase();
  },

  async getUserInventory(uid) {
    const user = await this.getUserByUid(uid);
    return user ? JSON.parse(user.inventory || '[]') : [];
  },

  async addToInventory(uid, item) {
    const inventory = await this.getUserInventory(uid);
    if (!inventory.includes(item)) {
      inventory.push(item);
      db.run('UPDATE users SET inventory = ? WHERE uid = ?', [JSON.stringify(inventory), uid]);
      saveDatabase();
    }
  },

  // GAMES
  normalizeGameRow(g) {
    if (!g) return null;
    return {
      ...g,
      published: g.published === 1 || g.published === true,
      credit_eligible: g.credit_eligible === null ? null : g.credit_eligible === 1
    };
  },

  async getGames(publishedOnly = false) {
    let stmt;
    if (publishedOnly) {
      stmt = db.prepare('SELECT * FROM games WHERE published = 1 ORDER BY plays_week DESC');
    } else {
      stmt = db.prepare('SELECT * FROM games ORDER BY updated_at DESC');
    }
    const games = getRows(stmt);
    return games.map(g => this.normalizeGameRow(g));
  },

  async getGameById(gameId) {
    const stmt = db.prepare('SELECT * FROM games WHERE id = ?');
    const game = getRow(stmt, [gameId]);
    return this.normalizeGameRow(game);
  },

  async saveGame(slotIndex, gameData) {
    const creditEligible = typeof gameData.creditEligible === 'boolean'
      ? (gameData.creditEligible ? 1 : 0)
      : null;

    // Check if exists
    const stmt = db.prepare('SELECT * FROM games WHERE slot_index = ?');
    const existing = getRow(stmt, [slotIndex]);

    if (existing) {
      db.run(`
        UPDATE games SET
          name = ?, thumbnail = ?, game_files = ?,
          credit_eligible = ?, published = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE slot_index = ?
      `, [
        gameData.name,
        gameData.thumbnail,
        JSON.stringify(gameData.gameFiles || {}),
        creditEligible,
        gameData.publish ? 1 : 0,
        slotIndex
      ]);
      saveDatabase();
      return existing.id;
    } else {
      const id = generateId();
      db.run(`
        INSERT INTO games (id, slot_index, name, thumbnail, game_files, players, plays_week, plays_total, credit_eligible, published, updated_at)
        VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?, ?, CURRENT_TIMESTAMP)
      `, [
        id,
        slotIndex,
        gameData.name,
        gameData.thumbnail,
        JSON.stringify(gameData.gameFiles || {}),
        creditEligible,
        gameData.publish ? 1 : 0
      ]);
      saveDatabase();
      return id;
    }
  },

  async createGame(gameData) {
    const id = generateId();
    const creditEligible = typeof gameData.creditEligible === 'boolean'
      ? (gameData.creditEligible ? 1 : 0)
      : null;

    db.run(`
      INSERT INTO games (id, name, thumbnail, game_files, credit_eligible, published, players, plays_week, plays_total, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, CURRENT_TIMESTAMP)
    `, [
      id,
      gameData.name,
      gameData.thumbnail || '',
      JSON.stringify(gameData.gameFiles || {}),
      creditEligible,
      gameData.publish !== false ? 1 : 0
    ]);
    saveDatabase();
    return id;
  },

  async updateGameById(gameId, patch) {
    const stmt = db.prepare('SELECT * FROM games WHERE id = ?');
    const game = getRow(stmt, [gameId]);
    if (!game) return;

    const name = patch.name !== undefined ? patch.name : game.name;
    const thumbnail = patch.thumbnail !== undefined ? patch.thumbnail : game.thumbnail;
    const gameFiles = patch.game_files !== undefined ? patch.game_files : game.game_files;
    const players = patch.players !== undefined ? patch.players : game.players;
    const playsWeek = patch.plays_week !== undefined ? patch.plays_week : game.plays_week;
    const playsTotal = patch.plays_total !== undefined ? patch.plays_total : game.plays_total;

    const creditEligible = typeof patch.credit_eligible === 'boolean'
      ? (patch.credit_eligible ? 1 : 0)
      : game.credit_eligible;

    const published = typeof patch.published === 'boolean'
      ? (patch.published ? 1 : 0)
      : game.published;

    db.run(`
      UPDATE games SET
        name = ?, thumbnail = ?, game_files = ?,
        players = ?, plays_week = ?, plays_total = ?,
        credit_eligible = ?, published = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      name,
      thumbnail,
      gameFiles,
      players,
      playsWeek,
      playsTotal,
      creditEligible,
      published,
      gameId
    ]);
    saveDatabase();
  },

  async deleteGameById(gameId) {
    db.run('DELETE FROM games WHERE id = ?', [gameId]);
    saveDatabase();
  },

  async deleteGame(slotIndex) {
    db.run('DELETE FROM games WHERE slot_index = ?', [slotIndex]);
    saveDatabase();
  },

  async incrementPlayCountById(gameId) {
    db.run(`
      UPDATE games SET
        players = players + 1,
        plays_week = plays_week + 1,
        plays_total = plays_total + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [gameId]);
    saveDatabase();
  },

  async incrementPlayCount(slotIndex) {
    db.run(`
      UPDATE games SET
        players = players + 1,
        plays_week = plays_week + 1,
        plays_total = plays_total + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE slot_index = ?
    `, [slotIndex]);
    saveDatabase();
  },

  async setGameCreditEligible(gameId, eligible) {
    db.run('UPDATE games SET credit_eligible = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [eligible ? 1 : 0, gameId]);
    saveDatabase();
  },

  async ensureWeeklyReset() {
    const weekKey = getWeekKey();
    const stmt = db.prepare('SELECT value FROM meta WHERE key = ?');
    const metaResult = getRow(stmt, ['weekly_reset']);

    const prevWeek = metaResult ? JSON.parse(metaResult.value).weekKey : null;

    if (prevWeek === weekKey) {
      return { didReset: false, weekKey };
    }

    db.run('UPDATE games SET plays_week = 0');
    db.run(`
      INSERT INTO meta (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `, ['weekly_reset', JSON.stringify({ weekKey, updatedAt: new Date().toISOString() })]);
    saveDatabase();

    return { didReset: true, weekKey };
  },

  // MUSIC
  async getPlaylist() {
    const stmt = db.prepare('SELECT * FROM music ORDER BY order_index ASC');
    return getRows(stmt);
  },

  async uploadMusic(name, fileData, fileType) {
    const stmt = db.prepare('SELECT MAX(order_index) as max_order FROM music');
    const result = getRow(stmt);
    const orderIndex = (result?.max_order ?? -1) + 1;
    const id = generateId();

    db.run(`
      INSERT INTO music (id, name, file_data, file_type, order_index)
      VALUES (?, ?, ?, ?, ?)
    `, [id, name, fileData, fileType, orderIndex]);
    saveDatabase();
    return id;
  },

  async deleteMusic(musicId) {
    db.run('DELETE FROM music WHERE id = ?', [musicId]);
    saveDatabase();
  },

  async clearAllMusic() {
    db.run('DELETE FROM music');
    saveDatabase();
  },

  // SITE SETTINGS
  async getSiteSettings() {
    const defaults = {
      title: 'Home',
      logo: 'https://via.placeholder.com/200',
      updates: '- Ready',
      slogan: 'Play. Learn. Repeat'
    };

    const stmt = db.prepare('SELECT key, value FROM site_settings');
    const rows = getRows(stmt);
    if (rows.length === 0) return defaults;

    const settings = {};
    rows.forEach(row => {
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
      db.run(`
        INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `, [key, JSON.stringify(value)]);
    }
    saveDatabase();
    return true;
  },

  // META
  async getMeta(key) {
    const stmt = db.prepare('SELECT value FROM meta WHERE key = ?');
    const row = getRow(stmt, [key]);
    return row ? JSON.parse(row.value) : null;
  },

  async setMeta(key, value) {
    db.run(`
      INSERT INTO meta (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `, [key, JSON.stringify(value)]);
    saveDatabase();
  },

  // Close database connection
  async close() {
    if (db) {
      saveDatabase();
      db.close();
    }
  }
};
