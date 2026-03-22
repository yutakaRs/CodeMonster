-- Seed script: Create initial admin account
-- Password: Admin123 (PBKDF2 hashed)
-- Run: wrangler d1 execute DB --env staging --file scripts/seed.sql

INSERT OR IGNORE INTO users (id, email, password_hash, name, role, is_active, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@monster7.dev',
  -- This is a placeholder. Use the seed.ts script to generate a proper hash.
  'SEED_PLACEHOLDER',
  'Admin',
  'admin',
  1,
  datetime('now'),
  datetime('now')
);
