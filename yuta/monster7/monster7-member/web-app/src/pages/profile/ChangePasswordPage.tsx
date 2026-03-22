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
    <div className="max-w-md mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-white mb-6">修改密碼</h1>
      {error && <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>}
      {message && <div className="mb-4 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 text-sm">{message}</div>}
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">舊密碼</label>
            <input type="password" required value={oldPassword} onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">新密碼</label>
            <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" placeholder="至少 8 字元，含大小寫字母與數字" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/25">
            {loading ? "修改中..." : "修改密碼"}
          </button>
        </form>
      </div>
      <p className="mt-6 text-center"><Link to="/profile" className="text-sm text-slate-400 hover:text-slate-300 transition-colors">返回 Profile</Link></p>
    </div>
  );
}
