import { useState, useEffect, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { apiFetch } from "../../lib/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8789";

interface OAuthAccount {
  id: string;
  provider: string;
  provider_email: string | null;
  created_at: string;
}

export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [message, setMessage] = useState(searchParams.get("message") || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [oauthAccounts, setOauthAccounts] = useState<OAuthAccount[]>([]);

  useEffect(() => {
    apiFetch("/api/users/me/oauth-accounts")
      .then((res) => res.json())
      .then((data) => setOauthAccounts(data.oauth_accounts || []));
  }, []);

  const unlinkOAuth = async (provider: string) => {
    const res = await apiFetch(`/api/users/me/oauth-accounts/${provider}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message || "Unlink failed");
    } else {
      setOauthAccounts(oauthAccounts.filter((a) => a.provider !== provider));
      setMessage("已解除連結");
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const res = await apiFetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message || "Update failed");
      } else {
        setMessage("Profile 更新成功");
        await refreshUser();
      }
    } catch {
      setError("Update failed");
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    setError("");
    setMessage("");

    try {
      const res = await apiFetch("/api/users/me/avatar", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message || "Upload failed");
      } else {
        setMessage("頭像更新成功");
        await refreshUser();
      }
    } catch {
      setError("Upload failed");
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Profile</h1>
        <button onClick={logout}
          className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300">
          登出
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {message && <p className="text-green-600 text-sm mb-4">{message}</p>}

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl text-gray-400">{user.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <label className="cursor-pointer px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
            更換頭像
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
          </label>
        </div>

        {/* Info */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <p className="px-3 py-2 bg-gray-50 rounded text-gray-600">{user.email}</p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">簡介</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
            {saving ? "儲存中..." : "儲存"}
          </button>
        </form>

        {/* OAuth Accounts */}
        <div className="pt-4 border-t">
          <h2 className="text-lg font-semibold mb-3">OAuth 連結</h2>
          {oauthAccounts.length > 0 ? (
            <div className="space-y-2">
              {oauthAccounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium capitalize">{account.provider}</span>
                    {account.provider_email && (
                      <span className="text-sm text-gray-500 ml-2">{account.provider_email}</span>
                    )}
                  </div>
                  <button onClick={() => unlinkOAuth(account.provider)}
                    className="text-sm text-red-600 hover:underline">解除連結</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">尚未連結任何 OAuth 帳號</p>
          )}
          <a href={`${API_URL}/api/auth/oauth/google`}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            連結 Google 帳號
          </a>
        </div>

        {/* Links */}
        <div className="pt-4 border-t space-y-2">
          <Link to="/change-password" className="block text-sm text-blue-600 hover:underline">修改密碼</Link>
          <Link to="/login-history" className="block text-sm text-blue-600 hover:underline">登入歷史</Link>
          {user.role === "admin" && (
            <Link to="/admin" className="block text-sm text-purple-600 font-medium hover:underline">Admin 後台</Link>
          )}
        </div>

        <div className="pt-4 border-t text-sm text-gray-500">
          <p>角色: {user.role}</p>
          <p>建立時間: {new Date(user.created_at).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
