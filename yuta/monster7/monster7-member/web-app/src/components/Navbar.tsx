import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

const navItems = [
  { path: "/profile", label: "Profile" },
  { path: "/change-password", label: "Security" },
  { path: "/login-history", label: "Activity" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  return (
    <header className="border-b border-[#1c1c1e]">
      <div className="max-w-5xl mx-auto px-6 flex items-center justify-between h-14">
        <div className="flex items-center gap-8">
          <Link to="/profile" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#fafafa] flex items-center justify-center">
              <span className="text-[#09090b] font-semibold text-[11px]">M7</span>
            </div>
            <span className="text-[#fafafa] font-medium text-sm hidden sm:block">Monster7</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}
                className={`px-3 py-1.5 rounded-md text-[13px] transition-colors ${
                  location.pathname === item.path
                    ? "text-[#fafafa] bg-[#27272a]"
                    : "text-[#71717a] hover:text-[#a1a1aa]"
                }`}>
                {item.label}
              </Link>
            ))}
            {user.role === "admin" && (
              <Link to="/admin"
                className={`px-3 py-1.5 rounded-md text-[13px] transition-colors ${
                  location.pathname.startsWith("/admin")
                    ? "text-[#a5b4fc] bg-[#6366f1]/10"
                    : "text-[#6366f1] hover:text-[#a5b4fc]"
                }`}>
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-[#27272a] flex items-center justify-center text-[12px] text-[#a1a1aa] font-medium">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <button onClick={logout}
            className="text-[13px] text-[#52525b] hover:text-[#a1a1aa] transition-colors">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
