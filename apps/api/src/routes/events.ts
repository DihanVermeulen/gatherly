import { Router, Request, Response } from "express";
import { query, getClient } from "../db/connection";
import { asyncHandler } from "../middleware/asyncHandler";
import { authenticateJWT, optionalAuth } from "../middleware/auth";
import { requireOrganizer } from "../middleware/requireOrganizer.js";
import { sendAssignmentReadyEmail } from "../services/emailService";

const router: Router = Router();

// GET /api/events - List events for the authenticated user
router.get(
  "/",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;

    const baseSelect = `
    SELECT
      e.id,
      e.name,
      e.couple_crossing,
      e.created_at,
      e.updated_at,
      e.event_date,
      e.wishlist_deadline,
      e.feature_flags,
      e.plan_tier,
      e.location,
      e.allow_guest_invites,
      e.is_public,
      e.cover_photo IS NOT NULL AS has_cover_photo,
      COALESCE(json_agg(DISTINCT p.name) FILTER (WHERE p.name IS NOT NULL), '[]') as people,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_array(p1.name, p2.name)
        ) FILTER (WHERE p1.name IS NOT NULL AND p2.name IS NOT NULL),
        '[]'
      ) as couples,
      CASE WHEN COUNT(a.id) > 0 THEN
        json_object_agg(
          giver.name,
          COALESCE(
            (SELECT json_agg(receiver.name)
             FROM assignments a2
             JOIN participants receiver ON a2.receiver_id = receiver.id
             WHERE a2.giver_id = giver.id AND a2.event_id = e.id),
            '[]'
          )
        ) FILTER (WHERE giver.name IS NOT NULL)
      ELSE NULL END as assignments
    FROM events e
    LEFT JOIN participants p ON p.event_id = e.id
    LEFT JOIN couples c ON c.event_id = e.id
    LEFT JOIN participants p1 ON c.person1_id = p1.id
    LEFT JOIN participants p2 ON c.person2_id = p2.id
    LEFT JOIN assignments a ON a.event_id = e.id
    LEFT JOIN participants giver ON a.giver_id = giver.id`;

    let result;
    if (user.participantId !== undefined) {
      // Magic-link participant — can only see their one event
      result = await query(
        `${baseSelect} WHERE e.id = $1 GROUP BY e.id ORDER BY e.created_at DESC`,
        [user.eventId],
      );
    } else {
      // Organizer — see events they own, legacy events with no organizer,
      // and events where they are a linked participant (joined via magic link)
      result = await query(
        `${baseSelect} WHERE e.organizer_id = $1
            OR e.organizer_id IS NULL
            OR EXISTS (
              SELECT 1 FROM participants p2
              WHERE p2.event_id = e.id AND p2.user_id = $1
            ) GROUP BY e.id ORDER BY e.created_at DESC`,
        [user.userId],
      );
    }

    const events = result.rows.map((row) => ({
      id: row.id.toString(),
      name: row.name,
      coupleCrossing: row.couple_crossing,
      people: row.people || [],
      couples: row.couples || [],
      assignments: row.assignments,
      gifts: {},
      date: row.created_at,
      participants: row.people || [],
      eventDate: row.event_date || null,
      wishlistDeadline: row.wishlist_deadline || null,
      featureFlags: row.feature_flags || {},
      planTier: row.plan_tier || 'free',
      hasCoverPhoto: row.has_cover_photo || false,
      location: row.location || null,
      allowGuestInvites: row.allow_guest_invites || false,
      isPublic: row.is_public || false,
    }));

    res.json(events);
  }),
);

