# Architecture Research

**Domain:** gatherly App - Wishlist, Claiming, and Invite Features
**Researched:** 2026-02-06
**Confidence:** HIGH

## Integration with Existing Architecture

The gatherly app currently has a solid foundation with:

- **Database:** PostgreSQL with events, participants, couples, assignments, gifts, gift_claims tables
- **Backend:** Express API with transaction support and hybrid storage
- **Frontend:** React 19 with EventsContext (reducer pattern), React Router 7
- **Data Flow:** Hybrid localStorage/API pattern with automatic fallback

The new features (wishlists, claiming, invites) integrate cleanly by extending this architecture rather than replacing it.

```
┌─────────────────────────────────────────────────────────────────┐
│                       Frontend Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ EventsContext│  │WishlistsCtx? │  │ InvitesCtx?  │          │
│  │  (existing)  │  │  (option A)  │  │  (option A)  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                    │
│         └─────────────────┴─────────────────┘                    │
│                          OR                                      │
│                Extended EventsContext (option B)                 │
├─────────────────────────────────────────────────────────────────┤
│                        API Layer                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ /events  │  │ /gifts   │  │/wishlists│  │ /invites │        │
│  │(existing)│  │(existing)│  │  (new)   │  │  (new)   │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
├───────┴──────────────┴─────────────┴──────────────┴─────────────┤
│                      Database Layer                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  events  │  │  gifts   │  │ wishlists│  │  invites │        │
│  │participants  │gift_claims  │wish_items│  │          │        │
│  │  couples │  │          │  │          │  │          │        │
│  │assignments   │          │  │          │  │          │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema Integration

### Recommended Schema Changes

**Option A: Separate Wishlists Table (RECOMMENDED)**

Create a new `wishlists` table separate from the existing `gifts` table.

```sql
-- Wishlists table (per-participant wish lists)
CREATE TABLE IF NOT EXISTS wishlists (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    url TEXT,  -- Link to product page
    claimed_by INTEGER REFERENCES participants(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, participant_id, name)  -- Prevent duplicate items
);

