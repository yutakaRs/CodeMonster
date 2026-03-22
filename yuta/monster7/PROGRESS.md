# Monster7 進度追蹤

**專案**: Cloudflare Full-Stack Member System
**GitHub Repo**: https://github.com/yutakaRs/CodeMonster.git
**線上網站**: https://monster7-member.pages.dev
**SPEC**: [spec.md](./spec.md)
**作業原文**: [monster7.md](./monster7.md)

---

## 整體進度

| Phase | 內容 | 狀態 |
|-------|------|------|
| **1** | 專案初始化與基礎架構 | ✅ 完成 |
| **2** | D1 Schema + API 路由架構 + CORS + 統一錯誤格式 | ✅ 完成 |
| **3** | 環境驗證 + Staging banner + Secret 管理 | ✅ 完成 |
| **4** | 認證系統（註冊、登入、JWT、auth middleware） | ✅ 完成 |
| **5** | 會員功能 + 前端頁面（Profile、頭像、密碼、登入歷史） | ✅ 完成 |
| **6** | Google OAuth 登入 + 帳號連結 | ⬜ 未開始 |
| **7** | Admin 後台 + Dashboard + seed script + 端對端驗證 | ⬜ 未開始 |

---

## Phase 1: 專案初始化與基礎架構

### Step 1: Mono Repo 骨架
- [x] T001 建立 `monster7-member/` 根目錄
- [x] T002 建立 `.gitignore`（`.dev.vars`, `.env.local`, `node_modules/`, `dist/`, `.wrangler/`）
- [x] T003 建立 `README.md`

### Step 2: Frontend — React + TypeScript + Tailwind
- [x] T004 初始化 `web-app/`（Vite + React + TypeScript）
- [x] T005 安裝並設定 Tailwind CSS
- [x] T006 建立 `web-app/.env.staging`
- [x] T007 建立 `web-app/.env.production`
- [x] T008 驗證 `web-app` 本地可啟動，build 成功

### Step 3: Backend — Cloudflare Workers
- [x] T009 初始化 `api/`（Worker + TypeScript）
- [x] T010 實作 `GET /health` endpoint
- [x] T011 驗證 `api` 本地 `wrangler dev` 可啟動，`GET /health` 回傳正常

### Step 4: Cloudflare 資源建立（wrangler CLI）
- [x] T012 建立 D1 Database (staging)：`monster7-db-staging` — ID: `18ed7bb5-0683-49d2-805d-55a27246a4b7`
- [x] T013 建立 D1 Database (production)：`monster7-db-production` — ID: `b0b6bec5-bddc-4ca1-9201-5f6fb40e34e6`
- [x] T014 建立 R2 Bucket (staging)：`monster7-bucket-staging`
- [x] T015 建立 R2 Bucket (production)：`monster7-bucket-production`

### Step 5: wrangler.toml 雙環境設定
- [x] T016 設定 `api/wrangler.toml`（staging + production 的 D1/R2 binding）
- [x] T017 驗證 `wrangler dev --env staging` 可啟動 ✅

### Step 6: .dev.vars 本地開發 Secrets
- [x] T018 建立 `api/.dev.vars`（含 `JWT_SECRET`）
- [x] T019 確認 `.dev.vars` 被 `.gitignore` 忽略

### Step 7: GitHub 連結與自動部署
- [x] T020 推送到 GitHub repo
- [x] T021 Cloudflare Pages 建立並連結 GitHub（Build command 已修正為含 `npm install`）
- [x] T022 Push 到 `main`，Pages 自動觸發部署
- [x] T023 ✅ `https://monster7-member.pages.dev` 可正常存取，顯示「Monster7 Member System」

### Phase 1 驗收條件
- [x] mono repo 結構正確：`web-app/` 和 `api/` 兩個獨立 package
- [x] `web-app` 本地 `npm run dev` 可啟動
- [x] `api` 本地 `wrangler dev` 可啟動，`GET /health` 回傳正常
- [x] D1 staging / production 兩個 database 已建立
- [x] R2 staging / production 兩個 bucket 已建立
- [x] `wrangler.toml` 正確設定雙環境的 D1 / R2 binding
- [x] `.dev.vars` 已建立且在 `.gitignore` 中
- [x] push 到 `main` 後，Cloudflare Pages 自動觸發 staging 部署
- [x] staging 環境可正常訪問 web-app 頁面

---

## 待處理事項

- [x] **清理 GitHub repo 歷史**：已用 orphan branch 重建乾淨歷史，移除所有 CMoney/cosima/sonia 舊 commits
- [x] **T017 驗證**：`wrangler dev --env staging` 驗證通過，`GET /health` 回傳正常
- [x] **Phase 2 完成**：D1 Schema、路由模組化、CORS、統一錯誤格式

---

## Phase 2: D1 Schema + API 路由架構 + CORS + 統一錯誤格式

### Step 1: D1 Schema Migration
- [x] T024 建立 `api/migrations/0001_init.sql`（users, oauth_accounts, login_history 三張表）
- [x] T025 wrangler.toml 加入 `migrations_dir` 設定
- [x] T026 本地 migration 執行成功

