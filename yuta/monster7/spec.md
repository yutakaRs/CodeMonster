# Feature Specification: Cloudflare Full-Stack Member System

**Feature Branch**: `yuta/monster7`
**Created**: 2026-03-21
**Status**: Draft
**Input**: monster7.md — "Cloudflare Full-Stack — Pages + Workers + D1 + R2"

---

## Overview

建立一個完整的 Cloudflare 全端會員管理系統，採用 Mono Repo 架構，前端使用 React SPA 部署到 Cloudflare Pages，後端使用 Cloudflare Workers 提供 RESTful API，資料層使用 D1 (SQLite)、R2 (物件儲存)、KV (短期 token 儲存)。系統包含帳號密碼認證、OAuth 社群登入、會員 Profile 管理、Admin 後台管理，並實作 staging / production 雙環境完全隔離部署。

**核心限制**：所有 Cloudflare 資源的建立、設定、部署，一律使用 `wrangler` CLI 操作，不透過 Dashboard 手動操作。

---

## Clarifications

### Session 2026-03-21

- Q: 前端是否使用 SPA？ → A: 由開發者決定，但預設以 React SPA 為主。
- Q: 後端是否使用 Hono framework？ → A: 可以不用，因為這是 simple 網站，原生 Workers routing 即可，但若開發者偏好 Hono 也可採用。
- Q: 忘記密碼是否寄 email？ → A: 不做 email 發送，reset link 直接回傳在 API response body 中（測試模式）。
- Q: 登出機制？ → A: 由前端清除 token，無需後端 blacklist。
- Q: OAuth provider 有哪些？ → A: 僅 Google（GitHub OAuth 後來確認不需要實作）。
- Q: 部署觸發分支規則？ → A: `main` → staging, `staging` → production。（依作業環境表格第 56 行）

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — 新使用者註冊 (Priority: P1)

一位新使用者打開網站，點擊「註冊」進入註冊頁面。輸入 email、密碼（至少 8 字元、含大小寫字母與數字）、姓名後送出。系統驗證密碼強度，建立帳號，密碼以 PBKDF2 雜湊儲存至 D1，回傳 access token (15 分鐘) 與 refresh token (7 天)。使用者自動登入並導向 Profile 頁面。

**Why this priority**: 註冊是系統的入口，沒有帳號就無法使用任何功能。

**Independent Test**: 可獨立測試——填入有效/無效資料，驗證帳號建立與 token 發放流程。

**Acceptance Scenarios**:

1. **Given** 使用者在註冊頁面，**When** 輸入有效 email、符合強度要求的密碼、姓名並送出，**Then** 帳號建立成功，回傳 access + refresh token，自動導向 Profile 頁。
2. **Given** 使用者在註冊頁面，**When** 輸入的密碼少於 8 字元，**Then** 顯示明確錯誤訊息「密碼至少 8 字元」。
3. **Given** 使用者在註冊頁面，**When** 輸入的密碼不含大寫字母或數字，**Then** 顯示明確錯誤訊息說明密碼需包含大小寫字母與數字。
4. **Given** 使用者在註冊頁面，**When** 輸入已存在的 email，**Then** 回傳 409 Conflict 錯誤，顯示「此 email 已被註冊」。
5. **Given** 註冊成功，**When** 檢查 D1 users table，**Then** password_hash 欄位儲存的是雜湊值而非明文密碼。

---

### User Story 2 — 使用者登入 (Priority: P1)

已註冊的使用者在登入頁面輸入 email 與密碼，送出後系統驗證帳號密碼。成功則回傳 access + refresh token 並導向 Profile 頁；失敗則顯示錯誤訊息。登入成功時同時寫入 login_history 記錄。

**Why this priority**: 登入是存取所有受保護功能的唯一入口。

**Independent Test**: 可獨立測試——使用有效/無效憑證進行登入，驗證 token 發放與錯誤處理。

**Acceptance Scenarios**:

1. **Given** 使用者在登入頁面，**When** 輸入正確的 email 與密碼，**Then** 回傳 access + refresh token，導向 Profile 頁。
2. **Given** 使用者在登入頁面，**When** 輸入錯誤的密碼，**Then** 回傳 401 Unauthorized，顯示「帳號或密碼錯誤」。
3. **Given** 使用者在登入頁面，**When** 輸入不存在的 email，**Then** 回傳 401 Unauthorized，顯示「帳號或密碼錯誤」（不洩漏 email 是否存在）。
4. **Given** 帳號已被 admin 停用 (is_active = false)，**When** 使用者嘗試登入，**Then** 回傳 401，顯示「帳號已被停用」。
5. **Given** 登入成功，**When** 查詢 login_history table，**Then** 包含一筆記錄，含登入方式 (email)、IP、user agent、時間戳。

---

### User Story 3 — Token 自動更新與登出 (Priority: P1)

使用者在使用應用時，前端攜帶 access token 呼叫 API。當 access token 過期 (15 分鐘) 時，前端自動使用 refresh token 向後端換發新的 access token，使用者無感知。若 refresh token 也過期 (7 天) 或無效，則導向登入頁。使用者點擊登出時，前端清除所有 token。

**Why this priority**: Token 管理是認證系統的核心機制，影響所有受保護的 API 呼叫。

**Independent Test**: 可透過模擬 token 過期場景測試自動更新行為。

