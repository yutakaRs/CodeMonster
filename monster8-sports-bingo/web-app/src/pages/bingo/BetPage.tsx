import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";
import BingoBoard from "../../components/BingoBoard";
import { getStarProbabilities, getBigSmallProbability, getSuperProbability } from "../../lib/hypergeometric";

const STAR_PAYOUTS: Record<number, Record<number, number>> = {
  1: { 1: 2 }, 2: { 2: 3, 1: 1 }, 3: { 3: 20, 2: 2 },
  4: { 4: 40, 3: 4, 2: 1 }, 5: { 5: 300, 4: 20, 3: 2 },
  6: { 6: 1000, 5: 40, 4: 8, 3: 1 }, 7: { 7: 3200, 6: 120, 5: 12, 4: 2, 3: 1 },
  8: { 8: 20000, 7: 800, 6: 40, 5: 8, 4: 1, 0: 1 },
  9: { 9: 40000, 8: 4000, 7: 120, 6: 20, 5: 4, 4: 1, 0: 1 },
  10: { 10: 200000, 9: 10000, 8: 1000, 7: 100, 6: 10, 5: 1, 0: 1 },
};

type PlayMode = "star" | "big_small" | "odd_even" | "super";

export default function BetPage() {
  const [playMode, setPlayMode] = useState<PlayMode>("star");
  const [starCount, setStarCount] = useState(5);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [selectedSides, setSelectedSides] = useState<string[]>([]);
  const [multiplier, setMultiplier] = useState(1);
  const [periods, setPeriods] = useState(1);
  const [balance, setBalance] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiFetch<{ data: { balance: number } }>("/api/bingo/wallet").then((r) => setBalance(r.data.balance)).catch(() => {});
  }, []);

  useEffect(() => { setSelectedNumbers([]); setSelectedSides([]); }, [playMode, starCount]);

  const toggleNumber = (num: number) => setSelectedNumbers((prev) => prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]);
  const toggleSide = (side: string) => setSelectedSides((prev) => prev.includes(side) ? prev.filter((s) => s !== side) : [...prev, side]);

  const quickSelect = () => {
    const max = playMode === "star" ? starCount : playMode === "super" ? 1 : 0;
    if (max === 0) return;
    const remaining = max - selectedNumbers.length;
    if (remaining <= 0) return;
    const available = Array.from({ length: 80 }, (_, i) => i + 1).filter((n) => !selectedNumbers.includes(n));
    const shuffled = available.sort(() => Math.random() - 0.5);
    setSelectedNumbers((prev) => [...prev, ...shuffled.slice(0, remaining)]);
  };

  let units = 0;
  if (playMode === "star") units = 1;
  else if (playMode === "big_small" || playMode === "odd_even") units = selectedSides.length;
  else if (playMode === "super") units = selectedNumbers.length;
  const totalCost = 25 * units * multiplier * periods;

  const handleSubmit = async () => {
    setSubmitting(true); setMessage("");
    try {
      const body: Record<string, unknown> = { play_type: playMode === "star" ? `star_${starCount}` : playMode, multiplier, periods };
      if (playMode === "star" || playMode === "super") body.selected_numbers = selectedNumbers;
      if (playMode === "big_small" || playMode === "odd_even") {
        if (selectedSides.length === 1) body.selected_side = selectedSides[0]; else body.selected_sides = selectedSides;
      }
      const result = await apiFetch<{ data: { total_cost_display: string; balance_display: string } }>("/api/bingo/bets", { method: "POST", body: JSON.stringify(body) });
      setMessage(`Bet placed! Cost: ${result.data.total_cost_display}, Balance: ${result.data.balance_display}`);
      setSelectedNumbers([]); setSelectedSides([]);
    } catch (e: unknown) {
      const err = e as { error?: { message?: string } };
      setMessage(err?.error?.message || "Bet failed");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-amber-400">Place Bet</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        {(["star", "big_small", "odd_even", "super"] as PlayMode[]).map((m) => (
          <button key={m} onClick={() => setPlayMode(m)}
            className={`px-4 py-2 rounded-lg font-medium ${playMode === m ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black" : "bg-[#2a2220] text-[#a89890] border border-[#4a3f3b]"}`}>
            {m === "star" ? "Star" : m === "big_small" ? "Big/Small" : m === "odd_even" ? "Odd/Even" : "Super"}
          </button>
        ))}
      </div>

      {playMode === "star" && (
        <div className="mb-4">
          <p className="text-xs text-[#a89890] mb-2">Select star count (pick how many numbers)</p>
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => setStarCount(n)}
                className={`w-9 h-9 rounded-lg text-sm font-bold ${starCount === n ? "bg-amber-600 text-white" : "bg-[#3d3330] text-[#a89890] hover:bg-[#4a3f3b]"}`}>
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {(playMode === "star" || playMode === "super") && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-[#a89890]">
              {playMode === "star"
                ? `Pick ${starCount} number${starCount > 1 ? "s" : ""}`
                : "Pick 1-20 numbers (each = 1 unit)"}
              <span className="ml-2 text-amber-400 font-bold">
                {selectedNumbers.length} / {playMode === "star" ? starCount : 20}
              </span>
            </p>
            <div className="flex gap-2">
              {selectedNumbers.length > 0 && (
                <button onClick={() => setSelectedNumbers([])}
                  className="px-3 py-1 bg-red-600/20 text-red-400 rounded-lg text-xs hover:bg-red-600/30 border border-red-600/20">
                  Clear All
                </button>
              )}
              <button onClick={quickSelect}
                className="px-3 py-1 bg-[#3d3330] rounded-lg text-xs hover:bg-[#4a3f3b] text-[#a89890] border border-[#4a3f3b]">
                Quick Select
              </button>
            </div>
          </div>
          <BingoBoard selectedNumbers={selectedNumbers} onToggle={toggleNumber} maxSelections={playMode === "star" ? starCount : 20} />
        </div>
      )}

      {playMode === "big_small" && (
        <div className="my-6">
          <p className="text-sm text-[#a89890] mb-1">Predict: will more drawn numbers be big (41-80) or small (1-40)?</p>
          <p className="text-xs text-[#5a4f4b] mb-4">Win if your side has 13+ out of 20 drawn numbers. Can select both (= 2 units).</p>
          <div className="flex gap-4 justify-center">
            {["big", "small"].map((side) => (
              <button key={side} onClick={() => toggleSide(side)}
                className={`w-32 h-32 rounded-2xl text-3xl font-bold border-2 ${selectedSides.includes(side) ? "bg-amber-500 text-black border-amber-400" : "bg-[#2a2220] text-[#a89890] border-[#4a3f3b] hover:border-amber-600"}`}>
                {side === "big" ? "大" : "小"}
              </button>
            ))}
          </div>
        </div>
      )}

      {playMode === "odd_even" && (
        <div className="my-6">
          <p className="text-sm text-[#a89890] mb-1">Predict: will more drawn numbers be odd or even?</p>
          <p className="text-xs text-[#5a4f4b] mb-4">Win if your side has 13+ out of 20 drawn numbers. Can select both (= 2 units).</p>
          <div className="flex gap-4 justify-center">
            {["odd", "even"].map((side) => (
              <button key={side} onClick={() => toggleSide(side)}
                className={`w-32 h-32 rounded-2xl text-3xl font-bold border-2 ${selectedSides.includes(side) ? "bg-amber-500 text-black border-amber-400" : "bg-[#2a2220] text-[#a89890] border-[#4a3f3b] hover:border-amber-600"}`}>
                {side === "odd" ? "單" : "雙"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Probability Display (Hypergeometric Distribution) */}
      <div className="bg-[#2a2220] border border-[#4a3f3b] rounded-xl p-4 mt-4">
        <h3 className="text-sm font-bold text-[#a89890] mb-2 uppercase tracking-wider">Win Probability</h3>
        {playMode === "star" && (
          <div className="space-y-1">
            {getStarProbabilities(starCount)
              .filter((p) => STAR_PAYOUTS[starCount]?.[p.matched] !== undefined)
              .map((p) => (
                <div key={p.matched} className="flex justify-between text-sm">
                  <span className="text-[#a89890]">
                    Match {p.matched} → {STAR_PAYOUTS[starCount][p.matched]}x
                  </span>
                  <span className="text-amber-400 font-mono">{p.percentage}</span>
                </div>
              ))}
          </div>
        )}
        {playMode === "big_small" && (
          <div className="flex justify-between text-sm">
            <span className="text-[#a89890]">{"Win (one side ≥ 13) → 6x"}</span>
            <span className="text-amber-400 font-mono">{getBigSmallProbability().percentage}</span>
          </div>
        )}
        {playMode === "odd_even" && (
          <div className="flex justify-between text-sm">
            <span className="text-[#a89890]">{"Win (one side ≥ 13) → 6x"}</span>
            <span className="text-amber-400 font-mono">{getBigSmallProbability().percentage}</span>
          </div>
        )}
        {playMode === "super" && (
          <div className="flex justify-between text-sm">
            <span className="text-[#a89890]">Match super number → 48x</span>
            <span className="text-amber-400 font-mono">{getSuperProbability().percentage}</span>
          </div>
        )}
        <p className="text-[10px] text-[#5a4f4b] mt-2">Based on Hypergeometric Distribution: C(20,k) x C(60,n-k) / C(80,n)</p>
      </div>

      <div className="flex gap-4 mt-6 items-center flex-wrap">
        <label className="text-sm text-[#a89890]">
          Multiplier:
          <select value={multiplier} onChange={(e) => setMultiplier(Number(e.target.value))} className="ml-2 bg-[#3d3330] text-[#faf5f0] rounded px-2 py-1 border border-[#4a3f3b]">
            {Array.from({ length: 50 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}x</option>)}
          </select>
        </label>
        <label className="text-sm text-[#a89890]">
          Periods:
          <select value={periods} onChange={(e) => setPeriods(Number(e.target.value))} className="ml-2 bg-[#3d3330] text-[#faf5f0] rounded px-2 py-1 border border-[#4a3f3b]">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      <div className="bg-[#2a2220] border border-[#4a3f3b] rounded-xl p-4 mt-4">
        <div className="flex justify-between text-sm">
          <span className="text-[#a89890]">Cost: 25 x {units} x {multiplier}x x {periods}</span>
          <span className="text-amber-400 font-bold">{totalCost} TWD</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-[#a89890]">Balance</span>
          <span className="text-[#faf5f0]">{(balance / 100).toFixed(0)} TWD</span>
        </div>
      </div>

      {message && <p className={`mt-2 text-sm ${message.includes("failed") || message.includes("Insufficient") ? "text-red-400" : "text-emerald-400"}`}>{message}</p>}

      <button onClick={handleSubmit} disabled={submitting || units === 0}
        className="w-full mt-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-xl hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-lg">
        {submitting ? "Submitting..." : `Bet ${totalCost} TWD`}
      </button>
    </div>
  );
}
