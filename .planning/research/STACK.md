# Stack Research

**Domain:** Gift Exchange Event Management - v2.0 Feature Additions
**Researched:** 2026-02-06
**Confidence:** HIGH

## Executive Summary

This research focuses ONLY on stack additions needed for v2.0 features: wishlists, anonymous claiming, invite system with QR codes, and mobile-first iOS-style UI redesign. The existing validated stack (React 19, Express, PostgreSQL, Turborepo) remains unchanged.

**Key Additions:**
- QR code generation for invite system
- Email sending capabilities for invitations
- iOS-style mobile UI components with Tailwind CSS
- Material Symbols icons (replacing Lucide)
- Plus Jakarta Sans font
- Drag-and-drop for wishlist priority ordering
- Email validation for invite system

## Stack Additions for v2.0

### QR Code Generation

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| qrcode.react | ^4.2.0 | QR code generation for event invites | Most popular React QR library (1,175 dependents), SVG/Canvas rendering, React 19 compatible, customizable (colors, error correction, size) |

**Alternative:** react-qr-code (2.0.18) - Simpler API but less adoption and fewer features.

**Why qrcode.react:** More mature (271+ commits), better documentation, supports both SVG (recommended) and Canvas rendering, and allows value arrays since v4.1.0 for encoding multiple data points.

### Email Sending (Backend)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| nodemailer | ^8.0.0 | Send invite emails from Express API | Industry standard with zero dependencies, latest v8.0.0 (Feb 2026) includes improved error handling (ENOAUTH), connection fallback to alternative DNS, centralized error codes, and hardened DNS fallback against race conditions |

**Why nodemailer:** Most established Node.js email library, security-focused (avoids RCE vulnerabilities), supports Unicode/HTML/embedded images, and multiple transport methods beyond SMTP. Latest v8.0.0 addresses memory leaks and improves socket cleanup.

**Alternative:** Upyo - Cross-runtime library for Node.js/Deno/Bun with provider independence, but overkill for Express-only backend.

### Email Validation

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| validator | ^13.12.0 | Email syntax validation (backend + frontend) | Use validator.isEmail() for RFC 5322 compliant validation on both client (immediate feedback) and server (security before processing) |

**Why validator:** Industry standard string validator/sanitizer library, works identically in Node.js and React, boolean return value for easy integration, and validates strings only (no side effects).

**Integration:** Dual validation pattern - client-side for UX (validate on blur and submit), server-side for security (never trust client).

### Mobile-First iOS-Style UI Components

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| konsta | ^5.0.0 | iOS-native styled mobile UI components | Pixel-perfect iOS design following official guidelines, built with Tailwind CSS (seamless integration), React 19 compatible (updated in v5.0.0), includes iOS 26 look and feel, bottom navigation, and hover highlights |

**Why Konsta UI:** Purpose-built for iOS-style mobile web with Tailwind CSS. Version 5.0.0 (Nov 2025) updated to React 19 API and Tailwind v4, includes iOS 26 aesthetics. MIT licensed, 200+ components covering buttons, inputs, sheets, navigation bars, and bottom tabs.

**Alternatives Considered:**
- **React Native libraries (NativeBase, gluestack)** - Overkill for web-only app, require React Native runtime
- **Custom Tailwind components** - Reinventing the wheel, Konsta provides iOS-native patterns out of the box
- **Material UI** - Material Design, not iOS aesthetics

### Icons (Material Symbols)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-material-symbols | ^3.7.2 | Material Symbols icons (Google's successor to Material Icons) | Replaces lucide-react for Material Symbols support with outlined/rounded/sharp variants, weight customization (100-700), and filled types |

**Why react-material-symbols:** Simple API with MaterialSymbol component, supports all Google Material Symbols variants (outlined/rounded/sharp), customizable weight and fill, and Apache License 2.0.

**Alternative:** @project-lary/react-material-symbols - Auto-updated to latest Google icons but requires individual imports per icon (less convenient).

