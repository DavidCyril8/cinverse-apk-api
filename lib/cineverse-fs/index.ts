import { requireNativeModule } from "expo-modules-core";

let CineverseFsNative: Record<string, (...args: any[]) => any> | null = null;

try {
  CineverseFsNative = requireNativeModule("CineverseFs");
} catch {
  console.warn(
    "[cineverse-fs] Native module not found — a new development build is required. " +
    "Public storage moves will fall back to MediaLibrary.",
  );
}

/**
 * Returns true if the native module is loaded and available.
 * Use this to gate native-only features.
 */
export function isAvailable(): boolean {
  return CineverseFsNative !== null;
}

/**
 * Create a directory (and all parents) at any path on the device,
 * including public external storage like /storage/emulated/0/Movies/.
 * Requires MANAGE_EXTERNAL_STORAGE to be granted for paths outside the app sandbox.
 */
export async function makeDirectoryAsync(path: string): Promise<void> {
  if (!CineverseFsNative) throw new Error("cineverse-fs native module not available");
  return CineverseFsNative.makeDirectoryAsync(toNativePath(path));
}

/**
 * Move a file from one location to another.
 * Works across internal ↔ external storage (falls back to copy+delete if needed).
 */
export async function moveFileAsync(from: string, to: string): Promise<void> {
  if (!CineverseFsNative) throw new Error("cineverse-fs native module not available");
  return CineverseFsNative.moveFileAsync(toNativePath(from), toNativePath(to));
}

/**
 * Copy a file from one location to another.
 */
export async function copyFileAsync(from: string, to: string): Promise<void> {
  if (!CineverseFsNative) throw new Error("cineverse-fs native module not available");
  return CineverseFsNative.copyFileAsync(toNativePath(from), toNativePath(to));
}

/**
 * Delete a file or directory (recursively).
 */
export async function deleteAsync(path: string): Promise<void> {
  if (!CineverseFsNative) throw new Error("cineverse-fs native module not available");
  return CineverseFsNative.deleteAsync(toNativePath(path));
}

/**
 * Returns the root path of the device's primary external storage,
 * e.g. "/storage/emulated/0".
 */
export function getExternalStoragePath(): string {
  if (!CineverseFsNative) throw new Error("cineverse-fs native module not available");
  return CineverseFsNative.getExternalStoragePath();
}

// ── Notification helpers ──────────────────────────────────────────────────────

/**
 * Show a sticky progress notification with a native Android progress bar.
 * progress: 0-100, or -1 for indeterminate.
 */
export async function postProgressNotification(
  notifId: number,
  label: string,
  downloadedBytes: number,
  totalBytes: number,
  progress: number,
): Promise<void> {
  if (!CineverseFsNative) return;
  try {
    return CineverseFsNative.postProgressNotification(notifId, label, downloadedBytes, totalBytes, progress);
  } catch {}
}

/**
 * Show a "Download successfully" notification with a Play action button.
 */
export async function postCompleteNotification(notifId: number, label: string): Promise<void> {
  if (!CineverseFsNative) return;
  try {
    return CineverseFsNative.postCompleteNotification(notifId, label);
  } catch {}
}

/**
 * Cancel a notification by its integer ID.
 */
export async function cancelNotification(notifId: number): Promise<void> {
  if (!CineverseFsNative) return;
  try {
    return CineverseFsNative.cancelNotification(notifId);
  } catch {}
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/**
 * Deterministic integer notification ID from a download ID string.
 * Uses djb2 hash, result is always in [1, 999_999].
 */
export function notifIdFor(downloadId: string): number {
  let h = 5381;
  for (let i = 0; i < downloadId.length; i++) {
    h = ((h << 5) + h) ^ downloadId.charCodeAt(i);
    h |= 0;
  }
  return (Math.abs(h) % 999_999) + 1;
}

/**
 * Returns a file:// URI from a raw path.
 */
export function toFileUri(rawPath: string): string {
  if (rawPath.startsWith("file://")) return rawPath;
  return "file://" + rawPath;
}

/**
 * Strip file:// prefix for native Java File operations.
 */
function toNativePath(path: string): string {
  if (path.startsWith("file://")) return path.slice(7);
  return path;
}
