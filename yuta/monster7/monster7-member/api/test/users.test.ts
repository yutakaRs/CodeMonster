import { describe, it, expect, beforeAll } from "vitest";
import { SELF, applyMigrations, authHeader } from "./helpers";

describe("Users API", () => {
  let accessToken: string;

  beforeAll(async () => {
    await applyMigrations();
    const res = await SELF.fetch("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "user@test.com", password: "Test1234", name: "Test User" }),
    });
    const data = await res.json() as { access_token: string };
    accessToken = data.access_token;
  });

  describe("GET /api/users/me", () => {
    it("returns profile with valid token", async () => {
      const res = await SELF.fetch("http://localhost/api/users/me", {
        headers: authHeader(accessToken),
      });
      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.email).toBe("user@test.com");
      expect(data.name).toBe("Test User");
      expect(data.role).toBe("user");
      expect(data.id).toBeDefined();
      expect(data.created_at).toBeDefined();
    });

    it("returns 401 without token", async () => {
      const res = await SELF.fetch("http://localhost/api/users/me");
      expect(res.status).toBe(401);
    });

    it("returns 401 with invalid token", async () => {
      const res = await SELF.fetch("http://localhost/api/users/me", {
        headers: authHeader("invalid.token.here"),
      });
      expect(res.status).toBe(401);
    });
  });

  describe("PUT /api/users/me", () => {
    it("updates name and bio", async () => {
      const res = await SELF.fetch("http://localhost/api/users/me", {
        method: "PUT",
        headers: { ...authHeader(accessToken), "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name", bio: "Hello world" }),
      });
      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.name).toBe("Updated Name");
      expect(data.bio).toBe("Hello world");
    });

    it("rejects empty name", async () => {
      const res = await SELF.fetch("http://localhost/api/users/me", {
        method: "PUT",
        headers: { ...authHeader(accessToken), "Content-Type": "application/json" },
        body: JSON.stringify({ name: "" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/users/me/password", () => {
    it("changes password and verifies with login", async () => {
      const res = await SELF.fetch("http://localhost/api/users/me/password", {
        method: "PUT",
        headers: { ...authHeader(accessToken), "Content-Type": "application/json" },
        body: JSON.stringify({ old_password: "Test1234", new_password: "NewPass123" }),
      });
      expect(res.status).toBe(200);

      // Login with new password works
      const loginRes = await SELF.fetch("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@test.com", password: "NewPass123" }),
      });
      expect(loginRes.status).toBe(200);

      // Old password fails
      const oldRes = await SELF.fetch("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@test.com", password: "Test1234" }),
      });
      expect(oldRes.status).toBe(401);
    });

    it("rejects wrong old password", async () => {
      const res = await SELF.fetch("http://localhost/api/users/me/password", {
        method: "PUT",
        headers: { ...authHeader(accessToken), "Content-Type": "application/json" },
        body: JSON.stringify({ old_password: "WrongOld1", new_password: "Another123" }),
      });
      expect(res.status).toBe(400);
    });

    it("rejects weak new password", async () => {
      const res = await SELF.fetch("http://localhost/api/users/me/password", {
        method: "PUT",
        headers: { ...authHeader(accessToken), "Content-Type": "application/json" },
        body: JSON.stringify({ old_password: "NewPass123", new_password: "weak" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/users/me/avatar", () => {
    it("uploads avatar → stores in R2 → serves via GET /avatars/*", async () => {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(100)], { type: "image/png" });
      formData.append("avatar", blob, "test.png");

      // Upload
      const res = await SELF.fetch("http://localhost/api/users/me/avatar", {
        method: "POST",
        headers: authHeader(accessToken),
        body: formData,
      });
      expect(res.status).toBe(200);
      const data = await res.json() as { avatar_url: string };
      expect(data.avatar_url).toContain("/avatars/");
      expect(data.avatar_url).toContain(".png");

      // Read back from R2
      const avatarRes = await SELF.fetch(`http://localhost${data.avatar_url}`);
      expect(avatarRes.status).toBe(200);
    });

    it("rejects non-image files", async () => {
      const formData = new FormData();
      const blob = new Blob(["not an image"], { type: "text/plain" });
      formData.append("avatar", blob, "test.txt");

      const res = await SELF.fetch("http://localhost/api/users/me/avatar", {
        method: "POST",
        headers: authHeader(accessToken),
        body: formData,
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/users/me/login-history", () => {
    it("returns login history with at least one entry", async () => {
      const res = await SELF.fetch("http://localhost/api/users/me/login-history", {
        headers: authHeader(accessToken),
      });
      expect(res.status).toBe(200);
      const data = await res.json() as { login_history: { method: string }[] };
      expect(data.login_history.length).toBeGreaterThanOrEqual(1);
      expect(data.login_history[0].method).toBe("email");
    });
  });

  describe("OAuth accounts", () => {
    it("returns empty oauth list for new user", async () => {
      const res = await SELF.fetch("http://localhost/api/users/me/oauth-accounts", {
        headers: authHeader(accessToken),
      });
      expect(res.status).toBe(200);
      const data = await res.json() as { oauth_accounts: unknown[] };
      expect(data.oauth_accounts).toEqual([]);
    });

    it("DELETE non-existent oauth returns 404", async () => {
      const res = await SELF.fetch("http://localhost/api/users/me/oauth-accounts/google", {
        method: "DELETE",
        headers: authHeader(accessToken),
      });
      expect(res.status).toBe(404);
    });
  });
});
