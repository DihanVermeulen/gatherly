# Phase 2: Wishlist Core - Research

**Researched:** 2026-02-06
**Domain:** React CRUD forms with image compression, PostgreSQL wishlist management
**Confidence:** HIGH

## Summary

Phase 2 builds a participant-owned wishlist CRUD system with image compression, URL validation, and priority levels. The architecture leverages existing patterns: EventsContext for state management, base64 image storage (now with compression), Express API routes with PostgreSQL, and Konsta UI React components for iOS-style forms.

**Key findings:**
- Database schema already exists (wishlists table added in Phase 1) - no schema changes needed
- Image compression via browser-image-compression library before base64 conversion (800px max, 80% quality)
- Application-level authorization pattern (participant_id matching) instead of PostgreSQL RLS
- Form state management via useState with single object for multi-field forms
- URL validation via native URL constructor with protocol whitelisting or validator.js library
- Konsta UI List Input components for iOS-style form fields

**Primary recommendation:** Extend existing EventsContext with wishlist CRUD actions, create dedicated API routes (wishlists.ts), use browser-image-compression before FileReader base64 conversion, validate product URLs with native URL constructor, and build forms with Konsta UI List Input components following the gifts.tsx pattern.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| browser-image-compression | ^2.x | Client-side image compression | Most popular browser-based compression library (2M+ weekly downloads), supports web workers for non-blocking compression, handles JPEG/PNG/WebP |
| validator | ^13.x (optional) | URL validation | Industry standard for string validation (6M+ weekly downloads), comprehensive URL validation options |
| konsta | ^5.0.6 (installed) | iOS-style mobile UI components | Already integrated in Phase 1, provides List Input for forms |
| React 19 | ^19.2.3 (installed) | UI framework | Current project version |
| Express | Current (installed) | API server | Existing backend |
| PostgreSQL | Current (installed) | Database | Existing database with wishlists table |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| axios | ^1.13.2 (installed) | HTTP client | Already used in existing API calls |
| TypeScript | ^5.9.3 (installed) | Type safety | Existing project standard |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| browser-image-compression | react-image-file-resize, compressorjs | Less popular, fewer features, or lacks web worker support |
| validator.js | Native URL constructor only | validator.js adds 100KB bundle size but provides more options; native is sufficient for basic product URL validation |
| Application-level auth | PostgreSQL RLS policies | RLS adds performance overhead and development complexity; app-level is simpler for single-tenant participant authorization |

**Installation:**
```bash
cd apps/gatherly
pnpm add browser-image-compression
pnpm add validator  # Optional - only if advanced URL validation needed
```

## Architecture Patterns

### Recommended Project Structure
```
apps/gatherly/src/
├── api/
│   └── wishlists.ts         # New API client for wishlist CRUD
├── contexts/
│   └── EventsContext.tsx    # Extend with wishlist actions
├── pages/
│   └── events/
│       └── wishlist.tsx     # New participant wishlist page
├── components/
│   └── wishlist/
│       ├── WishlistForm.tsx # Form for create/edit
│       └── WishlistItem.tsx # Individual item display
└── core/
    └── wishlistValidation.ts # Validation logic

apps/api/src/
├── routes/
│   └── wishlists.ts         # New wishlist CRUD routes
└── db/
    └── schema.sql           # No changes - wishlists table exists
```

### Pattern 1: Image Compression Before Base64 Conversion
**What:** Compress image file before converting to base64 data URL
**When to use:** All image uploads in wishlist forms
**Example:**
```typescript
// Source: browser-image-compression npm docs
import imageCompression from 'browser-image-compression';

async function handleImageUpload(file: File): Promise<string> {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 800,
    useWebWorker: true,
    initialQuality: 0.8
  };

  try {
    const compressedFile = await imageCompression(file, options);

    // Convert to base64 after compression
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(compressedFile);
    });
  } catch (error) {
    console.error('Image compression error:', error);
    throw error;
  }
}
```

