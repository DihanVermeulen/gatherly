import { Router, Request, Response } from "express";
import { query } from "../db/connection";
import { asyncHandler } from "../middleware/asyncHandler";
import { authenticateJWT, optionalAuth } from "../middleware/auth";

const router: Router = Router();

// GET /api/events/:id/gifts - List gifts for event
router.get(
  "/:id/gifts",
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await query(
      `
    SELECT g.*, gc.claimed_by
    FROM gifts g
    LEFT JOIN gift_claims gc ON g.id = gc.gift_id
    WHERE g.event_id = $1
    ORDER BY g.created_at DESC
  `,
      [id],
    );

    const gifts = result.rows.map((row) => ({
      id: row.id.toString(),
      name: row.name,
      description: row.description,
      imageDataUrl: row.image_url,
      addedBy: row.added_by,
      claimedBy: row.claimed_by,
      createdAt: row.created_at,
    }));

    res.json(gifts);
  }),
);

// POST /api/events/:id/gifts - Add gift
router.post(
  "/:id/gifts",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, imageDataUrl, addedBy } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Gift name is required" });
    }

    const result = await query(
      `INSERT INTO gifts (event_id, name, description, image_url, added_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
      [
        id,
        name.trim(),
        description || null,
        imageDataUrl || null,
        addedBy || null,
      ],
    );

    const gift = result.rows[0];
    res.status(201).json({
      id: gift.id.toString(),
      name: gift.name,
      description: gift.description,
      imageDataUrl: gift.image_url,
      addedBy: gift.added_by,
      claimedBy: null,
      createdAt: gift.created_at,
    });
  }),
);

// PUT /api/events/:id/gifts/:giftId - Update gift
router.put(
  "/:id/gifts/:giftId",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const { id, giftId } = req.params;
    const { name, description, imageDataUrl } = req.body;

    const result = await query(
      `UPDATE gifts
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         image_url = COALESCE($3, image_url)
     WHERE id = $4 AND event_id = $5
     RETURNING *`,
      [name, description, imageDataUrl, giftId, id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Gift not found" });
    }

    // Get claim status
    const claimResult = await query(
      "SELECT claimed_by FROM gift_claims WHERE gift_id = $1",
      [giftId],
    );

    const gift = result.rows[0];
    res.json({
      id: gift.id.toString(),
      name: gift.name,
      description: gift.description,
      imageDataUrl: gift.image_url,
      addedBy: gift.added_by,
      claimedBy: claimResult.rows[0]?.claimed_by || null,
      createdAt: gift.created_at,
    });
  }),
);

// DELETE /api/events/:id/gifts/:giftId - Delete gift
router.delete(
  "/:id/gifts/:giftId",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const { id, giftId } = req.params;

    const result = await query(
      "DELETE FROM gifts WHERE id = $1 AND event_id = $2 RETURNING id",
      [giftId, id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Gift not found" });
    }

    res.json({ success: true });
  }),
);

// POST /api/events/:id/gifts/:giftId/claim - Claim gift
router.post(
  "/:id/gifts/:giftId/claim",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const { id, giftId } = req.params;
    const user = (req as any).user;

    // Verify gift belongs to the requested event
    const giftCheck = await query(
      "SELECT id FROM gifts WHERE id = $1 AND event_id = $2",
      [giftId, id],
    );
    if (giftCheck.rows.length === 0) {
      return res.status(404).json({ error: "Gift not found" });
    }

    // Verify caller is a member of this event (participant or organizer)
    let callerName: string | null = null;
    if (user.participantId) {
      const participantCheck = await query(
        "SELECT name FROM participants WHERE id = $1 AND event_id = $2",
        [user.participantId, id],
      );
      if (participantCheck.rows.length === 0) {
        return res.status(403).json({ error: "Forbidden" });
      }
      callerName = participantCheck.rows[0].name;
    } else {
      const organizerCheck = await query(
        "SELECT name FROM users WHERE id = $1",
        [user.userId],
      );
      const eventCheck = await query(
        "SELECT id FROM events WHERE id = $1 AND organizer_id = $2",
        [id, user.userId],
      );
      if (eventCheck.rows.length === 0) {
        return res.status(403).json({ error: "Forbidden" });
      }
      callerName = organizerCheck.rows[0]?.name ?? `user:${user.userId}`;
    }

    // Check if already claimed
    const existingClaim = await query(
      "SELECT claimed_by FROM gift_claims WHERE gift_id = $1",
      [giftId],
    );

    if (existingClaim.rows.length > 0) {
      return res.status(400).json({ error: "Gift is already claimed" });
    }

    await query(
      "INSERT INTO gift_claims (gift_id, claimed_by) VALUES ($1, $2)",
      [giftId, callerName],
    );

    res.json({ success: true, claimedBy: callerName });
  }),
);

// DELETE /api/events/:id/gifts/:giftId/claim - Unclaim gift
router.delete(
  "/:id/gifts/:giftId/claim",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const { id, giftId } = req.params;
    const user = (req as any).user;

    // Verify gift belongs to the requested event and caller is a member
    const giftCheck = await query(
      "SELECT id FROM gifts WHERE id = $1 AND event_id = $2",
      [giftId, id],
    );
    if (giftCheck.rows.length === 0) {
      return res.status(404).json({ error: "Gift not found" });
    }

    if (user.participantId) {
      const memberCheck = await query(
        "SELECT id FROM participants WHERE id = $1 AND event_id = $2",
        [user.participantId, id],
      );
      if (memberCheck.rows.length === 0) return res.status(403).json({ error: "Forbidden" });
    } else {
      const ownerCheck = await query(
        "SELECT id FROM events WHERE id = $1 AND organizer_id = $2",
        [id, user.userId],
      );
      if (ownerCheck.rows.length === 0) return res.status(403).json({ error: "Forbidden" });
    }

    const result = await query(
      "DELETE FROM gift_claims WHERE gift_id = $1 RETURNING id",
      [giftId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Gift claim not found" });
    }

    res.json({ success: true });
  }),
);

export default router;
