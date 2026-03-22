# Code Monster #7: Cloudflare Full-Stack — Pages + Workers + D1 + R2

> **⚠️ 強烈要求：所有 Cloudflare 資源的建立、設定、部署，一律使用 `wrangler` CLI 操作。**
> 不要透過 Cloudflare Dashboard 手動操作。CLI 指令可重現、可版控、對 AI 輔助開發極為友善。
> 包括但不限於：D1 database 建立、R2 bucket 建立、KV namespace 建立、secret 設定、migration 執行、deploy 等。

## 學習目標

透過建立一個 Cloudflare 全端應用，學習：
- **Cloudflare Pages**：部署 React SPA (是否真的要 SPA，你可以自已決定)，搭配 GitHub 自動發版，一定要配合 GitHub 自動發版喔
- **Cloudflare Workers**：建立 serverless API
- **Cloudflare D1**：使用 SQLite-based 邊緣資料庫
- **Cloudflare R2**：物件儲存（頭像上傳）
- **Mono Repo 架構**：前後端共存同一 repo，各自獨立部署
- **環境管理**：staging / production 雙環境，搭配 `.env` 與 Cloudflare Secrets

## 技術需求

- **Frontend**: React 18+ / TypeScript / Tailwind CSS
- **Backend**: Cloudflare Workers (要不要使用 Hono framework，可以不用，這是一個 simple 網站)
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2
- **Session**: Cloudflare KV（密碼重設 token、OAuth state）
- **部署**: GitHub → Cloudflare（合併就自動觸發，main, staging 自動發佈到對應的，環境）
- **限制**：本階段只使用 Cloudflare 服務，不引入其他 SaaS

---

## 專案結構

```
monster7-member/
├── web-app/                  # React web app (Cloudflare Pages)
│   ├── (詳細架構你們的 AI 自已決定)/
│
├── api/                      # Cloudflare Worker（綁定 D1 / R2 / KV）
│   ├── (詳細架構你們的 AI 自已決定)/
│
├── .gitignore
└── README.md
```

---

## 環境架構

### 雙環境要求

| | Staging | Production |
|---|---|---|
| **Pages URL** | `staging.{project}.pages.dev` | `{project}.pages.dev` 或自訂 domain |
| **Worker URL** | `api-staging.{project}.workers.dev` | `api.{project}.workers.dev` |
| **D1 Database** | `monster7-db-staging` | `monster7-db-production` |
| **R2 Bucket** | `monster7-bucket-staging` | `monster7-bucket-production` |
| **KV Namespace** | `monster7-kv-staging` | `monster7-kv-production` |
| **觸發分支** | `main` | `staging` |

### 環境變數與 Secrets

#### web-app `.env` 檔

```bash
# .env.staging
VITE_API_URL=https://api-staging.{project}.workers.dev
VITE_ENV=staging

# .env.production
VITE_API_URL=https://api.{project}.workers.dev
VITE_ENV=production
```

#### api `wrangler.toml`

(以下是參考，請依你們實際的 naming 來寫, Context7 一定一定有文件)

```toml
name = "monster7-api"
compatibility_date = "2024-12-01"

# ---- Staging ----
[env.staging]
name = "monster7-api-staging"

[[env.staging.d1_databases]]
binding = "DB"
database_name = "monster7-db-staging"
database_id = "<staging-db-id>"

[[env.staging.r2_buckets]]
binding = "BUCKET"
bucket_name = "monster7-bucket-staging"

[[env.staging.kv_namespaces]]
binding = "KV"
id = "<staging-kv-id>"

# ---- Production ----
[env.production]
name = "monster7-api-production"

[[env.production.d1_databases]]
binding = "DB"
database_name = "monster7-db-production"
database_id = "<production-db-id>"

[[env.production.r2_buckets]]
binding = "BUCKET"
bucket_name = "monster7-bucket-production"

[[env.production.kv_namespaces]]
binding = "KV"
id = "<production-kv-id>"
```

#### Cloudflare Secrets（不進 `.env`，透過 CLI 或 Dashboard 設定）

```bash
# 學員需透過 wrangler 設定 secret
wrangler secret put JWT_SECRET --env staging
wrangler secret put JWT_SECRET --env production
wrangler secret put GOOGLE_CLIENT_ID --env staging
wrangler secret put GOOGLE_CLIENT_SECRET --env staging
wrangler secret put GITHUB_CLIENT_ID --env staging
wrangler secret put GITHUB_CLIENT_SECRET --env staging
# production 也要設定對應的 OAuth secrets
```

