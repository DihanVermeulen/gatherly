# Phase 7: JWT Authentication with Secure Routes Following the Zero Trust Principle - Research

**Researched:** 2026-02-08
**Domain:** JWT authentication, zero trust security, Express + React auth patterns
**Confidence:** HIGH

## Summary

JWT (JSON Web Token) authentication for Express and React applications in 2026 follows well-established patterns using the `jsonwebtoken` library for token generation/verification and `bcrypt` for password hashing. The zero trust principle ("never trust, always verify") requires validating every request, even from internal sources, with strict role-based access control.

The recommended architecture uses short-lived access tokens (15-30 minutes) stored in React memory/Context, long-lived refresh tokens (7-14 days) in HttpOnly cookies with rotation, and Redis for token blacklisting and refresh token storage. Express middleware validates JWTs on every protected route, while React Router 7's `clientLoader` and protected route components handle frontend authentication state.

For this Secret Santa app, the key challenge is migrating from the current unauthenticated hybrid storage model (localStorage fallback) to a secure, role-based system where event organizers have different permissions than participants, while maintaining backward compatibility with existing data.

**Primary recommendation:** Implement JWT authentication using `jsonwebtoken` + `bcrypt` + `ioredis`, with access tokens in React Context, refresh tokens in HttpOnly cookies with rotation, Express middleware for route protection, and gradual migration allowing unauthenticated access during transition period.

## Standard Stack

The established libraries/tools for JWT authentication in Express + React (2026):

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jsonwebtoken | 9.0.3 | JWT signing and verification | Industry standard, 35K+ npm dependents, supports all major algorithms (HS256, RS256, ES256, etc.) |
| bcrypt | 5.x | Password hashing | Battle-tested, proper salt generation, configurable cost factor for future-proofing |
| ioredis | 5.x | Redis client for token storage | Modern Redis client, supports async/await, used for token blacklisting and refresh token storage |
| cookie-parser | 1.4.x | Parse cookies in Express | Standard Express middleware for reading HttpOnly cookies |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| express-validator | 7.x | Input validation | Sanitize and validate auth-related inputs (email, password, etc.) |
| helmet | 7.x | Security headers | Set secure HTTP headers including CORS, CSP, HSTS |
| dotenv | 16.x | Environment variable management | Load JWT_SECRET and other secrets from .env files |
| joi | 17.x | Schema validation | Validate environment variables on startup (ensure JWT_SECRET exists) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jsonwebtoken | jose | jose is newer and more modern, but jsonwebtoken has broader ecosystem support and more examples |
| bcrypt | argon2 | argon2 is newer and theoretically more secure, but bcrypt is more widely deployed and understood |
| ioredis | redis | redis (node-redis) is official but ioredis has better TypeScript support and cleaner async API |
| express-oauth2-jwt-bearer | express-jwt | Auth0's newer library, but adds OAuth2 complexity not needed for simple JWT auth |

**Installation:**
```bash
# Backend (apps/api)
pnpm add jsonwebtoken bcrypt ioredis cookie-parser express-validator helmet joi
pnpm add -D @types/jsonwebtoken @types/bcrypt @types/cookie-parser

# Frontend (apps/gatherly) - no additional JWT libraries needed
# React Context + fetch/axios handles token storage and API calls
```

## Architecture Patterns

