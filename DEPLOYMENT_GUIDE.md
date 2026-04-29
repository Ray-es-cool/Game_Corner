# 🚀 Deploying CritStrike to Railway

## Quick Start (10 Minutes)

### Step 1: Setup Firebase (Required First)

1. **Go to [Firebase Console](https://console.firebase.google.com)**
2. Click **"Add project"** → Name it "critstrike" (or your choice)
3. **Enable Firestore Database:**
   - Build > Firestore Database > Create Database
   - Start in **test mode**
   - Choose a location (us-central recommended)
4. **Enable Authentication:**
   - Build > Authentication > Get Started
   - Email/Password → Enable
5. **Create Web App:**
   - Project Settings (⚙️) > Your apps > Web app (</>)
   - Register app: "CritStrike"
   - Copy the `firebaseConfig` object values

---

### Step 2: Deploy to Railway

**Option A: GitHub Deploy (Recommended)**

```bash
# Initialize git repo (if not already)
cd "CritStrike Website"
git init
git add .
git commit -m "Initial commit - CritStrike"

# Push to GitHub
git remote add origin https://github.com/yourusername/critstrike.git
git push -u origin main
```

Then in Railway:
1. New Project > Deploy from GitHub
2. Select your critstrike repository
3. Railway auto-detects Node.js and deploys

**Option B: Direct Railway Deploy**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init  # Create new project
railway up    # Deploy
```

---

### Step 3: Add Firebase Environment Variables

In Railway Dashboard > Your Project > Variables:

| Variable | Value |
|----------|-------|
| `FIREBASE_API_KEY` | From Firebase config |
| `FIREBASE_AUTH_DOMAIN` | e.g., critstrike.firebaseapp.com |
| `FIREBASE_PROJECT_ID` | Your project ID |
| `FIREBASE_STORAGE_BUCKET` | e.g., critstrike.appspot.com |
| `FIREBASE_MESSAGING_SENDER_ID` | Number from config |
| `FIREBASE_APP_ID` | App ID from config |
| `NODE_ENV` | `production` |

---

### Step 4: Verify Deployment

Railway provides URL: `https://your-app.up.railway.app`

Test these:
- ✅ Homepage loads
- ✅ Can sign up / login
- ✅ Theme switching works
- ✅ Daily rewards work
- ✅ Games page loads

---

## File Checklist

Files needed for deployment:
```
CritStrike Website/
├── server.js              ✅ Express server
├── package.json           ✅ Dependencies
├── railway.json           ✅ Railway config
├── Procfile               ✅ Process config
├── firebase-config.js     ✅ Firebase setup
├── styles.css             ✅ Shared styles
├── animations.js          ✅ UI animations
├── *.html                 ✅ All pages
├── *.js                   ✅ All scripts
├── .env.example           ✅ Template (don't deploy .env)
└── node_modules/          ❌ Don't upload (Railway installs)
```

---

## Security Checklist

### Before Going Live

- [ ] Update Firestore rules (see below)
- [ ] Create strong admin password
- [ ] Remove any test data
- [ ] Backup Firebase data

### Firestore Security Rules

After testing, update rules in Firebase Console > Firestore > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Site settings
    match /site_settings/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    // Games
    match /games/{game} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    // Music
    match /music/{song} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    // Users
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## Admin Access

**Admin username:** `Game_Master`

Create this account to access:
- Game management (add/edit/publish games)
- Site settings (title, logo, updates)
- Music upload/delete

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Firebase not configured" | Add environment variables in Railway |
| Login fails | Check Firebase Auth is enabled |
| Blank page | Check browser console (F12) |
| Games won't load | Verify Firestore rules |
| Music won't play | Click page first (browser policy) |
| Styles broken | Hard refresh (Ctrl+Shift+R) |

---

## Cost Estimate

**Railway Free Tier:**
- $5 monthly credit
- ~500 hours of uptime
- Sufficient for small-medium traffic

**Estimated Cost:** $0-5/month

---

## Custom Domain (Optional)

1. Buy domain (Namecheap, Porkbun)
2. Railway > Settings > Domains > Add domain
3. Configure DNS as instructed
4. SSL auto-provisions

---

## Monitoring

- **Railway Logs:** Dashboard > Deployments > View logs
- **Firebase Usage:** Console > Usage
- **Error Tracking:** Check browser console + Railway logs

---

## Support Files

- `RAILWAY_DEPLOYMENT.md` - Detailed Railway guide
- `DEPLOYMENT_CHECKLIST.md` - Step-by-step checklist
- `.env.example` - Environment variable template

---

**Ready to deploy? Start with Step 1 (Firebase) and follow through!** 🚀
