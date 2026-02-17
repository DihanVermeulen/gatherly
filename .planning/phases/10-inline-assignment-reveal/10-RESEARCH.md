# Phase 10: Inline Assignment Reveal - Research

**Researched:** 2026-02-17
**Domain:** Participant-scoped JWT authorization, inline UI reveal, Express route design
**Confidence:** HIGH

---

## Summary

Phase 10 replaces the `/decipher` Base64 code mechanic with a gated inline reveal on the event details page. When a participant authenticates via magic link, their JWT contains `participantId` and `eventId` claims. A new API endpoint (`GET /api/events/:id/my-assignments`) uses those claims to look up and return only that participant's receivers from the `assignments` table. The frontend "Reveal My Assignment" button on the event details page replaces its current navigation to `/decipher` with an inline fetch + reveal interaction.

The existing decipher page is retained unchanged as a legacy path. The decipher route (`/decipher`) remains public and fully functional — organizers distributing printed Base64 codes at physical events can still direct participants there. No changes to the decipher backend or frontend are required.

The entire implementation is additive: one new API endpoint, one new frontend API function, one new TanStack Query hook, and a UI change to the "Your Secret Assignment" section in `EventDetailsPage`. No database schema changes are needed.

**Primary recommendation:** Add `GET /api/events/:id/my-assignments` protected by `authenticateJWT` (no `requireOrganizer`), then replace the decipher button in `EventDetailsPage` with an inline reveal component that fetches from this endpoint.

---

## Standard Stack

No new libraries are needed. This phase uses existing project infrastructure.

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Express + existing middleware | current | New route handler | `authenticateJWT` already handles participant JWT claims |
| TanStack Query v5 | v5 | Client-side data fetching + reveal state | Already the sole query library per Phase 8 decision |
| React 19 + useState | current | Reveal UI state machine | No external state library needed for simple button toggle |
| Tailwind CSS v3 + Konsta UI v5 | current | Styling the reveal card | Existing design system |
| Lucide React | current | Icons (Eye, Gift, Lock, ChevronDown) | Already used in EventDetailsPage |

### No New Installations Required

All required libraries are already in the project. The work is purely additive.

---

## Architecture Patterns

### Recommended Project Structure

```
apps/api/src/routes/
└── events.ts          # Add new route: GET /:id/my-assignments

apps/gatherly/src/
├── api/
│   └── events.ts      # Add myAssignments() API function
├── hooks/
│   └── useEventQueries.ts   # Add useMyAssignmentsQuery() hook
└── pages/events/
    └── details.tsx    # Replace decipher button with inline reveal UI
```

### Pattern 1: Participant-scoped API route

**What:** A new route that uses `req.user.participantId` (from JWT) to scope the database query. The route is protected by `authenticateJWT` only — not `requireOrganizer` — so participants (role=`participant`) can access it but the response is scoped to their own assignments.

**When to use:** Whenever a participant needs their own data from a resource they don't fully own.

**Security check:** The route must verify that `req.user.participantId` belongs to `req.params.id` (the event). Without this, a participant from Event A could query Event B's assignments. The assignments table has both `giver_id` and `event_id`, so the SQL WHERE clause should join both conditions.

**Example:**
```typescript
// GET /api/events/:id/my-assignments
// In apps/api/src/routes/events.ts
router.get(
  "/:id/my-assignments",
  authenticateJWT,
  asyncHandler(async (req: Request, res: Response) => {
    const eventId = parseInt(req.params.id, 10);
    const { participantId } = req.user!;

    // Must be a participant token (not an organizer)
    if (!participantId) {
      return res.status(403).json({ error: "Participant access required" });
    }

    // Verify participant belongs to this event (prevents cross-event access)
    const participantResult = await query(
      "SELECT id FROM participants WHERE id = $1 AND event_id = $2",
      [participantId, eventId]
    );

    if (participantResult.rows.length === 0) {
      return res.status(403).json({ error: "You are not a participant in this event" });
    }

    // Fetch receivers for this giver
    const result = await query(
      `SELECT receiver.name as receiver_name
       FROM assignments a
       JOIN participants receiver ON a.receiver_id = receiver.id
       WHERE a.event_id = $1 AND a.giver_id = $2`,
      [eventId, participantId]
    );

    const receivers = result.rows.map((r) => r.receiver_name);

    if (receivers.length === 0) {
      return res.status(404).json({ error: "No assignments found yet" });
    }

    return res.json({ receivers });
  })
);
```

