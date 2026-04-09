import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";

export type ConnectionQuality = "online" | "unstable" | "offline";

interface NetworkContextType {
  isOnline: boolean;           // true = online or unstable (app can still attempt loads)
  connectionQuality: ConnectionQuality;
  retry: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType>({
  isOnline: true,
  connectionQuality: "online",
  retry: async () => {},
});

const PING_URL = "https://gzmovieboxapi.septorch.tech/api/search?query=a&apikey=Godszeal&perPage=1";
const PING_TIMEOUT = 5000;
const INTERVAL_ONLINE   = 15000;
const INTERVAL_UNSTABLE = 8000;
const INTERVAL_OFFLINE  = 3000;

// Returns:
//   "online"   — fetch succeeded
//   "offline"  — fast failure (< 800ms) → device has no network path at all
//   "unstable" — slow failure / timeout → device has a connection but it's degraded
async function checkConnectivity(): Promise<ConnectionQuality> {
  if (Platform.OS === "web") {
    return navigator.onLine ? "online" : "offline";
  }
  const started = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PING_TIMEOUT);
    await fetch(PING_URL, {
      signal: controller.signal,
      method: "GET",
      cache: "no-store",
    });
    clearTimeout(timer);
    return "online";
  } catch {
    const elapsed = Date.now() - started;
    // Under ~800 ms  → TCP/DNS failed immediately → truly no network
    // 800 ms or more → we waited a while before failing → slow/congested connection
    return elapsed < 800 ? "offline" : "unstable";
  }
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [quality, setQuality] = useState<ConnectionQuality>("online");
  const qualityRef = useRef<ConnectionQuality>("online");
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleNext = useCallback((q: ConnectionQuality) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const interval =
      q === "online"    ? INTERVAL_ONLINE :
      q === "unstable"  ? INTERVAL_UNSTABLE :
                          INTERVAL_OFFLINE;
    timerRef.current = setTimeout(async () => {
      const next = await checkConnectivity();
      qualityRef.current = next;
      setQuality(next);
      scheduleNext(next);
    }, interval);
  }, []);

  const check = useCallback(async () => {
    const q = await checkConnectivity();
    qualityRef.current = q;
    setQuality(q);
    scheduleNext(q);
  }, [scheduleNext]);

  const retry = useCallback(async () => {
    await check();
  }, [check]);

  useEffect(() => {
    check();

    if (Platform.OS === "web") {
      const onOnline  = () => { qualityRef.current = "online";  setQuality("online");  scheduleNext("online");  };
      const onOffline = () => { qualityRef.current = "offline"; setQuality("offline"); scheduleNext("offline"); };
      window.addEventListener("online",  onOnline);
      window.addEventListener("offline", onOffline);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        window.removeEventListener("online",  onOnline);
        window.removeEventListener("offline", onOffline);
      };
    }

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      sub.remove();
    };
  }, [check, scheduleNext]);

  return (
    <NetworkContext.Provider value={{
      isOnline: quality !== "offline",
      connectionQuality: quality,
      retry,
    }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}
