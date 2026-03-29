import { describe, it, expect, beforeAll } from "vitest";
import { SELF, applyMigrations, authHeader } from "./helpers";

describe("Auth API", () => {
  beforeAll(async () => {
    await applyMigrations();
  });

  describe("POST /api/auth/register", () => {
    it("registers and rejects duplicate in sequence", async () => {
      // First registration succeeds
      const res1 = await SELF.fetch("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "reg@test.com", password: "Test1234", name: "Reg User" }),
      });
      expect(res1.status).toBe(201);
      const data = await res1.json() as Record<string, string>;
      expect(data.access_token).toBeDefined();
      expect(data.refresh_token).toBeDefined();

      // Profile is accessible
      const meRes = await SELF.fetch("http://localhost/api/users/me", {
        headers: authHeader(data.access_token),
      });
      expect(meRes.status).toBe(200);
      const me = await meRes.json() as Record<string, unknown>;
      expect(me.email).toBe("reg@test.com");

      // Duplicate registration fails
      const res2 = await SELF.fetch("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "reg@test.com", password: "Test1234", name: "Dup" }),
      });
      expect(res2.status).toBe(409);
      const err = await res2.json() as { error: { code: string } };
      expect(err.error.code).toBe("CONFLICT");
    });

    it("rejects password shorter than 8 chars", async () => {
      const res = await SELF.fetch("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "short@test.com", password: "Ab1", name: "Short" }),
      });
      expect(res.status).toBe(400);
    });

    it("rejects password without uppercase", async () => {
      const res = await SELF.fetch("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "noup@test.com", password: "test12345", name: "NoUp" }),
      });
      expect(res.status).toBe(400);
    });

    it("rejects password without digit", async () => {
      const res = await SELF.fetch("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "nodig@test.com", password: "Testabcde", name: "NoDig" }),
      });
      expect(res.status).toBe(400);
    });

    it("rejects invalid email format", async () => {
      const res = await SELF.fetch("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "notanemail", password: "Test1234", name: "Bad" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    it("register → login → wrong password → non-existent email", async () => {
      // Register
      await SELF.fetch("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "login@test.com", password: "Test1234", name: "Login" }),
      });

      // Correct credentials
      const res1 = await SELF.fetch("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "login@test.com", password: "Test1234" }),
      });
      expect(res1.status).toBe(200);
      const data = await res1.json() as Record<string, string>;
      expect(data.access_token).toBeDefined();
      expect(data.refresh_token).toBeDefined();

      // Wrong password
      const res2 = await SELF.fetch("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "login@test.com", password: "WrongPass1" }),
      });
      expect(res2.status).toBe(401);

      // Non-existent email
      const res3 = await SELF.fetch("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "nonexist@test.com", password: "Test1234" }),
      });
      expect(res3.status).toBe(401);
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("issues new access token with valid refresh token", async () => {
      const regRes = await SELF.fetch("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "refresh@test.com", password: "Test1234", name: "Refresh" }),
      });
      const { refresh_token } = await regRes.json() as { refresh_token: string };

      const res = await SELF.fetch("http://localhost/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token }),
      });
      expect(res.status).toBe(200);
      const data = await res.json() as { access_token: string };
      expect(data.access_token).toBeDefined();
    });

    it("rejects invalid refresh token", async () => {
      const res = await SELF.fetch("http://localhost/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: "invalid.token.here" }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe("Forgot/Reset password", () => {
    it("full flow: register → forgot → reset → login with new → old fails", async () => {
      await SELF.fetch("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "forgot@test.com", password: "Test1234", name: "Forgot" }),
      });

      const forgotRes = await SELF.fetch("http://localhost/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "forgot@test.com" }),
      });
      expect(forgotRes.status).toBe(200);
      const forgotData = await forgotRes.json() as { reset_link?: string };
      expect(forgotData.reset_link).toBeDefined();
      const token = forgotData.reset_link!.split("token=")[1];

      // Reset
      const resetRes = await SELF.fetch("http://localhost/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: "NewPass123" }),
      });
      expect(resetRes.status).toBe(200);

      // New password works
      const loginRes = await SELF.fetch("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "forgot@test.com", password: "NewPass123" }),
      });
      expect(loginRes.status).toBe(200);

      // Old password fails
      const oldRes = await SELF.fetch("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "forgot@test.com", password: "Test1234" }),
      });
      expect(oldRes.status).toBe(401);

      // Token is single-use (second use fails)
      const reuse = await SELF.fetch("http://localhost/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: "Third1234" }),
      });
      expect(reuse.status).toBe(400);
    });

    it("returns success for non-existent email (no leak)", async () => {
      const res = await SELF.fetch("http://localhost/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "nobody@test.com" }),
      });
      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, string>;
      expect(data.reset_link).toBeUndefined();
    });
  });
});
