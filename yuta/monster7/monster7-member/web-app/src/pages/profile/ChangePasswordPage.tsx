import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../lib/api";

export default function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setMessage("");
    setLoading(true);
    try {
      const res = await apiFetch("/api/users/me/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error?.message || "Change failed");
      else { setMessage("密碼修改成功"); setOldPassword(""); setNewPassword(""); }
    } catch { setError("Change failed"); }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto animate-in">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-[#fafafa]">Change password</h1>
        <Link
          to="/profile"
          className="h-9 inline-flex items-center px-3 border border-[#27272a] text-[#a1a1aa] hover:bg-[#1c1c1e] rounded-md text-[13px] font-medium transition-colors"
        >
          返回 Profile
        </Link>
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

      {/* Card */}
      <div className="rounded-xl border border-[#27272a] bg-[#141414] p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[#a1a1aa] mb-1.5">舊密碼</label>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full h-10 px-3 bg-[#09090b] border border-[#27272a] rounded-md text-sm text-[#fafafa] focus:outline-none focus:ring-2 ring-[#6366f1]/25 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#a1a1aa] mb-1.5">新密碼</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="至少 8 字元，含大小寫字母與數字"
              className="w-full h-10 px-3 bg-[#09090b] border border-[#27272a] rounded-md text-sm text-[#fafafa] placeholder:text-[#52525b] focus:outline-none focus:ring-2 ring-[#6366f1]/25 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-[#fafafa] text-[#09090b] font-medium rounded-md hover:bg-[#e4e4e7] active:scale-[0.97] disabled:opacity-50 transition-all text-sm"
          >
            {loading ? "修改中..." : "修改密碼"}
          </button>
        </form>
      </div>
    </div>
  );
}
