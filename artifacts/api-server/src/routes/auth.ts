import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import type { AuthPayload } from "../middlewares/requireAuth.js";

const router = Router();

function signToken(userId: string): string {
  const secret = process.env["JWT_SECRET"]!;
  return jwt.sign({ userId } satisfies AuthPayload, secret, { expiresIn: "30d" });
}

function generateCinverseId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "CVS-";
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function userView(user: InstanceType<typeof User>) {
  return {
    id: user._id.toString(),
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: (user.role ?? "member") as "member" | "vip",
    cinverseId: user.cinverseId ?? `CVS-${user._id.toString().slice(-6).toUpperCase()}`,
    createdAt: user.createdAt.toISOString(),
  };
}

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response) => {
  const { email, password, displayName } = req.body as Record<string, string>;
  if (!email || !password || !displayName) {
    res.status(400).json({ error: "email, password and displayName are required" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  const existing = await User.findOne({ email });
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const cinverseId = generateCinverseId();
  const user = await User.create({ email, passwordHash, displayName, cinverseId });
  const token = signToken(user._id.toString());
  res.status(201).json({ token, user: userView(user) });
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as Record<string, string>;
  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }
  const user = await User.findOne({ email });
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const token = signToken(user._id.toString());
  res.json({ token, user: userView(user) });
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { auth: AuthPayload }).auth;
  const user = await User.findById(userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(userView(user));
});

// POST /api/auth/logout
router.post("/logout", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

export default router;
