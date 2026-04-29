# CritStrike Deployment Checklist

## Pre-Deployment

### Firebase Setup
- [ ] Create Firebase project at https://console.firebase.google.com
- [ ] Enable Firestore Database (test mode initially)
- [ ] Enable Authentication (Email/Password provider)
- [ ] Create Web App and copy config values
- [ ] Save config values securely

### Code Review Completed
- [x] Shared CSS styles created (styles.css)
- [x] Animation system added (animations.js)
- [x] Page transitions implemented
- [x] Button ripple effects added
- [x] Hover animations working
- [x] Firebase config supports environment variables
- [x] .env.example created
- [x] Railway deployment guide created

## Railway Deployment

### Step 1: Connect Repository
- [ ] Push code to GitHub (if using GitHub deploy)
- [ ] Create new project in Railway
- [ ] Connect GitHub repo OR deploy from empty project

### Step 2: Environment Variables
Add these in Railway > Variables:
- [ ] FIREBASE_API_KEY
- [ ] FIREBASE_AUTH_DOMAIN
- [ ] FIREBASE_PROJECT_ID
- [ ] FIREBASE_STORAGE_BUCKET
- [ ] FIREBASE_MESSAGING_SENDER_ID
- [ ] FIREBASE_APP_ID
- [ ] NODE_ENV=production

### Step 3: Deploy
- [ ] Railway auto-deploys (GitHub) OR run `railway up`
- [ ] Wait for deployment to complete
- [ ] Note your Railway URL

## Post-Deployment Testing

### Core Functionality
- [ ] Homepage loads correctly
- [ ] Navigation works on all pages
- [ ] Theme switching (Dark/Light/Pink) works
- [ ] Theme persists across page reloads

### Authentication
- [ ] Signup creates new account
- [ ] Login works with existing account
- [ ] Logout clears session
- [ ] User info displays in nav

### Features
- [ ] Games page loads
- [ ] Daily Rewards can be claimed
- [ ] Token counter displays correctly
- [ ] Music player loads playlist
- [ ] Settings page works
- [ ] Shop page loads (placeholder)

### Admin Features (login as Game_Master)
- [ ] Admin panel visible on Games page
- [ ] Can save game slots
- [ ] Can publish/unpublish games
- [ ] Can delete games

### Animations & UX
- [ ] Page fade-in on load
- [ ] Navigation slides in
- [ ] Cards have stagger animation
- [ ] Buttons have hover scale effect
- [ ] Buttons have click ripple
- [ ] Cards lift on hover
- [ ] Token counter animates in

## Security Hardening (Post-Launch)

### Firestore Rules
Update rules in Firebase Console > Firestore > Rules:
```
- Site settings: public read, authenticated write
- Games: public read, authenticated write
- Music: public read, authenticated write
- Users: own data read/write only
```

### HTTPS
- [ ] Railway provides HTTPS automatically
- [ ] Update any http:// links to https://

### Admin Account
- [ ] Create Game_Master account with strong password
- [ ] Store admin credentials securely

## Optional Enhancements

### Custom Domain
- [ ] Purchase domain (Namecheap, Porkbun, etc.)
- [ ] Add domain in Railway settings
- [ ] Configure DNS records
- [ ] SSL auto-provisioned by Railway

### Monitoring
- [ ] Set up Railway alerts
- [ ] Monitor Firebase usage
- [ ] Check Railway logs periodically

### Backup
- [ ] Export Firestore data regularly
- [ ] Keep local backup of Firebase config

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Firebase not configured" | Check environment variables in Railway |
| Blank page | Open browser console (F12) for errors |
| Can't login | Verify Firebase Auth is enabled |
| Games don't load | Check Firestore rules |
| Music won't play | Click page first (browser autoplay policy) |
| Styles broken | Clear browser cache |

## Success Criteria

Your CritStrike website is ready when:
1. All pages load without errors
2. Users can sign up and login
3. Theme switching works and persists
4. Daily rewards can be claimed
5. Games page displays (admin can add games)
6. Music player functions
7. Animations enhance UX without breaking functionality

---

## Quick Reference

**Railway Dashboard:** https://railway.app
**Firebase Console:** https://console.firebase.google.com

**Default Admin Username:** Game_Master

**Theme Files:**
- styles.css (shared styles + animations)
- animations.js (ripple, toast, confetti effects)

**Config Files:**
- firebase-config.js (Firebase setup)
- server.js (Express server)
- railway.json (Railway config)
- .env.example (Environment template)

---

Last Updated: 2026-04-22
