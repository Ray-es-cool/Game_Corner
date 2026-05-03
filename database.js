/* =========================
   SQLITE DATABASE MODULE
   CritStrike Persistent Storage
========================= */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database path - use persistent disk on Render
// Render mounts persistent disk at /render_disk
const DB_PATH = process.env.SQLITE_DB_PATH ||
                (process.env.RENDER ? '/render_disk/critstrike.db' : path.join(__dirname, 'critstrike.db'));

// Ensure directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL'); // Better concurrency

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    pfp TEXT DEFAULT 'https://via.placeholder.com/40',
    tokens INTEGER DEFAULT 0,
    themes TEXT DEFAULT '[]',
    inventory TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    slot_index INTEGER UNIQUE,
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
  );

  CREATE TABLE IF NOT EXISTS music (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    file_data TEXT,
    file_type TEXT,
    order_index INTEGER DEFAULT 0,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_games_slot ON games(slot_index);
  CREATE INDEX IF NOT EXISTS idx_games_published ON games(published);
  CREATE INDEX IF NOT EXISTS idx_music_order ON music(order_index);
`);

// Prepared statements for better performance
const stmts = {
  // Users
  createUser: db.prepare(`
    INSERT INTO users (uid, username, password, pfp, tokens, themes, inventory)
    VALUES (?, ?, ?, ?, 0, '[]', '[]')
  `),
  getUserByUid: db.prepare('SELECT * FROM users WHERE uid = ?'),
  getUserByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
  updateUserTokens: db.prepare('UPDATE users SET tokens = ? WHERE uid = ?'),
  updateUserThemes: db.prepare('UPDATE users SET themes = ? WHERE uid = ?'),
  updateUserInventory: db.prepare('UPDATE users SET inventory = ? WHERE uid = ?'),

  // Games
  getGames: db.prepare('SELECT * FROM games ORDER BY updated_at DESC'),
  getPublishedGames: db.prepare(`
    SELECT * FROM games WHERE published = 1 ORDER BY plays_week DESC
  `),
  getGameBySlot: db.prepare('SELECT * FROM games WHERE slot_index = ?'),
  getGameById: db.prepare('SELECT * FROM games WHERE id = ?'),
  upsertGame: db.prepare(`
    INSERT INTO games (id, slot_index, name, thumbnail, game_files, players, plays_week, plays_total, credit_eligible, published, updated_at)
    VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(slot_index) DO UPDATE SET
      name = excluded.name,
      thumbnail = excluded.thumbnail,
      game_files = excluded.game_files,
      credit_eligible = excluded.credit_eligible,
      published = excluded.published,
      updated_at = CURRENT_TIMESTAMP
  `),
  deleteGameBySlot: db.prepare('DELETE FROM games WHERE slot_index = ?'),
  deleteGameById: db.prepare('DELETE FROM games WHERE id = ?'),
  incrementGamePlays: db.prepare(`
    UPDATE games SET
      players = players + 1,
      plays_week = plays_week + 1,
      plays_total = plays_total + 1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  incrementGamePlaysBySlot: db.prepare(`
    UPDATE games SET
      players = players + 1,
      plays_week = plays_week + 1,
      plays_total = plays_total + 1,
      updated_at = CURRENT_TIMESTAMP
    WHERE slot_index = ?
  `),
  setGameCreditEligible: db.prepare(`
    UPDATE games SET credit_eligible = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `),

  // Music
  getMusic: db.prepare('SELECT * FROM music ORDER BY order_index ASC'),
  getNextMusicOrder: db.prepare('SELECT MAX(order_index) as max_order FROM music'),
  insertMusic: db.prepare(`
    INSERT INTO music (id, name, file_data, file_type, order_index)
    VALUES (?, ?, ?, ?, ?)
  `),
  deleteMusic: db.prepare('DELETE FROM music WHERE id = ?'),
  clearMusic: db.prepare('DELETE FROM music'),

  // Site Settings
  getSiteSetting: db.prepare('SELECT value FROM site_settings WHERE key = ?'),
  upsertSiteSetting: db.prepare(`
    INSERT INTO site_settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `),

  // Meta
  getMeta: db.prepare('SELECT value FROM meta WHERE key = ?'),
  upsertMeta: db.prepare(`
    INSERT INTO meta (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `)
};

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

