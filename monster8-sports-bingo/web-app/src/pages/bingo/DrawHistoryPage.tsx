import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { apiFetch } from "../../lib/api";
import NumberBall from "../../components/NumberBall";

interface Draw { round_id: string; draw_time: string; numbers: number[]; super_number: number }
interface FreqData { periods_analyzed: number; frequency: Record<string, number>; hot: { number: number; count: number }[]; cold: { number: number; count: number }[] }
interface RatioData { periods_analyzed: number; big?: number; small?: number; odd?: number; even?: number; no_winner: number }

const PIE_COLORS = ["#f59e0b", "#ea580c", "#78716c"];

export default function DrawHistoryPage() {
  const [draws, setDraws] = useState<Draw[]>([]);
  const [freq, setFreq] = useState<FreqData | null>(null);
  const [bigSmall, setBigSmall] = useState<RatioData | null>(null);
  const [oddEven, setOddEven] = useState<RatioData | null>(null);
  const [periods, setPeriods] = useState(50);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    Promise.all([
      apiFetch<{ data: Draw[] }>("/api/bingo/draws/latest?limit=20"),
      apiFetch<{ data: FreqData }>(`/api/bingo/stats/frequency?periods=${periods}`),
      apiFetch<{ data: RatioData }>(`/api/bingo/stats/big-small?periods=${periods}`),
      apiFetch<{ data: RatioData }>(`/api/bingo/stats/odd-even?periods=${periods}`),
    ])
      .then(([d, f, bs, oe]) => { setDraws(d.data); setFreq(f.data); setBigSmall(bs.data); setOddEven(oe.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [periods]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-[#a89890] text-sm">Loading draw history...</span>
        </div>
      </div>
    );
  }

  const freqChart = freq ? Object.entries(freq.frequency).map(([num, count]) => ({ num: Number(num), count })).sort((a, b) => a.num - b.num) : [];

  const hottest = freq?.hot?.[0];
  const coldest = freq?.cold?.[0];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6">

      {/* ── Header + Period Selector ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-amber-400 tracking-tight">Draw History</h1>
          <p className="text-sm text-[#a89890] mt-0.5">Statistics &amp; recent draw results</p>
        </div>
        <div className="flex items-center gap-1.5 bg-[#2a2220] rounded-lg p-1 border border-[#4a3f3b]">
          {[20, 50, 100].map((p) => (
            <button
              key={p}
              onClick={() => setPeriods(p)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                periods === p
                  ? "bg-amber-500 text-black shadow-sm"
                  : "text-[#a89890] hover:text-[#faf5f0] hover:bg-[#3a3230]"
              }`}
            >
              Last {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#2a2220] border border-[#4a3f3b] rounded-xl p-4">
          <p className="text-xs text-[#a89890] uppercase tracking-wider">Periods Analyzed</p>
          <p className="text-2xl font-bold text-[#faf5f0] mt-1">{freq?.periods_analyzed ?? "—"}</p>
        </div>
        <div className="bg-[#2a2220] border border-[#4a3f3b] rounded-xl p-4">
          <p className="text-xs text-[#a89890] uppercase tracking-wider">Recent Draws</p>
          <p className="text-2xl font-bold text-[#faf5f0] mt-1">{draws.length}</p>
        </div>
        <div className="bg-[#2a2220] border border-[#4a3f3b] rounded-xl p-4">
          <p className="text-xs text-[#a89890] uppercase tracking-wider">Hottest Number</p>
          <div className="flex items-center gap-2 mt-1">
            {hottest ? (
              <>
                <span className="text-2xl font-bold text-amber-400">#{hottest.number}</span>
                <span className="text-xs text-[#a89890]">({hottest.count}x)</span>
              </>
            ) : <span className="text-2xl font-bold text-[#faf5f0]">—</span>}
          </div>
        </div>
        <div className="bg-[#2a2220] border border-[#4a3f3b] rounded-xl p-4">
          <p className="text-xs text-[#a89890] uppercase tracking-wider">Coldest Number</p>
          <div className="flex items-center gap-2 mt-1">
            {coldest ? (
              <>
                <span className="text-2xl font-bold text-orange-400">#{coldest.number}</span>
                <span className="text-xs text-[#a89890]">({coldest.count}x)</span>
              </>
            ) : <span className="text-2xl font-bold text-[#faf5f0]">—</span>}
          </div>
        </div>
      </div>

      {/* ── Main 2-Column Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left Column (2/3 width) ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Number Frequency Chart */}
          {freqChart.length > 0 && (
            <div className="bg-[#2a2220] border border-[#4a3f3b] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#faf5f0]">Number Frequency</h2>
                <span className="text-xs text-[#a89890] bg-[#1a1412] px-2.5 py-1 rounded-full">
                  Last {freq?.periods_analyzed} draws
                </span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={freqChart} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                  <XAxis
                    dataKey="num"
                    tick={{ fontSize: 9, fill: "#a89890" }}
                    interval={3}
                    axisLine={{ stroke: "#4a3f3b" }}
                    tickLine={{ stroke: "#4a3f3b" }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#a89890" }}
                    axisLine={{ stroke: "#4a3f3b" }}
                    tickLine={{ stroke: "#4a3f3b" }}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(245,158,11,0.08)" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const d = payload[0].payload as { num: number; count: number };
                      return (
                        <div className="bg-[#1a1412] border border-[#4a3f3b] rounded-lg px-3 py-2 text-sm shadow-xl">
                          <p className="text-[#faf5f0] font-bold">No. {d.num}</p>
                          <p className="text-amber-400">{d.count} times</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Recent Draws Table */}
          <div className="bg-[#2a2220] border border-[#4a3f3b] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#4a3f3b]">
              <h2 className="text-lg font-bold text-[#faf5f0]">Recent Draws</h2>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-[#231e1c] z-10">
                  <tr className="text-xs text-[#a89890] uppercase tracking-wider">
                    <th className="text-left px-5 py-2.5 font-medium">Round</th>
                    <th className="text-left px-5 py-2.5 font-medium">Time</th>
                    <th className="text-left px-5 py-2.5 font-medium">Numbers</th>
                    <th className="text-right px-5 py-2.5 font-medium">Super</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3a3230]">
                  {draws.map((d) => {
                    const regularNums = d.numbers.slice(0, 19);
                    const superNum = d.numbers[19] ?? d.super_number;
                    return (
                      <tr
                        key={d.round_id}
                        className="hover:bg-[#2f2926] transition-colors"
                      >
                        <td className="px-5 py-3 text-sm font-mono text-[#faf5f0] whitespace-nowrap">
                          {d.round_id}
                        </td>
                        <td className="px-5 py-3 text-xs text-[#a89890] whitespace-nowrap">
                          {d.draw_time
                            ? new Date(d.draw_time).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-[3px]">
                            {regularNums.map((n) => (
                              <span
                                key={n}
                                className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#3a3230] text-[10px] font-semibold text-[#faf5f0]"
                              >
                                {n}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {superNum != null && (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-yellow-300 text-black text-xs font-bold shadow-[0_0_8px_rgba(245,158,11,0.4)]">
                              {superNum}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Right Column (1/3 width) ── */}
        <div className="space-y-6">

          {/* Big / Small Pie */}
          {bigSmall && (
            <div className="bg-[#2a2220] border border-[#4a3f3b] rounded-xl p-5">
              <h2 className="text-base font-bold text-[#faf5f0] mb-1">Big / Small</h2>
              <p className="text-xs text-[#a89890] mb-3">
                Distribution across {bigSmall.periods_analyzed} draws
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Big", value: bigSmall.big || 0 },
                      { name: "Small", value: bigSmall.small || 0 },
                      { name: "None", value: bigSmall.no_winner },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {PIE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {[
                  { label: "Big", color: PIE_COLORS[0], val: bigSmall.big || 0 },
                  { label: "Small", color: PIE_COLORS[1], val: bigSmall.small || 0 },
                  { label: "None", color: PIE_COLORS[2], val: bigSmall.no_winner },
                ].map(({ label, color, val }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs text-[#a89890]">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    {label} ({val})
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Odd / Even Pie */}
          {oddEven && (
            <div className="bg-[#2a2220] border border-[#4a3f3b] rounded-xl p-5">
              <h2 className="text-base font-bold text-[#faf5f0] mb-1">Odd / Even</h2>
              <p className="text-xs text-[#a89890] mb-3">
                Distribution across {oddEven.periods_analyzed} draws
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Odd", value: oddEven.odd || 0 },
                      { name: "Even", value: oddEven.even || 0 },
                      { name: "None", value: oddEven.no_winner },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {PIE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {[
                  { label: "Odd", color: PIE_COLORS[0], val: oddEven.odd || 0 },
                  { label: "Even", color: PIE_COLORS[1], val: oddEven.even || 0 },
                  { label: "None", color: PIE_COLORS[2], val: oddEven.no_winner },
                ].map(({ label, color, val }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs text-[#a89890]">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    {label} ({val})
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hot Numbers */}
          {freq?.hot && freq.hot.length > 0 && (
            <div className="bg-[#2a2220] border border-[#4a3f3b] rounded-xl p-5">
              <h2 className="text-base font-bold text-[#faf5f0] mb-3">
                <span className="text-amber-400">Hot</span> Numbers
              </h2>
              <div className="space-y-2">
                {freq.hot.slice(0, 5).map(({ number, count }, i) => (
                  <div key={number} className="flex items-center gap-3">
                    <span className="text-xs text-[#a89890] w-4 text-right">{i + 1}.</span>
                    <NumberBall number={number} size="sm" />
                    <div className="flex-1 h-1.5 bg-[#1a1412] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{
                          width: `${(count / (freq.hot[0]?.count || 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-mono text-[#a89890] w-8 text-right">{count}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cold Numbers */}
          {freq?.cold && freq.cold.length > 0 && (
            <div className="bg-[#2a2220] border border-[#4a3f3b] rounded-xl p-5">
              <h2 className="text-base font-bold text-[#faf5f0] mb-3">
                <span className="text-orange-400">Cold</span> Numbers
              </h2>
              <div className="space-y-2">
                {freq.cold.slice(0, 5).map(({ number, count }, i) => (
                  <div key={number} className="flex items-center gap-3">
                    <span className="text-xs text-[#a89890] w-4 text-right">{i + 1}.</span>
                    <NumberBall number={number} size="sm" />
                    <div className="flex-1 h-1.5 bg-[#1a1412] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{
                          width: `${Math.max((count / (freq.hot[0]?.count || 1)) * 100, 8)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-mono text-[#a89890] w-8 text-right">{count}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
