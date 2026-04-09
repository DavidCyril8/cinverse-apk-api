import { Platform } from "react-native";

const GZ_BASE = "https://gzmovieboxapi.septorch.tech";
const MOVIEBOX_BASE = "https://moviebox.davidcyril.name.ng";
const GZ_APIKEY = "Godszeal";

function getProxyBase(): string {
  const url = process.env.EXPO_PUBLIC_API_URL ?? "";
  return url ? `${url}/api/movies` : "/api/movies";
}

async function apiFetch(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "User-Agent": "CINVERSE-App/1.0", "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`API error ${res.status} for ${url}`);
  return res.json();
}

async function proxiedFetch(path: string, params: Record<string, string> = {}): Promise<unknown> {
  const base = getProxyBase();
  const searchParams = new URLSearchParams(params).toString();
  const url = searchParams ? `${base}/${path}?${searchParams}` : `${base}/${path}`;
  return apiFetch(url);
}

async function directFetch(url: string): Promise<unknown> {
  return apiFetch(url);
}

function shouldUseProxy(): boolean {
  return Platform.OS === "web";
}

export interface MovieItem {
  id: string;
  subjectId?: string;
  title: string;
  posterUrlId: string;
  backdropUrlId?: string;
  releaseDate: string;
  voteAverage: number;
  genres: string[];
  overview: string;
  subjectType?: number;
  detailPath?: string;
}

export interface CastMember {
  name: string;
  character: string;
  profileUrlId?: string;
}

export interface Season {
  se: number;
  maxEp: number;
}

export interface MovieDetails extends MovieItem {
  cast: CastMember[];
  seasons?: Season[];
  trailerUrl?: string | null;
}

export interface BannerMovie extends MovieItem {
  backdropUrlId: string;
}

export interface HomePageData {
  featured: BannerMovie[];
  carousels: { title: string; movies: MovieItem[] }[];
}

export interface StreamQuality {
  resolution: string;
  url: string;
  downloadUrl?: string;
  sizeMb?: number;
}

export interface SubtitleTrack {
  label: string;
  language: string;
  url: string;
  delay?: number;
}

interface GzItem {
  subjectId: string;
  subjectType: number;
  title: string;
  description: string;
  releaseDate: string;
  genre: string;
  cover: { url: string };
  stills: { url: string } | null;
  imdbRatingValue: string;
  detailPath?: string;
  seasons?: Season[];
  trailer?: string | { url: string } | null;
}

function mapGzItem(item: GzItem): MovieItem {
  return {
    id: item.subjectId,
    subjectId: item.subjectId,
    title: item.title,
    overview: item.description || "",
    posterUrlId: item.cover?.url || "",
    backdropUrlId: item.stills?.url || item.cover?.url || "",
    releaseDate: item.releaseDate || "",
    voteAverage: parseFloat(item.imdbRatingValue) || 0,
    genres: item.genre ? item.genre.split(",").map((g: string) => g.trim()) : [],
    subjectType: item.subjectType,
    detailPath: item.detailPath,
  };
}

export async function fetchHomePage(): Promise<HomePageData> {
  let data: unknown;
  if (shouldUseProxy()) {
    data = await proxiedFetch("homepage");
  } else {
    data = await directFetch(`${MOVIEBOX_BASE}/api/homepage`);
  }

  const d = data as { data?: { operatingList?: Array<Record<string, unknown>> } };
  const list = d.data?.operatingList ?? [];

  const bannerSection = list.find(
    (s) => s.type === "BANNER" && (s.banner as Record<string, unknown>)?.items
  );

  const featured: BannerMovie[] = (
    ((bannerSection?.banner as Record<string, unknown>)?.items as Array<Record<string, unknown>>) ?? []
  )
    .filter((item) => item.subject)
    .map((item) => {
      const subject = item.subject as GzItem;
      const imageUrl = (item.image as { url: string })?.url || subject.cover?.url || "";
      return {
        ...mapGzItem(subject),
        backdropUrlId: imageUrl,
      };
    });

  const carousels = list
    .filter(
      (s) => s.type === "SUBJECTS_MOVIE" && Array.isArray(s.subjects) && (s.subjects as unknown[]).length > 0
    )
    .map((s) => ({
      title: String(s.title),
      movies: (s.subjects as GzItem[]).filter(Boolean).map(mapGzItem),
    }));

  return { featured, carousels };
}

export async function fetchTrending(): Promise<MovieItem[]> {
  let data: unknown;
  if (shouldUseProxy()) {
    data = await proxiedFetch("trending");
  } else {
    data = await directFetch(`${MOVIEBOX_BASE}/api/trending`);
  }

  const d = data as { data?: { subjectList?: GzItem[] } };
  const list = d.data?.subjectList ?? [];
  return list.map(mapGzItem);
}

export async function fetchSearchSuggestions(keyword: string): Promise<string[]> {
  if (!keyword || keyword.length < 2) return [];
  try {
    const res = await fetch(
      "https://h5-api.aoneroom.com/wefeed-h5api-bff/subject/search-suggest",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ keyword }),
      }
    );
    if (!res.ok) return [];
    const json = (await res.json()) as {
      code: number;
      data?: { items?: Array<{ type: number; word: string }> };
    };
    if (json.code !== 0 || !json.data?.items) return [];
    return json.data.items
      .map((item) => item.word)
      .filter(Boolean)
      .slice(0, 8);
  } catch {
    return [];
  }
}