**Acceptance Scenarios**:

1. **Given** 使用者持有有效的 access token，**When** 呼叫受保護的 API，**Then** 正常回傳資料。
2. **Given** access token 已過期但 refresh token 有效，**When** 呼叫受保護的 API，**Then** 前端自動用 refresh token 換發新的 access token，重試原始請求，使用者無感知。
3. **Given** refresh token 也已過期或無效，**When** 前端嘗試換發，**Then** 換發失敗，使用者被導向登入頁。
4. **Given** 未攜帶 token 或 token 無效，**When** 呼叫受保護的 API，**Then** 回傳 401 Unauthorized。
5. **Given** 使用者點擊「登出」，**When** 登出流程執行，**Then** 前端清除所有儲存的 token，導向登入頁。

---

### User Story 4 — 編輯 Profile (Priority: P2)

登入的使用者進入 Profile 頁面，可以看到自己的 email（唯讀）、姓名、個人簡介 (bio)、頭像。使用者可以編輯姓名和 bio 並儲存；也可以上傳新頭像，圖片儲存至 R2，avatar_url 更新至 D1。

**Why this priority**: Profile 是會員系統的核心功能，使用者需要管理自己的資料。

**Independent Test**: 可獨立測試——登入後編輯 Profile 資料、上傳頭像，驗證儲存與顯示。

**Acceptance Scenarios**:

1. **Given** 使用者已登入並進入 Profile 頁，**When** 頁面載入，**Then** 顯示目前的 email、姓名、bio、頭像。
2. **Given** 使用者在 Profile 頁，**When** 修改姓名和 bio 並點擊儲存，**Then** `PUT /api/users/me` 更新成功，頁面反映最新資料。
3. **Given** 使用者在 Profile 頁，**When** 選擇圖片檔案上傳頭像，**Then** 圖片儲存至 R2 bucket，users.avatar_url 更新，頁面顯示新頭像。
4. **Given** 使用者上傳頭像，**When** 上傳完成後呼叫 `GET /api/users/me`，**Then** avatar_url 指向 R2 中的正確路徑。

---

### User Story 5 — 修改密碼 (Priority: P2)

使用者在設定頁面輸入舊密碼和新密碼來修改密碼。系統驗證舊密碼正確後，將新密碼雜湊儲存。修改成功後，舊密碼無法再登入。

**Why this priority**: 密碼管理是帳號安全的基本需求。

**Independent Test**: 可獨立測試——修改密碼後，用舊密碼登入應失敗，用新密碼應成功。

**Acceptance Scenarios**:

1. **Given** 使用者在修改密碼頁，**When** 輸入正確的舊密碼與符合強度要求的新密碼，**Then** 密碼修改成功。
2. **Given** 使用者在修改密碼頁，**When** 輸入錯誤的舊密碼，**Then** 回傳 400 或 401，顯示「舊密碼錯誤」。
3. **Given** 使用者在修改密碼頁，**When** 新密碼不符合強度要求，**Then** 顯示密碼強度不足的錯誤訊息。
4. **Given** 密碼修改成功，**When** 使用舊密碼嘗試登入，**Then** 登入失敗。
5. **Given** 密碼修改成功，**When** 使用新密碼嘗試登入，**Then** 登入成功。

---

### User Story 6 — 忘記密碼 (Priority: P2)

使用者在登入頁點擊「忘記密碼」，輸入 email 後送出。系統產生一組 reset token 存入 KV（TTL 30 分鐘），並在 API response body 中回傳 reset link（測試模式，不寄 email）。使用者透過 reset link 進入重設密碼頁，輸入新密碼後完成重設。Token 使用後立即失效。

**Why this priority**: 忘記密碼是帳號復原的必要功能。

**Independent Test**: 可獨立測試——呼叫忘記密碼 API 取得 reset link，使用 link 重設密碼，驗證 token 過期與單次使用。

**Acceptance Scenarios**:

1. **Given** 使用者在忘記密碼頁，**When** 輸入已註冊的 email，**Then** API 回傳包含 reset token 的 reset link。
2. **Given** 使用者取得 reset link，**When** 在 30 分鐘內使用 link 並輸入新密碼，**Then** 密碼重設成功，可用新密碼登入。
3. **Given** 使用者取得 reset link，**When** 超過 30 分鐘後使用 link，**Then** reset token 已從 KV 過期，回傳錯誤。
4. **Given** 使用者已使用過 reset link 重設密碼，**When** 再次使用同一 link，**Then** token 已被刪除，回傳錯誤「連結已失效」。
5. **Given** 使用者輸入未註冊的 email，**When** 呼叫忘記密碼 API，**Then** 回傳相同的成功訊息（不洩漏 email 是否存在）。

---

### User Story 7 — Google OAuth 登入 (Priority: P3)

使用者在登入頁點擊「使用 Google 登入」按鈕。系統產生 OAuth state 存入 KV（TTL 10 分鐘），導向 Google 授權頁面。使用者授權後被導回 callback URL，系統驗證 state 防 CSRF、取得使用者資訊。若 provider_id 已存在則直接登入；若使用者已登入則連結到現有帳號；若都沒有則自動建立新帳號。

**Why this priority**: OAuth 社群登入降低註冊門檻，但依賴基礎認證系統。

