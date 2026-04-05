import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../lib/api";

const SPORTS = [
  { id: "BASKETBALL", name: "Basketball" }, { id: "FOOTBALL", name: "Football" },
  { id: "BASEBALL", name: "Baseball" }, { id: "SOCCER", name: "Soccer" }, { id: "HOCKEY", name: "Hockey" },
];

interface League { leagueID: string; name: string }
interface EventTeam { teamID: string; names: { long: string; short: string } }
interface SportsEvent {
  eventID: string; leagueID: string;
  teams?: { home?: EventTeam; away?: EventTeam };
  status?: { startsAt?: string; started?: boolean; ended?: boolean };
}

export default function SportsPage() {
  const [sportID, setSportID] = useState("BASKETBALL");
  const [leagues, setLeagues] = useState<League[]>([]);
  const [leagueID, setLeagueID] = useState("");
  const [events, setEvents] = useState<SportsEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ data: League[] }>(`/api/sports/leagues?sportID=${sportID}`)
      .then((r) => { setLeagues(r.data); if (r.data.length > 0) setLeagueID(r.data[0].leagueID); })
      .catch(() => setLeagues([]));
  }, [sportID]);

  const fetchEvents = useCallback(() => {
    if (!leagueID) return;
    setLoading(true); setError("");
    apiFetch<{ data: SportsEvent[] }>(`/api/sports/events?leagueID=${leagueID}&oddsAvailable=true&limit=10`)
      .then((r) => setEvents(r.data))
      .catch(() => setError("Failed to load events"))
      .finally(() => setLoading(false));
  }, [leagueID]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-amber-400">Sports Data</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        {SPORTS.map((s) => (
          <button key={s.id} onClick={() => setSportID(s.id)}
            className={`px-4 py-2 rounded-lg ${sportID === s.id ? "bg-amber-500 text-black font-bold" : "bg-[#2a2220] text-[#a89890] border border-[#4a3f3b] hover:border-amber-600"}`}>
            {s.name}
          </button>
        ))}
      </div>

      {leagues.length > 0 && (
        <select value={leagueID} onChange={(e) => setLeagueID(e.target.value)}
          className="mb-4 px-3 py-2 bg-[#3d3330] text-[#faf5f0] rounded-lg border border-[#4a3f3b]">
          {leagues.map((l) => <option key={l.leagueID} value={l.leagueID}>{l.name}</option>)}
        </select>
      )}

      {loading && <div className="text-center py-8 text-[#a89890]">Loading...</div>}
      {error && (
        <div className="text-center py-8">
          <p className="text-red-400 mb-2">{error}</p>
          <button onClick={fetchEvents} className="px-4 py-2 bg-amber-600 rounded-lg text-white">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((ev) => (
          <Link key={ev.eventID} to={`/sports/events/${ev.eventID}`}
            className="block bg-[#2a2220] border border-[#4a3f3b] rounded-xl p-4 hover:border-amber-600 transition">
            <div className="text-xs text-[#a89890] mb-2">{ev.leagueID}</div>
            <div className="font-bold text-[#faf5f0]">{ev.teams?.home?.names?.long ?? "TBD"}</div>
            <div className="text-sm text-[#5a4f4b] my-1">vs</div>
            <div className="font-bold text-[#faf5f0]">{ev.teams?.away?.names?.long ?? "TBD"}</div>
            <div className="text-xs text-[#a89890] mt-2">
              {ev.status?.startsAt ? new Date(ev.status.startsAt).toLocaleString() : ""}
              {ev.status?.started && !ev.status?.ended && (
                <span className="ml-2 px-2 py-0.5 bg-red-600 text-white rounded text-xs">LIVE</span>
              )}
              {ev.status?.ended && <span className="ml-2 text-[#5a4f4b]">Final</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
