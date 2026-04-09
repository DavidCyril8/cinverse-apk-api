import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { fetchHomePage, searchMovies } from "@/lib/movieApi";
import { HeroCarousel } from "@/components/HeroCarousel";
import { MovieRow } from "@/components/MovieRow";
import { SkeletonRow } from "@/components/SkeletonCard";
import { useWatchHistory } from "@/context/WatchHistoryContext";
import { useWatchlist } from "@/context/WatchlistContext";

const WHATSAPP_URL = "https://whatsapp.com/channel/0029VbCZErf3WHTPJ0TD9Y33";
const TELEGRAM_URL = "https://t.me/davidcyriltechs";
const CURRENT_YEAR = new Date().getFullYear();

function AppFooter() {
  const colors = useColors();
  return (
    <View style={footerStyles.container}>
      <View style={[footerStyles.divider, { backgroundColor: colors.border }]} />
      <Text style={[footerStyles.followLabel, { color: colors.mutedForeground }]}>Follow Us</Text>
      <View style={footerStyles.socialRow}>
        <TouchableOpacity
          style={[footerStyles.socialBtn, { backgroundColor: "#25D366" }]}
          onPress={() => Linking.openURL(WHATSAPP_URL)}
          activeOpacity={0.85}
        >
          <Feather name="message-circle" size={16} color="#fff" />
          <Text style={footerStyles.socialText}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[footerStyles.socialBtn, { backgroundColor: "#229ED9" }]}
          onPress={() => Linking.openURL(TELEGRAM_URL)}
          activeOpacity={0.85}
        >
          <Feather name="send" size={16} color="#fff" />
          <Text style={footerStyles.socialText}>Telegram</Text>
        </TouchableOpacity>
      </View>
      <Text style={[footerStyles.copy, { color: colors.mutedForeground }]}>
        David Cyril Tech © {CURRENT_YEAR}
      </Text>
    </View>
  );
}

const footerStyles = StyleSheet.create({
  container: { alignItems: "center", paddingVertical: 32, paddingHorizontal: 16, gap: 16 },
  divider: { height: StyleSheet.hairlineWidth, width: "60%", marginBottom: 4 },
  followLabel: { fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 1.5, textTransform: "uppercase" },
  socialRow: { flexDirection: "row", gap: 12 },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
  },
  socialText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  copy: { fontSize: 12, fontFamily: "Inter_400Regular" },
});

function ContinueWatchingRow() {
  const { history } = useWatchHistory();
  const colors = useColors();
  const router = useRouter();

  const inProgress = history.filter((e) => {
    const p = e.positionMs / e.durationMs;
    return p > 0.03 && p < 0.97;
  });

  if (inProgress.length === 0) return null;

  return (
    <View style={{ marginTop: 8 }}>
      <View style={cwStyles.header}>
        <Text style={[cwStyles.title, { color: colors.foreground }]}>Continue Watching</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={cwStyles.row}>
        {inProgress.map((entry) => {
          const progress = entry.positionMs / entry.durationMs;
          const label = entry.season !== undefined
            ? `S${entry.season}E${entry.episode} • Resume`
            : `${Math.round(progress * 100)}% watched`;

          return (
            <TouchableOpacity
              key={entry.id}
              style={cwStyles.card}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: "/movie/[id]",
                  params: { id: entry.id, detailPath: entry.detailPath ?? "" },
                })
              }
            >
              <View style={[cwStyles.thumb, { backgroundColor: colors.secondary }]}>
                {entry.posterUrlId ? (
                  <Image source={{ uri: entry.posterUrlId }} style={cwStyles.thumbImg} resizeMode="cover" />
                ) : (
                  <Feather name="film" size={22} color={colors.mutedForeground} />
                )}
                <View style={cwStyles.playOverlay}>
                  <Feather name="play" size={18} color="#fff" />
                </View>
                <View style={[cwStyles.progressTrack, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                  <View
                    style={[
                      cwStyles.progressFill,
                      { width: `${Math.round(progress * 100)}%`, backgroundColor: colors.primary },
                    ]}
                  />
                </View>
              </View>
              <Text style={[cwStyles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
                {entry.title}
              </Text>
              <Text style={[cwStyles.cardSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function RecommendedRow() {
  const { watchlist } = useWatchlist();
  const colors = useColors();

  const baseGenre = watchlist[0]?.genres?.[0];
  const baseTitle = watchlist[0]?.title;

  const { data } = useQuery({
    queryKey: ["recommended", baseGenre],
    queryFn: () => searchMovies(baseGenre ?? ""),
    enabled: !!baseGenre,
    staleTime: 10 * 60 * 1000,
  });

  if (!baseGenre || !data || data.length === 0) return null;

  const filtered = data.filter((m) => !watchlist.some((w) => w.id === m.id)).slice(0, 12);
  if (filtered.length === 0) return null;

  return (
    <MovieRow
      title={`Because you liked ${baseTitle}`}
      movies={filtered}
    />
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : 0;

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["homepage"],
    queryFn: fetchHomePage,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <Text style={[styles.logo, { color: colors.primary }]}>CINVERSE</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 + bottomInset }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {isLoading ? (
          <View style={styles.heroSkeleton}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : data?.featured && data.featured.length > 0 ? (
          <HeroCarousel movies={data.featured} />
        ) : null}

        <View style={{ marginTop: 24 }}>
          {isLoading ? (
            <>
              <View style={styles.skeletonLabel}>
                <View style={[styles.skeletonText, { backgroundColor: colors.secondary }]} />
              </View>
              <SkeletonRow />
              <View style={[styles.skeletonLabel, { marginTop: 28 }]}>
                <View style={[styles.skeletonText, { backgroundColor: colors.secondary }]} />
              </View>
              <SkeletonRow />
            </>
          ) : (
            <>
              <ContinueWatchingRow />
              <RecommendedRow />
              {data?.carousels.map((carousel) => (
                <MovieRow
                  key={carousel.title}
                  title={carousel.title}
                  movies={carousel.movies}
                />
              ))}
              <AppFooter />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const cwStyles = StyleSheet.create({
  header: { paddingHorizontal: 16, marginBottom: 12 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  row: { paddingHorizontal: 16, gap: 12 },
  card: { width: 130 },
  thumb: {
    width: 130,
    height: 90,
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    position: "relative",
  },
  thumbImg: { width: "100%", height: "100%" },
  playOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  progressTrack: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  progressFill: { height: 4, borderRadius: 2 },
  cardTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  cardSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  logo: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
  },
  scroll: { flex: 1 },
  heroSkeleton: {
    height: Dimensions.get("window").height * 0.55,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
  },
  skeletonLabel: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  skeletonText: {
    height: 18,
    width: 160,
    borderRadius: 4,
  },
});
