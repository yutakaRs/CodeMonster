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
    <div className="max-w-2xl mx-auto animate-in">
      {/* Page header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-[#fafafa]">Profile</h1>
        <button
          onClick={logout}
          className="h-9 px-4 border border-[#27272a] text-[#a1a1aa] hover:bg-[#1c1c1e] rounded-md text-[13px] font-medium transition-colors"
        >
          登出
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#fca5a5] text-sm">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#86efac] text-sm">
          {message}
        </div>
      )}

      {/* Main card */}
      <div className="rounded-xl border border-[#27272a] bg-[#141414]">
        {/* Avatar section */}
        <div className="p-6 flex items-center gap-5">
          <div className="w-[72px] h-[72px] rounded-xl bg-[#27272a] overflow-hidden flex items-center justify-center flex-shrink-0">
            {user.avatar_url ? (
              <img src={`${API_URL}${user.avatar_url}`} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl text-[#fafafa] font-semibold">{user.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="text-[#fafafa] font-semibold text-lg leading-tight">{user.name}</p>
            <p className="text-[#71717a] text-sm mt-0.5">{user.email}</p>
            <label className="mt-2.5 inline-flex items-center cursor-pointer h-9 px-3 border border-[#27272a] text-[#a1a1aa] hover:bg-[#1c1c1e] rounded-md text-[13px] font-medium transition-colors">
              更換頭像
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
              />
            </label>
          </div>
        </div>

        {/* Edit Form */}
        <div className="border-t border-[#1c1c1e] py-6 px-6">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[#a1a1aa] mb-1.5">姓名</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 bg-[#09090b] border border-[#27272a] rounded-md text-sm text-[#fafafa] focus:outline-none focus:ring-2 ring-[#6366f1]/25 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#a1a1aa] mb-1.5">簡介</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 bg-[#09090b] border border-[#27272a] rounded-md text-sm text-[#fafafa] focus:outline-none focus:ring-2 ring-[#6366f1]/25 transition-colors resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-5 bg-[#fafafa] text-[#09090b] font-medium rounded-md hover:bg-[#e4e4e7] active:scale-[0.97] disabled:opacity-50 transition-all text-sm"
            >
              {saving ? "儲存中..." : "儲存變更"}
            </button>
          </form>
        </div>

        {/* OAuth */}
        <div className="border-t border-[#1c1c1e] py-6 px-6">
          <h2 className="text-[15px] font-semibold text-[#fafafa] mb-4">OAuth 連結</h2>
          {oauthAccounts.length > 0 ? (
            <div className="space-y-2">
              {oauthAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#1c1c1e] border border-[#27272a]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-[#27272a] flex items-center justify-center">
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-[#fafafa] text-sm font-medium capitalize">{account.provider}</span>
                      {account.provider_email && (
                        <span className="text-[#71717a] text-sm ml-2">{account.provider_email}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => unlinkOAuth(account.provider)}
                    className="text-[12px] text-[#fca5a5] hover:text-[#ef4444] transition-colors font-medium"
                  >
                    解除連結
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#52525b]">尚未連結任何 OAuth 帳號</p>
          )}
          <a
            href={`${API_URL}/api/auth/oauth/google`}
            className="mt-3 inline-flex items-center gap-2 h-9 px-3 border border-[#27272a] text-[#a1a1aa] hover:bg-[#1c1c1e] rounded-md text-[13px] font-medium transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            連結 Google 帳號
          </a>
        </div>

        {/* Quick Links */}
        <div className="border-t border-[#1c1c1e] py-6 px-6 flex flex-wrap gap-2">
          <Link
            to="/change-password"
            className="h-9 inline-flex items-center px-3 border border-[#27272a] text-[#a1a1aa] hover:bg-[#1c1c1e] rounded-md text-[13px] font-medium transition-colors"
          >
            修改密碼
          </Link>
          <Link
            to="/login-history"
            className="h-9 inline-flex items-center px-3 border border-[#27272a] text-[#a1a1aa] hover:bg-[#1c1c1e] rounded-md text-[13px] font-medium transition-colors"
          >
            登入歷史
          </Link>
          {user.role === "admin" && (
            <Link
              to="/admin"
              className="h-9 inline-flex items-center px-3 bg-[#6366f1]/10 border border-[#6366f1]/20 text-[#a5b4fc] hover:bg-[#6366f1]/15 rounded-md text-[13px] font-medium transition-colors"
            >
              Admin 後台
            </Link>
          )}
        </div>

        {/* Meta footer */}
        <div className="border-t border-[#1c1c1e] py-4 px-6 text-[13px] text-[#52525b] flex gap-6">
          <p>角色: <span className="text-[#71717a]">{user.role}</span></p>
          <p>建立時間: <span className="text-[#71717a]">{new Date(user.created_at).toLocaleString()}</span></p>
        </div>
      </div>
    </div>
  );
}
