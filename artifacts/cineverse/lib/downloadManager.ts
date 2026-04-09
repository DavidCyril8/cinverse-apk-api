import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export type DownloadStatus = "queued" | "pending" | "downloading" | "completed" | "failed" | "paused";

export interface DownloadItem {
  id: string;
  title: string;
  posterUrlId: string;
  subjectType?: number;
  subjectId?: string;
  detailPath?: string;
  season?: number;
  episode?: number;
  fileUri: string;
  subtitleUri?: string;
  mediaLibraryId?: string;
  status: DownloadStatus;
  progress: number;
  totalBytes: number;
  downloadedBytes: number;
  createdAt: string;
  label: string;
  sourceUrl?: string;    // the resolved stream URL — stored so retry can skip re-fetching
  subtitleUrl?: string;  // stored so retry can re-use the same subtitle
}

interface PausedState {
  url: string;
  fileUri: string;
  options: Record<string, unknown>;
  resumeData?: string;
}

const STORAGE_KEY = "@cineverse_downloads_v1";
const PAUSED_KEY  = "@cineverse_paused_states_v1";

// ── Storage root ─────────────────────────────────────────────────────────────
//
// All downloads live in internal app-private storage (never auto-moved to
// public storage). Users can copy a file to their phone gallery on demand via
// the "Save to Gallery" option in the downloads screen's ⋮ menu.
//
// Internal layout:
//   <documentDirectory>/CINEVERSE/
//   ├── Movies/{Title}.mp4
//   ├── Series/{Title}/Season N/S##E##.mp4
//   └── Subtitles/
//       ├── Movies/{Title}.srt
//       └── Series/{Title}/Season N/S##E##.srt

const INTERNAL_BASE = FileSystem.documentDirectory ?? "";

// No-op kept for backwards compat (useAppPermissions imports this).
export function resetStorageMode() {}

// ── Folder / file name helpers ────────────────────────────────────────────────

function sanitizeName(name: string): string {
  return name
    .replace(/[/\\?%*:|"<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 80);
}

function padN(n: number) { return String(n).padStart(2, "0"); }

// Build a temporary download path inside the app's private internal storage.
// expo-file-system requires this — the native module moves it to public storage
// after the download completes.
async function buildInternalVideoUri(
  title: string,
  season?: number,
  episode?: number,
): Promise<string> {
  const safe = sanitizeName(title);
  const base = `${INTERNAL_BASE}CINEVERSE/`;
  if (season !== undefined && episode !== undefined) {
    const dir = `${base}Series/${safe}/Season ${season}/`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    return `${dir}S${padN(season)}E${padN(episode)}.mp4`;
  }
  const dir = `${base}Movies/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  return `${dir}${safe}.mp4`;
}

async function buildInternalSubtitleUri(
  title: string,
  season?: number,
  episode?: number,
): Promise<string> {
  const safe = sanitizeName(title);
  const base = `${INTERNAL_BASE}CINEVERSE/Subtitles/`;
  if (season !== undefined && episode !== undefined) {
    const dir = `${base}Series/${safe}/Season ${season}/`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    return `${dir}S${padN(season)}E${padN(episode)}.srt`;
  }
  const dir = `${base}Movies/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  return `${dir}${safe}.srt`;
}

// ── Save to Gallery (on-demand) ──────────────────────────────────────────────
//
// Copies an already-downloaded file to the phone's media library (Pictures/CINEVERSE).
// Called explicitly by the user via the ⋮ menu on the downloads screen.

export async function saveToGallery(fileUri: string): Promise<boolean> {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") return false;
    const asset = await MediaLibrary.createAssetAsync(fileUri);
    let album = await MediaLibrary.getAlbumAsync("CINEVERSE");
    if (!album) {
      await MediaLibrary.createAlbumAsync("CINEVERSE", asset, false);
    } else {
      await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
    }
    return true;
  } catch {
    return false;
  }
}

// ── AsyncStorage helpers ─────────────────────────────────────────────────────

export async function getAllDownloads(): Promise<DownloadItem[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as DownloadItem[]; } catch { return []; }
}

