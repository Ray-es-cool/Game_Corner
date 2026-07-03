/* =========================
   SQLITE CLIENT MODULE
   CritStrike Database API Client
========================= */

const API_URL = window.location.origin;
console.log('[SQLiteDB] API URL:', API_URL);

function adminHeaders() {
  const username = localStorage.getItem('currentUser');
  const headers = { 'Content-Type': 'application/json' };
  if (username) headers['X-Username'] = username;
  return headers;
}

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
    // Throw the actual error message from server
    throw new Error(result.error || 'Invalid credentials');
  },

  async logout() {
    // No-op for sessionless auth
  },

  async getUserByUid(uid) {
    const res = await fetch(`${API_URL}/api/users/uid/${uid}`);
    const result = await res.json();
    if (result.success) return result;
    return null;
  },

  async getUserData(uid) {
    // Need to fetch by username since API uses username
    const res = await fetch(`${API_URL}/api/users/uid/${uid}`);
    const result = await res.json();
    if (result.success) return result;
    return null;
  },

  async updateTokens(uid, tokens) {
    // First get username from uid
    const user = await this.getUserByUid(uid);
    if (!user) throw new Error('User not found');

    const res = await fetch(`${API_URL}/api/users/${user.username}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokens })
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Failed to update tokens');
  },

  async incrementTokens(uid, delta) {
    const user = await this.getUserByUid(uid);
    if (!user) throw new Error('User not found');

    const newTokens = (user.tokens || 0) + delta;
    await this.updateTokens(uid, newTokens);
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
      headers: adminHeaders(),
      body: JSON.stringify(settings)
    });
    const result = await res.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to save settings');
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
      headers: adminHeaders(),
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
      headers: adminHeaders(),
      body: JSON.stringify({ gameData })
    });
    const result = await res.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to create game');
    }
    return result.id;
  },

  async updateGameById(gameId, patch) {
    const res = await fetch(`${API_URL}/api/games/${gameId}`, {
      method: 'PUT',
      headers: adminHeaders(),
      body: JSON.stringify(patch)
    });
    const result = await res.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to update game');
    }
  },

  async getGameById(gameId) {
    const res = await fetch(`${API_URL}/api/games/${gameId}`);
    const result = await res.json();
    if (result.success) {
      return result.game || result.data;
    }
    return null;
  },

  async deleteGameById(gameId) {
    const res = await fetch(`${API_URL}/api/games/${gameId}`, {
      method: 'DELETE',
      headers: adminHeaders()
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
      headers: adminHeaders(),
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
      headers: adminHeaders(),
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
      method: 'DELETE',
      headers: adminHeaders()
    });
    const result = await res.json();
    if (!result.success) {
      throw new Error('Failed to delete music');
    }
  },

  async clearAllMusic() {
    const res = await fetch(`${API_URL}/api/music`, {
      method: 'DELETE',
      headers: adminHeaders()
    });
    const result = await res.json();
    if (!result.success) {
      throw new Error('Failed to clear music');
    }
  }
};

// Alias FireDB to SQLiteDB for backwards compatibility
window.FireDB = window.SQLiteDB;
