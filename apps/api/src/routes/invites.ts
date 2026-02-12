import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { nanoid } from "nanoid";
import { query, getClient } from "../db/connection.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticateJWT } from "../middleware/auth.js";

const router: Router = Router();

// Rate limiter for public invite validation/accept endpoints
// 10 requests per 15 minutes per IP to prevent brute force attacks
const inviteValidationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({ error: "Too many requests, please try again later" });
  },
});

/**
 * POST /events/:eventId/invites
 * Create a new invite for an event (organizer only)
 * Requires JWT authentication
 */
router.post(
  "/events/:eventId/invites",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const eventId = parseInt(req.params.eventId, 10);
    const { email, expiresInDays } = req.body;

    // Verify event exists
    const eventResult = await query(
      "SELECT id, name FROM events WHERE id = $1",
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const event = eventResult.rows[0];

    // Generate unique 21-character invite code using nanoid
    const inviteCode = nanoid();

    // Calculate expiration date (default: 30 days)
    let expiresAt = null;
    const daysToExpire = expiresInDays || 30;
    if (daysToExpire > 0) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + daysToExpire);
      expiresAt = expirationDate;
    }

    // Insert invite into database
    const result = await query(
      `INSERT INTO invites (event_id, email, invite_code, status, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, event_id, email, invite_code, status, expires_at, created_at`,
      [eventId, email || null, inviteCode, "pending", expiresAt]
    );

    const invite = result.rows[0];

    // Build invite URL
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const inviteUrl = `${frontendUrl}/join/${inviteCode}`;

    return res.status(201).json({
      id: invite.id,
      event_id: invite.event_id,
      invite_code: invite.invite_code,
      invite_url: inviteUrl,
      email: invite.email,
      status: invite.status,
      participant_id: null,
      participant_name: null,
      expires_at: invite.expires_at,
      created_at: invite.created_at,
      updated_at: invite.created_at,
    });
  })
);

/**
 * GET /events/:eventId/invites
 * Get all invites for an event (organizer only)
 * Requires JWT authentication
 */
router.get(
  "/events/:eventId/invites",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const eventId = parseInt(req.params.eventId, 10);

    // Verify event exists
    const eventResult = await query(
      "SELECT id FROM events WHERE id = $1",
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Get all invites for the event with participant info if accepted
    const result = await query(
      `SELECT
        invites.id,
        invites.event_id,
        invites.email,
        invites.phone,
        invites.invite_code,
        invites.status,
        invites.expires_at,
        invites.created_at,
        invites.updated_at,
        invites.participant_id,
        participants.name as participant_name
      FROM invites
      LEFT JOIN participants ON invites.participant_id = participants.id
      WHERE invites.event_id = $1
      ORDER BY invites.created_at DESC`,
      [eventId]
    );

    // Build invite URLs for each invite
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const invitesWithUrls = result.rows.map((invite) => ({
      ...invite,
      invite_url: `${frontendUrl}/join/${invite.invite_code}`,
    }));

    return res.status(200).json({ invites: invitesWithUrls });
  })
);

/**
 * POST /invites/validate
 * Validate an invite code and return event info (PUBLIC - rate limited)
 * No authentication required
 */
router.post(
  "/invites/validate",
  inviteValidationLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.body;

    // Validate code format (nanoid generates 21 character codes)
    if (!code || code.length !== 21) {
      return res.status(404).json({ error: "Invalid or expired invite" });
    }

    // Look up invite where status is pending and not expired
    const result = await query(
      `SELECT
        invites.id as invite_id,
        invites.event_id,
        events.name as event_name
      FROM invites
      JOIN events ON invites.event_id = events.id
      WHERE invites.invite_code = $1
        AND invites.status = 'pending'
        AND (invites.expires_at IS NULL OR invites.expires_at > NOW())`,
      [code]
    );

    if (result.rows.length === 0) {
      // Generic error message to prevent enumeration
      return res.status(404).json({ error: "Invalid or expired invite" });
    }

    const invite = result.rows[0];

    return res.status(200).json({
      eventId: invite.event_id,
      eventName: invite.event_name,
      inviteId: invite.invite_id,
    });
  })
);

/**
 * POST /invites/:code/accept
 * Accept an invite and join the event (PUBLIC - rate limited)
 * No authentication required
 */
router.post(
  "/invites/:code/accept",
  inviteValidationLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.params;
    const { participantName } = req.body;

    // Validate input
    if (!participantName || participantName.trim().length === 0) {
      return res.status(400).json({ error: "Participant name is required" });
    }

    // Validate code format
    if (!code || code.length !== 21) {
      return res.status(404).json({ error: "Invalid or expired invite" });
    }

    // Use transaction for atomic operation
    const client = await getClient();
    try {
      await client.query("BEGIN");

      // Look up invite and verify it's valid
      const inviteResult = await client.query(
        `SELECT
          invites.id,
          invites.event_id,
          invites.status,
          events.name as event_name
        FROM invites
        JOIN events ON invites.event_id = events.id
        WHERE invites.invite_code = $1
          AND invites.status = 'pending'
          AND (invites.expires_at IS NULL OR invites.expires_at > NOW())`,
        [code]
      );

      if (inviteResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Invalid or expired invite" });
      }

      const invite = inviteResult.rows[0];
      const eventId = invite.event_id;
      const eventName = invite.event_name;

      // Check if participant with this name already exists in the event
      const existingParticipantResult = await client.query(
        "SELECT id FROM participants WHERE event_id = $1 AND name = $2",
        [eventId, participantName.trim()]
      );

      let participantId: number;

      if (existingParticipantResult.rows.length > 0) {
        // Use existing participant
        participantId = existingParticipantResult.rows[0].id;
      } else {
        // Create new participant
        const newParticipantResult = await client.query(
          "INSERT INTO participants (event_id, name) VALUES ($1, $2) RETURNING id",
          [eventId, participantName.trim()]
        );
        participantId = newParticipantResult.rows[0].id;
      }

      // Update invite to accepted and link to participant
      await client.query(
        "UPDATE invites SET status = $1, participant_id = $2 WHERE invite_code = $3",
        ["accepted", participantId, code]
      );

      await client.query("COMMIT");

      return res.status(200).json({
        eventId,
        participantId,
        participantName: participantName.trim(),
        eventName,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  })
);

/**
 * DELETE /events/:eventId/invites/:inviteId
 * Revoke/delete an invite (organizer only)
 * Requires JWT authentication
 */
router.delete(
  "/events/:eventId/invites/:inviteId",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const eventId = parseInt(req.params.eventId, 10);
    const inviteId = parseInt(req.params.inviteId, 10);

    // Verify invite belongs to the event before deleting
    const result = await query(
      "DELETE FROM invites WHERE id = $1 AND event_id = $2 RETURNING id",
      [inviteId, eventId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Invite not found" });
    }

    return res.status(200).json({ message: "Invite revoked" });
  })
);

export default router;
