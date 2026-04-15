// user-helper.js - Shared user management for all pages

let currentUser = localStorage.getItem("currentUser");

// Load user info into page
async function loadUserDisplay() {
  const userBox = document.getElementById("userBox");
  if (!userBox) return;

  if (currentUser) {
    try {
      const response = await fetch(`http://localhost:3000/api/users/${currentUser}`);
      const result = await response.json();

      if (result.success) {
        const user = result.user;
        userBox.innerHTML = `
          <div style="display:flex;align-items:center;gap:15px;">
            <img src="${user.pfp}" style="width:40px;height:40px;border-radius:50%;">
            <span>${currentUser}</span>
            <button onclick="window.logoutUser()" style="margin-left:10px;padding:8px 16px;background:#ef4444;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold;">Logout</button>
          </div>
        `;
      }
    } catch (err) {
      console.error("Error loading user:", err);
      // Fallback: show logout if localStorage has user but server doesn't
      if (currentUser) {
        userBox.innerHTML = `
          <div style="display:flex;align-items:center;gap:15px;">
            <span>${currentUser}</span>
            <button onclick="window.logoutUser()" style="padding:8px 16px;background:#ef4444;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold;">Logout</button>
          </div>
        `;
      }
    }
  } else {
    userBox.innerHTML = '';
  }
}

// Load tokens
function loadTokens() {
  const tokenEl = document.getElementById("tokens");
  if (!tokenEl || !currentUser) return;
  
  let t = localStorage.getItem(currentUser + "_tokens") || 0;
  tokenEl.innerText = "🪙 " + t;
}

// Logout function - make it global so onclick works
window.logoutUser = function() {
  localStorage.removeItem("currentUser");
  location.reload();
}

// Check if user is CritStrike (for admin panels)
function isCritStrike() {
  return currentUser === "CritStrike";
}

// Show admin panel if user is CritStrike
function showAdminIfCritStrike() {
  const adminPanel = document.getElementById("adminPanel");
  if (adminPanel && isCritStrike()) {
    adminPanel.style.display = "block";
  }
}

// Initialize all user UI
async function initUserUI() {
  await loadUserDisplay();
  loadTokens();
  showAdminIfCritStrike();
}

// Wait for page to load, then init
document.addEventListener("DOMContentLoaded", initUserUI);