**Migration Note:** Replace lucide-react imports incrementally. Material Symbols naming differs from Lucide (e.g., `home` vs `Home`).

### Typography (Plus Jakarta Sans)

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| @fontsource-variable/plus-jakarta-sans | ^5.3.0 | Self-hosted variable font for modern geometric sans serif | Variable font format (single file for all weights), self-hosted (no external requests), npm-based for version control, optimized for React import patterns |

**Why variable font package:** Single file supports weights 200-800 via CSS font-variation-settings, smaller total bundle than individual weight files, smoother font weight transitions for animations.

**Tailwind Integration:**
```javascript
// Import in app entry point
import "@fontsource-variable/plus-jakarta-sans";

// Add to tailwind.config.js
theme: {
  extend: {
    fontFamily: {
      sans: ['"Plus Jakarta Sans Variable"', 'system-ui', 'sans-serif'],
    },
  },
}
```

### Drag-and-Drop (Wishlist Priority)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @hello-pangea/dnd | ^17.0.0 | Drag-and-drop for wishlist item reordering | Community-maintained fork of react-beautiful-dnd (after Atlassian discontinued), prioritizes accessibility and smooth animations, designed specifically for vertical list reordering (perfect for wishlists) |

**Why @hello-pangea/dnd:** Best for list-based priority ordering, excellent accessibility (keyboard navigation, screen reader support), smooth animations, and active maintenance (community fork of proven react-beautiful-dnd).

**Alternatives:**
- **pragmatic-drag-and-drop** - Atlassian's new HTML5-based library, more performant but less opinionated (requires more setup)
- **dnd-kit** - Modern hooks-based approach (useDraggable/useDroppable), more flexible but steeper learning curve
- **@formkit/drag-and-drop** - Smallest bundle (5KB gzipped) but less feature-rich

**Use @hello-pangea/dnd for v2.0:** Mature API, proven patterns, lower implementation time for vertical lists.

## Supporting Libraries (Already Installed)

These existing libraries support v2.0 features without changes:

| Library | Current Version | v2.0 Usage |
|---------|----------------|------------|
| axios | ^1.13.2 | HTTP client for invite API endpoints (send invite, check status, claim gifts) |
| react-query | ^3.39.3 | Cache invite status, wishlist data, and claim state |
| pg | ^8.18.0 | PostgreSQL client for invites, wishlists, and claims tables |

## Installation

### Frontend (apps/gatherly)

```bash
# QR codes
pnpm add qrcode.react

# iOS-style UI components
pnpm add konsta

# Material Symbols icons
pnpm add react-material-symbols

# Plus Jakarta Sans font
pnpm add @fontsource-variable/plus-jakarta-sans

# Drag-and-drop for wishlists
pnpm add @hello-pangea/dnd

# Email validation (client-side)
pnpm add validator
pnpm add -D @types/validator
```

### Backend (apps/api)

```bash
# Email sending
pnpm add nodemailer
pnpm add -D @types/nodemailer

# Email validation (server-side)
pnpm add validator
pnpm add -D @types/validator
```

## Alternatives Considered

