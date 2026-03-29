# Tasks: Monster7 Cloudflare Full-Stack Member System — Phase 1

**Input**: `yuta/monster7/spec.md`
**Scope**: Phase 1 — 專案初始化與基礎架構
**Goal**: 建立 mono repo 骨架，確保雙環境可部署

---

## Phase 1: Setup (Project Initialization)

**Purpose**: 建立 `monster7-member/` mono repo 骨架，初始化前端 (React + TypeScript + Tailwind) 與後端 (Cloudflare Workers)，建立 D1/R2 資源，連結 GitHub 自動部署，確認 staging 環境可正常存取。

### Step 1: Mono Repo 骨架

- [ ] T001 建立 `yuta/monster7/monster7-member/` 根目錄
- [ ] T002 建立 `.gitignore` in `monster7-member/.gitignore`，包含：`.dev.vars`, `.env.local`, `node_modules/`, `dist/`, `.wrangler/`
- [ ] T003 建立 `README.md` in `monster7-member/README.md`，含專案名稱與基本說明（Phase 7 再完善內容）

### Step 2: Frontend — React + TypeScript + Tailwind

- [ ] T004 初始化 `web-app/` — 使用 Vite 建立 React + TypeScript 專案：`npm create vite@latest web-app -- --template react-ts`
- [ ] T005 安裝並設定 Tailwind CSS in `web-app/`：`npm install -D tailwindcss @tailwindcss/vite`，設定 `tailwind.config.js` 與 `vite.config.ts`
- [ ] T006 建立 `web-app/.env.staging`，內容：`VITE_API_URL=https://api-staging.monster7-member.workers.dev` 和 `VITE_ENV=staging`
- [ ] T007 建立 `web-app/.env.production`，內容：`VITE_API_URL=https://api.monster7-member.workers.dev` 和 `VITE_ENV=production`
- [ ] T008 驗證 `web-app` 本地可啟動：`cd web-app && npm run dev`，瀏覽器顯示 React + Tailwind 頁面

### Step 3: Backend — Cloudflare Workers

- [ ] T009 初始化 `api/` — 建立 Worker 專案：`npm create cloudflare@latest api -- --type worker --lang ts`（或手動建立 `api/` 含 `package.json`, `tsconfig.json`, `src/index.ts`）
- [ ] T010 實作 `GET /health` endpoint in `api/src/index.ts`，回傳 `{ "status": "ok", "timestamp": "..." }`
- [ ] T011 驗證 `api` 本地可啟動：`cd api && wrangler dev`，`GET /health` 回傳正常

### Step 4: Cloudflare 資源建立（wrangler CLI）

- [ ] T012 建立 D1 Database (staging)：`wrangler d1 create monster7-db-staging`，記錄 database_id
- [ ] T013 建立 D1 Database (production)：`wrangler d1 create monster7-db-production`，記錄 database_id
- [ ] T014 [P] 建立 R2 Bucket (staging)：`wrangler r2 bucket create monster7-bucket-staging`
- [ ] T015 [P] 建立 R2 Bucket (production)：`wrangler r2 bucket create monster7-bucket-production`

### Step 5: wrangler.toml 雙環境設定

- [ ] T016 設定 `api/wrangler.toml`，包含：
  - `name = "monster7-api"`
  - `compatibility_date`（最新日期）
  - `[env.staging]` — D1 binding `DB`、R2 binding `BUCKET`（使用 T012 的 database_id）
  - `[env.production]` — D1 binding `DB`、R2 binding `BUCKET`（使用 T013 的 database_id）
- [ ] T017 驗證 wrangler.toml 正確：`cd api && wrangler dev --env staging` 可啟動，`GET /health` 回傳正常

### Step 6: .dev.vars 本地開發 Secrets

- [ ] T018 建立 `api/.dev.vars`，內容包含 `JWT_SECRET=local-dev-secret-change-me`（本地開發用）
- [ ] T019 確認 `api/.dev.vars` 已被 `.gitignore` 忽略（不會進 git）

### Step 7: GitHub 連結與自動部署

- [ ] T020 將 `monster7-member/` 推送到 GitHub repo `https://github.com/yutakaRs/CodeMonster.git`
- [ ] T021 在 Cloudflare Dashboard 建立 Pages 專案，連結 GitHub repo，設定：
  - Build command: `cd web-app && npm run build`
  - Build output directory: `web-app/dist`
  - 設定環境變數 `VITE_API_URL` 與 `VITE_ENV`（staging / production 各一組）
- [ ] T022 Push 到 `main` 分支，確認 Cloudflare Pages 自動觸發 staging 部署
- [ ] T023 驗證 staging 環境可正常存取 web-app 頁面（透過 `staging.{project}.pages.dev`）

---

## Phase 1 驗收條件 Checklist

- [ ] mono repo 結構正確：`web-app/` 和 `api/` 兩個獨立 package
- [ ] `web-app` 本地 `npm run dev` 可啟動，顯示 React + Tailwind 頁面
- [ ] `api` 本地 `wrangler dev` 可啟動，`GET /health` 回傳正常
- [ ] D1 staging / production 兩個 database 已建立
- [ ] R2 staging / production 兩個 bucket 已建立
- [ ] `wrangler.toml` 正確設定雙環境的 D1 / R2 binding
- [ ] `.dev.vars` 已建立且在 `.gitignore` 中
- [ ] push 到 `main` 後，Cloudflare Pages 自動觸發 staging 部署
- [ ] staging 環境可正常訪問 web-app 頁面

---

## Dependencies

```
T001 → T002, T003 (根目錄先建立)
T004 → T005 → T006, T007 → T008 (前端依序)
T009 → T010 → T011 (後端依序)
T012, T013, T014, T015 可平行執行 (獨立 Cloudflare 資源)
T016 依賴 T012, T013 (需要 database_id)
T017 依賴 T016
T018, T019 可與 Step 4-5 平行
T020 依賴 T001-T019 全部完成
T021 依賴 T020
T022 依賴 T021
T023 依賴 T022
```

---

## Notes

- 所有 Cloudflare 資源建立使用 `wrangler` CLI，不用 Dashboard（唯一例外：Pages 專案連結 GitHub 與設定環境變數需在 Dashboard 操作）
- KV namespace 在 Phase 4 才需要建立，Phase 1 不處理
- `.env.staging` / `.env.production` 中的 `{project}` 需替換為實際的 Cloudflare Pages 專案名稱
- `wrangler.toml` 中的 `database_id` 需替換為 `wrangler d1 create` 回傳的實際 ID