**Independent Test**: 可端對端測試——點擊 OAuth 按鈕 → 授權 → callback → 取得 token。

**Acceptance Scenarios**:

1. **Given** 使用者在登入頁，**When** 點擊「使用 Google 登入」，**Then** 被導向 Google 授權頁，URL 中包含正確的 client_id、redirect_uri、state。
2. **Given** 使用者授權後 Google 導回 callback，**When** 系統驗證 state 與 KV 中儲存的一致，**Then** 驗證通過，繼續取得使用者資訊。
3. **Given** callback 收到的 state 與 KV 中不一致或已過期，**When** 系統驗證 state，**Then** 回傳 400 錯誤「Invalid state」。
4. **Given** 此 Google provider_id 未曾登入過，**When** 完成 OAuth 流程，**Then** 自動建立新帳號，建立 oauth_accounts 記錄，回傳 token。
5. **Given** 此 Google provider_id 已連結到某帳號，**When** 完成 OAuth 流程，**Then** 直接登入該帳號，回傳 token。
6. **Given** 使用者已登入且在 Profile 頁觸發 Google 連結，**When** 完成 OAuth 流程，**Then** 將此 Google 帳號連結到目前登入的帳號。

---

### User Story 8 — 管理 OAuth 連結 (Priority: P3)

使用者在 Profile 頁面可以看到目前已連結的 OAuth 帳號列表。可以連結新的 OAuth provider，也可以解除已連結的 OAuth。但系統確保至少保留一種登入方式（密碼或至少一個 OAuth 連結）。

**Why this priority**: OAuth 帳號管理是完善會員功能的一部分。

**Independent Test**: 可獨立測試——連結/解除連結 OAuth，驗證最少保留一種登入方式的限制。

**Acceptance Scenarios**:

1. **Given** 使用者在 Profile 頁，**When** 頁面載入，**Then** 顯示已連結的 OAuth 帳號列表（provider 名稱、provider email）。
2. **Given** 使用者有密碼且已連結 Google，**When** 解除 Google 連結，**Then** 解除成功，因為還有密碼可登入。
3. **Given** 使用者僅有 Google OAuth 登入（無密碼），**When** 嘗試解除 Google 連結，**Then** 回傳錯誤「需至少保留一種登入方式」。
---

### User Story 9 — Admin 使用者管理 (Priority: P4)

Admin 登入後可進入 Admin 後台，看到獨立的 layout（側邊欄導航）。在「用戶管理」頁面，Admin 可以瀏覽所有使用者列表（分頁），查看使用者詳情（含 OAuth 連結、登入歷史），變更使用者角色（user ↔ admin），以及啟用/停用帳號。

**Why this priority**: Admin 功能是系統管理的最後一環，依賴所有基礎功能。

**Independent Test**: 可獨立測試——以 admin 帳號登入，執行各項管理操作。

**Acceptance Scenarios**:

1. **Given** admin 使用者已登入，**When** 進入 `/admin` 路由，**Then** 顯示 Admin 後台，含側邊欄導航（Dashboard / 用戶管理 / 活動日誌）。
2. **Given** 非 admin 使用者已登入，**When** 嘗試進入 `/admin` 路由，**Then** 前端導向首頁或 403 頁面；API 回傳 403 Forbidden。
3. **Given** admin 在用戶管理頁，**When** 頁面載入，**Then** 顯示使用者列表（含分頁），每項顯示 email、姓名、角色、狀態。
4. **Given** admin 點擊某使用者，**When** 進入使用者詳情頁，**Then** 顯示完整資料，包含 OAuth 連結狀態與登入歷史。
5. **Given** admin 在使用者詳情頁，**When** 將 user 角色變更為 admin，**Then** 角色更新成功，`PUT /api/admin/users/:id/role` 回傳 200。
6. **Given** admin 停用某帳號，**When** 該使用者嘗試登入或呼叫 API，**Then** 回傳 401，auth middleware 的 is_active 檢查生效。
7. **Given** admin 重新啟用已停用的帳號，**When** 該使用者嘗試登入，**Then** 登入成功。

---

### User Story 10 — Admin Dashboard 統計與活動日誌 (Priority: P4)

Admin 在 Dashboard 首頁可以看到統計數據概覽：總用戶數、今日新註冊數、活躍用戶數（7 天內有登入）、帳號停用數、OAuth 連結比例、最近 24 小時登入次數。在「活動日誌」頁面，Admin 可以瀏覽全站所有使用者的登入紀錄，支援分頁與依登入方式、時間範圍篩選。

**Why this priority**: Dashboard 統計是 Admin 管理功能的輔助工具。

**Independent Test**: 可獨立測試——建立測試資料後驗證統計數據正確性。

**Acceptance Scenarios**:

1. **Given** admin 在 Dashboard 首頁，**When** 頁面載入，**Then** 顯示正確的統計數據（總用戶數、今日註冊、活躍用戶、停用帳號數、OAuth 連結比例、24 小時登入次數）。
2. **Given** admin 在活動日誌頁，**When** 頁面載入，**Then** 顯示所有使用者的登入紀錄列表，支援分頁。
3. **Given** admin 在活動日誌頁，**When** 依「登入方式」篩選（如只看 google），**Then** 只顯示 Google OAuth 登入的紀錄。
4. **Given** admin 在活動日誌頁，**When** 依「時間範圍」篩選，**Then** 只顯示指定時間範圍內的紀錄。

