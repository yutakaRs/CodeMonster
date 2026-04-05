import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";

// Auth requests go through Monster #8's API proxy (avoids CORS issues)
const AUTH_API = import.meta.env.VITE_API_URL || "http://localhost:8787";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${AUTH_API}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.data || data);
      } else {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
      }
    } catch {
      // Auth API unreachable — keep token, try later
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${AUTH_API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: "Login failed" } }));
      throw new Error(err.error?.message || "Login failed");
    }
    const data = await res.json();
    const tokens = data.data || data;
    localStorage.setItem("access_token", tokens.access_token);
    if (tokens.refresh_token) localStorage.setItem("refresh_token", tokens.refresh_token);
    await fetchUser();
  };

  const register = async (email: string, password: string, name: string) => {
    const res = await fetch(`${AUTH_API}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: "Registration failed" } }));
      throw new Error(err.error?.message || "Registration failed");
    }
    const data = await res.json();
    const tokens = data.data || data;
    localStorage.setItem("access_token", tokens.access_token);
    if (tokens.refresh_token) localStorage.setItem("refresh_token", tokens.refresh_token);
    await fetchUser();
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
