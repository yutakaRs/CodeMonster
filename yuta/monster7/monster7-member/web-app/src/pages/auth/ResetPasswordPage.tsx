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
        setMessage("Password reset successfully. You can now sign in with your new password.");
      }
    } catch {
      setError("Reset failed");
    }
    setLoading(false);
  };

  /* No token — show error state */
  if (!token) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4">
        <div className="w-full max-w-[400px] animate-in">
          <div className="rounded-2xl border border-[#27272a] bg-[#141414] p-8 text-center">
            <div className="mb-4 px-3 py-2.5 rounded-md bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#fca5a5] text-sm">
              Invalid or missing reset link
            </div>
            <Link
              to="/login"
              className="text-[#fafafa] hover:underline text-sm"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4">
      <div className="w-full max-w-[400px] animate-in">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-[#fafafa]">
            Set new password
          </h1>
          <p className="text-[13px] text-[#71717a] mt-1.5">
            Enter your new password below
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#27272a] bg-[#141414] p-8">
          {error && (
            <div className="mb-5 px-3 py-2.5 rounded-md bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#fca5a5] text-sm">
              {error}
            </div>
          )}

          {message ? (
            <div className="text-center">
              <div className="mb-5 px-3 py-2.5 rounded-md bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#86efac] text-sm">
                {message}
              </div>
              <Link
                to="/login"
                className="text-[#fafafa] hover:underline text-sm"
              >
                Go to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Password */}
              <div>
                <label className="block text-[13px] font-medium text-[#a1a1aa] mb-1.5">
                  New password
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
                {loading ? "Resetting..." : "Reset password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