### Pattern 2: Context-Based Wishlist State Management
**What:** Extend EventsContext reducer with wishlist CRUD actions
**When to use:** All wishlist state operations
**Example:**
```typescript
// Source: Existing EventsContext.tsx pattern
type EventsAction =
  | { type: "ADD_EVENT"; payload: Event }
  | { type: "UPDATE_EVENT"; payload: Event }
  // New wishlist actions
  | { type: "ADD_WISHLIST_ITEM"; payload: { eventId: string; item: WishlistItem } }
  | { type: "UPDATE_WISHLIST_ITEM"; payload: { eventId: string; item: WishlistItem } }
  | { type: "DELETE_WISHLIST_ITEM"; payload: { eventId: string; itemId: number } };

const eventsReducer = (state: EventsState, action: EventsAction): EventsState => {
  switch (action.type) {
    case "ADD_WISHLIST_ITEM": {
      return {
        ...state,
        events: state.events.map(event =>
          event.id === action.payload.eventId
            ? { ...event, wishlists: [...(event.wishlists || []), action.payload.item] }
            : event
        )
      };
    }
    // ... other cases
  }
};
```

### Pattern 3: Application-Level Participant Authorization
**What:** Check participant_id ownership in API route handlers
**When to use:** Create, edit, delete wishlist operations
**Example:**
```typescript
// Source: PostgreSQL authorization patterns 2026
// apps/api/src/routes/wishlists.ts
router.put("/:eventId/wishlists/:id", async (req, res) => {
  const { eventId, id } = req.params;
  const { participantId, itemName, description } = req.body;

  // Verify ownership: wishlist item must belong to participant
  const ownerCheck = await query(
    "SELECT participant_id FROM wishlists WHERE id = $1 AND event_id = $2",
    [id, eventId]
  );

  if (ownerCheck.rows.length === 0) {
    return res.status(404).json({ error: "Wishlist item not found" });
  }

  if (ownerCheck.rows[0].participant_id !== participantId) {
    return res.status(403).json({ error: "Unauthorized - can only edit your own items" });
  }

  // Proceed with update
  const result = await query(
    "UPDATE wishlists SET item_name = $1, description = $2 WHERE id = $3 RETURNING *",
    [itemName, description, id]
  );

  res.json(result.rows[0]);
});
```

### Pattern 4: Multi-Field Form State with Single Object
**What:** Use useState with object containing all form fields, single handleChange function
**When to use:** Wishlist create/edit forms
**Example:**
```typescript
// Source: React form state management patterns 2026
const [formData, setFormData] = useState({
  itemName: '',
  description: '',
  productUrl: '',
  priority: 'medium' as 'low' | 'medium' | 'high',
  imageUrl: null as string | null
});

const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  const { name, value } = e.target;
  setFormData(prev => ({ ...prev, [name]: value }));
};

// In JSX:
<input name="itemName" value={formData.itemName} onChange={handleChange} />
```

### Pattern 5: URL Validation with Native Constructor
**What:** Use URL constructor with protocol checking for security
**When to use:** Product URL validation in wishlist forms
**Example:**
```typescript
// Source: React URL validation best practices 2026
function validateProductUrl(url: string): boolean {
  if (!url) return true; // Optional field

  try {
    const parsed = new URL(url);
    return ['https:', 'http:'].includes(parsed.protocol);
  } catch (error) {
    return false;
  }
}

// Usage in validation:
if (formData.productUrl && !validateProductUrl(formData.productUrl)) {
  errors.productUrl = "Please enter a valid http:// or https:// URL";
}
```

### Pattern 6: Konsta UI List Input Forms
**What:** Use Konsta UI List and List Input components for iOS-style forms
**When to use:** All wishlist form fields
**Example:**
```typescript
// Source: Konsta UI React documentation
import { List, ListInput } from 'konsta/react';

<List strongIos insetIos>
  <ListInput
    label="Item Name"
    type="text"
    placeholder="e.g., Blue Headphones"
    value={formData.itemName}
    onChange={(e) => handleChange(e)}
    name="itemName"
  />
  <ListInput
    label="Description"
    type="textarea"
    placeholder="Details about the item..."
    value={formData.description}
    onChange={(e) => handleChange(e)}
    name="description"
  />
  <ListInput
    label="Product URL"
    type="url"
    placeholder="https://..."
    value={formData.productUrl}
    onChange={(e) => handleChange(e)}
    name="productUrl"
  />
  <ListInput
    label="Priority"
    type="select"
    value={formData.priority}
    onChange={(e) => handleChange(e)}
    name="priority"
  >
    <option value="low">Low</option>
    <option value="medium">Medium</option>
    <option value="high">High</option>
  </ListInput>
</List>
```

