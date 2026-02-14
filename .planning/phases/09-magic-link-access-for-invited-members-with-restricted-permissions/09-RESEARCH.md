# Phase 09: Magic Link Access for Invited Members - Research

**Researched:** 2026-02-14
**Domain:** Magic link authentication, participant JWT tokens, email delivery, role-based route access
**Confidence:** HIGH (codebase fully read; library versions verified via npm/web)

---

## Summary

Phase 09 adds passwordless access for event participants: an organizer adds a participant, which
triggers a magic link email; the participant clicks the link, exchanges the token for a JWT session,
and gains restricted access (view events, manage their own wishlist, claim gifts) without being
able to perform organizer operations (create/edit/delete events, manage participants).

The existing codebase already has strong foundations: JWT infrastructure (`tokenService.ts`),
`authenticateJWT` / `optionalAuth` middleware, role field (`'organizer' | 'participant'`) in the
`TokenPayload`, the `invites` table (with `invite_code`, `expires_at`, `participant_id`), and the
`/invites/:code/accept` route that creates participants. What is missing is: (1) email sending on
invite creation, (2) a magic link redemption endpoint that returns a JWT, (3) participant-scoped
JWT tokens that bind `participantId` to the session, and (4) frontend role-based route guards.

**Primary recommendation:** Use `nodemailer` 8.x for email (zero runtime dependencies, stable SMTP
API, unchanged sendMail pattern). Store magic link tokens as SHA-256 hashes in a new
`magic_link_tokens` table. Issue participant JWT tokens with added `participantId` and `eventId`
claims via `tokenService.generateTokens`. Enforce role restrictions server-side in middleware and
client-side via a `ParticipantRoute` wrapper component in React Router 7.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `nodemailer` | ^8.0.1 | Send magic link emails | Node.js standard email library; zero dependencies since v8; SMTP works with any provider |
| `@types/nodemailer` | ^6.4.x | TypeScript types for nodemailer | Official DefinitelyTyped types (note: types lag 1 major, @types/nodemailer 7.x covers v8 API) |
| `nanoid` | already installed (v5) | Generate magic link tokens | Already used for invite codes; 21-char URL-safe tokens |
| `crypto` (Node built-in) | built-in | Hash tokens before DB storage | Already used in tokenService for refresh token hashing |
| `jsonwebtoken` | already installed (^9.0.3) | Issue participant JWT on redemption | Already used for organizer JWTs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Mailtrap (SMTP service) | N/A (SaaS) | Email testing in development | Use Mailtrap free tier (50 test emails/month) for dev; swap to real SMTP in production |
| `express-rate-limit` | already installed (v7) | Rate-limit magic link request endpoint | Already used on `/invites/validate` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| nodemailer | Resend SDK / SendGrid SDK | Provider SDKs require vendor lock-in; nodemailer is provider-agnostic SMTP |
| Custom DB table for tokens | Re-use `invites` table | `invites` table tracks event membership; magic link tokens are auth credentials — mixing concerns risks security bugs |
| Participant JWT with short expiry | Session cookie only | JWT is consistent with existing auth pattern; participant needs to refresh like organizers do |

### Installation
```bash
cd apps/api && pnpm add nodemailer
cd apps/api && pnpm add -D @types/nodemailer
```

---

## Architecture Patterns

### Recommended Project Structure (additions only)
```
apps/api/src/
├── services/
│   ├── tokenService.ts         # EXTEND: add generateParticipantTokens()
│   └── emailService.ts         # NEW: nodemailer transporter + sendMagicLink()
├── routes/
│   └── invites.ts              # EXTEND: email on invite creation, add /magic-link/redeem
├── db/
│   └── schema.sql              # EXTEND: add magic_link_tokens table
└── middleware/
    └── auth.ts                 # EXTEND: add requireParticipantOwnership() helper

apps/gatherly/src/
├── components/
│   ├── ProtectedRoute.tsx      # EXISTING: already blocks unauthenticated users
│   └── ParticipantRoute.tsx    # NEW: blocks organizer-only operations from participants
├── contexts/
│   └── AuthContext.tsx         # EXTEND: expose user.role and user.participantId
├── pages/
│   └── events/
│       ├── edit.tsx            # GUARD: hide/disable for participant role
│       └── invites.tsx         # GUARD: hide/disable for participant role
└── routes.tsx                  # EXTEND: add /magic-link/:token route
```

### Pattern 1: Magic Link Token Storage with SHA-256 Hashing

