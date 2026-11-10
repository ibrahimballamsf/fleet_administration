import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/index.js";
import { clearSession, readSession, writeSession } from "../api/session-storage.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readSession());
  const [initializing, setInitializing] = useState(Boolean(session));

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  useEffect(() => {
    if (!session?.token) {
      setInitializing(false);
      return undefined;
    }
    const controller = new AbortController();
    authApi.me({ signal: controller.signal })
      .then(({ data: user }) => {
        const refreshed = { ...session, user };
        writeSession(refreshed);
        setSession(refreshed);
      })
      .catch((error) => {
        if (error?.name !== "AbortError") logout();
      })
      .finally(() => setInitializing(false));
    return () => controller.abort();
  }, [session?.token]);

  const login = useCallback(async (credentials) => {
    const { data } = await authApi.login(credentials);
    const nextSession = { token: data.token, user: data.user };
    writeSession(nextSession);
    setSession(nextSession);
    return nextSession;
  }, []);

  const value = useMemo(() => ({
    user: session?.user ?? null,
    token: session?.token ?? null,
    authenticated: Boolean(session?.token),
    initializing,
    login,
    logout
  }), [session, initializing, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
