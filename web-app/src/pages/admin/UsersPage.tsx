import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../lib/api";
import type { UserListItem as User, Pagination } from "../../../../shared/types.ts";

function SkeletonRow() {
  return (
    <tr className="h-12 border-b border-[#1c1c1e]">
      <td className="px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="skeleton w-8 h-8 rounded-full" />
          <div className="space-y-1.5">
            <div className="skeleton h-3 w-28" />
            <div className="skeleton h-2.5 w-36" />
          </div>
        </div>
      </td>
      <td className="px-4 py-2"><div className="skeleton h-5 w-14 rounded-full" /></td>
      <td className="px-4 py-2"><div className="skeleton h-5 w-14 rounded-full" /></td>
      <td className="px-4 py-2"><div className="skeleton h-3 w-8" /></td>
    </tr>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      setLoading(true);
      apiFetch(`/api/admin/users?page=${page}&limit=20`)
        .then((res) => res.json())
        .then((data) => {
          setUsers(data.users || []);
          setPagination(data.pagination);
        })
        .finally(() => setLoading(false));
    };
    load();
  }, [page]);

  return (
    <div className="animate-in">
      <h1 className="text-xl font-semibold text-[#fafafa] mb-6">Members</h1>

      <div className="rounded-xl border border-[#27272a] bg-[#141414] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#27272a]">
              <th className="px-4 py-3 text-left text-[12px] uppercase tracking-wider text-[#52525b] font-medium">
                User
              </th>
              <th className="px-4 py-3 text-left text-[12px] uppercase tracking-wider text-[#52525b] font-medium">
                Role
              </th>
              <th className="px-4 py-3 text-left text-[12px] uppercase tracking-wider text-[#52525b] font-medium">
                Status
              </th>
              <th className="px-4 py-3 text-left text-[12px] uppercase tracking-wider text-[#52525b] font-medium">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              : users.map((u) => (
                  <tr
                    key={u.id}
                    className="h-12 border-b border-[#1c1c1e] hover:bg-[#141414]/50 transition-colors"
                  >
                    {/* User: avatar + name + email */}
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#27272a] flex items-center justify-center flex-shrink-0">
                          <span className="text-[12px] font-medium text-[#a1a1aa]">
                            {u.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[#fafafa] text-[13px] truncate">{u.name}</p>
                          <p className="text-[#52525b] text-[12px] truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[12px] font-medium ${
                          u.role === "admin"
                            ? "bg-[#6366f1]/10 text-[#a5b4fc]"
                            : "bg-[#27272a] text-[#a1a1aa]"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[12px] font-medium ${
                          u.is_active
                            ? "bg-[#22c55e]/10 text-[#86efac]"
                            : "bg-[#ef4444]/10 text-[#fca5a5]"
                        }`}
                      >
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-2">
                      <Link
                        to={`/admin/users/${u.id}`}
                        className="text-[13px] text-[#a1a1aa] hover:text-[#fafafa] transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        {!loading && users.length === 0 && (
          <div className="py-12 text-center text-[13px] text-[#52525b]">No members found.</div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-[13px] text-[#52525b]">
            Page {page} of {pagination.total_pages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="h-8 px-3 border border-[#27272a] text-[13px] text-[#a1a1aa] hover:bg-[#1c1c1e] rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(pagination.total_pages, page + 1))}
              disabled={page >= pagination.total_pages}
              className="h-8 px-3 border border-[#27272a] text-[13px] text-[#a1a1aa] hover:bg-[#1c1c1e] rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