**What:** Store only the hash of the magic link token in the database, never the raw token.
The raw token is embedded in the email link only.
**When to use:** Any time an auth token is stored persistently — prevents DB leaks exposing live tokens.

```typescript
// Source: consistent with existing tokenService.ts pattern for refresh tokens
import crypto from 'crypto';
import { nanoid } from 'nanoid';

// Generate raw token (sent in email)
const rawToken = nanoid(); // 21-char URL-safe

// Hash before storage
const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

// Store hash, send rawToken in email URL
await query(
  `INSERT INTO magic_link_tokens (invite_id, token_hash, expires_at)
   VALUES ($1, $2, $3)`,
  [inviteId, tokenHash, new Date(Date.now() + 24 * 60 * 60 * 1000)] // 24h
);

const magicLinkUrl = `${FRONTEND_URL}/magic-link/${rawToken}`;
```

### Pattern 2: Participant JWT Token with Extended Claims

**What:** Participant JWTs carry extra claims (`participantId`, `eventId`) compared to organizer JWTs.
The existing `TokenPayload` interface needs extending.
**When to use:** When a participant authenticates — not for organizers (who may manage many events).

```typescript
// Source: based on existing tokenService.ts pattern
export interface TokenPayload {
  userId: number;       // Keep for DB lookup consistency
  email: string;
  role: 'organizer' | 'participant';
  participantId?: number;   // ADD: only set for participant tokens
  eventId?: number;         // ADD: only set for participant tokens
}

// Participant "userId" maps to their participant row id (no users table row needed)
// Convention: use negative numbers or a separate namespace to avoid collisions
// Simpler approach: participants are NOT in the users table — userId field is 0 or omitted
// and participantId is the real identity anchor
```

**Key decision needed:** Participants joining via magic link are NOT in the `users` table.
The JWT `userId` field will be `null` / `0`. Auth middleware must handle this.
Use `participantId` as the identity source for participant sessions.

### Pattern 3: Single-Use Token Redemption (Atomic)

**What:** Token is deleted atomically on successful verification, preventing replay attacks.
The `RETURNING` clause combines verification + deletion in one query.

```typescript
// Source: supertokens.com magic link best practices (verified)
// Single atomic operation: find, verify expiry, delete, return invite data
const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

const result = await query(
  `DELETE FROM magic_link_tokens
   WHERE token_hash = $1
     AND expires_at > NOW()
   RETURNING invite_id, expires_at`,
  [tokenHash]
);

if (result.rows.length === 0) {
  // Token invalid, expired, or already used
  return res.status(401).json({ error: 'Invalid or expired magic link' });
}

// Token consumed — now look up invite and issue JWT
```

### Pattern 4: Role-Based Route Guard (React Router 7)

**What:** A `ParticipantRoute` wrapper that renders children for all authenticated users but
blocks navigation to organizer-only pages for `role === 'participant'` users.
An `OrganizerRoute` wrapper that redirects participants away from admin pages.

```typescript
// Source: React Router 7 Outlet pattern (consistent with existing ProtectedRoute.tsx)
export const OrganizerRoute: React.FC = () => {
  const { user } = useAuth();

  if (user?.role !== 'organizer') {
    return <Navigate to="/events" replace />;
  }

  return <Outlet />;
};
```

### Pattern 5: Email Sending with nodemailer

**What:** Create a singleton transporter configured from env vars. Send magic link HTML email.

```typescript
// Source: nodemailer.com/smtp (official docs)
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendMagicLinkEmail(
  to: string,
  eventName: string,
  magicLinkUrl: string
): Promise<void> {
  await transporter.sendMail({
    from: `"Gatherly" <${process.env.SMTP_FROM}>`,
    to,
    subject: `Your invite to ${eventName}`,
    html: `
      <p>You've been invited to <strong>${eventName}</strong>.</p>
      <p><a href="${magicLinkUrl}">Click here to join</a></p>
      <p>This link expires in 24 hours and can only be used once.</p>
    `,
  });
}
```

### Pattern 6: New Database Table — magic_link_tokens

**What:** A separate table for magic link tokens, scoped to invites.
Do NOT re-use the `invites.invite_code` column — that is a permanent shareable join code;
magic link tokens are one-time auth credentials with different semantics and shorter lifetimes.

