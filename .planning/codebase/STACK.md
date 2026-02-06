# Technology Stack

**Analysis Date:** 2026-02-06

## Languages

**Primary:**
- TypeScript 5.9.3 - All backend and frontend code
- JavaScript - Frontend configuration and utilities

**Secondary:**
- SQL (PostgreSQL) - Database schema and queries at `apps/api/src/db/schema.sql`

## Runtime

**Environment:**
- Node.js 18+ (specified in root `package.json`)
- Browser environments (React 19+ based applications)

**Package Manager:**
- pnpm 8.15.6 (monorepo package manager)
- Lockfile: `pnpm-lock.yaml` (present)

## Frameworks

**Core:**
- Express 4.21.2 - Backend HTTP server (`apps/api/`)
- React 19.2.3 - Frontend UI framework (`apps/gatherly/`)
- React Router 7.11.0 - Client-side routing

**Build Tools:**
- Turbo 2.8.1 - Monorepo orchestration and caching
- Vite 5.4.14 - Admin app bundler and dev server (`apps/admin/`)
- tsdown 0.9.3 - TypeScript bundler for API (`apps/api/`)
- react-scripts 5.0.1 - CRA-based build for gatherly app
- craco 7.1.0 - CRA configuration override for gatherly

**Testing:**
- Jest 29.7.0 - Unit test runner (preset: `@repo/jest-presets`)
- Supertest 7.1.0 - HTTP assertions for API tests (`apps/api/src/__tests__/`)
- React Testing Library 16.3.1 - Component testing
- Cypress 15.8.1 - E2E testing (`apps/gatherly/cypress/`)

**Development:**
- TypeScript 5.9.3 - Type checking compiler
- ESLint 9.39.0 - Code linting (config: `@repo/eslint-config`)
- Prettier 3.6.0 - Code formatting
- Morgan 1.10.0 - HTTP request logging

## Key Dependencies

**Critical:**
- pg 8.11.3 & 8.18.0 - PostgreSQL client library with connection pooling
- axios 1.13.2 - HTTP client for frontend API calls
- body-parser 1.20.3 - Express middleware for parsing request bodies
- cors 2.8.5 - Cross-Origin Resource Sharing middleware

**Infrastructure:**
- react-query 3.39.3 - Server state management (deprecated but used)
- react-use 17.6.0 - React hooks utilities
- i18next 25.7.3 & react-i18next 16.5.0 - Internationalization
- lucide-react 0.562.0 - Icon component library
- web-vitals 5.1.0 - Performance metrics

**Styling:**
- Tailwind CSS (PostCSS 7 compat) - Utility-first CSS framework
- PostCSS 8.5.6 - CSS transformation tool
- Autoprefixer 10.4.23 - Browser vendor prefix support

**Storybook:**
- @storybook/react 10.1.10 - UI component development
- @storybook/addon-essentials 8.6.14 - Essential addons
- @storybook/preset-create-react-app 10.1.10 - CRA integration

## Configuration

**Environment:**
- Root `.npmrc`: `auto-install-peers = true`
- API `.env.example`: Database credentials (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, PORT)
- Frontend `.env.example`: API URL (VITE_API_URL)

**Build:**
- `turbo.json` - Monorepo task configuration with caching rules
- `pnpm-workspace.yaml` - Workspace package definitions
- `apps/api/tsconfig.json` - Extends `@repo/typescript-config/base.json`, targets ES2015
- `apps/gatherly/tsconfig.json` - Target ES5, baseUrl: `src`, JSX: react-jsx
- `apps/admin/tsconfig.json` - TypeScript with React support
- `apps/gatherly/craco.config.js` - CRA overrides for Tailwind
- `apps/gatherly/postcss.config.js` - PostCSS configuration
- `apps/gatherly/tailwind.config.js` - Tailwind CSS configuration

**CI/CD:**
- GitHub Actions workflow at `.github/workflows/ci.yml`
- Runs on Ubuntu 22.04 with Node 22 and pnpm 9
- Jobs: lint, test, E2E tests with Cypress

## Platform Requirements

**Development:**
- Node.js 18+
- pnpm 8.15.6+
- PostgreSQL 14+ (for API)
- Git

**Production:**
- Node.js 18+ runtime
- PostgreSQL 14+ database
- Environment variables for database configuration
- Port 5001 for API (configurable via PORT env var)

---

*Stack analysis: 2026-02-06*
