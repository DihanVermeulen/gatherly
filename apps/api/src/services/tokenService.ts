import jwt from "jsonwebtoken";
import crypto from "crypto";
import { query } from "../db/connection";

export interface TokenPayload {
  userId: number;
  email: string;
  role: "organizer" | "participant";
}

// Load secrets from environment variables (with type assertions after validation)
const JWT_SECRET = process.env.JWT_SECRET as string;
const REFRESH_SECRET = process.env.REFRESH_SECRET as string;

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

if (!process.env.REFRESH_SECRET) {
  throw new Error("REFRESH_SECRET environment variable is required");
}

/**
 * Generate access and refresh token pair
 * Access tokens are short-lived (15min), refresh tokens are long-lived (7 days)
 */
export async function generateTokens(payload: TokenPayload): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  // Generate access token (short-lived)
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: "15m",
    algorithm: "HS256",
  });

  // Generate refresh token (long-lived) with unique jti
  const jti = crypto.randomUUID();
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: "7d",
    algorithm: "HS256",
    jwtid: jti,
  });

  // Hash the refresh token for storage
  const tokenHash = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  // Store refresh token hash in database with expiration
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  await query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [payload.userId, tokenHash, expiresAt],
  );

  return { accessToken, refreshToken };
}

/**
 * Verify access token and return payload
 * Throws error if token is invalid or expired
 */
export function verifyAccessToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET, {
    algorithms: ["HS256"],
  }) as TokenPayload;

  return decoded;
}

/**
 * Verify refresh token and check if it exists in database
 * Throws error if token is invalid, expired, or not found in DB
 */
export async function verifyRefreshToken(token: string): Promise<TokenPayload> {
  // Verify JWT signature and expiration
  const decoded = jwt.verify(token, REFRESH_SECRET, {
    algorithms: ["HS256"],
  }) as TokenPayload;

  // Hash token to check against database
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  // Check if token exists in database and is not expired
  const result = await query(
    "SELECT * FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW()",
    [tokenHash],
  );

  if (result.rows.length === 0) {
    throw new Error("Refresh token not found or expired");
  }

  return decoded;
}

/**
 * Revoke a specific refresh token by its hash
 * Used during logout or token refresh rotation
 */
export async function revokeRefreshToken(tokenHash: string): Promise<void> {
  await query("DELETE FROM refresh_tokens WHERE token_hash = $1", [tokenHash]);
}

/**
 * Revoke all refresh tokens for a specific user
 * Used during password change or account security events
 */
export async function revokeAllUserTokens(userId: number): Promise<void> {
  await query("DELETE FROM refresh_tokens WHERE user_id = $1", [userId]);
}

/**
 * Clean up expired refresh tokens from database
 * Should be called periodically or during refresh operations
 */
export async function cleanExpiredTokens(): Promise<void> {
  const result = await query(
    "DELETE FROM refresh_tokens WHERE expires_at < NOW()",
  );
  console.log(`Cleaned up ${result.rowCount} expired refresh tokens`);
}
