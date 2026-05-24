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
const DB_PATH = path.join(__dirname, 'critstrike.db');

let db = null;

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

// Database API
module.exports = {
  // USERS
  createUser(username, password, pfp) {
    const uid = generateId();
    db.run(`
      INSERT INTO users (uid, username, password, pfp, tokens, themes, inventory)
      VALUES (?, ?, ?, ?, 0, '[]', '[]')
    `, [uid, username, password, pfp || 'https://via.placeholder.com/40']);
    saveDatabase();
    return { uid, username };
  },

  getUserByUsername(username) {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return getRow(stmt, [username]);
  },

  getUserByUid(uid) {
    const stmt = db.prepare('SELECT * FROM users WHERE uid = ?');
    return getRow(stmt, [uid]);
  },

  updateTokens(uid, tokens) {
    db.run('UPDATE users SET tokens = ? WHERE uid = ?', [tokens, uid]);
    saveDatabase();
  },

  incrementTokens(uid, delta) {
    const user = this.getUserByUid(uid);
    if (user) {
      this.updateTokens(uid, user.tokens + delta);
    }
  },

  getUserThemes(uid) {
    const user = this.getUserByUid(uid);
    return user ? JSON.parse(user.themes || '[]') : [];
  },

  addUserTheme(uid, themeName) {
    const themes = this.getUserThemes(uid);
    if (!themes.includes(themeName)) {
      themes.push(themeName);
      db.run('UPDATE users SET themes = ? WHERE uid = ?', [JSON.stringify(themes), uid]);
      saveDatabase();
    }
  },

  getUserInventory(uid) {
    const user = this.getUserByUid(uid);
    return user ? JSON.parse(user.inventory || '[]') : [];
  },

  addToInventory(uid, item) {
    const inventory = this.getUserInventory(uid);
    if (!inventory.includes(item)) {
      inventory.push(item);
      db.run('UPDATE users SET inventory = ? WHERE uid = ?', [JSON.stringify(inventory), uid]);
      saveDatabase();
    }
  },

  // GAMES
  getGames(publishedOnly = false) {
    let stmt;
    if (publishedOnly) {
      stmt = db.prepare('SELECT * FROM games WHERE published = 1 ORDER BY plays_week DESC');
    } else {
      stmt = db.prepare('SELECT * FROM games ORDER BY updated_at DESC');
    }
    const games = getRows(stmt);
    return games.map(g => ({
      ...g,
      credit_eligible: g.credit_eligible === null ? null : g.credit_eligible === 1
    }));
  },

  saveGame(slotIndex, gameData) {
    const creditEligible = typeof gameData.creditEligible === 'boolean'
      ? (gameData.creditEligible ? 1 : 0)
      : null;

    // Check if exists
    const existing = db.prepare('SELECT * FROM games WHERE slot_index = ?').get([slotIndex]);

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

  createGame(gameData) {
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

  updateGameById(gameId, patch) {
    const game = db.prepare('SELECT * FROM games WHERE id = ?').get([gameId]);
    if (!game) return;

    const updates = { ...game, ...patch };
    const creditEligible = typeof updates.credit_eligible === 'boolean'
      ? (updates.credit_eligible ? 1 : 0)
      : null;

    db.run(`
      UPDATE games SET
        name = ?, thumbnail = ?, game_files = ?,
        players = ?, plays_week = ?, plays_total = ?,
        credit_eligible = ?, published = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      updates.name,
      updates.thumbnail,
      updates.game_files,
      updates.players,
      updates.plays_week,
      updates.plays_total,
      creditEligible,
      updates.published ? 1 : 0,
      gameId
    ]);
    saveDatabase();
  },

  deleteGameById(gameId) {
    db.run('DELETE FROM games WHERE id = ?', [gameId]);
    saveDatabase();
  },

  deleteGame(slotIndex) {
    db.run('DELETE FROM games WHERE slot_index = ?', [slotIndex]);
    saveDatabase();
  },

  incrementPlayCountById(gameId) {
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

  incrementPlayCount(slotIndex) {
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

  setGameCreditEligible(gameId, eligible) {
    db.run('UPDATE games SET credit_eligible = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [eligible ? 1 : 0, gameId]);
    saveDatabase();
  },

  ensureWeeklyReset() {
    const weekKey = getWeekKey();
    const metaResult = db.prepare('SELECT value FROM meta WHERE key = ?').get(['weekly_reset']);

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
  getPlaylist() {
    const stmt = db.prepare('SELECT * FROM music ORDER BY order_index ASC');
    return getRows(stmt);
  },

  uploadMusic(name, fileData, fileType) {
    const result = db.prepare('SELECT MAX(order_index) as max_order FROM music').get();
    const orderIndex = (result.max_order ?? -1) + 1;
    const id = generateId();

    db.run(`
      INSERT INTO music (id, name, file_data, file_type, order_index)
      VALUES (?, ?, ?, ?, ?)
    `, [id, name, fileData, fileType, orderIndex]);
    saveDatabase();
    return id;
  },

  deleteMusic(musicId) {
    db.run('DELETE FROM music WHERE id = ?', [musicId]);
    saveDatabase();
  },

  clearAllMusic() {
    db.run('DELETE FROM music');
    saveDatabase();
  },

  // SITE SETTINGS
  getSiteSettings() {
    const defaults = {
      title: 'Home',
      logo: 'https://via.placeholder.com/200',
      updates: '- Ready',
      slogan: 'Play. Learn. Repeat'
    };

    const rows = db.prepare('SELECT key, value FROM site_settings').all();
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

  saveSiteSettings(settings) {
    for (const [key, value] of Object.entries(settings)) {
      db.run(`
        INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `, [key, JSON.stringify(value)]);
    }
    saveDatabase();
  },

  // META
  getMeta(key) {
    const row = db.prepare('SELECT value FROM meta WHERE key = ?').get([key]);
    return row ? JSON.parse(row.value) : null;
  },

  setMeta(key, value) {
    db.run(`
      INSERT INTO meta (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `, [key, JSON.stringify(value)]);
    saveDatabase();
  },

  // Close database connection
  close() {
    if (db) {
      saveDatabase();
      db.close();
    }
  }
};
