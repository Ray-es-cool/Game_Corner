/* =========================
   SHARED STATE — syncs data across pages
========================= */

const SharedState = {
  currentUser: null,
  currentUid: null,
  tokens: 0,
  games: [],
  siteSettings: {},

  isGameMaster() {
    return String(this.currentUser || "").trim().toLowerCase() === "game_master";
  },

  async init() {
    this.currentUser = localStorage.getItem("currentUser");
    this.currentUid = localStorage.getItem("currentUid");
    this.tokens = parseInt(localStorage.getItem((this.currentUser || "") + "_tokens")) || 0;

    await Promise.all([
      this.loadTokens(),
      this.loadGames(),
      this.loadSiteSettings()
    ]);

    window.addEventListener("storage", (e) => this.onStorage(e));
  },

  async loadTokens() {
    if (!this.currentUid || !window.FireDB) return;
    try {
      const user = await FireDB.getUserData(this.currentUid);
      if (user?.tokens !== undefined) {
        this.tokens = user.tokens;
        localStorage.setItem(this.currentUser + "_tokens", user.tokens);
      }
    } catch {
      this.tokens = parseInt(localStorage.getItem(this.currentUser + "_tokens")) || 0;
    }
  },

  async loadGames() {
    if (!window.FireDB) return;
    try {
      this.games = await FireDB.getGames(!this.isGameMaster());
      localStorage.setItem("shared_games", JSON.stringify(this.games));
    } catch {
      const cached = localStorage.getItem("shared_games");
      this.games = cached ? JSON.parse(cached) : [];
    }
  },

  async reloadGamesForDisplay() {
    if (!window.FireDB) return;
    this.games = await FireDB.getGames(true);
    localStorage.setItem("shared_games", JSON.stringify(this.games));
  },

  async loadSiteSettings() {
    try {
      if (window.GlobalMemory && typeof GlobalMemory.load === 'function') {
        this.siteSettings = await GlobalMemory.load();
      } else if (window.FireDB && typeof FireDB.getSiteSettings === 'function') {
        this.siteSettings = await FireDB.getSiteSettings();
      } else {
        const cached = localStorage.getItem("shared_site_settings");
        this.siteSettings = cached ? JSON.parse(cached) : {};
      }
      localStorage.setItem("shared_site_settings", JSON.stringify(this.siteSettings));
    } catch (e) {
      const cached = localStorage.getItem("shared_site_settings");
      this.siteSettings = cached ? JSON.parse(cached) : {};
    }
  },

  onStorage(e) {
    if (e.key === "userSync" || e.key === "currentUser") {
      this.currentUser = localStorage.getItem("currentUser");
      this.currentUid = localStorage.getItem("currentUid");
      this.loadTokens();
      this.loadGames();
    }
    if (e.key === "tokenSync") this.loadTokens();
    if (e.key === "gamesSync") this.loadGames();
    if (e.key === "siteSettingsSync") this.loadSiteSettings();
  },

  syncGames() {
    localStorage.setItem("gamesSync", Date.now());
  },

  syncSiteSettings() {
    localStorage.setItem("siteSettingsSync", Date.now());
  },

  async userLogin(username, uid, tokens) {
    this.currentUser = username;
    this.currentUid = uid;
    this.tokens = tokens;
    localStorage.setItem("currentUser", username);
    localStorage.setItem("currentUid", uid);
    localStorage.setItem(username + "_tokens", tokens);
    localStorage.setItem("userSync", Date.now());
    await this.loadGames();
    await this.loadSiteSettings();
  },

  userLogout() {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("currentUid");
    this.currentUser = null;
    this.currentUid = null;
    this.tokens = 0;
    localStorage.setItem("userSync", Date.now());
  },

  async updateTokens(n) {
    this.tokens = n;
    localStorage.setItem(this.currentUser + "_tokens", n);
    if (this.currentUid) await FireDB.updateTokens(this.currentUid, n);
    localStorage.setItem("tokenSync", Date.now());
  }
};

SharedState.initPromise = (async () => {
  if (document.readyState === "loading") {
    await new Promise((r) => document.addEventListener("DOMContentLoaded", r));
  }
  await SharedState.init();
})();