// GET /api/events/:id - Get single event details
router.get(
  "/:id",
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const eventResult = await query("SELECT * FROM events WHERE id = $1", [id]);

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const event = eventResult.rows[0];

    // Get participants
    const participantsResult = await query(
      "SELECT id, name FROM participants WHERE event_id = $1",
      [id],
    );

    // Get couples
    const couplesResult = await query(
      `
    SELECT p1.name as person1, p2.name as person2
    FROM couples c
    JOIN participants p1 ON c.person1_id = p1.id
    JOIN participants p2 ON c.person2_id = p2.id
    WHERE c.event_id = $1
  `,
      [id],
    );

    // Get assignments
    const assignmentsResult = await query(
      `
    SELECT giver.name as giver, receiver.name as receiver
    FROM assignments a
    JOIN participants giver ON a.giver_id = giver.id
    JOIN participants receiver ON a.receiver_id = receiver.id
    WHERE a.event_id = $1
  `,
      [id],
    );

    // Get gifts
    const giftsResult = await query(
      `
    SELECT g.*, gc.claimed_by
    FROM gifts g
    LEFT JOIN gift_claims gc ON g.id = gc.gift_id
    WHERE g.event_id = $1
  `,
      [id],
    );

    // Build assignments object
    const assignments: Record<string, string[]> = {};
    assignmentsResult.rows.forEach((row) => {
      if (!assignments[row.giver]) {
        assignments[row.giver] = [];
      }
      assignments[row.giver].push(row.receiver);
    });

    // Build gifts object
    const gifts: Record<string, any> = {};
    giftsResult.rows.forEach((row) => {
      gifts[row.id] = {
        id: row.id.toString(),
        name: row.name,
        description: row.description,
        imageDataUrl: row.image_url,
        addedBy: row.added_by,
        claimedBy: row.claimed_by,
      };
    });

    // Get wishlist stats
    const wishlistStatsResult = await query(
      `SELECT
        COUNT(w.id)::int as total_wishlist_count,
        COUNT(wc.id)::int as claimed_count
      FROM wishlists w
      LEFT JOIN wishlist_claims wc ON w.id = wc.wishlist_id
      WHERE w.event_id = $1`,
      [id],
    );
    const wishlistStats = wishlistStatsResult.rows[0] || { total_wishlist_count: 0, claimed_count: 0 };

    // Get organizer name
    let organizerName: string | null = null;
    if (event.organizer_id) {
      const organizerResult = await query(
        "SELECT name FROM users WHERE id = $1",
        [event.organizer_id],
      );
      organizerName = organizerResult.rows[0]?.name || null;
    }

    res.json({
      id: event.id.toString(),
      name: event.name,
      coupleCrossing: event.couple_crossing,
      people: participantsResult.rows.map((p) => p.name),
      couples: couplesResult.rows.map((c) => [c.person1, c.person2]),
      assignments: Object.keys(assignments).length > 0 ? assignments : null,
      gifts,
      date: event.created_at,
      participants: participantsResult.rows.map((p) => p.name),
      participantDetails: participantsResult.rows.map((p) => ({
        id: p.id,
        name: p.name,
      })),
      eventDate: event.event_date || null,
      wishlistDeadline: event.wishlist_deadline || null,
      featureFlags: event.feature_flags || {},
      planTier: event.plan_tier || 'free',
      coverPhotoUrl: event.cover_photo || null,
      location: event.location || null,
      allowGuestInvites: event.allow_guest_invites || false,
      isPublic: event.is_public || false,
      totalWishlistCount: wishlistStats.total_wishlist_count,
      claimedCount: wishlistStats.claimed_count,
      organizerName,
    });
  }),
);

// POST /api/events - Create new event
router.post(
  "/",
  authenticateJWT,
  requireOrganizer,
  asyncHandler(async (req: Request, res: Response) => {
    const { name, coupleCrossing = false, eventDate, wishlistDeadline, featureFlags = {}, location, coverPhoto, allowGuestInvites, isPublic } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Event name is required" });
    }

    const result = await query(
      "INSERT INTO events (name, couple_crossing, organizer_id, event_date, wishlist_deadline, feature_flags, location, cover_photo, allow_guest_invites, is_public) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *",
      [name.trim(), coupleCrossing, (req as any).user.userId, eventDate || null, wishlistDeadline || null, JSON.stringify(featureFlags), location || null, coverPhoto || null, allowGuestInvites || false, isPublic || false],
    );

    const event = result.rows[0];

    res.status(201).json({
      id: event.id.toString(),
      name: event.name,
      coupleCrossing: event.couple_crossing,
      people: [],
      couples: [],
      assignments: null,
      gifts: {},
      date: event.created_at,
      participants: [],
      eventDate: event.event_date || null,
      wishlistDeadline: event.wishlist_deadline || null,
      featureFlags: event.feature_flags || {},
      planTier: event.plan_tier || 'free',
      hasCoverPhoto: event.cover_photo != null,
      coverPhotoUrl: event.cover_photo || null,
      location: event.location || null,
      allowGuestInvites: event.allow_guest_invites || false,
      isPublic: event.is_public || false,
    });
  }),
);

