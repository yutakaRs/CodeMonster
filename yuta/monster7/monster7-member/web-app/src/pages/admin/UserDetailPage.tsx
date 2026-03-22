import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch } from "../../lib/api";

interface UserDetail {
  id: string;
  email: string;
  name: string;
  bio: string;
  avatar_url: string | null;
  role: string;
  is_active: number;
  created_at: string;
  updated_at: string;
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
    apiFetch(`/api/admin/users/${id}`)
      .then((res) => res.json())
      .then(setUser)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUser(); }, [id]);

  const changeRole = async (role: string) => {
    setError(""); setMessage("");
    const res = await apiFetch(`/api/admin/users/${id}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message || "Failed");
    } else {
      setMessage("角色已更新");
      fetchUser();
    }
  };

  const toggleStatus = async (isActive: boolean) => {
    setError(""); setMessage("");
    const res = await apiFetch(`/api/admin/users/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: isActive }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message || "Failed");
    } else {
      setMessage(isActive ? "帳號已啟用" : "帳號已停用");
      fetchUser();
    }
  };

  if (loading) return <p className="text-gray-500">載入中...</p>;
  if (!user) return <p className="text-red-500">使用者不存在</p>;

  return (
    <div className="max-w-3xl">
      <Link to="/admin/users" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
        &larr; 返回列表
      </Link>
      <h1 className="text-2xl font-bold mb-6">使用者詳情</h1>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {message && <p className="text-green-600 text-sm mb-4">{message}</p>}

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Email:</span> {user.email}</div>
          <div><span className="text-gray-500">姓名:</span> {user.name}</div>
          <div><span className="text-gray-500">角色:</span> {user.role}</div>
          <div><span className="text-gray-500">狀態:</span> {user.is_active ? "啟用" : "停用"}</div>
          <div><span className="text-gray-500">簡介:</span> {user.bio || "—"}</div>
          <div><span className="text-gray-500">建立時間:</span> {new Date(user.created_at).toLocaleString()}</div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <button onClick={() => changeRole(user.role === "admin" ? "user" : "admin")}
            className="px-4 py-1.5 text-sm border rounded hover:bg-gray-50">
            設為 {user.role === "admin" ? "user" : "admin"}
          </button>
          <button onClick={() => toggleStatus(!user.is_active)}
            className={`px-4 py-1.5 text-sm rounded text-white ${user.is_active ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}>
            {user.is_active ? "停用帳號" : "啟用帳號"}
          </button>
        </div>
      </div>

      {/* OAuth */}
      <h2 className="text-lg font-semibold mt-6 mb-3">OAuth 連結</h2>
      <div className="bg-white rounded-lg shadow p-4">
        {user.oauth_accounts.length === 0 ? (
          <p className="text-sm text-gray-500">無 OAuth 連結</p>
        ) : (
          user.oauth_accounts.map((a) => (
            <div key={a.id} className="text-sm py-1">
              <span className="font-medium capitalize">{a.provider}</span>
              {a.provider_email && <span className="text-gray-500 ml-2">{a.provider_email}</span>}
            </div>
          ))
        )}
      </div>

      {/* Login History */}
      <h2 className="text-lg font-semibold mt-6 mb-3">登入歷史 (最近 20 筆)</h2>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium">方式</th>
              <th className="px-4 py-2 text-left font-medium">IP</th>
              <th className="px-4 py-2 text-left font-medium">時間</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {user.login_history.map((h) => (
              <tr key={h.id}>
                <td className="px-4 py-2">{h.method}</td>
                <td className="px-4 py-2 text-gray-500">{h.ip_address ?? "—"}</td>
                <td className="px-4 py-2 text-gray-500">{new Date(h.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
