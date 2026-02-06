# gatherly Monorepo

A Turborepo-based monorepo containing the gatherly application.

## What's Inside?

This repository uses [Turborepo](https://turbo.build/repo) and contains the following packages/apps:

### Apps

- `gatherly`: React frontend application for managing gatherly events
- `api`: Express backend API with PostgreSQL database

### Packages

- `@repo/eslint-config`: Shared ESLint configurations
- `@repo/typescript-config`: Shared TypeScript configurations
- `@repo/jest-presets`: Shared Jest test configurations
- `@repo/logger`: Shared logging utility

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- PostgreSQL 14+

### Quick Start

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Set up PostgreSQL database:**

   ```bash
   createdb gatherly
   psql -d gatherly -f apps/api/src/db/schema.sql
   ```

3. **Configure environment:**

   Create `apps/api/.env`:

   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=gatherly
   DB_USER=postgres
   DB_PASSWORD=postgres
   PORT=5001
   ```

   Create `apps/gatherly/.env`:

   ```env
   VITE_API_URL=http://localhost:5001
   ```

4. **Start development servers:**

   ```bash
   # Terminal 1 - API
   cd apps/api
   pnpm dev

   # Terminal 2 - Frontend
   cd apps/gatherly
   pnpm dev
   ```

5. **Open the app:**
   - Frontend: http://localhost:3000
   - API: http://localhost:5001

## Available Scripts

From the root directory:

- `pnpm dev` - Start all apps in development mode
- `pnpm build` - Build all apps
- `pnpm lint` - Lint all packages
- `pnpm test` - Run all tests

## Documentation

See the [gatherly App README](./apps/gatherly/README.md) for detailed documentation.

## Turborepo

This repository uses Turborepo for efficient builds and caching. Learn more:

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Tasks](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks)
- [Caching](https://turbo.build/repo/docs/core-concepts/caching)

## Remote Caching

Turborepo can use a remote cache to share build artifacts across machines. Learn more:

- [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)
