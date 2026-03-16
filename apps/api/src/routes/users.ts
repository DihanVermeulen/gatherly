import { Router, Request, Response } from "express";
import { query } from "../db/connection";
import { asyncHandler } from "../middleware/asyncHandler";
import { authenticateJWT } from "../middleware/auth";

const router: Router = Router();

// GET /api/users/me — Get current user profile + stats
router.get(
  "/me",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user?.userId) {
      return res.status(403).json({ error: "Organizer access required" });
    }

    const userResult = await query(
      "SELECT id, email, name, created_at FROM users WHERE id = $1",
      [user.userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const eventsResult = await query(
      "SELECT COUNT(*) as count FROM events WHERE organizer_id = $1",
      [user.userId],
    );

    const u = userResult.rows[0];
    return res.json({
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.created_at,
      eventsOrganized: parseInt(eventsResult.rows[0].count, 10) || 0,
    });
  }),
);

// PUT /api/users/me — Update current user name
router.put(
  "/me",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user?.userId) {
      return res.status(403).json({ error: "Organizer access required" });
    }

    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }

    const result = await query(
      "UPDATE users SET name = $1 WHERE id = $2 RETURNING id, email, name",
      [name.trim(), user.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const u = result.rows[0];
    return res.json({
      id: u.id,
      email: u.email,
      name: u.name,
    });
  }),
);

export default router;
