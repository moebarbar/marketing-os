import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  projectId: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, password: string, name: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("auth_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("auth_token");
    if (!stored) { setLoading(false); return; }
    fetch(`${BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${stored}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) { setUser(data); setToken(stored); } else { localStorage.removeItem("auth_token"); } })
      .catch(() => { localStorage.removeItem("auth_token"); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<string | null> => {
    const res = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (!res.ok) return data.error ?? "Login failed";
    localStorage.setItem("auth_token", data.token);
    setToken(data.token);
    setUser(data.user);
    return null;
  };

  const register = async (email: string, password: string, name: string): Promise<string | null> => {
    const res = await fetch(`${BASE}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, name }) });
    const data = await res.json();
    if (!res.ok) return data.error ?? "Registration failed";
    localStorage.setItem("auth_token", data.token);
    setToken(data.token);
    setUser(data.user);
    return null;
  };

  const logout = async () => {
    const t = token;
    localStorage.removeItem("auth_token");
    setToken(null);
    setUser(null);
    if (t) await fetch(`${BASE}/api/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${t}` } }).catch(() => {});
  };

  return <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
