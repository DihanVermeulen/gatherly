// Module-level variable — persists across component remounts within same JS session.
// This is intentionally NOT AsyncStorage: the invite code only needs to survive
// the auth navigation flow within a single app session, not across app restarts.
let _pendingInviteCode: string | null = null;

export function setPendingInviteCode(code: string): void {
  _pendingInviteCode = code;
}

export function consumePendingInviteCode(): string | null {
  const code = _pendingInviteCode;
  _pendingInviteCode = null;
  return code;
}

// Magic token pending variable — stores the raw magic-link token during the
// "Join with account" round-trip (magic-link screen → sign-in → back to magic-link).
// Same session-only pattern as _pendingInviteCode above.
let _pendingMagicToken: string | null = null;

export function setPendingMagicToken(token: string): void {
  _pendingMagicToken = token;
}

export function consumePendingMagicToken(): string | null {
  const token = _pendingMagicToken;
  _pendingMagicToken = null;
  return token;
}
