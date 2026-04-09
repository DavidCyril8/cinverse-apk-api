import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert, AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import {
  type DownloadItem,
  type DownloadStatus,
  type DownloadCallbacks,
  getAllDownloads,
  makeDownloadId,
  removeDownload,
  startDownload,
  cancelDownload,
  pauseAllActiveDownloads,
  restoreAndResumeDownload,
  getPausedDownloadIds,
  upsertDownload,
} from "@/lib/downloadManager";
import { fetchStreamData } from "@/lib/movieApi";
import {
  postProgressNotification as nativeProgressNotif,
  postCompleteNotification as nativeCompleteNotif,
  cancelNotification      as nativeCancelNotif,
  notifIdFor,
  isAvailable             as isNativeAvailable,
} from "cineverse-fs";

// ── Notification helpers ─────────────────────────────────────────────────────

async function postNotification(title: string, body: string, data: Record<string, unknown> = {}): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: false,
        data,
        ...(Platform.OS === "android" ? { channelId: "downloads" } : {}),
      },
      trigger: null,
    });
  } catch {}
}

// ── Types ────────────────────────────────────────────────────────────────────

interface DownloadProgress {
  progress: number;
  downloadedBytes: number;
  totalBytes: number;
  speedBytesPerSec?: number;
}

// Everything needed to eventually execute a download (URL resolved lazily)
interface QueueEntry {
  downloadId: string;
  subjectId: string;
  title: string;
  label: string;
  posterUrlId: string;
  subjectType?: number;
  detailPath?: string;
  season?: number;
  episode?: number;
  directUrl?: string;   // skip URL resolution if already known
  subtitleUrl?: string;
}

interface DownloadContextType {
  downloads: DownloadItem[];
  activeProgress: Map<string, DownloadProgress>;
  queueLength: number;  // how many items are waiting in queue
  initiateDownload: (params: {
    subjectId: string;
    title: string;
    posterUrlId: string;
    subjectType?: number;
    detailPath?: string;
    season?: number;
    episode?: number;
    directUrl?: string;
    subtitleUrl?: string;
  }) => Promise<void>;
  retryDownload: (id: string) => Promise<void>;
  deleteDownload: (id: string) => Promise<void>;
  cancelActiveDownload: (id: string) => Promise<void>;
  getStatus: (id: string) => DownloadStatus | undefined;
  getDownload: (id: string) => DownloadItem | undefined;
  refreshDownloads: () => Promise<void>;
  completedCount: number;
}

const DownloadContext = createContext<DownloadContextType>({
  downloads: [],
  activeProgress: new Map(),
  queueLength: 0,
  initiateDownload: async () => {},
  retryDownload: async () => {},
  deleteDownload: async () => {},
  cancelActiveDownload: async () => {},
  getStatus: () => undefined,
  getDownload: () => undefined,
  refreshDownloads: async () => {},
  completedCount: 0,
});

// ── Provider ─────────────────────────────────────────────────────────────────

