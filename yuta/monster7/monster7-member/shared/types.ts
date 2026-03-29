// Shared type definitions for Monster7 Member System
// Used by both api/ (backend) and web-app/ (frontend)

// ─── User ────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  bio: string;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

export interface UserDetail extends User {
  is_active: number;
  updated_at: string;
  oauth_accounts: OAuthAccount[];
  login_history: LoginRecord[];
}

// ─── OAuth ───────────────────────────────────────────

export interface OAuthAccount {
  id: string;
  provider: string;
  provider_email: string | null;
  created_at: string;
}

// ─── Login History ───────────────────────────────────

export interface LoginRecord {
  id: string;
  method: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ─── Pagination ──────────────────────────────────────

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

// ─── Admin Dashboard ─────────────────────────────────

export interface DashboardStats {
  total_users: number;
  today_registrations: number;
  active_users_7d: number;
  deactivated_count: number;
  oauth_link_ratio: string;
  logins_24h: number;
}

// ─── Activity Log ────────────────────────────────────

export interface ActivityRecord {
  id: string;
  user_id: string;
  email: string;
  name: string;
  method: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ─── API Error ───────────────────────────────────────

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

// ─── Auth Responses ──────────────────────────────────

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface UserListItem {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: number;
  created_at: string;
}
