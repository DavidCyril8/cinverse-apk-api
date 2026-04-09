# CINVERSE API

Live URL: `https://api.cinverse.name.ng`

---

## Authentication

Most user endpoints require a JWT Bearer token obtained from `/api/auth/login` or `/api/auth/register`.

```
Authorization: Bearer <token>
```

Admin endpoints require the `X-Admin-Key` header instead of a JWT.

---

## Endpoints

### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/healthz` | None | Server health check |

---

### Auth

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| POST | `/api/auth/register` | None | `{ email, password, displayName }` | Register new user, returns token + user |
| POST | `/api/auth/login` | None | `{ email, password }` | Login, returns token + user |
| GET | `/api/auth/me` | JWT | — | Get current user profile |
| POST | `/api/auth/logout` | JWT | — | Logout (client-side token discard) |

**User object returned by auth routes:**
```json
{
  "id": "...",
  "email": "user@example.com",
  "displayName": "Name",
  "avatarUrl": "",
  "role": "member",
  "cinverseId": "CVS-AB3K7Z",
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

---

### Movies

> All movie routes proxy to the upstream God's Zeal API. No auth required.

| Method | Endpoint | Query Params | Description |
|--------|----------|--------------|-------------|
| GET | `/api/movies/homepage` | — | Home page banners + platform lists |
| GET | `/api/movies/trending` | — | Trending titles |
| GET | `/api/movies/search` | `query` (required), `page` | Search for movies/shows |
| GET | `/api/movies/details` | `id` (subjectId) | Full details for a single title |
| GET | `/api/movies/stream` | `id` (subjectId), `detailPath` | Stream sources for a title |
| GET | `/api/movies/qualities` | `id` (subjectId), `detailPath` | Available quality options |
| GET | `/api/movies/media` | `id` (subjectId), `detailPath`, `season?`, `episode?` | Media URLs for playback |
| GET | `/api/movies/relay` | `url` (target URL) | Byte-range relay proxy for downloads |

> `detailPath` for stream/qualities/media comes from the `details` response.

---

### User

All user routes require JWT auth.

#### Watchlist

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/user/watchlist` | — | Get watchlist |
| POST | `/api/user/watchlist` | `{ movieId, title, posterUrl, year, type }` | Add to watchlist |
| DELETE | `/api/user/watchlist/:movieId` | — | Remove from watchlist |

#### Watch History

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/user/history` | — | Get watch history |
| POST | `/api/user/history` | `{ movieId, title, posterUrl, progress, duration, type }` | Save watch progress |
| DELETE | `/api/user/history/:movieId` | — | Remove a single item |
| DELETE | `/api/user/history` | — | Clear all history |

#### Search History

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/user/search-history` | — | Get search history |
| POST | `/api/user/search-history` | `{ query }` | Save a search term |
| DELETE | `/api/user/search-history/:query` | — | Remove a single search term |
| DELETE | `/api/user/search-history` | — | Clear all search history |

#### Profile

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/user/profile` | — | Get full profile (includes role + cinverseId) |
| PATCH | `/api/user/profile` | `{ displayName?, avatarUrl? }` | Update display name or avatar |
| PATCH | `/api/user/password` | `{ currentPassword, newPassword }` | Change password (min 8 chars) |

#### Import

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/user/import` | `{ watchlist?, watchHistory?, searchHistory? }` | Bulk-import user data |

---

### Reviews

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| GET | `/api/reviews/:movieId` | None | — | Get reviews for a title |
| POST | `/api/reviews/:movieId` | JWT | `{ rating (1–5), text }` | Post or update your review |
| DELETE | `/api/reviews/:movieId/:reviewId` | JWT | — | Delete your review |

---

### Admin (Secret)

> Protected by `X-Admin-Key` header. Set `ADMIN_SECRET` environment variable on the server.

```
X-Admin-Key: <ADMIN_SECRET value>
```

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/users` | — | List all users with roles and cinverseIds |
| POST | `/api/admin/set-role` | `{ email, role }` | Set a user's role — `"member"` or `"vip"` |

**Roles:**
- `member` — sees ads on app launch
- `vip` — ad-free experience, gold badge on profile

**Example — upgrade to VIP:**
```bash
curl -X POST https://api.cinverse.name.ng/api/admin/set-role \
  -H "X-Admin-Key: YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "role": "vip"}'
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret used to sign/verify JWT tokens |
| `ADMIN_SECRET` | Secret key for admin endpoints (`X-Admin-Key` header) |
| `PORT` | Server port (default: 8080) |

---

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express 5
- **Database**: MongoDB Atlas (via Mongoose)
- **Auth**: JWT (jsonwebtoken + bcrypt)
- **Logging**: Pino
- **Deploy**: Render (auto-deploy from GitHub)
