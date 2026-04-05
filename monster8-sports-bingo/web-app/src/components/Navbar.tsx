import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function Navbar() {
  const { user } = useAuth();

  return (
    <nav className="bg-[#2a2220] border-b border-[#4a3f3b] text-[#faf5f0] px-4 py-3 flex items-center gap-4 flex-wrap">
      <Link to="/" className="text-lg font-bold text-amber-400">Monster8</Link>
      <Link to="/sports" className="hover:text-amber-400 text-sm text-[#a89890]">Sports</Link>
      <Link to="/bingo" className="hover:text-amber-400 text-sm text-[#a89890]">Bingo</Link>
      <Link to="/bingo/draws" className="hover:text-amber-400 text-sm text-[#a89890]">Draws</Link>

      {user ? (
        <>
          <Link to="/bingo/bet" className="hover:text-amber-400 text-sm text-[#a89890]">Bet</Link>
          <Link to="/bingo/history" className="hover:text-amber-400 text-sm text-[#a89890]">My Bets</Link>
          <Link to="/bingo/wallet" className="hover:text-amber-400 text-sm text-[#a89890]">Wallet</Link>
          <Link to="/profile" className="ml-auto text-sm bg-[#3d3330] text-amber-300 px-3 py-1 rounded-lg hover:bg-[#4a3f3b] border border-[#4a3f3b]">
            {user.name || user.email}
          </Link>
        </>
      ) : (
        <Link to="/login" className="ml-auto text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-black px-4 py-1.5 rounded-lg font-bold hover:from-amber-400 hover:to-orange-400">
          Login
        </Link>
      )}
    </nav>
  );
}
