import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4">
      <div className="w-full max-w-[400px] animate-in">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-[#fafafa]">
            Create an account
          </h1>
          <p className="text-[13px] text-[#71717a] mt-1.5">
            Get started with Monster7
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#27272a] bg-[#141414] p-8">
          {error && (
            <div className="mb-5 px-3 py-2.5 rounded-md bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#fca5a5] text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-[13px] font-medium text-[#a1a1aa] mb-1.5">
                Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full h-10 px-3 bg-[#09090b] border border-[#27272a] rounded-md text-sm text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:ring-2 ring-[#6366f1]/25 transition-colors"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-[13px] font-medium text-[#a1a1aa] mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-10 px-3 bg-[#09090b] border border-[#27272a] rounded-md text-sm text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:ring-2 ring-[#6366f1]/25 transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[13px] font-medium text-[#a1a1aa] mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 chars, upper & lowercase + number"
                className="w-full h-10 px-3 bg-[#09090b] border border-[#27272a] rounded-md text-sm text-[#fafafa] placeholder-[#52525b] focus:outline-none focus:ring-2 ring-[#6366f1]/25 transition-colors"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-[#fafafa] text-[#09090b] font-medium rounded-md text-sm hover:bg-[#e4e4e7] active:scale-[0.97] disabled:opacity-50 transition-all duration-150 mt-2"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[13px] text-[#52525b]">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-[#fafafa] hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
