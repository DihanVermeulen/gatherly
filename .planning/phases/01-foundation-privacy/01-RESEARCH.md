# Phase 1: Foundation & Privacy - Research

**Researched:** 2026-02-06
**Domain:** Database schema extensions, Tailwind CSS migration, UI component library integration
**Confidence:** HIGH

## Summary

Phase 1 establishes the technical foundation for v2.0 by upgrading Tailwind CSS from v2 (PostCSS 7 compat) to v3.4.19+, integrating Konsta UI v5 for iOS-style components, and extending the PostgreSQL schema with wishlists and invites tables. The research reveals clear migration paths for all components with minimal risk.

The Tailwind CSS v2→v3 upgrade is straightforward (estimated 30 minutes) requiring only dependency updates and minor configuration changes. The project already uses CRACO with PostCSS configuration, making the migration cleaner than typical Create React App projects. Konsta UI v5 integrates seamlessly with Tailwind CSS v3 and React 19, providing production-ready iOS-style components.

The database extensions follow PostgreSQL best practices with proper foreign key constraints, indexes, and atomic claiming via `INSERT...ON CONFLICT`. Backward compatibility is achieved through nullable new columns, maintaining the existing Event type structure in the frontend Context API.

**Primary recommendation:** Execute migrations sequentially—Tailwind CSS first (foundation), then Konsta UI (components), then database schema (data layer)—testing backward compatibility at each step.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Tailwind CSS | 3.4.19+ | Utility-first CSS framework | Industry standard for utility CSS, v3 is the stable release (v4 still in beta) |
| Konsta UI | 5.0.0+ | iOS/Material Design components | Official Tailwind CSS mobile UI library, matches design system requirements |
| PostgreSQL | Current (14+) | Relational database | Already in use, INSERT ON CONFLICT introduced in 9.5, refined through v18 |
| node-postgres (pg) | 8.18.0+ | PostgreSQL client | Already in use, supports modern async/await patterns |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @craco/craco | 7.1.0+ | Create React App configuration override | Already in use, enables PostCSS configuration without ejecting |
| autoprefixer | 10.4.23+ | PostCSS plugin for vendor prefixes | Required by Tailwind CSS v3 |
| postcss | 8.5.6+ | CSS transformation tool | Required by Tailwind CSS v3 (v2 used PostCSS 7 compat build) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Konsta UI | daisyUI, Headless UI | Konsta UI specifically designed for mobile-first iOS/Material Design, others lack mobile focus |
| Tailwind v3 | Tailwind v4 | v4 still in beta (as of Feb 2026), breaking changes expected, v3 is production-stable |
| INSERT ON CONFLICT | SELECT-then-INSERT pattern | Application-level checking creates race conditions under concurrency |

**Installation:**
```bash
# Tailwind CSS v3 upgrade
npm uninstall tailwindcss
npm install -D tailwindcss@^3.4.19 postcss@^8.5.6 autoprefixer@^10.4.23

# Konsta UI
npm install konsta

# PostgreSQL client already installed (pg@8.18.0)
```

## Architecture Patterns

### Recommended Project Structure
```
apps/gatherly/
├── src/
│   ├── contexts/
│   │   └── EventsContext.tsx       # Extend with wishlists field
│   ├── api/
│   │   ├── events.ts               # Existing Event type
│   │   └── wishlists.ts            # New wishlist API (Phase 2)
│   └── styles/
│       └── index.css               # Add Konsta UI theme import

apps/api/
├── src/
│   ├── db/
│   │   ├── schema.sql              # Current schema
│   │   └── migrations/             # New directory for migration scripts
│   │       └── 001_add_wishlists_invites.sql
│   └── routes/
│       ├── events.ts               # Existing routes
│       └── wishlists.ts            # New wishlist routes (Phase 2)
```

