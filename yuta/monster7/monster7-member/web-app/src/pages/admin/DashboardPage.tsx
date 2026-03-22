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

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/admin/dashboard/stats")
      .then((res) => res.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">載入中...</p>;
  if (!stats) return <p className="text-red-500">載入失敗</p>;

  const cards = [
    { label: "總用戶數", value: stats.total_users },
    { label: "今日新註冊", value: stats.today_registrations },
    { label: "活躍用戶 (7天)", value: stats.active_users_7d },
    { label: "停用帳號", value: stats.deactivated_count },
    { label: "OAuth 連結比例", value: stats.oauth_link_ratio },
    { label: "24h 登入次數", value: stats.logins_24h },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-3xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
