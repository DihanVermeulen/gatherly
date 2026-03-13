# Phase 29: Phase 27 Still Is Not Working - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the Smart Invite Join flow so that opening a magic link actually runs the full join flow, creates a participant record, and leaves the user in the correct state. The deep link opens the app correctly, but the join flow is being bypassed — the user sees a welcome/splash screen and is navigated directly to the event without a participant record being created.

</domain>

<decisions>
## Implementation Decisions

### Root problem
- Opening a magic link opens the app (deep link works), but the join flow never runs
- User is shown a welcome screen and navigated directly to the event
- No participant record is created — user is effectively not added to the event
- Affects all user types: new user (no account), existing user (signed in), existing user (not signed in)

### Join flow — logged-out user
- Show the join screen first (event preview + two options)
- Option 1: "Join with account" → navigate to login/register screen
  - After successful login/register, return to join flow automatically
  - Participant is added using their account name — no second name prompt
- Option 2: "Continue without account" → show name prompt (full-screen), then join, then success screen, then event details

### Join flow — logged-in user
- Navigate straight to join screen (event preview + Join button)
- User taps Join → success screen (auto-dismiss 1–2 seconds) → event details

### Name prompt (participant-only users)
- Full-screen prompt with a text input and Continue button
- Only shown when the user has no account and the participant record has no name yet
- Skip logic: /redeem returns existing participantName if the token already has a participant record → mobile skips the prompt
- Name is saved on the participant record only (not in local storage)

### Session type after join
- Participant-only session: participantId-scoped JWT, limited to viewing the joined event
- Event details screen must have a visible login/sign-up option so participant-only users can upgrade to a full account
- Logged-in user session is unchanged (full user-scoped JWT)

### Post-join navigation and events list
- Success screen: auto-dismisses after 1–2 seconds → navigates to event details (with back navigation intact)
- Events list refresh: user manually pulls to refresh on the Events screen to see newly joined events
- No automatic refreshEvents() call required on join — pull-to-refresh is sufficient

### Back navigation
- After navigating to event details post-join, the user must be able to go back (use router.push, not router.replace)

</decisions>

<specifics>
## Specific Ideas

- The join flow is currently being bypassed entirely — the fix is likely in how the pending invite token is stored and consumed when the app opens (pendingInvite module), or in the _layout.tsx useEffect that should redirect to /join after auth
- The name prompt should only appear for participant-only flows (no account). Account users always use their registered name.
- Participant-only users landing on event details need a way to log in / register from that screen — this is a UI requirement, not just a backend concern

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 29-phase-27-still-is-not-working*
*Context gathered: 2026-03-13*
