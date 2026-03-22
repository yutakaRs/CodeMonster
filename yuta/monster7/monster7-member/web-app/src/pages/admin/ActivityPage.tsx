import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

interface Activity {
  id: string;
  user_id: string;
  email: string;
  name: string;
  method: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
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
    apiFetch(url)
      .then((res) => res.json())
      .then((data) => {
        setActivity(data.activity || []);
        setPagination(data.pagination);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchActivity(page); }, [page, method]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">活動日誌</h1>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <select value={method} onChange={(e) => { setMethod(e.target.value); setPage(1); }}
          className="px-3 py-1.5 border rounded text-sm">
          <option value="">全部方式</option>
          <option value="email">Email</option>
          <option value="google">Google</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <p className="p-6 text-center text-gray-500">載入中...</p>
        ) : activity.length === 0 ? (
          <p className="p-6 text-center text-gray-500">無活動紀錄</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">使用者</th>
                <th className="px-4 py-3 text-left font-medium">方式</th>
                <th className="px-4 py-3 text-left font-medium">IP</th>
                <th className="px-4 py-3 text-left font-medium">時間</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activity.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3">
                    <div>{a.name}</div>
                    <div className="text-xs text-gray-500">{a.email}</div>
                  </td>
                  <td className="px-4 py-3">{a.method}</td>
                  <td className="px-4 py-3 text-gray-500">{a.ip_address ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(a.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {pagination && pagination.total_pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50">上一頁</button>
          <span className="px-3 py-1 text-sm">{page} / {pagination.total_pages}</span>
          <button onClick={() => setPage(Math.min(pagination.total_pages, page + 1))} disabled={page >= pagination.total_pages}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50">下一頁</button>
        </div>
      )}
    </div>
  );
}
