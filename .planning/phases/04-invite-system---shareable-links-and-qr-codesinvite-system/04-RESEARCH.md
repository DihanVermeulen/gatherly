# Phase 4: Invite System - Research

**Researched:** 2026-02-08
**Domain:** Invite systems with shareable links and QR code generation
**Confidence:** HIGH

## Summary

This phase implements an invite system where event organizers can share invite links and QR codes with participants to join events. The research covers three core technical domains: QR code generation for React, secure invite code generation, and invite link architecture patterns.

The standard approach uses **nanoid** for generating secure, URL-friendly invite codes stored in the existing `invites` table, **react-qr-code** for SVG-based QR code rendering, and the **Clipboard API** for copy-to-clipboard functionality. The invite system follows RESTful patterns with `/api/events/:id/invites` for backend endpoints and `/join/:code` for the join flow on the frontend.

Key architectural decisions include using the existing database schema (already has `invites` table from Phase 1), nanoid instead of UUID for shorter/cleaner invite codes, SVG rendering for QR codes (better for responsive/mobile), and rate limiting on invite validation endpoints to prevent enumeration attacks.

**Primary recommendation:** Use nanoid (21-character codes) for invite code generation, react-qr-code with SVG rendering for QR codes, and implement rate limiting with generic error messages to prevent invite code enumeration attacks.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| nanoid | 5.1.6 | Secure invite code generation | Industry standard for URL-friendly unique IDs, 15M+ weekly downloads, cryptographically secure (uses Web Crypto API), shorter than UUID (21 vs 36 chars) |
| react-qr-code | 2.8.0+ | QR code component | Most popular React QR library, SVG-based rendering, responsive, works with React 19 |
| Clipboard API | Native | Copy invite links | Browser standard, no dependencies, works across all modern browsers |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| express-rate-limit | 7.x | Rate limiting middleware | Protect invite validation endpoints from enumeration/brute force attacks |
| express-validator | 7.x | Request validation | Validate invite code format before database lookup |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| nanoid | UUID v4 | UUID is longer (36 chars), harder to read, but more universally recognized. nanoid better for user-facing codes |
| react-qr-code | qrcode.react | qrcode.react supports both SVG and Canvas, but react-qr-code has cleaner API and better TypeScript support |
| Clipboard API | react-copy-to-clipboard | Library adds bundle size for functionality now native to browsers |

**Installation:**
```bash
# Backend
pnpm add nanoid@5.1.6 express-rate-limit@7.x express-validator@7.x

# Frontend
pnpm add react-qr-code@2.8.0
```

## Architecture Patterns

### Recommended Project Structure
```
apps/api/src/routes/
├── invites.ts              # Invite CRUD endpoints
└── events.ts               # Existing, may add invite-related endpoints

apps/gatherly/src/
├── api/
│   └── invites.ts          # API client for invite operations
├── pages/
│   ├── join.tsx            # Public join page (/join/:code)
│   └── events/
│       └── invites.tsx     # Invite management UI (organizer view)
└── components/
    ├── InviteLink.tsx      # Copy-to-clipboard link component
    └── InviteQRCode.tsx    # QR code display component
```

### Pattern 1: Invite Code Generation
**What:** Generate cryptographically secure, URL-friendly unique invite codes
**When to use:** When creating new invites for an event
**Example:**
```typescript
// Source: https://github.com/ai/nanoid
import { nanoid } from 'nanoid';

// Backend route (apps/api/src/routes/invites.ts)
router.post('/api/events/:eventId/invites', authenticateJWT, async (req, res) => {
  const { eventId } = req.params;
  const { email } = req.body; // Optional: for tracking who was invited

  const inviteCode = nanoid(); // Generates 21-character URL-safe code

  await query(
    `INSERT INTO invites (event_id, email, invite_code, status)
     VALUES ($1, $2, $3, 'pending')`,
    [eventId, email, inviteCode]
  );

  const inviteUrl = `${process.env.FRONTEND_URL}/join/${inviteCode}`;
  res.json({ inviteCode, inviteUrl });
});
```

### Pattern 2: QR Code Rendering
**What:** Display QR code for invite link using SVG rendering
**When to use:** In invite management UI for organizers to share
**Example:**
```typescript
// Source: https://www.npmjs.com/package/react-qr-code
import QRCode from 'react-qr-code';

// Frontend component (apps/gatherly/src/components/InviteQRCode.tsx)
export const InviteQRCode = ({ inviteUrl }: { inviteUrl: string }) => {
  return (
    <div style={{ background: 'white', padding: '16px' }}>
      <QRCode
        value={inviteUrl}
        size={256}
        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
        viewBox={`0 0 256 256`}
        level="M" // Error correction level: L, M, Q, H (M = ~15% recovery)
      />
    </div>
  );
};
```

