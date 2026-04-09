import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useRef, useEffect } from "react";
import {
  Animated,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useWatchlist } from "@/context/WatchlistContext";
import type { MovieItem } from "@/lib/movieApi";

function EmptyState() {
  const colors = useColors();
  const float = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -10, duration: 1500, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(ring, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(ring, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1, 0.5] });

  return (
    <View style={emptyS.container}>
      <Animated.View style={[emptyS.iconWrap, { transform: [{ translateY: float }] }]}>
        <Animated.View
          style={[emptyS.ring, { borderColor: colors.primary, transform: [{ scale: ringScale }], opacity: ringOpacity }]}
        />
        <Feather name="bookmark" size={52} color={colors.primary} />
      </Animated.View>
      <Text style={[emptyS.title, { color: colors.foreground }]}>Your Watchlist is Empty</Text>
      <Text style={[emptyS.sub, { color: colors.mutedForeground }]}>
        Tap the bookmark icon on any movie or show to save it here for later.
      </Text>
    </View>
  );
}

function WatchlistCard({ movie, onRemove }: { movie: MovieItem; onRemove: (id: string) => void }) {
  const colors = useColors();
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    router.push({ pathname: "/movie/[id]", params: { id: String(movie.id) } });
  };

  const posterUri = movie.posterUrlId || undefined;

  const typeLabel = movie.subjectType === 2 ? "TV Show" : "Movie";

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={[cardS.row, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={handlePress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start()}
      >
        <View style={cardS.poster}>
          {posterUri ? (
            <Image
              source={{ uri: posterUri }}
              style={cardS.posterImg}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[cardS.posterImg, { backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" }]}>
              <Feather name="film" size={24} color={colors.mutedForeground} />
            </View>
          )}
        </View>

        <View style={cardS.info}>
          <Text style={[cardS.title, { color: colors.foreground }]} numberOfLines={2}>
            {movie.title}
          </Text>
          <View style={cardS.meta}>
            <View style={[cardS.typePill, { backgroundColor: colors.secondary }]}>
              <Text style={[cardS.typeText, { color: colors.mutedForeground }]}>{typeLabel}</Text>
            </View>
            {movie.ratingScore && movie.ratingScore > 0 ? (
              <View style={cardS.ratingRow}>
                <Feather name="star" size={11} color="#f59e0b" />
                <Text style={[cardS.ratingText, { color: colors.mutedForeground }]}>
                  {movie.ratingScore.toFixed(1)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <TouchableOpacity
          style={cardS.removeBtn}
          onPress={() => onRemove(String(movie.id))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="bookmark" size={20} color={colors.primary} />
        </TouchableOpacity>
      </Pressable>
    </Animated.View>
  );
}

export default function WatchlistScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { watchlist, removeFromWatchlist } = useWatchlist();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Watchlist</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {watchlist.length > 0
            ? `${watchlist.length} title${watchlist.length !== 1 ? "s" : ""} saved`
            : "Save titles to watch later"}
        </Text>
      </View>

      {watchlist.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={watchlist}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <WatchlistCard movie={item} onRemove={removeFromWatchlist} />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: 100 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 4 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular" },
  list: { paddingHorizontal: 16, paddingTop: 4 },
});

const cardS = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    padding: 10,
  },
  poster: { width: 70, height: 100, borderRadius: 8, overflow: "hidden", flexShrink: 0 },
  posterImg: { width: "100%", height: "100%" },
  info: { flex: 1, gap: 8 },
  title: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  meta: { flexDirection: "row", alignItems: "center", gap: 8 },
  typePill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  removeBtn: { padding: 8 },
});

const emptyS = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 16 },
  iconWrap: { alignItems: "center", justifyContent: "center", marginBottom: 8 },
  ring: { position: "absolute", width: 100, height: 100, borderRadius: 50, borderWidth: 2 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
});
