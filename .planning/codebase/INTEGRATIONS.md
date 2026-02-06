# External Integrations

**Analysis Date:** 2026-02-06

## APIs & External Services

**None detected** - This is a self-contained application. All third-party service integrations are via standard protocols (HTTP).

## Data Storage

**Databases:**

- PostgreSQL 14+ (required for production)
  - Connection: Environment variables (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
  - Client: `pg` npm package (v8.11.3 in API, v8.18.0 in frontend)
  - Connection pool: Max 20 connections, idle timeout 30s, connection timeout 2s (`apps/api/src/db/connection.ts`)
  - Schema: `apps/api/src/db/schema.sql` with tables for events, participants, couples, assignments, gifts, gift_claims
  - Helper functions: `query()` for one-off queries, `getClient()` for transactions

**File Storage:**

- Local filesystem only
- Images stored as base64 data URLs embedded in JSON responses and localStorage
- Body size limit: 50MB for image uploads (`apps/api/src/server.ts`)

**Browser Storage:**

- localStorage (string key: "secret_santa_events")
- Hybrid fallback: If API unavailable, frontend automatically switches to localStorage (`apps/gatherly/src/contexts/EventsContext.tsx`)
- Allows offline-first development and resilience

**Caching:**

- No external caching service
- react-query 3.39.3 provides client-side query caching

## Authentication & Identity

**Auth Provider:**

- None detected - No built-in authentication system

**Current Approach:**

- No user login or identity verification
- Base64-encoded secret codes for assignment revelation: `Base64("person:receiver1,receiver2,...")`
- Code decoding at `POST /api/decipher` endpoint (`apps/api/src/routes/decipher.ts`)
- No protection against unauthorized access to events or gifts

## Monitoring & Observability

**Error Tracking:**

- None detected - No external error tracking service

**Logs:**

- Morgan 1.10.0 - HTTP request logging to stdout
- Console.log() statements for database query logging with execution time
- Custom logger: `@repo/logger` workspace package (shared utility)

**Performance:**

- web-vitals 5.1.0 - Client-side performance metrics
- No external APM (Application Performance Monitoring)

## CI/CD & Deployment

**Hosting:**

- Not specified - Configuration supports any Node.js host
- Typical deployment: Docker container with Node.js 18+ and PostgreSQL

**CI Pipeline:**

- GitHub Actions (`.github/workflows/ci.yml`)
- Triggers: Push to main/master, pull requests
- Matrix: Ubuntu 22.04, Node 22
- Steps: Lint, test, E2E tests (Cypress)
- pnpm 9 for dependency management

**Build Outputs:**

- API: Compiled to `dist/index.cjs`
- Admin: Vite bundle to `build/`
- Gatherly: CRA bundle via craco to `build/`

## Environment Configuration

**Required env vars:**

**API (`apps/api/.env`):**

- DB_HOST - PostgreSQL host (default: localhost)
- DB_PORT - PostgreSQL port (default: 5432)
- DB_NAME - Database name (default: gatherly)
- DB_USER - Database user (default: postgres)
- DB_PASSWORD - Database password (default: postgres)
- PORT - Server port (default: 5001)

**Frontend (`apps/gatherly/.env`):**

- VITE_API_URL - API base URL (default: http://localhost:5001)

**Secrets location:**

- Environment variables only
- No secrets manager integration
- .env files excluded from git

## Webhooks & Callbacks

**Incoming:**

- None detected

**Outgoing:**

- None detected

## API Structure

**RESTful endpoints** at base path `/api/`:

**Events:**

- `GET /api/events` - List all events
- `GET /api/events/:id` - Get single event with full details
- `POST /api/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `POST /api/events/:id/participants` - Add participant
- `DELETE /api/events/:id/participants/:participantId` - Remove participant
- `POST /api/events/:id/couples` - Add couple
- `DELETE /api/events/:id/couples/:coupleId` - Remove couple
- `POST /api/events/:id/generate` - Generate random assignments
- `GET /api/events/:id/codes` - Get encoded assignments

**Gifts:**

- `GET /api/events/:id/gifts` - List gifts for event
- `POST /api/events/:id/gifts` - Add gift to registry
- `PUT /api/events/:id/gifts/:giftId` - Update gift
- `DELETE /api/events/:id/gifts/:giftId` - Delete gift
- `POST /api/events/:id/gifts/:giftId/claim` - Claim a gift
- `DELETE /api/events/:id/gifts/:giftId/claim` - Unclaim a gift

**Decipher:**

- `POST /api/decipher` - Decode secret assignment code

**Status:**

- `GET /status` - Health check endpoint

## Frontend HTTP Integration

**Client:** Axios 1.13.2 (`apps/gatherly/src/api/client.ts`)

- Base URL: VITE_API_URL environment variable
- Timeout: 30 seconds
- Headers: Content-Type: application/json
- Request/Response logging interceptors
- Error handling interceptors

**API Modules:**

- `apps/gatherly/src/api/events.ts` - Event API calls
- `apps/gatherly/src/api/gifts.ts` - Gift API calls
- `apps/gatherly/src/api/decipher.ts` - Code decoding

---

_Integration audit: 2026-02-06_
