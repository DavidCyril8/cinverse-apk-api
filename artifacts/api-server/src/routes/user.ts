import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import { Router } from "express";
import { User } from "../models/User.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import type { AuthPayload } from "../middlewares/requireAuth.js";

const router = Router();
router.use(requireAuth);

function uid(req: Request): string {
  return (req as Request & { auth: AuthPayload }).auth.userId;
}

// GET /api/user/watchlist
router.get("/watchlist", async (req: Request, res: Response) => {
  const user = await User.findById(uid(req)).lean();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user.watchlist ?? []);
});

// POST /api/user/watchlist
router.post("/watchlist", async (req: Request, res: Response) => {
  const { movieId, title, poster, mediaType } = req.body as Record<string, string>;
  if (!movieId) { res.status(400).json({ error: "movieId required" }); return; }
  await User.updateOne(
    { _id: uid(req), "watchlist.movieId": { $ne: movieId } },
    { $push: { watchlist: { $each: [{ movieId, title, poster, mediaType: mediaType ?? "movie" }], $position: 0 } } },
  );
  res.json({ ok: true });
});

// DELETE /api/user/watchlist/:movieId
router.delete("/watchlist/:movieId", async (req: Request, res: Response) => {
  await User.updateOne(
    { _id: uid(req) },
    { $pull: { watchlist: { movieId: req.params["movieId"] } } },
  );
  res.json({ ok: true });
});

// GET /api/user/history
router.get("/history", async (req: Request, res: Response) => {
  const user = await User.findById(uid(req)).lean();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user.watchHistory ?? []);
});

// POST /api/user/history
router.post("/history", async (req: Request, res: Response) => {
  const { movieId, title, poster, mediaType, progressSeconds, durationSeconds, season, episode } =
    req.body as Record<string, unknown>;
  if (!movieId) { res.status(400).json({ error: "movieId required" }); return; }
  await User.updateOne(
    { _id: uid(req) },
    {
      $pull: { watchHistory: { movieId } },
    },
  );
  await User.updateOne(
    { _id: uid(req) },
    {
      $push: {
        watchHistory: {
          $each: [{ movieId, title, poster, mediaType: mediaType ?? "movie", progressSeconds: Number(progressSeconds) || 0, durationSeconds: Number(durationSeconds) || 0, watchedAt: new Date(), season, episode }],
          $position: 0,
          $slice: 30,
        },
      },
    },
  );
  res.json({ ok: true });
});

// DELETE /api/user/history  — clear all watch history
router.delete("/history", async (req: Request, res: Response) => {
  await User.updateOne({ _id: uid(req) }, { $set: { watchHistory: [] } });
  res.json({ ok: true });
});

// DELETE /api/user/history/:movieId
router.delete("/history/:movieId", async (req: Request, res: Response) => {
  await User.updateOne(
    { _id: uid(req) },
    { $pull: { watchHistory: { movieId: req.params["movieId"] } } },
  );
  res.json({ ok: true });
});

// GET /api/user/search-history
router.get("/search-history", async (req: Request, res: Response) => {
  const user = await User.findById(uid(req)).lean();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user.searchHistory ?? []);
});

// POST /api/user/search-history
router.post("/search-history", async (req: Request, res: Response) => {
  const { query } = req.body as { query?: string };
  if (!query?.trim()) { res.status(400).json({ error: "query required" }); return; }
  const q = query.trim();
  await User.updateOne({ _id: uid(req) }, { $pull: { searchHistory: q } });
  await User.updateOne(
    { _id: uid(req) },
    { $push: { searchHistory: { $each: [q], $position: 0, $slice: 10 } } },
  );
  res.json({ ok: true });
});

// DELETE /api/user/search-history/:query  — remove a single term
router.delete("/search-history/:query", async (req: Request, res: Response) => {
  const rawQuery = req.params["query"];
  const q = typeof rawQuery === "string" ? decodeURIComponent(rawQuery).trim() : "";
  if (q) {
    await User.updateOne({ _id: uid(req) }, { $pull: { searchHistory: q } });
  }
  res.json({ ok: true });
});

// DELETE /api/user/search-history  — clear all
router.delete("/search-history", async (req: Request, res: Response) => {
  await User.updateOne({ _id: uid(req) }, { $set: { searchHistory: [] } });
  res.json({ ok: true });
});

// GET /api/user/profile
router.get("/profile", async (req: Request, res: Response) => {
  const user = await User.findById(uid(req)).lean();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({
    id: user._id.toString(),
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    createdAt: (user.createdAt as Date).toISOString(),
  });
});

// PATCH /api/user/password
router.patch("/password", async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword and newPassword are required" });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" });
    return;
  }
  const user = await User.findById(uid(req));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) { res.status(401).json({ error: "Current password is incorrect" }); return; }
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();
  res.json({ ok: true });
});

// PATCH /api/user/profile
router.patch("/profile", async (req: Request, res: Response) => {
  const { displayName, avatarUrl } = req.body as { displayName?: string; avatarUrl?: string };
  const update: Record<string, string> = {};
  if (displayName) update["displayName"] = displayName.trim();
  if (avatarUrl !== undefined) update["avatarUrl"] = avatarUrl;
  const user = await User.findByIdAndUpdate(uid(req), { $set: update }, { new: true });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({
    id: user._id.toString(),
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
  });
});

// POST /api/user/import
router.post("/import", async (req: Request, res: Response) => {
  const { watchlist, watchHistory, searchHistory } = req.body as {
    watchlist?: Array<{ movieId: string; title?: string; poster?: string; mediaType?: string }>;
    watchHistory?: Array<{ movieId: string; title?: string; poster?: string; mediaType?: string; progressSeconds?: number; durationSeconds?: number; season?: number; episode?: number }>;
    searchHistory?: string[];
  };

  const userId = uid(req);

  if (watchlist?.length) {
    const items = watchlist.map((w) => ({
      movieId: w.movieId,
      title: w.title ?? "",
      poster: w.poster ?? "",
      mediaType: (w.mediaType === "series" ? "series" : "movie") as "movie" | "series",
      addedAt: new Date(),
    }));
    const existingIds = (await User.findById(userId).lean())?.watchlist.map((w) => w.movieId) ?? [];
    const newItems = items.filter((i) => !existingIds.includes(i.movieId));
    if (newItems.length) {
      await User.updateOne({ _id: userId }, { $push: { watchlist: { $each: newItems, $position: 0 } } });
    }
  }

  if (watchHistory?.length) {
    for (const h of watchHistory) {
      await User.updateOne({ _id: userId }, { $pull: { watchHistory: { movieId: h.movieId } } });
      await User.updateOne(
        { _id: userId },
        {
          $push: {
            watchHistory: {
              $each: [{
                movieId: h.movieId,
                title: h.title ?? "",
                poster: h.poster ?? "",
                mediaType: (h.mediaType === "series" ? "series" : "movie") as "movie" | "series",
                progressSeconds: h.progressSeconds ?? 0,
                durationSeconds: h.durationSeconds ?? 0,
                watchedAt: new Date(),
                season: h.season,
                episode: h.episode,
              }],
              $position: 0,
              $slice: 30,
            },
          },
        },
      );
    }
  }

  if (searchHistory?.length) {
    for (const q of [...searchHistory].reverse()) {
      await User.updateOne({ _id: userId }, { $pull: { searchHistory: q } });
      await User.updateOne(
        { _id: userId },
        { $push: { searchHistory: { $each: [q], $position: 0, $slice: 10 } } },
      );
    }
  }

  res.json({ ok: true });
});

export default router;
