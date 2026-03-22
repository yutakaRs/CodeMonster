import { useState, useEffect, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
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
  const { user, refreshUser } = useAuth();
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
      setMessage("OAuth account unlinked");
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
        setMessage("Profile updated");
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
        setMessage("Avatar updated");
        await refreshUser();
      }
    } catch { setError("Upload failed"); }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl animate-in">
      <h1 className="text-xl font-semibold text-[#fafafa] mb-1">Profile</h1>
      <p className="text-[13px] text-[#52525b] mb-6">Manage your account settings</p>

      {error && <div className="mb-4 px-3 py-2.5 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#fca5a5] text-[13px]">{error}</div>}
      {message && <div className="mb-4 px-3 py-2.5 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#86efac] text-[13px]">{message}</div>}

      {/* Avatar Section */}
      <section className="py-6 border-b border-[#1c1c1e]">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-[#27272a] overflow-hidden flex items-center justify-center flex-shrink-0">
            {user.avatar_url ? (
              <img src={`${API_URL}${user.avatar_url}`} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl text-[#71717a] font-medium">{user.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="text-[#fafafa] font-medium">{user.name}</p>
            <p className="text-[13px] text-[#52525b]">{user.email}</p>
            <label className="mt-2 inline-block cursor-pointer text-[13px] text-[#71717a] hover:text-[#a1a1aa] transition-colors">
              Change avatar
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
            </label>
          </div>
        </div>
      </section>

      {/* Profile Form */}
      <section className="py-6 border-b border-[#1c1c1e]">
        <h2 className="text-[13px] font-medium text-[#a1a1aa] uppercase tracking-wider mb-4">Information</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-[#71717a] mb-1.5">Name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 bg-transparent border border-[#27272a] rounded-lg text-sm text-[#fafafa] outline-none focus:border-[#52525b] transition-colors" />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#71717a] mb-1.5">Email</label>
              <div className="h-10 px-3 flex items-center border border-[#1c1c1e] rounded-lg text-sm text-[#52525b] bg-[#0a0a0a]">{user.email}</div>
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#71717a] mb-1.5">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
              className="w-full px-3 py-2.5 bg-transparent border border-[#27272a] rounded-lg text-sm text-[#fafafa] outline-none focus:border-[#52525b] transition-colors resize-none" />
          </div>
          <button type="submit" disabled={saving}
            className="h-9 px-4 bg-[#fafafa] text-[#09090b] text-[13px] font-medium rounded-lg hover:bg-[#e4e4e7] active:scale-[0.98] disabled:opacity-50 transition-all">
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>
      </section>

      {/* OAuth */}
      <section className="py-6 border-b border-[#1c1c1e]">
        <h2 className="text-[13px] font-medium text-[#a1a1aa] uppercase tracking-wider mb-4">Connected accounts</h2>
        {oauthAccounts.length > 0 ? (
          <div className="space-y-2 mb-3">
            {oauthAccounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between py-3 px-4 rounded-lg border border-[#1c1c1e]">
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  <div>
                    <span className="text-sm text-[#fafafa] capitalize">{account.provider}</span>
                    {account.provider_email && <span className="text-[13px] text-[#52525b] ml-2">{account.provider_email}</span>}
                  </div>
                </div>
                <button onClick={() => unlinkOAuth(account.provider)} className="text-[12px] text-[#ef4444] hover:text-[#fca5a5] transition-colors">Disconnect</button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-[#3f3f46] mb-3">No connected accounts</p>
        )}
        <a href={`${API_URL}/api/auth/oauth/google`}
          className="inline-flex items-center gap-2 h-9 px-3 border border-[#27272a] rounded-lg text-[13px] text-[#a1a1aa] hover:bg-[#18181b] hover:text-[#fafafa] transition-all">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Connect Google
        </a>
      </section>

      {/* Meta */}
      <section className="py-6">
        <div className="flex gap-6 text-[12px] text-[#3f3f46]">
          <span>Role: <span className="text-[#52525b]">{user.role}</span></span>
          <span>Joined: <span className="text-[#52525b]">{new Date(user.created_at).toLocaleDateString()}</span></span>
        </div>
      </section>
    </div>
  );
}