學員必須理解：
1. `.env` 檔放**非機密**的環境設定（API URL、環境名稱）
2. `wrangler secret` 放**機密資料**（JWT secret、API key）
3. `.dev.vars` 放**本地開發**的 secret（不進 git）
4. `.gitignore` 必須包含 `.dev.vars` 和 `.env.local`

---

## 部署流程

### web-app (Cloudflare Pages)

```
GitHub main branch merge
        ↓
Cloudflare Pages 自動觸發 build
        ↓
Build command: cd web-app && npm run build
        ↓
Output directory: web-app/dist
        ↓
Staging 自動部署完成
```

#### Pages 設定

在 Cloudflare Dashboard 建立 Pages 專案時：
- **Production branch**: `production`
- **Preview branch**: `main`（作為 staging）
- **Build command**: `cd web-app && npm run build`
- **Build output directory**: `web-app/dist`
- **Environment variables**: 在 Dashboard 設定對應的 `VITE_API_URL`

### api (Cloudflare Workers)

Workers 使用 `wrangler deploy` 手動或透過 GitHub Actions 部署：

```bash
# 部署到 staging
cd api && wrangler deploy --env staging

# 部署到 production
cd api && wrangler deploy --env production
```

學員可選擇加入 GitHub Actions 自動化（加分項）。

---

## Phase 1：專案初始化與基礎架構

### 目標

建立 mono repo 骨架，確保雙環境可部署。

### 任務

- 初始化 mono repo，建立 `web-app/` 和 `api/` 兩個獨立 package
- 設定 React + TypeScript + Tailwind CSS
- 建立 Worker API 骨架，含 health check endpoint
- 設定 `wrangler.toml`，配置雙環境的 D1 / R2 binding
- 建立 D1 Database 與 R2 Bucket（staging + production 各一組）
- 連結 GitHub repo 到 Cloudflare Pages，設定自動部署
- 設定 `.gitignore`，確保 `.dev.vars`、`node_modules/`、`dist/` 等不進 git

### 驗收條件

- [ ] mono repo 結構正確：`web-app/` 和 `api/` 兩個獨立 package
- [ ] `web-app` 本地 `npm run dev` 可啟動，顯示 React + Tailwind 頁面
- [ ] `api` 本地 `wrangler dev` 可啟動，`GET /health` 回傳正常
- [ ] D1 staging / production 兩個 database 已建立
- [ ] R2 staging / production 兩個 bucket 已建立
- [ ] wrangler.toml 正確設定雙環境的 D1 / R2 binding
- [ ] `.dev.vars` 已建立且在 `.gitignore` 中
- [ ] push 到 `main` 後，Cloudflare Pages 自動觸發 staging 部署
- [ ] staging 環境可正常訪問 web-app 頁面

---

## Phase 2：D1 Database Schema 與基礎 API

### 目標

建立會員資料庫 schema，搭建 API 基礎架構（路由、CORS、錯誤處理）。

### 任務

- 設計 D1 schema（users table：id, email, password_hash, name, bio, avatar_url, role, is_active, created_at, updated_at）
- 執行 migration 到 staging 環境
- 建立 API 路由架構（模組化拆分：auth / users / admin）
- 設定 CORS：限制只允許對應的 Pages domain 存取 API（staging 允許 staging Pages，production 允許 production Pages）
- 統一 API 錯誤格式：所有錯誤回傳一致的 JSON 結構（含 error code、message）

### 驗收條件

- [ ] D1 schema 已 migrate 到 staging 環境，users table 結構正確
- [ ] API 路由架構模組化，有清楚的拆分
- [ ] CORS 正確設定：只允許對應的 Pages domain，其他 origin 被拒絕
- [ ] 所有 API 錯誤回傳一致的 JSON 格式（含 error code、message）
- [ ] `GET /health` 包含 DB 連線狀態檢查

---

## Phase 3：環境驗證與 Secret 管理

### 目標

確保 staging / production 完全隔離，學員理解 secret 管理。

### 任務

- web-app 在 staging 環境顯示明顯的「STAGING」banner，production 不顯示
- 透過 `wrangler secret` 設定 staging / production 的機密資料
- 驗證環境隔離：staging 寫入的資料不會出現在 production，反之亦然

