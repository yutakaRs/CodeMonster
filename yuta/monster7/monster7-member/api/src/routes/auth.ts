import { Env } from "../types";
import { errorResponse } from "../utils/errors";

export async function handleAuthRoutes(
  request: Request,
  env: Env,
  path: string,
): Promise<Response | null> {
  // POST /api/auth/register       → Phase 4
  // POST /api/auth/login          → Phase 4
  // POST /api/auth/refresh        → Phase 4
  // POST /api/auth/forgot-password → Phase 5
  // POST /api/auth/reset-password  → Phase 5
  // GET  /api/auth/oauth/:provider           → Phase 6
  // GET  /api/auth/oauth/:provider/callback  → Phase 6

  return null; // no matching route
}
