-- Monster #8: Bingo Bingo Betting System

CREATE TABLE wallets (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL REFERENCES wallets(id),
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  ref_type TEXT,
  ref_id TEXT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

CREATE TABLE bets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  round_id TEXT NOT NULL,
  play_type TEXT NOT NULL,
  selected_numbers TEXT NOT NULL,
  selected_side TEXT,
  bet_amount INTEGER NOT NULL,
  multiplier INTEGER NOT NULL DEFAULT 1,
  unit_count INTEGER NOT NULL DEFAULT 1,
  total_cost INTEGER NOT NULL,
  matched_count INTEGER,
  payout_multiplier REAL,
  payout_amount INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  settled_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bets_user_id ON bets(user_id);
CREATE INDEX idx_bets_round_id ON bets(round_id);
CREATE INDEX idx_bets_status ON bets(status);
CREATE INDEX idx_bets_round_status ON bets(round_id, status);
