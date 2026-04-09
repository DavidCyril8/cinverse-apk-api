import { Video, ResizeMode } from "expo-av";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  fetchAd,
  getLaunchCount,
  markAdShownThisSession,
  wasAdShownThisSession,
  type AdData,
} from "@/lib/adManager";

const AD_SECONDS = 5;
const { width: SW, height: SH } = Dimensions.get("window");

interface Props {
  onClose: () => void;
}

export function AdOverlay({ onClose }: Props) {
  const [ad, setAd]           = useState<AdData | null>(null);
  const [ready, setReady]     = useState(false);
  const [seconds, setSeconds] = useState(AD_SECONDS);

  const fadeIn      = useRef(new Animated.Value(0)).current;
  const skipOpacity = useRef(new Animated.Value(0.35)).current;
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const closedRef   = useRef(false);

  const dismiss = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    Animated.timing(fadeIn, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [onClose, fadeIn]);

  // Load ad eligibility + fetch
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Already shown this session
      if (wasAdShownThisSession()) { onClose(); return; }

      // First launch only: only show from 2nd launch onwards
      const count = await getLaunchCount();
      if (count < 2) { onClose(); return; }

      const data = await fetchAd();
      if (cancelled) return;

      if (!data?.url) { onClose(); return; }

      markAdShownThisSession();
      setAd(data);
      setReady(true);
    })();

    return () => { cancelled = true; };
  }, []);

  // Fade-in + skip button + auto-dismiss once ad is ready
  useEffect(() => {
    if (!ready) return;

    // Fade the overlay in
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();

    // Animate skip button from dim → full over the ad duration
    Animated.timing(skipOpacity, {
      toValue: 1,
      duration: AD_SECONDS * 1000,
      useNativeDriver: true,
    }).start();

    // Countdown timer
    let remaining = AD_SECONDS;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setSeconds(remaining);
      if (remaining <= 0) dismiss();
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [ready]);

  if (!ready || !ad) return null;

  const handleAdTap = () => {
    if (ad.clickLink) {
      Linking.openURL(ad.clickLink).catch(() => {});
    }
  };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.container, { opacity: fadeIn }]}>
      {/* Ad content — tappable → opens click link */}
      <TouchableOpacity
        style={styles.adContent}
        activeOpacity={0.95}
        onPress={handleAdTap}
      >
        {ad.type === "video" ? (
          <Video
            source={{ uri: ad.url }}
            style={StyleSheet.absoluteFill}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isLooping={false}
            isMuted={false}
          />
        ) : (
          <Image
            source={{ uri: ad.url }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        )}

        {/* Dark gradient at the bottom for readability */}
        <View style={styles.bottomGradient} />

        {/* Ad title */}
        {!!ad.title && (
          <Text style={styles.adTitle} numberOfLines={2}>
            {ad.title}
          </Text>
        )}
      </TouchableOpacity>

      {/* Skip pill — bottom right, tricky small */}
      <Animated.View style={[styles.skipWrap, { opacity: skipOpacity }]}>
        <TouchableOpacity
          style={styles.skipPill}
          onPress={dismiss}
          activeOpacity={0.85}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={styles.pillBrand}>
            <Text style={styles.pillBrandText}>CINVERSE</Text>
          </View>
          <View style={styles.pillSkip}>
            <Text style={styles.pillSkipText}>
              {seconds > 0 ? `SKIP ${seconds}s` : "SKIP"}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 1100,
    backgroundColor: "#000",
    ...Platform.select({ android: { elevation: 20 } }),
  },
  adContent: {
    flex: 1,
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  adTitle: {
    position: "absolute",
    bottom: 64,
    left: 16,
    right: 100,
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  skipWrap: {
    position: "absolute",
    bottom: 24,
    right: 16,
  },
  skipPill: {
    flexDirection: "row",
    borderRadius: 20,
    overflow: "hidden",
  },
  pillBrand: {
    backgroundColor: "#13CFCF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  pillBrandText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  pillSkip: {
    backgroundColor: "#1c1c1e",
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  pillSkipText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});
