import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../lib/api";

interface LoginRecord {
  id: string;
  method: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export default function LoginHistoryPage() {
  const [history, setHistory] = useState<LoginRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/users/me/login-history")
      .then((res) => res.json())
      .then((data) => setHistory(data.login_history || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">登入歷史</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <p className="p-6 text-center text-gray-500">載入中...</p>
        ) : history.length === 0 ? (
          <p className="p-6 text-center text-gray-500">尚無登入紀錄</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">方式</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">IP</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700">時間</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {history.map((record) => (
                <tr key={record.id}>
                  <td className="px-4 py-3">{record.method}</td>
                  <td className="px-4 py-3 text-gray-500">{record.ip_address ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(record.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-4 text-center text-sm">
        <Link to="/profile" className="text-blue-600 hover:underline">返回 Profile</Link>
      </p>
    </div>
  );
}
