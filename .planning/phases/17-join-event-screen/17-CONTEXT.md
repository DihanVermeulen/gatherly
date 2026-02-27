# Phase 17: Join Event Screen - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Handle all states of the invite deep-link join flow: loading, event preview, join action, success, already-joined, and error states. Creating invites, managing invites, and revoking invites are separate phases (16, 18).

</domain>

<decisions>
## Implementation Decisions

### Event preview
- Show: event name, organizer name, participant count, and event date
- Layout: full-screen hero (large event name at top, details below — immersive)
- Hero color: use the event's assigned hero color (same cycling logic as Events list)
- Join button placed below the event card (inline with content, not sticky)

### Flow states & transitions
- **Loading state**: skeleton of the hero area + card while invite data loads (not a bare spinner)
- **Joining state**: full-screen loading overlay while the API call runs (not a button spinner)
- **Success state**: brief success screen (~2 seconds), then auto-navigate — content at Claude's discretion

### Edge cases
- **Already joined**: show a dedicated "already joined" state with a CTA to view the event (not a silent redirect)
- **Invalid or expired invite**: generic message — "This invite is no longer valid" (no distinction between invalid vs. expired)
- **Error state action**: Claude's discretion — prevent the user from feeling stranded
- **Network errors during join**: show inline error below the Join button; after 3 failed attempts, replace with a graphic + "Come back later" message (no more retries)

### Post-join navigation
- After success screen auto-dismisses: navigate to Event Details for the event just joined
- **Unauthenticated users**: show the invite preview with a "Log in to join" CTA (let them see the event before requiring auth)
- After login/register from "Log in to join": auto-join and navigate directly to Event Details (skip second confirmation)
- **Back button**: none — full-screen modal feel (no header back arrow, no close X)

### Claude's Discretion
- Success screen visual design (icon, text, animation)
- Error state navigation action (what CTA to offer when invite is invalid)
- Exact skeleton design for the loading state

</decisions>

<specifics>
## Specific Ideas

- The "Come back later" state after 3 network failures should include a graphic, not just text — feels less broken
- Unauthenticated deep-link flow should auto-complete the join after auth — the intent was clear from the link

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 17-join-event-screen*
*Context gathered: 2026-02-27*
