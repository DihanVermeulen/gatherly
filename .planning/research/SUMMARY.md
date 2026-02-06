# Project Research Summary

**Project:** Gatherly - Secret Santa Gift Exchange App v2.0
**Domain:** Gift Exchange Event Management with Wishlists and Anonymous Claiming
**Researched:** 2026-02-06
**Confidence:** HIGH

## Executive Summary

Gatherly v2.0 adds three major feature sets to the existing Secret Santa app: personal wishlists, anonymous gift claiming, and an invite system with QR codes. Research shows this is a competitive necessity—all modern gift exchange platforms (Elfster, Giftster, Drawnames) offer wishlists and claiming as table stakes. The key architectural challenge is maintaining the existing assignment algorithm and privacy model while integrating new features that could inadvertently reveal Secret Santa assignments.

The recommended approach extends the existing React 19 + Express + PostgreSQL stack with lightweight additions: Konsta UI for iOS-style mobile components, qrcode.react for invite QR codes, nodemailer for email invitations, and @hello-pangea/dnd for wishlist priority drag-and-drop. The hybrid localStorage/API storage pattern remains, but wishlists and claiming should be API-only features to avoid complex synchronization logic. The existing EventsContext should be extended rather than creating separate contexts, keeping state management simple for the v2.0 scope.

The critical risk is privacy leaks—if claiming patterns reveal who is buying for whom, the entire Secret Santa anonymity promise breaks. Prevention requires careful authorization: only show claim status to the assigned giver, never expose claimer identity to the wishlist owner until reveal date. Secondary risks include race conditions in concurrent claiming (mitigated with PostgreSQL UNIQUE constraints and ON CONFLICT handling), database migration complexity (use expand-migrate-contract pattern), and mobile performance with image-heavy wishlists (implement compression and lazy loading from day one).

## Key Findings

### Recommended Stack

**v2.0 stack additions focus on mobile UI, QR codes, email, and drag-and-drop while keeping the validated React 19 + Express + PostgreSQL foundation intact.**

**Core technologies:**
- **Konsta UI v5.0.0**: iOS-style mobile components with Tailwind CSS integration — pixel-perfect iOS 26 design, bottom navigation, 200+ components, React 19 compatible
- **qrcode.react v4.2.0**: QR code generation for invite sharing — most popular React QR library (1,175 dependents), SVG rendering, customizable
- **nodemailer v8.0.0**: Email sending for invitations — industry standard with zero dependencies, improved error handling and connection fallback in latest version
- **@hello-pangea/dnd v17.0.0**: Drag-and-drop for wishlist priority — community fork of react-beautiful-dnd (discontinued), accessibility-first, smooth animations
- **react-material-symbols v3.7.2**: Material Symbols icons — replaces lucide-react for consistency with iOS design system
- **@fontsource-variable/plus-jakarta-sans v5.3.0**: Variable font for modern geometric sans serif — single file for all weights 200-800, self-hosted
- **validator v13.12.0**: Email validation (client + server) — RFC 5322 compliant, works in Node.js and browser

**Critical upgrade required:** Tailwind CSS from postcss7-compat@2.2.17 to v3.4.19+ (Konsta UI requires v3, current version is 4+ years old and missing JIT compiler).

**Supporting libraries already installed:** axios (HTTP client), react-query (caching), pg (PostgreSQL client) — all sufficient for v2.0 needs.

### Expected Features

**Competitors (Elfster, Giftster, Giftwhale, Drawnames) all offer wishlists and claiming, but separate Secret Santa generators from wishlist apps. Gatherly's differentiator is unified assignment + wishlist in one flow.**

**Must have (table stakes):**
- Personal wishlists per participant with images, descriptions, links, prices, and 3-tier priority levels
- Retailer-agnostic wishlist items (any URL + manual entry, not locked to specific stores)
- Anonymous gift claiming ("Someone is buying this" without revealing who to the wishlist owner)
- Event invite links with shareable URLs and QR codes
- Participant status tracking (pending/joined) visible to organizers
- Mobile-first UI with iOS 2026 patterns (bottom navigation, thumb-friendly, Dynamic Type support)
- Direct retailer links for one-click purchasing
- Real-time claim updates to prevent race conditions on popular items

