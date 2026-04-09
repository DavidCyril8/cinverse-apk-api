import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import type { BannerMovie, MovieItem } from "@/lib/movieApi";

const { width, height } = Dimensions.get("window");

interface Props {
  movies: (BannerMovie | MovieItem)[];
}

export function HeroCarousel({ movies }: Props) {
  const colors = useColors();
  const router = useRouter();
  const flatRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(idx, movies.length - 1));
      flatRef.current?.scrollToIndex({ index: clamped, animated: true });
      setActiveIndex(clamped);
    },
    [movies.length]
  );

  useEffect(() => {
    if (movies.length <= 1) return;
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % movies.length;
        flatRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [movies.length]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (idx !== activeIndex) setActiveIndex(idx);
  };

  const handlePress = (movie: MovieItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/movie/[id]",
      params: { id: movie.id, detailPath: movie.detailPath ?? "" },
    });
  };

  if (!movies.length) return null;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatRef}
        data={movies}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => String(item.id)}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => {
          const year = item.releaseDate ? item.releaseDate.split("-")[0] : null;
          const backdrop = (item as BannerMovie).backdropUrlId ?? item.posterUrlId;
          return (
            <View style={styles.slide}>
              {backdrop ? (
                <Image
                  source={{ uri: backdrop }}
                  style={styles.image}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  recyclingKey={String(item.id)}
                  transition={300}
                />
              ) : (
                <View style={[styles.image, { backgroundColor: "#111827" }]} />
              )}
              <LinearGradient
                colors={["transparent", "rgba(20,20,20,0.65)", "#141414"]}
                style={styles.gradient}
                locations={[0.2, 0.65, 1]}
              />
              <LinearGradient
                colors={["#141414", "transparent"]}
                style={styles.gradientLeft}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 0.4, y: 0.5 }}
              />

              <View style={styles.content}>
                <View style={styles.genreRow}>
                  {item.genres.slice(0, 3).map((g) => (
                    <View
                      key={g}
                      style={[styles.genreChip, { borderColor: colors.border }]}
                    >
                      <Text style={[styles.genreText, { color: colors.mutedForeground }]}>
                        {g}
                      </Text>
                    </View>
                  ))}
                  {year ? (
                    <Text style={[styles.year, { color: colors.mutedForeground }]}>
                      {year}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.heroTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text
                  style={[styles.heroOverview, { color: colors.mutedForeground }]}
                  numberOfLines={2}
                >
                  {item.overview}
                </Text>
                <View style={styles.heroButtons}>
                  <TouchableOpacity
                    style={[styles.moreInfoBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handlePress(item)}
                    activeOpacity={0.85}
                  >
                    <Feather name="play-circle" size={16} color={colors.primaryForeground} />
                    <Text style={[styles.moreInfoText, { color: colors.primaryForeground }]}>
                      More Info
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />

      <View style={styles.dots}>
        {movies.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goTo(i)} activeOpacity={0.7}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === activeIndex ? colors.primary : colors.border,
                  width: i === activeIndex ? 20 : 6,
                },
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  slide: {
    width,
    height: height * 0.55,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "75%",
  },
  gradientLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: "40%",
  },
  content: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 36,
    gap: 8,
  },
  genreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  genreChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  genreText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  year: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  heroTitle: {
    color: "#fff",
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    lineHeight: 32,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroOverview: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    maxWidth: "90%",
  },
  heroButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  moreInfoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  moreInfoText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  dots: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    alignItems: "center",
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});
