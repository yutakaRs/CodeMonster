import { useState } from "react";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await register(email, password, name); navigate("/bingo"); }
    catch (err) { setError(err instanceof Error ? err.message : "Registration failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <form onSubmit={handleSubmit} className="bg-[#2a2220] border border-[#4a3f3b] rounded-2xl p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center text-amber-400">Register</h1>

        {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}

        <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)}
          className="w-full mb-3 px-4 py-2 bg-[#3d3330] rounded-lg text-[#faf5f0] placeholder-[#5a4f4b] border border-[#4a3f3b] focus:border-amber-500 outline-none" required />

        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-3 px-4 py-2 bg-[#3d3330] rounded-lg text-[#faf5f0] placeholder-[#5a4f4b] border border-[#4a3f3b] focus:border-amber-500 outline-none" required />

        <input type="password" placeholder="Password (8+ chars, upper+lower+digit)" value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-4 py-2 bg-[#3d3330] rounded-lg text-[#faf5f0] placeholder-[#5a4f4b] border border-[#4a3f3b] focus:border-amber-500 outline-none" required />

        <button type="submit" disabled={loading}
          className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-lg hover:from-amber-400 hover:to-orange-400 disabled:opacity-50">
          {loading ? "Registering..." : "Register"}
        </button>

        <p className="text-[#a89890] text-sm text-center mt-4">
          Have an account? <Link to="/login" className="text-amber-400 hover:underline">Login</Link>
        </p>
      </form>
    </div>
  );
}
