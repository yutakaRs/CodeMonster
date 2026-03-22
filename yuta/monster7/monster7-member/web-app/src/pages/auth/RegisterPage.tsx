import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password, name);
      navigate("/profile");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-[#0a0a0a] border-r border-[#1c1c1e] flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#fafafa] flex items-center justify-center">
            <span className="text-[#09090b] font-semibold text-sm">M7</span>
          </div>
          <span className="text-[#fafafa] font-semibold">Monster7</span>
        </div>
        <div>
          <p className="text-[32px] leading-tight font-semibold text-[#fafafa] max-w-md">Get started in seconds.</p>
          <p className="text-[#71717a] mt-4 max-w-sm leading-relaxed">Create your account and start managing members with a full-stack Cloudflare application.</p>
        </div>
        <p className="text-[12px] text-[#3f3f46]">Cloudflare Full-Stack Application</p>
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-[360px] animate-in">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-lg bg-[#fafafa] flex items-center justify-center">
              <span className="text-[#09090b] font-semibold text-sm">M7</span>
            </div>
            <span className="text-[#fafafa] font-semibold">Monster7</span>
          </div>

          <h1 className="text-xl font-semibold text-[#fafafa]">Create an account</h1>
          <p className="text-[13px] text-[#71717a] mt-1">Get started with Monster7</p>

          <div className="mt-8">
            {error && <div className="mb-4 px-3 py-2.5 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#fca5a5] text-[13px]">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[13px] font-medium text-[#a1a1aa] mb-1.5">Name</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3 bg-transparent border border-[#27272a] rounded-lg text-sm text-[#fafafa] placeholder-[#3f3f46] outline-none focus:border-[#52525b] transition-colors" placeholder="Your name" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#a1a1aa] mb-1.5">Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3 bg-transparent border border-[#27272a] rounded-lg text-sm text-[#fafafa] placeholder-[#3f3f46] outline-none focus:border-[#52525b] transition-colors" placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#a1a1aa] mb-1.5">Password</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 px-3 bg-transparent border border-[#27272a] rounded-lg text-sm text-[#fafafa] placeholder-[#3f3f46] outline-none focus:border-[#52525b] transition-colors" placeholder="Min 8 chars, upper + lower + digit" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full h-10 mt-2 bg-[#fafafa] text-[#09090b] text-sm font-medium rounded-lg hover:bg-[#e4e4e7] active:scale-[0.98] disabled:opacity-50 transition-all">
                {loading ? "Creating..." : "Create account"}
              </button>
            </form>
          </div>

          <p className="mt-8 text-center text-[13px] text-[#52525b]">
            Already have an account? <Link to="/login" className="text-[#fafafa] hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