---

### User Story 11 — Staging 環境標示與隔離 (Priority: P2)

在 staging 環境下，網站頂部顯示明顯的「STAGING」banner，production 環境不顯示。兩個環境使用完全獨立的 D1 database、R2 bucket、KV namespace，資料完全隔離。

**Why this priority**: 環境隔離是部署安全的基本要求。

**Independent Test**: 可獨立測試——在 staging 寫入資料，確認 production 不會看到；反之亦然。

**Acceptance Scenarios**:

1. **Given** 使用者存取 staging 環境，**When** 頁面載入，**Then** 頂部顯示明顯的「STAGING」banner。
2. **Given** 使用者存取 production 環境，**When** 頁面載入，**Then** 沒有 staging banner。
3. **Given** 在 staging 環境註冊一個帳號，**When** 查詢 production 環境的 D1 database，**Then** 該帳號不存在。
4. **Given** 在 staging 環境上傳頭像至 R2，**When** 查詢 production 環境的 R2 bucket，**Then** 該檔案不存在。
5. **Given** 在 staging 環境產生一個忘記密碼 reset token 存入 KV，**When** 查詢 production 環境的 KV namespace，**Then** 該 token 不存在。

---

### Edge Cases

- **Email 格式驗證**：註冊時輸入無效 email 格式（如缺少 @）應回傳 400 錯誤。
- **並發註冊**：兩個請求同時用相同 email 註冊，D1 unique 約束應確保只有一個成功。
- **大檔案上傳**：頭像上傳應限制檔案大小（建議 5MB），超過應回傳 413 錯誤。
- **非圖片檔案**：上傳非圖片格式的檔案應回傳 400 錯誤。
- **JWT 竄改**：使用被竄改的 JWT 呼叫 API 應回傳 401。
- **CORS 非法 origin**：非允許的 origin 發送請求應被 CORS 策略阻擋。
- **Admin 自我停用**：Admin 是否可以停用自己的帳號？建議阻止，避免系統無 admin 可管理。
- **同一 OAuth provider 重複連結**：同一個 Google 帳號不能連結到多個系統帳號（unique 約束 provider + provider_id）。
- **OAuth callback 重放**：同一個 authorization code 不能使用兩次。
- **空列表處理**：使用者列表、登入歷史、OAuth 帳號列表為空時，應顯示適當的空狀態提示。

---

## Requirements *(mandatory)*

### Functional Requirements

#### 認證系統

- **FR-001**: System MUST allow users to register with email, password, and name. Password MUST be hashed using PBKDF2 (via library, not hand-rolled) before storage.
- **FR-002**: System MUST enforce password strength: minimum 8 characters, must include uppercase letter, lowercase letter, and digit.
- **FR-003**: System MUST issue JWT access token (15-minute expiry) and refresh token (7-day expiry) upon successful registration or login.
- **FR-004**: System MUST provide `POST /api/auth/login` endpoint that verifies email + password and returns tokens.
- **FR-005**: System MUST provide `POST /api/auth/refresh` endpoint that accepts a valid refresh token and returns a new access token.
- **FR-006**: System MUST implement auth middleware that validates JWT from Authorization header and checks user's is_active status on every protected request.
- **FR-007**: System MUST return 401 for invalid/expired tokens AND for valid tokens belonging to deactivated accounts (is_active = false).

#### 會員功能

- **FR-008**: System MUST provide `GET /api/users/me` to return the authenticated user's profile (id, email, name, bio, avatar_url, role, created_at).
- **FR-009**: System MUST provide `PUT /api/users/me` to update name and bio fields.
- **FR-010**: System MUST provide `POST /api/users/me/avatar` to upload an image to R2 and update avatar_url in D1.
- **FR-011**: System MUST provide `PUT /api/users/me/password` to change password, requiring verification of old password before accepting new password.
- **FR-012**: System MUST provide `POST /api/auth/forgot-password` that generates a reset token, stores it in KV with 30-minute TTL, and returns the reset link in response body.
- **FR-013**: System MUST provide `POST /api/auth/reset-password` that validates the KV reset token, updates the password, and deletes the token immediately after use.
- **FR-014**: System MUST provide `GET /api/users/me/login-history` to return the user's login history (method, IP, user agent, timestamp).
- **FR-015**: System MUST record a login_history entry on every successful login (including OAuth logins).

#### OAuth

- **FR-016**: System MUST support Google OAuth login via `GET /api/auth/oauth/google` (redirect) and `GET /api/auth/oauth/google/callback`.
- **FR-017**: System MUST store OAuth state in KV with 10-minute TTL and validate it on callback to prevent CSRF.
- **FR-018**: System MUST implement account linking logic: if provider_id exists → login; if user is authenticated → link to current account; otherwise → create new account.
- **FR-019**: System MUST provide `GET /api/users/me/oauth-accounts` to list linked OAuth accounts.
- **FR-020**: System MUST provide `DELETE /api/users/me/oauth-accounts/:provider` to unlink an OAuth account, but MUST reject if it would leave the user with no login method.

#### Admin