### 驗收條件

- [ ] staging 與 production 使用不同的 D1 database（資料完全隔離）
- [ ] staging 與 production 使用不同的 R2 bucket
- [ ] staging 環境有明顯的環境標示
- [ ] Cloudflare Secrets 已正確設定（不是寫死在程式碼中）
- [ ] `.dev.vars` 包含本地開發所需的 secret，且不在 git 中
- [ ] 學員能說明 `.env` / `.dev.vars` / `wrangler secret` 三者的差異與用途

---

## KV 用途一覽

| Key Pattern | 用途 | TTL |
|---|---|---|
| `reset:<token>` | 忘記密碼 reset token | 30 分鐘 |
| `oauth_state:<state>` | OAuth CSRF 防護 | 10 分鐘 |

---

## Phase 4：認證 — 註冊、登入、JWT

### 目標

建立帳號密碼認證系統，實作 JWT access/refresh token 機制。使用現成 library 處理密碼雜湊與 JWT，不手刻加密邏輯。

### 任務

- 建立 KV namespace（staging + production），在 wrangler.toml 綁定
- 使用 library 實作密碼雜湊（Workers 環境限 Web Crypto API，可用封裝 PBKDF2 的 library）
- 使用 library 實作 JWT sign/verify，access token 15 分鐘、refresh token 7 天
- 實作密碼強度驗證：至少 8 字元、包含大小寫字母與數字
- 實作 `POST /api/auth/register`：帳號註冊，驗證密碼強度，回傳 access + refresh token
- 實作 `POST /api/auth/login`：帳號登入，驗證密碼，回傳 access + refresh token
- 實作 `POST /api/auth/refresh`：用 refresh token 換發新的 access token
- 實作 auth middleware：驗證 Authorization header 的 JWT，並檢查使用者 is_active 狀態
- 實作 `GET /api/users/me`：回傳當前登入使用者的基本資料

### 驗收條件

- [ ] KV namespace 已建立（staging + production），wrangler.toml 正確綁定
- [ ] 註冊 API 可建立新帳號，密碼以雜湊儲存（使用 library，非手刻）
- [ ] 密碼強度不足時回傳明確的錯誤訊息（至少 8 字元、含大小寫字母與數字）
- [ ] 登入 API 驗證密碼正確後回傳 access + refresh token
- [ ] access token 15 分鐘過期，refresh token 7 天過期
- [ ] refresh API 可用 refresh token 換發新的 access token
- [ ] 登出由前端清除 token，無需後端 blacklist
- [ ] 未帶 token 或 token 無效時，受保護的 API 回傳 401
- [ ] 帳號被停用（is_active = false）時，即使持有有效 token 也回傳 401
- [ ] `GET /api/users/me` 回傳正確的使用者資料

---

## Phase 5：會員功能 — Profile、Avatar、密碼管理

### 目標

完善會員個人功能：Profile 編輯、頭像上傳（R2）、修改密碼、忘記密碼、登入歷史，並建立對應的前端頁面。

### 任務

- D1 migration：新增 login_history table（記錄登入方式、IP、user agent、時間）
- 實作 `PUT /api/users/me`：更新 Profile（name、bio）
- 實作 `POST /api/users/me/avatar`：上傳頭像到 R2，更新 users.avatar_url
- 實作 `PUT /api/users/me/password`：修改密碼（需驗證舊密碼）
- 實作 `POST /api/auth/forgot-password`：產生 reset token 存入 KV（TTL 30 分鐘），response body 回傳 reset link（測試模式，不寄 email）
- 實作 `POST /api/auth/reset-password`：驗證 KV 中的 reset token，重設密碼，用完即刪除 token
- 實作 `GET /api/users/me/login-history`：查詢登入歷史
- 登入成功時寫入 login_history 記錄
- web-app 前端頁面：註冊頁、登入頁、Profile 頁（含頭像上傳）、修改密碼頁、忘記密碼頁
- web-app Token 管理：儲存 token、自動 refresh（access token 過期時自動用 refresh token 換發）、refresh 失敗時導向登入頁

### 驗收條件

