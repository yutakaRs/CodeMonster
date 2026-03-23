import { Google, generateCodeVerifier } from "arctic";
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

  if (path === "/api/auth/forgot-password" && method === "POST") {
    return handleForgotPassword(request, env);
  }
  if (path === "/api/auth/reset-password" && method === "POST") {
    return handleResetPassword(request, env);
  }

  if (path === "/api/auth/oauth/google" && method === "GET") {
    return handleOAuthGoogle(request, env);
  }
  if (path === "/api/auth/oauth/google/callback" && method === "GET") {
    return handleOAuthGoogleCallback(request, env);
  }

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

async function handleForgotPassword(request: Request, env: Env): Promise<Response> {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("BAD_REQUEST", "Invalid JSON", 400);
  }

  const { email } = body;
  if (!email) {
    return errorResponse("BAD_REQUEST", "Email is required", 400);
  }

  // Always return success to avoid leaking email existence
  const successMsg = { message: "If the email exists, a reset link has been generated" } as Record<string, string>;

  const user = await env.DB.prepare("SELECT id, email FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first<{ id: string; email: string }>();

  if (user) {
    const resetToken = crypto.randomUUID();
    await env.KV.put(
      `reset:${resetToken}`,
      JSON.stringify({ userId: user.id, email: user.email }),
      { expirationTtl: 30 * 60 }, // 30 minutes
    );
    // Test mode: return reset link in response body
    successMsg.reset_link = `/reset-password?token=${resetToken}`;
  }

  return Response.json(successMsg);
}

async function handleResetPassword(request: Request, env: Env): Promise<Response> {
  let body: { token?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("BAD_REQUEST", "Invalid JSON", 400);
  }

  const { token, password } = body;
  if (!token) {
    return errorResponse("BAD_REQUEST", "Token is required", 400);
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

  const stored = await env.KV.get(`reset:${token}`);
  if (!stored) {
    return errorResponse("BAD_REQUEST", "連結已失效", 400);
  }

  const { userId } = JSON.parse(stored) as { userId: string };

  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?")
    .bind(passwordHash, now, userId)
    .run();

  // Delete token immediately (single-use)
  await env.KV.delete(`reset:${token}`);

  return Response.json({ message: "Password reset successful" });
}

function getCallbackUrl(request: Request): string {
  const url = new URL(request.url);
  return `${url.origin}/api/auth/oauth/google/callback`;
}

async function handleOAuthGoogle(request: Request, env: Env): Promise<Response> {
  const callbackUrl = getCallbackUrl(request);
  const google = new Google(env.GOOGLE_CLIENT_ID!, env.GOOGLE_CLIENT_SECRET!, callbackUrl);

  const state = crypto.randomUUID();
  const codeVerifier = generateCodeVerifier();
  const scopes = ["openid", "email", "profile"];
  const authUrl = google.createAuthorizationURL(state, codeVerifier, scopes);

  // Check if user is authenticated (for account linking)
  const authHeader = request.headers.get("Authorization");
  let userId: string | undefined;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = await verifyToken(authHeader.slice(7), env.JWT_SECRET);
      if (payload.type === "access") userId = payload.sub!;
    } catch { /* not authenticated, that's fine */ }
  }

  await env.KV.put(
    `oauth_state:${state}`,
    JSON.stringify({ provider: "google", codeVerifier, userId }),
    { expirationTtl: 10 * 60 }, // 10 minutes
  );

  return Response.redirect(authUrl.toString(), 302);
}