### Recommended Project Structure
```
apps/api/src/
├── middleware/
│   ├── auth.ts           # JWT verification middleware
│   └── rbac.ts           # Role-based access control middleware
├── routes/
│   ├── auth.ts           # Login, register, refresh, logout routes
│   ├── events.ts         # Protected event routes (updated)
│   ├── gifts.ts          # Protected gift routes (updated)
│   └── wishlists.ts      # Protected wishlist routes (updated)
├── services/
│   ├── authService.ts    # Authentication business logic
│   ├── tokenService.ts   # Token generation, verification, blacklisting
│   └── userService.ts    # User CRUD operations
├── db/
│   ├── schema.sql        # Add users, roles, refresh_tokens tables
│   └── connection.ts     # Existing connection pool
└── config/
    └── redis.ts          # Redis connection configuration

apps/gatherly/src/
├── contexts/
│   ├── AuthContext.tsx   # Authentication state (user, tokens, login/logout)
│   └── EventsContext.tsx # Existing event state (will integrate with auth)
├── components/
│   ├── ProtectedRoute.tsx # Route wrapper for authenticated routes
│   └── RoleRoute.tsx      # Route wrapper for role-based routes
├── hooks/
│   ├── useAuth.ts        # Hook to access AuthContext
│   └── useRefreshToken.ts # Hook for automatic token refresh
├── api/
│   ├── client.ts         # Updated to include auth headers
│   └── auth.ts           # Login, register, refresh, logout API calls
└── pages/
    ├── auth/
    │   ├── login.tsx     # Login page
    │   └── register.tsx  # Registration page
    └── events/           # Existing pages (add auth protection)
```

### Pattern 1: Token Generation and Storage

**What:** Generate access + refresh token pair on login, store access token in memory (React Context), refresh token in HttpOnly cookie

**When to use:** Every successful authentication (login, register, token refresh)

**Example:**
```typescript
// Backend: apps/api/src/services/tokenService.ts
import jwt from 'jsonwebtoken';
import { createClient } from '../config/redis';

const JWT_SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.REFRESH_SECRET!;

interface TokenPayload {
  userId: number;
  email: string;
  role: 'organizer' | 'participant';
}

export const generateTokens = async (payload: TokenPayload) => {
  // Access token: short-lived (15 minutes)
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: '15m',
    algorithm: 'HS256',
  });

  // Refresh token: long-lived (7 days), single-use with rotation
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: '7d',
    algorithm: 'HS256',
    jwtid: crypto.randomUUID(), // Unique ID for rotation tracking
  });

  // Store refresh token in Redis with TTL
  const redis = await createClient();
  await redis.setex(
    `refresh:${payload.userId}:${refreshToken}`,
    7 * 24 * 60 * 60, // 7 days in seconds
    JSON.stringify({ userId: payload.userId, email: payload.email })
  );

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as TokenPayload;
};

export const blacklistToken = async (token: string) => {
  const decoded = jwt.decode(token) as jwt.JwtPayload;
  if (!decoded?.exp) return;

  const ttl = decoded.exp - Math.floor(Date.now() / 1000);
  if (ttl > 0) {
    const redis = await createClient();
    await redis.setex(`blacklist:${token}`, ttl, '1');
  }
};

export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  const redis = await createClient();
  const result = await redis.get(`blacklist:${token}`);
  return result !== null;
};
```

### Pattern 2: Express Authentication Middleware

**What:** Middleware that extracts JWT from Authorization header, verifies signature, checks blacklist, attaches user to request

**When to use:** Apply to all protected routes requiring authentication

**Example:**
```typescript
// Backend: apps/api/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, isTokenBlacklisted } from '../services/tokenService';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
        role: 'organizer' | 'participant';
      };
    }
  }
}

export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Check if token is blacklisted (logout/password change)
    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    // Verify token signature and expiration
    const payload = verifyAccessToken(token);

    // Attach user to request
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

// Optional authentication: allows both authenticated and unauthenticated access
// Useful during migration period
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // No token, continue without user
  }

  try {
    const token = authHeader.substring(7);
    if (!(await isTokenBlacklisted(token))) {
      const payload = verifyAccessToken(token);
      req.user = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      };
    }
  } catch (error) {
    // Ignore auth errors for optional auth
  }

  next();
};
```

### Pattern 3: Role-Based Access Control Middleware

**What:** Middleware that checks if authenticated user has required role(s) for a route

