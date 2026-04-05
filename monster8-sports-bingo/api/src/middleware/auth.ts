import { Env } from "../types";
import { verifyAccessToken, JwtPayload } from "../utils/jwt";
import { UNAUTHORIZED } from "../utils/errors";

export async function authenticateRequest(
  request: Request,
  env: Env,
): Promise<JwtPayload | Response> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return UNAUTHORIZED("Missing or invalid Authorization header");
  }

  const token = authHeader.slice(7);

  try {
    return await verifyAccessToken(token, env.JWT_SECRET);
  } catch {
    return UNAUTHORIZED("Invalid or expired token");
  }
}