// PUT /api/events/:id - Update event
router.put(
  "/:id",
  authenticateJWT,
  requireOrganizer,
  asyncHandler(async (req: Request, res: Response) => {
    const client = await getClient();
    try {
      await client.query("BEGIN");

      const { id } = req.params;
      const { name, coupleCrossing, people, couples, assignments, eventDate, wishlistDeadline, featureFlags, location, coverPhoto, allowGuestInvites, isPublic } = req.body;

      // Update event basic info
      await client.query(
        `UPDATE events SET
          name = COALESCE($1, name),
          couple_crossing = COALESCE($2, couple_crossing),
          event_date = CASE WHEN $3::text IS NOT NULL THEN $3::timestamp ELSE event_date END,
          wishlist_deadline = CASE WHEN $4::text IS NOT NULL THEN $4::timestamp ELSE wishlist_deadline END,
          feature_flags = CASE WHEN $5::text IS NOT NULL THEN $5::jsonb ELSE feature_flags END,
          location = CASE WHEN $6::text IS NOT NULL THEN $6::text ELSE location END,
          cover_photo = CASE WHEN $7::text IS NOT NULL THEN $7::text ELSE cover_photo END,
          allow_guest_invites = CASE WHEN $8::text IS NOT NULL THEN $8::boolean ELSE allow_guest_invites END,
          is_public = CASE WHEN $9::text IS NOT NULL THEN $9::boolean ELSE is_public END
        WHERE id = $10`,
        [name, coupleCrossing, eventDate || null, wishlistDeadline || null, featureFlags ? JSON.stringify(featureFlags) : null, location || null, coverPhoto || null, allowGuestInvites != null ? String(allowGuestInvites) : null, isPublic != null ? String(isPublic) : null, id],
      );

      // If people array is provided, sync participants
      if (people !== undefined) {
        // Get current participants
        const currentParticipants = await client.query(
          "SELECT name FROM participants WHERE event_id = $1",
          [id],
        );
        const currentNames = currentParticipants.rows.map((p) => p.name);

        // Add new participants
        for (const person of people) {
          if (!currentNames.includes(person)) {
            await client.query(
              "INSERT INTO participants (event_id, name) VALUES ($1, $2) ON CONFLICT (event_id, name) DO NOTHING",
              [id, person],
            );
          }
        }

        // Remove deleted participants (this will cascade to couples and assignments)
        const toRemove = currentNames.filter(
          (n: string) => !people.includes(n),
        );
        if (toRemove.length > 0) {
          await client.query(
            "DELETE FROM participants WHERE event_id = $1 AND name = ANY($2)",
            [id, toRemove],
          );
        }
      }

      // If couples array is provided, sync couples
      if (couples !== undefined) {
        // Delete existing couples
        await client.query("DELETE FROM couples WHERE event_id = $1", [id]);

        // Add new couples
        for (const [person1, person2] of couples) {
          const p1Result = await client.query(
            "SELECT id FROM participants WHERE event_id = $1 AND name = $2",
            [id, person1],
          );
          const p2Result = await client.query(
            "SELECT id FROM participants WHERE event_id = $1 AND name = $2",
            [id, person2],
          );

          if (p1Result.rows.length > 0 && p2Result.rows.length > 0) {
            await client.query(
              "INSERT INTO couples (event_id, person1_id, person2_id) VALUES ($1, $2, $3)",
              [id, p1Result.rows[0].id, p2Result.rows[0].id],
            );
          }
        }
      }

      // If assignments are provided, sync assignments
      if (assignments !== undefined && assignments !== null) {
        // Delete existing assignments
        await client.query("DELETE FROM assignments WHERE event_id = $1", [id]);

        // Add new assignments
        for (const [giver, receivers] of Object.entries(assignments)) {
          const giverResult = await client.query(
            "SELECT id FROM participants WHERE event_id = $1 AND name = $2",
            [id, giver],
          );

          if (giverResult.rows.length > 0) {
            for (const receiver of receivers as string[]) {
              const receiverResult = await client.query(
                "SELECT id FROM participants WHERE event_id = $1 AND name = $2",
                [id, receiver],
              );

              if (receiverResult.rows.length > 0) {
                await client.query(
                  "INSERT INTO assignments (event_id, giver_id, receiver_id) VALUES ($1, $2, $3)",
                  [id, giverResult.rows[0].id, receiverResult.rows[0].id],
                );
              }
            }
          }
        }
      }

      await client.query("COMMIT");

      // Fetch and return updated event
      const updatedEvent = await fetchEventById(id);
      res.json(updatedEvent);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error; // Let global error handler handle it
    } finally {
      client.release();
    }
  }),
);

