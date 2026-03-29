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
    setError("");
    setMessage("");
    setResetLink("");
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
    } catch {
      setError("Request failed");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4">
      <div className="w-full max-w-[400px] animate-in">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-[#fafafa]">
            Reset your password
          </h1>
          <p className="text-[13px] text-[#71717a] mt-1.5">
            We'll generate a reset link
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#27272a] bg-[#141414] p-8">
          {error && (
            <div className="mb-5 px-3 py-2.5 rounded-md bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#fca5a5] text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-5 px-3 py-2.5 rounded-md bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#86efac] text-sm">
              {message}
            </div>
          )}

          {resetLink && (
            <div className="mb-5 px-3 py-3 rounded-md bg-[#f59e0b]/10 border border-[#f59e0b]/20">
              <p className="text-[#fcd34d] text-[13px] font-medium mb-1">
                Test mode — Reset Link:
              </p>
              <Link
                to={resetLink}
                className="text-[#fafafa] hover:underline text-sm break-all"
              >
                {resetLink}
              </Link>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-[#fafafa] text-[#09090b] font-medium rounded-md text-sm hover:bg-[#e4e4e7] active:scale-[0.97] disabled:opacity-50 transition-all duration-150 mt-2"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center">
          <Link
            to="/login"
            className="text-[13px] text-[#52525b] hover:text-[#71717a] transition-colors"
          >
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
