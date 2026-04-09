import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useDownloads } from "@/context/DownloadContext";
import { saveToGallery } from "@/lib/downloadManager";
import type { DownloadItem } from "@/lib/downloadManager";

function ProgressBar({ progress, color }: { progress: number; color: string }) {
  const slide = useRef(new Animated.Value(0)).current;
  const isIndeterminate = progress < 0;

  useEffect(() => {
    if (!isIndeterminate) {
      slide.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(slide, { toValue: 1, duration: 1200, useNativeDriver: false }),
        Animated.timing(slide, { toValue: 0, duration: 0, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isIndeterminate, slide]);

  if (isIndeterminate) {
    const left = slide.interpolate({ inputRange: [0, 1], outputRange: ["-40%", "110%"] });
    return (
      <View style={styles.progressTrack}>
        <Animated.View
          style={[styles.progressFill, { position: "absolute", top: 0, bottom: 0, width: "40%", backgroundColor: color, left }]}
        />
      </View>
    );
  }

  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { width: `${Math.round(progress * 100)}%`, backgroundColor: color },
        ]}
      />
    </View>
  );
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
}

function FileSizeLabel({ bytes }: { bytes: number }) {
  if (bytes <= 0) return null;
  return <Text style={styles.fileSizeText}>{formatBytes(bytes)}</Text>;
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec >= 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  if (bytesPerSec >= 1024) return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
  return `${Math.round(bytesPerSec)} B/s`;
}

