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
| **1** | 專案初始化與基礎架構 | 🔧 進行中 |
| **2** | D1 Schema + API 路由架構 + CORS + 統一錯誤格式 | ⬜ 未開始 |
| **3** | 環境驗證 + Staging banner + Secret 管理 | ⬜ 未開始 |
| **4** | 認證系統（註冊、登入、JWT、auth middleware） | ⬜ 未開始 |
| **5** | 會員功能 + 前端頁面（Profile、頭像、密碼、登入歷史） | ⬜ 未開始 |
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
- [ ] T017 驗證 `wrangler dev --env staging` 可啟動 ← **待驗證**

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

- [ ] **清理 GitHub repo 歷史**：目前 git history 還有舊的 CMoney commit 紀錄，需要用 orphan branch 重建乾淨歷史
- [ ] **T017 驗證**：`wrangler dev --env staging` 尚未正式驗證
- [ ] **開始 Phase 2**：D1 Schema 設計、API 路由架構、CORS、統一錯誤格式

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
