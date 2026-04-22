# CritStrike Website - Database Setup Guide

## Overview

The CritStrike website now uses a **SQLite database** to connect all pages and enable:
- Persistent user accounts and tokens across all pages
- Game_Master-only music management (songs don't reset when changing pages)
- 50 game slots with publish/delete functionality (Game_Master only)
- Cross-page synchronization

## Database Structure

### Tables Created Automatically:

1. **users** - User accounts, tokens, profiles
2. **games** - 50 game slots with thumbnails, files, publish status
3. **music** - Uploaded songs with order tracking
4. **site_settings** - Site title, logo, updates, slogan
5. **playlist_order** - Music playlist ordering
6. **current_track** - Currently playing track (persists across pages)

## Default Admin Account

- **Username:** `Game_Master`
- **Password:** `master123`

**Important:** Change this password in production!

## Installation

1. Navigate to the website folder:
   ```bash
   cd "CritStrike Website"
   ```

2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open browser to: `http://localhost:3000`

## Features

### Music System (Game_Master Only)

- Navigate to `/music.html`
- Only `Game_Master` can:
  - Upload new songs
  - Delete songs
  - Clear entire playlist
- Music continues playing when navigating between pages
- Current track position is saved in database

### Game Management (Game_Master Only)

- Navigate to `/Games.html`
- Only `Game_Master` can:
  - See all 50 game slots
  - Add games with name, thumbnail, and game files
  - Publish games (makes visible to all users)
  - Delete/reset game slots
- Published games appear on the home page

### User System

- All pages show current user and tokens
- Tokens sync across all pages in real-time
- Login required to play games and claim rewards

## API Endpoints

### User Authentication
- `POST /api/users/signup` - Create new account
- `POST /api/users/login` - Login
- `GET /api/users/:username` - Get user data
- `POST /api/users/:username` - Update user data
- `POST /api/tokens` - Update tokens

### Site Settings
- `GET /api/site` - Get site settings
- `POST /api/site` - Update site settings (Game_Master only)

### Games
- `GET /api/games` - Get all games
- `GET /api/games?published=true` - Get published games only
- `GET /api/games/:slotIndex` - Get specific game slot
- `POST /api/games` - Save game (Game_Master only)
- `DELETE /api/games/:slotIndex` - Delete game (Game_Master only)
- `POST /api/games/:slotIndex/play` - Increment play count

### Music
- `GET /api/music` - Get playlist
- `GET /api/music/current` - Get current track state
- `POST /api/music` - Upload song (Game_Master only)
- `DELETE /api/music/:id` - Delete song (Game_Master only)
- `POST /api/music/reorder` - Reorder playlist (Game_Master only)
- `POST /api/music/current` - Set current track (Game_Master only)
- `POST /api/music/clear-all` - Clear all songs (Game_Master only)

## File Structure

```
CritStrike Website/
├── server.js           # Express server with SQLite database
├── api-client.js       # Client-side API helper (NEW)
├── index.html          # Home page
├── login.html          # Login page
├── signup.html         # Registration page
├── Games.html          # Games page with admin panel
├── Music.html          # Music player with admin controls
├── shop.html           # Token shop
├── settings.html       # User settings
├── DailyRewards.html   # Daily reward system
├── music-engine.js     # Global music engine
├── critstrike.db       # SQLite database (created on first run)
└── package.json        # Dependencies
```

## Cross-Page Synchronization

The website uses two sync mechanisms:

1. **localStorage events** - For real-time sync between browser tabs
2. **Database API** - For persistent data across page reloads

Key sync events:
- `userSync` - User login/logout
- `tokenSync` - Token changes
- `musicCommand` - Music play/pause/track changes
- `gamesSync` - Game updates

## Troubleshooting

### Database not created
- Delete `critstrike.db` and restart the server
- Check file permissions in the folder

### Game_Master can't login
- Run: `curl -X POST http://localhost:3000/api/fix-admin`
- Default password: `master123`

### Music not persisting
- Check that you're logged in as Game_Master
- Verify the database file exists and is writable

### Games not showing
- Only published games are visible to regular users
- Game_Master can see all slots including unpublished

## Security Notes

- Change the default Game_Master password
- In production, use HTTPS
- Consider adding rate limiting for login attempts
- The database file contains all user data - back it up regularly
