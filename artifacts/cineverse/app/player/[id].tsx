import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import * as Brightness from "expo-brightness";
import * as ScreenOrientation from "expo-screen-orientation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { useDownloads } from "@/context/DownloadContext";
import { useWatchHistory } from "@/context/WatchHistoryContext";
import { fetchStream, fetchStreamData, makeRelayUrl, StreamQuality, SubtitleTrack } from "@/lib/movieApi";
import { parseSubtitle, getCurrentSubtitle, SubtitleEntry } from "@/lib/subtitleParser";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const HIDE_DELAY = 4000;
const SAVE_INTERVAL_MS = 15000;
const AUTOPLAY_COUNTDOWN = 5;
const DOUBLE_TAP_MS = 280;
const SEEK_SECS = 10;
const QUALITY_PREF_KEY = "@cineverse_quality_pref";

function formatTime(ms: number): string {
  const totalSecs = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function BouncingDots() {
  const d1 = useRef(new Animated.Value(0)).current;
  const d2 = useRef(new Animated.Value(0)).current;
  const d3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeAnim = (d: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(d, { toValue: -9, duration: 280, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.delay(Math.max(0, 560 - delay)),
        ])
      );
    const a1 = makeAnim(d1, 0);
    const a2 = makeAnim(d2, 140);
    const a3 = makeAnim(d3, 280);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  const dot = (d: Animated.Value) => (
    <Animated.View style={{
      width: 9, height: 9, borderRadius: 5,
      backgroundColor: "rgba(255,255,255,0.85)",
      transform: [{ translateY: d }],
    }} />
  );

  return (
    <View style={{ flexDirection: "row", gap: 8, alignItems: "center", height: 28 }}>
      {dot(d1)}{dot(d2)}{dot(d3)}
    </View>
  );
}

type SettingsPage = "main" | "speed" | "quality" | "captions";

type SeekSide = "left" | "right";
interface SeekFlash {
  side: SeekSide;
  count: number;
  opacity: Animated.Value;
  ripple: Animated.Value;
}

export default function PlayerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const {
    id,
    title,
    uri: uriParam,
    detailPath: detailPathParam,
    season: seasonParam,
    episode: episodeParam,
    episodeTotal: episodeTotalParam,
    subjectType: subjectTypeParam,
    posterUrlId: posterParam,
    backdropUrlId: backdropParam,
    subtitleUrl: subtitleUrlParam,
    subtitleLabel: subtitleLabelParam,
    subtitleLang: subtitleLangParam,
    subtitleDelay: subtitleDelayParam,
  } = useLocalSearchParams<{
    id: string;
    title?: string;
    uri?: string;
    detailPath?: string;
    season?: string;
    episode?: string;
    episodeTotal?: string;
    subjectType?: string;
    posterUrlId?: string;
    backdropUrlId?: string;
    subtitleUrl?: string;
    subtitleLabel?: string;
    subtitleLang?: string;
    subtitleDelay?: string;
  }>();

  const currentSeason = seasonParam ? parseInt(seasonParam) : undefined;
  const currentEpisode = episodeParam ? parseInt(episodeParam) : undefined;
  const episodeTotal = episodeTotalParam ? parseInt(episodeTotalParam) : undefined;
  const subjectType = subjectTypeParam ? parseInt(subjectTypeParam) : 1;
  const isTVShow = subjectType === 2;
  const hasNextEp =
    isTVShow &&
    currentEpisode !== undefined &&
    episodeTotal !== undefined &&
    currentEpisode < episodeTotal;
  const hasPrevEp =
    isTVShow &&
    currentEpisode !== undefined &&
    currentEpisode > 1;

  const { getDownload } = useDownloads();
  const { updatePosition, getEntry } = useWatchHistory();

  useKeepAwake();

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  const download = !uriParam ? getDownload(id ?? "") : null;
  const initialUri = (uriParam || (download?.status === "completed" ? download.fileUri : null)) || null;
  const displayTitle = title || download?.label || download?.title || "";

  const existingEntry = getEntry(id ?? "");
  const episodeMatches =
    !isTVShow ||
    (existingEntry?.season === currentSeason && existingEntry?.episode === currentEpisode);
  const resumePositionMs = existingEntry && uriParam && episodeMatches ? existingEntry.positionMs : 0;

  const [currentUri, setCurrentUri] = useState<string | null>(initialUri);
  const [playStatus, setPlayStatus] = useState<AVPlaybackStatus | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [locked, setLocked] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsPage, setSettingsPage] = useState<SettingsPage>("main");
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubRatio, setScrubRatio] = useState(0);
  const [autoplayCounting, setAutoplayCounting] = useState(false);
  const [autoplaySeconds, setAutoplaySeconds] = useState(AUTOPLAY_COUNTDOWN);
  const [qualities, setQualities] = useState<StreamQuality[]>([]);
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState<SubtitleTrack | null>(null);
  const [ccMode, setCcMode] = useState<"on" | "off" | "on-filled">("on");
  const ccEnabled = ccMode !== "off";
  const [subtitleEntries, setSubtitleEntries] = useState<SubtitleEntry[]>([]);
  const [nextEpLoading, setNextEpLoading] = useState(false);
  const [seekFlash, setSeekFlash] = useState<SeekFlash | null>(null);
  const [resizeMode, setResizeMode] = useState<ResizeMode>(ResizeMode.CONTAIN);
  const [gestureHud, setGestureHud] = useState<{ type: "vol" | "bright"; value: number } | null>(null);
  const [volume, setVolume] = useState(1);
  const [brightness, setBrightness] = useState(0.7);

  const videoRef = useRef<Video>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const gestureHudTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackWidth = useRef(0);
  const settingsOpen = useRef(false);
  settingsOpen.current = showSettings;
  const positionMsRef = useRef(0);
  const durationMsRef = useRef(0);
  const hasResumed = useRef(false);
  const autoplayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownFade = useRef(new Animated.Value(0)).current;
  const hasManualQuality = useRef(false);
  const leftLastTap = useRef(0);
  const rightLastTap = useRef(0);
  const leftTapCount = useRef(0);
  const rightTapCount = useRef(0);
  const leftDragging = useRef(false);
  const rightDragging = useRef(false);
  const brightnessRef = useRef(0.7);
  const volumeRef = useRef(1);
  const handleLeftTapRef = useRef<() => void>(() => {});
  const handleRightTapRef = useRef<() => void>(() => {});
  const showGestureHudRef = useRef<(type: "vol" | "bright", value: number) => void>(() => {});

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (!settingsOpen.current) setControlsVisible(false);
    }, HIDE_DELAY);
  }, []);

  useEffect(() => {
    scheduleHide();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const isLoaded = playStatus?.isLoaded ?? false;
  const isPlaying = isLoaded && !!(playStatus as any)?.isPlaying;
  const isBuffering = isLoaded && !!(playStatus as any)?.isBuffering;
  const showSpinner = !isLoaded || (isBuffering && !isPlaying);
  const positionMs: number = isLoaded ? ((playStatus as any)?.positionMillis ?? 0) : 0;
  const durationMs: number = isLoaded ? ((playStatus as any)?.durationMillis ?? 0) : 0;

  positionMsRef.current = positionMs;
  durationMsRef.current = durationMs;

  const progress = scrubbing ? scrubRatio : durationMs > 0 ? positionMs / durationMs : 0;

  const isFinished = durationMs > 0 && positionMs >= durationMs - 500;
  const currentSubtitleText = ccEnabled && subtitleEntries.length > 0
    ? getCurrentSubtitle(subtitleEntries, positionMs)
    : null;

  const savePosition = useCallback(() => {
    const pos = positionMsRef.current;
    const dur = durationMsRef.current;

    if (!id || dur <= 0) return;
    updatePosition(id, pos, dur, {
      title: displayTitle,
      posterUrlId: posterParam ?? "",
      backdropUrlId: backdropParam,
      subjectType,
      detailPath: detailPathParam,
      season: currentSeason,
      episode: currentEpisode,
    });
  }, [id, displayTitle, posterParam, backdropParam, subjectType, detailPathParam, currentSeason, currentEpisode, updatePosition]);

  useEffect(() => {
    if (!isLoaded) return;
    saveTimer.current = setInterval(savePosition, SAVE_INTERVAL_MS);
    return () => {
      if (saveTimer.current) clearInterval(saveTimer.current);
    };
  }, [isLoaded, savePosition]);

  useEffect(() => {
    return () => { savePosition(); };
  }, []);

  useEffect(() => {
    if (isLoaded && !hasResumed.current && resumePositionMs > 5000) {
      hasResumed.current = true;
      videoRef.current?.setPositionAsync(resumePositionMs);
    }
  }, [isLoaded, resumePositionMs]);

  useEffect(() => {
    if (!subtitleUrlParam) return;
    const track: SubtitleTrack = {
      url: subtitleUrlParam,
      label: subtitleLabelParam || "English",
      language: subtitleLangParam || "en",
      delay: subtitleDelayParam ? parseFloat(subtitleDelayParam) : 0,
    };
    setSubtitles([track]);
    setSelectedSubtitle(track);
  }, []);

  useEffect(() => {
    if (!id || !detailPathParam) return;
    fetchStreamData(id, detailPathParam, currentSeason, currentEpisode)
      .then(async ({ qualities: qs, subtitles: subs }) => {
        setQualities(qs);
        if (subs.length > 0) {
          setSubtitles(subs);
          setSelectedSubtitle(prev => {
            if (prev) {
              const matched = subs.find((s) => s.url === prev.url || s.language === prev.language);
              return matched ?? prev;
            }
            const eng = subs.find((s) =>
              s.language.startsWith("en") || s.label.toLowerCase().includes("english")
            );
            return eng ?? subs[0];
          });
        }
        if (qs.length > 0 && !hasManualQuality.current) {
          const savedRes = await AsyncStorage.getItem(QUALITY_PREF_KEY).catch(() => null);
          const target = savedRes
            ? (qs.find((q) => q.resolution === savedRes) ?? qs[0])
            : qs[0];
          const relayed = makeRelayUrl(target.url);
          if (target.url !== currentUri && relayed !== currentUri) {
            const pos = positionMsRef.current;
            setCurrentUri(target.url);
            try {
              await videoRef.current?.unloadAsync();
              await videoRef.current?.loadAsync(
                {
                  uri: target.url,
                  ...(Platform.OS === "android" && !target.url.startsWith("file") && {
                    overrideFileExtensionAndroid: "mp4",
                  }),
                },
                { shouldPlay: true, positionMillis: pos }
              );
            } catch {}
          }
        }
      })
      .catch(() => {});
  }, [id, detailPathParam, currentSeason, currentEpisode]);

  useEffect(() => {
    if (isFinished && hasNextEp && !autoplayCounting) {
      setAutoplayCounting(true);
      setAutoplaySeconds(AUTOPLAY_COUNTDOWN);
      Animated.timing(countdownFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      let secs = AUTOPLAY_COUNTDOWN;
      autoplayTimerRef.current = setInterval(() => {
        secs -= 1;
        setAutoplaySeconds(secs);
        if (secs <= 0) {
          if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
          playNextEpisode();
        }
      }, 1000);
    }
  }, [isFinished, hasNextEp, autoplayCounting]);

  const cancelAutoplay = () => {
    if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    setAutoplayCounting(false);
    Animated.timing(countdownFade, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  };

  useEffect(() => {
    return () => {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!selectedSubtitle || !ccEnabled) {
      setSubtitleEntries([]);
      return;
    }
    const delayMs = (selectedSubtitle.delay ?? 0) * 1000;
    const url = selectedSubtitle.url;
    const isLocal = url.startsWith("file://") || url.startsWith("/");

    const loadSubtitle = async () => {
      let text: string;
      if (isLocal) {
        text = await FileSystem.readAsStringAsync(url);
      } else {
        let res = await fetch(url);
        if (!res.ok) {
          const relayed = makeRelayUrl(url);
          if (relayed !== url) res = await fetch(relayed);
        }
        text = await res.text();
      }
      const entries = parseSubtitle(text);
      if (entries.length === 0) throw new Error("empty subtitle");
      if (delayMs === 0) {
        setSubtitleEntries(entries);
      } else {
        setSubtitleEntries(entries.map((e) => ({
          ...e,
          startMs: e.startMs + delayMs,
          endMs: e.endMs + delayMs,
        })));
      }
    };

    loadSubtitle().catch(() => {
      setTimeout(() => loadSubtitle().catch(() => setSubtitleEntries([])), 2000);
    });
  }, [selectedSubtitle, ccEnabled]);

  useEffect(() => {
    if (!download?.subtitleUri) return;
    const offlineTrack: SubtitleTrack = {
      label: "English",
      language: "en",
      url: download.subtitleUri,
      delay: 0,
    };
    setSubtitles([offlineTrack]);
    setSelectedSubtitle(offlineTrack);
    setCcMode((prev) => prev === "off" ? "on" : prev);
  }, [download?.subtitleUri]);

  const buildSubtitleParams = (subs: SubtitleTrack[]) => {
    const eng = subs.find((s) =>
      s.language.startsWith("en") || s.label.toLowerCase().includes("english")
    ) ?? subs[0];
    return {
      subtitleUrl: eng?.url ?? "",
      subtitleLabel: eng?.label ?? "",
      subtitleLang: eng?.language ?? "",
      subtitleDelay: eng?.delay !== undefined ? String(eng.delay) : "0",
    };
  };

  const playNextEpisode = useCallback(async () => {
    if (!id || currentEpisode === undefined || !hasNextEp) return;
    cancelAutoplay();
    setNextEpLoading(true);
    try {
      const nextEp = currentEpisode + 1;
      const result = await fetchStream(id, detailPathParam, currentSeason, nextEp, false);
      if (!result) return;
      const relayed = makeRelayUrl(result.url);
      savePosition();
      router.replace({
        pathname: "/player/[id]",
        params: {
          id,
          uri: relayed,
          title: displayTitle.replace(/E\d+/, `E${nextEp}`),
          detailPath: detailPathParam ?? "",
          season: String(currentSeason ?? ""),
          episode: String(nextEp),
          episodeTotal: String(episodeTotal ?? ""),
          subjectType: String(subjectType),
          posterUrlId: posterParam ?? "",
          backdropUrlId: backdropParam ?? "",
          ...buildSubtitleParams(result.subtitles),
        },
      });
    } catch {}
    setNextEpLoading(false);
  }, [id, currentEpisode, currentSeason, episodeTotal, detailPathParam, displayTitle, hasNextEp, subjectType, posterParam, backdropParam]);

  const playPrevEpisode = useCallback(async () => {
    if (!id || currentEpisode === undefined || !hasPrevEp) return;
    setNextEpLoading(true);
    try {
      const prevEp = currentEpisode - 1;
      const result = await fetchStream(id, detailPathParam, currentSeason, prevEp, false);
      if (!result) return;
      const relayed = makeRelayUrl(result.url);
      savePosition();
      router.replace({
        pathname: "/player/[id]",
        params: {
          id,
          uri: relayed,
          title: displayTitle.replace(/E\d+/, `E${prevEp}`),
          detailPath: detailPathParam ?? "",
          season: String(currentSeason ?? ""),
          episode: String(prevEp),
          episodeTotal: String(episodeTotal ?? ""),
          subjectType: String(subjectType),
          posterUrlId: posterParam ?? "",
          backdropUrlId: backdropParam ?? "",
          ...buildSubtitleParams(result.subtitles),
        },
      });
    } catch {}
    setNextEpLoading(false);
  }, [id, currentEpisode, currentSeason, detailPathParam, displayTitle, hasPrevEp, subjectType, posterParam, backdropParam]);

  const showControls = useCallback(() => {
    if (locked) return;
    setControlsVisible(true);
    scheduleHide();
  }, [locked, scheduleHide]);

  const togglePlay = useCallback(async () => {
    if (!playStatus?.isLoaded) return;
    if (isPlaying) await videoRef.current?.pauseAsync();
    else await videoRef.current?.playAsync();
    showControls();
  }, [playStatus, isPlaying, showControls]);

  const seek = useCallback(async (deltaSecs: number) => {
    if (!playStatus?.isLoaded) return;
    const next = Math.max(0, Math.min(durationMs, positionMs + deltaSecs * 1000));
    await videoRef.current?.setPositionAsync(next);
  }, [playStatus, positionMs, durationMs]);

  const triggerSeekFlash = useCallback((side: SeekSide, count: number) => {
    const opacity = new Animated.Value(0);
    const ripple = new Animated.Value(0);
    setSeekFlash({ side, count, opacity, ripple });
    Animated.parallel([
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.delay(400),
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]),
      Animated.timing(ripple, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start(() => setSeekFlash(null));
  }, []);

  const handleLeftTap = useCallback(() => {
    const now = Date.now();
    if (now - leftLastTap.current < DOUBLE_TAP_MS) {
      leftTapCount.current += 1;
      const totalSecs = leftTapCount.current * SEEK_SECS;
      seek(-SEEK_SECS);
      triggerSeekFlash("left", leftTapCount.current);
      scheduleHide();
    } else {
      leftTapCount.current = 1;
      showControls();
    }
    leftLastTap.current = now;
  }, [seek, showControls, scheduleHide, triggerSeekFlash]);

  const handleRightTap = useCallback(() => {
    const now = Date.now();
    if (now - rightLastTap.current < DOUBLE_TAP_MS) {
      rightTapCount.current += 1;
      seek(SEEK_SECS);
      triggerSeekFlash("right", rightTapCount.current);
      scheduleHide();
    } else {
      rightTapCount.current = 1;
      showControls();
    }
    rightLastTap.current = now;
  }, [seek, showControls, scheduleHide, triggerSeekFlash]);

  // Keep handler refs fresh so side-zone PanResponders (created once) call the latest version
  handleLeftTapRef.current = handleLeftTap;
  handleRightTapRef.current = handleRightTap;

  const showGestureHud = useCallback((type: "vol" | "bright", value: number) => {
    setGestureHud({ type, value });
    if (gestureHudTimer.current) clearTimeout(gestureHudTimer.current);
    gestureHudTimer.current = setTimeout(() => setGestureHud(null), 1200);
  }, []);
  showGestureHudRef.current = showGestureHud;

  const leftZonePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { leftDragging.current = false; },
      onPanResponderMove: (_, gs) => {
        if (Math.abs(gs.dy) > 14) {
          leftDragging.current = true;
          const delta = (-gs.dy / 500);
          const newVal = Math.max(0.05, Math.min(1, brightnessRef.current + delta));
          brightnessRef.current = newVal;
          setBrightness(newVal);
          Brightness.setBrightnessAsync(newVal).catch(() => {});
          showGestureHudRef.current("bright", newVal);
        }
      },
      onPanResponderRelease: () => {
        if (!leftDragging.current) handleLeftTapRef.current();
        leftDragging.current = false;
      },
    })
  ).current;

  const rightZonePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { rightDragging.current = false; },
      onPanResponderMove: (_, gs) => {
        if (Math.abs(gs.dy) > 14) {
          rightDragging.current = true;
          const delta = (-gs.dy / 500);
          const newVal = Math.max(0, Math.min(1, volumeRef.current + delta));
          volumeRef.current = newVal;
          setVolume(newVal);
          videoRef.current?.setVolumeAsync(newVal).catch(() => {});
          showGestureHudRef.current("vol", newVal);
        }
      },
      onPanResponderRelease: () => {
        if (!rightDragging.current) handleRightTapRef.current();
        rightDragging.current = false;
      },
    })
  ).current;

  const applySpeed = useCallback(async (s: number) => {
    setSpeed(s);
    setShowSpeedMenu(false);
    await videoRef.current?.setRateAsync(s, true);
    scheduleHide();
  }, [scheduleHide]);

  const handleQualitySelect = useCallback(async (q: StreamQuality) => {
    setShowQualityPanel(false);
    hasManualQuality.current = true;
    AsyncStorage.setItem(QUALITY_PREF_KEY, q.resolution).catch(() => {});
    if (q.url === currentUri) return;
    const pos = positionMsRef.current;
    setCurrentUri(q.url);
    await videoRef.current?.unloadAsync();
    await videoRef.current?.loadAsync(
      {
        uri: q.url,
        ...(Platform.OS === "android" && !q.url.startsWith("file") && {
          overrideFileExtensionAndroid: "mp4",
        }),
      },
      { shouldPlay: true, positionMillis: pos }
    );
    scheduleHide();
  }, [currentUri, scheduleHide]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / (trackWidth.current || 1)));
        setScrubbing(true);
        setScrubRatio(ratio);
        if (hideTimer.current) clearTimeout(hideTimer.current);
      },
      onPanResponderMove: (e) => {
        const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / (trackWidth.current || 1)));
        setScrubRatio(ratio);
      },
      onPanResponderRelease: async (e) => {
        const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / (trackWidth.current || 1)));
        setScrubbing(false);
        if (durationMsRef.current > 0) {
          await videoRef.current?.setPositionAsync(ratio * durationMsRef.current);
        }
        scheduleHide();
      },
    })
  ).current;

  if (!currentUri) {
    return (
      <View style={styles.error}>
        <Feather name="alert-circle" size={44} color="#fff" />
        <Text style={styles.errorText}>Video not available</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 8 }}>
          <Text style={{ color: "#13CFCF", fontFamily: "Inter_600SemiBold", fontSize: 15 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const rippleScale = seekFlash?.ripple.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2.2] });
  const rippleOpacity = seekFlash?.ripple.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.35, 0.15, 0] });

  return (
    <View style={styles.container}>
      <StatusBar hidden={Platform.OS !== "web"} />

      <Video
        ref={videoRef}
        source={{
          uri: currentUri,
          ...(Platform.OS === "android" && !currentUri?.startsWith("file") && {
            overrideFileExtensionAndroid: "mp4",
          }),
        }}
        style={{ width, height }}
        resizeMode={resizeMode}
        onPlaybackStatusUpdate={setPlayStatus}
        shouldPlay
        rate={speed}
        useNativeControls={false}
      />

      {showSpinner && (
        <View style={styles.bufferOverlay}>
          <BouncingDots />
        </View>
      )}

      {!locked && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <View style={styles.sideZone} {...leftZonePan.panHandlers} />
          <View style={[styles.sideZone, { right: 0, left: undefined }]} {...rightZonePan.panHandlers} />
        </View>
      )}

      {seekFlash && (
        <View
          style={[
            styles.seekFlashZone,
            seekFlash.side === "left" ? styles.seekFlashLeft : styles.seekFlashRight,
          ]}
          pointerEvents="none"
        >
          <Animated.View
            style={[
              styles.seekRipple,
              { opacity: rippleOpacity, transform: [{ scale: rippleScale ?? 1 }] },
            ]}
          />
          <Animated.View style={[styles.seekFlashContent, { opacity: seekFlash.opacity }]}>
            {seekFlash.side === "left" ? (
              <>
                <Feather name="rewind" size={28} color="#fff" />
                <Text style={styles.seekFlashText}>{seekFlash.count * SEEK_SECS}s</Text>
              </>
            ) : (
              <>
                <Text style={styles.seekFlashText}>{seekFlash.count * SEEK_SECS}s</Text>
                <Feather name="fast-forward" size={28} color="#fff" />
              </>
            )}
          </Animated.View>
        </View>
      )}

      {autoplayCounting && (
        <Animated.View style={[styles.autoplayOverlay, { opacity: countdownFade }]}>
          <View style={styles.autoplayCard}>
            <Text style={styles.autoplayLabel}>Up Next</Text>
            <Text style={styles.autoplayEp}>Episode {(currentEpisode ?? 0) + 1}</Text>
            <Text style={styles.autoplayCountText}>Playing in {autoplaySeconds}s</Text>
            <View style={styles.autoplayBtns}>
              <TouchableOpacity style={styles.autoplayPlay} onPress={playNextEpisode} activeOpacity={0.85}>
                {nextEpLoading ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <>
                    <Feather name="play" size={15} color="#000" />
                    <Text style={styles.autoplayPlayText}>Play Now</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.autoplayCancel} onPress={cancelAutoplay} activeOpacity={0.8}>
                <Text style={styles.autoplyCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}

      {locked && (
        <View style={styles.lockScreen} pointerEvents="box-none">
          <TouchableOpacity style={styles.unlockBtn} onPress={() => setLocked(false)}>
            <Feather name="unlock" size={16} color="#fff" />
            <Text style={styles.unlockText}>Unlock</Text>
          </TouchableOpacity>
        </View>
      )}

      {currentSubtitleText && (
        <View
          style={styles.subtitleOverlay}
          pointerEvents="none"
        >
          <Text style={[styles.subtitleText, ccMode === "on-filled" && styles.subtitleTextFilled]}>{currentSubtitleText}</Text>
        </View>
      )}

      {showSettings && controlsVisible && !locked && (
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={() => { setShowSettings(false); scheduleHide(); }}
        >
          <View
            style={fp.card}
            onStartShouldSetResponder={() => true}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            {settingsPage === "main" ? (
              <>
                {subtitles.length > 0 && (
                  <TouchableOpacity
                    style={fp.mainRow}
                    onPress={() => setSettingsPage("captions")}
                    activeOpacity={0.75}
                  >
                    <Text style={fp.mainLabel}>Subtitles</Text>
                    <View style={fp.mainRight}>
                      <Text style={fp.mainValue} numberOfLines={1}>
                        {ccEnabled && selectedSubtitle ? selectedSubtitle.label : "Off"}
                      </Text>
                      <Feather name="chevron-right" size={14} color="rgba(255,255,255,0.4)" />
                    </View>
                  </TouchableOpacity>
                )}
                {qualities.length > 1 && (
                  <TouchableOpacity
                    style={fp.mainRow}
                    onPress={() => setSettingsPage("quality")}
                    activeOpacity={0.75}
                  >
                    <Text style={fp.mainLabel}>Quality</Text>
                    <View style={fp.mainRight}>
                      <Text style={fp.mainValue}>
                        {qualities.find((q) => q.url === currentUri || makeRelayUrl(q.url) === currentUri)?.resolution ?? qualities[0]?.resolution ?? "?"}p
                      </Text>
                      <Feather name="chevron-right" size={14} color="rgba(255,255,255,0.4)" />
                    </View>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[fp.mainRow, { borderBottomWidth: 0 }]}
                  onPress={() => setSettingsPage("speed")}
                  activeOpacity={0.75}
                >
                  <Text style={fp.mainLabel}>Speed</Text>
                  <View style={fp.mainRight}>
                    <Text style={fp.mainValue}>{speed === 1 ? "Normal" : `${speed}×`}</Text>
                    <Feather name="chevron-right" size={14} color="rgba(255,255,255,0.4)" />
                  </View>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={fp.backRow}
                  onPress={() => setSettingsPage("main")}
                  activeOpacity={0.75}
                >
                  <Feather name="chevron-left" size={15} color="#13CFCF" />
                  <Text style={fp.backLabel}>
                    {settingsPage === "captions" ? "Subtitles" : settingsPage === "quality" ? "Quality" : "Speed"}
                  </Text>
                </TouchableOpacity>

                {settingsPage === "captions" && (
                  <ScrollView style={fp.subScroll} showsVerticalScrollIndicator={false} bounces={false}>
                    <TouchableOpacity
                      style={fp.subRow}
                      onPress={() => { setCcMode("off"); setShowSettings(false); scheduleHide(); }}
                      activeOpacity={0.75}
                    >
                      <View style={[fp.radio, !ccEnabled && fp.radioActive]}>
                        {!ccEnabled && <View style={fp.radioDot} />}
                      </View>
                      <Text style={[fp.subLabel, !ccEnabled && fp.subLabelActive]}>Off</Text>
                    </TouchableOpacity>
                    {subtitles.map((s, i) => {
                      const isActive = ccEnabled && selectedSubtitle?.url === s.url;
                      const code = s.language.slice(0, 2).toUpperCase();
                      return (
                        <TouchableOpacity
                          key={s.url}
                          style={[fp.subRow, i === subtitles.length - 1 && { borderBottomWidth: 0 }]}
                          onPress={() => {
                            setSelectedSubtitle(s);
                            setCcMode((prev) => prev === "off" ? "on" : prev);
                            setShowSettings(false);
                            scheduleHide();
                          }}
                          activeOpacity={0.75}
                        >
                          <View style={[fp.radio, isActive && fp.radioActive]}>
                            {isActive && <View style={fp.radioDot} />}
                          </View>
                          <Text style={[fp.subLabel, isActive && fp.subLabelActive]} numberOfLines={1}>{s.label}</Text>
                          <View style={fp.langBadge}>
                            <Text style={fp.langCode}>{code}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {settingsPage === "quality" && qualities.map((q, i) => {
                  const isActive = q.url === currentUri || makeRelayUrl(q.url) === currentUri;
                  const tag = parseInt(q.resolution) >= 1080 ? "FHD" : parseInt(q.resolution) >= 720 ? "HD" : "SD";
                  return (
                    <TouchableOpacity
                      key={q.url}
                      style={[fp.subRow, i === qualities.length - 1 && { borderBottomWidth: 0 }]}
                      onPress={() => { handleQualitySelect(q); setShowSettings(false); }}
                      activeOpacity={0.75}
                    >
                      <View style={[fp.radio, isActive && fp.radioActive]}>
                        {isActive && <View style={fp.radioDot} />}
                      </View>
                      <Text style={[fp.subLabel, isActive && fp.subLabelActive]}>{q.resolution}p</Text>
                      <View style={fp.langBadge}>
                        <Text style={fp.langCode}>{tag}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {settingsPage === "speed" && SPEEDS.map((s, i) => {
                  const isActive = speed === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[fp.subRow, i === SPEEDS.length - 1 && { borderBottomWidth: 0 }]}
                      onPress={() => { applySpeed(s); setShowSettings(false); scheduleHide(); }}
                      activeOpacity={0.75}
                    >
                      <View style={[fp.radio, isActive && fp.radioActive]}>
                        {isActive && <View style={fp.radioDot} />}
                      </View>
                      <Text style={[fp.subLabel, isActive && fp.subLabelActive]}>
                        {s === 1 ? "Normal" : `${s}×`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </View>
        </Pressable>
      )}

      {gestureHud && (
        <View
          style={[
            styles.gestureHud,
            gestureHud.type === "bright" ? styles.gestureHudLeft : styles.gestureHudRight,
          ]}
          pointerEvents="none"
        >
          <Feather
            name={gestureHud.type === "vol" ? (gestureHud.value < 0.01 ? "volume-x" : gestureHud.value < 0.5 ? "volume-1" : "volume-2") : "sun"}
            size={18}
            color="#fff"
          />
          <View style={styles.gestureHudBar}>
            <View style={[styles.gestureHudFill, { width: `${Math.round(gestureHud.value * 100)}%` as any }]} />
          </View>
          <Text style={styles.gestureHudPct}>{Math.round(gestureHud.value * 100)}%</Text>
        </View>
      )}

      {controlsVisible && !locked && !autoplayCounting && (
        <View style={styles.controls} pointerEvents="box-none">
          <LinearGradient
            colors={["rgba(0,0,0,0.9)", "rgba(0,0,0,0.3)", "transparent"]}
            style={styles.topGradient}
            pointerEvents="box-none"
          >
            <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 16) }]}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => { savePosition(); router.back(); }}
                activeOpacity={0.75}
              >
                <Feather name="chevron-left" size={26} color="#fff" />
              </TouchableOpacity>
              <View style={styles.titleBlock}>
                <Text style={styles.titleText} numberOfLines={1}>
                  {displayTitle}
                </Text>
                {isTVShow && currentSeason !== undefined && currentEpisode !== undefined && (
                  <Text style={styles.episodeText}>
                    Season {currentSeason} · Episode {currentEpisode}
                  </Text>
                )}
              </View>
            </View>
          </LinearGradient>

          <TouchableOpacity
            style={styles.playPauseCenter}
            onPress={togglePlay}
            activeOpacity={0.85}
            pointerEvents="auto"
          >
            <View style={styles.playPauseCircle}>
              <Feather
                name={isPlaying ? "pause" : "play"}
                size={38}
                color="#fff"
                style={!isPlaying ? { marginLeft: 4 } : undefined}
              />
            </View>
          </TouchableOpacity>

          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.95)"]}
            style={styles.bottomGradient}
            pointerEvents="box-none"
          >
            <View style={styles.progressRow}>
              <Text style={styles.timeCurrent}>{formatTime(positionMs)}</Text>
              <View
                style={styles.trackContainer}
                onLayout={(e) => { trackWidth.current = e.nativeEvent.layout.width; }}
                {...panResponder.panHandlers}
              >
                {scrubbing && durationMs > 0 && (
                  <View
                    style={[
                      styles.scrubPreview,
                      { left: `${Math.max(2, Math.min(96, progress * 100))}%` as any },
                    ]}
                    pointerEvents="none"
                  >
                    <Text style={styles.scrubPreviewText}>{formatTime(scrubRatio * durationMs)}</Text>
                  </View>
                )}
                <View style={styles.track}>
                  <View style={styles.trackBg} />
                  <View style={[styles.trackFill, { width: `${progress * 100}%` as any }]} />
                  <View style={[styles.trackThumb, { left: `${progress * 100}%` as any }]} />
                </View>
              </View>
              <Text style={styles.timeDuration}>{durationMs > 0 ? formatTime(durationMs) : "--:--"}</Text>
            </View>

            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              {hasPrevEp && (
                <TouchableOpacity
                  style={styles.toolBtn}
                  onPress={playPrevEpisode}
                  activeOpacity={0.75}
                >
                  <Feather name="skip-back" size={14} color="#fff" />
                  <Text style={styles.toolBtnText}>Prev</Text>
                </TouchableOpacity>
              )}

              {hasNextEp && (
                <TouchableOpacity
                  style={styles.toolBtn}
                  onPress={playNextEpisode}
                  activeOpacity={0.75}
                >
                  <Feather name="skip-forward" size={14} color="#fff" />
                  <Text style={styles.toolBtnText}>Next</Text>
                </TouchableOpacity>
              )}

              {subtitles.length > 0 && (
                <TouchableOpacity
                  style={[
                    styles.ccBtn,
                    ccMode === "on" && selectedSubtitle ? styles.ccBtnActive : null,
                    ccMode === "on-filled" && selectedSubtitle ? styles.ccBtnFilled : null,
                  ]}
                  onPress={() => {
                    if (hideTimer.current) clearTimeout(hideTimer.current);
                    setCcMode((prev) =>
                      prev === "on" ? "off" : prev === "off" ? "on-filled" : "on"
                    );
                    scheduleHide();
                  }}
                  activeOpacity={0.75}
                  hitSlop={8}
                >
                  <Text style={[
                    styles.ccBtnText,
                    ccMode === "on" && selectedSubtitle ? styles.ccBtnTextActive : null,
                    ccMode === "on-filled" && selectedSubtitle ? styles.ccBtnTextFilled : null,
                  ]}>CC</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.toolBtnIcon, showSettings ? styles.toolBtnActive : null]}
                onPress={() => {
                  if (showSettings) {
                    setShowSettings(false);
                    scheduleHide();
                  } else {
                    if (hideTimer.current) clearTimeout(hideTimer.current);
                    setSettingsPage("main");
                    setShowSettings(true);
                  }
                }}
                activeOpacity={0.75}
                hitSlop={8}
              >
                <Feather name="settings" size={18} color={showSettings ? "#13CFCF" : "rgba(255,255,255,0.85)"} />
              </TouchableOpacity>

              <View style={{ flex: 1 }} />

              <TouchableOpacity
                style={styles.toolBtnIcon}
                onPress={() => {
                  setResizeMode((prev) => {
                    if (prev === ResizeMode.CONTAIN) return ResizeMode.COVER;
                    if (prev === ResizeMode.COVER) return ResizeMode.STRETCH;
                    return ResizeMode.CONTAIN;
                  });
                  scheduleHide();
                }}
                activeOpacity={0.75}
                hitSlop={8}
              >
                <Feather
                  name={resizeMode === ResizeMode.CONTAIN ? "minimize" : resizeMode === ResizeMode.COVER ? "maximize" : "crop"}
                  size={16}
                  color="rgba(255,255,255,0.7)"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toolBtnIcon}
                onPress={() => { setLocked(true); setControlsVisible(false); }}
                activeOpacity={0.75}
              >
                <Feather name="lock" size={16} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      )}
    </View>
  );
}

const fp = StyleSheet.create({
  card: {
    position: "absolute",
    right: 16,
    bottom: 90,
    width: 230,
    maxHeight: 320,
    backgroundColor: "rgba(13,13,13,0.97)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  subScroll: {
    maxHeight: 220,
  },
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  mainLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  mainRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mainValue: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    maxWidth: 90,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  backLabel: {
    color: "#13CFCF",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioActive: {
    borderColor: "#13CFCF",
  },
  radioDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#13CFCF",
  },
  subLabel: {
    flex: 1,
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  subLabelActive: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
  },
  langBadge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  langCode: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  bufferOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },

  sideZone: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "42%",
    left: 0,
  },

  seekFlashZone: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "42%",
    alignItems: "center",
    justifyContent: "center",
  },
  seekFlashLeft: { left: 0 },
  seekFlashRight: { right: 0 },
  seekRipple: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  seekFlashContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
  },
  seekFlashText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },

  controls: { ...StyleSheet.absoluteFillObject, justifyContent: "space-between" },

  topGradient: { paddingBottom: 40 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 8,
    gap: 4,
  },
  backBtn: {
    width: 40, height: 40, alignItems: "center", justifyContent: "center",
  },
  titleBlock: { flex: 1, paddingHorizontal: 4 },
  titleText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold", letterSpacing: 0.1 },
  episodeText: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },

  playPauseCenter: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -36 }, { translateY: -36 }],
  },
  playPauseCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },

  bottomGradient: { paddingTop: 40, gap: 0 },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    gap: 10,
    marginBottom: 8,
  },
  timeCurrent: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    minWidth: 42,
  },
  timeDuration: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    minWidth: 42,
    textAlign: "right",
  },
  trackContainer: { flex: 1, paddingVertical: 16, position: "relative" },
  scrubPreview: {
    position: "absolute",
    top: -6,
    transform: [{ translateX: -28 }],
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    zIndex: 10,
  },
  scrubPreviewText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  track: { height: 3, position: "relative", justifyContent: "center" },
  trackBg: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
  },
  trackFill: {
    position: "absolute", top: 0, left: 0, height: "100%",
    backgroundColor: "#13CFCF", borderRadius: 2,
  },
  trackThumb: {
    position: "absolute", top: -6.5, marginLeft: -8,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: "#13CFCF",
    shadowColor: "#13CFCF", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6,
    elevation: 4,
  },

  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 4,
    gap: 8,
  },
  toolBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 8, paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  toolBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_500Medium" },
  toolBtnActive: {
    backgroundColor: "rgba(19,207,207,0.12)",
    borderColor: "rgba(19,207,207,0.3)",
  },
  toolBtnIcon: {
    width: 36, height: 36, alignItems: "center", justifyContent: "center",
  },
  ccBtn: {
    width: 34, height: 22, borderRadius: 4, borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)", alignItems: "center", justifyContent: "center",
    marginHorizontal: 2,
  },
  ccBtnActive: {
    borderColor: "#13CFCF", backgroundColor: "rgba(19,207,207,0.12)",
  },
  ccBtnFilled: {
    borderColor: "#13CFCF", backgroundColor: "#13CFCF",
  },
  ccBtnText: {
    fontSize: 11, fontFamily: "Inter_700Bold", color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.5,
  },
  ccBtnTextActive: {
    color: "#13CFCF",
  },
  ccBtnTextFilled: {
    color: "#000",
  },

  gestureHud: {
    position: "absolute",
    top: "35%",
    backgroundColor: "rgba(0,0,0,0.72)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    gap: 8,
    minWidth: 110,
  },
  gestureHudLeft: { left: 24 },
  gestureHudRight: { right: 24 },
  gestureHudBar: {
    width: 80, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  gestureHudFill: {
    height: "100%", backgroundColor: "#13CFCF", borderRadius: 2,
  },
  gestureHudPct: {
    color: "rgba(255,255,255,0.8)", fontSize: 12, fontFamily: "Inter_600SemiBold",
  },

  subtitleOverlay: {
    position: "absolute",
    bottom: 44,
    left: 24,
    right: 24,
    alignItems: "center",
  },
  subtitleText: {
    color: "#fff",
    fontSize: 19,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    lineHeight: 27,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitleTextFilled: {
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    overflow: "hidden",
    textShadowColor: "transparent",
    textShadowRadius: 0,
  },


  autoplayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  autoplayCard: {
    backgroundColor: "#181818",
    borderRadius: 20,
    padding: 28,
    minWidth: 260,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  autoplayLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11, fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2, textTransform: "uppercase",
  },
  autoplayEp: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold", marginTop: 2 },
  autoplayCountText: { color: "#13CFCF", fontSize: 15, fontFamily: "Inter_500Medium", marginVertical: 4 },
  autoplayBtns: { flexDirection: "row", gap: 10, marginTop: 10 },
  autoplayPlay: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: "#13CFCF",
    paddingHorizontal: 22, paddingVertical: 12, borderRadius: 24,
  },
  autoplayPlayText: { color: "#000", fontSize: 14, fontFamily: "Inter_700Bold" },
  autoplayCancel: {
    paddingHorizontal: 22, paddingVertical: 12, borderRadius: 24,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },
  autoplyCancelText: { color: "rgba(255,255,255,0.6)", fontSize: 14, fontFamily: "Inter_500Medium" },

  lockScreen: {
    ...StyleSheet.absoluteFillObject, alignItems: "flex-start", justifyContent: "center", paddingLeft: 20,
  },
  unlockBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 18, paddingVertical: 11, borderRadius: 28,
  },
  unlockText: { color: "#fff", fontSize: 14, fontFamily: "Inter_500Medium" },

  error: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center", gap: 14 },
  errorText: { color: "#fff", fontSize: 16, fontFamily: "Inter_500Medium" },
});