```sql
-- Add to schema.sql
CREATE TABLE IF NOT EXISTS magic_link_tokens (
    id SERIAL PRIMARY KEY,
    invite_id INTEGER NOT NULL REFERENCES invites(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_token_hash ON magic_link_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_expires_at ON magic_link_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_invite_id ON magic_link_tokens(invite_id);
```

### Anti-Patterns to Avoid

- **Storing raw magic link tokens in the database:** If the DB is compromised, all active auth links are exposed. Hash with SHA-256 first (same pattern as refresh tokens).
- **Sharing the invite_code as the magic link token:** `invite_code` is a permanent identifier for the invite record; magic link tokens must be one-time-use. Separate table required.
- **Issuing organizer JWTs to participants:** If `role: 'participant'` is set correctly, event mutation routes will reject requests. But this must be set at JWT generation time, not just stored in the database.
- **Relying only on frontend role checks:** Frontend guards are UX only. Server-side ownership checks on wishlist mutations (verify `participantId` matches) are mandatory.
- **Long magic link expiry (>24h):** Industry consensus is 15 minutes for login links. For "invitation" links (first access), 24 hours is acceptable. Do NOT set no expiry.
- **Email pre-fetch token consumption:** Some email security scanners pre-fetch links. Mitigation: use POST to redeem the token (not GET), so pre-fetching does not consume it. The frontend page loads on GET `/magic-link/:token` but calls POST `/api/auth/magic-link/redeem` on user action.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email delivery | Custom SMTP socket code | `nodemailer` | TLS, AUTH, pooling, DKIM all handled |
| Secure random tokens | `Math.random()` | `nanoid()` (already installed) | Cryptographically secure, URL-safe |
| Token hashing | MD5 or custom algorithm | `crypto.createHash('sha256')` (built-in, already used) | SHA-256 is pre-existing pattern in tokenService |
| JWT issuance | Custom token format | `jsonwebtoken` (already installed) | Consistent with existing auth system |
| Rate limiting | Custom IP tracking | `express-rate-limit` (already installed) | Already used on invite validation endpoint |

**Key insight:** All core primitives exist. This phase is wiring them together with email delivery and a new DB table. The main new dependency is `nodemailer`.

---

## Common Pitfalls

### Pitfall 1: Email Pre-Fetch Consuming Magic Link Token
**What goes wrong:** Email security scanners (e.g., Microsoft ATP, Proofpoint) visit links in emails to scan for malware. If the magic link token is redeemed on GET, the token is consumed before the user clicks.
**Why it happens:** Single-use enforcement deletes the token on first access; bots access first.
**How to avoid:** Separate the page render (GET `/magic-link/:token` — just shows a "Click to authenticate" button) from the token redemption (POST `/api/auth/magic-link/redeem` — actually consumes the token and issues a JWT). Bots do not submit POST forms.
**Warning signs:** Users report magic links "expired" or "already used" immediately after receiving them.

### Pitfall 2: Participants Accessing Organizer Routes via Direct URL
**What goes wrong:** A participant who knows the URL `/events/edit/123` navigates directly to it. Frontend guard redirects them, but backend route might still accept their JWT if role check is missing.
**Why it happens:** Forgetting to add role-check middleware on event mutation routes (`POST /api/events`, `PUT /api/events/:id`, `DELETE /api/events/:id`).
**How to avoid:** Add `requireOrganizer` middleware to all event mutation routes. The existing `authenticateJWT` only verifies the token is valid; a separate check `if (req.user?.role !== 'organizer')` is needed.
**Warning signs:** Participant can successfully call `PUT /api/events/:id` with a valid participant JWT.

### Pitfall 3: Participant Can Edit Other Participants' Wishlist Items
**What goes wrong:** Participant A can modify or delete participant B's wishlist items.
**Why it happens:** Wishlist mutation routes only check `authenticateJWT` (valid token) but don't verify that the `participantId` in the token matches the wishlist item's `participant_id`.
**How to avoid:** In wishlist PUT/DELETE routes, query the wishlist item first and compare `item.participant_id === req.user.participantId`. Return 403 if mismatch.
**Warning signs:** No ownership check in `routes/wishlists.ts` for PUT and DELETE.

### Pitfall 4: Participant JWT Has No participantId Claim
**What goes wrong:** After token redemption, the JWT is issued without `participantId` — it has `role: 'participant'` but no way to know WHICH participant the user is.
**Why it happens:** `generateTokens()` currently takes `{ userId, email, role }`. Participant sessions need `participantId` and `eventId` too.
**How to avoid:** Extend `TokenPayload` interface and create `generateParticipantTokens()` that includes these fields. Verify in middleware that `req.user.participantId` is set before allowing wishlist mutations.
**Warning signs:** Wishlist mutation succeeds but ownership enforcement is impossible.