- [ ] 可更新 Profile（name、bio），更新後 `GET /api/users/me` 反映變更
- [ ] 可上傳頭像，圖片存入 R2，avatar_url 正確回傳
- [ ] 修改密碼需驗證舊密碼，修改成功後舊密碼無法登入
- [ ] 忘記密碼 API 回傳 reset link，使用 reset link 可重設密碼
- [ ] reset token 使用後失效，30 分鐘後也自動失效
- [ ] 登入歷史正確記錄每次登入的方式、IP、user agent
- [ ] web-app 註冊、登入流程完整可用
- [ ] web-app Profile 頁可編輯資料、上傳頭像
- [ ] web-app token 過期時自動 refresh，refresh 失敗導向登入頁

---

## Phase 6：OAuth 登入 — Google 與 GitHub

### 目標

實作 Google 與 GitHub OAuth 登入，支援帳號連結與解除連結。使用 OAuth library 處理授權流程，不手刻 Authorization Code Flow。

### 任務

- D1 migration：新增 oauth_accounts table（provider、provider_id、provider_email，unique 約束 provider + provider_id）
- 使用 OAuth library（如 `arctic` 或類似）實作 Google / GitHub 登入
- OAuth state 存入 KV（TTL 10 分鐘）防 CSRF
- 帳號連結邏輯：若 provider_id 已存在則登入，若已登入則連結到現有帳號，若都沒有則建立新帳號
- 實作 `GET /api/users/me/oauth-accounts`：列出已連結的 OAuth 帳號
- 實作 `DELETE /api/users/me/oauth-accounts/:provider`：解除 OAuth 連結（需確保至少保留一種登入方式）
- web-app 登入頁加入 Google / GitHub OAuth 按鈕
- web-app OAuth callback 頁面：接收 callback、完成登入流程
- web-app Profile 頁顯示已連結的 OAuth 帳號，支援連結/解除連結

### 驗收條件

- [ ] Google OAuth 登入流程完整可用（redirect → callback → 取得 token）
- [ ] GitHub OAuth 登入流程完整可用
- [ ] OAuth state 存入 KV，callback 時驗證 state 防 CSRF
- [ ] 新使用者透過 OAuth 首次登入時自動建立帳號
- [ ] 已有帳號的使用者可連結 OAuth 帳號
- [ ] 可解除 OAuth 連結，但至少保留一種登入方式（密碼或其他 OAuth）
- [ ] 登入歷史正確記錄 OAuth 登入方式（google / github）
- [ ] web-app OAuth 按鈕點擊後正確跳轉，callback 後回到應用
- [ ] oauth_accounts table 的 unique 約束正確（同一 provider_id 不會重複）

---

## Phase 7：權限管理 — Admin 功能與 Dashboard

### 目標

實作角色權限系統，建立 Admin 管理介面（使用者管理 + Dashboard 數據總覽 + 活動監控）。

### 任務

- 實作 requireRole middleware（檢查 JWT 中的 role 欄位，非 admin 回傳 403）
- 實作 `GET /api/admin/users`：使用者列表（支援分頁）
- 實作 `GET /api/admin/users/:id`：使用者詳情（含 OAuth 連結、登入歷史）
- 實作 `PUT /api/admin/users/:id/role`：變更使用者角色（user ↔ admin）
- 實作 `PUT /api/admin/users/:id/status`：啟用/停用帳號（停用後 auth middleware 的 is_active 檢查會阻擋該使用者）
- 實作 `GET /api/admin/dashboard/stats`：統計數據概覽（總用戶數、今日新註冊數、活躍用戶數（7 天內有登入）、帳號停用數、OAuth 連結比例、最近 24 小時登入次數）
- 實作 `GET /api/admin/dashboard/activity`：全站活動日誌（跨用戶登入紀錄，支援分頁 + 依登入方式、時間範圍篩選）
- web-app Admin 後台獨立 layout：側邊欄導航（Dashboard / 用戶管理 / 活動日誌），與一般用戶頁面視覺區隔
- web-app Admin 路由保護：前端進入 `/admin/*` 時驗證 JWT role，非 admin 導向首頁或 403 頁面
- 建立 seed script：可快速建立初始 admin 帳號（供開發與部署後使用）
- 端對端流程驗證：從註冊 → 登入 → 編輯 Profile → 修改密碼 → OAuth 連結 → Admin 管理 → 登出，完整走一遍
- 更新 README：說明專案架構、環境設定、部署方式、API 文件

#### Admin 後台前端架構

