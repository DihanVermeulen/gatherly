# Coding Conventions

**Analysis Date:** 2026-02-06

## Naming Patterns

**Files:**
- React components: PascalCase with `.tsx` extension (e.g., `CreateGiftForm.tsx`, `EventsContext.tsx`)
- API files: camelCase with `.ts` extension (e.g., `giftValidation.ts`, `client.ts`)
- Route/util files: camelCase (e.g., `giftFilterSort.ts`, `routes.tsx`)
- Test files: `[name].spec.ts` or `[name].spec.tsx` for unit tests
- Barrel exports: `index.ts` or `index.tsx` to re-export module contents

**Functions:**
- Regular functions: camelCase (e.g., `validateGiftForm`, `filterGifts`, `sortGifts`)
- React components: PascalCase (e.g., `CreateGiftForm`, `Button`, `EventsProvider`)
- Custom hooks: Start with `use` prefix, camelCase (e.g., `useEvents`, `useApi`)
- Handler functions: Start with `on` or verb prefix (e.g., `onSubmit`, `refreshEvents`)
- Helper functions: camelCase, often prefixed with action verb (e.g., `fetchEventById`, `giftToFormData`)

**Variables:**
- Constants: UPPER_SNAKE_CASE for exported constants (e.g., `GIFT_NAME_MAX`, `BUDGET_MAX`, `STORAGE_KEY`)
- Local variables/state: camelCase (e.g., `selectedCouples`, `receivedCount`, `tempAssignments`)
- Boolean variables: Often start with `is` or `has` (e.g., `valid`, `useApi`, `isGiftFormValid`)
- React state: camelCase with setState pattern (e.g., `const [events, setEvents]`)
- Context values: camelCase, descriptive names (e.g., `eventsReducer`, `EventsContext`)

**Types:**
- Type names: PascalCase (e.g., `Event`, `Gift`, `GiftFormErrors`)
- Type imports: Use `type` keyword for type-only imports (e.g., `import type { Gift } from "types/gift"`)
- Interfaces for component props: `[ComponentName]Props` (e.g., `CreateGiftFormProps`)
- Action types: UPPER_SNAKE_CASE strings with discriminating `type` field (e.g., `"SET_EVENTS"`, `"ADD_EVENT"`)

## Code Style

**Formatting:**
- Tool: ESLint configured via shared `@repo/eslint-config`
- Line length: No explicit limit enforced, but keep lines readable
- Indentation: 2 spaces (detected from code, not explicitly configured)
- Semicolons: Required (ESLint enforced)
- Trailing commas: Present in multi-line objects/arrays
- Quotes: Double quotes preferred (enforced by eslint-config)

**Linting:**
- Tool: ESLint (shared configuration in monorepo)
- Apps use: `eslint.config.js` that extends `@repo/eslint-config`
- Frontend: Extends `react-app` and `react-app/jest` for CRA compatibility
- Backend: Uses shared ESLint config
- Run: `pnpm lint` from root or app-specific `npm run lint`

## Import Organization

**Order:**
1. React/framework imports (`import React`, `import { ReactElement }`)
2. External npm packages (`import axios`, `import { Router }`)
3. Absolute path imports from codebase (via baseUrl or path aliases)
4. Relative imports (`../api/client`, `./index`)
5. Type imports (use `type` keyword when possible)

**Example from `apps/gatherly/src/components/gift-registry/CreateGiftForm.tsx`:**
```typescript
import React, { useCallback, useRef, useState } from "react";
import {
  GIFT_NAME_MAX,
  DESCRIPTION_MAX,
  STORE_LINK_MAX,
  validateGiftForm,
  isGiftFormValid,
} from "core/giftValidation";
import type { Gift, GiftFormData, GiftPrivacy } from "types/gift";
import { Plus, Upload, X } from "lucide-react";
```

**Path Aliases:**
- Frontend: `baseUrl: "src"` in `tsconfig.json` allows imports like `from "core/..."` and `from "types/..."`
- Backend: Uses shared `@repo/typescript-config` with configured path aliases

## Error Handling

**Patterns:**
- Backend routes: Try-catch blocks with `console.error()` logging and JSON error responses with status codes
  ```typescript
  try {
    // operation
  } catch (error) {
    console.error("Error context:", error);
    res.status(500).json({ error: "Failed to [action]" });
  }
  ```

- Context/hooks: Throw descriptive errors for hook misuse
  ```typescript
  export const useEvents = () => {
    const context = useContext(EventsContext);
    if (context === undefined) {
      throw new Error("useEvents must be used within an EventsProvider");
    }
    return context;
  };
  ```

- Frontend API calls: Rely on caller to handle errors; async operations dispatch `SET_ERROR` action
  ```typescript
  const refreshEvents = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const events = await eventsApi.getAll();
      dispatch({ type: "SET_EVENTS", payload: events });
    } catch (error) {
      console.error("Error fetching events:", error);
      dispatch({ type: "SET_ERROR", payload: "Failed to load events" });
    }
  };
  ```

