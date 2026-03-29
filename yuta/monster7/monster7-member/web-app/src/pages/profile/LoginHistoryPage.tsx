import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../lib/api";

interface LoginRecord {
  id: string;
  method: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export default function LoginHistoryPage() {
  const [history, setHistory] = useState<LoginRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/users/me/login-history")
      .then((res) => res.json())
      .then((data) => setHistory(data.login_history || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto animate-in">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-[#fafafa]">Login history</h1>
        <Link
          to="/profile"
          className="h-9 inline-flex items-center px-3 border border-[#27272a] text-[#a1a1aa] hover:bg-[#1c1c1e] rounded-md text-[13px] font-medium transition-colors"
        >
          返回 Profile
        </Link>
      </div>

      {/* Table card */}
      <div className="rounded-xl border border-[#27272a] bg-[#141414] overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-[#52525b] text-sm">載入中...</p>
        ) : history.length === 0 ? (
          <p className="p-8 text-center text-[#52525b] text-sm">尚無登入紀錄</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="px-5 py-3 text-left text-[12px] uppercase tracking-wider text-[#52525b] font-medium">
                  方式
                </th>
                <th className="px-5 py-3 text-left text-[12px] uppercase tracking-wider text-[#52525b] font-medium">
                  IP
                </th>
                <th className="px-5 py-3 text-left text-[12px] uppercase tracking-wider text-[#52525b] font-medium">
                  User Agent
                </th>
                <th className="px-5 py-3 text-left text-[12px] uppercase tracking-wider text-[#52525b] font-medium">
                  時間
                </th>
              </tr>
            </thead>
            <tbody>
              {history.map((record) => (
                <tr
                  key={record.id}
                  className="border-b border-[#1c1c1e] last:border-b-0 hover:bg-[#141414] transition-colors"
                >
                  <td className="px-5 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[12px] font-medium ${
                        record.method === "google"
                          ? "bg-[#6366f1]/10 text-[#a5b4fc]"
                          : "bg-[#27272a] text-[#a1a1aa]"
                      }`}
                    >
                      {record.method}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[#a1a1aa] font-mono text-[13px]">
                    {record.ip_address ?? "\u2014"}
                  </td>
                  <td className="px-5 py-3 text-[#71717a] text-[12px] max-w-[200px] truncate" title={record.user_agent ?? ""}>
                    {record.user_agent ?? "\u2014"}
                  </td>
                  <td className="px-5 py-3 text-[#71717a]">
                    {new Date(record.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
