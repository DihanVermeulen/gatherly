import { Router, Request, Response } from "express";
import { query, getClient } from "../db/connection";
import { asyncHandler } from "../middleware/asyncHandler";
import { authenticateJWT } from "../middleware/auth";
import { requireOrganizer } from "../middleware/requireOrganizer.js";

const router: Router = Router();

const PREMIUM_MODULES = ["white_elephant"];
const FREE_MODULES = ["gift_exchange"];

// GET /api/events/:id/modules — list active modules
router.get(
  "/:id/modules",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await query(
      "SELECT id, event_id, module_type, config, status, sort_order, created_at, updated_at FROM event_modules WHERE event_id = $1 ORDER BY sort_order ASC, created_at ASC",
      [id],
    );
    res.json(
      result.rows.map((r) => ({
        id: r.id,
        eventId: r.event_id,
        moduleType: r.module_type,
        config: r.config,
        status: r.status,
        sortOrder: r.sort_order,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    );
  }),
);

// PUT /api/events/:id/modules — set active modules (batch upsert)
router.put(
  "/:id/modules",
  authenticateJWT,
  requireOrganizer,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { modules } = req.body as {
      modules: Array<{ type: string; config?: object; status?: string }>;
    };

    if (!Array.isArray(modules)) {
      return res.status(400).json({ error: "modules must be an array" });
    }

    // Check plan tier
    const eventResult = await query(
      "SELECT plan_tier FROM events WHERE id = $1",
      [id],
    );
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }
    const planTier = eventResult.rows[0].plan_tier || "free";

    // Validate: free events cannot enable premium modules
    for (const mod of modules) {
      if (planTier === "free" && PREMIUM_MODULES.includes(mod.type)) {
        return res.status(403).json({ error: "upgrade_required" });
      }
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");

      for (let i = 0; i < modules.length; i++) {
        const { type, config = {}, status = "active" } = modules[i];
        await client.query(
          `INSERT INTO event_modules (event_id, module_type, config, status, sort_order)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (event_id, module_type)
           DO UPDATE SET config = EXCLUDED.config, status = EXCLUDED.status, sort_order = EXCLUDED.sort_order, updated_at = NOW()`,
          [id, type, JSON.stringify(config), status, i],
        );
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    const updated = await query(
      "SELECT id, event_id, module_type, config, status, sort_order FROM event_modules WHERE event_id = $1 ORDER BY sort_order ASC",
      [id],
    );
    res.json(
      updated.rows.map((r) => ({
        id: r.id,
        eventId: r.event_id,
        moduleType: r.module_type,
        config: r.config,
        status: r.status,
        sortOrder: r.sort_order,
      })),
    );
  }),
);

// GET /api/events/:id/polls — list polls with options + vote counts
router.get(
  "/:id/polls",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = (req as any).user;

    const pollsResult = await query(
      "SELECT id, question, allow_multiple, deadline, created_at FROM module_polls WHERE event_id = $1 ORDER BY created_at ASC",
      [id],
    );

    const polls = await Promise.all(
      pollsResult.rows.map(async (poll) => {
        const optionsResult = await query(
          `SELECT o.id, o.option_text, o.sort_order,
            COUNT(v.id)::int as vote_count
           FROM module_poll_options o
           LEFT JOIN module_poll_votes v ON v.option_id = o.id
           WHERE o.poll_id = $1
           GROUP BY o.id ORDER BY o.sort_order ASC`,
          [poll.id],
        );

        // Check if current participant has voted
        let myVotes: number[] = [];
        if (user.participantId) {
          const myVotesResult = await query(
            "SELECT option_id FROM module_poll_votes WHERE poll_id = $1 AND participant_id = $2",
            [poll.id, user.participantId],
          );
          myVotes = myVotesResult.rows.map((r: any) => r.option_id);
        }

        return {
          id: poll.id,
          question: poll.question,
          allowMultiple: poll.allow_multiple,
          deadline: poll.deadline,
          createdAt: poll.created_at,
          options: optionsResult.rows.map((o) => ({
            id: o.id,
            optionText: o.option_text,
            sortOrder: o.sort_order,
            voteCount: o.vote_count,
          })),
          myVotes,
          totalVotes: optionsResult.rows.reduce(
            (sum: number, o: any) => sum + o.vote_count,
            0,
          ),
        };
      }),
    );

    res.json(polls);
  }),
);

