import { useAuth } from "../../lib/auth";
import { Link } from "react-router-dom";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-amber-400">My Account</h1>

      <div className="bg-[#2a2220] border border-[#4a3f3b] rounded-2xl p-6 space-y-4">
        <div>
          <p className="text-xs text-[#5a4f4b]">Name</p>
          <p className="text-lg text-[#faf5f0]">{user.name || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-[#5a4f4b]">Email</p>
          <p className="text-lg text-[#faf5f0]">{user.email}</p>
        </div>
        <div>
          <p className="text-xs text-[#5a4f4b]">User ID</p>
          <p className="text-sm text-[#a89890] font-mono">{user.id}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-6">
        <Link to="/bingo/wallet" className="text-center py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold rounded-xl hover:from-amber-400 hover:to-orange-400">
          Wallet
        </Link>
        <Link to="/bingo/history" className="text-center py-2 bg-[#3d3330] text-[#a89890] rounded-xl hover:bg-[#4a3f3b] border border-[#4a3f3b]">
          Bet History
        </Link>
        <button onClick={logout} className="py-2 bg-red-600/10 text-red-400 rounded-xl hover:bg-red-600/20 border border-red-600/20">
          Logout
        </button>
      </div>
    </div>
  );
}