### Anti-Patterns to Avoid
- **Compressing after base64 conversion:** Compress the File object before converting to base64, not after - compressing base64 strings is ineffective
- **Multiple useState calls for form fields:** Use single state object to avoid synchronization issues and simplify validation
- **Storing uncompressed images:** Always compress before storage to prevent database bloat and slow page loads
- **PostgreSQL RLS for simple participant ownership:** App-level authorization is simpler, faster, and sufficient for participant-owns-wishlist pattern
- **Regex URL validation:** Native URL constructor is more reliable and prevents bypasses (javascript:, data: URLs)
- **Global state for form data:** Keep form state local to component, only dispatch to context on save

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image compression | Custom canvas resize logic | browser-image-compression | Handles EXIF orientation, web workers, multiple formats, browser compatibility edge cases |
| URL validation | Regex patterns | Native URL constructor or validator.js | Regex misses edge cases (IDN domains, IPv6, authentication, etc.) |
| Form field character counting | Manual substring | TextInput with maxLength + visual counter | Browser native validation + accessibility |
| Priority enum typing | String literals | TypeScript enum or union type | Type safety, autocomplete, refactoring support |
| Base64 encoding | Manual buffer conversion | FileReader.readAsDataURL() | Browser native, handles all image formats |
| Participant authentication | Session middleware | Simple participant_id in request body | Overkill for Phase 2 - defer to Phase 3 (invites) |

**Key insight:** Image compression has many hidden complexities (EXIF rotation, color profiles, progressive JPEG, format detection, memory limits). Browser-image-compression handles all of these and uses web workers to prevent UI blocking.

## Common Pitfalls

### Pitfall 1: Uncompressed Large Images Cause Database Bloat
**What goes wrong:** Base64 encoding increases size by ~33%, uncompressed 5MB image becomes 6.7MB in database
**Why it happens:** FileReader.readAsDataURL() is easy to use but doesn't compress
**How to avoid:** Always compress before base64 conversion (browser-image-compression → FileReader)
**Warning signs:** Database size growing rapidly, slow query responses, localStorage quota errors

### Pitfall 2: Image Compression Blocking UI Thread
**What goes wrong:** Large image compression freezes browser for 2-3 seconds
**Why it happens:** Canvas manipulation is CPU-intensive on main thread
**How to avoid:** Enable `useWebWorker: true` in browser-image-compression options
**Warning signs:** UI freezes during upload, "page unresponsive" warnings

### Pitfall 3: Form Validation Only on Submit
**What goes wrong:** User fills entire form, hits save, gets multiple error messages
**Why it happens:** No real-time feedback during input
**How to avoid:** Validate on blur for each field, show inline errors immediately
**Warning signs:** High form abandonment, user complaints about "surprise" errors

### Pitfall 4: Participant Authorization Race Conditions
**What goes wrong:** User edits their item, another participant saves first, first user overwrites
**Why it happens:** No optimistic locking or version checking
**How to avoid:** Use updated_at timestamp comparison or PostgreSQL optimistic locking
**Warning signs:** Lost edits, user complaints about changes disappearing

### Pitfall 5: Product URL XSS Vulnerabilities
**What goes wrong:** User enters `javascript:alert('XSS')` as product URL, stored and rendered
**Why it happens:** URL not validated for safe protocols
**How to avoid:** Whitelist only http:// and https:// protocols in validation
**Warning signs:** Security audit findings, javascript: URLs in database

### Pitfall 6: Missing Empty State Handling
**What goes wrong:** Blank screen when user has no wishlist items yet
**Why it happens:** UI assumes items array has length > 0
**How to avoid:** Add empty state UI with "Add your first item" call-to-action
**Warning signs:** User confusion, support tickets asking "where do I add items?"