**When to use:** Routes that should only be accessible to specific roles (e.g., only event organizers can generate assignments)

**Example:**
```typescript
// Backend: apps/api/src/middleware/rbac.ts
import { Request, Response, NextFunction } from 'express';

type Role = 'organizer' | 'participant';

export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        actual: req.user.role,
      });
    }

    next();
  };
};

// Resource-based access control: check if user owns/has access to specific event
export const requireEventAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const eventId = req.params.id || req.body.eventId;
  if (!eventId) {
    return res.status(400).json({ error: 'Event ID required' });
  }

  try {
    // Query database to check if user is organizer or participant of this event
    const result = await query(
      `SELECT
        e.id,
        e.organizer_id,
        p.id as participant_id
      FROM events e
      LEFT JOIN participants p ON p.event_id = e.id AND p.user_id = $1
      WHERE e.id = $2`,
      [req.user.userId, eventId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = result.rows[0];
    const isOrganizer = event.organizer_id === req.user.userId;
    const isParticipant = event.participant_id !== null;

    if (!isOrganizer && !isParticipant) {
      return res.status(403).json({ error: 'Access denied to this event' });
    }

    // Attach access level to request for downstream use
    req.eventAccess = {
      eventId: parseInt(eventId),
      isOrganizer,
      isParticipant,
    };

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Failed to verify event access' });
  }
};
```

### Pattern 4: React Protected Routes with React Router 7

**What:** Route components that check authentication state and redirect to login if not authenticated

**When to use:** Wrap routes that require user to be logged in

**Example:**
```typescript
// Frontend: apps/gatherly/src/components/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';

export const ProtectedRoute = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated, save current location
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Render child routes
  return <Outlet />;
};

// Usage in routes.tsx:
// {
//   path: '/events',
//   element: <ProtectedRoute />,
//   children: [
//     { index: true, element: <EventsListPage /> },
//     { path: ':id/edit', element: <EventEditPage /> },
//   ]
// }
```

### Pattern 5: React Authentication Context with Token Refresh

**What:** Context that manages authentication state, stores access token in memory, handles automatic token refresh

**When to use:** Root level provider to share auth state across entire app

**Example:**
```typescript
// Frontend: apps/gatherly/src/contexts/AuthContext.tsx
import React, { createContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../api/auth';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'organizer' | 'participant';
}

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  accessToken: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  refreshToken: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Refresh access token using HttpOnly cookie
  const refreshToken = useCallback(async () => {
    try {
      const response = await authApi.refresh();
      setAccessToken(response.accessToken);
      setUser(response.user);
    } catch (error) {
      // Refresh failed, clear auth state
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  // On mount, try to refresh token (check if user has valid session)
  useEffect(() => {
    const initAuth = async () => {
      await refreshToken();
      setIsLoading(false);
    };
    initAuth();
  }, [refreshToken]);

  // Auto-refresh token 1 minute before expiry (14 minutes for 15min tokens)
  useEffect(() => {
    if (!accessToken) return;

    const refreshInterval = setInterval(() => {
      refreshToken();
    }, 14 * 60 * 1000); // 14 minutes

    return () => clearInterval(refreshInterval);
  }, [accessToken, refreshToken]);

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    setAccessToken(response.accessToken);
    setUser(response.user);
  };

  const logout = async () => {
    await authApi.logout();
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, accessToken, isLoading, login, logout, refreshToken }}
    >
      {children}
    </AuthContext.Provider>
  );
};
```

### Pattern 6: Refresh Token Rotation

**What:** Each token refresh invalidates the old refresh token and issues a new one, with reuse detection

**When to use:** Every token refresh request

