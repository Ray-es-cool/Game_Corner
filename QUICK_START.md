# CritStrike - Quick Start Guide

## Your Website is Now Cloud-Ready! 🌐

The CritStrike website now uses **Firebase** - a free cloud database from Google that works globally.

---

## What You Get

✅ **Global Access** - Works from anywhere, not just localhost
✅ **Real-time Sync** - All pages connected to the same database
✅ **Music Persistence** - Songs don't reset when changing pages
✅ **Game_Master Admin** - Only Game_Master can manage games & music
✅ **50 Game Slots** - Upload games with images, publish when ready
✅ **Free Tier** - Handles thousands of users for free

---

## Setup (10 minutes)

### 1. Create Firebase Project
1. Go to https://console.firebase.google.com
2. Click **"Add project"** → Name it `critstrike`
3. Click **Continue** → **Create project** → **Continue**

### 2. Enable Firestore Database
1. Click **"Firestore Database"** → **"Create database"**
2. Choose **"Start in test mode"**
3. Select location → **Enable**

### 3. Enable Authentication
1. Click **"Authentication"** → **"Get started"**
2. Click **"Email/Password"** → Toggle **"Enable"** → **Save**

### 4. Get Firebase Config
1. Click **gear icon** (⚙️) → **"Project settings"**
2. Scroll to **"Your apps"** → Click **`</>`** (web app)
3. Enter nickname: `CritStrike Web` → **Register app**
4. **Copy the `firebaseConfig` object**

### 5. Update firebase-config.js
Open `firebase-config.js` and replace:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

### 6. Deploy (Choose One)

**Option A: Firebase Hosting (Recommended - FREE)**
```bash
npm install -g firebase-tools
firebase login
firebase init  # Select Hosting, use your project
firebase deploy
```
Your site will be live at: `https://critstrike.web.app`

**Option B: Any Static Host**
Upload all `.html` and `.js` files to:
- Netlify
- Vercel  
- GitHub Pages
- Any web host

**Option C: Test Locally**
```bash
npm install
npm start
```
Open: `http://localhost:3000`

---

## Create Game_Master Account

1. Go to `/signup.html`
2. Create account:
   - **Username:** `Game_Master`
   - **Password:** `master123`

---

## Game_Master Features

### Music Management (`/music.html`)
- Upload songs (audio files)
- Delete individual songs
- Clear entire playlist
- Only Game_Master sees these controls

### Game Management (`/Games.html`)
- See all 50 game slots
- Add games with:
  - Game name
  - Thumbnail image upload
  - Game folder upload (must contain index.html)
- **Publish** button (makes visible to all users)
- **Delete** button (resets slot)

---

## File Structure

```
CritStrike Website/
├── firebase-config.js    # ⚠️ EDIT THIS WITH YOUR FIREBASE CONFIG
├── api-client.js         # Firebase API helper
├── server.js             # Optional Node.js server
├── index.html            # Home page
├── login.html            # Login
├── signup.html           # Registration
├── Games.html            # Games + Admin panel
├── Music.html            # Music player + Admin
├── shop.html             # Token shop
├── settings.html         # Settings
├── DailyRewards.html     # Daily rewards
├── FIREBASE_SETUP.md     # Detailed setup guide
└── QUICK_START.md        # This file
```

---

## Default Credentials

| Username | Password |
|----------|----------|
| Game_Master | master123 |

⚠️ **Change the password in production!**

---

## How It Works

### Before (localStorage):
```
Page A → Save to localStorage → Page B can't access
```

### After (Firebase):
```
Page A → Save to Firebase Cloud → Page B reads from Firebase
              ↕
         All users sync in real-time
```

### Music Persistence:
```
1. Start music on /music.html
2. Navigate to /index.html
3. Music continues playing! (saved to localStorage + Firebase)
```

---

## Troubleshooting

**"Cannot connect to server"**
- Make sure you updated `firebase-config.js` with your actual Firebase config values

**"Permission denied"**
- Enable Firestore in Firebase Console
- Set rules to "test mode" initially

**Music doesn't persist**
- Check browser localStorage is enabled
- Make sure you're logged in

**Games don't show after publishing**
- Refresh the page
- Check Firestore Console to verify `published: true`

---

## Firebase Free Tier Limits

- **Firestore:** 50K reads/day, 20K writes/day
- **Authentication:** 10K users/month
- **Hosting:** 10GB storage, 360MB/day transfer

Plenty for a small gaming website! 🎮

---

## Next Steps

1. **Update Firestore Rules** - See FIREBASE_SETUP.md for security rules
2. **Custom Domain** - Connect your own domain in Firebase Hosting
3. **Change Admin Password** - Don't use `master123` in production

---

## Need Help?

- **Detailed Guide:** See `FIREBASE_SETUP.md`
- **Firebase Docs:** https://firebase.google.com/docs
- **Firebase Console:** https://console.firebase.google.com
