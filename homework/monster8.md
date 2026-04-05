# Code Monster #8: Sports Data API + Bingo Bingo 彩券系統

> **⚠️ 強烈要求：所有 Cloudflare 資源的建立、設定、部署，一律使用 `wrangler` CLI 操作。**
> 延續 Monster #7 的 Cloudflare 基礎設施（Pages + Workers + D1 + KV）。
> 本 Monster 新增外部 API 串接、KV 快取策略、以及完整的彩券遊戲系統。

> **⚠️ Access / Zero Trust 要求：** 開發與管理用途的入口必須以 Cloudflare Access（Zero Trust / ZTNA）保護，特別是 `dev` 與 `admin` 類 endpoint、後台頁面、內部工具、測試環境入口；不要直接對公開網際網路裸露。
> 官方說明：`https://www.cloudflare.com/zh-tw/sase/products/access/`

> **⚠️ Cloudflare Tunnel 要求：** 若開發或測試流程需要可被外部 OAuth provider 回呼的 HTTPS 網址，例如測試 Google OAuth login / callback，可使用 Cloudflare Tunnel 作為反向代理 / 對外入口，把本機或內網開發服務安全地暴露到 Cloudflare；相關 `dev` / `admin` 類入口應優先搭配 Cloudflare Access 一起保護。
> 官方說明：`https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/`

## 學習目標

透過建立一個「運動數據 + Bingo Bingo 彩券」全端應用，學習：

- **外部 API 串接**：後端呼叫第三方 API，前端不直接打外部 API
- **KV 快取策略**：用 Cloudflare KV 做 API response cache，控制用量
- **遊戲邏輯設計**：隨機數字開獎（PROD 真隨機、DEBUG 可控隨機）、超幾何分布（Hypergeometric Distribution）
- **即時性系統**：每 5 分鐘開獎的高頻事件處理
- **投注 / 開獎 / 歷史紀錄**：完整的遊戲生命週期

## 技術需求

