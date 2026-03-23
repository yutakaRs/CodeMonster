import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

interface Stats {
  total_users: number;
  today_registrations: number;
  active_users_7d: number;
  deactivated_count: number;
  oauth_link_ratio: string;
  logins_24h: number;
}

const cardConfig: { key: keyof Stats; label: string }[] = [
  { key: "total_users", label: "Total Users" },
  { key: "today_registrations", label: "Today Registrations" },
  { key: "active_users_7d", label: "Active Users (7d)" },
  { key: "deactivated_count", label: "Deactivated" },
  { key: "oauth_link_ratio", label: "OAuth Link Ratio" },
  { key: "logins_24h", label: "Logins (24h)" },
];

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[#27272a] bg-[#141414] p-5">
      <div className="skeleton h-3 w-24 mb-4" />
      <div className="skeleton h-8 w-20" />
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiFetch("/api/admin/dashboard/stats")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setStats)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-in">
      <h1 className="text-xl font-semibold text-[#fafafa] mb-6">Dashboard</h1>

      {error && !loading && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#fca5a5] text-[13px]">
          Failed to load dashboard stats.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : stats &&
            cardConfig.map((card) => (
              <div
                key={card.key}
                className="rounded-xl border border-[#27272a] bg-[#141414] p-5"
              >
                <p className="text-[12px] uppercase tracking-wider text-[#52525b] font-medium mb-3">
                  {card.label}
                </p>
                <p className="text-3xl font-semibold text-[#fafafa]">
                  {stats[card.key]}
                </p>
              </div>
            ))}
      </div>
    </div>
  );
}