```
web-app/
└── pages/admin/           # Admin 後台（僅 admin 可進入）
    ├── Dashboard          # 數據概覽首頁
    ├── Users              # 用戶管理
    ├── Activity           # 全站活動日誌
    └── Layout             # Admin 共用 layout（側邊欄導航）
```

### 驗收條件

- [ ] requireRole middleware 正確阻擋非 admin 使用者，回傳 403
- [ ] Admin 可查看使用者列表（含分頁）
- [ ] Admin 可查看使用者詳情（含 OAuth 連結狀態、登入歷史）
- [ ] Admin 可變更使用者角色（user → admin、admin → user）
- [ ] Admin 可停用帳號，停用後該使用者無法登入（auth middleware is_active 檢查生效）
- [ ] Admin 可重新啟用已停用的帳號
- [ ] Admin Dashboard 首頁顯示正確的統計數據（用戶數、今日註冊、活躍用戶、停用帳號數、OAuth 連結比例、24 小時登入次數）
- [ ] 全站活動日誌可瀏覽所有用戶的登入紀錄，支援分頁與篩選
- [ ] Admin 後台有獨立 layout（側邊欄導航），與一般用戶頁面明確區隔
- [ ] 非 admin 使用者無法存取 `/admin/*` 路由（前端導向 + API 回傳 403）
- [ ] seed script 可正確建立初始 admin 帳號
- [ ] 端對端流程驗證通過：完整的使用者旅程無錯誤
- [ ] README 完整且清晰，新人可依此設定環境並部署

---

## API Endpoint 總覽

### Auth（公開）

- `POST /api/auth/register` — 註冊
- `POST /api/auth/login` — 登入
- `POST /api/auth/refresh` — 換發 token
- `POST /api/auth/forgot-password` — 忘記密碼
- `POST /api/auth/reset-password` — 重設密碼
- `GET /api/auth/oauth/:provider` — OAuth redirect
- `GET /api/auth/oauth/:provider/callback` — OAuth callback

### User（需登入）

- `GET /api/users/me` — 取得 profile
- `PUT /api/users/me` — 更新 profile
- `PUT /api/users/me/password` — 修改密碼
- `POST /api/users/me/avatar` — 上傳頭像
- `GET /api/users/me/login-history` — 登入歷史
- `GET /api/users/me/oauth-accounts` — OAuth 連結列表
- `DELETE /api/users/me/oauth-accounts/:provider` — 解除 OAuth 連結

### Admin（需登入 + admin 角色）

- `GET /api/admin/users` — 使用者列表
- `GET /api/admin/users/:id` — 使用者詳情
- `PUT /api/admin/users/:id/role` — 變更角色
- `PUT /api/admin/users/:id/status` — 啟停用帳號
- `GET /api/admin/dashboard/stats` — 統計數據概覽
- `GET /api/admin/dashboard/activity` — 全站活動日誌

---

## D1 Schema 概要

- **users**: id, email, password_hash, name, bio, avatar_url, role(user/admin), is_active, created_at, updated_at
- **oauth_accounts**: id, user_id, provider, provider_id, provider_email, created_at — unique(provider, provider_id)
- **login_history**: id, user_id, method(email/google/github), ip_address, user_agent, created_at

---

## 技術提示

1. **Vite**：`VITE_` prefix 的環境變數會自動注入前端
2. **D1 Local Dev**：`wrangler dev` 會自動建立本地 D1，不會影響遠端資料
3. **R2 Local Dev**：本地開發時 R2 會使用 `.wrangler/state` 模擬
4. **CORS**：Worker 需設定 CORS，允許 Pages domain 存取 API
5. **TypeScript**：前後端皆使用 TypeScript，可考慮共用型別定義
6. **Context7**：Cloudflare 官方文件一定有 D1 / R2 / Workers / Pages / KV 的最新用法，請善用
7. **KV TTL**：KV 支援自動過期（TTL），非常適合做 reset token 和 OAuth state，到期後 key 會自動消失，不需手動清理
8. **密碼雜湊**：Workers 環境只支援 Web Crypto API，使用封裝 PBKDF2 的 library 即可，不需手刻加密邏輯
9. **OAuth**：使用 OAuth library（如 `arctic`）處理授權流程，專注理解 OAuth 概念而非手刻實作
10. **忘記密碼測試模式**：因為不做 email 驗證，reset link 直接回傳在 API response body 中，方便測試
