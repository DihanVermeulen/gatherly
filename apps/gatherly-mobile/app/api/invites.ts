import apiClient from "./client";

export type Invite = {
  id: number;
  event_id: number;
  email: string | null;
  invite_url: string;
  magic_link_url: string;
  status: 'pending' | 'accepted' | 'expired';
  participant_name?: string;
  created_at: string;
  expires_at: string;
};

export const invitesApi = {
  // Create an invite for an event (optionally pre-addressed to an email)
  create: (eventId: string, email?: string): Promise<Invite> =>
    apiClient
      .post(`/api/events/${eventId}/invites`, { email })
      .then((r) => r.data),

  // List all invites for an event
  list: (eventId: string): Promise<{ invites: Invite[] }> =>
    apiClient
      .get(`/api/events/${eventId}/invites`)
      .then((r) => r.data),

  // Delete a single invite
  delete: (eventId: string, inviteId: number): Promise<void> =>
    apiClient
      .delete(`/api/events/${eventId}/invites/${inviteId}`)
      .then((r) => r.data),
};

export default invitesApi;
