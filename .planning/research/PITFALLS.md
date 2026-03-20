# Domain Pitfalls: Gatherly v2.2 UI Rehaul

**Domain:** Adding potluck, onboarding, event schema extensions, and image picker to an existing React Native / Expo Router app
**Researched:** 2026-03-17
**Context:** Subsequent milestone. Existing app has: JWT auth (organizer vs participant discriminant), magic-link join flow, gift wishlists with anonymous claiming, SQLite cache, `_layout.tsx` Stack.Protected auth gating, `EventsContext` reducer, and web + mobile clients sharing one API.

---

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

---

### Pitfall 1: Potluck Signup Race Condition — The Claim System Already Got This Right, But Potluck Is Different

**Feature area:** Potluck module

**What goes wrong:** Two participants tap "Sign up" for the same potluck slot simultaneously. Unlike wishlists (which use `ON CONFLICT DO NOTHING` in `wishlist_claims`), the potluck table is new — and the pattern for anonymous claiming does not carry over automatically.

**Why it happens:** The wishlist claim route (`wishlists.ts:337-350`) already handles this correctly with an atomic `INSERT ... ON CONFLICT DO NOTHING` and a `rowCount === 0` check that returns 409. When the potluck module is built as a new table, the developer models it after the wishlist data model but misses the critical `UNIQUE` constraint on `(slot_id)` or `(slot_id, participant_id)` that makes the ON CONFLICT work. Without that constraint, ON CONFLICT never fires.

**Specific risk in this codebase:** The `event_modules` table already exists; potluck slots will be a new table. The `module_polls` and `module_rsvp_responses` tables both use UNIQUE constraints for their conflict guards. Potluck slots must do the same — but potluck also allows a participant to sign up for *multiple* slots (bring a dish AND drinks), so the constraint shape is `UNIQUE(slot_id, participant_id)` not `UNIQUE(slot_id)`.

**Consequences:** Two people both see "slot available" → both sign up → organizer sees duplicate names → confusion and over-provisioning.

**Prevention:**
- Add `UNIQUE(slot_id, participant_id)` to the potluck signups table (not `UNIQUE(slot_id)` which would allow only one person per item).
- If a slot has a quantity cap (e.g., "need 3 bottles of wine"), enforce the cap inside a transaction using `SELECT COUNT(*) ... FOR UPDATE` before inserting.
- API must return `409` when the slot is full. Mobile must handle 409 with a "someone just took this slot" message and a refresh.
- Do NOT do the cap check in application code outside a transaction — it is a TOCTOU race.

**Warning signs:**
- Potluck signup route does a `SELECT` then `INSERT` without a transaction or FOR UPDATE lock.
- Missing UNIQUE constraint on the new signups table.
- Frontend disables the button on tap but does not handle 409 gracefully.
- No integration test that fires two concurrent signup requests.

---

### Pitfall 2: Potluck Visibility Breaks the Anonymity Model — By Design, But Must Be Explicit

**Feature area:** Potluck module

