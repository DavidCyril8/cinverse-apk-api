import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import type { MovieItem } from "@/lib/movieApi";
import { MovieCard } from "./MovieCard";
import { SkeletonRow } from "./SkeletonCard";

interface Props {
  title: string;
  movies: MovieItem[];
  loading?: boolean;
  size?: "small" | "medium" | "large";
  showMoreLink?: boolean;
}

export function MovieRow({ title, movies, loading, size = "medium", showMoreLink = true }: Props) {
  const colors = useColors();
  const router = useRouter();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
        {showMoreLink && (
          <TouchableOpacity
            style={[styles.moreBtn, { borderColor: colors.border }]}
            onPress={() => router.push("/(tabs)/trending")}
            activeOpacity={0.7}
          >
            <Text style={[styles.moreText, { color: colors.mutedForeground }]}>More</Text>
            <Feather name="arrow-right" size={12} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <SkeletonRow />
      ) : (
        <FlatList
          horizontal
          data={movies}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <MovieCard movie={item} size={size} />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          scrollEnabled={movies.length > 0}
          ListEmptyComponent={
            <View style={styles.emptyRow}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No content available
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  moreBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  moreText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  listContent: {
    paddingHorizontal: 16,
  },
  emptyRow: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
