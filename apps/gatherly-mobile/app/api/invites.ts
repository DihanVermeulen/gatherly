import apiClient from "./client";

export type Invite = {
  id: number;
  event_id: number;
  email: string | null;
  invite_url: string;
  magic_link_url: string;
  status: "pending" | "accepted" | "expired";
  participant_name?: string;
  created_at: string;
  expires_at: string;
};

export type InvitePreview = {
  eventId: number;
  eventName: string;
  inviteId: number;
  organizerName: string | null;
  participantCount: number;
  eventDate: string | null;
};

export type JoinResult = {
  eventId: number;
  participantId: number;
  participantName: string;
  eventName: string;
};

export const invitesApi = {
  // Create an invite for an event.
  // Pass `email` to pre-address the invite to a specific address.
  // Pass `participantId` when the invitee is an existing participant with a linked
  // user account — the API will look up their registered email automatically so
  // the magic link can issue a user-scoped JWT on redemption.
  create: (
    eventId: string,
    email?: string,
    participantId?: number,
  ): Promise<Invite> =>
    apiClient
      .post(`/api/events/${eventId}/invites`, { email, participantId })
      .then((r) => r.data),

  // List all invites for an event
  list: (eventId: string): Promise<{ invites: Invite[] }> =>
    apiClient.get(`/api/events/${eventId}/invites`).then((r) => r.data),

  // Delete a single invite
  delete: (eventId: string, inviteId: number): Promise<void> =>
    apiClient
      .delete(`/api/events/${eventId}/invites/${inviteId}`)
      .then((r) => r.data),

  // Resend magic link for a pending invite
  resend: (
    eventId: string,
    inviteId: number,
  ): Promise<{ magic_link_url: string; email_sent: boolean }> =>
    apiClient
      .post(`/api/events/${eventId}/invites/${inviteId}/resend-magic-link`)
      .then((r) => r.data),

  // Validate an invite code (public endpoint, no auth required)
  validate: (code: string): Promise<InvitePreview> =>
    apiClient.post("/api/invites/validate", { code }).then((r) => r.data),

  // Accept an invite (public endpoint, but app enforces auth client-side)
  accept: (
    code: string,
    participantName: string,
    email?: string,
  ): Promise<JoinResult> =>
    apiClient
      .post(`/api/invites/${code}/accept`, { participantName, email })
      .then((r) => r.data),
};

export default invitesApi;
