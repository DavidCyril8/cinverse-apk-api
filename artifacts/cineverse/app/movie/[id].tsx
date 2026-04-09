import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as FileSystem from "expo-file-system/legacy";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { fetchMovieDetails, fetchStream, fetchStreamData, makeRelayUrl, StreamQuality } from "@/lib/movieApi";
import { useWatchlist } from "@/context/WatchlistContext";
import { useDownloads } from "@/context/DownloadContext";
import { useWatchHistory } from "@/context/WatchHistoryContext";
import { makeDownloadId } from "@/lib/downloadManager";
import { DownloadConfirmModal } from "@/components/DownloadConfirmModal";
import { useAuth } from "@/context/AuthContext";
import { fetchReviews, postReview, deleteReview, type Review } from "@/lib/apiClient";

const { width, height } = Dimensions.get("window");

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function ratingColor(score: number) {
  if (score >= 8) return "#4ade80";
  if (score >= 6) return "#facc15";
  return "#fb923c";
}

function SkeletonBox({ w, h: bh, radius = 8 }: { w: number | string; h: number; radius?: number }) {
  const shimmer = useRef(new Animated.Value(-1)).current;
  const boxWidth = typeof w === "number" ? w : width;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 1200, useNativeDriver: true })
    ).start();
  }, []);

  const translateX = shimmer.interpolate({
    inputRange: [-1, 1],
    outputRange: [-boxWidth, boxWidth],
  });

  return (
    <View style={{ width: w as number, height: bh, borderRadius: radius, backgroundColor: "#1f1f1f", overflow: "hidden" }}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.06)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

function DetailSkeleton({ topInset }: { topInset: number }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, backgroundColor: "#141414" }}>
      <SkeletonBox w={width} h={height * 0.42} radius={0} />
      <View style={{ flexDirection: "row", paddingHorizontal: 16, marginTop: -(height * 0.42 * 0.25), gap: 16, alignItems: "flex-end" }}>
        <SkeletonBox w={width * 0.32} h={width * 0.32 * 1.5} radius={8} />
        <View style={{ flex: 1, gap: 10, paddingBottom: 4 }}>
          <SkeletonBox w={80} h={18} radius={4} />
          <SkeletonBox w={60} h={22} radius={4} />
        </View>
      </View>
      <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 12 }}>
        <SkeletonBox w={width * 0.6} h={28} radius={6} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <SkeletonBox w={70} h={26} radius={4} />
          <SkeletonBox w={70} h={26} radius={4} />
          <SkeletonBox w={70} h={26} radius={4} />
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
          <SkeletonBox w={width * 0.45} h={46} radius={8} />
          <SkeletonBox w={width * 0.25} h={46} radius={8} />
          <SkeletonBox w={46} h={46} radius={8} />
        </View>
        <View style={{ gap: 8, marginTop: 8 }}>
          <SkeletonBox w={80} h={20} radius={4} />
          <SkeletonBox w="100%" h={14} radius={4} />
          <SkeletonBox w="90%" h={14} radius={4} />
          <SkeletonBox w="70%" h={14} radius={4} />
        </View>
      </View>
    </ScrollView>
  );
}

function formatSizeMb(sizeMb?: number): string {
  if (!sizeMb || sizeMb <= 0) return "";
  if (sizeMb >= 1024) return `${(sizeMb / 1024).toFixed(1)} GB`;
  return `${Math.round(sizeMb)} MB`;
}