export function DownloadProvider({ children }: { children: React.ReactNode }) {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [activeProgress, setActiveProgress] = useState<Map<string, DownloadProgress>>(new Map());
  const [queueLength, setQueueLength] = useState(0);

  const lastNotifPct       = useRef<Map<string, number>>(new Map());
  const lastStatePct       = useRef<Map<string, number>>(new Map());
  const lastSpeedSnapshot  = useRef<Map<string, { bytes: number; ts: number }>>(new Map());

  // Sequential download queue
  const downloadQueueRef = useRef<QueueEntry[]>([]);
  const isProcessingRef  = useRef(false);

  const completedCount = downloads.filter((d) => d.status === "completed").length;

  useEffect(() => {
    if (Platform.OS === "web") return;
    const activeCount = downloads.filter((d) => d.status === "downloading").length;
    Notifications.setBadgeCountAsync(activeCount).catch(() => {});
  }, [downloads]);

  const refreshDownloads = useCallback(async () => {
    const all = await getAllDownloads();
    setDownloads(all);
  }, []);

  useEffect(() => { refreshDownloads(); }, []);

  // ── Progress notification ──────────────────────────────────────────────────

  const showProgressNotif = useCallback(async (
    downloadId: string,
    label: string,
    pct: number,
    downloadedBytes = 0,
    totalBytes = 0,
  ) => {
    if (Platform.OS === "web") return;
    if (Platform.OS === "android" && isNativeAvailable()) {
      await nativeProgressNotif(notifIdFor(downloadId), label, downloadedBytes, totalBytes, pct);
      return;
    }
    // Fallback: Expo Notifications (iOS / old APK without native module)
    const identifier = `dl_progress_${downloadId}`;
    const isIndeterminate = pct < 0;
    const title = isIndeterminate ? "⬇  Downloading…" : `⬇  Downloading  ${pct}%`;
    try {
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title,
          body: label,
          sound: false,
          data: { type: "download_progress", downloadId },
          ...(Platform.OS === "android" ? { channelId: "downloads" } : {}),
        },
        trigger: null,
      });
    } catch {}
  }, []);

  const clearProgressNotif = useCallback(async (downloadId: string) => {
    if (Platform.OS === "web") return;
    if (Platform.OS === "android" && isNativeAvailable()) {
      await nativeCancelNotif(notifIdFor(downloadId));
    } else {
      try {
        await Notifications.dismissNotificationAsync(`dl_progress_${downloadId}`);
      } catch {}
    }
    lastNotifPct.current.delete(downloadId);
    lastStatePct.current.delete(downloadId);
  }, []);

  // ── Callbacks factory ──────────────────────────────────────────────────────

  const makeCallbacks = useCallback(
    (downloadId: string, label: string): DownloadCallbacks => ({
      onProgress: (id, progress, downloadedBytes, totalBytes) => {
        const now = Date.now();
        const snap = lastSpeedSnapshot.current.get(id);
        let speedBytesPerSec: number | undefined;
        if (snap && now - snap.ts >= 800 && downloadedBytes > snap.bytes) {
          speedBytesPerSec = (downloadedBytes - snap.bytes) / ((now - snap.ts) / 1000);
          lastSpeedSnapshot.current.set(id, { bytes: downloadedBytes, ts: now });
        } else if (!snap) {
          lastSpeedSnapshot.current.set(id, { bytes: downloadedBytes, ts: now });
        }

        const statePct = progress < 0 ? -1 : Math.floor(progress * 100);
        const lastState = lastStatePct.current.get(id) ?? -999;
        if (Math.abs(statePct - lastState) >= 1 || progress < 0) {
          lastStatePct.current.set(id, statePct);
          setActiveProgress((prev) => {
            const next = new Map(prev);
            const prevSpeed = prev.get(id)?.speedBytesPerSec;
            next.set(id, { progress, downloadedBytes, totalBytes, speedBytesPerSec: speedBytesPerSec ?? prevSpeed });
            return next;
          });
          setDownloads((prev) =>
            prev.map((d) =>
              d.id === id ? { ...d, status: "downloading", progress, downloadedBytes, totalBytes } : d
            )
          );
        }

        if (progress < 0) {
          const MB = Math.floor(downloadedBytes / (1024 * 1024));
          if (MB > (lastNotifPct.current.get(id) ?? -999)) {
            lastNotifPct.current.set(id, MB);
            showProgressNotif(id, label, -1, downloadedBytes, totalBytes);
          }
        } else {
          const roundedPct = Math.floor(Math.floor(progress * 100) / 5) * 5;
          if (roundedPct > (lastNotifPct.current.get(id) ?? -1)) {
            lastNotifPct.current.set(id, roundedPct);
            showProgressNotif(id, label, roundedPct, downloadedBytes, totalBytes);
          }
        }
      },

      onComplete: async (id, fileUri, subtitleUri) => {
        await clearProgressNotif(id);
        setActiveProgress((prev) => { const next = new Map(prev); next.delete(id); return next; });
        setDownloads((prev) =>
          prev.map((d) =>
            d.id === id
              ? { ...d, status: "completed", progress: 1, fileUri, ...(subtitleUri ? { subtitleUri } : {}) }
              : d
          )
        );
        if (Platform.OS === "android" && isNativeAvailable()) {
          await nativeCompleteNotif(notifIdFor(id), label);
        } else {
          postNotification(
            "✅  Download Complete",
            `"${label}" is ready to watch offline`,
            { type: "download_complete" }
          );
        }
      },

      onError: async (id, error) => {
        await clearProgressNotif(id);
        setActiveProgress((prev) => { const next = new Map(prev); next.delete(id); return next; });
        setDownloads((prev) =>
          prev.map((d) => (d.id === id ? { ...d, status: "failed" } : d))
        );
        Alert.alert("Download Failed", "Something went wrong. Please check your connection and try again.");
      },
    }),
    [showProgressNotif, clearProgressNotif]
  );

  // ── Sequential queue processor ─────────────────────────────────────────────

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return;

    while (downloadQueueRef.current.length > 0) {
      isProcessingRef.current = true;
      const entry = downloadQueueRef.current.shift()!;
      setQueueLength(downloadQueueRef.current.length);

      // Mark as actively downloading now (was "queued")
      setDownloads((prev) =>
        prev.map((d) => (d.id === entry.downloadId ? { ...d, status: "downloading" } : d))
      );

      // Resolve stream URL lazily (fresh URL at processing time)
      let streamUrl: string | null = entry.directUrl ?? null;
      let subtitleUrl: string | null = entry.subtitleUrl ?? null;

      if (!streamUrl) {
        try {
          const data = await fetchStreamData(entry.subjectId, entry.detailPath, entry.season, entry.episode);
          const best = data.qualities[data.qualities.length - 1];
          streamUrl = best?.downloadUrl ?? best?.url ?? null;
          if (!subtitleUrl && data.subtitles.length > 0) {
            const eng = data.subtitles.find((s) => s.language.startsWith("en")) ?? data.subtitles[0];
            subtitleUrl = eng?.url ?? null;
          }
        } catch {
          setDownloads((prev) =>
            prev.map((d) => (d.id === entry.downloadId ? { ...d, status: "failed" } : d))
          );
          Alert.alert("Error", `Could not get the download link for "${entry.label}". Skipping.`);
          isProcessingRef.current = false;
          continue;
        }
      }

      if (!streamUrl) {
        setDownloads((prev) =>
          prev.map((d) => (d.id === entry.downloadId ? { ...d, status: "failed" } : d))
        );
        isProcessingRef.current = false;
        continue;
      }

      const cbs = makeCallbacks(entry.downloadId, entry.label);
      showProgressNotif(entry.downloadId, entry.label, 0);

      try {
        await startDownload(
          entry.downloadId,
          streamUrl,
          entry.title,
          entry.posterUrlId,
          entry.subjectType,
          entry.season,
          entry.episode,
          entry.label,
          cbs.onProgress,
          cbs.onComplete,
          cbs.onError,
          entry.subjectId,
          entry.detailPath,
          subtitleUrl ?? undefined,
        );
      } catch (e) {
        console.error("[Queue]", entry.downloadId, e);
        cbs.onError(entry.downloadId, "Download failed. Please check your connection and try again.");
      }

      isProcessingRef.current = false;
    }

    setQueueLength(0);
  }, [makeCallbacks, showProgressNotif]);

  // ── Background pause / resume ──────────────────────────────────────────────

  const BG_NOTIF_ID = "cineverse_bg_downloads";

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
        const pausedIds = await pauseAllActiveDownloads();
        if (pausedIds.length > 0) {
          setDownloads((prev) =>
            prev.map((d) => (pausedIds.includes(d.id) ? { ...d, status: "paused" } : d))
          );
          setActiveProgress((prev) => {
            const next = new Map(prev);
            pausedIds.forEach((id) => next.delete(id));
            return next;
          });

          if (Platform.OS !== "web") {
            const allStored = await getAllDownloads();
            const pausedItems = allStored.filter((d) => pausedIds.includes(d.id));
            const titleLine =
              pausedItems.length === 1
                ? `⏸ Paused — ${pausedItems[0].label}`
                : `⏸ ${pausedItems.length} downloads paused`;
            const bodyLine =
              pausedItems.length === 1
                ? `${Math.round((pausedItems[0].progress ?? 0) * 100)}% complete — will resume when you return`
                : pausedItems.map((d) => `${d.label} (${Math.round((d.progress ?? 0) * 100)}%)`).join(", ") +
                  " — will resume when you return";
            try {
              await Notifications.scheduleNotificationAsync({
                identifier: BG_NOTIF_ID,
                content: {
                  title: titleLine,
                  body: bodyLine,
                  sound: false,
                  data: { type: "download_bg" },
                  ...(Platform.OS === "android" ? { channelId: "downloads" } : {}),
                },
                trigger: null,
              });
            } catch {}
          }
        }
      } else if (nextState === "active") {
        if (Platform.OS !== "web") {
          Notifications.dismissNotificationAsync(BG_NOTIF_ID).catch(() => {});
        }

        const pausedIds = await getPausedDownloadIds();
        if (pausedIds.length === 0) return;

        const allStored = await getAllDownloads();
        for (const downloadId of pausedIds) {
          const item = allStored.find((d) => d.id === downloadId);
          if (!item) continue;
          const { label } = item;
          const resumePct = Math.round((item.progress ?? 0) * 100);
          showProgressNotif(downloadId, label, resumePct);
          setDownloads((prev) =>
            prev.map((d) => (d.id === downloadId ? { ...d, status: "downloading" } : d))
          );
          const cbs = makeCallbacks(downloadId, label);
          await restoreAndResumeDownload(downloadId, cbs);
        }
      }
    });
    return () => sub.remove();
  }, [showProgressNotif, makeCallbacks]);

  // ── initiateDownload — adds to queue ──────────────────────────────────────

  const initiateDownload = useCallback(
    async ({
      subjectId,
      title,
      posterUrlId,
      subjectType,
      detailPath,
      season,
      episode,
      directUrl,
      subtitleUrl,
    }: {
      subjectId: string;
      title: string;
      posterUrlId: string;
      subjectType?: number;
      detailPath?: string;
      season?: number;
      episode?: number;
      directUrl?: string;
      subtitleUrl?: string;
    }) => {
      const downloadId = makeDownloadId(subjectId, season, episode);
      const existing = downloads.find((d) => d.id === downloadId);

      if (existing?.status === "completed") {
        Alert.alert("Already Downloaded", "This content is already saved offline.");
        return;
      }
      if (existing?.status === "downloading") {
        Alert.alert("Downloading", "This content is already being downloaded.");
        return;
      }
      if (existing?.status === "queued") {
        Alert.alert("In Queue", "This content is already queued for download.");
        return;
      }
      if (existing?.status === "paused") {
        Alert.alert("Paused", "This download is paused. It will resume when you reopen the app.");
        return;
      }

      let label = title;
      if (season !== undefined && episode !== undefined) {
        label = `${title} — S${season}E${episode}`;
      }

      // Add a "queued" placeholder to the list immediately so the UI shows it
      const placeholder: DownloadItem = {
        id: downloadId,
        title,
        label,
        posterUrlId,
        subjectType,
        season,
        episode,
        fileUri: "",
        status: "queued",
        progress: 0,
        totalBytes: 0,
        downloadedBytes: 0,
        createdAt: new Date().toISOString(),
      };
      setDownloads((prev) => {
        const filtered = prev.filter((d) => d.id !== downloadId);
        return [placeholder, ...filtered];
      });
      await upsertDownload(placeholder);

      // Add to queue
      const entry: QueueEntry = {
        downloadId,
        subjectId,
        title,
        label,
        posterUrlId,
        subjectType,
        detailPath,
        season,
        episode,
        directUrl,
        subtitleUrl,
      };
      downloadQueueRef.current.push(entry);
      setQueueLength(downloadQueueRef.current.length);

      // Kick off queue processing (no-op if already running)
      processQueue();
    },
    [downloads, processQueue]
  );

  // ── Other actions ──────────────────────────────────────────────────────────

  const deleteDownload = useCallback(async (id: string) => {
    // Also remove from queue if it's there
    const qi = downloadQueueRef.current.findIndex((e) => e.downloadId === id);
    if (qi >= 0) {
      downloadQueueRef.current.splice(qi, 1);
      setQueueLength(downloadQueueRef.current.length);
    }
    await clearProgressNotif(id);
    await removeDownload(id);
    setDownloads((prev) => prev.filter((d) => d.id !== id));
  }, [clearProgressNotif]);

  const cancelActiveDownload = useCallback(async (id: string) => {
    // Remove from queue if pending
    const qi = downloadQueueRef.current.findIndex((e) => e.downloadId === id);
    if (qi >= 0) {
      downloadQueueRef.current.splice(qi, 1);
      setQueueLength(downloadQueueRef.current.length);
    }
    await clearProgressNotif(id);
    await cancelDownload(id);
    await refreshDownloads();
    setActiveProgress((prev) => { const next = new Map(prev); next.delete(id); return next; });
  }, [clearProgressNotif, refreshDownloads]);

  const retryDownload = useCallback(async (id: string) => {
    const item = downloads.find((d) => d.id === id);
    if (!item || item.status !== "failed") return;
    const sid = item.subjectId ?? id.split("_s")[0];
    await deleteDownload(id);
    await initiateDownload({
      subjectId: sid,
      title: item.title,
      posterUrlId: item.posterUrlId,
      subjectType: item.subjectType,
      detailPath: item.detailPath,
      season: item.season,
      episode: item.episode,
      // Re-use the previously resolved stream URL so retry never needs to
      // call the stream API again. If the URL is stale the download itself
      // will fail and the user can retry once more with a fresh URL.
      directUrl: item.sourceUrl,
      subtitleUrl: item.subtitleUrl,
    });
  }, [downloads, deleteDownload, initiateDownload]);

  const getStatus   = useCallback((id: string) => downloads.find((d) => d.id === id)?.status, [downloads]);
  const getDownload = useCallback((id: string) => downloads.find((d) => d.id === id),          [downloads]);

  return (
    <DownloadContext.Provider
      value={{
        downloads,
        activeProgress,
        queueLength,
        initiateDownload,
        retryDownload,
        deleteDownload,
        cancelActiveDownload,
        getStatus,
        getDownload,
        refreshDownloads,
        completedCount,
      }}
    >
      {children}
    </DownloadContext.Provider>
  );
}

export function useDownloads() {
  return useContext(DownloadContext);
}
