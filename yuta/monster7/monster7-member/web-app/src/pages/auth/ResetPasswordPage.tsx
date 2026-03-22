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
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message || "Reset failed");
      } else {
        setMessage("密碼重設成功！請使用新密碼登入。");
      }
    } catch {
      setError("Reset failed");
    }
    setLoading(false);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">無效的重設連結</p>
          <Link to="/login" className="text-blue-600 hover:underline">返回登入</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-center mb-6">重設密碼</h1>
        {error && <p className="text-red-600 text-sm mb-4 text-center">{error}</p>}
        {message ? (
          <div className="text-center">
            <p className="text-green-600 mb-4">{message}</p>
            <Link to="/login" className="text-blue-600 hover:underline">前往登入</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">新密碼</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="至少 8 字元，含大小寫字母與數字" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {loading ? "重設中..." : "重設密碼"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