### Pattern 3: Copy to Clipboard
**What:** Copy invite link to clipboard with user feedback
**When to use:** Provide easy sharing mechanism for invite links
**Example:**
```typescript
// Source: https://blog.logrocket.com/implementing-copy-clipboard-react-clipboard-api/
import { useState } from 'react';

export const InviteLink = ({ inviteUrl }: { inviteUrl: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div>
      <input type="text" value={inviteUrl} readOnly />
      <button onClick={handleCopy}>
        {copied ? 'Copied!' : 'Copy Link'}
      </button>
    </div>
  );
};
```

### Pattern 4: Invite Validation with Rate Limiting
**What:** Validate invite codes securely, preventing enumeration attacks
**When to use:** When participants attempt to join via invite link
**Example:**
```typescript
// Source: https://betterstack.com/community/guides/scaling-nodejs/rate-limiting-express/
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';

// Rate limiter for invite validation (stricter than normal endpoints)
const inviteRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 attempts per IP per 15 minutes
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Backend route (apps/api/src/routes/invites.ts)
router.post(
  '/api/invites/validate',
  inviteRateLimiter,
  [body('code').isLength({ min: 21, max: 21 }).trim()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid request' }); // Generic message
    }

    const { code } = req.body;

    const result = await query(
      `SELECT i.id, i.event_id, i.status, e.name as event_name
       FROM invites i
       JOIN events e ON i.event_id = e.id
       WHERE i.invite_code = $1 AND i.status = 'pending'`,
      [code]
    );

    if (result.rows.length === 0) {
      // Generic error - don't reveal if code exists but is expired/accepted
      return res.status(404).json({ error: 'Invalid or expired invite' });
    }

    const invite = result.rows[0];
    res.json({
      eventId: invite.event_id,
      eventName: invite.event_name
    });
  }
);
```

### Anti-Patterns to Avoid

- **Sequential IDs for invite codes:** Use nanoid/UUID, not auto-incrementing integers (enables enumeration attacks)
- **No rate limiting on validation:** Attackers can brute force valid codes without throttling
- **Revealing invite status in errors:** "Code expired" vs "Code not found" reveals valid codes to attackers
- **No expiration:** Invites should have optional expiration dates for security
- **Canvas QR codes without SSR fallback:** Can't server-side render, use SVG for better compatibility
- **Oversized QR codes:** For mobile scanning, follow 10:1 distance-to-size ratio (minimum 2x2cm for close range)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Unique ID generation | Custom random string generator with Math.random() | nanoid | Math.random() is NOT cryptographically secure, nanoid uses Web Crypto API with CSPRNG, collision-resistant |
| QR code encoding | Custom QR code algorithm | react-qr-code | QR spec is complex (error correction, encoding modes, version selection), library handles edge cases |
| Copy to clipboard | Custom document.execCommand('copy') | Clipboard API (navigator.clipboard) | execCommand is deprecated, Clipboard API is async, secure (requires HTTPS), supports permissions |
| Rate limiting | Custom request counting logic | express-rate-limit | Handles distributed/clustered apps, memory management, header standards (RateLimit-*), edge cases |
| Invite code validation | Regex-only validation | express-validator + database lookup | Need to validate format AND check database, validator middleware integrates cleanly with Express |

**Key insight:** Invite systems are security-critical. Using battle-tested libraries for crypto operations (nanoid), rate limiting, and validation reduces attack surface compared to hand-rolled solutions.

## Common Pitfalls

### Pitfall 1: Invite Code Enumeration Attacks
**What goes wrong:** Attackers can brute force or enumerate valid invite codes by testing random codes and observing response differences.
**Why it happens:** Different error messages for "code doesn't exist" vs "code expired" vs "code already used" reveal valid codes. No rate limiting allows unlimited guesses.
**How to avoid:**
- Return generic error messages ("Invalid or expired invite") regardless of reason
- Implement aggressive rate limiting (10 requests per 15 minutes per IP)
- Use 21+ character nanoid codes (not 6-digit codes)
- Log suspicious activity (many failed attempts from same IP)

**Warning signs:** High volume of 404s on invite validation endpoint, distributed requests testing sequential codes

### Pitfall 2: QR Code Scanning Failures
**What goes wrong:** Users can't scan QR codes with their phones due to size, contrast, or rendering issues.
**Why it happens:** QR codes too small for scanning distance, low contrast (dark background), inverted colors, insufficient "quiet zone" (white space around code), or too much data encoded.
**How to avoid:**
- Follow 10:1 distance-to-size ratio (2x2cm minimum for close range)
- Always use dark QR code on light background (not inverted)
- Add 0.25-inch white padding around QR code
- Use error correction level M (15% recovery) or H (30% for logos)
- Test scanning at intended distance before deploying

