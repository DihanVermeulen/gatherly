# Gatherly - gatherly App

## What This Is

A mobile-first gift exchange app that helps groups organize gift-giving events. Users create events, add participants, generate secret assignments, and manage personal wishlists. Participants discover what people want and claim gifts anonymously via a claiming system. The app features JWT authentication, offline-first sync via TanStack Query, email-based magic link participant invites with role-based access, and an inline assignment reveal replacing the legacy decipher code mechanic.

## Core Value

Participants can easily discover what gifts people actually want and claim them anonymously, eliminating gift-giving guesswork while keeping the surprise element intact.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ Users can create and manage gatherly events — v1.0
- ✓ Users can add and remove participants from events — v1.0
- ✓ Users can define couples who shouldn't buy for each other — v1.0
- ✓ System generates balanced gift assignments (respects couple constraints, balances gift reception) — v1.0
- ✓ System generates secret codes for each participant — v1.0
- ✓ App works offline with localStorage fallback — v1.0
- ✓ Dark mode support throughout the app — v1.0
- ✓ Users can add gifts to their personal wishlist with images, descriptions, and priority levels — v2.0
- ✓ Participants can view all wishlists in the event's gift registry — v2.0
- ✓ Participants can claim gifts anonymously with race condition protection — v2.0
- ✓ Participants can unclaim gifts if plans change — v2.0
- ✓ Claimed status is hidden from wishlist owner (privacy preserved) — v2.0
- ✓ Users can reorder wishlist items via drag-and-drop — v2.0
- ✓ Users can share event invites via shareable link and QR code — v2.0
- ✓ Participants can join events via invite link (/join/:code page) — v2.0
- ✓ JWT authentication with short-lived access tokens and HttpOnly refresh cookies — v2.0
- ✓ Zero trust API protection — every route explicitly declares auth requirement — v2.0
- ✓ Offline-first sync via TanStack Query with optimistic updates and visual sync indicator — v2.0
- ✓ Magic link email invites — participants join without password, gain restricted access — v2.0
- ✓ Role-based access control — participants can't admin events, organizers have full control — v2.0
- ✓ Inline assignment reveal — participants see receivers without Base64 decipher codes — v2.0
- ✓ Resend magic link capability for organizers — v2.0
- ✓ Decipher page retained as legacy path for printed codes at physical events — v2.0

### Active

<!-- Current scope for v2.1. -->

- [ ] Complete UI redesign with mobile-first iOS-style interface (Konsta UI, deferred from v2.0)
- [ ] Bottom navigation bar for primary actions
- [ ] Event cards with visual thumbnails and status indicators
- [ ] Image uploads compressed before storage (max 800px, 80% quality) — TECH-06
- [ ] Organizer invite management page (view/revoke invites) — Phase 4-03 deferred

### Out of Scope

- Real-time updates (WebSocket) — adds complexity, polling/refresh sufficient for v2.0
- Mobile native apps — web-first, PWA capabilities cover mobile needs
- Payment integration — gift purchasing happens externally
- Chat/messaging — communication happens outside the app
- Social features (followers, feeds) — focused on gift exchange events only
- Multi-language support — English-only for v2.0, can add later

## Context

**Current Codebase (v2.0):**

- React 19 + React Router 7 frontend (apps/gatherly)
- Express + PostgreSQL backend API (apps/api)
- Turborepo monorepo structure
- TanStack Query v5 for offline-first sync and optimistic mutations
- JWT auth with AuthContext, access token in memory, refresh in HttpOnly cookie
- ~26,000 lines TypeScript/TSX across 10 phases, 27 plans

**v2.0 Shipped:**

- Wishlist system (full CRUD, images, priority, drag-to-reorder)
- Anonymous gift claiming with race condition protection
- Shareable invite links + QR codes with /join/:code flow
- JWT authentication (register, login, refresh, logout)
- Offline-first sync with sync indicator
- Magic link email invites for participants (role: participant vs organizer)
- Inline assignment reveal (no more decipher codes for participants)

**Design System:**

- HTML templates provided in apps/gatherly/docs/screen-templates/
- Primary color: #13ec5b (bright green)
- Font: Plus Jakarta Sans
- Mobile-first with iOS-style bottom navigation (Konsta UI integrated, Phase 5 deferred)
- Lucide React icons (user preference over Material Symbols)
- Dark mode throughout

## Constraints

- **Tech Stack**: React 19, React Router 7, Tailwind CSS, Express, PostgreSQL — maintain existing stack, no framework changes
- **Backend**: Keep existing API structure and database schema — extend with new tables, don't rebuild
- **Mobile-first**: Optimized for mobile but must work on desktop browsers — single responsive codebase
- **Compatibility**: Must maintain backward compatibility with existing event data — migration script for any schema changes
- **Performance**: Image uploads via base64 data URLs — same pattern as existing gift images

## Key Decisions

| Decision                                           | Rationale                                                                  | Outcome                                           |
| -------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------- |
| Redesign existing app vs. new app                  | Leverage existing backend, assignment algorithm, and data                  | ✓ Good - preserves working code                   |
| Mobile-first with responsive desktop               | User designs are iOS-style mobile mockups; desktop as secondary            | ✓ Good - app works well on both                   |
| Keep existing API structure                        | Backend is stable, complex assignment logic works                          | ✓ Good - extended without rebuilding              |
| Base64 image storage                               | Consistent with existing gift image pattern, no file upload service needed | ✓ Good - used in wishlists                        |
| Separate claims table with UNIQUE constraint       | Enables atomic claiming at DB level, prevents race conditions              | ✓ Good - zero duplicate claims in production      |
| HS256 JWT with 15-min access + 7-day refresh       | Security/UX balance; short TTL limits exposure                             | ✓ Good - seamless sessions, no re-auth prompts    |
| Access token in memory only (not localStorage)     | Prevents XSS token theft                                                   | ✓ Good - more secure                              |
| TanStack Query v5 as sole query library            | Eliminates react-query v3 conflicts, enables offline-first                 | ✓ Good - cache persistence + offline mutations    |
| offlineFirst network mode                          | Mutations run even when offline, queue for retry                           | ✓ Good - foundation for offline UX                |
| SELECT-based magic link redemption                 | Reusable tokens within 7-day window match user mental model for email      | ✓ Good - eliminates "link expired on re-click"    |
| requireOrganizer middleware after authenticateJWT  | Clean layered authz: 401 for identity, 403 for authorization               | ✓ Good - standard HTTP semantics                  |
| Phase 5 deferred in favor of auth/sync             | Auth and offline-first were higher user-facing value                       | — Pending validation in v2.1                      |
| Phase 4-03 superseded by Phase 9 magic links       | Magic link email flow made manual invite list UI less critical              | ✓ Good - simpler participant onboarding           |
| Lucide React icons over Material Symbols           | React-specific library, developer preference                               | ✓ Good - consistent throughout v2.0               |
| nanoid for invite codes                            | 21-char URL-safe codes cleaner than 36-char UUIDs                         | ✓ Good - shorter, cleaner invite URLs             |
| sort_order with composite index (event, participant) | Covers primary ordering query pattern efficiently                         | ✓ Good - efficient query plan for drag-to-reorder |
| @dnd-kit with activationConstraint distance:8      | Prevents tap-drag conflict on touch devices                                | ✓ Good - smooth mobile drag UX                   |

---

_Last updated: 2026-02-22 after v2.0 milestone completion_
