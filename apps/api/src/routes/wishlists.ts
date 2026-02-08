import { Router, Request, Response } from "express";
import { query } from "../db/connection";
import { asyncHandler } from "../middleware/asyncHandler";
import { authenticateJWT } from "../middleware/auth";

const router: Router = Router();

// GET /api/events/:eventId/wishlists - List all wishlist items for an event
router.get(
  "/:eventId/wishlists",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const { eventId } = req.params;

    const result = await query(
      `
    SELECT
      w.id,
      w.event_id,
      w.participant_id,
      p.name as participant_name,
      w.item_name,
      w.description,
      w.image_url,
      w.product_url,
      w.priority,
      wc.claimed_by,
      cp.name as claimed_by_name,
      w.created_at,
      w.updated_at
    FROM wishlists w
    INNER JOIN participants p ON w.participant_id = p.id
    LEFT JOIN wishlist_claims wc ON w.id = wc.wishlist_id
    LEFT JOIN participants cp ON wc.claimed_by = cp.id
    WHERE w.event_id = $1
    ORDER BY w.created_at DESC
  `,
      [eventId],
    );

    const wishlists = result.rows.map((row) => ({
      id: row.id,
      eventId: row.event_id,
      participantId: row.participant_id,
      participantName: row.participant_name,
      itemName: row.item_name,
      description: row.description,
      imageUrl: row.image_url,
      productUrl: row.product_url,
      priority: row.priority,
      claimedBy: row.claimed_by,
      claimedByName: row.claimed_by_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json(wishlists);
  }),
);

// POST /api/events/:eventId/wishlists - Create wishlist item
router.post(
  "/:eventId/wishlists",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const { eventId } = req.params;
    const {
      participantId,
      itemName,
      description,
      imageUrl,
      productUrl,
      priority,
    } = req.body;

    if (!participantId) {
      return res.status(400).json({ error: "participantId is required" });
    }

    if (!itemName || !itemName.trim()) {
      return res.status(400).json({ error: "itemName is required" });
    }

    const result = await query(
      `INSERT INTO wishlists (event_id, participant_id, item_name, description, image_url, product_url, priority)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
      [
        eventId,
        participantId,
        itemName.trim(),
        description || null,
        imageUrl || null,
        productUrl || null,
        priority || "medium",
      ],
    );

    const wishlist = result.rows[0];

    // Get participant name
    const participantResult = await query(
      "SELECT name FROM participants WHERE id = $1",
      [wishlist.participant_id],
    );

    res.status(201).json({
      id: wishlist.id,
      eventId: wishlist.event_id,
      participantId: wishlist.participant_id,
      participantName: participantResult.rows[0]?.name,
      itemName: wishlist.item_name,
      description: wishlist.description,
      imageUrl: wishlist.imageUrl,
      productUrl: wishlist.product_url,
      priority: wishlist.priority,
      claimedBy: null,
      claimedByName: null,
      createdAt: wishlist.created_at,
      updatedAt: wishlist.updated_at,
    });
  }),
);

// PUT /api/events/:eventId/wishlists/:id - Update wishlist item (owner only)
router.put(
  "/:eventId/wishlists/:id",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const { eventId, id } = req.params;
    const {
      participantId,
      itemName,
      description,
      imageUrl,
      productUrl,
      priority,
    } = req.body;

    // Check ownership
    const ownerCheck = await query(
      "SELECT participant_id FROM wishlists WHERE id = $1 AND event_id = $2",
      [id, eventId],
    );

    if (ownerCheck.rowCount === 0) {
      return res.status(404).json({ error: "Wishlist item not found" });
    }

    if (ownerCheck.rows[0].participant_id !== parseInt(participantId)) {
      return res
        .status(403)
        .json({ error: "Unauthorized - can only edit your own items" });
    }

    const result = await query(
      `UPDATE wishlists
     SET item_name = $1,
         description = $2,
         image_url = $3,
         product_url = $4,
         priority = $5
     WHERE id = $6 AND event_id = $7
     RETURNING *`,
      [itemName, description, imageUrl, productUrl, priority, id, eventId],
    );

    const wishlist = result.rows[0];

    // Get participant name and claim info
    const participantResult = await query(
      "SELECT name FROM participants WHERE id = $1",
      [wishlist.participant_id],
    );

    const claimResult = await query(
      `SELECT wc.claimed_by, p.name as claimed_by_name
     FROM wishlist_claims wc
     LEFT JOIN participants p ON wc.claimed_by = p.id
     WHERE wc.wishlist_id = $1`,
      [id],
    );

    res.json({
      id: wishlist.id,
      eventId: wishlist.event_id,
      participantId: wishlist.participant_id,
      participantName: participantResult.rows[0]?.name,
      itemName: wishlist.item_name,
      description: wishlist.description,
      imageUrl: wishlist.imageUrl,
      productUrl: wishlist.product_url,
      priority: wishlist.priority,
      claimedBy: claimResult.rows[0]?.claimed_by || null,
      claimedByName: claimResult.rows[0]?.claimed_by_name || null,
      createdAt: wishlist.created_at,
      updatedAt: wishlist.updated_at,
    });
  }),
);

// DELETE /api/events/:eventId/wishlists/:id - Delete wishlist item (owner only)
router.delete(
  "/:eventId/wishlists/:id",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const { eventId, id } = req.params;
    const { participantId } = req.body;

    // Check ownership
    const ownerCheck = await query(
      "SELECT participant_id FROM wishlists WHERE id = $1 AND event_id = $2",
      [id, eventId],
    );

    if (ownerCheck.rowCount === 0) {
      return res.status(404).json({ error: "Wishlist item not found" });
    }

    if (ownerCheck.rows[0].participant_id !== parseInt(participantId)) {
      return res
        .status(403)
        .json({ error: "Unauthorized - can only delete your own items" });
    }

    await query("DELETE FROM wishlists WHERE id = $1 AND event_id = $2", [
      id,
      eventId,
    ]);

    res.json({ success: true });
  }),
);

export default router;