// DELETE /api/events/:id - Delete event
router.delete(
  "/:id",
  authenticateJWT,
  requireOrganizer,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = await query(
      "DELETE FROM events WHERE id = $1 RETURNING id",
      [id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json({ success: true });
  }),
);

// POST /api/events/:id/participants - Add participant
router.post("/:id/participants", authenticateJWT, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Participant name is required" });
    }

    await query(
      "INSERT INTO participants (event_id, name) VALUES ($1, $2) ON CONFLICT (event_id, name) DO NOTHING",
      [id, name.trim()],
    );

    res.status(201).json({ success: true });
  } catch (error) {
    console.error("Error adding participant:", error);
    res.status(500).json({ error: "Failed to add participant" });
  }
});

// DELETE /api/events/:id/participants/:name - Remove participant
router.delete(
  "/:id/participants/:name",
  authenticateJWT,
  requireOrganizer,
  async (req: Request, res: Response) => {
    try {
      const { id, name } = req.params;

      const result = await query(
        "DELETE FROM participants WHERE event_id = $1 AND name = $2 RETURNING id",
        [id, decodeURIComponent(name)],
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Participant not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error removing participant:", error);
      res.status(500).json({ error: "Failed to remove participant" });
    }
  },
);

// POST /api/events/:id/couples - Create couple
router.post("/:id/couples", authenticateJWT, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { person1, person2 } = req.body;

    const p1Result = await query(
      "SELECT id FROM participants WHERE event_id = $1 AND name = $2",
      [id, person1],
    );
    const p2Result = await query(
      "SELECT id FROM participants WHERE event_id = $1 AND name = $2",
      [id, person2],
    );

    if (p1Result.rows.length === 0 || p2Result.rows.length === 0) {
      return res.status(400).json({ error: "Both participants must exist" });
    }

    await query(
      "INSERT INTO couples (event_id, person1_id, person2_id) VALUES ($1, $2, $3)",
      [id, p1Result.rows[0].id, p2Result.rows[0].id],
    );

    res.status(201).json({ success: true });
  } catch (error) {
    console.error("Error creating couple:", error);
    res.status(500).json({ error: "Failed to create couple" });
  }
});

// DELETE /api/events/:id/couples/:coupleId - Remove couple
router.delete("/:id/couples/:coupleId", authenticateJWT, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { id, coupleId } = req.params;

    const result = await query(
      "DELETE FROM couples WHERE id = $1 AND event_id = $2 RETURNING id",
      [coupleId, id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Couple not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error removing couple:", error);
    res.status(500).json({ error: "Failed to remove couple" });
  }
});

