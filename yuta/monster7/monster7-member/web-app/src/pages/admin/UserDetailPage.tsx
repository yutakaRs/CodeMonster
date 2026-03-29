import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch } from "../../lib/api";
import type { UserDetail } from "../../../../shared/types.ts";

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

  useEffect(() => {
    fetchUser();
  }, [id]);

  const changeRole = async (role: string) => {
    setError("");
    setMessage("");
    const res = await apiFetch(`/api/admin/users/${id}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message || "Failed");
    } else {
      setMessage("Role updated");
      fetchUser();
    }
  };

  const toggleStatus = async (isActive: boolean) => {
    setError("");
    setMessage("");
    const res = await apiFetch(`/api/admin/users/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: isActive }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error?.message || "Failed");
    } else {
      setMessage(isActive ? "Account activated" : "Account deactivated");
      fetchUser();
    }
  };

  if (loading) {
    return (
      <div className="animate-in max-w-3xl">
        <div className="skeleton h-4 w-24 mb-6" />
        <div className="skeleton h-6 w-48 mb-6" />
        <div className="rounded-xl border border-[#27272a] bg-[#141414] p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="skeleton w-12 h-12 rounded-full" />
            <div className="space-y-2">
              <div className="skeleton h-4 w-32" />
              <div className="skeleton h-3 w-44" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="animate-in">
        <Link
          to="/admin/users"
          className="inline-flex items-center gap-1.5 text-[13px] text-[#71717a] hover:text-[#a1a1aa] transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to members
        </Link>
        <p className="text-[#ef4444] text-[13px]">User not found.</p>
      </div>
    );
  }

  return (
    <div className="animate-in max-w-3xl">
      {/* Back link */}
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-1.5 text-[13px] text-[#71717a] hover:text-[#a1a1aa] transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to members
      </Link>

      {/* Title */}
      <h1 className="text-xl font-semibold text-[#fafafa] mb-6">{user.name}</h1>

      {/* Alerts */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#fca5a5] text-[13px]">
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#86efac] text-[13px]">
          {message}
        </div>
      )}

      {/* User info card */}
      <div className="rounded-xl border border-[#27272a] bg-[#141414] p-6 mb-6">
        {/* Avatar + name + email */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-[#27272a] flex items-center justify-center flex-shrink-0">
            <span className="text-[16px] font-medium text-[#a1a1aa]">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-[#fafafa] text-[15px] font-medium">{user.name}</p>
            <p className="text-[#71717a] text-[13px]">{user.email}</p>
          </div>
        </div>

        {/* 2x2 info grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-lg bg-[#1c1c1e] p-4">
            <p className="text-[12px] uppercase tracking-wider text-[#52525b] font-medium mb-1">Role</p>
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-[12px] font-medium ${
                user.role === "admin"
                  ? "bg-[#6366f1]/10 text-[#a5b4fc]"
                  : "bg-[#27272a] text-[#a1a1aa]"
              }`}
            >
              {user.role}
            </span>
          </div>
          <div className="rounded-lg bg-[#1c1c1e] p-4">
            <p className="text-[12px] uppercase tracking-wider text-[#52525b] font-medium mb-1">Status</p>
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-[12px] font-medium ${
                user.is_active
                  ? "bg-[#22c55e]/10 text-[#86efac]"
                  : "bg-[#ef4444]/10 text-[#fca5a5]"
              }`}
            >
              {user.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="rounded-lg bg-[#1c1c1e] p-4">
            <p className="text-[12px] uppercase tracking-wider text-[#52525b] font-medium mb-1">Bio</p>
            <p className="text-[13px] text-[#a1a1aa]">{user.bio || "---"}</p>
          </div>
          <div className="rounded-lg bg-[#1c1c1e] p-4">
            <p className="text-[12px] uppercase tracking-wider text-[#52525b] font-medium mb-1">Created</p>
            <p className="text-[13px] text-[#a1a1aa]">{new Date(user.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => changeRole(user.role === "admin" ? "user" : "admin")}
            className="h-8 px-3 border border-[#27272a] text-[13px] text-[#a1a1aa] hover:bg-[#1c1c1e] rounded-md transition-colors"
          >
            Set as {user.role === "admin" ? "user" : "admin"}
          </button>
          <button
            onClick={() => toggleStatus(!user.is_active)}
            className={`h-8 px-3 border rounded-md text-[13px] font-medium transition-colors ${
              user.is_active
                ? "border-[#ef4444]/20 text-[#fca5a5] hover:bg-[#ef4444]/10"
                : "border-[#22c55e]/20 text-[#86efac] hover:bg-[#22c55e]/10"
            }`}
          >
            {user.is_active ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>

      {/* OAuth section */}
      <h2 className="text-[14px] font-semibold text-[#fafafa] mb-3">OAuth Accounts</h2>
      <div className="rounded-xl border border-[#27272a] bg-[#141414] p-5 mb-6">
        {user.oauth_accounts.length === 0 ? (
          <p className="text-[13px] text-[#52525b]">No OAuth accounts linked.</p>
        ) : (
          <div className="space-y-2">
            {user.oauth_accounts.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-[#1c1c1e]"
              >
                <span className="text-[13px] font-medium text-[#fafafa] capitalize">
                  {a.provider}
                </span>
                {a.provider_email && (
                  <span className="text-[13px] text-[#71717a]">{a.provider_email}</span>
                )}
                <span className="text-[12px] text-[#52525b] ml-auto">
                  {new Date(a.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Login history */}
      <h2 className="text-[14px] font-semibold text-[#fafafa] mb-3">Login History</h2>
      <div className="rounded-xl border border-[#27272a] bg-[#141414] overflow-hidden">
        {user.login_history.length === 0 ? (
          <div className="py-8 text-center text-[13px] text-[#52525b]">No login records.</div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#27272a]">
                <th className="px-4 py-3 text-left text-[12px] uppercase tracking-wider text-[#52525b] font-medium">
                  Method
                </th>
                <th className="px-4 py-3 text-left text-[12px] uppercase tracking-wider text-[#52525b] font-medium">
                  IP
                </th>
                <th className="px-4 py-3 text-left text-[12px] uppercase tracking-wider text-[#52525b] font-medium">
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              {user.login_history.map((h) => (
                <tr
                  key={h.id}
                  className="h-12 border-b border-[#1c1c1e] hover:bg-[#141414]/50 transition-colors"
                >
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[12px] font-medium ${
                        h.method === "google"
                          ? "bg-[#6366f1]/10 text-[#a5b4fc]"
                          : "bg-[#27272a] text-[#a1a1aa]"
                      }`}
                    >
                      {h.method}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-[12px] text-[#71717a]">
                    {h.ip_address ?? "---"}
                  </td>
                  <td className="px-4 py-2 text-[#71717a]">
                    {new Date(h.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
