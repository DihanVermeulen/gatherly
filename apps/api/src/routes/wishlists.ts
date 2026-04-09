import { Router, Request, Response } from "express";
import { query, getClient } from "../db/connection";
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
      w.sort_order,
      w.price_pence,
      wc.claimed_by,
      w.created_at,
      w.updated_at
    FROM wishlists w
    INNER JOIN participants p ON w.participant_id = p.id
    LEFT JOIN wishlist_claims wc ON w.id = wc.wishlist_id
    WHERE w.event_id = $1
    ORDER BY w.sort_order ASC NULLS LAST, w.created_at ASC
  `,
      [eventId],
    );

    const currentParticipantId = req.user?.participantId ?? null;

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
      sortOrder: row.sort_order,
      pricePence: row.price_pence ?? null,
      isClaimed: row.claimed_by !== null,
      claimedByMe:
        currentParticipantId != null &&
        currentParticipantId === row.claimed_by,
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
      pricePence,
    } = req.body;

    if (!participantId) {
      return res.status(400).json({ error: "participantId is required" });
    }

    if (!itemName || !itemName.trim()) {
      return res.status(400).json({ error: "itemName is required" });
    }

    // Calculate next sort_order for this participant in this event
    const orderResult = await query(
      `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM wishlists WHERE event_id = $1 AND participant_id = $2`,
      [eventId, participantId],
    );
    const nextSortOrder = orderResult.rows[0].next_order;

    const result = await query(
      `INSERT INTO wishlists (event_id, participant_id, item_name, description, image_url, product_url, priority, sort_order, price_pence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        eventId,
        participantId,
        itemName.trim(),
        description || null,
        imageUrl || null,
        productUrl || null,
        priority || "medium",
        nextSortOrder,
        pricePence ?? null,
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
      imageUrl: wishlist.image_url,
      productUrl: wishlist.product_url,
      priority: wishlist.priority,
      sortOrder: wishlist.sort_order,
      pricePence: wishlist.price_pence ?? null,
      isClaimed: false,
      claimedByMe: false,
      createdAt: wishlist.created_at,
      updatedAt: wishlist.updated_at,
    });
  }),
);

// PUT /api/events/:eventId/wishlists/reorder - Reorder wishlist items
router.put(
  "/:eventId/wishlists/reorder",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const { eventId } = req.params;
    const { orderedIds, participantId } = req.body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ error: "orderedIds array is required" });
    }
    if (!participantId) {
      return res.status(400).json({ error: "participantId is required" });
    }

    // Verify all IDs belong to this participant in this event
    const verification = await query(
      `SELECT id FROM wishlists WHERE id = ANY($1) AND participant_id = $2 AND event_id = $3`,
      [orderedIds, participantId, eventId],
    );

    if (verification.rowCount !== orderedIds.length) {
      return res
        .status(403)
        .json({ error: "Some items do not belong to this participant" });
    }

    // Use transaction to bulk-update sort_order
    const client = await getClient();
    try {
      await client.query("BEGIN");
      for (let i = 0; i < orderedIds.length; i++) {
        await client.query(
          "UPDATE wishlists SET sort_order = $1 WHERE id = $2",
          [i + 1, orderedIds[i]],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    res.json({ success: true });
  }),
);

