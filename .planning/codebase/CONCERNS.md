# Codebase Concerns

**Analysis Date:** 2026-02-06

## Tech Debt

**Frontend/Backend Data Sync Fragmentation:**
- Issue: Frontend maintains hybrid storage (API + localStorage) with automatic fallback, but no mechanism to keep them synchronized when both are available
- Files: `apps/gatherly/src/contexts/EventsContext.tsx`, `apps/api/src/routes/events.ts`, `apps/gatherly/src/pages/events/edit.tsx`
- Impact: User edits in localStorage may not persist to API; API updates aren't automatically reflected on client without manual refresh
- Fix approach: Implement bidirectional sync on EventsProvider mount - compare API state with localStorage and reconcile conflicts. Add post-mutation API sync to EventsContext dispatch.

**Duplicate Assignment Generation Algorithm:**
- Issue: Assignment generation logic exists in TWO places - frontend (`apps/gatherly/src/pages/events/edit.tsx` lines 88-147) and backend (`apps/api/src/routes/events.ts` lines 469-531)
- Files: `apps/gatherly/src/pages/events/edit.tsx`, `apps/api/src/routes/events.ts`
- Impact: High maintenance burden; algorithm changes must be made in both places; risk of inconsistent behavior between frontend and API
- Fix approach: Remove frontend assignment generation, always use API endpoint. Frontend should send assignment request and display results.

**Hardcoded API Base URL:**
- Issue: EventsContext checks hardcoded `http://localhost:5001/status` (line 86)
- Files: `apps/gatherly/src/contexts/EventsContext.tsx`
- Impact: Breaks in production where API is not on localhost:5001; environment variable not used for API availability check
- Fix approach: Use `VITE_API_URL` from environment for status check, or extract to configuration.

**Complex Event Data Structure Mapping:**
- Issue: Events returned from API have inconsistent structure - `people` and `participants` both exist with same values (lines 50, 55 in events.ts)
- Files: `apps/api/src/routes/events.ts`, `apps/gatherly/src/api/events.ts`
- Impact: Frontend confusion about which field to use; potential data sync bugs when one is modified but not the other
- Fix approach: Choose one source of truth (either `people` or `participants`). Remove the duplicate field from API responses.

## Known Bugs

**Assignment Generation May Fail Silently:**
- Symptoms: Frontend alerts user after 2000 failed attempts; backend returns 400 error
- Files: `apps/api/src/routes/events.ts` line 469, `apps/gatherly/src/pages/events/edit.tsx` line 88
- Trigger: Large gift-per-person counts relative to participant count; complex couple constraints
- Workaround: User must reduce giftCount or couple constraints and retry

**Base64 Encoding Mismatch Potential:**
- Symptoms: If code generated in frontend (using `btoa()`) is decoded by backend (using `Buffer.from()`), encoding may differ for non-ASCII characters
- Files: `apps/gatherly/src/pages/events/edit.tsx` line 171, `apps/api/src/routes/decipher.ts` line 16
- Trigger: Event participant names with accents or special characters
- Workaround: Avoid special characters in participant names

**Code Reveal State Not Persisted:**
- Symptoms: When navigating away from edit page and returning, all `revealedCodes` toggles reset to hidden
- Files: `apps/gatherly/src/pages/events/edit.tsx` line 17-18
- Trigger: Navigation to other route and back to edit page
- Workaround: None - user must click reveal again

## Security Considerations

**No Input Validation on Participant Names:**
- Risk: SQL injection if names contain special characters (though parameterized queries provide protection)
- Files: `apps/api/src/routes/events.ts` lines 209-224 (participant insertion)
- Current mitigation: Parameterized queries ($1, $2) prevent SQL injection
- Recommendations: Add explicit length limits (max 255 chars per schema); sanitize names to reject SQL keywords/patterns

**No Authentication on API Endpoints:**
- Risk: Anyone with network access can create/modify/delete events; no user isolation
- Files: All files in `apps/api/src/routes/`
- Current mitigation: None
- Recommendations: Add user authentication (JWT or session-based); isolate events by user_id

**Base64 Codes Not Unique/Time-Limited:**
- Risk: Codes are deterministic (base64 of `person:receivers`); same event generates same codes every time
- Files: `apps/gatherly/src/pages/events/edit.tsx` line 171, `apps/api/src/routes/events.ts` line 592
- Current mitigation: None
- Recommendations: Add code_hash to assignments table for tracking; optionally expire codes after X days

**Large Base64 Images in Database:**
- Risk: Gift images stored as base64 in `image_url` TEXT column; no size limits enforced; body-parser limit of 50mb is excessive
- Files: `apps/api/src/server.ts` line 14-15, `apps/api/src/db/schema.sql`
- Current mitigation: Body size limit of 50mb
- Recommendations: Implement image size validation (max 5mb); use separate file storage service; or compress images before storage

