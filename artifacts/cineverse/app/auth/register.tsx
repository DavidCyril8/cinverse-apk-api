import { Feather } from "@expo/vector-icons";
import { type Href, useRouter } from "expo-router";
import React, { useState } from "react";
import {
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

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleRegister = async () => {
    setError("");
    const n = name.trim();
    const e = email.trim();
    if (!n) { setError("Please enter your name."); return; }
    if (!e) { setError("Please enter your email."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      await register(e, password, n);
      router.back();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
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
        <Text style={styles.heading}>Create account</Text>
        <Text style={styles.sub}>Join to sync your watchlist and history across devices.</Text>

        {!!error && (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={14} color="#ff6b6b" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Display name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor="rgba(255,255,255,0.25)"
            autoCapitalize="words"
            returnKeyType="next"
          />
        </View>

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
              placeholder="Min 8 characters"
              placeholderTextColor="rgba(255,255,255,0.25)"
              secureTextEntry={!showPw}
              autoComplete="new-password"
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />
            <TouchableOpacity onPress={() => setShowPw((p) => !p)} style={styles.eyeBtn}>
              <Feather name={showPw ? "eye-off" : "eye"} size={18} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>{loading ? "Creating account…" : "Create Account"}</Text>
        </TouchableOpacity>

        <Pressable
          style={styles.switchRow}
          onPress={() => router.replace("/auth/login" as Href)}
        >
          <Text style={styles.switchText}>Already have an account? </Text>
          <Text style={[styles.switchText, styles.switchLink]}>Sign in</Text>
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
  btn: { backgroundColor: "#13CFCF", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8, marginBottom: 24 },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#000" },
  switchRow: { flexDirection: "row", justifyContent: "center", marginTop: 8 },
  switchText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)" },
  switchLink: { color: "#13CFCF", fontFamily: "Inter_600SemiBold" },
});