function QualitySheet({
  visible,
  qualities,
  onSelect,
  onClose,
  title,
}: {
  visible: boolean;
  qualities: StreamQuality[];
  onSelect: (q: StreamQuality) => void;
  onClose: () => void;
  title: string;
}) {
  const colors = useColors();
  const isSingle = qualities.length === 1;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={qs.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[qs.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[qs.handle, { backgroundColor: colors.border }]} />
        <Text style={[qs.sheetTitle, { color: colors.foreground }]}>
          {isSingle ? "Confirm Download" : "Download Quality"}
        </Text>
        <Text style={[qs.sheetSub, { color: colors.mutedForeground }]}>{title}</Text>
        {qualities.map((q) => {
          const sizeStr = formatSizeMb(q.sizeMb);
          const label = parseInt(q.resolution) >= 1080
            ? "Full HD"
            : parseInt(q.resolution) >= 720
              ? "HD"
              : "SD";
          return (
            <TouchableOpacity
              key={q.url}
              style={[qs.option, { borderColor: colors.border }]}
              onPress={() => onSelect(q)}
              activeOpacity={0.8}
            >
              <View style={[qs.optionDot, { backgroundColor: colors.primary }]} />
              <Text style={[qs.optionRes, { color: colors.foreground }]}>{q.resolution}p</Text>
              <Text style={[qs.optionLabel, { color: colors.mutedForeground }]}>{label}</Text>
              {sizeStr ? (
                <View style={[qs.sizeBadge, { backgroundColor: colors.secondary }]}>
                  <Text style={[qs.sizeText, { color: colors.mutedForeground }]}>{sizeStr}</Text>
                </View>
              ) : null}
              <Feather name="download" size={15} color={colors.primary} style={{ marginLeft: "auto" }} />
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={[qs.cancelBtn, { borderColor: colors.border }]}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Text style={[qs.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function SeasonPickerModal({
  visible,
  seasons,
  selectedSeason,
  onSelect,
  onClose,
}: {
  visible: boolean;
  seasons: { se: number; maxEp: number }[];
  selectedSeason: number | undefined;
  onSelect: (se: number) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={qs.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[qs.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[qs.handle, { backgroundColor: colors.border }]} />
        <Text style={[qs.sheetTitle, { color: colors.foreground }]}>Select Season</Text>
        <FlatList
          data={seasons}
          keyExtractor={(s) => String(s.se)}
          style={{ maxHeight: 320 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: s }) => {
            const active = selectedSeason === s.se;
            return (
              <TouchableOpacity
                style={[sp.row, { borderColor: colors.border }]}
                onPress={() => { onSelect(s.se); onClose(); }}
                activeOpacity={0.8}
              >
                {active ? (
                  <View style={[sp.dot, { backgroundColor: colors.primary }]} />
                ) : (
                  <View style={[sp.dot, { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border }]} />
                )}
                <Text style={[sp.label, { color: active ? colors.primary : colors.foreground }]}>
                  Season {s.se}
                </Text>
                <Text style={[sp.eps, { color: colors.mutedForeground }]}>{s.maxEp} episodes</Text>
              </TouchableOpacity>
            );
          }}
        />
        <TouchableOpacity
          style={[qs.cancelBtn, { borderColor: colors.border, marginTop: 8 }]}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Text style={[qs.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Cast Card — with error fallback so broken URLs show the initial ─────────
function CastCard({
  member,
  colors,
}: {
  member: { name: string; character: string; profileUrlId?: string };
  colors: ReturnType<typeof useColors>;
}) {
  const [imgError, setImgError] = useState(false);
  const showImg = !!member.profileUrlId && !imgError;
  return (
    <View style={styles.castMember}>
      <View style={[styles.castAvatar, { backgroundColor: colors.secondary }]}>
        {showImg ? (
          <Image
            source={{ uri: member.profileUrlId }}
            style={styles.castAvatarImg}
            contentFit="cover"
            cachePolicy="memory-disk"
            onError={() => setImgError(true)}
          />
        ) : (
          <Text style={[styles.castInitial, { color: colors.mutedForeground }]}>
            {member.name.charAt(0)}
          </Text>
        )}
      </View>
      <Text style={[styles.castName, { color: colors.foreground }]} numberOfLines={1}>
        {member.name}
      </Text>
      {member.character ? (
        <Text style={[styles.castChar, { color: colors.mutedForeground }]} numberOfLines={1}>
          {member.character}
        </Text>
      ) : null}
    </View>
  );
}

// ─── Star Row helper ─────────────────────────────────────────────────────────
function StarRow({
  rating,
  onPress,
  size = 18,
  color = "#13CFCF",
  dimColor = "rgba(255,255,255,0.15)",
}: {
  rating: number;
  onPress?: (r: number) => void;
  size?: number;
  color?: string;
  dimColor?: string;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity
          key={n}
          onPress={() => onPress?.(n)}
          activeOpacity={onPress ? 0.7 : 1}
          disabled={!onPress}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        >
          <Feather
            name={n <= rating ? "star" : "star"}
            size={size}
            color={n <= rating ? color : dimColor}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Reviews Section ─────────────────────────────────────────────────────────
function ReviewsSection({ movieId }: { movieId: string }) {
  const colors = useColors();
  const { user } = useAuth();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [draftRating, setDraftRating] = useState(0);
  const [draftText, setDraftText] = useState("");
  const [formError, setFormError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const myReview = user ? reviews.find((r) => r.userId === user.id) : undefined;

  const load = useCallback(async () => {
    try {
      setLoadingReviews(true);
      const data = await fetchReviews(movieId);
      setReviews(data);
    } catch {
      // silent – just show empty state
    } finally {
      setLoadingReviews(false);
    }
  }, [movieId]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (draftRating < 1) { setFormError("Please select a star rating."); return; }
    if (!draftText.trim()) { setFormError("Please write something about this title."); return; }
    setFormError("");
    Keyboard.dismiss();
    setSubmitting(true);
    try {
      const saved = await postReview(movieId, draftRating, draftText.trim());
      setReviews((prev) => {
        const filtered = prev.filter((r) => r.userId !== saved.userId);
        return [saved, ...filtered];
      });
      setDraftRating(0);
      setDraftText("");
      setShowForm(false);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Failed to save review.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (r: Review) => {
    Alert.alert("Delete Review", "Remove your review for this title?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(r.id);
          try {
            await deleteReview(movieId, r.id);
            setReviews((prev) => prev.filter((x) => x.id !== r.id));
          } catch {
            Alert.alert("Error", "Could not delete review. Try again.");
          } finally {
            setDeleting(null);
          }
        },
      },
    ]);
  };

  const handleEdit = (r: Review) => {
    setDraftRating(r.rating);
    setDraftText(r.text);
    setFormError("");
    setShowForm(true);
  };

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const d = Math.floor(diff / 86400000);
    if (d === 0) return "Today";
    if (d === 1) return "Yesterday";
    if (d < 30) return `${d}d ago`;
    const m = Math.floor(d / 30);
    if (m < 12) return `${m}mo ago`;
    return `${Math.floor(m / 12)}y ago`;
  }

  return (
    <View style={rv.root}>
      {/* Header row */}
      <View style={rv.header}>
        <Text style={[rv.title, { color: colors.foreground }]}>Reviews</Text>
        <View style={rv.headerRight}>
          {reviews.length > 0 && (
            <View style={rv.countBadge}>
              <Text style={rv.countText}>{reviews.length}</Text>
            </View>
          )}
          {user && !myReview && !showForm && (
            <TouchableOpacity
              style={[rv.writeBtn, { backgroundColor: "#13CFCF" }]}
              onPress={() => { setShowForm(true); setFormError(""); }}
              activeOpacity={0.85}
            >
              <Feather name="edit-2" size={13} color="#111" />
              <Text style={rv.writeBtnText}>Write a Review</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Write / Edit form */}
      {user && showForm && (
        <View style={[rv.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[rv.formLabel, { color: colors.mutedForeground }]}>
            {myReview ? "Update your review" : "Share your thoughts"}
          </Text>

          {/* Star picker */}
          <View style={rv.starRow}>
            <StarRow
              rating={draftRating}
              onPress={(n) => { setDraftRating(n); setFormError(""); }}
              size={28}
            />
            {draftRating > 0 && (
              <Text style={[rv.starLabel, { color: "#13CFCF" }]}>
                {["", "Poor", "Fair", "Good", "Great", "Excellent"][draftRating]}
              </Text>
            )}
          </View>

          <TextInput
            style={[rv.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
            placeholder="What did you think of this title?"
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
            maxLength={1000}
            value={draftText}
            onChangeText={(t) => { setDraftText(t); setFormError(""); }}
          />

          {draftText.length > 0 && (
            <Text style={[rv.charCount, { color: colors.mutedForeground }]}>{draftText.length}/1000</Text>
          )}

          {formError ? (
            <Text style={rv.formError}>{formError}</Text>
          ) : null}

          <View style={rv.formActions}>
            <TouchableOpacity
              style={[rv.cancelFormBtn, { borderColor: colors.border }]}
              onPress={() => { setShowForm(false); setDraftRating(0); setDraftText(""); setFormError(""); }}
              activeOpacity={0.8}
            >
              <Text style={[rv.cancelFormText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[rv.submitBtn, { backgroundColor: submitting ? "#0fa8a8" : "#13CFCF", opacity: submitting ? 0.7 : 1 }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#111" />
              ) : (
                <Feather name="check" size={15} color="#111" />
              )}
              <Text style={rv.submitText}>{submitting ? "Saving..." : myReview ? "Update" : "Post Review"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Guest CTA */}
      {!user && (
        <View style={[rv.guestCta, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="lock" size={16} color="#13CFCF" />
          <Text style={[rv.guestCtaText, { color: colors.mutedForeground }]}>
            Sign in to write a review
          </Text>
        </View>
      )}

      {/* Loading */}
      {loadingReviews && (
        <View style={rv.loadingWrap}>
          <ActivityIndicator color="#13CFCF" size="small" />
        </View>
      )}

      {/* Empty state */}
      {!loadingReviews && reviews.length === 0 && (
        <View style={rv.empty}>
          <Feather name="message-square" size={28} color="rgba(255,255,255,0.15)" />
          <Text style={[rv.emptyText, { color: colors.mutedForeground }]}>
            No reviews yet. Be the first!
          </Text>
        </View>
      )}

      {/* Review cards */}
      {!loadingReviews && reviews.map((r) => {
        const isOwn = user?.id === r.userId;
        const isDeleting = deleting === r.id;
        return (
          <View
            key={r.id}
            style={[rv.card, { backgroundColor: colors.card, borderColor: isOwn ? "#13CFCF30" : colors.border }]}
          >
            {/* Card top */}
            <View style={rv.cardTop}>
              {/* Avatar initial */}
              <View style={[rv.avatar, { backgroundColor: isOwn ? "#13CFCF20" : "rgba(255,255,255,0.06)" }]}>
                <Text style={[rv.avatarText, { color: isOwn ? "#13CFCF" : colors.mutedForeground }]}>
                  {r.userName.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <View style={rv.nameRow}>
                  <Text style={[rv.userName, { color: colors.foreground }]} numberOfLines={1}>
                    {r.userName}
                  </Text>
                  {isOwn && (
                    <View style={rv.youBadge}>
                      <Text style={rv.youText}>You</Text>
                    </View>
                  )}
                </View>
                <View style={rv.metaRow}>
                  <StarRow rating={r.rating} size={12} />
                  <Text style={[rv.dateText, { color: colors.mutedForeground }]}>
                    · {timeAgo(r.createdAt)}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              {isOwn && (
                <View style={rv.cardActions}>
                  <TouchableOpacity
                    onPress={() => handleEdit(r)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <Feather name="edit-2" size={14} color="#13CFCF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(r)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size={14} color="rgba(255,80,80,0.7)" />
                    ) : (
                      <Feather name="trash-2" size={14} color="rgba(255,80,80,0.7)" />
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <Text style={[rv.reviewText, { color: colors.foreground }]}>{r.text}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function MovieDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, detailPath: paramDetailPath } = useLocalSearchParams<{ id: string; detailPath?: string }>();
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const { initiateDownload, getStatus } = useDownloads();
  const { getEntry } = useWatchHistory();
  const [streamLoading, setStreamLoading] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<number | undefined>(undefined);
  const [selectedEpisode, setSelectedEpisode] = useState<number | undefined>(undefined);
  const [qualitySheet, setQualitySheet] = useState<{ qualities: StreamQuality[]; subtitleUrl?: string } | null>(null);
  const [downloadConfirm, setDownloadConfirm] = useState<{
    quality: string; sizeMb?: number; hasSubtitle: boolean;
  } | null>(null);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [showSeasonPicker, setShowSeasonPicker] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const { data: movie, isLoading, isError, refetch } = useQuery({
    queryKey: ["details", id],
    queryFn: () => fetchMovieDetails(id!),
    enabled: !!id,
  });

  const historyEntry = id ? getEntry(id) : undefined;

  useEffect(() => {
    if (movie && movie.subjectType === 2 && movie.seasons && movie.seasons.length > 0) {
      if (historyEntry?.season) {
        setSelectedSeason(historyEntry.season);
        setSelectedEpisode(historyEntry.episode ?? 1);
      } else {
        setSelectedSeason(movie.seasons[0].se);
        setSelectedEpisode(1);
      }
    }
  }, [movie?.id]);

  const handleWatchlist = () => {
    if (!movie) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (inList) {
      removeFromWatchlist(id!);
    } else {
      addToWatchlist(movie);
    }
  };

  const launchPlayer = async (overridePositionMs?: number) => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStreamLoading(true);
    try {
      const result = await fetchStream(id, movie?.detailPath, selectedSeason, selectedEpisode, false);
      if (result) {
        const { url: link, subtitles } = result;
        const playerUri = makeRelayUrl(link);
        const isSeries = movie?.subjectType === 2;
        const currentSeason = isSeries
          ? movie?.seasons?.find((s) => s.se === selectedSeason)
          : undefined;

        const engSub = subtitles.find((s) =>
          s.language.startsWith("en") || s.label.toLowerCase().includes("english")
        ) ?? subtitles[0];

        router.push({
          pathname: "/player/[id]",
          params: {
            id,
            uri: playerUri,
            title: movie?.title ?? "",
            detailPath: movie?.detailPath ?? "",
            season: selectedSeason !== undefined ? String(selectedSeason) : "",
            episode: selectedEpisode !== undefined ? String(selectedEpisode) : "",
            episodeTotal: currentSeason?.maxEp !== undefined ? String(currentSeason.maxEp) : "",
            subjectType: String(movie?.subjectType ?? 1),
            posterUrlId: movie?.posterUrlId ?? "",
            backdropUrlId: movie?.backdropUrlId ?? "",
            startPositionMs: overridePositionMs !== undefined ? String(overridePositionMs) : "",
            subtitleUrl: engSub?.url ?? "",
            subtitleLabel: engSub?.label ?? "",
            subtitleLang: engSub?.language ?? "",
            subtitleDelay: engSub?.delay !== undefined ? String(engSub.delay) : "0",
          },
        });
      } else {
        Alert.alert("Stream Not Available", "No streaming link found for this title.");
      }
    } catch {
      Alert.alert("Error", "Failed to get streaming link. Please try again.");
    } finally {
      setStreamLoading(false);
    }
  };

  const handlePlay = () => launchPlayer();

  const handleResume = () => {
    if (historyEntry) launchPlayer(historyEntry.positionMs);
  };

  const handleTrailer = () => {
    if (!movie?.trailerUrl) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(movie.trailerUrl).catch(() => {
      Alert.alert("Cannot Open Trailer", "Unable to open the trailer link.");
    });
  };

  const handleDownload = async () => {
    if (!movie || !id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setQualityLoading(true);
    try {
      const { qualities, subtitles } = await fetchStreamData(
        id,
        movie.detailPath,
        selectedSeason,
        selectedEpisode
      );

      const engSubtitle = subtitles.find((s) => s.language.startsWith("en")) ?? subtitles[0];
      const subtitleUrl = engSubtitle?.url;

      setQualitySheet({ qualities, subtitleUrl });
    } catch {
      initiateDownload({
        subjectId: id,
        title: movie.title,
        posterUrlId: movie.posterUrlId,
        subjectType: movie.subjectType,
        detailPath: movie.detailPath,
        season: selectedSeason,
        episode: selectedEpisode,
      });
    } finally {
      setQualityLoading(false);
    }
  };

  const handleDownloadSeason = () => {
    if (!movie || !id || !currentSeason) return;
    Alert.alert(
      `Download Season ${selectedSeason}`,
      `This will download all ${currentSeason.maxEp} episodes. This may use significant storage.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Download All",
          onPress: () => {
            for (let ep = 1; ep <= currentSeason.maxEp; ep++) {
              initiateDownload({
                subjectId: id,
                title: `${movie.title} S${selectedSeason}E${ep}`,
                posterUrlId: movie.posterUrlId,
                subjectType: movie.subjectType,
                detailPath: movie.detailPath,
                season: selectedSeason,
                episode: ep,
              });
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleQualitySelect = async (q: StreamQuality) => {
    if (!movie || !id) return;
    const subtitleUrl = qualitySheet?.subtitleUrl;
    setQualitySheet(null);

    if (q.sizeMb && q.sizeMb > 0) {
      try {
        const freeBytes = await FileSystem.getFreeDiskStorageAsync();
        const freeMb = freeBytes / (1024 * 1024);
        const neededMb = q.sizeMb;
        const bufferMb = 150;

        if (freeMb < neededMb + bufferMb) {
          const freeStr = freeMb >= 1024
            ? `${(freeMb / 1024).toFixed(1)} GB`
            : `${Math.round(freeMb)} MB`;
          const neededStr = neededMb >= 1024
            ? `${(neededMb / 1024).toFixed(1)} GB`
            : `${Math.round(neededMb)} MB`;

          if (freeMb < neededMb) {
            Alert.alert(
              "Not Enough Storage",
              `This file needs ${neededStr} but you only have ${freeStr} free. Free up some space and try again.`,
              [{ text: "OK" }]
            );
            return;
          }

          const confirmed = await new Promise<boolean>((resolve) => {
            Alert.alert(
              "Low Storage",
              `This file is ${neededStr} and you only have ${freeStr} free. The download may fail if your device runs out of space.`,
              [
                { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
                { text: "Download Anyway", onPress: () => resolve(true) },
              ]
            );
          });

          if (!confirmed) return;
        }
      } catch {
        // getFreeDiskStorageAsync failed — proceed without the check
      }
    }

    initiateDownload({
      subjectId: id,
      title: movie.title,
      posterUrlId: movie.posterUrlId,
      subjectType: movie.subjectType,
      detailPath: movie.detailPath,
      season: selectedSeason,
      episode: selectedEpisode,
      directUrl: q.downloadUrl ?? q.url,
      subtitleUrl,
    });

    setDownloadConfirm({
      quality: q.resolution,
      sizeMb: q.sizeMb,
      hasSubtitle: !!subtitleUrl,
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.backBtn, { top: topInset + 8 }]}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={18} color="#fff" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <DetailSkeleton topInset={topInset} />
      </View>
    );
  }

  if (isError || !movie) {
    const filmCells = Array.from({ length: 14 });
    return (
      <View style={[styles.unavailableRoot, { backgroundColor: "#111111" }]}>
        {/* Status-bar spacer */}
        <View style={{ height: topInset }} />

        {/* Nav back */}
        <TouchableOpacity
          style={styles.unavailableBack}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Feather name="chevron-left" size={18} color="rgba(255,255,255,0.5)" />
          <Text style={styles.unavailableBackText}>Movies</Text>
        </TouchableOpacity>

        {/* Film strip top */}
        <View style={styles.filmStrip}>
          {filmCells.map((_, i) => (
            <View key={i} style={styles.filmCell}>
              <View style={styles.filmDot} />
              <View style={styles.filmDot} />
            </View>
          ))}
        </View>

        {/* Main area */}
        <View style={styles.unavailableMain}>
          {/* UNAVAILABLE stamp */}
          <View style={styles.stampWrap}>
            <View style={styles.stampBox}>
              <Text style={styles.stampText}>UNAVAILABLE</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.unavailableDivider} />

          {/* Info card */}
          <View style={styles.unavailableCard}>
            <Text style={styles.unavailableCardLabel}>CONTENT UNAVAILABLE</Text>
            <Text style={styles.unavailableCardSub}>
              This title could not be loaded. It may have been removed or is not available in your region.
            </Text>
            <View style={styles.unavailableStats}>
              <View style={styles.unavailableStat}>
                <Text style={styles.unavailableStatVal}>ERR-404</Text>
                <Text style={styles.unavailableStatKey}>CODE</Text>
              </View>
              <View style={styles.unavailableStatDivider} />
              <View style={styles.unavailableStat}>
                <Text style={styles.unavailableStatVal}>REGION</Text>
                <Text style={styles.unavailableStatKey}>BLOCK</Text>
              </View>
              <View style={styles.unavailableStatDivider} />
              <View style={styles.unavailableStat}>
                <Text style={styles.unavailableStatVal}>N/A</Text>
                <Text style={styles.unavailableStatKey}>STREAM</Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <TouchableOpacity
            onPress={() => refetch()}
            style={styles.unavailableRetryBtn}
            activeOpacity={0.85}
          >
            <Feather name="refresh-cw" size={15} color="#111111" />
            <Text style={styles.unavailableRetryText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.unavailableGoBack}
            activeOpacity={0.8}
          >
            <Text style={styles.unavailableGoBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>

        {/* Film strip bottom */}
        <View style={[styles.filmStrip, { marginTop: "auto" }]}>
          {filmCells.map((_, i) => (
            <View key={i} style={styles.filmCell}>
              <View style={styles.filmDot} />
              <View style={styles.filmDot} />
            </View>
          ))}
        </View>
        <View style={{ height: topInset + 8 }} />
      </View>
    );
  }

  const isSeries = movie.subjectType === 2;
  if (__DEV__) console.log("[DETAIL]", movie.id, "isSeries:", isSeries, "seasons:", JSON.stringify(movie.seasons?.slice(0,2)));
  const year = movie.releaseDate ? movie.releaseDate.split("-")[0] : null;
  const currentSeason = movie.seasons?.find((s) => s.se === selectedSeason);
  const inList = isInWatchlist(id ?? "");
  const downloadId = makeDownloadId(id ?? "", selectedSeason, selectedEpisode);
  const dlStatus = getStatus(downloadId);

  const hasResume = !!historyEntry && historyEntry.positionMs > 0;
  const resumeLabel = hasResume
    ? isSeries && historyEntry?.season
      ? `Resume S${historyEntry.season}E${historyEntry.episode} · ${formatMs(historyEntry.positionMs)}`
      : `Resume · ${formatMs(historyEntry!.positionMs)}`
    : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        style={[styles.backBtn, { top: topInset + 8 }]}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Feather name="arrow-left" size={18} color="#fff" />
        <Text style={styles.backBtnText}>Back</Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 + bottomInset }}>
        <View style={styles.backdrop}>
          {movie.backdropUrlId ? (
            <Image
              source={{ uri: movie.backdropUrlId }}
              style={styles.backdropImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.backdropImage, { backgroundColor: "#111827" }]} />
          )}
          <LinearGradient
            colors={["transparent", "rgba(20,20,20,0.8)", "#141414"]}
            style={styles.backdropGradient}
            locations={[0.3, 0.7, 1]}
          />
        </View>

        <View style={styles.detailGrid}>
          <View style={styles.posterCol}>
            {movie.posterUrlId ? (
              <Image
                source={{ uri: movie.posterUrlId }}
                style={styles.poster}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={[styles.poster, { backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }]}>
                <Feather name="film" size={40} color={colors.mutedForeground} />
              </View>
            )}
          </View>

          <View style={styles.infoCol}>
            <View style={styles.metaRow}>
              {year ? <Text style={[styles.year, { color: colors.mutedForeground }]}>{year}</Text> : null}
              {isSeries ? (
                <View style={[styles.typeBadge, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "50" }]}>
                  <Text style={[styles.typeText, { color: colors.primary }]}>Series</Text>
                </View>
              ) : (
                <View style={[styles.typeBadge, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <Text style={[styles.typeText, { color: colors.mutedForeground }]}>Movie</Text>
                </View>
              )}
            </View>

            {movie.voteAverage > 0 ? (
              <View style={styles.ratingRow}>
                <Feather name="star" size={14} color={ratingColor(movie.voteAverage)} />
                <Text style={[styles.ratingValue, { color: ratingColor(movie.voteAverage) }]}>
                  {movie.voteAverage.toFixed(1)}
                </Text>
                <Text style={[styles.ratingMax, { color: colors.mutedForeground }]}>/10</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.foreground }]}>{movie.title}</Text>

          {movie.genres.length > 0 ? (
            <View style={styles.genreRow}>
              {movie.genres.map((g) => (
                <View key={g} style={[styles.genreChip, { borderColor: colors.border }]}>
                  <Text style={[styles.genreChipText, { color: colors.foreground }]}>{g}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {hasResume && (
            <TouchableOpacity
              style={[styles.resumeBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "60" }]}
              onPress={handleResume}
              activeOpacity={0.85}
            >
              <Feather name="play" size={15} color={colors.primary} />
              <Text style={[styles.resumeBtnText, { color: colors.primary }]}>{resumeLabel}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.streamBtn, { backgroundColor: colors.primary }]}
              onPress={handlePlay}
              activeOpacity={0.85}
              disabled={streamLoading}
            >
              {streamLoading ? (
                <ActivityIndicator color={colors.primaryForeground} size="small" />
              ) : (
                <Feather name="play-circle" size={18} color={colors.primaryForeground} />
              )}
              <Text style={[styles.streamBtnText, { color: colors.primaryForeground }]}>
                {streamLoading ? "Loading..." : hasResume ? "Play from Start" : "Stream"}
              </Text>
            </TouchableOpacity>

            {movie.trailerUrl ? (
              <TouchableOpacity
                style={[styles.trailerBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                onPress={handleTrailer}
                activeOpacity={0.85}
              >
                <Feather name="youtube" size={17} color={colors.mutedForeground} />
                <Text style={[styles.trailerBtnText, { color: colors.foreground }]}>Trailer</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[
                styles.listBtn,
                {
                  backgroundColor:
                    dlStatus === "completed"
                      ? "#4ade8020"
                      : dlStatus === "downloading"
                        ? colors.primary + "20"
                        : colors.secondary,
                  borderColor:
                    dlStatus === "completed"
                      ? "#4ade80"
                      : dlStatus === "downloading"
                        ? colors.primary
                        : colors.border,
                },
              ]}
              onPress={() => {
                if (dlStatus === "completed") {
                  router.push({
                    pathname: "/player/[id]",
                    params: { id: downloadId, title: movie.title },
                  });
                } else if (dlStatus !== "downloading") {
                  handleDownload();
                }
              }}
              disabled={qualityLoading}
              activeOpacity={0.85}
            >
              {dlStatus === "downloading" || qualityLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Feather
                  name={dlStatus === "completed" ? "play" : "download"}
                  size={18}
                  color={
                    dlStatus === "completed"
                      ? "#4ade80"
                      : dlStatus === "downloading"
                        ? colors.primary
                        : colors.mutedForeground
                  }
                />
              )}
              <Text
                style={[
                  styles.listBtnText,
                  {
                    color:
                      dlStatus === "completed"
                        ? "#4ade80"
                        : dlStatus === "downloading"
                          ? colors.primary
                          : colors.mutedForeground,
                  },
                ]}
              >
                {dlStatus === "completed"
                  ? "Play Offline"
                  : dlStatus === "downloading"
                    ? "Saving..."
                    : qualityLoading
                      ? "Loading..."
                      : "Download"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.bookmarkBtn,
                {
                  backgroundColor: inList ? colors.primary + "20" : colors.secondary,
                  borderColor: inList ? colors.primary : colors.border,
                },
              ]}
              onPress={handleWatchlist}
              activeOpacity={0.85}
            >
              <Feather name={inList ? "check" : "bookmark"} size={18} color={inList ? colors.primary : colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {movie.overview ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Overview</Text>
              <Text style={[styles.overview, { color: colors.mutedForeground }]}>{movie.overview}</Text>
            </View>
          ) : null}

          {isSeries && movie.seasons && movie.seasons.length > 0 && (
            <View style={styles.section}>
              <View style={styles.seasonHeader}>
                <TouchableOpacity
                  style={[styles.seasonDropdown, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                  onPress={() => setShowSeasonPicker(true)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.seasonDropdownText, { color: colors.foreground }]}>
                    Season {selectedSeason}
                  </Text>
                  <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>

                {currentSeason && (
                  <TouchableOpacity
                    style={[styles.dlSeasonBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                    onPress={handleDownloadSeason}
                    activeOpacity={0.8}
                  >
                    <Feather name="download-cloud" size={15} color={colors.mutedForeground} />
                    <Text style={[styles.dlSeasonText, { color: colors.mutedForeground }]}>All Episodes</Text>
                  </TouchableOpacity>
                )}
              </View>

              {currentSeason && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 16 }]}>Episodes</Text>
                  <View style={styles.episodeGrid}>
                    {Array.from({ length: currentSeason.maxEp }, (_, i) => i + 1).map((ep) => {
                      const dlId = makeDownloadId(String(id), selectedSeason, ep);
                      const dlStatus = getStatus(dlId);
                      return (
                        <TouchableOpacity
                          key={ep}
                          onPress={() => setSelectedEpisode(ep)}
                          style={[
                            styles.epBtn,
                            {
                              backgroundColor: selectedEpisode === ep ? colors.primary : colors.secondary,
                              borderColor: selectedEpisode === ep ? colors.primary : colors.border,
                            },
                          ]}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.epBtnText,
                              { color: selectedEpisode === ep ? colors.primaryForeground : colors.foreground },
                            ]}
                          >
                            {ep}
                          </Text>
                          {dlStatus === "completed" && (
                            <View style={[styles.epDlDot, { backgroundColor: colors.primary }]} />
                          )}
                          {dlStatus === "downloading" && (
                            <View style={[styles.epDlDot, { backgroundColor: "#FFAA00" }]} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </View>
          )}

          {movie.cast && movie.cast.length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Cast</Text>
              <View style={styles.castGrid}>
                {movie.cast.slice(0, 6).map((member, i) => (
                  <CastCard key={i} member={member} colors={colors} />
                ))}
              </View>
            </View>
          ) : null}

          <ReviewsSection movieId={id!} />
        </View>
      </ScrollView>

      {qualitySheet && (
        <QualitySheet
          visible
          qualities={qualitySheet.qualities}
          onSelect={handleQualitySelect}
          onClose={() => setQualitySheet(null)}
          title={movie.title}
        />
      )}

      {downloadConfirm && movie && (
        <DownloadConfirmModal
          visible={!!downloadConfirm}
          onClose={() => setDownloadConfirm(null)}
          movieTitle={movie.title}
          season={selectedSeason}
          episode={selectedEpisode}
          quality={downloadConfirm.quality}
          sizeMb={downloadConfirm.sizeMb}
          hasSubtitle={downloadConfirm.hasSubtitle}
        />
      )}

      {isSeries && movie.seasons && movie.seasons.length > 0 && (
        <SeasonPickerModal
          visible={showSeasonPicker}
          seasons={movie.seasons}
          selectedSeason={selectedSeason}
          onSelect={(se) => {
            setSelectedSeason(se);
            setSelectedEpisode(1);
          }}
          onClose={() => setShowSeasonPicker(false)}
        />
      )}
    </View>
  );
}

const qs = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  sheetTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sheetSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 4 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  optionDot: { width: 10, height: 10, borderRadius: 5 },
  optionRes: { fontSize: 16, fontFamily: "Inter_700Bold" },
  optionLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  sizeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  sizeText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    marginTop: 4,
  },
  cancelText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  errorText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  backLink: { padding: 12 },

  unavailableRoot: { flex: 1 },
  unavailableBack: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  unavailableBackText: { color: "rgba(255,255,255,0.5)", fontSize: 13, fontFamily: "Inter_500Medium" },
  filmStrip: {
    flexDirection: "row",
    overflow: "hidden",
    height: 20,
    backgroundColor: "rgba(19,207,207,0.06)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(19,207,207,0.1)",
  },
  filmCell: {
    width: 28,
    borderRightWidth: 1,
    borderRightColor: "rgba(19,207,207,0.1)",
    flexDirection: "column",
    justifyContent: "space-between",
    paddingVertical: 3,
    paddingHorizontal: 1,
    flexShrink: 0,
  },
  filmDot: {
    width: 6,
    height: 4,
    backgroundColor: "rgba(19,207,207,0.15)",
    borderRadius: 1,
    alignSelf: "center",
  },
  unavailableMain: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  stampWrap: {
    marginBottom: 28,
    marginTop: 8,
  },
  stampBox: {
    borderWidth: 4,
    borderColor: "rgba(19,207,207,0.72)",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
    transform: [{ rotate: "-8deg" }],
  },
  stampText: {
    color: "rgba(19,207,207,0.88)",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 6,
    fontFamily: "Inter_700Bold",
  },
  unavailableDivider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginBottom: 24,
  },
  unavailableCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 16,
    gap: 10,
    marginBottom: 28,
  },
  unavailableCardLabel: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  unavailableCardSub: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  unavailableStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  unavailableStat: { flex: 1, alignItems: "center", gap: 2 },
  unavailableStatVal: {
    color: "#13CFCF",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  unavailableStatKey: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  unavailableStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  unavailableRetryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#13CFCF",
    paddingHorizontal: 32,
    paddingVertical: 13,
    borderRadius: 10,
    width: "100%",
    justifyContent: "center",
    marginBottom: 12,
  },
  unavailableRetryText: {
    color: "#111111",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  unavailableGoBack: {
    paddingVertical: 10,
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 10,
  },
  unavailableGoBackText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },

  backBtn: {
    position: "absolute",
    left: 12,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  backBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_500Medium" },
  backdrop: { width, height: height * 0.42, position: "relative" },
  backdropImage: { width: "100%", height: "100%" },
  backdropGradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: "65%" },
  detailGrid: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: -(height * 0.42 * 0.25),
    gap: 16,
    alignItems: "flex-end",
  },
  posterCol: { width: width * 0.32 },
  poster: { width: "100%", aspectRatio: 2 / 3, borderRadius: 8, overflow: "hidden" },
  infoCol: { flex: 1, gap: 8, paddingBottom: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  year: { fontSize: 13, fontFamily: "Inter_400Regular" },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, borderWidth: 1 },
  typeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  ratingMax: { fontSize: 13, fontFamily: "Inter_400Regular" },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 0 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", lineHeight: 30, marginBottom: 12 },
  genreRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  genreChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, borderWidth: 1 },
  genreChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  resumeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  resumeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  actions: { flexDirection: "row", gap: 8, marginBottom: 28, flexWrap: "wrap" },
  streamBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 8,
    minWidth: 120,
  },
  streamBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  trailerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 8,
    borderWidth: 1,
  },
  trailerBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  listBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 8,
    borderWidth: 1,
  },
  listBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  bookmarkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 8,
    borderWidth: 1,
  },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 12 },
  overview: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  seasonHeader: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  seasonDropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 140,
    gap: 8,
  },
  seasonDropdownText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  dlSeasonBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
  },
  dlSeasonText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  episodeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  epBtn: { width: 50, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 8, borderWidth: 1 },
  epBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  epDlDot: { position: "absolute", bottom: 4, right: 4, width: 5, height: 5, borderRadius: 3 },
  castGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  castMember: { width: (width - 64) / 3, alignItems: "center", gap: 4 },
  castAvatar: { width: 56, height: 56, borderRadius: 28, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  castAvatarImg: { width: "100%", height: "100%" },
  castInitial: { fontSize: 22, fontFamily: "Inter_700Bold" },
  castName: { fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  castChar: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
});

const sp = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  label: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  eps: { fontSize: 13, fontFamily: "Inter_400Regular" },
});

const rv = StyleSheet.create({
  root: { marginBottom: 32 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  countBadge: {
    backgroundColor: "rgba(19,207,207,0.15)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#13CFCF" },
  writeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  writeBtnText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#111" },

  formCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  formLabel: { fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 0.5 },
  starRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  starLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
    minHeight: 100,
    textAlignVertical: "top",
  },
  charCount: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: -4 },
  formError: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#ff6b6b" },
  formActions: { flexDirection: "row", gap: 10 },
  cancelFormBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelFormText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  submitBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    paddingVertical: 12,
  },
  submitText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#111" },

  guestCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  guestCtaText: { fontSize: 13, fontFamily: "Inter_400Regular" },

  loadingWrap: { paddingVertical: 24, alignItems: "center" },

  empty: { paddingVertical: 28, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },

  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 17, fontFamily: "Inter_700Bold" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  userName: { fontSize: 14, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  youBadge: {
    backgroundColor: "rgba(19,207,207,0.15)",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  youText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#13CFCF" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dateText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  cardActions: { flexDirection: "row", gap: 14, marginLeft: "auto", paddingTop: 2 },
  reviewText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
});
