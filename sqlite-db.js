/* =========================
   API CLIENT — talks to CritStrike server
========================= */

const API_URL = window.location.origin;

function currentUser() {
  return localStorage.getItem("currentUser") || "";
}

function adminHeaders() {
  const headers = { "Content-Type": "application/json" };
  const user = currentUser();
  if (user) headers["X-Username"] = user;
  return headers;
}

async function api(method, url, body) {
  const opts = { method, headers: body ? adminHeaders() : { Accept: "application/json" } };
  if (body) opts.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(API_URL + url, opts);
  } catch {
    throw new Error("Cannot connect to server. It may still be starting up.");
  }

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Server returned an invalid response. Try refreshing the page.");
  }

  if (!res.ok || data.success === false) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

window.SQLiteDB = {
  async createUser(username, password, pfp) {
    const r = await api("POST", "/api/users/signup", { username, password, pfp });
    return { uid: r.uid, username: r.username };
  },

  async login(username, password) {
    const r = await api("POST", "/api/users/login", { username, password });
    return { uid: r.uid, username: r.username, tokens: r.tokens, pfp: r.pfp };
  },

  async logout() {},

  async getUserByUid(uid) {
    try {
      return await api("GET", `/api/users/uid/${uid}`);
    } catch {
      return null;
    }
  },

  async getUserData(uid) {
    return this.getUserByUid(uid);
  },

  async updateTokens(uid, tokens) {
    const user = await this.getUserByUid(uid);
    if (!user) throw new Error("User not found");
    await api("POST", `/api/users/${user.username}`, { tokens });
  },

  async incrementTokens(uid, delta) {
    const user = await this.getUserByUid(uid);
    if (!user) return;
    await this.updateTokens(uid, (user.tokens || 0) + delta);
  },

  async getUserThemes(uid) {
    const user = await this.getUserByUid(uid);
    return user?.themes || [];
  },

  async getSiteSettings() {
    try {
      const r = await api("GET", "/api/site-settings");
      return r.settings;
    } catch {
      return {
        title: "Crit Strike",
        logo: "https://via.placeholder.com/200",
        updates: "- Welcome",
        slogan: "Play. Learn. Repeat"
      };
    }
  },

  async saveSiteSettings(settings) {
    await api("POST", "/api/site-settings", { ...settings, adminUsername: currentUser() });
  },

  async getGames(publishedOnly = false) {
    try {
      const r = await api("GET", publishedOnly ? "/api/games?published=true" : "/api/games");
      return r.games || [];
    } catch {
      return [];
    }
  },

  async createGame(gameData) {
    const r = await api("POST", "/api/games", { gameData, adminUsername: currentUser() });
    return r.id;
  },

  async updateGameById(gameId, patch) {
    await api("PUT", `/api/games/${gameId}`, { ...patch, adminUsername: currentUser() });
  },

  async getGameById(gameId) {
    try {
      const r = await api("GET", `/api/games/${gameId}`);
      return r.game;
    } catch {
      return null;
    }
  },

  async deleteGameById(gameId) {
    let res;
    try {
      res = await fetch(`${API_URL}/api/games/${gameId}`, { method: "DELETE", headers: adminHeaders() });
    } catch {
      throw new Error("Cannot connect to server");
    }
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Failed to delete game");
  },

  async incrementPlayCountById(gameId) {
    try {
      await api("POST", `/api/games/${gameId}/play`);
    } catch (e) {
      console.warn("Play count failed:", e.message);
    }
  },

  async getPlaylist() {
    try {
      const r = await api("GET", "/api/music");
      return r.playlist || [];
    } catch {
      return [];
    }
  },

  async ensureWeeklyReset() {
    try {
      const r = await api("GET", "/api/meta/weekly-reset");
      return { didReset: r.didReset, weekKey: r.weekKey };
    } catch {
      return { didReset: false, weekKey: null };
    }
  }
};

window.FireDB = window.SQLiteDB;
