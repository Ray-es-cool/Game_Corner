/* =========================
   CRITSTRIKE API CLIENT
   Firebase Cloud Database Version
========================= */

const API = {
  /* =========================
     USER AUTH
  ========================= */
  async signup(username, password, pfp) {
    try {
      const result = await FireDB.createUser(username, password, pfp);
      return { success: true, username: result.username, uid: result.uid };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async login(username, password) {
    try {
      const result = await FireDB.login(username, password);
      return {
        success: true,
        username: result.username,
        tokens: result.tokens,
        pfp: result.pfp,
        uid: result.uid
      };
    } catch (err) {
      return { success: false, error: "Invalid username or password" };
    }
  },

  async getUser(uid) {
    try {
      const data = await FireDB.getUserData(uid);
      return { success: true, ...data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async updateTokens(uid, tokens) {
    try {
      await FireDB.updateTokens(uid, tokens);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /* =========================
     SITE SETTINGS
  ========================= */
  async getSite() {
    try {
      const data = await FireDB.getSiteSettings();
      return data;
    } catch (err) {
      console.error("Failed to load site settings:", err);
      return {
        title: "Home",
        logo: "https://via.placeholder.com/200",
        updates: "- Loading...",
        slogan: "Play. Learn. Repeat"
      };
    }
  },

  async saveSite(settings) {
    try {
      await FireDB.saveSiteSettings(settings);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /* =========================
     GAMES
  ========================= */
  async getGames(published = true) {
    try {
      return await FireDB.getGames(published);
    } catch (err) {
      console.error("Failed to load games:", err);
      return [];
    }
  },

  async saveGame(slotIndex, { name, thumbnail, gameFiles, publish }) {
    try {
      await FireDB.saveGame(slotIndex, { name, thumbnail, gameFiles, publish });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async deleteGame(slotIndex) {
    try {
      await FireDB.deleteGame(slotIndex);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async playGame(slotIndex) {
    try {
      await FireDB.incrementPlayCount(slotIndex);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /* =========================
     MUSIC
  ========================= */
  async getMusic() {
    try {
      return await FireDB.getPlaylist();
    } catch (err) {
      console.error("Failed to load music:", err);
      return [];
    }
  },

  async uploadMusic(name, fileData, fileType) {
    try {
      const id = await FireDB.uploadMusic(name, fileData, fileType);
      return { success: true, id };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async deleteMusic(musicId) {
    try {
      await FireDB.deleteMusic(musicId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async clearAllMusic() {
    try {
      await FireDB.clearAllMusic();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};

/* =========================
   SYNC HELPER
========================= */
const SyncHelper = {
  triggerSync(type, data) {
    localStorage.setItem("syncEvent", JSON.stringify({
      type,
      data,
      timestamp: Date.now()
    }));
  },

  onSync(callback) {
    window.addEventListener("storage", (e) => {
      if (e.key === "syncEvent") {
        try {
          const event = JSON.parse(e.newValue);
          callback(event.type, event.data);
        } catch (err) {
          console.error("Sync error:", err);
        }
      }
    });
  }
};

/* =========================
   USER STATE MANAGER
========================= */
const UserManager = {
  currentUser: null,
  currentUid: null,

  init() {
    this.currentUser = localStorage.getItem("currentUser");
    this.currentUid = localStorage.getItem("currentUid");

    // Listen for Firebase auth changes
    if (typeof FireDB !== 'undefined') {
      FireDB.onAuthChange((user) => {
        if (user) {
          this.currentUser = user.displayName || user.email?.split('@')[0];
          this.currentUid = user.uid;
          localStorage.setItem("currentUser", this.currentUser);
          localStorage.setItem("currentUid", this.currentUid);
          this.onUserChange();
        } else {
          this.currentUser = null;
          this.currentUid = null;
          localStorage.removeItem("currentUser");
          localStorage.removeItem("currentUid");
          this.onUserChange();
        }
      });
    }

    return this;
  },

  setCurrentUser(username, uid) {
    localStorage.setItem("currentUser", username);
    localStorage.setItem("currentUid", uid);
    this.currentUser = username;
    this.currentUid = uid;
    this.onUserChange();
  },

  logout() {
    FireDB.logout();
    localStorage.removeItem("currentUser");
    localStorage.removeItem("currentUid");
    this.currentUser = null;
    this.currentUid = null;
    this.onUserChange();
  },

  isLoggedIn() {
    return !!this.currentUser;
  },

  isAdmin() {
    return this.currentUser === "Game_Master";
  },

  async getTokens() {
    if (!this.currentUid) return 0;
    const user = await API.getUser(this.currentUid);
    return user.tokens || 0;
  },

  async updateTokens(tokens) {
    if (!this.currentUid) return;
    await API.updateTokens(this.currentUid, tokens);
    localStorage.setItem("tokenSync", Date.now());
  },

  onUserChange() {},
  onTokenChange() {}
};

/* =========================
   MUSIC STATE MANAGER
========================= */
const MusicManager = {
  audio: null,
  playlist: [],
  currentTrack: null,
  isPlaying: false,

  async init() {
    this.audio = new Audio();
    this.audio.loop = true;
    await this.loadState();
    this.setupListeners();
    return this;
  },

  async loadState() {
    this.playlist = await API.getMusic();
  },

  setupListeners() {
    setInterval(() => {
      if (this.audio.src && !isNaN(this.audio.currentTime)) {
        localStorage.setItem("musicTime", this.audio.currentTime);
      }
    }, 1000);

    this.audio.addEventListener("ended", () => {
      this.playNext();
    });

    document.addEventListener("click", () => {
      this.audio.play().catch(() => {});
    }, { once: true });
  },

  play(musicId) {
    const song = this.playlist.find(s => s.id === musicId);
    if (!song) return;

    this.audio.src = song.file_data;
    this.audio.currentTime = 0;
    this.currentTrack = musicId;
    this.isPlaying = true;
    this.audio.play().catch(() => {});
  },

  playNext() {
    if (!this.currentTrack || this.playlist.length === 0) return;
    const currentIndex = this.playlist.findIndex(s => s.id === this.currentTrack);
    const nextIndex = (currentIndex + 1) % this.playlist.length;
    this.play(this.playlist[nextIndex].id);
  },

  playPrevious() {
    if (!this.currentTrack || this.playlist.length === 0) return;
    const currentIndex = this.playlist.findIndex(s => s.id === this.currentTrack);
    const prevIndex = (currentIndex - 1 + this.playlist.length) % this.playlist.length;
    this.play(this.playlist[prevIndex].id);
  },

  pause() {
    this.audio.pause();
    this.isPlaying = false;
  },

  resume() {
    this.audio.play().catch(() => {});
    this.isPlaying = true;
  },

  setVolume(value) {
    this.audio.volume = value;
    localStorage.setItem("volume", value);
  },

  getVolume() {
    return parseFloat(localStorage.getItem("volume")) || 0.5;
  }
};

// Auto-init
document.addEventListener("DOMContentLoaded", () => {
  UserManager.init();
});