### Pattern 2: Inline reveal state machine (frontend)

**What:** A button that transitions through states: `idle → loading → revealed | error`. No page navigation — data appears inline on the same card. Critically, revealed data should persist in component state so the user doesn't have to re-tap if they scroll away.

**When to use:** Gated reveal of sensitive data that should not be visible by default.

**Example:**
```typescript
// In EventDetailsPage
type RevealState = "idle" | "loading" | "revealed" | "error" | "no-assignments";

const [revealState, setRevealState] = useState<RevealState>("idle");
const [myReceivers, setMyReceivers] = useState<string[]>([]);

const handleReveal = async () => {
  setRevealState("loading");
  try {
    const data = await eventsApi.getMyAssignments(event.id);
    setMyReceivers(data.receivers);
    setRevealState("revealed");
  } catch (err: any) {
    if (err.response?.status === 404) {
      setRevealState("no-assignments");
    } else {
      setRevealState("error");
    }
  }
};
```

**Note on TanStack Query:** A `useQuery` hook with `enabled: false` and `refetchOnMount: false` could also work, but the imperative approach (`useState` + direct `eventsApi` call) is simpler for a one-shot reveal and matches the existing pattern used for gift claiming in the wishlist page.

### Pattern 3: Role-conditional UI in EventDetailsPage

**What:** The "Your Secret Assignment" section must show different content based on user role:
- **Participant (magic link user):** Show the inline "Reveal My Assignment" button
- **Organizer or unauthenticated:** Show the legacy "View My Assignment" link to `/decipher`

**How role is determined:** `user?.role === "participant"` and `user?.participantId` is set. Organizers have `role: "organizer"` with no `participantId`.

**Example logic:**
```typescript
const isParticipant = user?.role === "participant" && !!user?.participantId;

// In JSX:
{isParticipant ? (
  <InlineRevealSection ... />
) : (
  <button onClick={() => navigate("/decipher")} ...>
    View My Assignment
  </button>
)}
```

### Anti-Patterns to Avoid

- **Exposing all assignments in the endpoint:** The response must only return the authenticated participant's receivers, never the full `assignments` object. Returning all assignments would let participants discover who else is buying for whom.
- **Skipping the event-scoping check:** Always verify `participantId` belongs to the requested `eventId`. A participant's JWT `eventId` claim should match `req.params.id`, but a belt-and-suspenders DB check prevents token misuse.
- **Using TanStack Query for the reveal:** While possible, it's overcomplicated. The reveal is a one-shot user action, not a background sync. `useState` + direct API call is the right pattern.
- **Hiding the decipher page:** Per the phase goal, `/decipher` is retained as a legacy path. Do not add `requireOrganizer` to it or remove it from the router.
- **Revealing in localStorage fallback path:** The new endpoint requires a real JWT with `participantId`. The localStorage/offline-first fallback path (`useApi = false`) cannot support this. The reveal button should only appear when the user is an authenticated participant.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT participant identity | Custom session cookie or localStorage participant ID | `req.user.participantId` from existing `authenticateJWT` middleware | Already implemented in Phase 9; token is in memory via `apiClient` interceptor |
| Route auth | New auth middleware | `authenticateJWT` (existing) with manual `participantId` check | `requireOrganizer` is the wrong middleware (blocks participants); a simple `if (!participantId)` check is sufficient |
| Query caching | Custom cache for revealed receivers | Plain `useState` | One-shot reveal; caching adds complexity with no benefit |

---

## Common Pitfalls

### Pitfall 1: Cross-event assignment access