**Should have (competitive):**
- Integrated wishlist + assignment system (see assigned person's wishlist after code decipher)
- Offline-first wishlist editing (extends existing localStorage pattern)
- Email invite option (complement link sharing)
- Organizer dashboard showing event status and completion metrics
- QR codes for physical gathering invitations (2026 trend for weddings, parties)

**Defer (v2+):**
- Wishlist import from retailers (complex parsing logic, unclear ROI)
- Group chat integration (users already have WhatsApp/Messenger)
- AI gift suggestions (user distrust of AI in 2026, feels impersonal)
- Price tracking/alerts (scope creep, maintenance burden)
- Multi-event wishlists (data sync complexity outweighs benefit)
- Public wishlist profiles (shifts from private events to social network)

### Architecture Approach

**Extend existing architecture rather than rebuilding. Add new tables (wishlists, invites) while keeping current tables (events, participants, couples, assignments, gifts, gift_claims) unchanged.**

**Major components:**
1. **Database Layer** — Add `wishlists` table (event_id, participant_id, name, description, image_url, url, priority, claimed_by) and `invites` table (event_id, participant_id, status, invite_code, sent_at, responded_at) with ON DELETE CASCADE foreign keys for automatic cleanup
2. **API Layer** — New routes `/api/events/:id/wishlists` and `/api/events/:id/invites` following existing pattern; extend `/api/events/:id` responses to include wishlist_count and invite_status
3. **Frontend State** — Extend EventsContext with wishlists and invites in Event type (Option A: single context recommended over separate contexts for v2.0 scope); add actions WISHLIST_ADD, WISHLIST_UPDATE, WISHLIST_DELETE, WISHLIST_REORDER, GIFT_CLAIM, GIFT_UNCLAIM, INVITE_SEND, INVITE_STATUS_UPDATE
4. **Hybrid Storage** — Keep localStorage fallback for events and wishlists (user-facing data), make invites API-only (email sending requires backend); implement versioned schemas for migration
5. **Assignment Integration** — Do NOT modify existing assignment algorithm to enforce wishlist constraints; wishlists are suggestions, not requirements; keep algorithm's 2000-permutation greedy backtracking unchanged

**Key patterns:**
- **Optimistic updates with rollback** for claiming (useOptimistic in React 19) — instant feedback, rollback on server rejection
- **Atomic claiming with ON CONFLICT** to prevent race conditions — `INSERT INTO gift_claims ... ON CONFLICT (gift_id) DO NOTHING RETURNING id`
- **Event phase state machine** (setup → invite_pending → wishlist_creation → assigned → revealed) — controls visibility and editing permissions
- **Expand-migrate-contract database migrations** — add tables/columns with defaults, migrate gradually, contract only after validation

### Critical Pitfalls

Research identified 12 pitfalls ranging from critical (require rewrites) to minor (fixable). Top 5 critical/moderate pitfalls:

1. **Privacy leaks through claiming patterns** — If wishlist owners see WHO claimed their items, they can deduce their Secret Santa. PREVENTION: Never expose claimer identity until reveal date; use assignment-based authorization (only show claim status to the assigned giver); store claim data server-side only, not in client state visible to wishlist owner.

2. **Race conditions in gift claiming** — Two participants simultaneously claim same gift (TOCTOU vulnerability in check-then-insert pattern). PREVENTION: Use PostgreSQL UNIQUE constraint on gift_claims.gift_id + `ON CONFLICT DO NOTHING` for atomic claims; return HTTP 409 on conflict; implement retry logic on frontend with exponential backoff.

3. **Data consistency between localStorage and API with new features** — Hybrid storage breaks down with complex relational data (wishlists with claims, invites with status). PREVENTION: Make wishlists/claiming/invites API-only features (recommended) OR implement proper sync with useSyncExternalStore + versioned schemas + conflict resolution; add feature flags to disable features in localStorage mode.

4. **Assignment algorithm broken by wishlist requirements** — If wishlists become hard constraints ("must receive gifts FROM wishlist"), algorithm becomes unsatisfiable when wishlist size < giftCount. PREVENTION: Keep wishlists as suggestions, not requirements; do NOT modify assignment algorithm; allow givers to buy off-wishlist gifts; add diagnostics for unsatisfiable wishlists if needed.

5. **Database migration breaking existing events** — Adding new tables with foreign keys could break existing events in localStorage or database. PREVENTION: Use expand-migrate-contract pattern (add tables with optional relationships, migrate gradually, contract only after validation); add schema_version field to events table; make wishlists opt-in via has_wishlists boolean flag; test with real production data samples.

**Other notable pitfalls:** Mobile performance with base64 images (implement compression + lazy loading + thumbnails from day 1), email deliverability and privacy (use transactional service like SendGrid, send individual emails not BCC, strip affiliate tracking codes from URLs), UX confusion around timing (implement phase state machine before coding), React Context performance degradation (split contexts or consider Zustand + TanStack Query if EventsContext grows too large).

## Implications for Roadmap

Based on research, suggested phase structure prioritizes foundational data model and privacy safeguards before feature implementation:

### Phase 1: Foundation & Privacy (Data Model + Tailwind Upgrade)
**Rationale:** Database schema and privacy architecture must be correct from day one. Race condition fixes and authorization logic are architectural decisions that can't be retrofitted. Tailwind upgrade is prerequisite for Konsta UI.

**Delivers:**
- Database migrations (wishlists, invites tables with indexes)
- Schema versioning system (expand-migrate-contract pattern)
- Authorization rules (assignment-based visibility, claim anonymity)
- Atomic claiming with race condition protection (ON CONFLICT)
- Tailwind CSS v3.4.19+ upgrade (from postcss7-compat@2.2.17)
- Migration script for existing events (backward compatibility verified)

**Addresses:**
- Pitfall 1 (privacy leaks), Pitfall 2 (race conditions), Pitfall 3 (localStorage sync), Pitfall 5 (migration breaking events)
- Feature requirement: anonymous claiming foundation
- Stack requirement: Tailwind v3+ for Konsta UI

**Avoids:**
- Breaking existing events through careful migration
- Privacy violations by designing authorization first

### Phase 2: Wishlist Core (CRUD + Display)
**Rationale:** Wishlists are the main value proposition. Build CRUD operations and basic display before adding claiming complexity. Keep algorithm unchanged (wishlists as suggestions, not constraints).

**Delivers:**
- API endpoints (`POST/PUT/DELETE /api/events/:id/wishlists`)
- EventsContext extensions (WISHLIST_ADD, WISHLIST_UPDATE, WISHLIST_DELETE actions)
- Wishlist CRUD UI (add/edit/delete items with image upload, description, link, price, priority)
- Wishlist display page (view participant's wishlist, list view with thumbnails)
- Image compression (max 800px width, 80% quality, generate 150x150 thumbnails)
- Lazy loading for images (`<img loading="lazy" />`)
- URL sanitization (strip affiliate tracking codes)

**Uses:**
- validator for link validation
- Existing base64 image pattern (with compression)

**Implements:**
- Database: wishlists table
- Frontend: wishlist components, API client functions

**Addresses:**
- Features: personal wishlists, images, descriptions, links, prices, priority levels
- Pitfall 4 (algorithm constraints) — decision to keep wishlists as suggestions
- Pitfall 6 (mobile performance) — compression and lazy loading from day 1
- Pitfall 10 (link rot and affiliate tracking) — URL sanitization

**Avoids:**
- Modifying assignment algorithm
- Storing uncompressed images

### Phase 3: Claiming System (Anonymous + Optimistic Updates)
**Rationale:** Claiming depends on wishlists existing. Implement optimistic updates for snappy UX, leveraging React 19's useOptimistic hook.

**Delivers:**
- Claim/unclaim API endpoints (`POST/DELETE /api/events/:id/wishlists/:itemId/claim`)
- Optimistic update pattern with rollback (useOptimistic hook)
- Claim status UI (show "Available" or "Claimed" to wishlist owner, show claimer identity only to self)
- Real-time claim prevention (optimistic locking, HTTP 409 on conflict)
- Authorization checks (only assigned giver can see full claim details)

**Uses:**
- React 19 useOptimistic for instant feedback
- PostgreSQL UNIQUE constraint for atomicity

**Implements:**
- Claiming logic with race condition protection (built on Phase 1 foundation)

**Addresses:**
- Features: anonymous claiming, prevent duplicates, real-time updates
- Pitfall 1 (privacy) — claim anonymity enforced
- Pitfall 2 (race conditions) — atomic operations

**Avoids:**
- Revealing claimer identity to wishlist owner
- Race conditions through database-level constraints

### Phase 4: Invite System (Links + QR + Email)
**Rationale:** Invites are independent of wishlists/claiming. Can be developed in parallel or after core features. Email integration adds external dependencies (SMTP configuration).

**Delivers:**
- Invite token generation (crypto.randomBytes for secure tokens)
- API endpoints (`POST /api/events/:id/invites`, `GET/PUT /api/invites/:code`)
- Invite status tracking (pending/accepted/declined)
- Shareable invite links (`/invite/{token}`)
- QR code generation (qrcode.react for printable invites)
- Email sending (nodemailer with SendGrid/SMTP)
- Email template (HTML with QR code embedded as base64)
- Organizer dashboard (invite status per participant)

**Uses:**
- qrcode.react for QR generation
- nodemailer for email sending
- validator for email validation (client + server)

**Implements:**
- Database: invites table
- Email infrastructure (SMTP configuration, templates)

**Addresses:**
- Features: invite links, QR codes, email invites, status tracking, organizer dashboard
- Pitfall 7 (email deliverability) — use transactional email service, SPF/DKIM/DMARC
- Pitfall 7 (privacy) — individual emails, no participant lists, token-based URLs

**Avoids:**
- Spam filters by using proper email service
- Privacy leaks by sending individual emails with secure tokens

### Phase 5: Mobile UI Redesign (Konsta UI + Bottom Navigation)
**Rationale:** UI redesign comes after features work correctly. Konsta UI components require Tailwind v3+ (upgraded in Phase 1). This is primarily visual—core functionality already exists.

**Delivers:**
- Konsta UI component library setup (provider, theme configuration)
- Plus Jakarta Sans font integration
- Material Symbols icons (replace lucide-react)
- Bottom navigation bar (iOS-style, 4-5 primary actions)
- Event cards redesign (visual thumbnails, status indicators)
- Participant avatars throughout interface
- Secret assignment reveal card (festive design)
- Mobile-first responsive layouts
- Dark mode consistency (existing dark mode extended to new components)
- Accessibility improvements (alt text, ARIA labels, 44x44px touch targets)

**Uses:**
- Konsta UI v5.0.0 for iOS-style components
- @fontsource-variable/plus-jakarta-sans for typography
- react-material-symbols for icons

**Implements:**
- Complete UI overhaul following design templates in apps/gatherly/docs/screen-templates/

**Addresses:**
- Features: mobile-first iOS UI, bottom navigation, event cards, participant avatars, reveal card
- Stack: Konsta UI, Material Symbols, Plus Jakarta Sans
- Pitfall 12 (accessibility) — built into mobile redesign

**Avoids:**
- Desktop-first design (mobile-first approach)
- Poor accessibility by including a11y from start

### Phase 6: Wishlist Priority & Polish (Drag-Drop + UX Refinements)
**Rationale:** Priority ordering is enhancement to core wishlist feature. Drag-and-drop adds UX polish but isn't blocking for MVP. This phase includes all "nice-to-have" features and edge case handling.

**Delivers:**
- Drag-and-drop priority reordering (@hello-pangea/dnd)
- Priority integer calculation and persistence
- Wishlist item sorting/filtering (by price, priority, claimed status)
- Event phase state machine UI (phase banner, disable features by phase)
- Timing controls (wishlist deadlines, assignment reveal date)
- Loading states and error handling polish
- Edge case handling (empty wishlists, broken links, concurrent edits)
- Performance monitoring (track LCP, INP metrics)

**Uses:**
- @hello-pangea/dnd for drag-and-drop
- React 19 features (useOptimistic, transitions)

**Implements:**
- UX refinements and polish
- Performance optimizations

**Addresses:**
- Features: priority levels with drag-and-drop, sorting/filtering
- Pitfall 8 (UX confusion around timing) — phase state machine
- Pitfall 9 (React Context performance) — monitoring and optimization if needed
- Pitfall 11 (no reminder system) — deadlines and notifications

**Avoids:**
- Performance issues through monitoring and optimization
- UX confusion through clear phase indicators

### Phase Ordering Rationale

- **Foundation first:** Database schema, authorization, and privacy safeguards must be correct before features are built on top. Retrofitting security is error-prone.
- **Core value next:** Wishlists (Phase 2) → Claiming (Phase 3) delivers the main value proposition. Invites (Phase 4) are important but independent.
- **UI redesign after functionality:** Ensures features work correctly before visual overhaul. Konsta UI requires Tailwind v3 (upgraded in Phase 1).
- **Polish last:** Drag-and-drop priority and UX refinements are enhancements, not blockers for MVP.

**Dependency chain:**
- Phase 2 depends on Phase 1 (database tables + Tailwind)
- Phase 3 depends on Phase 2 (wishlists must exist to claim them)
- Phase 4 is independent (can run parallel to Phase 2-3 if needed)
- Phase 5 depends on Phase 1 (Tailwind v3) and benefits from Phase 2-3 (features exist to style)
- Phase 6 depends on Phase 2-5 (polish after core features)

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 1 (Foundation & Privacy):** Authorization model for claim visibility is complex—may need additional research on role-based access patterns in React + Express. PostgreSQL transaction isolation levels (SERIALIZABLE vs READ COMMITTED) need performance testing with concurrent claims.
- **Phase 4 (Invite System):** Email deliverability (SPF/DKIM/DMARC setup, transactional email service selection) needs operational research. QR code size optimization for embedding in emails (PNG vs SVG) needs testing across email clients.
- **Phase 6 (Polish):** Performance optimization strategy if EventsContext becomes bottleneck—may need research on Zustand + TanStack Query migration patterns.

Phases with standard patterns (skip research-phase):

- **Phase 2 (Wishlist Core):** Standard CRUD operations, existing codebase has similar patterns for gifts. Image compression has well-documented browser APIs.
- **Phase 3 (Claiming System):** Optimistic updates are well-documented in React 19 docs. PostgreSQL ON CONFLICT is standard concurrency pattern.
- **Phase 5 (Mobile UI Redesign):** Konsta UI has comprehensive documentation. Design templates already provided. Component implementation is straightforward.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommended libraries are mature, actively maintained, and React 19 compatible. Versions verified with official sources (npm, GitHub). Konsta UI v5.0.0 specifically updated for React 19 API. |
| Features | HIGH | Competitors (Elfster, Giftster, Giftwhale, Drawnames) validated as feature benchmarks. Table stakes vs. differentiators clearly identified through UX research and review analysis. MVP scope well-defined. |
| Architecture | HIGH | Extends proven existing architecture (React 19 + Express + PostgreSQL). Separate wishlists table recommended over modifying gifts table (clear separation of concerns). Hybrid storage pattern limitations understood. |
| Pitfalls | HIGH | Critical pitfalls (privacy leaks, race conditions) verified with codebase analysis (EventsContext.tsx, gifts.ts, edit.tsx). Prevention strategies sourced from official PostgreSQL docs, React docs, and security research. |

**Overall confidence:** HIGH

Research is comprehensive and actionable. All four research files cross-reference each other and the existing codebase. Recommendations are backed by official documentation, competitor analysis, and codebase inspection.

### Gaps to Address

While research confidence is high, a few areas need validation during planning/execution:

- **localStorage sync for wishlists:** Research recommends API-only for wishlists/claiming, but PROJECT.md emphasizes hybrid storage pattern as a key feature. Need decision: extend localStorage to wishlists (adds complexity) or make wishlists API-only (simpler, recommended). If extending localStorage, need to implement useSyncExternalStore + conflict resolution + versioned schemas.

- **Assignment algorithm interaction with wishlists:** Research strongly recommends keeping wishlists as suggestions (don't modify algorithm), but need to validate this with user expectations. If users expect "must receive gifts from wishlist" behavior, Phase 2 needs to include algorithm modifications (bipartite matching with capacity constraints), significantly increasing complexity.

- **Transactional email service selection:** Research mentions SendGrid, Postmark, AWS SES as options but doesn't compare them. During Phase 4, need to evaluate: pricing (how many invites per month?), deliverability rates, ease of setup, SMTP vs API integration. Nodemailer supports both.

- **Mobile performance with large events:** Research assumes typical events have 5-50 participants with ~10 items each (500 wishlist items max). If events grow to 100+ participants, EventsContext performance becomes a concern. Phase 6 may need to split contexts or migrate to Zustand + TanStack Query. Need to define performance budgets and monitor during development.

- **Email template design:** Research mentions HTML email templates but doesn't provide specifics. During Phase 4, need to design email template (header, body, CTA button, QR code placement) and test across email clients (Gmail, Outlook, Apple Mail, mobile clients). Inline CSS required (no external stylesheets in email).

## Sources

### Primary (HIGH confidence)

**Stack Research:**
- [qrcode.react - npm](https://www.npmjs.com/package/qrcode.react) — QR code generation
- [nodemailer - npm](https://www.npmjs.com/package/nodemailer) — Email sending
- [Konsta UI - Official Docs](https://konstaui.com/) — Mobile UI components
- [Konsta UI React](https://konstaui.com/react) — React integration
- [Konsta UI Release Notes](https://konstaui.com/release-notes) — React 19 compatibility verified
- [@hello-pangea/dnd - npm](https://www.npmjs.com/package/@hello-pangea/dnd) — Drag-and-drop
- [validator - npm](https://www.npmjs.com/package/validator) — Email validation
- [@fontsource-variable/plus-jakarta-sans - npm](https://www.npmjs.com/package/@fontsource-variable/plus-jakarta-sans) — Typography

**Feature Research:**
- [Elfster: Secret Santa Website & Gift Exchange App](https://www.elfster.com/) — Competitor analysis
- [Giftster Group Wish List Maker](https://www.giftster.com) — Competitor analysis
- [Giftwhale: Easiest Way to Create & Share Wish Lists](https://giftwhale.com) — Competitor analysis
- [Drawnames: Wish Lists, Secret Santa, Gift Finder](https://www.drawnames.com/) — Competitor analysis
- [Favory Launches Privacy-First Wishlist Platform](https://www.openpr.com/news/4189488/favory-launches-privacy-first-wishlist-platform-with) — Privacy patterns

**Architecture Research:**
- [useOptimistic – React](https://react.dev/reference/react/useOptimistic) — React 19 optimistic updates
- [PostgreSQL Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html) — Concurrency control
- [PostgreSQL Relationships | One to One, One to Many, Many to Many](https://hasura.io/learn/database/postgresql/core-concepts/6-postgresql-relationships/) — Schema design

**Pitfalls Research:**
- [Race Condition Exploit - Schneier on Security](https://www.schneier.com/blog/archives/2015/05/race_condition_.html) — Concurrency vulnerabilities
- [Backward Compatible Database Changes — PlanetScale](https://planetscale.com/blog/backward-compatible-databases-changes) — Migration patterns
- [Persisting React State in localStorage - Josh Comeau](https://www.joshwcomeau.com/react/persisting-react-state-in-localstorage/) — localStorage pitfalls
- [How to Write Performant React Apps with Context](https://www.developerway.com/posts/how-to-write-performant-react-apps-with-context) — Context performance

**Codebase Analysis:**
- `apps/gatherly/src/contexts/EventsContext.tsx` — Hybrid storage implementation
- `apps/api/src/routes/gifts.ts` — Current claiming logic (race condition identified)
- `apps/gatherly/src/pages/events/edit.tsx` — Assignment algorithm (2000 permutations, greedy backtracking)
- `apps/api/src/db/schema.sql` — Database schema with UNIQUE constraint on gift_claims

### Secondary (MEDIUM confidence)

**Mobile UX:**
- [9 Mobile App Design Trends for 2026 - UX Pilot](https://uxpilot.ai/blogs/mobile-app-design-trends) — iOS design patterns
- [Essential iOS App UI/UX Guidelines for 2026 - EITBIZ](https://www.eitbiz.com/blog/ios-app-ui-ux-design-guidelines-you-should-follow/) — Mobile-first best practices
- [Mobile Navigation Design: 6 Patterns That Work in 2026](https://phone-simulator.com/blog/mobile-navigation-patterns-in-2026) — Bottom navigation trends

**Performance:**
- [How to Optimize Website Images 2026 - Request Metrics](https://requestmetrics.com/web-performance/high-performance-images/) — Image optimization
- [Impact of Image Optimization](https://www.androidheadlines.com/2026/01/the-impact-of-image-optimization-on-website-performance.html) — Performance metrics
- [React State Management in 2025: What You Actually Need](https://www.developerway.com/posts/react-state-management-2025) — Zustand vs Context

**Email & Invites:**
- [Node.js Send Email: Tutorial with Code Snippets [2026] - Mailtrap](https://mailtrap.io/blog/send-emails-with-nodejs/) — Email integration
- [Email Validation in React - Mailtrap Blog](https://mailtrap.io/blog/validate-emails-in-react/) — Client-side validation
- [QR Codes for Wedding Invitations 2026 - TLinky](https://tlinky.com/qr-codes-for-wedding-invitations/) — QR code trends

### Tertiary (LOW confidence)

**Wishlist UX:**
- [Wishlists, Gift Cards, and Gift Giving - Nielsen Norman Group](https://www.nngroup.com/reports/ecommerce-ux-wishlists-and-gifts/) — UX research (requires validation for Secret Santa context)
- [Best Practices for Managing Wishlists Over Time - GiftList](https://giftlist.com/blog/best-practices-for-managing-wishlists-over-time) — General wishlist patterns (not Secret Santa specific)

---
*Research completed: 2026-02-06*
*Ready for roadmap: yes*
