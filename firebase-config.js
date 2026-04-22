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
========================= */

// TODO: REPLACE WITH YOUR FIREBASE CONFIG FROM CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyD-YOUR-API-KEY-HERE",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Check if config is still default/placeholder
const isDefaultConfig = firebaseConfig.apiKey.includes("YOUR-API-KEY") ||
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
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);

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
      let query;
      if (publishedOnly) {
        query = this.games().where('published', '==', true).orderBy('players', 'desc');
      } else {
        query = this.games().orderBy('slot_index', 'asc');
      }
      const snapshot = await query.get();
      const games = [];
      snapshot.forEach(doc => games.push({ id: doc.id, ...doc.data() }));
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
          published: gameData.publish || false,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        existing.forEach(async doc => {
          await doc.ref.update({
            name: gameData.name,
            thumbnail: gameData.thumbnail,
            game_files: gameData.gameFiles,
            published: gameData.publish,
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

    async incrementPlayCount(slotIndex) {
      const existing = await this.games().where('slot_index', '==', slotIndex).get();
      existing.forEach(async doc => {
        await doc.ref.update({
          players: firebase.firestore.FieldValue.increment(1)
        });
      });
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
