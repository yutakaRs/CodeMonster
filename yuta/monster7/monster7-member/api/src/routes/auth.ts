import { Env } from "../types";
import { errorResponse } from "../utils/errors";
import { hashPassword, verifyPassword } from "../utils/crypto";
import { generateAccessToken, generateRefreshToken, verifyToken } from "../utils/jwt";

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function handleAuthRoutes(
  request: Request,
  env: Env,
  path: string,
): Promise<Response | null> {
  const method = request.method;

  if (path === "/api/auth/register" && method === "POST") {
    return handleRegister(request, env);
  }
  if (path === "/api/auth/login" && method === "POST") {
    return handleLogin(request, env);
  }
  if (path === "/api/auth/refresh" && method === "POST") {
    return handleRefresh(request, env);
  }

  // Phase 5: forgot-password, reset-password
  // Phase 6: oauth routes

  return null;
}

async function handleRegister(request: Request, env: Env): Promise<Response> {
  let body: { email?: string; password?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("BAD_REQUEST", "Invalid JSON", 400);
  }

  const { email, password, name } = body;

  if (!email || !EMAIL_REGEX.test(email)) {
    return errorResponse("BAD_REQUEST", "Invalid email format", 400);
  }
  if (!name || name.trim().length === 0) {
    return errorResponse("BAD_REQUEST", "Name is required", 400);
  }
  if (!password) {
    return errorResponse("BAD_REQUEST", "Password is required", 400);
  }
  if (password.length < 8) {
    return errorResponse("BAD_REQUEST", "密碼至少 8 字元", 400);
  }
  if (!PASSWORD_REGEX.test(password)) {
    return errorResponse("BAD_REQUEST", "密碼需包含大小寫字母與數字", 400);
  }

  // Check duplicate email
  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first();
  if (existing) {
    return errorResponse("CONFLICT", "此 email 已被註冊", 409);
  }

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO users (id, email, password_hash, name, role, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'user', 1, ?, ?)`,
  )
    .bind(userId, email.toLowerCase(), passwordHash, name.trim(), now, now)
    .run();

  // Record login history
  await env.DB.prepare(
    `INSERT INTO login_history (id, user_id, method, ip_address, user_agent, created_at)
     VALUES (?, ?, 'email', ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      userId,
      request.headers.get("CF-Connecting-IP") ?? request.headers.get("X-Forwarded-For"),
      request.headers.get("User-Agent"),
      now,
    )
    .run();

  const accessToken = await generateAccessToken(userId, email.toLowerCase(), "user", env.JWT_SECRET);
  const refreshToken = await generateRefreshToken(userId, email.toLowerCase(), "user", env.JWT_SECRET);

  return Response.json(
    { access_token: accessToken, refresh_token: refreshToken },
    { status: 201 },
  );
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("BAD_REQUEST", "Invalid JSON", 400);
  }

  const { email, password } = body;
  if (!email || !password) {
    return errorResponse("BAD_REQUEST", "Email and password are required", 400);
  }

  const user = await env.DB.prepare(
    "SELECT id, email, password_hash, role, is_active FROM users WHERE email = ?",
  )
    .bind(email.toLowerCase())
    .first<{ id: string; email: string; password_hash: string | null; role: string; is_active: number }>();

  // Don't reveal whether email exists
  if (!user || !user.password_hash) {
    return errorResponse("UNAUTHORIZED", "帳號或密碼錯誤", 401);
  }

  if (!user.is_active) {
    return errorResponse("UNAUTHORIZED", "帳號已被停用", 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return errorResponse("UNAUTHORIZED", "帳號或密碼錯誤", 401);
  }

  const now = new Date().toISOString();

  // Record login history
  await env.DB.prepare(
    `INSERT INTO login_history (id, user_id, method, ip_address, user_agent, created_at)
     VALUES (?, ?, 'email', ?, ?, ?)`,
  )
    .bind(
      crypto.randomUUID(),
      user.id,
      request.headers.get("CF-Connecting-IP") ?? request.headers.get("X-Forwarded-For"),
      request.headers.get("User-Agent"),
      now,
    )
    .run();

  const accessToken = await generateAccessToken(user.id, user.email, user.role, env.JWT_SECRET);
  const refreshToken = await generateRefreshToken(user.id, user.email, user.role, env.JWT_SECRET);

  return Response.json({ access_token: accessToken, refresh_token: refreshToken });
}

async function handleRefresh(request: Request, env: Env): Promise<Response> {
  let body: { refresh_token?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("BAD_REQUEST", "Invalid JSON", 400);
  }

  const { refresh_token } = body;
  if (!refresh_token) {
    return errorResponse("BAD_REQUEST", "Refresh token is required", 400);
  }

  let payload;
  try {
    payload = await verifyToken(refresh_token, env.JWT_SECRET);
  } catch {
    return errorResponse("UNAUTHORIZED", "Invalid or expired refresh token", 401);
  }

  if (payload.type !== "refresh") {
    return errorResponse("UNAUTHORIZED", "Invalid token type", 401);
  }

  // Check user still active
  const user = await env.DB.prepare("SELECT id, email, role, is_active FROM users WHERE id = ?")
    .bind(payload.sub!)
    .first<{ id: string; email: string; role: string; is_active: number }>();

  if (!user || !user.is_active) {
    return errorResponse("UNAUTHORIZED", "帳號已被停用", 401);
  }

  const accessToken = await generateAccessToken(user.id, user.email, user.role, env.JWT_SECRET);

  return Response.json({ access_token: accessToken });
}