**What goes wrong:** Participant from Event A authenticates and requests `GET /api/events/99/my-assignments`. Their JWT says `eventId: 42`. Without a DB check, the query joins `assignments` WHERE `giver_id = participantId` without checking `event_id`, potentially returning results from Event 99 if the participant ID happened to be a giver there.

**Why it happens:** The assignments table has `giver_id` as a FK to `participants`, which are event-scoped, but only if the query enforces `event_id` in the WHERE clause.

**How to avoid:** Always include `AND a.event_id = $eventId` in the assignments query AND verify participant belongs to the event upfront (separate SELECT before the assignments query).

**Warning signs:** Omitting `event_id` from the WHERE clause; relying solely on `participantId` being globally unique (it is, via SERIAL, but defense-in-depth matters).

### Pitfall 2: Button visible but endpoint returns 403

**What goes wrong:** An organizer (role=`organizer`) or unauthenticated user sees the "Reveal My Assignment" button and taps it. The endpoint returns 403 because `participantId` is undefined. The UI shows an error state.

**Why it happens:** The button renders for all authenticated users if the role check is omitted.

**How to avoid:** Wrap the inline reveal in `{isParticipant && ...}` and show the legacy decipher button for all other users.

### Pitfall 3: Reveal state lost on re-render

**What goes wrong:** User reveals their assignment, scrolls, comes back — the card shows "idle" state and requires another tap.

**Why it happens:** Component state is reset if the component unmounts (e.g., navigating away and back).

**How to avoid:** Store the revealed receivers in component state (they persist for the session). If the user navigates away and returns, a fresh fetch is acceptable for a reveal mechanic. This is not a significant UX issue — one tap per session is fine.

### Pitfall 4: `no-assignments` vs `assignments not generated`

**What goes wrong:** Organizer hasn't generated assignments yet. The endpoint returns 404. The UI shows "Error revealing assignment" instead of the expected "No assignments yet" message.

**Why it happens:** A single error state doesn't distinguish between "you have no assignment" and "a real API error occurred".

**How to avoid:** Check `err.response?.status === 404` separately and show a friendly "Assignments haven't been generated yet" message. The current EventDetailsPage already has this copy in the `hasAssignments` branch — use the same language.

---

## Code Examples

### New API function (frontend)

```typescript
// Source: existing pattern in apps/gatherly/src/api/events.ts
// Add to eventsApi object:
getMyAssignments: async (eventId: string): Promise<{ receivers: string[] }> => {
  const response = await apiClient.get(`/api/events/${eventId}/my-assignments`);
  return response.data;
},
```

### Reveal UI in EventDetailsPage

```typescript
// Replace the existing "Secret Assignment Section" div:
{/* Secret Assignment Section */}
<div className="mt-4 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-level-1">
  <h3 className="text-base font-bold mb-1">Your Secret Assignment</h3>

  {isParticipant ? (
    // Inline reveal for magic-link participants
    <>
      {revealState === "idle" && (
        <>
          <p className="text-sm text-slate-500 mb-4 leading-relaxed">
            {hasAssignments
              ? "The draw is complete! Reveal who you are surprising this year."
              : "Assignments haven't been generated yet."}
          </p>
          {hasAssignments && (
            <button
              onClick={handleReveal}
              className="w-full flex items-center justify-center gap-2 bg-primary text-black font-bold py-3 rounded-xl shadow-sm shadow-primary/20 active:scale-95 transition-transform"
            >
              <Eye size={18} />
              Reveal My Assignment
            </button>
          )}
        </>
      )}
      {revealState === "loading" && (
        <div className="flex items-center justify-center py-4">
          <Loader className="animate-spin text-primary" size={24} />
        </div>
      )}
      {revealState === "revealed" && (
        <div className="space-y-2">
          <p className="text-sm text-slate-500 mb-2">You are buying gifts for:</p>
          {myReceivers.map((receiver) => (
            <div key={receiver} className="flex items-center gap-3 bg-primary/10 rounded-xl p-3">
              <Gift size={18} className="text-primary shrink-0" />
              <span className="font-bold text-primary">{receiver}</span>
            </div>
          ))}
        </div>
      )}
      {revealState === "no-assignments" && (
        <p className="text-sm text-slate-500">Assignments haven't been generated yet.</p>
      )}
      {revealState === "error" && (
        <p className="text-sm text-red-500">Could not load your assignment. Please try again.</p>
      )}
    </>
  ) : (
    // Legacy decipher path for organizers / unauthenticated
    <>
      <p className="text-sm text-slate-500 mb-4 leading-relaxed">
        {hasAssignments
          ? "The draw is complete! Reveal who you are surprising this year."
          : "Assignments haven't been generated yet. Configure this event to generate secret codes."}
      </p>
      <button
        onClick={() => navigate("/decipher")}
        className="w-full flex items-center justify-center gap-2 bg-primary text-black font-bold py-3 rounded-xl shadow-sm shadow-primary/20 active:scale-95 transition-transform"
      >
        <Eye size={18} />
        View My Assignment
      </button>
    </>
  )}
</div>
```

