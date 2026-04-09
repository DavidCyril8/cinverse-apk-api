import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { fetchTrending } from "./movieApi";

const LAST_NOTIF_KEY = "@cineverse_trending_notif_date";

export async function scheduleTrendingNotification(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const lastDate = await AsyncStorage.getItem(LAST_NOTIF_KEY);
    const today = new Date().toDateString();
    if (lastDate === today) return;

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;

    const trending = await fetchTrending();
    if (trending.length === 0) return;

    const movie = trending[Math.floor(Math.random() * Math.min(trending.length, 10))];

    const delayMs = (3 + Math.random() * 9) * 60 * 60 * 1000;
    const triggerDate = new Date(Date.now() + delayMs);
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    if (triggerDate >= midnight) {
      triggerDate.setTime(midnight.getTime() - 30 * 60 * 1000);
    }

    if (triggerDate <= new Date()) return;

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if ((n.content.data as any)?.type === "trending") {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }

    const imageUrl: string | undefined =
      (movie as any).posterUrlId || (movie as any).cover?.url || undefined;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔥 Trending on CINVERSE",
        body: `${movie.title} is trending right now. Don't miss it!`,
        data: {
          type: "trending",
          movieId: movie.id,
          detailPath: movie.detailPath ?? "",
        },
        ...(imageUrl
          ? {
              attachments: [{ url: imageUrl }],
              android: { imageUrl } as any,
            }
          : {}),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
    });

    await AsyncStorage.setItem(LAST_NOTIF_KEY, today);
  } catch {}
}
