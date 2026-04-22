# Deploy CritStrike to Railway

## Quick Deploy (2 Methods)

### Method 1: One-Click Deploy (Easiest)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/new)

1. Click the button above
2. Connect your GitHub account
3. Railway will auto-detect the project and deploy

### Method 2: Manual Deploy

#### Step 1: Push to GitHub
```bash
cd "CritStrike Website"
git init
git add .
git commit -m "Ready for Railway"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/critstrike.git
git push -u origin main
```

#### Step 2: Deploy on Railway
1. Go to https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `critstrike` repository
5. Railway auto-detects Node.js and deploys!

---

## IMPORTANT: Configure Firebase

The site won't work without Firebase. Before or after deploying:

### 1. Create Firebase Project
1. Go to https://console.firebase.google.com
2. Click **"Add project"** → Name it `critstrike`
3. Click **Continue** → **Create project**

### 2. Enable Firestore Database
1. Click **"Firestore Database"** → **"Create database"**
2. Choose **"Start in test mode"**
3. Select location → **Enable**

### 3. Enable Authentication
1. Click **"Authentication"** → **"Get started"**
2. Click **"Email/Password"** → Toggle **"Enable"** → **Save**

### 4. Get Firebase Config
1. Click **gear icon** (⚙️) → **"Project settings"**
2. Scroll to **"Your apps"**
3. Click **`</>`** (Web app)
4. Enter nickname: `CritStrike Web`
5. **Copy the `firebaseConfig` object**

### 5. Update firebase-config.js
Replace the placeholder values:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD-YOUR-REAL-API-KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

### 6. Push the Firebase Config
```bash
git add firebase-config.js
git commit -m "Add Firebase config"
git push
```
Railway will auto-redeploy with the new config.

---

## Railway Features

✅ **Auto-deploys** on every git push
✅ **Free tier**: $5 credit/month (enough for small sites)
✅ **No sleep** - always running (unlike Render)
✅ **Instant wake** - no cold start delays
✅ **Automatic SSL** - HTTPS enabled
✅ **Custom domains** - connect your own domain

---

## Create Game_Master Account

After deploying:
1. Go to your Railway URL + `/signup.html`
2. Username: `Game_Master`
3. Password: `master123`

---

## Troubleshooting

### "Firebase not configured" warning in console
- This is normal if you haven't added your Firebase config yet
- Edit `firebase-config.js` with your real Firebase values

### Login doesn't work
- Make sure Firebase Authentication is enabled
- Check that `firebase-config.js` has real values (not placeholders)

### Site shows but nothing works
- Check Railway logs: Project → Logs tab
- Verify Firestore Database is created
- Verify Authentication is enabled

### Build fails
- Railway auto-detects Node.js
- Check logs for specific errors
- Make sure `package.json` and `server.js` are in the repo root

---

## Your Deployed Site Will Have

✅ Global access (anywhere in the world)
✅ Firebase cloud database sync
✅ Music persists across pages
✅ Game_Master admin panel
✅ 50 game slots
✅ Theme system (Dark/Light/Pink)
✅ Daily rewards
✅ User authentication

---

## Railway Free Tier

- $5 credit per month
- ~500 hours of uptime (enough for 24/7)
- 1GB RAM
- 10GB bandwidth/month

For small gaming sites, this is usually enough!
