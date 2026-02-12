# Phase 4: Invite System - Research

**Researched:** 2026-02-08
**Domain:** Invite systems, shareable links, QR code generation
**Confidence:** HIGH

## Summary

Research focused on implementing a secure invite system with shareable links and QR codes for event participation. The database schema already includes an `invites` table (created in Phase 1) with proper indexes and constraints, providing a solid foundation. The implementation requires generating cryptographically secure invite codes, creating QR codes on both frontend and backend, implementing clipboard copy functionality, and building an invite acceptance flow using URL parameters.

**Standard approach:** Generate URL-safe tokens using Node.js `crypto.randomBytes()`, render QR codes with `react-qr-code` (frontend) and `qrcode` (backend), track invite status in the database (pending/accepted/declined), and provide organizers with a dashboard to view invite status.

**Primary recommendation:** Use native browser Clipboard API with fallback for copy-to-clipboard, generate QR codes client-side for instant feedback, implement a dedicated `/join/:inviteCode` route for invite acceptance, and leverage the existing JWT authentication system to link invites to user accounts.

## Standard Stack

The established libraries/tools for invite systems with QR codes:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-qr-code | 2.0.18 | QR code rendering (frontend) | React-specific, SVG output, UTF-8 support, actively maintained (latest release July 2025) |
| qrcode | 1.5.x | QR code generation (backend) | Industry standard for Node.js, supports toDataURL() for base64, promise-based API |
| crypto (Node.js built-in) | Native | Secure token generation | Cryptographically secure randomBytes(), no dependencies |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Clipboard API (browser native) | Native | Copy-to-clipboard | Modern browsers (HTTPS required for production, works on localhost) |
| React Router useSearchParams | 7.x | URL parameter handling | Parsing invite codes from query strings or route params |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-qr-code | qrcode.react | qrcode.react is older but more widely used; react-qr-code has cleaner API and better React 19 support |
| Native Clipboard API | react-copy-to-clipboard | Library adds abstraction but brings dependency; native API requires fallback handling |
| crypto.randomBytes() | nanoid or uuid | nanoid/uuid are simpler but randomBytes() is built-in and allows custom formatting for URL-safety |

**Installation:**
```bash
# Frontend
cd apps/gatherly && pnpm add react-qr-code

# Backend
cd apps/api && pnpm add qrcode
cd apps/api && pnpm add -D @types/qrcode
```

## Architecture Patterns

### Recommended Project Structure

```
apps/api/src/
├── routes/
│   └── invites.ts           # Invite CRUD, generation, acceptance
├── utils/
│   └── tokenGenerator.ts    # Secure invite code generation
└── db/
    └── schema.sql           # Already has invites table

apps/gatherly/src/
├── pages/
│   └── invite/
│       ├── join.tsx         # Accept invite page (/join/:code)
│       └── manage.tsx       # Organizer invite management (optional)
├── components/
│   ├── InviteLink.tsx       # Copy-to-clipboard invite link
│   └── InviteQRCode.tsx     # QR code display component
├── api/
│   └── invites.ts           # API client for invite endpoints
└── routes.tsx               # Add /join/:code route
```

### Pattern 1: Secure Invite Code Generation

**What:** Cryptographically secure URL-safe token generation
**When to use:** Creating new invites for events

**Example:**
```typescript
// Source: Node.js crypto documentation + WebSearch best practices
import crypto from 'crypto';

export function generateInviteCode(bytes: number = 32): string {
  return crypto.randomBytes(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, ''); // Remove padding
}

// Usage: const code = generateInviteCode(); // ~43 characters URL-safe
```

**Why this works:**
- 32 bytes = 256 bits of entropy (2^256 possible values)
- Base64url encoding makes it URL-safe
- No external dependencies
- Brute force is statistically impossible within invite lifetime

### Pattern 2: Database-First Invite Flow

**What:** Track invite lifecycle in database, use status transitions
**When to use:** Managing invite state from creation to acceptance