### Step 2: API 路由模組化
- [x] T027 建立 `src/types.ts`（Env binding 型別定義）
- [x] T028 建立 `src/utils/errors.ts`（統一錯誤格式 `{ error: { code, message } }`）
- [x] T029 建立 `src/routes/auth.ts`（Phase 4 實作，目前 stub）
- [x] T030 建立 `src/routes/users.ts`（Phase 5 實作，目前 stub）
- [x] T031 建立 `src/routes/admin.ts`（Phase 7 實作，目前 stub）
- [x] T032 更新 `src/index.ts`（router 整合路由、CORS、統一 error handling）

### Step 3: CORS Middleware
- [x] T033 建立 `src/middleware/cors.ts`（依 `CORS_ORIGIN` 環境變數驗證 origin）
- [x] T034 wrangler.toml 加入 `CORS_ORIGIN` 與 `ENVIRONMENT` 環境變數
- [x] T035 驗證：正確 origin 帶 CORS header，錯誤 origin 不帶

### Step 4: Health Endpoint 升級
- [x] T036 `GET /health` 加入 DB 連線狀態檢查（`db: "ok"` / `db: "error"`）

### Phase 2 驗收條件
- [x] D1 migration 本地執行成功，三張表已建立
- [x] API 路由模組化：auth / users / admin 三個 route handler
- [x] 統一錯誤格式：所有 404/500 回傳 `{ error: { code, message } }`
- [x] CORS：允許 Pages domain，阻擋其他 origin
- [x] `GET /health` 回傳含 DB 連線狀態

---

## Phase 3: 環境驗證 + Staging Banner + Secret 管理

### Step 1: Staging Banner
- [x] T037 web-app App.tsx 加入 staging banner（`VITE_ENV=staging` 時顯示黃色橫幅）
- [x] T038 驗證 web-app build 成功

### Step 2: Secret 管理
- [x] T039 `wrangler secret put JWT_SECRET --env staging` 設定完成
- [x] T040 `wrangler secret put JWT_SECRET --env production` 設定完成
- [ ] T041 Google OAuth secrets（`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`）→ Phase 6 再設定

### Phase 3 驗收條件
- [x] Staging 環境頁面頂部顯示「STAGING ENVIRONMENT」banner
- [x] Production 環境不顯示 banner
- [x] JWT_SECRET 已透過 wrangler secret 設定到 staging + production
- [x] .dev.vars 本地開發用 secret 不進 git

---

## Phase 4: 認證系統

### Step 1: Password Hashing (PBKDF2)
- [x] T042 建立 `src/utils/crypto.ts`（PBKDF2 via Web Crypto API，100k iterations）

### Step 2: JWT Token
- [x] T043 安裝 `jose` library
- [x] T044 建立 `src/utils/jwt.ts`（access token 15min, refresh token 7days, HS256）

### Step 3: Auth Middleware
- [x] T045 建立 `src/middleware/auth.ts`（JWT 驗證 + is_active 檢查）
- [x] T046 建立 `src/middleware/role.ts`（requireRole middleware）

### Step 4: Auth Routes
- [x] T047 `POST /api/auth/register` — 驗證 email/password 強度 → hash → 寫入 D1 → 發 tokens
- [x] T048 `POST /api/auth/login` — 驗證帳密 → 記錄 login_history → 發 tokens
- [x] T049 `POST /api/auth/refresh` — 驗證 refresh token → 檢查 is_active → 發新 access token

### Phase 4 驗收條件
- [x] 註冊成功回傳 access + refresh token
- [x] 重複 email 回傳 409
- [x] 密碼不符強度回傳 400（含中文錯誤訊息）
- [x] 登入成功回傳 tokens + 記錄 login_history
- [x] 錯誤密碼回傳 401（不洩漏 email 是否存在）
- [x] Refresh token 換發新 access token
- [x] 無效 refresh token 回傳 401

---

## Cloudflare 資源清單

| 資源類型 | 名稱 | 環境 | ID / URL |
|---------|------|------|----------|
| D1 Database | `monster7-db-staging` | Staging | `18ed7bb5-0683-49d2-805d-55a27246a4b7` |
| D1 Database | `monster7-db-production` | Production | `b0b6bec5-bddc-4ca1-9201-5f6fb40e34e6` |
| R2 Bucket | `monster7-bucket-staging` | Staging | — |
| R2 Bucket | `monster7-bucket-production` | Production | — |
| Pages | `monster7-member` | — | `https://monster7-member.pages.dev` |

---

## 重要設定備忘

- **Cloudflare Pages Build command**: `cd yuta/monster7/monster7-member/web-app && npm install && npm run build`
- **Build output directory**: `yuta/monster7/monster7-member/web-app/dist`
- **Production branch**: `main`（之後需建立 `staging` 分支並調整）
- **wrangler login**: 已登入 Cloudflare
- **gh auth**: 已登入 GitHub（SSH key: `id_ed25519_github_yutakaRs`）
- **推送指令**: `GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519_github_yutakaRs" git push origin main`