### Pitfall 7: localStorage Sync Doesn't Include Wishlists
**What goes wrong:** In offline mode, wishlists not saved to localStorage with events
**Why it happens:** EventsContext localStorage sync doesn't include wishlists array
**How to avoid:** Ensure localStorage.setItem includes event.wishlists in serialization
**Warning signs:** Wishlists disappear on page refresh in offline mode

## Code Examples

Verified patterns from official sources:

### Example 1: Complete Image Upload with Compression
```typescript
// Source: browser-image-compression npm docs + existing gifts.tsx pattern
import imageCompression from 'browser-image-compression';

async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('image/')) {
    setError('Please select an image file');
    return;
  }

  try {
    setUploading(true);

    // Compress image
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 800,
      useWebWorker: true,
      initialQuality: 0.8
    };

    const compressedFile = await imageCompression(file, options);

    // Convert to base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(compressedFile);
    });

    setFormData(prev => ({ ...prev, imageUrl: base64 }));
    setUploading(false);
  } catch (error) {
    console.error('Image upload error:', error);
    setError('Failed to upload image');
    setUploading(false);
  }
}
```

### Example 2: Wishlist Validation Logic
```typescript
// Source: Existing giftValidation.ts pattern
export const WISHLIST_ITEM_NAME_MAX = 120;
export const WISHLIST_DESCRIPTION_MAX = 500;
export const PRODUCT_URL_MAX = 500;

export type WishlistFormErrors = Partial<{
  itemName: string;
  description: string;
  productUrl: string;
  priority: string;
  image: string;
}>;

function validateProductUrl(url: string): boolean {
  if (!url.trim()) return true; // Optional

  try {
    const parsed = new URL(url);
    return ['https:', 'http:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function validateWishlistForm(data: {
  itemName: string;
  description: string;
  productUrl: string;
  priority: 'low' | 'medium' | 'high';
  imageUrl: string | null;
}): WishlistFormErrors {
  const errors: WishlistFormErrors = {};

  if (!data.itemName.trim()) {
    errors.itemName = "Item name is required.";
  } else if (data.itemName.length > WISHLIST_ITEM_NAME_MAX) {
    errors.itemName = `Item name must be ${WISHLIST_ITEM_NAME_MAX} characters or less.`;
  }

  if (data.description.length > WISHLIST_DESCRIPTION_MAX) {
    errors.description = `Description must be ${WISHLIST_DESCRIPTION_MAX} characters or less.`;
  }

  if (data.productUrl.length > PRODUCT_URL_MAX) {
    errors.productUrl = `URL must be ${PRODUCT_URL_MAX} characters or less.`;
  } else if (data.productUrl.trim() && !validateProductUrl(data.productUrl)) {
    errors.productUrl = "Please enter a valid http:// or https:// URL.";
  }

  const validPriorities = ['low', 'medium', 'high'];
  if (!validPriorities.includes(data.priority)) {
    errors.priority = "Please select a valid priority level.";
  }

  return errors;
}

export function isWishlistFormValid(errors: WishlistFormErrors): boolean {
  return Object.keys(errors).length === 0;
}
```

### Example 3: API Route for Wishlist CRUD
```typescript
// Source: Existing gifts.ts route pattern
import { Router, Request, Response } from "express";
import { query } from "../db/connection";

const router: Router = Router();

// POST /api/events/:eventId/wishlists - Create wishlist item
router.post("/:eventId/wishlists", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { participantId, itemName, description, imageUrl, productUrl, priority } = req.body;

    if (!itemName?.trim()) {
      return res.status(400).json({ error: "Item name is required" });
    }

    if (!participantId) {
      return res.status(400).json({ error: "Participant ID is required" });
    }

    const result = await query(
      `INSERT INTO wishlists (event_id, participant_id, item_name, description, image_url, product_url, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [eventId, participantId, itemName.trim(), description || null, imageUrl || null, productUrl || null, priority || 'medium']
    );

    const item = result.rows[0];
    res.status(201).json({
      id: item.id,
      eventId: item.event_id,
      participantId: item.participant_id,
      itemName: item.item_name,
      description: item.description,
      imageUrl: item.image_url,
      productUrl: item.product_url,
      priority: item.priority,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    });
  } catch (error) {
    console.error("Error creating wishlist item:", error);
    res.status(500).json({ error: "Failed to create wishlist item" });
  }
});