**Example:**
```typescript
// Backend: apps/api/src/routes/auth.ts
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { generateTokens, verifyRefreshToken } from '../services/tokenService';

const router = Router();

router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    // Verify refresh token signature
    const payload = verifyRefreshToken(refreshToken);

    // Check if refresh token exists in Redis
    const redis = await createClient();
    const storedToken = await redis.get(`refresh:${payload.userId}:${refreshToken}`);

    if (!storedToken) {
      // Token reuse detected! Revoke all user tokens
      await redis.del(`refresh:${payload.userId}:*`);
      return res.status(401).json({ error: 'Token reuse detected, please login again' });
    }

    // Delete old refresh token (single-use)
    await redis.del(`refresh:${payload.userId}:${refreshToken}`);

    // Generate new token pair
    const tokens = await generateTokens({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    });

    // Set new refresh token in HttpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return new access token
    res.json({
      accessToken: tokens.accessToken,
      user: {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
      },
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

export default router;
```

### Anti-Patterns to Avoid

- **Storing JWT in localStorage:** Vulnerable to XSS attacks. Use memory (React state/context) for access tokens and HttpOnly cookies for refresh tokens.
- **Long-lived access tokens (>1 hour):** If leaked, attacker has extended access. Keep access tokens short (15-30 minutes).
- **Not checking token blacklist:** Tokens remain valid until expiry even after logout. Always check blacklist for critical operations.
- **Hardcoding JWT secret:** Never commit secrets to code. Use environment variables loaded via dotenv.
- **Using jwt.decode() instead of jwt.verify():** decode() doesn't verify signature, allowing forged tokens. Always use verify().
- **Not specifying algorithms:** Without algorithm whitelist, vulnerable to algorithm confusion attacks. Always specify algorithms: ['HS256'].
- **Storing sensitive data in JWT payload:** Payload is base64-encoded, not encrypted. Only store non-sensitive identifiers.
- **Synchronous bcrypt:** bcrypt.hashSync() blocks event loop. Use async bcrypt.hash() in production.
- **Low bcrypt cost factor:** Cost <10 is too weak for modern hardware. Use 10-12 for production.
- **Not handling token refresh failures:** If refresh fails, user should be redirected to login, not stuck in broken state.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom hash function with MD5/SHA | bcrypt library | bcrypt includes proper salting, configurable cost factor, resistant to rainbow tables and GPU attacks |
| JWT signing/verification | Manual base64 encoding + HMAC | jsonwebtoken library | Handles all JWT algorithms, expiration checking, proper signature verification, prevents timing attacks |
| Token blacklisting | In-memory Set or array | Redis with TTL | Memory storage doesn't scale across servers, no automatic expiry, Redis provides atomic operations and persistence |
| Cookie parsing | Manual parsing of req.headers.cookie | cookie-parser middleware | Handles edge cases (multiple cookies, special characters, URL encoding), battle-tested |
| Password validation | Regex checks only | express-validator with strength checking | Checks for common passwords, length, complexity, provides sanitization |
| Refresh token rotation | Manually tracking token versions | Redis with jti + reuse detection | Rotation requires atomic operations, race condition handling, reuse detection logic is complex |
| Rate limiting auth endpoints | Manual request counting | express-rate-limit | Handles distributed rate limiting, memory/Redis storage, sliding windows |

**Key insight:** Authentication is a security-critical domain where subtle bugs (timing attacks, race conditions, weak randomness) can lead to complete system compromise. Use battle-tested libraries that have been audited and hardened by the security community rather than custom implementations.

## Common Pitfalls

### Pitfall 1: Token Timing and Race Conditions

**What goes wrong:** Multiple simultaneous requests with near-expired token cause race conditions in refresh logic, leading to "token expired" errors or duplicate refresh requests.

**Why it happens:** Access token expires (15 minutes), multiple API calls in flight simultaneously all detect expiration and trigger refresh, but only one refresh should happen.

**How to avoid:**
- Implement request queuing during token refresh (queue all requests while refresh is in progress)
- Use a "refresh lock" to ensure only one refresh happens at a time
- Set access token lifetime buffer (refresh at 14 minutes for 15-minute tokens)

