import React from "react";
import {
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { UpdateInfo } from "@/lib/appUpdate";

interface Props {
  info: UpdateInfo;
  onDismiss: () => void;
}

export function UpdateModal({ info, onDismiss }: Props) {
  return (
    <Modal transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.badge}>UPDATE AVAILABLE</Text>
          <Text style={styles.version}>v{info.latestVersion}</Text>
          <Text style={styles.notes}>{info.releaseNotes}</Text>

          <Pressable
            style={styles.updateBtn}
            onPress={() => Linking.openURL(info.updateUrl)}
          >
            <Text style={styles.updateBtnText}>Update Now</Text>
          </Pressable>

          <Pressable style={styles.skipBtn} onPress={onDismiss}>
            <Text style={styles.skipBtnText}>Maybe Later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#1E1E1E",
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(19,207,207,0.25)",
  },
  badge: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#13CFCF",
    letterSpacing: 2,
    marginBottom: 8,
  },
  version: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#ffffff",
    marginBottom: 12,
  },
  notes: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  updateBtn: {
    backgroundColor: "#13CFCF",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  updateBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#141414",
  },
  skipBtn: {
    paddingVertical: 10,
  },
  skipBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.4)",
  },
});
