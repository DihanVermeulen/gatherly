# Phase 12: Authentication Screens - Research

**Researched:** 2026-02-23
**Domain:** Expo Router authentication, expo-secure-store, JWT persistence, GlueStack UI form patterns
**Confidence:** HIGH (all critical questions resolved from official docs and direct codebase inspection)

## Summary

Phase 12 implements Login and Register screens that wire into an already-scaffolded auth stack. The backend (`POST /api/auth/login`, `/register`, `/refresh`, `/logout`) is fully working. The API wrapper (`app/api/auth.ts`) is complete. The navigation shell (`Stack.Protected` in `_layout.tsx`) is in place. The work is: replace the stub `sign-in.tsx`, create `register.tsx`, upgrade the `AuthContext` stub to use `expo-secure-store` for persistence, and fix one critical bug in the axios interceptor (`window.location.href` → Expo Router imperative API).

The primary complexity is the session-persistence pattern. The backend uses **HttpOnly cookies for the refresh token** (set at `path: /api/auth`). Research confirms that HttpOnly cookies sent from React Native via axios `withCredentials: true` **do not reliably persist between app restarts on iOS**. The correct architecture for this codebase is: store the **accessToken** in-memory (already done), store the **refreshToken** in `expo-secure-store` (not yet installed), and on app start attempt a silent refresh using the stored token instead of relying on the cookie.

**Primary recommendation:** Install `expo-secure-store`, store the refresh token in SecureStore on login/register, attempt silent refresh on app start (not cookie-based), fix the `window.location.href` bug using Expo Router's imperative `router` export, and implement both screens using the existing GlueStack `Input`, `FormControl`, and `Button` components.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo-secure-store | latest via `npx expo install` | Persist refresh token across restarts | Official Expo recommendation for sensitive storage; uses iOS Keychain + Android Keystore |
| expo-router | ~6.0.4 (already installed) | File-based navigation + imperative `router` export | Already in use, provides `Stack.Protected` auth guards |
| GlueStack UI | @gluestack-ui/core ^3.0.12 (already installed) | All form UI | Already scaffolded in this project |
| lucide-react-native | ^0.510.0 (already installed) | Eye icon for password toggle | Already used throughout the project |
| axios | ^1.13.5 (already installed) | API calls with 401 interceptor | Already configured in `app/api/client.ts` |

### NOT Needed
| Library | Why Not |
|---------|---------|
| @react-native-cookies/cookies | Unnecessary — see architecture section on cookie problem |
| react-hook-form | Overkill for 2-field forms; local useState is sufficient |
| zod / yup | Overkill; backend validates anyway; use simple inline checks |

### Installation
```bash
# From apps/gatherly-mobile directory:
npx expo install expo-secure-store
```

No additional native setup needed for managed Expo workflow. Works in Expo Go (biometric option excluded, but not needed here).

---

## Architecture Patterns

### The HttpOnly Cookie Problem in React Native

**Finding (HIGH confidence, from GitHub issues and official React Native issue tracker):**