**Example:**
```typescript
// Source: WebSearch - common invite system patterns
// Database schema (already exists in schema.sql)
// invites table:
//   - invite_code (UNIQUE, indexed)
//   - status: 'pending' | 'accepted' | 'declined'
//   - participant_id (NULL until accepted, then linked)
//   - event_id (foreign key)

// API endpoint pattern
router.post('/:eventId/invites', async (req, res) => {
  const { eventId } = req.params;
  const { email, phone } = req.body;
  const inviteCode = generateInviteCode();

  await query(`
    INSERT INTO invites (event_id, email, phone, invite_code, status)
    VALUES ($1, $2, $3, $4, 'pending')
  `, [eventId, email, phone, inviteCode]);

  res.json({ inviteCode, inviteUrl: `${BASE_URL}/join/${inviteCode}` });
});

router.post('/join/:code', async (req, res) => {
  const { code } = req.params;
  const { participantId } = req.body; // From authenticated user

  await query(`
    UPDATE invites
    SET status = 'accepted', participant_id = $1
    WHERE invite_code = $2 AND status = 'pending'
  `, [participantId, code]);

  res.json({ success: true });
});
```

### Pattern 3: QR Code Generation (Frontend)

**What:** Client-side QR code rendering with instant visual feedback
**When to use:** Displaying QR codes in organizer's event management UI

**Example:**
```typescript
// Source: https://github.com/rosskhanas/react-qr-code README
import QRCode from 'react-qr-code';

function InviteQRCode({ inviteUrl }: { inviteUrl: string }) {
  return (
    <div style={{ background: 'white', padding: '16px' }}>
      <QRCode
        value={inviteUrl}
        size={256}
        level="H" // High error correction (30% redundancy)
        fgColor="#000000"
        bgColor="#FFFFFF"
      />
    </div>
  );
}
```

**Why client-side:**
- No backend roundtrip for instant display
- QR code data is just the URL (not sensitive)
- Reduces server load
- SVG scales to any size

### Pattern 4: QR Code Generation (Backend - Optional)

**What:** Server-side QR code generation as base64 data URL
**When to use:** Embedding QR codes in emails or generating downloadable QR images

**Example:**
```typescript
// Source: https://github.com/soldair/node-qrcode README
import QRCode from 'qrcode';

async function generateQRCodeDataURL(inviteUrl: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(inviteUrl, {
      errorCorrectionLevel: 'H',
      width: 512,
      margin: 2,
    });
    return dataUrl; // Returns "data:image/png;base64,..."
  } catch (err) {
    throw new Error('Failed to generate QR code');
  }
}

// In route
router.get('/invites/:code/qr', async (req, res) => {
  const { code } = req.params;
  const inviteUrl = `${process.env.BASE_URL}/join/${code}`;
  const qrDataUrl = await generateQRCodeDataURL(inviteUrl);
  res.json({ qrCode: qrDataUrl });
});
```

### Pattern 5: Copy-to-Clipboard with Feedback

**What:** Modern Clipboard API with visual feedback and fallback
**When to use:** Sharing invite links via copy button

**Example:**
```typescript
// Source: https://blog.logrocket.com/implementing-copy-clipboard-react-clipboard-api/
import { useState } from 'react';

function useCopyToClipboard(resetDelay: number = 3000) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      // Modern Clipboard API (requires HTTPS)
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), resetDelay);
      return true;
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), resetDelay);
        return true;
      } catch (fallbackErr) {
        console.error('Clipboard copy failed:', fallbackErr);
        return false;
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  return { copied, copyToClipboard };
}

// Usage in component
function InviteLink({ url }: { url: string }) {
  const { copied, copyToClipboard } = useCopyToClipboard();

  return (
    <button onClick={() => copyToClipboard(url)}>
      {copied ? 'Copied!' : 'Copy Link'}
    </button>
  );
}
```

### Pattern 6: Invite Acceptance Flow with URL Parameters

**What:** Dedicated route for invite acceptance with query/path parameters
**When to use:** Handling invite link clicks from participants

**Example:**
```typescript
// Source: https://www.codemzy.com/blog/get-set-query-params-react
import { useParams, useNavigate } from 'react-router';
import { useEffect } from 'react';

// Route: /join/:inviteCode
function JoinEventPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuth(); // From existing JWT auth

  useEffect(() => {
    if (!inviteCode) return;

    // If not authenticated, redirect to login with return URL
    if (!user) {
      navigate(`/login?redirect=/join/${inviteCode}`);
      return;
    }

    // Accept invite
    acceptInvite(inviteCode)
      .then((event) => {
        navigate(`/events/${event.id}`);
      })
      .catch((err) => {
        // Handle expired/invalid invite
        console.error('Invite acceptance failed:', err);
      });
  }, [inviteCode, user, navigate]);

  return <div>Joining event...</div>;
}
```

### Anti-Patterns to Avoid