- **FR-021**: System MUST implement requireRole middleware that checks JWT role field and returns 403 for non-admin users.
- **FR-022**: System MUST provide `GET /api/admin/users` with pagination support.
- **FR-023**: System MUST provide `GET /api/admin/users/:id` returning user details including OAuth links and login history.
- **FR-024**: System MUST provide `PUT /api/admin/users/:id/role` to change user role between 'user' and 'admin'.
- **FR-025**: System MUST provide `PUT /api/admin/users/:id/status` to activate/deactivate accounts.
- **FR-026**: System MUST provide `GET /api/admin/dashboard/stats` returning: total users, today's registrations, active users (logged in within 7 days), deactivated count, OAuth link ratio, login count in last 24 hours.
- **FR-027**: System MUST provide `GET /api/admin/dashboard/activity` returning cross-user login records with pagination and filtering by login method and time range.

#### 前端

- **FR-028**: Web app MUST include pages: registration, login, profile (with avatar upload), change password, forgot/reset password, OAuth callback.
- **FR-029**: Web app MUST implement automatic token refresh — when access token expires, use refresh token to obtain new one; if refresh fails, redirect to login.
- **FR-030**: Web app MUST include Admin layout with sidebar navigation (Dashboard / Users / Activity), visually distinct from regular user pages.
- **FR-031**: Web app MUST protect `/admin/*` routes — verify JWT role on the client side, redirect non-admin users to home or 403 page.
- **FR-032**: Web app MUST display a visible "STAGING" banner when `VITE_ENV=staging`.

#### 部署與環境

- **FR-033**: System MUST support staging and production environments with completely isolated D1, R2, and KV resources.
- **FR-034**: System MUST auto-deploy web-app to Cloudflare Pages on push to `main` (staging) and `staging` (production) branches.
- **FR-035**: System MUST configure CORS to only allow the corresponding Pages domain per environment.
- **FR-036**: All Cloudflare resources MUST be created and managed via `wrangler` CLI, not Dashboard.
- **FR-037**: System MUST provide a seed script to create an initial admin account.
- **FR-038**: README MUST document project architecture, environment setup instructions, deployment process, and API documentation. A new team member should be able to set up the environment and deploy by following the README alone. (原文：「更新 README：說明專案架構、環境設定、部署方式、API 文件」、驗收條件：「README 完整且清晰，新人可依此設定環境並部署」)
- **FR-039**: System MUST provide a `GET /health` endpoint that returns a health status including D1 database connectivity check. (原文 Phase 1 驗收條件：「`GET /health` 回傳正常」、Phase 2：「`GET /health` 包含 DB 連線狀態檢查」)

### Non-Functional Requirements

