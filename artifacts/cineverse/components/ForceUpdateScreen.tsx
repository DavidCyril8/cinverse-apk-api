import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { UpdateInfo } from "@/lib/appUpdate";

interface Props {
  info: UpdateInfo;
}

type Phase = "idle" | "downloading" | "done" | "error";

export function ForceUpdateScreen({ info }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const downloadRef = useRef<FileSystem.DownloadResumable | null>(null);
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: progress,
      duration: 120,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  useEffect(() => {
    if (Platform.OS === "android") {
      startDownload();
    }
    return () => {
      downloadRef.current?.pauseAsync().catch(() => {});
    };
  }, []);

  async function startDownload() {
    try {
      setPhase("downloading");
      setProgress(0);

      const destPath =
        FileSystem.cacheDirectory + "cinverse-update.apk";

      const dl = FileSystem.createDownloadResumable(
        info.updateUrl,
        destPath,
        {},
        (downloadProgress) => {
          const { totalBytesWritten, totalBytesExpectedToWrite } =
            downloadProgress;
          if (totalBytesExpectedToWrite > 0) {
            setProgress(totalBytesWritten / totalBytesExpectedToWrite);
          }
        }
      );

      downloadRef.current = dl;
      const result = await dl.downloadAsync();
      if (!result?.uri) throw new Error("Download returned no URI");

      setProgress(1);
      setPhase("done");

      const contentUri = await FileSystem.getContentUriAsync(result.uri);
      await IntentLauncher.startActivityAsync(
        "android.intent.action.VIEW",
        {
          data: contentUri,
          flags: 1,
          type: "application/vnd.android.package-archive",
        }
      );
    } catch (e: any) {
      setPhase("error");
      setErrorMsg(e?.message ?? "Unknown error");
    }
  }

  const percent = Math.round(progress * 100);
  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#141414" />

      <Text style={styles.logo}>CINVERSE</Text>

      <View style={styles.iconWrap}>
        <Text style={styles.icon}>↑</Text>
      </View>

      <Text style={styles.title}>Update Required</Text>
      <Text style={styles.subtitle}>
        Version v{info.latestVersion} is required to keep using CINVERSE.
      </Text>

      {!!info.releaseNotes && (
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>WHAT'S NEW</Text>
          <Text style={styles.notesText}>{info.releaseNotes}</Text>
        </View>
      )}

      {/* Progress area */}
      {phase === "downloading" && (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: barWidth }]} />
          </View>
          <Text style={styles.progressLabel}>
            Downloading update… {percent}%
          </Text>
        </View>
      )}

      {phase === "done" && (
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: "100%" }]} />
          </View>
          <Text style={styles.progressLabel}>
            Download complete — follow the prompt to install
          </Text>
        </View>
      )}

      {phase === "error" && (
        <View style={styles.progressWrap}>
          <Text style={styles.errorText}>
            Download failed. Tap below to retry.
          </Text>
          {!!errorMsg && (
            <Text style={styles.errorDetail}>{errorMsg}</Text>
          )}
        </View>
      )}

      {/* Action button — only show on error or non-Android */}
      {(phase === "error" || Platform.OS !== "android") && (
        <Pressable
          style={styles.btn}
          onPress={phase === "error" ? startDownload : undefined}
        >
          <Text style={styles.btnText}>
            {phase === "error" ? "Retry Download" : "Update Now"}
          </Text>
        </Pressable>
      )}

      {/* Re-trigger install if user dismissed the dialog */}
      {phase === "done" && (
        <Pressable
          style={[styles.btn, styles.btnOutline]}
          onPress={startDownload}
        >
          <Text style={[styles.btnText, { color: "#13CFCF" }]}>
            Install Again
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#141414",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  logo: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#13CFCF",
    letterSpacing: 6,
    marginBottom: 40,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(19,207,207,0.12)",
    borderWidth: 2,
    borderColor: "#13CFCF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  icon: {
    fontSize: 30,
    color: "#13CFCF",
    fontFamily: "Inter_700Bold",
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  notesBox: {
    backgroundColor: "#1E1E1E",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(19,207,207,0.15)",
  },
  notesLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#13CFCF",
    letterSpacing: 2,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    lineHeight: 20,
  },
  progressWrap: {
    width: "100%",
    marginBottom: 24,
    gap: 10,
  },
  progressTrack: {
    width: "100%",
    height: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#13CFCF",
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#fb7185",
    textAlign: "center",
  },
  errorDetail: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.3)",
    textAlign: "center",
  },
  btn: {
    backgroundColor: "#13CFCF",
    borderRadius: 14,
    paddingVertical: 16,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  btnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#13CFCF",
  },
  btnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#141414",
  },
});
