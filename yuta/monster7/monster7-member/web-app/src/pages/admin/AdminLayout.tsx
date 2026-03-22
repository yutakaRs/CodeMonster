import { Link, Outlet, useLocation } from "react-router-dom";

const navItems = [
  { path: "/admin", label: "Dashboard" },
  { path: "/admin/users", label: "用戶管理" },
  { path: "/admin/activity", label: "活動日誌" },
];

export default function AdminLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-white flex-shrink-0">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold">Admin</h2>
          <p className="text-xs text-gray-400">Monster7 管理後台</p>
        </div>
        <nav className="p-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-4 py-2 rounded text-sm ${
                location.pathname === item.path
                  ? "bg-gray-700 text-white"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 mt-auto border-t border-gray-700">
          <Link to="/profile" className="text-xs text-gray-400 hover:text-white">
            返回 Profile
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
