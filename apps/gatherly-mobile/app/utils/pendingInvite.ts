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
