import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../lib/auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(searchParams.get("error") || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await login(email, password); navigate("/bingo"); }
    catch (err) { setError(err instanceof Error ? err.message : "Login failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <form onSubmit={handleSubmit} className="bg-[#2a2220] border border-[#4a3f3b] rounded-2xl p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center text-amber-400">Login</h1>

        {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}

        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-3 px-4 py-2 bg-[#3d3330] rounded-lg text-[#faf5f0] placeholder-[#5a4f4b] border border-[#4a3f3b] focus:border-amber-500 outline-none" required />

        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-4 py-2 bg-[#3d3330] rounded-lg text-[#faf5f0] placeholder-[#5a4f4b] border border-[#4a3f3b] focus:border-amber-500 outline-none" required />

        <button type="submit" disabled={loading}
          className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-lg hover:from-amber-400 hover:to-orange-400 disabled:opacity-50">
          {loading ? "Logging in..." : "Login"}
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-[#4a3f3b]" />
          <span className="text-[#5a4f4b] text-xs">OR</span>
          <div className="flex-1 h-px bg-[#4a3f3b]" />
        </div>

        <a href={`${API_URL}/api/auth/oauth/google`}
          className="w-full py-2 bg-[#faf5f0] text-[#1a1412] font-bold rounded-lg hover:bg-white flex items-center justify-center gap-2">
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Login with Google
        </a>

        <p className="text-[#a89890] text-sm text-center mt-4">
          No account? <Link to="/register" className="text-amber-400 hover:underline">Register</Link>
        </p>
      </form>
    </div>
  );
}