**Warning signs:**
- Users randomly see "token expired" errors even though they're active
- Multiple /refresh requests in network tab at the same time
- Intermittent 401 errors that go away on retry

### Pitfall 2: Secret Key Management in Development vs Production

**What goes wrong:** Using the same JWT_SECRET across development and production environments, or committing secrets to version control.

**Why it happens:** Developers hardcode secrets for convenience, or use same .env file across environments, or commit .env.example with real values.

**How to avoid:**
- Generate strong, unique secrets per environment (use `openssl rand -base64 32`)
- Use .env.example with placeholder values, .env in .gitignore
- Validate environment variables on startup with Joi schema
- Use secrets managers (AWS Secrets Manager, Doppler) for production

**Warning signs:**
- JWT_SECRET appears in git history
- Production and staging tokens are interchangeable
- Secrets are visible in logs or error messages

### Pitfall 3: HttpOnly Cookie Configuration Errors

**What goes wrong:** Refresh token cookies not being sent to backend due to misconfigured cookie attributes (secure, sameSite, domain).

**Why it happens:** Development uses HTTP (localhost) but secure: true requires HTTPS, or CORS configuration doesn't allow credentials, or sameSite: 'strict' blocks cross-origin requests.

**How to avoid:**
- Use conditional cookie config: `secure: process.env.NODE_ENV === 'production'`
- Set CORS credentials: true and origin: specific frontend URL
- Use sameSite: 'lax' for cross-origin setups, 'strict' for same-origin
- Test cookie flow in both development and production environments

**Warning signs:**
- Refresh token cookie visible in browser DevTools but not sent in requests
- "No refresh token" error even though user just logged in
- Works in development but fails in production

### Pitfall 4: Not Blacklisting Tokens on Logout or Password Change

**What goes wrong:** User logs out but their access token remains valid for remaining TTL (up to 15 minutes), allowing continued API access.

**Why it happens:** JWTs are stateless by design, so logout can't invalidate them without server-side tracking.

**How to avoid:**
- Implement token blacklisting with Redis (store blacklisted tokens with TTL = remaining token lifetime)
- Blacklist on logout, password change, role change, account deletion
- Check blacklist in auth middleware before accepting token

**Warning signs:**
- User reports they can still access app after logout by refreshing page
- API calls succeed even after password change
- Security audit flags lack of token revocation

### Pitfall 5: Incomplete Migration Strategy (Backward Compatibility)

**What goes wrong:** Existing users with data in localStorage can't access their events after authentication is deployed, leading to data loss perception.

**Why it happens:** Authentication is added as hard requirement without migration path for unauthenticated data.

**How to avoid:**
- Phase 1: Add optional authentication (optionalAuth middleware), users can use app without login
- Phase 2: Provide "claim existing event" flow where user can login/register and associate localStorage events
- Phase 3: After migration period, make authentication required
- Keep event access codes working for participants who haven't registered

**Warning signs:**
- User complaints about "lost events" after update
- Support tickets about being "locked out" of events
- Drop in active users after authentication deployment

### Pitfall 6: Refresh Token Security in Frontend

**What goes wrong:** Developer accidentally stores refresh token in JavaScript-accessible storage (localStorage, sessionStorage, or even React state), exposing it to XSS.

**Why it happens:** Misunderstanding of HttpOnly cookies or trying to "help" by caching the refresh token for offline support.

**How to avoid:**
- NEVER store refresh tokens anywhere except HttpOnly cookies (backend-only)
- Only store access tokens in memory (React Context/state)
- Document why refresh tokens must remain in HttpOnly cookies
- Code review specifically checks for refresh token storage violations

**Warning signs:**
- Refresh token visible in React DevTools state inspector
- Refresh token in localStorage keys
- Code tries to pass refresh token to API manually

### Pitfall 7: Zero Trust Violations (Trusting Internal Requests)