- Database transactions: Explicit ROLLBACK on error before releasing client
  ```typescript
  const client = await getClient();
  try {
    await client.query("BEGIN");
    // ... operations
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    // handle error
  } finally {
    client.release();
  }
  ```

## Logging

**Framework:** `console` methods (console.log, console.error)

**Patterns:**
- Errors: `console.error("Context message:", error)` - always include descriptive context
- Info: `console.log()` used in development setup (e.g., database connection, query timing)
- Query logging: Database helper logs query text substring, duration, and row count
  ```typescript
  console.log("Executed query", {
    text: text.substring(0, 50),
    duration,
    rows: result.rowCount
  });
  ```

- API availability: `console.log("API not available, using localStorage")` for fallback detection

## Comments

**When to Comment:**
- Non-obvious algorithm logic (e.g., assignment algorithm in `events.ts`)
- Complex state transitions (e.g., hybrid storage fallback in `EventsContext.tsx`)
- API contract documentation (e.g., parameter meanings in route handlers)
- Section markers for logical grouping (e.g., "// Helper function to fetch event by ID")

**JSDoc/TSDoc:**
- Minimal usage; JSDoc comments focus on complex business logic
- Example: `validateGiftForm` includes JSDoc for validation behavior
  ```typescript
  /**
   * Real-time validation for the gift form.
   * Returns an object of field keys to error messages (empty string = no error).
   */
  export function validateGiftForm(data: {...}): GiftFormErrors
  ```

- Type annotations preferred over JSDoc for parameter/return documentation (TypeScript is strict mode)
- Props interfaces document optional parameters via JSDoc comments
  ```typescript
  type CreateGiftFormProps = {
    onSubmit: (gift: Gift) => void;
    loading?: boolean;
    /** When provided, form acts in edit mode and pre-fills */
    initialGift?: Gift | null;
  };
  ```

## Function Design

**Size:** Functions are kept focused and concise
- Utility functions: 10-60 lines typically
- Component functions: 50-150 lines (logic extracted to utility/hook functions when longer)
- Helper functions: 5-40 lines
- Route handlers: 20-100 lines (complex ones delegate to helper functions like `fetchEventById`)

**Parameters:**
- Frontend: Props passed as objects with destructuring in function signature
  ```typescript
  export const CreateGiftForm: React.FC<CreateGiftFormProps> = ({
    onSubmit,
    loading = false,
    successMessage = null,
    onSuccessDismiss,
    initialGift = null,
    submitLabel = "Add to Registry",
  }) => { ... }
  ```

- Backend: Route parameters from `req.params`, body from `req.body`, use destructuring for clarity
  ```typescript
  router.post("/:id/participants", async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name } = req.body;
  ```

- Validation functions: Single data object parameter with specific typing
  ```typescript
  export function validateGiftForm(data: {
    name: string;
    recipient: string;
    // ... fields
  }): GiftFormErrors
  ```

**Return Values:**
- Explicit return types via TypeScript (no relying on inference for public APIs)
- Error cases return structured responses (API handlers return status + JSON)
- Validation functions return error objects or booleans
- Async functions use `Promise<T>` where T is the concrete return type

## Module Design

**Exports:**
- Each module exports one primary abstraction (component, context, utility)
- Barrel files (`index.ts`, `index.tsx`) re-export related exports from sibling files
- Type exports use `export type` syntax for tree-shaking
  ```typescript
  export type Event = { ... };
  export const eventsApi = { ... };
  ```

**Barrel Files:**
- Used in `src/components/index.ts` to re-export all UI components
- Used in `src/components/gift-registry/index.ts` for related gift components
- Pattern: `export * from "./ComponentName"` or explicit named exports

**File Organization:**
- Single responsibility: Each file exports one primary thing (component, context, API client, utility)
- Colocation: Related files grouped by domain (e.g., `gift-registry/` folder contains form + card + list)
- API layer: Separate files for each resource (e.g., `events.ts`, `gifts.ts`, `decipher.ts`)
- Contexts: One context per file with provider and hook exported together

## Specific Patterns

**React Context Pattern:**
- Context exports: Type definition, context creation, Provider component, custom hook
- Reducer pattern: Define action types as discriminated union, implement switch-based reducer
- State: Include `loading` and `error` fields for async operations

**API Client Pattern:**
- Axios instance created in `client.ts` with base URL from environment
- Resource-specific API modules (e.g., `eventsApi`) export object with CRUD methods
- Methods are async, return typed promises, methods named after HTTP verb (getAll, getById, create, update, delete)

**Component Props Pattern:**
- Define explicit `Props` type interface for all components
- React.FC<Props> syntax with destructuring in signature
- Provide default values for optional props in function body or as defaults in destructuring
- Document complex optional props with JSDoc comments

**Reducer Pattern (Context):**
- Action types: Discriminated union with literal `type` field
- Cases: One case per action type, immutable state updates using spread operator
- Default case: Return state unchanged

