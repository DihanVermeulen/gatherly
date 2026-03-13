# Phase 29: Phase 27 Still Is Not Working - Research

**Researched:** 2026-03-13
**Domain:** Expo Router deep linking, React Native join flow, invite redemption routing
**Confidence:** HIGH — all findings based on direct codebase inspection

---

## Summary

Phase 27 fixed several issues in `magic-link/[token].tsx` (name-prompt, router.push, refreshEvents). However, Phase 29's CONTEXT describes a fundamentally different failure mode: **the join flow (`join.tsx`) is being bypassed entirely**. When a magic link opens the app, the user sees a welcome/splash screen and is navigated directly to the event without a participant record being created.

The architecture has two separate entry points for invite-related deep links:
1. **`magic-link/[token].tsx`** — handles magic link tokens (48-char) from emails. Calls `/api/auth/magic-link/redeem`. Creates a participant-scoped or user-scoped JWT session.
2. **`join.tsx`** — handles invite codes (21-char nanoid) from QR codes or shared links. Calls `/api/invites/validate` then `/api/invites/:code/accept`. Requires auth (or redirects to sign-in).

The CONTEXT says "the join flow never runs" and users are navigated directly to the event. This points to one of: (a) the deep link URL schema routing tokens to the wrong screen, (b) the `_layout.tsx` useEffect bypassing the join screen, (c) the `magic-link/[token].tsx` navigating to event-details before creating a participant record (because the magic-link screen calls `/redeem` which for first-time invites DOES create a participant record — but only if the invite is still `pending`), or (d) some combination.

**Primary recommendation:** Fix the routing and join flow so that magic-link deep links land on a proper join screen that shows event preview, collects the user's intent (join with account vs. without), and only navigates to event-details after the participant record is confirmed created.

---

## Standard Stack

This phase involves no new libraries. All components are already installed.

### Core (Already Installed)
| Library | Purpose | Notes |
|---------|---------|-------|
| `expo-router` | File-based routing + deep links | `magic-link/[token].tsx` and `join.tsx` already exist |
| `@gluestack-ui/*` | UI components | All needed components present |
| `expo-secure-store` | JWT storage | Session already managed |

### No New Installations Required

---

## Architecture Patterns

### Current Deep Link Flow (As-Built)

```
Email link: https://YOUR_DOMAIN/magic-link/{48-char-token}
  → Web redirect page (apps/web/app/magic-link/[token]/page.tsx)
  → gatherly://magic-link/{token}  OR  exp://…/--/magic-link/{token}
  → Expo Router routes to: apps/gatherly-mobile/app/magic-link/[token].tsx
  → Calls POST /api/auth/magic-link/redeem
  → Creates participant + JWT → signs in → navigates to event-details

QR/link invite: apps/gatherly-mobile/app/join.tsx?token={21-char-code}
  → Calls POST /api/invites/validate
  → Shows event preview
  → User taps Join → POST /api/invites/:code/accept → navigates to event-details
```

### The Two Endpoints Are Not Interchangeable

| Endpoint | URL | Input | Creates Participant? | Returns JWT? |
|----------|-----|-------|---------------------|-------------|
| `/api/auth/magic-link/redeem` | POST | 48-char magic token | Yes (atomically, in transaction) | Yes (participant-scoped or user-scoped) |
| `/api/invites/validate` | POST | 21-char invite code | No | No |
| `/api/invites/:code/accept` | POST | 21-char invite code | Yes | No (just eventId + participantId) |

The magic-link flow creates a participant AND a JWT in one call. The join flow validates first, then accepts, and returns no JWT (relies on existing user session).

### What Phase 27-04 Actually Fixed

Phase 27-04 (`9f05c50`) fixed `magic-link/[token].tsx`:
- Added `name-prompt` state for participant-scoped redemptions
- Changed `router.replace` → `router.push`
- Added `refreshEvents()` after `signIn()`
- Passed `user?.email` to enable user-scoped JWT for QR invites
- Removed `gestureEnabled: false`

