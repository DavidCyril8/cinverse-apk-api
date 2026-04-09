import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/apiClient";

interface SearchHistoryContextType {
  history: string[];
  addSearch: (query: string) => void;
  removeSearch: (query: string) => void;
  clearAll: () => void;
}

const SearchHistoryContext = createContext<SearchHistoryContextType>({
  history: [],
  addSearch: () => {},
  removeSearch: () => {},
  clearAll: () => {},
});

const STORAGE_KEY = "@cineverse_search_history_v1";
const MAX_HISTORY = 10;

export function SearchHistoryProvider({ children }: { children: React.ReactNode }) {
  const { user, dataVersion } = useAuth();
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      apiRequest<string[]>("/user/search-history")
        .then((items) => setHistory(items))
        .catch(() => {
          AsyncStorage.getItem(STORAGE_KEY).then((v) => {
            if (v) { try { setHistory(JSON.parse(v)); } catch {} }
          });
        });
    } else {
      AsyncStorage.getItem(STORAGE_KEY).then((val) => {
        if (val) { try { setHistory(JSON.parse(val)); } catch {} }
        else { setHistory([]); }
      });
    }
  }, [user?.id, dataVersion]);

  const addSearch = useCallback((query: string) => {
    const q = query.trim();
    if (!q || q.length < 2) return;
    setHistory((prev) => {
      const next = [q, ...prev.filter((h) => h.toLowerCase() !== q.toLowerCase())].slice(0, MAX_HISTORY);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    if (user) {
      apiRequest("/user/search-history", { method: "POST", body: { query: q } }).catch(() => {});
    }
  }, [user]);

  const removeSearch = useCallback((query: string) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h !== query);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    if (user) {
      apiRequest(`/user/search-history/${encodeURIComponent(query)}`, { method: "DELETE" }).catch(() => {});
    }
  }, [user]);

  const clearAll = useCallback(() => {
    setHistory([]);
    AsyncStorage.removeItem(STORAGE_KEY);
    if (user) {
      apiRequest("/user/search-history", { method: "DELETE" }).catch(() => {});
    }
  }, [user]);

  return (
    <SearchHistoryContext.Provider value={{ history, addSearch, removeSearch, clearAll }}>
      {children}
    </SearchHistoryContext.Provider>
  );
}

export function useSearchHistory() {
  return useContext(SearchHistoryContext);
}
