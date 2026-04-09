import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNetwork } from "@/context/NetworkContext";

export function OfflineBanner() {
  const { connectionQuality } = useNetwork();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-80)).current;
  const wasVisible = useRef(false);

  const isVisible  = connectionQuality !== "online";
  const isUnstable = connectionQuality === "unstable";

  useEffect(() => {
    if (isVisible) {
      wasVisible.current = true;
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 70,
        friction: 12,
      }).start();
    } else if (wasVisible.current) {
      Animated.timing(slideAnim, {
        toValue: -80,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  const topPad  = Platform.OS === "web" ? 8 : insets.top + 4;
  const bgColor = isUnstable ? "#f97316" : "#ef4444";
  const icon    = isUnstable ? "wifi" : "wifi-off";
  const message = isUnstable
    ? "Unstable internet connection"
    : "No internet connection";

  return (
    <Animated.View
      style={[
        styles.banner,
        { paddingTop: topPad, backgroundColor: bgColor },
        { transform: [{ translateY: slideAnim }] },
        { pointerEvents: "none" } as any,
      ]}
    >
      <Feather name={icon as any} size={14} color="#fff" />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingBottom: 10,
    paddingHorizontal: 16,
    zIndex: 9999,
  },
  text: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
