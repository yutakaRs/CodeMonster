import { Env } from "../types";
import { authenticateRequest } from "../middleware/auth";
import { JwtPayload } from "../utils/jwt";
import { BAD_REQUEST, NOT_FOUND, INTERNAL_ERROR } from "../utils/errors";

export async function handleBingoWalletRoutes(
  request: Request,
  env: Env,
): Promise<Response> {
  // All wallet routes require auth
  const authResult = await authenticateRequest(request, env);
  if (authResult instanceof Response) return authResult;
  const user = authResult as JwtPayload;

  const url = new URL(request.url);
  const path = url.pathname;

  // GET /api/bingo/wallet — get balance
  if (path === "/api/bingo/wallet" && request.method === "GET") {
    return handleGetWallet(env, user.sub);
  }

  // POST /api/bingo/wallet/deposit — simulate deposit
  if (path === "/api/bingo/wallet/deposit" && request.method === "POST") {
    return handleDeposit(request, env, user.sub);
  }

  // GET /api/bingo/wallet/transactions — transaction history
  if (path === "/api/bingo/wallet/transactions" && request.method === "GET") {
    const page = Math.max(parseInt(url.searchParams.get("page") || "1"), 1);
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") || "20"),
      50,
    );
    return handleTransactions(env, user.sub, page, limit);
  }

  return NOT_FOUND();
}

async function getOrCreateWallet(
  env: Env,
  userId: string,
): Promise<{ id: string; balance: number }> {
  const existing = await env.DB.prepare(
    "SELECT id, balance FROM wallets WHERE user_id = ?",
  )
    .bind(userId)
    .first<{ id: string; balance: number }>();

  if (existing) return existing;

  // Auto-create wallet with 0 balance
  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO wallets (id, user_id, balance) VALUES (?, ?, 0)",
  )
    .bind(id, userId)
    .run();

  return { id, balance: 0 };
}

async function handleGetWallet(env: Env, userId: string): Promise<Response> {
  const wallet = await getOrCreateWallet(env, userId);
  return Response.json({
    data: {
      balance: wallet.balance,
      balance_display: `${(wallet.balance / 100).toFixed(0)} TWD`,
    },
  });
}

async function handleDeposit(
  request: Request,
  env: Env,
  userId: string,
): Promise<Response> {
  const body = await request.json<{ amount: number }>();
  const amountTwd = body.amount;

  if (!amountTwd || amountTwd <= 0 || amountTwd > 100000) {
    return BAD_REQUEST("Amount must be between 1 and 100,000 TWD");
  }

  const amountCents = Math.round(amountTwd * 100);
  const wallet = await getOrCreateWallet(env, userId);
  const newBalance = wallet.balance + amountCents;
  const txnId = crypto.randomUUID();

  await env.DB.batch([
    env.DB.prepare("UPDATE wallets SET balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(
      newBalance,
      wallet.id,
    ),
    env.DB.prepare(
      "INSERT INTO transactions (id, wallet_id, type, amount, balance_after, description) VALUES (?, ?, 'deposit', ?, ?, ?)",
    ).bind(txnId, wallet.id, amountCents, newBalance, `Deposit ${amountTwd} TWD`),
  ]);

  return Response.json({
    data: {
      balance: newBalance,
      balance_display: `${(newBalance / 100).toFixed(0)} TWD`,
      transaction_id: txnId,
    },
  });
}

async function handleTransactions(
  env: Env,
  userId: string,
  page: number,
  limit: number,
): Promise<Response> {
  const wallet = await getOrCreateWallet(env, userId);
  const offset = (page - 1) * limit;

  const [txns, countResult] = await Promise.all([
    env.DB.prepare(
      "SELECT id, type, amount, balance_after, ref_type, ref_id, description, created_at FROM transactions WHERE wallet_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
    )
      .bind(wallet.id, limit, offset)
      .all<{
        id: string;
        type: string;
        amount: number;
        balance_after: number;
        ref_type: string | null;
        ref_id: string | null;
        description: string | null;
        created_at: string;
      }>(),
    env.DB.prepare(
      "SELECT COUNT(*) as total FROM transactions WHERE wallet_id = ?",
    )
      .bind(wallet.id)
      .first<{ total: number }>(),
  ]);

  const total = countResult?.total || 0;

  return Response.json({
    data: txns.results,
    pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
  });
}

// Exported for use by bet placement
export { getOrCreateWallet };
