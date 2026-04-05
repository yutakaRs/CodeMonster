# Monster #8: Sports Data API + Bingo Bingo - Specification

> Source: `homework/monster8.md` + 主管補充 + 架構決策
> Domain: `yutachang.com`
> Date: 2026-04-05

---

## 1. Overview

全端 Cloudflare 應用，包含兩大部分：
- **Part A** (Phase 1-3)：串接 SportsGameOdds API + KV 快取 + 運動數據前端頁面
- **Part B** (Phase 4-8)：完全比照台灣彩券 Bingo Bingo 規則的彩券系統

延續 Monster #7 的 Cloudflare 基礎設施模式（Pages + Workers + D1 + KV），建立在獨立的 `monster8-sports-bingo/` 目錄。

---

## 2. Architecture Decisions

| Decision | Choice | Reason |
|---|---|---|
| 專案結構 | 獨立 `monster8-sports-bingo/` 目錄 | 作業規格要求，與 Monster #7 解耦 |
| API routing | Raw Workers fetch handler（同 Monster #7） | 保持一致性，不引入 Hono |
| 認證 | 共用 Monster #7 的 JWT_SECRET | Monster #8 Worker 只驗證 token，不簽發 |
| 金額單位 | 分（cents），1 TWD = 100 cents | 避免浮點數問題 |
| 多期投注 | 展開成 N 筆獨立 bet rows | 簡化結算邏輯 |
| Round ID 格式 | `YYYYMMDDNNN`（11 chars） | 比照官方期別概念 |
| 隨機來源 | Injectable RandomSource interface | PROD=crypto, TEST=seeded PRNG |
| 圖表庫 | Recharts | React-native, 輕量 |
| 時區 | Worker UTC + 台灣時間轉換 helper | Cron 用 UTC，業務邏輯用 TST |

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 8 + Tailwind CSS 4 + React Router 7 |
| Backend | Cloudflare Workers (raw fetch handler) |
| Database | Cloudflare D1 |
| Cache | Cloudflare KV |
| External API | SportsGameOdds v2 |
| Auth | JWT (jose) - 共用 Monster #7 JWT_SECRET |
| Testing | Vitest + @cloudflare/vitest-pool-workers |
| Charts | Recharts |
| CI/CD | GitHub Actions |
| Security | Cloudflare Access (Zero Trust) + Cloudflare Tunnel |

---

## 4. Cloudflare Resources

> **所有資源一律透過 wrangler CLI 建立和管理**

| Resource | Staging | Production |
|----------|---------|------------|
| Worker | `monster8-api-staging` | `monster8-api-production` |
| D1 Database | `monster8-db-staging` | `monster8-db-production` |
| KV Namespace | `monster8-kv-staging` | `monster8-kv-production` |
| Pages Project | `monster8` (main → staging, production → prod) |
| Worker Domain | `api-staging.monster8.yutachang.com` | `api.monster8.yutachang.com` |
| Pages Domain | `staging.monster8.yutachang.com` | `monster8.yutachang.com` |

### Secrets (per env, via `wrangler secret put`)