---

## Current System Analysis (Research Answers)

### Q1: How does the existing decipher/assignment system work?

**DB tables:**
- `assignments (id, event_id, giver_id, receiver_id, code_hash, created_at)` — stores all giver→receiver pairs per event
- `participants (id, event_id, name)` — maps integer IDs to names; giver_id and receiver_id are FKs into this table

**Code flow:**
1. Organizer generates assignments via `POST /api/events/:id/generate` → algorithm runs, rows inserted into `assignments`
2. Organizer copies codes from `GET /api/events/:id/codes` → returns `{ assignments, codes }` where codes are `Base64(person:receiver1,receiver2,...)`
3. Participant uses `/decipher` frontend page → pastes code → `atob()` decodes locally → names displayed (no API call required)
4. The decipher backend route (`POST /api/decipher`) also exists but the frontend deciphers locally with `atob()` — the backend route is redundant for the current use case

**Key finding:** Assignments are stored as integer participant IDs. The new endpoint can join `participants` on `receiver_id` to get names, using `giver_id = participantId` from the JWT.

### Q2: What new API endpoint(s) are needed?

**Single endpoint:** `GET /api/events/:id/my-assignments`

**Auth:** `authenticateJWT` only (no `requireOrganizer`)

**Authorization logic:** `req.user.participantId` must exist and must belong to the event (verify via DB query)

**Response:** `{ receivers: string[] }` — array of receiver names for this giver

**Not needed:** No changes to the existing `/api/events/:id` or `/api/events/:id/codes` routes.

### Q3: Frontend reveal flow

**Trigger:** "Reveal My Assignment" button in the "Your Secret Assignment" card on EventDetailsPage
**States:** `idle → loading → revealed | error | no-assignments`
**Data:** Stored in local `useState` for the session
**No new route or page:** Everything happens inline on `/events/:id`

### Q4: Where does the reveal UI fit in EventDetailsPage?

The existing "Secret Assignment Section" card (lines 159–173 in `details.tsx`) already has a button navigating to `/decipher`. This section is replaced with the conditional logic:
- Participant: show inline reveal states
- Organizer/unauthenticated: show legacy decipher link (unchanged behavior)

The section is already visually well-designed and mobile-first. The reveal content slots in naturally below the heading.

### Q5: Legacy /decipher retention

