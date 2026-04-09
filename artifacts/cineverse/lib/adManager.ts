import AsyncStorage from "@react-native-async-storage/async-storage";

const LAUNCH_COUNT_KEY = "@cineverse_ad_launch_count";

export interface AdData {
  id: string;
  type: "image" | "video";
  url: string;
  clickLink: string;
  title: string;
  duration: number;
}

// In-memory session flag — resets every app open
let _adShownThisSession = false;

export function markAdShownThisSession() {
  _adShownThisSession = true;
}

export function wasAdShownThisSession(): boolean {
  return _adShownThisSession;
}

/**
 * Increments the launch count and returns the new value.
 * Call once per app launch. Ads only show when count >= 2.
 */
export async function incrementLaunchCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(LAUNCH_COUNT_KEY);
    const count = (parseInt(raw ?? "0", 10) || 0) + 1;
    await AsyncStorage.setItem(LAUNCH_COUNT_KEY, String(count));
    return count;
  } catch {
    return 1;
  }
}

export async function getLaunchCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(LAUNCH_COUNT_KEY);
    return parseInt(raw ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

/**
 * Fetch a single random ad from the ad server.
 * Returns null if the server is unreachable, returns no data, times out,
 * returns an empty body "()", or signals { status: "no ads" }.
 */
export async function fetchAd(): Promise<AdData | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch("https://ads.cinverse.name.ng/ad", {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) return null;

    const text = (await response.text()).trim();

    // Empty body or server returning () to signal no ads
    if (!text || text === "()" || text === "()") return null;

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text);
    } catch {
      return null;
    }

    // Server signals no ads via a status field
    if (typeof data.status === "string") {
      const s = data.status.toLowerCase();
      if (s.includes("no ad") || s === "empty" || s === "none") return null;
    }

    // Must have a url to be a valid ad
    if (!data?.url) return null;

    return data as unknown as AdData;
  } catch {
    return null;
  }
}
