import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/apiClient";

export interface WatchHistoryEntry {
  id: string;
  title: string;
  posterUrlId: string;
  backdropUrlId?: string;
  positionMs: number;
  durationMs: number;
  updatedAt: string;
  subjectType?: number;
  detailPath?: string;
  season?: number;
  episode?: number;
}

interface WatchHistoryContextType {
  history: WatchHistoryEntry[];
  updatePosition: (id: string, positionMs: number, durationMs: number, meta: Partial<WatchHistoryEntry>) => void;
  clearEntry: (id: string) => void;
  clearAll: () => void;
  getEntry: (id: string) => WatchHistoryEntry | undefined;
}

const WatchHistoryContext = createContext<WatchHistoryContextType>({
  history: [],
  updatePosition: () => {},
  clearEntry: () => {},
  clearAll: () => {},
  getEntry: () => undefined,
});

const STORAGE_KEY = "@cineverse_watch_history_v1";
const MAX_HISTORY = 30;

function fromApiItem(raw: Record<string, unknown>): WatchHistoryEntry {
  return {
    id: String(raw.movieId ?? raw.id ?? ""),
    title: String(raw.title ?? ""),
    posterUrlId: String(raw.poster ?? raw.posterUrlId ?? ""),
    positionMs: Math.round(Number(raw.progressSeconds ?? 0) * 1000),
    durationMs: Math.round(Number(raw.durationSeconds ?? 0) * 1000),
    updatedAt: raw.watchedAt ? String(raw.watchedAt) : new Date().toISOString(),
    subjectType: raw.mediaType === "series" ? 2 : 1,
    season: raw.season !== undefined ? Number(raw.season) : undefined,
    episode: raw.episode !== undefined ? Number(raw.episode) : undefined,
  };
}

export function WatchHistoryProvider({ children }: { children: React.ReactNode }) {
  const { user, dataVersion } = useAuth();
  const [history, setHistory] = useState<WatchHistoryEntry[]>([]);

  useEffect(() => {
    if (user) {
      apiRequest<Record<string, unknown>[]>("/user/history")
        .then((items) => setHistory(items.map(fromApiItem)))
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

  const updatePosition = useCallback((
    id: string,
    positionMs: number,
    durationMs: number,
    meta: Partial<WatchHistoryEntry>,
  ) => {
    if (!id || durationMs <= 0) return;
    const progress = positionMs / durationMs;
    if (progress > 0.97) {
      setHistory((prev) => {
        const next = prev.filter((e) => e.id !== id);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      if (user) {
        apiRequest(`/user/history/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
      }
      return;
    }
    setHistory((prev) => {
      const existing = prev.find((e) => e.id === id);
      const updated: WatchHistoryEntry = {
        id,
        title: meta.title ?? existing?.title ?? "",
        posterUrlId: meta.posterUrlId ?? existing?.posterUrlId ?? "",
        backdropUrlId: meta.backdropUrlId ?? existing?.backdropUrlId,
        positionMs,
        durationMs,
        updatedAt: new Date().toISOString(),
        subjectType: meta.subjectType ?? existing?.subjectType,
        detailPath: meta.detailPath ?? existing?.detailPath,
        season: meta.season ?? existing?.season,
        episode: meta.episode ?? existing?.episode,
      };
      const next = [updated, ...prev.filter((e) => e.id !== id)].slice(0, MAX_HISTORY);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    if (user) {
      apiRequest("/user/history", {
        method: "POST",
        body: {
          movieId: id,
          title: meta.title ?? "",
          poster: meta.posterUrlId ?? "",
          mediaType: meta.subjectType === 2 ? "series" : "movie",
          progressSeconds: Math.floor(positionMs / 1000),
          durationSeconds: Math.floor(durationMs / 1000),
          season: meta.season,
          episode: meta.episode,
        },
      }).catch(() => {});
    }
  }, [user]);

  const clearEntry = useCallback((id: string) => {
    setHistory((prev) => {
      const next = prev.filter((e) => e.id !== id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    if (user) {
      apiRequest(`/user/history/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
    }
  }, [user]);

  const clearAll = useCallback(() => {
    setHistory([]);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([])).catch(() => {});
    if (user) {
      apiRequest("/user/history", { method: "DELETE" }).catch(() => {});
    }
  }, [user]);

  const getEntry = useCallback((id: string) => {
    return history.find((e) => e.id === id);
  }, [history]);

  return (
    <WatchHistoryContext.Provider value={{ history, updatePosition, clearEntry, clearAll, getEntry }}>
      {children}
    </WatchHistoryContext.Provider>
  );
}

export function useWatchHistory() {
  return useContext(WatchHistoryContext);
}
