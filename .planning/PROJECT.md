# Gatherly - gatherly App

## What This Is

A gift exchange app that helps groups organize gift-giving events. Users create events, add participants, generate secret assignments, and manage personal wishlists. Participants discover what people want and claim gifts anonymously. The app features JWT authentication, offline-first sync, email-based magic link participant invites with role-based access, and an inline assignment reveal. v2.1 ships gatherly-mobile — a full React Native client (Expo + GlueStack) replacing the web app as the primary mobile experience.

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

<!-- Current scope for v2.1 — Gatherly Mobile (React Native). -->

- [ ] Events screen — list all events, create/delete, matches Events.png template — v2.1
- [ ] Event details screen — inline assignment reveal, participant list, matches Details.png template — v2.1
- [ ] Edit/Create event screen — participants, couples, gift count, code generation, matches Edit.png template — v2.1
- [ ] Login + Register screens — JWT auth with email/password (screen templates needed) — v2.1
- [ ] My Wishlist screen — add/edit/delete/reorder own wishlist items (screen template needed) — v2.1
- [ ] Event Wishlists screen — browse all participants' wishlists, claim/unclaim gifts (screen template needed) — v2.1
- [ ] Join Event screen — join via invite link, 5-state flow (screen template needed) — v2.1
- [ ] Organizer Invite Management screen — view/resend/revoke sent invites (screen template needed) — v2.1
- [ ] Full navigation setup — Expo Router routes wired, bottom tab navigation or equivalent — v2.1
- [ ] Screen template rule — if a screen template is missing, ask user to create it before implementation — v2.1

### Out of Scope

- Real-time updates (WebSocket) — adds complexity, polling/refresh sufficient
- Payment integration — gift purchasing happens externally
- Chat/messaging — communication happens outside the app
- Social features (followers, feeds) — focused on gift exchange events only
- Multi-language support — English-only for now, can add later
- Image compression — not selected for v2.1, defer to future
- Web app feature changes — web app (apps/gatherly) is maintained as-is; all new feature work goes into gatherly-mobile

## Context

**Current Codebase (v2.0 web + v2.1 mobile in progress):**

- React 19 + React Router 7 frontend (apps/gatherly) — web app, maintained as-is
- React Native 0.81.5 + Expo 54 mobile app (apps/gatherly-mobile) — PRIMARY for v2.1
- Express + PostgreSQL backend API (apps/api) — shared by both clients
- Turborepo monorepo structure

**gatherly-mobile current state (v2.1 start):**

- Framework: Expo 54, Expo Router 6, React 19, GlueStack UI v3 (51 components), NativeWind 4.2
- API client: Axios with JWT in-memory storage, auto-refresh interceptor, request queuing on 401
- Auth API: login, register, refresh, logout functions
- EventsContext: hybrid storage (API/localStorage fallback), same pattern as web app
- API modules: events, gifts, wishlists, decipher — all ported from web
- Screens partially done: Events list (index.tsx), Edit event (edit-event.tsx), Create event component
- Screen templates: Events.png, Edit.png, Details.png in apps/gatherly-mobile/screen-templates/

**Design System (mobile):**

- GlueStack UI components in apps/gatherly-mobile/components/ui/ — use these, don't create custom
- Screen templates: PNG mockups in apps/gatherly-mobile/screen-templates/ — implement exactly
- If a screen template is missing, ask the user to create it before implementing
- Lucide React Native icons (lucide-react-native installed)
- NativeWind for styling (Tailwind classes in React Native)

## Constraints

- **Mobile tech stack**: Expo 54 + Expo Router 6 + GlueStack UI + NativeWind — use what's installed, no new major frameworks
- **GlueStack first**: Use components from apps/gatherly-mobile/components/ui/ — don't create custom UI primitives when GlueStack has them
- **Screen templates required**: Every screen must have a PNG template in screen-templates/ before implementation; if missing, ask user to create it
- **Backend unchanged**: Keep existing API structure and database schema — gatherly-mobile is a new frontend for the same API
- **Web app unchanged**: apps/gatherly (web) is not modified in v2.1; all new work goes into gatherly-mobile
- **Compatibility**: gatherly-mobile hits the same API as the web app — no backend changes except organizer invite management endpoint if needed

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
| Phase 5 deferred in favor of auth/sync             | Auth and offline-first were higher user-facing value                       | ✓ Good - v2.1 does native mobile instead          |
| Phase 4-03 superseded by Phase 9 magic links       | Magic link email flow made manual invite list UI less critical              | ✓ Good - simpler participant onboarding           |
| Lucide React icons over Material Symbols           | React-specific library, developer preference                               | ✓ Good - consistent throughout v2.0               |
| nanoid for invite codes                            | 21-char URL-safe codes cleaner than 36-char UUIDs                         | ✓ Good - shorter, cleaner invite URLs             |
| sort_order with composite index (event, participant) | Covers primary ordering query pattern efficiently                         | ✓ Good - efficient query plan for drag-to-reorder |
| @dnd-kit with activationConstraint distance:8      | Prevents tap-drag conflict on touch devices                                | ✓ Good - smooth mobile drag UX                   |
| React Native (gatherly-mobile) replaces web as primary app | Mobile-first strategy; Expo + GlueStack already scaffolded         | — Pending v2.1 completion                         |
| GlueStack UI over Konsta UI                        | GlueStack already installed and scaffolded in gatherly-mobile; Konsta was v2.0 plan | — Pending validation                  |
| Expo Router for navigation                         | File-based routing matches React Router mental model; good Expo ecosystem fit | — Pending v2.1 completion                      |

---

_Last updated: 2026-02-22 after v2.1 milestone started_
