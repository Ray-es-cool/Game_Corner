# CritStrike - Render Deployment Guide

## Database: Turso (Cloud SQLite)

This version uses **Turso** - a free cloud SQLite database. Your data persists in the cloud, no local disk needed!

**Turso Free Tier:**
- 9 GB storage
- 1 billion read operations/month
- 50 million write operations/month
- Perfect for small to medium websites

## Prerequisites

- A [Render account](https://render.com)
- A [Turso account](https://turso.tech) (free)
- Git repository with your CritStrike code

## Step 1: Create Turso Database

1. Go to [Turso Dashboard](https://turso.tech/)
2. Click **Create Database**
3. Configure:
   - **Name**: `critstrike` (or your choice)
   - **Location**: Choose closest to your users
   - **Platform**: Starter (free)
4. Click **Create**

## Step 2: Get Turso Credentials

After creating the database:

1. Click your database name
2. Copy these values:
   - **Database URL** (looks like: `libsql://your-db-name.turso.io`)
   - Click **Create Token** → copy the auth token

3. Save both values - you'll need them for Render!

## Step 3: Create Web Service on Render

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
| Instance Type | Free |

## Step 4: Environment Variables

In Render Dashboard → **Environment**, add these variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Production mode |
| `TURSO_DATABASE_URL` | `libsql://your-db.turso.io` | Your Turso database URL |
| `TURSO_AUTH_TOKEN` | `your-auth-token` | Your Turso auth token |

**Important:** Use the full URL including `libsql://` prefix!

## Step 5: Deploy

1. Click **Create Web Service**
2. Wait for build and deploy (~2-3 minutes)
3. Once deployed, visit your Render URL
4. Database tables are created automatically on first run!

## Directory Structure

```
CritStrike Website/
├── server.js          # Express server with API routes
├── database.js        # Turso database module
├── sqlite-db.js       # Client-side database API
├── firebase-config.js # Database configuration (Turso compatible)
├── package.json       # Dependencies including @libsql/client
├── index.html         # Home page
├── login.html         # Login page
├── signup.html        # Registration page
├── Games.html         # Games browser
├── DailyRewards.html  # Daily rewards
├── shop.html          # Token shop
├── settings.html      # User settings
└── Music.html         # Music player
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
# First, create a free Turso database and get credentials
cd "CritStrike Website"
npm install

# Set environment variables (or create .env file)
export TURSO_DATABASE_URL="libsql://your-db.turso.io"
export TURSO_AUTH_TOKEN="your-token"

node server.js
```

Visit `http://localhost:3000`

### Local Development Option

For local development without Turso, you can use a local SQLite file:
```bash
# Install better-sqlite3 for local dev
npm install better-sqlite3

# Then modify database.js to use local file when Turso is not configured
```

## Troubleshooting

### "Database not configured" errors
- Check `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in Render
- Ensure URL includes `libsql://` prefix
- Check Render logs for connection errors

### Build Fails
- Check that `@libsql/client` is in dependencies
- Ensure Node version is 18 or higher
- Check build logs in Render dashboard

### 500 Errors
- Check server logs in Render dashboard
- Verify Turso database is accessible
- Ensure environment variables are set correctly

### Slow Queries
- Turso free tier has latency for distant regions
- Choose a database location close to your users
- Consider upgrading Turso plan for production

## Migration from Firebase/SQLite

If you're migrating from Firebase or local SQLite:

1. Create your Turso database
2. Deploy the Turso version
3. Users can continue with existing accounts
4. Note: Previous user data won't transfer automatically

To migrate existing data, you'd need to:
1. Export from old database
2. Import into Turso using SQL

## Cost Estimate

**Render Free Tier:**
- 750 hours/month (enough for 24/7)
- 512MB RAM
- Free static bandwidth

**Turso Free Tier:**
- 9 GB storage
- 1 billion reads/month
- 50 million writes/month

**Total: $0/month** for small to medium usage!

## Support

For issues or questions:
1. Check Render logs in the dashboard
2. Check Turso dashboard for database stats
3. Verify environment variables are correct
4. Test locally first

## Links

- [Turso Docs](https://docs.turso.tech/)
- [Render Docs](https://render.com/docs)
- [libsql Client Docs](https://github.com/tursodatabase/libsql-client-js)
