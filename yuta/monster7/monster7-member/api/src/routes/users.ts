import { Env } from "../types";
import { errorResponse } from "../utils/errors";

export async function handleUserRoutes(
  request: Request,
  env: Env,
  path: string,
): Promise<Response | null> {
  // GET    /api/users/me                     → Phase 5
  // PUT    /api/users/me                     → Phase 5
  // PUT    /api/users/me/password            → Phase 5
  // POST   /api/users/me/avatar              → Phase 5
  // GET    /api/users/me/login-history       → Phase 5
  // GET    /api/users/me/oauth-accounts      → Phase 6
  // DELETE /api/users/me/oauth-accounts/:provider → Phase 6

  return null; // no matching route
}
