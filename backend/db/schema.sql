PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  email                 TEXT    UNIQUE NOT NULL,
  password_hash         TEXT    NOT NULL,
  is_verified           INTEGER NOT NULL DEFAULT 0,
  verify_token          TEXT,
  verify_token_expires  INTEGER,          -- Unix epoch seconds
  reset_token           TEXT,
  reset_token_expires   INTEGER,          -- Unix epoch seconds (1 h TTL)
  created_at            INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS recipes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT    NOT NULL,
  content    TEXT    NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT    UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,            -- Unix epoch seconds (7-day TTL)
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_recipes_user_id      ON recipes (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens (token);
