/* =========================
   SQLITE CLIENT MODULE
   CritStrike Database API Client
========================= */

const API_URL = window.location.origin;

window.SQLiteDB = {
  // USERS
  async createUser(username, password, pfp) {
    const res = await fetch(`${API_URL}/api/users/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, pfp })
    });
    const result = await res.json();
    if (result.success) {
      return { uid: result.uid, username: result.username };
    }
    throw new Error(result.error || 'Signup failed');
  },

  async login(username, password) {
    const res = await fetch(`${API_URL}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const result = await res.json();
    if (result.success) {
      return {
        uid: result.uid,
        username: result.username,
        tokens: result.tokens,
        pfp: result.pfp
      };
    }
    throw new Error(result.error || 'Login failed');
  },

  async logout() {
    // No-op for sessionless auth
  },

  async getUserData(uid) {
    // Need to fetch by username since API uses username
    const res = await fetch(`${API_URL}/api/users/uid/${uid}`);
    const result = await res.json();
    if (result.success) return result;
    return null;
  },

  async updateTokens(uid, tokens) {
    // Tokens updated via username endpoint
  },

  async incrementTokens(uid, delta) {
    // Would need a dedicated endpoint for this
  },

  async getUserThemes(uid) {
    const user = await this.getUserByUid(uid);
    return user?.themes || [];
  },

  async addUserTheme(uid, themeName) {
    const themes = await this.getUserThemes(uid);
    if (!themes.includes(themeName)) {
      themes.push(themeName);
      // Would need update endpoint
    }
  },

  async getUserInventory(uid) {
    const user = await this.getUserByUid(uid);
    return user?.inventory || [];
  },

  async addToInventory(uid, item) {
    // Would need update endpoint
  },

  onAuthChange(callback) {
    // No real-time auth for SQLite - call once on load
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      callback({ username: currentUser });
    } else {
      callback(null);
    }
  },

  // SITE SETTINGS
  async getSiteSettings() {
    const res = await fetch(`${API_URL}/api/site-settings`);
    const result = await res.json();
    if (result.success) {
      return result.settings;
    }
    return {
      title: 'Home',
      logo: 'https://via.placeholder.com/200',
      updates: '- Ready',
      slogan: 'Play. Learn. Repeat'
    };
  },

  async saveSiteSettings(settings) {
    const res = await fetch(`${API_URL}/api/site-settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    const result = await res.json();
    if (!result.success) {
      throw new Error('Failed to save settings');
    }
  },

  // GAMES
  async getGames(publishedOnly = false) {
    const url = publishedOnly
      ? `${API_URL}/api/games?published=true`
      : `${API_URL}/api/games`;
    const res = await fetch(url);
    const result = await res.json();
    if (result.success) {
      return result.games;
    }
    return [];
  },

  async saveGame(slotIndex, gameData) {
    const res = await fetch(`${API_URL}/api/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotIndex, gameData })
    });
    const result = await res.json();
    if (!result.success) {
      throw new Error('Failed to save game');
    }
    return result.id;
  },

  async createGame(gameData) {
    const res = await fetch(`${API_URL}/api/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameData })
    });
    const result = await res.json();
    if (!result.success) {
      throw new Error('Failed to create game');
    }
    return result.id;
  },

  async updateGameById(gameId, patch) {
    // Would need a PUT/PATCH endpoint
  },

  async deleteGameById(gameId) {
    const res = await fetch(`${API_URL}/api/games/${gameId}`, {
      method: 'DELETE'
    });
    const result = await res.json();
    if (!result.success) {
      throw new Error('Failed to delete game');
    }
  },

  async deleteGame(slotIndex) {
    // Delete by slot index - would need dedicated endpoint
    // For now, fetch games and find the ID
    const games = await this.getGames();
    const game = games.find(g => g.slot_index === slotIndex);
    if (game?.id) {
      await this.deleteGameById(game.id);
    }
  },

  async incrementPlayCountById(gameId) {
    const res = await fetch(`${API_URL}/api/games/${gameId}/play`, {
      method: 'POST'
    });
    const result = await res.json();
    if (!result.success) {
      console.error('Failed to increment play count');
    }
  },

  async incrementPlayCount(slotIndex) {
    const games = await this.getGames();
    const game = games.find(g => g.slot_index === slotIndex);
    if (game?.id) {
      await this.incrementPlayCountById(game.id);
    }
  },

  async setGameCreditEligible(gameId, eligible) {
    const res = await fetch(`${API_URL}/api/games/${gameId}/credit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eligible })
    });
    const result = await res.json();
    if (!result.success) {
      throw new Error('Failed to set credit eligibility');
    }
  },

  async ensureWeeklyReset() {
    const res = await fetch(`${API_URL}/api/meta/weekly-reset`);
    const result = await res.json();
    if (result.success) {
      return { didReset: result.didReset, weekKey: result.weekKey };
    }
    return { didReset: false, weekKey: null };
  },

  // MUSIC
  async getPlaylist() {
    const res = await fetch(`${API_URL}/api/music`);
    const result = await res.json();
    if (result.success) {
      return result.playlist;
    }
    return [];
  },

  async getNextOrderIndex() {
    const playlist = await this.getPlaylist();
    if (playlist.length === 0) return 0;
    return Math.max(...playlist.map(m => m.order_index || 0)) + 1;
  },

  async uploadMusic(name, fileData, fileType) {
    const res = await fetch(`${API_URL}/api/music`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, fileData, fileType })
    });
    const result = await res.json();
    if (!result.success) {
      throw new Error('Failed to upload music');
    }
    return result.id;
  },

  async deleteMusic(musicId) {
    const res = await fetch(`${API_URL}/api/music/${musicId}`, {
      method: 'DELETE'
    });
    const result = await res.json();
    if (!result.success) {
      throw new Error('Failed to delete music');
    }
  },

  async clearAllMusic() {
    const res = await fetch(`${API_URL}/api/music`, {
      method: 'DELETE'
    });
    const result = await res.json();
    if (!result.success) {
      throw new Error('Failed to clear music');
    }
  }
};

// Alias FireDB to SQLiteDB for backwards compatibility
window.FireDB = window.SQLiteDB;