**These fixes are already committed and in the current codebase.** Inspecting `apps/gatherly-mobile/app/magic-link/[token].tsx` confirms all changes are present.

### What Phase 29 Describes (The New Failure Mode)

The CONTEXT describes a completely different problem:
> "The join flow is currently being bypassed entirely — the fix is likely in how the pending invite token is stored and consumed when the app opens (pendingInvite module), or in the _layout.tsx useEffect that should redirect to /join after auth"

The user-reported behavior is:
- Deep link opens app correctly
- User sees a **welcome/splash screen** (not the join screen or magic-link screen)
- User is navigated **directly to the event** (event details)
- **No participant record is created**

This means the user is already signed in (has a session), so `Stack.Protected` routes to `(tabs)` instead of the join/magic-link screen. The magic-link URL that opens the app is either:
1. Being ignored (the user lands on the tab bar, not on any invite-specific screen)
2. OR: the `_layout.tsx` useEffect sees the session and calls `consumePendingInviteCode()`, but this only works if the token was stored via `setPendingInviteCode()` first — which only happens in `join.tsx`'s `handleJoin()` when `!session`.

### Root Cause Analysis

**For logged-in users:**
The `_layout.tsx` `useEffect` watching `session` calls `consumePendingInviteCode()` and redirects to `/join?token=...`. But this only fires if something called `setPendingInviteCode()` first. The magic-link screen (`magic-link/[token].tsx`) never calls `setPendingInviteCode()`. So when a logged-in user opens a magic link, the `magic-link/[token].tsx` screen would need to be displayed — but it IS a public route (no Stack.Protected guard), so it should render regardless of auth state.

**The likely real issue:** When the app is already open (background → foreground via deep link), Expo Router may not navigate to the deep-linked route if the URL is not handled correctly. OR, the user's session exists when they open the link, the magic-link screen fires immediately, calls `/redeem`, gets a user-scoped JWT (since they're signed in), calls `signIn()` again (no-op effectively), and calls `router.push('/event-details?id=X')` — which does navigate to event-details. This path DOES work for signing in. But it bypasses the "join" UI (no event preview, no explicit join button tapped).

**For the "no participant record created" case:** The magic-link `/redeem` endpoint for `invite.status === 'pending'` creates a participant. If the invite has already been accepted (status = 'accepted'), it reuses the existing participant. If the participant already exists (name conflict via ON CONFLICT), it updates name and returns existing participant. So participant creation DOES happen via `/redeem`.

**The most likely explanation for "no participant record created":**

The `/redeem` endpoint falls through to the participant-scoped path only when there's no matching user account by email. For a logged-in user opening a magic link:
- `magic-link/[token].tsx` passes `user?.email` to `redeemMagicLink`
- `/redeem` finds the user account by email, issues a user-scoped JWT
- BUT: the participant linking (`UPDATE participants SET user_id = $1 WHERE id = $2`) only runs if the invite had `invite_email` stored
- For QR/link invites (no stored email), the invite's `invite_email` is NULL, so `effectiveEmail` falls back to `clientEmail` (the logged-in user's email)
- This DOES trigger the user-scoped path — but only if the invite is still `pending`

