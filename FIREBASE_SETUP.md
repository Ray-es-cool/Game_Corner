# CritStrike - Firebase Cloud Setup Guide

## Overview

CritStrike now uses **Firebase** - Google's free cloud database platform. This means:
- Your website works globally (not just localhost)
- Data syncs across all users in real-time
- Free tier handles thousands of users
- Music persists across page changes
- Game_Master can manage games/music from anywhere

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Add project"** (or "Create a project")
3. Enter project name: `critstrike` (or your preferred name)
4. Click **Continue** → **Create project**
5. Wait for project creation, then click **Continue**

## Step 2: Enable Firestore Database

1. In the Firebase Console, click **"Firestore Database"** in the left sidebar
2. Click **"Create database"**
3. Choose **"Start in test mode"** (we'll secure it later)
4. Select a location closest to your users
5. Click **Enable**

## Step 3: Enable Authentication

1. Click **"Authentication"** in the left sidebar
2. Click **"Get started"**
3. Click **"Email/Password"** sign-in method
4. Toggle **"Enable"**
5. Click **Save**

## Step 4: Add Web App to Firebase

1. Click the **gear icon** (⚙️) next to "Project Overview"
2. Select **"Project settings"**
3. Scroll down to **"Your apps"**
4. Click the **web icon** (`</>`)
5. Enter app nickname: `CritStrike Web`
6. Click **"Register app"**
7. **Copy the `firebaseConfig` object** - you'll need this!

## Step 5: Configure Firebase in Your Code

Open `firebase-config.js` and replace the config:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD-YOUR-ACTUAL-API-KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

Replace ALL values with what you copied from Firebase Console.

## Step 6: Update Firestore Security Rules

In Firebase Console → Firestore Database → **Rules**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users - readable by authenticated users, writable by owner
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Games - readable by all, writable by Game_Master
    match /games/{gameId} {
      allow read: if true;
      allow write: if request.auth != null && 
                   get(/databases/$(database)/documents/users/$(request.auth.uid)).data.username == 'Game_Master';
    }
    
    // Music - readable by all, writable by Game_Master
    match /music/{musicId} {
      allow read: if true;
      allow write: if request.auth != null && 
                   get(/databases/$(database)/documents/users/$(request.auth.uid)).data.username == 'Game_Master';
    }
    
    // Site Settings - readable by all, writable by Game_Master
    match /site_settings/{docId} {
      allow read: if true;
      allow write: if request.auth != null && 
                   get(/databases/$(database)/documents/users/$(request.auth.uid)).data.username == 'Game_Master';
    }
  }
}
```

Click **Publish**.

## Step 7: Create Game_Master Account

Since there's no initial user, you need to create the Game_Master account:

**Option A: Use the signup page**
1. Start your server (Step 8)
2. Go to `http://localhost:3000/signup.html`
3. Create account:
   - Username: `Game_Master`
   - Password: `master123` (or your choice)

**Option B: Create via Firebase Console**
1. Go to Firebase Console → Authentication → Users
2. Click **"Add user"**
3. Email: `Game_Master@critstrike.local`
4. Password: `master123`
5. Then manually create the user document in Firestore:
   - Collection: `users`
   - Document: (the UID from Authentication)
   - Fields:
     - `username`: "Game_Master"
     - `tokens`: 999999
     - `pfp`: "https://via.placeholder.com/40"

## Step 8: Deploy Your Website

### Option A: Firebase Hosting (Recommended - FREE & GLOBAL)

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project:
   ```bash
   firebase init
   ```
   
   Select:
   - **Hosting: Configure files for Firebase Hosting**
   - Use existing project: `critstrike` (your project)
   - Public directory: `.` (current directory, or specify folder)
   - Configure as single-page app: **No**
   - Overwrite files: **No**

4. Deploy:
   ```bash
   firebase deploy
   ```

5. Your site is now live at: `https://critstrike.web.app` 🎉

### Option B: Any Static Host

Since the app now uses Firebase, you can host the HTML files anywhere:
- Netlify
- Vercel
- GitHub Pages
- Any web hosting service

Just upload all `.html`, `.js` files and it will work!

### Option C: Node.js Server (Local Testing)

```bash
cd "CritStrike Website"
npm install
npm start
```

Then open `http://localhost:3000`

## Step 9: Test Everything

1. **Login**: Go to `/login.html`, login as Game_Master
2. **Music**: Go to `/music.html`, upload a song (only Game_Master sees upload)
3. **Games**: Go to `/Games.html`, add a game:
   - Enter name
   - Upload thumbnail image
   - Upload game folder (must contain index.html)
   - Click "Save Slot"
   - Click "Publish"
4. **Cross-page test**: 
   - Start music on Music page
   - Navigate to Home page - music should continue playing!
5. **Tokens**: Claim daily rewards, buy from shop - tokens sync everywhere

## Default Credentials

- **Username**: `Game_Master`
- **Password**: `master123` (or whatever you set)

⚠️ **Change the password in production!**

## Firestore Database Structure

```
critstrike-db/
├── users/
│   └── {uid}/
│       ├── username: "Game_Master"
│       ├── tokens: 999999
│       ├── pfp: "https://..."
│       └── createdAt: timestamp
│
├── games/
│   └── {gameId}/
│       ├── slot_index: 0
│       ├── name: "Minesweeper"
│       ├── thumbnail: "data:image/..."
│       ├── game_files: {...}
│       ├── players: 42
│       └── published: true
│
├── music/
│   └── {musicId}/
│       ├── name: "song.mp3"
│       ├── file_data: "data:audio/..."
│       ├── file_type: "audio/mp3"
│       └── order_index: 0
│
└── site_settings/
    └── main/
        ├── title: "Home"
        ├── logo: "https://..."
        ├── updates: "- Ready"
        └── slogan: "Play. Learn. Repeat"
```

## Troubleshooting

### "Cannot connect to server"
- Make sure you updated `firebase-config.js` with your actual Firebase config
- Check browser console for Firebase errors

### "Permission denied" errors
- Update Firestore security rules (Step 6)
- Make sure you're logged in as Game_Master for admin actions

### Music doesn't persist across pages
- Check that localStorage is enabled in your browser
- Music state is saved to localStorage + Firebase

### Games don't show after publishing
- Wait a few seconds for Firebase to sync
- Refresh the page
- Check Firestore Console to verify `published: true`

## Firebase Free Tier Limits

- **Firestore**: 50K reads/day, 20K writes/day (plenty for small sites)
- **Authentication**: 10K users/month (free)
- **Hosting**: 10GB storage, 360MB/day transfer
- **Storage**: 5GB (if you add file uploads later)

## Next Steps

1. **Custom Domain**: Buy a domain and connect it in Firebase Hosting
2. **Firebase Storage**: For larger game files (instead of base64 in Firestore)
3. **Analytics**: Add Firebase Analytics to track users
4. **Cloud Functions**: For server-side logic if needed

## Support

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Data Modeling](https://firebase.google.com/docs/firestore/manage-data/structure-data)
- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