async function handleOAuthGoogleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return errorResponse("BAD_REQUEST", "Missing code or state", 400);
  }

  // Validate state
  const stored = await env.KV.get(`oauth_state:${state}`);
  if (!stored) {
    return errorResponse("BAD_REQUEST", "Invalid state", 400);
  }
  await env.KV.delete(`oauth_state:${state}`);

  const { codeVerifier, userId: linkUserId } = JSON.parse(stored) as {
    provider: string;
    codeVerifier: string;
    userId?: string;
  };

  // Exchange code for tokens
  const callbackUrl = getCallbackUrl(request);
  const google = new Google(env.GOOGLE_CLIENT_ID!, env.GOOGLE_CLIENT_SECRET!, callbackUrl);

  let tokens;
  try {
    tokens = await google.validateAuthorizationCode(code, codeVerifier);
  } catch {
    return errorResponse("BAD_REQUEST", "Failed to exchange authorization code", 400);
  }

  // Get user info from Google
  const idToken = tokens.idToken();
  const payload = idToken.split(".")[1];
  const binary = Uint8Array.from(atob(payload), (c: string) => c.charCodeAt(0));
  const claims = JSON.parse(new TextDecoder().decode(binary)) as {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
  };

  const providerId = claims.sub;
  const providerEmail = claims.email;
  const googleName = claims.name || providerEmail;
  const now = new Date().toISOString();

  // Check if this Google account is already linked
  const existingOAuth = await env.DB.prepare(
    "SELECT user_id FROM oauth_accounts WHERE provider = 'google' AND provider_id = ?",
  )
    .bind(providerId)
    .first<{ user_id: string }>();

  if (existingOAuth) {
    // Login with existing linked account
    const user = await env.DB.prepare("SELECT id, email, role, is_active FROM users WHERE id = ?")
      .bind(existingOAuth.user_id)
      .first<{ id: string; email: string; role: string; is_active: number }>();

    if (!user || !user.is_active) {
      return redirectWithError(env, "帳號已被停用");
    }

    // Record login history
    await env.DB.prepare(
      `INSERT INTO login_history (id, user_id, method, ip_address, user_agent, created_at)
       VALUES (?, ?, 'google', ?, ?, ?)`,
    )
      .bind(crypto.randomUUID(), user.id,
        request.headers.get("CF-Connecting-IP") ?? request.headers.get("X-Forwarded-For"),
        request.headers.get("User-Agent"), now)
      .run();

    const accessToken = await generateAccessToken(user.id, user.email, user.role, env.JWT_SECRET);
    const refreshToken = await generateRefreshToken(user.id, user.email, user.role, env.JWT_SECRET);
    return redirectWithTokens(env, accessToken, refreshToken);
  }

  // Account linking: user is already logged in
  if (linkUserId) {
    await env.DB.prepare(
      `INSERT INTO oauth_accounts (id, user_id, provider, provider_id, provider_email, created_at)
       VALUES (?, ?, 'google', ?, ?, ?)`,
    )
      .bind(crypto.randomUUID(), linkUserId, providerId, providerEmail, now)
      .run();

    return redirectWithMessage(env, "Google 帳號已連結");
  }

  // New user: create account
  const userId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO users (id, email, name, role, is_active, created_at, updated_at)
     VALUES (?, ?, ?, 'user', 1, ?, ?)`,
  )
    .bind(userId, providerEmail, googleName, now, now)
    .run();

  await env.DB.prepare(
    `INSERT INTO oauth_accounts (id, user_id, provider, provider_id, provider_email, created_at)
     VALUES (?, ?, 'google', ?, ?, ?)`,
  )
    .bind(crypto.randomUUID(), userId, providerId, providerEmail, now)
    .run();

  // Record login history
  await env.DB.prepare(
    `INSERT INTO login_history (id, user_id, method, ip_address, user_agent, created_at)
     VALUES (?, ?, 'google', ?, ?, ?)`,
  )
    .bind(crypto.randomUUID(), userId,
      request.headers.get("CF-Connecting-IP") ?? request.headers.get("X-Forwarded-For"),
      request.headers.get("User-Agent"), now)
    .run();

  const accessToken = await generateAccessToken(userId, providerEmail, "user", env.JWT_SECRET);
  const refreshToken = await generateRefreshToken(userId, providerEmail, "user", env.JWT_SECRET);
  return redirectWithTokens(env, accessToken, refreshToken);
}

function redirectWithTokens(env: Env, accessToken: string, refreshToken: string): Response {
  const frontendUrl = env.CORS_ORIGIN || "http://localhost:5173";
  const params = new URLSearchParams({ access_token: accessToken, refresh_token: refreshToken });
  return Response.redirect(`${frontendUrl}/oauth/callback?${params}`, 302);
}

function redirectWithError(env: Env, message: string): Response {
  const frontendUrl = env.CORS_ORIGIN || "http://localhost:5173";
  return Response.redirect(`${frontendUrl}/oauth/callback?error=${encodeURIComponent(message)}`, 302);
}

function redirectWithMessage(env: Env, message: string): Response {
  const frontendUrl = env.CORS_ORIGIN || "http://localhost:5173";
  return Response.redirect(`${frontendUrl}/profile?message=${encodeURIComponent(message)}`, 302);
}