export async function searchMovies(query: string, page = 1): Promise<MovieItem[]> {
  let data: unknown;
  if (shouldUseProxy()) {
    data = await proxiedFetch("search", { query, page: String(page) });
  } else {
    const url = `${GZ_BASE}/api/search?apikey=${GZ_APIKEY}&query=${encodeURIComponent(query)}&subjectType=ALL&page=${page}&perPage=24`;
    data = await directFetch(url);
  }

  const d = data as { data?: { items?: GzItem[] } };
  const items = d.data?.items ?? [];
  return items
    .filter((item: GzItem) => item.subjectType === 1 || item.subjectType === 2)
    .map(mapGzItem);
}

export async function fetchMovieDetails(subjectId: string): Promise<MovieDetails> {
  let data: unknown;
  if (shouldUseProxy()) {
    data = await proxiedFetch("details", { id: subjectId });
  } else {
    const url = `${GZ_BASE}/api/item-details?subjectId=${encodeURIComponent(subjectId)}&apikey=${GZ_APIKEY}`;
    data = await directFetch(url);
  }

  const d = (data as { data?: Record<string, unknown> }).data ?? {};
  const subject = d.subject as GzItem & { seasons?: Season[] };
  const stars = (d.stars as Array<{ name: string; character: string; avatar?: { url: string } }>) ?? [];
  const resource = d.resource as { seasons?: Array<{ se: number; maxEp: number }> } | undefined;
  const resourceSeasons: Season[] | undefined = resource?.seasons?.map((s) => ({ se: s.se, maxEp: s.maxEp }));
  const topLevelSeasons = (d.seasons as Season[]) ?? undefined;

  const rawTrailer = subject?.trailer;
  let trailerUrl: string | null = null;
  if (typeof rawTrailer === "string" && rawTrailer.startsWith("http")) {
    trailerUrl = rawTrailer;
  } else if (rawTrailer && typeof rawTrailer === "object" && "url" in rawTrailer) {
    trailerUrl = (rawTrailer as { url: string }).url || null;
  }

  return {
    ...mapGzItem(subject),
    cast: stars.map((s) => ({
      name: s.name,
      character: s.character ?? "",
      profileUrlId: s.avatar?.url,
    })),
    seasons: subject?.seasons ?? topLevelSeasons ?? resourceSeasons,
    trailerUrl,
  };
}

export function makeRelayUrl(rawUrl: string): string {
  const base = getProxyBase();
  if (!base || base.startsWith("/")) return rawUrl;
  return `${base}/relay?url=${encodeURIComponent(rawUrl)}`;
}

async function callGzMedia(
  subjectId: string,
  detailPath?: string,
  season?: number,
  episode?: number
): Promise<unknown> {
  const params = new URLSearchParams({
    apikey: GZ_APIKEY,
    subjectId,
    season: String(season ?? 0),
    episode: String(episode ?? 0),
  });
  if (detailPath) params.set("detailPath", detailPath);
  const res = await fetch(`${GZ_BASE}/api/media?${params.toString()}`, {
    headers: { "User-Agent": "CINVERSE-App/1.0", "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`Media API error ${res.status}`);
  return res.json();
}

function parseMediaResponse(data: unknown): { qualities: StreamQuality[]; subtitles: SubtitleTrack[] } {
  const inner = (data as any)?.data?.downloads?.data ?? {};

  const rawDownloads: Array<{
    url?: string;
    streamUrl?: string;
    downloadUrl?: string;
    resolution?: number | string;
    size?: string;
  }> = inner?.downloads ?? [];

  const rawCaptions: Array<{
    lan?: string;
    lanName?: string;
    url?: string;
    delay?: number;
  }> = inner?.captions ?? [];

  const qualities: StreamQuality[] = rawDownloads
    .filter((d) => d.streamUrl || d.url)
    .map((d) => ({
      resolution: `${d.resolution ?? "?"}p`,
      url: (d.streamUrl ?? d.url)!,
      downloadUrl: d.downloadUrl,
      sizeMb: d.size ? Math.round(parseInt(d.size) / 1024 / 1024) : undefined,
    }))
    .sort((a, b) => parseInt(a.resolution) - parseInt(b.resolution));

  const subtitles: SubtitleTrack[] = rawCaptions
    .filter((c) => !!c.url)
    .map((c) => ({
      label: c.lanName ?? c.lan ?? "Unknown",
      language: (c.lan ?? "").toLowerCase(),
      url: c.url!,
      delay: c.delay ?? 0,
    }));

  return { qualities, subtitles };
}

export async function fetchStreamQualities(
  subjectId: string,
  detailPath?: string,
  season?: number,
  episode?: number
): Promise<StreamQuality[]> {
  const { qualities } = await fetchStreamData(subjectId, detailPath, season, episode);
  return qualities;
}

export async function fetchStreamData(
  subjectId: string,
  detailPath?: string,
  season?: number,
  episode?: number
): Promise<{ qualities: StreamQuality[]; subtitles: SubtitleTrack[] }> {
  let data: unknown;
  if (shouldUseProxy()) {
    const params: Record<string, string> = { id: subjectId };
    if (detailPath) params.detailPath = detailPath;
    if (season !== undefined) params.season = String(season);
    if (episode !== undefined) params.episode = String(episode);
    data = await proxiedFetch("media", params);
  } else {
    data = await callGzMedia(subjectId, detailPath, season, episode);
  }
  return parseMediaResponse(data);
}

export async function fetchStream(
  subjectId: string,
  detailPath: string | undefined,
  season?: number,
  episode?: number,
  preferHighRes = false
): Promise<{ url: string; subtitles: SubtitleTrack[] } | null> {
  const { qualities, subtitles } = await fetchStreamData(subjectId, detailPath, season, episode);
  if (qualities.length === 0) return null;
  if (preferHighRes) {
    const best = qualities[qualities.length - 1];
    return { url: best.downloadUrl ?? best.url, subtitles };
  }
  return { url: qualities[0].url, subtitles };
}
