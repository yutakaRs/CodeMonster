import { useState, type FormEvent } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { apiFetch } from "../../lib/api";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setMessage("");
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error?.message || "Reset failed");
      else setMessage("密碼重設成功！請使用新密碼登入。");
    } catch { setError("Reset failed"); }
    setLoading(false);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center animate-fade-in">
          <p className="text-red-400 mb-4">無效的重設連結</p>
          <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors">返回登入</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">重設密碼</h1>
          <p className="text-slate-400 mt-2">輸入你的新密碼</p>
        </div>
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
          {error && <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>}
          {message ? (
            <div className="text-center">
              <div className="mb-4 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300">{message}</div>
              <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors">前往登入</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">新密碼</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" placeholder="至少 8 字元，含大小寫字母與數字" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 transition-all duration-200 shadow-lg shadow-blue-500/25">
                {loading ? "重設中..." : "重設密碼"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