- **Using sequential IDs for invite codes:** Predictable codes enable unauthorized enumeration attacks
- **Not setting expiration:** Invite codes should expire after acceptance or time limit
- **Storing invite codes in plain text without uniqueness:** Always use UNIQUE constraint on invite_code column
- **Generating QR codes on every API call:** Cache or generate client-side for performance
- **Not validating invite status before acceptance:** Check `status = 'pending'` to prevent re-use

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| QR code generation | Custom SVG path generator | `react-qr-code` or `qrcode` | Error correction, encoding modes, data optimization, standards compliance |
| Secure token generation | Math.random() or timestamp-based | `crypto.randomBytes()` | Cryptographic security, sufficient entropy, URL-safe encoding |
| Clipboard copy | Manual selection + document.execCommand | Native Clipboard API with fallback | Browser compatibility, async API, user permission handling |
| URL-safe encoding | Custom character replacement | Base64url (base64 + replacements) | Standard encoding, no special characters, URL compatible |
| Invite expiration | Manual timestamp checks | Database + cron job or TTL | Consistency, automatic cleanup, index optimization |

**Key insight:** QR code generation involves complex error correction algorithms (Reed-Solomon), data encoding optimizations, and format compliance. Libraries handle these automatically and are battle-tested across millions of scans. Similarly, secure token generation requires proper entropy sources that Math.random() cannot provide.

## Common Pitfalls

### Pitfall 1: HTTPS Requirement for Clipboard API

**What goes wrong:** Clipboard API silently fails in production if site is not HTTPS
**Why it happens:** Browser security policy restricts clipboard access to secure contexts
**How to avoid:**
- Always test on HTTPS (or localhost)
- Implement document.execCommand fallback
- Show clear error message if both fail
**Warning signs:** Copy button works locally but not on deployed HTTP site

### Pitfall 2: QR Code Quiet Zone Violation

**What goes wrong:** QR codes don't scan reliably when placed on dark backgrounds
**Why it happens:** QR codes need white "quiet zone" margin for scanner detection
**How to avoid:** Always wrap QRCode component in a white container with padding
**Warning signs:** QR codes scan inconsistently or require perfect alignment

**Example:**
```typescript
// BAD: Dark background touches QR code
<div style={{ background: 'black' }}>
  <QRCode value={url} />
</div>

// GOOD: White container preserves quiet zone
<div style={{ background: 'white', padding: '16px' }}>
  <QRCode value={url} />
</div>
```

### Pitfall 3: Not Handling Already-Accepted Invites

**What goes wrong:** User clicks invite link twice, sees error or creates duplicate participant
**Why it happens:** Invite acceptance doesn't check current status
**How to avoid:**
- Query invite status before acceptance
- If already accepted by same user, redirect to event
- If accepted by different user, show "invite already used" message
**Warning signs:** Database errors on duplicate participant creation, user confusion

### Pitfall 4: URL Encoding Issues with Invite Codes

**What goes wrong:** Invite codes with `+` or `/` characters break when used in URLs
**Why it happens:** Base64 encoding uses URL-reserved characters
**How to avoid:** Use base64url encoding (replace `+` with `-`, `/` with `_`, remove `=`)
**Warning signs:** 404 errors on invite links, codes get truncated in URLs

### Pitfall 5: Insufficient Token Entropy

**What goes wrong:** Invite codes are predictable or guessable with brute force
**Why it happens:** Using too few bytes (e.g., 8 bytes) or weak random sources
**How to avoid:** Use minimum 32 bytes (256 bits) with crypto.randomBytes()
**Warning signs:** Security audit flags predictable tokens, enumeration attacks succeed

### Pitfall 6: Race Condition on Invite Acceptance

**What goes wrong:** Multiple users can accept same invite code simultaneously
**Why it happens:** No database-level atomicity on status check + update
**How to avoid:** Use WHERE clause to check status in UPDATE query, or use transactions
**Warning signs:** Multiple participants created for same invite, database constraint violations

**Example:**
```typescript
// BAD: Race condition
const invite = await query('SELECT * FROM invites WHERE invite_code = $1', [code]);
if (invite.rows[0].status === 'pending') {
  await query('UPDATE invites SET status = $1 WHERE invite_code = $2', ['accepted', code]);
}

// GOOD: Atomic update
const result = await query(`
  UPDATE invites
  SET status = 'accepted', participant_id = $1
  WHERE invite_code = $2 AND status = 'pending'
  RETURNING *
`, [participantId, code]);

if (result.rows.length === 0) {
  throw new Error('Invite already used or invalid');
}
```

## Code Examples

Verified patterns from official sources:

### QR Code with Error Correction (Frontend)

