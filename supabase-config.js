/* =========================
   SUPABASE CONFIGURATION
   CritStrike Cloud Database

   SETUP:
   1. Create project at https://supabase.com
   2. Add environment variables in Render:
      - SUPABASE_URL
      - SUPABASE_ANON_KEY
   3. Run SQL in Supabase SQL Editor (see DATABASE_SETUP.md)
========================= */

// Get config from environment (injected by server) or use defaults
const supabaseUrl = window.__SUPABASE_CONFIG__?.url ||
                    window.SUPABASE_CONFIG?.url ||
                    "https://liqwveiblfaifpudjmza.supabase.co";

const supabaseKey = window.__SUPABASE_CONFIG__?.anonKey ||
                    window.SUPABASE_CONFIG?.anonKey ||
                    "YOUR_ANON_KEY_HERE";

// Check if config is still default
const isDefaultConfig = !supabaseKey ||
                        supabaseKey === "YOUR_ANON_KEY_HERE" ||
                        supabaseKey.length < 20;

if (isDefaultConfig) {
    console.warn("Supabase not configured! Add SUPABASE_URL and SUPABASE_ANON_KEY environment variables.");

    // Create stub to prevent crashes
    window.SupaDB = {
        async createUser() { throw new Error("Supabase not configured"); },
        async login() { throw new Error("Supabase not configured"); },
        async logout() {},
        async getUserData() { return null; },
        async updateTokens() {},
        async getUserThemes() { return []; },
        async addUserTheme() {},
        onAuthChange() {}
    };
} else {
    // Initialize Supabase client
    window.supabase = supabase.createClient(supabaseUrl, supabaseKey);

    /* =========================
       SUPABASE DATA HELPERS
    ========================= */
    window.SupaDB = {
        // USERS
        async createUser(username, password, pfp) {
            // First create auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: username + "@critstrike.local",
                password: password
            });

            if (authError) throw authError;

            // Create user profile in database
            const { data: profileData, error: profileError } = await supabase
                .from('users')
                .insert({
                    id: authData.user.id,
                    username: username,
                    pfp: pfp || "https://via.placeholder.com/40",
                    tokens: 0,
                    themes: [],
                    inventory: []
                });

            if (profileError) throw profileError;

            return { uid: authData.user.id, username };
        },

        async login(username, password) {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: username + "@critstrike.local",
                password: password
            });

            if (authError) throw authError;

            // Get user profile
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', authData.user.id)
                .single();

            if (userError) throw userError;

            return {
                uid: authData.user.id,
                username: userData?.username || username,
                tokens: userData?.tokens || 0,
                pfp: userData?.pfp,
                themes: userData?.themes || [],
                inventory: userData?.inventory || []
            };
        },

        async logout() {
            await supabase.auth.signOut();
        },

        async getUserData(uid) {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', uid)
                .single();

            if (error) return null;
            return data;
        },

        async updateTokens(uid, tokens) {
            const { error } = await supabase
                .from('users')
                .update({ tokens })
                .eq('id', uid);

            if (error) throw error;
        },

        async incrementTokens(uid, delta) {
            const { data, error } = await supabase.rpc('increment_tokens', {
                user_id: uid,
                delta: delta
            });

            if (error) {
                // Fallback: get current, then update
                const user = await this.getUserData(uid);
                if (user) {
                    await this.updateTokens(uid, (user.tokens || 0) + delta);
                }
            }
        },

        // USER THEMES & INVENTORY
        async getUserThemes(uid) {
            const user = await this.getUserData(uid);
            return user?.themes || [];
        },

        async addUserTheme(uid, themeName) {
            const user = await this.getUserData(uid);
            const themes = user?.themes || [];

            if (!themes.includes(themeName)) {
                themes.push(themeName);
                const { error } = await supabase
                    .from('users')
                    .update({ themes })
                    .eq('id', uid);

                if (error) throw error;
            }
        },

        async getUserInventory(uid) {
            const user = await this.getUserData(uid);
            return user?.inventory || [];
        },

        async addToInventory(uid, item) {
            const user = await this.getUserData(uid);
            const inventory = user?.inventory || [];

            if (!inventory.includes(item)) {
                inventory.push(item);
                const { error } = await supabase
                    .from('users')
                    .update({ inventory })
                    .eq('id', uid);

                if (error) throw error;
            }
        },

        onAuthChange(callback) {
            supabase.auth.onAuthStateChange((event, session) => {
                callback(session?.user || null);
            });
        },

        // SITE SETTINGS
        async getSiteSettings() {
            const { data, error } = await supabase
                .from('site_settings')
                .select('*')
                .eq('id', 'main')
                .single();

            if (error || !data) {
                return {
                    title: "Home",
                    logo: "https://via.placeholder.com/200",
                    updates: "- Ready",
                    slogan: "Play. Learn. Repeat"
                };
            }
            return data;
        },

        async saveSiteSettings(settings) {
            const { error } = await supabase
                .from('site_settings')
                .upsert({ id: 'main', ...settings });

            if (error) throw error;
        },

        // GAMES
        async getGames(publishedOnly = false) {
            let query = supabase.from('games').select('*');

            if (publishedOnly) {
                query = query.eq('published', true).order('plays_week', { ascending: false });
            } else {
                query = query.order('updated_at', { ascending: false });
            }

            const { data, error } = await query;
            if (error) return [];
            return data;
        },

        async createGame(gameData) {
            const { data, error } = await supabase
                .from('games')
                .insert({
                    name: gameData.name,
                    thumbnail: gameData.thumbnail || "",
                    game_files: gameData.gameFiles || {},
                    published: gameData.publish !== false,
                    players: 0,
                    plays_week: 0,
                    plays_total: 0
                })
                .select();

            if (error) throw error;
            return data[0]?.id;
        },

        async incrementPlayCount(gameId) {
            const { error } = await supabase.rpc('increment_play_count', {
                game_id: gameId
            });

            if (error) {
                // Fallback
                const game = await supabase.from('games').select('plays_total').eq('id', gameId).single();
                if (game.data) {
                    await supabase.from('games').update({
                        plays_total: (game.data.plays_total || 0) + 1,
                        plays_week: (game.data.plays_week || 0) + 1
                    }).eq('id', gameId);
                }
            }
        },

        // MUSIC
        async getPlaylist() {
            const { data, error } = await supabase
                .from('music')
                .select('*')
                .order('order_index', { ascending: true });

            if (error) return [];
            return data;
        },

        async uploadMusic(name, fileData, fileType) {
            // Get next order index
            const { data: lastSong } = await supabase
                .from('music')
                .select('order_index')
                .order('order_index', { ascending: false })
                .limit(1)
                .single();

            const nextIndex = (lastSong?.order_index || 0) + 1;

            const { data, error } = await supabase
                .from('music')
                .insert({
                    name,
                    file_data: fileData,
                    file_type: fileType,
                    order_index: nextIndex
                })
                .select();

            if (error) throw error;
            return data[0]?.id;
        },

        async deleteMusic(musicId) {
            const { error } = await supabase.from('music').delete().eq('id', musicId);
            if (error) throw error;
        },

        async clearAllMusic() {
            const { error } = await supabase.from('music').delete().neq('id', null);
            if (error) throw error;
        }
    };
}
