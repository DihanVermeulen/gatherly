# Domain Pitfalls: Adding Wishlists, Claiming, and Invites to gatherly

**Domain:** gatherly Gift Exchange Enhancement
**Researched:** 2026-02-06
**Context:** Adding wishlist, claiming, and invite features to existing gatherly application with complex assignment algorithm

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Privacy Leaks Through Claiming Patterns

**What goes wrong:** Claiming mechanism reveals who is buying for whom, breaking the core gatherly anonymity promise.

**Why it happens:** The current system shows "Claimed by: You" immediately when someone claims a gift (line 289 in gifts.tsx). When wishlists become person-specific instead of event-wide, participants can deduce their gatherly by monitoring which gifts get claimed on their wishlist. If Alice sees her wishlist items being claimed, and she knows Bob claimed them, she knows Bob is her gatherly - defeating the entire purpose.

**Consequences:**

- Users lose trust in the application's anonymity guarantee
- Core gatherly experience is ruined
- Negative reviews mentioning "broken" or "reveals who your santa is"
- Potential need to redesign the entire claiming/wishlist flow

**Prevention:**

- NEVER show who claimed a gift until the reveal event date
- Store claim data server-side only, not in client state visible to wishlist owner
- Use assignment verification: Only show claim status to the person who IS assigned to buy for that recipient
- Add timing controls: Wishlists visible only after assignments are generated, claims visible only to the giver
- Consider anonymous claiming: "Someone is buying this" instead of showing names

**Detection Warning Signs:**

- User stories like "view my wishlist and see what's claimed" without role checking
- Database schema where `gift_claims.claimed_by` is exposed in gift GET endpoints
- No assignment-based authorization on gift detail queries
- Frontend state that includes claimer identity for all users

**Phase to address:** Phase 1 (Data Model & Privacy) - must be foundational architecture decision

---

### Pitfall 2: Race Conditions in Gift Claiming

**What goes wrong:** Two participants simultaneously claim the same gift, resulting in double-claiming, which causes one person to buy a duplicate gift unnecessarily.

**Why it happens:** The current claim endpoint (apps/api/src/routes/gifts.ts:133-162) checks if a gift is claimed, then inserts a claim record. This is a classic time-of-check-to-time-of-use (TOCTOU) race condition. During the race window between the SELECT and INSERT, multiple requests can see "no existing claim" and all proceed to claim.

