import { useState, type FormEvent } from "react";
import { useAuth } from "../../lib/auth";
import { apiFetch } from "../../lib/api";

export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const res = await apiFetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message || "Update failed");
      } else {
        setMessage("Profile 更新成功");
        await refreshUser();
      }
    } catch {
      setError("Update failed");
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    setError("");
    setMessage("");

    try {
      const res = await apiFetch("/api/users/me/avatar", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message || "Upload failed");
      } else {
        setMessage("頭像更新成功");
        await refreshUser();
      }
    } catch {
      setError("Upload failed");
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Profile</h1>
        <button onClick={logout}
          className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300">
          登出
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      {message && <p className="text-green-600 text-sm mb-4">{message}</p>}

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl text-gray-400">{user.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <label className="cursor-pointer px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
            更換頭像
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
          </label>
        </div>

        {/* Info */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <p className="px-3 py-2 bg-gray-50 rounded text-gray-600">{user.email}</p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">簡介</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
            {saving ? "儲存中..." : "儲存"}
          </button>
        </form>

        <div className="pt-4 border-t text-sm text-gray-500">
          <p>角色: {user.role}</p>
          <p>建立時間: {new Date(user.created_at).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
