# Architecture

**Analysis Date:** 2026-02-06

## Pattern Overview

**Overall:** Hybrid Full-Stack Monorepo with Graceful API Fallback

**Key Characteristics:**

- Turborepo-managed multi-app architecture with Express backend and React frontend
- Automatic fallback from API to localStorage when backend unavailable
- Context-based state management with reducer pattern
- PostgreSQL database with connection pooling and transaction support
- React Router 7 for client-side routing
- Per-event compartmentalization of participants, couples, assignments, and gifts

## Layers

**Presentation Layer:**

- Purpose: React components with React Router 7 for page routing, context hooks for state access
- Location: `apps/gatherly/src/pages/`, `apps/gatherly/src/components/`
- Contains: Page components, reusable UI components, form handling, image upload
- Depends on: EventsContext, GiftsContext, API client, core utilities
- Used by: App.tsx router provider, MainLayout

**State Management Layer:**

- Purpose: Redux-like context + reducer pattern for events and gifts with API/localStorage sync
- Location: `apps/gatherly/src/contexts/EventsContext.tsx`, `apps/gatherly/src/contexts/GiftsContext.tsx`
- Contains: Action dispatchers, state reducers, initialization from localStorage, useApi flag toggle
- Depends on: eventsApi for fetching/updating
- Used by: All pages via useEvents() and useGifts() hooks

**API Client Layer:**

- Purpose: Axios wrapper with interceptors and type-safe endpoint functions
- Location: `apps/gatherly/src/api/client.ts`, `apps/gatherly/src/api/events.ts`, `apps/gatherly/src/api/gifts.ts`, `apps/gatherly/src/api/decipher.ts`
- Contains: Base URL configuration from VITE_API_URL, request/response logging, typed API functions
- Depends on: axios
- Used by: EventsContext initialization, direct API calls in components

**Business Logic Layer:**

- Purpose: Gift validation, filtering, sorting logic independent of state or UI
- Location: `apps/gatherly/src/core/giftValidation.ts`, `apps/gatherly/src/core/giftFilterSort.ts`
- Contains: Form validation rules, filtering predicates, sort algorithms
- Depends on: Type definitions only
- Used by: Page components for form handling and list rendering

**Type Definitions:**

- Purpose: Shared TypeScript interfaces for events, gifts, and API responses
- Location: `apps/gatherly/src/types/gift.ts`, `apps/gatherly/src/api/events.ts`
- Contains: Event, Gift, GiftFilters, GiftFormData interfaces
- Used by: All layers for type safety

**Backend API Layer:**

- Purpose: Express routes handling event CRUD, participant management, couples, assignments, and gifts
- Location: `apps/api/src/routes/events.ts`, `apps/api/src/routes/gifts.ts`, `apps/api/src/routes/decipher.ts`
- Contains: REST endpoints with parameterized SQL queries, transaction support
- Depends on: PostgreSQL connection pool, query helpers
- Used by: Frontend API client layer

**Database Layer:**

- Purpose: PostgreSQL schema with pool management, query helpers, transactions
- Location: `apps/api/src/db/connection.ts` (pool, query helpers), `apps/api/src/db/schema.sql` (schema)
- Contains: Connection pooling (max 20), parameterized query wrapper, getClient() for transactions
- Depends on: pg client library, environment variables for credentials
- Used by: All route handlers

## Data Flow

**Event List Fetch on App Mount:**

1. EventsContext initializes from localStorage on first render
2. EventsContext checks API availability via GET `/status` endpoint
3. If API available (`useApi = true`):
   - Fetches events via GET `/api/events` returning JSON with aggregated participants, couples, assignments
   - Syncs state with API response
4. If API unavailable (`useApi = false`):
   - Remains in localStorage mode
   - Events stored in localStorage key `"secret_santa_events"` as `{ events: Event[] }`

**Event Creation Flow:**

1. User fills form in `/events` page
2. Page dispatches ADD_EVENT action with new event object
3. If useApi=true: POST `/api/events` creates row, returns id, syncs state
4. If useApi=false: Event saved to localStorage immediately
5. UI updates via context subscription

**Assignment Generation Flow:**

1. User on `/events/edit/:id` sets participants, couples, giftCount
2. Clicks "Generate Assignments"
3. Backend `POST /api/events/:id/generate`:
   - Tries up to 2000 permutations of participant pairs
   - Validates: each person receives exactly giftCount gifts, respects couple constraints
   - Uses greedy algorithm with backtracking
   - Returns assignments as `Record<giverName, receiverNames[]>`
   - Stores in database
4. Frontend receives assignments, generates Base64 secret codes for each giver
5. Code format: `Base64(giverName:receiverName1,receiverName2,...)`

**Gift Registry Per-Event Flow:**

