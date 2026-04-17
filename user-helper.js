/* =========================
   GLOBAL USER SYSTEM (FIXED CORE)
========================= */

let currentUser = localStorage.getItem("currentUser") || null;

/* LIVE SYNC ACROSS PAGES */
window.addEventListener("storage", (e) => {
    if (e.key === "currentUser") {
        currentUser = localStorage.getItem("currentUser");
        initUserSystem(); // refresh UI instantly
    }
});

/* =========================
   USER UI
========================= */
function loadUserDisplay() {
    const userBox = document.getElementById("userBox");
    if (!userBox) return;

    if (currentUser) {
        userBox.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;">
                <span>${currentUser}</span>
                <button onclick="logoutUser()" 
                    style="padding:6px 12px;background:#ef4444;color:white;border:none;border-radius:6px;cursor:pointer;">
                    Logout
                </button>
            </div>
        `;
    } else {
        userBox.innerHTML = `<a href="login.html">Login</a>`;
    }
}

/* =========================
   TOKENS (SAFE GLOBAL)
========================= */
function loadTokens() {
    const el = document.getElementById("tokens");
    if (!el || !currentUser) return;

    let t = parseInt(localStorage.getItem(currentUser + "_tokens")) || 0;
    el.innerText = "🪙 " + t;
}

/* LIVE TOKEN UPDATE (used by games/music/events) */
window.addEventListener("storage", (e) => {
    if (e.key && e.key.includes("_tokens")) {
        loadTokens();
    }
});

/* =========================
   LOGOUT (GLOBAL SAFE)
========================= */
function logoutUser() {
    localStorage.removeItem("currentUser");
    currentUser = null;
    location.reload();
}

/* =========================
   ADMIN SYSTEM
========================= */
function isAdmin() {
    return currentUser === "Game_Master";
}

/* APPLY ADMIN VISIBILITY */
function applyAdmin() {
    if (!isAdmin()) return;

    document.querySelectorAll(".admin").forEach(el => {
        el.style.display = "block";
    });
}

/* =========================
   OPTIONAL SAFE GUARD
   (prevents blank page crashes)
========================= */
function safeGet(id) {
    return document.getElementById(id);
}

/* =========================
   INIT SYSTEM (IMPORTANT)
========================= */
function initUserSystem() {
    currentUser = localStorage.getItem("currentUser") || null;

    loadUserDisplay();
    loadTokens();
    applyAdmin();
}

/* WAIT FOR DOM */
document.addEventListener("DOMContentLoaded", initUserSystem);