- `SPORTSGAMEODDS_API_KEY`
- `JWT_SECRET` (同 Monster #7)

### Environment Variables (via wrangler.toml vars)

- `CORS_ORIGIN`
- `ENVIRONMENT` ("staging" | "production")

---

## 5. Project Structure

```
monster8-sports-bingo/
├── api/
│   ├── src/
│   │   ├── index.ts                  # fetch + scheduled handler (entry point)
│   │   ├── types.ts                  # Env interface
│   │   ├── middleware/
│   │   │   ├── cors.ts               # CORS origin validation
│   │   │   └── auth.ts               # JWT token verification (Monster #7 tokens)
│   │   ├── utils/
│   │   │   ├── errors.ts             # Unified error format
│   │   │   └── jwt.ts                # jose JWT verify (read-only, no sign)
│   │   ├── services/
│   │   │   ├── sports-api-client.ts  # SportsGameOdds fetch wrapper
│   ���   │   ├── kv-cache.ts           # Generic KV caching layer
│   │   ���   ├── random-source.ts      # RandomSource interface + implementations
│   │   │   ├── draw-engine.ts        # Draw logic (Fisher-Yates + rejection sampling)
│   │   ���   ├── odds-engine.ts        # Payout table + win determination
│   ���   │   └── settlement.ts         # Bet settlement logic
│   │   ├── routes/
│   │   ���   ├── sports.ts             # /api/sports/* routes
│   │   │   ├── bingo-draws.ts        # /api/bingo/draws/* routes
│   │   │   ├��─ bingo-bets.ts         # /api/bingo/bets/* routes
│   │   │   ├── bingo-wallet.ts       # /api/bingo/wallet/* routes
│   │   │   └── bingo-stats.ts        # /api/bingo/stats/* routes
│   │   └── cron/
│   │       ��── draw-cron.ts          # Cron trigger handler
│   ├── migrations/
│   │   ├── 0001_draw_rounds.sql
��   │   └── 0002_bingo_system.sql
│   ├── test/
│   │   ├── helpers.ts
│   │   ���── draw-engine.test.ts
│   │   ├── odds-engine.test.ts
│   ���   ├── settlement.test.ts
│   │   └── kv-cache.test.ts
│   ├── wrangler.toml
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── web-app/
│   ��── src/
│   │   ├── App.tsx                   # Router setup
│   │   ├── main.tsx
│   │   ├── index.css
│   │   ├── lib/
│   │   │   └── api.ts               # apiFetch with Monster #7 JWT
│   │   ├── components/
│   ��   │   ├── Navbar.tsx
│   │   │   ├── Countdown.tsx         # Draw countdown timer
│   │   │   ├── BingoBoard.tsx        # 8x10 number grid (1-80)
│   │   │   └── NumberBall.tsx        # Single bingo ball
│   │   └── pages/
│   │       ├── sports/
│   │       │   ├── SportsPage.tsx
│   │       │   └── EventDetailPage.tsx
│   │       └── bingo/
│   │           ├── DrawHallPage.tsx
│   │           ├── BetPage.tsx
│   │           ├── BetHistoryPage.tsx
│   │           ├── DrawHistoryPage.tsx
��   │           └── WalletPage.tsx
��   ├── .env.staging
│   ├─�� .env.production
│   ├── package.json
���   ├── vite.config.ts
│   └── tsconfig.json
├── shared/
│   └── types.ts
├── docs/
│   └── spec.md                       # This file
├── .gitignore
└── README.md
```

---

## 6. D1 Schema

### Migration 0001: draw_rounds

```sql
CREATE TABLE draw_rounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id TEXT UNIQUE NOT NULL,          -- YYYYMMDDNNN (e.g. 20260405001)
  draw_time DATETIME NOT NULL,
  numbers TEXT NOT NULL,                   -- JSON array of 20 numbers (draw order preserved)
  super_number INTEGER NOT NULL,           -- = numbers[19] (the 20th drawn number)
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | drawn | settled
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_draw_rounds_status ON draw_rounds(status);
CREATE INDEX idx_draw_rounds_draw_time ON draw_rounds(draw_time);
```

### Migration 0002: bets, wallets, transactions

```sql
CREATE TABLE wallets (
  id TEXT PRIMARY KEY,                    -- UUID
  user_id TEXT UNIQUE NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0,     -- TWD cents (2500 = 25 TWD)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,                    -- UUID
  wallet_id TEXT NOT NULL REFERENCES wallets(id),
  type TEXT NOT NULL,                     -- deposit | bet | payout | refund
  amount INTEGER NOT NULL,                -- positive=credit, negative=debit (cents)
  balance_after INTEGER NOT NULL,
  ref_type TEXT,                          -- 'bet' | 'round' | null
  ref_id TEXT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

CREATE TABLE bets (
  id TEXT PRIMARY KEY,                    -- UUID
  user_id TEXT NOT NULL,
  round_id TEXT NOT NULL,
  play_type TEXT NOT NULL,                -- star_1..star_10 | big_small | odd_even | super
  selected_numbers TEXT NOT NULL,          -- JSON array (star/super plays)
  selected_side TEXT,                      -- 'big'|'small'|'odd'|'even' (big_small/odd_even)
  bet_amount INTEGER NOT NULL,             -- per-unit in cents (2500 = 25 TWD)
  multiplier INTEGER NOT NULL DEFAULT 1,   -- 1-50
  unit_count INTEGER NOT NULL DEFAULT 1,   -- number of betting units
  total_cost INTEGER NOT NULL,             -- bet_amount * multiplier * unit_count
  matched_count INTEGER,
  payout_multiplier REAL,
  payout_amount INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',   -- pending | won | lost
  settled_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bets_user_id ON bets(user_id);
CREATE INDEX idx_bets_round_id ON bets(round_id);
CREATE INDEX idx_bets_status ON bets(status);
CREATE INDEX idx_bets_round_status ON bets(round_id, status);
```

### Round ID Format

`YYYYMMDDNNN` — 11 characters

- 日期部分：西元年月日 (e.g. `20260405`)
- 期數部分：3-digit zero-padded (001 ~ 203)
- 公式：`period = ((hour * 60 + minute) - 425) / 5 + 1`
  - 07:05 = 001, 07:10 = 002, ..., 23:55 = 203
- Example: `20260405001` = 2026/04/05 第一期 (07:05)

---

## 7. Cron Trigger

### wrangler.toml

```toml
[triggers]
crons = ["5-55/5 23 * * *", "5-55/5 0-15 * * *"]
```

Taiwan 07:05-23:55 (UTC+8) = UTC 23:05 前一天 ~ 15:55 當天

### Cron Handler Flow

```
scheduled event fires
  → 1. 計算當前台灣時間
  → 2. 驗證在 07:05-23:55 範圍內（否則 skip）
  → 3. 計算 round_id (YYYYMMDDNNN)
  → 4. 冪等檢查：round_id 是否已存在且已 drawn
  → 5. 開獎：drawNumbers(CryptoRandomSource) → 20 個號碼
  → 6. 寫入 draw_rounds (status = 'drawn')
  → 7. 結算：取所有 round_id + status='pending' 的 bets
  → 8. 對每筆 bet 執行中獎判定
  → 9. env.DB.batch() atomic 更新：
       - UPDATE bets (matched_count, payout, status)
       - UPDATE wallets (中獎者加餘額)
       - INSERT transactions
  → 10. UPDATE draw_rounds status = 'settled'
  → 11. 更新 KV 快取（latest_result, current_round）
```

---

## 8. RandomSource Abstraction

### Interface

```typescript
interface RandomSource {
  getRandomBytes(count: number): Uint8Array;
}
```

### CryptoRandomSource (PROD)

- 包裝 `crypto.getRandomValues()` (Web Crypto API)
- 密碼學安全隨機數，無 bias

### SeededRandomSource (TEST/DEBUG)

- Seeded PRNG (e.g. xoshiro128**)
- 同 seed 產生完全相同的 byte 序列
- 可重現開獎結果，方便測試驗證

### Draw Algorithm

1. 候選陣列 [1..80]
2. Fisher-Yates shuffle，使用 RandomSource 提供的隨機 bytes
3. **Rejection sampling 避免 modulo bias**：
   - random byte 0-255
   - 對於要從 N 個元素中選 1 個：令 limit = floor(256/N) * N
   - reject byte >= limit，重新取
   - 取 byte % N
4. 取前 20 個 = 開獎號碼（保留順序）
5. `numbers[19]` = 超級獎號

---

## 9. Bingo Bingo Game Rules

> **以台灣彩券官網為最終準則**

### 基本參數

| 項目 | 規則 |
|---|---|
| 號碼範圍 | 1 ~ 80 |
| 每期開出 | 20 個號碼 |
| 開獎頻率 | 每 5 分鐘 |
| 營業時間 | 07:05 ~ 23:55 (TST) |
| 每日期數 | 203 期 |

### 玩法與賠率

#### 星數玩法 (1~10 星)

每注 25 元（= 2500 cents），從 1~80 選 N 個號碼。

| 玩法 | 中幾個 | 賠率 |
|---|---|---|
| 1 星 | 中 1 | 2x |
| 2 星 | 中 2 | 3x |
| 2 星 | 中 1 | 1x |
| 3 �� | 中 3 | 20x |
| 3 星 | 中 2 | 2x |
| 4 星 | 中 4 | 40x |
| 4 星 | 中 3 | 4x |
| 4 星 | 中 2 | 1x |
| 5 星 | 中 5 | 300x |
| 5 星 | 中 4 | 20x |
| 5 星 | 中 3 | 2x |
| 6 星 | 中 6 | 1,000x |
| 6 星 | 中 5 | 40x |
| 6 星 | 中 4 | 8x |
| 6 星 | 中 3 | 1x |
| 7 星 | 中 7 | 3,200x |
| 7 星 | 中 6 | 120x |
| 7 星 | 中 5 | 12x |
| 7 星 | 中 4 | 2x |
| 7 星 | 中 3 | 1x |
| 8 星 | 中 8 | 20,000x |
| 8 星 | 中 7 | 800x |
| 8 星 | 中 6 | 40x |
| 8 ��� | 中 5 | 8x |
| 8 星 | 中 4 | 1x |
| 8 星 | 中 0 | 1x |
| 9 星 | 中 9 | 40,000x |
| 9 星 | 中 8 | 4,000x |
| 9 星 | 中 7 | 120x |
| 9 星 | 中 6 | 20x |
| 9 星 | 中 5 | 4x |
| 9 星 | 中 4 | 1x |
| 9 星 | 中 0 | 1x |
| 10 星 | 中 10 | 200,000x |
| 10 星 | 中 9 | 10,000x |
| 10 星 | 中 8 | 1,000x |
| 10 星 | 中 7 | 100x |
| 10 星 | 中 6 | 10x |
| 10 星 | 中 5 | 1x |
| 10 星 | 中 0 | 1x |

#### 猜大小

- 每注 25 元
- 開出的 20 個號碼中：41~80 的號碼 >= 13 個 → **大**
- 1~40 的號碼 >= 13 個 → **小**
- 其他情況 → **此注未中獎**
- 賠率：**6x**

#### 猜單雙

- 每注 25 元
- 開出的 20 個號碼中：單數 >= 13 個 → **單**
- 雙數 >= 13 個 → **雙**
- 其他情況 → **此注未中獎**
- 賠率：**6x**

#### 超級獎號

- 每注 25 元
- 每期第 20 個開出的號碼即超級獎號
- **獨立玩法**，不是基本玩法的獎金加成
- 可選 1~20 個號碼（複選時依選號數計注數）
- 賠率：**48x**（中獎率 1/80）

### 投注規則

| 規則 | 說明 |
|---|---|
| 選號方式 | 自行選號、快選、部分快選 |
| 倍投 | 2~50 倍 |
| 多期投注 | 2~12 期（含當期） |
| 投注截止 | **各期投注截止同時開出該期獎號（不得提前截止）** |
| 猜大小雙選 | 同時勾選大和小 = 2 注 |
| 猜單雙雙選 | 同時勾選單和雙 = 2 注 |
| 超級獎號複選 | 選 N 個號碼 = N 注 |

### 選號方式定義

| 方式 | 說明 |
|---|---|
| **自行選號** | 玩家手動在號碼盤上點選號碼 |
| **快選** | 系統隨機產生所有所需號碼（例如 5 星 = 隨機選 5 個） |
| **部分快選** | 玩家先選部分號碼，剩餘由系統隨機補齊（例如 5 星已選 2 個，系統再隨機補 3 個） |

### 獎金計算

```
單注獎金 = 25 × 賠率倍數
總獎金 = 單注獎金 × multiplier × unit_count
```

### 錢包初始化

- 新用戶錢包初始餘額為 0
- 需透過「模擬儲值」功能加值後才能投注

### 數學背景（選用功能）

Bingo Bingo 本質是**超幾何分布（Hypergeometric Distribution）**：
- 母體 N = 80 個號碼
- 成功數 K = 20 個（開出的號碼）
- 抽樣數 n = 玩家選的號碼數量
- 中 k 個的機率：P(X=k) = C(K,k) × C(N-K, n-k) / C(N, n)

可作為前端的「中獎機率顯示」功能（加分項）。

---

## 10. KV Cache Strategy

### Sports Data Cache

| Key Pattern | TTL | External API |
|---|---|---|
| `sports_api:sports` | 24h (86400s) | GET /v2/sports/ |
| `sports_api:leagues:{hash}` | 24h (86400s) | GET /v2/leagues/ |
| `sports_api:teams:{hash}` | 24h (86400s) | GET /v2/teams/ |
| `sports_api:events:{hash}` | 1h (3600s) | GET /v2/events/ |
| `sports_api:event:{eventId}` | 15-30min (900-1800s) | GET /v2/events/?eventID=x |

- `{hash}` = SHA-256 of sorted query params, truncated to 16 hex chars
- Response 包含 `X-Cache: HIT|MISS` header

### Bingo Cache

| Key Pattern | TTL | Purpose |
|---|---|---|
| `bingo:current_round` | 60s | 當期/下一期資訊 |
| `bingo:latest_result` | 300s | 最新開獎結果 |
| `bingo:stats:{period}` | 600s | 號碼頻率統計 |

---

## 11. API Routes

### Sports Data (Public)

| Method | Path | Description |
|---|---|---|
| GET | `/api/sports` | 運動列表 |
| GET | `/api/sports/leagues` | 聯盟列表 (?sportID=) |
| GET | `/api/sports/teams` | 隊伍列表 (?leagueID=) |
| GET | `/api/sports/events` | 賽事列表 (?leagueID=&oddsAvailable=&limit=) |
| GET | `/api/sports/events/:eventId` | 單場賽事+賠率 |

### Bingo Draws (Public)

| Method | Path | Description |
|---|---|---|
| GET | `/api/bingo/draws/current` | 當期資訊+倒數 |
| GET | `/api/bingo/draws/latest` | 最新 N 期結果 (?limit=) |
| GET | `/api/bingo/draws/:roundId` | 指定期數結果 |
| GET | `/api/bingo/draws/history` | 分頁歷史 (?page=&limit=) |
| GET | `/api/bingo/stats/frequency` | 號碼頻率 (?periods=) |
| GET | `/api/bingo/stats/big-small` | 大小比例統計 |
| GET | `/api/bingo/stats/odd-even` | 單雙比例統計 |

### Bingo Bets (Authenticated)

| Method | Path | Description |
|---|---|---|
| POST | `/api/bingo/bets` | 下注 |
| GET | `/api/bingo/bets/mine` | 個人投注紀錄 (?status=&page=) |
| GET | `/api/bingo/bets/:betId` | 單筆投注詳情 |

### Bingo Wallet (Authenticated)

| Method | Path | Description |
|---|---|---|
| GET | `/api/bingo/wallet` | 錢包餘額 |
| POST | `/api/bingo/wallet/deposit` | 模擬儲值 |
| GET | `/api/bingo/wallet/transactions` | 交易紀錄 (?page=&limit=) |

### Health

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | 健康檢查 |

### Response Format

Success: `{ data: ... }`
Error: `{ error: { code: string, message: string } }`
Cache: `X-Cache: HIT|MISS` response header

---

## 12. Bet Placement API

### Request Body

```json
// Star play (e.g. 5-star)
{
  "play_type": "star_5",
  "selected_numbers": [3, 17, 42, 55, 78],
  "multiplier": 2,
  "periods": 3
}

// Big/Small
{
  "play_type": "big_small",
  "selected_side": "big",
  "multiplier": 1,
  "periods": 1
}

// Odd/Even (both sides = 2 units)
{
  "play_type": "odd_even",
  "selected_sides": ["odd", "even"],
  "multiplier": 1,
  "periods": 1
}

// Super number (multi-select = N units)
{
  "play_type": "super",
  "selected_numbers": [7, 23, 45],
  "multiplier": 1,
  "periods": 1
}
```

### Validation Rules

- Star N: exactly N numbers, each 1-80, no duplicates
- Big/Small: side is "big" or "small" (or both via selected_sides array)
- Odd/Even: side is "odd" or "even" (or both via selected_sides array)
- Super: 1-20 numbers, each 1-80, no duplicates
- Multiplier: 1-50
- Periods: 1-12
- **投注截止 = 開獎時間**：當期 draw_time 尚未到達才可投注，Cron 觸發開獎後即拒絕（不得提前截止）
- Wallet balance >= total_cost

### Multi-period Expansion

`periods = N` → creates N separate bet rows (one per consecutive round_id)

---

## 13. Frontend Pages

### Sports Pages

| Page | Route | Description |
|---|---|---|
| SportsPage | `/sports` | 運動/聯盟選擇 + 賽事卡片列表 |
| EventDetailPage | `/sports/events/:id` | 賠率表 + Recharts 圖表比較 |

### Bingo Pages

| Page | Route | Description |
|---|---|---|
| DrawHallPage | `/bingo` | 倒數計時、上期結果動畫、快速投注入口 |
| BetPage | `/bingo/bet` | 8x10 號碼盤、玩法切換、快選、倍投/多期 |
| BetHistoryPage | `/bingo/history` | 投注紀錄（篩選：全部/等待/中獎/未中獎） |
| DrawHistoryPage | `/bingo/draws` | 開獎歷史 + 號碼頻率/大小/單雙統計圖表 |
| WalletPage | `/bingo/wallet` | 餘額、模擬儲值、交易紀錄 |

### UI Requirements

- RWD 響應式設計（手機優先）
- 開獎號碼動畫（CSS scale-in + bounce，第 20 球金色特殊樣式）
- 倒數計時器（server time 校準，避免客戶端時間不準）
- 中獎投注醒目標示
- 投注金額即時計算：`25 × 注數 × 倍數 × 期數`
- 彩券遊戲風格 UI

---

## 14. Security

### Cloudflare Access (Zero Trust)

- 保護所有 staging 入口：
  - `staging.monster8.yutachang.com`
  - `api-staging.monster8.yutachang.com`
- 保護 admin 類 endpoint
- Access Policy: 只允許特定 email 白名單

### Cloudflare Tunnel

- 用於本地開發的 OAuth callback
- 不暴露家裡 IP
- 搭配 Access 保護 dev 入口
- 安裝 `cloudflared` CLI

### API Key Protection

- `SPORTSGAMEODDS_API_KEY` 透過 wrangler secret 管理
- 不暴露在前端或 API response 中
- `.dev.vars` 放本地開發用 key（gitignored）

---

## 15. CI/CD

### GitHub Actions Workflows

#### `ci-monster8.yml`

- Trigger: push to main/staging, PR to main
- Jobs:
  - `monster8-api-check`: TypeScript check + Vitest
  - `monster8-web-check`: ESLint + Vite build

#### `deploy-monster8.yml`

- Trigger: CI workflow success
- Rules:
  - main branch → deploy to staging (`wrangler deploy --env staging`)
  - production branch → deploy to production (`wrangler deploy --env production`)
- Includes D1 migration apply

---

## 16. Phase Checklists

### Phase 1: 專案骨架 + API Key 驗證

- [x] 建立 `monster8-sports-bingo/` 完整目錄結構
- [x] `api/` 初始化：package.json, tsconfig.json, wrangler.toml（雙環境）
- [x] `web-app/` 初始化：Vite + React 19 + Tailwind CSS 4 + React Router 7
- [x] wrangler CLI 建立 D1 databases (staging + production)
- [x] wrangler CLI 建立 KV namespaces (staging + production)
- [x] `.dev.vars` 設定 SPORTSGAMEODDS_API_KEY 和 JWT_SECRET
- [x] `wrangler secret put` 設定 staging / production secrets
- [x] 建立基本 Worker (health check endpoint)
- [x] 驗證 SportsGameOdds API: GET /v2/sports/ 回傳正常
- [x] 驗證 GET /v2/account/usage/ 確認免費方案用量限制
- [x] 決定呈現的運動/聯盟清單（NBA, NFL, MLB 等）

### Phase 2: 後端 Sports API + KV 快取

- [x] 實作 `services/kv-cache.ts` 通用快取層
- [x] 實作 `services/sports-api-client.ts` fetch wrapper
- [x] 實作 `routes/sports.ts` 全部 5 個 endpoints
- [x] KV 快取正常運作：首次 MISS，後續 HIT
- [x] TTL 到期後自動重新拉取
- [x] Response header 包含 X-Cache 狀態
- [x] API key 不暴露在前端或 response 中
- [x] 錯誤處理：外部 API 失敗時回傳適當錯誤
- [x] Unit tests for kv-cache and sports-client

### Phase 3: 前端運動數據頁面

- [x] 可選擇不同運動/聯盟查看資料
- [x] 賽事列表正確顯示（隊伍、比分、日期）
- [x] 歷史數據有視覺化呈現（Recharts 圖表）
- [x] Loading 與 Error 狀態處理正確
- [x] 頁面效能良好（善用 KV 快取）
- [x] RWD 響應式設計

### Phase 4: Bingo Bingo 開獎引擎

- [x] D1 migration `0001_draw_rounds.sql` 已建立並 apply
- [x] RandomSource interface 已實作（CryptoRandom + SeededRandom）
- [x] 開獎引擎正確：每期 20 個號碼，1~80，不重複
- [x] Fisher-Yates + rejection sampling 避免 modulo bias
- [x] 超級獎號 = 第 20 個開出號碼
- [x] Round ID 格式 YYYYMMDDNNN 正確
- [x] Cron Trigger 配置正確（07:05~23:55 TST, 每 5 分鐘）
- [x] Cron handler 冪等性（不會重複開獎）
- [x] 僅於營業時間開獎（203 期/天）
- [x] PROD 使用 Web Crypto API（不使用 Math.random()）
- [x] TEST 環境 seeded PRNG 同 seed 可重現
- [x] 開獎查詢 API（current, latest, by roundId）
- [x] Unit tests 通過

### Phase 5: 賠率引擎 + 中獎判定

- [x] 星數玩法 1~10 星賠率表完整正確
- [x] 8/9/10 星中 0 個 = 1x 特殊規則
- [x] 中獎判定函式：各星數 × 中獎數組合正確
- [x] 猜大小判定：大/小/未中獎（>= 13 門檻）
- [x] 猜單雙判定：單/雙/未中獎（>= 13 門檻）
- [x] 超級獎號判定：獨立玩法，48x
- [x] Unit tests 覆蓋所有邊界條件

### Phase 6: 投注系統 + 錢包

- [x] D1 migration `0002_bingo_system.sql` 已建立並 apply
- [x] Auth middleware 正確驗證 JWT（直接透過 AUTH_DB 驗證，共用 JWT_SECRET）
- [x] 錢包 API：餘額查詢、模擬儲值、交易紀錄
- [x] 投注 API：下注 + 驗證規則
- [x] 支援所有玩法（星數、大小、單雙、超級獎號）
- [x] 支援快選、部分快選
- [x] 支援 1-50 倍投
- [x] 支援 1-12 期多期投注
- [x] 猜大小/單雙雙選 = 2 注
- [x] 超級獎號複選 = N 注
- [x] 餘額不足時拒絕投注
- [x] 投注截止同時開獎（時間驗證）
- [x] 多期投注展開成 N 筆獨立 bet rows

### Phase 7: 開獎結算系統

- [x] 結算邏輯整合進 Cron handler
- [x] 使用 DB.batch() atomic 結算
- [x] 星數玩法結算正確：獎金 = 25 × 賠率 × multiplier
- [x] 猜大小結算正確
- [x] 猜單雙結算正確
- [x] 超級獎號獨立結算（不是基本玩法加成）
- [x] 倍投、複選、多期投注金額計算正確
- [x] 中獎者錢包餘額正確增加
- [x] 交易紀錄完整
- [x] 結算過程 atomic（不會部分結算）
- [x] 結算結果查詢 API

### Phase 8: 前端完整呈現

- [x] 開獎大廳：倒數計時器正確運作
- [x] 開獎號碼動畫效果
- [x] 投注頁：8x10 號碼盤可正常選取/取消
- [x] 玩法切換時選號數量限制正確
- [x] 快選/部分快選功能
- [x] 倍投 + 多期選擇器
- [x] 投注金額即時計算
- [x] 投注成功確認資訊
- [x] 投注紀錄：篩選 + 分頁
- [x] 中獎投注醒目標示
- [x] 開獎歷史：號碼頻率統計圖表
- [x] 大小/單雙比例統計圖表
- [x] 錢包頁：餘額 + 儲值 + 交易紀錄
- [x] RWD 響應式設計
- [x] 整體 UI 風格一致（溫暖色調主題）