```typescript
// Source: https://github.com/rosskhanas/react-qr-code
import QRCode from 'react-qr-code';

function EventInviteQR({ eventId, inviteCode }: Props) {
  const inviteUrl = `${window.location.origin}/join/${inviteCode}`;

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <QRCode
        value={inviteUrl}
        size={256}
        level="H" // High error correction (30% damage resistance)
        fgColor="#000000"
        bgColor="#FFFFFF"
      />
      <p className="mt-2 text-sm text-center">Scan to join event</p>
    </div>
  );
}
```

### Secure Invite Code Generation (Backend)

```typescript
// Source: Node.js crypto docs + WebSearch best practices
import crypto from 'crypto';

export function generateSecureInviteCode(): string {
  // 32 bytes = 256 bits of entropy
  const buffer = crypto.randomBytes(32);

  // Base64url encoding (URL-safe)
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')  // Replace + with -
    .replace(/\//g, '_')  // Replace / with _
    .replace(/=/g, '');   // Remove padding
}

// Output: ~43 character URL-safe string
// Example: "x7k9mP_3nR-2vQ8wLs1eT5yU4jH6zN0cV9bA"
```

### Backend QR Code Data URL (Optional)

```typescript
// Source: https://github.com/soldair/node-qrcode
import QRCode from 'qrcode';

async function generateInviteQRCode(inviteCode: string): Promise<string> {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const inviteUrl = `${baseUrl}/join/${inviteCode}`;

  try {
    const dataUrl = await QRCode.toDataURL(inviteUrl, {
      errorCorrectionLevel: 'H', // 30% error correction
      width: 512,
      margin: 2, // Quiet zone
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return dataUrl; // "data:image/png;base64,iVBORw0KGgo..."
  } catch (err) {
    throw new Error(`QR generation failed: ${err.message}`);
  }
}
```

### Invite Status Tracking Query

```typescript
// Source: Existing database schema + PostgreSQL best practices
// Get all invites for an event with participant details
const invites = await query(`
  SELECT
    i.id,
    i.email,
    i.phone,
    i.invite_code,
    i.status,
    i.created_at,
    p.id as participant_id,
    p.name as participant_name
  FROM invites i
  LEFT JOIN participants p ON i.participant_id = p.id
  WHERE i.event_id = $1
  ORDER BY i.created_at DESC
`, [eventId]);

// Map to response format
const inviteList = invites.rows.map(row => ({
  id: row.id,
  email: row.email,
  phone: row.phone,
  inviteCode: row.invite_code,
  status: row.status, // 'pending' | 'accepted' | 'declined'
  createdAt: row.created_at,
  participant: row.participant_id ? {
    id: row.participant_id,
    name: row.participant_name,
  } : null,
}));
```

### Copy to Clipboard Hook

```typescript
// Source: https://blog.logrocket.com/implementing-copy-clipboard-react-clipboard-api/
import { useState, useCallback } from 'react';

export function useCopyToClipboard(resetDelay: number = 3000) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      // Modern Clipboard API (requires HTTPS)
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), resetDelay);
        return true;
      }

      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        const successful = document.execCommand('copy');
        if (successful) {
          setCopied(true);
          setTimeout(() => setCopied(false), resetDelay);
        }
        return successful;
      } finally {
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      return false;
    }
  }, [resetDelay]);

  return { copied, copyToClipboard };
}
```

### Invite Acceptance API Endpoint