Wait: for the first-time path, the code at line 99-139 creates the participant first, THEN checks the email. So for QR invites with a logged-in user who opens a magic link, the flow is:
1. Token lookup → find invite (status='pending', invite_email=NULL)
2. Create participant from resolvedName (falls back to "Participant" since no email)
3. Accept invite (UPDATE status='accepted')
4. Check effectiveEmail: invite_email is NULL, fall back to clientEmail (user's email)
5. Find user by email → issue user-scoped JWT + link participant

So participant IS created, but with name "Participant" (not the user's real name) because `clientParticipantName` is not provided on the first call from `[token].tsx`.

**But the CONTEXT says no participant record at all.** This suggests the issue may be that the `magic-link/[token].tsx` screen never runs for some users — the deep link navigates to event-details directly without going through the redemption flow.

### Current `join.tsx` Issues vs. CONTEXT Requirements

The CONTEXT's decisions define a new behavior for the join flow that differs from the current implementation:

| Decision | Current State | Required Change |
|----------|--------------|-----------------|
| Logged-out: show "Join with account" OR "Continue without account" | Current join.tsx only has "Log in to Join" button | Add two-option UI for logged-out users |
| Logged-out "Continue without account" → name prompt → join | Not implemented — currently name prompt is only in magic-link screen | Add this path to join.tsx |
| Logged-in: show event preview + Join button (no two options) | Current join.tsx does show event preview + "Join Event" button when signed in | Already correct |
| Success screen auto-dismiss 1-2s → event-details | Current join.tsx uses `router.replace` which breaks back nav | Change to `router.push` |
| Pull-to-refresh sufficient (no auto refreshEvents on join) | Current join.tsx calls `refreshEvents()` in handleJoin | Remove this per decision |
| router.push not router.replace | join.tsx line 98 uses `router.replace` | Fix navigation |

### Current `join.tsx` State (Confirmed by Code Inspection)

The existing `join.tsx`:
- `handleJoin()` redirects to sign-in when not authenticated, saving token via `setPendingInviteCode(token)` ✓
- `_layout.tsx` useEffect redirects to `/join?token=...` after auth resolves ✓
- Auto-join via `useEffect([session, previewData])` fires handleJoin when session appears ✓
- Success navigates via `router.replace` (should be `router.push`)
- No "Continue without account" option
- Name prompt only in magic-link flow, not join flow

### The `magic-link/[token].tsx` vs. `join.tsx` Routing Question

The CONTEXT says magic links should run the "join flow." Currently:
- Magic links → `magic-link/[token].tsx` → calls `/redeem` (creates participant + JWT)
- Join links → `join.tsx` → calls `/validate` then `/accept` (requires session)

The CONTEXT decisions describe having the join flow handle logged-out users with account or without account options. The question is: should magic links be routed to `join.tsx` (with the invite code extracted), or should `magic-link/[token].tsx` be reworked to match the join flow UX?

**Key insight:** Magic link tokens (48-char) cannot be used with the `/api/invites/validate` or `/api/invites/:code/accept` endpoints — those require the 21-char invite code. The magic link token is a separate entity that maps to an invite via `magic_link_tokens.invite_id`.

So the options are:
1. Keep the two-screen architecture and add the join flow UX to `magic-link/[token].tsx`
2. Extract the invite code from `/redeem` response and redirect to `join.tsx?token={inviteCode}`
3. Add a new API endpoint that validates the magic token and returns the invite code

The CONTEXT says the fix is "likely in how the pending invite token is stored and consumed when the app opens." This suggests option 2: the magic-link screen stores the invite code (from the /redeem response or a new lookup endpoint) and redirects to join.tsx.

However, the /redeem endpoint doesn't currently return the invite code in its response. And the CONTEXT decisions describe the join flow UX (event preview + join button) — this matches what `join.tsx` already provides.

### What the CONTEXT Actually Requires

Reading the decisions carefully:

1. **Magic link opens → join screen** (not magic-link screen)
2. Join screen shows: event preview + two options (logged-out) or just Join button (logged-in)
3. "Continue without account" → name prompt → participant created via `/accept` → success → event-details
4. "Join with account" → sign-in → back to join → auto-join as participant
5. The participant is created via the `/api/invites/:code/accept` endpoint (not `/redeem`)
6. After join: navigate to event-details with `router.push`, pull-to-refresh for events list

This is a significant architectural change: the **magic-link screen needs to extract the invite code** and hand off to the **join screen**, which then manages the full flow.

### How to Get the Invite Code from a Magic Token

The backend `/redeem` endpoint knows the invite_id from the token. Options:

**Option A:** Add `inviteCode` to `/redeem` response
- Backend: `SELECT invite_code FROM invites WHERE id = $1` during /redeem processing
- Return `inviteCode` in the JSON alongside `accessToken`/`user`
- Mobile: after /redeem response, navigate to `/join?token={inviteCode}`
- Drawback: /redeem creates the participant, but join.tsx would call `/accept` again (double participant creation) — need to handle idempotently

**Option B:** New `/api/auth/magic-link/lookup` endpoint
- Returns event preview data (like `/invites/validate`) without consuming the token
- Mobile `magic-link/[token].tsx` calls lookup → gets event preview → shows join UI
- On user action, calls `/redeem` (not `/accept`) to create participant + JWT
- Drawback: duplicates invite preview logic; magic-link screen still needs the full join UX

**Option C:** Magic-link screen hosts the full join UX
- `magic-link/[token].tsx` becomes the join screen for magic-link invites
- Shows event preview (fetched via `/redeem` response OR a new lookup endpoint)
- For logged-out: show two options; for logged-in: show Join button
- On join: call `/redeem` (not `/accept`) — this creates participant + JWT atomically
- Drawback: duplicates some join.tsx logic; but makes the most sense architecturally given that magic-link tokens are different from invite codes

**Option D:** Have `magic-link/[token].tsx` redirect to `join.tsx` with the token stored, fetching invite code from a new backend endpoint
- This is what the CONTEXT hints at when mentioning the "pending invite token" approach

Given the CONTEXT decision that the join screen handles all paths, and looking at the current code structure:

- The `join.tsx` already has the right UX shell (event preview, join button state machine)
- It needs: (a) a "Continue without account" path with name prompt, (b) `router.push` instead of `router.replace`, (c) the ability to handle magic-link tokens in addition to invite codes
- OR: `magic-link/[token].tsx` calls a lookup endpoint to get event preview, then presents the join UX itself

**Most pragmatic approach based on CONTEXT decisions:**

The CONTEXT specifies that `join.tsx` should show the two-option UI for logged-out users. The magic-link token needs to reach `join.tsx`. The cleanest path:

1. `/redeem` endpoint: return `inviteCode` in the response (existing invite_code from the invites table)
2. BUT: `/redeem` already creates the participant for first-time invites. If we then call `/accept`, we'd create a duplicate.
3. Alternative: New `/api/auth/magic-link/validate` endpoint that returns event preview WITHOUT creating participant — analogous to `/invites/validate` but for magic tokens
4. `magic-link/[token].tsx` calls the validate endpoint → stores magic token in pendingInvite → redirects to `join.tsx?token={inviteCode}` (the 21-char code from the validate response)
5. `join.tsx` uses the invite code for validate + accept as it does today
6. When user "joins," `/accept` creates the participant (idempotent via ON CONFLICT)

This cleanly decouples the two flows and makes the magic-link screen a "router" that gets the invite code and hands off to the standard join flow.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Invite code lookup from magic token | Custom encrypted token scheme | New `/api/auth/magic-link/lookup` endpoint | Keeps token security on backend |
| Deep link URL parsing | Manual URL regex parsing | `useLocalSearchParams` from expo-router | Already in use, type-safe |
| Auth state during join | Manual session checks | `useSession()` from AuthContext | Already wired to Stack.Protected |

---

## Common Pitfalls

### Pitfall 1: Double Participant Creation
**What goes wrong:** If magic-link/[token].tsx calls `/redeem` (which creates participant) AND then join.tsx calls `/accept` (which also creates participant), you get a duplicate or the ON CONFLICT silently returns the existing one with the wrong name.
**Why it happens:** The two endpoints both create participants as a side effect.
**How to avoid:** Pick ONE creation path. Either `/redeem` creates the participant (magic-link screen handles everything) OR `/accept` creates it (join screen handles everything, magic-link screen only does lookup). Don't mix.
**Warning signs:** Participant records with name "Participant" or email-prefix names appearing in DB.

### Pitfall 2: Stack.Protected Blocking the Join Screen
**What goes wrong:** `join.tsx` and `magic-link/[token].tsx` are public routes in `_layout.tsx` (outside Stack.Protected). But `_layout.tsx` has a `useEffect` that fires when `session` changes, calling `consumePendingInviteCode()` and redirecting. If session is already truthy when the app opens via deep link, this effect fires on mount but `consumePendingInviteCode()` returns null (nothing was stored), so no redirect happens. Then the deep link URL SHOULD route to the magic-link screen. But if the app was already showing `(tabs)` and the deep link came in while it was running in the background, Expo Router may not navigate to the deep-linked URL without explicit `Linking` handling.
**How to avoid:** Expo Router handles deep links automatically for defined routes. The `magic-link/[token].tsx` is registered as a public route (`Stack.Screen name="magic-link/[token]"`). Deep links to `gatherly://magic-link/TOKEN` should be automatically routed by Expo Router to this screen. The issue may be that the app needs to handle the case where it's already running and receives a new deep link.
**Warning signs:** User opens magic link → sees tab bar instead of magic-link screen.

### Pitfall 3: Magic Link Token Consumed on First Call But Reused on Second
**What goes wrong:** `/redeem` is designed to be reusable (non-destructive lookup). But the name-prompt flow calls `/redeem` twice: once without name (returns participant-scoped → shows prompt), once with name (should store name). The first call creates the participant with a bad name; the second call finds `invite.status === 'accepted'` and uses the existing participant record WITHOUT updating the name.
**Why it happens:** The second-call path (`invite.status === 'accepted'`) skips the participant creation/update block entirely — it just reads the existing name.
**How to avoid:** The `/redeem` endpoint needs to handle name updates for the second call on already-accepted invites. OR use the `pendingToken` pattern from Phase 27 where the first call is discarded and only the second call (with name) actually creates the participant.
**Warning signs:** Participant name in DB is "Participant" or email prefix despite user entering their name.

### Pitfall 4: EventsContext Not Providing Participant-Scoped Events
**What goes wrong:** After a magic-link join that creates a participant-scoped JWT, `eventsApi.getAll()` is called. The `/api/events` endpoint query requires `userId` (from JWT). Participant-scoped JWTs have `participantId` but no `userId`. The events query at `apps/api/src/routes/events.ts` uses `req.user.id` which for participant tokens maps to `participantId`.
**How to avoid:** Verify that the `/api/events` endpoint handles participant-scoped tokens correctly and returns the participant's single event. This needs checking.
**Warning signs:** Empty events list after participant-scoped sign-in.

### Pitfall 5: pendingInviteCode Module Variable Reset on Full Reload
**What goes wrong:** The module-level `_pendingInviteCode` variable in `pendingInvite.ts` is reset to null when the JS bundle reloads (e.g., app killed and restarted). If the user is not signed in and needs to sign in before joining, and the app restarts during that flow, the pending code is lost.
**Why it happens:** Module-level variables don't persist across JS engine restarts.
**How to avoid:** Per the CONTEXT, this is acceptable — the deep link URL itself contains the token, and Expo Router will re-route to the magic-link or join screen when the app opens. The pending invite code is only needed for the case where the user navigates to sign-in within the same session.

---

## Code Examples

### Current `/redeem` Response Shapes (Verified)

```typescript
// User-scoped (email match found in users table):
{
  accessToken: string,
  user: {
    id: number,        // users.id
    email: string,
    name: string,
    role: "organizer" | "participant",
    eventId: number,
    eventName: string,
  }
}

// Participant-scoped (no account match):
{
  accessToken: string,
  user: {
    participantId: number,
    eventId: number,
    participantName: string,
    eventName: string,
    role: "participant",
  }
}
```

### `/api/invites/validate` Response Shape

```typescript
{
  eventId: number,
  eventName: string,
  inviteId: number,
  organizerName: string | null,
  participantCount: number,
  eventDate: string | null,
}
```

### New Backend Endpoint Needed: `/api/auth/magic-link/lookup`

To support the join-screen architecture, a new endpoint is needed that:
- Accepts a magic link token (48-char)
- Returns event preview data (like validate) WITHOUT creating participant or consuming token
- Returns the invite_code so the mobile client can navigate to `join.tsx?token={inviteCode}`

```typescript
// POST /api/auth/magic-link/lookup
// Request: { token: string }
// Response:
{
  eventId: number,
  eventName: string,
  inviteCode: string,     // 21-char invite code for passing to join.tsx
  organizerName: string | null,
  participantCount: number,
  eventDate: string | null,
}
```

### `join.tsx` Required Changes

Current state:
- 7-state machine: loading, preview, joining, success, already-joined, invalid, error ✓
- "Log in to Join" button when not signed in ✗ (needs two options)
- No name prompt for "without account" path ✗
- `router.replace` on success ✗ (needs `router.push`)
- Calls `refreshEvents()` after join ✗ (CONTEXT says no; pull-to-refresh is sufficient)

Required additions:
```typescript
// New states needed:
type JoinState =
  | "loading" | "preview" | "name-prompt"   // ← new
  | "joining" | "success" | "already-joined"
  | "invalid" | "error";

// Preview state needs two options when !session:
// Option 1: "Join with account" → setPendingInviteCode(token) + router.push('/sign-in')
// Option 2: "Continue without account" → setState("name-prompt")

// Name-prompt state (only for !session path):
// Input for name + "Continue" button
// On submit: call invitesApi.accept(token, name) → setState("success")
// No signIn() call — user remains unauthenticated (participant-only session NOT needed here)
```

Wait — re-reading the CONTEXT decisions:
> "Continue without account" → show name prompt (full-screen), then join, then success screen, then event details

The `/invites/:code/accept` endpoint does NOT return a JWT. After accepting without an account, the user cannot authenticate (no session). This means "Continue without account" creates the participant record but the user has no session — they cannot view the event details (which is behind Stack.Protected).

Unless: the plan is to NOT sign the user in (keep them logged out) after anonymous join, and event-details is accessible as a public route in that case. But the current `event-details` screen is inside `Stack.Protected`.

OR: the "Continue without account" path actually calls `/api/auth/magic-link/redeem` (which creates a participant AND issues a participant-scoped JWT) — not `/api/invites/:code/accept`.

Given the complexity, the actual decision is likely:
- "Continue without account" goes through the magic-link/redeem path (creates participant + JWT) using the invite_code mapped to a magic token
- OR: the join flow creates a guest session somehow

This is an open question that needs clarification during planning. The most pragmatic implementation: "Continue without account" calls a new backend endpoint or uses the magic-link /redeem to get a participant JWT.

### `event-details` Screen — Login/Register Banner for Participant Sessions

The CONTEXT requires: "Event details screen must have a visible login/sign-up option so participant-only users can upgrade to a full account."

Current `event-details.tsx` needs to detect `user.participantId` and show a banner/button to navigate to sign-in or register.

---

## Architecture Decision: One Flow or Two?

The CONTEXT describes routing everything through `join.tsx`. But there are two token types:
- **Magic link tokens** (48-char): unique per invite, maps to invite via DB. Used to authenticate.
- **Invite codes** (21-char nanoid): the actual invite identifier, used with validate/accept.

**Recommended architecture:**

```
Magic link URL → magic-link/[token].tsx
  → POST /api/auth/magic-link/lookup (NEW ENDPOINT)
    Returns: { inviteCode, eventId, eventName, ... }
  → Store inviteCode as pendingInviteCode
  → Navigate to join.tsx?token={inviteCode}

join.tsx receives token (inviteCode):
  Logged-in user:
    → Show event preview + "Join Event" button
    → Join taps → POST /api/invites/:code/accept (with user.name, user.email)
    → Success → router.push('/event-details?id=X')

  Logged-out user:
    → Show event preview + two options:
      "Join with account" → setPendingInviteCode(token) + router.push('/sign-in')
      "Continue without account" → setState("name-prompt")

    Name-prompt:
      → User enters name
      → POST /api/auth/magic-link/redeem with originalMagicToken + participantName
        (need to store magic token alongside invite code)
      → signIn(accessToken, user) → router.push('/event-details?id=X')
```

This requires storing BOTH the magic token and the invite code temporarily. Alternatively, modify `/api/invites/:code/accept` to also create a participant-scoped JWT (issue token on accept), making the unauthenticated join path complete.

**Simpler alternative:** Keep `magic-link/[token].tsx` as the single entry point and add the join UX (event preview, two options) directly to it. The screen already calls `/redeem` which handles participant creation. This avoids the need for a new lookup endpoint.

---

## Open Questions

1. **"Continue without account" session type:** After an anonymous join, does the user get a participant-scoped JWT (can view event) or stay logged out (cannot view event behind Stack.Protected)? The CONTEXT decisions section states: "Participant-only session: participantId-scoped JWT, limited to viewing the joined event." This means the anonymous path MUST create a JWT — so it must call `/redeem`, not `/accept`.

2. **How does the preview load before `/redeem` is called?** The current `magic-link/[token].tsx` calls `/redeem` immediately. If we want to show an event preview first (like join.tsx does), we need a separate lookup endpoint OR extract the info from the `/redeem` response (but that requires calling it before user input).

3. **Does `magic-link/[token].tsx` get correctly routed when app is backgrounded?** On iOS, custom URL schemes work when app is backgrounded. On Android, `intentFilters` in `app.json` cover `https://YOUR_DOMAIN/magic-link/*`. Both routes are registered in `_layout.tsx` as public `Stack.Screen` entries. This should work, but needs testing.

4. **Invite code availability:** The magic-link lookup approach requires the backend to return the invite code. This is fine since the invite code is not a secret (it's in URLs shared publicly). The magic token is the secret.

5. **Stack.Protected and logged-in users opening magic links:** When a logged-in user opens `gatherly://magic-link/TOKEN`, Expo Router should navigate to `magic-link/[token].tsx` (registered as a public route). The `_layout.tsx` useEffect only fires when `session` changes (not on every mount), so it won't interfere. The screen IS accessible to signed-in users since it's outside Stack.Protected.

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `apps/gatherly-mobile/app/magic-link/[token].tsx` (current state post-27-04)
- Direct code inspection: `apps/gatherly-mobile/app/join.tsx` (current state)
- Direct code inspection: `apps/gatherly-mobile/app/_layout.tsx` (routing logic)
- Direct code inspection: `apps/gatherly-mobile/app/utils/pendingInvite.ts`
- Direct code inspection: `apps/api/src/routes/magicLink.ts` (/redeem endpoint)
- Direct code inspection: `apps/api/src/routes/invites.ts` (validate/accept endpoints)
- Direct code inspection: `apps/api/src/server.ts` (route registration)
- Phase 27 UAT.md (diagnosed gaps and root causes)
- Phase 27-04-SUMMARY.md (confirmed fixes that are already committed)
- `.planning/STATE.md` (decision log)

### Secondary (MEDIUM confidence)
- Expo Router docs (training knowledge): public routes outside Stack.Protected are accessible regardless of auth state; deep links are handled by the router automatically for registered routes.

---

## Metadata

**Confidence breakdown:**
- Current codebase state: HIGH — all files inspected directly
- Root cause of bypassed join flow: MEDIUM — several plausible explanations; exact cause needs runtime testing
- Recommended architecture: MEDIUM — based on CONTEXT decisions and code analysis; open questions remain
- Backend changes needed: HIGH — new lookup endpoint or /redeem response change required
- Frontend changes needed: HIGH — `magic-link/[token].tsx` and `join.tsx` both need changes

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (stable codebase)
