import type { Request, Response } from "express";
import { Router } from "express";
import { Review } from "../models/Review.js";
import { User } from "../models/User.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import type { AuthPayload } from "../middlewares/requireAuth.js";

const router = Router();

function uid(req: Request): string {
  return (req as Request & { auth: AuthPayload }).auth.userId;
}

// GET /api/reviews/:movieId  — public
router.get("/:movieId", async (req: Request, res: Response) => {
  const reviews = await Review.find({ movieId: req.params["movieId"] })
    .sort({ createdAt: -1 })
    .lean();
  res.json(reviews.map((r) => ({
    id: r._id.toString(),
    movieId: r.movieId,
    userId: r.userId,
    userName: r.userName,
    rating: r.rating,
    text: r.text,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  })));
});

// POST /api/reviews/:movieId  — auth required
router.post("/:movieId", requireAuth, async (req: Request, res: Response) => {
  const { rating, text } = req.body as { rating?: number; text?: string };
  if (!rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: "rating must be 1–5" });
    return;
  }
  if (!text?.trim()) {
    res.status(400).json({ error: "text is required" });
    return;
  }
  const userId = uid(req);
  const user = await User.findById(userId).lean();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const review = await Review.findOneAndUpdate(
    { movieId: req.params["movieId"], userId },
    {
      movieId: req.params["movieId"],
      userId,
      userName: user.displayName,
      rating: Math.round(rating),
      text: text.trim(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  res.status(201).json({
    id: review._id.toString(),
    movieId: review.movieId,
    userId: review.userId,
    userName: review.userName,
    rating: review.rating,
    text: review.text,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  });
});

// DELETE /api/reviews/:movieId/:reviewId  — auth required, own review only
router.delete("/:movieId/:reviewId", requireAuth, async (req: Request, res: Response) => {
  const userId = uid(req);
  const deleted = await Review.findOneAndDelete({
    _id: req.params["reviewId"],
    movieId: req.params["movieId"],
    userId,
  });
  if (!deleted) { res.status(404).json({ error: "Review not found" }); return; }
  res.json({ ok: true });
});

export default router;
