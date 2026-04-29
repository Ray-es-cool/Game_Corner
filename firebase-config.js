/* =========================
   FIREBASE CONFIGURATION
   CritStrike Cloud Database

   SETUP INSTRUCTIONS:
   1. Go to https://console.firebase.google.com
   2. Click "Add project" and create your project
   3. Enable Firestore Database (start in test mode)
   4. Enable Authentication (Email/Password)
   5. Add a Web App and copy the config
   6. Replace the config values below

   RAILWAY DEPLOYMENT:
   - Add the Firebase config values as environment variables in Railway
   - See .env.example for the variable names
========================= */

// Browser-only guard
if (typeof window !== "undefined") {
// Firebase config:
// - Prefer runtime-injected config from `/firebase-env.js` (window.__FIREBASE_CONFIG__)
// - Fall back to hardcoded values for local development
const injected = (window.__FIREBASE_CONFIG__ && typeof window.__FIREBASE_CONFIG__ === "object")
  ? window.__FIREBASE_CONFIG__
  : (window.FIREBASE_CONFIG && typeof window.FIREBASE_CONFIG === "object")
    ? window.FIREBASE_CONFIG
    : {};

const firebaseConfig = {
  apiKey: injected.apiKey || "AIzaSyD-YOUR-API-KEY-HERE",
  authDomain: injected.authDomain || "your-project.firebaseapp.com",
  projectId: injected.projectId || "your-project-id",
  storageBucket: injected.storageBucket || "your-project.appspot.com",
  messagingSenderId: injected.messagingSenderId || "123456789",
  appId: injected.appId || "1:123456789:web:abcdef123456"
};

// Check if config is still default/placeholder
const isDefaultConfig = !firebaseConfig.apiKey ||
                        firebaseConfig.apiKey.includes("YOUR-API-KEY") ||
                        firebaseConfig.apiKey === "your-api-key-here" ||
                        firebaseConfig.projectId === "your-project-id";

if (isDefaultConfig) {
  console.warn("Firebase not configured! Edit firebase-config.js with your Firebase project values.");

  // Create stub to prevent crashes
  window.FireDB = {
    async createUser() { throw new Error("Firebase not configured. Edit firebase-config.js"); },
    async login() { throw new Error("Firebase not configured. Edit firebase-config.js"); },
    async logout() {},
    async getUserData() { return null; },
    async updateTokens() {},
    onAuthChange() {},
    async getSiteSettings() { return { title: "Home", logo: "https://via.placeholder.com/200", updates: "- Configure Firebase", slogan: "Play. Learn. Repeat" }; },
    async saveSiteSettings() { throw new Error("Firebase not configured"); },
    async getGames() { return []; },
    async saveGame() { throw new Error("Firebase not configured"); },
    async deleteGame() { throw new Error("Firebase not configured"); },
    async incrementPlayCount() {},
    async getPlaylist() { return []; },
    async uploadMusic() { throw new Error("Firebase not configured"); },
    async deleteMusic() { throw new Error("Firebase not configured"); },
    async clearAllMusic() { throw new Error("Firebase not configured"); }
  };
} else {
  // Initialize Firebase (avoid double-init)
  if (!firebase.apps || firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
  }

  // Initialize services
  const db = firebase.firestore();
  const auth = firebase.auth();

  // Make globally available
  window.db = db;
  window.auth = auth;

  /* =========================
     FIRESTORE DATA HELPERS
  ========================= */
  window.FireDB = {
    // Collection references
    users: () => db.collection('users'),
    games: () => db.collection('games'),
    music: () => db.collection('music'),
    siteSettings: () => db.collection('site_settings'),
    meta: () => db.collection('meta'),

    // USERS
    async createUser(username, password, pfp) {
      const userCredential = await auth.createUserWithEmailAndPassword(
        username + "@critstrike.local",
        password
      );

      await this.users().doc(userCredential.user.uid).set({
        username: username,
        pfp: pfp || "https://via.placeholder.com/40",
        tokens: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      return { uid: userCredential.user.uid, username };
    },

    async login(username, password) {
      const userCredential = await auth.signInWithEmailAndPassword(
        username + "@critstrike.local",
        password
      );

      const userDoc = await this.users().doc(userCredential.user.uid).get();
      const userData = userDoc.data();

      return {
        uid: userCredential.user.uid,
        username: userData?.username || username,
        tokens: userData?.tokens || 0,
        pfp: userData?.pfp
      };
    },

    async logout() {
      await auth.signOut();
    },

    async getUserData(uid) {
      const doc = await this.users().doc(uid).get();
      return doc.data();
    },

    async updateTokens(uid, tokens) {
      await this.users().doc(uid).update({ tokens });
    },

    async incrementTokens(uid, delta) {
      if (!uid || !delta) return;
      await this.users().doc(uid).update({
        tokens: firebase.firestore.FieldValue.increment(delta)
      });
    },

    onAuthChange(callback) {
      auth.onAuthStateChanged(callback);
    },

    // SITE SETTINGS
    async getSiteSettings() {
      const doc = await this.siteSettings().doc('main').get();
      if (doc.exists) {
        return doc.data();
      }
      return {
        title: "Home",
        logo: "https://via.placeholder.com/200",
        updates: "- Ready",
        slogan: "Play. Learn. Repeat"
      };
    },

    async saveSiteSettings(settings) {
      await this.siteSettings().doc('main').set(settings, { merge: true });
    },

    // GAMES
    async getGames(publishedOnly = false) {
      // Backwards compatible signature: getGames(true|false)
      // Newer fields used by Games.html:
      // - plays_week: weekly play counter (resets Sundays)
      // - plays_total: total plays
      // - credit_eligible: true/false/null
      let query;
      if (publishedOnly) {
        // Prefer weekly plays ordering; fallback to legacy `players`
        try {
          query = this.games()
            .where("published", "==", true)
            .orderBy("plays_week", "desc");
        } catch (e) {
          query = this.games()
            .where("published", "==", true)
            .orderBy("players", "desc");
        }
      } else {
        // For admin/management views
        query = this.games().orderBy("updatedAt", "desc");
      }
      const snapshot = await query.get();
      const games = [];
      snapshot.forEach((doc) => games.push({ id: doc.id, ...doc.data() }));
      return games;
    },

    async saveGame(slotIndex, gameData) {
      const existing = await this.games().where('slot_index', '==', slotIndex).get();

      if (existing.empty) {
        await this.games().add({
          slot_index: slotIndex,
          name: gameData.name,
          thumbnail: gameData.thumbnail,
          game_files: gameData.gameFiles,
          players: 0,
          plays_week: 0,
          plays_total: 0,
          credit_eligible: typeof gameData.creditEligible === "boolean" ? gameData.creditEligible : null,
          published: gameData.publish || false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        existing.forEach(async doc => {
          await doc.ref.update({
            name: gameData.name,
            thumbnail: gameData.thumbnail,
            game_files: gameData.gameFiles,
            published: gameData.publish,
            credit_eligible: typeof gameData.creditEligible === "boolean" ? gameData.creditEligible : (gameData.creditEligible === null ? null : firebase.firestore.FieldValue.delete()),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        });
      }
    },

    async deleteGame(slotIndex) {
      const existing = await this.games().where('slot_index', '==', slotIndex).get();
      existing.forEach(async doc => {
        await doc.ref.delete();
      });
    },

    async createGame(gameData) {
      const payload = {
        name: gameData.name,
        thumbnail: gameData.thumbnail || "",
        game_files: gameData.gameFiles || {},
        entry_key: gameData.entryKey || "",
        published: gameData.publish === false ? false : true,
        credit_eligible: typeof gameData.creditEligible === "boolean" ? gameData.creditEligible : null,
        players: 0,
        plays_week: 0,
        plays_total: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      const ref = await this.games().add(payload);
      return ref.id;
    },

    async updateGameById(gameId, patch) {
      if (!gameId) return;
      await this.games().doc(gameId).set(
        { ...patch, updatedAt: firebase.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );
    },

    async deleteGameById(gameId) {
      if (!gameId) return;
      await this.games().doc(gameId).delete();
    },

    async incrementPlayCountById(gameId) {
      if (!gameId) return;
      await this.games().doc(gameId).update({
        players: firebase.firestore.FieldValue.increment(1), // legacy field used on index.html
        plays_week: firebase.firestore.FieldValue.increment(1),
        plays_total: firebase.firestore.FieldValue.increment(1),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    },

    async incrementPlayCount(slotIndex) {
      // Legacy support (slot_index-based)
      const existing = await this.games().where("slot_index", "==", slotIndex).get();
      existing.forEach(async (doc) => {
        await doc.ref.update({
          players: firebase.firestore.FieldValue.increment(1),
          plays_week: firebase.firestore.FieldValue.increment(1),
          plays_total: firebase.firestore.FieldValue.increment(1),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });
    },

    async setGameCreditEligible(gameId, eligible) {
      if (!gameId) return;
      await this.games().doc(gameId).set(
        { credit_eligible: eligible === null ? null : !!eligible, updatedAt: firebase.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );
    },

    _getWeekKey(d = new Date()) {
      // Week key = Sunday YYYY-MM-DD of the current week (local time)
      const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const day = date.getDay(); // 0=Sun
      date.setDate(date.getDate() - day);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    },

    async ensureWeeklyReset() {
      // Lazy weekly reset: first visitor after Sunday triggers reset.
      const weekKey = this._getWeekKey(new Date());
      const ref = this.meta().doc("weekly_reset");
      const snap = await ref.get();
      const prev = snap.exists ? snap.data()?.weekKey : null;

      if (prev === weekKey) return { didReset: false, weekKey };

      const gamesSnap = await this.games().get();
      const batch = db.batch();
      gamesSnap.forEach((doc) => {
        batch.set(doc.ref, { plays_week: 0 }, { merge: true });
      });
      batch.set(ref, { weekKey, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      await batch.commit();
      return { didReset: true, weekKey };
    },

    // MUSIC
    async getPlaylist() {
      const snapshot = await this.music().orderBy('order_index', 'asc').get();
      const songs = [];
      snapshot.forEach(doc => songs.push({ id: doc.id, ...doc.data() }));
      return songs;
    },

    async getNextOrderIndex() {
      const snapshot = await this.music().orderBy('order_index', 'desc').limit(1).get();
      if (snapshot.empty) return 0;
      return (snapshot.docs[0].data().order_index || 0) + 1;
    },

    async uploadMusic(name, fileData, fileType) {
      const orderIndex = await this.getNextOrderIndex();
      const docRef = await this.music().add({
        name,
        file_data: fileData,
        file_type: fileType,
        order_index: orderIndex,
        uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return docRef.id;
    },

    async deleteMusic(musicId) {
      await this.music().doc(musicId).delete();
    },

    async clearAllMusic() {
      const snapshot = await this.music().get();
      const batch = db.batch();
      snapshot.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
  };
}
} // End server-side guard (typeof window check)
