-- Supabase Database Schema for CritStrike
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/liqwveiblfaifpudjmza/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================
-- USERS TABLE
-- =========================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    pfp TEXT DEFAULT 'https://via.placeholder.com/40',
    tokens INTEGER DEFAULT 0,
    themes JSONB DEFAULT '[]',
    inventory JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own data (signup)
CREATE POLICY "Users can insert own data" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- =========================
-- SITE SETTINGS TABLE
-- =========================
CREATE TABLE IF NOT EXISTS site_settings (
    id TEXT PRIMARY KEY,
    title TEXT,
    logo TEXT,
    updates TEXT,
    slogan TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Public read access
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view site settings" ON site_settings
    FOR SELECT USING (true);

-- Only authenticated users can update (admin check should be done in app)
CREATE POLICY "Authenticated users can update site settings" ON site_settings
    FOR UPDATE USING (auth.role() = 'authenticated');

-- =========================
-- GAMES TABLE
-- =========================
CREATE TABLE IF NOT EXISTS games (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    thumbnail TEXT,
    game_files JSONB,
    published BOOLEAN DEFAULT false,
    players INTEGER DEFAULT 0,
    plays_week INTEGER DEFAULT 0,
    plays_total INTEGER DEFAULT 0,
    credit_eligible BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published games" ON games
    FOR SELECT USING (published = true OR auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert games" ON games
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update games" ON games
    FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete games" ON games
    FOR DELETE USING (auth.role() = 'authenticated');

-- =========================
-- MUSIC TABLE
-- =========================
CREATE TABLE IF NOT EXISTS music (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    file_data TEXT NOT NULL,
    file_type TEXT,
    order_index INTEGER DEFAULT 0,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE music ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view music" ON music
    FOR SELECT USING (true);
CREATE POLICY "Authenticated users can upload music" ON music
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete music" ON music
    FOR DELETE USING (auth.role() = 'authenticated');

-- =========================
-- HELPER FUNCTIONS
-- =========================

-- Increment tokens for a user
CREATE OR REPLACE FUNCTION increment_tokens(user_id UUID, delta INTEGER)
RETURNS INTEGER AS $$
DECLARE
    new_tokens INTEGER;
BEGIN
    UPDATE users
    SET tokens = tokens + delta,
        updated_at = NOW()
    WHERE id = user_id
    RETURNING tokens INTO new_tokens;
    RETURN new_tokens;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment play count for a game
CREATE OR REPLACE FUNCTION increment_play_count(game_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE games
    SET plays_total = plays_total + 1,
        plays_week = plays_week + 1,
        updated_at = NOW()
    WHERE id = game_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================
-- TRIGGERS FOR updated_at
-- =========================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at
    BEFORE UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_site_settings_updated_at
    BEFORE UPDATE ON site_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =========================
-- INSERT DEFAULT SITE SETTINGS
-- =========================
INSERT INTO site_settings (id, title, logo, updates, slogan)
VALUES ('main', 'Home', 'https://via.placeholder.com/200', '- Ready', 'Play. Learn. Repeat')
ON CONFLICT (id) DO NOTHING;
