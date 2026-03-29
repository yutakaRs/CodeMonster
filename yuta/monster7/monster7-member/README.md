# Monster7 Member System

Cloudflare 全端會員管理系統 — Pages + Workers + D1 + R2 + KV

## 線上環境

| 環境 | Web App | API |
|------|---------|-----|
| Staging | https://monster7-member.pages.dev | https://monster7-api-staging.changchiahao0225.workers.dev |
| Production | https://monster7-member.pages.dev (production branch) | https://monster7-api-production.changchiahao0225.workers.dev |

## 技術棧

- **Frontend**: React 18 + TypeScript + Tailwind CSS (Vite)
- **Backend**: Cloudflare Workers + TypeScript
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (頭像上傳)
- **Session**: Cloudflare KV (reset token / OAuth state)
- **Auth**: JWT (jose) + PBKDF2 (Web Crypto API)
- **OAuth**: Google OAuth via arctic library

## 專案結構

```
monster7-member/
├── web-app/                     # React SPA (Cloudflare Pages)
│   ├── src/
│   │   ├── lib/                 # API client, Auth context
│   │   ├── pages/
│   │   │   ├── auth/            # 登入、註冊、忘記密碼、OAuth callback
│   │   │   ├── profile/         # Profile、修改密碼、登入歷史
│   │   │   └── admin/           # Dashboard、用戶管理、活動日誌
│   │   └── App.tsx              # Router + Layout
│   ├── .env.staging
│   └── .env.production
│
├── api/                         # Cloudflare Worker
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts          # 註冊、登入、refresh、OAuth、忘記/重設密碼
│   │   │   ├── users.ts         # Profile CRUD、頭像、密碼、登入歷史、OAuth 管理
│   │   │   └── admin.ts         # 用戶管理、Dashboard 統計、活動日誌
│   │   ├── middleware/
│   │   │   ├── auth.ts          # JWT 驗證 + is_active 檢查
│   │   │   ├── cors.ts          # CORS (依環境限制 origin)
│   │   │   └── role.ts          # requireRole middleware
│   │   ├── utils/
│   │   │   ├── crypto.ts        # PBKDF2 密碼雜湊
│   │   │   ├── errors.ts        # 統一錯誤格式
│   │   │   └── jwt.ts           # JWT token 管理
│   │   ├── types.ts             # Env binding 型別
│   │   └── index.ts             # Worker entry + router
│   ├── migrations/
│   │   └── 0001_init.sql        # D1 Schema
│   ├── scripts/
│   │   └── seed.ts              # Admin 帳號 seed script
│   ├── wrangler.toml
│   └── .dev.vars                # 本地開發 secrets (gitignored)
│
├── .gitignore
└── README.md
```

## 環境設定 (新人指南)

### 前置需求

- Node.js 18+
- Cloudflare 帳號 + `wrangler` CLI (`npm install -g wrangler`)
- `wrangler login` 登入 Cloudflare

### 1. Clone & Install

```bash
git clone git@github.com:yutakaRs/CodeMonster.git
cd yuta/monster7/monster7-member

# 安裝前後端依賴
cd api && npm install && cd ..
cd web-app && npm install && cd ..
```

### 2. 建立本地開發 Secrets

```bash
# api/.dev.vars (不進 git)
cat > api/.dev.vars << 'EOF'
JWT_SECRET=your-local-dev-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
EOF
```

### 3. 執行 D1 Migration (本地)

```bash
cd api
npx wrangler d1 migrations apply DB --local --env staging
```

### 4. Seed Admin 帳號 (本地)

```bash
npx tsx scripts/seed.ts
# Email: admin@monster7.dev / Password: Admin123
```

### 5. 啟動本地開發

```bash
# Terminal 1: API (port 8789)
cd api && npx wrangler dev --env staging --port 8789

# Terminal 2: Web App (port 5173)
cd web-app && npm run dev
```

打開 http://localhost:5173 即可使用。

## 部署

### 部署架構

```
main branch → Cloudflare Pages 自動 build → Staging 環境
            → GitHub Actions 自動 deploy → Staging Worker
staging branch → Cloudflare Pages 自動 build → Production 環境
              → GitHub Actions 自動 deploy → Production Worker
```

### GitHub Actions 自動部署 Workers

推送到 `main` 或 `staging` 時，若 `api/` 有變更，GitHub Actions 會自動部署對應環境的 Worker。

需在 GitHub repo Settings → Secrets 設定：
- `CLOUDFLARE_API_TOKEN`：Cloudflare API Token（需有 Workers 編輯權限）

### 部署 Worker

```bash
cd api

# Deploy to staging
npx wrangler deploy --env staging

# Deploy to production
npx wrangler deploy --env production
```

### Remote D1 Migration

```bash
cd api

# Staging
npx wrangler d1 migrations apply DB --env staging --remote

# Production
npx wrangler d1 migrations apply DB --env production --remote
```

### Seed Admin (Remote)

```bash
npx tsx scripts/seed.ts --env staging --remote
npx tsx scripts/seed.ts --env production --remote
```

### Cloudflare Secrets

```bash
# 每個環境需設定：
wrangler secret put JWT_SECRET --env staging
wrangler secret put GOOGLE_CLIENT_ID --env staging
wrangler secret put GOOGLE_CLIENT_SECRET --env staging

wrangler secret put JWT_SECRET --env production
wrangler secret put GOOGLE_CLIENT_ID --env production
wrangler secret put GOOGLE_CLIENT_SECRET --env production
```

## Cloudflare 資源

