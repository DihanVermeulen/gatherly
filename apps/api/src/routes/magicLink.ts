import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { query, getClient } from "../db/connection.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  generateTokens,
  generateParticipantTokens,
} from "../services/tokenService.js";
import { logger } from "tsdown";

const router: Router = Router();

// Rate limiter: 10 requests per 15 minutes per IP
// Prevents brute-force attacks on token redemption
const redeemRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res
      .status(429)
      .json({ error: "Too many requests, please try again later" });
  },
});

/**
 * POST /lookup
 * Look up event preview data from a magic link token WITHOUT consuming it or creating a participant.
 *
 * Security properties:
 * - Read-only: does not create participant records, does not update invite status
 * - Token NOT consumed: same token can still be redeemed after lookup
 * - Rate limited: shares the same rate limiter as /redeem
 */
router.post(
  "/lookup",
  redeemRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;

    // Validate token exists and is a non-empty string
    if (!token || typeof token !== "string" || token.trim().length === 0) {
      return res.status(400).json({ error: "Token is required" });
    }

    // Hash the raw token to look up the stored hash
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Look up the token non-destructively — token persists for reuse within 7-day window
    const lookupResult = await query(
      `SELECT invite_id FROM magic_link_tokens
       WHERE token_hash = $1 AND expires_at > NOW()`,
      [tokenHash],
    );

    if (lookupResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid or expired magic link" });
    }

    const inviteId = lookupResult.rows[0].invite_id;

    // JOIN invites, events, and LEFT JOIN users (organizer) to return preview data
    const previewResult = await query(
      `SELECT
         i.invite_code,
         i.event_id,
         i.email AS invite_email,
         e.name AS event_name,
         e.event_date,
         u.name AS organizer_name,
         (SELECT COUNT(*) FROM participants p WHERE p.event_id = e.id)::int AS participant_count
       FROM invites i
       JOIN events e ON i.event_id = e.id
       LEFT JOIN users u ON e.organizer_id = u.id
       WHERE i.id = $1`,
      [inviteId],
    );

    if (previewResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid or expired magic link" });
    }

    const row = previewResult.rows[0];

    return res.status(200).json({
      eventId: row.event_id,
      eventName: row.event_name,
      inviteCode: row.invite_code,
      organizerName: row.organizer_name ?? null,
      participantCount: row.participant_count,
      eventDate: row.event_date ? row.event_date.toISOString() : null,
      inviteEmail: row.invite_email ?? null,
    });
  }),
);

/**
 * POST /redeem
 * Redeem a magic link token and return a participant-scoped JWT
 *
 * Security properties:
 * - POST-only: email pre-fetch bots cannot consume tokens (they only GET links)
 * - Reusable: token persists in DB and can be redeemed multiple times within 7-day expiry window
 * - Token stored as SHA-256 hash: raw token never touches the database
 * - Rate limited: 10 requests per 15 minutes per IP
 * - Expiry enforced in SQL: tokens older than 7 days automatically rejected
 */
