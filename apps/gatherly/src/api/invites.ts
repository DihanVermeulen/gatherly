import apiClient from "./client";

// Types matching backend invite schema
export interface Invite {
  id: number;
  event_id: number;
  email: string | null;
  invite_code: string;
  invite_url: string;
  status: 'pending' | 'accepted' | 'declined';
  participant_id: number | null;
  participant_name: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InviteValidation {
  eventId: number;
  eventName: string;
  inviteId: number;
}

export interface InviteAcceptResult {
  eventId: number;
  participantId: number;
  participantName: string;
  eventName: string;
}

export const invitesApi = {
  // Create a new invite for an event
  createInvite: async (
    eventId: number,
    data?: { email?: string; expiresInDays?: number }
  ): Promise<Invite> => {
    const response = await apiClient.post(`/api/events/${eventId}/invites`, data || {});
    return response.data;
  },

  // Get all invites for an event (protected, requires auth)
  getInvites: async (eventId: number): Promise<{ invites: Invite[] }> => {
    const response = await apiClient.get(`/api/events/${eventId}/invites`);
    return response.data;
  },

  // Validate an invite code (public endpoint, rate-limited)
  validateInvite: async (code: string): Promise<InviteValidation> => {
    const response = await apiClient.post(`/api/invites/validate`, { code });
    return response.data;
  },

  // Accept an invite and join the event (public endpoint, rate-limited)
  acceptInvite: async (
    code: string,
    participantName: string,
    email?: string
  ): Promise<InviteAcceptResult> => {
    const response = await apiClient.post(`/api/invites/${code}/accept`, {
      participantName,
      ...(email ? { email } : {}),
    });
    return response.data;
  },

  // Revoke/delete an invite (protected, requires auth)
  revokeInvite: async (eventId: number, inviteId: number): Promise<void> => {
    await apiClient.delete(`/api/events/${eventId}/invites/${inviteId}`);
  },

  // Resend magic link for an invite (protected, requires auth)
  resendMagicLink: async (
    eventId: number,
    inviteId: number
  ): Promise<{ magic_link_url: string; email_sent: boolean }> => {
    const response = await apiClient.post(
      `/api/events/${eventId}/invites/${inviteId}/resend-magic-link`
    );
    return response.data;
  },
};

export default invitesApi;