- **NFR-001**: All API errors MUST return a consistent JSON format: `{ "error": { "code": "<ERROR_CODE>", "message": "<human readable message>" } }`.
- **NFR-002**: Passwords MUST be hashed using PBKDF2 via Web Crypto API compatible library — never stored in plaintext.
- **NFR-003**: Secrets MUST be stored via `wrangler secret`, never in source code or `.env` files. 具體需設定的 secret 名稱：`JWT_SECRET`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`（staging + production 各需設定一組）。
- **NFR-004**: `.gitignore` MUST include: `.dev.vars`, `.env.local`, `node_modules/`, `dist/`. (原文第 132、191 行)
- **NFR-005**: OAuth implementation MUST use an OAuth library (e.g., `arctic`), not hand-rolled authorization code flow.
- **NFR-006**: Frontend MUST be built with React 18+ / TypeScript / Tailwind CSS.
- **NFR-007**: Backend MUST run on Cloudflare Workers with TypeScript.
- **NFR-008**: No external SaaS services — only Cloudflare services allowed in this phase.

---

### Constraints & Prohibitions (作業注意事項與禁止事項)

#### 禁止事項 (MUST NOT)

1. **MUST NOT use Cloudflare Dashboard** for resource creation, configuration, or deployment — 包括但不限於 D1 database 建立、R2 bucket 建立、KV namespace 建立、secret 設定、migration 執行、deploy 等，MUST use `wrangler` CLI exclusively. Reason: CLI commands are reproducible, version-controllable, and AI-friendly. **例外**：Cloudflare Pages 專案初始連結 GitHub repo 以及設定 Pages Environment variables（如 `VITE_API_URL`）時需在 Dashboard 操作（作業第 154、159 行明確指示），此為允許的 Dashboard 操作。
2. **MUST NOT introduce external SaaS** — only Cloudflare services (Pages, Workers, D1, R2, KV) are allowed in this phase.
3. **MUST NOT hand-roll cryptographic logic** — password hashing MUST use a library wrapping PBKDF2 (Web Crypto API compatible). Do NOT implement hashing algorithms manually.
4. **MUST NOT hand-roll JWT sign/verify** — JWT token 的簽發與驗證 MUST use an existing JWT library, not manual implementation. (原文：「使用現成 library 處理密碼雜湊**與 JWT**，不手刻加密邏輯」)
5. **MUST NOT hand-roll OAuth Authorization Code Flow** — MUST use an OAuth library (e.g., `arctic`) to handle the authorization flow. Focus on understanding OAuth concepts, not reimplementing the protocol.
6. **MUST NOT use bcrypt** — Workers runtime only supports Web Crypto API. bcrypt is NOT available in the Cloudflare Workers environment. MUST use PBKDF2-based library instead.
7. **MUST NOT send emails or implement email verification** — 整個 email 驗證流程都不做。Forgot-password reset link MUST be returned directly in the API response body (test mode). (原文：「不做 email 驗證」)
8. **MUST NOT implement backend token blacklist** — logout is handled entirely by the frontend clearing stored tokens.
9. **MUST NOT store secrets in source code or `.env` files** — JWT_SECRET, OAuth client ID/secret MUST be set via `wrangler secret`. Secrets MUST NOT be hardcoded in any file that enters version control.
10. **MUST NOT commit `.dev.vars`, `.env.local`, `node_modules/`, `dist/` to git** — these MUST be listed in `.gitignore`. (原文第 132、191 行：「設定 `.gitignore`，確保 `.dev.vars`、`node_modules/`、`dist/` 等不進 git」)

#### Token 相關約束 (Token Constraints)

1. **Access token MUST expire in 15 minutes** — 固定值，不可更改。
2. **Refresh token MUST expire in 7 days** — 固定值，不可更改。
3. **Auth middleware MUST check `is_active` on EVERY request** — 即使持有有效的 JWT token，若帳號已被停用 (is_active = false)，MUST 回傳 401。不能只依賴 token 的有效性。(原文：「帳號被停用時，即使持有有效 token 也回傳 401」)
4. **Reset token MUST be single-use** — 使用後 MUST 立即從 KV 刪除，不可重複使用。(原文：「用完即刪除 token」)
5. **Reset token MUST have 30-minute TTL** — 存入 KV 時設定 TTL 30 分鐘，超時自動失效。
6. **OAuth state MUST have 10-minute TTL** — 存入 KV 時設定 TTL 10 分鐘，callback 時 MUST 驗證 state 一致性以防 CSRF。
7. **Frontend MUST auto-refresh tokens** — 當 access token 過期時，前端 MUST 自動使用 refresh token 換發新的 access token，使用者無感知。(原文：「access token 過期時自動用 refresh token 換發」)
8. **Frontend MUST redirect to login on refresh failure** — 當 refresh token 也過期或無效時，MUST 導向登入頁。(原文：「refresh 失敗時導向登入頁」)
9. **Unauthenticated requests MUST return 401** — 未帶 token 或 token 無效時，所有受保護的 API MUST 回傳 401 Unauthorized。

#### 強制要求 (MUST)

1. **MUST integrate GitHub auto-deployment** — the assignment explicitly emphasizes: 「一定要配合 GitHub 自動發版喔」. Push to `main` → staging auto-deploy, push to `staging` → production auto-deploy.
2. **MUST understand the three-tier secret management model** — students must be able to explain the difference and purpose of:
   - `.env` → non-sensitive environment config (API URL, environment name)
   - `wrangler secret` → sensitive secrets (JWT secret, API keys)
   - `.dev.vars` → local development secrets (gitignored)
3. **MUST configure CORS per environment** — staging API only allows staging Pages domain; production API only allows production Pages domain. Other origins MUST be rejected.
4. **MUST enforce unified API error format** — all errors return consistent JSON with error code and message.
5. **MUST enforce password strength** — minimum 8 characters, must include uppercase letter, lowercase letter, and digit.
6. **MUST use Web Crypto API compatible hashing** — Workers runtime only supports Web Crypto API. Use PBKDF2-based library, NOT bcrypt.

#### 技術提示 (Tips) — 對應作業技術提示 10 條

1. **Vite**：`VITE_` prefix 的環境變數會自動注入前端。
2. **D1 Local Dev**：`wrangler dev` 會自動建立本地 D1，不會影響遠端資料。
3. **R2 Local Dev**：本地開發時 R2 會使用 `.wrangler/state` 模擬。
4. **CORS**：Worker 需設定 CORS，允許 Pages domain 存取 API。（詳見強制要求 #3 / FR-035）
5. **TypeScript**：前後端皆使用 TypeScript，可考慮共用型別定義 (shared types)。
6. **Context7**：Cloudflare 官方文件一定有 D1 / R2 / Workers / Pages / KV 的最新用法，請善用。（原文強調「一定一定有文件」）
7. **KV TTL**：KV 支援自動過期（TTL），非常適合做 reset token 和 OAuth state，到期後 key 會自動消失，不需手動清理。
8. **密碼雜湊**：Workers 環境只支援 Web Crypto API，使用封裝 PBKDF2 的 library 即可，不需手刻加密邏輯。（詳見 Constraints #3、#6）
9. **OAuth**：使用 OAuth library（如 `arctic`）處理授權流程，專注理解 OAuth 概念而非手刻實作。（詳見 Constraints #5）
10. **忘記密碼測試模式**：因為不做 email 驗證，reset link 直接回傳在 API response body 中，方便測試。（詳見 Constraints #7）
11. **GitHub Actions**：Workers 部署可選擇加入 GitHub Actions 自動化（加分項，非必要）。

---

### Key Entities

- **User**: id (UUID), email (unique), password_hash (nullable for OAuth-only users), name, bio, avatar_url, role (user/admin), is_active (boolean), created_at, updated_at. Central entity for all authentication and authorization.
- **OAuth Account**: id, user_id (FK → users), provider (google), provider_id (unique per provider), provider_email, created_at. Unique constraint on (provider, provider_id).
- **Login History**: id, user_id (FK → users), method (email/google), ip_address, user_agent, created_at. Append-only audit log.
- **KV Reset Token**: Key pattern `reset:<token>`, value contains user_id and email. TTL 30 minutes. Used for password reset flow.
- **KV OAuth State**: Key pattern `oauth_state:<state>`, value contains provider and optional user_id (for account linking). TTL 10 minutes. Used for CSRF protection in OAuth flow.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 端對端流程驗證通過：完整的使用者旅程「註冊 → 登入 → 編輯 Profile → 修改密碼 → OAuth 連結 → Admin 管理 → 登出」無錯誤。(原文 Phase 7 驗收條件：「從註冊 → 登入 → 編輯 Profile → 修改密碼 → OAuth 連結 → Admin 管理 → 登出，完整走一遍」)
- **SC-002**: 使用者可透過 Google OAuth 完成登入，帳號自動建立或連結。
- **SC-003**: 忘記密碼流程完整可用：取得 reset link → 重設密碼 → 用新密碼登入。Reset token 30 分鐘後自動過期、使用後立即失效。
- **SC-004**: Admin 可管理所有使用者：瀏覽列表（分頁）、查看詳情、變更角色、啟停用帳號。
- **SC-005**: Admin Dashboard 統計數據正確反映資料庫實際狀態。
- **SC-006**: Staging 與 Production 環境完全隔離——一方寫入的資料不會出現在另一方。
- **SC-007**: Push 到 `main` 後 Cloudflare Pages 自動觸發 staging 部署，網站可正常存取。
- **SC-008**: 所有 API 錯誤回傳一致的 JSON 格式。
- **SC-009**: CORS 正確設定——只允許對應的 Pages domain 存取 API。
- **SC-010**: Seed script 可成功建立初始 admin 帳號。
- **SC-011**: README 完整且清晰，新人可依此設定環境並部署。
- **SC-012**: 100% 的 User Story acceptance scenarios 通過驗證。

---

## Assumptions

- Cloudflare 帳號已建立，`wrangler` CLI 已安裝且已登入 (`wrangler login`)。
- GitHub repo 已建立並連結到 Cloudflare Pages 專案。
- Google Cloud Console 已設定好 client ID / client secret，並已透過 `wrangler secret` 設定到對應環境。
- 本階段忘記密碼不寄 email，reset link 直接回傳在 API response body 中供測試使用。
- 登出由前端清除 token 實作，後端不維護 token blacklist。
- 前端採用 React SPA (Vite + React Router)。
- 後端可選擇使用 Hono framework 或原生 Workers routing，開發者自行決定。
- OAuth library 使用 `arctic` 或類似封裝，不手刻 Authorization Code Flow。
- 密碼雜湊使用 PBKDF2（Web Crypto API 相容），不使用 bcrypt（Workers 環境不支援）。

---

## API Endpoint Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/register` | Public | 註冊新帳號 |
| `POST` | `/api/auth/login` | Public | 帳號密碼登入 |
| `POST` | `/api/auth/refresh` | Public | 換發 access token |
| `POST` | `/api/auth/forgot-password` | Public | 忘記密碼，取得 reset link |
| `POST` | `/api/auth/reset-password` | Public | 用 reset token 重設密碼 |
| `GET` | `/api/auth/oauth/:provider` | Public | OAuth redirect |
| `GET` | `/api/auth/oauth/:provider/callback` | Public | OAuth callback |
| `GET` | `/api/users/me` | User | 取得 profile |
| `PUT` | `/api/users/me` | User | 更新 profile |
| `PUT` | `/api/users/me/password` | User | 修改密碼 |
| `POST` | `/api/users/me/avatar` | User | 上傳頭像 |
| `GET` | `/api/users/me/login-history` | User | 登入歷史 |
| `GET` | `/api/users/me/oauth-accounts` | User | OAuth 連結列表 |
| `DELETE` | `/api/users/me/oauth-accounts/:provider` | User | 解除 OAuth 連結 |
| `GET` | `/api/admin/users` | Admin | 使用者列表（分頁）|
| `GET` | `/api/admin/users/:id` | Admin | 使用者詳情 |
| `PUT` | `/api/admin/users/:id/role` | Admin | 變更角色 |
| `PUT` | `/api/admin/users/:id/status` | Admin | 啟停用帳號 |
| `GET` | `/api/admin/dashboard/stats` | Admin | 統計數據概覽 |
| `GET` | `/api/admin/dashboard/activity` | Admin | 全站活動日誌 |
| `GET` | `/health` | Public | Health check (含 DB 連線狀態) |

