import { describe, it, expect, beforeAll } from "vitest";
import { SELF, env, applyMigrations, authHeader } from "./helpers";

describe("Admin API", () => {
  let adminToken: string;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    await applyMigrations();

    // Create admin via register + DB promotion
    await SELF.fetch("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@test.com", password: "Admin1234", name: "Admin" }),
    });
    // Promote to admin directly via DB (simulates seed script)
    await env.DB.prepare("UPDATE users SET role = 'admin' WHERE email = ?")
      .bind("admin@test.com").run();

    // Re-login to get token with admin role
    const loginRes = await SELF.fetch("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@test.com", password: "Admin1234" }),
    });
    const adminData = await loginRes.json() as { access_token: string };
    adminToken = adminData.access_token;

    // Create regular user
    const userRes = await SELF.fetch("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "regular@test.com", password: "Test1234", name: "Regular" }),
    });
    const userData = await userRes.json() as { access_token: string };
    userToken = userData.access_token;

    // Get user ID from profile
    const meRes = await SELF.fetch("http://localhost/api/users/me", {
      headers: authHeader(userToken),
    });
    const me = await meRes.json() as { id: string };
    userId = me.id;
  });

  describe("Authorization", () => {
    it("non-admin gets 403 on admin routes", async () => {
      const res = await SELF.fetch("http://localhost/api/admin/users", {
        headers: authHeader(userToken),
      });
      expect(res.status).toBe(403);
      const data = await res.json() as { error: { code: string } };
      expect(data.error.code).toBe("FORBIDDEN");
    });

    it("unauthenticated gets 401", async () => {
      const res = await SELF.fetch("http://localhost/api/admin/users");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/admin/users", () => {
    it("returns paginated user list", async () => {
      const res = await SELF.fetch("http://localhost/api/admin/users", {
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const data = await res.json() as { users: unknown[]; pagination: { total: number; page: number } };
      expect(data.users.length).toBeGreaterThanOrEqual(2);
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe("GET /api/admin/users/:id", () => {
    it("returns user detail with oauth and login history", async () => {
      const res = await SELF.fetch(`http://localhost/api/admin/users/${userId}`, {
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.email).toBe("regular@test.com");
      expect(data.oauth_accounts).toBeDefined();
      expect(data.login_history).toBeDefined();
    });

    it("returns 404 for non-existent user", async () => {
      const res = await SELF.fetch("http://localhost/api/admin/users/nonexistent-id", {
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/admin/users/:id/role", () => {
    it("changes user role to admin", async () => {
      const res = await SELF.fetch(`http://localhost/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: { ...authHeader(adminToken), "Content-Type": "application/json" },
        body: JSON.stringify({ role: "admin" }),
      });
      expect(res.status).toBe(200);

      // Verify via detail API
      const detailRes = await SELF.fetch(`http://localhost/api/admin/users/${userId}`, {
        headers: authHeader(adminToken),
      });
      const detail = await detailRes.json() as { role: string };
      expect(detail.role).toBe("admin");

      // Revert
      await SELF.fetch(`http://localhost/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: { ...authHeader(adminToken), "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user" }),
      });
    });

    it("rejects invalid role", async () => {
      const res = await SELF.fetch(`http://localhost/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: { ...authHeader(adminToken), "Content-Type": "application/json" },
        body: JSON.stringify({ role: "superadmin" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/admin/users/:id/status", () => {
    it("deactivates user → user gets 401", async () => {
      const res = await SELF.fetch(`http://localhost/api/admin/users/${userId}/status`, {
        method: "PUT",
        headers: { ...authHeader(adminToken), "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: false }),
      });
      expect(res.status).toBe(200);

      // Deactivated user gets 401
      const meRes = await SELF.fetch("http://localhost/api/users/me", {
        headers: authHeader(userToken),
      });
      expect(meRes.status).toBe(401);
    });

    it("reactivates user", async () => {
      const res = await SELF.fetch(`http://localhost/api/admin/users/${userId}/status`, {
        method: "PUT",
        headers: { ...authHeader(adminToken), "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: true }),
      });
      expect(res.status).toBe(200);
    });

    it("admin cannot deactivate themselves", async () => {
      // Get admin ID
      const meRes = await SELF.fetch("http://localhost/api/users/me", {
        headers: authHeader(adminToken),
      });
      const { id: adminId } = await meRes.json() as { id: string };

      const res = await SELF.fetch(`http://localhost/api/admin/users/${adminId}/status`, {
        method: "PUT",
        headers: { ...authHeader(adminToken), "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: false }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/admin/dashboard/stats", () => {
    it("returns all 6 stats", async () => {
      const res = await SELF.fetch("http://localhost/api/admin/dashboard/stats", {
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.total_users).toBeDefined();
      expect(data.today_registrations).toBeDefined();
      expect(data.active_users_7d).toBeDefined();
      expect(data.deactivated_count).toBeDefined();
      expect(data.oauth_link_ratio).toBeDefined();
      expect(data.logins_24h).toBeDefined();
    });
  });

  describe("GET /api/admin/dashboard/activity", () => {
    it("returns paginated activity log", async () => {
      const res = await SELF.fetch("http://localhost/api/admin/dashboard/activity", {
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const data = await res.json() as { activity: unknown[]; pagination: { total: number } };
      expect(data.activity.length).toBeGreaterThanOrEqual(1);
      expect(data.pagination).toBeDefined();
    });

    it("filters by method", async () => {
      const res = await SELF.fetch("http://localhost/api/admin/dashboard/activity?method=email", {
        headers: authHeader(adminToken),
      });
      expect(res.status).toBe(200);
      const data = await res.json() as { activity: { method: string }[] };
      for (const a of data.activity) {
        expect(a.method).toBe("email");
      }
    });
  });
});

describe("CORS", () => {
  it("OPTIONS preflight returns CORS headers for allowed origin", async () => {
    const res = await SELF.fetch("http://localhost/api/auth/login", {
      method: "OPTIONS",
      headers: { Origin: "https://main.monster7-member.pages.dev" },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://main.monster7-member.pages.dev");
  });

  it("does not set CORS header for disallowed origin", async () => {
    const res = await SELF.fetch("http://localhost/api/auth/login", {
      method: "OPTIONS",
      headers: { Origin: "https://evil.com" },
    });
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});

describe("Error format", () => {
  it("404 returns unified error format", async () => {
    const res = await SELF.fetch("http://localhost/api/nonexistent");
    expect(res.status).toBe(404);
    const data = await res.json() as { error: { code: string; message: string } };
    expect(data.error).toBeDefined();
    expect(data.error.code).toBe("NOT_FOUND");
    expect(data.error.message).toBeDefined();
  });
});