function fmt(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

function StorageBar({ downloads }: { downloads: DownloadItem[] }) {
  const colors = useColors();
  const [device, setDevice] = useState<{ free: number; total: number } | null>(null);

  useEffect(() => {
    Promise.all([
      FileSystem.getFreeDiskStorageAsync(),
      FileSystem.getTotalDiskCapacityAsync(),
    ])
      .then(([free, total]) => setDevice({ free, total }))
      .catch(() => {});
  }, []);

  const completed = downloads.filter((d) => d.status === "completed");
  const appBytes = completed.reduce((sum, d) => sum + (d.totalBytes || 0), 0);

  if (completed.length === 0) return null;

  const total = device?.total ?? 0;
  const free = device?.free ?? 0;
  const used = total > 0 ? total - free : 0;
  const usagePct = total > 0 ? Math.min(1, used / total) : 0;
  const barColor = usagePct > 0.8 ? "#fb923c" : colors.primary;

  return (
    <View style={[storageStyles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={storageStyles.row}>
        <View style={storageStyles.left}>
          <Feather name="hard-drive" size={15} color={barColor} />
          <Text style={[storageStyles.label, { color: colors.foreground }]}>Storage</Text>
        </View>
        {device ? (
          <Text style={[storageStyles.value, { color: barColor }]}>{fmt(free)} free</Text>
        ) : null}
      </View>
      {device && total > 0 && (
        <View style={[storageStyles.track, { backgroundColor: colors.secondary }]}>
          <View style={[storageStyles.fill, { width: `${usagePct * 100}%`, backgroundColor: barColor }]} />
        </View>
      )}
      <View style={storageStyles.subRow}>
        <Text style={[storageStyles.sub, { color: colors.mutedForeground }]}>
          {completed.length} file{completed.length !== 1 ? "s" : ""} · CINVERSE: {fmt(appBytes)}
        </Text>
        {device && total > 0 && (
          <Text style={[storageStyles.sub, { color: colors.mutedForeground }]}>
            {Math.round(usagePct * 100)}% used
          </Text>
        )}
      </View>
    </View>
  );
}

function AnimatedEmptyState() {
  const colors = useColors();
  const float = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -10, duration: 1400, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(ring, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(ring, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 1, 0.6] });

  return (
    <View style={emptyStyles.container}>
      <Animated.View style={[emptyStyles.iconWrap, { transform: [{ translateY: float }] }]}>
        <Animated.View
          style={[
            emptyStyles.ring,
            {
              borderColor: colors.primary,
              transform: [{ scale: ringScale }],
              opacity: ringOpacity,
            },
          ]}
        />
        <Feather name="download-cloud" size={52} color={colors.primary} />
      </Animated.View>
      <Text style={[emptyStyles.title, { color: colors.foreground }]}>No Downloads Yet</Text>
      <Text style={[emptyStyles.sub, { color: colors.mutedForeground }]}>
        Tap the download button on any movie or episode to watch it offline
      </Text>
    </View>
  );
}

type SortKey = "date" | "name" | "size";

export default function DownloadsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { downloads, deleteDownload, cancelActiveDownload, retryDownload, activeProgress, queueLength } = useDownloads();
  const [sortKey, setSortKey] = React.useState<SortKey>("date");
  const [collapsedSeries, setCollapsedSeries] = React.useState<Set<string>>(new Set());

  const topInset    = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : 0;

  const toggleSeries = React.useCallback((title: string) => {
    setCollapsedSeries((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }, []);

  const sortedDownloads = React.useMemo(() => {
    const arr = [...downloads];
    if (sortKey === "name") return arr.sort((a, b) => (a.label || a.title).localeCompare(b.label || b.title));
    if (sortKey === "size") return arr.sort((a, b) => (b.totalBytes || 0) - (a.totalBytes || 0));
    return arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [downloads, sortKey]);

  type FlatRow =
    | { type: "header"; key: string; title: string; count: number; isMovie: boolean; seriesKey?: string; isCollapsed?: boolean }
    | { type: "item"; key: string; data: DownloadItem };

  const groupedRows = React.useMemo((): FlatRow[] => {
    const movies    = sortedDownloads.filter((d) => (d.subjectType ?? 1) !== 2);
    const seriesEps = sortedDownloads.filter((d) => d.subjectType === 2);

    const seriesMap = new Map<string, DownloadItem[]>();
    for (const ep of seriesEps) {
      const arr = seriesMap.get(ep.title) ?? [];
      arr.push(ep);
      seriesMap.set(ep.title, arr);
    }

    const rows: FlatRow[] = [];
    if (movies.length > 0) {
      rows.push({ type: "header", key: "__movies__", title: "Movies", count: movies.length, isMovie: true });
      movies.forEach((m) => rows.push({ type: "item", key: m.id, data: m }));
    }
    for (const [title, eps] of seriesMap) {
      const isCollapsed = collapsedSeries.has(title);
      rows.push({
        type: "header",
        key: `__series__${title}`,
        title,
        count: eps.length,
        isMovie: false,
        seriesKey: title,
        isCollapsed,
      });
      if (!isCollapsed) {
        eps.forEach((ep) => rows.push({ type: "item", key: ep.id, data: ep }));
      }
    }
    return rows;
  }, [sortedDownloads, collapsedSeries]);

  const handleDelete = (item: DownloadItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Delete Download",
      `Remove "${item.label || item.title}" from offline storage?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteDownload(item.id),
        },
      ]
    );
  };

  const handleCancel = (item: DownloadItem) => {
    Alert.alert("Cancel Download", "Stop downloading this file?", [
      { text: "Keep Going", style: "cancel" },
      {
        text: "Cancel",
        style: "destructive",
        onPress: () => cancelActiveDownload(item.id),
      },
    ]);
  };

  const handlePlay = (item: DownloadItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/player/[id]",
      params: { id: item.id, title: item.label || item.title },
    });
  };

  const handleMoreOptions = (item: DownloadItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      item.label || item.title,
      undefined,
      [
        {
          text: "Save to Gallery",
          onPress: async () => {
            const ok = await saveToGallery(item.fileUri);
            Alert.alert(
              ok ? "Saved to Gallery" : "Save Failed",
              ok
                ? "A copy has been saved to your phone gallery (Pictures/CINEVERSE)."
                : "Could not save to gallery. Make sure media permission is granted.",
            );
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  const renderRow = ({ item: row }: { item: FlatRow }) => {
    if (row.type === "header") {
      // Series headers are collapsible; Movies header is not
      if (!row.isMovie && row.seriesKey) {
        return (
          <TouchableOpacity
            style={styles.groupHeader}
            onPress={() => toggleSeries(row.seriesKey!)}
            activeOpacity={0.7}
          >
            <Feather name="tv" size={13} color={colors.primary} />
            <Text style={[styles.groupTitle, { color: colors.foreground }]} numberOfLines={1}>{row.title}</Text>
            <View style={[styles.groupBadge, { backgroundColor: colors.primary + "22" }]}>
              <Text style={[styles.groupBadgeText, { color: colors.primary }]}>{row.count}</Text>
            </View>
            <Feather
              name={row.isCollapsed ? "chevron-down" : "chevron-up"}
              size={14}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>
        );
      }
      return (
        <View style={styles.groupHeader}>
          <Feather name="film" size={13} color={colors.primary} />
          <Text style={[styles.groupTitle, { color: colors.foreground }]}>{row.title}</Text>
          <View style={[styles.groupBadge, { backgroundColor: colors.primary + "22" }]}>
            <Text style={[styles.groupBadgeText, { color: colors.primary }]}>{row.count}</Text>
          </View>
        </View>
      );
    }

    const item = row.data;
    const liveProgress  = activeProgress.get(item.id);
    const displayProgress = liveProgress?.progress ?? item.progress;
    const displayBytes  = liveProgress?.downloadedBytes ?? item.downloadedBytes;
    const displayTotal  = liveProgress?.totalBytes ?? item.totalBytes ?? 0;
    const displaySpeed  = liveProgress?.speedBytesPerSec;
    const isQueued      = item.status === "queued";
    const isDownloading = item.status === "downloading";
    const isComplete    = item.status === "completed";
    const isFailed      = item.status === "failed";

    return (
      <TouchableOpacity
        style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => isComplete && handlePlay(item)}
        activeOpacity={isComplete ? 0.72 : 1}
        disabled={!isComplete}
      >
        <View style={styles.thumb}>
          {item.posterUrlId ? (
            <Image source={{ uri: item.posterUrlId }} style={styles.thumbImage} resizeMode="cover" />
          ) : (
            <View style={[styles.thumbPlaceholder, { backgroundColor: colors.secondary }]}>
              <Feather name="film" size={18} color={colors.mutedForeground} />
            </View>
          )}
          {isComplete && (
            <View style={[styles.completeBadge, { backgroundColor: colors.primary }]}>
              <Feather name="check" size={10} color={colors.primaryForeground} />
            </View>
          )}
        </View>

        <View style={styles.info}>
          <Text style={[styles.itemTitle, { color: colors.foreground }]} numberOfLines={2}>
            {item.label || item.title}
          </Text>

          {isQueued && (
            <View style={styles.downloadMeta}>
              <Feather name="clock" size={11} color={colors.mutedForeground} />
              <Text style={[styles.offlineLabel, { color: colors.mutedForeground }]}>
                Queued
              </Text>
            </View>
          )}

          {isDownloading && (
            <View style={{ gap: 4 }}>
              <ProgressBar progress={displayProgress} color={colors.primary} />
              <View style={styles.downloadMeta}>
                <Text style={[styles.pctText, { color: colors.primary }]}>
                  {displayProgress < 0 ? "Downloading…" : `${Math.round(displayProgress * 100)}%`}
                </Text>
                <Text style={[styles.fileSizeText, { color: colors.mutedForeground }]}>
                  {displayTotal > 0
                    ? `${formatBytes(displayBytes)} / ${formatBytes(displayTotal)}`
                    : formatBytes(displayBytes)}
                </Text>
                {displaySpeed && displaySpeed > 0 ? (
                  <Text style={[styles.speedText, { color: colors.primary, marginLeft: "auto" }]}>
                    {formatSpeed(displaySpeed)}
                  </Text>
                ) : null}
              </View>
            </View>
          )}

          {isComplete && (
            <View style={styles.downloadMeta}>
              <Feather name="wifi-off" size={11} color={colors.ratingGreen ?? "#4ade80"} />
              <Text style={[styles.offlineLabel, { color: colors.ratingGreen ?? "#4ade80" }]}>
                Available offline
              </Text>
              {(item.totalBytes ?? 0) > 0 && (
                <>
                  <Text style={[styles.offlineLabel, { color: colors.mutedForeground }]}>·</Text>
                  <FileSizeLabel bytes={item.totalBytes ?? 0} />
                </>
              )}
            </View>
          )}

          {isFailed && (
            <Text style={[styles.failedText, { color: colors.destructive }]}>
              Download failed
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          {isComplete && (
            <>
              <TouchableOpacity
                style={[styles.playBtn, { backgroundColor: colors.primary }]}
                onPress={() => handlePlay(item)}
                activeOpacity={0.85}
              >
                <Feather name="play" size={14} color={colors.primaryForeground} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconBtn, { borderColor: colors.border }]}
                onPress={() => handleMoreOptions(item)}
                activeOpacity={0.8}
              >
                <Feather name="more-vertical" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </>
          )}
          {(isDownloading || isQueued) && (
            <TouchableOpacity
              style={[styles.iconBtn, { borderColor: colors.border }]}
              onPress={() => handleCancel(item)}
              activeOpacity={0.8}
            >
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
          {isFailed && (
            <TouchableOpacity
              style={[styles.iconBtn, { borderColor: colors.primary + "60", backgroundColor: colors.primary + "12" }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                retryDownload(item.id);
              }}
              activeOpacity={0.8}
            >
              <Feather name="refresh-cw" size={15} color={colors.primary} />
            </TouchableOpacity>
          )}
          {(isComplete || isFailed) && (
            <TouchableOpacity
              style={[styles.iconBtn, { borderColor: colors.border }]}
              onPress={() => handleDelete(item)}
              activeOpacity={0.8}
            >
              <Feather name="trash-2" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Downloads</Text>
          {downloads.length > 0 && (
            <View style={styles.sortRow}>
              {(["date", "name", "size"] as SortKey[]).map((k) => (
                <TouchableOpacity
                  key={k}
                  onPress={() => setSortKey(k)}
                  style={[
                    styles.sortChip,
                    { backgroundColor: sortKey === k ? colors.primary + "22" : "transparent",
                      borderColor: sortKey === k ? colors.primary : colors.border },
                  ]}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.sortChipText, { color: sortKey === k ? colors.primary : colors.mutedForeground }]}>
                    {k === "date" ? "Date" : k === "name" ? "Name" : "Size"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        {downloads.length > 0 && (
          <View style={styles.countRow}>
            <Text style={[styles.count, { color: colors.mutedForeground }]}>
              {downloads.filter((d) => d.status === "completed").length} of {downloads.length} saved
            </Text>
            {queueLength > 0 && (
              <View style={[styles.queueBadge, { backgroundColor: colors.primary + "22" }]}>
                <Feather name="clock" size={10} color={colors.primary} />
                <Text style={[styles.queueBadgeText, { color: colors.primary }]}>
                  {queueLength} queued
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {downloads.length === 0 ? (
        <AnimatedEmptyState />
      ) : (
        <FlatList
          data={groupedRows}
          keyExtractor={(row) => row.key}
          renderItem={renderRow}
          ListHeaderComponent={<StorageBar downloads={downloads} />}
          contentContainerStyle={[styles.list, { paddingBottom: 100 + bottomInset }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={({ leadingItem }) =>
            (leadingItem as FlatRow).type === "header" ? null : <View style={{ height: 8 }} />
          }
        />
      )}
    </View>
  );
}

const storageStyles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  left: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  value: { fontSize: 14, fontFamily: "Inter_700Bold" },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
  sub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  subRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 32,
    marginTop: -80,
  },
  iconWrap: { alignItems: "center", justifyContent: "center", position: "relative" },
  ring: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
  },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  sortRow: { flexDirection: "row", gap: 6 },
  sortChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1,
  },
  sortChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  count: { fontSize: 13, fontFamily: "Inter_400Regular" },
  countRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 },
  queueBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  queueBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 12,
  },
  thumb: { width: 60, height: 90, borderRadius: 6, overflow: "hidden", flexShrink: 0, position: "relative" },
  thumbImage: { width: "100%", height: "100%" },
  thumbPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  completeBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, gap: 8 },
  itemTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  progressTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 2 },
  downloadMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  pctText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  fileSizeText: { fontSize: 11, color: "#a3a3a3", fontFamily: "Inter_400Regular" },
  offlineLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  speedText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  failedText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  groupHeader: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 2, paddingTop: 16, paddingBottom: 6 },
  groupTitle: { fontSize: 13, fontFamily: "Inter_700Bold", flex: 1 },
  groupBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  groupBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  actions: { flexDirection: "column", gap: 8, alignItems: "center" },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 2,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