**What goes wrong:** Internal API routes skip authentication assuming they're only called by "trusted" parts of the app, but malicious user crafts direct API calls.

**Why it happens:** Developers think "this route is only called from our frontend" and skip auth checks for convenience.

**How to avoid:**
- Apply authentication middleware to ALL protected routes, even "internal" ones
- Never trust client-side role checks (re-verify role on backend)
- Assume every request could be from a malicious client
- Use RBAC middleware even for routes that "should only be called by admins"

**Warning signs:**
- Routes without authentication middleware
- Role checks only in frontend code
- Comments like "this is safe because only we call it"
- Different security levels for "internal" vs "external" routes

## Code Examples

Verified patterns from official sources:

### Login Route with Password Hashing

```typescript
// Backend: apps/api/src/routes/auth.ts
// Source: https://blog.logrocket.com/password-hashing-node-js-bcrypt/
import { Router } from 'express';
import bcrypt from 'bcrypt';
import { generateTokens } from '../services/tokenService';
import { query } from '../db/connection';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user by email
    const result = await query(
      'SELECT id, email, name, password_hash, role FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Compare password with hash (async to avoid blocking)
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const tokens = await generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Set refresh token in HttpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return access token and user info
    res.json({
      accessToken: tokens.accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
```

### Registration Route with Bcrypt

```typescript
// Backend: apps/api/src/routes/auth.ts
// Source: https://www.freecodecamp.org/news/how-to-hash-passwords-with-bcrypt-in-nodejs/
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name required' });
    }

    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password with bcrypt (cost factor 12 for 2026 security)
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await query(
      'INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
      [email, name, passwordHash, 'participant'] // Default role
    );

    const user = result.rows[0];

    // Generate tokens
    const tokens = await generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Set refresh token in HttpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      accessToken: tokens.accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});
```

### Protected Route with RBAC

```typescript
// Backend: apps/api/src/routes/events.ts
// Source: https://medium.com/@er.pwndhull07/implementing-role-based-access-control-rbac-in-node-js-with-postgresql-c1073ba23ee2
import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { requireRole, requireEventAccess } from '../middleware/rbac';

const router = Router();

// Public route: list all events (optional auth to show user's events)
router.get('/', optionalAuth, async (req, res) => {
  // Implementation shows all events, or filtered by user if authenticated
});

// Protected route: create event (requires authentication)
router.post('/', authenticateJWT, async (req, res) => {
  const { name, couple_crossing } = req.body;

  // Create event with current user as organizer
  const result = await query(
    'INSERT INTO events (name, couple_crossing, organizer_id) VALUES ($1, $2, $3) RETURNING *',
    [name, couple_crossing, req.user!.userId]
  );

  res.status(201).json(result.rows[0]);
});

// Protected route: generate assignments (requires organizer role for THIS event)
router.post('/:id/generate', authenticateJWT, requireEventAccess, async (req, res) => {
  // Check if user is organizer
  if (!req.eventAccess.isOrganizer) {
    return res.status(403).json({ error: 'Only event organizer can generate assignments' });
  }

  // Generate assignments logic...
});

// Protected route: view assignments (participants can only see their own)
router.get('/:id/assignments', authenticateJWT, requireEventAccess, async (req, res) => {
  if (req.eventAccess.isOrganizer) {
    // Organizer can see all assignments
    const result = await query(
      'SELECT * FROM assignments WHERE event_id = $1',
      [req.params.id]
    );
    return res.json(result.rows);
  } else {
    // Participant can only see their own assignments
    const result = await query(
      `SELECT a.* FROM assignments a
       JOIN participants p ON a.giver_id = p.id
       WHERE a.event_id = $1 AND p.user_id = $2`,
      [req.params.id, req.user!.userId]
    );
    return res.json(result.rows);
  }
});

export default router;
```

### Axios Client with Auto Token Refresh

