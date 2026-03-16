import { Request, Response, NextFunction } from "express";

/**
 * Middleware that requires the authenticated session to be a full user account (not a magic-link participant).
 * Must be used AFTER authenticateJWT middleware (req.user must be set).
 * Returns 403 if the session is participant-scoped (participantId is present).
 */
export function requireOrganizer(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (req.user.participantId !== undefined) {
    res.status(403).json({ error: "Full account required" });
    return;
  }

  next();
}
