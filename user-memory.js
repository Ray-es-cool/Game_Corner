// UserMemory: per-user preferences (theme, music, small overrides)
(function(){
  window.UserMemory = {
    settings: {},
    uid: null,

    _localKey(uid){
      return uid ? `user_memory_${uid}` : `user_memory_anonymous`;
    },

    init(){
      this.uid = localStorage.getItem('currentUid');
      const key = this._localKey(this.uid);
      try{
        const raw = localStorage.getItem(key);
        this.settings = raw ? JSON.parse(raw) : {};
      }catch(e){ this.settings = {}; }
      return Promise.resolve(this.settings);
    },

    get(key, def){
      return this.settings.hasOwnProperty(key) ? this.settings[key] : def;
    },

    set(key, value){
      this.settings[key] = value;
      const localKey = this._localKey(localStorage.getItem('currentUid'));
      try{ localStorage.setItem(localKey, JSON.stringify(this.settings)); }catch(e){}
      // also mirror to legacy `theme` key for pages that read it
      if(key === 'theme') localStorage.setItem('theme', value);
      localStorage.setItem('userMemorySync', Date.now());
      // attempt to persist to Firestore under users/<uid>.prefs when available
      if(this.uid && window.db){
        try{ window.db.collection('users').doc(this.uid).set({ prefs: this.settings }, { merge: true }); }catch(e){}
      }
      return value;
    },

    getTheme(){
      return this.get('theme', localStorage.getItem('theme') || 'dark');
    },

    setTheme(theme){
      this.set('theme', theme);
      // dispatch an event so pages can react
      window.dispatchEvent(new CustomEvent('user-memory-updated', { detail: { key: 'theme', value: theme } }));
      return theme;
    }
  };

  if(typeof window !== 'undefined'){
    window.addEventListener('storage', (e)=>{
      if(e.key && (e.key.startsWith('user_memory_') || e.key === 'userMemorySync')){
        // reload local copy
        try{ UserMemory.init(); }catch(_){}
      }
    });
    UserMemory.init();
  }
})();
