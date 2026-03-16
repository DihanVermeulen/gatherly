import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/tokenService.js';
import jwt from 'jsonwebtoken';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
        participantId?: number; // Set for magic-link participant sessions
        eventId?: number;       // Set for magic-link participant sessions
      };
    }
  }
}

/**
 * Strict JWT authentication middleware
 * Requires valid Bearer token in Authorization header
 * Returns 401 if token is missing, invalid, or expired
 */
export function authenticateJWT(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ error: 'Invalid token format. Use: Bearer <token>' });
    return;
  }

  const token = parts[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.userId,
      email: payload.email,
      ...(payload.participantId !== undefined && { participantId: payload.participantId }),
      ...(payload.eventId !== undefined && { eventId: payload.eventId }),
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
    return;
  }
}

/**
 * Optional authentication middleware
 * Attempts to authenticate if token is present, but doesn't require it
 * Allows unauthenticated requests to proceed without req.user
 * Useful for gradual migration or routes that support both auth states
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  // No token provided - proceed without authentication
  if (!authHeader) {
    next();
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    // Invalid format - swallow error and proceed without authentication
    next();
    return;
  }

  const token = parts[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.userId,
      email: payload.email,
      ...(payload.participantId !== undefined && { participantId: payload.participantId }),
      ...(payload.eventId !== undefined && { eventId: payload.eventId }),
    };
  } catch (error) {
    // Token invalid or expired - swallow error and proceed without authentication
    // This enables gradual migration from unauthenticated to authenticated routes
  }

  next();
}
