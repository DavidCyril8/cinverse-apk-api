import type { Request, Response } from "express";
import { Router } from "express";
import { User } from "../models/User.js";

const router = Router();

// Secret admin middleware — checks X-Admin-Key header against ADMIN_SECRET env var
function requireAdminKey(req: Request, res: Response, next: () => void): void {
  const secret = process.env["ADMIN_SECRET"];
  if (!secret) {
    res.status(500).json({ error: "Admin secret not configured" });
    return;
  }
  const provided = req.headers["x-admin-key"];
  if (!provided || provided !== secret) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

// POST /api/admin/set-role
// Body: { email: string, role: "member" | "vip" }
// Header: X-Admin-Key: <ADMIN_SECRET>
router.post("/set-role", requireAdminKey, async (req: Request, res: Response) => {
  const { email, role } = req.body as { email?: string; role?: string };
  if (!email || !role) {
    res.status(400).json({ error: "email and role are required" });
    return;
  }
  if (role !== "member" && role !== "vip") {
    res.status(400).json({ error: "role must be 'member' or 'vip'" });
    return;
  }
  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase().trim() },
    { $set: { role } },
    { new: true },
  );
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const id = user._id.toString();
  res.json({
    ok: true,
    user: {
      id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      cinverseId: user.cinverseId ?? `CVS-${id.slice(-6).toUpperCase()}`,
    },
  });
});

// GET /api/admin/users  — list all users (for admin overview)
// Header: X-Admin-Key: <ADMIN_SECRET>
router.get("/users", requireAdminKey, async (_req: Request, res: Response) => {
  const users = await User.find({}, { email: 1, displayName: 1, role: 1, cinverseId: 1, createdAt: 1 }).lean();
  res.json(
    users.map((u) => {
      const id = u._id.toString();
      return {
        id,
        email: u.email,
        displayName: u.displayName,
        role: u.role ?? "member",
        cinverseId: u.cinverseId ?? `CVS-${id.slice(-6).toUpperCase()}`,
        createdAt: (u.createdAt as Date).toISOString(),
      };
    }),
  );
});

export default router;
