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
      "SELECT id, email, name, bio, interests, avatar_url, onboarding_complete, created_at FROM users WHERE id = $1",
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
      bio: u.bio ?? null,
      interests: u.interests ?? [],
      avatarUrl: u.avatar_url ?? null,
      onboardingComplete: u.onboarding_complete,
      createdAt: u.created_at,
      eventsOrganized: parseInt(eventsResult.rows[0].count, 10) || 0,
    });
  }),
);

// PUT /api/users/me — Patch-style update: name, bio, interests, avatarUrl, onboardingComplete
router.put(
  "/me",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    if (!user?.userId) {
      return res.status(403).json({ error: "Organizer access required" });
    }

    const body = req.body;
    const setClauses: string[] = [];
    const params: unknown[] = [];

    // name: optional string, must be non-empty if provided
    if ("name" in body) {
      const name = body.name;
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "name must be a non-empty string" });
      }
      params.push(name.trim());
      setClauses.push(`name = $${params.length}`);
    }

    // bio: string or null (null clears to NULL)
    if ("bio" in body) {
      const bio = body.bio;
      if (bio !== null && typeof bio !== "string") {
        return res.status(400).json({ error: "bio must be a string or null" });
      }
      params.push(bio);
      setClauses.push(`bio = $${params.length}`);
    }

    // interests: array, full-replace (JSONB column)
    if ("interests" in body) {
      const interests = body.interests;
      if (!Array.isArray(interests)) {
        return res.status(400).json({ error: "interests must be an array" });
      }
      params.push(JSON.stringify(interests));
      setClauses.push(`interests = $${params.length}`);
    }

    // avatarUrl → avatar_url: string or null (null clears to NULL)
    if ("avatarUrl" in body) {
      const avatarUrl = body.avatarUrl;
      if (avatarUrl !== null && typeof avatarUrl !== "string") {
        return res.status(400).json({ error: "avatarUrl must be a string or null" });
      }
      params.push(avatarUrl);
      setClauses.push(`avatar_url = $${params.length}`);
    }

    // onboardingComplete: one-way — silently ignore false/non-true values
    if ("onboardingComplete" in body) {
      if (body.onboardingComplete === true) {
        params.push(true);
        setClauses.push(`onboarding_complete = $${params.length}`);
      }
      // false or non-true: silently skip — no error, no update
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    setClauses.push("updated_at = NOW()");
    params.push(user.userId);
    const whereParam = `$${params.length}`;

    const result = await query(
      `UPDATE users SET ${setClauses.join(", ")} WHERE id = ${whereParam} RETURNING id, email, name, bio, interests, avatar_url, onboarding_complete, created_at`,
      params,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const eventsResult = await query(
      "SELECT COUNT(*) as count FROM events WHERE organizer_id = $1",
      [user.userId],
    );

    const u = result.rows[0];
    return res.json({
      id: u.id,
      email: u.email,
      name: u.name,
      bio: u.bio ?? null,
      interests: u.interests ?? [],
      avatarUrl: u.avatar_url ?? null,
      onboardingComplete: u.onboarding_complete,
      createdAt: u.created_at,
      eventsOrganized: parseInt(eventsResult.rows[0].count, 10) || 0,
    });
  }),
);

export default router;