// POST /api/events/:id/polls — create poll (organizer only)
router.post(
  "/:id/polls",
  authenticateJWT,
  requireOrganizer,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { question, allowMultiple = false, deadline, options } = req.body;

    if (!question?.trim()) {
      return res.status(400).json({ error: "question is required" });
    }
    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: "at least 2 options required" });
    }

    // Ensure polls module exists
    const moduleResult = await query(
      "SELECT id FROM event_modules WHERE event_id = $1 AND module_type = 'polls'",
      [id],
    );
    if (moduleResult.rows.length === 0) {
      return res.status(400).json({ error: "polls module not enabled for this event" });
    }
    const moduleId = moduleResult.rows[0].id;

    const client = await getClient();
    try {
      await client.query("BEGIN");

      const pollResult = await client.query(
        "INSERT INTO module_polls (event_id, module_id, question, allow_multiple, deadline) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [id, moduleId, question.trim(), allowMultiple, deadline || null],
      );
      const poll = pollResult.rows[0];

      for (let i = 0; i < options.length; i++) {
        await client.query(
          "INSERT INTO module_poll_options (poll_id, option_text, sort_order) VALUES ($1, $2, $3)",
          [poll.id, options[i].toString().trim(), i],
        );
      }

      await client.query("COMMIT");

      const optionsResult = await query(
        "SELECT id, option_text, sort_order FROM module_poll_options WHERE poll_id = $1 ORDER BY sort_order ASC",
        [poll.id],
      );

      res.status(201).json({
        id: poll.id,
        question: poll.question,
        allowMultiple: poll.allow_multiple,
        deadline: poll.deadline,
        createdAt: poll.created_at,
        options: optionsResult.rows.map((o) => ({
          id: o.id,
          optionText: o.option_text,
          sortOrder: o.sort_order,
          voteCount: 0,
        })),
        myVotes: [],
        totalVotes: 0,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }),
);

// DELETE /api/events/:id/polls/:pollId — delete a poll (organizer only)
router.delete(
  "/:id/polls/:pollId",
  authenticateJWT,
  requireOrganizer,
  asyncHandler(async (req: Request, res: Response) => {
    const { id, pollId } = req.params;
    const result = await query(
      "DELETE FROM module_polls WHERE id = $1 AND event_id = $2 RETURNING id",
      [pollId, id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Poll not found" });
    }
    res.json({ ok: true });
  }),
);

// POST /api/events/:id/polls/:pollId/vote — cast vote (participant)
router.post(
  "/:id/polls/:pollId/vote",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const { id, pollId } = req.params;
    const { optionIds } = req.body as { optionIds: number[] };
    const user = (req as any).user;

    if (!user.participantId) {
      return res.status(403).json({ error: "participant access required" });
    }
    if (!Array.isArray(optionIds) || optionIds.length === 0) {
      return res.status(400).json({ error: "optionIds required" });
    }

    // Verify poll exists and belongs to event
    const pollResult = await query(
      "SELECT id, allow_multiple FROM module_polls WHERE id = $1 AND event_id = $2",
      [pollId, id],
    );
    if (pollResult.rows.length === 0) {
      return res.status(404).json({ error: "Poll not found" });
    }
    const poll = pollResult.rows[0];

    if (!poll.allow_multiple && optionIds.length > 1) {
      return res.status(400).json({ error: "this poll only allows one vote" });
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");
      // Remove existing votes by this participant for this poll
      await client.query(
        "DELETE FROM module_poll_votes WHERE poll_id = $1 AND participant_id = $2",
        [pollId, user.participantId],
      );
      // Insert new votes
      for (const optionId of optionIds) {
        await client.query(
          "INSERT INTO module_poll_votes (poll_id, option_id, participant_id) VALUES ($1, $2, $3)",
          [pollId, optionId, user.participantId],
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    res.json({ ok: true });
  }),
);

// GET /api/events/:id/rsvp — get all RSVP responses (organizer)
router.get(
  "/:id/rsvp",
  authenticateJWT,
  requireOrganizer,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await query(
      `SELECT r.id, r.status, r.headcount, r.note, r.created_at, r.updated_at,
        p.id as participant_id, p.name as participant_name
       FROM module_rsvp_responses r
       JOIN participants p ON r.participant_id = p.id
       WHERE r.event_id = $1
       ORDER BY r.updated_at DESC`,
      [id],
    );

    const responses = result.rows.map((r) => ({
      id: r.id,
      participantId: r.participant_id,
      participantName: r.participant_name,
      status: r.status,
      headcount: r.headcount,
      note: r.note,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    const totalHeadcount = responses
      .filter((r) => r.status === "accepted")
      .reduce((sum, r) => sum + (r.headcount || 1), 0);

    res.json({
      responses,
      summary: {
        total: responses.length,
        accepted: responses.filter((r) => r.status === "accepted").length,
        declined: responses.filter((r) => r.status === "declined").length,
        maybe: responses.filter((r) => r.status === "maybe").length,
        pending: responses.filter((r) => r.status === "pending").length,
        totalHeadcount,
      },
    });
  }),
);

// POST /api/events/:id/rsvp — submit/update own RSVP (participant)
router.post(
  "/:id/rsvp",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, headcount = 1, note } = req.body;
    const user = (req as any).user;

    if (!user.participantId) {
      return res.status(403).json({ error: "participant access required" });
    }

    const validStatuses = ["accepted", "declined", "maybe", "pending"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "invalid status" });
    }

    await query(
      `INSERT INTO module_rsvp_responses (event_id, participant_id, status, headcount, note)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (event_id, participant_id)
       DO UPDATE SET status = EXCLUDED.status, headcount = EXCLUDED.headcount, note = EXCLUDED.note, updated_at = NOW()`,
      [id, user.participantId, status, headcount, note || null],
    );

    res.json({ ok: true });
  }),
);

