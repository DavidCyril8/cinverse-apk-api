import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type Href } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useWatchlist } from "@/context/WatchlistContext";
import { useWatchHistory } from "@/context/WatchHistoryContext";
import { useDownloads } from "@/context/DownloadContext";
import { useSearchHistory } from "@/context/SearchHistoryContext";
import { changePassword, updateProfile } from "@/lib/apiClient";

const PREFS_KEY = "@cineverse_prefs_v1";

interface Prefs {
  videoQuality: "auto" | "low" | "medium" | "high";
  autoplayNext: boolean;
  wifiOnly: boolean;
  subtitleSize: "small" | "medium" | "large";
}

const DEFAULT_PREFS: Prefs = {
  videoQuality: "auto",
  autoplayNext: true,
  wifiOnly: true,
  subtitleSize: "medium",
};

function usePrefs() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY).then((raw) => {
      if (raw) {
        try { setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) }); } catch {}
      }
    });
  }, []);
  const save = useCallback((patch: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);
  return { prefs, save };
}

function Avatar({ name, size = 72 }: { name: string; size?: number }) {
  const initial = (name || "?")[0].toUpperCase();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } catch { return ""; }
}

function StatCard({ value, label, icon }: { value: number; label: string; icon: string }) {
  return (
    <View style={styles.statCard}>
      <Feather name={icon as never} size={16} color="#13CFCF" style={{ marginBottom: 6 }} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function RowItem({
  icon, label, meta, onPress, danger, chevron = true, disabled,
}: {
  icon: string; label: string; meta?: string; onPress?: () => void;
  danger?: boolean; chevron?: boolean; disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, disabled && { opacity: 0.5 }]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <Feather name={icon as never} size={18} color={danger ? "#ff6b6b" : "rgba(255,255,255,0.55)"} />
      <Text style={[styles.rowText, danger && { color: "#ff6b6b" }]}>{label}</Text>
      {meta ? <Text style={styles.rowMeta}>{meta}</Text> : null}
      {chevron && !danger && (
        <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.2)" />
      )}
    </TouchableOpacity>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function ToggleRow({ icon, label, value, onToggle }: { icon: string; label: string; value: boolean; onToggle: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <Feather name={icon as never} size={18} color="rgba(255,255,255,0.55)" />
      <Text style={[styles.rowText, { flex: 1 }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "rgba(255,255,255,0.1)", true: "#13CFCF" }}
        thumbColor={value ? "#fff" : "rgba(255,255,255,0.6)"}
        ios_backgroundColor="rgba(255,255,255,0.1)"
      />
    </View>
  );
}

function ChipRow({ icon, label, options, value, onSelect }: {
  icon: string; label: string;
  options: { key: string; label: string }[];
  value: string;
  onSelect: (k: string) => void;
}) {
  return (
    <View style={styles.chipRow}>
      <View style={styles.chipRowHeader}>
        <Feather name={icon as never} size={18} color="rgba(255,255,255,0.55)" />
        <Text style={styles.rowText}>{label}</Text>
      </View>
      <View style={styles.chips}>
        {options.map((o) => (
          <TouchableOpacity
            key={o.key}
            style={[styles.chip, value === o.key && styles.chipActive]}
            onPress={() => onSelect(o.key)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, value === o.key && styles.chipTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function EditNameModal({ visible, current, onClose, onSave }: {
  visible: boolean; current: string;
  onClose: () => void; onSave: (name: string) => Promise<void>;
}) {
  const [value, setValue] = useState(current);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setValue(current);
    setErr("");
  }, [current, visible]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: visible ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [visible, fadeAnim]);

  const submit = async () => {
    if (!value.trim()) { setErr("Name cannot be empty"); return; }
    setBusy(true);
    setErr("");
    try {
      await onSave(value.trim());
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to update name");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Animated.View style={[styles.modalCard, { opacity: fadeAnim }]}>
          <Text style={styles.modalTitle}>Edit Display Name</Text>
          <TextInput
            style={[styles.modalInput, err ? styles.modalInputError : null]}
            value={value}
            onChangeText={setValue}
            placeholder="Your display name"
            placeholderTextColor="rgba(255,255,255,0.25)"
            autoFocus
            maxLength={40}
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          {err ? <Text style={styles.modalErr}>{err}</Text> : null}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalConfirm, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
              <Text style={styles.modalConfirmText}>{busy ? "Saving…" : "Save"}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);

  useEffect(() => {
    if (!visible) { setCurrent(""); setNext(""); setConfirm(""); setErr(""); }
  }, [visible]);

  const submit = async () => {
    if (!current || !next || !confirm) { setErr("All fields are required"); return; }
    if (next.length < 8) { setErr("New password must be at least 8 characters"); return; }
    if (next !== confirm) { setErr("Passwords do not match"); return; }
    setBusy(true);
    setErr("");
    try {
      await changePassword(current, next);
      Alert.alert("Success", "Your password has been updated.");
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to change password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Change Password</Text>

          <Text style={styles.modalFieldLabel}>Current Password</Text>
          <View style={styles.pwdRow}>
            <TextInput
              style={[styles.modalInput, styles.pwdInput, err ? styles.modalInputError : null]}
              value={current}
              onChangeText={setCurrent}
              placeholder="••••••••"
              placeholderTextColor="rgba(255,255,255,0.25)"
              secureTextEntry={!showCurrent}
              autoFocus
            />
            <TouchableOpacity onPress={() => setShowCurrent((v) => !v)} style={styles.eyeBtn}>
              <Feather name={showCurrent ? "eye-off" : "eye"} size={18} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalFieldLabel}>New Password</Text>
          <View style={styles.pwdRow}>
            <TextInput
              style={[styles.modalInput, styles.pwdInput]}
              value={next}
              onChangeText={setNext}
              placeholder="At least 8 characters"
              placeholderTextColor="rgba(255,255,255,0.25)"
              secureTextEntry={!showNext}
            />
            <TouchableOpacity onPress={() => setShowNext((v) => !v)} style={styles.eyeBtn}>
              <Feather name={showNext ? "eye-off" : "eye"} size={18} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalFieldLabel}>Confirm New Password</Text>
          <TextInput
            style={[styles.modalInput, confirm && confirm !== next ? styles.modalInputError : null]}
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Repeat new password"
            placeholderTextColor="rgba(255,255,255,0.25)"
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={submit}
          />

          {err ? <Text style={styles.modalErr}>{err}</Text> : null}

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalConfirm, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
              <Text style={styles.modalConfirmText}>{busy ? "Updating…" : "Update"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, updateUser, isLoading } = useAuth();
  const { watchlist } = useWatchlist();
  const { history, clearAll: clearWatchHistory } = useWatchHistory();
  const { downloads } = useDownloads();
  const { clearAll: clearSearchHistory } = useSearchHistory();
  const { prefs, save: savePrefs } = usePrefs();

  const [signingOut, setSigningOut] = useState(false);
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [changePwdVisible, setChangePwdVisible] = useState(false);

  const completedDownloads = downloads.filter((d) => d.status === "completed").length;

  const handleSignOut = () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out", style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          try { await logout(); } catch {}
          setSigningOut(false);
        },
      },
    ]);
  };

  const handleSaveName = async (name: string) => {
    const updated = await updateProfile(name);
    updateUser(updated);
  };

  const handleClearHistory = () => {
    Alert.alert(
      "Clear Watch History",
      "This will remove all watch history. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear", style: "destructive",
          onPress: () => clearWatchHistory(),
        },
      ],
    );
  };

  const handleClearSearch = () => {
    Alert.alert(
      "Clear Search History",
      "Remove all saved search terms?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear", style: "destructive",
          onPress: () => clearSearchHistory(),
        },
      ],
    );
  };

  if (isLoading) {
    return <View style={[styles.root, { paddingTop: insets.top }]} />;
  }

  if (!user) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 24 }]}>
        <ScrollView contentContainerStyle={styles.guestScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.guestBrand}>CINVERSE</Text>
          <View style={styles.guestIconWrap}>
            <Feather name="user" size={52} color="rgba(255,255,255,0.12)" />
          </View>
          <Text style={styles.guestHeading}>Your Cinematic Universe</Text>
          <Text style={styles.guestSub}>
            Sign in to sync your watchlist, watch history, and search history across all your devices.
          </Text>
          <TouchableOpacity style={styles.signInBtn} onPress={() => router.push("/auth/login" as Href)} activeOpacity={0.85}>
            <Text style={styles.signInBtnText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.createBtn} onPress={() => router.push("/auth/register" as Href)} activeOpacity={0.85}>
            <Text style={styles.createBtnText}>Create Account</Text>
          </TouchableOpacity>
          <Text style={styles.guestNote}>
            Guest mode is fully supported — all features work without an account.
          </Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.signedScroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.screenTitle}>Profile</Text>
              <Text style={styles.screenSub}>Manage your account & preferences</Text>
            </View>
            <Avatar name={user.displayName || user.email} size={52} />
          </View>
        </View>

        {/* ── Profile Card ── */}
        <View style={styles.profileCard}>
          <View style={styles.profileCardInner}>
            <Avatar name={user.displayName || user.email} size={80} />
            <View style={styles.profileInfo}>
              <Text style={styles.displayName} numberOfLines={1}>{user.displayName || "CINVERSE User"}</Text>
              <Text style={styles.emailText} numberOfLines={1}>{user.email}</Text>
              <View style={styles.memberBadge}>
                <Feather name="calendar" size={11} color="#13CFCF" />
                <Text style={styles.memberSince}>Member since {formatDate(user.createdAt)}</Text>
              </View>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <StatCard value={watchlist.length} label="Watchlist" icon="bookmark" />
            <View style={styles.statDivider} />
            <StatCard value={history.length} label="Watched" icon="eye" />
            <View style={styles.statDivider} />
            <StatCard value={completedDownloads} label="Downloads" icon="download" />
          </View>
        </View>

        {/* ── Account Section ── */}
        <View style={styles.section}>
          <SectionHeader title="Account" />
          <RowItem icon="edit-2" label="Edit display name" onPress={() => setEditNameVisible(true)} />
          <Divider />
          <RowItem icon="lock" label="Change password" onPress={() => setChangePwdVisible(true)} />
          <Divider />
          <RowItem icon="mail" label="Email address" meta={user.email} chevron={false} />
        </View>

        {/* ── Playback Preferences ── */}
        <View style={styles.section}>
          <SectionHeader title="Playback" />
          <ChipRow
            icon="film"
            label="Video quality"
            options={[
              { key: "auto", label: "Auto" },
              { key: "low", label: "Low" },
              { key: "medium", label: "Med" },
              { key: "high", label: "High" },
            ]}
            value={prefs.videoQuality}
            onSelect={(k) => savePrefs({ videoQuality: k as Prefs["videoQuality"] })}
          />
          <Divider />
          <ToggleRow
            icon="play-circle"
            label="Autoplay next episode"
            value={prefs.autoplayNext}
            onToggle={(v) => savePrefs({ autoplayNext: v })}
          />
          <Divider />
          <ChipRow
            icon="type"
            label="Subtitle size"
            options={[
              { key: "small", label: "Small" },
              { key: "medium", label: "Medium" },
              { key: "large", label: "Large" },
            ]}
            value={prefs.subtitleSize}
            onSelect={(k) => savePrefs({ subtitleSize: k as Prefs["subtitleSize"] })}
          />
        </View>

        {/* ── Downloads Preferences ── */}
        <View style={styles.section}>
          <SectionHeader title="Downloads" />
          <ToggleRow
            icon="wifi"
            label="Download on Wi-Fi only"
            value={prefs.wifiOnly}
            onToggle={(v) => savePrefs({ wifiOnly: v })}
          />
          <Divider />
          <RowItem icon="hard-drive" label="Manage downloads" onPress={() => router.push("/(tabs)/downloads" as Href)} />
        </View>

        {/* ── Data & Privacy ── */}
        <View style={styles.section}>
          <SectionHeader title="Data & Privacy" />
          <RowItem icon="clock" label="Clear watch history" onPress={handleClearHistory} />
          <Divider />
          <RowItem icon="search" label="Clear search history" onPress={handleClearSearch} />
        </View>

        {/* ── About ── */}
        <View style={styles.section}>
          <SectionHeader title="About" />
          <RowItem icon="info" label="App version" meta="1.0.0" chevron={false} />
          <Divider />
          <RowItem icon="star" label="Rate CINVERSE" onPress={() => {}} />
          <Divider />
          <RowItem icon="message-circle" label="Send feedback" onPress={() => {}} />
        </View>

        {/* ── Sign Out ── */}
        <View style={styles.section}>
          <RowItem
            icon="log-out"
            label={signingOut ? "Signing out…" : "Sign out"}
            onPress={handleSignOut}
            danger
            chevron={false}
            disabled={signingOut}
          />
        </View>
      </ScrollView>

      <EditNameModal
        visible={editNameVisible}
        current={user.displayName}
        onClose={() => setEditNameVisible(false)}
        onSave={handleSaveName}
      />
      <ChangePasswordModal
        visible={changePwdVisible}
        onClose={() => setChangePwdVisible(false)}
      />
    </>
  );
}

