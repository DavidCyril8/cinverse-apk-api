import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import type { MovieItem } from "@/lib/movieApi";
import { useWatchlist } from "@/context/WatchlistContext";

const { width, height } = Dimensions.get("window");

interface Props {
  movie: MovieItem;
}

export function HeroBanner({ movie }: Props) {
  const colors = useColors();
  const router = useRouter();
  const { addToWatchlist, isInWatchlist } = useWatchlist();
  const inList = isInWatchlist(movie.url);

  const handlePlay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/movie/[url]",
      params: { url: movie.url, title: movie.title },
    });
  };

  const handleWatchlist = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addToWatchlist(movie);
  };

  return (
    <View style={styles.hero}>
      {movie.image ? (
        <Image source={{ uri: movie.image }} style={styles.heroImage} resizeMode="cover" />
      ) : (
        <View style={[styles.heroImage, { backgroundColor: colors.card }]} />
      )}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.6)", "#141414"]}
        style={styles.gradient}
        locations={[0, 0.6, 1]}
      />
      <View style={styles.heroContent}>
        {movie.type ? (
          <View style={[styles.heroBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.heroBadgeText}>{movie.type}</Text>
          </View>
        ) : null}
        <Text style={styles.heroTitle} numberOfLines={2}>
          {movie.title}
        </Text>
        {movie.year ? (
          <Text style={[styles.heroYear, { color: colors.mutedForeground }]}>{movie.year}</Text>
        ) : null}
        <View style={styles.heroButtons}>
          <TouchableOpacity
            style={[styles.playBtn, { backgroundColor: colors.primary }]}
            onPress={handlePlay}
            activeOpacity={0.85}
          >
            <Feather name="play" size={18} color="#fff" />
            <Text style={styles.playBtnText}>Play</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.listBtn, { backgroundColor: inList ? colors.primary : "rgba(255,255,255,0.15)" }]}
            onPress={handleWatchlist}
            activeOpacity={0.85}
          >
            <Feather name={inList ? "check" : "plus"} size={20} color="#fff" />
            <Text style={styles.listBtnText}>{inList ? "Saved" : "My List"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    width,
    height: height * 0.52,
    position: "relative",
    marginBottom: 16,
  },
  heroImage: {
    width,
    height: "100%",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "70%",
  },
  heroContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  heroBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 8,
  },
  heroBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    lineHeight: 34,
    marginBottom: 4,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroYear: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 16,
  },
  heroButtons: {
    flexDirection: "row",
    gap: 12,
  },
  playBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 6,
  },
  playBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  listBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 6,
  },
  listBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
