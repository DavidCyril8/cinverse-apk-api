import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TEAL = "#13CFCF";
const GREEN = "#4ade80";
const SHEET_BG = "#111111";
const BORDER = "#1e1e1e";

function formatSizeMb(sizeMb?: number): string {
  if (!sizeMb || sizeMb <= 0) return "—";
  if (sizeMb >= 1024) return `${(sizeMb / 1024).toFixed(1)} GB`;
  return `${Math.round(sizeMb)} MB`;
}

function getQualityLabel(resolution: string): string {
  const r = parseInt(resolution);
  if (r >= 1080) return "Full HD";
  if (r >= 720) return "HD";
  return "SD";
}

function PulsingDots() {
  const anims = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    const makeLoop = (a: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(a, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      );

    const loops = anims.map((a, i) => makeLoop(a, i * 150));
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);

  return (
    <View style={ds.dots}>
      {anims.map((a, i) => (
        <Animated.View key={i} style={[ds.dot, { opacity: a }]} />
      ))}
    </View>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
  movieTitle: string;
  season?: number;
  episode?: number;
  quality: string;
  sizeMb?: number;
  hasSubtitle: boolean;
}

type Phase = "loading" | "success";

export function DownloadConfirmModal({
  visible,
  onClose,
  movieTitle,
  season,
  episode,
  quality,
  sizeMb,
  hasSubtitle,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>("loading");
  const slideAnim = useRef(new Animated.Value(500)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const successFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    setPhase("loading");
    slideAnim.setValue(500);
    progressAnim.setValue(0);
    successFadeAnim.setValue(0);

    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 420,
      useNativeDriver: true,
    }).start();

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 1400,
      delay: 200,
      useNativeDriver: false,
    }).start();

    const t = setTimeout(() => {
      setPhase("success");
      Animated.timing(successFadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    }, 2000);

    return () => clearTimeout(t);
  }, [visible]);

  const displayTitle =
    season !== undefined && episode !== undefined
      ? `${movieTitle} — S${season}E${episode}`
      : movieTitle;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const INFO_ROWS: { icon: React.ComponentProps<typeof Feather>["name"]; label: string; value: string; teal?: boolean }[] = [
    { icon: "film",       label: "Title",     value: displayTitle },
    { icon: "monitor",    label: "Quality",   value: `${quality}p  ${getQualityLabel(quality)}`, teal: true },
    { icon: "hard-drive", label: "File size", value: formatSizeMb(sizeMb) },
    { icon: "type",       label: "Subtitles", value: hasSubtitle ? "English" : "None" },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFillObject} />
      <View style={ds.backdropDim} />
      <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />

      <Animated.View
        style={[
          ds.sheet,
          { paddingBottom: Math.max(insets.bottom, 24) + 16 },
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Handle */}
        <View style={ds.handle} />

        {/* Header */}
        <View style={ds.header}>
          <View style={ds.headerLeft}>
            <View style={[ds.iconWrap, phase === "success" && ds.iconWrapSuccess]}>
              {phase === "success" ? (
                <Feather name="check" size={15} color={GREEN} />
              ) : (
                <Feather name="download" size={15} color={TEAL} />
              )}
            </View>
            <View>
              <Text style={ds.headerTitle}>
                {phase === "success" ? "Download Queued" : "Starting Download"}
              </Text>
              <Text style={ds.headerSub}>
                {phase === "success" ? "Running in background" : "Fetching file info…"}
              </Text>
            </View>
          </View>

          <View style={[ds.badge, phase === "success" && ds.badgeSuccess]}>
            <Text style={[ds.badgeText, phase === "success" && ds.badgeTextSuccess]}>
              {phase === "success" ? "Ready" : "Active"}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={ds.trackOuter}>
          <Animated.View
            style={[
              ds.trackFill,
              phase === "success" && { backgroundColor: GREEN + "99" },
              { width: progressWidth },
            ]}
          />
        </View>

        {/* Info rows */}
        {INFO_ROWS.map((row, i) => (
          <View key={row.label} style={[ds.row, i === INFO_ROWS.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={ds.rowLeft}>
              <Feather name={row.icon} size={13} color="#555" />
              <Text style={ds.rowLabel}>{row.label}</Text>
            </View>
            <Text style={[ds.rowValue, row.teal && { color: TEAL }]} numberOfLines={1}>
              {row.value}
            </Text>
          </View>
        ))}

        {/* Loading dots */}
        {phase === "loading" && <PulsingDots />}

        {/* Success buttons */}
        {phase === "success" && (
          <Animated.View style={[ds.buttons, { opacity: successFadeAnim }]}>
            <TouchableOpacity
              style={ds.primaryBtn}
              activeOpacity={0.85}
              onPress={() => {
                onClose();
                router.push("/(tabs)/downloads");
              }}
            >
              <Text style={ds.primaryBtnText}>View Download Manager</Text>
            </TouchableOpacity>
            <TouchableOpacity style={ds.secondaryBtn} activeOpacity={0.75} onPress={onClose}>
              <Text style={ds.secondaryBtnText}>Continue Browsing</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </Animated.View>
    </Modal>
  );
}

const ds = StyleSheet.create({
  backdropDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    borderBottomWidth: 0,
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#2a2a2a",
    alignSelf: "center",
    marginBottom: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(19,207,207,0.08)",
    borderWidth: 1.5,
    borderColor: TEAL,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapSuccess: {
    backgroundColor: "rgba(74,222,128,0.08)",
    borderColor: GREEN,
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    lineHeight: 18,
  },
  headerSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#555",
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "rgba(19,207,207,0.08)",
    borderWidth: 1,
    borderColor: TEAL + "44",
  },
  badgeSuccess: {
    backgroundColor: "rgba(74,222,128,0.08)",
    borderColor: GREEN + "44",
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: TEAL,
  },
  badgeTextSuccess: {
    color: GREEN,
  },
  trackOuter: {
    height: 3,
    borderRadius: 2,
    backgroundColor: "#1c1c1c",
    marginBottom: 16,
    overflow: "hidden",
  },
  trackFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: TEAL,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  rowLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#666",
  },
  rowValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#bbb",
    maxWidth: "55%",
    textAlign: "right",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 7,
    marginTop: 18,
    marginBottom: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: TEAL,
  },
  buttons: {
    marginTop: 18,
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: TEAL,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#000",
  },
  secondaryBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#555",
  },
});
