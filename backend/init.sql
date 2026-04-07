-- Ygy Database Initialization
-- Runs automatically on first postgres container startup

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    cognitive_profile JSONB DEFAULT '{}',
    subscription_tier VARCHAR(50) DEFAULT 'free',
    last_login TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

-- Game sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_type VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL,
    accuracy FLOAT NOT NULL,
    duration_seconds INTEGER,
    difficulty_level INTEGER DEFAULT 1,
    cognitive_area VARCHAR(50),
    played_at TIMESTAMP DEFAULT NOW(),
    session_metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_type ON game_sessions (game_type);
CREATE INDEX IF NOT EXISTS idx_user_game_date ON game_sessions (user_id, game_type, played_at);

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    achievement_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description VARCHAR(500),
    icon VARCHAR(50),
    requirement_type VARCHAR(50),
    requirement_value INTEGER,
    points INTEGER DEFAULT 10,
    rarity VARCHAR(20) DEFAULT 'common'
);

-- User achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id VARCHAR(100) NOT NULL REFERENCES achievements(achievement_id),
    unlocked_at TIMESTAMP DEFAULT NOW(),
    progress FLOAT DEFAULT 1.0
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements (user_id);

-- Daily stats table
CREATE TABLE IF NOT EXISTS daily_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date TIMESTAMP NOT NULL,
    games_played INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    avg_accuracy FLOAT DEFAULT 0.0,
    streak_maintained INTEGER DEFAULT 0,
    cognitive_areas_practiced JSONB DEFAULT '[]'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_date ON daily_stats (user_id, date);

-- Friendships table
CREATE TABLE IF NOT EXISTS friendships (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    accepted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships (user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships (friend_id);

-- Challenges table
CREATE TABLE IF NOT EXISTS challenges (
    id SERIAL PRIMARY KEY,
    creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description VARCHAR(500),
    game_type VARCHAR(50) NOT NULL,
    difficulty_level INTEGER DEFAULT 1,
    max_participants INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- Challenge participants table
CREATE TABLE IF NOT EXISTS challenge_participants (
    id SERIAL PRIMARY KEY,
    challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    joined_at TIMESTAMP DEFAULT NOW()
);

-- Seed default achievements
INSERT INTO achievements (achievement_id, name, description, icon, requirement_type, requirement_value, points, rarity)
VALUES
    ('first_game',       'First Steps',      'Complete your first game',               '🎯', 'games',    1,    10,  'common'),
    ('ten_games',        'Getting Started',  'Complete 10 games',                      '🎮', 'games',    10,   25,  'common'),
    ('hundred_games',    'Century Club',     'Complete 100 games',                     '💯', 'games',    100,  100, 'rare'),
    ('score_1000',       'High Scorer',      'Score 1000 points in a single game',     '⭐', 'score',    1000, 50,  'common'),
    ('score_5000',       'Legendary',        'Score 5000 points in a single game',     '👑', 'score',    5000, 200, 'legendary'),
    ('perfect_accuracy', 'Perfectionist',    'Achieve 100%% accuracy in a game',       '🎯', 'accuracy', 100,  75,  'rare'),
    ('week_streak',      'Week Warrior',     'Play every day for 7 days',              '🔥', 'streak',   7,    150, 'rare'),
    ('month_streak',     'Dedicated',        'Play every day for 30 days',             '🏆', 'streak',   30,   500, 'epic')
ON CONFLICT (achievement_id) DO NOTHING;