**What goes wrong:** The potluck module is non-anonymous by design (participants see who signed up for what). But the existing wishlists feature is anonymous (the `wishlists.ts` GET endpoint strips `claimed_by` from the response for the item's own owner). If potluck reuses any wishlist endpoint patterns without understanding this distinction, it accidentally becomes anonymous — or worse, the wishlists endpoint accidentally becomes non-anonymous.

**Why it happens:** The developer sees `wishlists.ts:41-61` returns `isClaimed` and `claimedByMe` but strips `claimedBy` (participant name). They copy this pattern to potluck, not realising potluck must expose `signedUpBy` to everyone. The pattern feels right because it mirrors what they already built.

**Consequences:** Potluck list shows "Someone signed up" instead of "Alice is bringing wine" — the whole point of potluck coordination is lost.

**Prevention:**
- Document the anonymity contract at the route level. Add a comment above each route: `// ANONYMOUS: claimed_by is hidden` (wishlists) vs `// PUBLIC: signed_up_by is visible to all event members`.
- Potluck endpoint must JOIN to participants and return the name directly — no `claimedByMe` pattern needed.
- The `participantId` discriminant on `req.user` must NOT be used to hide potluck data — all event members, including organizers without a `participantId`, should see names.
- Separate API route file (`potluck.ts`) so the different privacy model is obvious from file structure.

**Warning signs:**
- Potluck GET endpoint derived from wishlists GET without removing the `claimedByMe` masking logic.
- A `participantId` check gates potluck name visibility.
- Product spec says "participants see who signed up" but code returns `isClaimed: boolean`.

---

### Pitfall 3: Onboarding Flag Stored in the Wrong Place — Shows Again After Re-login or Token Refresh

**Feature area:** Welcoming onboarding (3 screens, show once after first registration)

**What goes wrong:** Onboarding is gated by a flag stored in `SecureStore` or AsyncStorage on the device. The user installs the app, registers, completes onboarding. They uninstall and reinstall (or sign in on a new phone). The flag is gone — onboarding shows again on every fresh install.

Alternatively: the flag is stored in-memory in the `SessionProvider`. The app is backgrounded and the OS kills it. On next open, `restoreSession()` succeeds (HttpOnly cookie still valid), session is restored — but the in-memory flag reset to `false`. Onboarding shows again.

**Why it happens in this codebase:** `AuthContext.tsx` already stores the access token and user in `SecureStore`. The temptation is to add `onboardingCompleted` to `SecureStore` as well. This works on the same device, but fails after reinstall. The right home is the server: a `users` table column.

**Consequences:** Returning users who reinstall or change phones are forced through onboarding again. Interest selections from the first run are overwritten with defaults.

**Prevention:**
- Store `onboarding_completed` (boolean) on the `users` table, not in SecureStore or AsyncStorage.
- `GET /api/users/me` (already exists as `usersApi.getMe()`) should return this field.
- `_layout.tsx` reads the flag from the user profile after `restoreSession` resolves and redirects to `/onboarding` only when `onboardingCompleted === false`.
- Registration endpoint (`POST /api/auth/register`) sets `onboarding_completed = false` on user creation.
- A dedicated `POST /api/users/me/complete-onboarding` endpoint (or a flag on the existing `PUT /api/users/me`) sets it to `true`.
- SecureStore may be used as a *cache* to avoid a round-trip, but the source of truth must be the server.

**Warning signs:**
- `onboardingCompleted` read from AsyncStorage or SecureStore and never synced to server.
- Onboarding check lives in a `useEffect` that runs before `usersApi.getMe()` has resolved.
- `restoreSession` completes without fetching the user profile — flag is unknown during auth restore.
- No migration adding `onboarding_completed` column to the `users` table.

---

### Pitfall 4: Onboarding Route Interacts Badly with Stack.Protected — Navigation Race

**Feature area:** Welcoming onboarding, `_layout.tsx`

**What goes wrong:** The existing `_layout.tsx` uses `Stack.Protected` with `guard={!!session}` to redirect unauthenticated users. Onboarding must be shown to *authenticated* users who haven't completed it — a third state that `Stack.Protected` doesn't model.

The naive fix is: after `session` is set, redirect to `/onboarding` if the flag is false. But `_layout.tsx` already has a `useEffect` that redirects to `/magic-link/[token]` or `/join` after session resolves (lines 68-87). Adding a third redirect in the same effect creates a race — the magic-link redirect and the onboarding redirect may both fire.

**Why it happens:** `_layout.tsx` has grown to handle several "redirect after auth" scenarios. Each scenario was added incrementally. The 100ms `setTimeout` on lines 73 and 80 was added precisely because Stack.Protected navigation needs to settle first. A third redirect would need the same treatment, and the order of priority is unclear.

**Consequences:**
- User accepts a magic-link invite → onboarding screen intercepts → they never reach the event.
- User registers normally → no onboarding → they land on the main tab with no context.
- Worst case: infinite redirect loop if the onboarding route guard is inconsistent.

**Prevention:**
- Establish a clear redirect priority chain in `_layout.tsx`:
  1. Pending magic token (highest priority — came from an external link)
  2. Pending invite code
  3. Onboarding not completed (lowest priority)
- Only check for onboarding after confirming no pending magic token and no pending invite.
- Make onboarding a `Stack.Protected`-guarded route (auth required, but inside the authenticated stack) — not a separate public route.
- Add `onboarding` to `Stack.Protected guard={!!session}` so unauthenticated users cannot navigate to it directly.
- Onboarding screens should NOT be dismissible by swipe (set `gestureEnabled: false` on the stack screen).

**Warning signs:**
- Multiple `useEffect` blocks in `RootLayoutNav` each attempting `router.replace()`.
- Onboarding route accessible without a session.
- No comment in `_layout.tsx` documenting the redirect priority order.
- No test covering the "registered user receives magic link before completing onboarding" scenario.

---

### Pitfall 5: Optional Schema Fields Cause Type Drift Between API Response and Mobile TEvent Type

**Feature area:** New event fields: `location`, `cover_photo`, `allow_guest_invites`, `is_public`

**What goes wrong:** New columns are added to the `events` table as nullable (correct). The `GET /api/events` query is updated to SELECT them. But `TEvent` in `apps/gatherly-mobile/app/api/events.ts` is not updated, or is updated with non-optional types (`location: string` instead of `location: string | null`). TypeScript compiles fine because `Partial<TEvent>` is used in the update call, but runtime the field is `null` and code that does `event.location.trim()` crashes.

The inverse also happens: the API adds the field but the mobile type still does not include it, so the field is silently dropped by TypeScript's structural typing when the response is used.

**Why it happens in this codebase:** `TEvent` has grown incrementally — compare the `// Phase 22 additions` and `// Phase 24 additions` comments in `apps/gatherly-mobile/app/api/events.ts:36-45`. Each phase adds fields. The pattern is established and safe when done carefully, but `cover_photo` as a potentially large base64 string and `is_public` as a boolean with significant security implications need explicit handling.

**Consequences:**
- `event.location.trim()` crashes at runtime for events that have no location.
- `event.coverPhoto` is undefined in the mobile type but the API sends it — UI never shows cover photos until someone notices the type is missing.
- `event.isPublic` treated as falsy-by-default when it's actually `null` — events accidentally shown as private when the server sets `is_public = true`.

**Prevention:**
- All new event fields must be typed as nullable in `TEvent`: `location?: string | null`, `coverPhoto?: string | null`, `allowGuestInvites?: boolean | null`, `isPublic?: boolean | null`.
- The API response mapper in `events.ts` route must explicitly map `null` values — never rely on `undefined` falling through.
- Add a `// Phase 30 additions` comment block in `TEvent` (matching the existing pattern) so reviewers know which fields were added together.
- The SQLite cache (`lib/cache.ts`) may need schema updates if it columns the events table — check what columns are stored.
- The web app (`apps/web`) also consumes the API; its types need the same update.

**Warning signs:**
- New event columns added to SELECT but `TEvent` not updated.
- Any new field typed as non-nullable when the database column is nullable.
- `event.newField` accessed without null-check anywhere in the codebase.
- No TypeScript error because the field is used only in `?.` chains — masks the type being wrong.

---

## Moderate Pitfalls

Mistakes that cause delays or meaningful rework.

---

### Pitfall 6: Cover Photo Base64 in the Events List Endpoint Destroys Performance

**Feature area:** `cover_photo` event field

**What goes wrong:** `cover_photo` is stored as base64 in the database (matching the existing pattern for wishlist `image_url`). The `GET /api/events` list endpoint already does a complex aggregation query (see `events.ts:11-53`). Adding `e.cover_photo` to the SELECT means every list response carries the full base64 blob for every event, even when the mobile events list only needs to show a small thumbnail.

**Why it happens:** The pattern of storing base64 directly is established in this codebase (wishlists, gift images). It works for single-item fetches. The events list is different — it returns multiple events simultaneously, and the aggregation query is already heavy (json_agg for people, couples, assignments).

**Consequences:**
- Events list API call goes from ~5KB to 500KB+ if events have photos.
- SQLite cache (`lib/cache.ts`) grows unbounded — base64 images take significant space in SQLite.
- `refreshEvents()` (called on every mount of EventsContext) becomes slow.
- Network timeout on poor connections.

**Prevention:**
- In `GET /api/events`, return a `hasCoverPhoto: boolean` or a `coverPhotoThumbnail` (resized to 100px wide), not the full image.
- Full cover photo only returned by `GET /api/events/:id`.
- On the mobile side, compress before upload (expo-image-picker already returns a `uri`; use `ImageManipulator` from `expo-image-manipulator` to resize before converting to base64 or uploading).
- Consider storing URLs instead of base64 if any CDN/object storage is available (future-proofing).
- The existing `body size limit` of 50mb in `server.ts` is there for image uploads — that is acceptable for PUT, not for GET responses.

**Warning signs:**
- `cover_photo` column selected in the list endpoint alongside the `json_agg` aggregations.
- No compression step before upload in the mobile image picker handler.
- `GET /api/events` response size increases by 10x after cover photos are added.
- SQLite cache migration does not limit the `cover_photo` column size.

---

### Pitfall 7: Image Picker Permissions — iOS vs Android Divergence

**Feature area:** Image picker for cover photos

**What goes wrong:** `expo-image-picker` is already used in this codebase for wishlist items. The permission model on iOS 14+ requires `requestMediaLibraryPermissionsAsync()` before `launchImageLibraryAsync()`. The wishlist image picker may have this correct. The cover photo picker, built by a different developer or at a different time, skips the permission check or catches the error silently, causing it to silently return `undefined` on iOS without explaining why.

Android handles permissions differently — `READ_EXTERNAL_STORAGE` is needed on Android < 13, and `READ_MEDIA_IMAGES` on Android 13+. Expo handles this abstraction, but only if `expo-image-picker` plugin is correctly configured in `app.json`/`app.config.js`.

**Why it happens:** Developers test primarily on one platform. The wishlist image picker working on Android does not prove the cover photo picker works on iOS.

**Consequences:**
- Cover photo picker silently does nothing on iOS.
- App rejected from App Store if permissions usage description is missing from `Info.plist` (Expo plugin handles this, but only if configured).
- User taps "Add Photo" → nothing happens → assumes the feature is broken.

**Prevention:**
- Always call `requestMediaLibraryPermissionsAsync()` and check `.status === 'granted'` before calling `launchImageLibraryAsync()`.
- Show a user-facing error if permission is denied with a link to Settings.
- Verify `expo-image-picker` plugin is in `app.json` plugins array (required for Expo managed workflow to inject the permissions strings).
- Test on both iOS simulator and Android emulator. The permission prompt only shows once on a real device — use Expo Go or a development build.
- Reuse the permission-request pattern from the existing wishlist image picker (do not write a second, different implementation).

**Warning signs:**
- Image picker handler has no `await requestMediaLibraryPermissionsAsync()` call.
- `expo-image-picker` not in the plugins array in `app.json`.
- No `NSPhotoLibraryUsageDescription` in the iOS config (Expo plugin adds this automatically, but only when the plugin is listed).
- Image picker tested only in Expo Go, not in a production/dev build (Expo Go has pre-granted permissions).

---

### Pitfall 8: User Interests Stored as Array — Type Mismatch Between PostgreSQL Array and JSON

**Feature area:** User interests on the users table

**What goes wrong:** PostgreSQL has a native array type (`TEXT[]`). It can also store arrays as JSONB. These behave differently in queries. If the migration uses `TEXT[]` but the application code uses `JSON.parse()`, or vice versa, the API returns the interests in a shape the mobile client doesn't expect.

Example: PostgreSQL `TEXT[]` column returns as a JavaScript array when using node-postgres (`pg`). But if the column is JSONB, the `pg` driver returns it as a parsed JavaScript array too. They look the same. The problem emerges when filtering: `WHERE $1 = ANY(interests)` works for `TEXT[]` but fails for JSONB. Building the migration with the wrong type leads to broken queries later.

**Consequences:**
- Interest filtering queries fail silently or throw.
- `usersApi.updateMe()` currently only accepts `name: string` — the interests field will need to be added, and if the type is wrong in the API layer, updates silently drop interests.
- Mobile receives interests as a string `"[\"music\",\"cooking\"]"` instead of an array when JSONB is serialized differently.

**Prevention:**
- Use `TEXT[]` for interests (not JSONB) — it's more ergonomic for a simple list and array operators (`= ANY`, `@>`) are straightforward.
- The migration: `ALTER TABLE users ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}'`.
- The `usersApi.updateMe()` type signature must be updated to accept `interests?: string[]` alongside `name?: string`.
- `UserProfile` type in `apps/gatherly-mobile/app/api/users.ts` must include `interests: string[]`.
- In the PUT handler, pass the array directly — pg will serialize `string[]` to `TEXT[]` correctly. Do not `JSON.stringify()` a TEXT[] column.

**Warning signs:**
- Migration uses `JSONB` for interests instead of `TEXT[]`.
- API handler does `JSON.stringify(interests)` before inserting into a `TEXT[]` column.
- Mobile type has `interests?: any` as a placeholder.
- `usersApi.updateMe()` signature unchanged after interests are added.

---

### Pitfall 9: `_layout.tsx` Onboarding Redirect Fires for Magic-Link (Participant) Sessions

**Feature area:** Onboarding gating, participantId discriminant

**What goes wrong:** The onboarding check reads `user.onboardingCompleted === false` and redirects to `/onboarding`. But magic-link sessions (where `user.participantId !== undefined`) represent guests who joined without registering. They have no account in the users table, so `onboarding_completed` doesn't apply to them. If the check doesn't exclude magic-link sessions, guest participants are bounced to an onboarding flow that wasn't designed for them.

**Why it happens:** The `participantId` discriminant is already used in the API (`events.ts:56`) and in `requireOrganizer` middleware, but it is not always checked in client-side guards. The mobile `_layout.tsx` currently checks `!!session` (truthy access token) without distinguishing organizer vs participant. This pattern has been safe so far, but onboarding gating introduces a case where the distinction matters client-side.

**Consequences:**
- A participant who joined via magic link is sent through an onboarding flow designed for registered users.
- The onboarding tries to call `PUT /api/users/me` to save interests — this call fails with 403 because participant-scoped JWTs don't have a `userId` that maps to the users table.
- The participant is stuck: onboarding can't complete, back navigation is blocked by `gestureEnabled: false`.

**Prevention:**
- In the onboarding redirect logic, check `user.participantId === undefined` (i.e., only redirect organizer/registered user sessions).
- The `User` type from `AuthContext` should expose whether the session is participant-scoped. Currently `authApi` returns a `user` object — ensure it includes enough info to make this check without an extra API call.
- Onboarding completion endpoint (`PUT /api/users/me`) must use `requireOrganizer` or an equivalent check to reject participant-scoped tokens.
- If a magic-link user later registers (the account-linking flow from Phase 27), they get a full user session — that new session's `onboarding_completed` field will correctly be `false`, and onboarding will show at that point (correct behavior).

**Warning signs:**
- Onboarding redirect does not check `user.participantId`.
- `PUT /api/users/me` does not reject requests with a `participantId`-scoped token.
- `onboarding_completed` stored on a field that magic-link sessions could theoretically set.

---

### Pitfall 10: Onboarding Interest Selection — Deselect-All State Is Unhandled

**Feature area:** Welcoming onboarding — Preferences screen

**What goes wrong:** The interest/preference selection UI allows multi-select from a list of tags. The developer handles the "select all" and "deselect some" paths. They do not handle the "deselect all" path: the user deselects every interest and taps Continue. The API receives an empty array, which is valid. But the frontend might guard against `interests.length === 0` and prevent submission, or the API might have a `NOT NULL` constraint on the column that converts `'{}'` to something unexpected.

**Also:** The onboarding preferences screen typically shows a large grid of chip-style buttons. On smaller phones (SE 3rd gen, ~375pt wide), the grid overflows or chips are too small to tap reliably. This is a pure React Native layout issue, not caught on standard simulators.

**Consequences:**
- User deselects all interests → Continue button disabled → user is stuck.
- User on a small screen cannot tap the interest chips → forced to skip or abandon.
- Empty interests array triggers a 500 if the DB column has a NOT NULL but the app sends `[]` (which is valid for `TEXT[]`, but `DEFAULT '{}'` already handles it).

**Prevention:**
- Allow zero interests — it's a valid state. Do not block Continue when `interests.length === 0`.
- Store `[]` (empty array) as the value — it means "user skipped interest selection."
- Test the Preferences screen on a 375pt-wide viewport. Use `flexWrap: 'wrap'` with `gap` spacing rather than a fixed grid. Minimum chip tap target: 44pt tall.
- "Skip" button should be visible and clearly labeled — do not force users to select interests.
- POST-onboarding: if interests are empty, the app should work normally, just without personalization.

**Warning signs:**
- Continue button disabled when `selectedInterests.length === 0`.
- Interest selection screen not tested on iPhone SE viewport (375pt).
- `interests` column has a NOT NULL constraint without DEFAULT.
- No "Skip" affordance on the Preferences screen.

---

## Minor Pitfalls

Mistakes that are fixable quickly but waste time.

---

### Pitfall 11: Potluck Module Not Gated Behind Plan Tier Check on the Mobile Side

**Feature area:** Potluck module, plan tier

**What goes wrong:** The API correctly returns `403 upgrade_required` when a free-tier event tries to enable the potluck module (see `modules.ts:62-67`). The mobile module config screen shows a paywall stub. But if the potluck list screen (`Potluck-List` template) is navigable directly via deep link or by manually constructing the route, it reaches the screen without going through the paywall — and then the API calls fail with 403.

**Prevention:**
- The mobile screen itself should check `event.planTier === 'free'` and render a paywall/upgrade state rather than a loading spinner when the API returns 403.
- Navigation to potluck-related screens from the event details screen should be gated by `planTier` before even trying the route.
- The 403 from the API is the ultimate source of truth, but the UI should degrade gracefully rather than show an error.

**Warning signs:**
- Potluck screen handles API errors generically (`catch → show "Something went wrong"`).
- Navigation to potluck routes not gated by `planTier` in the event details screen.

---

### Pitfall 12: SQLite Cache Schema Does Not Include New Event Columns

**Feature area:** SQLite cache, new event fields

**What goes wrong:** The SQLite cache (`lib/cache.ts`, loaded by `DatabaseContext`) stores events locally for offline use. When new columns are added to `TEvent` (location, cover_photo, etc.), the SQLite table that backs the cache may not have corresponding columns. The cache write silently drops new fields. On the next offline load, the event lacks location/cover-photo data even though it was fetched from the API.

**Prevention:**
- Review `lib/cache.ts` and `lib/database.ts` — check what columns the local events table has.
- Add a database migration for SQLite (using `db.execAsync` with IF NOT EXISTS) for each new event column.
- SQLite migrations must run in `initDatabase()` before the cache is used.
- For `cover_photo`, consider explicitly NOT caching the base64 blob in SQLite (it's large) — cache a flag `has_cover_photo: boolean` and fetch on demand.

**Warning signs:**
- New fields appear in `TEvent` but `lib/database.ts` schema not updated.
- No SQLite migration step in `initDatabase()` for new columns.
- Events loaded from cache missing fields that were returned by the API.

---

### Pitfall 13: `usersApi.updateMe()` Signature Only Accepts `name` — Will Break When Interests and Onboarding Flag Are Added

**Feature area:** User profile, onboarding completion

**What goes wrong:** `apps/gatherly-mobile/app/api/users.ts` currently has `updateMe: async (name: string)` — a positional `name` parameter, not a partial object. When interests and `onboardingCompleted` need to be sent in the same PUT request, the signature must change. Any existing call to `usersApi.updateMe(nameInput.trim())` in `profile.tsx` will break if the function signature changes to accept an object.

**Prevention:**
- Refactor `updateMe` to accept a partial object: `updateMe(patch: { name?: string; interests?: string[]; onboardingCompleted?: boolean })`.
- Update the existing call in `profile.tsx` to: `usersApi.updateMe({ name: nameInput.trim() })`.
- Update the API handler to accept and persist each field independently (not required to send all fields).
- `UserProfile` type needs `interests: string[]` and `onboardingCompleted: boolean` added.

**Warning signs:**
- `updateMe` has a positional `name: string` parameter rather than a partial object parameter.
- Profile screen breaks with a TypeScript error after `updateMe` signature changes.

---

## Phase-Specific Warnings

| Feature Area | Likely Pitfall | Mitigation |
|---|---|---|
| Potluck signup | Race condition — two users claim same slot | UNIQUE constraint + ON CONFLICT + 409 response |
| Potluck visibility | Privacy model inverted from wishlists | Separate route file, explicit "PUBLIC" comment, no claimedByMe pattern |
| Onboarding flag | Stored client-side, lost on reinstall | `onboarding_completed` column on `users` table, returned by `GET /api/users/me` |
| Onboarding routing | Race with magic-link redirect in `_layout.tsx` | Priority chain: magic-link > invite > onboarding |
| Onboarding routing | Fires for participant (magic-link) sessions | Check `user.participantId === undefined` before redirecting |
| New event fields | Null vs undefined type drift in `TEvent` | All new fields typed as `field?: Type | null`, nullable in DB |
| cover_photo in list | Base64 blob bloats list endpoint and SQLite cache | Return `hasCoverPhoto` in list, full blob only in single-event GET |
| Image picker | Silent failure on iOS without permission | `requestMediaLibraryPermissionsAsync` + Expo plugin in `app.json` |
| User interests | PostgreSQL TEXT[] vs JSONB confusion | Use TEXT[], pass JS arrays directly to pg, no JSON.stringify |
| Interest selection | Deselect-all state blocks continuation | Allow empty interests, no minimum selection required |
| SQLite cache | New event columns missing from local schema | Add `execAsync` migrations in `initDatabase()` |
| `usersApi.updateMe` | Positional `name` param incompatible with new fields | Refactor to accept partial object before adding new fields |
| Potluck + plan tier | 403 from API shows generic error on free events | Mobile screens check `planTier` and render paywall state, not error |

---

## Sources

**Codebase analysis (primary source):**
- `apps/gatherly-mobile/app/_layout.tsx` — Stack.Protected auth gating, magic-link redirect chain
- `apps/gatherly-mobile/app/contexts/AuthContext.tsx` — session restore flow, SecureStore usage
- `apps/gatherly-mobile/app/api/events.ts` — `TEvent` type with phase-annotated additions
- `apps/gatherly-mobile/app/api/users.ts` — `updateMe` positional signature
- `apps/api/src/routes/wishlists.ts` — atomic claim pattern with ON CONFLICT DO NOTHING
- `apps/api/src/routes/modules.ts` — plan tier enforcement, PREMIUM_MODULES gating
- `apps/api/src/routes/events.ts` — `participantId` discriminant in list query
- `apps/api/src/db/migrations/011-phase25-modules-polls-rsvp.sql` — module table structure
- `apps/api/src/db/migrations/012-phase27-account-linking.sql` — nullable FK pattern

**Confidence:** HIGH — all critical pitfalls are grounded in specific lines or patterns observed in the codebase, not general advice.
