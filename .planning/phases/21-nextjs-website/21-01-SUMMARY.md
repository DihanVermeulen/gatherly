---
phase: 21-nextjs-website
plan: 01
subsystem: ui
tags: [nextjs, tailwind, react, typescript, universal-links, app-links, monorepo]

# Dependency graph
requires:
  - phase: 20-magic-link-redirect-website
    provides: well-known file content (AASA + assetlinks.json) copied to apps/web
provides:
  - Next.js 15 workspace package at apps/web registered in pnpm monorepo
  - Tailwind v4 CSS-first config with brand teal tokens (#1DB8A0 as bg-brand-500)
  - Root layout wrapping every page with persistent Nav and Footer
  - Nav with logo, Features/How it Works/Pricing/Download links, Get Started CTA
  - 4-column Footer (brand tagline, Product, Company, Support columns)
  - AASA and assetlinks.json files at apps/web/public/.well-known/
affects:
  - 21-02 (home page depends on root layout, Nav, Footer, brand tokens)
  - 21-03 (download page depends on root layout and brand tokens)
  - 21-04 (magic link redirect depends on Next.js server config for AASA header)

# Tech tracking
tech-stack:
  added:
    - next@latest (Next.js 15, App Router)
    - react@19.1.0
    - react-dom@19.1.0
    - lucide-react@latest
    - tailwindcss@latest (v4, CSS-first)
    - "@tailwindcss/postcss@latest"
    - "@types/react, @types/react-dom, @types/node"
  patterns:
    - Tailwind v4 CSS-first config via @theme block in globals.css (no tailwind.config.js)
    - Next.js App Router root layout with persistent Nav + Footer
    - Monorepo workspace wiring via pnpm-workspace.yaml apps/* glob
    - AASA served with Content-Type: application/json via next.config.ts headers()

key-files:
  created:
    - apps/web/package.json
    - apps/web/next.config.ts
    - apps/web/postcss.config.mjs
    - apps/web/tsconfig.json
    - apps/web/eslint.config.mjs
    - apps/web/app/globals.css
    - apps/web/app/layout.tsx
    - apps/web/app/page.tsx
    - apps/web/components/nav.tsx
    - apps/web/components/footer.tsx
    - apps/web/public/.well-known/apple-app-site-association
    - apps/web/public/.well-known/assetlinks.json
  modified:
    - pnpm-lock.yaml (updated with new web workspace deps)
    - package.json (monorepo root updated)

key-decisions:
  - "Tailwind v4 CSS-first config: brand tokens in @theme block in globals.css, no tailwind.config.js file"
  - "Port 3001 for apps/web dev server (port 3000 taken by apps/gatherly)"
  - "AASA Content-Type header set in next.config.ts headers() — required for iOS Universal Links"
  - "Inter font via next/font/google with CSS variable --font-inter, consumed in @theme as --font-sans"

patterns-established:
  - "Brand token pattern: --color-brand-{shade} in @theme block, usable as bg-brand-500 etc. via Tailwind v4"
  - "Next.js App Router layout pattern: RootLayout wraps all pages with Nav + Footer in body"
  - "Workspace alias @/* maps to apps/web/* root via tsconfig paths"

# Metrics
duration: 3min
completed: 2026-03-06
---

# Phase 21 Plan 01: Monorepo Scaffold Summary

**Next.js 15 workspace at apps/web with Tailwind v4 brand tokens, persistent Nav + Footer root layout, and .well-known deep link files — bootable on port 3001**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-06T14:16:53Z
- **Completed:** 2026-03-06T14:19:34Z
- **Tasks:** 2
- **Files modified:** 12 created + 2 updated (pnpm-lock.yaml, package.json)

## Accomplishments

- Scaffolded `apps/web` as a valid pnpm workspace package with Next.js 15, Tailwind v4, TypeScript config extending monorepo presets
- Created root layout with Inter font, Nav (logo + 4 nav links + Get Started CTA) and 4-column Footer visible on every route
- Placed AASA and assetlinks.json under `apps/web/public/.well-known/` with correct Content-Type header configured in next.config.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold package config files** - `2492af4` (feat)
2. **Task 2: Tailwind v4 globals, root layout, Nav, Footer, .well-known files** - `8c5a0d1` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/web/package.json` - Next.js 15 workspace package, port 3001 dev script
- `apps/web/next.config.ts` - AASA Content-Type header via headers()
- `apps/web/postcss.config.mjs` - @tailwindcss/postcss plugin for Tailwind v4
- `apps/web/tsconfig.json` - extends @repo/typescript-config/nextjs.json, @/* alias
- `apps/web/eslint.config.mjs` - uses @repo/eslint-config/next preset
- `apps/web/app/globals.css` - Tailwind v4 @import with @theme brand teal tokens
- `apps/web/app/layout.tsx` - root layout with Inter font, Nav + Footer
- `apps/web/app/page.tsx` - placeholder home page for Plan 02
- `apps/web/components/nav.tsx` - sticky nav with logo, 4 links, Get Started button
- `apps/web/components/footer.tsx` - 4-column footer matching Home.png design
- `apps/web/public/.well-known/apple-app-site-association` - iOS Universal Links for magic-link/*
- `apps/web/public/.well-known/assetlinks.json` - Android App Links verification

## Decisions Made

- Tailwind v4 CSS-first config: all brand tokens in `@theme` block inside `globals.css` — no `tailwind.config.js` needed
- Port 3001 for `apps/web` dev server; port 3000 is occupied by `apps/gatherly`
- AASA file served with `Content-Type: application/json` via `next.config.ts` `headers()` — required for iOS Universal Links to work correctly
- Inter loaded via `next/font/google` and injected as `--font-inter` CSS variable, mapped to `--font-sans` in `@theme` block

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - pnpm install resolved all dependencies cleanly. TypeScript check passed with no errors after creating all files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- apps/web is bootable (`pnpm dev` in apps/web starts Next.js on port 3001)
- All brand tokens, layout, Nav, and Footer are in place — Plan 02 (home page) can build hero + feature sections immediately
- .well-known files are in place for deep link verification
- TypeScript compiles cleanly

---
*Phase: 21-nextjs-website*
*Completed: 2026-03-06*