// PUT /api/events/:eventId/wishlists/:id - Update wishlist item (owner only)
router.put(
  "/:eventId/wishlists/:id",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const { eventId, id } = req.params;
    const {
      itemName,
      description,
      imageUrl,
      productUrl,
      priority,
      pricePence,
    } = req.body;
    const callerParticipantId = req.user?.participantId;
    const callerUserId = req.user?.userId;

    // Check ownership
    const ownerCheck = await query(
      "SELECT participant_id FROM wishlists WHERE id = $1 AND event_id = $2",
      [id, eventId],
    );

    if (ownerCheck.rowCount === 0) {
      return res.status(404).json({ error: "Wishlist item not found" });
    }

    if (callerParticipantId !== undefined) {
      // Participant session: must own the wishlist item
      if (ownerCheck.rows[0].participant_id !== callerParticipantId) {
        return res.status(403).json({ error: "Unauthorized - can only edit your own items" });
      }
    } else {
      // Organizer session: must own the event
      const eventOwnerCheck = await query(
        "SELECT id FROM events WHERE id = $1 AND organizer_id = $2",
        [eventId, callerUserId],
      );
      if (eventOwnerCheck.rows.length === 0) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const result = await query(
      `UPDATE wishlists
       SET item_name = $1,
           description = $2,
           image_url = $3,
           product_url = $4,
           priority = $5,
           price_pence = $6
       WHERE id = $7 AND event_id = $8
       RETURNING *`,
      [itemName, description, imageUrl, productUrl, priority, pricePence ?? null, id, eventId],
    );

    const wishlist = result.rows[0];

    // Get participant name and claim info
    const participantResult = await query(
      "SELECT name FROM participants WHERE id = $1",
      [wishlist.participant_id],
    );

    const claimResult = await query(
      `SELECT claimed_by FROM wishlist_claims WHERE wishlist_id = $1`,
      [id],
    );

    const claimedById = claimResult.rows[0]?.claimed_by ?? null;
    const currentParticipantId = req.user?.participantId ?? null;

    res.json({
      id: wishlist.id,
      eventId: wishlist.event_id,
      participantId: wishlist.participant_id,
      participantName: participantResult.rows[0]?.name,
      itemName: wishlist.item_name,
      description: wishlist.description,
      imageUrl: wishlist.image_url,
      productUrl: wishlist.product_url,
      priority: wishlist.priority,
      sortOrder: wishlist.sort_order,
      pricePence: wishlist.price_pence ?? null,
      isClaimed: claimedById !== null,
      claimedByMe:
        currentParticipantId != null && currentParticipantId === claimedById,
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
    const callerParticipantId = req.user?.participantId;
    const callerUserId = req.user?.userId;

    // Check ownership
    const ownerCheck = await query(
      "SELECT participant_id FROM wishlists WHERE id = $1 AND event_id = $2",
      [id, eventId],
    );

    if (ownerCheck.rowCount === 0) {
      return res.status(404).json({ error: "Wishlist item not found" });
    }

    if (callerParticipantId !== undefined) {
      // Participant session: must own the wishlist item
      if (ownerCheck.rows[0].participant_id !== callerParticipantId) {
        return res.status(403).json({ error: "Unauthorized - can only delete your own items" });
      }
    } else {
      // Organizer session: must own the event
      const eventOwnerCheck = await query(
        "SELECT id FROM events WHERE id = $1 AND organizer_id = $2",
        [eventId, callerUserId],
      );
      if (eventOwnerCheck.rows.length === 0) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    await query("DELETE FROM wishlists WHERE id = $1 AND event_id = $2", [
      id,
      eventId,
    ]);

    res.json({ success: true });
  }),
);

// POST /api/events/:eventId/wishlists/:id/claim - Claim a wishlist item
router.post(
  "/:eventId/wishlists/:id/claim",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const { eventId, id } = req.params;

    // Guard: organizer sessions have no participantId
    if (!req.user?.participantId) {
      return res.status(403).json({ error: "Participants only" });
    }

    const currentParticipantId = req.user.participantId;

    // Check item exists and get owner
    const itemCheck = await query(
      "SELECT participant_id FROM wishlists WHERE id = $1 AND event_id = $2",
      [id, eventId],
    );

    if (itemCheck.rowCount === 0) {
      return res.status(404).json({ error: "Wishlist item not found" });
    }

    // Self-claim guard
    if (itemCheck.rows[0].participant_id === currentParticipantId) {
      return res.status(403).json({ error: "Cannot claim your own item" });
    }

    // Atomic insert — ON CONFLICT DO NOTHING prevents race conditions
    const result = await query(
      `INSERT INTO wishlist_claims (wishlist_id, claimed_by)
       VALUES ($1, $2)
       ON CONFLICT (wishlist_id) DO NOTHING
       RETURNING id`,
      [id, currentParticipantId],
    );

    if (result.rowCount === 0) {
      return res.status(409).json({ error: "Item already claimed" });
    }

    return res.status(201).json({ success: true });
  }),
);

// DELETE /api/events/:eventId/wishlists/:id/claim - Unclaim a wishlist item
router.delete(
  "/:eventId/wishlists/:id/claim",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const { eventId: _eventId, id } = req.params;

    // Guard: organizer sessions have no participantId
    if (!req.user?.participantId) {
      return res.status(403).json({ error: "Participants only" });
    }

    const currentParticipantId = req.user.participantId;

    // Delete only own claim
    const result = await query(
      "DELETE FROM wishlist_claims WHERE wishlist_id = $1 AND claimed_by = $2",
      [id, currentParticipantId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "No claim found" });
    }

    return res.status(200).json({ success: true });
  }),
);

export default router;
