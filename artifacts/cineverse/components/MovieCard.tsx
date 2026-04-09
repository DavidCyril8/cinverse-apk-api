import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import type { MovieItem } from "@/lib/movieApi";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2.4;

interface Props {
  movie: MovieItem;
  size?: "small" | "medium" | "large";
}

function ratingColor(score: number, colors: ReturnType<typeof useColors>) {
  if (score >= 8) return (colors as Record<string, string>).ratingGreen ?? "#4ade80";
  if (score >= 6) return (colors as Record<string, string>).ratingYellow ?? "#facc15";
  return (colors as Record<string, string>).ratingOrange ?? "#fb923c";
}

export function MovieCard({ movie, size = "medium" }: Props) {
  const colors = useColors();
  const router = useRouter();

  const cardWidth =
    size === "large"
      ? width * 0.62
      : size === "small"
        ? (width - 60) / 3.2
        : CARD_WIDTH;
  const cardHeight = cardWidth * 1.5;

  const year = movie.releaseDate ? movie.releaseDate.split("-")[0] : null;
  const isSeries = movie.subjectType === 2;
  const rating = movie.voteAverage;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.card, { width: cardWidth }]}
      onPress={() =>
        router.push({
          pathname: "/movie/[id]",
          params: {
            id: movie.id,
            detailPath: movie.detailPath ?? "",
          },
        })
      }
    >
      <View
        style={[
          styles.imageContainer,
          { width: cardWidth, height: cardHeight, backgroundColor: "#111827" },
        ]}
      >
        {movie.posterUrlId ? (
          <Image
            source={{ uri: movie.posterUrlId }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={movie.id}
            transition={200}
          />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: colors.card }]}>
            <Feather name="film" size={32} color={colors.mutedForeground} />
          </View>
        )}

        {year ? (
          <View style={[styles.badgeTopLeft, { backgroundColor: "rgba(0,0,0,0.75)" }]}>
            <Text style={styles.badgeText}>{year}</Text>
          </View>
        ) : null}

        {rating > 0 ? (
          <View style={[styles.badgeTopRight, { backgroundColor: "rgba(0,0,0,0.75)" }]}>
            <Feather name="star" size={10} color={ratingColor(rating, colors)} />
            <Text style={[styles.badgeText, { color: ratingColor(rating, colors), marginLeft: 2 }]}>
              {rating.toFixed(1)}
            </Text>
          </View>
        ) : null}

        <View
          style={[
            styles.badgeBottomLeft,
            {
              backgroundColor: isSeries
                ? colors.primary + "e6"
                : "rgba(0,0,0,0.75)",
            },
          ]}
        >
          <Feather
            name={isSeries ? "tv" : "film"}
            size={9}
            color={isSeries ? colors.primaryForeground : "#fff"}
          />
          <Text
            style={[
              styles.badgeSmallText,
              { color: isSeries ? colors.primaryForeground : "#fff", marginLeft: 3 },
            ]}
          >
            {isSeries ? "Series" : "Movie"}
          </Text>
        </View>
      </View>

      <Text
        style={[styles.title, { color: colors.foreground }]}
        numberOfLines={2}
      >
        {movie.title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginRight: 12,
  },
  imageContainer: {
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 8,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeTopLeft: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  badgeTopRight: {
    position: "absolute",
    top: 6,
    right: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  badgeBottomLeft: {
    position: "absolute",
    bottom: 6,
    left: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  badgeSmallText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    lineHeight: 18,
  },
});
