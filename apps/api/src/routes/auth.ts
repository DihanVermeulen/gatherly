import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { query } from "../db/connection";
import { asyncHandler } from "../middleware/asyncHandler";
import {
  generateTokens,
  generateParticipantTokens,
  verifyRefreshToken,
  revokeRefreshToken,
  cleanExpiredTokens,
} from "../services/tokenService";

const router: Router = Router();

const SALT_ROUNDS = 12;

// Cookie configuration helper
const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  path: "/api/auth",
});

/**
 * POST /register
 * Register a new user with email, password, and name
 */
router.post(
  "/register",
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res
        .status(400)
        .json({ error: "Email, password, and name are required" });
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Password minimum length check
    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }

    // Check if user already exists
    const existingUser = await query("SELECT id FROM users WHERE email = $1", [
      email.toLowerCase(),
    ]);

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: "User already exists" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert new user with default 'participant' role
    const result = await query(
      "INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role",
      [email.toLowerCase(), name, passwordHash, "participant"],
    );

    const user = result.rows[0];

    // Generate tokens
    const tokens = await generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Set refresh token in HttpOnly cookie
    res.cookie("refreshToken", tokens.refreshToken, getRefreshCookieOptions());

    // Return access token and user info
    return res.status(201).json({
      accessToken: tokens.accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  }),
);

/**
 * POST /login
 * Authenticate user with email and password
 */
router.post(
  "/login",
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Query user by email
    const result = await query(
      "SELECT id, email, name, role, password_hash FROM users WHERE email = $1",
      [email.toLowerCase()],
    );

    // Generic error message to prevent user enumeration
    const invalidCredentialsError = { error: "Invalid credentials" };

    if (result.rows.length === 0) {
      return res.status(401).json(invalidCredentialsError);
    }

    const user = result.rows[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json(invalidCredentialsError);
    }

    // Generate tokens
    const tokens = await generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Set refresh token in HttpOnly cookie
    res.cookie("refreshToken", tokens.refreshToken, getRefreshCookieOptions());

    // Return access token and user info (without password_hash)
    return res.status(200).json({
      accessToken: tokens.accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  }),
);

/**
 * POST /refresh
 * Refresh access token using refresh token from HttpOnly cookie
 * Implements refresh token rotation for security
 */
router.post(
  "/refresh",
  asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: "No refresh token" });
    }

    // Verify refresh token (checks signature AND database)
    let decoded;
    try {
      decoded = await verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    // Hash old token for revocation
    const oldTokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    // Revoke old refresh token (rotation)
    await revokeRefreshToken(oldTokenHash);

    // Clean up expired tokens opportunistically
    await cleanExpiredTokens();

    // Participant token: regenerate without querying the users table
    if (decoded.participantId) {
      const participantResult = await query(
        `SELECT p.id, p.name, p.event_id, e.name as event_name
         FROM participants p
         JOIN events e ON p.event_id = e.id
         WHERE p.id = $1`,
        [decoded.participantId],
      );

      if (participantResult.rows.length === 0) {
        return res.status(401).json({ error: "Participant not found" });
      }

      const participant = participantResult.rows[0];

      const tokens = await generateParticipantTokens({
        participantId: participant.id,
        eventId: participant.event_id,
        participantName: participant.name,
      });

      res.cookie("refreshToken", tokens.refreshToken, getRefreshCookieOptions());

      return res.status(200).json({
        accessToken: tokens.accessToken,
        user: {
          id: participant.id,
          email: "",
          name: participant.name,
          role: "participant",
          participantId: participant.id,
          eventId: participant.event_id,
          eventName: participant.event_name,
        },
      });
    }

    // Regular user token: query current user info from DB
    const userResult = await query(
      "SELECT id, email, name, role FROM users WHERE id = $1",
      [decoded.userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = userResult.rows[0];

    // Generate new token pair
    const tokens = await generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Set new refresh token in HttpOnly cookie
    res.cookie("refreshToken", tokens.refreshToken, getRefreshCookieOptions());

    // Return new access token and current user info
    return res.status(200).json({
      accessToken: tokens.accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  }),
);

/**
 * POST /logout
 * Logout user by revoking refresh token and clearing cookie
 * Always succeeds even if no token present
 */
router.post(
  "/logout",
  asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    // If refresh token exists, revoke it from database
    if (refreshToken) {
      const tokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      try {
        await revokeRefreshToken(tokenHash);
      } catch (error) {
        console.error("Revocation error during logout:", error);
      }
    }

    // Clear the refresh token cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth",
    });

    return res.status(200).json({ message: "Logged out" });
  }),
);

export default router;