1. User navigates to `/events/:id/gifts`
2. EventGiftsPage fetches event from context
3. User adds gift: form posts to `POST /api/events/:id/gifts`
4. Backend validates name (required), stores with base64 image if provided (50mb limit)
5. Returns gift with id, claim status retrieved from gift_claims table
6. Frontend displays registry with claim/unclaim buttons
7. Claiming: `POST /api/events/:id/gifts/:giftId/claim` inserts into gift_claims (UNIQUE constraint prevents duplicate claims)

**Decipher Flow:**

1. User on `/decipher` page pastes secret code
2. Posts to `POST /api/decipher` with Base64 code
3. Backend decodes from Base64, parses "person:receiver1,receiver2,..." format
4. Returns decoded object `{ person, receivers: string[] }`
5. Frontend displays who the person is and who they're buying for

**State Management:**

- EventsContext holds all events, loading, error state with reducer pattern
- GiftsContext holds per-event gifts, added/updated/deleted via actions
- Both contexts initialize from localStorage if window available
- API errors caught, state remains on localStorage, user notified via error state
- Refresh function in EventsContext allows manual re-sync with API

## Key Abstractions

**Event:**

- Purpose: Core domain object representing a gatherly event
- Examples: `apps/api/src/db/schema.sql` (events table), `apps/gatherly/src/api/events.ts` (type)
- Pattern: Aggregate with participants, couples, assignments, gifts as nested structures
- Properties: id, name, coupleCrossing, people[], couples[][], assignments{}, gifts{}, date, participants[]

**Participant:**

- Purpose: Named person in an event
- Examples: `apps/api/src/routes/events.ts` (participants table join)
- Pattern: Identified by name within event scope (UNIQUE(event_id, name) constraint)
- Relations: Links to couples and assignments via participant id

**Couple:**

- Purpose: Pair constraint preventing person A from buying for person B if they're a couple
- Examples: `apps/api/src/db/schema.sql` (couples table with CHECK constraint)
- Pattern: Two-person relationship per event, checked during assignment validation
- When couple_crossing=false: assignment algorithm respects couple constraint

**Assignment:**

- Purpose: Giver → Receiver relationship defining who buys gifts for whom
- Examples: `apps/api/src/routes/events.ts` (POST /generate endpoint)
- Pattern: Many-to-many stored separately, encoded as secret codes
- Flow: Generated via algorithm, converted to Base64, decoded later with /api/decipher

**Gift:**

- Purpose: Wishlist item within event gift registry
- Examples: `apps/gatherly/src/types/gift.ts`, `apps/api/src/routes/gifts.ts`
- Pattern: Stored with optional base64 image, claimed (or not) by participant name
- Relations: Foreign key to event, optional claim via gift_claims table (UNIQUE)

## Entry Points

**Backend Entry Point:**

- Location: `apps/api/src/index.ts`
- Triggers: Node process startup, environment PORT variable (default 5001)
- Responsibilities: Creates Express server, starts listening

**Frontend Entry Point:**

- Location: `apps/gatherly/src/index.tsx`
- Triggers: React root mounting
- Responsibilities: Renders App in StrictMode, triggers reportWebVitals

**App Initialization:**

- Location: `apps/gatherly/src/App.tsx`
- Responsibilities: Wraps children with QueryClientProvider, EventsProvider, GiftsProvider; initializes RouterProvider

**Router Entry Point:**

- Location: `apps/gatherly/src/routes.tsx`
- Responsibilities: Defines all routes under MainLayout; redirects / to /home

**Layout Entry Point:**

- Location: `apps/gatherly/src/layouts/MainLayout.tsx`
- Responsibilities: Common header, gradient background, renders Outlet for route children

## Error Handling

**Strategy:** Try-catch in routes, error state in context, UI displays error message

**Patterns:**

- **API Errors:** Caught in apiClient interceptors (response layer), propagated to context error state
- **Form Errors:** Validation functions return error objects, displayed inline on form fields
- **Event Not Found:** GET /api/events/:id returns 404 if row doesn't exist, frontend navigates away
- **Database Errors:** Caught in route handlers, logged, returns 500 with generic error message
- **Transactions:** If COMMIT fails, ROLLBACK is executed, error propagated to caller

## Cross-Cutting Concerns

**Logging:**

- Backend: morgan for HTTP request logging in development
- Frontend: apiClient interceptors log request method/URL and errors

**Validation:**

- Backend: Parameterized queries prevent SQL injection, CHECK constraints in schema (e.g., giver != receiver)
- Frontend: validateGiftForm() checks character limits, required fields, format constraints

**Authentication:**

- Not implemented; no auth layer present
- CORS enabled for all origins

**Image Handling:**

- Stored as base64 data URLs in both database (image_url TEXT) and localStorage
- 50mb body size limit in Express to accommodate large base64 strings
- No separate file upload service
