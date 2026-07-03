/* =========================
   AUTH ADAPTER
   Bridges FireDB (SQLite/Firebase) and SupaDB (Supabase)
   Allows using either backend seamlessly
========================= */

// Use Supabase if available, otherwise fall back to SQLite/Firebase
window.AuthDB = (function() {
    // Check if Supabase is configured
    const useSupabase = window.SupaDB && !window.SupaDB.createUser.toString().includes('Supabase not configured');

    if (useSupabase) {
        console.log("Using Supabase backend");
        return window.SupaDB;
    }

    // Check if SQLite/Firebase is configured (has real API implementation)
    const useFireDB = window.FireDB && window.FireDB.createUser && window.FireDB.createUser.toString().includes('fetch');

    if (useFireDB) {
        console.log("Using SQLite/Firebase backend");
        return window.FireDB;
    }

    // Neither configured - return stub
    console.warn("No backend configured - using stub");
    return {
        async createUser() { throw new Error("No backend configured"); },
        async login() { throw new Error("No backend configured"); },
        async logout() {},
        async getUserData() { return null; },
        async updateTokens() {},
        async getUserThemes() { return []; },
        async addUserTheme() {},
        async getSiteSettings() { return { title: "Home", logo: "https://via.placeholder.com/200", updates: "- Configure backend", slogan: "Play. Learn. Repeat" }; },
        async saveSiteSettings() { throw new Error("No backend configured"); },
        async getGames() { return []; },
        async getPlaylist() { return []; },
        onAuthChange() {}
    };
})();

// Make globally available as FireDB for backwards compatibility
window.FireDB = window.AuthDB;
