import { Env } from "../types";
import { verifyToken, type TokenPayload } from "../utils/jwt";
import { errorResponse } from "../utils/errors";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export async function authenticate(
  request: Request,
  env: Env,
): Promise<AuthUser | Response> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return errorResponse("UNAUTHORIZED", "Missing or invalid token", 401);
  }

  const token = authHeader.slice(7);

  let payload: TokenPayload;
  try {
    payload = await verifyToken(token, env.JWT_SECRET);
  } catch {
    return errorResponse("UNAUTHORIZED", "Invalid or expired token", 401);
  }

  if (payload.type !== "access") {
    return errorResponse("UNAUTHORIZED", "Invalid token type", 401);
  }

  // Check is_active in DB on every request
  const user = await env.DB.prepare("SELECT is_active FROM users WHERE id = ?")
    .bind(payload.sub!)
    .first<{ is_active: number }>();

  if (!user || !user.is_active) {
    return errorResponse("UNAUTHORIZED", "帳號已被停用", 401);
  }

  return { id: payload.sub!, email: payload.email, role: payload.role };
}
