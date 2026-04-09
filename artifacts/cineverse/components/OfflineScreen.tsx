import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNetwork } from "@/context/NetworkContext";

const OFFLINE_IMAGES = [
  require("@/assets/images/offline1.png"),
  require("@/assets/images/offline2.png"),
];

const WHATSAPP_URL = "https://whatsapp.com/channel/0029VbCZErf3WHTPJ0TD9Y33";
const TELEGRAM_URL = "https://t.me/davidcyriltechs";

export function OfflineScreen() {
  const { retry } = useNetwork();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [retrying, setRetrying] = useState(false);

  const image = useMemo(
    () => OFFLINE_IMAGES[Math.floor(Math.random() * OFFLINE_IMAGES.length)],
    []
  );

  const pulseAnim = useRef(new Animated.Value(1)).current;

  const handleRetry = async () => {
    if (retrying) return;
    setRetrying(true);
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
    await retry();
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
    setRetrying(false);
  };

  const handleWatchOffline = () => {
    router.navigate("/downloads" as any);
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  // Tab bar height constants so the offline screen never covers navigation tabs
  const TAB_BAR_H = Platform.OS === "ios" ? 49 : 56;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 16,
          paddingBottom: 16,
          // Override bottom so the tab bar remains visible beneath
          bottom: TAB_BAR_H + insets.bottom,
        },
      ]}
    >
      {/* Logo */}
      <View style={styles.logoRow}>
        <Text style={styles.logoTeal}>CINE</Text>
        <Text style={styles.logoWhite}>VERSE</Text>
      </View>

      {/* Illustration */}
      <View style={styles.imageWrap}>
        <Image source={image} style={styles.image} resizeMode="contain" />
      </View>

      {/* Text */}
      <Text style={styles.heading}>No Internet Connection</Text>
      <Text style={styles.subtitle}>
        Connect to Wi-Fi or mobile data to keep streaming. Your downloads are still available offline.
      </Text>

      {/* Retry button */}
      <Animated.View style={[styles.retryBtn, { opacity: retrying ? pulseAnim : 1 }]}>
        <Pressable
          onPress={handleRetry}
          disabled={retrying}
          style={({ pressed }) => [styles.retryInner, pressed && styles.pressed]}
        >
          {retrying ? (
            <ActivityIndicator size="small" color="#0a1a1a" />
          ) : (
            <Feather name="refresh-cw" size={15} color="#0a1a1a" />
          )}
          <Text style={styles.retryText}>{retrying ? "Checking..." : "Try Again"}</Text>
        </Pressable>
      </Animated.View>

      {/* Watch offline movies */}
      <Pressable
        onPress={handleWatchOffline}
        style={({ pressed }) => [styles.offlineBtn, pressed && styles.pressed]}
      >
        <Feather name="download" size={15} color="#13CFCF" />
        <Text style={styles.offlineBtnText}>Watch Offline Movies</Text>
      </Pressable>

      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerLabel}>Follow us</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Social links */}
      <View style={styles.socialRow}>
        <Pressable
          onPress={() => openLink(WHATSAPP_URL)}
          style={({ pressed }) => [styles.socialBtn, pressed && styles.pressed]}
        >
          <View style={[styles.socialIcon, { backgroundColor: "#25D36622" }]}>
            <WhatsAppIcon />
          </View>
          <Text style={styles.socialText}>WhatsApp</Text>
        </Pressable>

        <Pressable
          onPress={() => openLink(TELEGRAM_URL)}
          style={({ pressed }) => [styles.socialBtn, pressed && styles.pressed]}
        >
          <View style={[styles.socialIcon, { backgroundColor: "#2AABEE22" }]}>
            <TelegramIcon />
          </View>
          <Text style={styles.socialText}>Telegram</Text>
        </Pressable>
      </View>

      {/* Home bar */}
      <View style={styles.homeBar} />
    </View>
  );
}

function WhatsAppIcon() {
  return (
    <Feather
      name="message-circle"
      size={20}
      color="#25D366"
    />
  );
}

function TelegramIcon() {
  return (
    <Feather
      name="send"
      size={20}
      color="#2AABEE"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#141414",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    paddingHorizontal: 28,
  },
  logoRow: {
    flexDirection: "row",
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 48,
    alignSelf: "center",
  },
  logoTeal: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#13CFCF",
    letterSpacing: 4,
  },
  logoWhite: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 4,
  },
  imageWrap: {
    width: 280,
    height: 200,
    marginBottom: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  heading: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13.5,
    fontFamily: "Inter_400Regular",
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 300,
    marginBottom: 32,
  },
  retryBtn: {
    width: "100%",
    marginBottom: 12,
    borderRadius: 14,
    overflow: "hidden",
  },
  retryInner: {
    backgroundColor: "#13CFCF",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  retryText: {
    color: "#0a1a1a",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  offlineBtn: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#13CFCF33",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    marginBottom: 32,
  },
  offlineBtnText: {
    color: "#13CFCF",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.1,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 10,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ffffff18",
  },
  dividerLabel: {
    color: "#555",
    fontSize: 11.5,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  socialRow: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "center",
  },
  socialBtn: {
    alignItems: "center",
    gap: 7,
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  socialIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  socialText: {
    color: "#aaa",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  pressed: {
    opacity: 0.7,
  },
  homeBar: {
    position: "absolute",
    bottom: 8,
    width: 120,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#ffffff22",
  },
});
