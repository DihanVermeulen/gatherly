# Gatherly - gatherly App

## What This Is

A mobile-first gatherly gift exchange app that helps groups organize gift-giving events. Users create events, add participants, define couple constraints, generate secret assignments, and manage gift wishlists. The app features a modern iOS-style interface with dark mode support and works seamlessly on both mobile and desktop browsers.

## Core Value

Participants can easily discover what gifts people actually want and claim them anonymously, eliminating gift-giving guesswork while keeping the surprise element intact.

## Requirements

### Validated

<!-- Shipped and confirmed valuable in the existing app. -->

- ✓ Users can create and manage gatherly events — v1.0
- ✓ Users can add and remove participants from events — v1.0
- ✓ Users can define couples who shouldn't buy for each other — v1.0
- ✓ System generates balanced gift assignments (respects couple constraints, balances gift reception) — v1.0
- ✓ System generates secret codes for each participant — v1.0
- ✓ Users can decipher secret codes to reveal their assignment — v1.0
- ✓ App works offline with localStorage fallback — v1.0
- ✓ Dark mode support throughout the app — v1.0

### Active

<!-- Current scope. Building toward these in v2.0 redesign. -->

- [ ] Users can add gifts to their personal wishlist with images, descriptions, and priority levels
- [ ] Participants can view all wishlists in the event's gift registry
- [ ] Participants can claim gifts anonymously ("I'll buy this")
- [ ] Participants can unclaim gifts if plans change
- [ ] Users can share event invites via link, email, and QR code
- [ ] System tracks invite status (joined/pending)
- [ ] Users can resend invites to pending participants
- [ ] Event organizers can view participant join status
- [ ] Complete UI redesign with mobile-first iOS-style interface
- [ ] Bottom navigation bar for primary actions
- [ ] Event cards with visual thumbnails and status indicators
- [ ] Participant avatars throughout the interface
- [ ] Secret assignment reveal card with festive design

### Out of Scope

- Real-time updates (WebSocket) — adds complexity, polling/refresh sufficient for v2.0
- Mobile native apps — web-first, PWA capabilities cover mobile needs
- Payment integration — gift purchasing happens externally
- Chat/messaging — communication happens outside the app
- Social features (followers, feeds) — focused on gift exchange events only
- Multi-language support — English-only for v2.0, can add later

## Context

**Existing Codebase:**

- React 19 + React Router 7 frontend (apps/gatherly)
- Express + PostgreSQL backend API (apps/api)
- Turborepo monorepo structure
- Hybrid localStorage/API storage pattern
- Complex assignment algorithm (up to 2000 permutations, balanced distribution)

**User Research:**

- Current app is functional but visually dated
- Users want to know what gifts people actually want (wishlist feature)
- Participants need a way to coordinate gift-buying without spoiling surprises (claiming)
- Event organizers struggle with invite tracking

**Design System:**

- HTML templates provided in apps/gatherly/docs/screen-templates/
- Primary color: #13ec5b (bright green)
- Font: Plus Jakarta Sans
- Mobile-first with iOS-style bottom navigation
- Material Symbols icons
- Dark mode throughout

## Constraints

- **Tech Stack**: React 19, React Router 7, Tailwind CSS, Express, PostgreSQL — maintain existing stack, no framework changes
- **Backend**: Keep existing API structure and database schema — extend with new tables, don't rebuild
- **Mobile-first**: Optimized for mobile but must work on desktop browsers — single responsive codebase
- **Compatibility**: Must maintain backward compatibility with existing event data — migration script for any schema changes
- **Performance**: Image uploads via base64 data URLs — same pattern as existing gift images

## Key Decisions

| Decision                           | Rationale                                                                  | Outcome                         |
| ---------------------------------- | -------------------------------------------------------------------------- | ------------------------------- |
| Redesign existing app vs. new app  | Leverage existing backend, assignment algorithm, and data                  | ✓ Good - preserves working code |
| Mobile-first vs. responsive design | User designs are iOS-style mobile mockups, desktop as secondary            | — Pending                       |
| Keep existing API structure        | Backend is stable, complex assignment logic works                          | — Pending                       |
| Base64 image storage               | Consistent with existing gift image pattern, no file upload service needed | — Pending                       |

---

_Last updated: 2026-02-06 after project initialization_
