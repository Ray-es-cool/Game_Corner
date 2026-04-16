// user-helper.js - GLOBAL AUTH SYSTEM (FIXED)

let currentUser = localStorage.getItem("currentUser");

// =========================
// USER DISPLAY (ALL PAGES)
// =========================
async function loadUserDisplay() {
  const userBox = document.getElementById("userBox");
  if (!userBox) return;

  if (!currentUser) {
    userBox.innerHTML = "";
    return;
  }

  try {
    const response = await fetch(`http://localhost:3000/api/users/${currentUser}`);
    const result = await response.json();

    if (result.success) {
      const user = result.user;

      userBox.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          <img src="${user.pfp}" style="width:40px;height:40px;border-radius:50%;">
          <span>${currentUser}</span>
          <button onclick="window.logoutUser()"
            style="padding:6px 12px;background:#ef4444;color:white;border:none;border-radius:8px;cursor:pointer;">
            Logout
          </button>
        </div>
      `;
    } else {
      throw new Error("User not found");
    }

  } catch (err) {
    console.error(err);

    userBox.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <span>${currentUser}</span>
        <button onclick="window.logoutUser()"
          style="padding:6px 12px;background:#ef4444;color:white;border:none;border-radius:8px;cursor:pointer;">
          Logout
        </button>
      </div>
    `;
  }
}

// =========================
// TOKENS (ALL PAGES)
// =========================
function loadTokens() {
  const tokenEl = document.getElementById("tokens");
  if (!tokenEl || !currentUser) return;

  let t = localStorage.getItem(currentUser + "_tokens") || 0;
  tokenEl.innerText = "🪙 " + t;
}

// =========================
// LOGOUT
// =========================
window.logoutUser = function () {
  localStorage.removeItem("currentUser");
  location.href = "login.html";
};

// =========================
// ADMIN SYSTEM (UNIFIED)
// =========================
const ADMIN_USER = "Game_Master";

function isAdmin() {
  return currentUser === ADMIN_USER;
}

function showAdminPanels() {
  if (!isAdmin()) return;

  document.querySelectorAll(".admin, #adminPanel")
    .forEach(el => el.style.display = "block");
}

// =========================
// INIT (ALL PAGES)
// =========================
async function initUserUI() {
  currentUser = localStorage.getItem("currentUser"); // refresh live

  await loadUserDisplay();
  loadTokens();
  showAdminPanels();
}

document.addEventListener("DOMContentLoaded", initUserUI);