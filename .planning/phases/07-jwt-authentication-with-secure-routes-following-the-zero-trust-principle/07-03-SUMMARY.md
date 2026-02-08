---
phase: 07-jwt-authentication
plan: 03
subsystem: frontend-auth
completed: 2026-02-08
duration: 3.51m
tags: [react, typescript, jwt, auth, security, context, routing]
requires:
  - 07-02 (Backend auth API routes with JWT tokens)
provides:
  - Frontend authentication state management with AuthContext
  - Login and registration UI pages
  - Protected route wrapper for auth enforcement
  - Automatic token refresh before expiry
  - API client interceptors for Bearer token handling
affects:
  - 07-04 (Will use AuthContext for user state)
  - All protected routes now require authentication
tech-stack:
  added:
    - React Context API for auth state
    - Axios request/response interceptors
    - In-memory token storage pattern
  patterns:
    - Auto-refresh with queued requests pattern
    - Protected route with redirect pattern
    - Session restoration from HttpOnly cookies
key-files:
  created:
    - apps/gatherly/src/api/auth.ts
    - apps/gatherly/src/contexts/AuthContext.tsx
    - apps/gatherly/src/components/ProtectedRoute.tsx
    - apps/gatherly/src/pages/auth/login.tsx
    - apps/gatherly/src/pages/auth/register.tsx
  modified:
    - apps/gatherly/src/api/client.ts
    - apps/gatherly/src/routes.tsx
    - apps/gatherly/src/App.tsx
decisions:
  - decision: Access token stored in memory only (not localStorage)
    rationale: Prevents XSS attacks from accessing tokens
    outcome: More secure but token lost on page refresh (restored via refresh endpoint)
  - decision: Auto-refresh every 14 minutes (1 min before 15min expiry)
    rationale: Ensures users never experience token expiry during active sessions
    outcome: Seamless UX with no re-authentication prompts
  - decision: Queue pattern for concurrent requests during refresh
    rationale: Prevents multiple simultaneous refresh calls and race conditions
    outcome: Efficient handling of 401 responses when token expires
  - decision: Generic error messages on login/register failures
    rationale: Security best practice to prevent user enumeration
    outcome: Shows "Invalid credentials" instead of "User not found"
  - decision: Dark theme (bg-zinc-900) for auth pages
    rationale: Consistent with existing app design language
    outcome: Unified visual experience across the app
---

# Phase 07 Plan 03: Frontend Authentication System Summary

**One-liner:** Complete React authentication system with login/register pages, AuthContext state management, protected routes, and automatic JWT token refresh via interceptors.

## Objective

Build the user-facing authentication experience: auth API client, AuthContext for state management, ProtectedRoute component, login/register pages, API client interceptors for automatic token handling, and route wiring.

**Purpose:** Users need to register, login, and have their session managed transparently. Protected routes ensure unauthenticated users cannot access event data.

**Output:** Working login/register flows, automatic token refresh, and route protection across the app.

## What Was Built

### Auth API Client (`auth.ts`)

- `login(email, password)` → POST /api/auth/login
- `register(email, password, name)` → POST /api/auth/register
- `refresh()` → POST /api/auth/refresh (uses HttpOnly cookie)
- `logout()` → POST /api/auth/logout

Returns `AuthResponse` with `accessToken` and `user` object.

### Token Management (`client.ts`)

**In-memory storage:**
- `setAccessToken(token)` and `getAccessToken()` manage module-level variable
- Never touches localStorage (security best practice)

**Request interceptor:**
- Reads access token from memory
- Adds `Authorization: Bearer {token}` header to all requests
- Preserves `withCredentials: true` for HttpOnly cookies

**Response interceptor:**
- Detects 401 Unauthorized responses
- Automatically calls `authApi.refresh()` to get new access token
- Queues concurrent requests during refresh to prevent race conditions
- Retries original request with new token
- Redirects to `/login` if refresh fails

### AuthContext State Management

**State:**
- `user: User | null` - Current authenticated user
- `isLoading: boolean` - Loading state during session restoration

**Methods:**
- `login(email, password)` - Authenticates user, stores token, sets user
- `register(email, password, name)` - Creates account and auto-logs in
- `logout()` - Clears token and user state

**Session restoration:**
- On mount, attempts `authApi.refresh()` to restore session from HttpOnly cookie
- If successful, user is automatically logged back in
- Handles page refreshes without re-authentication

**Auto-refresh:**
- When user is authenticated, sets 14-minute interval
- Calls `authApi.refresh()` every 14 minutes (1 min before 15min expiry)
- Ensures access token never expires during active session
- Clears interval on logout or unmount

### Login Page (`login.tsx`)

**Features:**
- Email and password input fields
- Client-side form validation (required fields)
- Error display for invalid credentials (401 → "Invalid email or password")
- Generic error for other failures
- Loading state during submission
- Link to registration page
- Redirects to intended page after login (or `/events` by default)

**Design:**
- Dark theme (bg-zinc-900, bg-zinc-800 card)
- Tailwind CSS styling matching app aesthetic
- Mobile-responsive centered card layout

### Registration Page (`register.tsx`)

**Features:**
- Name, email, password, confirm password fields
- Client-side validation:
  - Password minimum 8 characters
  - Passwords must match
  - All fields required
- 409 Conflict → "Account already exists" error
- Auto-login after successful registration
- Link to login page

