import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ForceUpdateScreen } from "@/components/ForceUpdateScreen";
import { OfflineBanner } from "@/components/OfflineBanner";
import { OfflineScreen } from "@/components/OfflineScreen";
import { UpdateModal } from "@/components/UpdateModal";
import { AdOverlay } from "@/components/AdOverlay";
import { checkForUpdate, UpdateInfo } from "@/lib/appUpdate";
import { incrementLaunchCount } from "@/lib/adManager";
import { AuthProvider } from "@/context/AuthContext";
import { WatchlistProvider } from "@/context/WatchlistContext";
import { DownloadProvider } from "@/context/DownloadContext";
import { WatchHistoryProvider } from "@/context/WatchHistoryContext";
import { NetworkProvider, useNetwork } from "@/context/NetworkContext";
import { SearchHistoryProvider } from "@/context/SearchHistoryContext";
import { useAppPermissions } from "@/hooks/useAppPermissions";
import { scheduleTrendingNotification } from "@/lib/trendingNotifications";
import { usePathname, useRouter } from "expo-router";

SplashScreen.preventAutoHideAsync();

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const ND = Platform.OS !== "web";

function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const safetyTimer = setTimeout(() => onDoneRef.current(), 3000);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 550,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: ND,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: ND,
        }),
      ]),
      Animated.timing(tagOpacity, {
        toValue: 1,
        duration: 350,
        delay: 80,
        useNativeDriver: ND,
      }),
      Animated.delay(650),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 450,
        useNativeDriver: ND,
      }),
    ]).start(({ finished }) => {
      clearTimeout(safetyTimer);
      if (finished) onDoneRef.current();
    });

    return () => clearTimeout(safetyTimer);
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.splash, { opacity: overlayOpacity }]}>
      <Animated.Text
        style={[
          styles.splashLogo,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        CINVERSE
      </Animated.Text>
      <Animated.Text style={[styles.splashTag, { opacity: tagOpacity }]}>
        Your Cinematic Universe
      </Animated.Text>
    </Animated.View>
  );
}

function RootLayoutNav() {
  useAppPermissions();
  const router = useRouter();
  const pathname = usePathname();
  const isInPlayer = pathname.startsWith("/player/");
  const { connectionQuality } = useNetwork();
  // Only cover the home tab — downloads and other tabs stay usable offline
  const isOnHomePage = pathname === "/" || pathname === "/(tabs)" || pathname === "/(tabs)/index";

  useEffect(() => {
    scheduleTrendingNotification().catch(() => {});
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string>;
      if (data?.type === "trending" && data.movieId) {
        router.push(`/movie/${data.movieId}` as any);
      }
    });
    return () => sub.remove();
  }, [router]);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#141414" },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="movie/[id]"
          options={{ headerShown: false, presentation: "card" }}
        />
        <Stack.Screen
          name="player/[id]"
          options={{ headerShown: false, presentation: "fullScreenModal", animation: "fade" }}
        />
        <Stack.Screen
          name="auth/login"
          options={{ headerShown: false, presentation: "modal", animation: "slide_from_bottom" }}
        />
        <Stack.Screen
          name="auth/register"
          options={{ headerShown: false, presentation: "modal", animation: "slide_from_bottom" }}
        />
      </Stack>
      {!isInPlayer && connectionQuality === "offline" && isOnHomePage && <OfflineScreen />}
      {!isInPlayer && <OfflineBanner />}
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [timedOut, setTimedOut] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [showSplashAnim, setShowSplashAnim] = useState(false);
  const splashHidden = useRef(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const [adDone, setAdDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError || timedOut) && !splashHidden.current) {
      splashHidden.current = true;
      SplashScreen.hideAsync()
        .catch(() => {})
        .finally(() => {
          setShowSplashAnim(true);
        });
    }
  }, [fontsLoaded, fontError, timedOut]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    checkForUpdate().then((info) => {
      if (info?.updateAvailable) setUpdateInfo(info);
    });
  }, []);

  // Increment launch count once per session (used by AdOverlay eligibility check)
  useEffect(() => {
    if (Platform.OS !== "web") incrementLaunchCount().catch(() => {});
  }, []);

  if (!fontsLoaded && !fontError && !timedOut) return null;

  if (updateInfo?.forceUpdate) {
    return (
      <SafeAreaProvider>
        <ForceUpdateScreen info={updateInfo} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <NetworkProvider>
            <AuthProvider>
              <WatchlistProvider>
                <WatchHistoryProvider>
                  <DownloadProvider>
                    <SearchHistoryProvider>
                      <GestureHandlerRootView style={{ flex: 1 }}>
                        <KeyboardProvider>
                          <RootLayoutNav />
                          {Platform.OS !== "web" && showSplashAnim && !splashDone && (
                            <AnimatedSplash onDone={() => setSplashDone(true)} />
                          )}
                          {Platform.OS !== "web" && splashDone && !adDone && (
                            <AdOverlay onClose={() => setAdDone(true)} />
                          )}
                          {updateInfo && !updateInfo.forceUpdate && !updateDismissed && (
                            <UpdateModal
                              info={updateInfo}
                              onDismiss={() => setUpdateDismissed(true)}
                            />
                          )}
                        </KeyboardProvider>
                      </GestureHandlerRootView>
                    </SearchHistoryProvider>
                  </DownloadProvider>
                </WatchHistoryProvider>
              </WatchlistProvider>
            </AuthProvider>
          </NetworkProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    backgroundColor: "#141414",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    zIndex: 999,
  },
  splashLogo: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#13CFCF",
    letterSpacing: 6,
  },
  splashTag: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 2,
  },
});