```typescript
// Frontend: apps/gatherly/src/api/client.ts
// Source: https://medium.com/@zeeshanali0704/authentication-in-react-with-jwts-access-refresh-tokens-569i
import axios from 'axios';
import { authApi } from './auth';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001',
  withCredentials: true, // Send cookies with requests
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor: add access token to headers
apiClient.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken'); // Or from AuthContext
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 with token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Refresh token
        const response = await authApi.refresh();
        const newAccessToken = response.accessToken;

        // Update token in storage
        localStorage.setItem('accessToken', newAccessToken);

        // Update Authorization header
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        // Process queued requests
        processQueue(null, newAccessToken);

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        window.location.href = '/login';

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

### Redis Configuration

```typescript
// Backend: apps/api/src/config/redis.ts
// Source: https://oneuptime.com/blog/post/2026-01-21-redis-token-storage/view
import Redis from 'ioredis';

const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redisClient.on('connect', () => {
  console.log('✅ Redis connected');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

export const createClient = async (): Promise<Redis> => {
  return redisClient;
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sessions with express-session | JWT with refresh tokens | 2018-2020 | Enables stateless APIs, better for microservices and mobile apps |
| express-jwt library | express-oauth2-jwt-bearer or manual jsonwebtoken | 2023-2024 | Auth0 deprecated express-jwt, community moved to direct jsonwebtoken usage |
| Refresh tokens in localStorage | Refresh tokens in HttpOnly cookies | 2020-2022 | Mitigates XSS attacks, refresh tokens no longer accessible to JavaScript |
| Long-lived JWTs (24+ hours) | Short access tokens (15-30m) + refresh rotation | 2019-2021 | Reduces risk window if token leaked, refresh rotation detects theft |
| bcrypt cost factor 10 | bcrypt cost factor 12 | 2024-2026 | Moore's Law: hardware faster, need higher cost to maintain ~250ms hash time |
| argon2 as "future" algorithm | bcrypt still dominant | 2023-present | Despite argon2 being "better", bcrypt ecosystem support and familiarity won |
| Storing refresh tokens in database | Storing refresh tokens in Redis | 2020-2022 | Redis TTL handles expiration automatically, faster than DB queries |

**Deprecated/outdated:**
- **express-jwt library:** Auth0 has moved users to express-oauth2-jwt-bearer (OAuth2-focused) or manual jsonwebtoken usage. express-jwt still works but is in maintenance mode.
- **Passport-jwt without refresh tokens:** Old pattern was single long-lived JWT, now considered insecure without refresh rotation.
- **JWT in URL parameters:** Never do this (was sometimes seen in password reset links), tokens leak in server logs and browser history.
- **RS256 for simple use cases:** While RS256 (RSA) is useful for distributed verification (multiple services), HS256 (HMAC) is simpler and sufficient for single-backend scenarios.

## Open Questions

Things that couldn't be fully resolved:

1. **Redis vs PostgreSQL for refresh token storage**
   - What we know: Redis provides automatic TTL expiration and is faster, but adds infrastructure dependency
   - What's unclear: Whether lightweight apps (like Gatherly) benefit enough from Redis to justify the operational overhead vs using PostgreSQL with expiration queries
   - Recommendation: Start with PostgreSQL refresh_tokens table with expiration column, migrate to Redis if performance becomes issue (>1000 concurrent users)

2. **Optional vs required authentication migration timeline**
   - What we know: Gradual migration allows existing users to keep accessing localStorage data
   - What's unclear: How long to maintain optional authentication before making it required
   - Recommendation: 30-60 day migration window with in-app prompts encouraging registration, then require auth for new events only (existing events remain accessible with access codes)

3. **Participant identity without registration**
   - What we know: Current app allows participants to join events via codes without accounts
   - What's unclear: Whether participants should be forced to create accounts or allowed to participate anonymously with temporary tokens
   - Recommendation: Support both: registered participants (full features) and guest participants (limited to their assigned recipient, can't create events)

4. **Social login integration (Google, GitHub, etc.)**
   - What we know: OAuth2 social login reduces friction and improves security (no password management)
   - What's unclear: Whether social login should be included in Phase 7 or deferred to future phase
   - Recommendation: Defer to future phase (Phase 10+), implement email/password auth first to establish patterns, then add social login as alternative strategy

5. **Email verification requirement**
   - What we know: Email verification prevents fake accounts and ensures password reset delivery
   - What's unclear: Whether email verification should be required for Phase 7 or deferred
   - Recommendation: Defer to Phase 8 (along with password reset flow), Phase 7 focuses on core JWT auth without email complexity

## Sources

### Primary (HIGH confidence)
- jsonwebtoken npm package - https://www.npmjs.com/package/jsonwebtoken (version 9.0.3, industry standard)
- bcrypt npm package - https://www.npmjs.com/package/bcrypt (password hashing best practices)
- Auth0 JWT Security Guide - https://auth0.com/blog/critical-vulnerabilities-in-json-web-token-libraries/ (security vulnerabilities and mitigations)

### Secondary (MEDIUM confidence)
- [How To Use JSON Web Tokens (JWTs) in Express.js | DigitalOcean](https://www.digitalocean.com/community/tutorials/nodejs-jwt-expressjs) - Express JWT middleware patterns
- [Best Practices for Securing JWT Tokens in React Applications | Medium](https://medium.com/@myfacesproduction/best-practices-for-securing-jwt-tokens-in-react-applications-cc9f63b4dbc0) - React token storage security
- [Refresh Token Rotation: Best Practices for Developers](https://www.serverion.com/uncategorized/refresh-token-rotation-best-practices-for-developers/) - Token rotation implementation
- [Building Reliable Protected Routes with React Router v7 - DEV Community](https://dev.to/ra1nbow1/building-reliable-protected-routes-with-react-router-v7-1ka0) - React Router 7 auth patterns
- [Implementing Role-Based Access Control (RBAC) in Node.js with PostgreSQL | Medium](https://medium.com/@er.pwndhull07/implementing-role-based-access-control-rbac-in-node-js-with-postgresql-c1073ba23ee2) - RBAC implementation
- [How to Implement Token Storage with Redis](https://oneuptime.com/blog/post/2026-01-21-redis-token-storage/view) - Redis token blacklisting
- [Are environment variables still safe for secrets in 2026? - Security Boulevard](https://securityboulevard.com/2025/12/are-environment-variables-still-safe-for-secrets-in-2026/) - Secret management best practices
- [How to Avoid JWT Security Mistakes in Node.js](https://www.nodejs-security.com/blog/how-avoid-jwt-security-mistakes-nodejs) - Common JWT pitfalls
- [State Management in React (2026): Hooks, Context API, and Redux in Practice](https://thelinuxcode.com/state-management-in-react-2026-hooks-context-api-and-redux-in-practice/) - React Context for auth state
- [Implementing Zero-Trust Architecture in Node.js Applications - DEV Community](https://dev.to/vanessamadison/implementing-zero-trust-architecture-in-nodejs-applications-5be9) - Zero trust principles

### Tertiary (LOW confidence)
- WebSearch results for "Express JWT authentication best practices 2026" - General ecosystem discovery
- WebSearch results for "JWT common security mistakes pitfalls Node.js 2026" - Community discussions on pitfalls

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - jsonwebtoken, bcrypt, ioredis are well-established with clear version information and extensive usage
- Architecture: HIGH - Patterns verified across multiple authoritative sources (Auth0, DigitalOcean, official docs)
- Pitfalls: MEDIUM - Based on community articles and developer discussions, verified against security best practices but less formal documentation

**Research date:** 2026-02-08
**Valid until:** 2026-03-10 (30 days - authentication patterns are stable, but security recommendations evolve regularly)
