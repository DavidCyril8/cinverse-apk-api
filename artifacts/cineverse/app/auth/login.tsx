import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { type Href, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";

const WATCHLIST_KEY  = "@cineverse_watchlist_v2";
const HISTORY_KEY    = "@cineverse_watch_history_v1";
const SEARCH_KEY     = "@cineverse_search_history_v1";
const IMPORTED_KEY   = (email: string) => `@cineverse_imported_${email}`;

interface LocalMovieEntry {
  id?: string;
  movieId?: string;
  title?: string;
  posterUrlId?: string;
  poster?: string;
  subjectType?: number;
  positionMs?: number;
  durationMs?: number;
}

async function readLocalData() {
  const [wl, wh, sh] = await Promise.all([
    AsyncStorage.getItem(WATCHLIST_KEY),
    AsyncStorage.getItem(HISTORY_KEY),
    AsyncStorage.getItem(SEARCH_KEY),
  ]);
  return {
    watchlist:     wl ? (JSON.parse(wl) as LocalMovieEntry[]) : [],
    watchHistory:  wh ? (JSON.parse(wh) as LocalMovieEntry[]) : [],
    searchHistory: sh ? (JSON.parse(sh) as string[]) : [],
  };
}

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, importLocalData } = useAuth();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleLogin = async () => {
    setError("");
    const e = email.trim();
    if (!e || !password) { setError("Please enter your email and password."); return; }
    setLoading(true);
    try {
      await login(e, password);

      const importedKey = IMPORTED_KEY(e);
      const alreadyImported = await AsyncStorage.getItem(importedKey);

      if (!alreadyImported) {
        const local = await readLocalData();
        const hasLocal =
          local.watchlist.length > 0 ||
          local.watchHistory.length > 0 ||
          local.searchHistory.length > 0;

        if (hasLocal) {
          Alert.alert(
            "Import local data?",
            "You have watchlist and history saved on this device. Import it to your account?",
            [
              {
                text: "Skip",
                style: "cancel",
                onPress: () => {
                  AsyncStorage.setItem(importedKey, "1");
                  router.back();
                },
              },
              {
                text: "Import",
                onPress: async () => {
                  try {
                    await importLocalData({
                      watchlist: local.watchlist.map((m) => ({
                        movieId: String(m.id ?? m.movieId ?? ""),
                        title: m.title ?? "",
                        poster: m.posterUrlId ?? m.poster ?? "",
                        mediaType: m.subjectType === 2 ? "series" : "movie",
                      })),
                      watchHistory: local.watchHistory.map((h) => ({
                        movieId: String(h.id ?? h.movieId ?? ""),
                        title: h.title ?? "",
                        poster: h.posterUrlId ?? h.poster ?? "",
                        mediaType: h.subjectType === 2 ? "series" : "movie",
                        progressSeconds: Math.floor((h.positionMs ?? 0) / 1000),
                        durationSeconds: Math.floor((h.durationMs ?? 0) / 1000),
                      })),
                      searchHistory: local.searchHistory,
                    });
                  } catch {}
                  AsyncStorage.setItem(importedKey, "1");
                  router.back();
                },
              },
            ],
          );
          return;
        }
      }

      router.back();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.brand}>CINVERSE</Text>
        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.sub}>Sign in to sync your watchlist across devices.</Text>

        {!!error && (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={14} color="#ff6b6b" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="rgba(255,255,255,0.25)"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            returnKeyType="next"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.pwWrap}>
            <TextInput
              style={[styles.input, { flex: 1, borderWidth: 0 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="rgba(255,255,255,0.25)"
              secureTextEntry={!showPw}
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPw((p) => !p)} style={styles.eyeBtn}>
              <Feather name={showPw ? "eye-off" : "eye"} size={18} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.forgotWrap}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>{loading ? "Signing in…" : "Sign In"}</Text>
        </TouchableOpacity>

        <Pressable
          style={styles.switchRow}
          onPress={() => router.replace("/auth/register" as Href)}
        >
          <Text style={styles.switchText}>Don't have an account? </Text>
          <Text style={[styles.switchText, styles.switchLink]}>Create one</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0f0f0f" },
  scroll: { paddingHorizontal: 24, flexGrow: 1 },
  back: { marginBottom: 32 },
  brand: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#13CFCF", letterSpacing: 4, marginBottom: 16 },
  heading: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 8 },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)", marginBottom: 32, lineHeight: 20 },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(255,107,107,0.1)", borderWidth: 1,
    borderColor: "rgba(255,107,107,0.3)", borderRadius: 10, padding: 12, marginBottom: 20,
  },
  errorText: { flex: 1, color: "#ff6b6b", fontSize: 13, fontFamily: "Inter_400Regular" },
  field: { marginBottom: 18 },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.55)", marginBottom: 8, letterSpacing: 0.5, textTransform: "uppercase" },
  input: {
    backgroundColor: "#1c1c1e", borderRadius: 12, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)", paddingHorizontal: 16, paddingVertical: 14,
    color: "#fff", fontSize: 15, fontFamily: "Inter_400Regular",
  },
  pwWrap: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#1c1c1e",
    borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", paddingHorizontal: 16,
  },
  eyeBtn: { padding: 4 },
  forgotWrap: { alignSelf: "flex-end", marginBottom: 28 },
  forgotText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#13CFCF" },
  btn: { backgroundColor: "#13CFCF", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginBottom: 24 },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#000" },
  switchRow: { flexDirection: "row", justifyContent: "center", marginTop: 8 },
  switchText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)" },
  switchLink: { color: "#13CFCF", fontFamily: "Inter_600SemiBold" },
});
