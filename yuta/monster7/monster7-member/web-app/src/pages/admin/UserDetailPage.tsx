import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch } from "../../lib/api";

interface UserDetail {
  id: string; email: string; name: string; bio: string; avatar_url: string | null;
  role: string; is_active: number; created_at: string; updated_at: string;
  oauth_accounts: { id: string; provider: string; provider_email: string | null; created_at: string }[];
  login_history: { id: string; method: string; ip_address: string | null; user_agent: string | null; created_at: string }[];
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchUser = () => {
    apiFetch(`/api/admin/users/${id}`).then((res) => res.json()).then(setUser).finally(() => setLoading(false));
  };
  useEffect(() => { fetchUser(); }, [id]);

  const changeRole = async (role: string) => {
    setError(""); setMessage("");
    const res = await apiFetch(`/api/admin/users/${id}/role`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }),
    });
    if (!res.ok) { const data = await res.json(); setError(data.error?.message || "Failed"); }
    else { setMessage("角色已更新"); fetchUser(); }
  };

  const toggleStatus = async (isActive: boolean) => {
    setError(""); setMessage("");
    const res = await apiFetch(`/api/admin/users/${id}/status`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: isActive }),
    });
    if (!res.ok) { const data = await res.json(); setError(data.error?.message || "Failed"); }
    else { setMessage(isActive ? "帳號已啟用" : "帳號已停用"); fetchUser(); }
  };

  if (loading) return <p className="text-slate-500">載入中...</p>;
  if (!user) return <p className="text-red-400">使用者不存在</p>;

  return (
    <div className="max-w-3xl animate-fade-in">
      <Link to="/admin/users" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        返回列表
      </Link>

      <h1 className="text-2xl font-bold text-white mb-6">使用者詳情</h1>

      {error && <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>}
      {message && <div className="mb-4 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 text-sm">{message}</div>}

      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl text-white font-bold">{user.name.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <p className="text-white font-semibold text-lg">{user.name}</p>
            <p className="text-slate-400 text-sm">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div className="bg-white/5 rounded-xl p-4"><span className="text-slate-500 block mb-1">角色</span><span className="text-white">{user.role}</span></div>
          <div className="bg-white/5 rounded-xl p-4"><span className="text-slate-500 block mb-1">狀態</span><span className={user.is_active ? "text-green-400" : "text-red-400"}>{user.is_active ? "啟用" : "停用"}</span></div>
          <div className="bg-white/5 rounded-xl p-4"><span className="text-slate-500 block mb-1">簡介</span><span className="text-slate-300">{user.bio || "—"}</span></div>
          <div className="bg-white/5 rounded-xl p-4"><span className="text-slate-500 block mb-1">建立時間</span><span className="text-slate-300">{new Date(user.created_at).toLocaleString()}</span></div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => changeRole(user.role === "admin" ? "user" : "admin")}
            className="px-4 py-2 text-sm border border-white/10 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all">
            設為 {user.role === "admin" ? "user" : "admin"}
          </button>
          <button onClick={() => toggleStatus(!user.is_active)}
            className={`px-4 py-2 text-sm rounded-xl font-medium transition-all ${user.is_active ? "bg-red-500/20 text-red-300 hover:bg-red-500/30" : "bg-green-500/20 text-green-300 hover:bg-green-500/30"}`}>
            {user.is_active ? "停用帳號" : "啟用帳號"}
          </button>
        </div>
      </div>

      {/* OAuth */}
      <h2 className="text-lg font-semibold text-white mt-8 mb-4">OAuth 連結</h2>
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        {user.oauth_accounts.length === 0 ? (
          <p className="text-sm text-slate-500">無 OAuth 連結</p>
        ) : (
          <div className="space-y-2">
            {user.oauth_accounts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                <span className="text-white text-sm font-medium capitalize">{a.provider}</span>
                {a.provider_email && <span className="text-slate-400 text-sm">{a.provider_email}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Login History */}
      <h2 className="text-lg font-semibold text-white mt-8 mb-4">登入歷史 (最近 20 筆)</h2>
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-6 py-3 text-left font-medium text-slate-400">方式</th>
              <th className="px-6 py-3 text-left font-medium text-slate-400">IP</th>
              <th className="px-6 py-3 text-left font-medium text-slate-400">時間</th>
            </tr>
          </thead>
          <tbody>
            {user.login_history.map((h) => (
              <tr key={h.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-6 py-3">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${h.method === "google" ? "bg-blue-500/20 text-blue-300" : "bg-slate-500/20 text-slate-300"}`}>{h.method}</span>
                </td>
                <td className="px-6 py-3 text-slate-400 font-mono text-xs">{h.ip_address ?? "—"}</td>
                <td className="px-6 py-3 text-slate-400">{new Date(h.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
