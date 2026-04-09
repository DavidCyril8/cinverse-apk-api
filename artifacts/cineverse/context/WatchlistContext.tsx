import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { MovieItem } from "@/lib/movieApi";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/apiClient";

interface WatchlistContextType {
  watchlist: MovieItem[];
  addToWatchlist: (movie: MovieItem) => void;
  removeFromWatchlist: (id: string) => void;
  isInWatchlist: (id: string) => boolean;
}

const WatchlistContext = createContext<WatchlistContextType>({
  watchlist: [],
  addToWatchlist: () => {},
  removeFromWatchlist: () => {},
  isInWatchlist: () => false,
});

const STORAGE_KEY = "@cineverse_watchlist_v2";

function toMovieItem(raw: Record<string, unknown>): MovieItem {
  return {
    id: String(raw.movieId ?? raw.id ?? ""),
    title: String(raw.title ?? ""),
    posterUrlId: String(raw.poster ?? raw.posterUrlId ?? ""),
    releaseDate: "",
    voteAverage: 0,
    genres: [],
    overview: "",
    subjectType: raw.mediaType === "series" ? 2 : 1,
  };
}

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const { user, dataVersion } = useAuth();
  const [watchlist, setWatchlist] = useState<MovieItem[]>([]);

  useEffect(() => {
    if (user) {
      apiRequest<Record<string, unknown>[]>("/user/watchlist")
        .then((items) => setWatchlist(items.map(toMovieItem)))
        .catch(() => {
          AsyncStorage.getItem(STORAGE_KEY).then((v) => {
            if (v) { try { setWatchlist(JSON.parse(v)); } catch {} }
          });
        });
    } else {
      AsyncStorage.getItem(STORAGE_KEY).then((val) => {
        if (val) { try { setWatchlist(JSON.parse(val)); } catch {} }
        else { setWatchlist([]); }
      });
    }
  }, [user?.id, dataVersion]);

  const addToWatchlist = useCallback((movie: MovieItem) => {
    setWatchlist((prev) => {
      if (prev.some((m) => String(m.id) === String(movie.id))) return prev;
      const next = [movie, ...prev];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    if (user) {
      apiRequest("/user/watchlist", {
        method: "POST",
        body: {
          movieId: String(movie.id),
          title: movie.title,
          poster: movie.posterUrlId,
          mediaType: movie.subjectType === 2 ? "series" : "movie",
        },
      }).catch(() => {});
    }
  }, [user]);

  const removeFromWatchlist = useCallback((id: string) => {
    setWatchlist((prev) => {
      const next = prev.filter((m) => String(m.id) !== id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    if (user) {
      apiRequest(`/user/watchlist/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
    }
  }, [user]);

  const isInWatchlist = useCallback(
    (id: string) => watchlist.some((m) => String(m.id) === id),
    [watchlist],
  );

  return (
    <WatchlistContext.Provider value={{ watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  return useContext(WatchlistContext);
}