**Warning signs:** User reports of "QR code won't scan", works in some apps but not others, works on Android but not iOS

### Pitfall 3: Expired/Stale Invite Links
**What goes wrong:** Users click invite links that are expired or already accepted, leading to confusing error messages or security issues.
**Why it happens:** No expiration tracking in database, no UI indication of invite status, organizers don't know which invites are still valid.
**How to avoid:**
- Add `expires_at` column to invites table (optional, can be NULL for no expiration)
- Update invite status when accepted ('pending' → 'accepted')
- Show invite status in organizer UI (pending/accepted/expired)
- Allow organizers to revoke/regenerate invites
- Frontend shows clear message: "This invite has been used" or "This invite has expired"

**Warning signs:** Confused users trying old invite links, support tickets about "invite not working", duplicate participants in event

### Pitfall 4: Missing HTTPS for Clipboard API
**What goes wrong:** Clipboard API (navigator.clipboard) fails silently or throws security errors on HTTP.
**Why it happens:** Clipboard API is only available in secure contexts (HTTPS or localhost). Production deployments on HTTP break copy functionality.
**How to avoid:**
- Always use HTTPS in production
- For local development, use localhost (not IP address like 192.168.x.x)
- Provide fallback UI: show input field with URL so users can manually copy
- Test clipboard functionality in production environment before launch

**Warning signs:** Copy button works in development (localhost) but not production, console errors "Clipboard API requires secure context"

