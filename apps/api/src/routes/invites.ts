import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { nanoid } from "nanoid";
import { query, getClient } from "../db/connection.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticateJWT } from "../middleware/auth.js";
import { requireOrganizer } from "../middleware/requireOrganizer.js";
import { sendMagicLinkEmail } from "../services/emailService.js";
import { logger } from "tsdown";

const router: Router = Router();

// Rate limiter for public invite validation/accept endpoints
// 10 requests per 15 minutes per IP to prevent brute force attacks
const inviteValidationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res
      .status(429)
      .json({ error: "Too many requests, please try again later" });
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
  requireOrganizer,
  asyncHandler(async (req: Request, res: Response) => {
    const eventId = parseInt(req.params.eventId, 10);
    const { email, expiresInDays, participantId } = req.body;

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
    }

    // Verify event exists
    const eventResult = await query(
      "SELECT id, name FROM events WHERE id = $1",
      [eventId],
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const event = eventResult.rows[0];

    // If no email provided but a participantId is given, check if that participant
    // has a linked user account and use their email. This ensures magic links sent
    // to known registered users always carry the email needed for user-scoped JWT
    // redemption — even when the organizer does not explicitly type an email address.
    let resolvedEmail: string | null = email || null;
    if (!resolvedEmail && participantId) {
      const parsedParticipantId = parseInt(participantId, 10);
      if (!isNaN(parsedParticipantId)) {
        const linkedUserResult = await query(
          `SELECT u.email
           FROM participants p
           JOIN users u ON p.user_id = u.id
           WHERE p.id = $1 AND p.event_id = $2`,
          [parsedParticipantId, eventId],
        );
        if (linkedUserResult.rows.length > 0) {
          resolvedEmail = linkedUserResult.rows[0].email;
        }
      }
    }

    // Generate unique 21-character invite code using nanoid
    const inviteCode = nanoid();

    // Calculate expiration date (default: 30 days, max: 365 days)
    let expiresAt = null;
    const daysToExpire = Math.min(Math.max(parseInt(expiresInDays) || 30, 1), 365);
    if (daysToExpire > 0) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + daysToExpire);
      expiresAt = expirationDate;
    }

    // Insert invite into database, storing created_by_user_id for organizer attribution
    const createdByUserId = req.user?.userId ?? null;
    const result = await query(
      `INSERT INTO invites (event_id, email, invite_code, status, expires_at, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, event_id, email, invite_code, status, expires_at, created_at`,
      [
        eventId,
        resolvedEmail,
        inviteCode,
        "pending",
        expiresAt,
        createdByUserId,
      ],
    );

    const invite = result.rows[0];

    // Build invite URL
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const inviteUrl = `${frontendUrl}/join/${inviteCode}`;

    // Generate magic link token (raw token for email, hash stored in DB)
    const magicToken = nanoid(48);
    const tokenHash = crypto
      .createHash("sha256")
      .update(magicToken)
      .digest("hex");
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store token hash in magic_link_tokens table
    await query(
      "INSERT INTO magic_link_tokens (invite_id, token_hash, expires_at) VALUES ($1, $2, $3)",
      [invite.id, tokenHash, tokenExpiresAt],
    );

    // Build magic link URL
    const magicLinkUrl = `${frontendUrl}/magic-link/${magicToken}`;

    // Fire-and-forget email if invite has an email address
    if (invite.email) {
      sendMagicLinkEmail(invite.email, magicLinkUrl, event.name);
    }

    return res.status(201).json({
      id: invite.id,
      event_id: invite.event_id,
      invite_code: invite.invite_code,
      invite_url: inviteUrl,
      magic_link_url: magicLinkUrl,
      email: invite.email,
      status: invite.status,
      participant_id: null,
      participant_name: null,
      expires_at: invite.expires_at,
      created_at: invite.created_at,
      updated_at: invite.created_at,
    });
  }),
);

/**
 * GET /events/:eventId/invites
 * Get all invites for an event (organizer only)
 * Requires JWT authentication
 */
