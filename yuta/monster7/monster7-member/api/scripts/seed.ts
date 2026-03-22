/**
 * Seed script: Creates initial admin account
 *
 * Usage:
 *   npx tsx scripts/seed.ts [--env staging|production] [--remote]
 *
 * Default: local staging database
 * Use --remote to seed the remote database
 */

import { execSync } from "child_process";

const env = process.argv.includes("--env")
  ? process.argv[process.argv.indexOf("--env") + 1]
  : "staging";
const remote = process.argv.includes("--remote") ? "--remote" : "--local";

const ADMIN_EMAIL = "admin@monster7.dev";
const ADMIN_PASSWORD = "Admin123";
const ADMIN_NAME = "Admin";

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits", "deriveKey"],
  );
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt"],
  );
  const hash = await crypto.subtle.exportKey("raw", key) as ArrayBuffer;

  const toHex = (bytes: Uint8Array) => Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return `${toHex(salt)}:${toHex(new Uint8Array(hash))}`;
}

async function main() {
  console.log(`Seeding ${env} database (${remote})...`);

  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  const id = "00000000-0000-0000-0000-000000000001";
  const now = new Date().toISOString();

  const sql = `INSERT OR IGNORE INTO users (id, email, password_hash, name, role, is_active, created_at, updated_at) VALUES ('${id}', '${ADMIN_EMAIL}', '${passwordHash}', '${ADMIN_NAME}', 'admin', 1, '${now}', '${now}');`;

  try {
    execSync(
      `npx wrangler d1 execute DB --env ${env} ${remote} --command "${sql}"`,
      { stdio: "inherit" },
    );
    console.log(`\nAdmin account created:`);
    console.log(`  Email: ${ADMIN_EMAIL}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
    console.log(`  Role: admin`);
  } catch (e) {
    console.error("Seed failed:", e);
    process.exit(1);
  }
}

main();
