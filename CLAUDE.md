# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a **Turborepo monorepo** containing a full-stack gatherly application with React frontend and Express + PostgreSQL backend.

**Key Apps:**

- `apps/gatherly` - React frontend (React 19, React Router 7, Tailwind CSS)
- `apps/api` - Express backend API with PostgreSQL

**Shared Packages:**

- `@repo/eslint-config`, `@repo/typescript-config`, `@repo/jest-presets`, `@repo/logger`

## Essential Commands

### Development

```bash
# Install all dependencies (use pnpm)
pnpm install

# Start all apps in development mode
pnpm dev

# Start individual apps
cd apps/api && pnpm dev          # API on http://localhost:5001
cd apps/gatherly && pnpm dev # Frontend on http://localhost:3000
```

### Database Setup

```bash
# Create database
createdb gatherly

# Apply schema
psql -d gatherly -f apps/api/src/db/schema.sql

# Or use the setup script (Windows)
cd apps/api && setup-db.bat
```

### Testing & Quality

```bash
# Run all tests from root
pnpm test

# Run tests for specific app
cd apps/gatherly && pnpm test          # Jest + React Testing Library
cd apps/api && pnpm test                   # Supertest API tests

# Run Cypress E2E tests (frontend)
cd apps/gatherly && pnpm cypress:open  # Interactive
cd apps/gatherly && pnpm cypress:run   # Headless

# Lint all packages
pnpm lint

# Type checking
pnpm check-types

# Build all apps
pnpm build
```

### Turborepo

```bash
# Clean all builds
pnpm clean

# Format code
pnpm format
```

## Architecture Overview

### Hybrid Storage Pattern

The app uses a **hybrid storage architecture** that automatically falls back to localStorage if the API is unavailable:

**EventsContext** (`apps/gatherly/src/contexts/EventsContext.tsx`):

- On mount, checks if API is available via `/status` endpoint
- If API available: `useApi = true`, fetches from PostgreSQL
- If API unavailable: `useApi = false`, uses localStorage
- State changes sync to appropriate storage backend

This enables:

- **Development flexibility**: Frontend works standalone without backend
- **Offline resilience**: Graceful degradation if backend goes down
- **Easy testing**: Can test UI without database setup

### API Structure

**Route Organization** (`apps/api/src/routes/`):

- `events.ts` - Event CRUD, participants, couples, assignment generation
- `gifts.ts` - Gift registry per event with claim/unclaim
- `decipher.ts` - Base64 secret code decoding

**Database Layer** (`apps/api/src/db/`):

- `schema.sql` - PostgreSQL schema with proper foreign keys and indexes
- `connection.ts` - Connection pool, query helper, transaction support via `getClient()`

**Key Pattern**: Complex operations (like updating events with participants/couples/assignments) use PostgreSQL transactions:

```typescript
const client = await getClient();
try {
  await client.query("BEGIN");
  // ... multiple related queries
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
} finally {
  client.release();
}
```

### Frontend Route Structure

**React Router 7** configuration (`apps/gatherly/src/routes.tsx`):

```
/              → Redirect to /home
/home          → Landing page
/events        → Events list
/events/edit/:id    → Event editor (participants, couples, assignments)
/events/:id/gifts   → Per-event gift registry
/decipher      → Decode secret codes
```

**Important**: Pages were refactored from a monolithic `index.tsx` into separate files in `src/pages/events/`. Always use the structured route components, not the old index page.

### Secret Code System

**Format**: `Base64(person:receiver1,receiver2,...)`

- Example: `Sm9objpNYXJ5LEJvYg==` decodes to "John:Mary,Bob"
- Generated in `/api/events/:id/generate` and `/api/events/:id/codes`
- Decoded in `POST /api/decipher`

**Assignment Algorithm** (`apps/gatherly/src/pages/events/edit.tsx` and `apps/api/src/routes/events.ts`):

