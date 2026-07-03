/* =========================
   SHARED STATE - HIVE MIND
   Syncs data across all pages
========================= */

const SharedState = {
  currentUser: null,
  currentUid: null,
  tokens: 0,
  games: [],
  playlist: [],
  siteSettings: {},

  isGameMaster() {
    return String(this.currentUser || "").trim().toLowerCase() === "game_master";
  },

  // Initialize shared state
  async init() {
    this.currentUser = localStorage.getItem("currentUser");
    this.currentUid = localStorage.getItem("currentUid");

    // Load everything from server
    await this.loadAll();

    // Listen for changes from other tabs/pages
    window.addEventListener("storage", (e) => this.handleStorageChange(e));

    console.log("[SharedState] Initialized");
  },

  // Load all data from server
  async loadAll() {
    await Promise.all([
      this.loadTokens(),
      this.loadGames(),
      this.loadPlaylist(),
      this.loadSiteSettings()
    ]);
  },

  // Load tokens from server
  async loadTokens() {
    if (!this.currentUid || !window.FireDB) return;
    try {
      const result = await FireDB.getUserData(this.currentUid);
      if (result && result.tokens !== undefined) {
        this.tokens = result.tokens;
        localStorage.setItem(this.currentUser + "_tokens", result.tokens);
      }
    } catch (e) {
      console.warn("[SharedState] Token load failed:", e.message);
      this.tokens = parseInt(localStorage.getItem(this.currentUser + "_tokens")) || 0;
    }
  },

  // Load games from server
  async loadGames() {
    if (!window.FireDB) return;
    try {
      const publishedOnly = !this.isGameMaster();
      this.games = await FireDB.getGames(publishedOnly);
      localStorage.setItem("shared_games", JSON.stringify(this.games));
      localStorage.setItem("shared_games_time", Date.now());
    } catch (e) {
      console.warn("[SharedState] Games load failed:", e.message);
      const cached = localStorage.getItem("shared_games");
      this.games = cached ? JSON.parse(cached) : [];
    }
  },

  // Reload published games for home page / public display
  async reloadGamesForDisplay() {
    if (!window.FireDB) return;
    try {
      this.games = await FireDB.getGames(true);
      localStorage.setItem("shared_games", JSON.stringify(this.games));
      localStorage.setItem("shared_games_time", Date.now());
    } catch (e) {
      console.warn("[SharedState] Games reload failed:", e.message);
    }
  },

  // Load playlist from server
  async loadPlaylist() {
    if (!window.FireDB) return;
    try {
      this.playlist = await FireDB.getPlaylist();
      localStorage.setItem("shared_playlist", JSON.stringify(this.playlist));
      localStorage.setItem("shared_playlist_time", Date.now());
    } catch (e) {
      console.warn("[SharedState] Playlist load failed:", e.message);
      const cached = localStorage.getItem("shared_playlist");
      this.playlist = cached ? JSON.parse(cached) : [];
    }
  },

  // Load site settings from server
  async loadSiteSettings() {
    if (!window.FireDB) return;
    try {
      this.siteSettings = await FireDB.getSiteSettings();
      localStorage.setItem("shared_site_settings", JSON.stringify(this.siteSettings));
      localStorage.setItem("shared_site_settings_time", Date.now());
    } catch (e) {
      console.warn("[SharedState] Site settings load failed:", e.message);
      const cached = localStorage.getItem("shared_site_settings");
      this.siteSettings = cached ? JSON.parse(cached) : {
        title: "Home",
        logo: "https://via.placeholder.com/200",
        updates: "- Ready",
        slogan: "Play. Learn. Repeat"
      };
    }
  },

  // Handle storage changes from other tabs/pages
  handleStorageChange(e) {
    const syncKeys = ["userSync", "tokenSync", "gamesSync", "musicSync", "siteSettingsSync"];

    if (syncKeys.includes(e.key)) {
      console.log("[SharedState] Sync triggered by:", e.key);
      this.sync(e.key);
    }

    if (e.key === "currentUser") {
      this.currentUser = localStorage.getItem("currentUser");
      this.currentUid = localStorage.getItem("currentUid");
      this.loadAll();
    }
  },

  // Sync specific data type
  sync(key) {
    switch (key) {
      case "userSync":
      case "tokenSync":
        this.loadTokens();
        break;
      case "gamesSync":
        this.loadGames();
        break;
      case "musicSync":
        this.loadPlaylist();
        break;
      case "siteSettingsSync":
        this.loadSiteSettings();
        break;
    }
  },

  // Update tokens and sync everywhere
  async updateTokens(newTokens) {
    this.tokens = newTokens;
    localStorage.setItem(this.currentUser + "_tokens", newTokens);
    if (this.currentUid && window.FireDB) {
      try {
        await FireDB.updateTokens(this.currentUid, newTokens);
      } catch (e) {
        console.warn("[SharedState] Token save failed:", e.message);
      }
    }
    localStorage.setItem("tokenSync", Date.now());
  },

  // Add tokens and sync everywhere
  async addTokens(amount) {
    await this.updateTokens(this.tokens + amount);
  },

  // Trigger games sync
  syncGames() {
    localStorage.setItem("gamesSync", Date.now());
  },

  // Trigger music sync
  syncMusic() {
    localStorage.setItem("musicSync", Date.now());
  },

  // Trigger site settings sync
  syncSiteSettings() {
    localStorage.setItem("siteSettingsSync", Date.now());
  },

  // User login - sync everywhere
  async userLogin(username, uid, tokens) {
    this.currentUser = username;
    this.currentUid = uid;
    this.tokens = tokens;
    localStorage.setItem("currentUser", username);
    localStorage.setItem("currentUid", uid);
    localStorage.setItem(username + "_tokens", tokens);
    localStorage.setItem("userSync", Date.now());
    await this.loadAll();
  },

  // User logout - sync everywhere
  userLogout() {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("currentUid");
    this.currentUser = null;
    this.currentUid = null;
    this.tokens = 0;
    localStorage.setItem("userSync", Date.now());
  }
};

// Auto-initialize when script loads
SharedState.initPromise = (async () => {
  if (document.readyState === "loading") {
    await new Promise(resolve => document.addEventListener("DOMContentLoaded", resolve));
  }
  await SharedState.init();
})();
