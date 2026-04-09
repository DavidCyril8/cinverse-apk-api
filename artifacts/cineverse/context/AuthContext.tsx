import * as SecureStore from "expo-secure-store";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import { apiRequest, setAuthToken } from "@/lib/apiClient";

const TOKEN_KEY = "cineverse_auth_token";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  createdAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  dataVersion: number;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (u: AuthUser) => void;
  importLocalData: (payload: {
    watchlist?: Array<{ movieId: string; title?: string; poster?: string; mediaType?: string }>;
    watchHistory?: Array<{ movieId: string; title?: string; poster?: string; mediaType?: string; progressSeconds?: number; durationSeconds?: number }>;
    searchHistory?: string[];
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  dataVersion: 0,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateUser: () => {},
  importLocalData: async () => {},
});

async function storeToken(token: string) {
  if (Platform.OS === "web") return;
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

async function loadToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function clearToken() {
  if (Platform.OS === "web") return;
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataVersion, setDataVersion] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    (async () => {
      const stored = await loadToken();
      if (!stored) { setIsLoading(false); return; }
      try {
        setAuthToken(stored);
        const me = await apiRequest<AuthUser>("/auth/me", { token: stored });
        if (!mountedRef.current) return;
        setUser(me);
        setToken(stored);
      } catch {
        await clearToken();
        setAuthToken(null);
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    })();
  }, []);

  const applySession = useCallback((tok: string, u: AuthUser) => {
    setAuthToken(tok);
    setToken(tok);
    setUser(u);
    storeToken(tok).catch(() => {});
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiRequest<{ token: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      body: { email: email.trim().toLowerCase(), password },
      token: null,
    });
    applySession(res.token, res.user);
  }, [applySession]);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    const res = await apiRequest<{ token: string; user: AuthUser }>("/auth/register", {
      method: "POST",
      body: { email: email.trim().toLowerCase(), password, displayName: displayName.trim() },
      token: null,
    });
    applySession(res.token, res.user);
  }, [applySession]);

  const logout = useCallback(async () => {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch {}
    await clearToken();
    setAuthToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((u: AuthUser) => {
    setUser(u);
  }, []);

  const importLocalData = useCallback(async (payload: Parameters<AuthContextType["importLocalData"]>[0]) => {
    const hasData =
      (payload.watchlist?.length ?? 0) > 0 ||
      (payload.watchHistory?.length ?? 0) > 0 ||
      (payload.searchHistory?.length ?? 0) > 0;
    if (!hasData) return;
    await apiRequest("/user/import", { method: "POST", body: payload });
    setDataVersion((v) => v + 1);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, dataVersion, login, register, logout, updateUser, importLocalData }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
