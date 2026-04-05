export interface Env {
  DB: D1Database;
  AUTH_DB: D1Database;
  KV: KVNamespace;
  JWT_SECRET: string;
  CORS_ORIGIN: string;
  ENVIRONMENT: string;
  SPORTSGAMEODDS_API_KEY: string;
  AUTH_API_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}
