import { describe, it, expect, beforeAll } from "vitest";
import { SELF, applyMigrations } from "./helpers";

describe("GET /health", () => {
  beforeAll(async () => {
    await applyMigrations();
  });

  it("returns ok with db status", async () => {
    const res = await SELF.fetch("http://localhost/health");
    expect(res.status).toBe(200);
    const data = await res.json() as Record<string, unknown>;
    expect(data.status).toBe("ok");
    expect(data.db).toBe("ok");
    expect(data.timestamp).toBeDefined();
  });
});