| 資源 | Staging | Production |
|------|---------|------------|
| D1 Database | `monster7-db-staging` | `monster7-db-production` |
| R2 Bucket | `monster7-bucket-staging` | `monster7-bucket-production` |
| KV Namespace | `staging-KV` | `production-KV` |
| Worker | `monster7-api-staging` | `monster7-api-production` |
| Pages | `monster7-member` | `monster7-member` |

## Secret 管理模型

| 類型 | 用途 | 範例 |
|------|------|------|
| `.env.staging` / `.env.production` | 非機密環境設定 | `VITE_API_URL`, `VITE_ENV` |
| `wrangler secret` | 機密資料 (遠端) | `JWT_SECRET`, OAuth credentials |
| `.dev.vars` | 本地開發 secret (gitignored) | 同上，但僅限本地 |

## API 文件

### Auth (公開)

| Method | Path | 說明 |
|--------|------|------|
| `POST` | `/api/auth/register` | 註冊 (email + password + name) |
| `POST` | `/api/auth/login` | 登入 → access + refresh token |
| `POST` | `/api/auth/refresh` | 用 refresh token 換發 access token |
| `POST` | `/api/auth/forgot-password` | 產生 reset link (測試模式回傳在 body) |
| `POST` | `/api/auth/reset-password` | 用 reset token 重設密碼 |
| `GET` | `/api/auth/oauth/google` | Google OAuth redirect |
| `GET` | `/api/auth/oauth/google/callback` | Google OAuth callback |
| `GET` | `/health` | Health check (含 DB 狀態) |

### User (需登入)

| Method | Path | 說明 |
|--------|------|------|
| `GET` | `/api/users/me` | 取得 Profile |
| `PUT` | `/api/users/me` | 更新 name / bio |
| `PUT` | `/api/users/me/password` | 修改密碼 (需舊密碼) |
| `POST` | `/api/users/me/avatar` | 上傳頭像 (multipart, 5MB limit) |
| `GET` | `/api/users/me/login-history` | 登入歷史 |
| `GET` | `/api/users/me/oauth-accounts` | OAuth 連結列表 |
| `DELETE` | `/api/users/me/oauth-accounts/:provider` | 解除 OAuth 連結 |

### Admin (需登入 + admin 角色)

| Method | Path | 說明 |
|--------|------|------|
| `GET` | `/api/admin/users` | 用戶列表 (分頁: ?page=1&limit=20) |
| `GET` | `/api/admin/users/:id` | 用戶詳情 (含 OAuth + 登入歷史) |
| `PUT` | `/api/admin/users/:id/role` | 變更角色 `{"role":"admin"}` |
| `PUT` | `/api/admin/users/:id/status` | 啟停用 `{"is_active":true}` |
| `GET` | `/api/admin/dashboard/stats` | 統計概覽 (6 項指標) |
| `GET` | `/api/admin/dashboard/activity` | 全站活動日誌 (?method=email&page=1) |

### 錯誤格式

所有 API 錯誤回傳統一格式：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

### Token 規格

| Token | 有效期 | 用途 |
|-------|--------|------|
| Access Token | 15 分鐘 | API 請求認證 (Bearer) |
| Refresh Token | 7 天 | 換發新 Access Token |
| Reset Token (KV) | 30 分鐘 | 密碼重設 (單次使用) |
| OAuth State (KV) | 10 分鐘 | CSRF 防護 |

## D1 Schema

### users
| Column | Type | 說明 |
|--------|------|------|
| id | TEXT PK | UUID |
| email | TEXT UNIQUE | 登入 email |
| password_hash | TEXT (nullable) | PBKDF2 雜湊 |
| name | TEXT | 顯示名稱 |
| bio | TEXT | 個人簡介 |
| avatar_url | TEXT | R2 頭像路徑 |
| role | TEXT | 'user' / 'admin' |
| is_active | INTEGER | 1=啟用, 0=停用 |
| created_at | TEXT | ISO 8601 |
| updated_at | TEXT | ISO 8601 |

### oauth_accounts
| Column | Type | 說明 |
|--------|------|------|
| id | TEXT PK | UUID |
| user_id | TEXT FK | → users.id |
| provider | TEXT | 'google' |
| provider_id | TEXT | Google user ID |
| provider_email | TEXT | Google email |
| created_at | TEXT | ISO 8601 |

UNIQUE(provider, provider_id)

### login_history
| Column | Type | 說明 |
|--------|------|------|
| id | TEXT PK | UUID |
| user_id | TEXT FK | → users.id |
| method | TEXT | 'email' / 'google' |
| ip_address | TEXT | 登入 IP |
| user_agent | TEXT | 瀏覽器 UA |
| created_at | TEXT | ISO 8601 |

## 共用型別 (Shared Types)

前後端共用的 TypeScript 型別定義位於 `shared/types.ts`，避免重複定義：

- `User`, `UserDetail`, `UserListItem` — 使用者資料
- `LoginRecord`, `OAuthAccount` — 登入歷史、OAuth 帳號
- `Pagination` — 分頁
- `DashboardStats`, `ActivityRecord` — Admin Dashboard
- `ApiError`, `AuthTokens` — API 回應格式

## 自訂 Domain (Optional)

若要為 Production 設定自訂 domain：

1. Cloudflare Dashboard → Pages → `monster7-member` → Custom domains → Add
2. 輸入自訂 domain（如 `member.yourdomain.com`）
3. 更新 `api/wrangler.toml` 中 production 的 `CORS_ORIGIN` 為新 domain
4. 重新部署 Worker：`cd api && wrangler deploy --env production`
