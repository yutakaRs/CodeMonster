import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { apiFetch } from "../../lib/api";

interface OddEntry { odds: string; available: boolean }
interface EventData {
  eventID: string; leagueID: string;
  teams?: { home?: { names: { long: string } }; away?: { names: { long: string } } };
  status?: { startsAt?: string; started?: boolean; ended?: boolean };
  odds?: Record<string, { byBookmaker?: Record<string, OddEntry> }>;
}

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    apiFetch<{ data: EventData[] }>(`/api/sports/events/${eventId}`)
      .then((r) => setEvent(Array.isArray(r.data) ? r.data[0] : r.data))
      .catch(() => setError("Failed to load event"))
      .finally(() => setLoading(false));
  }, [eventId]);

  if (loading) return <div className="text-center py-8 text-[#a89890]">Loading...</div>;
  if (error) return <div className="text-center py-8 text-red-400">{error}</div>;
  if (!event) return <div className="text-center py-8 text-[#a89890]">Event not found</div>;

  const mlHome = event.odds?.["points-home-game-ml-home"]?.byBookmaker || {};
  const chartData = Object.entries(mlHome).filter(([, v]) => v.available).map(([bk, v]) => ({ bookmaker: bk, odds: parseInt(v.odds) || 0 })).slice(0, 8);

  return (
    <div className="max-w-3xl mx-auto p-4">
      <button onClick={() => navigate("/sports")} className="text-amber-400 hover:underline mb-4 block">&larr; Back</button>

      <div className="bg-[#2a2220] border border-[#4a3f3b] rounded-xl p-6 mb-6">
        <div className="text-xs text-[#a89890] mb-2">{event.leagueID}</div>
        <div className="text-center">
          <span className="text-xl font-bold text-[#faf5f0]">{event.teams?.home?.names?.long ?? "TBD"}</span>
          <span className="mx-4 text-[#5a4f4b]">vs</span>
          <span className="text-xl font-bold text-[#faf5f0]">{event.teams?.away?.names?.long ?? "TBD"}</span>
        </div>
        <div className="text-center text-sm text-[#a89890] mt-2">
          {event.status?.startsAt ? new Date(event.status.startsAt).toLocaleString() : ""}
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="bg-[#2a2220] border border-[#4a3f3b] rounded-xl p-4 mb-6">
          <h2 className="text-lg font-bold mb-4 text-[#faf5f0]">Moneyline Odds (Home)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <XAxis dataKey="bookmaker" tick={{ fill: "#a89890", fontSize: 11 }} />
              <YAxis tick={{ fill: "#a89890" }} />
              <Tooltip contentStyle={{ background: "#2a2220", border: "1px solid #4a3f3b", borderRadius: 8, color: "#faf5f0" }} />
              <Bar dataKey="odds" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {Object.keys(mlHome).length > 0 && (
        <div className="bg-[#2a2220] border border-[#4a3f3b] rounded-xl p-4">
          <h2 className="text-lg font-bold mb-2 text-[#faf5f0]">Bookmaker Odds</h2>
          <table className="w-full text-sm">
            <thead><tr className="text-[#a89890] border-b border-[#4a3f3b]"><th className="py-2 text-left">Bookmaker</th><th className="text-right">Odds</th></tr></thead>
            <tbody>
              {Object.entries(mlHome).map(([bk, v]) => (
                <tr key={bk} className="border-b border-[#4a3f3b]/50">
                  <td className="py-2 text-[#faf5f0]">{bk}</td>
                  <td className="text-right font-mono text-amber-400">{v.odds}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
