import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

interface Activity {
  id: string; user_id: string; email: string; name: string;
  method: string; ip_address: string | null; user_agent: string | null; created_at: string;
}
interface Pagination {
  page: number; limit: number; total: number; total_pages: number;
}

export default function ActivityPage() {
  const [activity, setActivity] = useState<Activity[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [method, setMethod] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchActivity = (p: number) => {
    setLoading(true);
    let url = `/api/admin/dashboard/activity?page=${p}&limit=20`;
    if (method) url += `&method=${method}`;
    apiFetch(url).then((res) => res.json())
      .then((data) => { setActivity(data.activity || []); setPagination(data.pagination); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchActivity(page); }, [page, method]);

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-white mb-8">活動日誌</h1>

      <div className="flex gap-3 mb-6">
        {["", "email", "google"].map((m) => (
          <button key={m} onClick={() => { setMethod(m); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm transition-all ${
              method === m
                ? "bg-white/10 text-white font-medium border border-white/20"
                : "text-slate-400 border border-white/10 hover:bg-white/5"
            }`}>
            {m === "" ? "全部" : m === "email" ? "Email" : "Google"}
          </button>
        ))}
      </div>

      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-slate-500">載入中...</p>
        ) : activity.length === 0 ? (
          <p className="p-8 text-center text-slate-500">無活動紀錄</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-4 text-left font-medium text-slate-400">使用者</th>
                <th className="px-6 py-4 text-left font-medium text-slate-400">方式</th>
                <th className="px-6 py-4 text-left font-medium text-slate-400">IP</th>
                <th className="px-6 py-4 text-left font-medium text-slate-400">時間</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((a) => (
                <tr key={a.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-white">{a.name}</p>
                    <p className="text-xs text-slate-500">{a.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${a.method === "google" ? "bg-blue-500/20 text-blue-300" : "bg-slate-500/20 text-slate-300"}`}>{a.method}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 font-mono text-xs">{a.ip_address ?? "—"}</td>
                  <td className="px-6 py-4 text-slate-400">{new Date(a.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination && pagination.total_pages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-6">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
            className="px-4 py-2 border border-white/10 rounded-xl text-sm text-slate-400 hover:bg-white/5 disabled:opacity-30 transition-all">上一頁</button>
          <span className="text-sm text-slate-500">{page} / {pagination.total_pages}</span>
          <button onClick={() => setPage(Math.min(pagination.total_pages, page + 1))} disabled={page >= pagination.total_pages}
            className="px-4 py-2 border border-white/10 rounded-xl text-sm text-slate-400 hover:bg-white/5 disabled:opacity-30 transition-all">下一頁</button>
        </div>
      )}
    </div>
  );
}