export async function saveDownloads(items: DownloadItem[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function upsertDownload(item: DownloadItem) {
  const all = await getAllDownloads();
  const idx = all.findIndex((d) => d.id === item.id);
  if (idx >= 0) all[idx] = item;
  else all.unshift(item);
  await saveDownloads(all);
}

// ── Delete helpers ───────────────────────────────────────────────────────────

async function deleteFromAlbumByFilename(fileUri?: string) {
  if (!fileUri) return;
  try {
    const filename = fileUri.split("/").pop() ?? "";
    if (!filename) return;
    for (const albumName of ["CINEVERSE", "CINVERSE"]) {
      const album = await MediaLibrary.getAlbumAsync(albumName);
      if (!album) continue;
      let cursor: string | undefined;
      do {
        const page = await MediaLibrary.getAssetsAsync({
          album,
          mediaType: "video",
          first: 100,
          after: cursor,
        });
        const match = page.assets.find((a) => a.filename === filename);
        if (match) {
          await MediaLibrary.deleteAssetsAsync([match.id]);
          return;
        }
        cursor = page.hasNextPage ? page.endCursor : undefined;
      } while (cursor);
    }
  } catch {}
}

export async function removeDownload(id: string) {
  const all = await getAllDownloads();
  const item = all.find((d) => d.id === id);
  if (item?.fileUri) {
    try { await FileSystem.deleteAsync(item.fileUri, { idempotent: true }); } catch {}
  }
  if (item?.subtitleUri) {
    try { await FileSystem.deleteAsync(item.subtitleUri, { idempotent: true }); } catch {}
  }
  if (item?.mediaLibraryId) {
    try {
      await MediaLibrary.deleteAssetsAsync([item.mediaLibraryId]);
    } catch {
      await deleteFromAlbumByFilename(item.fileUri);
    }
  } else {
    await deleteFromAlbumByFilename(item?.fileUri);
  }
  const next = all.filter((d) => d.id !== id);
  await saveDownloads(next);
  await removePausedState(id);
}

export function makeDownloadId(subjectId: string, season?: number, episode?: number): string {
  if (season !== undefined && episode !== undefined) return `${subjectId}_s${season}e${episode}`;
  return subjectId;
}

// ── Pause / resume state ─────────────────────────────────────────────────────

async function loadPausedStates(): Promise<Record<string, PausedState>> {
  const raw = await AsyncStorage.getItem(PAUSED_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

async function savePausedState(downloadId: string, state: PausedState) {
  const all = await loadPausedStates();
  all[downloadId] = state;
  await AsyncStorage.setItem(PAUSED_KEY, JSON.stringify(all));
}

async function removePausedState(downloadId: string) {
  const all = await loadPausedStates();
  delete all[downloadId];
  await AsyncStorage.setItem(PAUSED_KEY, JSON.stringify(all));
}

export async function getPausedDownloadIds(): Promise<string[]> {
  const all = await loadPausedStates();
  return Object.keys(all);
}

// ── Subtitle download ────────────────────────────────────────────────────────

async function downloadSubtitle(
  subtitleUrl: string,
  subtitleUri: string,
): Promise<string | undefined> {
  try {
    const resp = await fetch(subtitleUrl);
    if (!resp.ok) return undefined;
    const text = await resp.text();
    await FileSystem.writeAsStringAsync(subtitleUri, text);
    return subtitleUri;
  } catch {
    return undefined;
  }
}

// ── Active downloads map ─────────────────────────────────────────────────────

let activeDownloads: Map<string, FileSystem.DownloadResumable> = new Map();

export type DownloadCallbacks = {
  onProgress: (id: string, progress: number, downloaded: number, total: number) => void;
  onComplete: (id: string, fileUri: string, subtitleUri?: string) => void;
  onError: (id: string, error: string) => void;
};

// ── Start download ───────────────────────────────────────────────────────────

export async function startDownload(
  downloadId: string,
  sourceUrl: string,
  title: string,
  posterUrlId: string,
  subjectType: number | undefined,
  season: number | undefined,
  episode: number | undefined,
  label: string,
  onProgress: DownloadCallbacks["onProgress"],
  onComplete: DownloadCallbacks["onComplete"],
  onError: DownloadCallbacks["onError"],
  subjectId?: string,
  detailPath?: string,
  subtitleUrl?: string,
): Promise<void> {
  // Download to internal storage first (expo-file-system sandbox requirement).
  // The native module moves it to Movies/CINEVERSE/ after completion.
  const internalUri = await buildInternalVideoUri(title, season, episode);
  console.info(`[Download] Starting: "${label}" → internal:${internalUri}`);

  const item: DownloadItem = {
    id: downloadId,
    title,
    posterUrlId,
    subjectType,
    subjectId,
    detailPath,
    season,
    episode,
    fileUri: internalUri,
    status: "downloading",
    progress: 0,
    totalBytes: 0,
    downloadedBytes: 0,
    createdAt: new Date().toISOString(),
    label,
    sourceUrl,
    subtitleUrl: subtitleUrl ?? undefined,
  };
  await upsertDownload(item);

  const downloadHeaders = {
    "User-Agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
    "Accept": "video/mp4,video/*,*/*;q=0.9",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://h5.aoneroom.com/",
    "Origin": "https://h5.aoneroom.com",
  };

  const downloadResumable = FileSystem.createDownloadResumable(
    sourceUrl,
    internalUri,
    { headers: downloadHeaders },
    (progress) => {
      const downloaded = progress.totalBytesWritten;
      const total = progress.totalBytesExpectedToWrite;
      const pct = total > 0 ? downloaded / total : -1;
      onProgress(downloadId, pct, downloaded, total);
    }
  );

  activeDownloads.set(downloadId, downloadResumable);

  try {
    const result = await downloadResumable.downloadAsync();
    activeDownloads.delete(downloadId);

    if (result?.uri) {
      // File stays in internal app storage. User can save to gallery on demand.
      let subtitleUri: string | undefined;
      if (subtitleUrl) {
        const internalSub = await buildInternalSubtitleUri(title, season, episode);
        const savedSub    = await downloadSubtitle(subtitleUrl, internalSub);
        if (savedSub) subtitleUri = savedSub;
      }

      console.info(`[Download] Complete: "${label}" → ${result.uri}`);
      await upsertDownload({
        ...item,
        fileUri: result.uri,
        subtitleUri,
        status: "completed",
        progress: 1,
      });
      onComplete(downloadId, result.uri, subtitleUri);
    } else {
      await upsertDownload({ ...item, status: "failed" });
      onError(downloadId, "No file returned");
    }
  } catch (e) {
    activeDownloads.delete(downloadId);
    console.error("[Download]", downloadId, e);
    await upsertDownload({ ...item, status: "failed" });
    onError(downloadId, "Download failed. Please check your connection and try again.");
  }
}

// ── Pause ────────────────────────────────────────────────────────────────────

export async function pauseDownload(downloadId: string): Promise<boolean> {
  const resumable = activeDownloads.get(downloadId);
  if (!resumable) return false;
  try {
    const result = await resumable.pauseAsync();
    if (result) {
      await savePausedState(downloadId, {
        url: result.url,
        fileUri: result.fileUri,
        options: (result.options as Record<string, unknown>) || {},
        resumeData: result.resumeData,
      });
      activeDownloads.delete(downloadId);
      const all = await getAllDownloads();
      const item = all.find((d) => d.id === downloadId);
      if (item) await upsertDownload({ ...item, status: "paused" });
      return true;
    }
  } catch {}
  return false;
}

export async function pauseAllActiveDownloads(): Promise<string[]> {
  const paused: string[] = [];
  for (const id of Array.from(activeDownloads.keys())) {
    const ok = await pauseDownload(id);
    if (ok) paused.push(id);
  }
  return paused;
}

// ── Resume ───────────────────────────────────────────────────────────────────

export async function restoreAndResumeDownload(
  downloadId: string,
  callbacks: DownloadCallbacks
): Promise<boolean> {
  const states = await loadPausedStates();
  const state = states[downloadId];
  if (!state) return false;

  await removePausedState(downloadId);

  const all = await getAllDownloads();
  const item = all.find((d) => d.id === downloadId);
  if (!item) return false;

  await upsertDownload({ ...item, status: "downloading" });

  const resumeHeaders = {
    "User-Agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
    "Accept": "video/mp4,video/*,*/*;q=0.9",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://h5.aoneroom.com/",
    "Origin": "https://h5.aoneroom.com",
  };

  const resumable = new FileSystem.DownloadResumable(
    state.url,
    state.fileUri,
    { ...(state.options as FileSystem.DownloadOptions), headers: resumeHeaders },
    (progress) => {
      const downloaded = progress.totalBytesWritten;
      const total = progress.totalBytesExpectedToWrite;
      const pct = total > 0 ? downloaded / total : 0;
      callbacks.onProgress(downloadId, pct, downloaded, total);
    },
    state.resumeData
  );

  activeDownloads.set(downloadId, resumable);

  resumable
    .resumeAsync()
    .then(async (result) => {
      activeDownloads.delete(downloadId);
      if (result?.uri) {
        await upsertDownload({ ...item, fileUri: result.uri, status: "completed", progress: 1 });
        callbacks.onComplete(downloadId, result.uri, undefined);
      } else {
        await upsertDownload({ ...item, status: "failed" });
        callbacks.onError(downloadId, "Resume failed — no file returned");
      }
    })
    .catch(async (e) => {
      activeDownloads.delete(downloadId);
      console.error("[Resume]", downloadId, e);
      await upsertDownload({ ...item, status: "failed" });
      callbacks.onError(downloadId, "Download failed. Please check your connection and try again.");
    });

  return true;
}

// ── Cancel ───────────────────────────────────────────────────────────────────

export async function cancelDownload(downloadId: string) {
  const resumable = activeDownloads.get(downloadId);
  if (resumable) {
    try { await resumable.cancelAsync(); } catch {}
    activeDownloads.delete(downloadId);
  }
  await removePausedState(downloadId);
  const all = await getAllDownloads();
  const item = all.find((d) => d.id === downloadId);
  if (item) await upsertDownload({ ...item, status: "failed" });
}
