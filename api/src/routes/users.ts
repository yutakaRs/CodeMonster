import { Env } from "../types";
import { errorResponse } from "../utils/errors";
import { authenticate, type AuthUser } from "../middleware/auth";
import { hashPassword, verifyPassword } from "../utils/crypto";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export async function handleUserRoutes(
  request: Request,
  env: Env,
  path: string,
): Promise<Response | null> {
  const method = request.method;

  // All user routes require authentication
  const authResult = await authenticate(request, env);
  if (authResult instanceof Response) return authResult;
  const user = authResult as AuthUser;

  if (path === "/api/users/me" && method === "GET") {
    return getProfile(env, user);
  }
  if (path === "/api/users/me" && method === "PUT") {
    return updateProfile(request, env, user);
  }
  if (path === "/api/users/me/password" && method === "PUT") {
    return changePassword(request, env, user);
  }
  if (path === "/api/users/me/avatar" && method === "POST") {
    return uploadAvatar(request, env, user);
  }
  if (path === "/api/users/me/login-history" && method === "GET") {
    return getLoginHistory(env, user);
  }

  if (path === "/api/users/me/oauth-accounts" && method === "GET") {
    return getOAuthAccounts(env, user);
  }
  if (path.startsWith("/api/users/me/oauth-accounts/") && method === "DELETE") {
    const provider = path.split("/").pop()!;
    return unlinkOAuth(env, user, provider);
  }

  return null;
}

async function getProfile(env: Env, user: AuthUser): Promise<Response> {
  const profile = await env.DB.prepare(
    "SELECT id, email, name, bio, avatar_url, role, created_at FROM users WHERE id = ?",
  )
    .bind(user.id)
    .first();

  if (!profile) {
    return errorResponse("NOT_FOUND", "User not found", 404);
  }

  return Response.json(profile);
}

async function updateProfile(request: Request, env: Env, user: AuthUser): Promise<Response> {
  let body: { name?: string; bio?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("BAD_REQUEST", "Invalid JSON", 400);
  }

  const { name, bio } = body;

  if (name !== undefined && name.trim().length === 0) {
    return errorResponse("BAD_REQUEST", "Name cannot be empty", 400);
  }

  const now = new Date().toISOString();
  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (name !== undefined) {
    updates.push("name = ?");
    values.push(name.trim());
  }
  if (bio !== undefined) {
    updates.push("bio = ?");
    values.push(bio);
  }

  if (updates.length === 0) {
    return errorResponse("BAD_REQUEST", "No fields to update", 400);
  }

  updates.push("updated_at = ?");
  values.push(now);
  values.push(user.id);

  await env.DB.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();

  return getProfile(env, user);
}

async function changePassword(request: Request, env: Env, user: AuthUser): Promise<Response> {
  let body: { old_password?: string; new_password?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("BAD_REQUEST", "Invalid JSON", 400);
  }

  const { old_password, new_password } = body;
  if (!old_password || !new_password) {
    return errorResponse("BAD_REQUEST", "Old and new password are required", 400);
  }
  if (new_password.length < 8) {
    return errorResponse("BAD_REQUEST", "密碼至少 8 字元", 400);
  }
  if (!PASSWORD_REGEX.test(new_password)) {
    return errorResponse("BAD_REQUEST", "密碼需包含大小寫字母與數字", 400);
  }

  const dbUser = await env.DB.prepare("SELECT password_hash FROM users WHERE id = ?")
    .bind(user.id)
    .first<{ password_hash: string | null }>();

  if (!dbUser?.password_hash) {
    return errorResponse("BAD_REQUEST", "此帳號無密碼（OAuth 帳號）", 400);
  }

  const valid = await verifyPassword(old_password, dbUser.password_hash);
  if (!valid) {
    return errorResponse("BAD_REQUEST", "舊密碼錯誤", 400);
  }

  const newHash = await hashPassword(new_password);
  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?")
    .bind(newHash, now, user.id)
    .run();

  return Response.json({ message: "Password changed successfully" });
}

async function uploadAvatar(request: Request, env: Env, user: AuthUser): Promise<Response> {
  const contentType = request.headers.get("Content-Type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return errorResponse("BAD_REQUEST", "Expected multipart/form-data", 400);
  }

  const formData = await request.formData();
  const file = formData.get("avatar") as File | null;

  if (!file) {
    return errorResponse("BAD_REQUEST", "No avatar file provided", 400);
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return errorResponse("BAD_REQUEST", "Only image files are allowed (JPEG, PNG, GIF, WebP)", 400);
  }

  if (file.size > MAX_AVATAR_SIZE) {
    return errorResponse("PAYLOAD_TOO_LARGE", "File size exceeds 5MB limit", 413);
  }

  const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const key = `avatars/${user.id}.${ext}`;

  await env.BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  const avatarUrl = `/avatars/${user.id}.${ext}`;
  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?")
    .bind(avatarUrl, now, user.id)
    .run();

  return Response.json({ avatar_url: avatarUrl });
}

async function getLoginHistory(env: Env, user: AuthUser): Promise<Response> {
  const history = await env.DB.prepare(
    "SELECT id, method, ip_address, user_agent, created_at FROM login_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
  )
    .bind(user.id)
    .all();

  return Response.json({ login_history: history.results });
}

async function getOAuthAccounts(env: Env, user: AuthUser): Promise<Response> {
  const accounts = await env.DB.prepare(
    "SELECT id, provider, provider_email, created_at FROM oauth_accounts WHERE user_id = ?",
  )
    .bind(user.id)
    .all();

  return Response.json({ oauth_accounts: accounts.results });
}

async function unlinkOAuth(env: Env, user: AuthUser, provider: string): Promise<Response> {
  // Check if user has a password or other OAuth accounts
  const dbUser = await env.DB.prepare("SELECT password_hash FROM users WHERE id = ?")
    .bind(user.id)
    .first<{ password_hash: string | null }>();

  const oauthCount = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM oauth_accounts WHERE user_id = ?",
  )
    .bind(user.id)
    .first<{ count: number }>();

  const hasPassword = !!dbUser?.password_hash;
  const totalOAuth = oauthCount?.count ?? 0;

  if (!hasPassword && totalOAuth <= 1) {
    return errorResponse("BAD_REQUEST", "需至少保留一種登入方式", 400);
  }

  const result = await env.DB.prepare(
    "DELETE FROM oauth_accounts WHERE user_id = ? AND provider = ?",
  )
    .bind(user.id, provider)
    .run();

  if (!result.meta.changes) {
    return errorResponse("NOT_FOUND", "OAuth account not found", 404);
  }

  return Response.json({ message: "OAuth account unlinked" });
}