## Performance Bottlenecks

**N+1 Query in Event Fetching:**
- Problem: GET /api/events/:id route runs 5+ separate queries (event, participants, couples, assignments, gifts) that could be combined
- Files: `apps/api/src/routes/events.ts` lines 70-111
- Cause: No query optimization; separate SELECT for each relationship
- Improvement path: Use single query with multiple JOINs or query batching; consider PostgreSQL JSON aggregation like in GET /api/events list endpoint

**Complex JSON Aggregation Query Slow on Large Events:**
- Problem: GET /api/events/:id list query uses nested json_object_agg for assignments (lines 24-33); expensive with 100+ assignments
- Files: `apps/api/src/routes/events.ts` lines 9-44
- Cause: SQL performs nested subquery in json aggregation
- Improvement path: Pre-construct JSON in application layer; use simpler aggregation or split into two queries

**Frontend Assignment Generation Blocks UI:**
- Problem: Assignment generation loop (2000 attempts) runs synchronously, freezing React UI
- Files: `apps/gatherly/src/pages/events/edit.tsx` lines 88-147
- Cause: Long-running algorithm in event handler without yielding to browser
- Improvement path: Move to Web Worker or use `requestIdleCallback`; show progress indicator

**No Pagination on Event Queries:**
- Problem: GET /api/events loads ALL events every time; no limit or offset
- Files: `apps/api/src/routes/events.ts` lines 9-44
- Cause: No pagination implemented
- Improvement path: Add limit/offset parameters; implement cursor-based pagination

## Fragile Areas

**EventsContext Reducer with Complex State Updates:**
- Files: `apps/gatherly/src/contexts/EventsContext.tsx`
- Why fragile: Manual localStorage sync in useEffect (lines 118-122); refreshEvents doesn't sync state on failure (line 113 only sets useApi flag); state can diverge between context and localStorage
- Safe modification: Add invariant checks for state consistency; test all paths with API unavailable/available transitions
- Test coverage: No unit tests for EventsContext; only integration via components

**Event Edit Page State Management:**
- Files: `apps/gatherly/src/pages/events/edit.tsx`
- Why fragile: Multiple independent useState hooks (editingEvent, selectedCouples, coupleCrossing, etc.) must stay synchronized (line 11-18); removing a person must also remove them from couples (line 68)
- Safe modification: Consolidate state into single reducer; add invariant checks when modifying people/couples
- Test coverage: No unit tests for this page

**Database Cascade Deletes:**
- Files: `apps/api/src/db/schema.sql`
- Why fragile: All foreign keys use ON DELETE CASCADE; deleting a participant cascades to couples and assignments
- Safe modification: Verify deletion in UI before executing; add soft deletes if audit trail needed; test cascade behavior
- Test coverage: No tests for cascade behavior

**Couple Validation Relies on Array Comparison:**
- Files: `apps/gatherly/src/pages/events/edit.tsx` line 113
- Why fragile: `giverCouple === receiverCouple` compares array references, not values; fails if same couple created twice
- Safe modification: Compare couple values by converting to sorted string or hash
- Test coverage: No tests for couple matching logic

**Frontend-Only Validation of Gift Count:**
- Files: `apps/gatherly/src/pages/events/edit.tsx` lines 77-83
- Why fragile: Client-side check for `totalGiftsNeeded > people.length * (people.length - 1)` can be bypassed if user submits via API; backend has same validation but frontend should trust it
- Safe modification: Trust backend validation only; remove frontend check or just display warning
- Test coverage: No tests for validation logic

## Scaling Limits

**Connection Pool Limited to 20 Connections:**
- Current capacity: 20 concurrent PostgreSQL connections
- Limit: Under 100+ concurrent users, connection pool exhaustion
- Files: `apps/api/src/db/connection.ts` line 9
- Scaling path: Increase pool max (line 9); use read replicas for GET queries; add connection pooling middleware (pgBouncer)

**Assignment Generation 2000-Attempt Loop:**
- Current capacity: Works for ~20 participants with reasonable gift counts
- Limit: With 50+ participants and high coupling, algorithm may exhaust all 2000 attempts
- Files: `apps/api/src/routes/events.ts` line 469, `apps/gatherly/src/pages/events/edit.tsx` line 88
- Scaling path: Implement more efficient algorithm (backtracking with pruning); increase max attempts; use constraint solver library

