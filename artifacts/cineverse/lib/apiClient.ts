const BASE_PATH = "/api";

let _token: string | null = null;

export function setAuthToken(token: string | null) {
  _token = token;
}

export function getAuthToken(): string | null {
  return _token;
}

function getBase(): string {
  const url = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");
  return url ? `${url}${BASE_PATH}` : BASE_PATH;
}

interface ReqOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

export async function apiRequest<T>(path: string, opts: ReqOptions = {}): Promise<T> {
  const { method = "GET", body } = opts;
  const tok = opts.token !== undefined ? opts.token : _token;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (tok) headers["Authorization"] = `Bearer ${tok}`;

  const res = await fetch(`${getBase()}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw new Error(
      (data as Record<string, string>)?.error ?? `Request failed with status ${res.status}`,
    );
  }
  return data as T;
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export async function updateProfile(displayName: string): Promise<{ id: string; email: string; displayName: string; avatarUrl: string; createdAt: string }> {
  return apiRequest("/user/profile", { method: "PATCH", body: { displayName } });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiRequest("/user/password", { method: "PATCH", body: { currentPassword, newPassword } });
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  movieId: string;
  userId: string;
  userName: string;
  rating: number;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchReviews(movieId: string): Promise<Review[]> {
  return apiRequest<Review[]>(`/reviews/${encodeURIComponent(movieId)}`);
}

export async function postReview(movieId: string, rating: number, text: string): Promise<Review> {
  return apiRequest<Review>(`/reviews/${encodeURIComponent(movieId)}`, {
    method: "POST",
    body: { rating, text },
  });
}

export async function deleteReview(movieId: string, reviewId: string): Promise<void> {
  await apiRequest<{ ok: boolean }>(
    `/reviews/${encodeURIComponent(movieId)}/${encodeURIComponent(reviewId)}`,
    { method: "DELETE" },
  );
}
