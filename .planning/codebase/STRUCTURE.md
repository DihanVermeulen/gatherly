# Codebase Structure

**Analysis Date:** 2026-02-06

## Directory Layout

```
gatherly/
├── apps/
│   ├── api/                          # Express backend API
│   │   ├── src/
│   │   │   ├── index.ts              # Entry point
│   │   │   ├── server.ts             # Express app setup
│   │   │   ├── db/
│   │   │   │   ├── connection.ts     # PostgreSQL pool and query helpers
│   │   │   │   └── schema.sql        # Database schema
│   │   │   ├── routes/
│   │   │   │   ├── events.ts         # Event CRUD, participants, couples, assignments
│   │   │   │   ├── gifts.ts          # Gift CRUD, claims
│   │   │   │   └── decipher.ts       # Secret code decoding
│   │   │   └── __tests__/
│   │   │       └── server.test.ts    # API tests
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── eslint.config.js
│   │   └── .env.example
│   │
│   ├── gatherly/                     # React frontend (active app)
│   │   ├── src/
│   │   │   ├── index.tsx             # React DOM root
│   │   │   ├── App.tsx               # Provider setup
│   │   │   ├── routes.tsx            # React Router 7 config
│   │   │   ├── api/
│   │   │   │   ├── client.ts         # Axios instance
│   │   │   │   ├── events.ts         # Event API functions
│   │   │   │   ├── gifts.ts          # Gift API functions
│   │   │   │   ├── decipher.ts       # Decipher API function
│   │   │   │   └── index.ts          # Barrel export
│   │   │   ├── contexts/
│   │   │   │   ├── EventsContext.tsx # Events state + reducer
│   │   │   │   └── GiftsContext.tsx  # Gifts state + reducer
│   │   │   ├── pages/
│   │   │   │   ├── home.tsx          # Landing page
│   │   │   │   ├── decipher.tsx      # Secret code decoder
│   │   │   │   ├── events/
│   │   │   │   │   ├── index.tsx     # Events list
│   │   │   │   │   ├── edit.tsx      # Event editor (participants, couples, assignments)
│   │   │   │   │   └── gifts.tsx     # Per-event gift registry
│   │   │   │   └── gift-registry.tsx # OLD - not used, kept for reference
│   │   │   ├── components/
│   │   │   │   ├── button/           # Button component
│   │   │   │   ├── cards/            # Card component
│   │   │   │   ├── container/        # Container component
│   │   │   │   ├── header/           # Navigation header
│   │   │   │   ├── footer/           # Footer component
│   │   │   │   ├── logo/             # Logo component
│   │   │   │   ├── main/             # Main wrapper
│   │   │   │   ├── gift-registry/    # Gift-specific components
│   │   │   │   │   ├── CreateGiftForm.tsx
│   │   │   │   │   ├── GiftCard.tsx
│   │   │   │   │   ├── GiftFiltersBar.tsx
│   │   │   │   │   └── RegistryList.tsx
│   │   │   │   └── examples/         # Example components for reference
│   │   │   ├── layouts/
│   │   │   │   └── MainLayout.tsx    # Root layout with header and outlet
│   │   │   ├── core/
│   │   │   │   ├── giftValidation.ts # Form validation logic
│   │   │   │   ├── giftFilterSort.ts # Gift filtering and sorting
│   │   │   │   └── utils.ts          # Shared utilities
│   │   │   ├── types/
│   │   │   │   └── gift.ts           # Gift type definitions
│   │   │   ├── styles/
│   │   │   │   └── global.css        # Global styles
│   │   │   ├── test/
│   │   │   │   ├── index.tsx         # Test wrapper with providers
│   │   │   │   └── jest.setup.js     # Jest configuration
│   │   │   └── i18n.js               # Internationalization setup
│   │   ├── public/
│   │   │   ├── index.html            # HTML entry
│   │   │   └── icons/                # SVG icons
│   │   ├── cypress/                  # E2E tests
│   │   │   ├── integration/
│   │   │   └── support/
│   │   ├── .storybook/               # Storybook config
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── craco.config.js           # Create React App override config
│   │   ├── tailwind.config.js        # Tailwind CSS config
│   │   ├── cypress.json              # Cypress config
│   │   └── .env.example
│   │
│   ├── admin/                        # Admin panel (separate app)
│   │   └── [vite + react setup]
│   │
│   └── gatherly/                 # Legacy (empty, superseded by gatherly)
│
├── docs/
│   └── architecture.md               # High-level architecture docs
│
├── .planning/
│   └── codebase/                     # GSD analysis documents
│
├── pnpm-workspace.yaml               # Workspace config
├── turbo.json                        # Turborepo tasks
├── package.json                      # Root scripts
├── pnpm-lock.yaml                    # Lockfile
└── CLAUDE.md                         # Project guidelines
```