// PUT /api/events/:eventId/wishlists/:id - Update wishlist item (owner only)
router.put("/:eventId/wishlists/:id", async (req: Request, res: Response) => {
  try {
    const { eventId, id } = req.params;
    const { participantId, itemName, description, imageUrl, productUrl, priority } = req.body;

    // Authorization: verify ownership
    const ownerCheck = await query(
      "SELECT participant_id FROM wishlists WHERE id = $1 AND event_id = $2",
      [id, eventId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: "Wishlist item not found" });
    }

    if (ownerCheck.rows[0].participant_id !== participantId) {
      return res.status(403).json({ error: "Unauthorized - can only edit your own items" });
    }

    const result = await query(
      `UPDATE wishlists
       SET item_name = $1, description = $2, image_url = $3, product_url = $4, priority = $5
       WHERE id = $6 AND event_id = $7
       RETURNING *`,
      [itemName, description, imageUrl, productUrl, priority, id, eventId]
    );

    const item = result.rows[0];
    res.json({
      id: item.id,
      eventId: item.event_id,
      participantId: item.participant_id,
      itemName: item.item_name,
      description: item.description,
      imageUrl: item.image_url,
      productUrl: item.product_url,
      priority: item.priority,
      createdAt: item.created_at,
      updatedAt: item.updated_at
    });
  } catch (error) {
    console.error("Error updating wishlist item:", error);
    res.status(500).json({ error: "Failed to update wishlist item" });
  }
});

// DELETE /api/events/:eventId/wishlists/:id - Delete wishlist item (owner only)
router.delete("/:eventId/wishlists/:id", async (req: Request, res: Response) => {
  try {
    const { eventId, id } = req.params;
    const { participantId } = req.body;

    // Authorization: verify ownership
    const ownerCheck = await query(
      "SELECT participant_id FROM wishlists WHERE id = $1 AND event_id = $2",
      [id, eventId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: "Wishlist item not found" });
    }

    if (ownerCheck.rows[0].participant_id !== participantId) {
      return res.status(403).json({ error: "Unauthorized - can only delete your own items" });
    }

    await query(
      "DELETE FROM wishlists WHERE id = $1 AND event_id = $2",
      [id, eventId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting wishlist item:", error);
    res.status(500).json({ error: "Failed to delete wishlist item" });
  }
});

// GET /api/events/:eventId/wishlists - List all wishlists for event
router.get("/:eventId/wishlists", async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const result = await query(
      `SELECT w.*, p.name as participant_name
       FROM wishlists w
       JOIN participants p ON w.participant_id = p.id
       WHERE w.event_id = $1
       ORDER BY w.created_at DESC`,
      [eventId]
    );

    const items = result.rows.map(row => ({
      id: row.id,
      eventId: row.event_id,
      participantId: row.participant_id,
      participantName: row.participant_name,
      itemName: row.item_name,
      description: row.description,
      imageUrl: row.image_url,
      productUrl: row.product_url,
      priority: row.priority,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.json(items);
  } catch (error) {
    console.error("Error fetching wishlists:", error);
    res.status(500).json({ error: "Failed to fetch wishlists" });
  }
});

export default router;
```

### Example 4: Priority Dropdown with TypeScript
```typescript
// Source: TypeScript enum patterns for React selects 2026
type Priority = 'low' | 'medium' | 'high';

const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low Priority',
  medium: 'Medium Priority',
  high: 'High Priority'
};

// In component:
<ListInput
  label="Priority"
  type="select"
  value={formData.priority}
  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Priority }))}
  name="priority"
>
  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
    <option key={value} value={value}>
      {label}
    </option>
  ))}
</ListInput>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Uncontrolled forms with refs | Controlled components with useState object | React 16+ | Single source of truth, easier validation |
| Multiple useState calls per field | Single state object with handleChange | 2020+ | Less boilerplate, better performance |
| Manual canvas resize for compression | browser-image-compression library | 2018+ | Web worker support, EXIF handling, cross-browser |
| Regex URL validation | Native URL constructor | 2015+ (ES6) | More reliable, prevents XSS bypasses |
| PostgreSQL RLS for all authorization | App-level checks for simple ownership | 2024+ | Simpler for single-tenant participant auth |
| Context + Redux for all state | Context for low-frequency CRUD, TanStack Query for server | 2023+ | Simpler stack, less boilerplate |
| Formik/React Hook Form | Native useState for simple forms | 2024+ | Less dependencies for basic CRUD forms |

