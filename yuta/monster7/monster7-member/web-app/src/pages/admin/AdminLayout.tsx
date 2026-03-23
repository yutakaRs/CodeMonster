import { Link, Outlet, useLocation } from "react-router-dom";

const navItems = [
  { path: "/admin", label: "Dashboard", icon: "chart" },
  { path: "/admin/users", label: "Members", icon: "users" },
  { path: "/admin/activity", label: "Activity", icon: "clock" },
];

function NavIcon({ type }: { type: string }) {
  const cls = "w-4 h-4";
  if (type === "chart")
    return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    );
  if (type === "users")
    return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    );
  return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default function AdminLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-60 bg-[#18181b] border-r border-[#27272a] flex flex-col z-30">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-[#27272a]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#6366f1] flex items-center justify-center">
              <span className="text-white font-semibold text-[11px]">M7</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[#fafafa] text-[13px] font-semibold">Monster7</span>
              <span className="text-[#52525b] text-[12px]">Admin</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {navItems.map((item) => {
            const active =
              item.path === "/admin"
                ? location.pathname === "/admin"
                : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2.5 h-9 px-3 rounded-md text-[13px] transition-colors ${
                  active
                    ? "bg-[#27272a] text-[#fafafa] font-medium"
                    : "text-[#71717a] hover:text-[#a1a1aa] hover:bg-[#1c1c1e]"
                }`}
              >
                <NavIcon type={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-[#27272a]">
          <Link
            to="/profile"
            className="flex items-center gap-2.5 h-9 px-3 rounded-md text-[13px] text-[#71717a] hover:text-[#a1a1aa] hover:bg-[#1c1c1e] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to profile
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-60 p-8 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
