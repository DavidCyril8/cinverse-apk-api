import Constants from "expo-constants";

const UPDATE_API = "https://app.cineverse.name.ng/check";

export interface UpdateInfo {
  updateAvailable: boolean;
  latestVersion: string;
  updateUrl: string;
  releaseNotes: string;
  forceUpdate: boolean;
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  try {
    const version =
      Constants.expoConfig?.version ??
      Constants.manifest?.version ??
      "1.0.0";

    const res = await fetch(`${UPDATE_API}?version=${encodeURIComponent(version)}`, {
      headers: { "Cache-Control": "no-cache" },
    });

    if (!res.ok) return null;
    const data: UpdateInfo = await res.json();
    return data;
  } catch {
    return null;
  }
}
