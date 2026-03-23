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
    <div className="min-h-screen flex">
      {/* Left - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0a0a0a] border-r border-[#1c1c1e] flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#fafafa] flex items-center justify-center">
              <span className="text-[#09090b] font-semibold text-sm">M7</span>
            </div>
            <span className="text-[#fafafa] font-semibold">Monster7</span>
          </div>
        </div>
        <div>
          <p className="text-[32px] leading-tight font-semibold text-[#fafafa] max-w-md">
            Build and manage your members, all in one place.
          </p>
          <p className="text-[#71717a] mt-4 max-w-sm leading-relaxed">
            A full-stack member management system built on Cloudflare's edge network — Pages, Workers, D1, R2, and KV.
          </p>
        </div>
        <p className="text-[12px] text-[#3f3f46]">Cloudflare Full-Stack Application</p>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-[360px] animate-in">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-lg bg-[#fafafa] flex items-center justify-center">
              <span className="text-[#09090b] font-semibold text-sm">M7</span>
            </div>
            <span className="text-[#fafafa] font-semibold">Monster7</span>
          </div>

          <h1 className="text-xl font-semibold text-[#fafafa]">Sign in</h1>
          <p className="text-[13px] text-[#71717a] mt-1">Enter your credentials to continue</p>

          <div className="mt-8">
            <a href={`${API_URL}/api/auth/oauth/google`}
              className="w-full h-10 flex items-center justify-center gap-2.5 rounded-lg border border-[#27272a] text-sm text-[#a1a1aa] hover:bg-[#18181b] hover:text-[#fafafa] active:scale-[0.98] transition-all">
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </a>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#1c1c1e]" /></div>
              <div className="relative flex justify-center"><span className="px-3 text-[12px] text-[#3f3f46] bg-[#09090b]">or</span></div>
            </div>

            {error && (
              <div className="mb-4 px-3 py-2.5 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#fca5a5] text-[13px]">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[13px] font-medium text-[#a1a1aa] mb-1.5">Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3 bg-transparent border border-[#27272a] rounded-lg text-sm text-[#fafafa] placeholder-[#3f3f46] outline-none focus:border-[#52525b] transition-colors"
                  placeholder="you@example.com" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[13px] font-medium text-[#a1a1aa]">Password</label>
                  <Link to="/forgot-password" className="text-[12px] text-[#52525b] hover:text-[#71717a] transition-colors">Forgot?</Link>
                </div>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 px-3 bg-transparent border border-[#27272a] rounded-lg text-sm text-[#fafafa] placeholder-[#3f3f46] outline-none focus:border-[#52525b] transition-colors" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full h-10 mt-2 bg-[#fafafa] text-[#09090b] text-sm font-medium rounded-lg hover:bg-[#e4e4e7] active:scale-[0.98] disabled:opacity-50 transition-all">
                {loading ? "Signing in..." : "Continue"}
              </button>
            </form>
          </div>

          <p className="mt-8 text-center text-[13px] text-[#52525b]">
            Don't have an account? <Link to="/register" className="text-[#fafafa] hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
