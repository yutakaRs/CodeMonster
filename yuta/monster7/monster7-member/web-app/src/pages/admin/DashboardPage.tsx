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

const cardConfig = [
  { key: "total_users", label: "總用戶數", color: "from-blue-500 to-cyan-500" },
  { key: "today_registrations", label: "今日新註冊", color: "from-green-500 to-emerald-500" },
  { key: "active_users_7d", label: "活躍用戶 (7天)", color: "from-purple-500 to-pink-500" },
  { key: "deactivated_count", label: "停用帳號", color: "from-red-500 to-orange-500" },
  { key: "oauth_link_ratio", label: "OAuth 連結比例", color: "from-amber-500 to-yellow-500" },
  { key: "logins_24h", label: "24h 登入次數", color: "from-indigo-500 to-blue-500" },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/admin/dashboard/stats")
      .then((res) => res.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-500">載入中...</p>;
  if (!stats) return <p className="text-red-400">載入失敗</p>;

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-white mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {cardConfig.map((card) => (
          <div key={card.key} className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:bg-white/10 transition-all">
            <p className="text-sm text-slate-400 mb-2">{card.label}</p>
            <p className={`text-4xl font-bold bg-gradient-to-r ${card.color} bg-clip-text text-transparent`}>
              {stats[card.key as keyof Stats]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
