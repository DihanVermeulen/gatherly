# Testing Patterns

**Analysis Date:** 2026-02-06

## Test Framework

**Runner:**

- Frontend: Jest (via Create React App's `react-scripts`)
- Backend: Jest with Node preset from `@repo/jest-presets`
- Config locations: `apps/gatherly/src/test/jest.config.js` (frontend), `apps/api/package.json` (backend)

**Assertion Library:**

- Frontend: Jest matchers + `@testing-library/jest-dom` custom matchers
- Backend: Jest matchers + Supertest for HTTP assertions

**Run Commands:**

```bash
# Frontend tests (from apps/gatherly)
pnpm test              # Jest watch mode
pnpm test --coverage   # Coverage report

# Backend tests (from apps/api)
pnpm test              # Run all tests (detectOpenHandles flag enabled)

# E2E tests (from apps/gatherly)
pnpm cypress:open      # Interactive Cypress runner
pnpm cypress:run       # Headless Cypress tests
```

## Test File Organization

**Location:**

- Frontend: Co-located with source files (spec.tsx files next to components)
- Backend: `__tests__/` directory at same level as code
- Examples:
  - `apps/gatherly/src/components/button/index.spec.tsx` (co-located)
  - `apps/gatherly/src/core/giftValidation.spec.ts` (co-located)
  - `apps/api/src/__tests__/server.test.ts` (separate directory)

**Naming:**

- Pattern: `[filename].spec.tsx` or `[filename].spec.ts` for frontend
- Pattern: `[filename].test.ts` for backend
- Naming is descriptive of what's being tested, not prefixed

**Structure:**

```
apps/gatherly/src/
├── components/
│   ├── button/
│   │   ├── index.tsx
│   │   └── index.spec.tsx
│   ├── gift-registry/
│   │   ├── CreateGiftForm.tsx
│   │   ├── GiftCard.tsx
│   │   └── RegistryList.tsx
│   └── ... (other components)
├── core/
│   ├── giftFilterSort.ts
│   ├── giftFilterSort.spec.ts
│   ├── giftValidation.ts
│   └── giftValidation.spec.ts
├── pages/
│   ├── gift-registry.spec.tsx
│   └── ...
└── test/
    ├── jest.config.js
    ├── jest.setup.js
    └── index.tsx

apps/api/src/
├── __tests__/
│   └── server.test.ts
├── routes/
├── db/
└── ...
```

## Test Structure

**Suite Organization:**
Frontend example from `apps/gatherly/src/core/giftValidation.spec.ts`:

```typescript
import {
  validateGiftForm,
  isGiftFormValid,
  GIFT_NAME_MAX,
  DESCRIPTION_MAX,
} from "./giftValidation";

describe("giftValidation", () => {
  // Setup: Define test data
  const validData = {
    name: "Wireless Headphones",
    recipient: "Jane",
    occasion: "Christmas",
    dueDate: "2026-12-25",
    budget: 50 as number | "",
    storeLink: "https://example.com",
    description: "Sony WH-1000XM5",
    imageDataUrl: null as string | null,
    privacy: "everyone",
  };

  describe("validateGiftForm", () => {
    it("returns no errors for valid form data (expected use)", () => {
      const errors = validateGiftForm(validData);
      expect(errors).toEqual({});
    });

    it("returns errors for missing required fields (failure case)", () => {
      const errors = validateGiftForm({
        ...validData,
        name: "",
        recipient: "",
      });
      expect(errors.name).toBeDefined();
      expect(errors.recipient).toBeDefined();
    });

    it("returns error when gift name exceeds character limit (edge case)", () => {
      const errors = validateGiftForm({
        ...validData,
        name: "a".repeat(GIFT_NAME_MAX + 1),
      });
      expect(errors.name).toContain(String(GIFT_NAME_MAX));
    });
  });

  describe("isGiftFormValid", () => {
    it("returns true when errors object is empty", () => {
      expect(isGiftFormValid({})).toBe(true);
    });

    it("returns false when errors exist", () => {
      expect(isGiftFormValid({ name: "Required" })).toBe(false);
    });
  });
});
```

Backend example from `apps/api/src/__tests__/server.test.ts`:

```typescript
import supertest from "supertest";
import { describe, it, expect } from "@jest/globals";
import { createServer } from "../server";

describe("Server", () => {
  it("health check returns 200", async () => {
    await supertest(createServer())
      .get("/status")
      .expect(200)
      .then((res) => {
        expect(res.ok).toBe(true);
      });
  });

  it("message endpoint says hello", async () => {
    await supertest(createServer())
      .get("/message/jared")
      .expect(200)
      .then((res) => {
        expect(res.body).toEqual({ message: "hello jared" });
      });
  });
});
```

**Patterns:**

- Describe blocks organize related tests by function/component/module
- Nested describe blocks for testing related functionality (e.g., success cases, edge cases, failure cases)
- Test names are descriptive: "returns X when Y (reason)" format
- Test data setup at module or describe level (reused with spread operator)
- One assertion focus per test (or related assertions for complex object comparisons)

## Mocking

**Framework:**

- Frontend: Jest mocks with `jest.fn()` for functions, `nock` for HTTP mocking
- Backend: Supertest for request/response mocking

**Frontend Patterns:**

Callback mocking:

```typescript
// From apps/gatherly/src/components/button/index.spec.tsx
const mockFn = jest.fn();
const { getByTestId } = render(<Button onClick={mockFn} />);
const btn = getByTestId("btn");
fireEvent.click(btn);
expect(mockFn).toHaveBeenCalledTimes(1);
```

HTTP mocking with nock:

```typescript
// From apps/gatherly/src/components/examples/axios/mocks.ts
import nock from "nock";

export const mockResponse = [
  {
    id: 74,
    type: "programming",
    setup: "Why do C# and Java developers keep breaking their keyboards?",
    punchline: "Because they use a strongly typed language.",
  },
];

nock("https://official-joke-api.appspot.com")
  .get("/jokes/programming/random")
  .reply(200, mockResponse);
```

Integration test using mock:

```typescript
// From apps/gatherly/src/components/examples/axios/index.spec.tsx
import { AxiosExample } from "./index";
import "./mocks";  // Import to register nock interceptor
import { mockResponse } from "./mocks";
import { render, waitFor } from "test";

describe("Axios testing with testing-library and nock", () => {
  it("renders the mock result", async () => {
    const { getByText, getByTestId } = render(<AxiosExample />);

    await waitFor(() => {
      expect(getByTestId("joke-container")).toBeDefined();
      expect(getByText(mockResponse[0].setup)).toBeDefined();
    });
  });
});
```

Backend mocking:

```typescript
// Uses Supertest which mocks HTTP layer
import supertest from "supertest";
import { createServer } from "../server";

await supertest(createServer())
  .get("/status")
  .expect(200)
  .then((res) => {
    expect(res.ok).toBe(true);
  });
```

**What to Mock:**

- External HTTP calls (nock for axios calls)
- Callback/event handlers (jest.fn())
- Browser APIs that don't exist in Node environment (handled by jest.setup.ts)
- Component dependencies passed as props

**What NOT to Mock:**

- Pure utility functions (validate, filter, sort functions tested directly)
- Context/Provider components (use custom render wrapper or real providers)
- Internal component state (test via user interactions and rendered output)
- Database queries in integration tests (mock at HTTP layer instead)

## Fixtures and Factories

**Test Data:**

Base gift fixture pattern from `apps/gatherly/src/core/giftFilterSort.spec.ts`:

```typescript
const baseGift: Gift = {
  id: "1",
  name: "Gift A",
  recipient: "Alice",
  occasion: "Birthday",
  dueDate: "2026-06-01",
  budget: 30,
  storeLink: "",
  description: "",
  imageDataUrl: null,
  privacy: "everyone",
  status: "available",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

// Factory function for creating gifts with overrides
function g(overrides: Partial<Gift> & { id: string }): Gift {
  return { ...baseGift, ...overrides };
}

// Usage
const gifts: Gift[] = [
  g({ id: "1", recipient: "Alice", occasion: "Birthday" }),
  g({ id: "2", recipient: "Bob", occasion: "Christmas", status: "claimed" }),
  g({ id: "3", recipient: "Alice", occasion: "Christmas", budget: 100 }),
];
```

Form data fixture from `apps/gatherly/src/core/giftValidation.spec.ts`:

```typescript
const validData = {
  name: "Wireless Headphones",
  recipient: "Jane",
  occasion: "Christmas",
  dueDate: "2026-12-25",
  budget: 50 as number | "",
  storeLink: "https://example.com",
  description: "Sony WH-1000XM5",
  imageDataUrl: null as string | null,
  privacy: "everyone",
};
```

**Location:**

- Test data defined at top of test file (describe block level)
- Reused across multiple tests within same file via spread operator
- Factory functions inline within test files (no shared fixtures directory)
- Large test datasets would be candidates for extraction to fixtures

## Coverage

**Requirements:** No coverage requirements enforced (not configured)

**View Coverage:**

```bash
# Frontend
cd apps/gatherly
pnpm test -- --coverage

# Backend
cd apps/api
npm test -- --coverage
```

**Current patterns:**

- Tests focus on critical paths: validation, filtering, sorting, API routes
- Component tests verify basic rendering and interactions
- Reducer tests verify state transitions
- No explicit 100% coverage target

## Test Types

**Unit Tests:**

- Scope: Individual functions, components, utilities
- Approach: Pure function testing with arranged test data, no side effects
- Examples:
  - `giftValidation.spec.ts`: Tests validation logic in isolation
  - `giftFilterSort.spec.ts`: Tests filter and sort functions with test fixtures
  - `button/index.spec.tsx`: Tests component props and click handlers
- Assertion pattern: Direct `expect()` on return values or rendered output

**Integration Tests:**

- Scope: Component + context, API client + mock API, multiple components
- Approach: Render component with providers, interact via user events, assert on output
- Examples:
  - `axios/index.spec.tsx`: Tests component that makes HTTP calls (with nock mocks)
  - `server.test.ts`: Tests Express routes with Supertest
- Setup: Custom render function wraps components in providers

**E2E Tests:**

- Framework: Cypress
- Location: `apps/gatherly/cypress/integration/home.spec.ts`
- Run: `pnpm cypress:open` (interactive) or `pnpm cypress:run` (headless)
- Current: Example test for home page

## Setup and Configuration

**Frontend Setup Files:**

- `apps/gatherly/src/setupTests.ts`: Imports jest-dom matchers, polyfills TextEncoder for React Router
- `apps/gatherly/src/test/jest.setup.js`: Configures axios adapter, nock cleanup, window mocks (matchMedia, scroll, alert)
- `apps/gatherly/src/test/jest.config.js`: Path mapping, CSS module mocking, ignore patterns

**Frontend Custom Render:**

- Location: `apps/gatherly/src/test/index.tsx`
- Wraps components with QueryClientProvider (React Query)
- Re-exports all React Testing Library utilities
- Usage: `import { render, fireEvent } from "test"`

**Backend Setup:**

- Jest preset from `@repo/jest-presets/node`
- No special setup file; Supertest creates fresh server instance per test

## Common Patterns

**Async Testing:**
Frontend pattern using `waitFor`:

```typescript
// From apps/gatherly/src/components/examples/axios/index.spec.tsx
it("renders the mock result", async () => {
  const { getByText, getByTestId } = render(<AxiosExample />);

  await waitFor(() => {
    expect(getByTestId("joke-container")).toBeDefined();
    expect(getByText(mockResponse[0].setup)).toBeDefined();
  });
});
```

Backend pattern using async/await:

```typescript
// From apps/api/src/__tests__/server.test.ts
it("health check returns 200", async () => {
  await supertest(createServer())
    .get("/status")
    .expect(200)
    .then((res) => {
      expect(res.ok).toBe(true);
    });
});
```

**Error Testing:**
Validation error pattern:

```typescript
it("returns error when gift name exceeds character limit", () => {
  const errors = validateGiftForm({
    ...validData,
    name: "a".repeat(GIFT_NAME_MAX + 1),
  });
  expect(errors.name).toContain(String(GIFT_NAME_MAX));
});

it("returns error for invalid due date", () => {
  const errors = validateGiftForm({
    ...validData,
    dueDate: "not-a-date",
  });
  expect(errors.dueDate).toBeDefined();
});
```

**Component Interaction Testing:**

```typescript
// From apps/gatherly/src/components/button/index.spec.tsx
it("button is clickable", () => {
  const mockFn = jest.fn();
  const { getByTestId } = render(<Button onClick={mockFn} />);

  const btn = getByTestId("btn");
  fireEvent.click(btn);

  expect(mockFn).toHaveBeenCalledTimes(1);
});
```

## Test Data Helpers

**Factory function pattern for complex objects:**

```typescript
function g(overrides: Partial<Gift> & { id: string }): Gift {
  return { ...baseGift, ...overrides };
}
```

**Conversion helpers:**

```typescript
// From CreateGiftForm.tsx
function toIsoDate(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

// In tests: toIsoDate used to format test dates consistently
```

**Form data transformation:**

```typescript
function giftToFormData(g: Gift): GiftFormData {
  return {
    name: g.name,
    recipient: g.recipient,
    occasion: g.occasion,
    dueDate: toIsoDate(g.dueDate),
    budget: g.budget ?? "",
    storeLink: g.storeLink,
    description: g.description,
    imageDataUrl: g.imageDataUrl,
    privacy: g.privacy,
  };
}
```