// --- POTLUCK MODULE ---

// GET /api/events/:id/potluck/categories — list categories (any event member)
router.get(
  "/:id/potluck/categories",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await query(
      "SELECT id, event_id, name, quantity, food_image_url, suggestion_chips, status, sort_order, created_at, updated_at FROM module_potluck_categories WHERE event_id = $1 ORDER BY sort_order ASC, created_at ASC",
      [id],
    );
    res.json(
      result.rows.map((r) => ({
        id: r.id,
        eventId: r.event_id,
        name: r.name,
        quantity: r.quantity,
        foodImageUrl: r.food_image_url,
        suggestionChips: r.suggestion_chips,
        status: r.status,
        sortOrder: r.sort_order,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    );
  }),
);

// POST /api/events/:id/potluck/categories — create category (organizer only)
router.post(
  "/:id/potluck/categories",
  authenticateJWT,
  requireOrganizer,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
      name,
      quantity = 1,
      foodImageUrl,
      suggestionChips = [],
      status = "draft",
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: "name is required" });
    }
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      return res.status(400).json({ error: "quantity must be a positive integer" });
    }

    const sortResult = await query(
      "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort FROM module_potluck_categories WHERE event_id = $1",
      [id],
    );
    const sortOrder = sortResult.rows[0].next_sort;

    const insertResult = await query(
      `INSERT INTO module_potluck_categories (event_id, name, quantity, food_image_url, suggestion_chips, status, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, event_id, name, quantity, food_image_url, suggestion_chips, status, sort_order, created_at, updated_at`,
      [
        id,
        name.trim(),
        qty,
        foodImageUrl || null,
        JSON.stringify(Array.isArray(suggestionChips) ? suggestionChips : []),
        status,
        sortOrder,
      ],
    );
    const r = insertResult.rows[0];
    res.status(201).json({
      id: r.id,
      eventId: r.event_id,
      name: r.name,
      quantity: r.quantity,
      foodImageUrl: r.food_image_url,
      suggestionChips: r.suggestion_chips,
      status: r.status,
      sortOrder: r.sort_order,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    });
  }),
);