### Pitfall 5: QR Code SVG Rendering Performance
**What goes wrong:** Page lags or freezes when rendering many QR codes (e.g., showing 50+ invites in admin panel).
**Why it happens:** Each QR code is complex SVG with many path elements. React re-renders all QR codes on state changes.
**How to avoid:**
- Use React.memo() on QR code component to prevent unnecessary re-renders
- Lazy load QR codes (only render when visible, use Intersection Observer)
- For bulk invite display, show QR code on click/modal instead of inline
- Consider Canvas rendering for very large lists (faster but can't SSR)

**Warning signs:** Slow page load with many invites, janky scrolling on invite list, high CPU usage in browser

### Pitfall 6: Invite Table Bloat
**What goes wrong:** Invites table grows infinitely, slowing down queries and wasting storage.
**Why it happens:** No cleanup of old/expired invites, new invite created for every share, no deduplication.
**How to avoid:**
- Implement periodic cleanup job (delete expired invites older than 30 days)
- Add database index on `status` and `expires_at` for efficient cleanup queries
- Consider reusing pending invites (same event + same email = update existing)
- Set up database partitioning if expecting millions of invites

**Warning signs:** Slow invite validation queries over time, database storage growing linearly, long index scan times

## Code Examples

Verified patterns from official sources:

### Generate Invite Code (Backend)
```typescript
// Source: https://github.com/ai/nanoid
import { nanoid } from 'nanoid';

// Generate default 21-character code
const inviteCode = nanoid();
// Example: "V1StGXR8_Z5jdHi6B-myT"

// Or customize length (longer = more secure against brute force)
const longCode = nanoid(32); // For highly sensitive invites
```

### QR Code Component (Frontend)
```typescript
// Source: https://www.npmjs.com/package/react-qr-code
import QRCode from 'react-qr-code';

export const EventInviteQR = ({ inviteUrl }: { inviteUrl: string }) => {
  return (
    <div
      style={{
        background: 'white',
        padding: '16px',  // Quiet zone
        display: 'inline-block'
      }}
    >
      <QRCode
        value={inviteUrl}
        size={256}
        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
        viewBox={`0 0 256 256`}
        level="M" // Error correction: L (7%), M (15%), Q (25%), H (30%)
        bgColor="#ffffff"
        fgColor="#000000"
      />
    </div>
  );
};
```

### Copy to Clipboard with Feedback
```typescript
// Source: https://blog.logrocket.com/implementing-copy-clipboard-react-clipboard-api/
import { useState } from 'react';

export const CopyInviteButton = ({ url }: { url: string }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers or non-HTTPS
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button onClick={copyToClipboard}>
      {copied ? '✓ Copied!' : 'Copy Link'}
    </button>
  );
};
```

### Rate Limiting Configuration
```typescript
// Source: https://betterstack.com/community/guides/scaling-nodejs/rate-limiting-express/
import rateLimit from 'express-rate-limit';

// Strict rate limiting for invite validation
export const inviteValidationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 requests per window per IP
  message: 'Too many requests, please try again later',
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests, please try again later'
    });
  },
});

// More lenient for invite creation (organizers only)
export const inviteCreationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Max 20 invites per minute
  message: 'Too many invites created, please slow down',
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| document.execCommand('copy') | Clipboard API (navigator.clipboard) | 2020-2021 | Async API, requires HTTPS, better security model, no DOM manipulation |
| UUID v4 for invite codes | nanoid | 2019+ | 42% shorter codes (21 vs 36 chars), URL-safe by default, same collision resistance |
| Canvas QR codes | SVG QR codes | 2018+ | Responsive/scalable, SSR-compatible, better accessibility, CSS-stylable |
| Hardcoded rate limits | express-rate-limit middleware | 2015+ | Configurable, cluster-aware, standard headers, better DX |
| Base64 QR codes in img tags | React QR components | 2016+ | Component-based, responsive, TypeScript support, easier styling |

**Deprecated/outdated:**
- **document.execCommand('copy'):** Deprecated by W3C, use Clipboard API
- **Math.random() for IDs:** Not cryptographically secure, use crypto.getRandomValues() or nanoid
- **UUID for user-facing codes:** Too long (36 chars), not URL-optimized, use nanoid instead
- **react-copy-to-clipboard package:** No longer needed, Clipboard API is native

## Open Questions

Things that couldn't be fully resolved:

1. **Should invites be single-use or multi-use?**
   - What we know: Database schema supports tracking which participant used an invite (participant_id foreign key)
   - What's unclear: Product decision - can one invite link be used by multiple people, or is it one-time use?
   - Recommendation: Start with single-use (safer), can add multi-use flag later if needed. Update status to 'accepted' after first use.

2. **Should invite expiration be mandatory or optional?**
   - What we know: Schema has room for `expires_at` column (can add), common patterns use 7-30 day expiration
   - What's unclear: User expectation - do organizers want permanent links or auto-expiring ones?
   - Recommendation: Make expiration optional (NULL = never expires), let organizers set custom expiration when creating invite. Default to 30 days if not specified.

3. **How to handle QR code download/sharing?**
   - What we know: QR codes are SVG, can be exported to PNG/JPG for sharing
   - What's unclear: Should we provide download button, share to social media, or just display for screenshot?
   - Recommendation: Phase 4 just displays QR code for scanning/screenshot. Add download feature in Phase 6 (polish) if users request it.

4. **Should invite validation require authentication?**
   - What we know: JWT authentication is implemented (Phase 7), but invite links should work for new users who don't have accounts yet
   - What's unclear: Flow for unauthenticated users - do they create account first, or join event then optionally create account?
   - Recommendation: Invite validation endpoint should NOT require JWT (public endpoint with rate limiting). Accept endpoint can optionally accept auth token, or accept anonymous joins (participant name only). Link participant to user account later if they sign up.

5. **How to prevent invite link sharing abuse?**
   - What we know: Rate limiting prevents brute force, but doesn't stop someone sharing invite link publicly
   - What's unclear: Do we need invite approval flow, or trust that organizers only share with intended people?
   - Recommendation: Phase 4 uses trust model (no approval). If abuse becomes issue, Phase 6+ can add approval queue (organizer must approve join requests).

## Sources

### Primary (HIGH confidence)
- nanoid GitHub repository - https://github.com/ai/nanoid (version 5.1.6, security features, usage patterns)
- react-qr-code npm package - https://www.npmjs.com/package/react-qr-code (API, SVG rendering, responsive patterns)
- Clipboard API MDN - https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API (verified via LogRocket article)
- Express Rate Limit - https://betterstack.com/community/guides/scaling-nodejs/rate-limiting-express/ (configuration, best practices)
- QR Code Guidelines - Multiple sources on minimum size (2x2cm), 10:1 ratio, contrast requirements

### Secondary (MEDIUM confidence)
- QR Code Size Guidelines - https://scanova.io/blog/minimum-qr-code-size/ (minimum size requirements, distance-to-size ratio)
- QR Code Scanning Problems - https://www.qr-code-generator.com/blog/qr-code-scanning-problems-and-solutions/ (common mistakes)
- Enumeration Attack Prevention - https://www.techtarget.com/searchsecurity/tip/What-enumeration-attacks-are-and-how-to-prevent-them (generic error messages, rate limiting)
- JWT Best Practices - https://curity.io/resources/learn/jwt-best-practices/ (token lifespan, validation patterns)
- React Protected Routes - https://react.wiki/router/protected-routes/ (authentication patterns for invite flows)

### Tertiary (LOW confidence)
- Various WebSearch results on invite system architecture - Used for pattern discovery, not specific implementation details
- Community blog posts on invite systems - Used for concept validation, not authoritative source

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - nanoid and react-qr-code are well-established with official documentation
- Architecture: HIGH - Patterns verified with official docs (nanoid, express-rate-limit, Clipboard API)
- Pitfalls: MEDIUM - Combination of official security guidance and common WebSearch findings on QR code mistakes
- Code examples: HIGH - All examples sourced from official documentation or verified community guides

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days - stable ecosystem, core patterns unlikely to change)
