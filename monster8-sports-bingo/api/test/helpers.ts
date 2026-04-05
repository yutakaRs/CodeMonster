/**
 * Test utilities for Monster #8 API tests.
 *
 * Provides inline migration SQL and helpers for creating test data
 * against the D1 database from the vitest worker pool.
 */

// Inline the migration SQL so tests can bootstrap a clean schema
// without depending on migration file paths at runtime.
export const MIGRATIONS_SQL = `
CREATE TABLE IF NOT EXISTS draw_rounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id TEXT UNIQUE NOT NULL,
  draw_time DATETIME NOT NULL,
  numbers TEXT NOT NULL,
  super_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
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

CREATE TABLE IF NOT EXISTS bets (
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
`;

/**
 * Run all migration SQL against the given D1 database.
 */
export async function applyMigrations(db: D1Database): Promise<void> {
  const statements = MIGRATIONS_SQL.split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const sql of statements) {
    await db.prepare(sql).run();
  }
}

/**
 * Insert a pending bet into the bets table.
 */
export async function insertBet(
  db: D1Database,
  opts: {
    id: string;
    userId: string;
    roundId: string;
    playType: string;
    selectedNumbers: number[];
    selectedSide?: string | null;
    betAmount?: number;
    multiplier?: number;
    unitCount?: number;
    totalCost?: number;
  },
): Promise<void> {
  const betAmount = opts.betAmount ?? 2500;
  const multiplier = opts.multiplier ?? 1;
  const unitCount = opts.unitCount ?? 1;
  const totalCost = opts.totalCost ?? betAmount * multiplier;

  await db
    .prepare(
      `INSERT INTO bets (id, user_id, round_id, play_type, selected_numbers, selected_side, bet_amount, multiplier, unit_count, total_cost, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    )
    .bind(
      opts.id,
      opts.userId,
      opts.roundId,
      opts.playType,
      JSON.stringify(opts.selectedNumbers),
      opts.selectedSide ?? null,
      betAmount,
      multiplier,
      unitCount,
      totalCost,
    )
    .run();
}

/**
 * Insert a wallet for a user.
 */
export async function insertWallet(
  db: D1Database,
  opts: { id: string; userId: string; balance?: number },
): Promise<void> {
  await db
    .prepare("INSERT INTO wallets (id, user_id, balance) VALUES (?, ?, ?)")
    .bind(opts.id, opts.userId, opts.balance ?? 0)
    .run();
}
