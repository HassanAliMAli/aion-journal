-- AION Journal OS - Database Schema

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,           -- UUID
    username TEXT UNIQUE NOT NULL, -- Login ID
    password_hash TEXT NOT NULL,   -- PBKDF2/Argon2 Hash
    salt TEXT NOT NULL,           -- Salt for hashing
    role TEXT DEFAULT 'USER',      -- 'ADMIN' or 'USER'
    created_at INTEGER,           -- Unix Timestamp
    last_login INTEGER            -- Unix Timestamp
);

-- Trades Table
CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    data JSON NOT NULL,            -- Stores the full trade object
    entry_date TEXT,               -- For range queries
    instrument TEXT,               -- For filtering
    status TEXT,                   -- WIN/LOSS/BREAKEVEN
    created_at INTEGER,
    updated_at INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Meta/Config Table (User Preferences, Accounts, Rules)
CREATE TABLE IF NOT EXISTS user_data (
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,            -- 'ACCOUNTS', 'RULES', 'SETUPS', 'PREFS', 'CONTROL'
    data JSON NOT NULL,
    updated_at INTEGER,
    PRIMARY KEY(user_id, type),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Audit Logs (System-wide or User-specific)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    description TEXT,
    timestamp INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trades_user_date ON trades(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_trades_instrument ON trades(user_id, instrument);
