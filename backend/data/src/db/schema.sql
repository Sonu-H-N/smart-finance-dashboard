-- Smart Finance Dashboard — SQLite schema
-- Run automatically on server startup (idempotent via IF NOT EXISTS)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recurring_transactions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description   TEXT NOT NULL,
  amount        REAL NOT NULL CHECK (amount > 0),
  type          TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category      TEXT NOT NULL,
  day_of_month  INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 28),
  next_run_on   TEXT NOT NULL,
  active        INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_transactions(user_id);

CREATE TABLE IF NOT EXISTS transactions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description   TEXT NOT NULL,
  amount        REAL NOT NULL CHECK (amount > 0),
  type          TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category      TEXT NOT NULL,
  occurred_on   TEXT NOT NULL DEFAULT (date('now')),
  notes         TEXT,
  recurring_id  INTEGER REFERENCES recurring_transactions(id) ON DELETE SET NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, occurred_on);
CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON transactions(user_id, category);

CREATE TABLE IF NOT EXISTS budgets (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category      TEXT NOT NULL,
  monthly_limit REAL NOT NULL CHECK (monthly_limit > 0),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, category)
);