**Real-world evidence:** Per [Race Condition Exploit research](https://www.schneier.com/blog/archives/2015/05/race_condition_.html), race conditions commonly affect applications that apply mathematical functions, and can be exploited when "users can tamper with the sequence of events by applying the same discount code twice at nearly the same moment."

**Consequences:**

- Multiple people claim same gift, causing coordination failures
- Disappointed participants who bought duplicate gifts
- Confusion about who "really" claimed the gift first
- Data inconsistency between gift_claims table and application state
- Trust erosion in the application's reliability

**Prevention:**

```sql
-- Use UNIQUE constraint (already exists: UNIQUE(gift_id) on gift_claims)
-- Combined with INSERT ... ON CONFLICT for atomic claim:

INSERT INTO gift_claims (gift_id, claimed_by)
VALUES ($1, $2)
ON CONFLICT (gift_id) DO NOTHING
RETURNING id, claimed_by;

-- Check rowCount: if 0, claim failed (already taken)
```

Additional strategies:

- Use database transactions with SERIALIZABLE isolation level for claim operations
- Implement optimistic locking with version numbers on gifts
- Return proper HTTP 409 Conflict status when claim fails due to race
- Add retry logic on frontend with exponential backoff
- Show real-time claim updates via WebSocket/polling to reduce race window

**Detection Warning Signs:**

- No transaction wrapper around claim check + insert
- Using READ COMMITTED isolation instead of SERIALIZABLE for claims
- No ON CONFLICT handling in INSERT statements
- Missing integration tests that simulate concurrent claims
- No monitoring/logging for duplicate claim attempts

**Phase to address:** Phase 1 (Data Model & Privacy) - atomic operations must be foundational

---

### Pitfall 3: Data Consistency Between localStorage and API with New Features

**What goes wrong:** The hybrid storage pattern (EventsContext.tsx lines 66-122) breaks down when adding wishlists, claims, and invites because the new features have complex relational data that doesn't serialize/deserialize cleanly between localStorage and PostgreSQL.

**Why it happens:** Current system stores simple event data (name, participants, couples, assignments) which maps 1:1 between localStorage JSON and database tables. But wishlists introduce:

- Per-participant gift lists (one-to-many)
- Claims with timestamps and status (relational integrity)
- Invite tracking with email status, accepted/pending state
- Possible anonymity flags that differ between giver/receiver views

Per [React localStorage sync research](https://www.joshwcomeau.com/react/persisting-react-state-in-localstorage/), major pitfalls include:

- "Schema validation issues: When stored items don't follow the same schema as React state, users with outdated localStorage will experience runtime errors"
- "Synchronization issues between tabs: If users increment in one tab, the other tab will not reflect the localStorage change"
- "Performance problems with rapid updates: localStorage is synchronous and can cause performance issues if state changes too rapidly"

**Consequences:**

- Users switching between online/offline modes see inconsistent data
- Gifts claimed in localStorage mode don't sync to database
- Invites sent while API is down never actually send
- Multi-tab users see stale claim status, leading to double-claims
- Migration from old events without wishlists breaks when loading

**Prevention:**

- **Decision point:** Abandon localStorage fallback for new features OR implement proper sync
  - Option A: Require API for wishlists/claiming/invites (simpler, recommended)
  - Option B: Implement full sync protocol with conflict resolution (complex)
- If keeping localStorage:
  - Use versioned schemas: `{ version: 2, events: [...] }` with migration functions
  - Implement `useSyncExternalStore` for proper React 18+ syncing (not useEffect)
  - Add conflict resolution: last-write-wins with timestamps OR operational transforms
  - Queue write-only operations (like invites) to retry when API available
- Add feature flags to disable features when in localStorage mode
- Show clear UI indicator: "Offline mode - claims and invites disabled"

**Detection Warning Signs:**

- Adding wishlist/claim state directly to localStorage-backed Event type
- No version field in localStorage schema
- useEffect-based sync instead of useSyncExternalStore
- No migration path for existing localStorage events
- No conflict resolution strategy documented
- Tests don't cover localStorage → API → localStorage roundtrip

**Phase to address:** Phase 1 (Data Model & Privacy) - architectural decision affects all subsequent work

---

### Pitfall 4: Assignment Algorithm Broken by Wishlist Requirements

**What goes wrong:** The existing complex assignment algorithm (edit.tsx lines 71-167) fails when participants must receive gifts from their wishlist, because the algorithm doesn't consider gift availability constraints.

**Why it happens:** Current algorithm ensures:

- Each person buys for exactly `giftCount` people
- Each person receives exactly `giftCount` gifts
- Couple constraints are respected
- Balanced distribution via greedy algorithm with backtracking

But adding wishlists creates new constraint: "Each person must receive gifts FROM their wishlist." This transforms the problem from assignment to bipartite matching with capacity constraints - a much harder problem. If Alice's wishlist has only 2 items and she's supposed to receive 3 gifts, the algorithm becomes unsatisfiable.

**Consequences:**

- Assignment generation fails (current behavior: alert after 2000 attempts)
- Users confused why assignments won't generate
- Workaround: users add fake wishlist items just to satisfy algorithm
- Complex debugging: "Why can't it find an assignment?"
- Potential need to rewrite assignment algorithm entirely

**Prevention:**

- **Don't add wishlist constraints to assignment algorithm** (recommended)
  - Keep assignment algorithm unchanged
  - Wishlists are suggestions, not requirements
  - Givers can buy off-wishlist gifts if needed
- If wishlists must be enforced:
  - Validate wishlist coverage BEFORE assignment generation
  - Require minimum wishlist size: `wishlist.length >= giftCount`
  - Add wishlist expansion feature: suggest similar items
  - Change to multi-phase assignment:
    1. Generate giver→receiver assignments (current algorithm)
    2. Separately match gifts to assignments (bipartite matching)
    3. Allow partial matching with clear user communication
- Add algorithm diagnostics: "Alice needs 3 gifts but only has 2 wishlist items"
- Provide admin override: "Generate anyway" with off-wishlist purchases allowed

**Detection Warning Signs:**

- User story: "Users must only receive gifts from their wishlist"
- No validation of wishlist size vs giftCount
- Assignment algorithm modified to consider gift availability
- No failure mode design for unsatisfiable wishlists
- Tests that assume every wishlist is perfectly sized

**Phase to address:** Phase 2 (Wishlist Foundation) - decision needed before implementation

---

### Pitfall 5: Database Migration Breaking Existing Events

**What goes wrong:** Adding new wishlist, claim, and invite tables breaks existing events stored in localStorage or database due to missing foreign key data and schema incompatibility.

**Why it happens:** Current events have:

- `participants` table with just (id, event_id, name)
- `gifts` table at event level, not participant level
- No invite or wishlist tables

New schema needs:

- `wishlists` table linking participants to gifts
- `invites` table with email, status, tokens
- `gifts` potentially moved to per-participant or restructured
- Existing events must continue working without wishlists

Per [database migration best practices](https://planetscale.com/blog/backward-compatible-databases-changes), "You should never couple your database schema and application code changes together. You can perform code deployment first, making sure new code is backward-compatible with existing schema, or perform database migration first, ensuring new schema is backward-compatible with existing code."

**Consequences:**

- Existing events won't load after migration
- Participants can't access their old gatherly events
- Data loss if migration isn't properly rolled back
- Application downtime during migration
- Users angry about losing historical data

**Prevention:**
Use **Expand-Migrate-Contract pattern**:

**Phase 1 - Expand:**

```sql
-- Add new tables with optional relationships
CREATE TABLE wishlists (
  id SERIAL PRIMARY KEY,
  participant_id INTEGER REFERENCES participants(id),
  -- nullable for backward compatibility
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add optional columns to existing tables
ALTER TABLE events ADD COLUMN has_wishlists BOOLEAN DEFAULT FALSE;
ALTER TABLE participants ADD COLUMN invite_token VARCHAR(255) NULL;
```

**Phase 2 - Migrate:**

- New events: Set `has_wishlists = true`, create wishlist entries
- Old events: Leave `has_wishlists = false`, skip wishlist features
- UI: Show "Upgrade this event to use wishlists" button for old events
- Gradual data backfill: Migrate old events on-demand when users request

**Phase 3 - Contract:**

- After 6+ months, consider making wishlists mandatory
- Only if analytics show <5% users still using old events

Additional strategies:

- Add `schema_version` column to events table
- Version-based feature flags: `if (event.schema_version >= 2) { showWishlists() }`
- Database triggers to maintain backward compatibility
- Comprehensive migration tests with real production data samples
- Rollback plan documented and tested

**Detection Warning Signs:**

- No `schema_version` or feature flag on events
- Foreign keys created with NOT NULL on new columns
- No migration testing with existing events
- Missing rollback scripts
- No consideration for localStorage events (they need migration too!)
- Tests only use freshly created events, not old schema

**Phase to address:** Phase 1 (Data Model & Privacy) - must plan migrations from the start

---

## Moderate Pitfalls

Mistakes that cause delays or technical debt.

### Pitfall 6: Mobile Performance Degradation with Image-Heavy Wishlists

**What goes wrong:** Mobile users experience slow load times, memory crashes, and poor scrolling performance when wishlists contain many high-resolution images.

**Why it happens:** Current gift implementation stores images as base64-encoded data URLs (gifts.tsx lines 38-41, schema.sql line 48). Base64 encoding increases file size by ~33%. A 2MB image becomes 2.6MB of base64 text, stored in:

- localStorage (5-10MB limit across entire domain)
- PostgreSQL TEXT column (loaded entirely into memory)
- React state (re-rendered on every state change)
- JSON API responses (no streaming, entire payload buffered)

Per [image optimization research](https://requestmetrics.com/web-performance/high-performance-images/), "Images typically comprise 50 to 90 percent of page weight" and "loading a large 2000-pixel-wide desktop image on a mobile screen that only displays 400 pixels is inefficient and unnecessary."

**Consequences:**

- Mobile Safari crashes on wishlists with >10 images
- API responses timeout (body parser limit is 50mb but network is slow)
- localStorage quota exceeded, causing data loss
- Poor Largest Contentful Paint (LCP) scores, affecting SEO
- Users abandon app due to slowness

**Prevention:**

- **Immediate fixes:**
  - Add image compression before upload (max 800px width, 80% quality)
  - Implement lazy loading: `<img loading="lazy" />` (already available in modern browsers)
  - Use responsive images: Generate thumbnails (150x150) for list view, full size for detail view

  ```typescript
  // Store both thumbnail and full image
  const compressImage = async (
    file: File,
  ): Promise<{ thumb: string; full: string }> => {
    const canvas = document.createElement("canvas");
    const img = await loadImage(file);

    // Thumbnail: 150x150
    canvas.width = 150;
    canvas.height = 150;
    ctx.drawImage(img, 0, 0, 150, 150);
    const thumb = canvas.toDataURL("image/jpeg", 0.7);

    // Full: max 800px width
    const scale = Math.min(1, 800 / img.width);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const full = canvas.toDataURL("image/jpeg", 0.8);

    return { thumb, full };
  };
  ```

- **Better long-term solution:**
  - Move to proper file storage (S3, Cloudinary, or local filesystem)
  - Store URLs instead of base64 in database
  - Use CDN for image delivery
  - Implement WebP/AVIF formats with JPEG fallback
  - Add image upload validation: max 5MB per image, max 10 images per wishlist

- **Performance monitoring:**
  - Track LCP metric in production
  - Monitor API response times for gift endpoints
  - Alert when localStorage usage >80% of quota
  - Add performance budgets: "Wishlist page must load in <3s on 3G"

**Detection Warning Signs:**

- No image size limits in upload handler
- No compression before storage
- base64 images stored in state without lazy loading
- Grid view loads all images immediately (not virtualized)
- No thumbnail generation, always loading full images
- Tests don't include wishlists with >5 images
- No performance testing on mobile devices/slow networks

**Phase to address:** Phase 2 (Wishlist Foundation) or Phase 4 (Mobile Optimization) depending on priority

---

### Pitfall 7: Invite System Email Deliverability and Privacy

**What goes wrong:** Invitation emails go to spam, reveal participant lists to all recipients, or expose the gatherly organizer's email when they want to stay anonymous.

**Why it happens:**

- Sending from app's SMTP server without proper SPF/DKIM/DMARC records
- Using BCC for all participants (some email clients show BCC lists)
- Including full participant list in email body for transparency
- Reply-to pointing to organizer's personal email

Per [gatherly invite research](https://secretsanta.email/), privacy-focused services "do not sell your data or send any marketing emails" and "store information for up to 7 days to allow the draw to take place, then permanently delete."

**Consequences:**

- Invites land in spam, participants never join
- Participants see who else is invited before assignments (ruins surprise)
- Organizer gets reply-all emails asking questions
- Email provider flags account for spam (Yahoo, Gmail)
- GDPR compliance issues if storing email addresses indefinitely

**Prevention:**

**Email Deliverability:**

- Use transactional email service (SendGrid, Postmark, AWS SES)
- Configure SPF/DKIM/DMARC for your domain
- Provide unsubscribe link (required by CAN-SPAM)
- Monitor bounce rates and spam complaints
- Warm up sending domain gradually (don't send 100 invites on day 1)

**Privacy:**

- Send individual emails (never BCC all participants)
- Don't include participant list in email body
- Use tokens for invite acceptance: `/invite/{random_token}` not `/invite?email=alice@example.com`
- Allow organizer to choose display name: "Your gatherly Organizer" vs their real name
- Auto-delete email addresses after event date + 30 days
- Add "View as participant" preview for organizers to check email content

**Email Template Best Practices:**

```html
Subject: You're invited to {Event Name}! Hi {ParticipantName}, You've been
invited to join a gatherly gift exchange: {Event Name} [Accept Invitation Button
→ /invite/{secure_token}] What happens next: 1. Click the button to accept 2.
Create your wishlist (optional) 3. We'll assign Secret Santas on
{AssignmentDate} 4. You'll get a notification with your recipient Questions?
Reply to this email. --- This is an automated message from {AppName}. If you
didn't expect this, you can safely ignore it.
```

**Detection Warning Signs:**

- Using nodemailer with Gmail SMTP (will hit rate limits)
- No email verification before sending invites
- Storing plain-text email addresses without expiration
- No opt-out mechanism
- Invite URLs contain PII (emails, real names)
- No email preview/test function for organizers
- Missing email tracking (sent, bounced, opened, clicked)

**Phase to address:** Phase 3 (Invite System)

---

### Pitfall 8: UX Confusion Around Wishlist Visibility and Timing

**What goes wrong:** Participants see wishlists before assignments are made, or can't access wishlists after assignments, creating confusion about when they can view/edit.

**Why it happens:** No clear timing states defined:

- When can I create my wishlist? (Before or after joining?)
- When can I see others' wishlists? (Immediately? After assignments? Never?)
- When can I see who's buying my gifts? (After reveal date only?)
- Can I edit my wishlist after assignments? (Yes but does giver see updates?)

Per [mobile UX research](https://www.nngroup.com/reports/ecommerce-ux-wishlists-and-gifts/), "gift-related features like wishlists were confusing and inadequate, sometimes leading to embarrassing mishaps like ruining the gift-giver's surprise."

**Consequences:**

- Participants frustrated: "I can't see anyone's wishlist!"
- Privacy leaks: Alice sees Bob's wishlist and guesses he's her Santa
- Edit conflicts: Participant changes wishlist after giver already bought gift
- Support burden: "How does this work?" questions flood organizer
- Abandonment: Users give up due to confusing flow

**Prevention:**

**Define clear states:**

```typescript
enum EventPhase {
  SETUP = "setup", // Organizer adding participants
  INVITE_PENDING = "pending", // Invites sent, waiting for accepts
  WISHLIST_CREATION = "wishlist", // Participants building wishlists
  ASSIGNED = "assigned", // Santas assigned, shopping in progress
  REVEALED = "revealed", // Gift exchange happened, all revealed
}
```

**Visibility matrix:**
| Phase | Can Edit My Wishlist | Can See Others' Wishlists | Can See Assignments | Can See Claims |
|-------|---------------------|--------------------------|---------------------|---------------|
| Setup | No (not invited) | No | No | No |
| Invite Pending | Yes | No | No | No |
| Wishlist Creation | Yes | No | No | No |
| Assigned | Yes\* (with warning) | Only my recipient's | Only mine | Only what I claimed |
| Revealed | No | Yes (all) | Yes (all) | Yes (all) |

\*Warning: "Your gatherly may have already shopped. Changes might not be seen."

**UI indicators:**

```tsx
// Phase banner at top of every page
<PhaseBanner phase={event.phase}>
  {phase === 'wishlist' && "📝 Build your wishlist before {deadline}!"}
  {phase === 'assigned' && "🎅 Time to shop for your recipient!"}
  {phase === 'revealed' && "🎉 Gift exchange complete!"}
</PhaseBanner>

// Disable features based on phase
<WishlistView
  editable={phase !== 'revealed'}
  showWarning={phase === 'assigned' && hasEdits}
/>
```

**Detection Warning Signs:**

- No event phase/state field in database
- Wishlist visibility not tied to assignment status
- No deadline dates for wishlist creation
- Missing state diagram in design docs
- No user testing of the flow
- Support FAQ empty (usually fills up with "when can I..." questions)

**Phase to address:** Phase 2 (Wishlist Foundation) - UX design critical before implementation

---

### Pitfall 9: React Context Performance with Growing Wishlist Data

**What goes wrong:** As events grow to 20+ participants with 10+ gifts each, the EventsContext re-renders slow down the entire app, especially on mobile devices.

**Why it happens:** Current EventsContext stores all events, participants, couples, assignments, and now gifts/wishlists in a single context (EventsContext.tsx). Every state update triggers re-render of ALL consumers, even if they only need one event's data.

Per [React Context performance research](https://www.developerway.com/posts/how-to-write-performant-react-apps-with-context), "Used carelessly, React context becomes invisible global state with costly re-renders" and "many teams use Zustand + React Query together for better performance."

**Consequences:**

- Input lag when typing in wishlist forms
- Slow scrolling in gift grid
- Mobile devices become unresponsive
- Battery drain from excessive re-renders
- Poor user experience, negative reviews

**Prevention:**

**Immediate optimization - Split contexts:**

```typescript
// Instead of one massive EventsContext
// Split into domain-specific contexts

<EventsProvider>          {/* Just event metadata */}
  <WishlistsProvider>      {/* Wishlists for current event only */}
    <InvitesProvider>      {/* Invite state */}
      <App />
    </InvitesProvider>
  </WishlistsProvider>
</EventsProvider>
```

**Use selectors to prevent unnecessary re-renders:**

```typescript
// Bad: Re-renders when ANY event changes
const {
  state: { events },
} = useEvents();
const myEvent = events.find((e) => e.id === id);

// Good: Only re-renders when THIS event changes
const myEvent = useEvent(id); // Custom hook with selector
```

**Consider migration to modern state management:**

- Zustand for client state (lightweight, built-in selectors)
- TanStack Query for server state (caching, optimistic updates, automatic refetching)

```typescript
// Zustand example
const useWishlistStore = create((set) => ({
  wishlists: {},
  addGift: (eventId, gift) =>
    set((state) => ({
      wishlists: {
        ...state.wishlists,
        [eventId]: [...(state.wishlists[eventId] || []), gift],
      },
    })),
}));

// TanStack Query example
const { data: wishlists, mutate } = useQuery({
  queryKey: ["wishlists", eventId],
  queryFn: () => fetchWishlists(eventId),
});
```

**Performance monitoring:**

- Use React DevTools Profiler to identify slow renders
- Add performance markers: `performance.mark('wishlist-render-start')`
- Set performance budgets: Max 100ms interaction-to-next-paint (INP)
- Monitor on low-end Android devices (not just developer MacBooks)

**Detection Warning Signs:**

- Single context holds >5 different data domains
- No memoization of expensive computations
- Context updates on every keystroke
- Missing React.memo on list items
- No virtualization for long lists (>50 items)
- Tests don't measure render counts
- No performance testing with realistic data sizes (20+ events, 200+ gifts)

**Phase to address:** Phase 4 (Mobile Optimization) - after core features work, optimize

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

### Pitfall 10: Wishlist Item Link Rot and Affiliate Confusion

**What goes wrong:** Users add product links to their wishlist items, but links break over time (404s) or contain affiliate tracking codes that reveal identity.

**Why it happens:**

- E-commerce sites change URLs frequently (seasonal products, sold out items)
- Users copy-paste Amazon links containing their personal affiliate tag: `?tag=alices-tag-20`
- Link shorteners expire (bit.ly, tinyurl)

Per [gatherly wishlist research](https://www.wishlists-app.com/blog/best-gatherly-apps-2025), "affiliate links are created from gift ideas entered, which can be confusing to users, and this function should be transparent."

**Consequences:**

- Giver clicks link → 404 error → frustration
- Affiliate tags reveal identity: "This is Alice's Amazon wishlist!"
- Confusion about whether app is making money from affiliate links
- GDPR issues if storing tracking codes without disclosure

**Prevention:**

- Strip URL parameters known to contain tracking/identity:

```typescript
const sanitizeUrl = (url: string): string => {
  const u = new URL(url);
  // Remove common affiliate/tracking params
  const trackingParams = [
    "tag",
    "ref",
    "utm_source",
    "utm_medium",
    "utm_campaign",
  ];
  trackingParams.forEach((param) => u.searchParams.delete(param));
  return u.toString();
};
```

- Validate URLs and show warning if 404:

```typescript
const validateUrl = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
};
// Show: "⚠️ This link may be broken. Please check it."
```

- Encourage product names over links: "Nike Air Max 90, size 10" better than Amazon URL
- Add URL archiving: Store snapshot of product page for reference
- Disclose in privacy policy if app adds affiliate links (don't do this without disclosure!)

**Detection Warning Signs:**

- No URL parsing/sanitization
- Storing raw URLs from user input
- No link validation
- Missing privacy policy about affiliate links (if using them)
- No user education about good wishlist practices

**Phase to address:** Phase 2 (Wishlist Foundation) - nice-to-have, not blocking

---

### Pitfall 11: No Reminder System for Deadlines

**What goes wrong:** Participants forget to create wishlists or buy gifts because there are no reminders, resulting in last-minute chaos.

**Consequences:**

- Low wishlist completion rate
- Organizer manually chasing people: "Please add your wishlist!"
- Last-minute shopping, poor gift quality
- Some participants never buy gifts (awkward)

**Prevention:**

- Automated email reminders:
  - "3 days left to create your wishlist!"
  - "Assignments just made - time to shop!"
  - "Gift exchange is tomorrow - have you bought your gift?"
- In-app notifications with deadlines
- Organizer dashboard showing completion:

```
Wishlists: 8/12 complete
Gifts claimed: 15/24 items
```

- Configurable reminder schedule in event settings

**Detection Warning Signs:**

- No deadline fields in event model
- No background job system for scheduled tasks
- No notification system planned

**Phase to address:** Phase 5 (Polish) - quality of life feature

---

### Pitfall 12: Accessibility Issues on Mobile

**What goes wrong:** Wishlist images have no alt text, forms aren't keyboard navigable, color-only indicators (red/green for claimed) exclude colorblind users.

**Why it happens:** Rushed mobile development without accessibility review.

**Prevention:**

- Required alt text for wishlist images
- Semantic HTML: `<button>` not `<div onClick>`
- ARIA labels: `aria-label="Claim this gift"`
- Text + color for status: "✓ Claimed" not just green background
- Touch targets ≥44x44px for mobile
- Test with screen reader (iOS VoiceOver, Android TalkBack)

**Detection Warning Signs:**

- No alt attributes on images
- Using divs with onClick instead of buttons
- Color-only status indicators
- Small touch targets (<40px)
- No accessibility testing in QA process

**Phase to address:** Phase 4 (Mobile Optimization) - include in mobile work

---

## Phase-Specific Warnings

| Phase Topic         | Likely Pitfall                             | Mitigation                                                    |
| ------------------- | ------------------------------------------ | ------------------------------------------------------------- |
| Phase 1: Data Model | Privacy leak via exposed claim data        | Design authorization rules first, implement query filters     |
| Phase 1: Data Model | Breaking existing events with new schema   | Use expand-migrate-contract pattern, add schema_version field |
| Phase 1: Data Model | Race conditions in claiming                | Use ON CONFLICT, SERIALIZABLE isolation, integration tests    |
| Phase 2: Wishlist   | Algorithm breaks with wishlist constraints | Keep wishlists as suggestions, not hard requirements          |
| Phase 2: Wishlist   | Mobile performance with images             | Implement compression + lazy loading from day 1               |
| Phase 2: Wishlist   | Timing confusion (when can I edit?)        | Design phase state machine before coding                      |
| Phase 3: Invite     | Email deliverability issues                | Use transactional email service, not direct SMTP              |
| Phase 3: Invite     | Privacy leaks in invite emails             | Individual emails, use tokens, no participant lists           |
| Phase 4: Mobile     | Context performance degradation            | Split contexts, consider Zustand + TanStack Query             |
| Phase 4: Mobile     | Image loading slowness                     | Implement thumbnails, responsive images, virtualization       |

---

## Integration-Specific Warnings

### Existing Assignment Algorithm

**Risk:** Wishlist requirements make assignments unsatisfiable
**Warning sign:** Algorithm fails more frequently after wishlist integration
**Test:** Generate assignments for events with varied wishlist sizes (0-20 items)

### Hybrid Storage (localStorage + API)

**Risk:** New features don't sync properly between storage modes
**Warning sign:** Claims made in localStorage mode disappear when API comes online
**Test:** Simulate offline→online transition, verify all data migrates

### Event Phase Transitions

**Risk:** State machine has invalid transitions (e.g., assigned → invite_pending)
**Warning sign:** Users can edit wishlists after reveal, breaking privacy
**Test:** State transition tests for all valid/invalid paths

---

## Sources

**Research Sources:**

Privacy & Anonymity:

- [gatherly Organizer FAQ](https://www.secretsantaorganizer.com/en/faq) - Privacy practices
- [gatherly by Email Privacy](https://secretsanta.email/) - Privacy-first design patterns
- [AppSorteos Security](https://app-sorteos.com/en/gatherly-generator) - Anti-spy mechanisms

Race Conditions & Transactions:

- [Race Condition Exploit - Schneier on Security](https://www.schneier.com/blog/archives/2015/05/race_condition_.html) - Real-world race condition examples
- [PostgreSQL Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html) - Official documentation
- [Race Conditions - PortSwigger](https://portswigger.net/web-security/race-conditions) - Attack patterns and prevention

State Management & Performance:

- [Persisting React State in localStorage - Josh Comeau](https://www.joshwcomeau.com/react/persisting-react-state-in-localstorage/) - Common pitfalls
- [Syncing localStorage with React State](https://www.arvinpoddar.com/blog/syncing-local-storage-with-react-state) - Sync patterns
- [How to Write Performant React Apps with Context](https://www.developerway.com/posts/how-to-write-performant-react-apps-with-context) - Context performance
- [React State Management 2025: Context vs Zustand](https://dev.to/cristiansifuentes/react-state-management-in-2025-context-api-vs-zustand-385m) - Modern alternatives

Database Migrations:

- [Backward Compatible Database Changes - PlanetScale](https://planetscale.com/blog/backward-compatible-databases-changes) - Expand-migrate-contract pattern
- [Evolutionary Database Design - Martin Fowler](https://martinfowler.com/articles/evodb.html) - Migration strategies

Mobile & Performance:

- [How to Optimize Website Images 2026 - Request Metrics](https://requestmetrics.com/web-performance/high-performance-images/) - Image optimization guide
- [Impact of Image Optimization](https://www.androidheadlines.com/2026/01/the-impact-of-image-optimization-on-website-performance.html) - Performance metrics
- [Responsive Images Best Practices 2025](https://dev.to/razbakov/responsive-images-best-practices-in-2025-4dlb) - Modern image techniques

UX & Design:

- [Wishlists, Gift Cards, and Gift Giving - Nielsen Norman Group](https://www.nngroup.com/reports/ecommerce-ux-wishlists-and-gifts/) - UX research
- [Wishlists Design for E-Commerce](https://thestory.is/en/journal/designing-wishlists-in-e-commerce/) - Design patterns
- [Common UI/UX Design Mistakes 2026](https://www.ideapeel.com/blogs/ui-ux-design-mistakes-how-to-fix-them) - What to avoid

**Codebase Analysis:**

- `apps/gatherly/src/contexts/EventsContext.tsx` - Hybrid storage implementation
- `apps/api/src/routes/gifts.ts` - Current claiming logic (race condition vulnerability)
- `apps/gatherly/src/pages/events/edit.tsx` - Assignment algorithm
- `apps/gatherly/src/pages/events/gifts.tsx` - Gift management and claiming UI
- `apps/api/src/db/schema.sql` - Database schema with UNIQUE constraint on gift_claims

**Confidence Level:** HIGH for critical pitfalls (verified with codebase analysis + official documentation), MEDIUM for moderate pitfalls (based on community research + common patterns), MEDIUM-LOW for minor pitfalls (general best practices)
