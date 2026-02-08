# Roadmap: Gatherly v2.0

## Overview

Transform Gatherly from a functional Secret Santa app into a mobile-first gift exchange platform where participants discover what people want and claim gifts anonymously. Starting with foundational database schema and privacy safeguards, we'll build wishlist CRUD, anonymous claiming with race condition protection, invite sharing with QR codes, a complete iOS-style mobile UI redesign using Konsta UI, and finally polish with drag-and-drop priority ordering. Each phase delivers verifiable user value while maintaining backward compatibility with v1.0 event data.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Privacy** - Database schema, authorization, Tailwind upgrade
- [x] **Phase 2: Wishlist Core** - CRUD operations with images and links
- [ ] **Phase 3: Claiming System** - Anonymous claiming with race condition protection
- [ ] **Phase 4: Invite System** - Shareable links and QR codes
- [ ] **Phase 5: Mobile UI Redesign** - iOS-style interface with Konsta UI
- [ ] **Phase 6: Wishlist Priority & Polish** - Drag-drop ordering and UX refinements
- [ ] **Phase 7: JWT Authentication** - Secure routes following zero trust principle

## Phase Details

### Phase 1: Foundation & Privacy

**Goal**: Database schema and authorization infrastructure support secure wishlist and claiming features with backward compatibility
**Depends on**: Nothing (first phase)
**Requirements**: TECH-01, TECH-02, TECH-03, TECH-04, TECH-05, TECH-07
**Success Criteria** (what must be TRUE):

1. Database includes wishlists table with proper indexes and foreign key constraints
2. Database includes invites table for tracking participant join status
3. Tailwind CSS upgraded from v2 to v3.4.19+ without breaking existing UI
4. Existing events from v1.0 continue to work with new schema (backward compatibility verified)
5. Atomic claiming operations prevent duplicate claims via database constraints
   **Plans**: 2 plans

Plans:

- [ ] 01-01-PLAN.md -- Tailwind CSS v3 upgrade and Konsta UI v5 integration
- [ ] 01-02-PLAN.md -- Database schema migration (wishlists, invites, claims) and Event type extension

### Phase 2: Wishlist Core

**Goal**: Participants can create, edit, and view wishlists with images, descriptions, and links
**Depends on**: Phase 1
**Requirements**: WISH-01, WISH-02, WISH-03, WISH-04, WISH-05, WISH-07
**Success Criteria** (what must be TRUE):

1. User can create wishlist items with name, description, image, product URL, and priority level
2. User can edit their own wishlist items (name, description, image, URL, priority)
3. User can delete their own wishlist items
4. Participants can view other participants' wishlists within the event
5. Wishlist images are compressed before storage (max 800px width, 80% quality)
   **Plans**: 5 plans

Plans:

- [ ] 02-01-PLAN.md -- Backend wishlist CRUD API routes + frontend API client
- [ ] 02-02-PLAN.md -- Validation, image compression, EventsContext wishlist actions
- [ ] 02-03-PLAN.md -- Wishlist UI components (form drawer, carousel card, registry item)
- [ ] 02-04-PLAN.md -- Wishlist page assembly with route registration
- [ ] 02-05-PLAN.md -- Visual and functional verification checkpoint

### Phase 3: Claiming System

**Goal**: Participants can anonymously claim gifts with race condition protection and privacy guarantees
**Depends on**: Phase 2
**Requirements**: CLAIM-01, CLAIM-02, CLAIM-03, CLAIM-04
**Success Criteria** (what must be TRUE):

1. Participant can anonymously claim a gift from another participant's wishlist
2. Participant can unclaim a gift if plans change
3. System prevents duplicate claims even under concurrent access (race condition handled)
4. Claimed status is visible only to the claimer, not to the wishlist owner
5. Optimistic updates provide instant feedback with rollback on conflict
   **Plans**: TBD

Plans:

- [ ] 03-01: TBD during plan-phase

### Phase 4: Invite System

**Goal**: Event organizers can share invites via links and QR codes with status tracking
**Depends on**: Phase 1
**Requirements**: INV-01, INV-02, INV-03
**Success Criteria** (what must be TRUE):

1. Organizer can generate shareable invite links for events
2. Organizer can generate QR codes for event invites
3. Participants can join events by clicking invite link or scanning QR code
4. Organizer can view invite status (pending/joined) for all participants
   **Plans**: TBD

Plans:

- [ ] 04-01: TBD during plan-phase

### Phase 5: Mobile UI Redesign

**Goal**: App uses modern iOS-style mobile-first interface with Konsta UI components
**Depends on**: Phase 1
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07
**Success Criteria** (what must be TRUE):

1. App uses Konsta UI iOS-style components throughout the interface
2. App has bottom navigation bar for primary actions (mobile-first)
3. Events display as visual cards with thumbnails and status indicators
4. Layouts are optimized for thumb-zone interaction on mobile devices
5. App uses Plus Jakarta Sans font and Material Symbols icons consistently
6. Dark mode support extends to all new screens and components
   **Plans**: TBD

Plans:

- [ ] 05-01: TBD during plan-phase

### Phase 6: Wishlist Priority & Polish

**Goal**: Wishlist items support drag-and-drop priority reordering with UX refinements
**Depends on**: Phase 2, Phase 5
**Requirements**: WISH-06, TECH-06
**Success Criteria** (what must be TRUE):

1. User can reorder wishlist items via drag-and-drop
2. Priority order persists across sessions
3. Empty states and error handling provide clear guidance
4. Loading states show progress during asynchronous operations
   **Plans**: TBD

Plans:

- [ ] 06-01: TBD during plan-phase

### Phase 7: JWT Authentication with Secure Routes Following the Zero Trust Principle

**Goal**: Users can register, login, and access protected routes with JWT-based authentication using short-lived access tokens and HttpOnly refresh token cookies, with every API route explicitly declaring its auth requirement
**Depends on**: Phase 6
**Requirements**: TBD
**Success Criteria** (what must be TRUE):

1. Users can register with email, password, and name
2. Users can login with email and password, receiving a short-lived access token
3. Refresh tokens rotate automatically via HttpOnly cookies, maintaining sessions without localStorage
4. Protected routes (events, wishlists, gifts) require valid JWT for write operations
5. Read operations use optional auth for backward compatibility during migration
6. Frontend automatically refreshes access tokens before expiry
7. Header displays auth state (user name + logout, or login link)
8. Unauthenticated users are redirected to login when accessing protected routes

**Plans**: 4 plans

Plans:

- [x] 07-01-PLAN.md -- Backend auth foundation (deps, DB migration, token service, middleware)
- [x] 07-02-PLAN.md -- Auth API routes (register, login, refresh, logout)
- [x] 07-03-PLAN.md -- Frontend auth system (AuthContext, API interceptors, login/register pages, ProtectedRoute)
- [x] 07-04-PLAN.md -- Route protection wiring and auth-aware header

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase                         | Plans Complete | Status      | Completed  |
| ----------------------------- | -------------- | ----------- | ---------- |
| 1. Foundation & Privacy       | 2/2            | Complete    | 2026-02-06 |
| 2. Wishlist Core              | 0/5            | Not started | -          |
| 3. Claiming System            | 0/TBD          | Not started | -          |
| 4. Invite System              | 0/TBD          | Not started | -          |
| 5. Mobile UI Redesign         | 0/TBD          | Not started | -          |
| 6. Wishlist Priority & Polish | 0/TBD          | Not started | -          |
| 7. JWT Authentication         | 4/4            | Complete    | 2026-02-08 |
