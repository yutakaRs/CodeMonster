import { AuthUser } from "./auth";
import { errorResponse } from "../utils/errors";

export function requireRole(
  user: AuthUser,
  role: string,
): Response | null {
  if (user.role !== role) {
    return errorResponse("FORBIDDEN", "Insufficient permissions", 403);
  }
  return null;
}
