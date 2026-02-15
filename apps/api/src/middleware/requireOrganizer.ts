import { Request, Response, NextFunction } from 'express';

/**
 * Middleware that requires the authenticated user to have the 'organizer' role.
 * Must be used AFTER authenticateJWT middleware (req.user must be set).
 * Returns 403 if user is not an organizer.
 */
export function requireOrganizer(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'organizer') {
    res.status(403).json({ error: 'Organizer access required' });
    return;
  }

  next();
}
