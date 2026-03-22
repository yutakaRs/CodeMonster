import { Env } from "../types";
import { errorResponse } from "../utils/errors";
import { authenticate, type AuthUser } from "../middleware/auth";
import { requireRole } from "../middleware/role";

export async function handleAdminRoutes(
  request: Request,
  env: Env,
  path: string,
): Promise<Response | null> {
  const method = request.method;

  // All admin routes require authentication + admin role
  const authResult = await authenticate(request, env);
  if (authResult instanceof Response) return authResult;
  const user = authResult as AuthUser;

  const roleCheck = requireRole(user, "admin");
  if (roleCheck) return roleCheck;

  if (path === "/api/admin/users" && method === "GET") {
    return listUsers(request, env);
  }
  if (path === "/api/admin/dashboard/stats" && method === "GET") {
    return getDashboardStats(env);
  }
  if (path === "/api/admin/dashboard/activity" && method === "GET") {
    return getActivity(request, env);
  }

  // Dynamic routes: /api/admin/users/:id, /api/admin/users/:id/role, /api/admin/users/:id/status
  const userMatch = path.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (userMatch && method === "GET") {
    return getUserDetail(env, userMatch[1]);
  }

  const roleMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/role$/);
  if (roleMatch && method === "PUT") {
    return changeUserRole(request, env, roleMatch[1], user);
  }

  const statusMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/status$/);
  if (statusMatch && method === "PUT") {
    return changeUserStatus(request, env, statusMatch[1], user);
  }

  return null;
}

async function listUsers(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
  const offset = (page - 1) * limit;

  const total = await env.DB.prepare("SELECT COUNT(*) as count FROM users")
    .first<{ count: number }>();

  const users = await env.DB.prepare(
    "SELECT id, email, name, role, is_active, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?",
  )
    .bind(limit, offset)
    .all();

  return Response.json({
    users: users.results,
    pagination: {
      page,
      limit,
      total: total?.count ?? 0,
      total_pages: Math.ceil((total?.count ?? 0) / limit),
    },
  });
}

async function getUserDetail(env: Env, userId: string): Promise<Response> {
  const user = await env.DB.prepare(
    "SELECT id, email, name, bio, avatar_url, role, is_active, created_at, updated_at FROM users WHERE id = ?",
  )
    .bind(userId)
    .first();

  if (!user) {
    return errorResponse("NOT_FOUND", "User not found", 404);
  }

  const oauthAccounts = await env.DB.prepare(
    "SELECT id, provider, provider_email, created_at FROM oauth_accounts WHERE user_id = ?",
  )
    .bind(userId)
    .all();

  const loginHistory = await env.DB.prepare(
    "SELECT id, method, ip_address, user_agent, created_at FROM login_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
  )
    .bind(userId)
    .all();

  return Response.json({
    ...user,
    oauth_accounts: oauthAccounts.results,
    login_history: loginHistory.results,
  });
}

async function changeUserRole(
  request: Request, env: Env, userId: string, currentAdmin: AuthUser,
): Promise<Response> {
  let body: { role?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("BAD_REQUEST", "Invalid JSON", 400);
  }

  const { role } = body;
  if (!role || !["user", "admin"].includes(role)) {
    return errorResponse("BAD_REQUEST", "Role must be 'user' or 'admin'", 400);
  }

  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE users SET role = ?, updated_at = ? WHERE id = ?")
    .bind(role, now, userId)
    .run();

  return Response.json({ message: "Role updated" });
}

async function changeUserStatus(
  request: Request, env: Env, userId: string, currentAdmin: AuthUser,
): Promise<Response> {
  // Prevent admin from deactivating themselves
  if (userId === currentAdmin.id) {
    return errorResponse("BAD_REQUEST", "Admin 無法停用自己的帳號", 400);
  }

  let body: { is_active?: boolean };
  try {
    body = await request.json();
  } catch {
    return errorResponse("BAD_REQUEST", "Invalid JSON", 400);
  }

  if (body.is_active === undefined) {
    return errorResponse("BAD_REQUEST", "is_active is required", 400);
  }

  const now = new Date().toISOString();
  await env.DB.prepare("UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?")
    .bind(body.is_active ? 1 : 0, now, userId)
    .run();

  return Response.json({ message: body.is_active ? "Account activated" : "Account deactivated" });
}

async function getDashboardStats(env: Env): Promise<Response> {
  const totalUsers = await env.DB.prepare("SELECT COUNT(*) as count FROM users")
    .first<{ count: number }>();

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayRegistrations = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM users WHERE created_at >= ?",
  )
    .bind(todayStart.toISOString())
    .first<{ count: number }>();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const activeUsers = await env.DB.prepare(
    "SELECT COUNT(DISTINCT user_id) as count FROM login_history WHERE created_at >= ?",
  )
    .bind(sevenDaysAgo)
    .first<{ count: number }>();

  const deactivated = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM users WHERE is_active = 0",
  )
    .first<{ count: number }>();

  const oauthLinked = await env.DB.prepare(
    "SELECT COUNT(DISTINCT user_id) as count FROM oauth_accounts",
  )
    .first<{ count: number }>();

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentLogins = await env.DB.prepare(
    "SELECT COUNT(*) as count FROM login_history WHERE created_at >= ?",
  )
    .bind(oneDayAgo)
    .first<{ count: number }>();

  const total = totalUsers?.count ?? 0;

  return Response.json({
    total_users: total,
    today_registrations: todayRegistrations?.count ?? 0,
    active_users_7d: activeUsers?.count ?? 0,
    deactivated_count: deactivated?.count ?? 0,
    oauth_link_ratio: total > 0 ? ((oauthLinked?.count ?? 0) / total * 100).toFixed(1) + "%" : "0%",
    logins_24h: recentLogins?.count ?? 0,
  });
}

async function getActivity(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
  const offset = (page - 1) * limit;
  const method = url.searchParams.get("method");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let query = `SELECT lh.id, lh.user_id, u.email, u.name, lh.method, lh.ip_address, lh.user_agent, lh.created_at
               FROM login_history lh JOIN users u ON lh.user_id = u.id WHERE 1=1`;
  let countQuery = "SELECT COUNT(*) as count FROM login_history lh WHERE 1=1";
  const params: string[] = [];

  if (method) {
    query += " AND lh.method = ?";
    countQuery += " AND lh.method = ?";
    params.push(method);
  }
  if (from) {
    query += " AND lh.created_at >= ?";
    countQuery += " AND lh.created_at >= ?";
    params.push(from);
  }
  if (to) {
    query += " AND lh.created_at <= ?";
    countQuery += " AND lh.created_at <= ?";
    params.push(to);
  }

  const total = await env.DB.prepare(countQuery)
    .bind(...params)
    .first<{ count: number }>();

  query += " ORDER BY lh.created_at DESC LIMIT ? OFFSET ?";
  const results = await env.DB.prepare(query)
    .bind(...params, limit, offset)
    .all();

  return Response.json({
    activity: results.results,
    pagination: {
      page,
      limit,
      total: total?.count ?? 0,
      total_pages: Math.ceil((total?.count ?? 0) / limit),
    },
  });
}
