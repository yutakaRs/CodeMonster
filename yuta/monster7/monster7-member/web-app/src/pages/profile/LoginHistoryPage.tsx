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
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-white mb-6">登入歷史</h1>
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-slate-500">載入中...</p>
        ) : history.length === 0 ? (
          <p className="p-8 text-center text-slate-500">尚無登入紀錄</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-4 text-left font-medium text-slate-400">方式</th>
                <th className="px-6 py-4 text-left font-medium text-slate-400">IP</th>
                <th className="px-6 py-4 text-left font-medium text-slate-400">時間</th>
              </tr>
            </thead>
            <tbody>
              {history.map((record) => (
                <tr key={record.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${record.method === "google" ? "bg-blue-500/20 text-blue-300" : "bg-slate-500/20 text-slate-300"}`}>
                      {record.method}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 font-mono text-xs">{record.ip_address ?? "—"}</td>
                  <td className="px-6 py-4 text-slate-400">{new Date(record.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-6 text-center"><Link to="/profile" className="text-sm text-slate-400 hover:text-slate-300 transition-colors">返回 Profile</Link></p>
    </div>
  );
}