// Database API
module.exports = {
  // USERS
  async createUser(username, password, pfp) {
    const uid = generateId();
    stmts.createUser.run(uid, username, password, pfp || 'https://via.placeholder.com/40');
    return { uid, username };
  },

  getUserByUsername(username) {
    return stmts.getUserByUsername.get(username);
  },

  getUserByUid(uid) {
    return stmts.getUserByUid.get(uid);
  },

  async updateTokens(uid, tokens) {
    stmts.updateUserTokens.run(tokens, uid);
  },

  async incrementTokens(uid, delta) {
    const user = this.getUserByUid(uid);
    if (user) {
      this.updateTokens(uid, user.tokens + delta);
    }
  },

  async getUserThemes(uid) {
    const user = this.getUserByUid(uid);
    return user ? JSON.parse(user.themes || '[]') : [];
  },

  async addUserTheme(uid, themeName) {
    const themes = await this.getUserThemes(uid);
    if (!themes.includes(themeName)) {
      themes.push(themeName);
      stmts.updateUserThemes.run(JSON.stringify(themes), uid);
    }
  },

  async getUserInventory(uid) {
    const user = this.getUserByUid(uid);
    return user ? JSON.parse(user.inventory || '[]') : [];
  },

  async addToInventory(uid, item) {
    const inventory = await this.getUserInventory(uid);
    if (!inventory.includes(item)) {
      inventory.push(item);
      stmts.updateUserInventory.run(JSON.stringify(inventory), uid);
    }
  },

  // GAMES
  async getGames(publishedOnly = false) {
    const games = publishedOnly
      ? stmts.getPublishedGames.all()
      : stmts.getGames.all();
    return games.map(g => ({
      ...g,
      credit_eligible: g.credit_eligible === null ? null : g.credit_eligible === 1
    }));
  },

  async saveGame(slotIndex, gameData) {
    const id = generateId();
    const creditEligible = typeof gameData.creditEligible === 'boolean'
      ? (gameData.creditEligible ? 1 : 0)
      : null;
    stmts.upsertGame.run(
      id,
      slotIndex,
      gameData.name,
      gameData.thumbnail,
      JSON.stringify(gameData.gameFiles || {}),
      creditEligible,
      gameData.publish ? 1 : 0
    );
    return id;
  },

  async createGame(gameData) {
    const id = generateId();
    const creditEligible = typeof gameData.creditEligible === 'boolean'
      ? (gameData.creditEligible ? 1 : 0)
      : null;
    stmts.upsertGame.run(
      id,
      null, // No slot_index for new games
      gameData.name,
      gameData.thumbnail || '',
      JSON.stringify(gameData.gameFiles || {}),
      creditEligible,
      gameData.publish !== false ? 1 : 0
    );
    return id;
  },

  async updateGameById(gameId, patch) {
    const game = stmts.getGameById.get(gameId);
    if (!game) return;

    const updates = { ...game, ...patch };
    const creditEligible = typeof updates.credit_eligible === 'boolean'
      ? (updates.credit_eligible ? 1 : 0)
      : null;

    db.prepare(`
      UPDATE games SET
        name = ?, thumbnail = ?, game_files = ?,
        players = ?, plays_week = ?, plays_total = ?,
        credit_eligible = ?, published = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      updates.name,
      updates.thumbnail,
      updates.game_files,
      updates.players,
      updates.plays_week,
      updates.plays_total,
      creditEligible,
      updates.published ? 1 : 0,
      gameId
    );
  },

  async deleteGameById(gameId) {
    stmts.deleteGameById.run(gameId);
  },

  async deleteGame(slotIndex) {
    stmts.deleteGameBySlot.run(slotIndex);
  },

  async incrementPlayCountById(gameId) {
    stmts.incrementGamePlays.run(gameId);
  },

  async incrementPlayCount(slotIndex) {
    stmts.incrementGamePlaysBySlot.run(slotIndex);
  },

  async setGameCreditEligible(gameId, eligible) {
    stmts.setGameCreditEligible.run(eligible ? 1 : 0, gameId);
  },

  async ensureWeeklyReset() {
    const weekKey = getWeekKey();
    const meta = stmts.getMeta.get('weekly_reset');
    const prevWeek = meta ? JSON.parse(meta.value).weekKey : null;

    if (prevWeek === weekKey) {
      return { didReset: false, weekKey };
    }

    db.prepare('UPDATE games SET plays_week = 0').run();
    stmts.upsertMeta.run('weekly_reset', JSON.stringify({ weekKey, updatedAt: new Date().toISOString() }));
    return { didReset: true, weekKey };
  },

  // MUSIC
  async getPlaylist() {
    return stmts.getMusic.all();
  },

  async uploadMusic(name, fileData, fileType) {
    const result = stmts.getNextMusicOrder.get();
    const orderIndex = (result.max_order ?? -1) + 1;
    const id = generateId();
    stmts.insertMusic.run(id, name, fileData, fileType, orderIndex);
    return id;
  },

  async deleteMusic(musicId) {
    stmts.deleteMusic.run(musicId);
  },

  async clearAllMusic() {
    stmts.clearMusic.run();
  },

  // SITE SETTINGS
  async getSiteSettings() {
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

  async saveSiteSettings(settings) {
    for (const [key, value] of Object.entries(settings)) {
      stmts.upsertSiteSetting.run(key, JSON.stringify(value));
    }
  },

  // META
  async getMeta(key) {
    const result = stmts.getMeta.get(key);
    return result ? JSON.parse(result.value) : null;
  },

  async setMeta(key, value) {
    stmts.upsertMeta.run(key, JSON.stringify(value));
  },

  // Close database connection
  close() {
    db.close();
  }
};
