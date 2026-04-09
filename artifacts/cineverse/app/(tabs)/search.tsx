import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { searchMovies, fetchSearchSuggestions } from "@/lib/movieApi";
import { MovieCard } from "@/components/MovieCard";
import { SearchBar } from "@/components/SearchBar";
import { useSearchHistory } from "@/context/SearchHistoryContext";

const GENRES = [
  { label: "All", icon: "grid" as const },
  { label: "Action", icon: "zap" as const },
  { label: "Comedy", icon: "smile" as const },
  { label: "Horror", icon: "moon" as const },
  { label: "Romance", icon: "heart" as const },
  { label: "Thriller", icon: "alert-triangle" as const },
  { label: "Sci-Fi", icon: "cpu" as const },
  { label: "Animation", icon: "star" as const },
  { label: "Drama", icon: "film" as const },
  { label: "Crime", icon: "shield" as const },
];

function AnimatedEmptyIcon({ name }: { name: React.ComponentProps<typeof Feather>["name"] }) {
  const float = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(float, { toValue: -8, duration: 1200, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(float, { toValue: 0, duration: 1200, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ translateY: float }, { scale }] }}>
      <Feather name={name} size={56} color="rgba(19,207,207,0.4)" />
    </Animated.View>
  );
}

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [activeGenre, setActiveGenre] = useState("All");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { history, addSearch, removeSearch, clearAll } = useSearchHistory();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : 0;

  const effectiveQuery = submitted || (activeGenre !== "All" ? activeGenre : "");

  const { data: results, isLoading, isFetching } = useQuery({
    queryKey: ["search", effectiveQuery],
    queryFn: () => searchMovies(effectiveQuery),
    enabled: effectiveQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  const handleSearch = (text: string) => {
    setQuery(text);
    setActiveGenre("All");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (text.length >= 2) {
        setSubmitted(text);
        addSearch(text);
      } else {
        setSubmitted("");
      }
    }, 500);

    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    if (text.length >= 2) {
      suggestDebounceRef.current = setTimeout(async () => {
        const results = await fetchSearchSuggestions(text);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      }, 220);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleClear = () => {
    setQuery("");
    setSubmitted("");
    setActiveGenre("All");
    setSuggestions([]);
    setShowSuggestions(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
  };

  const handleGenre = (genre: string) => {
    setActiveGenre(genre);
    setQuery("");
    setSubmitted("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleHistoryTap = (q: string) => {
    setQuery(q);
    setSubmitted(q);
    setActiveGenre("All");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSuggestionTap = (word: string) => {
    setQuery(word);
    setSubmitted(word);
    setActiveGenre("All");
    setSuggestions([]);
    setShowSuggestions(false);
    addSearch(word);
  };

  const handleFocus = () => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    if (suggestions.length > 0) setShowSuggestions(true);
  };

  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setShowSuggestions(false);
    }, 160);
  };

  const showLoading = (isLoading || isFetching) && effectiveQuery.length > 0;
  const showEmpty = !showLoading && results && results.length === 0 && effectiveQuery.length > 0;
  const showIdle = effectiveQuery.length === 0 && activeGenre === "All";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[styles.header, { paddingTop: topInset + 12, backgroundColor: colors.background }]}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Search</Text>
        <SearchBar
          value={query}
          onChangeText={handleSearch}
          onClear={handleClear}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={() => {
            setSuggestions([]);
            setShowSuggestions(false);
          }}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.genreRow}
          style={styles.genreScroll}
        >
          {GENRES.map((g) => {
            const isActive = activeGenre === g.label;
            return (
              <TouchableOpacity
                key={g.label}
                onPress={() => handleGenre(g.label)}
                style={[
                  styles.genreChip,
                  {
                    backgroundColor: isActive ? colors.primary : colors.secondary,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Feather name={g.icon} size={13} color={isActive ? "#000" : colors.mutedForeground} />
                <Text
                  style={[
                    styles.genreLabel,
                    { color: isActive ? "#000" : colors.foreground, fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular" },
                  ]}
                >
                  {g.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {showSuggestions && suggestions.length > 0 && headerHeight > 0 && (
        <View
          style={[
            styles.suggestionsContainer,
            {
              top: headerHeight,
              backgroundColor: colors.secondary,
              borderColor: colors.border,
            },
          ]}
        >
          {suggestions.map((word, index) => (
            <TouchableOpacity
              key={`${word}-${index}`}
              style={[
                styles.suggestionRow,
                index < suggestions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
              ]}
              onPress={() => handleSuggestionTap(word)}
              activeOpacity={0.7}
            >
              <Feather name="search" size={14} color={colors.mutedForeground} style={{ marginRight: 10 }} />
              <Text style={[styles.suggestionText, { color: colors.foreground }]} numberOfLines={1}>
                {word}
              </Text>
              <Feather name="arrow-up-left" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {showIdle ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.idleContainer, { paddingBottom: 100 + bottomInset }]}
          showsVerticalScrollIndicator={false}
        >
          {history.length > 0 ? (
            <View style={styles.historySection}>
              <View style={styles.historyHeader}>
                <Text style={[styles.historyTitle, { color: colors.foreground }]}>Recent Searches</Text>
                <TouchableOpacity onPress={clearAll} activeOpacity={0.7}>
                  <Text style={[styles.clearAll, { color: colors.primary }]}>Clear all</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.historyList}>
                {history.map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={[styles.historyItem, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                    onPress={() => handleHistoryTap(q)}
                    activeOpacity={0.75}
                  >
                    <Feather name="clock" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.historyText, { color: colors.foreground }]} numberOfLines={1}>
                      {q}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeSearch(q)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{ marginLeft: "auto" }}
                    >
                      <Feather name="x" size={14} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.emptyIdle}>
              <AnimatedEmptyIcon name="search" />
              <Text style={[styles.idleTitle, { color: colors.foreground }]}>Find Your Next Watch</Text>
              <Text style={[styles.idleText, { color: colors.mutedForeground }]}>
                Type a title or pick a genre above
              </Text>
            </View>
          )}
        </ScrollView>
      ) : showLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Searching...</Text>
        </View>
      ) : results && results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={({ item }) => (
            <View style={styles.gridItem}>
              <MovieCard movie={item} size="medium" />
            </View>
          )}
          contentContainerStyle={[styles.grid, { paddingBottom: 100 + bottomInset }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
              {results.length} results
              {submitted ? ` for "${submitted}"` : activeGenre !== "All" ? ` in ${activeGenre}` : ""}
            </Text>
          }
        />
      ) : showEmpty ? (
        <View style={styles.empty}>
          <AnimatedEmptyIcon name="film" />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Results Found</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {submitted
              ? `Nothing matched "${submitted}". Try a different title.`
              : `No ${activeGenre} titles found. Try another genre.`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 4, zIndex: 10 },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  genreScroll: { marginTop: 10 },
  genreRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 10 },
  genreChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  genreLabel: { fontSize: 13 },
  suggestionsContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 999,
    elevation: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  idleContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  emptyIdle: {
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 60,
  },
  historySection: {
    gap: 12,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  historyTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  clearAll: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  historyList: {
    gap: 8,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  historyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  grid: { paddingHorizontal: 12, paddingTop: 8 },
  columnWrapper: { gap: 8, marginBottom: 16 },
  gridItem: { flex: 1, alignItems: "center" },
  resultCount: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 16 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 32,
    marginTop: -40,
  },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  idleTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  idleText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