---

## D1 Schema

### users

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| email | TEXT | UNIQUE, NOT NULL | 登入用 email |
| password_hash | TEXT | NULLABLE | PBKDF2 雜湊，OAuth-only 使用者可為 null |
| name | TEXT | NOT NULL | 顯示名稱 |
| bio | TEXT | DEFAULT '' | 個人簡介 |
| avatar_url | TEXT | NULLABLE | R2 頭像 URL |
| role | TEXT | DEFAULT 'user' | 'user' 或 'admin' |
| is_active | INTEGER | DEFAULT 1 | 1=啟用, 0=停用 |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | 建立時間 (ISO 8601) |
| updated_at | TEXT | DEFAULT CURRENT_TIMESTAMP | 更新時間 (ISO 8601) |

### oauth_accounts

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| user_id | TEXT | FK → users.id, NOT NULL | 關聯使用者 |
| provider | TEXT | NOT NULL | 'google' |
| provider_id | TEXT | NOT NULL | Provider 端的 user ID |
| provider_email | TEXT | NULLABLE | Provider 端的 email |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | 建立時間 |

**Unique constraint**: (provider, provider_id)

### login_history

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID |
| user_id | TEXT | FK → users.id, NOT NULL | 關聯使用者 |
| method | TEXT | NOT NULL | 'email', 'google' |
| ip_address | TEXT | NULLABLE | 登入 IP |
| user_agent | TEXT | NULLABLE | 瀏覽器 User-Agent |
| created_at | TEXT | DEFAULT CURRENT_TIMESTAMP | 登入時間 |

