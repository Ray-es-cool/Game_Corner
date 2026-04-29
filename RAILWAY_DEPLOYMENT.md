# Railway Deployment Guide for CritStrike

## Quick Deploy (5 minutes)

### Step 1: Prepare Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Add project"** and create your project (e.g., "critstrike")
3. Enable **Firestore Database**:
   - Go to Build > Firestore Database
   - Click "Create database"
   - Start in **test mode** (you can secure rules later)
4. Enable **Authentication**:
   - Go to Build > Authentication
   - Click "Get started"
   - Enable "Email/Password" sign-in method
5. Add a **Web App**:
   - Go to Project Settings (gear icon)
   - Scroll to "Your apps" and click the web icon (</>)
   - Register app as "CritStrike Web"
   - Copy the Firebase config object

### Step 2: Configure Railway

1. Go to [Railway](https://railway.app) and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"** (recommended) OR **"Empty Project"**
4. If using GitHub:
   - Connect your GitHub account
   - Select your CritStrike repository
   - Railway auto-detects Node.js

### Step 3: Add Environment Variables

In Railway dashboard, go to your project > Variables > Add variable:

```
FIREBASE_API_KEY=your-api-key-here
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef123456
NODE_ENV=production
```

### Step 4: Deploy

1. Railway automatically deploys when you push to GitHub
2. If deploying manually:
   - Install Railway CLI: `npm install -g @railway/cli`
   - Login: `railway login`
   - Link project: `railway link`
   - Deploy: `railway up`

### Step 5: Access Your Site

- Railway provides a URL: `https://your-project.up.railway.app`
- Add a custom domain in Railway settings (optional)

---

## Firestore Security Rules

After deployment, update your Firestore rules for production:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Site settings - public read, admin write
    match /site_settings/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Games - public read, admin write
    match /games/{game} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Music - public read, admin write
    match /music/{song} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Users - users can only read/write their own data
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## Troubleshooting

### "Firebase not configured" error
- Make sure you've added all environment variables in Railway
- Check that Firebase config values are correct

### Site loads but games don't work
- Verify Firestore is in production mode (not test mode)
- Check Firestore security rules

### Music doesn't play
- Browsers require user interaction before playing audio
- Click anywhere on the page first

### "Port already in use" error
- Railway automatically sets the PORT environment variable
- The server already handles this in `server.js`

---

## Cost Estimate

Railway free tier:
- $5/month credit (enough for small sites)
- 512MB RAM included
- Auto-sleeps after inactivity on free tier

Estimated cost for CritStrike: **$0-5/month**

---

## Post-Deployment Checklist

- [ ] Firebase project created
- [ ] Firestore Database enabled
- [ ] Authentication enabled (Email/Password)
- [ ] Firebase config added to Railway variables
- [ ] Site loads without errors
- [ ] Login/signup works
- [ ] Games page loads
- [ ] Music player works
- [ ] Theme switching works
- [ ] Daily rewards work
- [ ] Admin panel accessible (login as Game_Master)

---

## Admin Access

The admin panel is available when logged in as: **Game_Master**

To create the admin account:
1. Go to your site's signup page
2. Create account with username: `Game_Master`
3. Login and access admin features on Games page

---

## Support

For issues:
1. Check Railway logs: Dashboard > Deployments > View logs
2. Check browser console (F12) for client errors
3. Verify Firebase console shows activity
