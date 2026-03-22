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
    setError(""); setMessage("");
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
    } catch { setError("Update failed"); }
    setSaving(false);
  };

  const handleAvatarUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    setError(""); setMessage("");
    try {
      const res = await apiFetch("/api/users/me/avatar", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message || "Upload failed");
      } else {
        setMessage("頭像更新成功");
        await refreshUser();
      }
    } catch { setError("Upload failed"); }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <button onClick={logout}
          className="px-4 py-2 text-sm text-slate-400 border border-white/10 rounded-xl hover:bg-white/5 hover:text-white transition-all">
          登出
        </button>
      </div>

      {error && <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>}
      {message && <div className="mb-4 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 text-sm">{message}</div>}

      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-8 space-y-8">
        {/* Avatar */}
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden flex items-center justify-center flex-shrink-0">
            {user.avatar_url ? (
              <img src={`${API_URL}${user.avatar_url}`} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl text-white font-bold">{user.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="text-white font-semibold text-lg">{user.name}</p>
            <p className="text-slate-400 text-sm">{user.email}</p>
            <label className="mt-2 inline-block cursor-pointer px-3 py-1.5 text-xs border border-white/10 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-all">
              更換頭像
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
            </label>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">姓名</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">簡介</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none" />
          </div>
          <button type="submit" disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/25">
            {saving ? "儲存中..." : "儲存變更"}
          </button>
        </form>

        {/* OAuth */}
        <div className="pt-6 border-t border-white/10">
          <h2 className="text-lg font-semibold text-white mb-4">OAuth 連結</h2>
          {oauthAccounts.length > 0 ? (
            <div className="space-y-2">
              {oauthAccounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                      <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    </div>
                    <div>
                      <span className="text-white text-sm font-medium capitalize">{account.provider}</span>
                      {account.provider_email && <span className="text-slate-400 text-sm ml-2">{account.provider_email}</span>}
                    </div>
                  </div>
                  <button onClick={() => unlinkOAuth(account.provider)} className="text-xs text-red-400 hover:text-red-300 transition-colors">解除連結</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">尚未連結任何 OAuth 帳號</p>
          )}
          <a href={`${API_URL}/api/auth/oauth/google`}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm border border-white/10 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all">
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            連結 Google 帳號
          </a>
        </div>

        {/* Quick Links */}
        <div className="pt-6 border-t border-white/10 flex flex-wrap gap-3">
          <Link to="/change-password" className="px-4 py-2 text-sm border border-white/10 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all">修改密碼</Link>
          <Link to="/login-history" className="px-4 py-2 text-sm border border-white/10 rounded-xl text-slate-400 hover:bg-white/5 hover:text-white transition-all">登入歷史</Link>
          {user.role === "admin" && (
            <Link to="/admin" className="px-4 py-2 text-sm bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-300 hover:bg-purple-500/30 transition-all">Admin 後台</Link>
          )}
        </div>

        <div className="pt-4 border-t border-white/10 text-sm text-slate-500 flex gap-6">
          <p>角色: <span className="text-slate-400">{user.role}</span></p>
          <p>建立時間: <span className="text-slate-400">{new Date(user.created_at).toLocaleString()}</span></p>
        </div>
      </div>
    </div>
  );
}
