
CREATE TABLE IF NOT EXISTS t_p7329685_ben10_bot_for_friend.bot_users (
    id BIGSERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    coins INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    current_alien VARCHAR(50) DEFAULT 'heatblast',
    streak INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS t_p7329685_ben10_bot_for_friend.battles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES t_p7329685_ben10_bot_for_friend.bot_users(telegram_id),
    alien_used VARCHAR(50),
    enemy_name VARCHAR(100),
    result VARCHAR(10),
    coins_earned INTEGER DEFAULT 0,
    xp_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS t_p7329685_ben10_bot_for_friend.ai_conversations (
    id BIGSERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL,
    role VARCHAR(10) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS t_p7329685_ben10_bot_for_friend.group_chats (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT UNIQUE NOT NULL,
    title VARCHAR(255),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bot_users_coins ON t_p7329685_ben10_bot_for_friend.bot_users(coins DESC);
CREATE INDEX IF NOT EXISTS idx_battles_user ON t_p7329685_ben10_bot_for_friend.battles(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conv_telegram ON t_p7329685_ben10_bot_for_friend.ai_conversations(telegram_id);
