import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../lib/api";
import Countdown from "../../components/Countdown";
import NumberBall from "../../components/NumberBall";

interface CurrentRound {
  next_round: { round_id: string; draw_time: string; seconds_until_draw: number };
  last_draw: { round_id: string; numbers: number[]; super_number: number } | null;
  server_time: string;
}

export default function DrawHallPage() {
  const [data, setData] = useState<CurrentRound | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAnimation, setShowAnimation] = useState(false);

  const fetchCurrent = useCallback(() => {
    setLoading(true);
    apiFetch<{ data: CurrentRound }>("/api/bingo/draws/current")
      .then((r) => { setData(r.data); setShowAnimation(true); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchCurrent(); }, [fetchCurrent]);

  if (loading && !data) return <div className="text-center py-16 text-[#a89890]">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 text-center">
      <h1 className="text-3xl font-bold mb-2 text-amber-400">Bingo Bingo</h1>

      {data && (
        <>
          <div className="bg-[#2a2220] border border-[#4a3f3b] rounded-2xl p-6 mb-6">
            <p className="text-[#a89890] text-sm mb-1">Next Draw: {data.next_round.round_id}</p>
            <Countdown secondsLeft={data.next_round.seconds_until_draw} onExpired={fetchCurrent} />
          </div>

          {data.last_draw && (
            <div className="bg-[#2a2220] border border-[#4a3f3b] rounded-2xl p-6 mb-6">
              <p className="text-[#a89890] text-sm mb-3">Last Draw: {data.last_draw.round_id}</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {data.last_draw.numbers.map((n, i) => (
                  <NumberBall key={n} number={n} isSuper={i === 19} isAnimated={showAnimation} delay={i * 100} />
                ))}
              </div>
              <p className="text-amber-400 text-sm mt-3">Super Number: {data.last_draw.super_number}</p>
            </div>
          )}

          <Link to="/bingo/bet"
            className="inline-block px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-xl hover:from-amber-400 hover:to-orange-400 text-lg shadow-lg">
            Quick Bet
          </Link>
        </>
      )}
    </div>
  );
}
