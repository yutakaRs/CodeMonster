import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import type { ActivityRecord as Activity, Pagination } from "../../../../shared/types.ts";

const filters = [
  { value: "", label: "All" },
  { value: "email", label: "Email" },
  { value: "google", label: "Google" },
];

function SkeletonRow() {
  return (
    <tr className="h-12 border-b border-[#1c1c1e]">
      <td className="px-4 py-2">
        <div className="space-y-1.5">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-2.5 w-36" />
        </div>
      </td>
      <td className="px-4 py-2"><div className="skeleton h-5 w-14 rounded-full" /></td>
      <td className="px-4 py-2"><div className="skeleton h-3 w-24" /></td>
      <td className="px-4 py-2"><div className="skeleton h-3 w-32" /></td>
    </tr>
  );
}

export default function ActivityPage() {
  const [activity, setActivity] = useState<Activity[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [method, setMethod] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchActivity = (p: number) => {
    setLoading(true);
    let url = `/api/admin/dashboard/activity?page=${p}&limit=20`;
    if (method) url += `&method=${method}`;
    if (fromDate) url += `&from=${fromDate}T00:00:00`;
    if (toDate) url += `&to=${toDate}T23:59:59`;
    apiFetch(url)
      .then((res) => res.json())
      .then((data) => {
        setActivity(data.activity || []);
        setPagination(data.pagination);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchActivity(page);
  }, [page, method, fromDate, toDate]);

  return (
    <div className="animate-in">
      <h1 className="text-xl font-semibold text-[#fafafa] mb-6">Activity</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-5">
        {/* Method pills */}
        <div className="flex items-center gap-1">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setMethod(f.value);
                setPage(1);
              }}
              className={`h-8 px-3 rounded-md text-[13px] transition-colors ${
                method === f.value
                  ? "bg-[#27272a] text-[#fafafa] font-medium"
                  : "text-[#52525b] hover:text-[#a1a1aa]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Time range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            className="h-8 px-2 bg-transparent border border-[#27272a] rounded-md text-[13px] text-[#a1a1aa] outline-none focus:border-[#52525b] transition-colors"
          />
          <span className="text-[#52525b] text-[13px]">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            className="h-8 px-2 bg-transparent border border-[#27272a] rounded-md text-[13px] text-[#a1a1aa] outline-none focus:border-[#52525b] transition-colors"
          />
          {(fromDate || toDate) && (
            <button
              onClick={() => { setFromDate(""); setToDate(""); setPage(1); }}
              className="h-8 px-2 text-[12px] text-[#52525b] hover:text-[#a1a1aa] transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#27272a] bg-[#141414] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#27272a]">
              <th className="px-4 py-3 text-left text-[12px] uppercase tracking-wider text-[#52525b] font-medium">
                User
              </th>
              <th className="px-4 py-3 text-left text-[12px] uppercase tracking-wider text-[#52525b] font-medium">
                Method
              </th>
              <th className="px-4 py-3 text-left text-[12px] uppercase tracking-wider text-[#52525b] font-medium">
                IP
              </th>
              <th className="px-4 py-3 text-left text-[12px] uppercase tracking-wider text-[#52525b] font-medium">
                Time
              </th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              : activity.length === 0
                ? null
                : activity.map((a) => (
                    <tr
                      key={a.id}
                      className="h-12 border-b border-[#1c1c1e] hover:bg-[#141414]/50 transition-colors"
                    >
                      {/* User */}
                      <td className="px-4 py-2">
                        <p className="text-[#fafafa] text-[13px]">{a.name}</p>
                        <p className="text-[#52525b] text-[12px]">{a.email}</p>
                      </td>

                      {/* Method badge */}
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[12px] font-medium ${
                            a.method === "google"
                              ? "bg-[#6366f1]/10 text-[#a5b4fc]"
                              : "bg-[#27272a] text-[#a1a1aa]"
                          }`}
                        >
                          {a.method}
                        </span>
                      </td>

                      {/* IP */}
                      <td className="px-4 py-2 font-mono text-[12px] text-[#71717a]">
                        {a.ip_address ?? "---"}
                      </td>

                      {/* Time */}
                      <td className="px-4 py-2 text-[#71717a]">
                        {new Date(a.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
          </tbody>
        </table>

        {!loading && activity.length === 0 && (
          <div className="py-12 text-center text-[13px] text-[#52525b]">No activity records.</div>
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