### Pattern 1: Database Schema Migration with Backward Compatibility
**What:** Add new tables and optional columns without breaking existing queries
**When to use:** Extending schema while maintaining compatibility with v1.0 event data
**Example:**
```sql
-- Source: PostgreSQL official documentation + backward compatibility patterns
-- Migration: 001_add_wishlists_invites.sql

-- Add wishlists table (new feature, no backward compatibility concern)
CREATE TABLE IF NOT EXISTS wishlists (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,  -- base64 data URL
    priority VARCHAR(50) DEFAULT 'medium',  -- low, medium, high
    claimed_by INTEGER REFERENCES participants(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add invites table (new feature)
CREATE TABLE IF NOT EXISTS invites (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    email VARCHAR(255),
    phone VARCHAR(50),
    invite_code VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',  -- pending, accepted, declined
    participant_id INTEGER REFERENCES participants(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Add indexes for query performance
CREATE INDEX IF NOT EXISTS idx_wishlists_event_id ON wishlists(event_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_participant_id ON wishlists(participant_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_claimed_by ON wishlists(claimed_by);
CREATE INDEX IF NOT EXISTS idx_invites_event_id ON invites(event_id);
CREATE INDEX IF NOT EXISTS idx_invites_invite_code ON invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_invites_status ON invites(status);

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_wishlists_updated_at ON wishlists;
CREATE TRIGGER update_wishlists_updated_at
    BEFORE UPDATE ON wishlists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invites_updated_at ON invites;
CREATE TRIGGER update_invites_updated_at
    BEFORE UPDATE ON invites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### Pattern 2: Atomic Claim Operations (Preventing Race Conditions)
**What:** Use PostgreSQL's `INSERT...ON CONFLICT` to prevent duplicate claims
**When to use:** When multiple users might claim the same wishlist item simultaneously
**Example:**
```sql
-- Source: PostgreSQL official documentation on INSERT ON CONFLICT
-- Atomic claim: Only succeeds if not already claimed

-- Option 1: Use claimed_by column directly with UNIQUE constraint
ALTER TABLE wishlists ADD CONSTRAINT unique_unclaimed_item
    EXCLUDE (id WITH =) WHERE (claimed_by IS NOT NULL);

-- Option 2: Use a separate claims table (recommended for audit trail)
CREATE TABLE IF NOT EXISTS wishlist_claims (
    id SERIAL PRIMARY KEY,
    wishlist_id INTEGER NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
    claimed_by INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wishlist_id)  -- Only one claim per wishlist item
);

-- Claim operation (returns success or conflict)
INSERT INTO wishlist_claims (wishlist_id, claimed_by)
VALUES ($1, $2)
ON CONFLICT (wishlist_id) DO NOTHING
RETURNING *;

-- If RETURNING is empty, item already claimed
```

### Pattern 3: Tailwind CSS v3 Migration
**What:** Upgrade from PostCSS 7 compat build to native Tailwind v3
**When to use:** When modernizing CSS infrastructure before adding new UI components
**Example:**
```javascript
// Source: Tailwind CSS v3 official upgrade guide

// Before (package.json) - PostCSS 7 compat
{
  "devDependencies": {
    "tailwindcss": "npm:@tailwindcss/postcss7-compat@^2.2.17"
  }
}

// After (package.json) - Native v3
{
  "devDependencies": {
    "tailwindcss": "^3.4.19",
    "postcss": "^8.5.6",
    "autoprefixer": "^10.4.23"
  }
}

// tailwind.config.js - Replace purge with content
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],  // was: purge
  darkMode: 'class',  // or remove if using default 'media'
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### Pattern 4: Konsta UI Integration
**What:** Add iOS-style mobile components to existing React app
**When to use:** After Tailwind v3 upgrade, before building new UI features
**Example:**
```javascript
// Source: Konsta UI official installation guide

// 1. Import Konsta UI theme in src/index.css
@import 'tailwindcss';
@import 'konsta/react/theme.css';

// 2. Add Roboto font to public/index.html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,500;0,700;1,400;1,500;1,700&display=swap" rel="stylesheet" />

// 3. Use Konsta components
import { App, Page, Navbar, List, ListItem } from 'konsta/react';

function MyApp() {
  return (
    <App theme="ios">
      <Page>
        <Navbar title="My Events" />
        <List>
          <ListItem title="Event 1" />
        </List>
      </Page>
    </App>
  );
}
```