### Pitfall 5: Magic Link Token and Invite Code Confusion
**What goes wrong:** Developer re-uses the existing `invites.invite_code` (nanoid, permanent) as the magic link token.
**Why it happens:** The `invites` table has `invite_code` which looks similar to what a magic link needs.
**How to avoid:** Keep them separate. `invite_code` is the permanent join link (accepted once to create participant). Magic link tokens are ephemeral JWT-bootstrap credentials that can be reissued (e.g., "resend invite"). Use a new `magic_link_tokens` table.
**Warning signs:** Using `invite_code` for redemption means the same invite link can log in the same participant repeatedly after their `invites` status is 'accepted' — breaking single-use semantics.

### Pitfall 6: Email Sending Fails Silently, Blocking Invite Creation
**What goes wrong:** The invite creation endpoint calls `sendMagicLinkEmail()` synchronously and throws if SMTP is down, causing invite creation to fail.
**Why it happens:** Email sending is coupled to the invite creation transaction.
**How to avoid:** Create the invite and magic link token in the database first (commit), THEN send email. If email fails, log the error but return success — the admin can resend. This is the "fire and don't block" pattern. Never rollback a DB operation because email failed.
**Warning signs:** Invite creation returns 500 whenever SMTP is misconfigured.

### Pitfall 7: @types/nodemailer Version Mismatch
**What goes wrong:** `@types/nodemailer` 6.x is incompatible with nodemailer 8.x API surface.
**Why it happens:** DefinitelyTyped types lag behind library versions.
**How to avoid:** nodemailer 8.x API is backward-compatible for sendMail and createTransport. The `@types/nodemailer` 6.4.x types cover the core API used here. Install `@types/nodemailer` without a major constraint and verify TypeScript compilation after install.
**Warning signs:** TypeScript errors on `transporter.sendMail()` signature.

---

## Code Examples

### Complete Magic Link Redemption Endpoint

```typescript
// Source: pattern derived from existing tokenService.ts and invites.ts
// POST /api/auth/magic-link/redeem
router.post(
  '/magic-link/redeem',
  inviteValidationLimiter, // reuse existing rate limiter
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Atomic: delete and return in one query (single-use enforcement)
    const tokenResult = await query(
      `DELETE FROM magic_link_tokens
       WHERE token_hash = $1 AND expires_at > NOW()
       RETURNING invite_id`,
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired magic link' });
    }

    const { invite_id } = tokenResult.rows[0];

    // Look up invite + participant + event
    const inviteResult = await query(
      `SELECT
         i.id as invite_id,
         i.event_id,
         i.participant_id,
         p.name as participant_name,
         e.name as event_name
       FROM invites i
       JOIN events e ON i.event_id = e.id
       LEFT JOIN participants p ON i.participant_id = p.id
       WHERE i.id = $1`,
      [invite_id]
    );

    const invite = inviteResult.rows[0];
    const participantId = invite.participant_id;

    // Issue participant JWT (extend TokenPayload with participantId + eventId)
    const { accessToken, refreshToken } = await generateParticipantTokens({
      userId: 0, // participants are not in users table
      email: '',
      role: 'participant',
      participantId,
      eventId: invite.event_id,
    });

    res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());

    return res.status(200).json({
      accessToken,
      participant: {
        id: participantId,
        name: invite.participant_name,
        eventId: invite.event_id,
        eventName: invite.event_name,
        role: 'participant',
      },
    });
  })
);
```

### requireOrganizer Middleware

```typescript
// Source: pattern consistent with existing authenticateJWT in middleware/auth.ts
export function requireOrganizer(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (req.user.role !== 'organizer') {
    res.status(403).json({ error: 'Organizer access required' });
    return;
  }
  next();
}
```

### OrganizerRoute Component (React Router 7)

```typescript
// Source: consistent with existing ProtectedRoute.tsx pattern
import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

export const OrganizerRoute: React.FC = () => {
  const { user } = useAuth();

  if (user?.role !== 'organizer') {
    return <Navigate to="/events" replace />;
  }

  return <Outlet />;
};
```

### Wishlist Ownership Check

