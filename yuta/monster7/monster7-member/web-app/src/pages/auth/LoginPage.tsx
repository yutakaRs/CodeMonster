import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../lib/auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8789";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(searchParams.get("error") || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/profile");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-[400px] animate-in">
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-[#fafafa]">Sign in to Monster7</h1>
          <p className="text-[13px] text-[#71717a] mt-1.5">Welcome back</p>
        </div>

        <div className="rounded-2xl border border-[#27272a] bg-[#141414] p-8">
          {error && (
            <div className="mb-5 px-3.5 py-2.5 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#fca5a5] text-[13px]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[#a1a1aa] mb-1.5">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 bg-[#09090b] border border-[#27272a] rounded-md text-[#fafafa] text-sm placeholder-[#52525b] outline-none focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1]/50 transition-colors"
                placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#a1a1aa] mb-1.5">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3 bg-[#09090b] border border-[#27272a] rounded-md text-[#fafafa] text-sm placeholder-[#52525b] outline-none focus:ring-2 focus:ring-[#6366f1]/25 focus:border-[#6366f1]/50 transition-colors" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full h-10 bg-[#fafafa] text-[#09090b] text-sm font-medium rounded-md hover:bg-[#e4e4e7] active:scale-[0.97] disabled:opacity-50 transition-all">
              {loading ? "Signing in..." : "Continue"}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#27272a]" /></div>
            <div className="relative flex justify-center"><span className="px-3 text-[12px] text-[#52525b] bg-[#141414]">or continue with</span></div>
          </div>

          <a href={`${API_URL}/api/auth/oauth/google`}
            className="w-full h-10 flex items-center justify-center gap-2.5 border border-[#27272a] rounded-md text-sm text-[#a1a1aa] hover:bg-[#1c1c1e] hover:text-[#fafafa] active:scale-[0.97] transition-all">
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google
          </a>
        </div>

        <div className="mt-6 text-center text-[13px] space-y-1.5">
          <p className="text-[#71717a]">Don't have an account? <Link to="/register" className="text-[#fafafa] hover:underline">Sign up</Link></p>
          <p><Link to="/forgot-password" className="text-[#52525b] hover:text-[#71717a] transition-colors">Forgot password?</Link></p>
        </div>
      </div>
    </div>
  );
}