### Pattern 5: React Context Backward Compatibility
**What:** Extend EventsContext without breaking existing consumers
**When to use:** When adding new optional fields to state management
**Example:**
```typescript
// Source: React Context API best practices + backward compatibility patterns

// Before - Existing Event type
export type Event = {
  id: string;
  name: string;
  people: string[];
  couples: string[][];
  assignments: Record<string, string[]> | null;
  coupleCrossing: boolean;
  gifts: Record<string, any>;
  date: string;
  participants: string[];
};

// After - Extended with optional wishlists field
export type Event = {
  id: string;
  name: string;
  people: string[];
  couples: string[][];
  assignments: Record<string, string[]> | null;
  coupleCrossing: boolean;
  gifts: Record<string, any>;
  date: string;
  participants: string[];
  wishlists?: WishlistItem[];  // Optional: defaults to undefined for v1.0 events
};

// EventsContext reducer - Handle wishlists gracefully
const eventsReducer = (state: EventsState, action: EventsAction): EventsState => {
  switch (action.type) {
    case "SET_EVENTS":
      // Ensure wishlists field exists (default to empty array)
      const eventsWithWishlists = action.payload.map(event => ({
        ...event,
        wishlists: event.wishlists || [],
      }));
      return { ...state, events: eventsWithWishlists, loading: false };
    // ... other cases
  }
};
```

### Anti-Patterns to Avoid
- **Breaking schema changes**: Never rename/remove existing columns during migration; use additive changes only (add new columns, keep old ones until all code migrated)
- **Application-level claim locking**: Using SELECT-then-UPDATE for claiming creates race conditions; always use `INSERT...ON CONFLICT` or `UPDATE...WHERE` with explicit conditions
- **Single context for everything**: Splitting contexts by update frequency (data vs. actions) prevents unnecessary re-renders when only functions change
- **Removing @tailwind base**: Required for transforms, filters, shadows in v3; if disabling preflight, use `corePlugins: { preflight: false }` in config instead

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic claim operations | SELECT-then-INSERT with application locking | PostgreSQL `INSERT...ON CONFLICT` | Race conditions eliminated at database level, 2-3x faster in PostgreSQL 18, works under high concurrency |
| iOS-style mobile components | Custom CSS components styled to look like iOS | Konsta UI v5 | 100+ production-ready components, Material Symbols icons, dark mode, matches iOS 26 design system |
| Database migration tracking | Manual SQL scripts without version tracking | Migration tool or numbered scripts | Version conflicts, hard to rollback, unclear which migrations ran |
| Duplicate claim prevention | Client-side checking before claiming | `UNIQUE` constraint + `ON CONFLICT DO NOTHING` | Client checks unreliable, multiple tabs/users bypass checks |

**Key insight:** PostgreSQL's concurrency primitives (UNIQUE constraints, ON CONFLICT, row-level locking) are battle-tested for race conditions. Application-level locking adds complexity without solving distributed/multi-instance scenarios.

## Common Pitfalls

### Pitfall 1: PostCSS 7 Compat Build Lingering
**What goes wrong:** After installing Tailwind v3, build still uses PostCSS 7 compat version due to npm alias in package.json
**Why it happens:** Current package.json has `"tailwindcss": "npm:@tailwindcss/postcss7-compat@^2.2.17"` which is an alias, not direct dependency
**How to avoid:**
1. Explicitly uninstall the alias: `npm uninstall tailwindcss`
2. Install fresh v3: `npm install -D tailwindcss@^3.4.19`
3. Verify in node_modules that it's v3, not compat build
**Warning signs:** Build warnings about PostCSS version, missing v3 features like arbitrary values `[#13ec5b]`

### Pitfall 2: UNIQUE Constraint Conflicts on Existing Data
**What goes wrong:** Adding UNIQUE constraints fails if duplicate data already exists in the table
**Why it happens:** Migration scripts assume clean data, but test/dev databases may have duplicates
**How to avoid:**
1. Query for duplicates before adding constraint: `SELECT event_id, name, COUNT(*) FROM participants GROUP BY event_id, name HAVING COUNT(*) > 1`
2. Clean duplicates before constraint: `DELETE FROM participants WHERE id NOT IN (SELECT MIN(id) FROM participants GROUP BY event_id, name)`
3. Add constraint only after cleanup
**Warning signs:** Migration fails with error "could not create unique index"