```typescript
// Source: standard ownership pattern for REST APIs
// In PUT /api/events/:eventId/wishlists/:wishlistId
const item = await query(
  'SELECT participant_id FROM wishlists WHERE id = $1',
  [wishlistId]
);

if (!item.rows.length) {
  return res.status(404).json({ error: 'Item not found' });
}

// For participant tokens, enforce ownership
if (
  req.user?.role === 'participant' &&
  item.rows[0].participant_id !== req.user?.participantId
) {
  return res.status(403).json({ error: 'Cannot modify another participant\'s wishlist' });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| nodemailer 7.x (SES v2 SDK) | nodemailer 8.x (zero deps, built-in DKIM) | Feb 4, 2026 | Install fresh — no migration needed for SMTP use |
| Separate `@types/nodemailer` major match | Types lag; use whatever is latest on DefinitelyTyped | Ongoing | Check compilation, don't pin too tightly |
| Magic link token in URL query param `?token=` | Token in URL path segment `/magic-link/:token` | Ongoing convention | Path segment is slightly cleaner; both work |

**Deprecated/outdated:**
- nodemailer SES transport with `aws-sdk` v2: removed in nodemailer 7. Use `@aws-sdk/client-ses` if needed. Not relevant here (using SMTP).

---

## Open Questions

1. **SMTP provider for production**
   - What we know: Dev will use Mailtrap (or similar sandbox). nodemailer handles any SMTP provider.
   - What's unclear: Which production email provider to use (Resend, SendGrid, Gmail SMTP, etc.)
   - Recommendation: Use env vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) so provider is swappable. Document Mailtrap config for dev.

2. **Participant sessions and refresh token storage**
   - What we know: `refresh_tokens` table references `user_id` (FK to `users`). Participants are NOT in `users`.
   - What's unclear: How to store refresh tokens for participants who have no `user_id`.
   - Recommendation: Add nullable `participant_id` column to `refresh_tokens` table (either `user_id` OR `participant_id` is set, not both). Or use a separate `participant_sessions` table.

3. **Email sending when invite has no email address**
   - What we know: `invites.email` is nullable. Invites can be created without an email.
   - What's unclear: Phase description says "receive magic link email when added to an event" — but what if no email?
   - Recommendation: Only send the magic link email if `email` is present on the invite. The existing shareable invite URL (`/join/:code`) remains the fallback for email-less invites.

4. **Token expiry window**
   - What we know: Prior decisions mention "24 hours" configurable window. Industry standard for login is 15 minutes; for invitation-style access, 24 hours is common.
   - What's unclear: Nothing — context says "24 hours configurable."
   - Recommendation: Default 24 hours via env var `MAGIC_LINK_EXPIRES_HOURS=24`.

---

## Sources

### Primary (HIGH confidence)
- Codebase: `apps/api/src/services/tokenService.ts` — existing JWT/token patterns
- Codebase: `apps/api/src/routes/auth.ts` — refresh token cookie pattern
- Codebase: `apps/api/src/middleware/auth.ts` — existing middleware interface
- Codebase: `apps/api/src/db/schema.sql` — current database schema
- Codebase: `apps/api/src/routes/invites.ts` — existing invite infrastructure
- `https://nodemailer.com/smtp` — Official nodemailer SMTP transport documentation
- `https://github.com/nodemailer/nodemailer/releases` — Version 8.0.0 release (Feb 4, 2026)

### Secondary (MEDIUM confidence)
- `https://supertokens.com/blog/magiclinks` — Magic link security best practices (single-use, SHA-256 hashing, atomic deletion)
- `https://mailtrap.io/blog/sending-emails-with-nodemailer/` — nodemailer sendMail API patterns
- `https://newreleases.io/project/github/nodemailer/nodemailer/release/v8.0.0` — Breaking change details for v8.0.0

### Tertiary (LOW confidence)
- WebSearch: nodemailer version 8.0.1 as latest (from npm metadata in search results — not directly verified on npmjs.com due to 403)
- WebSearch: Role-based protected routes pattern in React Router 7

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — nodemailer version confirmed from release notes; all other libraries already installed
- Architecture: HIGH — based on existing codebase patterns; token/cookie/JWT approach mirrors current implementation
- Pitfalls: HIGH — token pre-fetch and ownership bypass are well-documented, verified against existing route structure
- Email service: MEDIUM — SMTP pattern confirmed from official docs; provider recommendation is advisory

**Research date:** 2026-02-14
**Valid until:** 2026-03-14 (30 days; nodemailer is stable; React Router 7 is stable)