## Directory Purposes

**apps/api:**

- Purpose: Express backend serving REST API for events, gifts, participants, assignments
- Contains: TypeScript source, schema, database connection, routes
- Key files: `src/server.ts` (Express setup), `src/db/schema.sql` (database structure), `src/routes/` (endpoints)

**apps/gatherly:**

- Purpose: Main React frontend for gatherly event management
- Contains: Pages, components, context state, API client, type definitions
- Key files: `src/App.tsx` (provider setup), `src/routes.tsx` (routing), `src/contexts/` (state management)

**apps/admin:**

- Purpose: Separate admin panel app (Vite-based)
- Status: Present but not actively used in main flow

**apps/gatherly:**

- Purpose: Legacy app directory
- Status: Empty (superseded by apps/gatherly)

## Key File Locations

**Entry Points:**

- `apps/api/src/index.ts`: Starts Express server on PORT 5001
- `apps/api/src/server.ts`: Creates Express app with routes (GET /status, /api/events, /api/gifts, /api/decipher)
- `apps/gatherly/src/index.tsx`: React DOM render entry
- `apps/gatherly/src/App.tsx`: QueryClient, EventsProvider, GiftsProvider setup

**Configuration:**

- `apps/api/.env.example`: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, PORT
- `apps/gatherly/.env.example`: VITE_API_URL (default http://localhost:5001)
- `apps/api/tsconfig.json`: Extends @repo/typescript-config/base.json, ES2015 target
- `apps/gatherly/tsconfig.json`: ES5 target, baseUrl: src for path resolution
- `apps/gatherly/tailwind.config.js`: Tailwind CSS setup for styling
- `apps/gatherly/craco.config.js`: Create React App override configuration
- `turbo.json`: Task definitions (build, test, dev, lint, check-types)

**Core Logic:**

- `apps/api/src/db/connection.ts`: PostgreSQL pool (max 20), query() helper, getClient() for transactions
- `apps/api/src/db/schema.sql`: Tables (events, participants, couples, assignments, gifts, gift_claims)
- `apps/api/src/routes/events.ts`: GET /api/events, GET /api/events/:id, POST /api/events/:id/participants, etc.
- `apps/api/src/routes/gifts.ts`: GET/POST/PUT/DELETE gifts, claim/unclaim endpoints
- `apps/api/src/routes/decipher.ts`: POST /api/decipher - decode Base64 secret codes
- `apps/gatherly/src/contexts/EventsContext.tsx`: Event state management with useApi flag and localStorage fallback
- `apps/gatherly/src/api/events.ts`: Type-safe API client functions for events
- `apps/gatherly/src/core/giftValidation.ts`: Form validation rules and constants

**Testing:**

- `apps/api/src/__tests__/server.test.ts`: API endpoint tests using supertest
- `apps/gatherly/src/components/*/index.spec.tsx`: Component unit tests (React Testing Library)
- `apps/gatherly/cypress/integration/home.spec.ts`: E2E tests
- `apps/gatherly/src/test/jest.setup.js`: Jest configuration and setup

## Naming Conventions

**Files:**

- Components: `index.tsx` (e.g., `src/components/button/index.tsx`)
- Tests: `*.spec.tsx` or `*.test.tsx` (e.g., `src/components/button/index.spec.tsx`)
- Stories: `*.stories.tsx` (e.g., `src/components/button/index.stories.tsx`)
- Pages: Descriptive name (e.g., `home.tsx`, `events/edit.tsx`)
- API modules: Endpoint name (e.g., `events.ts`, `gifts.ts`, `decipher.ts`)
- Routes: `routes.ts` (React Router configuration file)
- Contexts: `*Context.tsx` (e.g., `EventsContext.tsx`)

**Directories:**

- Feature folders: plural noun (e.g., `events/`, `components/`, `pages/`)
- API subfolder: `api/` for axios client
- Context subfolder: `contexts/` for provider components
- Core logic: `core/` for business logic utilities
- Types: `types/` for TypeScript definitions
- Tests: Co-located with source (same directory as code)
- Database: `db/` for connection and schema

**Functions & Variables:**

- Components: PascalCase (e.g., `EditEventPage`, `CreateGiftForm`)
- Hooks: camelCase with "use" prefix (e.g., `useEvents()`, `useGifts()`)
- Constants: UPPER_SNAKE_CASE (e.g., `STORAGE_KEY`, `GIFT_NAME_MAX`)
- API functions: camelCase (e.g., `eventsApi.create()`, `giftsApi.addGift()`)
- Reducer actions: `type: "ACTION_NAME"` format (e.g., `"ADD_EVENT"`, `"UPDATE_GIFT"`)

## Where to Add New Code

**New Feature (E.g., Notifications):**

- Primary code: `apps/gatherly/src/contexts/NotificationContext.tsx` (if state needed) or `apps/api/src/routes/notifications.ts` (if backend)
- Tests: Co-locate in same directory (e.g., `NotificationContext.spec.tsx`)
- API module: Add `apps/gatherly/src/api/notifications.ts` if calling backend endpoints
- Type definitions: Add to `apps/gatherly/src/types/notification.ts` if new domain object
- Page: Add to `apps/gatherly/src/pages/notifications.tsx` if new route needed
- Route: Update `apps/gatherly/src/routes.tsx` to include new path

**New Component/Module:**

- Implementation: `apps/gatherly/src/components/{feature-name}/index.tsx`
- Styling: Tailwind classes inline, or extract to separate CSS file if complex
- Tests: `apps/gatherly/src/components/{feature-name}/index.spec.tsx`
- Stories: `apps/gatherly/src/components/{feature-name}/index.stories.tsx` for Storybook
- Export: Add barrel export in `apps/gatherly/src/components/index.ts`

**Utilities/Helpers:**

- Shared: `apps/gatherly/src/core/{domain}.ts` (e.g., `giftValidation.ts`)
- API-specific: `apps/api/src/routes/{resource}.ts` (e.g., `gifts.ts`)
- Tests: `apps/gatherly/src/core/{domain}.spec.ts`

**Database Schema Changes:**

- File: `apps/api/src/db/schema.sql` (append new tables or columns)
- Migration: Manual; run schema against PostgreSQL
- Types: Update `apps/gatherly/src/api/events.ts` or `apps/gatherly/src/types/gift.ts` to reflect changes
- Routes: Update `apps/api/src/routes/` to handle new fields

**New API Endpoint:**

- Route: Add handler to `apps/api/src/routes/{resource}.ts` (e.g., `gifts.ts`)
- Client: Add function to `apps/gatherly/src/api/{resource}.ts` (e.g., `giftsApi.newFunction()`)
- Type: Add to endpoint file if response shape is new
- Context: Update reducer if endpoint affects context state (e.g., GiftsContext)

## Special Directories

**apps/gatherly/src/components/examples/:**

- Purpose: Example components for reference and documentation
- Generated: No (hand-written examples)
- Committed: Yes
- Used by: Reference only; not imported in main code

**apps/gatherly/.storybook/:**

- Purpose: Storybook configuration for component documentation
- Generated: No (static config)
- Committed: Yes
- Run command: `pnpm storybook` from gatherly app

**apps/gatherly/cypress/:**

- Purpose: End-to-end tests
- Run command: `pnpm cypress:open` (interactive) or `pnpm cypress:run` (headless)
- Target: Full user flows (event creation, gift claiming, assignment viewing)

**apps/api/src/**tests**/:**

- Purpose: API endpoint tests
- Run command: `pnpm test` in api app (uses jest + supertest)
- Pattern: Test routes in isolation with mocked/real database connections

**apps/gatherly/src/test/:**

- Purpose: Jest configuration and test helpers
- Files: `jest.setup.js` (DOM setup), `index.tsx` (test wrapper with providers)
- Usage: Import from test helpers when writing component tests

**apps/gatherly/public/icons/:**

- Purpose: SVG icons used in components
- Format: .svg files (lucide-react is primary icon library)
- Usage: Import and reference in components via logo or icon components