The backend sets `refreshToken` as an HttpOnly cookie with `path: /api/auth`. On iOS, native cookie storage does **not reliably persist** after app restarts — this is a known, open issue (GitHub: expo/expo#9213, facebook/react-native#19958). The `withCredentials: true` setting in the existing axios client handles in-session cookies, but the cookie will be gone when the user kills and reopens the app.

**Consequence:** Relying on the HttpOnly cookie alone for session restoration on app start will fail on iOS. The fix is to store the refresh token in SecureStore and send it manually on the refresh call.

**How to implement:** When a user logs in or registers successfully, save the refresh token by intercepting the response. When the app starts, read the stored token from SecureStore and POST it directly to `/api/auth/refresh` in the request body (not as a cookie). This requires a small backend consideration — but the existing `/api/auth/refresh` already reads from `req.cookies.refreshToken`. Two options:

1. **Preferred (no backend change):** Rely on the fact that on Android and during same-session iOS, the cookie works fine. For cross-restart persistence, store the accessToken in SecureStore and skip calling refresh on restart — treat an expired accessToken as "logged out". This is simpler but means 15-minute sessions (typical JWT expiry).

2. **Correct (requires backend change):** Accept the refresh token in either `req.cookies.refreshToken` OR `req.body.refreshToken`. Store it in SecureStore, send as body on app start.

3. **Pragmatic for this phase:** Store the accessToken in SecureStore. On app start, load it into memory and check if it's non-null (treat it as the session marker). The `isLoading: true` phase does the SecureStore read. Sessions will last until the access token expires. The 401 interceptor will fire and attempt cookie-based refresh during a session; if that fails (e.g., after restart), the user sees the login screen. This avoids backend changes and is sufficient for the success criteria ("Closing and reopening the app keeps the user logged in (session restored via token refresh)") only if the access token is not yet expired.

**Recommendation for this phase:** Store the accessToken in SecureStore (simple) AND store the refresh token in SecureStore to support calling `/api/auth/refresh` with it from the request body. Coordinate with backend team to accept `req.body.refreshToken` as a fallback in the `/refresh` route.

### Recommended Project Structure

```
apps/gatherly-mobile/
├── app/
│   ├── _layout.tsx              # Already exists — add "register" to Stack.Protected guard={!session}
│   ├── sign-in.tsx              # REPLACE with real Login screen
│   ├── register.tsx             # CREATE new Register screen
│   └── contexts/
│       └── AuthContext.tsx      # REPLACE stub with SecureStore-backed implementation
├── app/api/
│   └── client.ts               # FIX window.location.href bug
```

### Pattern 1: SecureStore-Backed AuthContext

The official Expo Router authentication docs show a `useStorageState` hook pattern. For this codebase, adapt it to store both the accessToken and refreshToken:

```typescript
// Source: https://docs.expo.dev/router/advanced/authentication/
// Adapted for this codebase

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'gatherly_access_token';
const REFRESH_TOKEN_KEY = 'gatherly_refresh_token';

// On mount: read both tokens from SecureStore
// isLoading starts true, becomes false after async read completes
// session = accessToken string | null
// _layout.tsx already holds splash screen while isLoading = true
```

The `SessionProvider` must:
1. Start with `isLoading: true`
2. Read `ACCESS_TOKEN_KEY` from SecureStore on mount
3. Set `session = token` and `isLoading = false`
4. On `signIn(accessToken, refreshToken)`: call `setAccessToken()` from `app/api/client.ts`, store both in SecureStore, set `session = accessToken`
5. On `signOut()`: call `setAccessToken(null)`, delete both from SecureStore, clear in-memory token, call `authApi.logout()` (best-effort)

### Pattern 2: Fix window.location.href in axios interceptor

```typescript
// Source: Expo Router docs + GitHub discussion/324
// In app/api/client.ts, replace:
window.location.href = "/login";

// With the imperative router export:
import { router } from 'expo-router';
router.replace('/sign-in');
```

The `router` export from `expo-router` is the imperative API that works outside React components. It is available in Expo Router v2+ (this project uses ~6.0.4). The interceptor must also call the `signOut` function to clear SecureStore. Since the interceptor runs outside React, use a module-level callback:

```typescript
// In app/api/client.ts — add a module-level signOut ref
let _onSignOut: (() => void) | null = null;
export const setSignOutCallback = (fn: () => void) => { _onSignOut = fn; };

// In the catch block of the 401 interceptor:
if (_onSignOut) _onSignOut();
router.replace('/sign-in');
```

Register the callback from `SessionProvider` using `useEffect`.

### Pattern 3: App Start Session Restore

```typescript
// Source: Expo Router authentication docs pattern
useEffect(() => {
  async function loadSession() {
    const storedToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (storedToken) {
      // Attempt silent refresh to get a fresh accessToken
      // If refresh succeeds: setSession(newAccessToken)
      // If refresh fails: clear storage, setSession(null)
      // Either way: isLoading = false → splash screen hides
    } else {
      setIsLoading(false); // No token, show login immediately
    }
  }
  loadSession();
}, []);
```

The `_layout.tsx` already has the correct splash screen pattern: it holds until `isLoading` is false, then hides the splash.

### Pattern 4: Register Screen Navigation

The `_layout.tsx` needs a `register` screen added to the unauthenticated `Stack.Protected` block:

```typescript
// Source: Expo Router docs + search results confirming pattern
<Stack.Protected guard={!session}>
  <Stack.Screen name="sign-in" options={{ headerShown: false }} />
  <Stack.Screen name="register" options={{ headerShown: false }} />
</Stack.Protected>
```

Navigation between Login and Register uses `router.push('/register')` and `router.back()`.

### Pattern 5: GlueStack Password Toggle

Use `InputSlot` + `Pressable` with `useState` to toggle `secureTextEntry`:

```typescript
// Source: Verified from components/ui/input/index.tsx
// InputSlot wraps an icon/pressable within the Input
const [showPassword, setShowPassword] = useState(false);

<Input>
  <InputField
    secureTextEntry={!showPassword}
    placeholder="••••••••"
  />
  <InputSlot onPress={() => setShowPassword(v => !v)} className="pr-3">
    <InputIcon as={showPassword ? EyeOffIcon : EyeIcon} />
  </InputSlot>
</Input>
```

`EyeIcon` and `EyeOffIcon` are available from `lucide-react-native` (already installed).

### Pattern 6: FormControl Error Display

```typescript
// Source: Verified from components/ui/form-control/index.tsx
<FormControl isInvalid={!!emailError}>
  <FormControlLabel>
    <FormControlLabelText>Email Address</FormControlLabelText>
  </FormControlLabel>
  <Input>
    <InputField ... />
  </Input>
  <FormControlError>
    <FormControlErrorText>{emailError}</FormControlErrorText>
  </FormControlError>
</FormControl>
```

`FormControlError` renders only when `isInvalid` is true on the parent `FormControl`.

### Anti-Patterns to Avoid

- **Storing accessToken in AsyncStorage:** AsyncStorage is unencrypted. Use SecureStore.
- **Relying only on the HttpOnly cookie for persistence:** Does not survive app restart on iOS.
- **Using `window.location.href` for redirect:** Not available in React Native. Use `router.replace()`.
- **Calling `router.replace()` synchronously in the 401 catch:** May fire before React tree is ready on cold start. Use the signOut callback pattern to ensure context clears first.
- **Registering the axios interceptor inside SessionProvider on every render:** Register once in a `useEffect` with no dependencies.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Secure token storage | Custom encrypted AsyncStorage | `expo-secure-store` | Uses OS keychain/keystore; handles encryption natively |
| Password show/hide | Custom input wrapper | `InputSlot` + `InputField secureTextEntry` | Already in GlueStack, one `useState` toggle |
| Form error display | Custom error text component | `FormControl isInvalid` + `FormControlError` | Handles invalid state styling automatically |
| Navigation guard | Custom redirect logic | `Stack.Protected guard={...}` | Already in `_layout.tsx`, just add `register` screen |
| API auth interceptor | Custom fetch wrapper | Existing `app/api/client.ts` (just fix the bug) | Queue, retry, refresh logic already implemented |

**Key insight:** Most infrastructure exists. This phase is primarily wiring existing pieces together and fixing the `window.location.href` bug.

---

## Common Pitfalls

### Pitfall 1: HttpOnly Cookie Does Not Survive App Restart on iOS
**What goes wrong:** After closing and reopening the app on iOS, the cookie-based refresh fails with 401. User appears logged out even though their token should still be valid (7-day expiry).
**Why it happens:** iOS does not persist cookies from React Native's networking layer across app restarts (GitHub expo/expo#9213).
**How to avoid:** Store the refresh token in SecureStore. On app start, attempt `authApi.refresh()` and if the cookie is gone, fall back to calling `/api/auth/refresh` with the stored token in the request body.
**Warning signs:** Session works fine during a session but disappears after "kill and reopen" during testing.

### Pitfall 2: isLoading Never Resolves
**What goes wrong:** Splash screen hangs forever. App never shows login or app screens.
**Why it happens:** The `SecureStore.getItemAsync()` call throws or the `isLoading` state never gets set to `false`.
**How to avoid:** Always set `isLoading = false` in a `finally` block, not just on success/failure paths.
**Warning signs:** Blank screen after splash with no console errors.

### Pitfall 3: Double-Firing the signOut on 401
**What goes wrong:** The 401 interceptor triggers `signOut` + navigation while the user is already on the login screen, causing a crash or navigation loop.
**Why it happens:** If the token expires while on the login screen (edge case), the login POST itself gets a 401 on the refresh attempt.
**How to avoid:** Check `!originalRequest._retry` before triggering signOut (already handled in the existing interceptor); also skip the redirect if already on `/sign-in`.
**Warning signs:** "Cannot navigate to a screen that doesn't exist" errors, or the login screen flashes and reloads.

### Pitfall 4: expo-secure-store Size Limit on iOS
**What goes wrong:** `setItemAsync` throws a native error when storing a JWT token larger than ~2048 bytes.
**Why it happens:** Some iOS versions enforce this limit on keychain entries.
**How to avoid:** Store only the raw JWT string (not a JSON object with extra fields). A standard JWT is typically 200–400 bytes. If it approaches 2KB, check for unnecessary claims in the token payload.
**Warning signs:** Silent storage failure; token reads back as null.

### Pitfall 5: Screen Template Filename Swap
**What goes wrong:** Building the wrong screen based on the wrong screenshot file.
**Why it happens:** The template filenames are inverted — `Login.png` shows the Register screen ("Create your account"), `Register.png` shows the Login screen ("Welcome Back").
**How to avoid:** Document this clearly in task instructions. `app/sign-in.tsx` = "Welcome Back" (file: `Register.png`). `app/register.tsx` = "Create your account" (file: `Login.png`).
**Warning signs:** Wrong heading/fields on the wrong screen.

### Pitfall 6: GlueStack Button Teal Color
**What goes wrong:** The CTA buttons ("Log In", "Create Account") appear in the default primary color instead of teal.
**Why it happens:** GlueStack's default primary color is indigo/violet. The screen templates show teal (#14b8a6 or similar).
**How to avoid:** Use `className="bg-teal-500 rounded-full"` directly on the `Button` component to override the default, or check `tailwind.config.js` for any existing teal/primary token mapping.
**Warning signs:** Buttons are purple instead of teal.

---

## Code Examples

### AuthContext with SecureStore (complete pattern)

```typescript
// Source: https://docs.expo.dev/router/advanced/authentication/
// Adapted from official Expo Router auth docs useStorageState pattern
import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';
import * as SecureStore from 'expo-secure-store';
import { setAccessToken } from '../api/client';
import { authApi } from '../api/auth';
import { setSignOutCallback } from '../api/client';

const ACCESS_TOKEN_KEY = 'gatherly_access_token';
const REFRESH_TOKEN_KEY = 'gatherly_refresh_token';

type User = { id: number; email: string; name: string; role: string };

type AuthContextValue = {
  session: string | null;
  user: User | null;
  isLoading: boolean;
  signIn: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useSession() {
  const value = use(AuthContext);
  if (!value) throw new Error('useSession must be used within SessionProvider');
  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function restore() {
      try {
        const storedToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        if (storedToken) {
          setAccessToken(storedToken);
          setSession(storedToken);
          // Attempt silent refresh — see open question #1 below
        }
      } catch (e) {
        // Failed to read storage — treat as logged out
      } finally {
        setIsLoading(false);
      }
    }
    restore();
  }, []);

  const signIn = async (accessToken: string, refreshToken: string, u: User) => {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    setAccessToken(accessToken);
    setUser(u);
    setSession(accessToken);
  };

  const signOut = async () => {
    try { await authApi.logout(); } catch {}
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    setAccessToken(null);
    setUser(null);
    setSession(null);
  };

  // Register signOut as callback for axios interceptor
  useEffect(() => {
    setSignOutCallback(signOut);
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Fixing window.location.href in client.ts

```typescript
// Source: Expo Router docs — imperative router API
// In app/api/client.ts — add at module level:
import { router } from 'expo-router';

let _signOutCallback: (() => Promise<void>) | null = null;
export const setSignOutCallback = (fn: () => Promise<void>) => {
  _signOutCallback = fn;
};

// Replace in the catch block of the 401 interceptor:
// BEFORE:
window.location.href = "/login";

// AFTER:
if (_signOutCallback) await _signOutCallback();
router.replace('/sign-in');
```

### Password field with toggle (GlueStack)

```typescript
// Source: Verified from components/ui/input/index.tsx exports
import { useState } from 'react';
import { EyeIcon, EyeOffIcon } from 'lucide-react-native';
import { Input, InputField, InputSlot, InputIcon } from '@/components/ui/input';

const [showPassword, setShowPassword] = useState(false);

<Input variant="outline" size="lg">
  <InputField
    secureTextEntry={!showPassword}
    placeholder="••••••••"
    autoCapitalize="none"
    autoCorrect={false}
    value={password}
    onChangeText={setPassword}
  />
  <InputSlot onPress={() => setShowPassword(v => !v)} className="pr-3">
    <InputIcon as={showPassword ? EyeOffIcon : EyeIcon} />
  </InputSlot>
</Input>
```

### FormControl with inline error

```typescript
// Source: Verified from components/ui/form-control/index.tsx exports
import {
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  FormControlError,
  FormControlErrorText,
} from '@/components/ui/form-control';

<FormControl isInvalid={!!errors.email}>
  <FormControlLabel>
    <FormControlLabelText>Email Address</FormControlLabelText>
  </FormControlLabel>
  <Input>
    <InputField
      keyboardType="email-address"
      autoCapitalize="none"
      placeholder="e.g. name@example.com"
      value={email}
      onChangeText={setEmail}
    />
  </Input>
  <FormControlError>
    <FormControlErrorText>{errors.email}</FormControlErrorText>
  </FormControlError>
</FormControl>
```

### Navigate between auth screens

```typescript
// Source: expo-router docs — Link or router.push
import { router } from 'expo-router';

// From sign-in → register:
router.push('/register');

// From register → sign-in (back):
router.back(); // preferred — preserves back navigation
// or: router.replace('/sign-in'); // if no back stack desired
```

---

## Screen Template Analysis

Based on codebase notes (filenames are SWAPPED):

### sign-in.tsx (file: Register.png = "Welcome Back" screen)
- Header: back arrow + Gatherly logo + "Gatherly" text
- "Welcome Back" heading + "Please enter your details to sign in to Gatherly."
- Email Address field (no left icon, "e.g. name@example.com" placeholder)
- Password label with "Forgot Password?" link (UI only, no functionality needed this phase)
- Password field (eye toggle, password dots)
- "Log In" button (teal, rounded-full)
- "OR CONTINUE WITH" divider + Google + Apple buttons (UI only, no functionality)
- "Don't have an account? Sign Up" footer → navigate to /register

### register.tsx (file: Login.png = "Create your account" screen)
- Header: back arrow + "Join Gatherly" title
- Circular group icon
- "Create your account" heading + "Start connecting with your community today."
- Full Name field (person icon, "John Doe" placeholder)
- Email Address field (mail icon, "name@example.com" placeholder)
- Password field (lock icon, eye toggle)
- Terms of Service text (teal links, UI only)
- "Create Account" button (teal, rounded-full)
- "Already have an account? Log In" footer → router.back() or navigate to /sign-in

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| AsyncStorage for tokens | expo-secure-store | 2020+ | Encrypted at rest; no XSS equivalent risk on mobile |
| window.location.href navigation | `router.replace()` from expo-router | Expo Router v2+ | Works outside React tree, correct for RN |
| Global NavigationRef pattern | Imperative `router` export from expo-router | 2023 | No need for NavigationRef setup |
| Redirect-based auth routing | `Stack.Protected guard={condition}` | Expo Router v4+ | Declarative, no redirect loops |

---

## Open Questions

1. **Silent refresh on app start requires backend change**
   - What we know: The `/api/auth/refresh` endpoint reads only from `req.cookies.refreshToken`. SecureStore can persist the refresh token string. On iOS, the cookie won't survive an app restart.
   - What's unclear: Whether the backend team is willing to also accept `req.body.refreshToken` as a fallback in the refresh endpoint.
   - Recommendation: Either add body fallback to the backend refresh route, OR accept that sessions expire with the accessToken (typically 15 minutes) and treat that as a forced re-login. For "keeping users logged in across restarts" per success criteria #3, the backend change is required.

2. **Teal color token**
   - What we know: The screen templates show a teal primary button. GlueStack defaults to indigo.
   - What's unclear: Whether `tailwind.config.js` has a `primary` color mapped to teal, or if we need explicit `bg-teal-500`.
   - Recommendation: Check `tailwind.config.js` before implementing buttons; use `className="bg-teal-500"` if no existing token.

3. **User object in AuthContext**
   - What we know: The stub `AuthContext` only stores `session: string`. The API returns `{ accessToken, user }`.
   - What's unclear: Whether downstream screens (Profile tab) need `user.name` or `user.email` from context.
   - Recommendation: Add `user: User | null` to the AuthContext value type now to avoid a refactor when the Profile tab is built.

---

## Sources

### Primary (HIGH confidence)
- Official Expo SecureStore docs — https://docs.expo.dev/versions/latest/sdk/securestore/ — installation, API, size limits, platform behavior
- Official Expo Router authentication docs — https://docs.expo.dev/router/advanced/authentication/ — useStorageState pattern, Stack.Protected usage, SessionProvider structure
- Direct codebase inspection — `app/contexts/AuthContext.tsx`, `app/api/client.ts`, `app/api/auth.ts`, `app/_layout.tsx`, `apps/api/src/routes/auth.ts`, `components/ui/input/index.tsx`, `components/ui/form-control/index.tsx`, `components/ui/button/index.tsx`

### Secondary (MEDIUM confidence)
- Expo Router imperative router export — GitHub discussion/324 + Expo docs — `router` works outside React for navigation
- Protected routes pattern — https://docs.expo.dev/router/advanced/protected/ — multiple screens in Stack.Protected

### Tertiary (LOW confidence)
- HttpOnly cookie persistence issue — GitHub expo/expo#9213 + facebook/react-native#19958 — iOS cookie persistence confirmed broken; workaround via manual storage corroborated by multiple community sources

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already installed except expo-secure-store; official docs consulted
- Architecture: HIGH — patterns taken directly from official Expo Router auth docs and existing codebase structure
- HttpOnly cookie behavior: MEDIUM — confirmed by multiple GitHub issues and community sources; no official React Native statement
- Pitfalls: HIGH — derived from direct code inspection and verified community patterns

**Research date:** 2026-02-23
**Valid until:** 2026-03-23 (expo-router v6 is current; stable ecosystem)