### Pitfall 3: Race Condition in Claim/Unclaim Operations
**What goes wrong:** Two users claim same item simultaneously; both succeed, causing double-claim
**Why it happens:** Application checks "is claimed?" then updates, but another request happens between check and update
**How to avoid:**
1. Never use SELECT-then-UPDATE pattern for claims
2. Use `INSERT...ON CONFLICT DO NOTHING` for atomic claims
3. Check RETURNING clause: empty result = conflict (already claimed)
4. For unclaims, use `DELETE...WHERE claimed_by = $userId` to ensure only claimer can unclaim
**Warning signs:** Duplicate claim reports in production, especially under load

### Pitfall 4: Konsta UI Theme Not Applied
**What goes wrong:** Konsta components render but look unstyled or have wrong iOS styling
**Why it happens:** Forgot to import `konsta/react/theme.css` or imported before `tailwindcss`
**How to avoid:**
1. Import order matters: `@import 'tailwindcss'` first, then `@import 'konsta/react/theme.css'`
2. Verify Roboto font loaded for Material Design theme (check Network tab)
3. Wrap app in `<App theme="ios">` for iOS styling
**Warning signs:** Components render but spacing/colors wrong, Material Design theme shows system font instead of Roboto

### Pitfall 5: Breaking Existing localStorage Events
**What goes wrong:** After Event type change, old localStorage events fail to load or cause runtime errors
**Why it happens:** Adding required fields to Event type breaks deserialization of old events
**How to avoid:**
1. Make all new fields optional (use `field?: Type` syntax)
2. Add migration logic in EventsContext initializer to backfill defaults
3. Test with old localStorage data before deploying
4. Consider versioning localStorage schema: `{ version: 2, events: [...] }`
**Warning signs:** Users report "lost events" after upgrade, console errors about undefined properties

## Code Examples

Verified patterns from official sources:

### Atomic Claim Operation (Full Implementation)
```typescript
// Source: PostgreSQL official docs + gatherly codebase pattern
// apps/api/src/routes/wishlists.ts

import { Router, Request, Response } from "express";
import { query, getClient } from "../db/connection";

const router: Router = Router();

// POST /api/events/:eventId/wishlists/:wishlistId/claim
router.post("/:eventId/wishlists/:wishlistId/claim", async (req: Request, res: Response) => {
  const { eventId, wishlistId } = req.params;
  const { participantId } = req.body;

  try {
    // Atomic claim using INSERT ON CONFLICT
    const result = await query(
      `INSERT INTO wishlist_claims (wishlist_id, claimed_by)
       VALUES ($1, $2)
       ON CONFLICT (wishlist_id) DO NOTHING
       RETURNING *`,
      [wishlistId, participantId]
    );

    if (result.rows.length === 0) {
      // Conflict: item already claimed
      return res.status(409).json({
        error: "Item already claimed",
        claimed: false
      });
    }

    // Success: claim created
    res.json({
      claimed: true,
      claim: result.rows[0]
    });
  } catch (error) {
    console.error("Error claiming wishlist item:", error);
    res.status(500).json({ error: "Failed to claim item" });
  }
});

// DELETE /api/events/:eventId/wishlists/:wishlistId/claim
router.delete("/:eventId/wishlists/:wishlistId/claim", async (req: Request, res: Response) => {
  const { wishlistId } = req.params;
  const { participantId } = req.body;

  try {
    // Only allow unclaiming if user is the claimer
    const result = await query(
      `DELETE FROM wishlist_claims
       WHERE wishlist_id = $1 AND claimed_by = $2
       RETURNING *`,
      [wishlistId, participantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Claim not found or you are not the claimer"
      });
    }

    res.json({ unclaimed: true });
  } catch (error) {
    console.error("Error unclaiming wishlist item:", error);
    res.status(500).json({ error: "Failed to unclaim item" });
  }
});

export default router;
```

