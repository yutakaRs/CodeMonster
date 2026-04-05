# Monster #8 - Sports Data API + Bingo Bingo

Cloudflare 全端應用：運動數據 API 串接 + 台灣彩券 Bingo Bingo 彩券系統。

## Tech Stack

### Backend

- **Runtime**: Cloudflare Workers（raw fetch handler，無框架）
- **Database**: Cloudflare D1（SQLite）— monster8-db（Bingo 資料）+ monster7-db（Auth SSOT）
- **Cache**: Cloudflare KV（SportsGameOdds API 快取）
- **Auth**: JWT（jose）— 共用 Monster #7 的 JWT_SECRET + AUTH_DB
- **OAuth**: Google OAuth（arctic）
- **Cron**: Cloudflare Cron Trigger（每 5 分鐘開獎）
- **Tests**: Vitest + @cloudflare/vitest-pool-workers

### Frontend

- **Framework**: React 19
- **Build**: Vite 8
- **Styling**: Tailwind CSS 4
- **Routing**: React Router 7
- **Charts**: Recharts

## Project Structure

```
monster8-sports-bingo/
  api/                    Cloudflare Worker — REST API
    src/
      routes/             API route handlers (auth, bingo, sports)
      services/           Business logic (draw engine, odds, settlement, KV cache)
      middleware/          JWT auth, CORS
      cron/               Cron trigger handler (draw + settle)
    migrations/           D1 SQL migrations
    test/                 Vitest tests
  web-app/                React frontend (Cloudflare Pages)
    src/
      pages/              Route pages (sports, bingo, auth)
      components/         Shared UI (Navbar, NumberBall, BingoBoard, Countdown)
      lib/                API client, Auth context
  shared/                 Shared TypeScript types
  docs/                   SPEC, verification reports
```

## Setup

### Prerequisites

- Node.js >= 20
- Wrangler CLI（`npm i -g wrangler`）
- SportsGameOdds API key（Amateur plan）

### Backend

```bash
cd api
npm install
npx wrangler d1 migrations apply DB --local   # 建立本地 D1
npm run dev                                     # localhost:8787
```

`.dev.vars` 需要：
```
SPORTSGAMEODDS_API_KEY=your_key
JWT_SECRET=your_secret
```

### Frontend

```bash
cd web-app
npm install
npm run dev    # localhost:5173
```

### Tests

```bash
cd api
npm test       # 66 tests (draw-engine, odds-engine, settlement, kv-cache)
```

## Environments

| | Development | Staging | Production |
|---|---|---|---|
| API | localhost:8787 | monster8-api-staging.workers.dev | monster8-api-production.workers.dev |
| Frontend | localhost:5173 | main.monster8.pages.dev | monster8.pages.dev |
| Custom Domain | — | api-staging.monster8.yutachang.com | api.monster8.yutachang.com |

## Core Features

### Part A: Sports Data API

- SportsGameOdds API 串接（運動、聯盟、隊伍、賽事、賠率）
- KV 快取層（TTL: 靜態資料 24h、賽事 1h、單場 15min）
- Response header `X-Cache: HIT|MISS`

### Part B: Bingo Bingo

- **開獎引擎**: 從 1-80 抽 20 個號碼，Fisher-Yates + rejection sampling 避免 modulo bias
- **隨機來源**: PROD 用 `crypto.getRandomValues()`，TEST 用 seeded PRNG（xoshiro128**）
- **Cron Trigger**: 每 5 分鐘自動開獎（07:05-23:55 台灣時間，203 期/天）
- **玩法**: 1-10 星、猜大小、猜單雙、超級獎號（完全比照台彩官方規則）
- **結算**: DB.batch() atomic 結算，獎金自動派發
- **錢包**: 模擬儲值、交易紀錄

### Security

- Cloudflare Access (Zero Trust) 保護 staging 入口
- Cloudflare Tunnel 用於本地開發的 OAuth callback
- API key 透過 wrangler secret 管理，不暴露在前端