**Deprecated/outdated:**
- **PostCSS 7 compat Tailwind**: Removed in Phase 1, using native Tailwind v3
- **Class components**: Use functional components with hooks
- **Redux for simple CRUD**: Context + reducer sufficient for Phase 2 scope

## Open Questions

Things that couldn't be fully resolved:

1. **Participant Identity Management**
   - What we know: Phase 2 requires "users can only edit their own items" (WISH-03)
   - What's unclear: How to identify "current participant" without authentication system (Phase 3 adds invites)
   - Recommendation: Use participantId from URL param or localStorage for Phase 2, defer real auth to Phase 3. Example: `/events/:eventId/participant/:participantId/wishlist`

2. **Wishlist Visibility Rules**
   - What we know: "Participants can view other participants' wishlists" (WISH-07)
   - What's unclear: Should own wishlist items show "claimed by" status to owner, or only to other participants?
   - Recommendation: Hide claim status from wishlist owner (prevents "gaming" the system), show to all other participants. Defer final UX to planning phase.

3. **Image Compression Quality vs. Size Tradeoff**
   - What we know: Success criteria specifies "max 800px width, 80% quality"
   - What's unclear: Should compression be adaptive (higher quality for small images) or fixed?
   - Recommendation: Start with fixed 800px/80% quality, add adaptive compression only if user feedback indicates quality issues

4. **Offline Mode Wishlist Sync**
   - What we know: App has hybrid localStorage/API architecture
   - What's unclear: Should wishlists be editable in offline mode, or read-only until API available?
   - Recommendation: Allow offline editing in localStorage, sync to API on reconnect. Require conflict resolution UI if both offline and server versions exist.

## Sources

### Primary (HIGH confidence)
- [browser-image-compression npm](https://www.npmjs.com/package/browser-image-compression) - Official package documentation, compression options
- [PostgreSQL Official Docs: Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) - RLS vs app-level authorization
- [React Official Docs: Scaling Up with Reducer and Context](https://react.dev/learn/scaling-up-with-reducer-and-context) - Context + reducer patterns
- [Konsta UI React List Input](https://konstaui.com/react/list-input) - Form component documentation
- Existing codebase patterns: `apps/gatherly/src/pages/events/gifts.tsx`, `apps/api/src/routes/gifts.ts`, `apps/gatherly/src/contexts/EventsContext.tsx`

### Secondary (MEDIUM confidence)
- [Image Compression Using React.js - Cloudinary](https://cloudinary.com/blog/guest_post/image-compression-using-reactjs) - Verified compression patterns
- [How To Build a CRUD App with React Hooks and the Context API - DigitalOcean](https://www.digitalocean.com/community/tutorials/react-crud-context-hooks) - Context CRUD patterns
- [State Management in 2026: Redux, Context API, and Modern Patterns - Nucamp](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns) - When to use Context vs alternatives
- [React Security: Vulnerabilities & Best Practices [2026] - GloryWebs](https://www.glorywebs.com/blog/react-security-practices) - URL validation security
- [PostgreSQL Row-level Security (RLS) Limitations and Alternatives - Bytebase](https://www.bytebase.com/blog/postgres-row-level-security-limitations-and-alternatives/) - App-level auth vs RLS

### Tertiary (LOW confidence)
- [Using TypeScript Enums in Select Components with React - Medium](https://medium.com/@dev.jefster/using-typescript-enums-in-select-components-with-react-d33a733767a9) - Priority enum patterns
- [validator.js GitHub releases](https://github.com/validatorjs/validator.js/releases) - URL validation options

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - browser-image-compression is industry standard, Konsta UI already integrated
- Architecture: HIGH - Patterns match existing codebase (EventsContext, API routes, base64 images)
- Pitfalls: HIGH - Common issues well-documented in compression/form validation domains

**Research date:** 2026-02-06
**Valid until:** 2026-03-08 (30 days - stable technologies, existing patterns)
