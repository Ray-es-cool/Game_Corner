# CritStrike - Render Deployment Guide

## Database: SQLite

This version uses **SQLite** for persistent storage - no external database service required. SQLite stores data in a local file that persists on Render's disk.

## Prerequisites

- A [Render account](https://render.com)
- Git repository with your CritStrike code

## Step 1: Prepare Your Repository

Make sure your repository contains these files:
- `server.js` - Express server
- `database.js` - SQLite database module
- `sqlite-db.js` - Client-side database API
- `firebase-config.js` - Database configuration (now uses SQLite)
- `package.json` - Dependencies including `better-sqlite3`
- All HTML, CSS, and JS files

## Step 2: Create Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New +** → **Web Service**
3. Connect your Git repository
4. Configure the service:

| Setting | Value |
|---------|-------|
| Name | `critstrike` (or your choice) |
| Environment | `Node` |
| Build Command | `npm install` |
| Start Command | `node server.js` |
| Instance Type | Free (or higher for better performance) |

## Step 3: Enable Persistent Disk (IMPORTANT!)

SQLite requires disk persistence to save data between deploys:

1. In your Render service dashboard, go to **Disks**
2. Click **Add Disk**
3. Configure:
   - **Mount Path**: `/render_disk`
   - **Size**: 1 GB (minimum, adjust as needed)
4. Click **Add Disk**

Without this step, your database will reset on every deploy!

## Step 4: Environment Variables

Set these environment variables in Render Dashboard → **Environment**:

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Production mode |

## Step 5: Deploy

1. Click **Create Web Service**
2. Wait for the build and deploy to complete
3. Once deployed, visit your Render URL

## Directory Structure

```
CritStrike Website/
├── server.js          # Express server with API routes
├── database.js        # SQLite database module
├── sqlite-db.js       # Client-side API client
├── firebase-config.js # Database config (SQLite compatible)
├── package.json       # Dependencies
├── index.html         # Home page
├── login.html         # Login page
├── signup.html        # Registration page
├── Games.html         # Games browser
├── DailyRewards.html  # Daily rewards
├── shop.html          # Token shop
├── settings.html      # User settings
├── Music.html         # Music player
└── critstrike.db      # SQLite database (created on first run)
```

## API Endpoints

The server provides these REST API endpoints:

### Users
- `POST /api/users/signup` - Create new user
- `POST /api/users/login` - User login
- `GET /api/users/:username` - Get user data
- `POST /api/users/:username` - Update user data
- `GET /api/users/uid/:uid` - Get user by UID

### Games
- `GET /api/games` - Get all games
- `POST /api/games` - Create/update game
- `DELETE /api/games/:id` - Delete game
- `POST /api/games/:id/play` - Increment play count
- `POST /api/games/:id/credit` - Set credit eligibility

### Music
- `GET /api/music` - Get playlist
- `POST /api/music` - Upload song
- `DELETE /api/music/:id` - Delete song
- `DELETE /api/music` - Clear all music

### Site Settings
- `GET /api/site-settings` - Get site settings
- `POST /api/site-settings` - Save site settings

### Health Checks
- `GET /health` - Simple health check
- `GET /api/health` - Detailed health info

## Testing Locally

Before deploying, test locally:

```bash
cd "CritStrike Website"
npm install
node server.js
```

Visit `http://localhost:3000`

## Troubleshooting

### Database Not Persisting
- Ensure you've added a persistent disk in Render
- Check the `SQLITE_DB_PATH` environment variable
- Verify the disk mount path matches your database path

### Build Fails
- Check that `better-sqlite3` is in dependencies
- Ensure Node version is 18 or higher
- Check build logs in Render dashboard

### 500 Errors
- Check server logs in Render dashboard
- Verify database file permissions
- Ensure all API endpoints are properly configured

## Migration from Firebase

If you're migrating from Firebase:

1. Export your Firebase data manually
2. Deploy the SQLite version
3. Data will be stored locally in `critstrike.db`
4. Users can continue using their existing accounts (username/password stored in SQLite)

## Cost Estimate

- **Free Tier**: Includes 750 hours/month, 512MB RAM, persistent disk available
- **Plus Plan**: $7/month for more resources and features

SQLite is free - no additional database costs!

## Support

For issues or questions:
1. Check Render logs in the dashboard
2. Test locally first
3. Verify environment variables are set correctly