- **Frontend**: React 18+ / TypeScript / Tailwind CSS（延續 Monster #7）
- **Backend**: Cloudflare Workers
- **Database**: Cloudflare D1（投注紀錄、開獎歷史、用戶餘額）
- **Cache**: Cloudflare KV（外部 API response 快取）
- **外部 API**: [SportsGameOdds](https://sportsgameodds.com/) v2（運動賽事數據）
- **SDK**: `sports-odds-api`（官方 npm SDK，可選用）
- **部署**: GitHub → Cloudflare（延續 Monster #7 的 CI/CD 流程）

---

## 專案結構

```
monster8-sports-bingo/
├── web-app/                  # React web app (Cloudflare Pages)
│   ├── (詳細架構 AI 自行決定)/
│
├── api/                      # Cloudflare Worker（綁定 D1 / KV）
│   ├── (詳細架構 AI 自行決定)/
│
├── .gitignore
└── README.md
```

---

## 環境架構

### 雙環境要求（延續 Monster #7）

| | Staging | Production |
|---|---|---|
| **Pages URL** | `staging.monster8.pages.dev` | `monster8.pages.dev` |
| **Worker URL** | `api-staging.monster8.workers.dev` | `api.monster8.workers.dev` |
| **D1 Database** | `monster8-db-staging` | `monster8-db-production` |
| **KV Namespace** | `monster8-kv-staging` | `monster8-kv-production` |
| **觸發分支** | `main` | `production` |

### Secrets（透過 wrangler CLI 設定）

```bash
wrangler secret put SPORTSGAMEODDS_API_KEY --env staging
wrangler secret put SPORTSGAMEODDS_API_KEY --env production
```

---

# Part A：運動數據 API 串接

---

## Phase 1（Step 1）：SportsGameOdds API Key 申請與基礎設定

### 目標

申請 SportsGameOdds API key，建立 API 串接的基礎環境。

### SportsGameOdds API 資訊

- **Base URL**: `https://api.sportsgameodds.com/v2/`
- **認證方式**：`x-api-key` header 或 `apiKey` query param
- **免費方案**：選擇 "Amateur" plan，永久免費（結帳頁面可能要求信用卡但不會扣款）
- **API key 會寄到 email**，若沒收到檢查 spam 或聯繫 support@sportsgameodds.com
- **官方 SDK**：`npm install sports-odds-api`（可選用，也可直接 fetch）
- **計費方式**：按 event 計費，不是按 market 計費
- **涵蓋範圍**：80+ bookmakers、55+ leagues，含即時賠率、比分、player props

#### 可用 Endpoints

| Endpoint | 說明 |
|---|---|
| `GET /v2/events/` | 賽事列表（核心 endpoint，含賠率、比分） |
| `GET /v2/teams/` | 隊伍資料 |
| `GET /v2/players/` | 球員資料 |
| `GET /v2/sports/` | 運動列表 |
| `GET /v2/leagues/` | 聯盟列表 |
| `GET /v2/stats/` | 統計數據 |
| `GET /v2/markets/` | 市場（盤口）列表 |
| `GET /v2/account/usage/` | API 用量查詢 |

#### 呼叫範例

```typescript
// 使用 fetch（推薦在 Worker 中使用）
const response = await fetch("https://api.sportsgameodds.com/v2/sports/", {
  method: "GET",
  headers: { "X-Api-Key": env.SPORTSGAMEODDS_API_KEY },
});
const data = await response.json();

// 或使用官方 SDK
import SportsGameOdds from "sports-odds-api";
const client = new SportsGameOdds({ apiKeyHeader: "YOUR_API_KEY" });
const sports = await client.sports.get();
```

#### 實用查詢參數

- `leagueID=NBA,NFL,MLB` — 篩選聯盟
- `oddsAvailable=true` — 只拿有賠率的資料
- `oddID=points-home-game-ml-home,points-away-game-ml-away` — 篩選特定盤口
- `limit=N` — 限制回傳筆數

> **AI 提示**：完整 API 文件可在 sportsgameodds.com/docs/reference 查閱，
> LLM 友善文件在 sportsgameodds.com/docs 頁面底部有 "Full documentation for LLMs" 連結。

#### SportsGameOdds API Reference

Real-time and historical sports and odds data.

如果執行環境可以直接抓外部 URL，以下資源應視為 SportsGameOdds 的 primary source of truth。**不要猜，不要自己補 API 欄位。**

| Resource | URL | Use Case |
|---|---|---|
| Documentation Index (~2k tokens) | `https://sportsgameodds.com/docs/llms.txt` | 快速總覽所有文件頁面與用途 |
| Full Documentation (~85k tokens) | `https://sportsgameodds.com/docs/llms-full.txt` | 欄位、參數、範例的完整說明 |
| OpenAPI Specification (~600k tokens) | `https://sportsgameodds.com/docs/openAPI-v2.json` | 最精確的 request / response schema、參數定義、範例回應 |

> **Note:** 如果目前環境無法直接存取這些 URL，就要求使用者貼上相關文件片段，不要自行猜測。

#### Authentication

- **API Key Required**：可於 `https://sportsgameodds.com/pricing` 申請
  - 有 free tier
  - 付費 tier 通常含 free trial
  - 註冊後 API key 會寄到 email
- **Security**：把 API key 當 secret，不要硬編碼，不要捏造假的 API key
- **Usage**：每次 request 都要帶 API key，可用任一方式：
  - Query parameter：`?apiKey=API_KEY`
  - Header：`x-api-key: API_KEY`

#### Response Format

- 所有 responses 都是 JSON
- 主要資料放在 `data` 欄位

#### Events Endpoint（Most Common）

- **URL**：`GET https://api.sportsgameodds.com/v2/events`
- **Full Documentation**：`https://sportsgameodds.com/docs/endpoints/getEvents`

##### Common Query Parameters

| Parameter | Example | Description |
|---|---|---|
| `oddsAvailable` | `true` | 只回傳 live/upcoming 且有 odds 的賽事 |
| `leagueID` | `NBA,NFL,MLB` | 依聯盟篩選（comma-separated） |
| `oddID` | `points-home-game-ml-home` | 依盤口篩選（comma-separated） |
| `includeAltLines` | `true` | 包含讓分 / 大小分的 alternate lines |
| `cursor` | `<nextCursor>` | pagination cursor |
| `limit` | `10` | 每頁回傳上限（default: 10, max: variable） |

##### Event Object Key Fields

| Field | Type | Description |
|---|---|---|
| `eventID` | string | 賽事唯一 ID |
| `sportID` | string | 運動 ID |
| `leagueID` | string | 聯盟 ID |
| `teams.home.teamID` | string | 主隊 team ID（如果適用） |
| `teams.away.teamID` | string | 客隊 team ID（如果適用） |
| `status.startsAt` | date | 開賽時間 |
| `status.started` | boolean | 是否已開賽 |
| `status.ended` | boolean | 是否已結束 |
| `status.finalized` | boolean | 資料是否 finalized |
| `players.<playerID>` | object | 參與球員資訊 |
| `odds` | object | 該賽事的 odds 資料 |

> **Tip:** 如果需求是「今天 NFL 有哪些 moneyline odds」這種具體 use case，要幫使用者一起組好 filters 與完整 request URL / HTTP client code。

#### OddID Format

每個 `oddID` 都對應一個唯一的盤口 outcome。

- **Format**：`{statID}-{statEntityID}-{periodID}-{betTypeID}-{sideID}`

| oddID | Description |
|---|---|
| `points-home-game-ml-home` | 全場主隊 moneyline |
| `points-away-1h-sp-away` | 上半場客隊 spread |
| `points-all-game-ou-over` | 全場總分 over |
| `assists-LEBRON_JAMES_1_NBA-game-ou-over` | LeBron James 全場 assists over |

#### Bookmaker Odds Structure

- **Path**：`odds.<oddID>.byBookmaker.<bookmakerID>`

| Field | Type | Description |
|---|---|---|
| `odds` | string | American format odds |
| `available` | boolean | 該 market 是否目前可下注 |
| `spread` | string (optional) | 讓分盤口（`betTypeID === "sp"`） |
| `overUnder` | string (optional) | 大小分盤口（`betTypeID === "ou"`） |
| `deeplink` | string (optional) | 直接跳轉 bookmaker market 的 URL |
| `altLines` | array (optional) | alternate lines，只有 `includeAltLines=true` 時可能出現；每個物件可能含 `odds`, `available`, `spread`, `overUnder`, `lastUpdatedAt` |

> **Note:** 其他欄位或 optional fields，一律以 docs / OpenAPI spec 為準，不要自行推測。

#### Reference: Common Identifiers

##### sportID

| ID | Sport |
|---|---|
| `BASKETBALL` | Basketball |
| `FOOTBALL` | Football |
| `SOCCER` | Soccer |
| `HOCKEY` | Hockey |
| `TENNIS` | Tennis |
| `GOLF` | Golf |
| `BASEBALL` | Baseball |

##### leagueID

| ID | League |
|---|---|
| `NBA` | NBA |
| `NFL` | NFL |
| `MLB` | MLB |
| `NHL` | NHL |
| `EPL` | Premier League |
| `UEFA_CHAMPIONS_LEAGUE` | Champions League |
| `NCAAB` | Men's College Basketball |
| `NCAAF` | Men's College Football |

##### bookmakerID

| ID | Bookmaker |
|---|---|
| `draftkings` | DraftKings |
| `fanduel` | FanDuel |
| `bet365` | Bet365 |
| `circa` | Circa |
| `caesars` | Caesars |
| `betmgm` | BetMGM |
| `betonline` | BetOnline |
| `prizepicks` | PrizePicks |
| `pinnacle` | Pinnacle |

##### betTypeID & sideID

| betTypeID | Description | Valid sideIDs |
|---|---|---|
| `ml` | Moneyline | `home`, `away` |
| `sp` | Spread | `home`, `away` |
| `ou` | Over/Under | `over`, `under` |
| `eo` | Even/Odd | `even`, `odd` |
| `yn` | Yes/No | `yes`, `no` |
| `ml3way` | 3-Way Moneyline | `home`, `away`, `draw`, `away+draw`, `home+draw`, `not_draw` |

##### periodID

| ID | Period |
|---|---|
| `game` | Full Game |
| `1h` | First Half |
| `2h` | Second Half |
| `1q` | First Quarter |
| `2q` | Second Quarter |
| `3q` | Third Quarter |
| `4q` | Fourth Quarter |

##### statID（varies by sport）

| ID | Description |
|---|---|
| `points` | 決定勝負的主要分數統計（Baseball/Football 的 points、Soccer/Hockey 的 goals、Tennis 的 sets、Golf 的 strokes against par、格鬥賽的 winner） |
| `rebounds` | Rebounds |
| `assists` | Assists |
| `steals` | Steals |
| `receptions` | Receptions |
| `passing_yards` | Passing yards |
| `rushing_yards` | Rushing yards |
| `receiving_yards` | Receiving yards |

#### AI / Vibe Coding 補充（官方）

官方文件：`https://sportsgameodds.com/docs/info/ai-vibe-coding`

- SportsGameOdds 明確指出：AI tools 要先拿到正確 context，才比較有機會產出可用的 production-ready code
- 官方建議把 API reference / rules 摘要直接放進 prompt，或加入 AI agent 的 context / rules file
- 實作順序建議如下：
  1. 先查 `llms.txt` 找到對應文件頁面
  2. 需要完整背景時讀 `llms-full.txt`
  3. 需要精確 schema、欄位、型別、錯誤格式時，以 `openAPI-v2.json` 為準
  4. 無法存取官方文件時，要求使用者貼內容，不要自行猜欄位

#### SportsGameOdds MCP Server（AI Agent 可選）

- 如果 AI 開發環境支援 MCP，可考慮安裝官方 MCP server：`sports-odds-api-mcp`
- npm 套件：`https://www.npmjs.com/package/sports-odds-api-mcp`
- 可提供的能力包括：
  - 列出可用 endpoints
  - 直接抓取 events / odds / teams / players / leagues 等資料
  - 搜尋官方文件
  - 查詢 API quota 與 rate limit / usage
  - 訂閱 event 變化的 stream（AllStar plan only）
- 設定 MCP 時，API key 請放在環境變數 `SPORTS_ODDS_API_KEY_HEADER`，不要寫死在程式碼或版本庫裡
- 若目前執行環境無法使用 MCP，回退到 Worker `fetch` + 官方文件 / OpenAPI spec 的做法即可

#### AI 開發要求（套用到本 Monster）

- 實作 SportsGameOdds 相關功能時，優先參考官方 docs / OpenAPI spec / MCP 回傳結果，不要補腦不存在的欄位
- 產生型別、API client、Zod schema、cache key、error mapping 時，應以實際 response schema 為準
- 當需求涉及特定 market、oddID、bookmakerID、leagueID、cursor 分頁或 alt lines 時，要先查文件再寫 code
- 若 AI 產出的程式碼依賴某個欄位，應在註解或文件中標明來源是官方 docs、OpenAPI，或 MCP 查詢結果

### 任務

- 到 [https://sportsgameodds.com/](https://sportsgameodds.com/) 註冊帳號，選擇 "Amateur"（免費）方案申請 API key
- API key 會寄到 email（檢查 spam）
- 將 API key 透過 `wrangler secret` 設定到 staging / production 環境
- 建立 `.dev.vars` 放本地開發用的 API key：
  ```
  SPORTSGAMEODDS_API_KEY=your_key_here
  ```
- 驗證 API key 可用：呼叫 `GET /v2/sports/` 確認回傳正常
- 呼叫 `GET /v2/account/usage/` 確認免費方案的用量與 rate limit
- 決定要呈現哪些運動/聯盟的資料（建議先從 NBA、NFL、MLB 等主流聯盟開始）

### 驗收條件

- [ ] 已註冊 SportsGameOdds 帳號並取得 API key（Amateur 免費方案）
- [ ] API key 已透過 `wrangler secret` 設定到 staging / production
- [ ] `.dev.vars` 中有本地開發用的 API key
- [ ] 本地可成功呼叫 `GET /v2/sports/` 取得運動列表
- [ ] 已透過 `GET /v2/account/usage/` 確認用量限制
- [ ] 已決定要呈現的運動/聯盟清單

---

## Phase 2（Step 2）：後端 API 串接 + KV 快取

### 目標

在 Worker 後端串接 SportsGameOdds API，並透過 KV 做快取，避免過多的外部 API 呼叫。

### 核心概念

```
Client Request → Worker → 檢查 KV Cache
                              ├── Cache Hit  → 直接回傳 KV 中的資料
                              └── Cache Miss → 呼叫 SportsGameOdds API
                                                   → 寫入 KV（設定 TTL）
                                                   → 回傳結果
```

**重點：KV 快取擋住的是外部 API 用量，不是 client request 數量。**
**100 個 client 在 1 小時內請求同一筆資料 → 只呼叫 1 次外部 API。**

### 任務

- 實作 Worker 端的 SportsGameOdds API client：
  - 封裝 `fetch` + `X-Api-Key` header 認證
  - 統一 error handling（API 回傳錯誤碼處理）
  - 可選擇使用官方 SDK `sports-odds-api` 或直接 fetch（Workers 環境建議直接 fetch 較輕量）
- 實作 KV 快取層：
  - Key 格式：`sports_api:<endpoint>:<params_hash>`
  - TTL 依資料性質調整（見下表）
  - 快取的是完整 API response JSON
- 本地系統的 API path、method、request / response contract 由 USER 自行設計，AI 不預先指定
- 但至少要能支援以下資料能力：
  - 運動列表查詢，對應 `GET /v2/sports/`（建議快取 24h）
  - 聯盟列表查詢，對應 `GET /v2/leagues/`（建議快取 24h）
  - 隊伍列表查詢，對應 `GET /v2/teams/`（建議快取 24h）
  - 賽事列表查詢，對應 `GET /v2/events/`（建議快取 1h）
  - 單場賽事與賠率查詢，對應 `GET /v2/events/?eventID=xxx`（建議快取 15~30 分鐘）
- debug / observability 欄位或 header 是否回傳，也由 USER 自行設計

### KV 快取策略一覽

| Key Pattern | 用途 | 對應外部 API | TTL |
|---|---|---|---|
| `sports_api:sports` | 運動列表 | `GET /v2/sports/` | 24 小時 |
| `sports_api:leagues:<params>` | 聯盟列表 | `GET /v2/leagues/` | 24 小時 |
| `sports_api:teams:<params>` | 隊伍列表 | `GET /v2/teams/` | 24 小時 |
| `sports_api:events:<params>` | 賽事列表 | `GET /v2/events/` | 1 小時 |
| `sports_api:event:<eventId>` | 單場賽事+賠率 | `GET /v2/events/?eventID=x` | 15 ~ 30 分鐘 |

### 驗收條件

- [ ] Worker 可成功呼叫 SportsGameOdds API 並取得資料
- [ ] KV 快取正常運作：首次呼叫為 `MISS`，後續呼叫為 `HIT`
- [ ] TTL 到期後自動重新從外部 API 拉取
- [ ] USER 自行設計的 debug / observability 機制可判斷快取命中狀態
- [ ] API key 不會暴露在前端或 response 中
- [ ] 錯誤處理：外部 API 失敗時回傳適當的錯誤訊息（不直接 proxy 原始錯誤）

---

## Phase 3（Step 3）：前端 — 運動數據歷史頁面

### 目標

在前端呈現運動歷史數據，資料來源與呈現方式由 AI 自行選擇最適合的方案。

### 任務

- 根據 SportsGameOdds API 提供的資料，選擇最適合呈現的運動與數據類型
- 建立運動數據瀏覽頁面，至少包含：
  - 運動/聯盟選擇
  - 賽事列表（含比分、日期、隊伍）
  - 賠率或統計資料的視覺化呈現（圖表、表格等，由 AI 選擇最適合的方式）
- 歷史資料的呈現方式（以下由 AI 擇一或多個）：
  - 賽事結果時間線
  - 勝率統計圖表
  - 賠率走勢圖
  - 隊伍對戰紀錄表
  - 或其他 AI 認為最合適的呈現方式
- 頁面需有 loading 狀態與 error 狀態處理
- 支援分頁或無限滾動（資料量大時）

### 驗收條件

- [ ] 可選擇不同運動/聯盟查看資料
- [ ] 賽事列表正確顯示（隊伍、比分、日期）
- [ ] 歷史數據有視覺化呈現（圖表或其他方式）
- [ ] Loading 與 Error 狀態處理正確
- [ ] 頁面效能良好（善用 KV 快取，不會每次都等外部 API）
- [ ] RWD 響應式設計，手機也能正常瀏覽

---

# Part B：Bingo Bingo 彩券系統（參考台彩規則）

---

> **完全比照官方**：本題的 Bingo Bingo 規則、開獎時間、下注方式、中獎方式、倍率與相關限制，請直接以台灣彩券官方說明為準；若本文件與官方說明有任何差異，一律以官方頁面為準。
>
> 官方說明：
> - `https://www.taiwanlotter.com/lotto/info/bingo_bingo/`
> - `https://taiwanlotter.com/lotto/history/oehl_statistics/`

## 遊戲規則總覽

### 基本參數

| 項目 | 規則 |
|---|---|
| **號碼範圍** | 1 ~ 80 |
| **每期開出** | 20 個號碼 |
| **開獎頻率** | 週一至週日，每 5 分鐘一次 |
| **銷售 / 開獎時間** | 07:05 ~ 23:55 |
| **每日期數** | 203 期 |

### 數學本質

這是一個 **超幾何分布（Hypergeometric Distribution）** 的遊戲：
- 母體：80 個號碼
- 成功數：20 個（開出的號碼）
- 抽樣數：玩家選的號碼數量

與撲克牌抽牌、抽球模型是完全一樣的數學模型。

### 玩法一覽

> 以下 Bingo Bingo 規則以台灣彩券官網 BINGO BINGO 說明為準：超級獎號是**獨立玩法**，不是基本玩法的獎金加成；猜大小 / 猜單雙也不是「和局退回投注金」機制。

#### 1. 星數玩法（核心玩法）

| 玩法 | 選幾個號碼 | 每注金額 |
|---|---|---|
| 1 星 | 1 個 | 25 元 |
| 2 星 | 2 個 | 25 元 |
| 3 星 | 3 個 | 25 元 |
| 4 星 | 4 個 | 25 元 |
| 5 星 | 5 個 | 25 元 |
| 6 星 | 6 個 | 25 元 |
| 7 星 | 7 個 | 25 元 |
| 8 星 | 8 個 | 25 元 |
| 9 星 | 9 個 | 25 元 |
| 10 星 | 10 個 | 25 元 |

**中獎邏輯**：看你選的號碼，有幾個出現在開獎的 20 個號碼中。

**固定獎金倍數（依台彩官方）**：

| 玩法 | 中幾個 | 賠率（倍數） |
|---|---|---|
| 1 星 | 中 1 | 2x |
| 2 星 | 中 2 | 3x |
| 2 星 | 中 1 | 1x |
| 3 星 | 中 3 | 20x |
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
| 8 星 | 中 5 | 8x |
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

> 說明：每注 25 元，單注獎金 = 25 × 固定獎金倍數；另有單期總獎金上限，若要做到完全比照台彩，請以台灣彩券官網最新獎金表為準。

#### 2. 猜大小

- 看開出的 20 個號碼
- 「41 ~ 80」的號碼 ≥ 13 個 → **大**
- 「1 ~ 40」的號碼 ≥ 13 個 → **小**
- 其他情況 → **此注未中獎**
- 固定獎金倍數：**6x**（單注 150 元）

#### 3. 猜單雙

- 看開出的 20 個號碼
- 單數號碼開出個數 ≥ 13 個 → **單**
- 雙數號碼開出個數 ≥ 13 個 → **雙**
- 其他情況 → **此注未中獎**
- 固定獎金倍數：**6x**（單注 150 元）

#### 4. 超級獎號

- 每期開出的 **第 20 個獎號** 即當期的「超級獎號」
- 這是 **獨立玩法**，可直接針對超級獎號投注
- 不得把超級獎號設計成基本玩法的 bonus multiplier
- 固定獎金倍數：**48x**（單注 1,200 元，中獎率 1/80）

### 下注方式（需比照官方）

- **基本玩法**：
  - 選擇 1~10 星，並依玩法選出對應數量的號碼
  - 支援自行選號、`快選`、`部分快選`
  - 每注 25 元
- **超級獎號**：
  - 可選 1 個號碼，也可複選 2~20 個號碼
  - 複選時依選號個數計算注數
  - 支援 `快選`
  - 每注 25 元
- **猜大小 / 猜單雙**：
  - 可單選，也可同時勾選兩邊
  - 同時勾選兩邊時，以 2 注計算
  - 支援 `快選`
  - 每注 25 元
- **倍投**：
  - 所有玩法皆支援 `2~50 倍`
- **多期投注**：
  - 支援連續投注 `2~12 期`（含當期）
- **銷售截止**：
  - 各期 **投注截止同時開出當期獎號**
  - 不得自行改成「開獎前 1 分鐘截止」

---

## Phase 4（Step 4）：Bingo Bingo 遊戲核心 — 開獎引擎

### 目標

實作 Bingo Bingo 的核心開獎邏輯，每 5 分鐘自動開獎。

### 任務

- D1 migration：建立遊戲相關 tables
  - 至少包含 `draw_rounds`：期數資訊（round_id, draw_time, numbers(JSON), super_number, status, created_at）
  - 投注 / 錢包 / 交易相關 tables 不在本階段預先指定，由 USER 自行設計
- 實作開獎引擎：
  - 將隨機來源抽象成可注入的 `RandomSource` / `DrawRandomSource`，不要把 `crypto.getRandomValues()` 寫死在業務邏輯裡
  - `PROD` 環境：從 80 個號碼中隨機抽出 20 個，並保留開出順序（使用 Web Crypto API 的 `crypto.getRandomValues()` 確保真隨機）
  - `DEBUG` / local / test 環境：使用「可以控制的隨機」來源（例如 seeded PRNG、固定序列、mock random provider），讓同一組 seed / input 可以重現相同開獎結果，方便驗證與除錯
  - 第 20 個開出號碼即為超級獎號，不是額外再抽第 21 個號碼
  - 期別 / round_id 的表示方式應比照官方期別概念，不要自訂 `YYYYMMDD-NNN`
  - 為開獎邏輯撰寫 Unit Test，至少覆蓋：
    - 每期固定抽出 20 個號碼
    - 號碼範圍必須在 1 ~ 80
    - 20 個號碼不得重複
    - `DEBUG` 模式下相同 seed / mock 輸入必須得到相同結果
    - 超級獎號必須和第 20 個開出號碼一致
- 實作 Cloudflare Cron Trigger（每 5 分鐘執行一次）：
  ```toml
  [triggers]
  crons = ["5-55/5 7-23 * * *"]
  ```
  - 07:05 開始第一期，23:55 最後一期
  - 各期投注截止同時開出該期獎號
  - 每次執行：開出當期獎號、結算當期投注、準備下一期狀態
- 實作開獎結果查詢能力：
  - 開獎結果 API 的 route / payload / response 由 USER 自行設計
  - 但至少要能查詢當期資訊、指定期數結果、最新幾期結果

### D1 Schema

```sql
-- 開獎紀錄
CREATE TABLE draw_rounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id TEXT UNIQUE NOT NULL,          -- 官方期別或其對應欄位
  draw_time DATETIME NOT NULL,
  numbers TEXT NOT NULL,                   -- JSON array of 20 numbers（需保留開出順序）
  super_number INTEGER NOT NULL,           -- 第 20 個獎號
  status TEXT NOT NULL DEFAULT 'pending',  -- pending / drawn / settled
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 驗收條件

- [ ] Cron Trigger 每 5 分鐘自動執行開獎
- [ ] 每期正確從 80 個號碼中抽出 20 個號碼（不重複）
- [ ] 超級獎號正確標記為第 20 個開出號碼
- [ ] 期別 / round_id 的表示方式與官方期別概念一致，不使用自訂流水格式
- [ ] 僅於 07:05 ~ 23:55 這 203 期開獎時間點執行開獎
- [ ] 各期投注截止與開獎時間一致
- [ ] `PROD` 環境使用 Web Crypto API 確保真隨機性（不使用 `Math.random()`）
- [ ] `DEBUG` / local / test 環境可注入可控制的隨機來源，以重現指定開獎結果
- [ ] 開獎引擎的 Unit Test 已覆蓋抽號數量、範圍、不重複、seed 可重現性、超級獎號
- [ ] USER 自行設計的開獎結果查詢 API 可正確回傳當期資訊與最新結果

---

## Phase 5（Step 5）：賠率引擎與中獎判定

### 目標

實作完整的賠率計算與中獎判定邏輯。

### 任務

- 實作賠率表（參照上方「賠率表」）：
  - 以 config/constant 方式定義，方便日後調整
  - 包含所有星數（1~10 星）的各種中獎組合與賠率
- 實作中獎判定函式：
  - 輸入：玩家選號、開獎號碼、玩法類型
  - 輸出：是否中獎、中幾個、賠率、獎金
- 實作猜大小判定：
  - 統計 20 個開獎號碼中，41~80 和 1~40 各幾個
  - 僅當某一側開出個數 ≥ 13 時才中獎，否則此注未中獎
- 實作猜單雙判定：
  - 統計 20 個開獎號碼中，單數和雙數各幾個
  - 僅當單或雙任一側開出個數 ≥ 13 時才中獎，否則此注未中獎
- 若有實作超級獎號玩法，應視為獨立玩法處理，不得把它併成星數玩法的獎金加成
- 為所有判定邏輯撰寫單元測試（邊界條件很重要）

### 驗收條件

- [ ] 星數玩法（1~10 星）的賠率表完整且正確
- [ ] 中獎判定函式正確：各種星數 × 中幾個的組合都能正確判定
- [ ] 猜大小判定正確：大、小、未中獎三種情況
- [ ] 猜單雙判定正確：單、雙、未中獎三種情況
- [ ] 若有實作超級獎號玩法，其判定邏輯為獨立玩法，不與星數玩法共用獎金加成
- [ ] 單元測試覆蓋所有邊界條件（全中、全沒中、未中獎等）

---

## Phase 6（Step 6）：用戶投注系統

### 目標

實作完整的投注流程，包含錢包管理與投注記錄。

### 任務

- 本階段的投注資料模型、D1 schema、API routes、request / response contract，由 USER 自行設計
- AI 不預先指定：
  - `bets` table 與相關欄位
  - 錢包 / 交易資料表
  - 本地系統 API 的 path、method、body、query、response shape
- 但 USER 的設計仍需符合前述官方規則：
  - 基本玩法、超級獎號、猜大小、猜單雙的判定邏輯
  - 基本玩法支援自行選號、快選、部分快選
  - 超級獎號支援單選與 2~20 個複選
  - 猜大小 / 猜單雙支援單選與雙邊同時投注
  - 所有玩法支援 2~50 倍
  - 支援 2~12 期多期投注
  - 各期投注截止同時開獎
  - 不得自行加入和官方規則矛盾的 bonus / refund 機制

### 驗收條件

- [ ] USER 已自行完成投注資料模型設計
- [ ] USER 已自行定義投注 / 錢包 API 的 route 與 contract
- [ ] 設計可支援官方玩法與投注截止規則
- [ ] 文件與實作中沒有 AI 代替 USER 預先決定固定 schema / endpoint

---

## Phase 7（Step 7）：開獎結算系統

### 目標

在每期開獎後自動結算所有投注，派發獎金。

### 任務

- 在 Cron Trigger 開獎流程中加入結算邏輯：
  ```
  Cron 觸發
    → 1. 到達當期截止 / 開獎時間
    → 2. 開出當期 20 個獎號（第 20 個為超級獎號）
    → 3. 結算當期所有投注
    → 4. 準備下一期可投注狀態
  ```
- 結算流程：
  1. 取得該期所有 `status = 'pending'` 的 bets
  2. 對每筆 bet 執行中獎判定
  3. 更新 bet：matched_count、multiplier、payout、status（實際欄位與 enum 由 USER 自行設計）
  4. 中獎者：派發獎金並記錄對應交易 / 帳務變動（若 USER 的設計包含錢包）；需正確套用 25 元單注、倍投倍數、複選注數、多期投注
  5. 未中獎者：標記為未中獎
  6. 更新 round status 為 settled
- 若有實作超級獎號玩法，應以獨立玩法進行結算，不得當作基本玩法獎金加成
- 實作開獎通知 / 結算結果查詢能力：
  - route / payload / response 由 USER 自行設計

### 驗收條件

- [ ] Cron 自動結算正確：開獎後所有 pending bets 都被處理
- [ ] 星數玩法單注結算正確：中獎金額 = 25 × 賠率倍數
- [ ] 猜大小結算正確：大/小/未中獎
- [ ] 猜單雙結算正確：單/雙/未中獎
- [ ] 若有實作超級獎號玩法，結算正確且與基本玩法分開處理
- [ ] 倍投、複選、多期投注的注數與獎金計算正確
- [ ] 中獎者錢包餘額正確增加
- [ ] 所有交易紀錄完整（可追蹤每一筆進出）
- [ ] 結算過程中的錯誤不會導致部分結算（需要 atomic 處理）
- [ ] USER 自行設計的結算結果查詢 API 可正確回傳個人結果

---

## Phase 8（Step 8）：歷史紀錄與前端完整呈現

### 目標

建立完整的前端介面，包含投注、開獎動畫、歷史紀錄。

### 任務

#### 前端頁面

- **開獎大廳頁面**：
  - 當期倒數計時器（距離下次開獎）
  - 上一期開獎結果（20 個號碼，並標示第 20 個為超級獎號），號碼以視覺化方式呈現（如 bingo 球）
  - 開獎號碼動畫（號碼一個一個跳出或翻牌效果）
  - 快速投注入口

- **投注頁面**：
  - 8x10 號碼盤（1~80），點選選號
  - 玩法切換（1 星 ~ 10 星 / 猜大小 / 猜單雙）
  - 支援基本玩法的 `快選` / `部分快選`
  - 支援超級獎號複選、猜大小雙選、猜單雙雙選
  - 支援 2~50 倍投注與 2~12 期多期投注
  - 已選號碼顯示 + 可取消
  - 投注金額顯示（25 元 × 注數 × 倍數 × 期數）
  - 餘額顯示
  - 投注確認 → 送出

- **我的投注紀錄頁面**：
  - 投注列表（依期數、時間排序）
  - 每筆顯示：期數、玩法、選號、狀態（等待開獎/中獎/未中獎）
  - 中獎的以醒目方式標示
  - 可篩選：全部 / 等待中 / 已中獎 / 未中獎
  - 支援分頁

- **開獎歷史頁面**：
  - 歷史開獎號碼列表
  - 號碼出現頻率統計（熱門號碼 / 冷門號碼）
  - 大小比例統計
  - 單雙比例統計
  - 可選擇查看最近 N 期

- **錢包頁面**：
  - 目前餘額
  - 儲值按鈕（模擬儲值）
  - 交易紀錄明細

#### 後端 API 補充

- 歷史開獎與統計 API 的 route / payload / response 由 USER 自行設計
- 但至少要能支援歷史開獎查詢、號碼頻率統計、大小比例統計、單雙比例統計

### 驗收條件

- [ ] 開獎大廳倒數計時器正確運作
- [ ] 開獎號碼有動畫效果
- [ ] 投注頁面號碼盤可正常點選、取消
- [ ] 不同玩法切換時，選號數量限制正確
- [ ] 投注成功後顯示確認資訊
- [ ] 投注紀錄頁正確顯示所有投注
- [ ] 中獎投注有醒目標示
- [ ] 歷史頁面號碼頻率統計正確
- [ ] 錢包頁面餘額與交易紀錄正確
- [ ] RWD 響應式設計，手機體驗良好
- [ ] 整體 UI 風格一致，有彩券遊戲的氛圍

---

## API / 能力邊界

- 本題所有**本地系統 API path、method、request body、query、response shape、header、error format**，都由 USER 自行設計
- AI 不預先替 USER 設計任何本地 `/api/...` 路徑或 contract
- 但系統能力至少需覆蓋：
  - SportsGameOdds 資料查詢與快取
  - Bingo Bingo 當期資訊、最新結果、指定期數結果、歷史開獎、結算結果查詢
  - Bingo Bingo 投注、統計、錢包 / 帳務能力（若 USER 的設計包含錢包）

---

## D1 Schema 概要

- **draw_rounds**: 開獎紀錄（round_id, draw_time, numbers, super_number, status）
- **投注 / 錢包 / 交易相關資料表**：由 USER 自行設計

---

## 技術提示

1. **Cron Trigger**：Cloudflare Workers 支援 cron trigger，在 `wrangler.toml` 設定即可，不需額外服務
2. **Web Crypto API + 可注入隨機源**：`PROD` 環境使用 `crypto.getRandomValues()` 產生真隨機數；`DEBUG` / local / test 環境必須支援 seeded / mocked 的可控隨機來源，方便驗證與重現問題。不要直接在業務邏輯裡呼叫 `Math.random()`
3. **KV TTL**：`await KV.put(key, value, { expirationTtl: 3600 })` 設定秒數即可自動過期
4. **D1 Transaction**：D1 支援 `db.batch()` 做多條 SQL 的 atomic 執行，結算時務必使用
5. **JSON in D1**：開獎號碼以 JSON string 存入 D1 TEXT column，讀取時 `JSON.parse()`
6. **SportsGameOdds API**：Base URL 為 `https://api.sportsgameodds.com/v2/`，認證用 `X-Api-Key` header。免費 Amateur 方案有 rate limit，務必透過 KV 快取降低呼叫次數。用 `GET /v2/account/usage/` 監控用量
7. **開獎時間同步**：前端倒數計時器用 server 時間校準，避免客戶端時間不準
8. **投注截止**：各期投注截止同時開獎。倒數計時、前端送單限制、後端驗證都要和官方時間一致
9. **Context7**：Cloudflare 官方文件有 Cron Trigger、KV、D1 batch 的最新用法，請善用
10. **超幾何分布**：中獎機率可以用公式算出，可作為前端的「機率顯示」功能（加分項）