router.get(
  "/events/:eventId/invites",
  authenticateJWT,
  requireOrganizer,
  asyncHandler(async (req: Request, res: Response) => {
    const eventId = parseInt(req.params.eventId, 10);

    // Verify event exists
    const eventResult = await query("SELECT id FROM events WHERE id = $1", [
      eventId,
    ]);

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
      [eventId],
    );

    // Build invite URLs for each invite
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const invitesWithUrls = result.rows.map((invite) => ({
      ...invite,
      invite_url: `${frontendUrl}/join/${invite.invite_code}`,
    }));

    return res.status(200).json({ invites: invitesWithUrls });
  }),
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
    // Also retrieve organizer name (via created_by_user_id), participant count, and event date
    const result = await query(
      `SELECT
        invites.id as invite_id,
        invites.event_id,
        events.name as event_name,
        events.created_at as event_date,
        users.name as organizer_name,
        (SELECT COUNT(*) FROM participants WHERE participants.event_id = events.id) as participant_count
      FROM invites
      JOIN events ON invites.event_id = events.id
      LEFT JOIN users ON invites.created_by_user_id = users.id
      WHERE invites.invite_code = $1
        AND invites.status = 'pending'
        AND (invites.expires_at IS NULL OR invites.expires_at > NOW())`,
      [code],
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
      organizerName: invite.organizer_name || null,
      participantCount: parseInt(invite.participant_count, 10) || 0,
      eventDate: invite.event_date || null,
    });
  }),
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
    const { participantName, email } = req.body;

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
        [code],
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
        [eventId, participantName.trim()],
      );

      let participantId: number;

      if (existingParticipantResult.rows.length > 0) {
        // Use existing participant
        participantId = existingParticipantResult.rows[0].id;
      } else {
        // Create new participant
        const newParticipantResult = await client.query(
          "INSERT INTO participants (event_id, name) VALUES ($1, $2) RETURNING id",
          [eventId, participantName.trim()],
        );
        participantId = newParticipantResult.rows[0].id;
      }

      // Update invite to accepted and link to participant
      await client.query(
        "UPDATE invites SET status = $1, participant_id = $2 WHERE invite_code = $3",
        ["accepted", participantId, code],
      );

      await client.query("COMMIT");

      // After transaction commits: generate magic link if email provided
      const emailAddress = typeof email === "string" ? email.trim() : null;
      if (emailAddress) {
        const magicToken = nanoid(48);
        const tokenHash = crypto
          .createHash("sha256")
          .update(magicToken)
          .digest("hex");
        const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await query(
          "INSERT INTO magic_link_tokens (invite_id, token_hash, expires_at) VALUES ($1, $2, $3)",
          [invite.id, tokenHash, tokenExpiresAt],
        );

        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const magicLinkUrl = `${frontendUrl}/magic-link/${magicToken}`;
        sendMagicLinkEmail(emailAddress, magicLinkUrl, eventName);
      }

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
  }),
);

/**
 * POST /events/:eventId/invites/:inviteId/resend-magic-link
 * Generate a fresh 7-day magic link token for an existing invite (organizer only)
 * Invalidates any existing tokens for the invite before creating a new one.
 * Requires JWT authentication
 */
router.post(
  "/events/:eventId/invites/:inviteId/resend-magic-link",
  authenticateJWT,
  requireOrganizer,
  asyncHandler(async (req: Request, res: Response) => {
    const eventId = parseInt(req.params.eventId, 10);
    const inviteId = parseInt(req.params.inviteId, 10);

    logger.log("Resend magic link...");

    // Look up the invite and its event name
    const inviteResult = await query(
      `SELECT i.id, i.email, e.name as event_name
       FROM invites i
       JOIN events e ON i.event_id = e.id
       WHERE i.id = $1 AND i.event_id = $2`,
      [inviteId, eventId],
    );

    logger.log("Resend magic link...");

    if (inviteResult.rows.length === 0) {
      return res.status(404).json({ error: "Invite not found" });
    }

    const invite = inviteResult.rows[0];

    // Invalidate all existing tokens for this invite
    await query("DELETE FROM magic_link_tokens WHERE invite_id = $1", [
      inviteId,
    ]);

    // Generate a fresh magic link token
    const magicToken = nanoid(48);
    const tokenHash = crypto
      .createHash("sha256")
      .update(magicToken)
      .digest("hex");
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store the new token hash
    await query(
      "INSERT INTO magic_link_tokens (invite_id, token_hash, expires_at) VALUES ($1, $2, $3)",
      [inviteId, tokenHash, tokenExpiresAt],
    );

    // Build magic link URL
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const magicLinkUrl = `${frontendUrl}/magic-link/${magicToken}`;

    // Fire-and-forget email if invite has an email address
    if (invite.email) {
      sendMagicLinkEmail(invite.email, magicLinkUrl, invite.event_name);
    }

    return res.status(200).json({
      magic_link_url: magicLinkUrl,
      email_sent: !!invite.email,
    });
  }),
);

/**
 * DELETE /events/:eventId/invites/:inviteId
 * Revoke/delete an invite (organizer only)
 * Requires JWT authentication
 */
router.delete(
  "/events/:eventId/invites/:inviteId",
  authenticateJWT,
  requireOrganizer,
  asyncHandler(async (req: Request, res: Response) => {
    const eventId = parseInt(req.params.eventId, 10);
    const inviteId = parseInt(req.params.inviteId, 10);

    // Verify invite belongs to the event before deleting
    const result = await query(
      "DELETE FROM invites WHERE id = $1 AND event_id = $2 RETURNING id",
      [inviteId, eventId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Invite not found" });
    }

    return res.status(200).json({ message: "Invite revoked" });
  }),
);

export default router;
