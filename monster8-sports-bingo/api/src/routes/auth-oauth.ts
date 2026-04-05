import { Google, generateCodeVerifier } from "arctic";
import { Env } from "../types";
import { BAD_REQUEST, INTERNAL_ERROR } from "../utils/errors";
import * as jose from "jose";

/**
 * Google OAuth for Monster #8.
 * Reads/writes users to AUTH_DB (Monster #7's D1 — SSOT for user data).
 * Uses Monster #8's own callback URL.
 */

export async function handleOAuthRoutes(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/api/auth/oauth/google" && request.method === "GET") {
    return handleGoogleStart(request, env);
  }

  if (path === "/api/auth/oauth/google/callback" && request.method === "GET") {
    return handleGoogleCallback(request, env);
  }

  return BAD_REQUEST("Unknown OAuth route");
}

async function handleGoogleStart(
  request: Request,
  env: Env,
): Promise<Response> {
  const callbackUrl = `${new URL(request.url).origin}/api/auth/oauth/google/callback`;
  const google = new Google(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, callbackUrl);

  const state = crypto.randomUUID();
  const codeVerifier = generateCodeVerifier();
  const scopes = ["openid", "email", "profile"];
  const authUrl = google.createAuthorizationURL(state, codeVerifier, scopes);

  // Store state in KV (10 min TTL)
  await env.KV.put(
    `oauth_state:${state}`,
    JSON.stringify({ codeVerifier }),
    { expirationTtl: 600 },
  );

  return Response.redirect(authUrl.toString(), 302);
}

async function handleGoogleCallback(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const frontendUrl = env.CORS_ORIGIN || "http://localhost:5173";

  if (!code || !state) {
    return redirectWithError(frontendUrl, "Missing code or state");
  }

  // Validate state
  const stored = await env.KV.get(`oauth_state:${state}`);
  if (!stored) {
    return redirectWithError(frontendUrl, "Invalid or expired state");
  }
  await env.KV.delete(`oauth_state:${state}`);

  const { codeVerifier } = JSON.parse(stored) as { codeVerifier: string };

  // Exchange code for tokens
  const callbackUrl = `${url.origin}/api/auth/oauth/google/callback`;
  const google = new Google(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, callbackUrl);

  let tokens;
  try {
    tokens = await google.validateAuthorizationCode(code, codeVerifier);
  } catch {
    return redirectWithError(frontendUrl, "Failed to exchange authorization code");
  }

  // Decode ID token to get user info
  let claims: { sub: string; email: string; name?: string };
  try {
    const idToken = tokens.idToken();
    const parts = idToken.split(".");
    const padded = parts[1] + "==".slice(0, (4 - (parts[1].length % 4)) % 4);
    const binary = Uint8Array.from(atob(padded), (c: string) => c.charCodeAt(0));
    claims = JSON.parse(new TextDecoder().decode(binary));
  } catch {
    return redirectWithError(frontendUrl, "Failed to decode user info");
  }

  const providerId = claims.sub;
  const providerEmail = claims.email;
  const displayName = claims.name || providerEmail;
  const now = new Date().toISOString();

  // Check AUTH_DB (Monster #7's D1) for existing OAuth account
  const existingOAuth = await env.AUTH_DB.prepare(
    "SELECT user_id FROM oauth_accounts WHERE provider = 'google' AND provider_id = ?",
  )
    .bind(providerId)
    .first<{ user_id: string }>();

  let userId: string;
  let userEmail: string;
  let userRole: string;

  if (existingOAuth) {
    // Existing user — login
    const user = await env.AUTH_DB.prepare(
      "SELECT id, email, role, is_active FROM users WHERE id = ?",
    )
      .bind(existingOAuth.user_id)
      .first<{ id: string; email: string; role: string; is_active: number }>();

    if (!user || !user.is_active) {
      return redirectWithError(frontendUrl, "Account is disabled");
    }

    userId = user.id;
    userEmail = user.email;
    userRole = user.role;

    // Record login history
    await env.AUTH_DB.prepare(
      "INSERT INTO login_history (id, user_id, method, ip_address, user_agent, created_at) VALUES (?, ?, 'google', ?, ?, ?)",
    )
      .bind(
        crypto.randomUUID(),
        userId,
        request.headers.get("CF-Connecting-IP") || "unknown",
        request.headers.get("User-Agent") || "unknown",
        now,
      )
      .run();
  } else {
    // New user — check if email already exists
    const existingUser = await env.AUTH_DB.prepare(
      "SELECT id, email, role FROM users WHERE email = ?",
    )
      .bind(providerEmail)
      .first<{ id: string; email: string; role: string }>();

    if (existingUser) {
      // Link Google to existing email account
      userId = existingUser.id;
      userEmail = existingUser.email;
      userRole = existingUser.role;

      await env.AUTH_DB.prepare(
        "INSERT INTO oauth_accounts (id, user_id, provider, provider_id, provider_email, created_at) VALUES (?, ?, 'google', ?, ?, ?)",
      )
        .bind(crypto.randomUUID(), userId, providerId, providerEmail, now)
        .run();
    } else {
      // Create new user
      userId = crypto.randomUUID();
      userEmail = providerEmail;
      userRole = "user";

      await env.AUTH_DB.batch([
        env.AUTH_DB.prepare(
          "INSERT INTO users (id, email, name, role, is_active, created_at, updated_at) VALUES (?, ?, ?, 'user', 1, ?, ?)",
        ).bind(userId, providerEmail, displayName, now, now),
        env.AUTH_DB.prepare(
          "INSERT INTO oauth_accounts (id, user_id, provider, provider_id, provider_email, created_at) VALUES (?, ?, 'google', ?, ?, ?)",
        ).bind(crypto.randomUUID(), userId, providerId, providerEmail, now),
        env.AUTH_DB.prepare(
          "INSERT INTO login_history (id, user_id, method, ip_address, user_agent, created_at) VALUES (?, ?, 'google', ?, ?, ?)",
        ).bind(
          crypto.randomUUID(),
          userId,
          request.headers.get("CF-Connecting-IP") || "unknown",
          request.headers.get("User-Agent") || "unknown",
          now,
        ),
      ]);
    }
  }

  // Generate JWT tokens (same JWT_SECRET as Monster #7)
  const key = new TextEncoder().encode(env.JWT_SECRET);

  const accessToken = await new jose.SignJWT({
    sub: userId,
    email: userEmail,
    role: userRole,
    type: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(key);

  const refreshToken = await new jose.SignJWT({
    sub: userId,
    email: userEmail,
    role: userRole,
    type: "refresh",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);

  // Redirect to frontend with tokens
  const params = new URLSearchParams({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return Response.redirect(`${frontendUrl}/oauth/callback?${params}`, 302);
}

function redirectWithError(frontendUrl: string, message: string): Response {
  return Response.redirect(
    `${frontendUrl}/oauth/callback?error=${encodeURIComponent(message)}`,
    302,
  );
}
