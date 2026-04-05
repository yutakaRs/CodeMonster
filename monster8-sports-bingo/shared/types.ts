// ─── Draw / Round ───────────────────────────��─────────
export interface DrawRound {
  id: number;
  round_id: string;
  draw_time: string;
  numbers: number[];
  super_number: number;
  status: "pending" | "drawn" | "settled";
  created_at: string;
}

export interface CurrentRoundInfo {
  round_id: string;
  draw_time: string;
  status: "pending" | "drawn" | "settled";
  server_time: string;
  seconds_until_draw: number;
}

// ─── Betting ──────────────────────────────────────────
export type PlayType =
  | "star_1"
  | "star_2"
  | "star_3"
  | "star_4"
  | "star_5"
  | "star_6"
  | "star_7"
  | "star_8"
  | "star_9"
  | "star_10"
  | "big_small"
  | "odd_even"
  | "super";

export type BetStatus = "pending" | "won" | "lost";

export interface Bet {
  id: string;
  user_id: string;
  round_id: string;
  play_type: PlayType;
  selected_numbers: number[];
  selected_side: string | null;
  bet_amount: number;
  multiplier: number;
  unit_count: number;
  total_cost: number;
  matched_count: number | null;
  payout_multiplier: number | null;
  payout_amount: number;
  status: BetStatus;
  settled_at: string | null;
  created_at: string;
}

// ─── Wallet ───────────────────────────────────────────
export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export type TransactionType = "deposit" | "bet" | "payout" | "refund";

export interface Transaction {
  id: string;
  wallet_id: string;
  type: TransactionType;
  amount: number;
  balance_after: number;
  ref_type: string | null;
  ref_id: string | null;
  description: string | null;
  created_at: string;
}

// ─── Sports ───────────────────────────────────────────
export interface CacheResult<T> {
  data: T;
  cacheStatus: "HIT" | "MISS";
  cachedAt?: string;
  ttl: number;
}

// ─── API Response ─────────────────────────────────────
export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}
