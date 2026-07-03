// GlobalMemory: central site-wide memory (admin-controlled)
(function(){
  window.GlobalMemory = {
    settings: null,
    async load(){
      try{
        if(window.FireDB && typeof FireDB.getSiteSettings === 'function'){
          this.settings = await FireDB.getSiteSettings();
        } else {
          const cached = localStorage.getItem('shared_site_settings');
          this.settings = cached ? JSON.parse(cached) : { title: 'Home', logo: 'https://via.placeholder.com/200', updates: '- Ready', slogan: 'Play. Learn. Repeat' };
        }
        localStorage.setItem('shared_site_settings', JSON.stringify(this.settings));
        // Mirror into SharedState if present
        if(window.SharedState) SharedState.siteSettings = this.settings;
        return this.settings;
      }catch(e){
        console.warn('GlobalMemory.load failed', e);
        const cached = localStorage.getItem('shared_site_settings');
        this.settings = cached ? JSON.parse(cached) : {};
        return this.settings;
      }
    },

    async save(settings){
      // enforce admin-only changes
      if(window.SharedState && typeof SharedState.isGameMaster === 'function'){
        if(!SharedState.isGameMaster()) throw new Error('Only Game_Master can modify global settings');
      }

      try{
        if(window.FireDB && typeof FireDB.saveSiteSettings === 'function'){
          await FireDB.saveSiteSettings(settings);
        } else if(window.db && typeof window.db === 'object'){
          // best-effort: write to Firestore directly if available
          try{ await window.db.collection('site_settings').doc('main').set(settings, { merge: true }); }catch(e){}
        } else {
          throw new Error('No backend available to save global settings');
        }

        this.settings = settings;
        localStorage.setItem('shared_site_settings', JSON.stringify(settings));
        if(window.SharedState) SharedState.siteSettings = settings;
        // notify other tabs
        localStorage.setItem('siteSettingsSync', Date.now());
        return true;
      }catch(err){
        console.error('GlobalMemory.save failed', err);
        throw err;
      }
    }
  };

  // Auto-load on script inclusion
  if(typeof window !== 'undefined'){
    try{ window.GlobalMemory.load(); }catch(e){}
  }
})();