CREATE INDEX IF NOT EXISTS idx_wishlists_event_id ON wishlists(event_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_participant_id ON wishlists(participant_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_claimed_by ON wishlists(claimed_by);

-- Invites table (track participant join status)
CREATE TABLE IF NOT EXISTS invites (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, accepted, declined
    invite_code VARCHAR(255) UNIQUE,  -- Shareable link token
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, participant_id)
);

CREATE INDEX IF NOT EXISTS idx_invites_event_id ON invites(event_id);
CREATE INDEX IF NOT EXISTS idx_invites_invite_code ON invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_invites_status ON invites(status);

-- Trigger for updated_at
CREATE TRIGGER update_wishlists_updated_at
    BEFORE UPDATE ON wishlists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invites_updated_at
    BEFORE UPDATE ON invites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

**Why separate wishlists from gifts?**

- **Clear separation of concerns:** Gifts table can remain event-wide gift pool (optional), wishlists are per-participant
- **Different semantics:** Gifts are "things anyone could want," wishlists are "things I specifically want"
- **Claiming logic differs:** Gift claiming is first-come-first-served, wishlist claiming is "I'll buy this for you"
- **Backward compatible:** Existing gifts table remains unchanged

**Option B: Extend Gifts Table (NOT RECOMMENDED)**

Add `participant_id` column to existing `gifts` table to mark owner.

```sql
ALTER TABLE gifts ADD COLUMN participant_id INTEGER REFERENCES participants(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_gifts_participant_id ON gifts(participant_id);
```

**Why not recommended:**

- Mixes two different concepts (event-wide gifts vs. personal wishlists)
- Breaking change: existing code expects gifts to be event-level, not participant-level
- Harder to query ("show me all wishlists" vs "show me event gifts")
- Less clear data model

### Backward Compatibility Strategy

**Safe Migration Path:**

1. **Add new tables** (wishlists, invites) - zero impact on existing functionality
2. **Keep existing tables** (gifts, gift_claims) - all current features continue working
3. **Gradual adoption** - new features use new tables, old features use old tables
4. **Optional migration** - later, could migrate data from gifts → wishlists if desired

**Rollback safety:**

- All new columns/tables are nullable or have defaults
- Existing queries don't touch new tables
- Can drop new tables without breaking existing app

## API Endpoints

### New Endpoints

**Wishlists:**

```
GET    /api/events/:id/wishlists           # Get all wishlists for event
GET    /api/events/:id/wishlists/:participantId  # Get wishlist for specific participant
POST   /api/events/:id/wishlists           # Add item to participant's wishlist
PUT    /api/events/:id/wishlists/:itemId   # Update wishlist item
DELETE /api/events/:id/wishlists/:itemId   # Delete wishlist item
POST   /api/events/:id/wishlists/:itemId/claim    # Claim wishlist item
DELETE /api/events/:id/wishlists/:itemId/claim    # Unclaim wishlist item
```

**Invites:**

```
GET    /api/events/:id/invites              # Get all invites for event
POST   /api/events/:id/invites              # Create/send invite
PUT    /api/events/:id/invites/:inviteId    # Update invite status
GET    /api/invites/:code                   # Get invite by code (for joining)
POST   /api/invites/:code/accept            # Accept invite
POST   /api/invites/:code/decline           # Decline invite
```

### Integration with Existing Routes

**Extend existing routes:**

- `GET /api/events/:id` - include invite_status, wishlist_count in response
- `POST /api/events` - optionally auto-create pending invites for initial participants
- `PUT /api/events/:id` - when adding participants, optionally create invites

## Frontend State Management

### Option A: Extend EventsContext (RECOMMENDED)

**Rationale:**

- Wishlists and invites are tightly coupled to events
- Single source of truth for all event-related data
- Matches existing pattern (gifts already managed in EventsContext)
- Simpler for developers (one hook for everything)

**Changes needed:**

```typescript
// Extended Event type
type Event = {
  id: string;
  name: string;
  coupleCrossing: boolean;
  people: string[];
  couples: [string, string][];
  assignments: Record<string, string[]> | null;
  gifts: Record<string, Gift>;
  wishlists: Record<string, WishlistItem[]>; // NEW: key = participant name
  invites: Record<string, Invite>; // NEW: key = participant name
  date: string;
  participants: string[];
};

type WishlistItem = {
  id: string;
  participantId: string;
  name: string;
  description?: string;
  imageDataUrl?: string;
  url?: string;
  claimedBy?: string;
  createdAt: string;
};

type Invite = {
  id: string;
  participantId: string;
  status: "pending" | "accepted" | "declined";
  inviteCode: string;
  sentAt: string;
  respondedAt?: string;
};

// New actions
type EventsAction =
  | { type: "ADD_EVENT"; payload: Event }
  | { type: "UPDATE_EVENT"; payload: Event }
  | { type: "DELETE_EVENT"; payload: string }
  | { type: "SET_EVENTS"; payload: Event[] }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | {
      type: "ADD_WISHLIST_ITEM";
      payload: { eventId: string; item: WishlistItem };
    } // NEW
  | {
      type: "UPDATE_WISHLIST_ITEM";
      payload: { eventId: string; item: WishlistItem };
    } // NEW
  | {
      type: "DELETE_WISHLIST_ITEM";
      payload: { eventId: string; itemId: string };
    } // NEW
  | {
      type: "CLAIM_WISHLIST_ITEM";
      payload: { eventId: string; itemId: string; claimedBy: string };
    } // NEW
  | { type: "UPDATE_INVITE"; payload: { eventId: string; invite: Invite } }; // NEW
```

**Performance considerations:**

- EventsContext already handles large event objects with gifts
- Wishlists are participant-scoped (max ~10-20 items per person)
- Invites are small (one per participant)
- Total context size remains manageable for typical gatherly events (5-50 participants)

### Option B: Separate Contexts (NOT RECOMMENDED for this app)

Create `WishlistsContext` and `InvitesContext` separate from EventsContext.

**When to use:**

- If wishlists grow very large (hundreds of items per participant)
- If wishlists need to be accessed across multiple events
- If invite system becomes complex with reminders, notifications, etc.

**Why not recommended here:**

- Adds complexity (3 contexts instead of 1)
- Data synchronization issues (what if event is deleted but wishlists remain?)
- More prop drilling / more hooks to remember
- Overkill for gatherly use case

## Data Flow Patterns

### Wishlist Item Claiming Flow

**Scenario:** User Alice claims a wishlist item from Bob's wishlist.

```
1. User Action (Alice clicks "Claim" on Bob's item)
   ↓
2. Optimistic Update (UI immediately shows "Claimed by Alice")
   ↓
3. API Call (POST /api/events/:id/wishlists/:itemId/claim)
   ↓
4a. Success Path:
    - Backend validates (item not already claimed)
    - Updates wishlists table (claimed_by = Alice's participant_id)
    - Returns updated item
    - Frontend confirms optimistic update
    ↓
4b. Failure Path:
    - Backend returns 400 "Already claimed"
    - Frontend rolls back optimistic update
    - Shows error message "This item was just claimed by someone else"
```

**Implementation with useOptimistic (React 19):**

```typescript
const [optimisticWishlists, addOptimisticClaim] = useOptimistic(
  wishlists,
  (state, { itemId, claimedBy }) => ({
    ...state,
    [itemId]: { ...state[itemId], claimedBy },
  }),
);

async function handleClaim(itemId: string, claimedBy: string) {
  // Optimistic update
  addOptimisticClaim({ itemId, claimedBy });

  try {
    // API call
    await wishlistsApi.claim(eventId, itemId, claimedBy);
    // Success - refresh from server to confirm
    await refreshEvent(eventId);
  } catch (error) {
    // Rollback happens automatically
    showError("This item was just claimed by someone else");
  }
}
```

**Why optimistic updates for claiming:**

- Instant feedback improves UX (feels fast)
- Claiming is low-risk (worst case: rollback and retry)
- Reduces perceived latency in claim "race conditions"

### Invite Flow

**Scenario:** Organizer creates event and sends invites.

```
1. Event Creation
   ↓
2. Add Participants (names only, no authentication yet)
   ↓
3. Generate Invites (POST /api/events/:id/invites)
   - Creates invite records with unique codes
   - Status: 'pending'
   ↓
4. Share Invite Links
   - https://app.com/invite/abc123xyz
   ↓
5. Participant Clicks Link
   - GET /api/invites/abc123xyz
   - Shows event details, participant name
   ↓
6. Participant Accepts/Declines
   - POST /api/invites/abc123xyz/accept
   - Updates status to 'accepted', sets responded_at
   ↓
7. Participant Creates Wishlist
   - Now can add items to their wishlist
   - Can view others' wishlists (if accepted)
```

**Invite Status Display:**

- Organizer dashboard shows invite status per participant
- Pending: gray icon, "Invite sent"
- Accepted: green icon, "Joined"
- Declined: red icon, "Declined"

### Hybrid Storage Considerations

The existing app has hybrid localStorage/API storage. New features should maintain this pattern.

**Wishlists in localStorage:**

```typescript
// LocalStorage structure
{
  events: [
    {
      id: "1",
      name: "Family gatherly 2026",
      wishlists: {
        "Alice": [
          { id: "w1", name: "Book", claimedBy: "Bob", ... }
        ],
        "Bob": [
          { id: "w2", name: "Mug", claimedBy: null, ... }
        ]
      },
      invites: {
        "Alice": { status: "accepted", inviteCode: "abc123", ... },
        "Bob": { status: "pending", inviteCode: "xyz789", ... }
      }
    }
  ]
}
```

**Fallback behavior:**

- If API available: fetch wishlists from PostgreSQL
- If API unavailable: use localStorage wishlists
- On claim: if API available, POST to API; if not, update localStorage only
- Sync on reconnect: when API comes back online, sync localStorage → API

## Architectural Patterns

### Pattern 1: Optimistic Updates with Rollback

**What:** Update UI immediately, assuming success, then rollback if server rejects.

**When to use:**

- User actions that should feel instant (claiming, unclaiming)
- Operations that rarely fail
- When you can easily revert UI state

**Trade-offs:**

- **Pro:** Feels fast, great UX
- **Con:** User might see "flash of incorrect state" on rollback
- **Con:** Need careful error handling

**Example:**

```typescript
async function claimItem(itemId: string, claimedBy: string) {
  // 1. Optimistic update
  dispatch({
    type: "CLAIM_WISHLIST_ITEM",
    payload: { eventId, itemId, claimedBy },
  });

  try {
    // 2. Server call
    await wishlistsApi.claim(eventId, itemId, claimedBy);
  } catch (error) {
    // 3. Rollback on error
    dispatch({
      type: "UNCLAIM_WISHLIST_ITEM",
      payload: { eventId, itemId },
    });
    throw error;
  }
}
```

### Pattern 2: Junction Table for Many-to-Many

**What:** Use separate table with foreign keys to connect two entities.

**When to use:**

- Many-to-many relationships (participants ↔ wishlists, events ↔ invites)
- When relationship needs metadata (claimed_at, status)

**Example (already used in app):**

```sql
-- Existing pattern: couples table
CREATE TABLE couples (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id),
    person1_id INTEGER REFERENCES participants(id),
    person2_id INTEGER REFERENCES participants(id)
);

-- New pattern: wishlists table
CREATE TABLE wishlists (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id),
    participant_id INTEGER REFERENCES participants(id),
    claimed_by INTEGER REFERENCES participants(id),
    -- ... other columns
);
```

**Trade-offs:**

- **Pro:** Flexible, can add metadata easily
- **Pro:** Enforces referential integrity
- **Con:** Requires JOIN queries (slightly slower)

### Pattern 3: Unique Tokens for Shareable Links

**What:** Generate unique, unguessable codes for invite links.

**When to use:**

- Invite systems where users need sharable URLs
- When you want simple "magic link" auth (no password)

**Example:**

```typescript
// Backend: Generate invite code
function generateInviteCode(): string {
  return crypto.randomBytes(16).toString("hex"); // abc123xyz...
}

// Frontend: Share link
const inviteLink = `${window.location.origin}/invite/${invite.inviteCode}`;
```

**Trade-offs:**

- **Pro:** Simple, no password needed
- **Pro:** Shareable via any channel (email, SMS, messaging)
- **Con:** Anyone with link can access (fine for gatherly)
- **Con:** Codes should be long enough to prevent guessing (32+ chars recommended)

## Anti-Patterns

### Anti-Pattern 1: Nested Context Providers

**What people do:** Create separate contexts for wishlists, invites, gifts, events, then nest them deeply.

```typescript
// AVOID THIS
<EventsProvider>
  <WishlistsProvider>
    <InvitesProvider>
      <GiftsProvider>
        <App />
      </GiftsProvider>
    </InvitesProvider>
  </WishlistsProvider>
</EventsProvider>
```

**Why it's wrong:**

- Performance issues (re-renders cascade down)
- Data synchronization hell (event deleted, but wishlists remain)
- Developer confusion (which context has what data?)

**Do this instead:**

- Single EventsContext with all event-related data (wishlists, invites, gifts)
- Or use external state library if truly needed (Zustand, Jotai)

### Anti-Pattern 2: Storing Denormalized Data in Database

**What people do:** Store `claimedBy: "Alice"` (name) instead of `claimed_by: 42` (participant_id).

**Why it's wrong:**

- What if Alice changes her name?
- Can't enforce referential integrity
- Harder to query ("find all items claimed by participant X")

**Do this instead:**

- Always use foreign keys (participant_id)
- JOIN to get names when needed for display

### Anti-Pattern 3: No Rollback Plan for Optimistic Updates

**What people do:** Show optimistic UI update but never handle failure case.

```typescript
// AVOID THIS
function claimItem(itemId: string) {
  setClaimedBy("Alice"); // Optimistic
  api.claim(itemId, "Alice"); // Fire and forget - what if this fails?
}
```

**Why it's wrong:**

- User sees incorrect state
- Confusing when item shows as claimed but server says unclaimed
- Lost trust in UI accuracy

**Do this instead:**

- Always handle errors
- Roll back optimistic update on failure
- Show clear error message

### Anti-Pattern 4: Breaking Backward Compatibility Unnecessarily

**What people do:** Modify existing `gifts` table to add `participant_id`, breaking all existing queries.

**Why it's wrong:**

- Breaks existing features
- Requires migration of all existing data
- Risky deployment (all-or-nothing)

**Do this instead:**

- Add new tables (wishlists) instead of modifying existing ones
- Keep old features working while adding new features
- Gradual migration path if needed

## Integration Points

### External Services (Future)

| Service                       | Integration Pattern               | Notes                                         |
| ----------------------------- | --------------------------------- | --------------------------------------------- |
| Email (SendGrid, etc.)        | Event-driven (new invite created) | Send invite emails with magic links           |
| Push Notifications            | WebSockets or polling             | Notify when someone claims your wishlist item |
| Image Upload (S3, Cloudinary) | Direct upload + URL storage       | Replace base64 images with CDN URLs           |

**Not needed for MVP:**

- Real-time updates (polling is fine for gatherly)
- Complex notification system (email is enough)

### Internal Boundaries

| Boundary                     | Communication                     | Notes                          |
| ---------------------------- | --------------------------------- | ------------------------------ |
| EventsContext ↔ API          | REST calls with async/await       | Existing pattern works well    |
| localStorage ↔ EventsContext | Direct read/write on state change | Keep hybrid fallback           |
| Components ↔ EventsContext   | useEvents() hook                  | Single hook for all event data |

## Scalability Considerations

| Scale          | Architecture Adjustments                                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 0-100 events   | Monolith is perfect. Keep current architecture.                                                                              |
| 100-10k events | Add database indexes (already included in schema above). Consider caching frequently accessed events in Redis.               |
| 10k+ events    | Unlikely for gatherly app, but would need: connection pooling (already have), read replicas, full-text search for wishlists. |

### Scaling Priorities

**First bottleneck:** Database queries when loading event with many participants

- **Fix:** Optimize JOINs, use `COALESCE` and `json_agg` (already doing this)
- **Fix:** Add indexes on foreign keys (already included above)

**Second bottleneck:** Image storage (base64 in database is inefficient at scale)

- **Fix:** Move to CDN (S3, Cloudinary) and store URLs only
- **When:** When images > 1MB average or > 1000 events with images

**Third bottleneck:** Real-time claiming conflicts (two people claim same item)

- **Fix:** Database-level locking (`SELECT FOR UPDATE`)
- **Fix:** Optimistic locking with version numbers
- **When:** If seeing frequent claim conflicts (unlikely in small groups)

## Build Order Recommendations

### Phase 1: Database + Basic API (Backend First)

**Why backend first:**

- Schema defines the data model (get this right first)
- API can be tested independently (Postman, Supertest)
- Easier to iterate on API without UI constraints

**Tasks:**

1. Add wishlists table to schema.sql
2. Add invites table to schema.sql
3. Create `/api/events/:id/wishlists` routes
4. Create `/api/events/:id/invites` routes
5. Write API tests (Supertest)

**Deliverable:** Working API endpoints that can be tested with curl/Postman

### Phase 2: Frontend State Management

**Tasks:**

1. Extend Event type with wishlists and invites
2. Add new action types to EventsReducer
3. Update EventsContext with new actions
4. Create API client functions (wishlistsApi.ts, invitesApi.ts)

**Deliverable:** useEvents() hook provides wishlists and invites data

### Phase 3: UI Components (Vertical Slices)

**Build in vertical slices** (one feature end-to-end before next):

**Slice 1: Wishlist Display**

- Component to show participant's wishlist
- Route: `/events/:id/wishlist/:participantId`
- Can view, no edit yet

**Slice 2: Wishlist Editing**

- Add/edit/delete items on own wishlist
- Form validation
- Image upload (base64 for now)

**Slice 3: Claiming**

- Claim button on wishlist items
- Optimistic updates
- Error handling

**Slice 4: Invites**

- Organizer creates invites
- Invite status display
- Accept/decline flow

**Why vertical slices:**

- Each slice is independently testable
- Can deploy incrementally
- Easier to demo progress
- Less risk (one feature at a time)

### Phase 4: Polish & Edge Cases

**Tasks:**

- Handle concurrent claims gracefully
- Add loading states
- Improve error messages
- Mobile responsive design
- Accessibility (ARIA labels)

## Sources

**Wishlist Architecture:**

- [Diving Deeper into Our Wishlist App: Understanding Database Schemas](https://idestis.medium.com/diving-deeper-into-our-wishlist-app-understanding-database-schemas-e8538ae826ab)
- [Understanding Our Application Path: Building a Wishlist App](https://idestis.medium.com/understanding-our-application-path-building-a-wishlist-app-dcc7499ec320)

**Invitation Systems:**

- [Event Invitation Management System for Organizers](https://pegotec.net/pegotec-event-invitation-management-system/)
- [Laravel Invite Only - Full User Invitation System](https://laravel-news.com/laravel-invite)
- [Tracking event invitations and attendance - Beacon guide](https://guide.beaconcrm.org/en/articles/9100862-tracking-event-invitations-and-attendance)

**React State Management:**

- [State Management in 2026: Redux, Context API, and Modern Patterns](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns)
- [How to use React Context effectively](https://kentcdodds.com/blog/how-to-use-react-context-effectively)
- [React State Management in 2025: What You Actually Need](https://www.developerway.com/posts/react-state-management-2025)

**PostgreSQL Schema Design:**

- [PostgreSQL Relationships | One to One, One to Many, Many to Many](https://hasura.io/learn/database/postgresql/core-concepts/6-postgresql-relationships/)
- [Many to Many Relationships: A Guide to Database Design](https://www.datacamp.com/blog/many-to-many-relationship)

**Optimistic Updates:**

- [useOptimistic – React](https://react.dev/reference/react/useOptimistic)
- [Optimistic Updates | TanStack Query React Docs](https://tanstack.com/query/v4/docs/react/guides/optimistic-updates)
- [Understanding optimistic UI and React's useOptimistic Hook](https://blog.logrocket.com/understanding-optimistic-ui-react-useoptimistic-hook/)

**Database Migrations:**

- [Using PostgreSQL views to ensure backwards-compatible, non-breaking migrations](https://medium.com/ovrsea/using-postgresql-views-to-ensure-backwards-compatible-non-breaking-migrations-017288e77f06)
- [Backward compatible database changes — PlanetScale](https://planetscale.com/blog/backward-compatible-databases-changes)
- [Writing Backward-Compatible Schema Migrations - How and Why?](https://melvinkoh.me/writing-backward-compatible-schema-migrations-how-and-why-ck8bei7a700ojres1iv0pqpjb)

---

_Architecture research for: gatherly App - Wishlists, Claiming, Invites_
_Researched: 2026-02-06_