router.post(
  "/redeem",
  redeemRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { token, participantName: clientParticipantName, email: clientEmail } = req.body;
    console.log('[redeem] received token:', token);

    // Validate token exists and is a non-empty string
    if (!token || typeof token !== "string" || token.trim().length === 0) {
      return res.status(400).json({ error: "Token is required" });
    }

    // Hash the raw token to look up the stored hash
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    console.log('[redeem] computed hash:', tokenHash);

    // Look up the token non-destructively — token persists for reuse within 7-day window
    const lookupResult = await query(
      `SELECT invite_id FROM magic_link_tokens
       WHERE token_hash = $1 AND expires_at > NOW()`,
      [tokenHash],
    );

    if (lookupResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid or expired magic link" });
    }

    const inviteId = lookupResult.rows[0].invite_id;

    // Look up the invite (handles both pending and accepted status)
    const inviteResult = await query(
      `SELECT i.id, i.event_id, i.participant_id, i.status, i.email as invite_email,
              e.name as event_name
       FROM invites i
       JOIN events e ON i.event_id = e.id
       WHERE i.id = $1`,
      [inviteId],
    );

    if (inviteResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid or expired magic link" });
    }

    const invite = inviteResult.rows[0];
    let participantId: number;
    let participantName: string;

    if (invite.status === "accepted" && invite.participant_id != null) {
      // Returning participant: reuse existing participant record
      const participantResult = await query(
        "SELECT name FROM participants WHERE id = $1",
        [invite.participant_id],
      );

      if (participantResult.rows.length === 0) {
        return res.status(401).json({ error: "Invalid or expired magic link" });
      }

      participantId = invite.participant_id;
      participantName = participantResult.rows[0].name;
    } else {
      // First-time use: create participant and accept invite atomically
      const client = await getClient();
      try {
        await client.query("BEGIN");

        // Use client-supplied name if provided; fall back to email prefix or "Participant"
        const resolvedName = clientParticipantName?.trim()
          ? clientParticipantName.trim()
          : invite.invite_email
          ? invite.invite_email.includes("@")
            ? invite.invite_email.split("@")[0]
            : invite.invite_email
          : "Participant";

        // Create participant record, or return the existing one if the name is
        // already taken in this event (e.g. organizer added them manually, or
        // they redeemed a different invite for the same event earlier).
        const newParticipantResult = await client.query(
          `INSERT INTO participants (event_id, name) VALUES ($1, $2)
           ON CONFLICT (event_id, name) DO UPDATE SET name = EXCLUDED.name
           RETURNING id, name`,
          [invite.event_id, resolvedName],
        );

        participantId = newParticipantResult.rows[0].id;
        participantName = newParticipantResult.rows[0].name;

        // Update invite to accepted and link to participant
        await client.query(
          "UPDATE invites SET status = 'accepted', participant_id = $1 WHERE id = $2",
          [participantId, invite.id],
        );

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }

    // Smart redemption: if invite has an email (or client supplied one for QR/link invites),
    // check if a registered user account exists. If so, link the participant to that user
    // and return a user-scoped JWT instead.
    // Use stored invite email; fall back to client-supplied email for QR/link invites
    const effectiveEmail = (invite.invite_email?.trim().length > 0)
      ? invite.invite_email
      : (clientEmail?.trim().length > 0 ? clientEmail.trim() : null);

    if (effectiveEmail) {
      const userLookup = await query(
        "SELECT id, email, name, role FROM users WHERE LOWER(email) = LOWER($1)",
        [effectiveEmail],
      );

      if (userLookup.rows.length > 0) {
        const matchedUser = userLookup.rows[0];

        // Link participant record to the matched user account (fire-and-forget safe — non-fatal)
        try {
          await query(
            "UPDATE participants SET user_id = $1 WHERE id = $2",
            [matchedUser.id, participantId],
          );
        } catch (linkErr) {
          console.error("Participant user_id link failed (non-fatal):", linkErr);
        }

        // Issue a full user-scoped JWT (not participant-scoped)
        const { accessToken, refreshToken } = await generateTokens({
          userId: matchedUser.id,
          email: matchedUser.email,
          role: matchedUser.role,
        });

        res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
          path: "/api/auth",
        });

        return res.status(200).json({
          accessToken,
          user: {
            id: matchedUser.id,
            email: matchedUser.email,
            name: matchedUser.name,
            role: matchedUser.role,
            eventId: invite.event_id,
            eventName: invite.event_name,
          },
        });
      }
    }

    // No matching user account — proceed with existing participant-scoped token path
    const { accessToken, refreshToken } = await generateParticipantTokens({
      participantId,
      eventId: invite.event_id,
      participantName,
    });

    // Set refresh token in HttpOnly cookie scoped to /api/auth
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
      path: "/api/auth",
    });

    return res.status(200).json({
      accessToken,
      user: {
        participantId,
        eventId: invite.event_id,
        participantName,
        eventName: invite.event_name,
        role: "participant",
      },
    });
  }),
);

export default router;