### Tailwind Config Migration (v2 → v3)
```javascript
// Source: Tailwind CSS official upgrade guide
// apps/gatherly/tailwind.config.js

// BEFORE (v2 with PostCSS 7 compat)
module.exports = {
  purge: ["./pages/**/*.tsx", "./src/**/*.tsx"],
  darkMode: false,
  theme: {
    extend: {},
  },
  variants: {
    extend: {},
  },
  plugins: [],
};

// AFTER (v3)
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],  // renamed from purge
  darkMode: 'class',  // enable class-based dark mode for manual toggle
  theme: {
    extend: {
      colors: {
        primary: '#13ec5b',  // brand color
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
    },
  },
  // variants section removed (all variants auto-enabled in v3)
  plugins: [],
};
```

### Database Migration Script with Rollback
```sql
-- Source: PostgreSQL best practices + gatherly schema patterns
-- apps/api/src/db/migrations/001_add_wishlists_invites.sql

-- Migration: Add wishlists and invites tables
-- Date: 2026-02-06
-- Phase: 1 - Foundation & Privacy

BEGIN;

-- Create wishlists table
CREATE TABLE IF NOT EXISTS wishlists (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create wishlist_claims table (separate for atomic operations)
CREATE TABLE IF NOT EXISTS wishlist_claims (
    id SERIAL PRIMARY KEY,
    wishlist_id INTEGER NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
    claimed_by INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wishlist_id)  -- Prevent duplicate claims
);

-- Create invites table
CREATE TABLE IF NOT EXISTS invites (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    email VARCHAR(255),
    phone VARCHAR(50),
    invite_code VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    participant_id INTEGER REFERENCES participants(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Add indexes
CREATE INDEX idx_wishlists_event_id ON wishlists(event_id);
CREATE INDEX idx_wishlists_participant_id ON wishlists(participant_id);
CREATE INDEX idx_wishlist_claims_wishlist_id ON wishlist_claims(wishlist_id);
CREATE INDEX idx_wishlist_claims_claimed_by ON wishlist_claims(claimed_by);
CREATE INDEX idx_invites_event_id ON invites(event_id);
CREATE INDEX idx_invites_invite_code ON invites(invite_code);
CREATE INDEX idx_invites_status ON invites(status);

-- Add triggers for updated_at
CREATE TRIGGER update_wishlists_updated_at
    BEFORE UPDATE ON wishlists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invites_updated_at
    BEFORE UPDATE ON invites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ROLLBACK SCRIPT (run separately if needed)
-- DROP TABLE IF EXISTS wishlist_claims CASCADE;
-- DROP TABLE IF EXISTS wishlists CASCADE;
-- DROP TABLE IF EXISTS invites CASCADE;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind PostCSS 7 compat | Tailwind v3 native with PostCSS 8 | 2021 (Tailwind v2.1+) | JIT mode default, arbitrary values, better performance |
| `purge` config option | `content` config option | Tailwind v3.0 (2021) | Clearer naming, same functionality |
| Class variants config | All variants auto-enabled | Tailwind v3.0 | Smaller config files, no variants section needed |
| `overflow-clip` / `overflow-ellipsis` | `text-clip` / `text-ellipsis` | Tailwind v3.0 | Avoid collision with CSS properties |
| Konsta UI v4 | Konsta UI v5 | 2025 | React 19 API, Tailwind v4 API, iOS 26 design system |
| Application-level claim locking | PostgreSQL INSERT ON CONFLICT | PostgreSQL 9.5 (2015) | Atomic operations, 2-3x faster in PG18 |

**Deprecated/outdated:**
- `@tailwindcss/postcss7-compat`: Remove immediately, causes compatibility issues with modern tooling
- `darkMode: false` in Tailwind config: Remove (default is now `'media'`), or use `'class'` for manual toggle
- Variants configuration section: Delete entire section, all variants auto-enabled in v3
- `@tailwind screens`: Renamed to `@tailwind variants` (though rarely used in modern projects)

## Open Questions

Things that couldn't be fully resolved:

1. **Database Migration Tooling**
   - What we know: Numbered SQL scripts in `migrations/` directory is common pattern
   - What's unclear: Whether to use a migration library (like `node-pg-migrate`) or manual tracking
   - Recommendation: Start with manual numbered scripts (001_*.sql, 002_*.sql) and track applied migrations in a `schema_migrations` table. Add tooling later if complexity grows.

2. **Wishlist Priority Values**
   - What we know: Requirements mention "priority levels" for wishlist items
   - What's unclear: Exact enum values (low/medium/high vs. 1-5 scale)
   - Recommendation: Use low/medium/high with CHECK constraint; easy to understand, aligns with common UI patterns. Can migrate to numeric if needed later.

3. **Invite Code Generation Strategy**
   - What we know: Invites table has `invite_code` UNIQUE field
   - What's unclear: Format (UUID vs. short code vs. secure random string)
   - Recommendation: Use UUID v4 for uniqueness guarantees. If user-friendly short codes needed, use base62-encoded sequential IDs with salt (implement in Phase 2 when invite system built).

4. **Backward Compatibility Testing Strategy**
   - What we know: Must verify v1.0 events continue working after schema changes
   - What's unclear: How to test localStorage data migration systematically
   - Recommendation: Create test fixture with v1.0 event JSON, add unit test that deserializes and verifies all fields present. Run before/after migration deployment.

## Sources

### Primary (HIGH confidence)
- [Tailwind CSS v3 Upgrade Guide](https://v3.tailwindcss.com/docs/upgrade-guide) - Official migration documentation
- [PostgreSQL INSERT Documentation](https://www.postgresql.org/docs/current/sql-insert.html) - ON CONFLICT clause syntax and atomicity guarantees
- [Konsta UI React Installation](https://konstaui.com/react/installation) - Official setup instructions
- [PostgreSQL ALTER TABLE Documentation](https://www.postgresql.org/docs/current/sql-altertable.html) - Column addition and constraints
- gatherly codebase - Current schema.sql, EventsContext.tsx, package.json

### Secondary (MEDIUM confidence)
- [Tailwind CSS v2 to v3 Migration Guide - daily-dev-tips.com](https://daily-dev-tips.com/posts/upgrading-tailwind-v2-to-v3/) - Community migration experience
- [PostgreSQL Upsert Guide - dbvis.com](https://www.dbvis.com/thetable/postgresql-upsert-insert-on-conflict-guide/) - INSERT ON CONFLICT examples
- [PostgreSQL Backward Compatible Migrations - Medium/OVRSEA](https://medium.com/ovrsea/using-postgresql-views-to-ensure-backwards-compatible-non-breaking-migrations-017288e77f06) - View-based migration strategies
- [React State Management 2026 - TheLinuxCode](https://thelinuxcode.com/state-management-in-react-2026-hooks-context-api-and-redux-in-practice/) - Context API patterns

### Tertiary (LOW confidence)
- [PostgreSQL Concurrent Tag Insertion - sqlpey.com](https://sqlpey.com/sql/postgresql-concurrent-tag-insertion-race-conditions/) - Race condition patterns
- [Event Invitation Schema Examples - freeCodeCamp Forum](https://forum.freecodecamp.org/t/planning-event-database-schema/210140) - Community database design

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries officially documented, versions verified in npm registry
- Architecture: HIGH - Patterns from official PostgreSQL/Tailwind docs, verified against existing codebase
- Pitfalls: MEDIUM - Mix of official warnings (Tailwind migration) and community-reported issues (race conditions)

**Research date:** 2026-02-06
**Valid until:** 2026-04-06 (60 days - stable technologies, slow-moving ecosystem)

**Technologies researched:**
- Tailwind CSS v2→v3 migration
- Konsta UI v5 integration with React 19
- PostgreSQL schema design (wishlists, invites, atomic claims)
- React Context API backward compatibility
- CRACO configuration with PostCSS 8

**Key risks identified:**
1. PostCSS 7 compat build lingering after upgrade (MEDIUM risk, easy to verify)
2. Race conditions in claim/unclaim without proper constraints (HIGH risk if not using ON CONFLICT)
3. Breaking localStorage events without optional fields (MEDIUM risk, needs testing)
4. UNIQUE constraint conflicts on existing data (LOW risk, migrations run on fresh schema)
