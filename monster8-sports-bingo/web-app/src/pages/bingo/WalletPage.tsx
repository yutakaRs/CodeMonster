import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../lib/api";

interface Transaction { id: string; type: string; amount: number; balance_after: number; description: string | null; created_at: string }
const DEPOSIT_AMOUNTS = [100, 500, 1000, 5000];

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [depositing, setDepositing] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      apiFetch<{ data: { balance: number } }>("/api/bingo/wallet"),
      apiFetch<{ data: Transaction[]; pagination: { total_pages: number } }>(`/api/bingo/wallet/transactions?page=${page}&limit=15`),
    ])
      .then(([w, t]) => { setBalance(w.data.balance); setTransactions(t.data); setTotalPages(t.pagination.total_pages); })
      .catch(() => {}).finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const deposit = async (amount: number) => {
    setDepositing(true);
    try { await apiFetch("/api/bingo/wallet/deposit", { method: "POST", body: JSON.stringify({ amount }) }); fetchData(); }
    catch { /* ignore */ } finally { setDepositing(false); }
  };

  if (loading && !balance) return <div className="text-center py-8 text-[#a89890]">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-amber-400">Wallet</h1>

      <div className="bg-gradient-to-br from-[#3d3330] to-[#2a2220] border border-[#4a3f3b] rounded-2xl p-8 text-center mb-6">
        <p className="text-[#a89890] text-sm mb-1">Balance</p>
        <p className="text-5xl font-bold text-amber-400">{(balance / 100).toLocaleString()}</p>
        <p className="text-[#a89890] text-sm mt-1">TWD</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8">
        {DEPOSIT_AMOUNTS.map((amt) => (
          <button key={amt} onClick={() => deposit(amt)} disabled={depositing}
            className="py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl disabled:opacity-50 border border-emerald-600">
            +{amt} TWD
          </button>
        ))}
      </div>

      <h2 className="text-lg font-bold mb-2 text-[#faf5f0]">Transactions</h2>
      <div className="space-y-2">
        {transactions.map((t) => (
          <div key={t.id} className="bg-[#2a2220] border border-[#4a3f3b] rounded-xl p-3 flex justify-between items-center">
            <div>
              <span className={`text-sm font-bold ${t.amount > 0 ? "text-emerald-400" : "text-red-400"}`}>
                {t.amount > 0 ? "+" : ""}{(t.amount / 100).toFixed(0)} TWD
              </span>
              <span className="ml-2 text-xs bg-[#3d3330] text-[#a89890] px-2 py-0.5 rounded">{t.type}</span>
              {t.description && <p className="text-xs text-[#5a4f4b] mt-0.5">{t.description}</p>}
            </div>
            <span className="text-xs text-[#5a4f4b]">{new Date(t.created_at).toLocaleString()}</span>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 bg-[#2a2220] rounded border border-[#4a3f3b] disabled:opacity-50 text-[#a89890]">Prev</button>
          <span className="px-3 py-1 text-[#a89890]">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 bg-[#2a2220] rounded border border-[#4a3f3b] disabled:opacity-50 text-[#a89890]">Next</button>
        </div>
      )}
    </div>
  );
}