- Tries up to 2000 permutations to find valid assignments
- Balances gift reception across participants (each person receives exactly `giftCount` gifts)
- Respects couple constraints (optionally prevents couples from buying for each other)
- Uses greedy algorithm with backtracking

### Component Architecture

**Context-Based State** (`apps/gatherly/src/contexts/`):

- `EventsContext.tsx` - Primary state management with reducer pattern
- Provides `state`, `dispatch`, `refreshEvents()`, and `useApi` flag
- All event operations (CRUD, participants, couples, assignments, gifts) flow through this context

**Gift System** (`apps/gatherly/src/core/`):

- `giftValidation.ts` - Form validation with character limits
- `giftFilterSort.ts` - Client-side filtering and sorting logic
- Note: The old global `gift-registry.tsx` page exists but is NOT used. Per-event gifts are at `/events/:id/gifts`

**API Client** (`apps/gatherly/src/api/`):

- `client.ts` - Axios instance with base URL from `VITE_API_URL`
- `events.ts`, `gifts.ts`, `decipher.ts` - Type-safe API functions
- Uses TypeScript types matching backend responses

## Configuration Files

**Environment Variables**:

- `apps/api/.env` - Database credentials (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, PORT)
- `apps/gatherly/.env` - API URL (VITE_API_URL=http://localhost:5001)

**Both apps have `.env.example` templates**

## Database Schema

**Core Tables**:

- `events` - Event metadata with `couple_crossing` flag
- `participants` - Linked to events, constrained by UNIQUE(event_id, name)
- `couples` - Pairs of participant IDs with CHECK constraint ensuring different people
- `assignments` - Many-to-many giver → receiver relationships
- `gifts` - Per-event gift registry with optional images (base64 in `image_url`)
- `gift_claims` - Tracks who claimed each gift (UNIQUE constraint on gift_id)

**All foreign keys use `ON DELETE CASCADE`** for automatic cleanup.

## Known Patterns & Conventions

### When Modifying Events

1. **Always use transactions** for complex updates (participants + couples + assignments)
2. **Update both API and localStorage paths** if changing event structure
3. **Maintain backwards compatibility** in event shape (id, name, people, couples, assignments, gifts, date, participants)

### Adding New Routes

1. Add route to `apps/gatherly/src/routes.tsx`
2. Create page component in `src/pages/`
3. Update header navigation in `src/components/header/index.tsx` if needed
4. Use `useEvents()` hook to access event state

### Image Handling

- Images are stored as **base64 data URLs** in both localStorage and PostgreSQL
- Body size limits increased to 50mb in `apps/api/src/server.ts`
- No separate file upload service; images embedded in JSON

### Testing Existing Features

The assignment algorithm can be tested by:

1. Creating an event with 4+ participants
2. Creating 1-2 couples
3. Setting gifts per person to 2-3
4. Generating assignments multiple times to verify randomization
5. Checking that each person receives exactly the specified gift count

## PostgreSQL Notes

- **Connection pooling** is configured with max 20 connections
- **Parameterized queries** ($1, $2, etc.) prevent SQL injection
- **Helper functions**: `query(text, params)` for one-off queries, `getClient()` for transactions
- **Auto-timestamps**: `updated_at` columns have triggers for automatic updates

## Storybook & Testing

- Storybook configured for component documentation (run `pnpm storybook` in gatherly)
- Jest + React Testing Library for unit tests
- Cypress for E2E tests
- Test files use `.spec.ts` or `.test.tsx` naming

## Gotchas

1. **Don't use `index.tsx` for events page** - It's been refactored into `events/index.tsx`, `events/edit.tsx`, `events/gifts.tsx`
2. **Base64 encoding uses browser `btoa()`/`atob()`** - Backend uses Node Buffer.from()
3. **Event IDs are strings** in frontend, integers in database - conversion happens in API layer
4. **localStorage key**: `"secret_santa_events"` - stored as `{ events: Event[] }`
5. **React 19** is used, which has peer dependency warnings with some older packages (safe to ignore)
