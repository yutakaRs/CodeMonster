import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [resetLink, setResetLink] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setMessage(""); setResetLink("");
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || "Request failed");
      } else {
        setMessage(data.message);
        if (data.reset_link) setResetLink(data.reset_link);
      }
    } catch { setError("Request failed"); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">忘記密碼</h1>
          <p className="text-slate-400 mt-2">輸入你的 email，我們會產生重設連結</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
          {error && <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>}
          {message && <div className="mb-4 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 text-sm">{message}</div>}
          {resetLink && (
            <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-amber-300 text-sm font-medium mb-1">測試模式 — Reset Link:</p>
              <Link to={resetLink} className="text-blue-400 hover:text-blue-300 text-sm break-all">{resetLink}</Link>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" placeholder="you@example.com" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 transition-all duration-200 shadow-lg shadow-blue-500/25">
              {loading ? "送出中..." : "送出"}
            </button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm"><Link to="/login" className="text-slate-400 hover:text-slate-300 transition-colors">返回登入</Link></p>
      </div>
    </div>
  );
}
