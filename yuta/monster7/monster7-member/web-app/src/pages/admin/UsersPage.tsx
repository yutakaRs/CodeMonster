import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../lib/api";

interface User {
  id: string; email: string; name: string; role: string; is_active: number; created_at: string;
}
interface Pagination {
  page: number; limit: number; total: number; total_pages: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchUsers = (p: number) => {
    setLoading(true);
    apiFetch(`/api/admin/users?page=${p}&limit=20`)
      .then((res) => res.json())
      .then((data) => { setUsers(data.users || []); setPagination(data.pagination); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(page); }, [page]);

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-white mb-8">用戶管理</h1>
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-slate-500">載入中...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-4 text-left font-medium text-slate-400">Email</th>
                <th className="px-6 py-4 text-left font-medium text-slate-400">姓名</th>
                <th className="px-6 py-4 text-left font-medium text-slate-400">角色</th>
                <th className="px-6 py-4 text-left font-medium text-slate-400">狀態</th>
                <th className="px-6 py-4 text-left font-medium text-slate-400"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 text-white">{u.email}</td>
                  <td className="px-6 py-4 text-slate-300">{u.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${u.role === "admin" ? "bg-purple-500/20 text-purple-300" : "bg-slate-500/20 text-slate-300"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${u.is_active ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                      {u.is_active ? "啟用" : "停用"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link to={`/admin/users/${u.id}`} className="text-blue-400 hover:text-blue-300 text-sm transition-colors">詳情</Link>
                  </td>
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