// POST /api/events/:id/generate - Generate assignments
router.post("/:id/generate", authenticateJWT, requireOrganizer, async (req: Request, res: Response) => {
  const client = await getClient();
  try {
    await client.query("BEGIN");

    const { id } = req.params;
    const { giftCount = 1 } = req.body;

    // Get event and settings
    const eventResult = await client.query(
      "SELECT couple_crossing FROM events WHERE id = $1",
      [id],
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const coupleCrossing = eventResult.rows[0].couple_crossing;

    // Get participants
    const participantsResult = await client.query(
      "SELECT id, name FROM participants WHERE event_id = $1",
      [id],
    );
    const participants = participantsResult.rows;
    const people = participants.map((p) => p.name);
    const participantMap = new Map(participants.map((p) => [p.name, p.id]));

    if (people.length < 2) {
      return res.status(400).json({ error: "Need at least 2 participants" });
    }

    // Get couples
    const couplesResult = await client.query(
      `
      SELECT p1.name as person1, p2.name as person2
      FROM couples c
      JOIN participants p1 ON c.person1_id = p1.id
      JOIN participants p2 ON c.person2_id = p2.id
      WHERE c.event_id = $1
    `,
      [id],
    );
    const selectedCouples = couplesResult.rows.map((c) => [
      c.person1,
      c.person2,
    ]);

    // Validate
    const totalGiftsNeeded = people.length * giftCount;
    if (totalGiftsNeeded > people.length * (people.length - 1)) {
      return res.status(400).json({
        error: `Not enough people! With ${people.length} people, each person can buy for maximum ${people.length - 1} different people.`,
      });
    }

    // Generate assignments
    let assignments: Record<string, string[]> | null = null;
    let attempts = 0;

    while (!assignments && attempts < 2000) {
      attempts++;
      const tempAssignments: Record<string, string[]> = {};
      const receivedCount: Record<string, number> = {};

      people.forEach((person) => {
        tempAssignments[person] = [];
        receivedCount[person] = 0;
      });

      let valid = true;

      for (const giver of people) {
        const giverCouple = selectedCouples.find((c) => c.includes(giver));
        const assigned = new Set<string>();

        for (let i = 0; i < giftCount; i++) {
          const validReceivers = people
            .filter((receiver) => {
              if (receiver === giver) return false;
              if (assigned.has(receiver)) return false;
              if (!coupleCrossing && giverCouple) {
                const receiverCouple = selectedCouples.find((c) =>
                  c.includes(receiver),
                );
                if (
                  receiverCouple &&
                  giverCouple[0] === receiverCouple[0] &&
                  giverCouple[1] === receiverCouple[1]
                ) {
                  return false;
                }
              }
              return true;
            })
            .sort((a, b) => receivedCount[a] - receivedCount[b]);

          if (validReceivers.length === 0) {
            valid = false;
            break;
          }

          const minReceived = receivedCount[validReceivers[0]];
          const candidates = validReceivers.filter(
            (r) => receivedCount[r] === minReceived,
          );
          const receiver =
            candidates[Math.floor(Math.random() * candidates.length)];

          tempAssignments[giver].push(receiver);
          assigned.add(receiver);
          receivedCount[receiver]++;
        }

        if (!valid) break;
      }

      if (valid) {
        const allCorrect = people.every(
          (person) => receivedCount[person] === giftCount,
        );
        if (allCorrect) {
          assignments = tempAssignments;
        }
      }
    }

    if (!assignments) {
      return res.status(400).json({
        error:
          "Could not generate valid assignments. Try adjusting the number of gifts per person or couple constraints.",
      });
    }

    // Delete existing assignments
    await client.query("DELETE FROM assignments WHERE event_id = $1", [id]);

    // Save new assignments
    for (const [giver, receivers] of Object.entries(assignments)) {
      const giverId = participantMap.get(giver);
      for (const receiver of receivers) {
        const receiverId = participantMap.get(receiver);
        await client.query(
          "INSERT INTO assignments (event_id, giver_id, receiver_id) VALUES ($1, $2, $3)",
          [id, giverId, receiverId],
        );
      }
    }

    await client.query("COMMIT");

    // Fire-and-forget assignment notification emails
    try {
      const eventNameResult = await client.query(
        "SELECT name FROM events WHERE id = $1", [id]
      );
      const eventName = eventNameResult.rows[0]?.name || '';
      const participantEmailsResult = await client.query(
        `SELECT DISTINCT ON (p.id) p.name, i.email
         FROM participants p
         LEFT JOIN invites i ON i.participant_id = p.id
         WHERE p.event_id = $1 AND i.email IS NOT NULL
         ORDER BY p.id`,
        [id],
      );
      for (const row of participantEmailsResult.rows) {
        sendAssignmentReadyEmail(row.email, row.name, eventName);
      }
    } catch (_emailErr) {
      // Don't fail the generate request if email fails
    }

    res.json({ assignments });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error generating assignments:", error);
    res.status(500).json({ error: "Failed to generate assignments" });
  } finally {
    client.release();
  }
});

// GET /api/events/:id/my-assignments - Get the current participant's receivers
router.get(
  "/:id/my-assignments",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const eventId = parseInt(req.params.id, 10);
    const participantId = req.user?.participantId;

    if (!participantId) {
      return res
        .status(403)
        .json({ error: "Participant access required" });
    }

    // Verify the participant belongs to this event
    const memberCheck = await query(
      "SELECT id FROM participants WHERE id = $1 AND event_id = $2",
      [participantId, eventId],
    );

    if (memberCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "You are not a participant in this event" });
    }

    // Fetch this participant's receivers from the assignments table
    const assignmentsResult = await query(
      `SELECT receiver.name as receiver_name
       FROM assignments a
       JOIN participants receiver ON a.receiver_id = receiver.id
       WHERE a.event_id = $1 AND a.giver_id = $2`,
      [eventId, participantId],
    );

    if (assignmentsResult.rows.length === 0) {
      return res.status(404).json({ error: "No assignments found yet" });
    }

    const receivers = assignmentsResult.rows.map(
      (row) => row.receiver_name as string,
    );

    return res.json({ receivers });
  }),
);