// PUT /api/events/:id/potluck/categories/:catId — update category (organizer only)
router.put(
  "/:id/potluck/categories/:catId",
  authenticateJWT,
  requireOrganizer,
  asyncHandler(async (req: Request, res: Response) => {
    const { id, catId } = req.params;
    const { name, quantity, foodImageUrl, suggestionChips, status, sortOrder } = req.body;

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (name !== undefined) {
      if (!name?.trim()) {
        return res.status(400).json({ error: "name cannot be empty" });
      }
      fields.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (quantity !== undefined) {
      const qty = parseInt(quantity, 10);
      if (isNaN(qty) || qty < 1) {
        return res.status(400).json({ error: "quantity must be a positive integer" });
      }
      fields.push(`quantity = $${idx++}`);
      values.push(qty);
    }
    if (foodImageUrl !== undefined) {
      fields.push(`food_image_url = $${idx++}`);
      values.push(foodImageUrl || null);
    }
    if (suggestionChips !== undefined) {
      fields.push(`suggestion_chips = $${idx++}`);
      values.push(JSON.stringify(Array.isArray(suggestionChips) ? suggestionChips : []));
    }
    if (status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(status);
    }
    if (sortOrder !== undefined) {
      fields.push(`sort_order = $${idx++}`);
      values.push(sortOrder);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: "no fields to update" });
    }

    values.push(catId, id);
    const updateResult = await query(
      `UPDATE module_potluck_categories SET ${fields.join(", ")} WHERE id = $${idx++} AND event_id = $${idx++} RETURNING id, event_id, name, quantity, food_image_url, suggestion_chips, status, sort_order, created_at, updated_at`,
      values,
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: "Category not found" });
    }
    const r = updateResult.rows[0];
    res.json({
      id: r.id,
      eventId: r.event_id,
      name: r.name,
      quantity: r.quantity,
      foodImageUrl: r.food_image_url,
      suggestionChips: r.suggestion_chips,
      status: r.status,
      sortOrder: r.sort_order,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    });
  }),
);

// DELETE /api/events/:id/potluck/categories/:catId — delete category (organizer only)
router.delete(
  "/:id/potluck/categories/:catId",
  authenticateJWT,
  requireOrganizer,
  asyncHandler(async (req: Request, res: Response) => {
    const { id, catId } = req.params;
    const result = await query(
      "DELETE FROM module_potluck_categories WHERE id = $1 AND event_id = $2 RETURNING id",
      [catId, id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json({ ok: true });
  }),
);

// GET /api/events/:id/potluck/signups — list signups (any event member)
router.get(
  "/:id/potluck/signups",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await query(
      "SELECT id, event_id, category_id, participant_name, note, created_at FROM module_potluck_signups WHERE event_id = $1 ORDER BY created_at ASC",
      [id],
    );
    res.json(
      result.rows.map((r) => ({
        id: r.id,
        eventId: r.event_id,
        categoryId: r.category_id,
        participantName: r.participant_name,
        note: r.note,
        createdAt: r.created_at,
      })),
    );
  }),
);

// POST /api/events/:id/potluck/signups — sign up for a slot (organizer or participant)
router.post(
  "/:id/potluck/signups",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { categoryId, participantName, note } = req.body;

    if (!categoryId) {
      return res.status(400).json({ error: "categoryId is required" });
    }
    if (!participantName?.trim()) {
      return res.status(400).json({ error: "participantName is required" });
    }

    const client = await getClient();
    try {
      await client.query("BEGIN");

      // Lock the category row to prevent race conditions
      const catResult = await client.query(
        "SELECT quantity FROM module_potluck_categories WHERE id = $1 AND event_id = $2 FOR UPDATE",
        [categoryId, id],
      );
      if (catResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Category not found" });
      }
      const { quantity } = catResult.rows[0];

      // Count existing signups for this category
      const countResult = await client.query(
        "SELECT COUNT(*)::int AS count FROM module_potluck_signups WHERE category_id = $1",
        [categoryId],
      );
      if (countResult.rows[0].count >= quantity) {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "slot_taken", message: "Slot just taken" });
      }

      const insertResult = await client.query(
        "INSERT INTO module_potluck_signups (event_id, category_id, participant_name, note) VALUES ($1, $2, $3, $4) RETURNING *",
        [id, categoryId, participantName.trim(), note || null],
      );

      await client.query("COMMIT");

      const r = insertResult.rows[0];
      res.status(201).json({
        id: r.id,
        eventId: r.event_id,
        categoryId: r.category_id,
        participantName: r.participant_name,
        note: r.note,
        createdAt: r.created_at,
      });
    } catch (err: any) {
      await client.query("ROLLBACK");
      if (err.code === "23505") {
        return res.status(409).json({ error: "slot_taken", message: "Slot just taken" });
      }
      throw err;
    } finally {
      client.release();
    }
  }),
);

// DELETE /api/events/:id/potluck/signups/:signupId — delete signup (organizer or participant)
router.delete(
  "/:id/potluck/signups/:signupId",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const { id, signupId } = req.params;
    const result = await query(
      "DELETE FROM module_potluck_signups WHERE id = $1 AND event_id = $2 RETURNING id",
      [signupId, id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Signup not found" });
    }
    res.json({ ok: true });
  }),
);

export default router;