**In-Memory State for Events:**
- Current capacity: Frontend stores entire event history in localStorage; ~50 events with 100 participants each is ~5mb
- Limit: localStorage typically 5-10mb per origin; large event histories will fail to persist
- Files: `apps/gatherly/src/contexts/EventsContext.tsx` line 120
- Scaling path: Implement pagination; use IndexedDB for larger datasets; archive old events

**Base64 Image Storage:**
- Current capacity: 50mb request limit means only large base64 images
- Limit: No per-image limit; storing 10 images at 5mb each fills entire storage allocation
- Files: `apps/api/src/server.ts` line 14
- Scaling path: Implement image compression; use separate blob storage; validate image dimensions

## Dependencies at Risk

**React 19 Peer Dependency Warnings:**
- Risk: React 19 is very new; some libraries haven't updated peer dependencies
- Impact: Build warnings; potential incompatibility with certain libraries (react-query, react-use)
- Files: `apps/gatherly/package.json` line 18
- Migration plan: Monitor peer dependency updates; consider using Suspense API instead of react-query

**Old React-Query v3:**
- Risk: React Query 3 is outdated (current is v5); significant API differences
- Impact: Missing performance optimizations (automatic garbage collection, better caching)
- Files: `apps/gatherly/package.json` line 21
- Migration plan: Upgrade to React Query v5 or switch to TanStack Query; test all data fetching

**Deprecated `react-scripts` in Create React App:**
- Risk: CRA is in maintenance mode; not recommended for new projects
- Impact: No new features; Vite would be faster and more modern
- Files: `apps/gatherly/package.json` line 23
- Migration plan: Consider migrating to Vite; would require config updates but faster build/dev

**Node-based pg Library (deprecated in favor of pg3):**
- Risk: No major updates expected; synchronous API not recommended
- Impact: No async pooling helpers; manual connection management required
- Files: `apps/api/package.json` line 23
- Migration plan: Consider pg3 or use Drizzle ORM for better async support

## Missing Critical Features

**No Undo/Redo:**
- Problem: User deletes event or clears participants; no recovery option
- Blocks: Complex workflows; high error impact
- Fix approach: Implement soft deletes in database; add undo endpoint; maintain edit history

**No Concurrent Edit Conflict Resolution:**
- Problem: If two users edit same event simultaneously, last write wins (no conflict detection)
- Blocks: Multi-user scenarios; shared events could be corrupted
- Fix approach: Add optimistic locking (version field); detect conflicts before UPDATE; show merge UI

**No Event Search/Filter:**
- Problem: With 100+ events, no way to find specific event
- Blocks: Usability at scale
- Fix approach: Add search by name; filter by date range; add favorites/tags

**No Event Sharing/Permissions:**
- Problem: Each user sees their own events in localStorage; no way to share with others
- Blocks: Collaborative event planning
- Fix approach: Add event_user_id mapping; implement share with link; add permissions model

**No Audit Trail:**
- Problem: No record of who changed what when
- Blocks: Debugging data issues; user accountability
- Fix approach: Add events_audit table; log all mutations with user_id, timestamp, old/new values

## Test Coverage Gaps

**No Tests for EventsContext:**
- What's not tested: API availability detection, localStorage fallback, state mutations, refresh logic
- Files: `apps/gatherly/src/contexts/EventsContext.tsx`
- Risk: Context could silently fail to sync with API; users lose data on fallback to localStorage
- Priority: High

**No Tests for Assignment Generation Algorithm:**
- What's not tested: Couple constraint logic, gift balance validation, 2000-attempt loop edge cases
- Files: `apps/gatherly/src/pages/events/edit.tsx` lines 88-147
- Risk: Assignments could violate constraints (e.g., couples not crossing when enabled); undetected until user tries to use
- Priority: High

**No Tests for Event Edit Page:**
- What's not tested: Person add/remove, couple add/remove, event persistence, navigation
- Files: `apps/gatherly/src/pages/events/edit.tsx`
- Risk: Refactoring could break core workflows; regressions go unnoticed
- Priority: High

**Minimal API Tests:**
- What's not tested: Event CRUD endpoints, couple constraints, assignment generation, error cases
- Files: `apps/api/src/__tests__/server.test.ts` has only 2 basic tests
- Risk: API contract changes could break frontend; business logic bugs in endpoints go undetected
- Priority: High

**No Integration Tests:**
- What's not tested: Full workflows (create event → add people → generate assignments → share codes)
- Files: No integration test suite
- Risk: Regressions in complex multi-step flows; API/frontend integration bugs
- Priority: Medium

**No E2E Tests for Critical Flows:**
- What's not tested: End-to-end event creation/participation/assignment generation
- Files: Cypress config exists but no meaningful tests in `apps/gatherly/cypress/`
- Risk: User-facing bugs go undetected until production
- Priority: Medium

---

*Concerns audit: 2026-02-06*
