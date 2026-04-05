import * as jose from "jose";
import { Env } from "../types";
import { BAD_REQUEST, UNAUTHORIZED, NOT_FOUND, INTERNAL_ERROR } from "../utils/errors";
import { hashPassword, verifyPassword } from "../utils/crypto";

/**
 * Auth routes — uses AUTH_DB (Monster #7's D1) as SSOT for users.
 * No proxy needed. Direct DB access.
 */

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export async function handleAuthRoutes(
  request: Request,
  env: Env,
): Promise<Response> {
  const path = new URL(request.url).pathname;

  if (path === "/api/auth/register" && request.method === "POST") {
    return handleRegister(request, env);
  }
  if (path === "/api/auth/login" && request.method === "POST") {
    return handleLogin(request, env);
  }
  if (path === "/api/auth/refresh" && request.method === "POST") {
    return handleRefresh(request, env);
  }
  if (path === "/api/users/me" && request.method === "GET") {
    return handleGetMe(request, env);
  }

  return NOT_FOUND();
}

async function handleRegister(request: Request, env: Env): Promise<Response> {
  const { email, password, name } = await request.json<{ email: string; password: string; name: string }>();

  if (!email || !password || !name) return BAD_REQUEST("Email, password, and name are required");
  if (!PASSWORD_REGEX.test(password)) return BAD_REQUEST("Password must be 8+ chars with uppercase, lowercase, and digit");

  // Check if email exists in AUTH_DB
  const existing = await env.AUTH_DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) return BAD_REQUEST("Email already registered");

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  await env.AUTH_DB.prepare(
    "INSERT INTO users (id, email, password_hash, name, role, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 'user', 1, ?, ?)",
  ).bind(userId, email, passwordHash, name, now, now).run();

  const tokens = await generateTokens(userId, email, "user", env.JWT_SECRET);
  return Response.json(tokens, { status: 201 });
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const { email, password } = await request.json<{ email: string; password: string }>();

  if (!email || !password) return BAD_REQUEST("Email and password are required");

  const user = await env.AUTH_DB.prepare(
    "SELECT id, email, password_hash, role, is_active FROM users WHERE email = ?",
  ).bind(email).first<{ id: string; email: string; password_hash: string; role: string; is_active: number }>();

  if (!user || !user.password_hash) return UNAUTHORIZED("Invalid email or password");
  if (!user.is_active) return UNAUTHORIZED("Account is disabled");

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return UNAUTHORIZED("Invalid email or password");

  // Record login
  await env.AUTH_DB.prepare(
    "INSERT INTO login_history (id, user_id, method, ip_address, user_agent, created_at) VALUES (?, ?, 'password', ?, ?, ?)",
  ).bind(
    crypto.randomUUID(), user.id,
    request.headers.get("CF-Connecting-IP") || "unknown",
    request.headers.get("User-Agent") || "unknown",
    new Date().toISOString(),
  ).run();

  const tokens = await generateTokens(user.id, user.email, user.role, env.JWT_SECRET);
  return Response.json(tokens);
}

async function handleRefresh(request: Request, env: Env): Promise<Response> {
  const { refresh_token } = await request.json<{ refresh_token: string }>();
  if (!refresh_token) return BAD_REQUEST("refresh_token is required");

  try {
    const key = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(refresh_token, key);
    if (payload.type !== "refresh") return UNAUTHORIZED("Invalid token type");

    const user = await env.AUTH_DB.prepare("SELECT id, email, role, is_active FROM users WHERE id = ?")
      .bind(payload.sub).first<{ id: string; email: string; role: string; is_active: number }>();

    if (!user || !user.is_active) return UNAUTHORIZED("Account not found or disabled");

    const tokens = await generateTokens(user.id, user.email, user.role, env.JWT_SECRET);
    return Response.json(tokens);
  } catch {
    return UNAUTHORIZED("Invalid or expired refresh token");
  }
}

async function handleGetMe(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return UNAUTHORIZED();

  try {
    const key = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(authHeader.slice(7), key);
    if (payload.type !== "access") return UNAUTHORIZED("Invalid token type");

    const user = await env.AUTH_DB.prepare(
      "SELECT id, email, name, role, created_at FROM users WHERE id = ?",
    ).bind(payload.sub).first();

    if (!user) return NOT_FOUND("User not found");

    return Response.json({ data: user });
  } catch {
    return UNAUTHORIZED("Invalid or expired token");
  }
}

async function generateTokens(userId: string, email: string, role: string, secret: string) {
  const key = new TextEncoder().encode(secret);

  const accessToken = await new jose.SignJWT({ sub: userId, email, role, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(key);

  const refreshToken = await new jose.SignJWT({ sub: userId, email, role, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);

  return { access_token: accessToken, refresh_token: refreshToken };
}