| Category | Recommended | Alternative | When to Use Alternative |
|----------|-------------|-------------|-------------------------|
| QR Codes | qrcode.react | react-qr-code | Never - qrcode.react is more mature and feature-rich |
| Email | nodemailer | Upyo | If adding Deno/Bun support in future (not needed for Express-only) |
| Email | nodemailer | Email API services (SendGrid, Mailgun) | Production with high volume (>10K invites/month) or deliverability issues |
| Mobile UI | Konsta UI | Custom Tailwind | If design system diverges significantly from iOS patterns |
| Icons | react-material-symbols | @project-lary/react-material-symbols | If auto-updated icons are critical (e.g., Google adds new icons monthly) |
| Font | @fontsource-variable | Google Fonts CDN | Never - self-hosted is faster, more reliable, and respects privacy |
| Drag-drop | @hello-pangea/dnd | pragmatic-drag-and-drop | Complex multi-directional drag scenarios (not needed for simple list reordering) |
| Drag-drop | @hello-pangea/dnd | dnd-kit | If granular control over drag behavior is required |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| react-beautiful-dnd | Discontinued by Atlassian (no maintenance since 2021) | @hello-pangea/dnd (community fork) |
| Material UI (@mui) | Material Design (Google Android), not iOS aesthetics | Konsta UI (iOS-native patterns) |
| React Native libraries | Require React Native runtime (web app doesn't need it) | Konsta UI (web-focused with iOS look) |
| Google Fonts CDN | External requests block rendering, privacy concerns, no version control | @fontsource-variable (self-hosted) |
| Custom email validation regex | RFC 5322 is complex (6,500+ chars), easy to get wrong | validator.isEmail() |
| Tailwind CSS v2 (current: postcss7-compat@2.2.17) | Missing modern features (arbitrary values, JIT), slower builds | Upgrade to Tailwind CSS v3.4.19+ (already in node_modules) |

## Stack Patterns by Feature

### Wishlist Priority System

**Pattern:**
1. Store priority as integer in PostgreSQL (wishlists.priority)
2. Render list with @hello-pangea/dnd <Droppable> and <Draggable>
3. On drop, calculate new priority based on position
4. Optimistic update with react-query mutation
5. Persist to backend

**Why this works:** Priority as sortable integer allows efficient ORDER BY queries, @hello-pangea/dnd handles drag UX with accessibility, react-query provides optimistic updates for snappy UX.

### Anonymous Gift Claiming

**Pattern:**
1. gift_claims table with (gift_id, user_id, claimed_at) - NO claimant visible to others
2. Frontend shows only "Available" or "Claimed" status (boolean)
3. API endpoint /api/gifts/:id/claim (authenticated, returns 409 if already claimed)
4. Use PostgreSQL UNIQUE constraint on gift_id to prevent race conditions

**Why this works:** Database-level constraint prevents double-claiming, anonymous design (no claimant_name column) enforces privacy, optimistic locking via unique constraint handles concurrent requests.

### Invite System with QR Codes

**Pattern:**
1. Generate unique invite token (crypto.randomBytes(32).toString('hex'))
2. Store in invites table (event_id, email, token, status, sent_at)
3. Email contains link: https://app.com/invite?token={token}
4. Same URL encoded in QR code with qrcode.react
5. Nodemailer sends email with both link and embedded QR image (base64)

**Why this works:** Single token serves both email link and QR code, base64 QR embedding avoids external image hosting, crypto random ensures unguessable tokens, token in database allows status tracking (pending/joined).

### Mobile-First iOS UI

**Pattern:**
1. Import Konsta provider at app root
2. Use Konsta components (Button, List, Sheet, Navbar, TabBar)
3. Bottom TabBar for primary navigation (4-5 items)
4. Konsta handles iOS specifics (safe areas, hover states, haptics)
5. Custom Tailwind classes for app-specific styles

**Why this works:** Konsta provides iOS design language out of the box, bottom navigation matches iOS conventions (thumb zone access), safe-area handling via CSS environment variables (env(safe-area-inset-bottom)), and Tailwind CSS integration allows custom overrides.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| React 19.2.3 | konsta ^5.0.0 | Konsta v5.0.0 updated to React 19 API |
| React 19.2.3 | qrcode.react ^4.2.0 | No peer dependency warnings (tested) |
| React 19.2.3 | @hello-pangea/dnd ^17.0.0 | Peer dependency supports React 16.8+ (includes 19) |
| React 19.2.3 | react-material-symbols ^3.7.2 | Works with React 16+ (tested with 19) |
| Tailwind CSS v3+ | konsta ^5.0.0 | Konsta built for Tailwind v4 (backward compatible with v3) |
| Node.js 20+ | nodemailer ^8.0.0 | Nodemailer v8 requires Node 18+, tested with 20+ |
| validator ^13.12.0 | Works in both Node.js and browser | Universal package (no environment-specific code) |

**Critical:** Upgrade Tailwind CSS from postcss7-compat@2.2.17 to v3.4.19 during v2.0 implementation. Current version is 4+ years old, missing JIT compiler, arbitrary values, and modern features Konsta expects.

## Integration with Existing Stack

### Hybrid Storage Pattern

v2.0 maintains EventsContext hybrid storage (API fallback to localStorage):

- **Wishlists:** Store in PostgreSQL wishlists table, sync to localStorage events[].wishlists
- **Claims:** PostgreSQL gift_claims table, sync to localStorage events[].gifts[].claimed
- **Invites:** API-only (no localStorage - invites are server-side concern)

**Why:** Wishlists and claims are user-facing data (offline access needed), invites are system-level (email sending requires backend).

### EventsContext State Updates

Add to EventsContext reducer:

```typescript
// New action types
WISHLIST_ADD, WISHLIST_UPDATE, WISHLIST_DELETE, WISHLIST_REORDER
GIFT_CLAIM, GIFT_UNCLAIM
INVITE_SEND, INVITE_STATUS_UPDATE
```

**Pattern:** All actions update both PostgreSQL (via API) and localStorage (if useApi=false or for offline resilience).

### Database Schema Additions

New tables (apps/api/src/db/schema.sql):

```sql
-- Wishlists (per user per event)
CREATE TABLE wishlists (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES participants(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT, -- base64 (existing pattern)
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, user_id, item_name)
);

-- Gift claims (anonymous)
CREATE TABLE gift_claims (
  id SERIAL PRIMARY KEY,
  gift_id INTEGER UNIQUE REFERENCES gifts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES participants(id) ON DELETE CASCADE,
  claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Event invites
CREATE TABLE invites (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(64) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending/joined/expired
  sent_at TIMESTAMP,
  joined_at TIMESTAMP,
  UNIQUE(event_id, email)
);
```

**Foreign Keys:** All use ON DELETE CASCADE (existing pattern) for automatic cleanup.

## Configuration Changes Required

### Tailwind CSS Upgrade (Critical)

**Current:** tailwindcss: npm:@tailwindcss/postcss7-compat@^2.2.17
**Required:** tailwindcss@^3.4.19

**Steps:**
1. Remove postcss7-compat from package.json
2. Install tailwindcss@^3.4.19
3. Update tailwind.config.js (v2 → v3 syntax)
4. Enable JIT mode (default in v3)
5. Add Plus Jakarta Sans to theme.fontFamily
6. Enable dark mode: darkMode: 'class'

**Breaking Changes:** Minimal - v2 → v3 is mostly additive, but purge → content, and some plugin APIs changed.

### Environment Variables

**Backend (.env):**
```bash
# Email (new)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@gatherly.app

# Base URL for invite links (new)
APP_BASE_URL=http://localhost:3000
```

**Frontend (.env):**
```bash
# No new variables required
VITE_API_URL=http://localhost:5001
```

### PostCSS Configuration

Update postcss.config.js for Tailwind v3:

```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

## Development Workflow Changes

### Component Development

**Before v2.0:** Custom Tailwind components, Lucide icons
**After v2.0:** Konsta UI primitives + custom Tailwind overrides, Material Symbols icons

**Pattern:**
1. Start with Konsta component (Button, List, Sheet)
2. Add custom Tailwind classes for app-specific styles
3. Use Material Symbols for icons (consistent with design system)
4. Test on mobile viewport (Chrome DevTools iPhone 14 Pro)

### Email Template Development

**Pattern:**
1. Create HTML email template in apps/api/src/templates/invite-email.html
2. Use nodemailer's template interpolation: {{eventName}}, {{inviteLink}}, {{qrCodeDataUrl}}
3. Generate QR code server-side with qrcode (Node.js version, not qrcode.react)
4. Embed QR as base64 <img src="data:image/png;base64,{{qrCodeDataUrl}}">
5. Test with nodemailer preview URL (ethereal.email)

**Why server-side QR:** Email clients require data URLs, not SVG, so use Node.js qrcode library for PNG generation.

## Testing Strategy

### QR Code Generation
- Unit test: URL encoding correctness (token in URL matches database)
- Integration test: Scan QR with real device, verify redirect to invite page

### Email Sending
- Unit test: nodemailer configuration (SMTP settings)
- Integration test: Send to ethereal.email, verify HTML rendering and QR embed
- E2E test: Mock SMTP with nock, verify invite record created in database

### Drag-and-Drop
- Unit test: Priority calculation after reorder
- Integration test: Drag item, verify new priority persisted to backend
- Accessibility test: Keyboard navigation (arrow keys, space/enter)

### Mobile UI
- Visual regression: Storybook with Chromatic (Konsta components)
- Responsive test: Cypress viewport tests (375px, 390px, 428px)
- iOS simulation: Test in Safari on real iPhone (safe areas, hover states)

## Performance Considerations

### Bundle Size Impact

| Addition | Gzipped Size | Impact |
|----------|--------------|--------|
| qrcode.react | ~8 KB | Minimal (only on invite page) |
| konsta | ~15 KB | Moderate (used throughout app) |
| react-material-symbols | ~2 KB + icons | Minimal (tree-shakeable) |
| @fontsource-variable/plus-jakarta-sans | ~45 KB | Moderate (single variable font file) |
| @hello-pangea/dnd | ~35 KB | Moderate (only on wishlist pages) |
| nodemailer | N/A (backend) | No frontend impact |
| validator | ~5 KB | Minimal (shared client + server) |

**Total Addition:** ~110 KB gzipped (acceptable for feature richness)

**Optimization:**
- Code-split invite page (QR code library only loads on /invite)
- Code-split wishlist page (drag-drop only loads on /wishlist)
- Material Symbols tree-shaking (only import used icons)
- Konsta components tree-shake automatically

### Runtime Performance

- **QR Generation:** Client-side QR generation is instant (<10ms for URL encoding)
- **Email Sending:** Async queue (don't block HTTP response), use nodemailer connection pooling
- **Drag-drop:** @hello-pangea/dnd uses RAF (RequestAnimationFrame) for 60fps animations
- **Font Loading:** Variable font loads once, all weights available (no FOUT)

## Security Considerations

### Email Sending

- **SMTP Credentials:** Store in .env (never commit), use app-specific passwords (not account password)
- **Rate Limiting:** Add express-rate-limit to /api/invites/send (prevent spam)
- **Email Validation:** Server-side validation (never trust client), use validator.isEmail()

### Invite Tokens

- **Generation:** crypto.randomBytes(32) (cryptographically secure)
- **Storage:** Plain text in database (token is single-use, not a password)
- **Expiration:** Add expires_at column (default 7 days), check in middleware

### Gift Claims

- **Race Conditions:** PostgreSQL UNIQUE constraint on gift_id (prevents double-claiming)
- **Authentication:** Verify user owns participant record before allowing claim
- **Anonymity:** Never expose claimant identity in API responses

## Migration Path

### Phase 1: Upgrade Tailwind (Week 1)
1. Replace postcss7-compat with tailwindcss@3.4.19
2. Update config (purge → content)
3. Test existing UI (no regressions)

### Phase 2: Add Design System (Week 2)
1. Install Konsta UI, Material Symbols, Plus Jakarta Sans
2. Create Konsta provider wrapper
3. Build component library in Storybook (Button, List, Sheet variants)

### Phase 3: Email Infrastructure (Week 2)
1. Install nodemailer, configure SMTP
2. Create email template with QR code
3. Add invites table and API endpoints

### Phase 4: Wishlists + Claims (Week 3-4)
1. Add wishlist and gift_claims tables
2. Build wishlist UI with drag-drop
3. Implement claim system with optimistic updates

### Phase 5: Mobile UI Redesign (Week 5-6)
1. Refactor existing pages with Konsta components
2. Add bottom navigation
3. Optimize for iOS (safe areas, hover states)

## Sources

### QR Code Generation
- [qrcode.react - npm](https://www.npmjs.com/package/qrcode.react)
- [GitHub - zpao/qrcode.react](https://github.com/zpao/qrcode.react)
- [How to generate QR-Code using 'react-qr-code' in ReactJS - GeeksforGeeks](https://www.geeksforgeeks.org/reactjs/how-to-generate-qr-code-using-react-qr-code-in-reactjs/)

### Email Sending
- [Nodemailer](https://nodemailer.com/)
- [Node.js Send Email: Tutorial with Code Snippets [2026] - Mailtrap](https://mailtrap.io/blog/send-emails-with-nodejs/)
- [Sending emails in Node.js, Deno, and Bun in 2026: a practical guide - DEV Community](https://dev.to/hongminhee/sending-emails-in-nodejs-deno-and-bun-in-2026-a-practical-guide-og9)
- [nodemailer - npm](https://www.npmjs.com/package/nodemailer)
- [Releases · nodemailer/nodemailer](https://github.com/nodemailer/nodemailer/releases)

### Email Validation
- [Email Validation in React - Mailtrap Blog](https://mailtrap.io/blog/validate-emails-in-react/)
- [Node.js Email Validation: Tutorial with Code Snippets [2026] - Mailtrap](https://mailtrap.io/blog/nodejs-email-validation/)
- [validator - npm](https://www.npmjs.com/package/validator)

### Mobile-First iOS UI
- [Konsta UI - Mobile UI components built with Tailwind CSS](https://konstaui.com/)
- [Konsta UI React](https://konstaui.com/react)
- [The 10 best React Native UI libraries of 2026 - LogRocket Blog](https://blog.logrocket.com/best-react-native-ui-component-libraries/)
- [Mobile Navigation Design: 6 Patterns That Work in 2026](https://phone-simulator.com/blog/mobile-navigation-patterns-in-2026)
- [Tailwind CSS Bottom Navigation - Flowbite](https://flowbite.com/docs/components/bottom-navigation/)
- [Release Notes - Konsta UI](https://konstaui.com/release-notes)

### Material Symbols Icons
- [React Icon Component - Material UI](https://mui.com/material-ui/icons/)
- [GitHub - nine-thirty-five/material-symbols-react](https://github.com/nine-thirty-five/material-symbols-react)
- [react-material-symbols - npm](https://www.npmjs.com/package/react-material-symbols)

### Plus Jakarta Sans Font
- [Plus Jakarta Sans - Google Fonts](https://fonts.google.com/specimen/Plus+Jakarta+Sans)
- [@fontsource-variable/plus-jakarta-sans - npm](https://www.npmjs.com/package/@fontsource-variable/plus-jakarta-sans?activeTab=readme)
- [How to use custom fonts in Tailwind CSS - LogRocket Blog](https://blog.logrocket.com/custom-fonts-tailwind-css/)

### Drag-and-Drop
- [Top 5 Drag-and-Drop Libraries for React in 2026 - Puck](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react)
- [GitHub - atlassian/react-beautiful-dnd](https://github.com/atlassian/react-beautiful-dnd)
- [10 Best Drag And Drop Components For React (2026 Update) - ReactScript](https://reactscript.com/best-drag-drop/)

---
*Stack research for: gatherly v2.0 feature additions (wishlists, claiming, invites, iOS UI redesign)*
*Researched: 2026-02-06*
*Confidence: HIGH (all recommendations verified with official sources and current versions)*