// GET /api/events/:id/codes - Get all codes for event
router.get("/:id/codes", authenticateJWT, requireOrganizer, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `
      SELECT giver.name as giver, receiver.name as receiver
      FROM assignments a
      JOIN participants giver ON a.giver_id = giver.id
      JOIN participants receiver ON a.receiver_id = receiver.id
      WHERE a.event_id = $1
      ORDER BY giver.name
    `,
      [id],
    );

    const assignments: Record<string, string[]> = {};
    result.rows.forEach((row) => {
      if (!assignments[row.giver]) {
        assignments[row.giver] = [];
      }
      assignments[row.giver].push(row.receiver);
    });

    // Generate codes
    const codes: Record<string, string> = {};
    for (const [person, receivers] of Object.entries(assignments)) {
      const receiversStr = receivers.join(",");
      codes[person] = Buffer.from(`${person}:${receiversStr}`).toString(
        "base64",
      );
    }

    res.json({ assignments, codes });
  } catch (error) {
    console.error("Error fetching codes:", error);
    res.status(500).json({ error: "Failed to fetch codes" });
  }
});

// Helper function to fetch event by ID
async function fetchEventById(id: string) {
  const eventResult = await query("SELECT * FROM events WHERE id = $1", [id]);
  if (eventResult.rows.length === 0) return null;

  const event = eventResult.rows[0];

  const participantsResult = await query(
    "SELECT id, name FROM participants WHERE event_id = $1",
    [id],
  );

  const couplesResult = await query(
    `
    SELECT p1.name as person1, p2.name as person2
    FROM couples c
    JOIN participants p1 ON c.person1_id = p1.id
    JOIN participants p2 ON c.person2_id = p2.id
    WHERE c.event_id = $1
  `,
    [id],
  );

  const assignmentsResult = await query(
    `
    SELECT giver.name as giver, receiver.name as receiver
    FROM assignments a
    JOIN participants giver ON a.giver_id = giver.id
    JOIN participants receiver ON a.receiver_id = receiver.id
    WHERE a.event_id = $1
  `,
    [id],
  );

  const giftsResult = await query(
    `
    SELECT g.*, gc.claimed_by
    FROM gifts g
    LEFT JOIN gift_claims gc ON g.id = gc.gift_id
    WHERE g.event_id = $1
  `,
    [id],
  );

  const wishlistStatsResult = await query(
    `SELECT
      COUNT(w.id)::int as total_wishlist_count,
      COUNT(wc.id)::int as claimed_count
    FROM wishlists w
    LEFT JOIN wishlist_claims wc ON w.id = wc.wishlist_id
    WHERE w.event_id = $1`,
    [id],
  );
  const wishlistStats = wishlistStatsResult.rows[0] || { total_wishlist_count: 0, claimed_count: 0 };

  const assignments: Record<string, string[]> = {};
  assignmentsResult.rows.forEach((row) => {
    if (!assignments[row.giver]) {
      assignments[row.giver] = [];
    }
    assignments[row.giver].push(row.receiver);
  });

  const gifts: Record<string, any> = {};
  giftsResult.rows.forEach((row) => {
    gifts[row.id] = {
      id: row.id.toString(),
      name: row.name,
      description: row.description,
      imageDataUrl: row.image_url,
      addedBy: row.added_by,
      claimedBy: row.claimed_by,
    };
  });

  return {
    id: event.id.toString(),
    name: event.name,
    coupleCrossing: event.couple_crossing,
    people: participantsResult.rows.map((p) => p.name),
    couples: couplesResult.rows.map((c) => [c.person1, c.person2]),
    assignments: Object.keys(assignments).length > 0 ? assignments : null,
    gifts,
    date: event.created_at,
    participants: participantsResult.rows.map((p) => p.name),
    eventDate: event.event_date || null,
    wishlistDeadline: event.wishlist_deadline || null,
    featureFlags: event.feature_flags || {},
    planTier: event.plan_tier || 'free',
    coverPhotoUrl: event.cover_photo || null,
    location: event.location || null,
    allowGuestInvites: event.allow_guest_invites || false,
    isPublic: event.is_public || false,
    totalWishlistCount: wishlistStats.total_wishlist_count,
    claimedCount: wishlistStats.claimed_count,
  };
}

export default router;
