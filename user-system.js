// user-system.js - Server-side persistent user database

const API_URL = "http://localhost:3000/api";

// Get all users from localStorage cache (for quick access)
export function getUsers(){
return JSON.parse(localStorage.getItem("users")) || {};
}

// Save users to localStorage cache
export function saveUsers(users){
localStorage.setItem("users", JSON.stringify(users));
}

// Get current logged-in user
export function getCurrentUser(){
return localStorage.getItem("currentUser");
}

// Set current logged-in user
export function setCurrentUser(u){
localStorage.setItem("currentUser", u);
}

// SIGN UP - Create new user on server
export async function signupUser(username, password, pfp){
try {
const response = await fetch(`${API_URL}/users/signup`, {
method: "POST",
headers: {
"Content-Type": "application/json"
},
body: JSON.stringify({
username: username,
password: password,
pfp: pfp
})
});

const result = await response.json();

if(result.success){
setCurrentUser(username);
// Cache locally
let users = getUsers();
users[username] = {pass: password, pfp: pfp};
saveUsers(users);
return {success: true};
} else {
return {success: false, error: result.error};
}
} catch(err){
console.error("Signup error:", err);
return {success: false, error: "Server error"};
}
}

// LOGIN - Verify credentials with server
export async function loginUser(username, password){
try {
const response = await fetch(`${API_URL}/users/login`, {
method: "POST",
headers: {
"Content-Type": "application/json"
},
body: JSON.stringify({
username: username,
password: password
})
});

const result = await response.json();

if(result.success){
setCurrentUser(username);
localStorage.setItem(username + "_tokens", result.tokens || 0);
return {success: true, username: username, tokens: result.tokens};
} else {
return {success: false, error: result.error};
}
} catch(err){
console.error("Login error:", err);
return {success: false, error: "Server error"};
}
}

// GET USER DATA from server
export async function getUserData(username){
try {
const response = await fetch(`${API_URL}/users/${username}`);
const result = await response.json();

if(result.success){
return {success: true, user: result};
} else {
return {success: false, error: result.error};
}
} catch(err){
console.error("Get user error:", err);
return {success: false, error: "Server error"};
}
}

// UPDATE USER DATA on server
export async function updateUserData(username, updates){
try {
const response = await fetch(`${API_URL}/users/${username}`, {
method: "POST",
headers: {
"Content-Type": "application/json"
},
body: JSON.stringify(updates)
});

const result = await response.json();

if(result.success){
return {success: true};
} else {
return {success: false, error: result.error};
}
} catch(err){
console.error("Update user error:", err);
return {success: false, error: "Server error"};
}
}

// UPDATE TOKENS
export async function updateTokens(username, tokens){
return updateUserData(username, {tokens: tokens});
}