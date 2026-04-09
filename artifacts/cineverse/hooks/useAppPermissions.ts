import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as IntentLauncher from "expo-intent-launcher";
import * as CineverseFs from "cineverse-fs";
import * as MediaLibrary from "expo-media-library";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { AppState, AppStateStatus, PermissionsAndroid, Platform } from "react-native";
import { resetStorageMode } from "@/lib/downloadManager";

const PUBLIC_CINEVERSE_DIR   = "/storage/emulated/0/DCIM/CINEVERSE/";

// AsyncStorage keys — each flag is written exactly once (after the user is
// shown the relevant prompt). Once written it is never cleared, so the prompt
// never comes back on subsequent launches even if the app restarts.
const KEY_STORAGE_ASKED      = "@cineverse_manage_storage_confirmed";
const KEY_NOTIFICATIONS_ASKED = "@cineverse_notifications_asked";
const KEY_RUNTIME_PERMS_ASKED = "@cineverse_runtime_perms_asked";

// ── Persistent flags ─────────────────────────────────────────────────────────

async function getFlag(key: string): Promise<boolean> {
  try { return (await AsyncStorage.getItem(key)) === "1"; } catch { return false; }
}
async function setFlag(key: string) {
  try { await AsyncStorage.setItem(key, "1"); } catch {}
}

// ── Media library (called externally from downloads) ─────────────────────────

export async function requestMediaLibraryPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  const { status, canAskAgain } = await MediaLibrary.getPermissionsAsync();
  if (status === "granted") return true;
  if (canAskAgain) {
    const { status: s } = await MediaLibrary.requestPermissionsAsync(false, ["photo", "video", "audio"]);
    return s === "granted";
  }
  return true;
}

// ── MANAGE_EXTERNAL_STORAGE ───────────────────────────────────────────────────

async function openManageStorageSettings() {
  try {
    await IntentLauncher.startActivityAsync(
      "android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION",
      { data: "package:com.cineverse.app" }
    );
  } catch {
    try {
      await IntentLauncher.startActivityAsync(
        "android.settings.MANAGE_ALL_FILES_ACCESS_PERMISSION"
      );
    } catch {}
  }
}

async function requestManageExternalStorage() {
  if (Platform.OS !== "android") return;

  // Already shown once — never prompt again.
  if (await getFlag(KEY_STORAGE_ASKED)) return;

  // Mark BEFORE opening settings so even if the user kills the app mid-flow
  // it is still recorded and won't show again.
  await setFlag(KEY_STORAGE_ASKED);

  // Open the All-Files-Access settings page for this app directly.
  await openManageStorageSettings();
}

// ── Runtime permissions (READ_MEDIA_*, WRITE, etc.) ──────────────────────────

async function requestAllAndroidPermissions() {
  if (Platform.OS !== "android") return;

  // Only request once — Android tracks deny/never-ask-again itself,
  // but we avoid popping the dialog on every single launch.
  if (await getFlag(KEY_RUNTIME_PERMS_ASKED)) return;
  await setFlag(KEY_RUNTIME_PERMS_ASKED);

  const candidates = [
    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
    PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
    PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
    // NOTE: POST_NOTIFICATIONS is handled separately via Expo Notifications
    // to avoid asking twice (PermissionsAndroid + Expo both request it).
  ] as string[];

  const toRequest: string[] = [];
  for (const perm of candidates) {
    if (!perm) continue;
    try {
      const already = await PermissionsAndroid.check(perm as any);
      if (!already) toRequest.push(perm);
    } catch {
      toRequest.push(perm);
    }
  }

  if (toRequest.length > 0) {
    await PermissionsAndroid.requestMultiple(toRequest as any[]);
  }
}

// ── Notification permission ───────────────────────────────────────────────────

async function requestNotificationPermission() {
  // Only ask once — we persist the flag ourselves because the Expo
  // Notifications status can return "undetermined" even after the user
  // responds on certain Android versions, causing a repeat dialog.
  if (await getFlag(KEY_NOTIFICATIONS_ASKED)) return;
  await setFlag(KEY_NOTIFICATIONS_ASKED);

  if (!Device.isDevice) return;

  await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAppPermissions() {
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (Platform.OS === "web") return;

    async function setup() {
      if (Platform.OS === "android") {
        // Set up the notification channel (safe to call every launch).
        await Notifications.setNotificationChannelAsync("downloads", {
          name: "Downloads",
          importance: Notifications.AndroidImportance.HIGH,
          sound: "default",
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#13CFCF",
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          showBadge: true,
        });

        // 1. All-Files-Access first (opens settings, shown once ever).
        await requestManageExternalStorage();

        // 2. Eagerly create the CINEVERSE folder right after.
        try { await CineverseFs.makeDirectoryAsync(PUBLIC_CINEVERSE_DIR); } catch {}

        // 3. Runtime permissions (READ_MEDIA_*, WRITE) — asked once ever.
        await requestAllAndroidPermissions();
      }

      // 4. Notification permission — asked once ever, not tied to Android-only.
      await requestNotificationPermission();
    }

    setup();

    // When the user comes back from a background activity (e.g. settings page)
    // reset the storage path cache so the next download re-checks which folder
    // is writable and picks up any permission changes.
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (
        Platform.OS === "android" &&
        appState.current.match(/inactive|background/) &&
        next === "active"
      ) {
        resetStorageMode();
      }
      appState.current = next;
    });

    return () => sub.remove();
  }, []);
}
