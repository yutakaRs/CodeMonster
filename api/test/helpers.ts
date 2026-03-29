import { SELF, env } from "cloudflare:test";

export { SELF, env };

export async function applyMigrations() {
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT,
      name TEXT NOT NULL, bio TEXT DEFAULT '', avatar_url TEXT,
      role TEXT NOT NULL DEFAULT 'user', is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS oauth_accounts (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL, provider_id TEXT NOT NULL, provider_email TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(provider, provider_id)
    );
    CREATE TABLE IF NOT EXISTS login_history (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      method TEXT NOT NULL, ip_address TEXT, user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `;
  for (const stmt of sql.split(";").filter((s) => s.trim())) {
    await env.DB.prepare(stmt).run();
  }
}

export async function registerUser(
  email = "test@example.com",
  password = "Test1234",
  name = "Test User",
) {
  const res = await SELF.fetch("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  return res.json() as Promise<{ access_token: string; refresh_token: string }>;
}

export async function loginUser(email: string, password: string) {
  const res = await SELF.fetch("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return { res, data: await res.json() as Record<string, unknown> };
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
