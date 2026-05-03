/* =========================
   TURSO DATABASE MODULE
   CritStrike Cloud SQLite Storage

   Uses Turso (libsql) - free cloud SQLite
   Setup: https://turso.tech
========================= */

const { createClient } = require('@libsql/client');

// Turso connection - uses environment variables
const TURSO_URL = process.env.TURSO_DATABASE_URL || '';
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || '';

// Create Turso client
const turso = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN
});

// Initialize tables
async function initDatabase() {
  await turso.execute(`
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

  await turso.execute(`
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

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS music (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      file_data TEXT,
      file_type TEXT,
      order_index INTEGER DEFAULT 0,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes
  await turso.execute(`CREATE INDEX IF NOT EXISTS idx_games_slot ON games(slot_index)`);
  await turso.execute(`CREATE INDEX IF NOT EXISTS idx_games_published ON games(published)`);
  await turso.execute(`CREATE INDEX IF NOT EXISTS idx_music_order ON music(order_index)`);
}

// Initialize on load
initDatabase().catch(err => console.error('Database init error:', err));

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
    await turso.execute({
      sql: `INSERT INTO users (uid, username, password, pfp, tokens, themes, inventory)
            VALUES (?, ?, ?, ?, 0, '[]', '[]')`,
      args: [uid, username, password, pfp || 'https://via.placeholder.com/40']
    });
    return { uid, username };
  },

  async getUserByUsername(username) {
    const result = await turso.execute({
      sql: 'SELECT * FROM users WHERE username = ?',
      args: [username]
    });
    return result.rows[0] || null;
  },

  async getUserByUid(uid) {
    const result = await turso.execute({
      sql: 'SELECT * FROM users WHERE uid = ?',
      args: [uid]
    });
    return result.rows[0] || null;
  },

  async updateTokens(uid, tokens) {
    await turso.execute({
      sql: 'UPDATE users SET tokens = ? WHERE uid = ?',
      args: [tokens, uid]
    });
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
      await turso.execute({
        sql: 'UPDATE users SET themes = ? WHERE uid = ?',
        args: [JSON.stringify(themes), uid]
      });
    }
  },

  async getUserInventory(uid) {
    const user = await this.getUserByUid(uid);
    return user ? JSON.parse(user.inventory || '[]') : [];
  },

  async addToInventory(uid, item) {
    const inventory = await this.getUserInventory(uid);
    if (!inventory.includes(item)) {
      inventory.push(item);
      await turso.execute({
        sql: 'UPDATE users SET inventory = ? WHERE uid = ?',
        args: [JSON.stringify(inventory), uid]
      });
    }
  },

  // GAMES
  async getGames(publishedOnly = false) {
    let result;
    if (publishedOnly) {
      result = await turso.execute({
        sql: 'SELECT * FROM games WHERE published = 1 ORDER BY plays_week DESC'
      });
    } else {
      result = await turso.execute({
        sql: 'SELECT * FROM games ORDER BY updated_at DESC'
      });
    }
    return result.rows.map(g => ({
      ...g,
      credit_eligible: g.credit_eligible === null ? null : g.credit_eligible === 1
    }));
  },

  async saveGame(slotIndex, gameData) {
    const id = generateId();
    const creditEligible = typeof gameData.creditEligible === 'boolean'
      ? (gameData.creditEligible ? 1 : 0)
      : null;

    // Check if exists
    const existing = await turso.execute({
      sql: 'SELECT * FROM games WHERE slot_index = ?',
      args: [slotIndex]
    });

    if (existing.rows.length > 0) {
      await turso.execute({
        sql: `UPDATE games SET
          name = ?, thumbnail = ?, game_files = ?,
          credit_eligible = ?, published = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE slot_index = ?`,
        args: [
          gameData.name,
          gameData.thumbnail,
          JSON.stringify(gameData.gameFiles || {}),
          creditEligible,
          gameData.publish ? 1 : 0,
          slotIndex
        ]
      });
    } else {
      await turso.execute({
        sql: `INSERT INTO games (id, slot_index, name, thumbnail, game_files, players, plays_week, plays_total, credit_eligible, published, updated_at)
          VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?, ?, CURRENT_TIMESTAMP)`,
        args: [
          id,
          slotIndex,
          gameData.name,
          gameData.thumbnail,
          JSON.stringify(gameData.gameFiles || {}),
          creditEligible,
          gameData.publish ? 1 : 0
        ]
      });
    }
    return id;
  },

  async createGame(gameData) {
    const id = generateId();
    const creditEligible = typeof gameData.creditEligible === 'boolean'
      ? (gameData.creditEligible ? 1 : 0)
      : null;

    await turso.execute({
      sql: `INSERT INTO games (id, name, thumbnail, game_files, credit_eligible, published, players, plays_week, plays_total, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, CURRENT_TIMESTAMP)`,
      args: [
        id,
        gameData.name,
        gameData.thumbnail || '',
        JSON.stringify(gameData.gameFiles || {}),
        creditEligible,
        gameData.publish !== false ? 1 : 0
      ]
    });
    return id;
  },

  async updateGameById(gameId, patch) {
    const gameResult = await turso.execute({
      sql: 'SELECT * FROM games WHERE id = ?',
      args: [gameId]
    });

    if (gameResult.rows.length === 0) return;

    const game = gameResult.rows[0];
    const updates = { ...game, ...patch };
    const creditEligible = typeof updates.credit_eligible === 'boolean'
      ? (updates.credit_eligible ? 1 : 0)
      : null;

    await turso.execute({
      sql: `UPDATE games SET
        name = ?, thumbnail = ?, game_files = ?,
        players = ?, plays_week = ?, plays_total = ?,
        credit_eligible = ?, published = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      args: [
        updates.name,
        updates.thumbnail,
        updates.game_files,
        updates.players,
        updates.plays_week,
        updates.plays_total,
        creditEligible,
        updates.published ? 1 : 0,
        gameId
      ]
    });
  },

  async deleteGameById(gameId) {
    await turso.execute({
      sql: 'DELETE FROM games WHERE id = ?',
      args: [gameId]
    });
  },

  async deleteGame(slotIndex) {
    await turso.execute({
      sql: 'DELETE FROM games WHERE slot_index = ?',
      args: [slotIndex]
    });
  },

  async incrementPlayCountById(gameId) {
    await turso.execute({
      sql: `UPDATE games SET
        players = players + 1,
        plays_week = plays_week + 1,
        plays_total = plays_total + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      args: [gameId]
    });
  },

  async incrementPlayCount(slotIndex) {
    await turso.execute({
      sql: `UPDATE games SET
        players = players + 1,
        plays_week = plays_week + 1,
        plays_total = plays_total + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE slot_index = ?`,
      args: [slotIndex]
    });
  },

  async setGameCreditEligible(gameId, eligible) {
    await turso.execute({
      sql: 'UPDATE games SET credit_eligible = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [eligible ? 1 : 0, gameId]
    });
  },

  async ensureWeeklyReset() {
    const weekKey = getWeekKey();
    const metaResult = await turso.execute({
      sql: 'SELECT value FROM meta WHERE key = ?',
      args: ['weekly_reset']
    });

    const prevWeek = metaResult.rows.length > 0
      ? JSON.parse(metaResult.rows[0].value).weekKey
      : null;

    if (prevWeek === weekKey) {
      return { didReset: false, weekKey };
    }

    await turso.execute('UPDATE games SET plays_week = 0');
    await turso.execute({
      sql: `INSERT INTO meta (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      args: ['weekly_reset', JSON.stringify({ weekKey, updatedAt: new Date().toISOString() })]
    });

    return { didReset: true, weekKey };
  },

  // MUSIC
  async getPlaylist() {
    const result = await turso.execute({
      sql: 'SELECT * FROM music ORDER BY order_index ASC'
    });
    return result.rows;
  },

  async uploadMusic(name, fileData, fileType) {
    const orderResult = await turso.execute({
      sql: 'SELECT MAX(order_index) as max_order FROM music'
    });
    const orderIndex = (orderResult.rows[0]?.max_order ?? -1) + 1;
    const id = generateId();

    await turso.execute({
      sql: 'INSERT INTO music (id, name, file_data, file_type, order_index) VALUES (?, ?, ?, ?, ?)',
      args: [id, name, fileData, fileType, orderIndex]
    });
    return id;
  },

  async deleteMusic(musicId) {
    await turso.execute({
      sql: 'DELETE FROM music WHERE id = ?',
      args: [musicId]
    });
  },

  async clearAllMusic() {
    await turso.execute('DELETE FROM music');
  },

  // SITE SETTINGS
  async getSiteSettings() {
    const defaults = {
      title: 'Home',
      logo: 'https://via.placeholder.com/200',
      updates: '- Ready',
      slogan: 'Play. Learn. Repeat'
    };

    const result = await turso.execute('SELECT key, value FROM site_settings');
    if (result.rows.length === 0) return defaults;

    const settings = {};
    result.rows.forEach(row => {
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
      await turso.execute({
        sql: `INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        args: [key, JSON.stringify(value)]
      });
    }
  },

  // META
  async getMeta(key) {
    const result = await turso.execute({
      sql: 'SELECT value FROM meta WHERE key = ?',
      args: [key]
    });
    return result.rows.length > 0 ? JSON.parse(result.rows[0].value) : null;
  },

  async setMeta(key, value) {
    await turso.execute({
      sql: `INSERT INTO meta (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      args: [key, JSON.stringify(value)]
    });
  },

  // Close database connection
  close() {
    turso.close();
  }
};