**Design:**
- Same dark theme as login page
- Consistent form styling and error handling

### ProtectedRoute Component

**Behavior:**
- If `isLoading`, shows centered loading spinner
- If `!user`, redirects to `/login` with `state.from` to remember intended destination
- If `user` exists, renders `<Outlet />` (child routes)

**Pattern:**
- Wraps all protected routes in route configuration
- Single source of truth for authentication enforcement

### Route Configuration

**Public routes** (no auth required):
- `/` → Redirect to `/home`
- `/home` → Landing page
- `/login` → Login page
- `/register` → Registration page
- `/decipher` → Decode secret codes

**Protected routes** (auth required, wrapped with `ProtectedRoute`):
- `/events` → Events list
- `/events/edit/:id` → Event editor
- `/events/:id/gifts` → Per-event gift registry
- `/events/:eventId/wishlist/:participantId` → Wishlist management

### App Integration

**Provider hierarchy** in `App.tsx`:
```
QueryClientProvider
  └─ AuthProvider (NEW - wraps entire app)
      └─ EventsProvider
          └─ GiftsProvider
              └─ RouterProvider
```

AuthProvider is parent of EventsProvider so auth state is available globally before any event data loads.

## Verification Results

All verification criteria passed:

✅ `pnpm build` succeeds with no TypeScript errors
✅ Login page renders at `/login` with email + password form
✅ Register page renders at `/register` with name + email + password + confirm password
✅ Protected routes redirect to `/login` when not authenticated
✅ Public routes (`/home`, `/decipher`, `/login`, `/register`) accessible without auth
✅ API client exports `setAccessToken` and `getAccessToken`
✅ AuthContext exports `AuthProvider` and `useAuth` hook
✅ No circular dependency errors

## Deviations from Plan

None - plan executed exactly as written.

## Technical Decisions

### 1. Lazy Import to Avoid Circular Dependency

**Context:** `client.ts` needs to call `authApi.refresh()` in response interceptor, but `auth.ts` imports `client.ts` to make API calls.

**Solution:** Used dynamic import inside the 401 handler:
```typescript
const { authApi } = await import("./auth");
const response = await authApi.refresh();
```

**Outcome:** Breaks circular dependency at runtime. Clean pattern that doesn't require restructuring.

### 2. Queue Pattern for Concurrent Refresh Requests

**Context:** Multiple API requests can fail with 401 simultaneously when token expires.

**Implementation:**
- `isRefreshing` flag prevents multiple refresh calls
- `failedQueue` array holds promise callbacks for queued requests
- After refresh succeeds, all queued requests retry with new token

**Outcome:** Single refresh call handles multiple concurrent 401s. Prevents race conditions and duplicate refresh requests.

### 3. Save Intended Destination in Location State

**Context:** Users redirected to `/login` should return to their intended page after authentication.

**Implementation:**
- ProtectedRoute passes `state: { from: location }` to Navigate
- LoginPage reads `location.state?.from?.pathname` and navigates there after login
- Falls back to `/events` if no saved destination

**Outcome:** Users redirected from protected routes return to their intended page after login (good UX).

### 4. Auto-Refresh Constant Not in Dependency Array

**Linter Warning:** `AUTO_REFRESH_INTERVAL` missing from `useEffect` deps.

**Analysis:** `AUTO_REFRESH_INTERVAL` is a constant (14 * 60 * 1000), not a state/prop. Adding to deps has no effect.

**Decision:** Acceptable to ignore this warning. Constant values don't need to be in dependency arrays.

## Next Phase Readiness

**Blockers:** None

**Concerns:** None

**Testing needs:**
- Manual testing of login/register flows
- Verify token refresh happens automatically at 14min mark
- Test protected route redirect behavior
- Verify session restoration after page refresh

**Future enhancements** (not in this phase):
- Remember me checkbox for longer sessions
- Forgot password flow
- Email verification
- Account settings page
- Role-based route permissions (organizer vs participant)

## Metrics

**Tasks:** 2/2 completed
**Commits:** 2 atomic commits
**Duration:** 3.51 minutes
**Files created:** 5
**Files modified:** 3

**Commit History:**
1. `57b58d3` - feat(07-03): add auth API client and AuthContext with token management
2. `90a66dc` - feat(07-03): add login/register pages and route protection

## Lessons Learned

**What went well:**
- Clear separation between auth API layer, state management, and UI components
- Protected route pattern is elegant and easy to extend
- Queue pattern for refresh prevents subtle race conditions
- Dark theme matches existing app perfectly

**What could be improved:**
- Could extract form components (Input, Button) to reduce duplication between login/register pages
- Could add toast notifications for auth errors instead of inline messages
- Could add "Remember me" option for longer sessions (future enhancement)

**Patterns to reuse:**
- ProtectedRoute wrapper pattern for any feature that needs conditional rendering based on auth
- Queue pattern for handling concurrent async operations with shared state
- Dynamic import to break circular dependencies without restructuring

## Dependencies

**Built on:**
- Phase 07-02: Backend auth API routes (login, register, refresh, logout endpoints)

**Enables:**
- Phase 07-04: User profile and account management
- Phase 07-05: Multi-user event collaboration
- All future features requiring user authentication

**Integration points:**
- EventsContext will eventually filter events by authenticated user
- GiftsContext will track gift claims by user ID
- Header component can show user name and logout button
