# Deploy CritStrike to Render

## Quick Deploy Steps

### 1. Push to GitHub
First, push your code to GitHub:
```bash
cd "CritStrike Website"
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/critstrike.git
git push -u origin main
```

### 2. Configure Firebase
Before deploying, you MUST set up Firebase:

1. Go to https://console.firebase.google.com
2. Create a new project
3. Enable **Firestore Database** (test mode is fine for now)
4. Enable **Authentication** → Email/Password
5. Add a Web App and copy the config
6. Update `firebase-config.js` with your actual config values

### 3. Deploy to Render

1. Go to https://render.com
2. Sign up / Log in
3. Click **"New +"** → **"Web Service"**
4. Connect your GitHub repository
5. Configure:
   - **Name:** critstrike (or your choice)
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** Free
6. Click **"Create Web Service"**

### 4. Add Environment Variables (Optional)
In Render dashboard → Environment:
- `NODE_ENV`: `production`
- `PORT`: `3000` (usually set automatically)

### 5. Wait for Deploy
Render will build and deploy your site. You'll get a URL like:
```
https://critstrike-xxxx.onrender.com
```

---

## Important Notes

### Firebase Config is REQUIRED
The site won't work without Firebase. Edit `firebase-config.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_REAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

### Game_Master Account
After deploying, create the admin account:
1. Go to your Render URL + `/signup.html`
2. Username: `Game_Master`
3. Password: `master123` (change this later!)

---

## Troubleshooting

### "Cannot connect to server"
- Make sure Firebase config is updated in `firebase-config.js`

### Site shows blank/error
- Check Render logs: Dashboard → Logs
- Verify `firebase-config.js` has real values

### Login doesn't work
- Firebase Authentication must be enabled
- Firestore Database must be created

---

## Your Deployed Site Will Have

✅ Global access (not localhost)
✅ Firebase cloud database
✅ Music persists across pages
✅ Game_Master admin panel
✅ 50 game slots
✅ All pages theme-synced
✅ Shop (empty - coming soon)
✅ Daily rewards system

---

## Free Tier Limits (Render)
- 750 hours/month free
- Site sleeps after 15 min inactivity (wakes on next visit)
- ~50 second cold start when waking

## Free Tier Limits (Firebase)
- 50K reads/day
- 20K writes/day
- 1GB storage
- Plenty for small sites!
