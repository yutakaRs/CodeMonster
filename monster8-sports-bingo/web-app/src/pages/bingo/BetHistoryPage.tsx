import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../lib/api";
import NumberBall from "../../components/NumberBall";

interface Bet {
  id: string; round_id: string; play_type: string; selected_numbers: number[];
  selected_side: string | null; multiplier: number; unit_count: number;
  total_cost: number; matched_count: number | null; payout_amount: number;
  status: string; created_at: string;
}

const STATUS_FILTERS = ["all", "pending", "won", "lost"];

export default function BetHistoryPage() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchBets = useCallback(() => {
    setLoading(true);
    const statusParam = filter === "all" ? "" : `&status=${filter}`;
    apiFetch<{ data: Bet[]; pagination: { total_pages: number } }>(`/api/bingo/bets/mine?page=${page}&limit=10${statusParam}`)
      .then((r) => { setBets(r.data); setTotalPages(r.pagination.total_pages); })
      .catch(() => setBets([]))
      .finally(() => setLoading(false));
  }, [filter, page]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchBets(); }, [fetchBets]);

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-amber-400">My Bets</h1>

      <div className="flex gap-2 mb-4">
        {STATUS_FILTERS.map((f) => (
          <button key={f} onClick={() => { setFilter(f); setPage(1); }}
            className={`px-3 py-1 rounded-lg text-sm capitalize ${filter === f ? "bg-amber-500 text-black font-bold" : "bg-[#2a2220] text-[#a89890] border border-[#4a3f3b]"}`}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-[#a89890]">Loading...</div>
      ) : bets.length === 0 ? (
        <div className="text-center py-8 text-[#5a4f4b]">No bets found</div>
      ) : (
        <div className="space-y-3">
          {bets.map((bet) => (
            <div key={bet.id}
              className={`bg-[#2a2220] border rounded-xl p-4 ${bet.status === "won" ? "border-emerald-500/50" : "border-[#4a3f3b]"}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-sm text-[#a89890]">Round {bet.round_id}</span>
                  <span className="ml-2 text-xs bg-[#3d3330] text-[#a89890] px-2 py-0.5 rounded">{bet.play_type}</span>
                </div>
                <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                  bet.status === "won" ? "bg-emerald-600/20 text-emerald-400" :
                  bet.status === "lost" ? "bg-red-600/20 text-red-400" :
                  "bg-[#3d3330] text-[#a89890]"
                }`}>{bet.status.toUpperCase()}</span>
              </div>

              {bet.selected_numbers.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {bet.selected_numbers.map((n) => <NumberBall key={n} number={n} size="sm" />)}
                </div>
              )}
              {bet.selected_side && <p className="text-sm text-[#a89890] mb-2">Side: {bet.selected_side}</p>}

              <div className="flex justify-between text-sm text-[#a89890]">
                <span>Cost: {bet.total_cost / 100} TWD (x{bet.multiplier})</span>
                {bet.status === "won" && <span className="text-emerald-400 font-bold">+{bet.payout_amount / 100} TWD</span>}
              </div>
            </div>
          ))}
        </div>
      )}

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