const TEAL = "#13CFCF";
const BG = "#0f0f0f";
const CARD = "#1a1a1a";
const BORDER = "rgba(255,255,255,0.07)";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // ─ Guest ─
  guestScroll: { paddingHorizontal: 28, alignItems: "center", paddingBottom: 40, flexGrow: 1, justifyContent: "center" },
  guestBrand: { fontSize: 13, fontFamily: "Inter_700Bold", color: TEAL, letterSpacing: 4, marginBottom: 24 },
  guestIconWrap: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center", justifyContent: "center", marginBottom: 24,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
  },
  guestHeading: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff", textAlign: "center", marginBottom: 12 },
  guestSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)", textAlign: "center", lineHeight: 21, marginBottom: 36 },
  signInBtn: { backgroundColor: TEAL, borderRadius: 14, paddingVertical: 15, alignItems: "center", width: "100%", marginBottom: 12 },
  signInBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#000" },
  createBtn: { borderWidth: 1, borderColor: "rgba(19,207,207,0.4)", borderRadius: 14, paddingVertical: 15, alignItems: "center", width: "100%", marginBottom: 28 },
  createBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: TEAL },
  guestNote: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.25)", textAlign: "center", lineHeight: 18 },

  // ─ Signed-in ─
  signedScroll: { paddingHorizontal: 18 },
  header: { marginBottom: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  screenTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff" },
  screenSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.35)", marginTop: 2 },

  // ─ Profile Card ─
  profileCard: {
    backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    marginBottom: 20, overflow: "hidden",
  },
  profileCardInner: { flexDirection: "row", alignItems: "center", gap: 16, padding: 20, paddingBottom: 16 },
  avatar: { backgroundColor: TEAL, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Inter_700Bold", color: "#000" },
  profileInfo: { flex: 1 },
  displayName: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 3 },
  emailText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)", marginBottom: 6 },
  memberBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  memberSince: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.35)" },

  // ─ Stats ─
  statsRow: {
    flexDirection: "row", borderTopWidth: 1, borderTopColor: BORDER,
    paddingVertical: 16,
  },
  statCard: { flex: 1, alignItems: "center" },
  statDivider: { width: 1, backgroundColor: BORDER },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 2 },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.4)" },

  // ─ Sections ─
  section: { backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 14, overflow: "hidden" },
  sectionTitle: {
    fontSize: 11, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.3)",
    letterSpacing: 0.8, textTransform: "uppercase",
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  rowText: { fontSize: 15, fontFamily: "Inter_400Regular", color: "#fff" },
  rowMeta: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.3)", maxWidth: 160, textAlign: "right" },
  divider: { height: 1, backgroundColor: BORDER, marginHorizontal: 16 },

  // ─ Chips ─
  chipRow: { paddingHorizontal: 16, paddingVertical: 12 },
  chipRowHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  chips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  chipActive: { backgroundColor: "rgba(19,207,207,0.15)", borderColor: TEAL },
  chipText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.55)" },
  chipTextActive: { color: TEAL, fontFamily: "Inter_600SemiBold" },

  // ─ Modals ─
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center", justifyContent: "center", padding: 24,
  },
  modalCard: {
    backgroundColor: "#1e1e1e", borderRadius: 20, padding: 24, width: "100%",
    borderWidth: 1, borderColor: BORDER,
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 20 },
  modalFieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.4)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6, marginTop: 12 },
  modalInput: {
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontFamily: "Inter_400Regular", color: "#fff",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", flex: 1,
  },
  modalInputError: { borderColor: "#ff6b6b" },
  modalErr: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#ff6b6b", marginTop: 8 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 24 },
  modalCancel: {
    flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  modalCancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.6)" },
  modalConfirm: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center", backgroundColor: TEAL },
  modalConfirmText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#000" },
  pwdRow: { flexDirection: "row", alignItems: "center" },
  pwdInput: { borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  eyeBtn: {
    backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    borderLeftWidth: 0, paddingHorizontal: 12, paddingVertical: 12,
    borderTopRightRadius: 12, borderBottomRightRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
});