**Current state:** `/decipher` is a public, unauthenticated page in the router. The frontend (`decipher.tsx`) deciphers locally with `atob()`. The backend `POST /api/decipher` decodes Base64 server-side (but the frontend doesn't use it).

**Plan:** Retain both routes unchanged. No modifications needed. The decipher page remains public and accessible directly from the nav or a printed QR code. Only the button in EventDetailsPage changes behavior for authenticated participants.

### Q6: How does the system know which participant the user is?

The JWT access token (stored in memory via `_accessToken` in `client.ts`) carries `participantId` as a claim. When `authenticateJWT` runs, it populates `req.user.participantId`. The frontend `AuthContext` exposes `user.participantId` (set during magic-link redemption flow).

**Mapping to assignments:** The `assignments` table stores `giver_id` which is the `participants.id`. The JWT `participantId` is exactly this `participants.id` (set in `generateParticipantTokens` in tokenService). So the query is simply `WHERE giver_id = $participantId`.

---

## State of the Art

| Old Approach | Current Approach | Phase | Impact |
|--------------|------------------|-------|--------|
| Base64 code distributed manually | Inline JWT-scoped reveal | Phase 10 | Participants see assignments without copying any code |
| `/decipher` for all users | `/decipher` for organizers only; inline for participants | Phase 10 | Better UX for magic-link participants |

**Retained:**
- `/decipher` page: stays public, no changes needed
- `GET /api/events/:id/codes`: stays organizer-only, no changes needed

---

## Open Questions

1. **Should the reveal be gated by `hasAssignments`?**
   - What we know: `event.assignments` is populated in the event fetch; the details page already uses `hasAssignments` to conditionally display text
   - What's unclear: If assignments exist in the DB but the cached event data is stale, the button might appear disabled incorrectly
   - Recommendation: Gate the reveal button on `hasAssignments` from the event data, and handle the 404 case gracefully if assignments were deleted after page load

2. **Organizer inline reveal?**
   - What we know: Organizers are not participants; they have no `participantId` in their JWT
   - What's unclear: Does an organizer who is also listed as a participant in the event need inline reveal?
   - Recommendation: Out of scope for Phase 10. Organizers can use `/decipher` with their generated code. If needed, Phase 11+ could address organizer participation.

3. **`Loader` icon availability**
   - What we know: `Loader` from lucide-react is used in `magic-link.tsx` already
   - What's unclear: Nothing — it's available
   - Recommendation: Import `Loader` from lucide-react in `details.tsx`

---

## Sources

### Primary (HIGH confidence)

Direct source code analysis — all findings come from reading the actual codebase files. No external documentation was required for this phase because:
- The auth middleware (`auth.ts`) shows exactly what `req.user` contains for participant tokens
- The schema (`schema.sql`) shows the `assignments` table structure
- The `tokenService.ts` shows that `participantId` is `participants.id`
- The `details.tsx` shows exactly where the reveal UI fits
- `requireOrganizer.ts` shows the correct middleware to NOT use (it blocks participants)

### Codebase Files Read

- `apps/api/src/db/schema.sql` — DB tables and indexes
- `apps/api/src/routes/events.ts` — Existing assignment routes and DB query patterns
- `apps/api/src/routes/decipher.ts` — Backend decipher endpoint
- `apps/api/src/routes/magicLink.ts` — Magic link redemption + participant token generation
- `apps/api/src/routes/auth.ts` — Token refresh for participant sessions
- `apps/api/src/middleware/auth.ts` — JWT middleware, req.user shape
- `apps/api/src/middleware/requireOrganizer.ts` — Why NOT to use this for the new route
- `apps/api/src/services/tokenService.ts` — Token payload including participantId
- `apps/gatherly/src/pages/events/details.tsx` — Current EventDetailsPage structure
- `apps/gatherly/src/pages/decipher.tsx` — Legacy decipher page (pure frontend `atob()`)
- `apps/gatherly/src/contexts/AuthContext.tsx` — User state shape
- `apps/gatherly/src/api/auth.ts` — User interface with participantId/eventId
- `apps/gatherly/src/api/client.ts` — Access token memory storage + auth interceptor
- `apps/gatherly/src/hooks/useEventQueries.ts` — TanStack Query pattern for reference
- `apps/gatherly/src/routes.tsx` — Router config (decipher is public)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, everything is existing project infrastructure
- Architecture: HIGH — direct code analysis confirms the JWT claims, DB schema, and middleware patterns
- Pitfalls: HIGH — identified from direct code reading (cross-event access gap, role-conditional rendering)

**Research date:** 2026-02-17
**Valid until:** 60 days — stable codebase, no fast-moving dependencies involved