---

## KV Key Patterns

| Key Pattern | Value | TTL | Description |
|-------------|-------|-----|-------------|
| `reset:<token>` | `{ "userId": "...", "email": "..." }` | 30 分鐘 | 忘記密碼 reset token |
| `oauth_state:<state>` | `{ "provider": "...", "userId": "..." }` | 10 分鐘 | OAuth CSRF 防護 state |

---

## Deployment Configuration

### 環境 URL Pattern

| | Staging | Production |
|---|---|---|
| **Pages URL** | `staging.{project}.pages.dev` | `{project}.pages.dev` 或自訂 domain |
| **Worker URL** | `api-staging.{project}.workers.dev` | `api.{project}.workers.dev` |
| **觸發分支** | `main` | `staging` |

### Cloudflare Pages 設定

- **Build command**: `cd web-app && npm run build`
- **Build output directory**: `web-app/dist`

### Workers 部署指令

```bash
# 部署到 staging
cd api && wrangler deploy --env staging

# 部署到 production
cd api && wrangler deploy --env production
```

### web-app 環境變數 (.env 檔)

```bash
# .env.staging
VITE_API_URL=https://api-staging.{project}.workers.dev
VITE_ENV=staging

# .env.production
VITE_API_URL=https://api.{project}.workers.dev
VITE_ENV=production
```

### Cloudflare Secrets（透過 wrangler CLI 設定）

```bash
# staging
wrangler secret put JWT_SECRET --env staging
wrangler secret put GOOGLE_CLIENT_ID --env staging
wrangler secret put GOOGLE_CLIENT_SECRET --env staging

# production
wrangler secret put JWT_SECRET --env production
wrangler secret put GOOGLE_CLIENT_ID --env production
wrangler secret put GOOGLE_CLIENT_SECRET --env production
```

---

## Project Structure

```
monster7-member/
├── web-app/                  # React SPA (Cloudflare Pages)
│   ├── src/
│   │   ├── components/       # 共用 UI 元件
│   │   ├── pages/
│   │   │   ├── auth/         # 註冊、登入、忘記密碼、重設密碼、OAuth callback
│   │   │   ├── profile/      # Profile 編輯、修改密碼、OAuth 管理
│   │   │   └── admin/        # Admin Dashboard、用戶管理、活動日誌
│   │   ├── hooks/            # Custom hooks (useAuth, useApi, etc.)
│   │   ├── lib/              # API client, token management
│   │   ├── types/            # TypeScript type definitions
│   │   └── App.tsx           # Router + layout
│   ├── .env.staging
│   ├── .env.production
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── api/                      # Cloudflare Worker
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts       # 註冊、登入、refresh、OAuth、忘記/重設密碼
│   │   │   ├── users.ts      # Profile CRUD、頭像、密碼、登入歷史、OAuth 管理
│   │   │   └── admin.ts      # 使用者管理、Dashboard 統計、活動日誌
│   │   ├── middleware/
│   │   │   ├── auth.ts       # JWT 驗證 + is_active 檢查
│   │   │   ├── cors.ts       # CORS 設定
│   │   │   └── role.ts       # requireRole middleware
│   │   ├── services/         # Business logic
│   │   ├── utils/            # JWT, password hashing, etc.
│   │   ├── types.ts          # Worker Env bindings type
│   │   └── index.ts          # Worker entry point
│   ├── migrations/           # D1 SQL migration files
│   ├── scripts/
│   │   └── seed.ts           # Admin seed script
│   ├── wrangler.toml
│   ├── .dev.vars             # Local dev secrets (gitignored)
│   ├── package.json
│   └── tsconfig.json
│
├── .gitignore
└── README.md
```

---

## Implementation Phases

| Phase | Focus | Key Deliverables |
|-------|-------|-----------------|
| **1** | 專案初始化 | Mono repo 骨架、React + Tailwind、Worker health check、D1/R2 建立、Pages 自動部署 |
| **2** | DB Schema + API 架構 | D1 migration、路由模組化、CORS、統一錯誤格式 |
| **3** | 環境驗證 | Staging banner、Secret 管理、環境隔離驗證 |
| **4** | 認證系統 | 註冊、登入、JWT、auth middleware、KV namespace |
| **5** | 會員功能 + 前端 | Profile、頭像 (R2)、修改密碼、忘記密碼 (KV)、登入歷史、所有前端頁面 |
| **6** | OAuth | Google OAuth、帳號連結/解除、前端 OAuth 按鈕與 callback |
| **7** | Admin | requireRole、使用者管理、Dashboard 統計、活動日誌、seed script、端對端驗證 |