```typescript
// Source: Existing API patterns + research findings
import { Router } from 'express';
import { query } from '../db/connection';
import { authenticateJWT } from '../middleware/auth';

router.post('/join/:inviteCode', authenticateJWT, async (req, res) => {
  const { inviteCode } = req.params;
  const userId = req.user.id; // From JWT

  // Atomic update with status check
  const result = await query(`
    UPDATE invites
    SET status = 'accepted',
        participant_id = (
          SELECT id FROM participants
          WHERE event_id = invites.event_id
            AND name = $1
          LIMIT 1
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE invite_code = $2
      AND status = 'pending'
    RETURNING event_id, email, phone
  `, [req.user.name, inviteCode]);

  if (result.rows.length === 0) {
    return res.status(400).json({
      error: 'Invite already used, expired, or invalid'
    });
  }

  const invite = result.rows[0];

  // Create participant if doesn't exist
  if (!invite.participant_id) {
    await query(`
      INSERT INTO participants (event_id, name)
      VALUES ($1, $2)
      ON CONFLICT (event_id, name) DO NOTHING
    `, [invite.event_id, req.user.name]);
  }

  res.json({
    success: true,
    eventId: invite.event_id
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Email-only invites | Multi-channel (email, SMS, link, QR) | ~2020 | Users prefer flexibility; QR codes exploded post-COVID |
| Long-lived invite links | Time-limited + single-use | ~2021 | Security best practice; prevents sharing stale links |
| Server-side QR generation | Client-side with SVG | ~2022 | Reduces server load, instant rendering, scales infinitely |
| UUIDs for invite codes | crypto.randomBytes() with base64url | Ongoing | More compact URLs, same security, no external library |
| Manual clipboard copy | Clipboard API with fallback | 2020-present | Better UX, async API, permission-based |

**Deprecated/outdated:**
- **qrcode.react** (v3): Still works but react-qr-code has better React 19 support and cleaner API
- **nanoid for invite codes**: Good but unnecessary dependency when crypto.randomBytes() is built-in
- **react-copy-to-clipboard**: Native Clipboard API is now widely supported; library adds unnecessary weight

## Open Questions

Things that couldn't be fully resolved:

1. **Invite Expiration Strategy**
   - What we know: Industry standard is 15 minutes for auth tokens, 1-14 days for invites
   - What's unclear: Should gatherly invites expire at all, or remain valid until event date?
   - Recommendation: Make expiration optional per event (organizer choice), default to no expiration for simplicity

2. **Email/SMS Notification Integration**
   - What we know: Database schema has email/phone fields in invites table
   - What's unclear: Phase 4 requirements don't specify sending actual emails/SMS, only generating links
   - Recommendation: Phase 4 focuses on link generation and UI; email/SMS sending deferred to future phase

3. **Invite vs Participant Relationship**
   - What we know: Invites can exist without participants (pending), then link on acceptance
   - What's unclear: Should organizer pre-create participants when sending invites, or create on acceptance?
   - Recommendation: Create participant on acceptance only; allows invite to be sent to anyone without prior registration

4. **QR Code Download Feature**
   - What we know: Organizers may want to print QR codes for physical events
   - What's unclear: Should backend provide downloadable PNG/SVG, or let users screenshot?
   - Recommendation: Implement "Download QR" button that triggers browser download of canvas-rendered PNG (no backend needed)

## Sources

### Primary (HIGH confidence)

- [react-qr-code GitHub](https://github.com/rosskhanas/react-qr-code) - Installation, props, usage examples
- [node-qrcode GitHub](https://github.com/soldair/node-qrcode) - API methods, error correction levels, data URL generation
- Node.js crypto module documentation - randomBytes() method
- Existing database schema (C:\repos\gatherly\apps\api\src\db\schema.sql) - invites table structure verified

### Secondary (MEDIUM confidence)

- [LogRocket: Copy to Clipboard in React](https://blog.logrocket.com/implementing-copy-clipboard-react-clipboard-api/) - Clipboard API patterns and fallback implementation
- [PostgreSQL Documentation: Unique Indexes](https://www.postgresql.org/docs/current/indexes-unique.html) - Constraint best practices for invite codes
- [React Router Query Params Guide](https://www.codemzy.com/blog/get-set-query-params-react) - URL parameter handling patterns

### Tertiary (LOW confidence - WebSearch only)

- [Token Sharing Best Practices - Curity](https://curity.io/resources/learn/token-sharing/) - General guidance on token generation
- [Magic Link Authentication - Supertokens](https://supertokens.com/blog/magiclinks) - Invite/auth link patterns
- [SaaS Invite UI Examples - SaaSFrame](https://www.saasframe.io/categories/invite-team-members) - UI patterns for invite systems
- [System Design: Inviting Users to a Group - Medium](https://itayeylon.medium.com/system-design-inviting-users-to-a-group-98b1e0967b06) - Architectural patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Libraries verified via official GitHub repos, actively maintained, widely used
- Architecture: HIGH - Patterns based on official documentation, existing codebase structure, database schema already in place
- Pitfalls: MEDIUM - Based on WebSearch + common security practices, not all verified in production

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days - stable domain with mature libraries)

**Dependencies already satisfied:**
- Database schema (invites table) created in Phase 1 ✓
- JWT authentication system (Phase 7) for linking invites to users ✓
- React Router 7 for URL parameter handling ✓
- Axios API client for backend communication ✓

**New dependencies required:**
- Frontend: react-qr-code (2.0.18)
- Backend: qrcode (1.5.x) and @types/qrcode
