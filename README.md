# CritStrike Gaming Website

A modern, feature-rich gaming website with Firebase cloud database, built for Railway deployment.

## Features

- **User Authentication**: Sign up, login, logout with Firebase Auth
- **Theme System**: Dark, Light, and Pink themes with persistence
- **Daily Rewards**: Claim free tokens every 24 hours
- **Games Platform**: Admin can upload and manage HTML5 games
- **Music Player**: Cloud-hosted music playlist with cross-page persistence
- **Admin Panel**: Game_Master account can manage games, site settings, and music
- **Smooth Animations**: Page transitions, button ripples, hover effects

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js + Express
- **Database**: Firebase Firestore (Cloud)
- **Authentication**: Firebase Auth
- **Deployment**: Railway

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start server
npm start

# Open http://localhost:3000
```

### Configure Firebase

1. Edit `firebase-config.js` with your Firebase project values
2. Or set environment variables (see `.env.example`)

### Deploy to Railway

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for complete instructions.

## Project Structure

```
CritStrike Website/
├── server.js              # Express server
├── package.json           # Dependencies
├── railway.json           # Railway config
├── nixpacks.toml          # Build config
├── firebase-config.js     # Firebase setup
├── styles.css             # Shared styles + animations
├── animations.js          # UI animation utilities
├── index.html             # Homepage
├── Games.html             # Games platform
├── Music.html             # Music player
├── DailyRewards.html      # Daily rewards
├── shop.html              # Shop (placeholder)
├── settings.html          # Settings page
├── login.html             # Login/Signup
├── Tones.html             # Theme selector
└── DEPLOYMENT_GUIDE.md    # Deployment instructions
```

## Admin Access

Login as **Game_Master** to access:
- Game management (add/edit/publish games)
- Site settings (title, logo, updates)
- Music upload/delete

## Animations

The site includes:
- Page fade-in on load
- Navigation slide-in
- Card stagger animations
- Button hover scale + click ripple
- Card lift on hover
- Token counter slide-in
- Reward icon bounce
- Loading spinners

All animations respect `prefers-reduced-motion`.

## Environment Variables

For Railway deployment, set these variables:

| Variable | Description |
|----------|-------------|
| `FIREBASE_API_KEY` | Firebase API key |
| `FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID |
| `FIREBASE_APP_ID` | Firebase app ID |
| `NODE_ENV` | `production` |

See `.env.example` for template.

## Scripts

```bash
npm start      # Start production server
npm run dev    # Start development server
npm test       # Run tests (none configured)
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT

## Support

For deployment issues, see:
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
