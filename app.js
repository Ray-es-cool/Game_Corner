/* =========================
   CRITSTRIKE APP — shared page helpers
========================= */

window.CritApp = {
  VERSION: "4",

  isGameMaster() {
    return String(localStorage.getItem("currentUser") || "").trim().toLowerCase() === "game_master";
  },

  async ready() {
    if (window.SharedState?.initPromise) await SharedState.initPromise;
  },

  loadUserBox(id) {
    const box = document.getElementById(id);
    if (!box) return;
    const user = SharedState.currentUser;
    if (user) {
      box.innerHTML = `<span>${user}</span>
        <button onclick="CritApp.logout()" style="padding:6px 10px;background:#ef4444;border:none;border-radius:6px;color:white;cursor:pointer;">Logout</button>`;
    } else {
      box.innerHTML = `<a href="login.html">Login</a>`;
    }
  },

  loadTokens(id) {
    const el = document.getElementById(id);
    if (el) el.innerText = "🪙 " + (SharedState.tokens || 0);
  },

  logout() {
    SharedState.userLogout();
    location.reload();
  },

  readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = (e) => resolve(e.target.result);
      r.onerror = () => reject(new Error("Failed to read file"));
      r.readAsDataURL(file);
    });
  },

  readFilesAsDataUrlMap(fileList) {
    return new Promise((resolve) => {
      const files = Array.from(fileList || []);
      const map = {};
      if (!files.length) return resolve(map);
      let done = 0;
      files.forEach((f) => {
        const r = new FileReader();
        r.onload = (e) => {
          map[f.webkitRelativePath || f.name] = e.target.result;
          if (++done === files.length) resolve(map);
        };
        r.onerror = () => { if (++done === files.length) resolve(map); };
        r.readAsDataURL(f);
      });
    });
  }
};
